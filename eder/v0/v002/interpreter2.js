// Initialize CodeMirror
const textarea = document.getElementById("input");
const editor = CodeMirror.fromTextArea(textarea, {
  mode: "javascript",
  lineNumbers: true,
  theme: "default"
});

// Runtime Model Classes
class SysADLComponent {
  constructor(name, type = null, isAbstract = false) {
    this.name = name;
    this.type = type;
    this.isAbstract = isAbstract;
    this.ports = [];
    this.activities = [];
    this.bindings = [];
    this.state = {};
    this.subcomponents = [];
    this.connectors = [];
    this.protocols = [];
  }

  addPort(port) {
    this.ports.push(port);
    this.state[port.name] = port.value;
  }

  addActivity(activity) {
    this.activities.push(activity);
  }

  addBinding(binding) {
    this.bindings.push(binding);
  }

  addSubcomponent(component) {
    this.subcomponents.push(component);
  }

  addConnector(connector) {
    this.connectors.push(connector);
  }

  addProtocol(protocol) {
    this.protocols.push(protocol);
  }

  executeActivity(activityName, params) {
    const activity = this.activities.find(a => a.name === activityName);
    if (!activity) throw new Error(`Activity ${activityName} not found in ${this.name}`);
    return activity.execute(this, params);
  }
}

class SysADLPort {
  constructor(name, direction, component, type = "Unknown", value = null) {
    this.name = name;
    this.direction = direction;
    this.component = component;
    this.type = type;
    this.value = value;
  }
}

class SysADLConnector {
  constructor(name, ports) {
    this.name = name;
    this.ports = ports;
  }
}

class SysADLFlow {
  constructor(source, target) {
    this.source = source;
    this.target = target;
  }

  propagate(data, components, ports, log, trace) {
    const srcPort = ports[this.source];
    const tgtPort = ports[this.target];
    if (!srcPort || !tgtPort) throw new Error(`Invalid flow: ${this.source} -> ${this.target}`);
    if (srcPort.direction !== "out" || tgtPort.direction !== "in") {
      throw new Error(`Invalid flow direction: ${this.source} (${srcPort.direction}) -> ${this.target} (${tgtPort.direction})`);
    }
    srcPort.value = data;
    tgtPort.value = data;
    components[tgtPort.component].state[tgtPort.name] = data;
    log(`Flow: ${this.source} -> ${this.target} propagated data ${JSON.stringify(data)}`);
    trace.push(`Flow ${this.source} -> ${this.target}: ${JSON.stringify(data)}`);
    return data;
  }
}

class SysADLActivity {
  constructor(name, params = []) {
    this.name = name;
    this.params = params;
  }

  execute(component, inputs, trace) {
    let result;
    const paramName = this.params[0]?.split(":")[0];
    const paramType = this.params[0]?.split(":")[1] || "Unknown";
    const input = component.state[paramName] || inputs[0] || getDefaultValue(paramType);
    if (!input && (!inputs.length || inputs[0] === undefined || inputs[0] === null)) {
      result = `Processed by ${this.name}`;
    } else {
      result = input;
      if (paramType === "String") {
        result = `${result}_${component.name}`;
      } else if (paramType === "Int") {
        result = (result || 0) + 1;
      } else if (paramType === "Float") {
        result = (result || 0) + 0.1;
      } else if (paramType === "Load" && typeof result === "object") {
        result = { ...result, id: `${result.id}_${component.name}` };
      } else {
        result = `Processed ${JSON.stringify(result)} by ${this.name}`;
      }
    }
    const logMsg = `Activity '${this.name}' in ${component.name} transformed input ${JSON.stringify([input])} to ${JSON.stringify(result)}`;
    trace.push(logMsg);
    return { result, log: logMsg };
  }
}

class SysADLExecutable {
  constructor(name, params, returnType, statements) {
    this.name = name;
    this.params = params;
    this.returnType = returnType;
    this.statements = statements;
  }

  execute(inputs, log, constraints = [], trace) {
    const context = { variables: {} };
    this.params.forEach((param, i) => {
      context.variables[param.name] = inputs[i] !== undefined ? inputs[i] : getDefaultValue(param.type);
      log(`Executable '${this.name}' input: ${param.name} = ${JSON.stringify(context.variables[param.name])}`);
      trace.push(`Executable '${this.name}' input: ${param.name} = ${JSON.stringify(context.variables[param.name])}`);
    });

    constraints.forEach(c => {
      if (c.precondition && this.params.some(p => c.precondition.includes(p.name))) {
        const valid = evaluateConstraint(c.precondition, context);
        if (!valid) throw new Error(`Precondition failed for ${c.name}: ${c.precondition}`);
        log(`Precondition '${c.precondition}' passed for ${c.name}`);
        trace.push(`Precondition '${c.precondition}' passed for ${c.name}`);
      }
    });

    let result = null;
    for (const stmt of this.statements) {
      if (stmt.type === "VariableDecl") {
        context.variables[stmt.name] = stmt.value ? this.evaluateExpression(stmt.value, context) : getDefaultValue(stmt.type);
        log(`Variable ${stmt.name} = ${JSON.stringify(context.variables[stmt.name])}`);
        trace.push(`Variable ${stmt.name} = ${JSON.stringify(context.variables[stmt.name])}`);
      } else if (stmt.type === "ReturnStatement") {
        result = this.evaluateExpression(stmt.value, context);
        log(`Return: ${JSON.stringify(result)}`);
        trace.push(`Return: ${JSON.stringify(result)}`);
        break;
      }
    }

    constraints.forEach(c => {
      if (c.postcondition && this.params.some(p => c.postcondition.includes(p.name) || c.postcondition.includes("result"))) {
        context.variables["result"] = result;
        const valid = evaluateConstraint(c.postcondition, context);
        if (!valid) throw new Error(`Postcondition failed for ${c.name}: ${c.postcondition}`);
        log(`Postcondition '${c.postcondition}' passed for ${c.name}`);
        trace.push(`Postcondition '${c.postcondition}' passed for ${c.name}`);
      }
    });

    return result;
  }

  evaluateExpression(expr, context) {
    if (expr.type === "Literal") return expr.value;
    if (expr.type === "Object") return { ...expr.value };
    if (expr.type === "Variable") return context.variables[expr.value] ?? expr.value;
    if (expr.type === "Binary") {
      const left = this.evaluateExpression(expr.left, context);
      const right = this.evaluateExpression(expr.right, context);
      if (expr.operator === "+") {
        if (typeof left === "string" || typeof right === "string") {
          return `${left}${right}`;
        }
        return left + right;
      }
      return left - right;
    } else if (expr.type === "FieldAccess") {
      const obj = this.evaluateExpression(expr.object, context);
      return obj ? obj[expr.field] : null;
    }
    return null;
  }
}

class SysADLProtocol {
  constructor(name, actions) {
    this.name = name;
    this.actions = actions;
  }

  execute(component, ports, log, trace) {
    const results = [];
    this.actions.forEach(action => {
      if (action.type === "Send") {
        const port = ports[action.port];
        if (!port) throw new Error(`Port ${action.port} not found`);
        if (port.direction !== "out") throw new Error(`Invalid send port: ${action.port}`);
        port.value = action.value;
        component.state[port.name] = action.value;
        log(`Protocol ${this.name}: Sent ${JSON.stringify(action.value)} via ${action.port}`);
        trace.push(`Protocol ${this.name}: Sent ${JSON.stringify(action.value)} via ${action.port}`);
        results.push({ action: "send", port: action.port, value: action.value });
      } else if (action.type === "Receive") {
        const port = ports[action.port];
        if (!port) throw new Error(`Port ${action.port} not found`);
        if (port.direction !== "in") throw new Error(`Invalid receive port: ${action.port}`);
        const value = port.value !== null ? port.value : "unknown";
        log(`Protocol ${this.name}: Received ${JSON.stringify(value)} from ${action.port} into ${action.variable}`);
        trace.push(`Protocol ${this.name}: Received ${JSON.stringify(value)} from ${action.port} into ${action.variable}`);
        results.push({ action: "receive", port: action.port, variable: action.variable, value });
      }
    });
    return results;
  }
}

class SysADLConstraint {
  constructor(name, precondition, postcondition) {
    this.name = name;
    this.precondition = precondition;
    this.postcondition = postcondition;
  }
}

class SysADLDataType {
  constructor(name, fields) {
    this.name = name;
    this.fields = fields;
  }
}

class SysADLConfiguration {
  constructor(components, connectors, protocols = []) {
    this.components = components;
    this.connectors = connectors;
    this.protocols = protocols;
  }
}

class SysADLAllocation {
  constructor(activity, executable) {
    this.activity = activity;
    this.executable = executable;
  }
}

class SysADLRequirement {
  constructor(name, condition) {
    this.name = name;
    this.condition = condition;
  }
}

// Função auxiliar para avaliar constraints
function evaluateConstraint(expr, context) {
  const parts = expr.split(/\s*(>|<|==|!=)\s*/);
  if (parts.length !== 3) {
    if (expr.includes("!=")) {
      const [left, right] = expr.split("!=").map(s => s.trim());
      const lValue = context.variables[left] ?? left;
      return lValue !== right;
    }
    return true;
  }
  const [left, op, right] = parts;
  const lValue = context.variables[left] ?? (left === "null" ? null : left);
  const rValue = context.variables[right] ?? (right === "null" ? null : parseInt(right) || right);
  switch (op) {
    case ">": return lValue > rValue;
    case "<": return lValue < rValue;
    case "==": return lValue === rValue;
    case "!=": return lValue !== rValue;
    default: return true;
  }
}

// Função auxiliar para valores padrão
function getDefaultValue(type) {
  switch (type) {
    case "Int": return 0;
    case "String": return "";
    case "Float": return 0.0;
    case "Load": return { id: "", weight: 0 };
    case "Time": return { hours: 0, minutes: 0 };
    default: return null;
  }
}

// Interpreter
function interpretSysADL() {
  const input = editor.getValue();
  const logEl = document.getElementById("log");
  logEl.innerText = "";
  const log = msg => (logEl.innerText += msg + "\n");
  const trace = [];

  const components = {};
  const ports = {};
  const connectors = {};
  const flows = [];
  const executables = {};
  const configurations = [];
  const protocols = {};
  const constraints = {};
  const dataTypes = {};
  const allocations = [];
  const requirements = [];
  const simulationInputs = { flows: {}, executables: {} };

  let currentComponent = null;
  let currentBlock = null;
  let blockLines = [];

  try {
    const lines = input.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith("//")) continue;

      // Detecta início de um bloco
      if (line.endsWith("{")) {
        const blockHeader = line.slice(0, -1).trim();
        blockLines = [];

        if (blockHeader.startsWith("abstract component def")) {
          const name = blockHeader.split(" ")[3];
          currentComponent = new SysADLComponent(name, null, true);
          components[name] = currentComponent;
          currentBlock = "component";
          log(`Component defined: ${name} (abstract)`);
        } else if (blockHeader.startsWith("component def")) {
          const name = blockHeader.split(" ")[2];
          currentComponent = new SysADLComponent(name);
          components[name] = currentComponent;
          currentBlock = "component";
          log(`Component defined: ${name}`);
        } else if (blockHeader.startsWith("connector def")) {
          const name = blockHeader.split(" ")[2];
          currentBlock = "connector";
          connectors[name] = new SysADLConnector(name, []);
          log(`Connector defined: ${name}`);
        } else if (blockHeader.startsWith("executable def")) {
          const match = blockHeader.match(/executable def (\w+)/);
          const name = match[1];
          currentBlock = "executable";
          executables[name] = { name, params: [], statements: [] };
          log(`Executable defined: ${name}`);
        } else if (blockHeader === "configuration") {
          currentBlock = "configuration";
          configurations.push({ components: [], connectors: [], protocols: [] });
          log(`Configuration defined`);
        } else if (blockHeader === "simulation") {
          currentBlock = "simulation";
          log(`Simulation inputs defined`);
        } else if (blockHeader.startsWith("protocol")) {
          const name = blockHeader.split(" ")[1];
          currentBlock = "protocol";
          protocols[name] = { name, actions: [] };
          log(`Protocol defined: ${name}`);
        } else if (blockHeader.startsWith("constraint def")) {
          const name = blockHeader.split(" ")[2];
          currentBlock = "constraint";
          constraints[name] = { name, precondition: null, postcondition: null };
          log(`Constraint defined: ${name}`);
        } else if (blockHeader.startsWith("datatype def")) {
          const name = blockHeader.split(" ")[2];
          currentBlock = "datatype";
          dataTypes[name] = { name, fields: [] };
          log(`DataType defined: ${name}`);
        } else if (blockHeader.startsWith("requirement def")) {
          const name = blockHeader.split(" ")[2];
          currentBlock = "requirement";
          requirements[name] = { name, condition: null };
          log(`Requirement defined: ${name}`);
        }
        continue;
      }

      // Detecta fim de um bloco
      if (line === "}") {
        if (currentBlock === "component" && currentComponent) {
          blockLines.forEach(bl => {
            const bLine = bl.trim();
            if (bLine.startsWith("ports:")) {
              const portDefs = bLine.replace("ports:", "").trim().split(",");
              portDefs.forEach(p => {
                const parts = p.trim().split(":");
                const pname = parts[0];
                const direction = parts[1];
                const type = parts[2] || "Unknown";
                const port = new SysADLPort(pname, direction, currentComponent.name, type);
                currentComponent.addPort(port);
                ports[`${currentComponent.name}.${pname}`] = port;
                log(`  Port ${pname} (${direction}, ${type}) added to ${currentComponent.name}`);
              });
            } else if (bLine.startsWith("activities:")) {
              const activityDefs = bLine.replace("activities:", "").trim().split(",");
              activityDefs.forEach(a => {
                const match = a.trim().match(/(\w+)\s*(\(([^)]*)\))?/);
                const name = match[1];
                const params = match[3] ? match[3].split(",").map(p => p.trim()) : [];
                const activity = new SysADLActivity(name, params);
                currentComponent.addActivity(activity);
                log(`  Activity defined: ${name} (${params.join(", ")}) in ${currentComponent.name}`);
              });
            }
          });
          currentComponent = null;
        } else if (currentBlock === "connector") {
          const name = Object.keys(connectors).pop();
          const portDefs = blockLines.join(" ").replace("ports:", "").trim().split(",");
          connectors[name].ports = portDefs.map(p => p.trim());
          portDefs.forEach(p => {
            const [pname, direction] = p.trim().split(":");
            ports[`${name}.${pname}`] = new SysADLPort(pname, direction, name);
          });
          log(`  Connector ports: ${connectors[name].ports.join(", ")}`);
        } else if (currentBlock === "executable") {
          const name = Object.keys(executables).pop();
          const executable = executables[name];
          executable.params = parseParams(blockLines[0] || "");
          executable.statements = parseExecutableBody(blockLines.slice(1));
          executables[name] = new SysADLExecutable(
            executable.name,
            executable.params,
            executable.params.find(p => p.name === "result")?.type || "Unknown",
            executable.statements
          );
          log(`  Executable body parsed`);
        } else if (currentBlock === "configuration") {
          const config = configurations[configurations.length - 1];
          blockLines.forEach(l => {
            if (l.startsWith("components:")) {
              const comps = l.replace("components:", "").trim().split(",");
              config.components = comps.map(c => {
                const [name, def] = c.trim().split(":");
                return { name, definition: def };
              });
              log(`  Configuration components: ${comps.join(", ")}`);
            } else if (l.startsWith("connectors:")) {
              const conns = l.replace("connectors:", "").trim().split(",");
              config.connectors = conns.map(c => {
                const [name, def] = c.trim().split(":");
                return { name, definition: def };
              });
              log(`  Configuration connectors: ${conns.join(", ")}`);
            } else if (l.startsWith("protocols:")) {
              const protos = l.replace("protocols:", "").trim().split(",");
              config.protocols = protos.map(p => p.trim());
              log(`  Configuration protocols: ${protos.join(", ")}`);
            }
          });
        } else if (currentBlock === "simulation") {
          blockLines.forEach(l => {
            if (l.startsWith("flow ")) {
              const match = l.match(/flow\s+(\S+)\s*=\s*([^;]+)/);
              if (match) {
                const port = match[1];
                if (!ports[port]) throw new Error(`Port ${port} not found in simulation inputs`);
                let value = match[2].trim();
                if (value.match(/^{.*}$/)) {
                  value = JSON.parse(value.replace(/(\w+):/g, '"$1":'));
                  if (ports[port].type === "Load") {
                    if (!value.id || typeof value.weight !== "number") {
                      throw new Error(`Invalid Load object for ${port}: expected { id: String, weight: Int }`);
                    }
                  }
                } else if (value.match(/^\d+$/)) {
                  value = parseInt(value);
                } else if (value.match(/^\d+\.\d+$/)) {
                  value = parseFloat(value);
                } else if (value.startsWith('"') && value.endsWith('"')) {
                  value = value.slice(1, -1);
                }
                simulationInputs.flows[port] = value;
                log(`  Simulation input: flow ${port} = ${JSON.stringify(value)}`);
              }
            } else if (l.startsWith("executable ")) {
              const match = l.match(/executable\s+(\w+)\s*=\s*\[([^;]+)\]/);
              if (match) {
                const name = match[1];
                if (!executables[name]) throw new Error(`Executable ${name} not found in simulation inputs`);
                const values = match[2].split(",").map(v => {
                  v = v.trim();
                  if (v.match(/^{.*}$/)) {
                    return JSON.parse(v.replace(/(\w+):/g, '"$1":'));
                  }
                  if (v.match(/^\d+$/)) return parseInt(v);
                  if (v.match(/^\d+\.\d+$/)) return parseFloat(v);
                  if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
                  return v;
                });
                simulationInputs.executables[name] = values;
                log(`  Simulation input: executable ${name} = ${JSON.stringify(values)}`);
              }
            }
          });
        } else if (currentBlock === "protocol") {
          const name = Object.keys(protocols).pop();
          const actions = parseProtocolBody(blockLines);
          protocols[name] = new SysADLProtocol(name, actions);
          log(`  Protocol actions parsed`);
        } else if (currentBlock === "constraint") {
          const name = Object.keys(constraints).pop();
          blockLines.forEach(l => {
            if (l.startsWith("pre:")) {
              constraints[name].precondition = l.replace("pre:", "").trim().replace(";", "");
              log(`  Precondition: ${constraints[name].precondition}`);
            } else if (l.startsWith("post:")) {
              constraints[name].postcondition = l.replace("post:", "").trim().replace(";", "");
              log(`  Postcondition: ${constraints[name].postcondition}`);
            }
          });
          constraints[name] = new SysADLConstraint(
            name,
            constraints[name].precondition,
            constraints[name].postcondition
          );
        } else if (currentBlock === "datatype") {
          const name = Object.keys(dataTypes).pop();
          dataTypes[name].fields = blockLines.map(l => {
            const [fname, ftype] = l.trim().replace(";", "").split(":");
            return { name: fname, type: ftype };
          });
          dataTypes[name] = new SysADLDataType(name, dataTypes[name].fields);
          log(`  DataType fields: ${dataTypes[name].fields.map(f => `${f.name}:${f.type}`).join(", ")}`);
        } else if (currentBlock === "requirement") {
          const name = Object.keys(requirements).pop();
          blockLines.forEach(l => {
            if (l.startsWith("condition:")) {
              requirements[name].condition = l.replace("condition:", "").trim().replace(";", "");
              log(`  Requirement condition: ${requirements[name].condition}`);
            }
          });
          requirements[name] = new SysADLRequirement(name, requirements[name].condition);
        }
        currentBlock = null;
        blockLines = [];
        continue;
      }

      // Coleta linhas dentro de um bloco
      if (currentBlock) {
        blockLines.push(line);
        continue;
      }

      // Processa linhas fora de blocos
      if (line.startsWith("flow")) {
        const [, src, , tgt] = line.split(" ");
        if (!ports[src] || !ports[tgt]) throw new Error(`Flow ports not found: ${src}, ${tgt}`);
        flows.push(new SysADLFlow(src, tgt));
        log(`Flow defined: ${src} -> ${tgt}`);
      } else if (line.startsWith("allocation")) {
        const match = line.match(/allocation\s+(\w+)\s*->\s*(\w+)/);
        if (match) {
          const [, activity, executable] = match;
          allocations.push(new SysADLAllocation(activity, executable));
          log(`Allocation defined: ${activity} -> ${executable}`);
        }
      }
    }

    // Funções auxiliares para parsing
    function parseParams(line) {
      const params = [];
      const paramMatches = line.matchAll(/(\w+):(\w+)/g);
      for (const match of paramMatches) {
        params.push({ name: match[1], type: match[2] });
      }
      return params;
    }

    function parseExecutableBody(lines) {
      const statements = [];
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith("let")) {
          const match = trimmed.match(/let\s+(\w+):(\w+)\s*=\s*([^;]+)/);
          if (match) {
            const [, name, type, value] = match;
            statements.push({
              type: "VariableDecl",
              name,
              type,
              value: parseExpression(value)
            });
          }
        } else if (trimmed.startsWith("return")) {
          const value = trimmed.replace("return", "").replace(";", "").trim();
          statements.push({
            type: "ReturnStatement",
            value: parseExpression(value)
          });
        }
      });
      return statements;
    }

    function parseProtocolBody(lines) {
      const actions = [];
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith("send")) {
          const match = trimmed.match(/send\s+(\w+)\s+via\s+(\S+)/);
          if (match) {
            actions.push({ type: "Send", value: match[1], port: match[2].replace(";", "") });
          }
        } else if (trimmed.startsWith("receive")) {
          const match = trimmed.match(/receive\s+(\w+)\s+from\s+(\S+)/);
          if (match) {
            actions.push({ type: "Receive", variable: match[1], port: match[2].replace(";", "") });
          }
        }
      });
      return actions;
    }

    function parseExpression(str) {
      str = str.trim();
      if (str.match(/^"[^"]*"/)) {
        return { type: "Literal", value: str.slice(1, -1) };
      } else if (str.match(/^\d+$/)) {
        return { type: "Literal", value: parseInt(str, 10) };
      } else if (str.match(/^\d+\.\d+$/)) {
        return { type: "Literal", value: parseFloat(str) };
      } else if (str.match(/^{.*}$/)) {
        return { type: "Object", value: JSON.parse(str.replace(/(\w+):/g, '"$1":')) };
      } else if (str.includes(".")) {
        const [obj, field] = str.split(".");
        return { type: "FieldAccess", object: parseExpression(obj), field };
      } else if (str.includes("+")) {
        const [left, right] = str.split("+").map(s => s.trim());
        return {
          type: "Binary",
          operator: "+",
          left: parseExpression(left),
          right: parseExpression(right)
        };
      } else {
        return { type: "Variable", value: str };
      }
    }

    // Validar requisitos
    Object.values(requirements).forEach(req => {
      const context = { variables: {} };
      Object.values(ports).forEach(p => {
        context.variables[p.name] = p.value;
      });
      const valid = evaluateConstraint(req.condition, context);
      if (!valid) {
        log(`Requirement '${req.name}' failed: ${req.condition}`);
      } else {
        log(`Requirement '${req.name}' passed: ${req.condition}`);
        trace.push(`Requirement '${req.name}' passed: ${req.condition}`);
      }
    });

    // Inicializar portas com valores da seção simulation
    Object.entries(simulationInputs.flows).forEach(([port, value]) => {
      if (ports[port]) {
        ports[port].value = value;
        const compName = port.split(".")[0];
        if (components[compName]) {
          components[compName].state[port.split(".")[1]] = value;
        }
        trace.push(`Port ${port} initialized with: ${JSON.stringify(value)}`);
      }
    });

    // Simulation
    log("\n--- Simulation Start ---");

    // Propagar fluxos
    flows.forEach(f => {
      const srcPort = ports[f.source];
      const flowData = simulationInputs.flows[f.source] !== undefined
        ? simulationInputs.flows[f.source]
        : getDefaultValue(srcPort.type);
      trace.push(`Flow ${f.source} initialized with: ${JSON.stringify(flowData)}`);
      const propagatedData = f.propagate(flowData, components, ports, log, trace);
      const tgtPort = ports[f.target];
      const tgtComp = components[tgtPort.component];
      if (tgtComp) {
        tgtComp.activities.forEach(act => {
          const result = act.execute(tgtComp, [propagatedData], trace);
          log(result.log);
        });
      }
    });

    // Executar atividades dos subcomponentes na configuração
    configurations.forEach(config => {
      config.components.forEach(c => {
        const compDef = components[c.definition];
        if (compDef) {
          const subComp = new SysADLComponent(c.name, c.definition, compDef.isAbstract);
          compDef.ports.forEach(p => {
            const port = new SysADLPort(p.name, p.direction, c.name, p.type, p.value);
            subComp.addPort(port);
            ports[`${c.name}.${p.name}`] = port;
          });
          compDef.activities.forEach(a => subComp.addActivity(new SysADLActivity(a.name, a.params)));
          components[c.name] = subComp;
          subComp.activities.forEach(act => {
            const paramName = act.params[0]?.split(":")[0];
            const paramType = act.params[0]?.split(":")[1];
            const input = subComp.state[paramName] ||
                          simulationInputs.flows[`${subComp.type}.${paramName}`] ||
                          simulationInputs.flows[`${c.name}.${paramName}`] ||
                          getDefaultValue(paramType);
            const result = act.execute(subComp, [input], trace);
            log(result.log);
          });
        } else {
          log(`Warning: Component definition ${c.definition} not found for ${c.name}`);
        }
      });
      // Executar protocolos
      config.protocols.forEach(protoName => {
        const proto = protocols[protoName];
        if (proto) {
          const comp = components[config.components[0]?.name || Object.keys(components)[0]];
          if (comp) {
            const result = proto.execute(comp, ports, log, trace);
            log(`Protocol '${proto.name}' executed: ${JSON.stringify(result)}`);
          }
        }
      });
    });

    // Executar executáveis com alocações
    allocations.forEach(alloc => {
      const activity = Object.values(components)
        .flatMap(c => c.activities)
        .find(a => a.name === alloc.activity);
      const executable = executables[alloc.executable];
      if (activity && executable) {
        const comp = Object.values(components).find(c => c.activities.includes(activity));
        const paramName = activity.params[0]?.split(":")[0];
        const paramType = activity.params[0]?.split(":")[1];
        const input = comp.state[paramName] ||
                      simulationInputs.flows[`${comp.type}.${paramName}`] ||
                      simulationInputs.flows[`${comp.name}.${paramName}`] ||
                      simulationInputs.executables[alloc.executable]?.[0] ||
                      getDefaultValue(paramType);
        const applicableConstraints = Object.values(constraints).filter(c =>
          c.precondition && executable.params.some(p => c.precondition.includes(p.name)) ||
          c.postcondition && executable.params.some(p => c.postcondition.includes(p.name) || c.postcondition.includes("result"))
        );
        const result = executable.execute([input], log, applicableConstraints, trace);
        log(`Executable '${executable.name}' for activity '${activity.name}' result: ${JSON.stringify(result)}`);
      } else {
        log(`Warning: Allocation ${alloc.activity} -> ${alloc.executable} not resolved`);
      }
    });

    // Executar executáveis não alocados
    Object.values(executables).forEach(ex => {
      if (!allocations.some(a => a.executable === ex.name)) {
        const inputs = simulationInputs.executables[ex.name] || ex.params.map(p => getDefaultValue(p.type));
        const applicableConstraints = Object.values(constraints).filter(c =>
          c.precondition && ex.params.some(p => c.precondition.includes(p.name)) ||
          c.postcondition && ex.params.some(p => c.postcondition.includes(p.name) || c.postcondition.includes("result"))
        );
        const result = ex.execute(inputs, log, applicableConstraints, trace);
        log(`Executable '${ex.name}' result: ${JSON.stringify(result)}`);
      }
    });

    // Resumo do rastreamento
    log("\n--- Parameter Trace Summary ---");
    trace.forEach((entry, i) => {
      log(`${i + 1}. ${entry}`);
    });

    log("--- Simulation End ---");

  } catch (e) {
    log(`Error: ${e.message}`);
  }
}
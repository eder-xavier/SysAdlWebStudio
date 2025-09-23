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
    this.behaviors = [];
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

  addBehavior(behavior) {
    this.behaviors.push(behavior);
  }

  executeActivity(activityName, params) {
    const activity = this.activities.find(a => a.name === activityName);
    if (!activity) throw new Error(`Activity ${activityName} not found in ${this.name}`);
    return activity.execute(this, params);
  }
}

class SysADLPort {
  constructor(name, direction, component, type = "Unknown", value = null, subports = [], dataTypes = {}) {
    this.name = name;
    this.direction = direction;
    this.component = component;
    this.type = type;
    // Inicializar com valor padrão apropriado
    this.value = value && typeof value === "object" ? { ...value } : getDefaultValue(type, dataTypes);
    this.subports = subports;
  }

  validateValue(value, dataTypes) {
    if (dataTypes[this.type]) {
      const expectedFields = dataTypes[this.type].fields.map(f => f.name);
      if (typeof value !== "object" || value === null || !expectedFields.every(f => value[f] !== undefined)) {
        throw new Error(`Invalid value for port ${this.name} of type ${this.type}: expected fields ${expectedFields.join(", ")}`);
      }
    } else if (this.type === "Composite" && this.subports.length > 0) {
      const expectedFields = this.subports.map(sp => sp.name);
      if (typeof value !== "object" || value === null || !expectedFields.every(f => value[f] !== undefined)) {
        throw new Error(`Invalid value for composite port ${this.name}: expected fields ${expectedFields.join(", ")}`);
      }
    }
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

  propagate(data, components, ports, log, trace, dataTypes) {
    const srcPort = ports[this.source] || Object.values(ports).find(p => p.subports?.some(sp => `${p.component}.${p.name}.${sp.name}` === this.source));
    const tgtPort = ports[this.target] || Object.values(ports).find(p => p.subports?.some(sp => `${p.component}.${p.name}.${sp.name}` === this.target));
    if (!srcPort || !tgtPort) throw new Error(`Invalid flow: ${this.source} -> ${this.target}`);

    let srcValue = data;
    if (this.source.includes(".")) {
      const [comp, port, subport] = this.source.split(".");
      srcValue = srcPort.value && srcPort.value[subport] !== undefined ? srcPort.value[subport] : data;
      const subportObj = srcPort.subports.find(sp => sp.name === subport);
      if (subportObj) subportObj.value = srcValue;
    } else {
      srcValue = srcPort.value || data;
    }

    // Simplificar propagação: validar e atribuir diretamente
    if (this.target.includes(".")) {
      const [comp, port, subport] = this.target.split(".");
      if (!tgtPort.value || typeof tgtPort.value !== "object") {
        tgtPort.value = getDefaultValue(tgtPort.type, dataTypes);
      }
      if (subport === "undefined") {
        log(`Warning: Attempt to assign to undefined subport in ${this.target}`);
        return srcValue;
      }
      tgtPort.value[subport] = srcValue;
      const subportObj = tgtPort.subports.find(sp => sp.name === subport);
      if (subportObj) subportObj.value = srcValue;
    } else if (dataTypes[tgtPort.type] || tgtPort.type === "Composite") {
      if (typeof srcValue !== "object" || srcValue === null) {
        log(`Warning: Invalid data for ${tgtPort.type} port ${this.target}: ${JSON.stringify(srcValue)}`);
        return srcValue;
      }
      // Validar antes de atribuir
      tgtPort.validateValue(srcValue, dataTypes);
      tgtPort.value = { ...srcValue }; // Atribuir cópia do objeto
    } else {
      tgtPort.value = srcValue;
    }

    components[tgtPort.component].state[tgtPort.name] = tgtPort.value;
    log(`Flow: ${this.source} -> ${this.target} propagated data ${JSON.stringify(srcValue)}`);
    trace.push(`Flow ${this.source} -> ${this.target}: ${JSON.stringify(srcValue)}`);

    // Executar atividades do componente destino
    const tgtComp = components[tgtPort.component];
    if (tgtComp && !trace.some(t => t.includes(`Activity '${tgtComp.activities[0]?.name}' in ${tgtComp.name}`))) {
      tgtComp.activities.forEach(act => {
        const result = act.execute(tgtComp, [tgtPort.value], trace, dataTypes);
        log(result.log);
      });
    }

    return srcValue;
  }
}

class SysADLActivity {
  constructor(name, params = []) {
    this.name = name;
    this.params = params;
  }

  execute(component, inputs, trace, dataTypes) {
    let result;
    const paramName = this.params[0]?.split(":")[0];
    const paramType = this.params[0]?.split(":")[1] || "Unknown";
    const input = inputs[0] || component.state[paramName] || getDefaultValue(paramType, dataTypes);

    // Validar input para tipos personalizados
    if (dataTypes[paramType]) {
      const expectedFields = dataTypes[paramType].fields.map(f => f.name);
      if (typeof input !== "object" || input === null || !expectedFields.every(f => input[f] !== undefined)) {
        throw new Error(`Invalid input for activity ${this.name}: expected fields ${expectedFields.join(", ")}`);
      }
    }

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
      } else if (dataTypes[paramType] || paramType === "Composite") {
        // Tratar tipos personalizados como objetos
        if (typeof result === "object" && result !== null) {
          result = { ...result, processedBy: component.name };
        } else {
          result = { processedBy: component.name };
        }
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
        const value = port.value !== null ? port.value : getDefaultValue(port.type);
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

  getDefaultValue() {
    const obj = {};
    this.fields.forEach(field => {
      obj[field.name] = getDefaultValue(field.type);
    });
    return obj;
  }
}

class SysADLConfiguration {
  constructor(components, connectors, protocols = [], bindings = []) {
    this.components = components;
    this.connectors = connectors;
    this.protocols = protocols;
    this.bindings = bindings;
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

class SysADLBehavior {
  constructor(name, component, states, transitions) {
    this.name = name;
    this.component = component;
    this.states = states;
    this.transitions = transitions;
    this.currentState = states[0]?.name || null;
  }

  execute(component, ports, simulationInputs, log, trace) {
    if (!this.currentState) throw new Error(`No initial state for behavior ${this.name}`);
    const state = this.states.find(s => s.name === this.currentState);
    if (!state) throw new Error(`State ${this.currentState} not found in behavior ${this.name}`);

    log(`Behavior ${this.name}: Executing state ${state.name}`);
    trace.push(`Behavior ${this.name}: Executing state ${state.name}`);

    state.actions.forEach(action => {
      if (action.type === "Send") {
        const port = ports[action.port];
        if (!port) throw new Error(`Port ${action.port} not found`);
        port.value = action.value;
        component.state[port.name] = action.value;
        log(`Behavior ${this.name}: Sent ${JSON.stringify(action.value)} via ${action.port}`);
        trace.push(`Behavior ${this.name}: Sent ${JSON.stringify(action.value)} via ${action.port}`);
      } else if (action.type === "Execute") {
        const executable = component.activities.find(a => a.name === action.activity);
        if (executable) {
          const input = simulationInputs.executables[action.activity] || [getDefaultValue(action.paramType)];
          const result = executable.execute(component, Array.isArray(input) ? input : [input], trace);
          log(result.log);
        }
      }
    });

    for (const transition of this.transitions) {
      if (transition.from === this.currentState) {
        const context = { variables: {} };
        Object.values(ports).forEach(p => {
          context.variables[p.name] = p.value;
          p.subports?.forEach(sp => {
            context.variables[`${p.name}.${sp.name}`] = sp.value;
          });
        });
        const valid = evaluateConstraint(transition.condition, context);
        if (valid) {
          this.currentState = transition.to;
          log(`Behavior ${this.name}: Transition from ${transition.from} to ${transition.to} on ${transition.condition}`);
          trace.push(`Behavior ${this.name}: Transition from ${transition.from} to ${transition.to} on ${transition.condition}`);
          break;
        }
      }
    }
  }
}

class SysADLBinding {
  constructor(source, target) {
    this.source = source;
    this.target = target;
  }

  propagate(data, components, ports, log, trace, dataTypes) {
    const srcPort = ports[this.source];
    const tgtPort = ports[this.target];
    if (!srcPort || !tgtPort) throw new Error(`Invalid binding: ${this.source} -> ${this.target}`);

    if (dataTypes[tgtPort.type] || tgtPort.type === "Composite") {
      if (typeof data !== "object" || data === null) {
        log(`Warning: Invalid data for ${tgtPort.type} port ${this.target}: ${JSON.stringify(data)}`);
        return;
      }
      tgtPort.validateValue(data, dataTypes);
      tgtPort.value = { ...data };
    } else {
      tgtPort.value = data;
    }
    srcPort.value = data;
    components[tgtPort.component].state[tgtPort.name] = tgtPort.value;
    log(`Binding: ${this.source} -> ${this.target} propagated data ${JSON.stringify(data)}`);
    trace.push(`Binding ${this.source} -> ${this.target}: ${JSON.stringify(data)}`);
  }
}

function evaluateConstraint(expr, context) {
  if (!expr) return true;
  const parts = expr.split(/\s*(>|<|==|!=)\s*/);
  if (parts.length !== 3) {
    if (expr.includes("!=")) {
      const [left, right] = expr.split("!=").map(s => s.trim());
      const lValue = context.variables[left] ?? left;
      return lValue !== right;
    }
    if (expr.includes(".")) {
      const [obj, field, op, value] = expr.replace(/\s*(==)\s*/, "$1").split(/\.|==/);
      const objValue = context.variables[obj] ? context.variables[obj][field] : context.variables[`${obj}.${field}`];
      return objValue === value.trim();
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

function getDefaultValue(type, dataTypes = {}) {
  if (dataTypes[type]) {
    return dataTypes[type].getDefaultValue();
  }
  switch (type) {
    case "Int": return 0;
    case "String": return "";
    case "Float": return 0.0;
    case "Composite": return {};
    case "Time": return { hours: 0, minutes: 0 };
    default: return null;
  }
}

const dataTypes = {}; // Escopo global para dataTypes

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
  const allocations = [];
  const requirements = [];
  const behaviors = {};
  const simulationInputs = { flows: {}, executables: {} };

  let currentComponent = null;
  let currentBlock = null;
  let blockLines = [];

  try {
    const lines = input.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith("//")) continue;

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
          configurations.push({ components: [], connectors: [], protocols: [], bindings: [] });
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
        } else if (blockHeader.startsWith("behavior")) {
          const match = blockHeader.match(/behavior\s+(\w+)\s+for\s+(\w+)/);
          const name = match[1];
          const component = match[2];
          currentBlock = "behavior";
          behaviors[name] = { name, component, states: [], transitions: [] };
          log(`Behavior defined: ${name} for ${component}`);
        }
        continue;
      }

      if (line === "}") {
        if (currentBlock === "component" && currentComponent) {
          blockLines.forEach(bl => {
            const bLine = bl.trim();
            if (bLine.startsWith("ports:")) {
              const portDefs = bLine.replace("ports:", "").trim().split(",");
              portDefs.forEach(p => {
                const parts = p.trim().split(":");
                const pname = parts[0].trim();
                const direction = parts[1].trim();
                const typeDef = parts.slice(2).join(":").trim();
                if (typeDef.startsWith("composite")) {
                  const subportMatch = p.match(/composite\s*{([^}]+)}/);
                  let subportDefs = [];
                  if (subportMatch) {
                    const subportStr = subportMatch[1].trim();
                    const subportItems = subportStr.includes(",")
                      ? subportStr.split(",")
                      : subportStr.split(/\s*;\s*|\s+/).filter(s => s.includes(":"));
                    subportDefs = subportItems.map(sp => {
                      const [spname, sptype] = sp.trim().split(":");
                      if (!spname || !sptype) throw new Error(`Invalid subport definition in ${p}: ${sp}`);
                      return { name: spname, type: sptype, value: getDefaultValue(sptype, dataTypes) };
                    });
                  } else {
                    throw new Error(`Invalid composite port definition: ${p}`);
                  }
                  const port = new SysADLPort(pname, direction, currentComponent.name, "Composite", getDefaultValue("Composite", dataTypes), subportDefs, dataTypes);
                  currentComponent.addPort(port);
                  ports[`${currentComponent.name}.${pname}`] = port;
                  subportDefs.forEach(sp => {
                    ports[`${currentComponent.name}.${pname}.${sp.name}`] = {
                      name: sp.name,
                      type: sp.type,
                      value: sp.value,
                      component: currentComponent.name,
                      direction,
                      parentPort: pname
                    };
                  });
                  log(`  Port ${pname} (${direction}, composite) added to ${currentComponent.name} with subports: ${subportDefs.map(sp => sp.name).join(", ") || "none"}`);
                } else {
                  const port = new SysADLPort(pname, direction, currentComponent.name, typeDef, getDefaultValue(typeDef, dataTypes), [], dataTypes);
                  currentComponent.addPort(port);
                  ports[`${currentComponent.name}.${pname}`] = port;
                  log(`  Port ${pname} (${direction}, ${typeDef}) added to ${currentComponent.name}`);
                }
              });
            } else if (bLine.startsWith("activities:")) {
              const activityDefs = bLine.replace("activities:", "").trim().split(",");
              activityDefs.forEach(a => {
                const match = a.trim().match(/(\w+)\s*($$ ([^)]*) $$)?/);
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
            } else if (l.startsWith("bindings:")) {
              const binds = l.replace("bindings:", "").trim().split(",");
              config.bindings = binds.map(b => {
                const [src, tgt] = b.trim().split("->").map(s => s.trim());
                return new SysADLBinding(src, tgt);
              });
              log(`  Configuration bindings: ${binds.join(", ")}`);
            }
          });
        } else if (currentBlock === "simulation") {
          blockLines.forEach(l => {
            if (l.startsWith("flow ")) {
              const match = l.match(/flow\s+(\S+)\s*=\s*([^;]+)/);
              if (match) {
                const port = match[1];
                if (!ports[port] && !Object.keys(ports).some(p => p.startsWith(port + "."))) {
                  throw new Error(`Port ${port} not found in simulation inputs`);
                }
                let value = match[2].trim();
                if (value.match(/^{.*}$/)) {
                  value = JSON.parse(value.replace(/(\w+):/g, '"$1":'));
                  if (dataTypes[ports[port]?.type]) {
                    const expectedFields = dataTypes[ports[port].type].fields.map(f => f.name);
                    if (!expectedFields.every(f => value[f] !== undefined)) {
                      throw new Error(`Invalid object for ${port}: expected fields ${expectedFields.join(", ")}`);
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
              const match = l.match(/executable\s+(\w+)\s*=\s*$$ ([^;]+) $$/);
              if (match) {
                const name = match[1];
                if (!executables[name]) throw new Error(`Executable ${name} not found in simulation inputs`);
                let values = match[2].trim();
                if (values.match(/^{.*}$/)) {
                  values = [JSON.parse(values.replace(/(\w+):/g, '"$1":'))];
                } else {
                  values = values.split(",").map(v => {
                    v = v.trim();
                    if (v.match(/^{.*}$/)) {
                      return JSON.parse(v.replace(/(\w+):/g, '"$1":'));
                    }
                    if (v.match(/^\d+$/)) return parseInt(v);
                    if (v.match(/^\d+\.\d+$/)) return parseFloat(v);
                    if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
                    return v;
                  });
                }
                simulationInputs.executables[name] = values.length === 1 ? values[0] : values;
                log(`  Simulation input: executable ${name} = ${JSON.stringify(simulationInputs.executables[name])}`);
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
        } else if (currentBlock === "behavior") {
          const name = Object.keys(behaviors).pop();
          const behavior = behaviors[name];
          blockLines.forEach(l => {
            if (l.startsWith("state")) {
              const match = l.match(/state\s+(\w+)\s*{([^}]+)}/);
              if (match) {
                const stateName = match[1];
                const actions = parseBehaviorActions(match[2]);
                behavior.states.push({ name: stateName, actions });
                log(`  State ${stateName} defined with actions: ${actions.map(a => a.type).join(", ")}`);
              }
            } else if (l.startsWith("transition")) {
              const match = l.match(/transition\s+from\s+(\w+)\s+to\s+(\w+)\s+on\s+([^;]+)/);
              if (match) {
                behavior.transitions.push({
                  from: match[1],
                  to: match[2],
                  condition: match[3].trim()
                });
                log(`  Transition from ${match[1]} to ${match[2]} on ${match[3]}`);
              }
            }
          });
          behaviors[name] = new SysADLBehavior(name, behavior.component, behavior.states, behavior.transitions);
        }
        currentBlock = null;
        blockLines = [];
        continue;
      }

      if (currentBlock) {
        blockLines.push(line);
        continue;
      }

      if (line.startsWith("flow")) {
        const [, src, , tgt] = line.split(" ");
        if (!ports[src] && !Object.keys(ports).some(p => p.startsWith(src + ".")) &&
            !ports[tgt] && !Object.keys(ports).some(p => p.startsWith(tgt + "."))) {
          throw new Error(`Flow ports not found: ${src}, ${tgt}`);
        }
        flows.push(new SysADLFlow(src, tgt));
        log(`Flow defined: ${src} -> ${tgt}`);
      } else if (line.startsWith("allocation")) {
        const match = line.match(/allocation\s+(\w+)\s*->\s*(\w+)/);
        if (match) {
          const [, activity, executable] = match;
          allocations.push(new SysADLAllocation(activity, executable));
          log(`Allocation defined: ${activity} -> ${executable}`);
        }
      } else if (line.startsWith("binding")) {
        const [, src, , tgt] = line.split(" ");
        if (!ports[src] || !ports[tgt]) throw new Error(`Binding ports not found: ${src}, ${tgt}`);
        configurations[configurations.length - 1]?.bindings.push(new SysADLBinding(src, tgt));
        log(`Binding defined: ${src} -> ${tgt}`);
      }
    }

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

    function parseBehaviorActions(str) {
      const actions = [];
      str.split(";").forEach(action => {
        action = action.trim();
        if (action.startsWith("send")) {
          const match = action.match(/send\s+(\w+)\s+via\s+(\S+)/);
          if (match) {
            actions.push({ type: "Send", value: match[1], port: match[2] });
          }
        } else if (action.startsWith("execute")) {
          const match = action.match(/execute\s+(\w+)\s*$$ ([^)]*) $$/);
          if (match) {
            const paramType = match[2].split(":")[1] || "Unknown";
            actions.push({ type: "Execute", activity: match[1], paramType });
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

    // Inicializar portas com valores de simulação
    Object.entries(simulationInputs.flows).forEach(([port, value]) => {
      if (ports[port]) {
        ports[port].validateValue(value, dataTypes);
        ports[port].value = typeof value === "object" && value !== null ? { ...value } : value;
        const compName = port.split(".")[0];
        if (components[compName]) {
          components[compName].state[port.split(".")[1]] = ports[port].value;
        }
        trace.push(`Port ${port} initialized with: ${JSON.stringify(value)}`);
      }
    });

    // Propagar fluxos
    flows.forEach(f => {
      const srcPort = ports[f.source] || Object.values(ports).find(p => p.subports?.some(sp => `${p.component}.${p.name}.${sp.name}` === f.source));
      const flowData = simulationInputs.flows[f.source] !== undefined
        ? simulationInputs.flows[f.source]
        : getDefaultValue(srcPort.type, dataTypes);
      trace.push(`Flow ${f.source} initialized with: ${JSON.stringify(flowData)}`);
      f.propagate(flowData, components, ports, log, trace, dataTypes);
    });

    // Validar requisitos
    Object.values(requirements).forEach(req => {
      const context = { variables: {} };
      Object.values(ports).forEach(p => {
        context.variables[p.name] = p.value;
        p.subports?.forEach(sp => {
          context.variables[`${p.name}.${sp.name}`] = sp.value;
        });
      });
      const valid = evaluateConstraint(req.condition, context);
      if (!valid) {
        log(`Requirement '${req.name}' failed: ${req.condition}`);
      } else {
        log(`Requirement '${req.name}' passed: ${req.condition}`);
        trace.push(`Requirement '${req.name}' passed: ${req.condition}`);
      }
    });

    log("\n--- Simulation Start ---");

    // Propagar bindings
    configurations.forEach(config => {
      config.bindings.forEach(binding => {
        const srcPort = ports[binding.source];
        const flowData = simulationInputs.flows[binding.source] || srcPort.value || getDefaultValue(srcPort.type, dataTypes);
        binding.propagate(flowData, components, ports, log, trace, dataTypes);
      });
    });

    // Executar comportamentos
    Object.values(behaviors).forEach(behavior => {
      const comp = components[behavior.component];
      if (comp) {
        behavior.execute(comp, ports, simulationInputs, log, trace);
      }
    });

    // Configurar componentes da configuração
    configurations.forEach(config => {
      config.components.forEach(c => {
        const compDef = components[c.definition];
        if (compDef) {
          const subComp = new SysADLComponent(c.name, c.definition, compDef.isAbstract);
          compDef.ports.forEach(p => {
            const port = new SysADLPort(p.name, p.direction, c.name, p.type, p.value, p.subports, dataTypes);
            subComp.addPort(port);
            ports[`${c.name}.${p.name}`] = port;
            p.subports?.forEach(sp => {
              ports[`${c.name}.${p.name}.${sp.name}`] = { ...sp, component: c.name, direction: p.direction, parentPort: p.name };
            });
          });
          compDef.activities.forEach(a => subComp.addActivity(new SysADLActivity(a.name, a.params)));
          compDef.behaviors.forEach(b => subComp.addBehavior(b));
          components[c.name] = subComp;
          subComp.activities.forEach(act => {
            const paramName = act.params[0]?.split(":")[0];
            const paramType = act.params[0]?.split(":")[1];
            const input = subComp.state[paramName] ||
                          simulationInputs.flows[`${subComp.type}.${paramName}`] ||
                          simulationInputs.flows[`${c.name}.${paramName}`] ||
                          getDefaultValue(paramType, dataTypes);
            const result = act.execute(subComp, [input], trace, dataTypes);
            log(result.log);
          });
        } else {
          log(`Warning: Component definition ${c.definition} not found for ${c.name}`);
        }
      });
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

    // Executar alocações
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
                      simulationInputs.executables[alloc.executable] ||
                      getDefaultValue(paramType, dataTypes);
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
        const inputs = simulationInputs.executables[ex.name] || ex.params.map(p => getDefaultValue(p.type, dataTypes));
        const applicableConstraints = Object.values(constraints).filter(c =>
          c.precondition && ex.params.some(p => c.precondition.includes(p.name)) ||
          c.postcondition && ex.params.some(p => c.postcondition.includes(p.name) || c.postcondition.includes("result"))
        );
        const result = ex.execute(Array.isArray(inputs) ? inputs : [inputs], log, applicableConstraints, trace);
        log(`Executable '${ex.name}' result: ${JSON.stringify(result)}`);
      }
    });

    log("\n--- Parameter Trace Summary ---");
    trace.forEach((entry, i) => {
      log(`${i + 1}. ${entry}`);
    });

    log("--- Simulation End ---");

  } catch (e) {
    log(`Error: ${e.message}`);
  }
}
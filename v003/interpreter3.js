// Initialize CodeMirror
const textarea = document.getElementById("input");
const editor = CodeMirror.fromTextArea(textarea, {
  mode: "javascript",
  lineNumbers: true,
  theme: "default"
});

// Runtime Model Classes
class SysADLStyle {
  constructor(name, invariants = [], functions = [], definitions = []) {
    this.name = name;
    this.invariants = invariants;
    this.functions = functions;
    this.definitions = definitions;
  }
}

class SysADLFunction {
  constructor(name, definition) {
    this.name = name;
    this.definition = definition;
  }
}

class SysADLInvariant {
  constructor(name, expression) {
    this.name = name;
    this.expression = expression;
  }
}

class SysADLAbstractComponent {
  constructor(name, ports = [], composition = []) {
    this.name = name;
    this.ports = ports;
    this.composition = composition;
  }
}

class SysADLAbstractConnector {
  constructor(name, ports = [], flows = []) {
    this.name = name;
    this.ports = ports;
    this.flows = flows;
  }
}

class SysADLAbstractActivity {
  constructor(name, inParams = [], outParams = []) {
    this.name = name;
    this.inParams = inParams;
    this.outParams = outParams;
  }
}

class SysADLAbstractProtocol {
  constructor(name, body) {
    this.name = name;
    this.body = body;
  }
}

class SysADLComponent {
  constructor(name, type = null, isAbstract = false, appliedStyles = [], abstractComponent = null) {
    this.name = name;
    this.type = type;
    this.isAbstract = isAbstract;
    this.appliedStyles = appliedStyles;
    this.abstractComponent = abstractComponent;
    this.ports = [];
    this.activities = [];
    this.bindings = [];
    this.state = {};
    this.subcomponents = [];
    this.connectors = [];
    this.protocols = [];
    this.properties = [];
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

  addProperty(property) {
    this.properties.push(property);
  }

  executeActivity(activityName, params, trace) {
    const activity = this.activities.find(a => a.name === activityName);
    if (!activity) throw new Error(`Activity ${activityName} not found in ${this.name}`);
    return activity.execute(this, params, trace);
  }

  validateAbstract() {
    if (this.abstractComponent) {
      this.abstractComponent.ports.forEach(ap => {
        if (!this.ports.some(p => p.name === ap.name && p.direction === ap.direction)) {
          throw new Error(`Component ${this.name} does not implement port ${ap.name} from ${this.abstractComponent.name}`);
        }
      });
    }
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

class SysADLCompositePort {
  constructor(name, ports = [], properties = []) {
    this.name = name;
    this.ports = ports;
    this.properties = properties;
  }
}

class SysADLConnector {
  constructor(name, ports = [], bindings = [], flows = []) {
    this.name = name;
    this.ports = ports;
    this.bindings = bindings;
    this.flows = flows;
  }
}

class SysADLConnectorBinding {
  constructor(source, destination) {
    this.source = source;
    this.destination = destination;
  }
}

class SysADLDelegation {
  constructor(source, destination) {
    this.source = source;
    this.destination = destination;
  }
}

class SysADLFlow {
  constructor(source, target, type = null) {
    this.source = source;
    this.target = target;
    this.type = type;
  }

  propagate(data, components, ports, log, trace) {
    const srcPort = ports[this.source];
    const tgtPort = ports[this.target];
    if (!srcPort || !tgtPort) throw new Error(`Invalid flow: ${this.source} -> ${this.target}`);
    if (srcPort.direction === "in" || tgtPort.direction === "out") {
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
  constructor(name, params = [], abstractActivity = null) {
    this.name = name;
    this.params = params;
    this.abstractActivity = abstractActivity;
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

class SysADLActivitySwitch {
  constructor(cases = []) {
    this.cases = cases;
  }

  execute(component, inputs, trace, context) {
    for (const c of this.cases) {
      const condition = evaluateExpression(c.condition, context);
      if (condition) {
        const target = component.activities.find(a => a.name === c.target);
        if (target) {
          const result = target.execute(component, inputs, trace);
          trace.push(`Switch case executed: ${c.condition} -> ${c.target}`);
          return result;
        }
      }
    }
    trace.push(`No switch case matched`);
    return null;
  }
}

class SysADLDataStore {
  constructor(name, type, initValue = null) {
    this.name = name;
    this.type = type;
    this.value = initValue;
  }
}

class SysADLDataBuffer {
  constructor(name, type, initValue = null) {
    this.name = name;
    this.type = type;
    this.value = initValue;
  }
}

class SysADLExecutable {
  constructor(name, params, returnType, statements) {
    this.name = name;
    this.params = params;
    this.returnType = returnType;
    this.statements = statements;
  }

  execute(inputs, log, constraints = [], trace, context = { variables: {} }) {
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
      result = this.executeStatement(stmt, context, log, trace);
      if (stmt.type === "ReturnStatement") break;
    }

    constraints.forEach(c => {
      if (c.postcondition && (this.params.some(p => c.postcondition.includes(p.name)) || c.postcondition.includes("result"))) {
        context.variables["result"] = result;
        const valid = evaluateConstraint(c.postcondition, context);
        if (!valid) throw new Error(`Postcondition failed for ${c.name}: ${c.postcondition}`);
        log(`Postcondition '${c.postcondition}' passed for ${c.name}`);
        trace.push(`Postcondition '${c.postcondition}' passed for ${c.name}`);
      }
    });

    return result;
  }

  executeStatement(stmt, context, log, trace) {
    if (stmt.type === "VariableDecl") {
      context.variables[stmt.name] = stmt.value ? evaluateExpression(stmt.value, context) : getDefaultValue(stmt.dataType);
      log(`Variable ${stmt.name} = ${JSON.stringify(context.variables[stmt.name])}`);
      trace.push(`Variable ${stmt.name} = ${JSON.stringify(context.variables[stmt.name])}`);
    } else if (stmt.type === "ReturnStatement") {
      return evaluateExpression(stmt.value, context);
    } else if (stmt.type === "BlockStatement") {
      for (const s of stmt.body) {
        const result = this.executeStatement(s, context, log, trace);
        if (s.type === "ReturnStatement") return result;
      }
    } else if (stmt.type === "IfBlockStatement") {
      if (evaluateExpression(stmt.condition, context)) {
        return this.executeStatement(stmt.body, context, log, trace);
      } else if (stmt.else) {
        return this.executeStatement(stmt.else, context, log, trace);
      }
    } else if (stmt.type === "WhileStatement") {
      while (evaluateExpression(stmt.condition, context)) {
        const result = this.executeStatement(stmt.body, context, log, trace);
        if (result) return result;
      }
    } else if (stmt.type === "ForStatement") {
      for (const v of stmt.control.vars) {
        context.variables[v.var.name] = evaluateExpression(v.expr, context);
        const result = this.executeStatement(stmt.body, context, log, trace);
        if (result) return result;
      }
    } else if (stmt.type === "SwitchStatement") {
      const expr = evaluateExpression(stmt.expr, context);
      for (const clause of stmt.clauses) {
        if (clause.type === "SwitchClause" && evaluateExpression(clause.value, context) === expr) {
          return this.executeStatement(clause.body, context, log, trace);
        } else if (clause.type === "DefaultSwitchClause") {
          return this.executeStatement(clause.body, context, log, trace);
        }
      }
    }
    return null;
  }
}

class SysADLProtocol {
  constructor(name, actions, control = "once", altType = null, recursive = null) {
    this.name = name;
    this.actions = actions;
    this.control = control;
    this.altType = altType;
    this.recursive = recursive;
  }

  execute(component, ports, log, trace, iterations = 1) {
    const results = [];
    const executeOnce = () => {
      this.actions.forEach(action => {
        if (action.type === "Send") {
          const port = ports[action.port];
          if (!port) throw new Error(`Port ${action.port} not found`);
          if (port.direction !== "out" && port.direction !== "inout") throw new Error(`Invalid send port: ${action.port}`);
          port.value = action.value;
          component.state[port.name] = action.value;
          log(`Protocol ${this.name}: Sent ${JSON.stringify(action.value)} via ${action.port}`);
          trace.push(`Protocol ${this.name}: Sent ${JSON.stringify(action.value)} via ${action.port}`);
          results.push({ action: "send", port: action.port, value: action.value });
        } else if (action.type === "Receive") {
          const port = ports[action.port];
          if (!port) throw new Error(`Port ${action.port} not found`);
          if (port.direction !== "in" && port.direction !== "inout") throw new Error(`Invalid receive port: ${action.port}`);
          const value = port.value !== null ? port.value : "unknown";
          log(`Protocol ${this.name}: Received ${JSON.stringify(value)} from ${action.port} into ${action.variable}`);
          trace.push(`Protocol ${this.name}: Received ${JSON.stringify(value)} from ${action.port} into ${action.variable}`);
          results.push({ action: "receive", port: action.port, variable: action.variable, value });
        }
      });
    };

    if (this.control === "always") {
      for (let i = 0; i < iterations; i++) executeOnce(); // Limited iterations to prevent infinite loops
    } else if (this.control === "several") {
      for (let i = 0; i < iterations; i++) executeOnce();
    } else if (this.control === "once") {
      executeOnce();
    } else if (this.control === "perhaps") {
      if (Math.random() > 0.5) executeOnce();
    }

    if (this.recursive && this.altType) {
      const recursiveProto = new SysADLProtocol(this.name, this.recursive.actions, this.recursive.control, null, null);
      results.push(...recursiveProto.execute(component, ports, log, trace, iterations));
    }

    return results;
  }
}

class SysADLConstraint {
  constructor(name, precondition, postcondition, kind = "invariant") {
    this.name = name;
    this.precondition = precondition;
    this.postcondition = postcondition;
    this.kind = kind;
  }
}

class SysADLDataType {
  constructor(name, fields) {
    this.name = name;
    this.fields = fields;
  }
}

class SysADLValueType {
  constructor(name, unit = null, dimension = null) {
    this.name = name;
    this.unit = unit;
    this.dimension = dimension;
  }
}

class SysADEnumeration {
  constructor(name, literals = []) {
    this.name = name;
    this.literals = literals;
  }
}

class SysADLUnit {
  constructor(name, dimension = null) {
    this.name = name;
    this.dimension = dimension;
  }
}

class SysADLDimension {
  constructor(name) {
    this.name = name;
  }
}

class SysADLConfiguration {
  constructor(components, connectors, protocols = [], delegations = []) {
    this.components = components;
    this.connectors = connectors;
    this.protocols = protocols;
    this.delegations = delegations;
  }
}

class SysADLAllocation {
  constructor(activity, executable) {
    this.activity = activity;
    this.executable = executable;
  }
}

class SysADLRequirement {
  constructor(name, condition, derived = []) {
    this.name = name;
    this.condition = condition;
    this.derived = derived;
  }
}

class SysADLPackage {
  constructor(name, imports = [], definitions = [], styles = []) {
    this.name = name;
    this.imports = imports;
    this.definitions = definitions;
    this.styles = styles;
  }
}

// Helper Functions
function evaluateConstraint(expr, context) {
  if (!expr) return true;
  const parts = expr.split(/\s*(>|<|==|!=|&&|\|\||implies)\s*/);
  if (parts.length === 1) {
    return context.variables[expr] ?? expr !== "null";
  }
  if (parts.length === 3) {
    const [left, op, right] = parts;
    const lValue = context.variables[left] ?? (left === "null" ? null : parseFloat(left) || left);
    const rValue = context.variables[right] ?? (right === "null" ? null : parseFloat(right) || right);
    switch (op) {
      case ">": return lValue > rValue;
      case "<": return lValue < rValue;
      case "==": return lValue === rValue;
      case "!=": return lValue !== rValue;
      case "&&": return lValue && rValue;
      case "||": return lValue || rValue;
      case "implies": return !lValue || rValue;
      default: return true;
    }
  }
  return true;
}

function evaluateExpression(expr, context) {
  if (!expr) return null;
  if (expr.type === "Literal") return expr.value;
  if (expr.type === "Object") return { ...expr.value };
  if (expr.type === "Variable") return context.variables[expr.value] ?? expr.value;
  if (expr.type === "Binary") {
    const left = evaluateExpression(expr.left, context);
    const right = evaluateExpression(expr.right, context);
    switch (expr.operator) {
      case "+": return typeof left === "string" || typeof right === "string" ? `${left}${right}` : left + right;
      case "-": return left - right;
      case "*": return left * right;
      case "/": return left / right;
      case "%": return left % right;
      case "<<": return left << right;
      case ">>": return left >> right;
      case ">>>": return left >>> right;
      case "<": return left < right;
      case ">": return left > right;
      case "<=": return left <= right;
      case ">=": return left >= right;
      case "==": return left === right;
      case "!=": return left !== right;
      case "&": return left & right;
      case "|": return left | right;
      case "^": return left ^ right;
      case "&&": return left && right;
      case "||": return left || right;
      case "implies": return !left || right;
    }
  } else if (expr.type === "FieldAccess") {
    const obj = evaluateExpression(expr.object, context);
    return obj ? obj[expr.field] : null;
  } else if (expr.type === "Unary") {
    const op = evaluateExpression(expr.operand, context);
    switch (expr.operator) {
      case "!": return !op;
      case "~": return ~op;
      case "toString": return String(op);
      case "toInt": return parseInt(op);
      case "++": return op + 1;
      case "--": return op - 1;
    }
  } else if (expr.type === "Conditional") {
    const condition = evaluateExpression(expr.op1, context);
    return condition ? evaluateExpression(expr.op2, context) : evaluateExpression(expr.op3, context);
  } else if (expr.type === "SequenceConstruction") {
    return expr.elements.map(e => evaluateExpression(e, context));
  } else if (expr.type === "SequenceAccess") {
    const seq = evaluateExpression(expr.primary, context);
    const index = evaluateExpression(expr.index, context);
    return seq[index];
  }
  return null;
}

function getDefaultValue(type) {
  switch (type) {
    case "Int": return 0;
    case "String": return "";
    case "Float": return 0.0;
    case "Load": return { id: "", weight: 0 };
    case "Time": return { hours: 0, minutes: 0 };
    case "Boolean": return false;
    case "Position": return { x: 0, y: 0 };
    case "Status": return "IDLE";
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

  const packages = {};
  const styles = {};
  const abstractComponents = {};
  const abstractConnectors = {};
  const abstractActivities = {};
  const abstractProtocols = {};
  const components = {};
  const ports = {};
  const connectors = {};
  const flows = [];
  const executables = {};
  const configurations = [];
  const protocols = {};
  const constraints = {};
  const dataTypes = {};
  const valueTypes = {};
  const enumerations = {};
  const units = {};
  const dimensions = {};
  const allocations = [];
  const requirements = {};
  const simulationInputs = { flows: {}, executables: {} };

  let currentComponent = null;
  let currentBlock = null;
  let blockLines = [];

  try {
    const lines = input.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      console.log(`Line ${i + 1}: ${line}`);
      if (!line || line.startsWith("//")) continue;

      // Detect block start
      if (line.endsWith("{")) {
        const blockHeader = line.slice(0, -1).trim();
        blockLines = [];

        if (blockHeader.startsWith("package")) {
          const name = blockHeader.split(" ")[1];
          currentBlock = "package";
          packages[name] = new SysADLPackage(name);
          log(`Package defined: ${name}`);
        } else if (blockHeader.startsWith("style")) {
          const name = blockHeader.split(" ")[1];
          currentBlock = "style";
          styles[name] = { name, invariants: [], functions: [], definitions: [] };
          log(`Style defined: ${name}`);
        } else if (blockHeader.startsWith("abstract component def")) {
          const name = blockHeader.split(" ")[3];
          currentBlock = "abstract_component";
          abstractComponents[name] = new SysADLAbstractComponent(name);
          log(`Abstract Component defined: ${name}`);
        } else if (blockHeader.startsWith("abstract connector def")) {
          const name = blockHeader.split(" ")[3];
          currentBlock = "abstract_connector";
          abstractConnectors[name] = new SysADLAbstractConnector(name);
          log(`Abstract Connector defined: ${name}`);
        } else if (blockHeader.startsWith("abstract activity def")) {
          const name = blockHeader.split(" ")[3];
          currentBlock = "abstract_activity";
          abstractActivities[name] = new SysADLAbstractActivity(name);
          log(`Abstract Activity defined: ${name}`);
        } else if (blockHeader.startsWith("activity protocol")) {
          const name = blockHeader.split(" ")[2];
          currentBlock = "abstract_protocol";
          abstractProtocols[name] = { name, body: [] };
          log(`Abstract Protocol defined: ${name}`);
        } else if (blockHeader.startsWith("component def")) {
          const match = blockHeader.match(/component def (\w+)(?:\s+implements\s+(\S+))?/);
          const name = match[1];
          const abstractComp = match[2] ? abstractComponents[match[2]] : null;
          currentComponent = new SysADLComponent(name, null, false, [], abstractComp);
          components[name] = currentComponent;
          currentBlock = "component";
          log(`Component defined: ${name}${abstractComp ? ` implements ${match[2]}` : ""}`);
        } else if (blockHeader.startsWith("connector def")) {
          const match = blockHeader.match(/connector def (\w+)(?:\s+implements\s+(\S+))?/);
          const name = match[1];
          currentBlock = "connector";
          connectors[name] = new SysADLConnector(name);
          log(`Connector defined: ${name}`);
        } else if (blockHeader.startsWith("port def")) {
          const name = blockHeader.split(" ")[2];
          currentBlock = "port";
          ports[name] = new SysADLCompositePort(name);
          log(`Port defined: ${name}`);
        } else if (blockHeader.startsWith("executable def")) {
          const match = blockHeader.match(/executable def (\w+)/);
          const name = match[1];
          currentBlock = "executable";
          executables[name] = { name, params: [], statements: [] };
          log(`Executable defined: ${name}`);
        } else if (blockHeader === "configuration") {
          currentBlock = "configuration";
          configurations.push(new SysADLConfiguration([], [], [], []));
          log(`Configuration defined`);
        } else if (blockHeader.startsWith("protocol")) {
          const name = blockHeader.split(" ")[1];
          currentBlock = "protocol";
          protocols[name] = { name, actions: [], control: "once", altType: null, recursive: null };
          log(`Protocol defined: ${name}`);
        } else if (blockHeader.startsWith("constraint def")) {
          const name = blockHeader.split(" ")[2];
          currentBlock = "constraint";
          constraints[name] = { name, precondition: null, postcondition: null, kind: "invariant" };
          log(`Constraint defined: ${name}`);
        } else if (blockHeader.startsWith("datatype")) {
          const name = blockHeader.split(" ")[1];
          currentBlock = "datatype";
          dataTypes[name] = { name, fields: [] };
          log(`DataType defined: ${name}`);
        } else if (blockHeader.startsWith("value type")) {
          const name = blockHeader.split(" ")[2];
          currentBlock = "valuetype";
          valueTypes[name] = { name, unit: null, dimension: null };
          log(`ValueType defined: ${name}`);
        } else if (blockHeader.startsWith("enum")) {
          const name = blockHeader.split(" ")[1];
          currentBlock = "enumeration";
          enumerations[name] = { name, literals: [] };
          log(`Enumeration defined: ${name}`);
        } else if (blockHeader.startsWith("unit")) {
          const name = blockHeader.split(" ")[1];
          currentBlock = "unit";
          units[name] = { name, dimension: null };
          log(`Unit defined: ${name}`);
        } else if (blockHeader.startsWith("dimension")) {
          const name = blockHeader.split(" ")[1];
          currentBlock = "dimension";
          dimensions[name] = new SysADLDimension(name);
          log(`Dimension defined: ${name}`);
        } else if (blockHeader === "simulation") {
          currentBlock = "simulation";
          log(`Simulation inputs defined`);
        } else if (blockHeader.startsWith("requirement")) {
          const name = blockHeader.split(" ")[1];
          currentBlock = "requirement";
          requirements[name] = { name, condition: null, derived: [] };
          log(`Requirement defined: ${name}`);
        }
        continue;
      }

      // Detect block end
      if (line === "}") {
        if (currentBlock === "package") {
          const name = Object.keys(packages).pop();
          blockLines.forEach(bl => {
            if (bl.startsWith("import")) {
              packages[name].imports.push(bl.replace("import ", "").trim().replace(";", ""));
            } else if (bl.startsWith("using")) {
              packages[name].definitions.push(bl.replace("using ", "").trim().replace(";", ""));
            } else if (bl.startsWith("style")) {
              packages[name].styles.push(bl.split(" ")[1].trim());
            }
          });
        } else if (currentBlock === "style") {
          const name = Object.keys(styles).pop();
          blockLines.forEach(bl => {
            if (bl.startsWith("invariant")) {
              const match = bl.match(/invariant\s+(\w+)\s*=\s*([^;]+)/);
              if (match) styles[name].invariants.push(new SysADLInvariant(match[1], match[2]));
            } else if (bl.startsWith("function")) {
              const match = bl.match(/function\s+(\w+)\s*=\s*([^;]+)/);
              if (match) styles[name].functions.push(new SysADLFunction(match[1], match[2]));
            } else if (bl.startsWith("abstract")) {
              const def = bl.split(" ")[1];
              const typeName = bl.match(/def\s+(\w+)/)?.[1];
              if (def === "component" && typeName) {
                styles[name].definitions.push(new SysADLAbstractComponent(typeName));
              } else if (def === "connector" && typeName) {
                styles[name].definitions.push(new SysADLAbstractConnector(typeName));
              } else if (def === "activity" && typeName) {
                styles[name].definitions.push(new SysADLAbstractActivity(typeName));
              }
            }
          });
          styles[name] = new SysADLStyle(name, styles[name].invariants, styles[name].functions, styles[name].definitions);
        } else if (currentBlock === "abstract_component") {
          const name = Object.keys(abstractComponents).pop();
          blockLines.forEach(bl => {
            if (bl.startsWith("ports:")) {
              abstractComponents[name].ports.push(...bl.replace("ports:", "").trim().split(",").map(p => p.trim().split(":")).map(([pname, direction]) => ({ name: pname, direction })));
            } else if (bl.startsWith("compose")) {
              abstractComponents[name].composition.push(...bl.replace("compose ", "").trim().split(",").map(c => c.trim()));
            }
          });
        } else if (currentBlock === "abstract_connector") {
          const name = Object.keys(abstractConnectors).pop();
          blockLines.forEach(line => {
            if (line.startsWith("participants:")) {
              abstractConnectors[name].ports.push(...line.replace("participants:", "").trim().split(",").map(p => {
                const match = p.trim().match(/~?(\w+):(\w+)/);
                return match ? { name: match[1], direction: match[2] } : null;
              }).filter(p => p));
            } else if (line.startsWith("flows:")) {
              abstractConnectors[name].flows.push(...line.replace("flows:", "").trim().split(",").map(f => {
                const match = f.match(/flow\s+(\w+)\s+to\s+(\w+)/);
                return match ? { source: match[1], target: match[2] } : null;
              }).filter(f => f));
            }
          });
        } else if (currentBlock === "abstract_activity") {
          const name = Object.keys(abstractActivities).pop();
          const paramsMatch = blockHeader.match(/\((\w+:\w+(?:,\s*\w+:\w+)*)?\)(?:\s*\(([^)]*)\))?/);
          if (paramsMatch) {
            abstractActivities[name].inParams = paramsMatch[1] ? paramsMatch[1].split(",").map(p => p.trim()) : [];
            abstractActivities[name].outParams = paramsMatch[2] ? paramsMatch[2].split(",").map(p => p.trim()) : [];
          }
        } else if (currentBlock === "abstract_protocol") {
          const name = Object.keys(abstractProtocols).pop();
          abstractProtocols[name].body = parseProtocolBody(blockLines);
          abstractProtocols[name] = new SysADLAbstractProtocol(name, abstractProtocols[name].body);
        } else if (currentBlock === "component" && currentComponent) {
          blockLines.forEach(bl => {
            const bLine = bl.trim();
            if (bLine.startsWith("ports:")) {
              const portDefs = bLine.replace("ports:", "").trim().split(",").map(p => p.trim()).filter(p => p);
              portDefs.forEach(p => {
                const parts = p.split(":");
                const name = parts[0];
                const direction = parts[1];
                const type = parts[2] || "any";
                const port = new SysADLPort(name, direction, currentComponent.name, type);
                currentComponent.addPort(port);
                ports[`${currentComponent.name}.${name}`] = port;
                log(`Port ${name} (${direction}, ${type}) added to ${currentComponent.name}`);
              });
            } else if (bLine.startsWith("activities:")) {
              const activityDefsRaw = bLine.replace("activities:", "").trim();
              const activityDefs = [];
              let current = "";
              let parenCount = 0;
              for (const char of activityDefsRaw) {
                if (char === "(") parenCount++;
                else if (char === ")") parenCount--;
                else if (char === "," && parenCount === 0) {
                  if (current.trim()) activityDefs.push(current.trim());
                  current = "";
                } else {
                  current += char;
                }
              }
              if (current.trim()) activityDefs.push(current.trim());

              activityDefs.forEach(a => {
                console.log(`Processing activity: ${a}`);
                const match = a.match(/(\w+)\s*\(([^)]*)\)(?:\s+implements\s+(\S+))?/);
                if (!match) {
                  log(`Warning: Invalid activity format: ${a}`);
                  return;
                }
                const name = match[1];
                const params = match[2] ? match[2].split(",").map(p => p.trim()).filter(p => p && p.includes(":")) : [];
                const abstractAct = match[3] ? abstractActivities[match[3]] : null;
                const activity = new SysADLActivity(name, params, abstractAct);
                currentComponent.addActivity(activity);
                log(`Activity ${name} (${params.join(", ")}) added to ${currentComponent.name}${abstractAct ? ` implements ${match[3]}` : ""}`);
              });
            } else if (bLine.startsWith("property")) {
              const match = bLine.match(/property\s+(\w+)(?::(\w+))?(?:\s*=\s*([^;]+))?/);
              if (match) {
                currentComponent.addProperty({ name: match[1], type: match[2] || "", value: match[3] ? parseExpression(match[3]) : null });
                log(`Property ${match[1]} added to ${currentComponent.name}`);
              }
            }
          });
          currentComponent.validateAbstract();
          currentComponent = null;
        } else if (currentBlock === "port") {
          const name = Object.keys(ports).pop();
          blockLines.forEach(line => {
            if (line.startsWith("ports:")) {
              ports[name].ports.push(...line.replace("ports:", "").trim().split(",").map(p => {
                const [pname, ptype] = p.trim().split(":");
                return { name: pname, definition: ptype };
              }));
            } else if (line.startsWith("property")) {
              const match = line.match(/property\s+(\w+)(?::(\w+))?(?:\s*=\s*([^;]+))?/);
              if (match) {
                ports[name].properties.push({ name: match[1], type: match[2] || "", value: match[3] ? parseExpression(match[3]) : null });
              }
            }
          });
        } else if (currentBlock === "connector") {
          const name = Object.keys(connectors).pop();
          blockLines.forEach(line => {
            if (line.startsWith("participants:")) {
              const participantStr = line.replace("participants:", "").trim();
              if (participantStr) {
                const participants = participantStr.split(",").map(p => p.trim()).filter(p => p).map(p => {
                  const match = p.match(/~?(\w+):(\w+)/);
                  if (!match) {
                    log(`Warning: Invalid participant format: ${p}`);
                    return null;
                  }
                  return { name: match[1], direction: match[2] };
                }).filter(p => p);
                connectors[name].ports = participants;
                log(`Participants added to ${name}: ${participants.map(p => p.name).join(", ")}`);
              }
            } else if (line.startsWith("flows:")) {
              const flowStr = line.replace("flows:", "").trim().replace(/;+$/, "");
              console.log(`Flow string: ${flowStr}`);
              if (flowStr) {
                const flowEntries = flowStr.split(",").map(f => f.trim()).filter(f => f);
                console.log(`Flow entries: ${flowEntries}`);
                connectors[name].flows = flowEntries.map(f => {
                  const match = f.match(/flow\s+(\w+)\s+to\s+(\w+)/);
                  if (!match) {
                    log(`Warning: Invalid flow format: ${f}`);
                    return null;
                  }
                  const [, source, target] = match;
                  return new SysADLFlow(source, target);
                }).filter(f => f);
                log(`Flows added to ${name}: ${connectors[name].flows.map(f => `${f.source} -> ${f.target}`).join(", ")}`);
              }
            } else if (line.startsWith("bindings:")) {
              const bindingStr = line.replace("bindings:", "").trim().replace(/;+$/, "");
              console.log(`Binding string: ${bindingStr}`);
              if (bindingStr) {
                const bindingEntries = bindingStr.split(",").map(b => b.trim()).filter(b => b);
                console.log(`Binding entries: ${JSON.stringify(bindingEntries)}`);
                connectors[name].bindings = bindingEntries.map(b => {
                  const [source, target] = b.split("=").map(s => s.trim());
                  if (!source || !target) {
                    log(`Warning: Invalid binding format: ${b}`);
                    return null;
                  }
                  return new SysADLConnectorBinding(source, target);
                }).filter(b => b);
                log(`Bindings added to ${name}: ${connectors[name].bindings.map(b => `${b.source} = ${b.target}`).join(", ")}`);
              }
            }
          });
        } else if (currentBlock === "executable") {
          const name = Object.keys(executables).pop();
          const executable = executables[name];
          executable.params = parseParams(blockHeader);
          executable.statements = parseExecutableBody(blockLines);
          executables[name] = new SysADLExecutable(
            name,
            executable.params,
            executable.params.find(p => p.name === "result")?.type || "Unknown",
            executable.statements
          );
          log(`Executable body parsed: ${name}`);
        } else if (currentBlock === "configuration") {
          const config = configurations[configurations.length - 1];
          blockLines.forEach(line => {
            if (line.startsWith("components:")) {
              line.replace("components:", "").trim().split(",").map(c => c.trim()).forEach(c => {
                const [name, type] = c.split(":");
                components[name] = new SysADLComponent(name, type);
                log(`Component instance: ${name} of type ${type}`);
              });
            } else if (line.startsWith("connectors:")) {
              config.connectors.push(...line.replace("connectors:", "").trim().split(",").map(c => {
                const [name, def] = c.trim().split(":");
                return { name, definition: def };
              }));
              log(`Configuration connectors: ${config.connectors.map(c => c.name).join(", ")}`);
            } else if (line.startsWith("protocols:")) {
              config.protocols.push(...line.replace("protocols:", "").trim().split(",").map(p => p.trim()));
              log(`Configuration protocols: ${config.protocols.join(", ")}`);
            } else if (line.startsWith("delegations:")) {
              config.delegations.push(...line.replace("delegations:", "").trim().split(",").map(d => {
                const [, src, target] = d.match(/(\S+)\s+to\s+(\S+)/) || [];
                return src && target ? new SysADLDelegation(src, target) : null;
              }).filter(d => d));
              log(`Configuration delegations: ${config.delegations.map(d => `${d.source} to ${d.target}`).join(", ")}`);
            }
          });
        } else if (currentBlock === "protocol") {
          const name = Object.keys(protocols).pop();
          const proto = protocols[name];
          const controlMatch = blockLines.find(l => ["always", "several", "once", "perhaps"].includes(l.trim().split(" ")[0]));
          if (controlMatch) {
            proto.control = controlMatch.trim().split(" ")[0];
            blockLines = blockLines.filter(l => l !== controlMatch);
          }
          const altMatch = blockLines.find(l => l.includes(";") || l.includes("|"));
          if (altMatch) {
            proto.altType = altMatch.includes(";") ? "complementary" : "alternative";
            const [mainBody, recursiveBody] = altMatch.includes(";") ? altMatch.split(";") : altMatch.split("|");
            proto.actions = parseProtocolBody([mainBody]);
            proto.recursive = { actions: parseProtocolBody([recursiveBody]), control: proto.control };
          } else {
            proto.actions = parseProtocolBody(blockLines);
          }
          protocols[name] = new SysADLProtocol(name, proto.actions, proto.control, proto.altType, proto.recursive);
          log(`Protocol parsed: ${name}`);
        } else if (currentBlock === "constraint") {
          const name = Object.keys(constraints).pop();
          blockLines.forEach(line => {
            if (line.startsWith("pre:")) {
              constraints[name].precondition = line.replace("pre:", "").trim().replace(";", "");
              log(`Precondition: ${constraints[name].precondition}`);
            } else if (line.startsWith("post:")) {
              constraints[name].postcondition = line.replace("post:", "").trim().replace(";", "");
              log(`Postcondition: ${constraints[name].postcondition}`);
            } else if (line.startsWith("kind:")) {
              constraints[name].kind = line.replace("kind:", "").trim().replace(";", "");
              log(`Constraint kind: ${constraints[name].kind}`);
            }
          });
          constraints[name] = new SysADLConstraint(name, constraints[name].precondition, constraints[name].postcondition, constraints[name].kind);
        } else if (currentBlock === "datatype") {
          const name = Object.keys(dataTypes).pop();
          dataTypes[name].fields = blockLines.map(line => {
            const cleanLine = line.trim().replace(";", "");
            const [fname, ftype] = cleanLine.split(":");
            if (!fname || !ftype) return null;
            return { name: fname.trim(), type: ftype.trim() };
          }).filter(f => f);
          dataTypes[name] = new SysADLDataType(name, dataTypes[name].fields);
          log(`DataType fields: ${dataTypes[name].fields.map(f => `${f.name}: ${f.type}`).join(", ")}`);
        } else if (currentBlock === "valuetype") {
          const name = Object.keys(valueTypes).pop();
          blockLines.forEach(line => {
            if (line.startsWith("unit")) {
              valueTypes[name].unit = line.replace("unit", "").replace("=", "").trim().replace(";", "");
            } else if (line.startsWith("dimension")) {
              valueTypes[name].dimension = line.replace("dimension", "").trim().replace(";", "");
            }
          });
          valueTypes[name] = new SysADLValueType(name, valueTypes[name].unit, valueTypes[name].dimension);
          log(`ValueType defined: ${name}`);
        } else if (currentBlock === "enumeration") {
          const name = Object.keys(enumerations).pop();
          enumerations[name].literals = blockLines[0]
            ?.trim()
            .replace(/[{};\s]/g, "")
            .split(",")
            .map(l => l.trim())
            .filter(l => l);
          enumerations[name] = new SysADEnumeration(name, enumerations[name].literals);
          log(`Enumeration ${name} literals: ${enumerations[name].literals.join(", ")}`);
        } else if (currentBlock === "unit") {
          const name = Object.keys(units).pop();
          blockLines.forEach(line => {
            if (line.startsWith("dimension")) {
              units[name].dimension = line.replace("dimension", "").trim().replace(";", "");
            }
          });
          units[name] = new SysADLUnit(name, units[name].dimension);
          log(`Unit defined: ${name}`);
        } else if (currentBlock === "dimension") {
          // Nothing to do
        } else if (currentBlock === "simulation") {
          blockLines.forEach(line => {
            if (line.startsWith("flow")) {
              const match = line.match(/flow\s+(\S+)\s*=\s*([^;]+)/);
              if (match) {
                const port = match[1];
                if (!ports[port]) {
                  log(`Warning: Port ${port} not found in simulation`);
                  return;
                }
                let value = match[2].trim();
                if (value.match(/^{.*}/)) {
                  try {
                    value = JSON.parse(value.replace(/(\w+):/g, '"$1":'));
                    if (ports[port].type === "Load" && (!value.id || typeof value.weight !== "number")) {
                      throw new Error(`Invalid Load object for ${port}: expected { id: String, weight: number }`);
                    }
                  } catch (e) {
                    log(`Error parsing flow value: ${e.message}`);
                    return;
                  }
                } else if (value.match(/^\d+$/)) {
                  value = parseInt(value);
                } else if (value.match(/^\d+\.\d+$/)) {
                  value = parseFloat(value);
                } else if (value.startsWith('"') && value.endsWith('"')) {
                  value = value.slice(1, -1);
                } else if (value === "true" || value === "false") {
                  value = value === "true";
                }
                simulationInputs.flows[port] = value;
                log(`Simulation input: flow ${port} = ${JSON.stringify(value)}`);
              }
            } else if (line.startsWith("executable")) {
              const match = line.match(/executable\s+(\w+)\s*=\s*\[(.*)\]/);
              if (match) {
                const name = match[1];
                if (!executables[name]) {
                  log(`Warning: Executable ${name} not found`);
                  return;
                }
                const values = match[2].split(",").map(v => {
                  v = v.trim();
                  if (v.match(/^{.*}/)) {
                    return JSON.parse(v.replace(/(\w+):/g, '"$1":'));
                  } else if (v.match(/^\d+$/)) {
                    return parseInt(v);
                  } else if (v.match(/^\d+\.\d+$/)) {
                    return parseFloat(v);
                  } else if (v.startsWith('"') && v.endsWith('"')) {
                    return v.slice(1, -1);
                  } else if (v === "true" || v === "false") {
                    return v === "true";
                  }
                  return v;
                });
                simulationInputs.executables[name] = values;
                log(`Simulation input: executable ${name} = ${JSON.stringify(values)}`);
              }
            }
          });
        } else if (currentBlock === "requirement") {
          const name = Object.keys(requirements).pop();
          blockLines.forEach(line => {
            if (line.startsWith("condition:")) {
              requirements[name].condition = line.replace("condition:", "").trim().replace(";", "");
              log(`Requirement condition: ${requirements[name].condition}`);
            } else if (line.startsWith("derive")) {
              requirements[name].derived = line.replace("derive ", "").trim().replace(";", "").split(",").map(d => d.trim());
              log(`Requirement derived: ${requirements[name].derived.join(", ")}`);
            }
          });
          requirements[name] = new SysADLRequirement(name, requirements[name].condition, requirements[name].derived);
        }
        currentBlock = null;
        blockLines = [];
        continue;
      }

      // Collect block lines
      if (currentBlock) {
        blockLines.push(line);
        continue;
      }

      // Process external flows
      if (line.startsWith("flow")) {
        const cleanLine = line.replace(/[;]/g, "").trim();
        console.log(`Processing flow: ${cleanLine}`);
        console.log(`Available ports: ${JSON.stringify(Object.keys(ports))}`);
        const match = cleanLine.match(/(\w+)\s+from\s+(\S+)\s+to\s+(\S+)/);
        if (match) {
          const [, type, source, target] = match;
          const sourceKey = source.toLowerCase();
          const targetKey = target.toLowerCase();
          const sourcePort = Object.keys(ports).find(k => k.toLowerCase() === sourceKey) || source;
          const targetPort = Object.keys(ports).find(k => k.toLowerCase() === targetKey) || target;
          if (!ports[sourcePort] || !ports[targetPort]) {
            throw new Error(`Flow ports not found: ${sourcePort}, ${targetPort}`);
          }
          flows.push(new SysADLFlow(sourcePort, targetPort, type));
          log(`Flow defined: ${type} from ${sourcePort} to ${targetPort}`);
        } else {
          const matchSimple = cleanLine.match(/flow\s+(\S+)\s+to\s+(\S+)/);
          if (matchSimple) {
            const [, source, target] = matchSimple;
            const sourceKey = source.toLowerCase();
            const targetKey = target.toLowerCase();
            const sourcePort = Object.keys(ports).find(k => k.toLowerCase() === sourceKey) || source;
            const targetPort = Object.keys(ports).find(k => k.toLowerCase() === targetKey) || target;
            if (!ports[sourcePort] || !ports[targetPort]) {
              throw new Error(`Flow ports not found: ${sourcePort}, ${targetPort}`);
            }
            flows.push(new SysADLFlow(sourcePort, targetPort));
            log(`Flow defined: ${sourcePort} -> ${targetPort}`);
          }
        }
      } else if (line.startsWith("allocation")) {
        const match = line.match(/allocation\s+(\w+)\s*->\s*(\w+)/);
        if (match) {
          const [, activity, executable] = match;
          allocations.push(new SysADLAllocation(activity, executable));
          log(`Allocation defined: ${activity} -> ${executable}`);
        }
      }
    }

    // Parsing helper functions
    function parseParams(line) {
      const params = [];
      const paramMatches = line.matchAll(/(\w+):(\w+)/g);
      for (const match of paramMatches) {
        params.push({ name: match[1], type: match[2] });
      }
      return params;
    }

    function parseProtocolBody(lines) {
      const actions = [];
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith("(")) {
          actions.push({ type: "Nested", body: parseProtocolBody([trimmed.replace(/[()]/g, "")]) });
        } else if (trimmed.startsWith("send")) {
          const match = trimmed.match(/send\s+([^,\s]+)\s+via\s+(\S+)/);
          if (match) {
            actions.push({ type: "Send", value: parseExpression(match[1]), port: match[2].replace(";", "") });
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

    function parseExecutableBody(lines) {
      const statements = [];
      let currentBlock = null;
      let blockStatements = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("{")) {
          currentBlock = "block";
          blockStatements = [];
          continue;
        } else if (line === "}") {
          if (currentBlock === "block") {
            statements.push({ type: "BlockStatement", body: parseExecutableBody(blockStatements) });
            currentBlock = null;
            blockStatements = [];
          }
          continue;
        } else if (currentBlock === "block") {
          blockStatements.push(line);
          continue;
        }
        if (line.startsWith("let ")) {
          const match = line.match(/^let\s+(\w+):(\w+)\s*(?:=\s*([^;]+))?/);
          if (match) {
            statements.push({
              type: "VariableDecl",
              name: match[1],
              dataType: match[2],
              value: match[3] ? parseExpression(match[3]) : null
            });
          }
        } else if (line.startsWith("return ")) {
          const value = line.replace("return ", "").replace(";", "").trim();
          statements.push({ type: "ReturnStatement", value: parseExpression(value) });
        } else if (line.startsWith("if ")) {
          const match = line.match(/^if\s*\(([^)]+)\)\s*(.*)/);
          if (match) {
            const condition = parseExpression(match[1]);
            const body = match[2].startsWith("{") ? parseExecutableBody([match[2].replace(/[{}]/g, "")]) : parseExecutableBody([match[2]]);
            const elseStmt = lines[i + 1]?.startsWith("else ") ? parseExecutableBody([lines[i + 1].replace("else ", "").trim()]) : null;
            statements.push({
              type: "IfBlockStatement",
              condition,
              body: body[0],
              else: elseStmt ? { body: elseStmt[0] } : null
            });
            if (elseStmt) i++;
          }
        } else if (line.startsWith("while ")) {
          const match = line.match(/^while\s*\(([^)]+)\)\s*(.*)/);
          if (match) {
            const condition = parseExpression(match[1]);
            const body = match[2].startsWith("{") ? parseExecutableBody([match[2].replace(/[{}]/g, "")]) : parseExecutableBody([match[2]]);
            statements.push({ type: "WhileStatement", condition, body: body[0] });
          }
        } else if (line.startsWith("for ")) {
          const match = line.match(/^for\s*\(([^)]+)\)\s*(.*)/);
          if (match) {
            const control = match[1].split(",").map(s => {
              const [varDecl, expr] = s.trim().split(/\s+in\s+/);
              const varMatch = varDecl.match(/let\s+(\w+):(\w+)/);
              return {
                var: { name: varMatch[1], type: varMatch[2] },
                expr: parseExpression(expr)
              };
            });
            const body = match[2].startsWith("{") ? parseExecutableBody([match[2].replace(/[{}]/g, "")]) : parseExecutableBody([match[2]]);
            statements.push({ type: "ForStatement", control: { vars: control }, body: body[0] });
          }
        } else if (line.startsWith("switch ")) {
          const match = line.match(/^switch\s*\(([^)]+)\)\s*{(.*)}/s);
          if (match) {
            const expr = parseExpression(match[1]);
            const clauses = match[2].trim().split(";").map(c => c.trim()).filter(c => c).map(c => {
              if (c.startsWith("case ")) {
                const [, value, body] = c.match(/case\s+([^:]+):(.+)/);
                return { type: "SwitchClause", value: parseExpression(value.trim()), body: parseExecutableBody([body])[0] };
              } else if (c.startsWith("default")) {
                const [, body] = c.match(/default\s*:(.*)/);
                return { type: "DefaultSwitchClause", body: parseExecutableBody([body])[0] };
              }
              return null;
            }).filter(c => c);
            statements.push({ type: "SwitchStatement", expr, clauses });
          }
        }
      }
      return statements;
    }

    function parseExpression(str) {
      str = str?.trim();
      if (!str) return null;
      if (str.match(/^"[^"]+"$/)) {
        return { type: "Literal", value: str.slice(1, -1) };
      } else if (str.match(/^\d+$/)) {
        return { type: "Literal", value: parseInt(str) };
      } else if (str.match(/^\d+\.\d+$/)) {
        return { type: "Literal", value: parseFloat(str) };
      } else if (str.match(/^(true|false)$/)) {
        return { type: "Literal", value: str === "true" };
      } else if (str.match(/^{.*}$/)) {
        try {
          return { type: "Object", value: JSON.parse(str.replace(/(\w+):/g, '"$1":')) };
        } catch {
          return null;
        }
      } else if (str.includes(".")) {
        const [obj, field] = str.split(".");
        return { type: "FieldAccess", object: parseExpression(obj), field };
      } else if (str.includes("[")) {
        const [, primary, index] = str.match(/(\w+)\[(.+)\]/) || [];
        if (primary && index) {
          return { type: "SequenceAccess", primary: parseExpression(primary), index: parseExpression(index) };
        }
      } else if (str.includes("?")) {
        const [op1, op2, op3] = str.split(/\s*\?\s*|\s*:/).map(s => s.trim());
        return { type: "Conditional", op1: parseExpression(op1), op2: parseExpression(op2), op3: parseExpression(op3) };
      } else if (str.match(/^(toString|toInt|!|~|\+\+|--)\s*(.*)/)) {
        const [, operator, operand] = str.match(/^(toString|toInt|!|~|\+\+|--)\s*(.*)/);
        return { type: "Unary", operator, operand: parseExpression(operand) };
      } else if (str.match(/\S+\s*(\+|-|\*|\/|%|\<\<|\>\>|\>\>\>|\<|\>|\<=|\>=|==|!=|&|\||\^|&&|\||\||implies)\s*\S+/)) {
        const [, left, operator, right] = str.match(/^(.+?)\s*(\+|-|\*|\/|%|\<\<|\>\>|\>\>\>|\<|\>|\<=|\>=|==|!=|&|\||\^|&&|\||\||implies)\s*(.+)$/);
        return { type: "Binary", operator, left: parseExpression(left), right: parseExpression(right) };
      } else if (str.match(/^{.*,}$/)) {
        const elements = str.replace(/[{}]/g, "").split(",").map(e => parseExpression(e.trim()));
        return { type: "SequenceConstruction", elements };
      }
      return { type: "Variable", value: str };
    }

    // Validate requirements
    for (const req of Object.values(requirements)) {
      const context = { variables: {} };
      for (const port of Object.values(ports)) {
        context.variables[port.name] = port.value;
      }
      const valid = evaluateConstraint(req.condition, context);
      log(`Requirement ${req.name} ${valid ? "passed" : "failed"}: ${req.condition || "None"}`);
      trace.push(`Requirement ${req.name} ${valid}: ${req.condition}`);
      req.derived.forEach(d => {
        if (!requirements[d]) {
          log(`Warning: Derived requirement ${d} not found for ${req.name}`);
          trace.push(`Warning: Derived requirement ${d} not found`);
        }
      });
    }

    // Initialize ports
    for (const [port, value] of Object.entries(simulationInputs.flows)) {
      if (ports[port]) {
        ports[port].value = value;
        const compName = port.split(".")[0];
        if (components[compName]) {
          components[compName].state[port.split(".")[1]] = value;
        }
        trace.push(`Port ${port} initialized with ${JSON.stringify(value)}`);
      }
    }

    // Simulation
    log("\n--- Simulation Start ---");

    // Propagate flows
    for (const flow of flows) {
      const sourcePort = ports[flow.source];
      const flowData = simulationInputs.flows[flow.source] !== undefined
        ? simulationInputs.flows[flow.source]
        : getDefaultValue(sourcePort.type);
      trace.push(`Flow ${flow.source} initialized with ${JSON.stringify(flowData)}`);
      const propagatedData = flow.propagate(flowData, components, ports, log, trace);
      const targetPort = ports[flow.target];
      const targetComp = components[targetPort.component];
      if (targetComp) {
        for (const activity of targetComp.activities) {
          const result = activity.execute(targetComp, [propagatedData], trace);
          log(result.log);
        }
      }
    }

    // Execute configurations
    configurations.forEach(config => {
      config.components.forEach(c => {
        const compDef = components[c.type];
        if (compDef) {
          const subComp = new SysADLComponent(
            c.name,
            c.type,
            compDef.isAbstract,
            compDef.appliedStyles,
            compDef.abstractComponent
          );
          compDef.ports.forEach(p => {
            const port = new SysADLPort(p.name, p.direction, c.name, p.type, p.value);
            subComp.addPort(port);
            ports[`${c.name}.${p.name}`] = port;
          });
          compDef.activities.forEach(a => {
            subComp.addActivity(new SysADLActivity(a.name, a.params, a.abstractActivity));
          });
          components[c.name] = subComp;
          subComp.activities.forEach(activity => {
            const paramName = activity.params[0]?.split(":")[0];
            const paramType = activity.params[0]?.split(":")[1] || "Unknown";
            const input = subComp.state[paramName] ||
              simulationInputs.flows[`${subComp.type}.${paramName}`] ||
              simulationInputs.flows[`${c.name}.${paramName}`] ||
              getDefaultValue(paramType);
            const result = activity.execute(subComp, [input], trace);
            log(result.log);
          });
        } else {
          log(`Warning: Component definition ${c.type} not found`);
        }
      });
      config.delegations.forEach(d => {
        const sourcePort = ports[d.source];
        const targetPort = ports[d.target];
        if (sourcePort && targetPort) {
          targetPort.value = sourcePort.value;
          log(`Delegation: ${d.source} -> ${d.target}: ${JSON.stringify(sourcePort.value)}`);
          trace.push(`Delegation ${d.source} -> ${d.target}: ${JSON.stringify(sourcePort.value)}`);
        }
      });
      config.protocols.forEach(p => {
        const proto = protocols[p];
        if (proto) {
          const comp = components[config.components[0]?.name || Object.keys(components)[0]];
          if (comp) {
            const result = proto.execute(comp, ports, log, trace);
            log(`Protocol ${proto.name} executed: ${JSON.stringify(result)}`);
          }
        }
      });
    });

    // Execute allocations
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
          c.kind !== "invariant" && (
            (c.precondition && executable.params.some(p => c.precondition.includes(p.name))) ||
            (c.postcondition && (executable.params.some(p => c.postcondition.includes(p.name)) || c.postcondition.includes("result")))
          )
        );
        const result = executable.execute([input], log, applicableConstraints, trace);
        log(`Executable ${executable.name} for activity ${activity.name}: ${JSON.stringify(result)}`);
      } else {
        log(`Warning: Allocation ${alloc.activity} -> ${alloc.executable} not resolved`);
      }
    });

    // Execute unallocated executables
    Object.values(executables).forEach(ex => {
      if (!allocations.some(a => a.executable === ex.name)) {
        const inputs = simulationInputs.executables[ex.name] || ex.params.map(p => getDefaultValue(p.type));
        const applicableConstraints = Object.values(constraints).filter(c =>
          c.kind !== "invariant" && (
            (c.precondition && ex.params.some(p => c.precondition.includes(p.name))) ||
            (c.postcondition && (ex.params.some(p => c.postcondition.includes(p.name)) || c.postcondition.includes("result")))
          )
        );
        const result = ex.execute(inputs, log, applicableConstraints, trace);
        log(`Executable ${ex.name} result: ${JSON.stringify(result)}`);
      }
    });

    // Evaluate invariants
    Object.values(constraints).forEach(c => {
      if (c.kind === "invariant") {
        const context = { variables: {} };
        Object.values(ports).forEach(p => {
          context.variables[p.name] = p.value;
        });
        const valid = evaluateConstraint(c.precondition || c.postcondition, context);
        log(`Invariant ${c.name} ${valid ? "passed" : "failed"}: ${c.precondition || c.postcondition}`);
        trace.push(`Invariant ${c.name} ${valid ? "passed" : "failed"}: ${c.precondition || c.postcondition}`);
      }
    });

    // Summary
    log("\n--- Parameter Trace Summary ---");
    trace.forEach((entry, i) => {
      log(`${i + 1}. ${entry}`);
    });

    log("\n--- Simulation End ---");

  } catch (e) {
    log(`Error: ${e.message}`);
  }
}
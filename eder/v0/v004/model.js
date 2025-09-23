import { evaluateExpression } from './executor.js';
import { getDefaultValue } from './utils.js';

export class SysADLPackage {
  constructor(name) {
    this.name = name;
    this.imports = [];
    this.definitions = [];
    this.styles = [];
  }
}

export class SysADLStyle {
  constructor(name, invariants = [], functions = [], definitions = []) {
    this.name = name;
    this.invariants = invariants;
    this.functions = functions;
    this.definitions = definitions;
  }
}

export class SysADLFunction {
  constructor(name, definition) {
    this.name = name;
    this.definition = definition;
  }
}

export class SysADLInvariant {
  constructor(name, expression) {
    this.name = name;
    this.expression = expression;
  }
}

export class SysADLAbstractComponent {
  constructor(name, ports = [], composition = []) {
    this.name = name;
    this.ports = ports;
    this.composition = composition;
  }
}

export class SysADLAbstractConnector {
  constructor(name, ports = [], flows = []) {
    this.name = name;
    this.ports = ports;
    this.flows = flows;
  }
}

export class SysADLAbstractActivity {
  constructor(name, inParams = [], outParams = []) {
    this.name = name;
    this.inParams = inParams;
    this.outParams = outParams;
  }
}

export class SysADLAbstractProtocol {
  constructor(name, body) {
    this.name = name;
    this.body = body;
  }
}

export class SysADLComponent {
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

export class SysADLPort {
  constructor(name, direction, component, type = "Unknown", value = null) {
    this.name = name;
    this.direction = direction;
    this.component = component;
    this.type = type;
    this.value = value;
  }
}

export class SysADLCompositePort {
  constructor(name, ports = [], properties = []) {
    this.name = name;
    this.ports = ports;
    this.properties = properties;
  }
}

export class SysADLConnector {
  constructor(name, ports = [], bindings = [], flows = []) {
    this.name = name;
    this.ports = ports;
    this.bindings = bindings;
    this.flows = flows;
  }
}

export class SysADLConnectorBinding {
  constructor(source, destination) {
    this.source = source;
    this.destination = destination;
  }
}

export class SysADLDelegation {
  constructor(source, destination) {
    this.source = source;
    this.destination = destination;
  }
}

export class SysADLFlow {
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

export class SysADLActivity {
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

export class SysADLActivitySwitch {
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

export class SysADLDataStore {
  constructor(name, type, initValue = null) {
    this.name = name;
    this.type = type;
    this.value = initValue;
  }
}

export class SysADLDataBuffer {
  constructor(name, type, initValue = null) {
    this.name = name;
    this.type = type;
    this.value = initValue;
  }
}

export class SysADLExecutable {
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

export class SysADLProtocol {
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
      for (let i = 0; i < iterations; i++) executeOnce();
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

export class SysADLConstraint {
  constructor(name, precondition, postcondition, kind = "invariant") {
    this.name = name;
    this.precondition = precondition;
    this.postcondition = postcondition;
    this.kind = kind;
  }
}

export class SysADLDataType {
  constructor(name, fields) {
    this.name = name;
    this.fields = fields;
  }
}

export class SysADLValueType {
  constructor(name, unit = null, dimension = null) {
    this.name = name;
    this.unit = unit;
    this.dimension = dimension;
  }
}

export class SysADEnumeration {
  constructor(name, literals = []) {
    this.name = name;
    this.literals = literals;
  }
}

export class SysADLUnit {
  constructor(name, dimension = null) {
    this.name = name;
    this.dimension = dimension;
  }
}

export class SysADLDimension {
  constructor(name) {
    this.name = name;
  }
}

export class SysADLConfiguration {
  constructor(components, connectors, protocols = [], delegations = []) {
    this.components = components;
    this.connectors = connectors;
    this.protocols = protocols;
    this.delegations = delegations;
  }
}

export class SysADLAllocation {
  constructor(activity, executable) {
    this.activity = activity;
    this.executable = executable;
  }
}

export class SysADLRequirement {
  constructor(name, condition, derived = []) {
    this.name = name;
    this.condition = condition;
    this.derived = derived;
  }
}
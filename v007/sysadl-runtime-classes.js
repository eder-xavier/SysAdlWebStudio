// sysadl-runtime-classes.js

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
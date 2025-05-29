
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
        // Inicializar variáveis do contexto com inputs e valores padrão
        this.params.forEach((param, i) => {
            context.variables[param.name] = inputs[i] !== undefined ? inputs[i] : getDefaultValue(param.type);
            log(`Executable '${this.name}' input: ${param.name} = ${JSON.stringify(context.variables[param.name])}`);
            trace.push(`Executable '${this.name}' input: ${param.name} = ${JSON.stringify(context.variables[param.name])}`);
        });

        constraints.forEach(c => {
            if (c.precondition) { // A precondição pode não depender diretamente dos parâmetros do executável
                const valid = evaluateConstraint(c.precondition, context); // Usa a função global
                if (!valid) throw new Error(`Precondition failed for ${c.name}: ${c.precondition}`);
                log(`Precondition '${c.precondition}' passed for ${c.name}`);
                trace.push(`Precondition '${c.precondition}' passed for ${c.name}`);
            }
        });

        let result = null;
        for (const stmt of this.statements) {
            const stmtResult = this.executeStatement(stmt, context, log, trace);
            if (stmt.type === "ReturnStatement") {
                result = stmtResult;
                log(`Return: ${JSON.stringify(result)}`);
                trace.push(`Return: ${JSON.stringify(result)}`);
                break; // Sair após o retorno
            }
        }

        constraints.forEach(c => {
            if (c.postcondition) {
                context.variables["result"] = result; // Resultado disponível para postcondição
                const valid = evaluateConstraint(c.postcondition, context); // Usa a função global
                if (!valid) throw new Error(`Postcondition failed for ${c.name}: ${c.postcondition}`);
                log(`Postcondition '${c.postcondition}' passed for ${c.name}`);
                trace.push(`Postcondition '${c.postcondition}' passed for ${c.name}`);
            }
        });

        return result;
    }

    executeStatement(stmt, context, log, trace) {
        if (stmt.type === "VariableDecl") {
            context.variables[stmt.name] = this.evaluateExpression(stmt.value, context);
            log(`Variable ${stmt.name} = ${JSON.stringify(context.variables[stmt.name])}`);
            trace.push(`Variable ${stmt.name} = ${JSON.stringify(context.variables[stmt.name])}`);
            return null;
        } else if (stmt.type === "ReturnStatement") {
            return this.evaluateExpression(stmt.value, context);
        } else if (stmt.type === "IfBlockStatement") {
            // Executar o main_if
            let conditionResult = this.evaluateExpression(stmt.main_if.condition, context);
            if (conditionResult) {
                // Execute todos os statements no corpo do if
                for (const innerStmt of stmt.main_if.body) {
                    const stmtResult = this.executeStatement(innerStmt, context, log, trace);
                    if (innerStmt.type === "ReturnStatement") return stmtResult; // Retorna se houver um return
                }
            } else {
                // Tentar else_ifs
                let executedElseIf = false;
                if (stmt.else_ifs) {
                    for (const elseIfStmt of stmt.else_ifs) {
                        const elseIfConditionResult = this.evaluateExpression(elseIfStmt.condition, context);
                        if (elseIfConditionResult) {
                            for (const innerStmt of elseIfStmt.body) {
                                const stmtResult = this.executeStatement(innerStmt, context, log, trace);
                                if (innerStmt.type === "ReturnStatement") return stmtResult;
                            }
                            executedElseIf = true;
                            break; // Sair após executar um else if
                        }
                    }
                }

                // Se nenhum if/else if foi executado, tentar else
                if (!executedElseIf && stmt.else) {
                    for (const innerStmt of stmt.else.body) {
                        const stmtResult = this.executeStatement(innerStmt, context, log, trace);
                        if (innerStmt.type === "ReturnStatement") return stmtResult;
                    }
                }
            }
            return null; // Condicionais não retornam um valor diretamente
        }
        // ... (outros tipos de statements como While, Do, For, Switch)
        return null;
    }

    evaluateExpression(expr, context) {
        if (expr.type === "Literal") return expr.value;
        if (expr.type === "ObjectLiteral") { // Para objetos como { value: 26.0, unit: "Celsius" }
            const evaluatedObject = {};
            for (const key in expr.value) {
                evaluatedObject[key] = this.evaluateExpression({ type: "Literal", value: expr.value[key] }, context); // Assume valores são literais
            }
            return evaluatedObject;
        }
        if (expr.type === "Variable") {
             // Prioridade 1: Variáveis no contexto local
             if (context.variables.hasOwnProperty(expr.value)) {
                 return context.variables[expr.value];
             }
             // Prioridade 2: Literais de enumeração (ex: COOLING, HEATING, OFF)
             // Verifica se o valor corresponde a um literal de uma enumeração conhecida
             for (const enumName in sysadlModel.enums) {
                 if (sysadlModel.enums[enumName].literals.includes(expr.value)) {
                     return expr.value; // Retorna o valor da enumeração como string
                 }
             }
             // Prioridade 3: Acesso a elementos globais (como ports, etc.) - via nome qualificado
             // Isto pode ser um desafio sem um sistema de lookup mais robusto
             // Por agora, se for uma variável não encontrada, retorna o próprio nome
             // ou null para indicar não resolvido.
             return null; // Melhor retornar null ou undefined para indicar que não foi resolvido
        }
        if (expr.type === "ParenthesizedExpression") {
            return this.evaluateExpression(expr.value, context);
        }
        if (expr.type === "BinaryExpression") {
            const left = this.evaluateExpression(expr.left, context);
            const right = this.evaluateExpression(expr.right, context);

            switch (expr.operator) {
                case "+":
                    if (typeof left === "string" || typeof right === "string") {
                        return `${left}${right}`;
                    }
                    return left + right;
                case "-": return left - right;
                case "*": return left * right; // Adicionar se a gramática tiver
                case "/": return left / right; // Adicionar se a gramática tiver
                case "%": return left % right; // Adicionar se a gramática tiver
                case ">": return left > right;
                case "<": return left < right;
                case "==": return left === right;
                case "!=": return left !== right;
                case ">=": return left >= right;
                case "<=": return left <= right;
                case "&&": return left && right;
                case "||": return left || right;
                case "implies": return !left || right; // A -> B é equivalente a !A || B
                default: throw new Error(`Unknown binary operator: ${expr.operator}`);
            }
        } else if (expr.type === "FieldAccess") {
            const obj = this.evaluateExpression(expr.object, context);
            if (obj && typeof obj === 'object') {
                return obj[expr.field];
            }
            // Se obj não for um objeto ou for null/undefined, tentar procurar em sysadlModel.ports
            // Isso é um hack para `Controller.temp.value` quando `Controller` não é uma variável no contexto
            // mas sim uma instância de componente global.
            if (obj === null || obj === undefined) {
                 const qualifiedName = `${expr.object.value}.${expr.field}`; // Assumindo expr.object.value é o nome do componente/porta
                 if (sysadlModel.ports[qualifiedName]) {
                     return sysadlModel.ports[qualifiedName].value;
                 }
            }

            // Tratamento para Controller.temp.value
            // Se obj for Controller.temp (um objeto SysADLPort), queremos acessar seu .value
            if (obj && obj.type === 'Variable' && typeof obj.value === 'string') { // obj é { type: "Variable", value: "Controller.temp" }
                 const portName = obj.value;
                 if (sysadlModel.ports[portName]) {
                    // Agora estamos no objeto da porta. Precisamos do 'field' seguinte.
                    // Ex: se expr.field é 'value', e sysadlModel.ports[portName] tem uma propriedade 'value'
                    if (sysadlModel.ports[portName].hasOwnProperty(expr.field)) {
                        return sysadlModel.ports[portName][expr.field];
                    }
                 }
            }
            // Tentar um lookup mais genérico no sysadlModel (componentes, portas, etc.)
            const parts = [];
            let currentExpr = expr;
            while(currentExpr.type === "FieldAccess") {
                parts.unshift(currentExpr.field);
                currentExpr = currentExpr.object;
            }
            if (currentExpr.type === "Variable") {
                parts.unshift(currentExpr.value);
            }
            const fullPath = parts.join('.'); // Ex: "Controller.temp.value"

            // Agora, tentar resolver `fullPath` no `sysadlModel`
            let resolvedValue = context.variables[parts[0]]; // Tentar como variável local primeiro
            if (resolvedValue === undefined) { // Se não for variável local, tentar elementos do modelo
                resolvedValue = sysadlModel.components[parts[0]] || sysadlModel.ports[parts[0]];
            }

            for (let i = 1; i < parts.length; i++) {
                if (resolvedValue && typeof resolvedValue === 'object') {
                    // Especialmente para portas, se o campo é 'value'
                    if (resolvedValue instanceof SysADLPort && parts[i] === 'value') {
                        resolvedValue = resolvedValue.value;
                    } else if (resolvedValue.hasOwnProperty(parts[i])) {
                        resolvedValue = resolvedValue[parts[i]];
                    } else if (resolvedValue.state && resolvedValue.state.hasOwnProperty(parts[i])) { // Se for um componente e o campo está no estado
                        resolvedValue = resolvedValue.state[parts[i]];
                    } else {
                        // Tentar resolver a próxima parte como parte de um nome qualificado de porta, ex: Component.Port.field
                        const nextQualifiedName = parts.slice(0, i + 1).join('.');
                        if (sysadlModel.ports[nextQualifiedName]) {
                            resolvedValue = sysadlModel.ports[nextQualifiedName];
                            continue; // Continue para a próxima parte
                        }
                        resolvedValue = undefined; // Não encontrado
                        break;
                    }
                } else {
                    resolvedValue = undefined;
                    break;
                }
            }
            if (resolvedValue !== undefined) {
                return resolvedValue;
            }

            return null; // Não foi possível resolver o acesso ao campo
        }
        return null; // Fallback para tipos de expressão não tratados
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
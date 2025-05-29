

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

// Função auxiliar para avaliar constraints
function evaluateConstraint(expr, context) {
    // Acessar sysadlModel globalmente (já declarado no escopo global pelo interpreter.js)
    // Isso é necessário porque evaluateExpression em SysADLExecutable depende de sysadlModel.enums, etc.
    // E evaluateConstraint precisa de sysadlModel.ports para resolver Controller.temp.value
    const expressionAst = parseExpression(expr); // parseExpression é global

    // Crie um "mock" de SysADLExecutable para poder chamar evaluateExpression
    const mockExecutable = {
        evaluateExpression: SysADLExecutable.prototype.evaluateExpression
    };

    try {
        return mockExecutable.evaluateExpression(expressionAst, context);
    } catch (e) {
        console.warn("Could not fully evaluate constraint expression via AST, falling back to simple logic:", expr, e);
        // Fallback mais robusto para expressões simples como Controller.temp.value
        // Esta parte pode ser refeita para ser mais inteligente ou removida se o AST for completo o suficiente.

        // Tentar resolver expressões do tipo "a.b.c"
        if (expr.includes('.')) {
            const parts = expr.split('.');
            let resolvedValue = null;
            let currentTarget = null;

            // Tentar resolver a primeira parte no contexto, em sysadlModel.components, ou sysadlModel.ports
            if (context.variables.hasOwnProperty(parts[0])) {
                currentTarget = context.variables[parts[0]];
            } else if (sysadlModel.components.hasOwnProperty(parts[0])) {
                currentTarget = sysadlModel.components[parts[0]];
            } else if (sysadlModel.ports.hasOwnProperty(parts[0])) {
                currentTarget = sysadlModel.ports[parts[0]];
            }

            if (currentTarget !== null) {
                resolvedValue = currentTarget;
                for (let i = 1; i < parts.length; i++) {
                    const part = parts[i];
                    if (resolvedValue && typeof resolvedValue === 'object') {
                        // Tratar caso de acesso a `value` de uma porta
                        if (resolvedValue instanceof SysADLPort && part === 'value') {
                            resolvedValue = resolvedValue.value;
                        } else if (resolvedValue.hasOwnProperty(part)) {
                            resolvedValue = resolvedValue[part];
                        } else if (resolvedValue.state && resolvedValue.state.hasOwnProperty(part)) { // Se for um componente e o campo está no estado
                            resolvedValue = resolvedValue.state[part];
                        } else {
                            // Tentar resolver como um nome qualificado de porta, ex: Component.Port.field
                            const fullQualifiedPart = parts.slice(0, i + 1).join('.');
                            if (sysadlModel.ports.hasOwnProperty(fullQualifiedPart)) {
                                resolvedValue = sysadlModel.ports[fullQualifiedPart];
                                continue;
                            }
                            resolvedValue = undefined; // Não encontrado
                            break;
                        }
                    } else {
                        resolvedValue = undefined;
                        break;
                    }
                }
            }
            if (resolvedValue !== undefined && resolvedValue !== null) {
                // Se a expressão era "Controller.temp.value >= 20.0"
                // e resolvedValue é o valor de Controller.temp.value,
                // precisamos re-avaliar o restante da expressão.
                const remainingExpr = expr.substring(expr.indexOf(parts[parts.length - 1]) + parts[parts.length - 1].length);
                if (remainingExpr.trim().match(/^(>=|<=|==|!=|>|<|&&|\|\|)/)) {
                    // Substitui a parte resolvida pelo seu valor na expressão original
                    const tempExpr = `${JSON.stringify(resolvedValue)}${remainingExpr}`;
                    try {
                        const tempAst = parseExpression(tempExpr);
                        return mockExecutable.evaluateExpression(tempAst, context);
                    } catch (innerE) {
                        console.warn("Could not evaluate complex constraint after resolving field:", tempExpr, innerE);
                        // Fallback para avaliação simples de operadores se a AST falhar novamente
                        const tempParts = tempExpr.split(/\s*(>=|<=|==|!=|>|<|&&|\|\|)\s*/);
                        if (tempParts.length >= 3) {
                            const [l, op, r] = tempParts;
                            const lVal = JSON.parse(l); // Já está em JSON.stringify
                            const rVal = parseFloat(r) || r;
                            switch (op) {
                                case ">=": return lVal >= rVal;
                                case "<=": return lVal <= rVal;
                                case "==": return lVal === rVal;
                                case "!=": return lVal !== rVal;
                                case ">": return lVal > rVal;
                                case "<": return lVal < rVal;
                                case "&&": return lVal && rVal;
                                case "||": return lVal || rVal;
                            }
                        }
                    }
                }
                return resolvedValue; // Se não houver mais operadores, retorna o valor resolvido
            }
        }

        // Lógica original de fallback para operadores simples se o AST falhar
        const simpleParts = expr.split(/\s*(>=|<=|==|!=|>|<|&&|\|\|)\s*/);
        if (simpleParts.length >= 3) {
            const [left, op, right] = simpleParts;
            const lValue = context.variables[left] ?? (left === "null" ? null : parseFloat(left) || left);
            const rValue = context.variables[right] ?? (right === "null" ? null : parseFloat(right) || right);

            // Converter para número se ambos forem numéricos para comparação
            const finalLValue = !isNaN(parseFloat(lValue)) ? parseFloat(lValue) : lValue;
            const finalRValue = !isNaN(parseFloat(rValue)) ? parseFloat(rValue) : rValue;

            switch (op) {
                case ">": return finalLValue > finalRValue;
                case "<": return finalLValue < finalRValue;
                case "==": return finalLValue === finalRValue;
                case "!=": return finalLValue !== finalRValue;
                case ">=": return finalLValue >= finalRValue;
                case "<=": return finalLValue <= finalRValue;
                case "&&": return finalLValue && finalRValue;
                case "||": return finalLValue || finalRValue;
                default: return true;
            }
        }
        // Se a expressão for uma variável booleana simples
        if (context.variables.hasOwnProperty(expr)) {
            return !!context.variables[expr];
        }
        return false; // Por padrão, se não conseguir avaliar, é falso (conservador)
    }
}

// ... (Resto do código de sysadl-utils.js) ...


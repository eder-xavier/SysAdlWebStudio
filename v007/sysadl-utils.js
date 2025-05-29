// sysadl-utils.js

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
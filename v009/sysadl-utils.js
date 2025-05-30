function evaluateConstraint(expr, context) {
    try {
        if (!expr) return true;
        const parts = expr.match(/(\w+(?:\.\w+)*)\s*([><=]+|==|!=)\s*(\S+)|(\w+(?:\.\w+)*)\s*(\S+)/) || expr.split(/\s*(&&|\s+\|\|)\s*/);
        if (parts.length === 2) {
            const [left, right] = expr.split(/&&|\s+\|\|/).map(s => s.trim());
            const lValue = resolveValue(context, context.variables[left] ?? left);
            const rValue = resolveValue(context, right);
            return parts[1] === "&&" ? lValue && rValue : lValue || rValue;
        }
        const [, leftStr, op, rightStr] = parts;
        let lValue = resolveValue(context, leftStr);
        let rValue = resolveValue(context, rightStr);

        switch (op) {
            case ">": return lValue > rValue;
            case "<": return lValue < rValue;
            case "==": return lValue === rValue;
            case "!=": return lValue !== rValue;
            case ">=": return lValue >= rValue;
            case "<=": return lValue <= rValue;
            default: return true;
        }
    } catch (e) {
        console.error(`Error evaluating constraint: ${expr}`, e);
        return false;
    }
}

function resolveValue(context, str) {
    if (str === "null") return null;
    if (str.match(/^\d+$/)) return parseInt(str);
    if (str.match(/^\d+\.\d+$/)) return parseFloat(str);
    if (str.includes(".")) {
        const parts = str.split(".");
        let obj = context.variables[parts[0]];
        for (let i = 1; i < parts.length; i++) {
            if (!obj) return null;
            obj = obj[parts[i]];
        }
        return obj;
    }
    return context.variables[str] || str;
}

function getDefaultValue(type) {
    switch (type) {
        case "Int": return 0;
        case "String": return "";
        case "Float": return 0.0;
        case "Load": return { id: "", weight: 0 };
        case "Time": return { hours: 0, minutes: 0 };
        case "ControlMode": return "OFF";
        default: return null;
    }
}

function resolveQualifiedName(name, packageName) {
    if (name.includes(".")) return name;
    return packageName ? `${packageName}.${name}` : name;
}
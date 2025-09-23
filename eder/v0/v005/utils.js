function evaluateConstraint(expr, context) {
  if (!expr) return true;
  const parts = expr.split(/\s*(>|<|==|!=|&&|\|\|)\s*/);
  if (parts.length === 1) {
    const value = context.variables[expr] ?? expr;
    return value === "true" || value === true;
  }
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
    default: return true;
  }
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
      case "<": return left < right;
      case ">": return left > right;
      case "<=": return left <= right;
      case ">=": return left >= right;
      case "==": return left === right;
      case "!=": return left !== right;
      case "&&": return left && right;
      case "||": return left || right;
      default: return null;
    }
  } else if (expr.type === "FieldAccess") {
    const obj = evaluateExpression(expr.object, context);
    return obj ? obj[expr.field] : null;
  } else if (expr.type === "SequenceConstruction") {
    return expr.elements.map(e => evaluateExpression(e, context));
  } else if (expr.type === "SequenceAccess") {
    const primary = evaluateExpression(expr.primary, context);
    const index = evaluateExpression(expr.index, context);
    return primary ? primary[index] : null;
  } else if (expr.type === "EnumValue") {
    return `${expr.enum}.${expr.value}`;
  } else if (expr.type === "ConditionalExpression") {
    const condition = evaluateExpression(expr.op1, context);
    return condition ? evaluateExpression(expr.op2, context) : evaluateExpression(expr.op3, context);
  }
  return null;
}

function getDefaultValue(type) {
  switch (type) {
    case "Int": return 0;
    case "String": return "";
    case "Float": return 0.0;
    case "Boolean": return false;
    case "Time": return { hours: 0, minutes: 0 };
    case "Load": return { id: "", weight: 0 };
    default: return null;
  }
}

function parseExpression(str) {
  if (str.match(/^"[^"]*"/)) {
    return { type: "Literal", value: str.slice(1, -1) };
  } else if (str.match(/^\d+$/)) {
    return { type: "Literal", value: parseInt(str, 10) };
  } else if (str.match(/^\d+\.\d+$/)) {
    return { type: "Literal", value: parseFloat(str) };
  } else if (str.match(/^{.*}$/)) {
    return { type: "Object", value: JSON.parse(str.replace(/(\w+):/g, '"$1":')) };
  } else if (str.match(/^\[.*\]$/)) {
    return { type: "SequenceConstruction", elements: str.slice(1, -1).split(",").map(e => parseExpression(e.trim())) };
  } else if (str.includes(".")) {
    const [obj, field] = str.split(".");
    return { type: "FieldAccess", object: { type: "Variable", value: obj }, field };
  } else if (str.includes("::")) {
    const [enumName, value] = str.split("::");
    return { type: "EnumValue", enum: enumName, value };
  } else if (str.includes("+") || str.includes("-") || str.includes("*") || str.includes("/") || str.includes("%") ||
             str.includes("<") || str.includes(">") || str.includes("<=") || str.includes(">=") ||
             str.includes("==") || str.includes("!=") || str.includes("&&") || str.includes("||")) {
    const operators = ["||", "&&", "==", "!=", "<=", ">=", "<", ">", "+", "-", "*", "/", "%"];
    const op = operators.find(o => str.includes(o));
    if (op) {
      const [left, right] = str.split(op).map(s => s.trim());
      return { type: "Binary", operator: op, left: parseExpression(left), right: parseExpression(right) };
    }
  } else if (str.match(/^\w+$/)) {
    return { type: "Variable", value: str };
  }
  return { type: "Literal", value: str };
}
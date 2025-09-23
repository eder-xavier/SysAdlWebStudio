function getDefaultValue(type) {
  switch (type) {
    case "Int": return 0;
    case "Real": return 0.0;
    case "Boolean": return false;
    case "String": return "";
    case "CelsiusTemperature": return 0;
    case "FahrenheitTemperature": return 32;
    case "Command": return "Off";
    case "Commands": return { heater: "Off", cooler: "Off" };
    default: return null;
  }
}

function evaluateExecutable(exec, inputs) {
  const context = { variables: {} };
  exec.params.forEach((p, i) => context.variables[p.name] = inputs[i] !== undefined ? inputs[i] : getDefaultValue(p.type));
  for (const stmt of exec.body) {
    if (stmt.type === "ReturnStatement") {
      return evaluateExpression(stmt.value, context);
    } else if (stmt.type === "VariableDecl") {
      context.variables[stmt.name] = stmt.value ? evaluateExpression(stmt.value, context) : getDefaultValue(stmt.type);
    } else if (stmt.type === "IfStatement") {
      if (evaluateExpression(stmt.condition, context)) {
        return evaluateExpression(stmt.body, context);
      }
    }
  }
  return null;
}

function evaluateExpression(expr, context) {
  if (typeof expr !== "string") return expr;
  if (expr.match(/^\d+$/)) return parseInt(expr);
  if (expr.match(/^\d+\.\d+$/)) return parseFloat(expr);
  if (expr.startsWith('"') && expr.endsWith('"')) return expr.slice(1, -1);
  if (expr.includes("->")) {
    const [obj, field] = expr.split("->");
    return context.variables[obj] ? context.variables[obj][field] : null;
  }
  if (expr.includes("===")) {
    const [left, right] = expr.split("===").map(s => s.trim());
    return evaluateExpression(left, context) === evaluateExpression(right, context);
  }
  if (expr.includes("&&")) {
    const [left, right] = expr.split("&&").map(s => s.trim());
    return evaluateExpression(left, context) && evaluateExpression(right, context);
  }
  if (expr.includes("?")) {
    const [cond, trueVal, falseVal] = expr.split(/[\?:]/).map(s => s.trim());
    return evaluateExpression(cond, context) ? evaluateExpression(trueVal, context) : evaluateExpression(falseVal, context);
  }
  if (expr.includes("/")) {
    const [left, right] = expr.split("/").map(s => s.trim());
    return evaluateExpression(left, context) / evaluateExpression(right, context);
  }
  if (expr.includes("+")) {
    const [left, right] = expr.split("+").map(s => s.trim());
    return evaluateExpression(left, context) + evaluateExpression(right, context);
  }
  return context.variables[expr] !== undefined ? context.variables[expr] : expr;
}

function evaluateConstraint(expr, context) {
  expr = expr.replace(/==/g, "===").replace(/(\w+)->(\w+)/g, "$1.$2").replace(/types\.Command::(\w+)/g, "Command.$1").replace(/types\.Commands\.(\w+)/g, "Commands.$1");
  return evaluateExpression(expr, context);
}
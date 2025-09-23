import { parseExpression } from './parser.js';

export function evaluateConstraint(constraint, context) {
  if (!constraint) {
    return false; // Return false for undefined or empty constraints
  }
  try {
    const expr = parseExpression(constraint);
    return evaluateExpression(expr, context);
  } catch (e) {
    console.error(`Erro ao avaliar constraint: ${constraint}`, e);
    return false;
  }
}

export function evaluateExpression(expr, context) {
  if (!expr) return null;

  switch (expr.type) {
    case "Binary":
      const left = evaluateExpression(expr.left, context);
      const right = evaluateExpression(expr.right, context);
      switch (expr.operator) {
        case "+": return left + right;
        case "-": return left - right;
        case "*": return left * right;
        case "/": return left / right;
        case "<=": return left <= right;
        case ">=": return left >= right;
        case "==": return left === right;
        case "&&": return left && right;
        case "||": return left || right;
      }
      break;
    case "Access":
      return context.variables[expr.object]?.[expr.property];
    case "Literal":
      return expr.value;
    case "Variable":
      return context.variables[expr.name];
  }
  return null;
}

export function validateFlowType(flowType, sourcePort, targetPort) {
  if (!sourcePort || !targetPort) return false;
  return sourcePort.type === flowType && targetPort.type === flowType;
}
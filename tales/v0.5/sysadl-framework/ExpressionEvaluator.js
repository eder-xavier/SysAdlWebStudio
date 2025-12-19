/**
 * Expression Evaluator for SysADL
 * Evaluates SysADL expressions in the context of system state
 */

class ExpressionEvaluator {
    constructor() {
        this.operators = {
            '==': (a, b) => a === b,
            '!=': (a, b) => a !== b,
            '>': (a, b) => a > b,
            '>=': (a, b) => a >= b,
            '<': (a, b) => a < b,
            '<=': (a, b) => a <= b,
            '&&': (a, b) => a && b,
            '||': (a, b) => a || b,
            '!': (a) => !a
        };
    }

    /**
     * Evaluate a SysADL expression in the context of current system state
     * 
     * Examples:
     * - "agv1.sensor == stationA" 
     * - "temperature >= 25.0"
     * - "vehicle1.location == stationB.ID"
     * - "part.location == stationC.ID && agv1.status == 'loaded'"
     */
    evaluate(expression, state) {
        try {
            // Remove whitespace
            const cleanExpression = expression.trim();

            // Handle complex expressions with logical operators
            if (cleanExpression.includes('&&') || cleanExpression.includes('||')) {
                return this.evaluateLogicalExpression(cleanExpression, state);
            }

            // Handle negation
            if (cleanExpression.startsWith('!')) {
                const innerExpression = cleanExpression.substring(1).trim();
                return !this.evaluate(innerExpression, state);
            }

            // Handle comparison expressions
            return this.evaluateComparisonExpression(cleanExpression, state);

        } catch (error) {
            throw new Error(`Expression evaluation failed: ${error.message}`);
        }
    }

    /**
     * Evaluate logical expressions (&&, ||)
     */
    evaluateLogicalExpression(expression, state) {
        // Split by logical operators (simple implementation)
        // TODO: Handle operator precedence properly for complex expressions

        if (expression.includes('||')) {
            const parts = expression.split('||');
            return parts.some(part => this.evaluate(part.trim(), state));
        }

        if (expression.includes('&&')) {
            const parts = expression.split('&&');
            return parts.every(part => this.evaluate(part.trim(), state));
        }

        return this.evaluateComparisonExpression(expression, state);
    }

    /**
     * Evaluate comparison expressions (==, !=, >, <, etc.)
     */
    evaluateComparisonExpression(expression, state) {
        // Find comparison operator
        const operators = ['==', '!=', '>=', '<=', '>', '<'];
        let operator = null;
        let leftSide = '';
        let rightSide = '';

        for (const op of operators) {
            const opIndex = expression.indexOf(op);
            if (opIndex !== -1) {
                operator = op;
                leftSide = expression.substring(0, opIndex).trim();
                rightSide = expression.substring(opIndex + op.length).trim();
                break;
            }
        }

        if (!operator) {
            // Boolean expression without comparison
            return this.resolveValue(expression, state);
        }

        const leftValue = this.resolveValue(leftSide, state);
        const rightValue = this.resolveValue(rightSide, state);

        return this.operators[operator](leftValue, rightValue);
    }

    /**
     * Resolve a value from the expression (could be a property path, literal, etc.)
     */
    resolveValue(valueExpression, state) {
        const trimmed = valueExpression.trim();

        // Handle string literals
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            return trimmed.slice(1, -1);
        }

        // Handle numeric literals
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
            return parseFloat(trimmed);
        }

        // Handle boolean literals
        if (trimmed === 'true') return true;
        if (trimmed === 'false') return false;
        if (trimmed === 'null') return null;

        // Handle property paths like "agv1.sensor", "stationA.ID"
        return this.resolvePropertyPath(trimmed, state);
    }

    /**
     * Resolve property path in the current state
     * Examples: "agv1.sensor", "stationA.ID", "part.location", "stationA" (entity reference)
     * 
     * Handles:
     * - Regular properties: obj.property
     * - EnvPorts: obj.envPorts.portName.value or obj.getEnvPort('portName')
     * - Nested paths: obj.nested.property
     */
    resolvePropertyPath(path, state) {
        const parts = path.split('.');
        let current = state;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLastPart = (i === parts.length - 1);

            if (current === null || current === undefined) {
                throw new Error(`Cannot access property "${part}" of null/undefined in path "${path}"`);
            }

            // For the last part, check if it's an EnvPort
            if (isLastPart && typeof current === 'object') {
                // Method 1: Use getEnvPort if available (EnvComponent)
                if (typeof current.getEnvPort === 'function') {
                    const envPort = current.getEnvPort(part);
                    if (envPort) {
                        // Return the port value
                        return envPort.getValue ? envPort.getValue() : (envPort.value !== undefined ? envPort.value : null);
                    }
                }

                // Method 2: Check envPorts object directly
                if (current.envPorts && typeof current.envPorts === 'object' && part in current.envPorts) {
                    const envPort = current.envPorts[part];
                    return envPort.value !== undefined ? envPort.value : null;
                }
            }

            // Standard property resolution
            if (typeof current === 'object' && part in current) {
                current = current[part];
            } else if (typeof current === 'object' && current.properties && part in current.properties) {
                // Check in properties object (Entity/EnvComponent structure)
                current = current.properties[part];
            } else {
                // Property not found - return undefined instead of throwing for graceful handling
                // This allows conditions to evaluate to false when ports/properties don't exist yet
                return undefined;
            }
        }

        return current;
    }
}

module.exports = { ExpressionEvaluator };

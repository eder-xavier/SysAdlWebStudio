/**
 * Dependency Tracker for SysADL Expressions
 * Analyzes SysADL expressions to extract state path dependencies
 * 
 * Key Features:
 * - AST-based expression parsing
 * - Automatic dependency extraction
 * - Support for complex expressions
 * - Property path resolution
 */

class DependencyTracker {
  constructor() {
    this.cache = new Map(); // expression -> dependencies cache
    
    // Common SysADL patterns to recognize
    this.patterns = {
      propertyAccess: /([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)/g,
      comparison: /(==|!=|>=|<=|>|<)/,
      logical: /(&&|\|\|)/,
      negation: /^!\s*/,
      stringLiteral: /^(['"]).*\1$/,
      numberLiteral: /^-?\d+(\.\d+)?$/,
      booleanLiteral: /^(true|false)$/
    };

    console.log('DependencyTracker initialized - ready to analyze SysADL expressions');
  }

  /**
   * Extract all state path dependencies from a SysADL expression
   * 
   * @param {string} expression - SysADL expression to analyze
   * @returns {Array<string>} - Array of state paths this expression depends on
   */
  extractDependencies(expression) {
    // Check cache first
    if (this.cache.has(expression)) {
      return this.cache.get(expression);
    }

    try {
      const dependencies = this.parseExpression(expression.trim());
      
      // Cache result for performance
      this.cache.set(expression, dependencies);
      
      console.log(`Dependencies for "${expression}": [${dependencies.join(', ')}]`);
      return dependencies;
      
    } catch (error) {
      console.error(`Failed to extract dependencies from "${expression}":`, error.message);
      return [];
    }
  }

  /**
   * Parse expression and extract dependencies recursively
   */
  parseExpression(expression) {
    const dependencies = new Set();

    // Handle logical operators (&&, ||)
    if (this.patterns.logical.test(expression)) {
      const logicalDeps = this.parseLogicalExpression(expression);
      logicalDeps.forEach(dep => dependencies.add(dep));
      return Array.from(dependencies);
    }

    // Handle negation
    if (this.patterns.negation.test(expression)) {
      const negatedExpr = expression.replace(this.patterns.negation, '').trim();
      const negatedDeps = this.parseExpression(negatedExpr);
      negatedDeps.forEach(dep => dependencies.add(dep));
      return Array.from(dependencies);
    }

    // Handle comparison expressions
    if (this.patterns.comparison.test(expression)) {
      const comparisonDeps = this.parseComparisonExpression(expression);
      comparisonDeps.forEach(dep => dependencies.add(dep));
      return Array.from(dependencies);
    }

    // Single property access or literal
    const singleDep = this.extractPropertyPath(expression);
    if (singleDep) {
      dependencies.add(singleDep);
    }

    return Array.from(dependencies);
  }

  /**
   * Parse logical expressions (&&, ||)
   */
  parseLogicalExpression(expression) {
    const dependencies = new Set();
    
    // Split by logical operators (simple approach - works for most cases)
    const parts = this.splitByLogicalOperators(expression);
    
    for (const part of parts) {
      const partDeps = this.parseExpression(part.trim());
      partDeps.forEach(dep => dependencies.add(dep));
    }

    return Array.from(dependencies);
  }

  /**
   * Split expression by logical operators while respecting precedence
   */
  splitByLogicalOperators(expression) {
    const parts = [];
    let current = '';
    let parenDepth = 0;
    let i = 0;

    while (i < expression.length) {
      const char = expression[i];
      const nextChar = expression[i + 1];

      if (char === '(') {
        parenDepth++;
        current += char;
      } else if (char === ')') {
        parenDepth--;
        current += char;
      } else if (parenDepth === 0 && 
                 ((char === '&' && nextChar === '&') || 
                  (char === '|' && nextChar === '|'))) {
        // Found logical operator at top level
        if (current.trim()) {
          parts.push(current.trim());
        }
        current = '';
        i++; // Skip next character
      } else {
        current += char;
      }
      
      i++;
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts.length > 0 ? parts : [expression];
  }

  /**
   * Parse comparison expressions (==, !=, >, <, etc.)
   */
  parseComparisonExpression(expression) {
    const dependencies = new Set();
    
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

    if (operator) {
      // Extract dependencies from both sides
      const leftDep = this.extractPropertyPath(leftSide);
      const rightDep = this.extractPropertyPath(rightSide);
      
      if (leftDep) dependencies.add(leftDep);
      if (rightDep) dependencies.add(rightDep);
    }

    return Array.from(dependencies);
  }

  /**
   * Extract property path from a single expression part
   */
  extractPropertyPath(expression) {
    const trimmed = expression.trim();

    // Skip literals
    if (this.isLiteral(trimmed)) {
      return null;
    }

    // Remove parentheses
    const withoutParens = trimmed.replace(/^\(|\)$/g, '');

    // Extract property access pattern
    const matches = withoutParens.match(this.patterns.propertyAccess);
    
    if (matches && matches.length > 0) {
      // Return the first (and typically only) property path
      return matches[0];
    }

    return null;
  }

  /**
   * Check if expression is a literal value
   */
  isLiteral(expression) {
    return this.patterns.stringLiteral.test(expression) ||
           this.patterns.numberLiteral.test(expression) ||
           this.patterns.booleanLiteral.test(expression) ||
           expression === 'null' ||
           expression === 'undefined';
  }

  /**
   * Advanced dependency analysis for complex expressions
   * Handles nested object access, array indices, function calls, etc.
   */
  analyzeComplexExpression(expression) {
    const dependencies = new Set();
    
    // More sophisticated parsing for complex cases
    // This could be extended to handle:
    // - Array access: "vehicles[0].sensor"
    // - Method calls: "getStatus().value"
    // - Conditional expressions: "status ? location : null"
    
    // For now, fall back to pattern matching
    const matches = expression.match(this.patterns.propertyAccess);
    if (matches) {
      matches.forEach(match => {
        if (!this.isLiteral(match)) {
          dependencies.add(match);
        }
      });
    }

    return Array.from(dependencies);
  }

  /**
   * Validate that all dependencies are valid property paths
   */
  validateDependencies(dependencies) {
    const valid = [];
    const invalid = [];

    for (const dep of dependencies) {
      if (this.isValidPropertyPath(dep)) {
        valid.push(dep);
      } else {
        invalid.push(dep);
      }
    }

    if (invalid.length > 0) {
      console.warn(`Invalid property paths detected: ${invalid.join(', ')}`);
    }

    return valid;
  }

  /**
   * Check if a string is a valid property path
   */
  isValidPropertyPath(path) {
    // Basic validation - can be enhanced
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(path);
  }

  /**
   * Get analysis statistics
   */
  getStatistics() {
    return {
      cachedExpressions: this.cache.size,
      cacheHitRate: this.cacheHits / Math.max(1, this.totalRequests),
      totalRequests: this.totalRequests || 0,
      cacheHits: this.cacheHits || 0
    };
  }

  /**
   * Clear dependency cache
   */
  clearCache() {
    this.cache.clear();
    console.log('Dependency cache cleared');
  }

  /**
   * Test expression parsing with examples
   */
  runTests() {
    console.log('\n=== Testing Dependency Extraction ===');
    
    const testCases = [
      'agv1.sensor == stationA',
      'agv1.sensor == stationA.signal',
      'temperature >= 25.0',
      'vehicle.location == target.ID && vehicle.status == "ready"',
      'part.location == station.ID || part.status == "loaded"',
      '!door.isOpen',
      'robot.position.x > 100 && robot.position.y < 50',
      'sensor1.value > threshold || sensor2.active == true'
    ];

    for (const testCase of testCases) {
      const deps = this.extractDependencies(testCase);
      console.log(`"${testCase}" -> [${deps.join(', ')}]`);
    }
    
    console.log('=====================================\n');
  }
}

module.exports = { DependencyTracker };
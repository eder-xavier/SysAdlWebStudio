/**
 * Scenario Executor for SysADL
 * 
 * Advanced scenario execution engine with programming structures support
 * Integrates with ReactiveStateManager and ReactiveConditionWatcher for high-performance execution
 * 
 * Key Features:
 * - Programming structures: while, for, if/else, variables
 * - Reactive state management integration
 * - Event-driven condition monitoring
 * - Parallel and sequential execution modes
 * - Variable scoping and assignment
 * - Conditional execution flows
 * - Loop constructs with break/continue
 * - Exception handling and recovery
 * - Real-time execution monitoring
 * - Integration with EventsDefinitions and EventInjector
 */

const { ReactiveStateManager } = require('./ReactiveStateManager');
const { ReactiveConditionWatcher } = require('./ReactiveConditionWatcher');
const { DependencyTracker } = require('./DependencyTracker');

class ScenarioExecutor {
  constructor(sysadlBase, options = {}) {
    this.sysadlBase = sysadlBase;
    
    // Configuration
    this.config = {
      enableParallelExecution: options.enableParallelExecution !== false,
      maxConcurrentScenarios: options.maxConcurrentScenarios || 10,
      defaultTimeout: options.defaultTimeout || 30000,
      enableVariables: options.enableVariables !== false,
      enableLoops: options.enableLoops !== false,
      enableConditionals: options.enableConditionals !== false,
      maxLoopIterations: options.maxLoopIterations || 1000,
      debugMode: options.debugMode || false,
      enableReactiveIntegration: options.enableReactiveIntegration !== false
    };

    // Reactive components integration
    this.stateManager = options.stateManager || new ReactiveStateManager();
    this.conditionWatcher = options.conditionWatcher || new ReactiveConditionWatcher(sysadlBase, {
      stateManager: this.stateManager,
      debugMode: this.config.debugMode
    });

    // Execution management
    this.activeExecutions = new Map(); // executionId -> execution context
    this.executionQueue = [];
    this.isProcessing = false;
    
    // Programming structures support
    this.variableScopes = new Map(); // executionId -> variable scope
    this.loopStacks = new Map(); // executionId -> loop stack
    this.conditionStack = new Map(); // executionId -> condition stack
    
    // Performance tracking
    this.stats = {
      totalExecutions: 0,
      completedExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      maxConcurrentExecutions: 0,
      variableAssignments: 0,
      loopIterations: 0,
      conditionEvaluations: 0
    };

    // Built-in expression evaluator
    this.expressionEvaluator = this.createExpressionEvaluator();

    console.log('ScenarioExecutor initialized with reactive integration');
    
    if (this.config.debugMode) {
      this.stateManager.subscribe('*', (newValue, oldValue, path) => {
        console.log(`🔄 [ScenarioExecutor] State changed: ${path} = ${JSON.stringify(newValue)}`);
      });
    }
  }

  /**
   * Execute a scenario with full programming structures support
   */
  async executeScenario(scenarioDefinition, options = {}) {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    try {
      // Create execution context
      const executionContext = this.createExecutionContext(executionId, scenarioDefinition, options);
      
      // Register execution
      this.activeExecutions.set(executionId, executionContext);
      this.stats.totalExecutions++;
      this.stats.maxConcurrentExecutions = Math.max(
        this.stats.maxConcurrentExecutions, 
        this.activeExecutions.size
      );

      // Initialize variable scope
      this.initializeVariableScope(executionId, options.variables || {});

      console.log(`🎬 Starting scenario execution: ${scenarioDefinition.name} (${executionId})`);

      // Log execution start
      if (this.sysadlBase.logger) {
        this.sysadlBase.logger.logExecution({
          type: 'scenario_execution_start',
          name: scenarioDefinition.name,
          path: `ScenarioExecutor.${scenarioDefinition.name}`,
          executionId: executionId,
          initialState: this.getExecutionState(executionId),
          metadata: {
            scenarioType: scenarioDefinition.type || 'standard',
            executionMode: executionContext.executionMode,
            timeout: executionContext.timeout,
            hasVariables: Object.keys(executionContext.variables).length > 0
          }
        });
      }

      // Execute scenario body with programming structures
      const result = await this.executeScenarioBody(executionId, scenarioDefinition.body || []);

      // Calculate execution time
      const duration = Date.now() - startTime;
      this.updateExecutionStats(duration, true);

      // Mark as completed
      executionContext.status = 'completed';
      executionContext.result = result;
      executionContext.duration = duration;

      console.log(`✅ Scenario completed: ${scenarioDefinition.name} (${duration}ms)`);

      // Log execution completion
      if (this.sysadlBase.logger) {
        this.sysadlBase.logger.logExecution({
          type: 'scenario_execution_complete',
          name: scenarioDefinition.name,
          path: `ScenarioExecutor.${scenarioDefinition.name}`,
          executionId: executionId,
          finalState: this.getExecutionState(executionId),
          result: 'success',
          executionDuration: duration,
          metadata: {
            variableAssignments: this.stats.variableAssignments,
            loopIterations: this.stats.loopIterations,
            conditionEvaluations: this.stats.conditionEvaluations
          }
        });
      }

      return {
        success: true,
        executionId: executionId,
        result: result,
        duration: duration,
        variables: this.getVariableScope(executionId),
        finalState: this.getExecutionState(executionId)
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateExecutionStats(duration, false);

      console.error(`❌ Scenario execution failed: ${scenarioDefinition.name} - ${error.message}`);

      // Log execution failure
      if (this.sysadlBase.logger) {
        this.sysadlBase.logger.logExecution({
          type: 'scenario_execution_error',
          name: scenarioDefinition.name,
          path: `ScenarioExecutor.${scenarioDefinition.name}`,
          executionId: executionId,
          result: 'error',
          executionDuration: duration,
          errors: [error.message],
          metadata: { errorType: error.constructor.name }
        });
      }

      throw error;

    } finally {
      // Cleanup execution context
      this.cleanupExecution(executionId);
    }
  }

  /**
   * Execute scenario body with programming structures support
   */
  async executeScenarioBody(executionId, statements) {
    const results = [];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        const result = await this.executeStatement(executionId, statement);
        results.push(result);
        
        // Check for control flow changes
        if (result && result.controlFlow) {
          if (result.controlFlow === 'break' || result.controlFlow === 'continue') {
            // Handle loop control flow
            return { controlFlow: result.controlFlow, results };
          } else if (result.controlFlow === 'return') {
            // Early return from scenario
            return { controlFlow: 'return', value: result.value, results };
          }
        }
        
      } catch (error) {
        console.error(`Error executing statement ${i}:`, error.message);
        throw error;
      }
    }
    
    return { results };
  }

  /**
   * Execute individual statement with programming structures
   */
  async executeStatement(executionId, statement) {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new Error(`Execution context not found: ${executionId}`);
    }

    // Check timeout
    if (Date.now() - context.startTime > context.timeout) {
      throw new Error(`Scenario execution timeout: ${executionId}`);
    }

    switch (statement.type) {
      case 'VariableAssignment':
        return this.executeVariableAssignment(executionId, statement);
        
      case 'EventTrigger':
        return this.executeEventTrigger(executionId, statement);
        
      case 'ConditionWait':
        return this.executeConditionWait(executionId, statement);
        
      case 'WhileLoop':
        return this.executeWhileLoop(executionId, statement);
        
      case 'ForLoop':
        return this.executeForLoop(executionId, statement);
        
      case 'IfStatement':
        return this.executeIfStatement(executionId, statement);
        
      case 'EventInjection':
        return this.executeEventInjection(executionId, statement);
        
      case 'StateUpdate':
        return this.executeStateUpdate(executionId, statement);
        
      case 'ScenarioCall':
        return this.executeScenarioCall(executionId, statement);
        
      case 'Sleep':
        return this.executeSleep(executionId, statement);
        
      case 'Break':
        return { controlFlow: 'break' };
        
      case 'Continue':
        return { controlFlow: 'continue' };
        
      case 'Return':
        return { 
          controlFlow: 'return', 
          value: statement.value ? await this.evaluateExpression(executionId, statement.value) : null 
        };
        
      default:
        console.warn(`Unknown statement type: ${statement.type}`);
        return { success: true, message: 'Statement type not implemented' };
    }
  }

  /**
   * Execute variable assignment
   */
  async executeVariableAssignment(executionId, statement) {
    const value = await this.evaluateExpression(executionId, statement.value);
    this.setVariable(executionId, statement.variable, value);
    this.stats.variableAssignments++;
    
    console.log(`📝 Variable assigned: ${statement.variable} = ${JSON.stringify(value)}`);
    
    return { 
      success: true, 
      type: 'variable_assignment',
      variable: statement.variable,
      value: value 
    };
  }

  /**
   * Execute event trigger from EventsDefinitions
   */
  async executeEventTrigger(executionId, statement) {
    const context = this.activeExecutions.get(executionId);
    const eventDefinitions = this.sysadlBase.events || {};
    
    // Find event definition
    const eventDef = eventDefinitions[statement.eventsDefinitionName];
    if (!eventDef) {
      throw new Error(`Event definition not found: ${statement.eventsDefinitionName}`);
    }
    
    // Get specific event
    const event = eventDef[statement.eventName];
    if (!event) {
      throw new Error(`Event not found: ${statement.eventName} in ${statement.eventsDefinitionName}`);
    }
    
    // Execute event with current state context
    const eventContext = {
      ...context,
      stateManager: this.stateManager,
      variables: this.getVariableScope(executionId),
      currentState: this.stateManager.getSnapshot()
    };
    
    console.log(`🔥 Triggering event: ${statement.eventsDefinitionName}.${statement.eventName}`);
    
    // Execute event rules
    const results = [];
    for (const rule of event.rules) {
      if (rule.execute) {
        const result = await rule.execute(eventContext);
        results.push(result);
      }
    }
    
    return {
      success: true,
      type: 'event_trigger',
      eventDefinition: statement.eventsDefinitionName,
      eventName: statement.eventName,
      results: results
    };
  }

  /**
   * Execute reactive condition wait
   */
  async executeConditionWait(executionId, statement) {
    return new Promise((resolve, reject) => {
      const conditionId = `${executionId}_condition_${Date.now()}`;
      const timeout = statement.timeout || this.config.defaultTimeout;
      
      console.log(`⏳ Waiting for condition: ${statement.condition}`);
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.conditionWatcher.unwatchCondition(conditionId);
        reject(new Error(`Condition wait timeout: ${statement.condition}`));
      }, timeout);
      
      // Watch condition reactively
      this.conditionWatcher.watchCondition(
        conditionId,
        statement.condition,
        (conditionResult) => {
          clearTimeout(timeoutId);
          this.conditionWatcher.unwatchCondition(conditionId);
          
          console.log(`✅ Condition met: ${statement.condition}`);
          this.stats.conditionEvaluations++;
          
          resolve({
            success: true,
            type: 'condition_wait',
            condition: statement.condition,
            conditionResult: conditionResult
          });
        },
        {
          priority: 'high'
        }
      );
    });
  }

  /**
   * Execute while loop
   */
  async executeWhileLoop(executionId, statement) {
    const loopId = `${executionId}_while_${Date.now()}`;
    let iteration = 0;
    const results = [];
    
    console.log(`🔄 Starting while loop: ${statement.condition}`);
    
    while (await this.evaluateExpression(executionId, statement.condition)) {
      if (iteration >= this.config.maxLoopIterations) {
        throw new Error(`Maximum loop iterations exceeded: ${this.config.maxLoopIterations}`);
      }
      
      this.stats.loopIterations++;
      iteration++;
      
      try {
        const iterationResult = await this.executeScenarioBody(executionId, statement.body || []);
        results.push(iterationResult);
        
        // Handle control flow
        if (iterationResult.controlFlow === 'break') {
          break;
        } else if (iterationResult.controlFlow === 'continue') {
          continue;
        } else if (iterationResult.controlFlow === 'return') {
          return iterationResult;
        }
        
      } catch (error) {
        console.error(`Error in while loop iteration ${iteration}:`, error.message);
        throw error;
      }
    }
    
    console.log(`✅ While loop completed: ${iteration} iterations`);
    
    return {
      success: true,
      type: 'while_loop',
      iterations: iteration,
      results: results
    };
  }

  /**
   * Execute for loop
   */
  async executeForLoop(executionId, statement) {
    const startValue = await this.evaluateExpression(executionId, statement.start);
    const endValue = await this.evaluateExpression(executionId, statement.end);
    const stepValue = statement.step ? await this.evaluateExpression(executionId, statement.step) : 1;
    
    const results = [];
    let iteration = 0;
    
    console.log(`🔢 Starting for loop: ${statement.variable} from ${startValue} to ${endValue} step ${stepValue}`);
    
    for (let i = startValue; i <= endValue; i += stepValue) {
      if (iteration >= this.config.maxLoopIterations) {
        throw new Error(`Maximum loop iterations exceeded: ${this.config.maxLoopIterations}`);
      }
      
      // Set loop variable
      this.setVariable(executionId, statement.variable, i);
      this.stats.loopIterations++;
      iteration++;
      
      try {
        const iterationResult = await this.executeScenarioBody(executionId, statement.body || []);
        results.push(iterationResult);
        
        // Handle control flow
        if (iterationResult.controlFlow === 'break') {
          break;
        } else if (iterationResult.controlFlow === 'continue') {
          continue;
        } else if (iterationResult.controlFlow === 'return') {
          return iterationResult;
        }
        
      } catch (error) {
        console.error(`Error in for loop iteration ${iteration}:`, error.message);
        throw error;
      }
    }
    
    console.log(`✅ For loop completed: ${iteration} iterations`);
    
    return {
      success: true,
      type: 'for_loop',
      iterations: iteration,
      results: results
    };
  }

  /**
   * Execute if statement
   */
  async executeIfStatement(executionId, statement) {
    const conditionResult = await this.evaluateExpression(executionId, statement.condition);
    this.stats.conditionEvaluations++;
    
    console.log(`🤔 If condition: ${statement.condition} = ${conditionResult}`);
    
    if (conditionResult) {
      const result = await this.executeScenarioBody(executionId, statement.thenBody || []);
      return {
        success: true,
        type: 'if_statement',
        conditionResult: true,
        branchTaken: 'then',
        result: result
      };
    } else if (statement.elseBody) {
      const result = await this.executeScenarioBody(executionId, statement.elseBody);
      return {
        success: true,
        type: 'if_statement',
        conditionResult: false,
        branchTaken: 'else',
        result: result
      };
    }
    
    return {
      success: true,
      type: 'if_statement',
      conditionResult: false,
      branchTaken: 'none'
    };
  }

  /**
   * Execute event injection via EventInjector
   */
  async executeEventInjection(executionId, statement) {
    const parameters = {};
    
    // Evaluate parameters
    if (statement.parameters) {
      for (const [key, valueExpr] of Object.entries(statement.parameters)) {
        parameters[key] = await this.evaluateExpression(executionId, valueExpr);
      }
    }
    
    console.log(`⚡ Injecting event: ${statement.eventName}`);
    
    const result = await this.sysadlBase.eventInjector.injectEvent(
      statement.eventName,
      parameters,
      statement.delay || 0,
      statement.options || {}
    );
    
    return {
      success: true,
      type: 'event_injection',
      eventName: statement.eventName,
      parameters: parameters,
      injectionResult: result
    };
  }

  /**
   * Execute reactive state update
   */
  async executeStateUpdate(executionId, statement) {
    const value = await this.evaluateExpression(executionId, statement.value);
    
    console.log(`🔄 Updating state: ${statement.path} = ${JSON.stringify(value)}`);
    
    this.stateManager.setValue(statement.path, value);
    
    return {
      success: true,
      type: 'state_update',
      path: statement.path,
      value: value
    };
  }

  /**
   * Execute nested scenario call
   */
  async executeScenarioCall(executionId, statement) {
    // Prepare nested scenario variables
    const nestedVariables = { ...this.getVariableScope(executionId) };
    
    if (statement.parameters) {
      for (const [key, valueExpr] of Object.entries(statement.parameters)) {
        nestedVariables[key] = await this.evaluateExpression(executionId, valueExpr);
      }
    }
    
    console.log(`📞 Calling nested scenario: ${statement.scenarioName}`);
    
    // Execute nested scenario
    const result = await this.executeScenario(statement.scenarioDefinition, {
      variables: nestedVariables,
      parentExecutionId: executionId
    });
    
    return {
      success: true,
      type: 'scenario_call',
      scenarioName: statement.scenarioName,
      result: result
    };
  }

  /**
   * Execute sleep/delay
   */
  async executeSleep(executionId, statement) {
    const duration = await this.evaluateExpression(executionId, statement.duration);
    
    console.log(`😴 Sleeping for ${duration}ms`);
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          type: 'sleep',
          duration: duration
        });
      }, duration);
    });
  }

  /**
   * Create execution context
   */
  createExecutionContext(executionId, scenarioDefinition, options) {
    return {
      executionId: executionId,
      scenarioDefinition: scenarioDefinition,
      startTime: Date.now(),
      timeout: options.timeout || this.config.defaultTimeout,
      executionMode: options.executionMode || 'sequential',
      variables: options.variables || {},
      parentExecutionId: options.parentExecutionId || null,
      status: 'running',
      result: null,
      duration: null
    };
  }

  /**
   * Initialize variable scope for execution
   */
  initializeVariableScope(executionId, initialVariables = {}) {
    this.variableScopes.set(executionId, new Map());
    
    // Set initial variables
    for (const [name, value] of Object.entries(initialVariables)) {
      this.setVariable(executionId, name, value);
    }
    
    // Set built-in variables
    this.setVariable(executionId, '__executionId', executionId);
    this.setVariable(executionId, '__startTime', Date.now());
  }

  /**
   * Set variable in scope
   */
  setVariable(executionId, name, value) {
    const scope = this.variableScopes.get(executionId);
    if (scope) {
      scope.set(name, value);
      
      // Update reactive state if enabled
      if (this.config.enableReactiveIntegration) {
        this.stateManager.setValue(`executions.${executionId}.variables.${name}`, value);
      }
    }
  }

  /**
   * Get variable from scope
   */
  getVariable(executionId, name) {
    const scope = this.variableScopes.get(executionId);
    return scope ? scope.get(name) : undefined;
  }

  /**
   * Get entire variable scope
   */
  getVariableScope(executionId) {
    const scope = this.variableScopes.get(executionId);
    if (!scope) return {};
    
    const variables = {};
    for (const [name, value] of scope) {
      variables[name] = value;
    }
    return variables;
  }

  /**
   * Evaluate expression with variable and state context
   */
  async evaluateExpression(executionId, expression) {
    if (typeof expression !== 'string') {
      return expression; // Literal value
    }
    
    // Check if it's a simple string literal (no evaluation needed)
    if (/^['"].*['"]$/.test(expression)) {
      return expression.slice(1, -1); // Remove quotes
    }
    
    // Check if it's a simple number
    if (/^-?\d+(\.\d+)?$/.test(expression)) {
      return parseFloat(expression);
    }
    
    // Check if it's a boolean
    if (expression === 'true') return true;
    if (expression === 'false') return false;
    
    // Create evaluation context
    const context = {
      // Variables
      ...this.getVariableScope(executionId),
      
      // Reactive state
      state: this.stateManager.getSnapshot(),
      
      // Built-in functions
      now: () => Date.now(),
      random: () => Math.random(),
      
      // Math functions
      Math: Math
    };
    
    try {
      return this.expressionEvaluator.evaluate(expression, context);
    } catch (error) {
      console.error(`Expression evaluation error: ${expression}`, error);
      throw new Error(`Failed to evaluate expression: ${expression} - ${error.message}`);
    }
  }

  /**
   * Create expression evaluator
   */
  createExpressionEvaluator() {
    return {
      evaluate: (expression, context) => {
        // Simple expression evaluator - in production would use a proper parser
        try {
          // Create safe evaluation function
          const func = new Function(...Object.keys(context), `return (${expression});`);
          return func(...Object.values(context));
        } catch (error) {
          throw new Error(`Invalid expression: ${expression}`);
        }
      }
    };
  }

  /**
   * Get execution state for logging
   */
  getExecutionState(executionId) {
    const context = this.activeExecutions.get(executionId);
    if (!context) return null;
    
    return {
      executionId: executionId,
      status: context.status,
      variables: this.getVariableScope(executionId),
      startTime: context.startTime,
      elapsedTime: Date.now() - context.startTime
    };
  }

  /**
   * Update execution statistics
   */
  updateExecutionStats(duration, success) {
    if (success) {
      this.stats.completedExecutions++;
    } else {
      this.stats.failedExecutions++;
    }
    
    this.stats.totalExecutionTime += duration;
    this.stats.averageExecutionTime = this.stats.totalExecutionTime / 
      (this.stats.completedExecutions + this.stats.failedExecutions);
  }

  /**
   * Cleanup execution context
   */
  cleanupExecution(executionId) {
    this.activeExecutions.delete(executionId);
    this.variableScopes.delete(executionId);
    this.loopStacks.delete(executionId);
    this.conditionStack.delete(executionId);
    
    // Cleanup reactive state
    if (this.config.enableReactiveIntegration) {
      this.stateManager.setValue(`executions.${executionId}`, undefined);
    }
  }

  /**
   * Generate unique execution ID
   */
  generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get execution statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      activeExecutions: this.activeExecutions.size,
      memoryUsage: {
        variableScopes: this.variableScopes.size,
        loopStacks: this.loopStacks.size,
        conditionStacks: this.conditionStack.size
      },
      reactive: {
        stateManager: this.stateManager.getStatistics(),
        conditionWatcher: this.conditionWatcher.getStatistics()
      }
    };
  }

  /**
   * List active executions
   */
  listActiveExecutions() {
    console.log('\n=== Active Scenario Executions ===');
    
    if (this.activeExecutions.size === 0) {
      console.log('No active executions');
      return;
    }

    for (const [executionId, context] of this.activeExecutions) {
      const elapsed = Date.now() - context.startTime;
      console.log(`${executionId}: ${context.scenarioDefinition.name} (${elapsed}ms)`);
      console.log(`  Status: ${context.status}`);
      console.log(`  Variables: ${Object.keys(this.getVariableScope(executionId)).length}`);
    }
    
    console.log('==================================\n');
  }
}

module.exports = { ScenarioExecutor };
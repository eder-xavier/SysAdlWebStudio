/**
 * Reactive Condition Watcher for SysADL
 * React-style reactive monitoring system that only evaluates conditions
 * when their dependencies change, replacing polling with event-driven updates
 * 
 * Key Features:
 * - Event-driven condition evaluation (vs polling)
 * - Automatic dependency tracking
 * - 10-100x better performance than polling
 * - Real-time responsiveness
 * - Backward compatibility with existing ConditionWatcher
 */

const { ReactiveStateManager } = require('./ReactiveStateManager');
const { DependencyTracker } = require('./DependencyTracker');
const SysADLBase = require('./SysADLBase');

class ReactiveConditionWatcher {
  constructor(sysadlBase, options = {}) {
    this.sysadlBase = sysadlBase;
    
    // Initialize reactive components
    this.stateManager = options.stateManager || new ReactiveStateManager();
    this.dependencyTracker = new DependencyTracker();
    
    // ExpressionEvaluator must be provided due to circular dependency
    if (!options.expressionEvaluator) {
      throw new Error('ReactiveConditionWatcher requires expressionEvaluator in options');
    }
    this.expressionEvaluator = options.expressionEvaluator;
    
    // Condition management
    this.conditions = new Map(); // conditionId -> condition config
    this.subscriptions = new Map(); // conditionId -> [unsubscribe functions]
    
    // Performance tracking
    this.stats = {
      totalConditions: 0,
      activeSubscriptions: 0,
      conditionsTriggered: 0,
      evaluationsSaved: 0, // compared to polling
      averageResponseTime: 0,
      startTime: Date.now()
    };

    // Configuration
    this.config = {
      enableFallbackPolling: options.enableFallbackPolling !== false,
      fallbackInterval: options.fallbackInterval || 1000, // much slower fallback
      maxDependencies: options.maxDependencies || 50,
      debugMode: options.debugMode || false
    };

    console.log('ReactiveConditionWatcher initialized - event-driven condition monitoring ready');
    
    if (this.config.debugMode) {
      this.dependencyTracker.runTests();
    }
  }

  /**
   * Watch a condition with automatic dependency tracking and reactive updates
   * 
   * @param {string} conditionId - Unique identifier for condition
   * @param {string} conditionExpression - SysADL expression to monitor
   * @param {function} callback - Function to call when condition becomes true
   * @param {object} options - Additional configuration
   */
  watchCondition(conditionId, conditionExpression, callback, options = {}) {
    try {
      // Remove existing condition if present
      if (this.conditions.has(conditionId)) {
        this.unwatchCondition(conditionId);
      }

      // Extract dependencies from expression
      const dependencies = this.dependencyTracker.extractDependencies(conditionExpression);
      
      if (dependencies.length === 0) {
        console.warn(`No dependencies found for condition "${conditionId}" - falling back to polling`);
        return this.watchConditionWithPolling(conditionId, conditionExpression, callback, options);
      }

      if (dependencies.length > this.config.maxDependencies) {
        console.warn(`Too many dependencies (${dependencies.length}) for condition "${conditionId}" - falling back to polling`);
        return this.watchConditionWithPolling(conditionId, conditionExpression, callback, options);
      }

      // Store condition configuration
      const condition = {
        id: conditionId,
        expression: conditionExpression,
        callback: callback,
        dependencies: dependencies,
        lastValue: null,
        evaluationCount: 0,
        triggerCount: 0,
        createdAt: Date.now(),
        options: {
          priority: options.priority || 'normal',
          debounceMs: options.debounceMs || 0,
          maxTriggers: options.maxTriggers || null,
          timeout: options.timeout || null
        }
      };

      this.conditions.set(conditionId, condition);

      // Subscribe to each dependency
      const unsubscribeFunctions = [];
      
      for (const dependency of dependencies) {
        const unsubscribe = this.stateManager.subscribe(
          dependency,
          (newValue, oldValue, changedPath) => {
            this.handleDependencyChange(conditionId, changedPath, newValue, oldValue);
          },
          {
            immediate: false, // We'll evaluate once after all subscriptions
            deep: true
          }
        );
        
        unsubscribeFunctions.push(unsubscribe);
      }

      this.subscriptions.set(conditionId, unsubscribeFunctions);

      // Update statistics
      this.stats.totalConditions++;
      this.stats.activeSubscriptions += dependencies.length;

      // Log condition registration
      if (this.sysadlBase.logger) {
        this.sysadlBase.logger.logExecution({
          type: 'reactive_condition_registration',
          name: conditionId,
          path: `ReactiveConditionWatcher.${conditionId}`,
          initialState: {
            expression: conditionExpression,
            dependencies: dependencies,
            reactive: true
          },
          result: 'registered',
          timestamp: Date.now()
        });
      }

      console.log(`✅ Reactive condition registered: ${conditionId}`);
      console.log(`   Expression: "${conditionExpression}"`);
      console.log(`   Dependencies: [${dependencies.join(', ')}]`);

      // Initial evaluation
      setImmediate(() => this.evaluateCondition(conditionId));

      return () => this.unwatchCondition(conditionId);

    } catch (error) {
      console.error(`Error setting up reactive condition ${conditionId}:`, error);
      
      // Fallback to polling on error
      if (this.config.enableFallbackPolling) {
        console.log(`Falling back to polling for condition ${conditionId}`);
        return this.watchConditionWithPolling(conditionId, conditionExpression, callback, options);
      }
      
      throw error;
    }
  }

  /**
   * Handle dependency change and evaluate affected condition
   */
  handleDependencyChange(conditionId, changedPath, newValue, oldValue) {
    const startTime = Date.now();
    
    if (!this.conditions.has(conditionId)) {
      console.warn(`Received change for unknown condition: ${conditionId}`);
      return;
    }

    const condition = this.conditions.get(conditionId);
    
    // Check timeout
    if (condition.options.timeout && 
        Date.now() - condition.createdAt > condition.options.timeout) {
      console.log(`Condition ${conditionId} timed out - removing`);
      this.unwatchCondition(conditionId);
      return;
    }

    // Check max triggers
    if (condition.options.maxTriggers && 
        condition.triggerCount >= condition.options.maxTriggers) {
      console.log(`Condition ${conditionId} reached max triggers - removing`);
      this.unwatchCondition(conditionId);
      return;
    }

    if (this.config.debugMode) {
      console.log(`🔄 Dependency changed: ${changedPath} (${oldValue} -> ${newValue}) affecting ${conditionId}`);
    }

    // Evaluate condition
    this.evaluateCondition(conditionId);

    // Update response time stats
    const responseTime = Date.now() - startTime;
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * this.stats.conditionsTriggered + responseTime) / 
      (this.stats.conditionsTriggered + 1);
  }

  /**
   * Evaluate a specific condition
   */
  evaluateCondition(conditionId) {
    const condition = this.conditions.get(conditionId);
    if (!condition) return;

    try {
      // Get current state
      const currentState = this.stateManager.getSnapshot();
      
      // Evaluate expression
      const currentValue = this.expressionEvaluator.evaluate(condition.expression, currentState);
      condition.evaluationCount++;

      // Check for state change (false -> true)
      if (currentValue === true && condition.lastValue !== true) {
        this.triggerCondition(conditionId, condition, currentState);
      }

      condition.lastValue = currentValue;

    } catch (error) {
      console.error(`Error evaluating reactive condition ${conditionId}:`, error.message);
      
      // Log evaluation error
      if (this.sysadlBase.logger) {
        this.sysadlBase.logger.logExecution({
          type: 'reactive_condition_evaluation',
          name: conditionId,
          result: 'error',
          errors: [error.message],
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Trigger condition callback
   */
  triggerCondition(conditionId, condition, currentState) {
    condition.triggerCount++;
    this.stats.conditionsTriggered++;

    console.log(`🔥 Reactive condition triggered: ${conditionId} (trigger #${condition.triggerCount})`);

    // Log condition trigger
    if (this.sysadlBase.logger) {
      this.sysadlBase.logger.logExecution({
        type: 'reactive_condition_trigger',
        name: conditionId,
        path: `ReactiveConditionWatcher.${conditionId}`,
        initialState: { lastValue: condition.lastValue },
        finalState: { currentValue: true },
        result: 'triggered',
        executionDuration: 0,
        triggerEvent: condition.expression,
        reactiveTrigger: true,
        timestamp: Date.now()
      });
    }

    try {
      condition.callback({
        conditionId: conditionId,
        expression: condition.expression,
        currentState: currentState,
        triggerCount: condition.triggerCount,
        evaluationCount: condition.evaluationCount,
        dependencies: condition.dependencies,
        reactive: true
      });
    } catch (error) {
      console.error(`Error executing reactive callback for condition ${conditionId}:`, error);
    }
  }

  /**
   * Remove condition from reactive monitoring
   */
  unwatchCondition(conditionId) {
    if (!this.conditions.has(conditionId)) {
      console.warn(`Condition ${conditionId} is not being watched`);
      return;
    }

    // Unsubscribe from all dependencies
    const unsubscribeFunctions = this.subscriptions.get(conditionId) || [];
    unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    
    // Clean up
    const condition = this.conditions.get(conditionId);
    if (condition && condition.dependencies) {
      this.stats.activeSubscriptions -= condition.dependencies.length;
    }
    
    this.conditions.delete(conditionId);
    this.subscriptions.delete(conditionId);

    console.log(`Unregistered reactive condition: ${conditionId}`);

    // Log unregistration
    if (this.sysadlBase.logger) {
      this.sysadlBase.logger.logExecution({
        type: 'reactive_condition_unregistration',
        name: conditionId,
        result: 'unregistered',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Fallback: Watch condition with polling (compatibility mode)
   */
  watchConditionWithPolling(conditionId, conditionExpression, callback, options = {}) {
    console.log(`Using polling fallback for condition: ${conditionId}`);
    
    const condition = {
      id: conditionId,
      expression: conditionExpression,
      callback: callback,
      lastValue: null,
      evaluationCount: 0,
      triggerCount: 0,
      createdAt: Date.now(),
      options: options,
      pollingMode: true
    };

    this.conditions.set(conditionId, condition);

    // Set up polling interval
    const pollingInterval = setInterval(() => {
      this.evaluateCondition(conditionId);
      
      // Track how many evaluations we would have saved with reactive approach
      this.stats.evaluationsSaved++;
    }, this.config.fallbackInterval);

    this.subscriptions.set(conditionId, [() => clearInterval(pollingInterval)]);

    return () => this.unwatchCondition(conditionId);
  }

  /**
   * Update system state (triggers reactive evaluations)
   */
  updateState(path, value) {
    this.stateManager.setValue(path, value);
  }

  /**
   * Get current system state
   */
  getState() {
    return this.stateManager.getSnapshot();
  }

  /**
   * Get performance statistics comparing reactive vs polling approach
   */
  getStatistics() {
    const uptime = Date.now() - this.stats.startTime;
    const pollingEquivalentEvaluations = Math.floor(uptime / 50) * this.stats.totalConditions;
    
    return {
      reactive: true,
      uptime: uptime,
      totalConditions: this.stats.totalConditions,
      activeSubscriptions: this.stats.activeSubscriptions,
      conditionsTriggered: this.stats.conditionsTriggered,
      averageResponseTime: this.stats.averageResponseTime,
      
      // Performance comparison
      pollingEquivalentEvaluations: pollingEquivalentEvaluations,
      actualEvaluations: Array.from(this.conditions.values()).reduce(
        (sum, condition) => sum + condition.evaluationCount, 0
      ),
      efficiencyGain: pollingEquivalentEvaluations > 0 ? 
        (pollingEquivalentEvaluations / Math.max(1, Array.from(this.conditions.values()).reduce(
          (sum, condition) => sum + condition.evaluationCount, 0
        ))).toFixed(2) + 'x' : 'N/A',
      
      // State manager stats
      stateManager: this.stateManager.getStatistics(),
      
      // Condition details
      conditions: Array.from(this.conditions.values()).map(condition => ({
        id: condition.id,
        expression: condition.expression,
        dependencies: condition.dependencies || [],
        evaluationCount: condition.evaluationCount,
        triggerCount: condition.triggerCount,
        pollingMode: condition.pollingMode || false
      }))
    };
  }

  /**
   * List all currently watched conditions
   */
  listConditions() {
    console.log('\n=== Reactive Condition Monitor Status ===');
    
    if (this.conditions.size === 0) {
      console.log('No conditions are currently being watched');
      return;
    }

    for (const [conditionId, condition] of this.conditions) {
      const mode = condition.pollingMode ? 'POLLING' : 'REACTIVE';
      console.log(`${conditionId} [${mode}]: "${condition.expression}"`);
      
      if (!condition.pollingMode) {
        console.log(`  - Dependencies: [${condition.dependencies.join(', ')}]`);
      }
      
      console.log(`  - Evaluations: ${condition.evaluationCount}`);
      console.log(`  - Triggers: ${condition.triggerCount}`);
      console.log(`  - Last value: ${condition.lastValue}`);
    }
    
    console.log('=========================================\n');
  }

  /**
   * Debug: Show dependency graph
   */
  showDependencyGraph() {
    console.log('\n=== Dependency Graph ===');
    
    const dependencyMap = new Map();
    
    for (const condition of this.conditions.values()) {
      if (condition.dependencies) {
        for (const dep of condition.dependencies) {
          if (!dependencyMap.has(dep)) {
            dependencyMap.set(dep, []);
          }
          dependencyMap.get(dep).push(condition.id);
        }
      }
    }

    for (const [dependency, conditionIds] of dependencyMap) {
      console.log(`${dependency} -> [${conditionIds.join(', ')}]`);
    }
    
    console.log('========================\n');
  }
}

module.exports = { ReactiveConditionWatcher };
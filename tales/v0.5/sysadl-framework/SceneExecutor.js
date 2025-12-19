/**
 * Scene Execution Engine for SysADL
 * 
 * Implements comprehensive scene execution with:
 * - Pre/post-condition validation
 * - Start/finish event execution
 * - Timeout handling and error management
 * - Full logging integration
 * - Generic domain-agnostic architecture
 */

class SceneExecutor {
  constructor(sysadlBase, options = {}) {
    this.sysadlBase = sysadlBase;
    this.activeScenes = new Map(); // sceneId -> execution context
    this.sceneDefinitions = new Map(); // sceneName -> scene definition
    this.executionQueue = []; // scenes waiting to execute

    // Configuration
    this.config = {
      defaultTimeout: options.defaultTimeout || 30000, // 30 seconds
      maxConcurrentScenes: options.maxConcurrentScenes || 10,
      enableParallelExecution: options.enableParallelExecution !== false,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      debugMode: options.debugMode || false
    };

    // Statistics
    this.stats = {
      totalScenesExecuted: 0,
      successfulScenes: 0,
      failedScenes: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      activeExecutions: 0
    };

    console.log('SceneExecutor initialized - ready for scene execution');
  }

  /**
   * Register a scene definition for later execution
   */
  registerScene(sceneName, sceneDefinition) {
    if (!sceneName || !sceneDefinition) {
      throw new Error('Scene name and definition are required');
    }

    console.log(`📝 Registering scene: ${sceneName}`, sceneDefinition);

    const scene = {
      name: sceneName,
      startEvent: sceneDefinition.startEvent,
      finishEvent: sceneDefinition.finishEvent,
      preConditions: sceneDefinition.preConditions || [],
      postConditions: sceneDefinition.postConditions || [],
      timeout: sceneDefinition.timeout || this.config.defaultTimeout,
      maxRetries: sceneDefinition.maxRetries || this.config.retryAttempts,
      parameters: sceneDefinition.parameters || {},
      description: sceneDefinition.description || '',
      priority: sceneDefinition.priority || 'normal'
    };

    console.log(`📝 Created scene object:`, scene);

    this.sceneDefinitions.set(sceneName, scene);

    if (this.config.debugMode) {
      console.log(`✅ Scene registered: ${sceneName}`);
    }

    return scene;
  }

  /**
   * Execute a scene with full validation and logging
   */
  async executeScene(sceneName, context = {}, retryCount = 0) {
    const sceneId = this.generateSceneId(sceneName);
    const startTime = Date.now();

    try {
      // Get scene definition
      const scene = this.sceneDefinitions.get(sceneName);
      if (!scene) {
        throw new Error(`Scene not found: ${sceneName}`);
      }

      console.log(`📋 Retrieved scene definition:`, {
        name: scene.name,
        startEvent: scene.startEvent,
        finishEvent: scene.finishEvent,
        timeout: scene.timeout
      });

      // Check concurrency limits
      if (this.stats.activeExecutions >= this.config.maxConcurrentScenes) {
        throw new Error(`Maximum concurrent scenes reached: ${this.config.maxConcurrentScenes}`);
      }

      // Start execution tracking
      const execution = {
        sceneId,
        sceneName,
        scene,
        context,
        startTime,
        status: 'started',
        phase: 'initialization',
        retryCount: retryCount,
        errors: [],
        warnings: []
      };

      this.activeScenes.set(sceneId, execution);
      this.stats.activeExecutions++;

      // Log scene start
      this.logExecution(execution, 'scene_start', 'started');

      console.log(`🎬 Starting scene: ${sceneName} (${sceneId})`);

      // Phase 1: Validate pre-conditions
      execution.phase = 'pre_conditions';
      console.log(`🔄 Phase 1: Validating pre-conditions`);
      await this.validatePreConditions(execution);

      // Phase 2: Execute start event
      execution.phase = 'start_event';
      console.log(`🔄 Phase 2: Executing start event`);
      await this.executeStartEvent(execution);

      // Phase 3: Wait for finish event (with timeout)
      execution.phase = 'waiting_finish';
      console.log(`🔄 Phase 3: Waiting for finish event`);
      await this.waitForFinishEvent(execution);

      // Phase 4: Validate post-conditions
      execution.phase = 'post_conditions';
      console.log(`🔄 Phase 4: Validating post-conditions`);
      await this.validatePostConditions(execution);

      // Scene completed successfully
      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;

      this.updateStatistics(execution, true);
      this.logExecution(execution, 'scene_complete', 'success');

      console.log(`✅ Scene completed: ${sceneName} (${execution.duration}ms)`);

      return {
        success: true,
        sceneId,
        duration: execution.duration,
        context: execution.context
      };

    } catch (error) {
      // Scene failed
      const execution = this.activeScenes.get(sceneId);
      if (execution) {
        execution.status = 'failed';
        execution.endTime = Date.now();
        execution.duration = execution.endTime - execution.startTime;
        execution.errors.push(error.message);

        this.updateStatistics(execution, false);
        this.logExecution(execution, 'scene_failed', 'failure', { error: error.message });
      }

      console.error(`❌ Scene failed: ${sceneName} - ${error.message}`);

      // Check if retry is possible
      if (execution && execution.retryCount < execution.scene.maxRetries) {
        console.log(`🔄 Retrying scene: ${sceneName} (attempt ${execution.retryCount + 1})`);
        execution.retryCount++;

        // Wait before retry
        await this.sleep(this.config.retryDelay);

        // Retry execution
        return this.executeScene(sceneName, context, execution.retryCount);
      }

      throw error;
    } finally {
      // Cleanup
      if (this.activeScenes.has(sceneId)) {
        this.activeScenes.delete(sceneId);
        this.stats.activeExecutions--;
      }
    }
  }

  /**
   * Validate scene pre-conditions
   */
  async validatePreConditions(execution) {
    const { scene, context } = execution;

    console.log(`[DEBUG validatePreConditions] Scene: ${scene.name}, has method: ${typeof scene.validatePreConditions}`);

    // Check if scene has validatePreConditions method (generated code style)
    if (typeof scene.validatePreConditions === 'function') {
      console.log(`🔍 Validating pre-conditions for: ${scene.name}`);

      try {
        const result = scene.validatePreConditions(context);

        // Log the validation result
        this.sysadlBase.logger?.logExecution({
          what: result ? 'scene.precondition.validated' : 'scene.precondition.validation.failed',
          who: scene.name,
          summary: result
            ? `Pre-conditions validated for ${scene.name}`
            : `Pre-conditions validation failed for ${scene.name}`,
          context: {
            sceneName: scene.name,
            scenario: context.scenarioName || context.scenario,
            result: result,
            passed: result === true
          },
          trace: {
            scenario: context.scenarioName || context.scenario,
            sceneName: scene.name,
            validationType: 'pre-condition'
          }
        });

        // Force immediate flush to ensure validation is logged before any exception
        if (this.sysadlBase.logger && typeof this.sysadlBase.logger.flush === 'function') {
          await this.sysadlBase.logger.flush();
        }
        // Small delay to ensure write completion
        await new Promise(resolve => setTimeout(resolve, 10));

        if (!result) {
          throw new Error(`Pre-condition validation returned false`);
        }

        console.log(`✅ All pre-conditions validated for: ${scene.name}`);
        return;
      } catch (error) {
        // Log the validation failure
        this.sysadlBase.logger?.logExecution({
          what: 'scene.precondition.validation.failed',
          who: scene.name,
          summary: `Pre-condition validation failed for ${scene.name}`,
          context: {
            sceneName: scene.name,
            scenario: context.scenarioName || context.scenario,
            error: error.message
          },
          trace: {
            scenario: context.scenarioName || context.scenario,
            sceneName: scene.name,
            validationType: 'pre-condition'
          }
        });

        // Force immediate flush to ensure validation failure is logged
        await this.sysadlBase.logger?.flush();

        throw new Error(`Pre-condition validation failed: ${error.message}`);
      }
    }

    // Legacy support: check for preConditions array
    if (!scene.preConditions || scene.preConditions.length === 0) {
      return; // No pre-conditions to validate
    }

    console.log(`🔍 Validating pre-conditions for: ${scene.name}`);

    const conditionResults = [];
    let allPassed = true;

    for (const condition of scene.preConditions) {
      try {
        const result = await this.evaluateCondition(condition, context);

        conditionResults.push({
          expression: condition.expression || condition,
          result: result,
          status: result ? 'passed' : 'failed'
        });

        if (!result) {
          allPassed = false;
          throw new Error(`Pre-condition failed: ${condition.expression || condition}`);
        }

        if (this.config.debugMode) {
          console.log(`  ✅ Pre-condition passed: ${condition.expression || condition}`);
        }

      } catch (error) {
        // Log the validation failure
        this.sysadlBase.logger?.logExecution({
          what: 'scene.precondition.validation.failed',
          who: scene.name,
          summary: `Pre-condition validation failed for ${scene.name}`,
          context: {
            sceneName: scene.name,
            scenario: context.scenarioName || context.scenario,
            conditions: conditionResults,
            error: error.message
          },
          trace: {
            scenario: context.scenarioName || context.scenario,
            sceneName: scene.name,
            validationType: 'pre-condition'
          }
        });
        throw new Error(`Pre-condition validation failed: ${error.message}`);
      }
    }

    console.log(`✅ All pre-conditions validated for: ${scene.name}`);

    // Log successful validation
    this.sysadlBase.logger?.logExecution({
      what: 'scene.precondition.validated',
      who: scene.name,
      summary: `All pre-conditions validated for ${scene.name}`,
      context: {
        sceneName: scene.name,
        scenario: context.scenarioName || context.scenario,
        conditions: conditionResults,
        totalConditions: conditionResults.length,
        allPassed: allPassed
      },
      trace: {
        scenario: context.scenarioName || context.scenario,
        sceneName: scene.name,
        validationType: 'pre-condition'
      }
    });
  }

  /**
   * Execute scene start event
   */
  async executeStartEvent(execution) {
    const { scene, context } = execution;

    if (!scene.startEvent) {
      return; // No start event defined
    }

    console.log(`🚀 Executing start event: ${scene.startEvent}`);

    try {
      // Inject start event into the system
      const eventResult = await this.sysadlBase.eventInjector.injectEvent(
        scene.startEvent,
        context,
        0 // No delay for start event
      );

      execution.startEventResult = eventResult;
      console.log(`✅ Start event executed: ${scene.startEvent}`);

    } catch (error) {
      throw new Error(`Start event execution failed: ${error.message}`);
    }
  }

  /**
   * Wait for scene finish event with timeout
   */
  async waitForFinishEvent(execution) {
    const { scene, context } = execution;

    console.log(`🔍 Checking finish event: ${scene.finishEvent}`);

    if (!scene.finishEvent) {
      console.log(`⚠️  No finish event defined - scene completes immediately`);
      // No finish event - scene completes immediately after start event
      return;
    }

    console.log(`⏳ Waiting for finish event: ${scene.finishEvent} (timeout: ${scene.timeout}ms)`);

    return new Promise((resolve, reject) => {
      let finishEventReceived = false;
      let timeoutId;

      // Set up finish event listener
      const finishEventListener = (eventData) => {
        if (finishEventReceived) return;

        finishEventReceived = true;
        clearTimeout(timeoutId);

        execution.finishEventResult = eventData;
        console.log(`🏁 Finish event received: ${scene.finishEvent}`);
        resolve();
      };

      // Register listener for finish event
      const eventEmitter = this.sysadlBase.eventSystemManager
        ? this.sysadlBase.eventSystemManager.getGlobalEmitter()
        : this.sysadlBase.eventInjector.eventEmitter; // Use EventInjector's emitter in simulation mode

      eventEmitter.once(scene.finishEvent, finishEventListener);

      // Set timeout
      timeoutId = setTimeout(() => {
        if (finishEventReceived) return;

        finishEventReceived = true;

        // Remove listener from correct emitter
        eventEmitter.removeListener(scene.finishEvent, finishEventListener);

        // Analyze dependencies to help diagnose why event didn't fire
        this.analyzeDependencies(scene.finishEvent, context, scene);

        reject(new Error(`Scene timeout: finish event '${scene.finishEvent}' not received within ${scene.timeout}ms`));
      }, scene.timeout);
    });
  }

  /**
   * Validate scene post-conditions
   */
  async validatePostConditions(execution) {
    const { scene, context } = execution;

    // Check if scene has validatePostConditions method (generated code style)
    if (typeof scene.validatePostConditions === 'function') {
      console.log(`🔍 Validating post-conditions for: ${scene.name}`);

      try {
        const result = scene.validatePostConditions(context);

        // Log the validation result
        this.sysadlBase.logger?.logExecution({
          what: result ? 'scene.postcondition.validated' : 'scene.postcondition.validation.failed',
          who: scene.name,
          summary: result
            ? `Post-conditions validated for ${scene.name}`
            : `Post-conditions validation failed for ${scene.name}`,
          context: {
            sceneName: scene.name,
            scenario: context.scenarioName || context.scenario,
            result: result,
            passed: result === true
          },
          trace: {
            scenario: context.scenarioName || context.scenario,
            sceneName: scene.name,
            validationType: 'post-condition'
          }
        });

        // Force immediate flush to ensure validation is logged
        await this.sysadlBase.logger?.flush();

        if (!result) {
          throw new Error(`Post-condition validation returned false`);
        }

        console.log(`✅ All post-conditions validated for: ${scene.name}`);
        return;
      } catch (error) {
        // Log the validation failure
        this.sysadlBase.logger?.logExecution({
          what: 'scene.postcondition.validation.failed',
          who: scene.name,
          summary: `Post-condition validation failed for ${scene.name}`,
          context: {
            sceneName: scene.name,
            scenario: context.scenarioName || context.scenario,
            error: error.message
          },
          trace: {
            scenario: context.scenarioName || context.scenario,
            sceneName: scene.name,
            validationType: 'post-condition'
          }
        });

        // Force immediate flush to ensure validation failure is logged
        await this.sysadlBase.logger?.flush();

        throw new Error(`Post-condition validation failed: ${error.message}`);
      }
    }

    // Legacy support: check for postConditions array
    if (!scene.postConditions || scene.postConditions.length === 0) {
      return; // No post-conditions to validate
    }

    console.log(`🔍 Validating post-conditions for: ${scene.name}`);

    const conditionResults = [];
    let allPassed = true;

    for (const condition of scene.postConditions) {
      try {
        const result = await this.evaluateCondition(condition, context);

        conditionResults.push({
          expression: condition.expression || condition,
          result: result,
          status: result ? 'passed' : 'failed'
        });

        if (!result) {
          allPassed = false;
          throw new Error(`Post-condition failed: ${condition.expression || condition}`);
        }

        if (this.config.debugMode) {
          console.log(`  ✅ Post-condition passed: ${condition.expression || condition}`);
        }

      } catch (error) {
        // Log the validation failure
        this.sysadlBase.logger?.logExecution({
          what: 'scene.postcondition.validation.failed',
          who: scene.name,
          summary: `Post-condition validation failed for ${scene.name}`,
          context: {
            sceneName: scene.name,
            scenario: context.scenarioName || context.scenario,
            conditions: conditionResults,
            error: error.message
          },
          trace: {
            scenario: context.scenarioName || context.scenario,
            sceneName: scene.name,
            validationType: 'post-condition'
          }
        });
        throw new Error(`Post-condition validation failed: ${error.message}`);
      }
    }

    console.log(`✅ All post-conditions validated for: ${scene.name}`);

    // Log successful validation
    this.sysadlBase.logger?.logExecution({
      what: 'scene.postcondition.validated',
      who: scene.name,
      summary: `All post-conditions validated for ${scene.name}`,
      context: {
        sceneName: scene.name,
        scenario: context.scenarioName || context.scenario,
        conditions: conditionResults,
        totalConditions: conditionResults.length,
        allPassed: allPassed
      },
      trace: {
        scenario: context.scenarioName || context.scenario,
        sceneName: scene.name,
        validationType: 'post-condition'
      }
    });
  }

  /**
   * Evaluate a condition using the expression evaluator
   */
  async evaluateCondition(condition, context) {
    if (typeof condition === 'string') {
      // Simple expression string
      const currentState = this.sysadlBase.stateManager
        ? this.sysadlBase.stateManager.getCurrentState()
        : this.sysadlBase.getSystemState();

      const expressionEvaluator = this.sysadlBase.expressionEvaluator
        || new (require('./SysADLBase').ExpressionEvaluator)();

      return expressionEvaluator.evaluate(condition, { ...currentState, ...context });
    }

    if (typeof condition === 'object' && condition.expression) {
      // Condition object with expression
      const currentState = this.sysadlBase.stateManager
        ? this.sysadlBase.stateManager.getCurrentState()
        : this.sysadlBase.getSystemState();

      const expressionEvaluator = this.sysadlBase.expressionEvaluator
        || new (require('./SysADLBase').ExpressionEvaluator)();

      return expressionEvaluator.evaluate(condition.expression, { ...currentState, ...context });
    }

    if (typeof condition === 'function') {
      // Function-based condition
      return await condition(context, this.sysadlBase);
    }

    throw new Error(`Invalid condition format: ${JSON.stringify(condition)}`);
  }

  /**
   * Log execution events
   */
  logExecution(execution, eventType, result, details = {}) {
    const logEntry = {
      timestamp: Date.now(),
      sceneId: execution.sceneId,
      sceneName: execution.sceneName,
      eventType,
      result,
      phase: execution.phase,
      duration: execution.duration || (Date.now() - execution.startTime),
      retryCount: execution.retryCount,
      ...details
    };

    // Use SysADL logger if available
    if (this.sysadlBase && this.sysadlBase.logger) {
      this.sysadlBase.logger.logExecution(logEntry);
    }

    if (this.config.debugMode) {
      console.log(`[LOG] ${eventType}: ${execution.sceneName} -> ${result}`);
    }
  }

  /**
   * Update execution statistics
   */
  updateStatistics(execution, success) {
    this.stats.totalScenesExecuted++;

    if (success) {
      this.stats.successfulScenes++;
    } else {
      this.stats.failedScenes++;
    }

    if (execution.duration) {
      this.stats.totalExecutionTime += execution.duration;
      this.stats.averageExecutionTime = this.stats.totalExecutionTime / this.stats.totalScenesExecuted;
    }
  }

  /**
   * Generate unique scene execution ID
   */
  generateSceneId(sceneName) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `scene_${sceneName}_${timestamp}_${random}`;
  }

  /**
   * Get execution statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      registeredScenes: this.sceneDefinitions.size,
      activeScenes: this.activeScenes.size,
      successRate: this.stats.totalScenesExecuted > 0
        ? (this.stats.successfulScenes / this.stats.totalScenesExecuted * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * List all registered scenes
   */
  getRegisteredScenes() {
    return Array.from(this.sceneDefinitions.entries()).map(([name, scene]) => ({
      name,
      startEvent: scene.startEvent,
      finishEvent: scene.finishEvent,
      preConditions: scene.preConditions.length,
      postConditions: scene.postConditions.length,
      timeout: scene.timeout,
      description: scene.description
    }));
  }

  /**
   * Stop all active scene executions
   */
  async stopAllScenes() {
    console.log(`🛑 Stopping ${this.activeScenes.size} active scenes...`);

    const stopPromises = Array.from(this.activeScenes.keys()).map(sceneId => {
      const execution = this.activeScenes.get(sceneId);
      execution.status = 'stopped';
      return Promise.resolve();
    });

    await Promise.all(stopPromises);

    this.activeScenes.clear();
    this.stats.activeExecutions = 0;

    console.log('✅ All scenes stopped');
  }

  /**
   * Utility: sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Analyze dependencies for a finish event that didn't fire
   * Helps diagnose why a scene is timing out
   */
  analyzeDependencies(finishEvent, context, scene) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TIMEOUT ANALYSIS`);
    console.log(`${'='.repeat(60)}`);
    console.log(`[TIMEOUT] Scene ${scene.name} timed out waiting for: ${finishEvent}`);

    // Get the streaming logger if available
    const streamingLogger = context.streamingLogger;

    // Try to find which event rules emit the finish event
    const eventsDefinitions = context.eventsDefinitions;
    let foundTriggerRule = false;
    let triggerEvent = null;

    if (eventsDefinitions) {
      // Search through event definitions to find what emits finishEvent
      for (const key of Object.keys(eventsDefinitions)) {
        const eventDef = eventsDefinitions[key];
        if (eventDef && eventDef.rules && Array.isArray(eventDef.rules)) {
          for (const rule of eventDef.rules) {
            // Check if any task in this rule would emit finishEvent
            if (rule.tasks) {
              for (const taskName of Object.keys(rule.tasks)) {
                if (taskName === finishEvent) {
                  foundTriggerRule = true;
                  triggerEvent = rule.trigger;
                  console.log(`[ANALYSIS] Event ${finishEvent} is emitted by rule in ${eventDef.name}`);
                  console.log(`[ANALYSIS]   Trigger: ${triggerEvent}`);
                  break;
                }
              }
            }
          }
        }
      }
    }

    // Try to find reactive conditions that would emit triggerEvent
    const reactiveWatcher = context.reactiveWatcher;
    if (reactiveWatcher && triggerEvent) {
      const conditions = reactiveWatcher.listConditions();

      for (const condition of conditions) {
        // Check if this condition's callback would emit triggerEvent
        if (condition.expression) {
          console.log(`[ANALYSIS] Checking reactive condition: ${condition.expression}`);

          // Get current values for dependencies
          const state = reactiveWatcher.getState();
          const deps = condition.dependencies || [];

          console.log(`[ANALYSIS]   Dependencies: ${deps.join(', ')}`);
          console.log(`[ANALYSIS]   Current values:`);

          for (const dep of deps) {
            const parts = dep.split('.');
            let value = state;
            let found = true;

            for (const part of parts) {
              if (value && typeof value === 'object') {
                // Check envPorts first
                if (value.envPorts && value.envPorts[part]) {
                  const port = value.envPorts[part];
                  value = port.getValue ? port.getValue() : port.value;
                } else if (part in value) {
                  value = value[part];
                } else if (value.properties && part in value.properties) {
                  value = value.properties[part];
                } else {
                  found = false;
                  break;
                }
              } else {
                found = false;
                break;
              }
            }

            if (found) {
              console.log(`[ANALYSIS]     ${dep} = ${JSON.stringify(value)}`);
            } else {
              console.log(`[ANALYSIS]     ${dep} = (not found)`);
            }
          }

          console.log(`[ANALYSIS]   Expression: ${condition.expression}`);
          console.log(`[ANALYSIS]   Last evaluated: ${condition.lastResult}`);
          console.log(`[ANALYSIS]   Triggered count: ${condition.triggeredCount || 0}`);
        }
      }
    } else if (!foundTriggerRule) {
      console.log(`[ANALYSIS] Could not find rule that emits ${finishEvent}`);
      console.log(`[ANALYSIS] Check EventsDefinitions for missing ON/THEN mapping`);
    }

    // Provide suggestion
    console.log(`\n[SUGGESTION] To fix this timeout:`);
    console.log(`  1. Check if there's an 'inject' statement for the required state change`);
    console.log(`  2. Verify the reactive condition expression matches the actual state`);
    console.log(`  3. Ensure the event chain from inject -> condition -> event is complete`);
    console.log(`${'='.repeat(60)}\n`);

    // Log to streaming logger if available
    if (streamingLogger && typeof streamingLogger.logTimeoutAnalysis === 'function') {
      streamingLogger.logTimeoutAnalysis(finishEvent, {
        sceneName: scene.name,
        triggerEvent: triggerEvent,
        suggestion: 'Check inject statements and reactive condition expressions'
      });
    }
  }
}

module.exports = { SceneExecutor };
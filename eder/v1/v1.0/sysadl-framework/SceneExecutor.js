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
  async executeScene(sceneName, context = {}) {
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
        retryCount: 0,
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
        return this.executeScene(sceneName, context);
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
    
    if (!scene.preConditions || scene.preConditions.length === 0) {
      return; // No pre-conditions to validate
    }

    console.log(`🔍 Validating pre-conditions for: ${scene.name}`);

    for (const condition of scene.preConditions) {
      try {
        const result = await this.evaluateCondition(condition, context);
        
        if (!result) {
          throw new Error(`Pre-condition failed: ${condition.expression || condition}`);
        }

        if (this.config.debugMode) {
          console.log(`  ✅ Pre-condition passed: ${condition.expression || condition}`);
        }

      } catch (error) {
        throw new Error(`Pre-condition validation failed: ${error.message}`);
      }
    }

    console.log(`✅ All pre-conditions validated for: ${scene.name}`);
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
        
        reject(new Error(`Scene timeout: finish event '${scene.finishEvent}' not received within ${scene.timeout}ms`));
      }, scene.timeout);
    });
  }

  /**
   * Validate scene post-conditions
   */
  async validatePostConditions(execution) {
    const { scene, context } = execution;
    
    if (!scene.postConditions || scene.postConditions.length === 0) {
      return; // No post-conditions to validate
    }

    console.log(`🔍 Validating post-conditions for: ${scene.name}`);

    for (const condition of scene.postConditions) {
      try {
        const result = await this.evaluateCondition(condition, context);
        
        if (!result) {
          throw new Error(`Post-condition failed: ${condition.expression || condition}`);
        }

        if (this.config.debugMode) {
          console.log(`  ✅ Post-condition passed: ${condition.expression || condition}`);
        }

      } catch (error) {
        throw new Error(`Post-condition validation failed: ${error.message}`);
      }
    }

    console.log(`✅ All post-conditions validated for: ${scene.name}`);
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
}

module.exports = { SceneExecutor };
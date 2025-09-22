/**
 * Execution Controller for SysADL
 * 
 * Master controller for complete ScenarioExecution orchestration
 * Integrates all Phase 6 capabilities including simulation controls,
 * multi-scenario orchestration, and reactive system integration
 * 
 * Key Features:
 * - ScenarioExecution orchestration (sequential, parallel, conditional)
 * - Simulation controls (play, pause, step, speed control)
 * - Multi-scenario dependency management
 * - Real-time execution monitoring and visualization
 * - Complete reactive system integration
 * - Event-driven execution flow
 * - Resource management and optimization
 * - Execution state persistence and recovery
 * - Performance analytics and reporting
 * - Integration with all SysADL framework components
 */

const { ScenarioExecutor } = require('./ScenarioExecutor');
const { ReactiveStateManager } = require('./ReactiveStateManager');
const { ReactiveConditionWatcher } = require('./ReactiveConditionWatcher');

class ExecutionController {
  constructor(sysadlBase, options = {}) {
    this.sysadlBase = sysadlBase;
    
    // Configuration
    this.config = {
      enableParallelExecution: options.enableParallelExecution !== false,
      maxConcurrentScenarios: options.maxConcurrentScenarios || 10,
      defaultExecutionMode: options.defaultExecutionMode || 'sequential',
      enableSimulationControls: options.enableSimulationControls !== false,
      defaultSimulationSpeed: options.defaultSimulationSpeed || 1.0,
      enableVisualization: options.enableVisualization !== false,
      enablePersistence: options.enablePersistence !== false,
      enableAnalytics: options.enableAnalytics !== false,
      debugMode: options.debugMode || false
    };

    // Core components integration
    this.stateManager = options.stateManager || new ReactiveStateManager();
    this.conditionWatcher = options.conditionWatcher || new ReactiveConditionWatcher(sysadlBase, {
      stateManager: this.stateManager,
      debugMode: this.config.debugMode
    });
    this.scenarioExecutor = options.scenarioExecutor || new ScenarioExecutor(sysadlBase, {
      stateManager: this.stateManager,
      conditionWatcher: this.conditionWatcher,
      enableReactiveIntegration: true,
      debugMode: this.config.debugMode
    });

    // Execution management
    this.activeExecutions = new Map(); // executionId -> execution context
    this.executionQueue = [];
    this.completedExecutions = [];
    this.failedExecutions = [];
    
    // Simulation controls
    this.simulationState = {
      status: 'stopped', // stopped, running, paused, stepping
      speed: this.config.defaultSimulationSpeed,
      currentStep: 0,
      totalSteps: 0,
      startTime: null,
      pausedTime: null,
      elapsedTime: 0
    };

    // Dependency management
    this.dependencyGraph = new Map(); // scenarioId -> dependencies
    this.executionOrder = [];
    
    // Performance tracking
    this.analytics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      parallelExecutions: 0,
      maxConcurrency: 0,
      resourceUtilization: {},
      performanceMetrics: []
    };

    // Event system integration
    this.eventSubscriptions = new Map();
    this.setupEventIntegration();

    // Visualization data
    this.visualizationData = {
      executionTimeline: [],
      dependencyGraph: {},
      currentState: {},
      performanceData: []
    };

    console.log('ExecutionController initialized - master orchestration ready');
    
    if (this.config.debugMode) {
      this.setupDebugMonitoring();
    }
  }

  /**
   * Execute a complete ScenarioExecution with full orchestration
   */
  async executeScenarioExecution(scenarioExecution, options = {}) {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();

    try {
      // Create execution context
      const executionContext = this.createExecutionContext(executionId, scenarioExecution, options);
      
      // Register execution
      this.activeExecutions.set(executionId, executionContext);
      this.analytics.totalExecutions++;

      console.log(`🎬 Starting ScenarioExecution: ${scenarioExecution.name} (${executionId})`);

      // Log execution start
      if (this.sysadlBase.logger) {
        this.sysadlBase.logger.logExecution({
          type: 'scenario_execution_orchestration_start',
          name: scenarioExecution.name,
          path: `ExecutionController.${scenarioExecution.name}`,
          executionId: executionId,
          initialState: this.getExecutionState(executionId),
          metadata: {
            executionMode: executionContext.executionMode,
            totalScenarios: executionContext.scenarios.length,
            simulationSpeed: this.simulationState.speed,
            parallelEnabled: this.config.enableParallelExecution
          }
        });
      }

      // Build dependency graph
      await this.buildDependencyGraph(executionContext);
      
      // Calculate execution order
      this.calculateExecutionOrder(executionContext);
      
      // Update simulation state
      this.simulationState.status = 'running';
      this.simulationState.startTime = startTime;
      this.simulationState.totalSteps = executionContext.scenarios.length;
      this.simulationState.currentStep = 0;

      // Execute scenarios based on mode
      let result;
      switch (executionContext.executionMode) {
        case 'sequential':
          result = await this.executeSequential(executionContext);
          break;
        case 'parallel':
          result = await this.executeParallel(executionContext);
          break;
        case 'conditional':
          result = await this.executeConditional(executionContext);
          break;
        case 'dependency':
          result = await this.executeDependencyBased(executionContext);
          break;
        default:
          throw new Error(`Unknown execution mode: ${executionContext.executionMode}`);
      }

      // Calculate execution time
      const duration = Date.now() - startTime;
      this.updateAnalytics(duration, true);

      // Update simulation state
      this.simulationState.status = 'completed';
      this.simulationState.elapsedTime = duration;

      // Mark as completed
      executionContext.status = 'completed';
      executionContext.result = result;
      executionContext.duration = duration;
      this.completedExecutions.push(executionContext);

      console.log(`✅ ScenarioExecution completed: ${scenarioExecution.name} (${duration}ms)`);

      // Log execution completion
      if (this.sysadlBase.logger) {
        this.sysadlBase.logger.logExecution({
          type: 'scenario_execution_orchestration_complete',
          name: scenarioExecution.name,
          path: `ExecutionController.${scenarioExecution.name}`,
          executionId: executionId,
          finalState: this.getExecutionState(executionId),
          result: 'success',
          executionDuration: duration,
          metadata: {
            scenariosExecuted: result.completedScenarios || 0,
            parallelExecutions: this.analytics.parallelExecutions,
            maxConcurrency: this.analytics.maxConcurrency
          }
        });
      }

      return {
        success: true,
        executionId: executionId,
        result: result,
        duration: duration,
        analytics: this.getExecutionAnalytics(executionId),
        visualizationData: this.getVisualizationData(executionId)
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateAnalytics(duration, false);

      // Update simulation state
      this.simulationState.status = 'error';
      this.simulationState.elapsedTime = duration;

      console.error(`❌ ScenarioExecution failed: ${scenarioExecution.name} - ${error.message}`);

      // Log execution failure
      if (this.sysadlBase.logger) {
        this.sysadlBase.logger.logExecution({
          type: 'scenario_execution_orchestration_error',
          name: scenarioExecution.name,
          path: `ExecutionController.${scenarioExecution.name}`,
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
   * Execute scenarios sequentially
   */
  async executeSequential(executionContext) {
    const results = [];
    let completedScenarios = 0;

    console.log(`📋 Sequential execution: ${executionContext.scenarios.length} scenarios`);

    for (let i = 0; i < executionContext.scenarios.length; i++) {
      const scenario = executionContext.scenarios[i];
      
      // Check simulation controls
      await this.checkSimulationControls();
      
      // Update step
      this.simulationState.currentStep = i + 1;
      
      try {
        console.log(`🎯 Executing scenario ${i + 1}/${executionContext.scenarios.length}: ${scenario.name}`);
        
        const result = await this.scenarioExecutor.executeScenario(scenario, {
          executionId: executionContext.executionId,
          parentContext: executionContext
        });
        
        results.push(result);
        completedScenarios++;
        
        // Update visualization data
        this.updateVisualizationData(executionContext.executionId, {
          type: 'scenario_completed',
          scenarioIndex: i,
          scenarioName: scenario.name,
          result: result,
          timestamp: Date.now()
        });
        
      } catch (error) {
        console.error(`❌ Scenario ${i + 1} failed: ${error.message}`);
        results.push({ success: false, error: error.message });
        
        // Update visualization data
        this.updateVisualizationData(executionContext.executionId, {
          type: 'scenario_failed',
          scenarioIndex: i,
          scenarioName: scenario.name,
          error: error.message,
          timestamp: Date.now()
        });
        
        // Check if we should continue on error
        if (!executionContext.continueOnError) {
          throw error;
        }
      }
    }

    return {
      type: 'sequential',
      completedScenarios: completedScenarios,
      totalScenarios: executionContext.scenarios.length,
      results: results
    };
  }

  /**
   * Execute scenarios in parallel
   */
  async executeParallel(executionContext) {
    const maxConcurrency = Math.min(
      executionContext.scenarios.length,
      this.config.maxConcurrentScenarios
    );

    console.log(`🚀 Parallel execution: ${executionContext.scenarios.length} scenarios (max ${maxConcurrency} concurrent)`);

    // Create chunks for parallel execution
    const chunks = this.createExecutionChunks(executionContext.scenarios, maxConcurrency);
    const allResults = [];
    let completedScenarios = 0;

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      
      // Check simulation controls
      await this.checkSimulationControls();
      
      console.log(`📦 Executing chunk ${chunkIndex + 1}/${chunks.length}: ${chunk.length} scenarios`);
      
      // Execute chunk in parallel
      const chunkPromises = chunk.map(async (scenario, index) => {
        try {
          const scenarioIndex = chunkIndex * maxConcurrency + index;
          this.simulationState.currentStep = scenarioIndex + 1;
          
          console.log(`🎯 Parallel scenario ${scenarioIndex + 1}: ${scenario.name}`);
          
          const result = await this.scenarioExecutor.executeScenario(scenario, {
            executionId: executionContext.executionId,
            parentContext: executionContext,
            parallelIndex: scenarioIndex
          });
          
          completedScenarios++;
          
          // Update visualization data
          this.updateVisualizationData(executionContext.executionId, {
            type: 'scenario_completed',
            scenarioIndex: scenarioIndex,
            scenarioName: scenario.name,
            result: result,
            timestamp: Date.now(),
            parallel: true
          });
          
          return result;
          
        } catch (error) {
          console.error(`❌ Parallel scenario failed: ${scenario.name} - ${error.message}`);
          
          // Update visualization data
          this.updateVisualizationData(executionContext.executionId, {
            type: 'scenario_failed',
            scenarioIndex: chunkIndex * maxConcurrency + index,
            scenarioName: scenario.name,
            error: error.message,
            timestamp: Date.now(),
            parallel: true
          });
          
          return { success: false, error: error.message, scenarioName: scenario.name };
        }
      });

      // Wait for chunk completion
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      // Process chunk results
      for (const promiseResult of chunkResults) {
        if (promiseResult.status === 'fulfilled') {
          allResults.push(promiseResult.value);
        } else {
          allResults.push({ success: false, error: promiseResult.reason.message });
        }
      }
      
      // Update analytics
      this.analytics.parallelExecutions++;
      this.analytics.maxConcurrency = Math.max(this.analytics.maxConcurrency, chunk.length);
    }

    return {
      type: 'parallel',
      completedScenarios: completedScenarios,
      totalScenarios: executionContext.scenarios.length,
      maxConcurrency: maxConcurrency,
      results: allResults
    };
  }

  /**
   * Execute scenarios with conditional logic
   */
  async executeConditional(executionContext) {
    const results = [];
    let completedScenarios = 0;

    console.log(`🤔 Conditional execution: ${executionContext.scenarios.length} scenarios`);

    for (let i = 0; i < executionContext.scenarios.length; i++) {
      const scenario = executionContext.scenarios[i];
      
      // Check simulation controls
      await this.checkSimulationControls();
      
      // Evaluate pre-conditions
      let shouldExecute = true;
      if (scenario.preConditions && scenario.preConditions.length > 0) {
        for (const condition of scenario.preConditions) {
          const conditionResult = await this.evaluateCondition(condition, executionContext);
          if (!conditionResult) {
            shouldExecute = false;
            console.log(`⏭️ Skipping scenario ${scenario.name}: pre-condition failed`);
            break;
          }
        }
      }

      if (shouldExecute) {
        try {
          this.simulationState.currentStep = i + 1;
          
          console.log(`🎯 Conditional scenario ${i + 1}: ${scenario.name}`);
          
          const result = await this.scenarioExecutor.executeScenario(scenario, {
            executionId: executionContext.executionId,
            parentContext: executionContext
          });
          
          results.push(result);
          completedScenarios++;
          
          // Update visualization data
          this.updateVisualizationData(executionContext.executionId, {
            type: 'scenario_completed',
            scenarioIndex: i,
            scenarioName: scenario.name,
            result: result,
            timestamp: Date.now(),
            conditional: true
          });
          
        } catch (error) {
          console.error(`❌ Conditional scenario failed: ${scenario.name} - ${error.message}`);
          results.push({ success: false, error: error.message });
          
          if (!executionContext.continueOnError) {
            throw error;
          }
        }
      } else {
        results.push({ success: true, skipped: true, reason: 'pre-condition failed' });
        
        // Update visualization data
        this.updateVisualizationData(executionContext.executionId, {
          type: 'scenario_skipped',
          scenarioIndex: i,
          scenarioName: scenario.name,
          reason: 'pre-condition failed',
          timestamp: Date.now()
        });
      }
    }

    return {
      type: 'conditional',
      completedScenarios: completedScenarios,
      totalScenarios: executionContext.scenarios.length,
      results: results
    };
  }

  /**
   * Execute scenarios based on dependency graph
   */
  async executeDependencyBased(executionContext) {
    console.log(`🕸️ Dependency-based execution: ${executionContext.scenarios.length} scenarios`);

    const results = [];
    const completed = new Set();
    const inProgress = new Set();
    let completedScenarios = 0;

    // Execute scenarios according to dependency order
    while (completed.size < executionContext.scenarios.length) {
      // Check simulation controls
      await this.checkSimulationControls();
      
      // Find scenarios that can be executed (all dependencies completed)
      const readyScenarios = executionContext.scenarios.filter(scenario => {
        if (completed.has(scenario.name) || inProgress.has(scenario.name)) {
          return false;
        }
        
        const dependencies = this.dependencyGraph.get(scenario.name) || [];
        return dependencies.every(dep => completed.has(dep));
      });

      if (readyScenarios.length === 0) {
        // Check for circular dependencies or deadlock
        const remaining = executionContext.scenarios.filter(s => !completed.has(s.name));
        if (remaining.length > 0) {
          throw new Error(`Dependency deadlock detected. Remaining scenarios: ${remaining.map(s => s.name).join(', ')}`);
        }
        break;
      }

      // Execute ready scenarios (potentially in parallel)
      const executionPromises = readyScenarios.map(async (scenario) => {
        inProgress.add(scenario.name);
        
        try {
          console.log(`🎯 Dependency scenario: ${scenario.name}`);
          
          const result = await this.scenarioExecutor.executeScenario(scenario, {
            executionId: executionContext.executionId,
            parentContext: executionContext
          });
          
          completed.add(scenario.name);
          inProgress.delete(scenario.name);
          completedScenarios++;
          
          // Update visualization data
          this.updateVisualizationData(executionContext.executionId, {
            type: 'scenario_completed',
            scenarioName: scenario.name,
            result: result,
            timestamp: Date.now(),
            dependencyBased: true
          });
          
          return { scenario: scenario.name, result: result };
          
        } catch (error) {
          inProgress.delete(scenario.name);
          console.error(`❌ Dependency scenario failed: ${scenario.name} - ${error.message}`);
          
          if (!executionContext.continueOnError) {
            throw error;
          }
          
          return { scenario: scenario.name, result: { success: false, error: error.message } };
        }
      });

      // Wait for current batch to complete
      const batchResults = await Promise.allSettled(executionPromises);
      results.push(...batchResults.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason.message }));
      
      this.simulationState.currentStep = completed.size;
    }

    return {
      type: 'dependency',
      completedScenarios: completedScenarios,
      totalScenarios: executionContext.scenarios.length,
      results: results
    };
  }

  /**
   * Simulation control methods
   */
  
  // Play/Resume simulation
  play() {
    if (this.simulationState.status === 'paused') {
      this.simulationState.status = 'running';
      this.simulationState.pausedTime = null;
      console.log('▶️ Simulation resumed');
    } else if (this.simulationState.status === 'stopped') {
      this.simulationState.status = 'running';
      this.simulationState.startTime = Date.now();
      console.log('▶️ Simulation started');
    }
    
    this.notifySimulationStateChange();
  }

  // Pause simulation
  pause() {
    if (this.simulationState.status === 'running') {
      this.simulationState.status = 'paused';
      this.simulationState.pausedTime = Date.now();
      console.log('⏸️ Simulation paused');
      this.notifySimulationStateChange();
    }
  }

  // Stop simulation
  stop() {
    this.simulationState.status = 'stopped';
    this.simulationState.currentStep = 0;
    this.simulationState.startTime = null;
    this.simulationState.pausedTime = null;
    this.simulationState.elapsedTime = 0;
    console.log('⏹️ Simulation stopped');
    this.notifySimulationStateChange();
  }

  // Step through simulation
  step() {
    if (this.simulationState.status === 'paused' || this.simulationState.status === 'stopped') {
      this.simulationState.status = 'stepping';
      console.log('👣 Simulation step');
      this.notifySimulationStateChange();
    }
  }

  // Set simulation speed
  setSpeed(speed) {
    this.simulationState.speed = Math.max(0.1, Math.min(10.0, speed));
    console.log(`⚡ Simulation speed: ${this.simulationState.speed}x`);
    this.notifySimulationStateChange();
  }

  // Get simulation state
  getSimulationState() {
    return {
      ...this.simulationState,
      progress: this.simulationState.totalSteps > 0 ? 
        this.simulationState.currentStep / this.simulationState.totalSteps : 0
    };
  }

  /**
   * Check simulation controls and apply delays/pauses
   */
  async checkSimulationControls() {
    // Handle pause
    while (this.simulationState.status === 'paused') {
      await this.sleep(100); // Check every 100ms
    }
    
    // Handle speed control
    if (this.simulationState.speed < 1.0) {
      const delay = (1.0 - this.simulationState.speed) * 1000;
      await this.sleep(delay);
    }
    
    // Handle stepping
    if (this.simulationState.status === 'stepping') {
      this.simulationState.status = 'paused';
    }
  }

  /**
   * Helper methods
   */

  createExecutionContext(executionId, scenarioExecution, options) {
    return {
      executionId: executionId,
      scenarioExecution: scenarioExecution,
      scenarios: scenarioExecution.scenarios || [],
      executionMode: options.executionMode || scenarioExecution.executionMode || this.config.defaultExecutionMode,
      continueOnError: options.continueOnError !== false,
      timeout: options.timeout || 300000, // 5 minutes default
      startTime: Date.now(),
      status: 'running',
      result: null,
      duration: null
    };
  }

  buildDependencyGraph(executionContext) {
    // Build dependency graph for scenarios
    for (const scenario of executionContext.scenarios) {
      const dependencies = scenario.dependencies || [];
      this.dependencyGraph.set(scenario.name, dependencies);
    }
  }

  calculateExecutionOrder(executionContext) {
    // Topological sort for dependency-based execution
    const visited = new Set();
    const temp = new Set();
    const order = [];

    const visit = (scenarioName) => {
      if (temp.has(scenarioName)) {
        throw new Error(`Circular dependency detected involving: ${scenarioName}`);
      }
      if (visited.has(scenarioName)) return;

      temp.add(scenarioName);
      const dependencies = this.dependencyGraph.get(scenarioName) || [];
      for (const dep of dependencies) {
        visit(dep);
      }
      temp.delete(scenarioName);
      visited.add(scenarioName);
      order.push(scenarioName);
    };

    for (const scenario of executionContext.scenarios) {
      if (!visited.has(scenario.name)) {
        visit(scenario.name);
      }
    }

    this.executionOrder = order;
  }

  createExecutionChunks(scenarios, chunkSize) {
    const chunks = [];
    for (let i = 0; i < scenarios.length; i += chunkSize) {
      chunks.push(scenarios.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async evaluateCondition(condition, executionContext) {
    // Use ReactiveConditionWatcher for condition evaluation
    return new Promise((resolve) => {
      const conditionId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.conditionWatcher.watchCondition(
        conditionId,
        condition,
        () => {
          this.conditionWatcher.unwatchCondition(conditionId);
          resolve(true);
        },
        { timeout: 1000 }
      );
      
      // Fallback timeout
      setTimeout(() => {
        this.conditionWatcher.unwatchCondition(conditionId);
        resolve(false);
      }, 1100);
    });
  }

  setupEventIntegration() {
    // Subscribe to global events for coordination
    if (this.sysadlBase.eventSystemManager) {
      const emitter = this.sysadlBase.eventSystemManager.getGlobalEmitter();
      
      // Subscribe to scenario completion events
      emitter.on('scenario_completed', (data) => {
        this.handleScenarioCompletion(data);
      });
      
      // Subscribe to system state changes
      emitter.on('system_state_change', (data) => {
        this.handleSystemStateChange(data);
      });
    }
  }

  setupDebugMonitoring() {
    // Set up debug monitoring for reactive system
    this.stateManager.subscribe('*', (newValue, oldValue, path) => {
      if (this.config.debugMode) {
        console.log(`🔄 [ExecutionController] State changed: ${path} = ${JSON.stringify(newValue)}`);
      }
    });
  }

  updateVisualizationData(executionId, data) {
    if (this.config.enableVisualization) {
      this.visualizationData.executionTimeline.push({
        executionId: executionId,
        timestamp: Date.now(),
        ...data
      });
    }
  }

  updateAnalytics(duration, success) {
    if (success) {
      this.analytics.successfulExecutions++;
    } else {
      this.analytics.failedExecutions++;
    }
    
    this.analytics.totalExecutionTime += duration;
    this.analytics.averageExecutionTime = this.analytics.totalExecutionTime / 
      (this.analytics.successfulExecutions + this.analytics.failedExecutions);
  }

  getExecutionState(executionId) {
    const context = this.activeExecutions.get(executionId);
    if (!context) return null;
    
    return {
      executionId: executionId,
      status: context.status,
      startTime: context.startTime,
      elapsedTime: Date.now() - context.startTime,
      simulationState: this.getSimulationState()
    };
  }

  getExecutionAnalytics(executionId) {
    return {
      ...this.analytics,
      simulationState: this.getSimulationState(),
      activeExecutions: this.activeExecutions.size
    };
  }

  getVisualizationData(executionId) {
    return {
      timeline: this.visualizationData.executionTimeline.filter(
        item => item.executionId === executionId
      ),
      dependencyGraph: this.dependencyGraph,
      currentState: this.stateManager.getSnapshot()
    };
  }

  notifySimulationStateChange() {
    // Emit simulation state change event
    if (this.sysadlBase.eventSystemManager) {
      this.sysadlBase.eventSystemManager.getGlobalEmitter().emit('simulation_state_change', {
        state: this.getSimulationState(),
        timestamp: Date.now()
      });
    }
  }

  handleScenarioCompletion(data) {
    // Handle scenario completion notifications
    console.log(`✅ Scenario completion notification: ${data.scenarioName}`);
  }

  handleSystemStateChange(data) {
    // Handle system state changes
    if (this.config.debugMode) {
      console.log(`🔄 System state change: ${JSON.stringify(data)}`);
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  cleanupExecution(executionId) {
    this.activeExecutions.delete(executionId);
    
    // Clean up visualization data (keep last 100 executions)
    if (this.visualizationData.executionTimeline.length > 100) {
      this.visualizationData.executionTimeline = this.visualizationData.executionTimeline.slice(-100);
    }
  }

  generateExecutionId() {
    return `ctrl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get overall statistics
   */
  getStatistics() {
    return {
      executions: this.analytics,
      simulation: this.getSimulationState(),
      active: {
        activeExecutions: this.activeExecutions.size,
        completedExecutions: this.completedExecutions.length,
        failedExecutions: this.failedExecutions.length
      },
      reactive: {
        stateManager: this.stateManager.getStatistics(),
        conditionWatcher: this.conditionWatcher.getStatistics(),
        scenarioExecutor: this.scenarioExecutor.getStatistics()
      }
    };
  }

  /**
   * List active executions
   */
  listActiveExecutions() {
    console.log('\n=== Active Orchestrated Executions ===');
    
    if (this.activeExecutions.size === 0) {
      console.log('No active orchestrated executions');
      return;
    }

    for (const [executionId, context] of this.activeExecutions) {
      const elapsed = Date.now() - context.startTime;
      console.log(`${executionId}: ${context.scenarioExecution.name} (${elapsed}ms)`);
      console.log(`  Status: ${context.status}`);
      console.log(`  Mode: ${context.executionMode}`);
      console.log(`  Scenarios: ${context.scenarios.length}`);
    }
    
    console.log('======================================\n');
  }
}

module.exports = { ExecutionController };
// v0.3 runtime (renamed and adapted from v0.2)
// Generic SysADL runtime without domain-specific configurations
// Browser-safe version

(function() {
  'use strict';

// Event system support - Browser fallback
let EventEmitter;
if (typeof require !== 'undefined') {
  try {
    EventEmitter = require('events');
  } catch (e) {
    // Browser fallback
    EventEmitter = class EventEmitter {
      constructor() {
        this._events = {};
        this._maxListeners = 10;
      }
      
      setMaxListeners(n) {
        this._maxListeners = n;
        return this;
      }
      
      listenerCount(event) {
        return (this._events[event] || []).length;
      }
      
      on(event, listener) {
        if (!this._events[event]) this._events[event] = [];
        this._events[event].push(listener);
        return this;
      }
      
      off(event, listener) {
        if (!this._events[event]) return this;
        const index = this._events[event].indexOf(listener);
        if (index > -1) this._events[event].splice(index, 1);
        return this;
      }
      
      emit(event, ...args) {
        if (!this._events[event]) return false;
        this._events[event].forEach(listener => {
          try {
            listener.apply(this, args);
          } catch (e) {
            console.error('EventEmitter error:', e);
          }
        });
        return this._events[event].length > 0;
      }
    };
  }
} else {
  // Browser fallback EventEmitter
  EventEmitter = class EventEmitter {
    constructor() {
      this._events = {};
      this._maxListeners = 10;
    }
    
    setMaxListeners(n) {
      this._maxListeners = n;
      return this;
    }
    
    listenerCount(event) {
      return (this._events[event] || []).length;
    }
    
    on(event, listener) {
      if (!this._events[event]) this._events[event] = [];
      this._events[event].push(listener);
      return this;
    }
    
    off(event, listener) {
      if (!this._events[event]) return this;
      const index = this._events[event].indexOf(listener);
      if (index > -1) this._events[event].splice(index, 1);
      return this;
    }
    
    emit(event, ...args) {
      if (!this._events[event]) return false;
      this._events[event].forEach(listener => {
        try {
          listener.apply(this, args);
        } catch (e) {
          console.error('EventEmitter error:', e);
        }
      });
      return this._events[event].length > 0;
    }
  };
}

// Conditional imports
let GenericDomainInterface, ExecutionLogger, EventInjector, SceneExecutor;
let ScenarioExecutor, ExecutionController, ReactiveStateManager, ReactiveConditionWatcher;

if (typeof require !== 'undefined') {
  try {
    // Import generic domain interface
    ({ GenericDomainInterface } = require('./GenericDomainInterface'));

    // Import Phase 4 components
    ({ ExecutionLogger } = require('./ExecutionLogger'));
    EventInjector = require('./EventInjector');
    ({ SceneExecutor } = require('./SceneExecutor'));

    // Import Phase 5 & 6 components
    ({ ScenarioExecutor } = require('./ScenarioExecutor'));
    ({ ExecutionController } = require('./ExecutionController'));
    ({ ReactiveStateManager } = require('./ReactiveStateManager'));
    ({ ReactiveConditionWatcher } = require('./ReactiveConditionWatcher'));
  } catch (e) {
    console.warn('Some SysADL components not available in browser environment:', e.message);
  }
} else {
  // Browser stubs for missing components
  GenericDomainInterface = class GenericDomainInterface {
    constructor() {
      console.log('GenericDomainInterface stub for browser');
    }
  };

  ExecutionLogger = class ExecutionLogger extends EventEmitter {
    constructor(modelName, options = {}) {
      super();
      this.modelName = modelName;
      this.sessionId = `${modelName}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      this.options = options;
      this.logLevel = options.logLevel || 'detailed';
      this.entries = [];
    }
    
    log(message, data = null) {
      const entry = {
        timestamp: Date.now(),
        message,
        data,
        logLevel: this.logLevel
      };
      this.entries.push(entry);
      console.log(`[${this.sessionId}] ${message}`, data || '');
      this.emit('log', entry);
    }
    
    warn(message, data = null) {
      this.log(`⚠️ ${message}`, data);
    }
    
    error(message, data = null) {
      this.log(`❌ ${message}`, data);
    }
  };

  EventInjector = class EventInjector extends EventEmitter {
    constructor() {
      super();
      console.log('EventInjector stub for browser');
    }
    
    injectEvent(event, data = {}) {
      console.log('Event injected:', event, data);
      this.emit('eventInjected', { event, data });
      return true;
    }
  };

  SceneExecutor = class SceneExecutor extends EventEmitter {
    constructor() {
      super();
      console.log('SceneExecutor stub for browser');
    }
    
    executeScene(scene, context = {}) {
      console.log('Scene executed:', scene);
      this.emit('sceneExecuted', { scene, context });
      return Promise.resolve({ success: true, scene });
    }
  };

  ScenarioExecutor = class ScenarioExecutor extends EventEmitter {
    constructor() {
      super();
      console.log('ScenarioExecutor stub for browser');
    }
    
    executeScenario(scenario, context = {}) {
      console.log('Scenario executed:', scenario);
      this.emit('scenarioExecuted', { scenario, context });
      return Promise.resolve({ success: true, scenario });
    }
  };

  ExecutionController = class ExecutionController extends EventEmitter {
    constructor() {
      super();
      console.log('ExecutionController stub for browser');
    }
    
    start() {
      console.log('ExecutionController started');
      this.emit('started');
      return Promise.resolve({ success: true });
    }
    
    stop() {
      console.log('ExecutionController stopped');
      this.emit('stopped');
      return Promise.resolve({ success: true });
    }
  };

  ReactiveStateManager = class ReactiveStateManager extends EventEmitter {
    constructor() {
      super();
      this.state = {};
      console.log('ReactiveStateManager stub for browser');
    }
    
    setState(key, value) {
      this.state[key] = value;
      console.log('State set:', key, value);
      this.emit('stateChanged', { key, value });
    }
    
    getState(key) {
      return this.state[key];
    }
  };

  ReactiveConditionWatcher = class ReactiveConditionWatcher extends EventEmitter {
    constructor() {
      super();
      this.conditions = [];
      console.log('ReactiveConditionWatcher stub for browser');
    }
    
    addCondition(condition, callback) {
      this.conditions.push({ condition, callback });
      console.log('Condition added:', condition);
      this.emit('conditionAdded', { condition });
    }
    
    evaluateConditions() {
      console.log('Evaluating conditions...');
      this.emit('conditionsEvaluated');
      return true;
    }
  };
}

// Global Event System Manager
class EventSystemManager {
  constructor() {
    this.globalEmitter = new EventEmitter();
    this.globalEmitter.setMaxListeners(0); // Unlimited listeners
  }

  getGlobalEmitter() {
    return this.globalEmitter;
  }

  // Create a new isolated event system
  createEventSystem() {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(0);
    return emitter;
  }

  // Setup event auto-stop when no listeners
  setupAutoStop(emitter) {
    const originalEmit = emitter.emit;
    emitter.emit = function(event, ...args) {
      const hasListeners = this.listenerCount(event) > 0;
      if (!hasListeners && event !== 'newListener' && event !== 'removeListener') {
        console.log(`[EventSystem] No listeners for event '${event}' - auto-stopping`);
        return false;
      }
      return originalEmit.call(this, event, ...args);
    };
    return emitter;
  }
}

// Singleton instance
const eventSystemManager = new EventSystemManager();

class Element {
  constructor(name, opts = {}) {
    this.name = name ? name.toString() : '';
    this.sysadlName = name ? name.toString() : '';
    this.props = { ...opts };
    this.model = null;
  }

  // Set model reference
  setModel(model) {
    this.model = model;
  }
}

// Base class for SysADL elements
class SysADLBase extends Element {
  constructor(name, opts = {}) {
    super(name, opts);
    this.components = {};
    this.connectors = {};
    this.ports = {};
  }

  addComponent(comp) {
    if (!comp || !comp.name) return;
    this.components[comp.name] = comp;
  }

  addConnector(conn) {
    if (!conn || !conn.name) return;
    this.connectors[conn.name] = conn;
  }

  addPort(p) {
    if (!p || !p.name) return;
    if (this.ports[p.name]) return this.ports[p.name];
    this.ports[p.name] = p;
    return p;
  }
  
  // Get a port by name
  getPort(portName) {
    return this.ports[portName] || null;
  }
}

class Model extends SysADLBase {
  constructor(name) {
    super(name);
    this._activities = {};
    this._pendingInputs = {};
    this._executionTrace = [];
    this._traceEnabled = false;
    this._executionCounter = 0;
    
    // Generic domain interface - automatically detects and configures domain
    this.domainInterface = null;
    this._domainInitialized = false;
    
    // Phase 4 Components Integration
    this.logger = new ExecutionLogger(name, { 
      enableFileLogging: true,
      enableConsoleLogging: true,
      logLevel: 'detailed'
    });
    
    // Add reference to event system manager BEFORE component initialization
    this.eventSystemManager = eventSystemManager;
    
    this.eventInjector = new EventInjector(this, {
      enableValidation: true,
      enableLogging: true,
      enableQueuing: true
    });
    
    this.sceneExecutor = new SceneExecutor(this, {
      defaultTimeout: 30000,
      enableParallelExecution: true,
      debugMode: false
    });
    
    // Initialize expression evaluator first (needed by other components)
    this.expressionEvaluator = new ExpressionEvaluator();
    
    // Phase 5 & 6 Components Integration
    this.stateManager = new ReactiveStateManager();
    
    this.conditionWatcher = new ReactiveConditionWatcher(this, {
      stateManager: this.stateManager,
      expressionEvaluator: this.expressionEvaluator,
      debugMode: false
    });
    
    this.scenarioExecutor = new ScenarioExecutor(this, {
      stateManager: this.stateManager,
      conditionWatcher: this.conditionWatcher,
      enableReactiveIntegration: true,
      debugMode: false
    });
    
    this.executionController = new ExecutionController(this, {
      stateManager: this.stateManager,
      conditionWatcher: this.conditionWatcher,
      scenarioExecutor: this.scenarioExecutor,
      enableSimulationControls: true,
      enableVisualization: true,
      enableAnalytics: true,
      debugMode: false
    });
    
    console.log(`🎬 Model initialized with Phase 4-6 components: ${name}`);
  }

  /**
   * Initialize domain interface automatically when model is complete
   */
  initializeDomainInterface() {
    if (this._domainInitialized) return;
    
    try {
      console.log('🔍 Auto-detecting domain characteristics...');
      this.domainInterface = new GenericDomainInterface(this);
      this._domainInitialized = true;
      
      const summary = this.domainInterface.getSummary();
      console.log(`✅ Domain initialized: ${summary.domain}`);
      console.log(`📊 Entities: ${summary.entities}, Properties: ${summary.properties}`);
    } catch (error) {
      console.warn('⚠️ Could not initialize domain interface:', error.message);
    }
  }

  /**
   * Get domain-aware state
   */
  getDomainState(entityName, propertyName = null) {
    if (this.domainInterface) {
      return this.domainInterface.getState(entityName, propertyName);
    }
    return null;
  }

  /**
   * Set domain-aware state
   */
  setDomainState(entityName, propertyName, value) {
    if (this.domainInterface) {
      return this.domainInterface.setState(entityName, propertyName, value);
    }
    return false;
  }

  /**
   * Subscribe to domain state changes
   */
  subscribeToDomainStateChange(entityName, propertyName, callback) {
    if (this.domainInterface) {
      return this.domainInterface.subscribeToStateChange(entityName, propertyName, callback);
    }
    return () => {}; // No-op unsubscribe
  }

  /**
   * Get detected domain type
   */
  getDomainType() {
    return this.domainInterface ? this.domainInterface.getDomainType() : 'Generic';
  }

  /**
   * Get domain analysis report
   */
  getDomainAnalysis() {
    return this.domainInterface ? this.domainInterface.getAnalysisReport() : null;
  }

  // Enable/disable execution tracing
  enableTrace() { this._traceEnabled = true; }
  disableTrace() { this._traceEnabled = false; }
  
  // Log structured execution step
  traceExecution(elementType, elementName, operation, input = null, output = null, metadata = {}) {
    if (!this._traceEnabled) return;
    
    const traceEntry = {
      sequence: this._executionCounter++,
      timestamp: Date.now(),
      iso_time: new Date().toISOString(),
      element_type: elementType,
      element_name: elementName,
      operation: operation,
      input: input,
      output: output,
      metadata: metadata
    };
    
    this._executionTrace.push(traceEntry);
    console.log('[TRACE]', JSON.stringify(traceEntry));
    return traceEntry;
  }
  
  // Get execution trace
  getExecutionTrace() { return this._executionTrace.slice(); }
  
  // Clear execution trace
  clearTrace() { 
    this._executionTrace = []; 
    this._executionCounter = 0;
  }

  // ============= PHASE 4 METHODS =============
  
  /**
   * Inject an event into the system
   */
  async injectEvent(eventName, parameters = {}, timestamp = null, options = {}) {
    this.logger.logExecution({
      type: 'event_injection_request',
      name: eventName,
      path: `Model.${this.name}.injectEvent`,
      result: 'started',
      metadata: { parameters, options }
    });

    try {
      const result = await this.eventInjector.injectEvent(eventName, parameters, timestamp, options);
      
      this.logger.logExecution({
        type: 'event_injection_request',
        name: eventName,
        path: `Model.${this.name}.injectEvent`,
        result: 'success',
        duration: result.duration,
        metadata: { eventId: result.eventId }
      });

      return result;
    } catch (error) {
      this.logger.logExecution({
        type: 'event_injection_request',
        name: eventName,
        path: `Model.${this.name}.injectEvent`,
        result: 'failure',
        errors: [error.message]
      });
      throw error;
    }
  }

  /**
   * Register and execute a scene
   */
  async executeScene(sceneName, sceneDefinition, context = {}) {
    // Register scene if definition provided
    if (sceneDefinition) {
      this.sceneExecutor.registerScene(sceneName, sceneDefinition);
    }

    this.logger.logExecution({
      type: 'scene_execution_request',
      name: sceneName,
      path: `Model.${this.name}.executeScene`,
      result: 'started',
      metadata: { context }
    });

    try {
      const result = await this.sceneExecutor.executeScene(sceneName, context);
      
      this.logger.logExecution({
        type: 'scene_execution_request',
        name: sceneName,
        path: `Model.${this.name}.executeScene`,
        result: 'success',
        duration: result.duration,
        metadata: { sceneId: result.sceneId }
      });

      return result;
    } catch (error) {
      this.logger.logExecution({
        type: 'scene_execution_request',
        name: sceneName,
        path: `Model.${this.name}.executeScene`,
        result: 'failure',
        errors: [error.message]
      });
      throw error;
    }
  }

  /**
   * Register a scene definition
   */
  registerScene(sceneName, sceneDefinition) {
    return this.sceneExecutor.registerScene(sceneName, sceneDefinition);
  }

  /**
   * Register an event definition
   */
  registerEvent(eventName, eventDefinition) {
    return this.eventInjector.registerEventDefinition(eventName, eventDefinition);
  }

  /**
   * Get current system state for framework components
   */
  getSystemState() {
    // Prioritize domain interface state if available
    if (this.domainInterface) {
      return this.domainInterface.getCurrentState();
    }
    
    // Fallback to basic model state
    return {
      modelName: this.name,
      activities: Object.keys(this._activities),
      components: Object.keys(this.components),
      connectors: Object.keys(this.connectors),
      ports: Object.keys(this.ports),
      timestamp: Date.now()
    };
  }

  /**
   * Generate comprehensive execution report
   */
  generateExecutionReport() {
    const report = this.logger.generateReport();
    
    // Add scene executor statistics
    report.sceneExecutorStats = this.sceneExecutor.getStatistics();
    
    // Add event injector statistics  
    report.eventInjectorStats = this.eventInjector.getStatistics();
    
    // Add domain information
    if (this.domainInterface) {
      report.domainAnalysis = this.getDomainAnalysis();
    }

    return report;
  }

  /**
   * Save execution report to file
   */
  async saveExecutionReport(filePath = null) {
    return this.logger.saveReport(filePath);
  }

  /**
   * Cleanup all Phase 4 components
   */
  cleanup() {
    console.log(`🧹 Cleaning up model: ${this.name}`);
    
    if (this.logger) {
      this.logger.cleanup();
    }
    
    if (this.eventInjector) {
      this.eventInjector.cleanup();
    }
    
    if (this.sceneExecutor) {
      this.sceneExecutor.stopAllScenes();
    }
    
    console.log(`✅ Model cleanup completed: ${this.name}`);
  }

  // ============= END PHASE 4 METHODS =============

  // ============= PHASE 5-6 METHODS: SCENARIO EXECUTION & ORCHESTRATION =============
  
  /**
   * Execute a scenario with programming structures support
   */
  async executeScenario(scenario, context = {}) {
    this.logger.logExecution({
      type: 'scenario_execution',
      name: scenario.name || 'anonymous',
      path: `Model.${this.name}.executeScenario`,
      result: 'started',
      metadata: { context }
    });

    try {
      const result = await this.scenarioExecutor.executeScenario(scenario, context);
      
      this.logger.logExecution({
        type: 'scenario_execution',
        name: scenario.name || 'anonymous',
        path: `Model.${this.name}.executeScenario`,
        result: 'success',
        duration: result.duration,
        metadata: { 
          variablesUsed: result.variablesUsed,
          statements: result.statements 
        }
      });

      return result;
    } catch (error) {
      this.logger.logExecution({
        type: 'scenario_execution',
        name: scenario.name || 'anonymous',
        path: `Model.${this.name}.executeScenario`,
        result: 'error',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute a ScenarioExecution block with orchestration
   */
  async executeScenarioExecution(scenarioExecution, globalContext = {}) {
    this.logger.logExecution({
      type: 'scenario_execution_orchestration',
      name: scenarioExecution.name || 'anonymous',
      path: `Model.${this.name}.executeScenarioExecution`,
      result: 'started',
      metadata: { globalContext }
    });

    try {
      const result = await this.executionController.executeScenarioExecution(scenarioExecution, globalContext);
      
      this.logger.logExecution({
        type: 'scenario_execution_orchestration',
        name: scenarioExecution.name || 'anonymous',
        path: `Model.${this.name}.executeScenarioExecution`,
        result: 'success',
        duration: result.duration,
        metadata: { 
          executionMode: result.executionMode,
          scenariosExecuted: result.scenariosExecuted,
          statistics: result.statistics
        }
      });

      return result;
    } catch (error) {
      this.logger.logExecution({
        type: 'scenario_execution_orchestration',
        name: scenarioExecution.name || 'anonymous',
        path: `Model.${this.name}.executeScenarioExecution`,
        result: 'error',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Start simulation with scenario execution
   */
  async startSimulation(scenarioExecution, options = {}) {
    try {
      // Start execution and then play
      const result = await this.executeScenarioExecution(scenarioExecution, options);
      this.executionController.play();
      
      this.logger.logExecution({
        type: 'simulation_control',
        name: 'start',
        path: `Model.${this.name}.startSimulation`,
        result: 'success'
      });
      
      return { status: 'simulation_started', ...result };
    } catch (error) {
      this.logger.logExecution({
        type: 'simulation_control',
        name: 'start',
        path: `Model.${this.name}.startSimulation`,
        result: 'error',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Pause running simulation
   */
  async pauseSimulation() {
    try {
      this.executionController.pause();
      
      this.logger.logExecution({
        type: 'simulation_control',
        name: 'pause',
        path: `Model.${this.name}.pauseSimulation`,
        result: 'success'
      });
      
      return { status: 'simulation_paused' };
    } catch (error) {
      this.logger.logExecution({
        type: 'simulation_control',
        name: 'pause',
        path: `Model.${this.name}.pauseSimulation`,
        result: 'error',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Resume paused simulation
   */
  async resumeSimulation() {
    try {
      this.executionController.play();
      
      this.logger.logExecution({
        type: 'simulation_control',
        name: 'resume',
        path: `Model.${this.name}.resumeSimulation`,
        result: 'success'
      });
      
      return { status: 'simulation_resumed' };
    } catch (error) {
      this.logger.logExecution({
        type: 'simulation_control',
        name: 'resume',
        path: `Model.${this.name}.resumeSimulation`,
        result: 'error',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Stop running simulation
   */
  async stopSimulation() {
    try {
      this.executionController.stop();
      
      this.logger.logExecution({
        type: 'simulation_control',
        name: 'stop',
        path: `Model.${this.name}.stopSimulation`,
        result: 'success'
      });
      
      return { status: 'simulation_stopped' };
    } catch (error) {
      this.logger.logExecution({
        type: 'simulation_control',
        name: 'stop',
        path: `Model.${this.name}.stopSimulation`,
        result: 'error',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute a single simulation step
   */
  async stepSimulation() {
    try {
      const result = this.executionController.step();
      
      this.logger.logExecution({
        type: 'simulation_control',
        name: 'step',
        path: `Model.${this.name}.stepSimulation`,
        result: 'success',
        metadata: { stepResult: result }
      });
      
      return result;
    } catch (error) {
      this.logger.logExecution({
        type: 'simulation_control',
        name: 'step',
        path: `Model.${this.name}.stepSimulation`,
        result: 'error',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Set simulation speed
   */
  setSimulationSpeed(speed) {
    try {
      this.executionController.setSpeed(speed);
      
      this.logger.logExecution({
        type: 'simulation_control',
        name: 'set_speed',
        path: `Model.${this.name}.setSimulationSpeed`,
        result: 'success',
        metadata: { speed }
      });
      
      return { status: 'speed_set', speed };
    } catch (error) {
      this.logger.logExecution({
        type: 'simulation_control',
        name: 'set_speed',
        path: `Model.${this.name}.setSimulationSpeed`,
        result: 'error',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get current simulation status
   */
  getSimulationStatus() {
    try {
      const status = this.executionController.getSimulationState();
      
      this.logger.logExecution({
        type: 'simulation_query',
        name: 'get_status',
        path: `Model.${this.name}.getSimulationStatus`,
        result: 'success',
        metadata: { status }
      });
      
      return status;
    } catch (error) {
      this.logger.logExecution({
        type: 'simulation_query',
        name: 'get_status',
        path: `Model.${this.name}.getSimulationStatus`,
        result: 'error',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Subscribe to reactive state changes
   */
  subscribeToState(path, callback) {
    try {
      const subscription = this.stateManager.subscribe(path, callback);
      
      this.logger.logExecution({
        type: 'reactive_subscription',
        name: 'subscribe',
        path: `Model.${this.name}.subscribeToState`,
        result: 'success',
        metadata: { statePath: path }
      });
      
      return subscription;
    } catch (error) {
      this.logger.logExecution({
        type: 'reactive_subscription',
        name: 'subscribe',
        path: `Model.${this.name}.subscribeToState`,
        result: 'error',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Watch condition reactively
   */
  watchCondition(condition, callback) {
    try {
      const watcher = this.conditionWatcher.watchCondition(condition, callback);
      
      this.logger.logExecution({
        type: 'reactive_condition',
        name: 'watch',
        path: `Model.${this.name}.watchCondition`,
        result: 'success',
        metadata: { condition: condition.toString() }
      });
      
      return watcher;
    } catch (error) {
      this.logger.logExecution({
        type: 'reactive_condition',
        name: 'watch',
        path: `Model.${this.name}.watchCondition`,
        result: 'error',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get reactive state proxy
   */
  getReactiveState() {
    try {
      const state = this.stateManager.state;
      
      this.logger.logExecution({
        type: 'reactive_state',
        name: 'get_state',
        path: `Model.${this.name}.getReactiveState`,
        result: 'success'
      });
      
      return state;
    } catch (error) {
      this.logger.logExecution({
        type: 'reactive_state',
        name: 'get_state',
        path: `Model.${this.name}.getReactiveState`,
        result: 'error',
        error: error.message
      });
      throw error;
    }
  }

  // ============= END PHASE 5-6 METHODS =============

  registerActivity(key, activity) {
    if (!key) return;
    this._activities[key] = activity;
    this._pendingInputs[key] = {};
  }
  
  // Walk through all components recursively and apply function
  walkComponents(fn) {
    const visited = new Set();
    const walk = (obj) => {
      if (!obj || typeof obj !== 'object' || visited.has(obj)) return;
      visited.add(obj);
      
      // Check if this object is a component
      if (obj instanceof Component) {
        fn(obj);
      }
      
      // Recursively check components collection
      if (obj.components && typeof obj.components === 'object') {
        Object.values(obj.components).forEach(walk);
      }
    };
    walk(this);
  }
  
  // Walk through all connectors recursively and apply function
  walkConnectors(fn) {
    const visited = new Set();
    const walk = (obj) => {
      if (!obj || typeof obj !== 'object' || visited.has(obj)) return;
      visited.add(obj);
      
      // Check if this object is a connector
      if (obj instanceof Connector) {
        fn(obj);
      }
      
      // Recursively check connectors collection
      if (obj.connectors && typeof obj.connectors === 'object') {
        Object.values(obj.connectors).forEach(walk);
      }
      
      // Recursively check components (they may have connectors)
      if (obj.components && typeof obj.components === 'object') {
        Object.values(obj.components).forEach(walk);
      }
    };
    walk(this);
  }
  
  // Inject model reference into all components and connectors
  injectModelReference() {
    this.walkComponents(comp => comp.setModel(this));
    this.walkConnectors(conn => conn.setModel(this));
  }
  
  // Find activity associated with a port owner (component/connector)
  findActivityByPortOwner(owner) {
    let foundActivity = null;
    
    // First, try to find component with this owner name that has activityName
    this.walkComponents(comp => {
      if (comp.name === owner && comp.activityName) {
        foundActivity = this._activities[comp.activityName];
      }
    });
    
    if (foundActivity) return foundActivity;
    
    // Then, try to find connector with this owner name that has activityName  
    this.walkConnectors(conn => {
      if (conn.name === owner && conn.activityName) {
        foundActivity = this._activities[conn.activityName];
      }
    });
    
    if (foundActivity) return foundActivity;
    
    // Fallback: search activities that have this owner in their component property
    for (const activity of Object.values(this._activities)) {
      if (activity.props && activity.props.component === owner) {
        foundActivity = activity;
        break;
      }
    }
    
    return foundActivity;
  }
  
  // Central execution engine: handle port data reception and trigger activity execution
  handlePortReceive(owner, portName, value) {
    try {
      // Trace port reception at component level
      if (this._traceEnabled) {
        this.traceExecution('component_port', `${owner}.${portName}`, 'receive', value, null, {
          component: owner,
          port: portName
        });
      }
      
      // First, notify the component about port reception
      this.notifyComponentPortReceive(owner, portName, value);
      
      // Then, find and trigger activity
      const activity = this.findActivityByPortOwner(owner);
      
      if (!activity) {
        console.warn(`No activity found for port owner: ${owner}`);
        return;
      }

      // Trace activity lookup
      if (this._traceEnabled) {
        this.traceExecution('activity_lookup', activity.name, 'found_for_component', value, null, {
          component: owner,
          trigger_port: portName
        });
      }
      
      // Trigger the activity with port data
      if (typeof activity.trigger === 'function') {
        activity.trigger(portName, value);
      } else {
        console.warn(`Activity ${activity.name} does not have trigger method`);
      }
      
    } catch (error) {
      console.error(`Error in handlePortReceive for ${owner}.${portName}:`, error);
    }
  }
  
  // Notify component about port data reception
  notifyComponentPortReceive(owner, portName, value) {
    // Find the component by owner name
    let targetComponent = null;
    
    this.walkComponents(comp => {
      if (comp.name === owner) {
        targetComponent = comp;
      }
    });
    
    // If component found and has onPortReceive method, call it
    if (targetComponent && typeof targetComponent.onPortReceive === 'function') {
      targetComponent.onPortReceive(portName, value);
    }
  }

  // === SCENARIO EXECUTION SUPPORT ===

  // Initialize scenario execution capabilities
  initializeScenarioExecution() {
    this.scenarioExecutions = {};
    this.environments = {};
    this.activeScenarioExecution = null;
    this._scenarioExecutionMode = false;
  }

  // Register scenario execution
  registerScenarioExecution(execution) {
    if (!this.scenarioExecutions) this.initializeScenarioExecution();
    
    if (execution instanceof ScenarioExecution) {
      this.scenarioExecutions[execution.name] = execution;
      execution.setModel(this);
      
      this.logEvent({
        elementType: 'scenario_execution_registered',
        execution: execution.name,
        when: Date.now()
      });
    }
  }

  // Start scenario execution mode
  startScenarioExecution(executionName) {
    if (!this.scenarioExecutions) this.initializeScenarioExecution();
    
    const execution = this.scenarioExecutions[executionName];
    if (!execution) {
      throw new Error(`ScenarioExecution '${executionName}' not found`);
    }

    this.activeScenarioExecution = execution;
    this._scenarioExecutionMode = true;

    this.logEvent({
      elementType: 'scenario_execution_started',
      execution: executionName,
      when: Date.now()
    });

    return execution.start();
  }

  // Stop scenario execution mode
  stopScenarioExecution() {
    if (this.activeScenarioExecution) {
      const executionName = this.activeScenarioExecution.name;
      this.activeScenarioExecution.stop();
      this.activeScenarioExecution = null;
      this._scenarioExecutionMode = false;

      this.logEvent({
        elementType: 'scenario_execution_stopped',
        execution: executionName,
        when: Date.now()
      });
    }
  }

  // Check if running in scenario execution mode
  isScenarioExecutionMode() {
    return this._scenarioExecutionMode;
  }

  // === EVENT LOGGING ===

  // Log structured events for scenario and environment execution
  logEvent(event) {
    if (!this._executionTrace) {
      this._executionTrace = [];
      this._executionCounter = 0;
    }

    const traceEntry = {
      sequence: this._executionCounter++,
      timestamp: Date.now(),
      iso_time: new Date().toISOString(),
      ...event
    };

    this._executionTrace.push(traceEntry);

    // If trace enabled, also log to console
    if (this._traceEnabled) {
      console.log('[EVENT]', JSON.stringify(traceEntry));
    }

    return traceEntry;
  }

  // Get event log
  getEventLog() {
    return this._executionTrace ? this._executionTrace.slice() : [];
  }

  // Clear event log
  clearEventLog() {
    this._executionTrace = [];
    this._executionCounter = 0;
  }
}

class Component extends SysADLBase {
  constructor(name, opts = {}) {
    super(name, opts);
    this.activityName = opts.activityName || null; // Apply activityName from options
    this._model = null;
    
    // Pin tracking for component activity execution
    this.pinValues = {}; // {portName: value}
    this.requiredInputPorts = new Set(); // ports that must receive data before activity execution
    this.lastExecutionTime = Date.now(); // Use current timestamp instead of hardcoded 0
  }
  
  setModel(model) {
    this._model = model;
    
    // Initialize required input ports based on component's activity
    this.initializeRequiredPorts();
  }
  
  // Initialize required input ports based on activity pins
  initializeRequiredPorts() {
    if (!this.activityName || !this._model) return;
    
    const activity = this._model._activities[this.activityName];
    if (activity) {
      // Map activity input pins to component ports
      activity.inParameters
        .filter(p => p.direction === 'in')
        .forEach(param => {
          // Assume port name matches pin name by default
          const portName = param.name;
          if (this.ports[portName]) {
            this.requiredInputPorts.add(portName);
            this.pinValues[portName] = undefined;
          }
        });
    }
  }
  
  // Called when a port receives data
  onPortReceive(portName, value) {
    // Store the value for this port
    this.pinValues[portName] = value;
    
    // Check if all required input ports have received data
    if (this.canExecuteActivity()) {
      this.executeActivity();
    }
  }
  
  // Check if all required input ports have data
  canExecuteActivity() {
    if (!this.activityName || !this._model) return false;
    
    for (const portName of this.requiredInputPorts) {
      if (this.pinValues[portName] === undefined) {
        return false;
      }
    }
    return true;
  }
  
  // Execute component activity when all inputs are ready
  executeActivity() {
    if (!this.activityName || !this._model) return;
    
    const activity = this._model._activities[this.activityName];
    if (!activity) return;
    
    console.log(`Component ${this.name} executing activity ${this.activityName}`);
    
    // Trigger activity with all collected pin values
    for (const [portName, value] of Object.entries(this.pinValues)) {
      if (value !== undefined) {
        activity.trigger(portName, value);
      }
    }
    
    // Clear pin values for next execution cycle
    this.clearPinValues();
    
    this.lastExecutionTime = Date.now();
  }
  
  // Clear pin values after activity execution
  clearPinValues() {
    Object.keys(this.pinValues).forEach(portName => {
      this.pinValues[portName] = undefined;
    });
  }
  
  // Lazy loading for activity
  getActivity() {
    if (!this.activityName || !this._model) return null;
    return this._model._activities[this.activityName];
  }
}class Connector extends SysADLBase {
  constructor(name, opts = {}){ 
    super(name, opts); 
    this.participants = [];
    this.activityName = null; // Direct reference to activity name
    this._model = null;
    
    // Generic schemas provided externally (no hardcoded values)
    this.participantSchema = opts.participantSchema || {};
    this.flowSchema = opts.flowSchema || [];
    this.internalConnectors = opts.internalConnectors || [];
    this.internalParticipants = {};
    this.internalConnectorInstances = {};
    
    // Initialize generic structure if schema provided
    if (Object.keys(this.participantSchema).length > 0) {
      // Delay initialization until setModel is called
      this._needsInitialization = true;
    }
  }
  
  setModel(model) {
    this._model = model;
    
    // Store reference to module context for class resolution
    if (model && model._moduleContext) {
      this._moduleContext = model._moduleContext;
    }
    
    // Initialize if needed now that classes are available
    if (this._needsInitialization) {
      this.initializeInternalParticipants();
      this.setupInternalFlows();
      this.setupInternalConnectors();
      this._needsInitialization = false;
    }
    
    // Set model for internal connector instances
    Object.values(this.internalConnectorInstances).forEach(connector => {
      connector.setModel(model);
    });
  }
  
  // Lazy loading for activity
  getActivity() {
    if (!this.activityName || !this._model) return null;
    return this._model._activities[this.activityName];
  }
  
  addParticipant(p){ this.participants.push(p); }
  
  // GENERIC: Initialize internal participants based on schema
  initializeInternalParticipants() {
    Object.entries(this.participantSchema).forEach(([name, schema]) => {
      console.log(`Initializing participant ${name} with portClass ${schema.portClass}`);
      
      if (schema.portType === 'composite') {
        // Create composite port
        const CompositePortClass = this.resolvePortClass(schema.portClass);
        console.log(`Resolved composite port class:`, CompositePortClass);
        this.internalParticipants[name] = new CompositePortClass(name, { 
          owner: this.name,
          connectorRole: schema.role 
        });
        
        // Initialize sub-ports for composite port
        this.initializeSubPorts(name, schema);
      } else {
        // Simple port (current behavior)
        const PortClass = this.resolvePortClass(schema.portClass);
        console.log(`Resolved simple port class:`, PortClass);
        console.log(`PortClass type:`, typeof PortClass);
        console.log(`PortClass constructor:`, PortClass && PortClass.constructor);
        
        if (!PortClass || typeof PortClass !== 'function') {
          console.error(`Invalid port class for ${name}: ${schema.portClass}`);
          return;
        }
        
        this.internalParticipants[name] = new PortClass(name, { 
          owner: this.name,
          connectorRole: schema.role 
        });
      }
    });
  }
  
  // GENERIC: Initialize sub-ports for composite ports
  initializeSubPorts(participantName, schema) {
    const compositePort = this.internalParticipants[participantName];
    
    if (schema.subPorts) {
      Object.entries(schema.subPorts).forEach(([subPortName, subPortClass]) => {
        const SubPortClass = this.resolvePortClass(subPortClass);
        const subPort = new SubPortClass(subPortName, {
          owner: `${this.name}.${participantName}`,
          parent: compositePort
        });
        
        compositePort.addSubPort(subPortName, subPort);
      });
    }
  }
  
  // GENERIC: Resolve port class dynamically
  resolvePortClass(className) {
    console.log(`Resolving port class: ${className}`);
    console.log(`Module context available:`, !!this._moduleContext);
    console.log(`Module context keys:`, this._moduleContext ? Object.keys(this._moduleContext) : 'none');
    
    // Try different resolution strategies
    const tryEval = () => {
      try {
        // Try to get from module context first
        if (this._moduleContext && this._moduleContext[className]) {
          console.log(`Found in module context:`, this._moduleContext[className]);
          return this._moduleContext[className];
        }
        
        // Try to get from require.cache or global context
        const ModuleName = className;
        if (global[ModuleName]) {
          console.log(`Found in global:`, global[ModuleName]);
          return global[ModuleName];
        }
        
        // Try eval in different contexts
        const result = eval(`(typeof ${ModuleName} !== 'undefined') ? ${ModuleName} : null`);
        console.log(`Found via eval:`, result);
        return result;
      } catch (e) {
        console.warn(`Could not resolve port class: ${className}`, e.message);
        return null;
      }
    };
    
    const result = global[className] || 
           (this._model && this._model.classRegistry && this._model.classRegistry[className]) ||
           tryEval();
           
    console.log(`Final result for ${className}:`, result);
    return result;
  }
  
  // GENERIC: Setup internal flows based on schema
  setupInternalFlows() {
    this.flowSchema.forEach(flow => {
      const fromParticipant = this.internalParticipants[flow.from];
      const toParticipant = this.internalParticipants[flow.to];
      
      if (fromParticipant && toParticipant) {
        fromParticipant.bindTo({
          receive: (value, model) => {
            // Trace connector flow start
            if (model && model._traceEnabled) {
              model.traceExecution('connector_flow', `${this.name}_${flow.from}_to_${flow.to}`, 'flow_start', value, null, {
                connector: this.name,
                from: flow.from,
                to: flow.to,
                data_type: flow.dataType
              });
            }
            
            // Generic validation
            this.validateDataFlow(flow.from, flow.to, value, flow.dataType);
            
            // Generic logging
            this.logInternalFlow(flow.from, flow.to, value, model);
            
            // Execute connector activity if it exists
            let processedValue = value;
            if (this.activityName && model) {
              const activity = model._activities[this.activityName];
              if (activity) {
                console.log(`Connector ${this.name} executing activity ${this.activityName} with value:`, value);
                
                // Trace activity trigger from connector
                if (model._traceEnabled) {
                  model.traceExecution('activity_trigger', activity.name, 'trigger_from_connector', value, null, {
                    connector: this.name,
                    trigger_port: flow.from
                  });
                }
                
                // Trigger activity with the input data
                activity.trigger(flow.from, value);
                
                // If activity executes immediately, get result
                if (activity.canExecute()) {
                  const result = activity.executeWhenReady();
                  if (result !== undefined) {
                    processedValue = result;
                    
                    // Trace activity result to connector
                    if (model._traceEnabled) {
                      model.traceExecution('activity_result', activity.name, 'result_to_connector', value, processedValue, {
                        connector: this.name
                      });
                    }
                  }
                }
              }
            }
            
            // Generic transformation
            const transformedValue = this.applyTransformation(processedValue, flow.transformation);
            
            // Trace transformation if applied
            if (transformedValue !== processedValue && model && model._traceEnabled) {
              model.traceExecution('transformation', `${this.name}_${flow.transformation}`, 'apply', processedValue, transformedValue, {
                flow: `${flow.from}_to_${flow.to}`,
                connector: this.name
              });
            }
            
            toParticipant.send(transformedValue, model);
            
            // Trace connector flow end
            if (model && model._traceEnabled) {
              model.traceExecution('connector_flow', `${this.name}_${flow.from}_to_${flow.to}`, 'flow_end', value, transformedValue, {
                connector: this.name,
                from: flow.from,
                to: flow.to
              });
            }
          }
        });
      }
    });
  }
  
  // GENERIC: Setup internal connectors
  setupInternalConnectors() {
    this.internalConnectors.forEach(connectorDef => {
      // Create instance of sub-connector
      const ConnectorClass = this.resolveConnectorClass(connectorDef.type);
      const connector = new ConnectorClass(connectorDef.name);
      
      // Configure bindings
      connectorDef.bindings.forEach(binding => {
        const fromPort = this.resolveInternalPort(binding.from);
        const toPort = this.resolveInternalPort(binding.to);
        
        if (fromPort && toPort) {
          connector.bind(fromPort, toPort);
        }
      });
      
      this.internalConnectorInstances[connectorDef.name] = connector;
    });
  }
  
  // GENERIC: Resolve internal ports (including sub-ports)
  resolveInternalPort(portPath) {
    const parts = portPath.split('.');
    
    if (parts.length === 2) {
      // Format: "participant.subPort"
      const [participantName, subPortName] = parts;
      const participant = this.internalParticipants[participantName];
      
      if (participant && participant.getSubPort) {
        return participant.getSubPort(subPortName);
      }
    }
    
    return null;
  }
  
  // GENERIC: Resolve connector class
  resolveConnectorClass(className) {
    return global[className] || 
           (this._model && this._model.classRegistry && this._model.classRegistry[className]) ||
           eval(className);
  }
  
  // GENERIC: Bind external ports with validation
  bind(externalFromPort, externalToPort) {
    const participants = Object.keys(this.participantSchema);
    
    if (participants.length === 0) {
      // Fallback to legacy behavior if no schema
      return this.bindLegacy(externalFromPort, externalToPort);
    }
    
    // Generic strategy: first participant = source, second = target
    const fromParticipantName = participants[0];
    const toParticipantName = participants[1];
    
    // Handle composite ports
    if (this.participantSchema[fromParticipantName]?.portType === 'composite') {
      this.bindCompositePort(fromParticipantName, externalFromPort);
    } else {
      this.performBinding(fromParticipantName, externalFromPort, 'source');
    }
    
    if (this.participantSchema[toParticipantName]?.portType === 'composite') {
      this.bindCompositePort(toParticipantName, externalToPort);
    } else {
      this.performBinding(toParticipantName, externalToPort, 'target');
    }
  }
  
  // LEGACY: Maintain compatibility for connectors without schema
  bindLegacy(fromPort, toPort) {
    if (!fromPort || !toPort) return;
    this.participants = this.participants || [];
    
    // Add both ports as participants if not already present
    if (!this.participants.some(p => p === fromPort)) {
      this.participants.push(fromPort);
    }
    if (!this.participants.some(p => p === toPort)) {
      this.participants.push(toPort);
    }
  }
  
  // GENERIC: Perform binding based on direction
  performBinding(participantName, externalPort, bindingDirection) {
    if (!externalPort || !this.internalParticipants[participantName]) return;
    
    // Validate port compatibility
    this.validatePortBinding(participantName, externalPort);
    
    if (bindingDirection === 'source') {
      externalPort.bindTo(this.internalParticipants[participantName]);
    } else {
      this.internalParticipants[participantName].bindTo(externalPort);
    }
  }
  
  // GENERIC: Bind composite ports
  bindCompositePort(participantName, externalCompositePort) {
    const schema = this.participantSchema[participantName];
    const internalCompositePort = this.internalParticipants[participantName];
    
    // Validate composite port compatibility
    this.validateCompositePortBinding(participantName, externalCompositePort);
    
    // Bind composite ports
    if (schema.role === 'source' || schema.direction === 'out') {
      externalCompositePort.bindTo(internalCompositePort);
    } else {
      internalCompositePort.bindTo(externalCompositePort);
    }
  }
  
  // GENERIC: Validate port binding
  validatePortBinding(participantName, externalPort) {
    if (!externalPort) return;
    
    const schema = this.participantSchema[participantName];
    if (!schema) {
      throw new Error(`Unknown participant: ${participantName} in connector ${this.name}`);
    }
    
    const validations = [
      {
        condition: () => externalPort.constructor.name === schema.portClass,
        message: `Expected ${schema.portClass}, got ${externalPort.constructor.name}`
      },
      {
        condition: () => externalPort.direction === schema.direction,
        message: `Expected direction '${schema.direction}', got '${externalPort.direction}'`
      },
      {
        condition: () => this.validateDataType(externalPort.expectedType, schema.dataType),
        message: `Expected data type '${schema.dataType}', got '${externalPort.expectedType}'`
      }
    ];
    
    validations.forEach(validation => {
      if (!validation.condition()) {
        throw new TypeError(`${this.name}.${participantName}: ${validation.message}`);
      }
    });
  }
  
  // GENERIC: Validate composite port binding
  validateCompositePortBinding(participantName, externalPort) {
    const schema = this.participantSchema[participantName];
    
    if (!externalPort.isComposite) {
      throw new TypeError(
        `Connector ${this.name}: Expected composite port for ${participantName}, ` +
        `but got simple port`
      );
    }
    
    // Verify sub-port compatibility
    if (schema.subPorts) {
      Object.entries(schema.subPorts).forEach(([subPortName, expectedClass]) => {
        const externalSubPort = externalPort.getSubPort(subPortName);
        if (externalSubPort && externalSubPort.constructor.name !== expectedClass) {
          throw new TypeError(
            `Connector ${this.name}: Sub-port ${participantName}.${subPortName} ` +
            `expected ${expectedClass}, got ${externalSubPort.constructor.name}`
          );
        }
      });
    }
  }
  
  // GENERIC: Validate data type (delegated to model)
  validateDataType(actualType, expectedType) {
    const normalizedExpected = this.normalizeTypeName(expectedType);
    return actualType === normalizedExpected || 
           actualType === expectedType;
  }
  
  // GENERIC: Normalize type names using model registry
  normalizeTypeName(sysadlTypeName) {
    // Use model's type registry (injected externally)
    if (this._model && this._model.typeRegistry) {
      return this._model.typeRegistry[sysadlTypeName] || sysadlTypeName;
    }
    return sysadlTypeName;
  }
  
  // GENERIC: Validate data flow (delegated to model)
  validateDataFlow(fromParticipant, toParticipant, value, expectedType) {
    if (!this.isValidDataType(value, expectedType)) {
      throw new TypeError(
        `Connector ${this.name}: Invalid data type in flow from ${fromParticipant} to ${toParticipant}. ` +
        `Expected ${expectedType}, got ${typeof value} (${value})`
      );
    }
  }
  
  // GENERIC: Type validation using model validators
  isValidDataType(value, expectedType) {
    // Use validators from model (injected externally)
    if (this._model && this._model.typeValidators) {
      const validator = this._model.typeValidators[expectedType];
      return validator ? validator(value) : true; // Default: accept any value
    }
    
    // Generic fallback
    return value !== undefined && value !== null;
  }
  
  // GENERIC: Apply transformations using model registry
  applyTransformation(value, transformationName) {
    if (!transformationName) return value;
    
    // Use transformation registry from model (injected externally)
    if (this._model && this._model.transformationRegistry) {
      const transformation = this._model.transformationRegistry[transformationName];
      return transformation ? transformation(value) : value;
    }
    
    return value; // No transformation if not registered
  }
  
  // GENERIC: Log internal flows
  logInternalFlow(from, to, value, model) {
    model?.logEvent({
      elementType: 'connector_flow',
      connector: this.name,
      from: from,
      to: to,
      value: value,
      dataType: typeof value,
      when: Date.now()
    });
  }
}

class Port extends Element {
  constructor(name, direction='in', opts={}){
    super(name, opts);
    this.direction = direction;
    this.last = undefined;
    this.owner = opts.owner || null;
    this.expectedType = opts.expectedType || null; // Type validation
  }

  send(v, model){
    // Trace port data transmission
    if (model && model._traceEnabled) {
      model.traceExecution('port', `${this.owner}.${this.name}`, 'send', v, null, {
        direction: this.direction,
        type: this.expectedType,
        owner: this.owner,
        has_binding: !!this.binding
      });
    }
    
    // Type validation removed
    model && model.logEvent && model.logEvent({ elementType: 'port_send', component: this.owner, name: this.name, inputs: [v], when: Date.now() });
    this.last = v;
    
    // Call connector binding if present
    if (this.binding && typeof this.binding.receive === 'function') {
      // Trace connector invocation
      if (model && model._traceEnabled) {
        model.traceExecution('connector_binding', 'binding', 'invoke', v, null, {
          from_port: `${this.owner}.${this.name}`,
          binding_type: this.binding.constructor.name
        });
      }
      
      this.binding.receive(v, model);
    }
    
    if (model) {
      // notify model of receive to trigger activities on this component
      model.handlePortReceive(this.owner, this.name, v);
    }
  }

  receive(v, model){
    // Trace port data reception
    if (model && model._traceEnabled) {
      model.traceExecution('port', `${this.owner}.${this.name}`, 'receive', v, null, {
        direction: this.direction,
        type: this.expectedType,
        owner: this.owner
      });
    }
    
    // Type validation removed
    model && model.logEvent && model.logEvent({ elementType: 'port_receive', component: this.owner, name: this.name, inputs: [v], when: Date.now() });
    this.last = v;
    if (model) model.handlePortReceive(this.owner, this.name, v);
  }

  bindTo(ref){ this.binding = ref; }
}

// SimplePort: extends Port for simple data ports
class SimplePort extends Port {
  constructor(name, direction='in', opts={}){
    super(name, direction, opts);
  }
}

// CompositePort: a Port that contains named sub-ports. Treated as a Port
// for compatibility. Sub-ports are regular Port instances whose owner is
// the composite port's qualified owner path (e.g. 'compName.compositePort').
class CompositePort extends Port {
  constructor(name, direction='in', opts={}){
    super(name, direction, opts);
    this.subports = {}; // name -> Port
  }
  addSubPort(name, port){
  if (!name || !port) return;
  // if sub-port already exists, keep existing instance (idempotent)
  if (this.subports && this.subports[name]) return this.subports[name];
  // port.owner becomes composite qualified owner
  port.owner = (this.owner ? (this.owner + '.' + this.name) : this.owner) || port.owner;
  this.subports[name] = port;
  return port;
  }
  getSubPort(name){ return this.subports && this.subports[name] ? this.subports[name] : null; }
  // send to composite: policy = broadcast to all subports if no sub-name provided
  send(v, model){
    // Type validation removed
    model && model.logEvent && model.logEvent({ elementType: 'port_send', component: this.owner, name: this.name, inputs: [v], when: Date.now() });
    // forward to subports (broadcast)
    for (const sp of Object.values(this.subports || {})) { try { if (sp && typeof sp.receive === 'function') sp.receive(v, model); } catch(e){} }
    // activities: composite itself may have activities bound to its name
    if (model) model.handlePortReceive(this.owner, this.name, v);
  }
  // receiving on composite behaves similarly
  receive(v, model){
    // Type validation removed
    model && model.logEvent && model.logEvent({ elementType: 'port_receive', component: this.owner, name: this.name, inputs: [v], when: Date.now() });
    for (const sp of Object.values(this.subports || {})) { try { if (sp && typeof sp.receive === 'function') sp.receive(v, model); } catch(e){} }
    if (model) model.handlePortReceive(this.owner, this.name, v);
  }
}

// Base class for behavioral elements with pins as parameters
class BehavioralElement extends Element {
  constructor(name, opts = {}) {
    super(name, opts);
    this.inParameters = opts.inParameters || []; // [{name, type, direction: 'in'}]
    this.outParameters = opts.outParameters || []; // [{name, type, direction: 'out'}]
    this.delegates = opts.delegates || []; // [{from, to}] for pin delegations
  }

  // Validate pin parameters generically
  validateParameters(inputs, outputs) {
    if (inputs && this.inParameters.length > 0) {
      for (let i = 0; i < this.inParameters.length; i++) {
        const param = this.inParameters[i];
        const value = inputs[i];
        if (param.type && !this.validatePinType(value, param.type)) {
          throw new Error(`Invalid type for pin ${param.name}: expected ${param.type}, got ${typeof value}`);
        }
      }
    }
    return true;
  }

  // Generic type validation for pins
  validatePinType(value, expectedType) {
    if (!expectedType) return true; // No validation if no type specified
    
    switch (expectedType.toLowerCase()) {
      case 'real': return typeof value === 'number' && !isNaN(value);
      case 'int': return Number.isInteger(value);
      case 'boolean': return typeof value === 'boolean';
      case 'string': return typeof value === 'string';
      case 'void': return true;
      default: return true; // Allow custom types for now
    }
  }

  // Process pin delegations generically
  processDelegations(inputValues, model) {
    const processedValues = [...inputValues];
    for (const delegation of this.delegates) {
      const fromIndex = this.inParameters.findIndex(p => p.name === delegation.from);
      const toIndex = this.outParameters.findIndex(p => p.name === delegation.to);
      if (fromIndex !== -1 && toIndex !== -1) {
        // Delegate value from input pin to output pin
        processedValues[toIndex] = processedValues[fromIndex];
      }
    }
    return processedValues;
  }
}

// Generic Constraint class
class Constraint extends BehavioralElement {
  constructor(name, opts = {}) {
    super(name, opts);
    this.equation = opts.equation || null; // ALF equation as string
    this.compiledFn = null;
  }

  // Compile ALF equation to JavaScript function
  compile() {
    if (this.equation && !this.compiledFn) {
      const paramNames = this.inParameters.map(p => p.name);
      this.compiledFn = createExecutableFromExpression(this.equation, paramNames);
    }
    return this.compiledFn;
  }

  // Evaluate constraint with given inputs
  evaluate(inputs, model) {
    this.validateParameters(inputs);
    if (!this.compiledFn) this.compile();
    
    if (this.compiledFn) {
      const result = this.compiledFn.apply(null, inputs);
      model && model.logEvent && model.logEvent({
        elementType: 'constraint_evaluate',
        name: this.name,
        inputs,
        result,
        when: Date.now()
      });
      return result;
    }
    return true; // Default to true if no constraint
  }
}

// Generic Executable class
class Executable extends BehavioralElement {
  constructor(name, opts = {}) {
    super(name, opts);
    this.body = opts.body || null; // ALF body as string
    this.compiledFn = null;
  }

  // Compile ALF body to JavaScript function
  compile() {
    if (this.body && !this.compiledFn) {
      const paramNames = this.inParameters.map(p => p.name);
      this.compiledFn = createExecutableFromExpression(this.body, paramNames);
    }
    return this.compiledFn;
  }

  // Execute with given inputs
  execute(inputs, model) {
    this.validateParameters(inputs);
    if (!this.compiledFn) this.compile();
    
    if (this.compiledFn) {
      const processedInputs = this.processDelegations(inputs, model);
      const result = this.compiledFn.apply(null, processedInputs);
      model && model.logEvent && model.logEvent({
        elementType: 'executable_execute',
        name: this.name,
        inputs: processedInputs,
        result,
        when: Date.now()
      });
      return result;
    }
    return undefined;
  }
}

// Enhanced Action class with pins as parameters
class Action extends BehavioralElement {
  constructor(name, opts = {}) {
    super(name, opts);
    this.executableName = opts.executableName || null;
    this.rawBody = opts.rawBody || null;
    this.executableFn = null;
    this.constraints = opts.constraints || []; // Array of Constraint instances
    this.executables = opts.executables || []; // Array of Executable instances
    this.environmentBindings = opts.environmentBindings || []; // Bindings to environment elements
  }

  // Register constraint within this action
  registerConstraint(constraint) {
    if (constraint instanceof Constraint) {
      this.constraints.push(constraint);
    }
  }

  // Register executable within this action
  registerExecutable(executable) {
    if (executable instanceof Executable) {
      this.executables.push(executable);
    }
  }

  // Bind to environment entity property
  bindToEntity(modelProperty, entity, entityProperty) {
    if (!entity || typeof entity.setProperty !== 'function') {
      console.warn(`Cannot bind to entity: invalid entity`);
      return;
    }

    const binding = {
      modelProperty,
      entity,
      entityProperty,
      type: 'bidirectional'
    };

    this.environmentBindings.push(binding);

    // Set up change listener for model property
    if (this.setProperty) {
      const originalSetProperty = this.setProperty.bind(this);
      this.setProperty = function(prop, value) {
        const result = originalSetProperty(prop, value);
        
        // Propagate to bound entity
        if (prop === modelProperty) {
          entity.setProperty(entityProperty, value);
        }
        
        return result;
      };
    }
  }

  // Update model property and propagate to bound entities
  setProperty(propName, value) {
    // Set property on action (if supported)
    if (this.properties) {
      this.properties[propName] = value;
    }

    // Propagate to bound entities
    for (const binding of this.environmentBindings) {
      if (binding.modelProperty === propName) {
        binding.entity.setProperty(binding.entityProperty, value);
      }
    }

    // Log property change
    if (this.model && this.model.logEvent) {
      this.model.logEvent({
        elementType: 'action_property_change',
        action: this.name,
        property: propName,
        value,
        when: Date.now()
      });
    }
  }

  // Register executable within this action
  registerExecutable(executable) {
    if (executable instanceof Executable) {
      this.executables.push(executable);
    }
  }

  invoke(inputs, model) {
    this.validateParameters(inputs);
    
    // Trace action execution start
    if (model && model._traceEnabled) {
      model.traceExecution('action', this.name, 'invoke_start', inputs, null, {
        executable_name: this.executableName,
        constraints_count: this.constraints.length,
        executables_count: this.executables.length
      });
    }
    
    // Process constraints first
    for (const constraint of this.constraints) {
      const constraintResult = constraint.evaluate(inputs, model);
      if (!constraintResult) {
        throw new Error(`Constraint ${constraint.name} failed in action ${this.name}`);
      }
      
      // Trace constraint evaluation
      if (model && model._traceEnabled) {
        model.traceExecution('constraint', constraint.name, 'evaluate', inputs, constraintResult, {
          action: this.name
        });
      }
    }

    // Process executables
    let result;
    for (const executable of this.executables) {
      result = executable.execute(inputs, model);
      
      // Trace executable execution
      if (model && model._traceEnabled) {
        model.traceExecution('executable', executable.name, 'execute', inputs, result, {
          action: this.name
        });
      }
    }

    // Legacy compatibility: fallback to old executable handling
    if (!this.executableFn && this.executableName && model && model.executables[this.executableName]) {
      this.executableFn = model.executables[this.executableName];
    }
    
    if (this.executableFn) {
      result = this.executableFn.apply(null, inputs);
      
      // Trace legacy executable
      if (model && model._traceEnabled) {
        model.traceExecution('executable', this.executableName, 'execute_legacy', inputs, result, {
          action: this.name
        });
      }
    } else if (this.rawBody) {
      const paramNames = this.inParameters.map(p => p.name);
      const fn = createExecutableFromExpression(this.rawBody, paramNames);
      this.executableFn = fn;
      result = fn.apply(null, inputs);
      
      // Trace raw body execution
      if (model && model._traceEnabled) {
        model.traceExecution('executable', `${this.name}_raw`, 'execute_raw', inputs, result, {
          action: this.name,
          raw_body: this.rawBody
        });
      }
    }

    // Trace action execution end
    if (model && model._traceEnabled) {
      model.traceExecution('action', this.name, 'invoke_end', inputs, result, {
        executable_name: this.executableName
      });
    }

    return result;
  }
  
  // Execute action with pin mapping (used by Activity.trigger)
  execute(pinMap) {
    try {
      // Use delegates to map pins to executable parameters
      const executableParams = {};
      
      // If action has delegates, use them to map pins to parameters
      if (this.props && this.props.delegates) {
        for (const delegate of this.props.delegates) {
          if (pinMap.hasOwnProperty(delegate.from)) {
            executableParams[delegate.to] = pinMap[delegate.from];
          }
        }
      } else {
        // If no delegates, use pin names directly as parameter names
        Object.assign(executableParams, pinMap);
      }
      
      // Execute all registered executables with mapped parameters
      let result;
      for (const executable of this.executables) {
        if (typeof executable.execute === 'function') {
          result = executable.execute(executableParams);
        } else if (typeof executable.executableFunction === 'function') {
          result = executable.executableFunction(executableParams);
        }
      }
      
      return result;
      
    } catch (error) {
      console.error(`Error executing action ${this.name}:`, error);
      return null;
    }
  }
}

// Enhanced Activity class with pins as parameters
class Activity extends BehavioralElement {
  constructor(name, component = null, inputPorts = [], delegates = [], opts = {}) {
    // Convert separate parameters to opts format for compatibility
    const fullOpts = {
      ...opts,
      component: component,
      inputPorts: inputPorts ? inputPorts.slice() : [],
      delegates: delegates || []
    };
    
    super(name, fullOpts);
    this.component = fullOpts.component;
    this.componentName = fullOpts.component; // Explicit componentName property
    this.inputPorts = fullOpts.inputPorts;
    this.delegates = fullOpts.delegates;
    this.actions = fullOpts.actions || [];
    
    // Pin system for activity execution
    this.pins = {}; // {pinName: {value, isFilled, portMapping}}
    this.portToPinMapping = {}; // {portName: pinName}
    this.requiredPins = new Set(); // pins that must be filled before execution
    this.isExecuting = false;
    
    // Initialize pins from inParameters
    this.initializePins();
  }
  
  // Initialize pins based on inParameters
  initializePins() {
    this.inParameters.forEach(param => {
      this.pins[param.name] = {
        value: undefined,
        isFilled: false,
        type: param.type,
        direction: param.direction
      };
      
      // For input pins, add to required pins
      if (param.direction === 'in') {
        this.requiredPins.add(param.name);
        // Map port name to pin name (assuming same name by default)
        this.portToPinMapping[param.name] = param.name;
      }
    });
  }
  
  // Set pin value and check if activity can execute
  setPin(pinName, value) {
    if (!this.pins[pinName]) {
      console.warn(`Pin ${pinName} not found in activity ${this.name}`);
      return false;
    }
    
    this.pins[pinName].value = value;
    this.pins[pinName].isFilled = true;
    
    // Trace pin filling
    if (this.model && this.model._traceEnabled) {
      this.model.traceExecution('activity', this.name, 'pin_set', value, null, {
        pin_name: pinName,
        component: this.component,
        pins_filled: Object.keys(this.pins).filter(p => this.pins[p].isFilled).length,
        pins_total: Object.keys(this.pins).length
      });
    }
    
    // Check if all required pins are filled
    if (this.canExecute()) {
      this.executeWhenReady();
    }
    
    return true;
  }
  
  // Check if all required pins are filled
  canExecute() {
    if (this.isExecuting) return false;
    
    for (const pinName of this.requiredPins) {
      if (!this.pins[pinName] || !this.pins[pinName].isFilled) {
        return false;
      }
    }
    return true;
  }
  
  // Execute activity when all pins are ready
  executeWhenReady() {
    if (!this.canExecute()) return;
    
    this.isExecuting = true;
    
    try {
      // Prepare inputs from pins
      const inputs = this.inParameters
        .filter(p => p.direction === 'in')
        .map(p => this.pins[p.name]?.value);

      // Trace activity execution start
      if (this.model && this.model._traceEnabled) {
        this.model.traceExecution('activity', this.name, 'execute_start', inputs, null, {
          component: this.component,
          input_ports: this.inputPorts,
          pin_values: Object.fromEntries(
            Object.entries(this.pins).map(([k, v]) => [k, v.value])
          )
        });
      }
      
      // Execute the activity
      const result = this.invoke(inputs);
      
      // Trace activity execution end
      if (this.model && this.model._traceEnabled) {
        this.model.traceExecution('activity', this.name, 'execute_end', inputs, result, {
          component: this.component,
          actions_count: this.actions.length
        });
      }
      
      // Propagate results to output pins and connected elements
      this.propagateResults(result);
      
      // Clear pins for next execution
      this.clearPins();
      
      return result;
    } finally {
      this.isExecuting = false;
    }
  }
  
  // Propagate activity results to connected elements
  propagateResults(result) {
    // Handle single result or multiple results
    const results = Array.isArray(result) ? result : [result];
    
    // Map results to output parameters
    this.outParameters.forEach((param, index) => {
      if (index < results.length) {
        const value = results[index];
        
        // Send result to connected ports/pins
        this.sendToConnectedElements(param.name, value);
      }
    });
  }
  
  // Send value to elements connected to this activity's output
  sendToConnectedElements(outputName, value) {
    if (!this.connectedElements) return;
    
    this.connectedElements.forEach(connection => {
      if (connection.from === outputName) {
        // Send to connected component port
        if (connection.toComponent) {
          const component = this.getComponent(connection.toComponent);
          if (component) {
            component.handlePortReceive(connection.toPort, value);
          }
        }
        
        // Send to connected connector
        if (connection.toConnector) {
          const connector = this.getConnector(connection.toConnector);
          if (connector) {
            connector.handleDataFlow(connection.toPin, value);
          }
        }
        
        // Send to connected activity pin
        if (connection.toActivity) {
          const activity = this.getActivity(connection.toActivity);
          if (activity) {
            activity.setPin(connection.toPin, value);
          }
        }
      }
    });
  }
  
  // Helper methods to get connected elements - use context resolution
  getComponent(componentName) {
    // Try to get from model context if available
    if (this._model && this._model.getComponent) {
      return this._model.getComponent(componentName);
    }
    // Try to get from parent context
    if (this._context && this._context.getComponent) {
      return this._context.getComponent(componentName);
    }
    console.warn(`Component '${componentName}' not found in activity context`);
    return null;
  }
  
  getConnector(connectorName) {
    // Try to get from model context if available
    if (this._model && this._model.getConnector) {
      return this._model.getConnector(connectorName);
    }
    // Try to get from parent context
    if (this._context && this._context.getConnector) {
      return this._context.getConnector(connectorName);
    }
    console.warn(`Connector '${connectorName}' not found in activity context`);
    return null;
  }
  
  getActivity(activityName) {
    // Try to get from model registry if available
    if (this._model && this._model.getActivity) {
      return this._model.getActivity(activityName);
    }
    // Try to get from parent context
    if (this._context && this._context.getActivity) {
      return this._context.getActivity(activityName);
    }
    console.warn(`Activity '${activityName}' not found in activity context`);
    return null;
  }
  
  // Clear pins after execution
  clearPins() {
    Object.keys(this.pins).forEach(pinName => {
      this.pins[pinName].value = undefined;
      this.pins[pinName].isFilled = false;
    });
  }
  
  // Trigger method called by handlePortReceive
  trigger(portName, value) {
    // Trace activity trigger
    if (this._model && this._model._traceEnabled) {
      this._model.traceExecution('activity', this.name, 'trigger', value, null, {
        trigger_port: portName,
        component: this.componentName,
        pins_filled: Object.keys(this.pins).length,
        pins_total: this.pinDelegations.length
      });
    }
    
    const pinName = this.portToPinMapping[portName] || portName;
    return this.setPin(pinName, value);
  }

  // Register action within this activity
  registerAction(action) {
    if (action instanceof Action) {
      this.actions.push(action);
    }
  }

  addAction(a) {
    if (a instanceof Action) {
      this.actions.push(a);
    } else {
      // Legacy compatibility
      this.actions.push(new Action(a.name, {
        inParameters: a.params ? a.params.map(p => ({name: p, type: null, direction: 'in'})) : [],
        executableName: a.executable,
        rawBody: a.body
      }));
    }
  }

  invoke(inputs, model) {
    this.validateParameters(inputs);
    
    let last;
    for (const action of this.actions) {
      model && model.logEvent && model.logEvent({
        elementType: 'action_invoke',
        activity: this.name,
        action: action.name,
        inputs,
        when: Date.now()
      });
      
      // Map activity inputs to action inputs based on parameters
      const actionInputs = action.inParameters.length > 0 
        ? action.inParameters.map((p, i) => inputs[i])
        : inputs;
      
      last = action.invoke(actionInputs, model);
      
      model && model.logEvent && model.logEvent({
        elementType: 'action_result',
        activity: this.name,
        action: action.name,
        output: last,
        when: Date.now()
      });
    }
    return last;
  }
  
  // Map port name to corresponding pin using delegates
  mapPortToPin(portName) {
    if (!this.props || !this.props.delegates) {
      return portName; // fallback to port name itself
    }
    
    // Look for delegate that maps this port to a pin
    for (const delegate of this.props.delegates) {
      if (delegate.from === portName) {
        return delegate.to;
      }
    }
    
    // If no mapping found, return port name as pin name
    return portName;
  }
  
  // Trigger activity execution from port data reception
  trigger(portName, value) {
    try {
      // Map port name to pin using delegates
      const pinName = this.mapPortToPin(portName);
      
      // Create pin mapping for action execution
      const pinMap = { [pinName]: value };
      
      // Execute all actions in this activity with the pin data
      let lastResult = null;
      for (const action of this.actions) {
        if (typeof action.execute === 'function') {
          lastResult = action.execute(pinMap);
        } else if (typeof action.invoke === 'function') {
          // Fallback to existing invoke method
          lastResult = action.invoke([value]);
        }
      }
      
      return lastResult;
      
    } catch (error) {
      console.error(`Error triggering activity ${this.name} with port ${portName}:`, error);
      return null;
    }
  }
}

function createExecutableFromExpression(exprText, paramNames = []) {
  const raw = String(exprText || '').trim();

  // quick guard: empty body -> noop
  if (!raw) return function() { return undefined; };

  // translate SysADL surface syntax into JS-ish source
  function translateSysadlExpression(src) {
    // Extract body from executable definitions
    let s = String(src || '').replace(/\r\n?/g, '\n');
    
    // If this is an executable definition, extract just the body
    const execMatch = s.match(/executable\s+def\s+\w+\s*\([^)]*\)\s*:\s*out\s+\w+\s*\{([\s\S]*)\}/i);
    if (execMatch) {
      s = execMatch[1].trim();
    }
    
    // normalize and drop noisy DSL lines
    s = s.split('\n').filter(line => {
        const t = line.trim();
        return t && !/^delegate\b/i.test(t) && !/^using\b/i.test(t) &&
               !/^constraint\b/i.test(t) && !/^body\b/i.test(t) &&
               !/^actions\b/i.test(t);
      }).join('\n');

    // basic syntactic translations
    s = s.replace(/->/g, '.');
    s = s.replace(/\band\b/gi, '&&');
    s = s.replace(/\bor\b/gi, '||');
    s = s.replace(/\bnot\b/gi, '!');
    s = s.replace(/\belsif\b/gi, 'else if');

    // prefer ternary for single-expression if-then-else
    s = s.replace(/if\s*\(([^)]+)\)\s*then\s*([^\n;\{]+)\s*else\s*([^\n;\{]+)/gi, (m, cond, a, b) => `(${cond})?(${a}):(${b})`);

    // remove type annotations in declarations: let x:Type -> let x
    s = s.replace(/\b(let|var|const)\s+([A-Za-z_]\w*)\s*:\s*[A-Za-z_][\w<>:]*(\s*=)?/g, (m, kw, id, eq) => kw + ' ' + id + (eq ? eq : ''));

    // remove typed params in parentheses: (a:Type,b:Type) -> (a,b)
    s = s.replace(/\(([^)]*)\)/g, (m, inside) => {
      const parts = inside.split(',').map(p => p.trim()).filter(Boolean).map(p => p.split(':')[0].trim());
      return '(' + parts.join(',') + ')';
    });

    // ':=' handling: process lines and only introduce 'let' on the first declaration of a name
    const lines = s.split('\n');
    const declared = new Set();
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i];
      const m = L.match(/^\s*(?:let\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*:=/);
      if (m) {
        const nm = m[1];
        if (declared.has(nm) || /\blet\b|\bvar\b|\bconst\b/.test(L)) {
          lines[i] = L.replace(/:=/g, '=');
        } else {
          lines[i] = L.replace(/(^\s*)(?:let\s*)?([A-Za-z_$][A-Za-z0-9_$]*)\s*:=/, (mm, pre, name) => `${pre}let ${name} =`);
          declared.add(nm);
        }
      } else {
        const m2 = L.match(/^\s*(?:let|var|const)\s+([A-Za-z_$][A-Za-z0-9_$]*)\b/);
        if (m2) declared.add(m2[1]);
      }
    }
    s = lines.join('\n');

    // boolean literals
    s = s.replace(/\b(True|False)\b/g, (m) => m.toLowerCase());

    // convert NS::LIT tokens to string literal
    s = s.replace(/([A-Za-z_][A-Za-z0-9_.]*::[A-Za-z0-9_]+)/g, (m) => JSON.stringify(m));

    s = s.replace(/post-condition\b/gi, '');
    s = s.replace(/;\s*;+/g, ';');

    return s.trim();
  }

  // split top-level statements by semicolon/newline but respect quotes, template strings and depth
  function splitTopLevelStatements(src) {
    const parts = [];
    let cur = '';
    let inS = null;
    let esc = false;
    let depth = 0;
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (esc) { cur += ch; esc = false; continue; }
      if (ch === '\\') { cur += ch; esc = true; continue; }
      if (inS) {
        cur += ch;
        if (ch === inS) inS = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') { inS = ch; cur += ch; continue; }
      if (ch === '{' || ch === '(' || ch === '[') { depth++; cur += ch; continue; }
      if (ch === '}' || ch === ')' || ch === ']') { depth = Math.max(0, depth-1); cur += ch; continue; }
      if ((ch === ';' || ch === '\n') && depth === 0) {
        const t = cur.trim(); if (t) parts.push(t);
        cur = '';
        continue;
      }
      cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }

  function dedupeLetDeclarations(body) {
    const lines = body.split('\n');
    const declared = new Set();
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^\s*let\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/);
      if (m) {
        const name = m[1];
        if (declared.has(name)) {
          lines[i] = lines[i].replace(/^\s*let\s+/, '');
        } else declared.add(name);
      } else {
        const m2 = lines[i].match(/^\s*(?:var|const)\s+([A-Za-z_$][A-Za-z0-9_$]*)\b/);
        if (m2) declared.add(m2[1]);
      }
    }
    return lines.join('\n');
  }

  const pre = translateSysadlExpression(raw);
  if (process.env.SYSADL_DEBUG) console.log('[SYSADL-IR] pre:', JSON.stringify(pre));

  // try as expression first
  try {
    const exprFn = new Function(...paramNames, `'use strict'; return (${pre});`);
    return function(...args) { try { return exprFn.apply(this, args); } catch (e) { return undefined; } };
  } catch (exprErr) {
    // try as body (multi-statement)
    let body = pre;
    if (process.env.SYSADL_DEBUG) console.log('[SYSADL-IR] initial body:', JSON.stringify(body));
    try {
      if (!/^{[\s\S]*}$/.test(body.trim())) {
        const stmts = splitTopLevelStatements(body);
        if (stmts.length > 0) {
          const lastIdx = stmts.length - 1;
          const last = stmts[lastIdx];
          if (!/^\s*(return|let|var|const|if|for|while|switch|function)\b/.test(last) && !/[{}]$/.test(last)) {
            stmts[lastIdx] = 'return ' + last;
          }
          body = stmts.join('\n');
        }
      }
      body = dedupeLetDeclarations(body);
      if (process.env.SYSADL_DEBUG) console.log('[SYSADL-IR] final body to compile:', JSON.stringify(body));
      const bodyFn = new Function(...paramNames, `'use strict';\n${body}`);
      return function(...args) { try { return bodyFn.apply(this, args); } catch (e) { return undefined; } };
    } catch (bodyErr) {
      // fallback interpreter similar to previous behavior but safe
      const expr = pre;
      return function(...argsVals) {
        const env = {};
        for (let i = 0; i < paramNames.length; i++) env[paramNames[i]] = argsVals[i];
        try {
          if (/^[0-9.\-+eE]+$/.test(expr)) return Number(expr);
          if (expr.indexOf('.') !== -1 && expr.indexOf('(') === -1 && expr.indexOf('=') === -1) {
            const parts = expr.split('.').map(s => s.trim());
            let cur = env[parts[0]];
            for (let i = 1; i < parts.length; i++) {
              const key = parts[i];
              if (cur == null) { cur = undefined; break; }
              cur = cur[key] !== undefined ? cur[key] : cur[key];
            }
            return cur;
          }
          if (expr.indexOf('::') !== -1) return expr;
          if (paramNames.includes(expr)) return env[expr];
          const fnBody = `return (${expr});`;
          const f = new Function(...Object.keys(env), fnBody);
          return f(...Object.values(env));
        } catch (err) {
          return undefined;
        }
      };
    }
  }
}

// Base classes for SysADL type system
class SysADLType {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return String(this.value);
  }
}

class ValueType extends SysADLType {
  constructor(value) {
    super(value);
    this.value = this.parse(value);
    this.validate();
  }

  parse(value) {
    return value; // Override in subclasses
  }

  validate() {
    // Override in subclasses for validation
  }
}

class DataType extends SysADLType {
  constructor(obj = {}) {
    super(obj);
    this.initializeAttributes(obj);
  }

  initializeAttributes(obj) {
    // Will be implemented by generated subclasses
  }
}

class Dimension {
  constructor(name) {
    this.name = name;
  }

  toString() {
    return this.name;
  }
}

class Unit {
  constructor(name, config = {}) {
    this.name = name;
    this.dimension = config.dimension || null;
  }

  toString() {
    return this.name;
  }
}

// Factory functions for type creation
function valueType(name, config = {}) {
  return class extends ValueType {
    constructor(value) {
      super(value);
    }

    parse(value) {
      if (config.extends && typeof config.extends.prototype.parse === 'function') {
        // If extending another ValueType, use its parse method first
        const baseInstance = new config.extends(value);
        return baseInstance.value;
      }
      return config.parse ? config.parse(value) : value;
    }

    validate() {
      if (config.validate && !config.validate(this.value)) {
        throw new Error(`Invalid ${name} value: ${this.value}`);
      }
    }

    static get unit() {
      return config.unit || null;
    }

    static get dimension() {
      return config.dimension || null;
    }
  };
}

function dataType(name, attributes = {}) {
  return class extends DataType {
    initializeAttributes(obj) {
      for (const [attrName, attrType] of Object.entries(attributes)) {
        if (attrName in obj) {
          // Type validation could be added here in the future
          this[attrName] = obj[attrName];
        }
      }
    }
  };
}

function dimension(name) {
  return new Dimension(name);
}

function unit(name, config = {}) {
  return new Unit(name, config);
}

// Built-in primitive types (always available)
const Int = class extends ValueType {
  parse(value) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) throw new Error(`Invalid Int value: ${value}`);
    return parsed;
  }
};

const SysADLBoolean = class extends ValueType {
  parse(value) {
    return globalThis.Boolean(value);
  }
};

const SysADLString = class extends ValueType {
  parse(value) {
    return globalThis.String(value);
  }
};

const Void = class extends ValueType {
  parse(value) {
    return value;
  }
};

const Real = class extends ValueType {
  parse(value) {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) throw new Error(`Invalid Real value: ${value}`);
    return parsed;
  }
};

// Simple Enum class for generated code
class Enum {
  constructor(...values) {
    this._values = values;

    // Add properties for each enum value (lowercase access)
    values.forEach((value, index) => {
      const propName = value.toLowerCase();
      Object.defineProperty(this, propName, {
        get() { return value; },
        enumerable: true,
        configurable: true
      });
    });
  }

  // Static method to create enum with properties
  static create(...values) {
    return new Enum(...values);
  }
}

// === Environment and Scenario Classes ===

// Entity class - represents entities within environments
class Entity extends Element {
  constructor(name, opts = {}) {
    super(name, opts);
    this.entityType = opts.entityType || 'default';
    
    // Merge properties: preserve existing structure and add/override with opts.properties
    if (opts.properties && typeof opts.properties === 'object') {
      // If this.properties was already initialized by subclass, merge values
      if (this.properties && typeof this.properties === 'object') {
        Object.assign(this.properties, opts.properties);
      } else {
        this.properties = { ...opts.properties };
      }
    } else if (!this.properties) {
      // Initialize if not already set
      this.properties = {};
    }
    
    this.state = opts.state || {};
    this.bindings = opts.bindings || {}; // Bidirectional bindings to model elements
    
    // Enhanced entity structure
    this.roles = opts.roles || []; // Communication roles
    this.associations = opts.associations || {
      outgoing: {},
      incoming: {}
    };
    this.composition = opts.composition || {
      parent: null,
      children: {},
      childCollections: {}
    };
    this.environmentDef = opts.environmentDef || null;
    this.environment = opts.environment || null;
    
    // Initialize role-based communication interfaces
    this.initializeRoles();
  }

  // Initialize role-based communication interfaces
  initializeRoles() {
    for (const role of this.roles) {
      if (!this.associations.outgoing[role]) {
        this.associations.outgoing[role] = [];
      }
      if (!this.associations.incoming[role]) {
        this.associations.incoming[role] = [];
      }
    }
  }

  // Update entity property and propagate to bound model elements and associations
  setProperty(propName, value) {
    const oldValue = this.properties[propName];
    this.properties[propName] = value;
    
    // Propagate to bound model elements
    if (this.bindings[propName]) {
      const binding = this.bindings[propName];
      if (binding.target && binding.target.setProperty) {
        binding.target.setProperty(binding.targetProperty, value);
      }
    }
    
    // Notify associated entities if this is a communication property
    this.notifyAssociatedEntities(propName, value, oldValue);
    
    // Log property change
    if (this.model && this.model.logEvent) {
      this.model.logEvent({
        elementType: 'entity_property_change',
        entity: this.name,
        entityType: this.entityType,
        property: propName,
        oldValue,
        newValue: value,
        when: Date.now()
      });
    }
  }

  // Get entity property value
  getProperty(propName) {
    return this.properties[propName];
  }

  // Get property with nested support (property.subProperty)
  getNestedProperty(propertyPath) {
    const parts = propertyPath.split('.');
    let value = this.properties;
    
    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }
    
    return value;
  }

  // Set nested property with path creation
  setNestedProperty(propertyPath, value) {
    const parts = propertyPath.split('.');
    const finalProp = parts.pop();
    
    let target = this.properties;
    for (const part of parts) {
      if (!target[part] || typeof target[part] !== 'object') {
        target[part] = {};
      }
      target = target[part];
    }
    
    target[finalProp] = value;
  }

  // Notify associated entities of property changes
  notifyAssociatedEntities(propName, newValue, oldValue) {
    for (const [role, entities] of Object.entries(this.associations.outgoing)) {
      for (const associatedEntity of entities) {
        if (typeof associatedEntity.receivePropertyNotification === 'function') {
          associatedEntity.receivePropertyNotification(
            this, role, propName, newValue, oldValue
          );
        }
      }
    }
  }

  // Receive property change notification from associated entity
  receivePropertyNotification(fromEntity, fromRole, propName, newValue, oldValue) {
    console.log(`📨 ${this.name} received property notification from ${fromEntity.name}:`, 
                `${propName} = ${newValue} (was ${oldValue})`);
    
    // Log the notification
    if (this.model && this.model.logEvent) {
      this.model.logEvent({
        elementType: 'entity_property_notification',
        entity: this.name,
        fromEntity: fromEntity.name,
        fromRole: fromRole,
        property: propName,
        value: newValue,
        when: Date.now()
      });
    }
  }

  // Add child entity via composition
  addChild(role, childEntity) {
    if (!this.composition.childCollections[role]) {
      this.composition.childCollections[role] = [];
    }
    
    this.composition.childCollections[role].push(childEntity);
    childEntity.composition.parent = this;
    
    console.log(`📦 Added child ${childEntity.name} to ${this.name}.${role}`);
  }

  // Remove child entity
  removeChild(role, childName) {
    if (this.composition.childCollections[role]) {
      const index = this.composition.childCollections[role].findIndex(
        child => child.name === childName
      );
      
      if (index !== -1) {
        const child = this.composition.childCollections[role][index];
        child.composition.parent = null;
        this.composition.childCollections[role].splice(index, 1);
        
        console.log(`📦 Removed child ${childName} from ${this.name}.${role}`);
        return child;
      }
    }
    
    return null;
  }

  // Get child entities by role
  getChildren(role) {
    return this.composition.childCollections[role] || [];
  }

  // Get all child entities across all roles
  getAllChildren() {
    const allChildren = [];
    for (const children of Object.values(this.composition.childCollections)) {
      allChildren.push(...children);
    }
    return allChildren;
  }

  // Get entities associated via specific role
  getAssociated(role, direction = 'outgoing') {
    return this.associations[direction][role] || [];
  }

  // Check if entity has a specific role
  hasRole(roleName) {
    return this.roles.includes(roleName);
  }

  // Add role to entity (dynamic role assignment)
  addRole(roleName) {
    if (!this.hasRole(roleName)) {
      this.roles.push(roleName);
      this.associations.outgoing[roleName] = [];
      this.associations.incoming[roleName] = [];
      
      console.log(`🎭 Added role ${roleName} to entity ${this.name}`);
    }
  }

  // Remove role from entity
  removeRole(roleName) {
    const index = this.roles.indexOf(roleName);
    if (index !== -1) {
      this.roles.splice(index, 1);
      delete this.associations.outgoing[roleName];
      delete this.associations.incoming[roleName];
      
      console.log(`🎭 Removed role ${roleName} from entity ${this.name}`);
    }
  }

  // Send message to associated entities via role
  sendMessage(role, message, targetEntity = null) {
    const targets = targetEntity ? [targetEntity] : this.getAssociated(role, 'outgoing');
    
    for (const target of targets) {
      if (typeof target.receiveMessage === 'function') {
        target.receiveMessage(this, role, message);
      }
    }
    
    console.log(`📤 ${this.name} sent message via ${role} to ${targets.length} entities`);
  }

  // Receive message from associated entity
  receiveMessage(fromEntity, fromRole, message) {
    console.log(`📥 ${this.name} received message from ${fromEntity.name} (${fromRole}):`, message);
    
    // Log the message
    if (this.model && this.model.logEvent) {
      this.model.logEvent({
        elementType: 'entity_message_received',
        entity: this.name,
        fromEntity: fromEntity.name,
        fromRole: fromRole,
        message: message,
        when: Date.now()
      });
    }
  }

  // Bind entity property to model element property (bidirectional)
  bindToModel(entityProp, modelElement, modelProp) {
    this.bindings[entityProp] = {
      target: modelElement,
      targetProperty: modelProp
    };
    
    // Set up reverse binding on model element if supported
    if (modelElement.bindToEntity) {
      modelElement.bindToEntity(modelProp, this, entityProp);
    }
  }

  // Initialize entity (called during environment activation)
  initialize() {
    console.log(`🚀 Initializing entity ${this.name} (${this.entityType})`);
    
    // Initialize child entities
    for (const [role, children] of Object.entries(this.composition.childCollections)) {
      for (const child of children) {
        if (child.initialize) {
          child.initialize();
        }
      }
    }
  }

  // Get entity summary for debugging
  getSummary() {
    return {
      name: this.name,
      type: this.entityType,
      roles: this.roles,
      properties: Object.keys(this.properties),
      hasParent: !!this.composition.parent,
      childRoles: Object.keys(this.composition.childCollections),
      associationRoles: Object.keys(this.associations.outgoing),
      outgoingAssociations: Object.fromEntries(
        Object.entries(this.associations.outgoing).map(
          ([role, entities]) => [role, entities.length]
        )
      )
    };
  }
}

// Connection class - represents connections between entities in environments
class Connection extends Element {
  constructor(name, opts = {}) {
    super(name, opts);
    this.connectionType = opts.connectionType || 'connection';
    this.from = opts.from || null; // Source entity/role
    this.to = opts.to || null; // Target entity/role
    this.bindings = opts.bindings || {}; // Connection-specific bindings
    this.properties = opts.properties || {}; // Connection properties
  }

  // Set connection property
  setProperty(propName, value) {
    this.properties[propName] = value;
  }

  // Get connection property
  getProperty(propName) {
    return this.properties[propName];
  }

  // Validate connection endpoints
  validate() {
    if (!this.from || !this.to) {
      throw new Error(`Connection ${this.name} must have both 'from' and 'to' endpoints`);
    }
    return true;
  }
}

// Event class - represents events that can occur in scenarios
class Event extends Element {
  constructor(name, opts = {}) {
    super(name, opts);
    this.eventType = opts.eventType || 'simple';
    this.parameters = opts.parameters || [];
    this.condition = opts.condition || null; // Function to check if event should trigger
    this.action = opts.action || null; // Function to execute when event triggers
    this.triggers = opts.triggers || []; // Other events this event can trigger
  }

  // Check if event should trigger given current state
  shouldTrigger(context) {
    if (!this.condition) return false;
    try {
      return this.condition(context);
    } catch (e) {
      console.warn(`Event ${this.name} condition evaluation failed:`, e);
      return false;
    }
  }

  // Execute event action
  execute(context) {
    if (this.model && this.model.logEvent) {
      this.model.logEvent({
        elementType: 'event_execute',
        event: this.name,
        when: Date.now()
      });
    }

    if (this.action) {
      try {
        const result = this.action(context);
        
        // Trigger dependent events
        for (const triggerEvent of this.triggers) {
          if (triggerEvent.shouldTrigger && triggerEvent.shouldTrigger(context)) {
            setTimeout(() => triggerEvent.execute(context), 0);
          }
        }
        
        return result;
      } catch (e) {
        console.warn(`Event ${this.name} execution failed:`, e);
        return false;
      }
    }
    return true;
  }
}

// Generic event classes for standard SysADL events
class events extends Event {
  constructor(name = 'events', opts = {}) {
    super(name, {
      ...opts,
      eventType: 'simple',
      parameters: []
    });
  }
}

class eventClasses extends Event {
  constructor(name = 'eventClasses', opts = {}) {
    super(name, {
      ...opts,
      eventType: 'simple',
      parameters: []
    });
  }
}

// Scene class - represents scenes containing entities and their states
class Scene extends Element {
  constructor(name, opts = {}) {
    super(name, opts);
    this.entities = opts.entities || [];
    this.initialStates = opts.initialStates || {};
    this.constraints = opts.constraints || [];
    this.active = false;
  }

  // Add entity to scene
  addEntity(entity) {
    if (entity instanceof Entity) {
      this.entities.push(entity);
      entity.scene = this;
    }
  }

  // Remove entity from scene
  removeEntity(entityName) {
    this.entities = this.entities.filter(e => e.name !== entityName);
  }

  // Get entity by name
  getEntity(entityName) {
    return this.entities.find(e => e.name === entityName);
  }

  // Initialize scene - set all entities to their initial states
  initialize() {
    for (const entity of this.entities) {
      const initialState = this.initialStates[entity.name];
      if (initialState) {
        for (const [prop, value] of Object.entries(initialState)) {
          entity.setProperty(prop, value);
        }
      }
    }
    this.active = true;
    
    if (this.model && this.model.logEvent) {
      this.model.logEvent({
        elementType: 'scene_initialize',
        scene: this.name,
        when: Date.now()
      });
    }
  }

  // Check if scene constraints are satisfied
  validateConstraints() {
    for (const constraint of this.constraints) {
      if (constraint.evaluate) {
        const inputs = this.entities.map(e => e.properties);
        if (!constraint.evaluate(inputs, this.model)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Enhanced helper method to get entity from context with validation
   * Generic method that works across all SysADL domains (Factory, Smart Home, Healthcare, etc.)
   * @param {Object} context - Execution context containing entities
   * @param {string} entityName - Name of entity to retrieve
   * @returns {Object|null} - Entity object or null if not found
   */
  getEntity(context, entityName) {
    if (!context) {
      console.error(`[Scene.getEntity] Context is null or undefined`);
      return null;
    }
    
    // Check in context.entities first (most common location)
    if (context.entities && context.entities[entityName]) {
      return context.entities[entityName];
    }
    
    // Check in context directly (alternative structure)
    if (context[entityName]) {
      return context[entityName];
    }
    
    // Check in scene's own entities
    if (this.entities) {
      const sceneEntity = this.entities.find(e => e.name === entityName);
      if (sceneEntity) {
        return sceneEntity;
      }
    }
    
    console.warn(`[Scene.getEntity] Entity '${entityName}' not found in context or scene`);
    return null;
  }

  /**
   * Enhanced helper method to compare values with type coercion and validation
   * Generic comparison that handles different data types across domains
   * @param {any} actual - Actual value from entity/context
   * @param {any} expected - Expected value for comparison  
   * @returns {boolean} - True if values match
   */
  compareValues(actual, expected) {
    // Handle null/undefined cases
    if (actual === null || actual === undefined) {
      return expected === null || expected === undefined;
    }
    
    // Direct equality (most common case)
    if (actual === expected) {
      return true;
    }
    
    // String comparison with type coercion
    if (typeof actual === 'string' && typeof expected === 'string') {
      return actual.toLowerCase() === expected.toLowerCase();
    }
    
    // Handle object properties (like stationA.ID)
    if (typeof actual === 'object' && actual.properties && typeof expected === 'string') {
      return this.compareValues(actual.properties.ID, expected);
    }
    
    // Handle numeric comparisons
    if (typeof actual === 'number' || typeof expected === 'number') {
      return Number(actual) === Number(expected);
    }
    
    // Convert both to strings as last resort
    return String(actual) === String(expected);
  }

  /**
   * Enhanced method to execute scene logic with event triggering
   * Generic execution framework that works across all domains
   * @param {Object} context - Execution context
   * @returns {Object} - Execution result
   */
  async executeSceneLogic(context) {
    try {
      // Log scene execution start
      if (this.model && this.model.logEvent) {
        this.model.logEvent({
          elementType: 'scene_execute_start',
          scene: this.name,
          startEvent: this.startEvent,
          when: Date.now()
        });
      }
      
      // Trigger start event if defined
      if (this.startEvent && context.eventSystem) {
        await context.eventSystem.triggerEvent(this.startEvent, {
          scene: this.name,
          context: context
        });
      }
      
      // Wait for finish event if defined
      if (this.finishEvent && context.eventSystem) {
        const finishResult = await context.eventSystem.waitForEvent(this.finishEvent, {
          timeout: 30000, // 30 seconds timeout
          context: context
        });
        
        if (!finishResult.success) {
          return {
            success: false,
            error: `Finish event '${this.finishEvent}' not received within timeout`,
            scene: this.name
          };
        }
      }
      
      // Log scene execution completion
      if (this.model && this.model.logEvent) {
        this.model.logEvent({
          elementType: 'scene_execute_complete',
          scene: this.name,
          finishEvent: this.finishEvent,
          when: Date.now()
        });
      }
      
      return {
        success: true,
        scene: this.name,
        startEvent: this.startEvent,
        finishEvent: this.finishEvent
      };
    } catch (error) {
      console.error(`[Scene.executeSceneLogic] Error executing scene '${this.name}':`, error.message);
      return {
        success: false,
        error: error.message,
        scene: this.name
      };
    }
  }

  /**
   * Generic execution method that works for all Scene subclasses across domains
   * Executes the scene with enhanced validation and context management
   * @param {Object} context - Execution context
   * @returns {Object} - Execution result with validation status
   */
  async execute(context) {
    try {
      // Validate pre-conditions using JavaScript functions
      const preConditionsPassed = this.validatePreConditions(context);
      if (!preConditionsPassed) {
        return {
          success: false,
          error: 'Pre-conditions not satisfied',
          scene: this.name
        };
      }

      // Execute scene logic (trigger start event)
      const executionResult = await this.executeSceneLogic(context);

      // Validate post-conditions using JavaScript functions
      const postConditionsPassed = this.validatePostConditions(context);
      if (!postConditionsPassed) {
        return {
          success: false,
          error: 'Post-conditions not satisfied',
          scene: this.name,
          executionResult
        };
      }

      return {
        success: true,
        scene: this.name,
        executionResult
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        scene: this.name
      };
    }
  }

  /**
   * Default validation methods - can be overridden by subclasses
   * These provide fallback behavior for scenes without custom validation
   */
  validatePreConditions(context) {
    // Default implementation - always returns true
    // Subclasses should override this with their specific validation logic
    return true;
  }

  validatePostConditions(context) {
    // Default implementation - always returns true  
    // Subclasses should override this with their specific validation logic
    return true;
  }
}

// Scenario class - represents scenarios with pre/post conditions and scenes
class Scenario extends Element {
  constructor(name, opts = {}) {
    super(name, opts);
    this.scenes = opts.scenes || [];
    this.preConditions = opts.preConditions || [];
    this.postConditions = opts.postConditions || [];
    this.events = opts.events || [];
    this.currentScene = null;
    this.status = 'inactive'; // inactive, running, completed, failed
  }

  // Add scene to scenario
  addScene(scene) {
    if (scene instanceof Scene) {
      this.scenes.push(scene);
      scene.scenario = this;
    }
  }

  // Check if pre-conditions are met
  checkPreConditions(context) {
    for (const condition of this.preConditions) {
      if (condition.evaluate) {
        if (!condition.evaluate(context, this.model)) {
          return false;
        }
      }
    }
    return true;
  }

  // Check if post-conditions are met
  checkPostConditions(context) {
    for (const condition of this.postConditions) {
      if (condition.evaluate) {
        if (!condition.evaluate(context, this.model)) {
          return false;
        }
      }
    }
    return true;
  }

  // Start scenario execution
  start(context) {
    if (!this.checkPreConditions(context)) {
      this.status = 'failed';
      return false;
    }

    this.status = 'running';
    if (this.scenes.length > 0) {
      this.currentScene = this.scenes[0];
      this.currentScene.initialize();
    }

    if (this.model && this.model.logEvent) {
      this.model.logEvent({
        elementType: 'scenario_start',
        scenario: this.name,
        when: Date.now()
      });
    }

    return true;
  }

  // Complete scenario and check post-conditions
  complete(context) {
    if (this.checkPostConditions(context)) {
      this.status = 'completed';
    } else {
      this.status = 'failed';
    }

    if (this.model && this.model.logEvent) {
      this.model.logEvent({
        elementType: 'scenario_complete',
        scenario: this.name,
        status: this.status,
        when: Date.now()
      });
    }

    return this.status === 'completed';
  }
  
  /**
   * Execute a scene or nested scenario within this scenario context
   * Generic method that works with both scene and scenario execution
   * @param {Object} context - Execution context with scenes and scenarios registry
   * @param {string} name - Name of scene or scenario to execute
   * @returns {Promise<Object>} - Execution result
   */
  async executeScene(context, name) {
    if (!context) {
      throw new Error('Context is required for scene execution');
    }
    
    // Try to find and execute as scene first
    if (context.scenes && context.scenes[name]) {
      const sceneInstance = new context.scenes[name]();
      if (sceneInstance.execute) {
        return await sceneInstance.execute(context);
      }
    }
    
    // Try to find and execute as scenario
    if (context.scenarios && context.scenarios[name]) {
      return await this.executeScenario(context, name);
    }
    
    throw new Error(`Scene or scenario '${name}' not found in context`);
  }
  
  /**
   * Execute a nested scenario within this scenario context
   * @param {Object} context - Execution context with scenarios registry
   * @param {string} scenarioName - Name of scenario to execute
   * @returns {Promise<Object>} - Execution result
   */
  async executeScenario(context, scenarioName) {
    if (!context || !context.scenarios) {
      throw new Error('Context with scenarios registry is required');
    }
    
    const ScenarioClass = context.scenarios[scenarioName];
    if (!ScenarioClass) {
      throw new Error(`Scenario '${scenarioName}' not found in context`);
    }
    
    const scenarioInstance = new ScenarioClass();
    if (scenarioInstance.execute) {
      return await scenarioInstance.execute(context);
    }
    
    throw new Error(`Scenario '${scenarioName}' does not have execute method`);
  }
}

// EnvironmentDefinition class - defines environment structure
class EnvironmentDefinition extends Element {
  constructor(name, opts = {}) {
    super(name, opts);
    this.entityTypes = opts.entityTypes || {};
    this.entityClasses = opts.entityClasses || {}; // Store actual classes
    this.connectionTypes = opts.connectionTypes || {};
    this.connectionClasses = opts.connectionClasses || {}; // Store actual connection classes
    this.eventTypes = opts.eventTypes || {};
    this.properties = opts.properties || {};
    this.constraints = opts.constraints || [];
    this.associations = opts.associations || []; // Association definitions
    this.compositions = opts.compositions || []; // Composition relationships
    this.roleDefinitions = opts.roleDefinitions || {}; // Role definitions for entities
  }

  // Register entity class for factory usage
  registerEntityClass(typeName, EntityClass) {
    this.entityClasses[typeName] = EntityClass;
    
    // Auto-define type if not already defined
    if (!this.entityTypes[typeName]) {
      this.defineEntityType(typeName, {
        roles: [],
        properties: {},
        factory: (name, properties, opts) => new EntityClass(name, { ...opts, properties })
      });
    } else {
      // Update existing type with factory
      this.entityTypes[typeName].factory = (name, properties, opts) => new EntityClass(name, { ...opts, properties });
    }
  }

  // Register connection class for factory usage
  registerConnectionClass(typeName, ConnectionClass) {
    this.connectionClasses[typeName] = ConnectionClass;
    
    // Auto-define connection type if not already defined
    if (!this.connectionTypes[typeName]) {
      this.defineConnectionType(typeName, {
        from: ConnectionClass.prototype.from || null,
        to: ConnectionClass.prototype.to || null,
        connectionType: ConnectionClass.prototype.connectionType || 'connection',
        factory: (name, opts) => new ConnectionClass(name, opts)
      });
    } else {
      // Update existing type with factory
      this.connectionTypes[typeName].factory = (name, opts) => new ConnectionClass(name, opts);
    }
  }

  // Define entity type with roles and properties structure
  defineEntityType(typeName, definition) {
    const enhancedDefinition = {
      ...definition,
      roles: definition.roles || [],
      properties: definition.properties || {},
      compositions: definition.compositions || [], // Child entities this type can contain
      validationRules: definition.validationRules || [],
      factory: definition.factory || null // Custom factory function
    };
    
    this.entityTypes[typeName] = enhancedDefinition;
    
    // Register role definitions for this entity type
    if (enhancedDefinition.roles.length > 0) {
      this.roleDefinitions[typeName] = enhancedDefinition.roles;
    }
  }

  // Define connection type with from/to and properties structure
  defineConnectionType(typeName, definition) {
    const enhancedDefinition = {
      ...definition,
      from: definition.from || null,
      to: definition.to || null,
      connectionType: definition.connectionType || 'connection',
      properties: definition.properties || {},
      validationRules: definition.validationRules || [],
      factory: definition.factory || null // Custom factory function
    };
    
    this.connectionTypes[typeName] = enhancedDefinition;
  }

  // Define event type
  defineEventType(typeName, definition) {
    this.eventTypes[typeName] = definition;
  }

  // Define association between entity types
  defineAssociation(associationName, fromType, fromRole, toType, toRole, opts = {}) {
    const association = {
      name: associationName,
      from: { type: fromType, role: fromRole },
      to: { type: toType, role: toRole },
      cardinality: opts.cardinality || '1..*',
      bidirectional: opts.bidirectional || false,
      validation: opts.validation || null
    };
    
    this.associations.push(association);
    
    console.log(`🔗 Defined association: ${fromType}.${fromRole} → ${toType}.${toRole}`);
    return association;
  }

  // Define composition relationship
  defineComposition(parentType, childType, containmentRole, opts = {}) {
    const composition = {
      parent: parentType,
      child: childType,
      role: containmentRole,
      cardinality: opts.cardinality || '0..*',
      cascade: opts.cascade !== false, // Delete children when parent is deleted
      validation: opts.validation || null
    };
    
    this.compositions.push(composition);
    
    console.log(`📦 Defined composition: ${parentType} contains ${childType} via ${containmentRole}`);
    return composition;
  }

  // Enhanced createEntity with validation and factory support
  createEntity(name, typeName, properties = {}, opts = {}) {
    const typeDef = this.entityTypes[typeName];
    if (!typeDef) {
      throw new Error(`Unknown entity type: ${typeName} in environment definition ${this.name}`);
    }

    // Validate properties against type definition
    this.validateEntityProperties(typeName, properties);

    // Use custom factory if defined
    if (typeDef.factory && typeof typeDef.factory === 'function') {
      return typeDef.factory(name, properties, opts, this);
    }

    // Create entity with enhanced structure
    const entity = new Entity(name, {
      entityType: typeName,
      properties: { ...typeDef.properties, ...properties },
      roles: [...(typeDef.roles || [])],
      state: opts.initialState || {},
      composition: {
        parent: opts.parent || null,
        children: {},
        childCollections: {}
      },
      associations: {
        outgoing: {},
        incoming: {}
      },
      environmentDef: this
    });

    // Initialize role-based communication interfaces
    entity.roles.forEach(roleName => {
      entity.associations.outgoing[roleName] = [];
      entity.associations.incoming[roleName] = [];
    });

    // Initialize composition containers for child types
    this.compositions
      .filter(comp => comp.parent === typeName)
      .forEach(comp => {
        entity.composition.childCollections[comp.role] = [];
      });

    console.log(`✨ Created entity ${name} (${typeName}) with roles [${entity.roles.join(', ')}]`);
    return entity;
  }

  // Validate entity properties against type definition
  validateEntityProperties(typeName, properties) {
    const typeDef = this.entityTypes[typeName];
    if (!typeDef || !typeDef.validationRules) return;

    for (const rule of typeDef.validationRules) {
      if (rule.property && properties.hasOwnProperty(rule.property)) {
        if (rule.type && typeof properties[rule.property] !== rule.type) {
          throw new Error(`Property ${rule.property} must be of type ${rule.type}`);
        }
        
        if (rule.validator && !rule.validator(properties[rule.property])) {
          throw new Error(`Property ${rule.property} validation failed: ${rule.message || 'Invalid value'}`);
        }
      }
      
      if (rule.required && !properties.hasOwnProperty(rule.property)) {
        throw new Error(`Required property ${rule.property} missing in entity type ${typeName}`);
      }
    }
  }

  // Create multiple entities with composition relationships
  createEntityWithComposition(name, typeName, properties = {}, compositionData = {}) {
    const parentEntity = this.createEntity(name, typeName, properties);
    
    // Create child entities and establish composition relationships
    for (const [role, childrenData] of Object.entries(compositionData)) {
      const composition = this.compositions.find(c => c.parent === typeName && c.role === role);
      if (!composition) {
        console.warn(`No composition defined for ${typeName}.${role}`);
        continue;
      }
      
      const children = Array.isArray(childrenData) ? childrenData : [childrenData];
      
      for (const childData of children) {
        const child = this.createEntity(
          childData.name, 
          composition.child, 
          childData.properties || {}, 
          { parent: parentEntity }
        );
        
        // Add child to parent's collection
        parentEntity.composition.childCollections[role].push(child);
        child.composition.parent = parentEntity;
        
        console.log(`📦 Added ${child.name} to ${parentEntity.name}.${role}`);
      }
    }
    
    return parentEntity;
  }

  // Establish association between two entities
  establishAssociation(fromEntity, toEntity, associationName) {
    const association = this.associations.find(a => a.name === associationName);
    if (!association) {
      throw new Error(`Association ${associationName} not defined`);
    }
    
    // Validate entity types match association definition
    if (fromEntity.entityType !== association.from.type || 
        toEntity.entityType !== association.to.type) {
      throw new Error(`Entity types don't match association ${associationName} definition`);
    }
    
    // Add association links
    fromEntity.associations.outgoing[association.from.role].push(toEntity);
    toEntity.associations.incoming[association.to.role].push(fromEntity);
    
    // If bidirectional, create reverse association
    if (association.bidirectional) {
      toEntity.associations.outgoing[association.to.role].push(fromEntity);
      fromEntity.associations.incoming[association.from.role].push(toEntity);
    }
    
    console.log(`🔗 Established association ${associationName}: ${fromEntity.name} → ${toEntity.name}`);
    return association;
  }

  // Get all associations for an entity
  getEntityAssociations(entity, role = null) {
    if (role) {
      return {
        outgoing: entity.associations.outgoing[role] || [],
        incoming: entity.associations.incoming[role] || []
      };
    }
    
    return entity.associations;
  }

  // Get child entities from composition
  getChildEntities(parentEntity, role) {
    return parentEntity.composition.childCollections[role] || [];
  }

  // Create event instance of specified type
  createEvent(name, typeName, opts = {}) {
    const typeDef = this.eventTypes[typeName];
    if (!typeDef) {
      throw new Error(`Unknown event type: ${typeName}`);
    }

    const event = new Event(name, {
      eventType: typeName,
      ...typeDef,
      ...opts
    });

    return event;
  }

  // Get definition summary for debugging
  getSummary() {
    return {
      name: this.name,
      entityTypes: Object.keys(this.entityTypes),
      eventTypes: Object.keys(this.eventTypes),
      associations: this.associations.map(a => `${a.from.type}.${a.from.role} → ${a.to.type}.${a.to.role}`),
      compositions: this.compositions.map(c => `${c.parent} contains ${c.child} via ${c.role}`)
    };
  }
}

// EnvironmentConfiguration class - configures specific environment instance
class EnvironmentConfiguration extends Element {
  constructor(name, opts = {}) {
    super(name, opts);
    this.environmentDef = opts.environmentDef || null;
    this.entities = opts.entities || {};
    this.events = opts.events || [];
    this.bindings = opts.bindings || []; // Bindings to model elements
    this.active = false;
    this.associations = new Map(); // Active associations between entities
    this.compositionTree = new Map(); // Parent-child relationships
  }

  // Enhanced createEntity using environment definition
  createEntity(typeName, options = {}) {
    if (!this.environmentDef) {
      throw new Error('Environment definition not set');
    }
    
    // Get the name from options or generate one
    const name = options.name || `${typeName.toLowerCase()}_${Date.now()}`;
    const properties = options.properties || {};
    const compositionData = options.compositionData || {};
    
    // Create entity using environment definition
    const entity = this.environmentDef.createEntity(name, typeName, properties);
    
    // Handle composition if specified
    if (Object.keys(compositionData).length > 0) {
      const entityWithComposition = this.environmentDef.createEntityWithComposition(
        name, typeName, properties, compositionData
      );
      this.entities[name] = entityWithComposition;
      
      // Register in composition tree
      this.registerCompositionTree(entityWithComposition);
    } else {
      this.entities[name] = entity;
    }
    
    entity.environment = this;
    
    console.log(`🌍 Added entity ${name} (${typeName}) to environment configuration ${this.name}`);
    return entity;
  }

  // Register composition hierarchy in tree structure
  registerCompositionTree(parentEntity) {
    this.compositionTree.set(parentEntity.name, {
      entity: parentEntity,
      children: new Map()
    });
    
    // Register all child entities recursively
    for (const [role, children] of Object.entries(parentEntity.composition.childCollections)) {
      const childMap = new Map();
      for (const child of children) {
        childMap.set(child.name, child);
        child.environment = this;
        this.entities[child.name] = child; // Add to flat entity collection too
      }
      this.compositionTree.get(parentEntity.name).children.set(role, childMap);
    }
  }

  // Create association between entities using environment definition
  createAssociation(fromEntityName, toEntityName, associationName) {
    const fromEntity = this.entities[fromEntityName];
    const toEntity = this.entities[toEntityName];
    
    if (!fromEntity || !toEntity) {
      throw new Error(`Entity not found: ${fromEntityName} or ${toEntityName}`);
    }
    
    if (!this.environmentDef) {
      throw new Error('Environment definition required for association creation');
    }
    
    const association = this.environmentDef.establishAssociation(
      fromEntity, 
      toEntity, 
      associationName
    );
    
    // Track association in configuration
    const associationKey = `${fromEntityName}_${toEntityName}_${associationName}`;
    this.associations.set(associationKey, {
      from: fromEntity,
      to: toEntity,
      association: association,
      created: Date.now()
    });
    
    return association;
  }

  // Create multiple associations from a configuration map
  createAssociations(associationConfig) {
    const results = [];
    
    for (const config of associationConfig) {
      try {
        const association = this.createAssociation(
          config.from, 
          config.to, 
          config.association
        );
        results.push({ ...config, success: true, association });
      } catch (error) {
        console.error(`Failed to create association ${config.association}:`, error.message);
        results.push({ ...config, success: false, error: error.message });
      }
    }
    
    return results;
  }

  // Get entity by name (supports nested lookup for composed entities)
  getEntity(entityName) {
    // Try direct lookup first
    if (this.entities[entityName]) {
      return this.entities[entityName];
    }
    
    // Try nested lookup for composed entities (parent.child format)
    if (entityName.includes('.')) {
      const [parentName, childName] = entityName.split('.', 2);
      const parent = this.entities[parentName];
      
      if (parent && parent.composition.childCollections) {
        for (const childCollection of Object.values(parent.composition.childCollections)) {
          const child = childCollection.find(c => c.name === childName);
          if (child) return child;
        }
      }
    }
    
    return null;
  }

  // Get entities by type
  getEntitiesByType(entityType) {
    return Object.values(this.entities).filter(entity => 
      entity.entityType === entityType
    );
  }

  // Get child entities of a parent
  getChildEntities(parentName, role = null) {
    const parent = this.entities[parentName];
    if (!parent || !parent.composition.childCollections) {
      return [];
    }
    
    if (role) {
      return parent.composition.childCollections[role] || [];
    }
    
    // Return all children across all roles
    const allChildren = [];
    for (const children of Object.values(parent.composition.childCollections)) {
      allChildren.push(...children);
    }
    return allChildren;
  }

  // Get entities associated with a given entity
  getAssociatedEntities(entityName, role = null) {
    const entity = this.getEntity(entityName);
    if (!entity) return [];
    
    if (role) {
      return entity.associations.outgoing[role] || [];
    }
    
    // Return all associated entities
    const allAssociated = [];
    for (const entities of Object.values(entity.associations.outgoing)) {
      allAssociated.push(...entities);
    }
    return allAssociated;
  }

  // Add entity to environment (legacy compatibility)
  addEntity(entity) {
    if (entity instanceof Entity) {
      this.entities[entity.name] = entity;
      entity.environment = this;
      console.log(`🌍 Added entity ${entity.name} to environment configuration ${this.name}`);
    }
  }

  // Add event to environment
  addEvent(event) {
    if (event instanceof Event) {
      this.events.push(event);
      event.environment = this;
    }
  }

  // Establish binding between environment and model
  establishBinding(envElement, envProperty, modelElement, modelProperty) {
    const binding = {
      envElement,
      envProperty,
      modelElement,
      modelProperty,
      bidirectional: true
    };
    this.bindings.push(binding);

    // Set up bidirectional sync
    if (envElement.bindToModel) {
      envElement.bindToModel(envProperty, modelElement, modelProperty);
    }
  }

  // Activate environment
  activate() {
    this.active = true;
    
    // Initialize all entities
    for (const entity of Object.values(this.entities)) {
      if (entity.initialize) {
        entity.initialize();
      }
    }

    if (this.model && this.model.logEvent) {
      this.model.logEvent({
        elementType: 'environment_activate',
        environment: this.name,
        when: Date.now()
      });
    }
  }

  // Deactivate environment
  deactivate() {
    this.active = false;

    if (this.model && this.model.logEvent) {
      this.model.logEvent({
        elementType: 'environment_deactivate',
        environment: this.name,
        when: Date.now()
      });
    }
  }

  // Get configuration summary for debugging
  getSummary() {
    const entitySummary = {};
    for (const [name, entity] of Object.entries(this.entities)) {
      entitySummary[name] = {
        type: entity.entityType,
        roles: entity.roles || [],
        hasChildren: Object.keys(entity.composition?.childCollections || {}).length > 0,
        associations: Object.keys(entity.associations?.outgoing || {}).length
      };
    }
    
    return {
      name: this.name,
      active: this.active,
      entities: entitySummary,
      associations: this.associations.size,
      compositions: this.compositionTree.size,
      events: this.events.length,
      bindings: this.bindings.length
    };
  }
}

// ScenarioExecution class - controls execution of scenarios
class ScenarioExecution extends Element {
  constructor(name, opts = {}) {
    super(name, opts);
    this.scenarios = opts.scenarios || [];
    this.environment = opts.environment || null;
    this.executionMode = opts.executionMode || 'sequential'; // sequential, parallel, conditional
    this.currentScenario = null;
    this.executionStack = [];
    this.status = 'inactive'; // inactive, running, paused, completed
  }

  // Add scenario to execution
  addScenario(scenario) {
    if (scenario instanceof Scenario) {
      this.scenarios.push(scenario);
      scenario.execution = this;
    }
  }

  // Start execution of scenarios
  start() {
    if (this.scenarios.length === 0) {
      return false;
    }

    this.status = 'running';
    this.executionStack = [...this.scenarios];

    if (this.environment && this.environment.activate) {
      this.environment.activate();
    }

    if (this.model && this.model.logEvent) {
      this.model.logEvent({
        elementType: 'scenario_execution_start',
        execution: this.name,
        when: Date.now()
      });
    }

    // Start first scenario
    this.executeNext();
    return true;
  }

  // Execute next scenario in stack
  executeNext() {
    if (this.executionStack.length === 0) {
      this.complete();
      return;
    }

    this.currentScenario = this.executionStack.shift();
    const context = this.buildExecutionContext();

    if (this.currentScenario.start && this.currentScenario.start(context)) {
      // Monitor scenario completion
      this.monitorScenario();
    } else {
      // Scenario failed to start, try next
      this.executeNext();
    }
  }

  // Monitor current scenario for completion
  monitorScenario() {
    if (!this.currentScenario) return;

    // This would typically be called by scenario completion events
    // For now, we'll implement a simple check
    const context = this.buildExecutionContext();
    
    setTimeout(() => {
      if (this.currentScenario && this.currentScenario.status === 'running') {
        // Check if scenario should complete
        if (this.currentScenario.checkPostConditions && 
            this.currentScenario.checkPostConditions(context)) {
          this.currentScenario.complete(context);
          this.executeNext();
        } else {
          // Continue monitoring
          this.monitorScenario();
        }
      } else if (this.currentScenario && 
                 (this.currentScenario.status === 'completed' || 
                  this.currentScenario.status === 'failed')) {
        this.executeNext();
      }
    }, 100); // Check every 100ms
  }

  // Build execution context for scenarios
  buildExecutionContext() {
    return {
      environment: this.environment,
      entities: this.environment ? this.environment.entities : [],
      events: this.environment ? this.environment.events : [],
      model: this.model,
      execution: this
    };
  }

  // Complete execution
  complete() {
    this.status = 'completed';
    this.currentScenario = null;

    if (this.environment && this.environment.deactivate) {
      this.environment.deactivate();
    }

    if (this.model && this.model.logEvent) {
      this.model.logEvent({
        elementType: 'scenario_execution_complete',
        execution: this.name,
        when: Date.now()
      });
    }
  }

  // Pause execution
  pause() {
    this.status = 'paused';
  }

  // Resume execution
  resume() {
    if (this.status === 'paused') {
      this.status = 'running';
      this.monitorScenario();
    }
  }

  // Stop execution immediately
  stop() {
    this.status = 'stopped';
    this.currentScenario = null;
    this.executionStack = [];

    if (this.environment && this.environment.deactivate) {
      this.environment.deactivate();
    }

    if (this.model && this.model.logEvent) {
      this.model.logEvent({
        elementType: 'scenario_execution_stopped',
        execution: this.name,
        when: Date.now()
      });
    }
  }
}

// Events Definitions Container Class
class EventsDefinitions extends Element {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      elementType: 'EventsDefinitions'
    });
    
    this.targetConfiguration = opts.targetConfiguration || null;
    this.events = opts.events || {};
    
    // Event system properties
    this.eventEmitter = null;
    this.tasks = new Map();
    this.context = {};
    this.connections = new Map();
  }
  
  addEvent(name, eventDef) {
    this.events[name] = eventDef;
  }
  
  getEvent(name) {
    return this.events[name];
  }
  
  getAllEvents() {
    return Object.keys(this.events);
  }

  // Setup the event system with global EventEmitter and context
  setupEventSystem(eventEmitter, context = {}) {
    this.eventEmitter = eventEmitter;
    this.context = context;
    
    // Register connections from context if available
    if (context.connections) {
      for (const [name, connectionDef] of Object.entries(context.connections)) {
        this.connections.set(name, connectionDef);
      }
    }
    
    console.log(`[EventsDefinitions] Event system setup for ${this.name}`);
    return this;
  }

  // Register a task with executable JavaScript code block
  registerTask(taskName, taskFunction) {
    if (typeof taskFunction !== 'function') {
      throw new Error(`Task '${taskName}' must be a function`);
    }
    
    this.tasks.set(taskName, taskFunction);
    
    // Setup event listener for this task
    if (this.eventEmitter) {
      this.eventEmitter.on(taskName, () => {
        try {
          console.log(`[EventsDefinitions] Executing task: ${taskName}`);
          
          // Create bound context for the task function
          const boundContext = this.createTaskContext();
          
          // Execute the task function with bound context
          taskFunction.call(boundContext);
          
        } catch (error) {
          console.error(`[EventsDefinitions] Error executing task '${taskName}':`, error);
        }
      });
    }
    
    return this;
  }

  // Create execution context for tasks with access to entities and connections
  createTaskContext() {
    const self = this;
    
    return {
      // Access to all context entities
      ...this.context,
      
      // Method to invoke connections
      invokeConnection(connectionName, from, to, data = null) {
        return self.invokeConnection(connectionName, from, to, data);
      },
      
      // Method to trigger other events
      trigger(eventName, data = null) {
        if (self.eventEmitter) {
          console.log(`[EventsDefinitions] Triggering event: ${eventName}`);
          self.eventEmitter.emit(eventName, data);
        }
      }
    };
  }

  // Invoke a connection between entities
  invokeConnection(connectionName, from, to, data = null) {
    console.log(`[EventsDefinitions] Invoking connection: ${connectionName}(${from?.name || from}, ${to?.name || to})`);
    
    const connection = this.connections.get(connectionName);
    if (!connection) {
      console.warn(`[EventsDefinitions] Connection '${connectionName}' not found`);
      return false;
    }
    
    // Execute connection logic if defined
    if (typeof connection.execute === 'function') {
      try {
        connection.execute(from, to, data);
      } catch (error) {
        console.error(`[EventsDefinitions] Error executing connection '${connectionName}':`, error);
        return false;
      }
    }
    
    // Emit connection event for global listeners
    if (this.eventEmitter) {
      this.eventEmitter.emit(`connection:${connectionName}`, {
        from,
        to,
        data,
        timestamp: Date.now()
      });
    }
    
    return true;
  }

  // Trigger an event to start task execution
  triggerEvent(eventName, data = null) {
    if (!this.eventEmitter) {
      console.warn(`[EventsDefinitions] Event system not setup. Call setupEventSystem() first.`);
      return false;
    }
    
    console.log(`[EventsDefinitions] Triggering event: ${eventName}`);
    this.eventEmitter.emit(eventName, data);
    return true;
  }

  // Get all registered tasks
  getAllTasks() {
    return Array.from(this.tasks.keys());
  }

  // Check if a task is registered
  hasTask(taskName) {
    return this.tasks.has(taskName);
  }

  // Generic event execution method
  executeEvent(eventName, triggerName, context) {
    if (this[eventName] && this[eventName].hasRule && this[eventName].hasRule(triggerName)) {
      return this[eventName].executeRule(triggerName, context);
    }
    if (context && context.sysadlBase && context.sysadlBase.logger) {
      context.sysadlBase.logger.warn(`⚠️ Event ${eventName} or trigger ${triggerName} not found`);
    }
    return null;
  }
}

// Scene Definitions Container Class
class SceneDefinitions extends Element {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      elementType: 'SceneDefinitions'
    });
    
    this.targetEvents = opts.targetEvents || null;
    this.scenes = opts.scenes || {};
  }
  
  addScene(name, sceneDef) {
    this.scenes[name] = sceneDef;
  }
  
  getScene(name) {
    return this.scenes[name];
  }
  
  getAllScenes() {
    return Object.keys(this.scenes);
  }
}

// Scenario Definitions Container Class
class ScenarioDefinitions extends Element {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      elementType: 'ScenarioDefinitions'
    });
    
    this.targetScenes = opts.targetScenes || null;
    this.scenarios = opts.scenarios || {};
  }
  
  addScenario(name, scenarioDef) {
    this.scenarios[name] = scenarioDef;
  }
  
  getScenario(name) {
    return this.scenarios[name];
  }
  
  getAllScenarios() {
    return Object.keys(this.scenarios);
  }
}

// Export everything
module.exports = {
  Model,
  Element,
  Component,
  Connector,
  Connection,
  Port,
  SimplePort,
  CompositePort,
  Activity,
  Action,
  BehavioralElement,
  Constraint,
  Executable,
  Enum,
  // Environment and Scenario classes
  Entity,
  Event,
  events,
  eventClasses,
  Scene,
  Scenario,
  EnvironmentDefinition,
  EnvironmentConfiguration,
  ScenarioExecution,
  EventsDefinitions,
  SceneDefinitions,
  ScenarioDefinitions,
  // Event system
  EventSystemManager,
  eventSystemManager,
  // Built-in primitive types
  Int,
  Boolean: SysADLBoolean,
  String: SysADLString,
  Void,
  Real,
  // Type system
  ValueType,
  DataType,
  Dimension,
  Unit,
  // Factory functions
  valueType,
  dataType,
  dimension,
  unit
};

/**
 * Expression Evaluator for SysADL Conditions
 * Generic evaluator that handles parsing and evaluation of complex SysADL expressions
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
   * Examples: "agv1.sensor", "stationA.ID", "part.location"
   */
  resolvePropertyPath(path, state) {
    const parts = path.split('.');
    let current = state;

    for (const part of parts) {
      if (current === null || current === undefined) {
        throw new Error(`Cannot access property "${part}" of null/undefined in path "${path}"`);
      }

      if (typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        throw new Error(`Property "${part}" not found in path "${path}"`);
      }
    }

    return current;
  }
}

// Generic SysADL Runtime Helpers
class SysADLRuntimeHelpers {
  constructor(context) {
    this.context = context;
  }

  /**
   * Generic entity property setter with nested support
   * @param {string} entityName - Name of the entity
   * @param {string} propertyPath - Property path (e.g., 'outCommand.destination')
   * @param {any} value - Value to set
   */
  setEntityProperty(entityName, propertyPath, value) {
    if (!this.context.entities?.[entityName]) {
      if (this.context.sysadlBase?.logger) {
        this.context.sysadlBase.logger.warn(`⚠️ Entity ${entityName} not found`);
      }
      return false;
    }

    const entity = this.context.entities[entityName];
    const pathParts = propertyPath.split('.');
    let obj = entity;

    // Navigate to nested property, creating objects as needed
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!obj[pathParts[i]] || typeof obj[pathParts[i]] !== 'object') {
        obj[pathParts[i]] = {};
      }
      obj = obj[pathParts[i]];
    }

    // Set final property
    const finalProp = pathParts[pathParts.length - 1];
    obj[finalProp] = value;

    // Use Entity's setNestedProperty if available
    if (typeof entity.setNestedProperty === 'function') {
      entity.setNestedProperty(propertyPath, value);
    }

    return true;
  }

  /**
   * Generic connection executor
   * @param {string} connectionType - Type of connection (e.g., 'Command', 'Notify')
   * @param {string} fromEntity - Source entity name
   * @param {string} toEntity - Target entity name
   */
  executeConnection(connectionType, fromEntity, toEntity) {
    if (!this.context.environment?.connections) {
      if (this.context.sysadlBase?.logger) {
        this.context.sysadlBase.logger.warn('⚠️ Environment or connections not available');
      }
      return false;
    }

    const ConnectionClass = this.context.environment.connections.find(c => c.name === connectionType);
    if (!ConnectionClass) {
      if (this.context.sysadlBase?.logger) {
        this.context.sysadlBase.logger.warn(`⚠️ Connection class ${connectionType} not found`);
      }
      return false;
    }

    const connectionInstance = new ConnectionClass();
    const fromEntityInstance = this.context.entities?.[fromEntity];
    const toEntityInstance = this.context.entities?.[toEntity];

    if (!fromEntityInstance || !toEntityInstance) {
      if (this.context.sysadlBase?.logger) {
        this.context.sysadlBase.logger.warn(`⚠️ Connection ${connectionType}: entities not found:`, fromEntity, toEntity);
      }
      return false;
    }

    if (this.context.sysadlBase?.logger) {
      this.context.sysadlBase.logger.log(`🔗 Executing connection ${connectionInstance.connectionType} from ${fromEntity} to ${toEntity}`);
    }

    // Execute message passing
    if (connectionInstance.from && connectionInstance.to) {
      const fromRole = connectionInstance.from.split('.')[1];
      const toRole = connectionInstance.to.split('.')[1];

      if (this.context.sysadlBase?.logger) {
        this.context.sysadlBase.logger.log(`📨 Message flow: ${fromEntity}.${fromRole} -> ${toEntity}.${toRole}`);
      }

      if (typeof toEntityInstance.receiveMessage === 'function') {
        toEntityInstance.receiveMessage(fromEntity, fromRole, this.context);
      }

      if (typeof this.context.onConnectionExecuted === 'function') {
        this.context.onConnectionExecuted(connectionInstance, fromEntity, toEntity, this.context);
      }
    }

    return true;
  }
}

// Export ExpressionEvaluator
module.exports.ExpressionEvaluator = ExpressionEvaluator;

// Export all components
const sysadlExports = {
  // Core classes
  Model, Component, Port, SimplePort, CompositePort, Connector, Activity, Action, 
  Enum, Int, Boolean, String, Real, Void, valueType, dataType, dimension, unit, Constraint, Executable,
  
  // Elements
  Element, 
  
  // Environment & Scenario classes
  EnvironmentDefinition, EnvironmentConfiguration, Entity, Event, Scene, Scenario, 
  ScenarioExecution, EventsDefinitions, SceneDefinitions, ScenarioDefinitions, Connection,
  
  // Runtime helpers
  SysADLRuntimeHelpers,
  
  // Phase 4 Components
  ExecutionLogger, EventInjector, SceneExecutor,
  
  // Phase 5 & 6 Components
  ScenarioExecutor, ExecutionController, ReactiveStateManager, ReactiveConditionWatcher,
  
  // Event system
  EventSystemManager: EventSystemManager
};

// Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  Object.assign(module.exports, sysadlExports);
}

// Browser environment
if (typeof window !== 'undefined') {
  window.SysADLBase = sysadlExports;
}

})(); // End IIFE

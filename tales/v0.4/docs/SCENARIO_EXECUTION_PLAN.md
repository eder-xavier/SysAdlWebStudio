# SysADL Scenario Execution Implementation Plan
## Complete Generic Framework with Automatic Logging

### Overview
This plan implements a complete scenario execution framework for SysADL that is **domain-agnostic** and works for any system type (AGV, RTC, IoT, etc.). The framework includes automatic comprehensive logging of all SysADL element executions.

---

## Phase 1: Generic Architecture Design (Days 1-3)

### Core Principles
- **Domain Agnostic**: All components work for any SysADL model
- **Generic Interfaces**: No domain-specific implementations in core framework
- **Automatic Logging**: Comprehensive execution tracking without manual intervention
- **All Messages in English**: System outputs, logs, and error messages

### Architecture Components

```javascript
// SysADLBase.js - Generic Framework
class SysADLBase {
  constructor(modelName, configuration) {
    this.logger = new ExecutionLogger(modelName);
    this.conditionWatcher = new ReactiveConditionWatcher(this);
    this.stateManager = new StateManager(this);
    this.eventInjector = new EventInjector(this);
    this.sceneExecutor = new SceneExecutor(this);
    this.scenarioExecutor = new ScenarioExecutor(this);
    this.executionController = new ExecutionController(this);
  }

  // Generic event injection - works for any domain
  injectEvent(eventName, parameters, timestamp = null) {
    return this.eventInjector.inject(eventName, parameters, timestamp);
  }

  // Generic state update - works for any entity
  updateEntityState(entityPath, property, newValue) {
    return this.stateManager.updateState(entityPath, property, newValue);
  }

  // Generic physics simulation - domain-specific logic provided via callbacks
  simulatePhysics(deltaTime, physicsCallback = null) {
    if (physicsCallback) {
      return physicsCallback(deltaTime, this.stateManager.getCurrentState());
    }
    // Default: no physics simulation
    return this.stateManager.getCurrentState();
  }
}

// Domain-Specific Extension (Optional)
class AGVDomainExtension {
  static getPhysicsCallback() {
    return (deltaTime, currentState) => {
      // AGV-specific movement physics
      // Returns updated state
    };
  }
}
```

### File Structure
```
/tales/v0.4/
├── sysadl-framework/
│   ├── SysADLBase.js              # Generic framework
│   ├── ExecutionLogger.js         # Automatic logging system
│   ├── ReactiveConditionWatcher.js # Event-driven passive conditions monitoring
│   ├── ExpressionEvaluator.js     # Generic expression evaluation
│   ├── ReactiveStateManager.js    # Reactive state management
│   ├── DependencyTracker.js       # Dependency analysis
│   ├── StateManager.js            # Generic state management
│   ├── EventInjector.js           # Generic event injection
│   ├── SceneExecutor.js           # Scene execution engine
│   ├── ScenarioExecutor.js        # Scenario execution engine
│   └── ExecutionController.js     # Master controller
├── domain-extensions/
│   ├── AGVExtension.js            # AGV-specific physics (optional)
│   └── RTCExtension.js            # RTC-specific physics (optional)
└── generated/
    └── AGV-completo-scenario.js   # Generated scenario execution
```

---

## Phase 2: Automatic Execution Logger (Days 4-5)

### Comprehensive Logging System

```javascript
class ExecutionLogger {
  constructor(modelName) {
    this.modelName = modelName;
    this.executionLog = [];
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
  }

  // Automatically log every SysADL element execution
  logExecution(elementInfo) {
    const logEntry = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      executionTime: Date.now() - this.startTime,
      elementType: elementInfo.type,        // 'event', 'scene', 'scenario', 'condition'
      elementName: elementInfo.name,
      elementPath: elementInfo.path,        // Full SysADL path
      
      // State information
      initialState: elementInfo.initialState,
      finalState: elementInfo.finalState,
      stateChanges: elementInfo.stateChanges,
      
      // Execution context
      triggerEvent: elementInfo.trigger,
      executionResult: elementInfo.result,  // 'success', 'failure', 'timeout'
      executionDuration: elementInfo.duration,
      
      // Conditions and validations
      preConditions: elementInfo.preConditions,
      postConditions: elementInfo.postConditions,
      conditionResults: elementInfo.conditionResults,
      
      // Event chain information
      parentExecution: elementInfo.parent,
      childExecutions: elementInfo.children,
      eventChain: elementInfo.eventChain,
      
      // Error information (if any)
      errors: elementInfo.errors,
      warnings: elementInfo.warnings,
      
      // Performance metrics
      memoryUsage: process.memoryUsage(),
      cpuTime: process.cpuUsage()
    };

    this.executionLog.push(logEntry);
    this.writeToFile(logEntry);
    
    // Console output for real-time monitoring
    console.log(`[${this.formatTimestamp(logEntry.timestamp)}] Executed: ${elementInfo.type}:${elementInfo.name} -> ${elementInfo.result}`);
  }

  // Generate detailed execution report
  generateReport() {
    return {
      sessionInfo: {
        modelName: this.modelName,
        sessionId: this.sessionId,
        startTime: this.startTime,
        endTime: Date.now(),
        totalDuration: Date.now() - this.startTime,
        totalExecutions: this.executionLog.length
      },
      
      executionSummary: {
        byElementType: this.groupByElementType(),
        byResult: this.groupByResult(),
        performanceMetrics: this.calculatePerformanceMetrics(),
        errorSummary: this.extractErrors()
      },
      
      detailedLog: this.executionLog,
      
      analysisRecommendations: this.generateRecommendations()
    };
  }
}
```

### Log Output Format
```json
{
  "sessionId": "AGV-20250921-143022-abc123",
  "timestamp": 1695304622000,
  "executionTime": 1250,
  "elementType": "event",
  "elementName": "AGV1NotifArriveA",
  "elementPath": "MyEvents.AGV1Events.AGV1NotifArriveA",
  "initialState": {
    "agv1.location": "stationB.ID",
    "agv1.outNotification.notification": null
  },
  "finalState": {
    "agv1.location": "stationA.ID", 
    "agv1.outNotification.notification": "arrived"
  },
  "stateChanges": [
    {
      "entity": "agv1",
      "property": "location",
      "from": "stationB.ID",
      "to": "stationA.ID"
    }
  ],
  "triggerEvent": "AGV1locationStationA",
  "executionResult": "success",
  "executionDuration": 45,
  "eventChain": ["cmdAGV1toA", "AGV1NotifTravelA", "AGV1locationStationA", "AGV1NotifArriveA"],
  "errors": [],
  "warnings": []
}
```

---

## Phase 3: Generic Passive Conditions System (Days 6-8)

### Critical Issue Resolution
The passive conditions like `agv1.sensor == stationA` currently break event flow because they have no active triggering mechanism.

```javascript
class ReactiveConditionWatcher {
  constructor(sysadlBase) {
    this.sysadlBase = sysadlBase;
    this.watchedConditions = new Map();
    this.conditionCallbacks = new Map();
    this.evaluationInterval = 100; // ms
    this.isActive = false;
  }

  // Register any condition for monitoring - completely generic
  watchCondition(conditionId, conditionExpression, callback) {
    this.sysadlBase.logger.logExecution({
      type: 'condition_registration',
      name: conditionId,
      path: `ReactiveConditionWatcher.${conditionId}`,
      initialState: { expression: conditionExpression, active: false },
      result: 'registered'
    });

    this.watchedConditions.set(conditionId, {
      expression: conditionExpression,
      lastValue: null,
      evaluationCount: 0,
      triggeredCount: 0
    });
    
    this.conditionCallbacks.set(conditionId, callback);
  }

  // Generic condition evaluation - works for any expression
  evaluateCondition(expression, currentState) {
    try {
      // Parse and evaluate expression in context of current state
      const result = this.parseAndEvaluate(expression, currentState);
      return result;
    } catch (error) {
      this.sysadlBase.logger.logExecution({
        type: 'condition_evaluation',
        name: expression,
        result: 'error',
        errors: [error.message]
      });
      return false;
    }
  }

  // Start continuous monitoring
  startWatching() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.watchInterval = setInterval(() => {
      this.evaluateAllConditions();
    }, this.evaluationInterval);

    console.log('Condition monitoring started - watching for passive conditions');
  }

  // Evaluate all registered conditions
  evaluateAllConditions() {
    const currentState = this.sysadlBase.stateManager.getCurrentState();
    
    for (const [conditionId, condition] of this.watchedConditions) {
      const currentValue = this.evaluateCondition(condition.expression, currentState);
      
      // Trigger callback on condition change (false -> true)
      if (currentValue === true && condition.lastValue !== true) {
        this.triggerCondition(conditionId, currentState);
      }
      
      condition.lastValue = currentValue;
      condition.evaluationCount++;
    }
  }

  // Generic condition parser - handles any SysADL expression
  parseAndEvaluate(expression, state) {
    // Examples:
    // "agv1.sensor == stationA" -> state.agv1.sensor === state.stationA.signal
    // "temperature >= 25.0" -> state.temperature >= 25.0
    // "vehicle1.location == stationB.ID" -> state.vehicle1.location === state.stationB.ID
    
    return this.expressionEvaluator.evaluate(expression, state);
  }
}
```

---

## Phase 4: Scene Execution Engine (Days 9-11)

```javascript
class SceneExecutor {
  constructor(sysadlBase) {
    this.sysadlBase = sysadlBase;
    this.activeScenes = new Map();
    this.sceneDefinitions = new Map();
  }

  // Execute scene with full logging and validation
  async executeScene(sceneName, initialState = null) {
    const startTime = Date.now();
    const scene = this.sceneDefinitions.get(sceneName);
    
    if (!scene) {
      throw new Error(`Scene not found: ${sceneName}`);
    }

    // Log scene start
    this.sysadlBase.logger.logExecution({
      type: 'scene',
      name: sceneName,
      path: `Scenes.${sceneName}`,
      initialState: this.sysadlBase.stateManager.getCurrentState(),
      result: 'started',
      preConditions: scene.preConditions
    });

    try {
      // 1. Validate pre-conditions
      await this.validatePreConditions(scene, sceneName);
      
      // 2. Execute start event
      await this.executeStartEvent(scene, sceneName);
      
      // 3. Wait for finish event
      await this.waitForFinishEvent(scene, sceneName);
      
      // 4. Validate post-conditions
      await this.validatePostConditions(scene, sceneName);

      // Log successful completion
      this.sysadlBase.logger.logExecution({
        type: 'scene',
        name: sceneName,
        path: `Scenes.${sceneName}`,
        finalState: this.sysadlBase.stateManager.getCurrentState(),
        result: 'success',
        executionDuration: Date.now() - startTime,
        postConditions: scene.postConditions
      });

      return { success: true, duration: Date.now() - startTime };

    } catch (error) {
      // Log failure
      this.sysadlBase.logger.logExecution({
        type: 'scene',
        name: sceneName,
        result: 'failure',
        errors: [error.message],
        executionDuration: Date.now() - startTime
      });
      
      throw error;
    }
  }
}
```

---

## Phase 5: Scenario Execution Engine (Days 12-14)

```javascript
class ScenarioExecutor {
  constructor(sysadlBase) {
    this.sysadlBase = sysadlBase;
    this.scenarioDefinitions = new Map();
    this.executionStack = [];
    this.variables = new Map();
  }

  // Execute scenario with programming structures support
  async executeScenario(scenarioName, context = {}) {
    const startTime = Date.now();
    
    this.sysadlBase.logger.logExecution({
      type: 'scenario',
      name: scenarioName,
      path: `Scenarios.${scenarioName}`,
      initialState: this.sysadlBase.stateManager.getCurrentState(),
      result: 'started'
    });

    try {
      const scenario = this.scenarioDefinitions.get(scenarioName);
      
      // Execute scenario body with programming structures
      await this.executeScenarioBody(scenario, scenarioName, context);

      this.sysadlBase.logger.logExecution({
        type: 'scenario',
        name: scenarioName,
        result: 'success',
        executionDuration: Date.now() - startTime,
        finalState: this.sysadlBase.stateManager.getCurrentState()
      });

      return { success: true };

    } catch (error) {
      this.sysadlBase.logger.logExecution({
        type: 'scenario',
        name: scenarioName,
        result: 'failure',
        errors: [error.message],
        executionDuration: Date.now() - startTime
      });
      
      throw error;
    }
  }

  // Programming structures interpreter
  async executeScenarioBody(scenario, scenarioName, context) {
    for (const statement of scenario.statements) {
      switch (statement.type) {
        case 'scene_call':
          await this.sysadlBase.sceneExecutor.executeScene(statement.sceneName);
          break;
          
        case 'scenario_call':
          await this.executeScenario(statement.scenarioName, context);
          break;
          
        case 'while_loop':
          await this.executeWhileLoop(statement, context);
          break;
          
        case 'for_loop':
          await this.executeForLoop(statement, context);
          break;
          
        case 'variable_declaration':
          this.declareVariable(statement.name, statement.value, context);
          break;
          
        case 'conditional':
          await this.executeConditional(statement, context);
          break;
      }
    }
  }
}
```

---

## Phase 6: Master Execution Controller (Days 15-17)

```javascript
class ExecutionController {
  constructor(sysadlBase) {
    this.sysadlBase = sysadlBase;
    this.executionConfig = {};
    this.simulationControl = {
      speed: 1.0,
      isPaused: false,
      stepMode: false,
      checkpoints: []
    };
  }

  // Execute complete ScenarioExecution block
  async executeScenarioExecution(executionConfig) {
    console.log(`Starting scenario execution: ${executionConfig.name || 'Unnamed'}`);
    
    try {
      // 1. Initialize environment state
      await this.initializeState(executionConfig.initialState);
      
      // 2. Start passive condition monitoring
      this.sysadlBase.conditionWatcher.startWatching();
      
      // 3. Execute all scenarios in sequence
      for (const scenarioCall of executionConfig.scenarios) {
        await this.executeScenarioCall(scenarioCall);
      }
      
      // 4. Generate final execution report
      const report = this.sysadlBase.logger.generateReport();
      
      console.log('Scenario execution completed successfully');
      console.log(`Total execution time: ${report.sessionInfo.totalDuration}ms`);
      console.log(`Total elements executed: ${report.sessionInfo.totalExecutions}`);
      
      return report;

    } catch (error) {
      console.error(`Scenario execution failed: ${error.message}`);
      throw error;
    }
  }

  // Execute individual scenario call with extensions
  async executeScenarioCall(scenarioCall) {
    const callConfig = this.parseScenarioCall(scenarioCall);
    
    // Handle extensions
    if (callConfig.repeat) {
      for (let i = 0; i < callConfig.repeat; i++) {
        console.log(`Executing ${callConfig.scenarioName} (iteration ${i + 1}/${callConfig.repeat})`);
        await this.sysadlBase.scenarioExecutor.executeScenario(callConfig.scenarioName);
      }
    } else {
      await this.sysadlBase.scenarioExecutor.executeScenario(callConfig.scenarioName);
    }
  }
}
```

---

## Complete Implementation Timeline

| Phase | Days | Component | Status |
|-------|------|-----------|---------|
| 1 | 1-3 | Generic Architecture Design | Planning |
| 2 | 4-5 | Automatic Execution Logger | Planning |
| 3 | 6-8 | Passive Conditions System | **Critical Priority** |
| 4 | 9-11 | Scene Execution Engine | Planning |
| 5 | 12-14 | Scenario Execution Engine | Planning |
| 6 | 15-17 | Master Execution Controller | Planning |
| 7 | 18-19 | Integration & Testing | Planning |
| 8 | 20-21 | Documentation & Validation | Planning |

---

## Example Generated Output

```javascript
// Generated: AGV-completo-scenario.js
const sysadl = new SysADLBase('AGV-completo', agvConfiguration);

// Initialize domain-specific physics (optional)
const agvPhysics = AGVExtension.getPhysicsCallback();

// Execute scenarios
sysadl.executeScenarioExecution({
  name: 'AGV Factory Automation',
  initialState: {
    'agv1.location': 'stationC.ID',
    'agv2.location': 'stationD.ID',
    'part.location': 'stationA.ID'
  },
  scenarios: [
    'Scenario1',
    'Scenario2', 
    'Scenario3',
    'repeat 5 Scenario1'
  ],
  extensions: {
    simulation: { speed: 1.0 },
    logging: { level: 'detailed' },
    physics: agvPhysics
  }
});
```

### Automatic Log Output
```
[2025-09-21 14:30:22] Starting scenario execution: AGV Factory Automation
[2025-09-21 14:30:22] Condition monitoring started - watching for passive conditions
[2025-09-21 14:30:22] Executed: scenario:Scenario1 -> started
[2025-09-21 14:30:22] Executed: scene:SCN_MoveAGV1toA -> started
[2025-09-21 14:30:22] Executed: event:cmdSupervisor -> success
[2025-09-21 14:30:23] Executed: condition:agv1.sensor == stationA -> triggered
[2025-09-21 14:30:23] Executed: event:AGV1NotifArriveA -> success
[2025-09-21 14:30:23] Executed: scene:SCN_MoveAGV1toA -> success
[2025-09-21 14:30:23] Executed: scenario:Scenario1 -> success
[2025-09-21 14:30:23] Scenario execution completed successfully
[2025-09-21 14:30:23] Total execution time: 1250ms
[2025-09-21 14:30:23] Total elements executed: 47
```

---

## Key Corrections Applied

1. **Generic Architecture**: SysADLBase.js is completely domain-agnostic
2. **No Domain-Specific Core**: AGV logic is in optional extensions only
3. **Automatic Comprehensive Logging**: Every SysADL element execution is automatically logged
4. **All Messages in English**: System outputs, logs, and documentation
5. **Passive Conditions Resolution**: Reactive system monitors any expression using event-driven updates
6. **Generic Event Injection**: Works for any domain without specific implementations

This plan provides a complete, generic, and comprehensive framework for SysADL scenario execution with automatic detailed logging of all executions.
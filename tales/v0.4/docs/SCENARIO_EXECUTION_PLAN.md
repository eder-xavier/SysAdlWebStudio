# 🎯 PLANO COMPLETO DE IMPLEMENTAÇÃO SYSADL

## **RESUMO EXECUTIVO**

**Objetivo:** Implementar completamente a hierarquia SysADL: ScenarioExecution → Scenarios → Scenes → Events com suporte a estruturas de programação, Event Injection e framework reativo.

**Status Atual:** Framework base 80% completo, faltam implementações específicas para parsing e code generation da hierarquia individual.

**Duração Estimada:** 6 fases, ~3-4 semanas de desenvolvimento

**Data de Início:** 23 de setembro de 2025

---

## **🏗️ ARQUITETURA ATUAL - O QUE JÁ TEMOS**

### ✅ **Framework Completo Implementado:**
- `EventInjector` - Injeção de eventos single, batch, scheduling, queuing
- `ScenarioExecutor` - Execução de cenários com estruturas de programação
- `ExecutionController` - Controlador mestre de execução
- `ReactiveStateManager` & `ReactiveConditionWatcher` - Sistema reativo
- `SceneExecutor` - Execução de cenas individuais
- Classes base: `Scene`, `Scenario`, `ScenarioExecution`, `EventsDefinitions`

### ❌ **O que FALTA implementar:**
- Parser para Scene/Scenario/ScenarioExecution individuais
- Code generation para implementações específicas
- Integração Event Injection com syntax SysADL
- Estruturas de programação SysADL (while, for, let, if)
- Validation framework para pre/post-conditions

---

## **🔧 FASE 1: PARSER FOUNDATION (Semana 1)**
**Prioridade: CRÍTICA** - Base para tudo

### 1.1 **Scene Individual Parser**
**Status:** 🔴 Not Started
**Arquivos:** `sysadl-parser.js`, `sysadl.peg`

**Implementar:**
```javascript
// Target syntax to parse:
Scene def SCN_MoveAGV1toA on { 
  pre-condition {
    agv1.location == stationC.ID;
    part.location == stationA.ID; }
  start cmdSupervisor;
  finish AGV1NotifArriveA;
  post-condition {
    agv1.location == stationA.ID;
    part.location == stationA.ID; }
}
```

**Estrutura AST necessária:**
```javascript
{
  type: 'SceneDefinition',
  name: 'SCN_MoveAGV1toA',
  preConditions: [
    { type: 'Condition', expression: 'agv1.location == stationC.ID' },
    { type: 'Condition', expression: 'part.location == stationA.ID' }
  ],
  startEvent: 'cmdSupervisor',
  finishEvent: 'AGV1NotifArriveA',
  postConditions: [
    { type: 'Condition', expression: 'agv1.location == stationA.ID' },
    { type: 'Condition', expression: 'part.location == stationA.ID' }
  ]
}
```

### 1.2 **Scenario Individual Parser**  
**Status:** 🔴 Not Started
**Arquivos:** `sysadl-parser.js`, `sysadl.peg`

**Implementar:**
```javascript
// Target syntax to parse:
Scenario def Scenario3 {
  let i: Integer = 1;
  while (i < 5) {
    SCN_MoveAGV1toA;
    SCN_AGV1movePartToC;
    i++;
  }
}
```

**Estrutura AST necessária:**
```javascript
{
  type: 'ScenarioDefinition',
  name: 'Scenario3',
  statements: [
    { 
      type: 'VariableDeclaration', 
      name: 'i', 
      dataType: 'Integer', 
      initialValue: 1 
    },
    {
      type: 'WhileStatement',
      condition: 'i < 5',
      body: [
        { type: 'SceneCall', name: 'SCN_MoveAGV1toA' },
        { type: 'SceneCall', name: 'SCN_AGV1movePartToC' },
        { type: 'Assignment', target: 'i', operation: '++' }
      ]
    }
  ]
}
```

### 1.3 **ScenarioExecution Complete Parser**
**Status:** 🔴 Not Started
**Arquivos:** `sysadl-parser.js`, `sysadl.peg`

**Implementar:**
```javascript
// Target syntax to parse:
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  
  // Event Injection syntax
  inject sensorFailure after 5000ms;
  inject emergencyStop when agv1.speed > maxSpeed;
  inject_batch [testEvent1, testEvent2] parallel;
  
  Scenario1;
  
  inject obstacleDetected before Scenario2;
  
  Scenario2;
  repeat 5 Scenario1;
}
```

**Estrutura AST necessária:**
```javascript
{
  type: 'ScenarioExecution',
  targetScenarios: 'MyScenarios',
  statements: [
    { type: 'StateInitialization', target: 'agv1.location', value: 'stationC.ID' },
    { type: 'StateInitialization', target: 'agv2.location', value: 'stationD.ID' },
    { 
      type: 'EventInjection', 
      eventName: 'sensorFailure', 
      timing: { type: 'delay', value: 5000 }
    },
    { 
      type: 'EventInjection', 
      eventName: 'emergencyStop', 
      timing: { type: 'condition', expression: 'agv1.speed > maxSpeed' }
    },
    {
      type: 'EventInjectionBatch',
      events: ['testEvent1', 'testEvent2'],
      mode: 'parallel'
    },
    { type: 'ScenarioCall', name: 'Scenario1' },
    { 
      type: 'EventInjection', 
      eventName: 'obstacleDetected', 
      timing: { type: 'before', target: 'Scenario2' }
    },
    { type: 'ScenarioCall', name: 'Scenario2' },
    { type: 'RepeatStatement', target: 'Scenario1', count: 5 }
  ]
}
```

---

## **⚙️ FASE 2: CODE GENERATION (Semana 1-2)**
**Prioridade: CRÍTICA** - Implementação core

### 2.1 **Scene Implementation Generator**
**Status:** 🔴 Not Started
**Arquivos:** `transformer.js`

**Implementar geração JavaScript:**
```javascript
// Generated Scene class
class SCN_MoveAGV1toA extends Scene {
  constructor(name = 'SCN_MoveAGV1toA', opts = {}) {
    super(name, {
      ...opts,
      sceneType: 'scene',
      startEvent: 'cmdSupervisor',
      finishEvent: 'AGV1NotifArriveA',
      preConditions: [
        () => this.validateCondition('agv1.location == stationC.ID'),
        () => this.validateCondition('part.location == stationA.ID')
      ],
      postConditions: [
        () => this.validateCondition('agv1.location == stationA.ID'),
        () => this.validateCondition('part.location == stationA.ID')
      ]
    });
  }

  async execute() {
    // Pre-condition validation
    if (!await this.validatePreConditions()) {
      throw new Error('Pre-conditions not met for SCN_MoveAGV1toA');
    }

    // Execute start event
    await this.triggerStartEvent();

    // Wait for finish event
    await this.waitForFinishEvent();

    // Post-condition validation
    if (!await this.validatePostConditions()) {
      throw new Error('Post-conditions not met for SCN_MoveAGV1toA');
    }

    return { success: true, scene: 'SCN_MoveAGV1toA' };
  }
}
```

### 2.2 **Scenario Implementation Generator**
**Status:** 🔴 Not Started
**Arquivos:** `transformer.js`

**Implementar geração JavaScript:**
```javascript
// Generated Scenario class
class Scenario3 extends Scenario {
  constructor(name = 'Scenario3', opts = {}) {
    super(name, {
      ...opts,
      scenarioType: 'scenario',
      scenes: ['SCN_MoveAGV1toA', 'SCN_AGV1movePartToC']
    });
  }

  async execute() {
    // Variable declarations
    let i = 1;

    // While loop implementation
    while (i < 5) {
      // Execute scenes
      await this.executeScene('SCN_MoveAGV1toA');
      await this.executeScene('SCN_AGV1movePartToC');
      
      // Increment variable
      i++;
    }

    return { success: true, scenario: 'Scenario3', iterations: i - 1 };
  }
}
```

### 2.3 **ScenarioExecution Implementation Generator**
**Status:** 🔴 Not Started
**Arquivos:** `transformer.js`

**Implementar geração JavaScript:**
```javascript
// Generated ScenarioExecution class
class MyScenariosExecution extends ScenarioExecution {
  constructor(name = 'MyScenariosExecution', opts = {}) {
    super(name, {
      ...opts,
      targetScenarios: 'MyScenarios',
      executionMode: 'sequential'
    });
  }

  async execute() {
    // State initializations
    this.setState('agv1.location', 'stationC.ID');
    this.setState('agv2.location', 'stationD.ID');

    // Event injections
    await this.scheduleEventInjection('sensorFailure', {}, 5000);
    await this.setupConditionalEventInjection('emergencyStop', 'agv1.speed > maxSpeed');
    await this.scheduleBatchEventInjection(['testEvent1', 'testEvent2'], 'parallel');

    // Execute scenarios
    await this.executeScenario('Scenario1');
    
    await this.injectEventBefore('obstacleDetected', 'Scenario2');
    await this.executeScenario('Scenario2');
    
    // Repeat execution
    await this.repeatScenario('Scenario1', 5);

    return { success: true, execution: 'MyScenariosExecution' };
  }
}
```

---

## **🚀 FASE 3: INTEGRATION (Semana 2)**
**Prioridade: ALTA** - Conectar componentes

### 3.1 **Event Injection Integration**
**Status:** 🔴 Not Started
**Arquivos:** `transformer.js`, `ScenarioExecutor.js`

**Implementar métodos de integração:**
```javascript
// Em ScenarioExecution generated classes
async scheduleEventInjection(eventName, parameters = {}, delay = 0) {
  return await this.sysadlBase.eventInjector.injectEvent(
    eventName, parameters, delay
  );
}

async setupConditionalEventInjection(eventName, condition) {
  return await this.sysadlBase.conditionWatcher.watchCondition(
    condition,
    () => this.sysadlBase.eventInjector.injectEvent(eventName)
  );
}

async scheduleBatchEventInjection(events, mode = 'sequential') {
  const eventSpecs = events.map(event => ({ eventName: event }));
  return await this.sysadlBase.eventInjector.injectEventBatch(
    eventSpecs, { parallel: mode === 'parallel' }
  );
}
```

### 3.2 **Reactive Framework Integration**
**Status:** 🔴 Not Started
**Arquivos:** `Scene.js`, `ReactiveConditionWatcher.js`

**Implementar integração com conditions:**
```javascript
// Em Scene generated classes
async validateCondition(conditionExpression) {
  return await this.sysadlBase.conditionWatcher.evaluateCondition(
    conditionExpression
  );
}

async validatePreConditions() {
  for (const condition of this.preConditions) {
    if (!await condition()) {
      return false;
    }
  }
  return true;
}

async validatePostConditions() {
  for (const condition of this.postConditions) {
    if (!await condition()) {
      return false;
    }
  }
  return true;
}
```

---

## **🏗️ FASE 4: ADVANCED FEATURES (Semana 2-3)**
**Prioridade: MÉDIA** - Features avançadas

### 4.1 **Programming Structures Implementation**
**Status:** 🔴 Not Started
**Arquivos:** `ScenarioExecutor.js`

**Implementar estruturas de controle:**
```javascript
// Suporte genérico para estruturas de programação
async executeWhileLoop(condition, body, context) {
  while (await this.evaluateCondition(condition, context)) {
    await this.executeStatementBlock(body, context);
  }
}

async executeForLoop(init, condition, increment, body, context) {
  await this.executeStatement(init, context);
  while (await this.evaluateCondition(condition, context)) {
    await this.executeStatementBlock(body, context);
    await this.executeStatement(increment, context);
  }
}

async executeIfStatement(condition, thenBlock, elseBlock, context) {
  if (await this.evaluateCondition(condition, context)) {
    await this.executeStatementBlock(thenBlock, context);
  } else if (elseBlock) {
    await this.executeStatementBlock(elseBlock, context);
  }
}
```

### 4.2 **Validation Framework**
**Status:** 🔴 Not Started
**Arquivos:** `EventInjector.js`, `ValidationFramework.js`

**Implementar validação de Event Injection:**
```javascript
class ValidationFramework {
  async validateEventInjection(eventName, parameters, context) {
    // Verificar se evento existe
    if (!this.isEventAvailable(eventName)) {
      throw new Error(`Event ${eventName} not available`);
    }

    // Verificar parâmetros obrigatórios
    const definition = this.getEventDefinition(eventName);
    for (const required of definition.required) {
      if (!(required in parameters)) {
        throw new Error(`Required parameter ${required} missing for event ${eventName}`);
      }
    }

    // Verificar pre-conditions
    if (context.currentScene) {
      const sceneConditions = context.currentScene.preConditions;
      for (const condition of sceneConditions) {
        if (!await condition()) {
          throw new Error(`Scene pre-conditions not met for event injection`);
        }
      }
    }

    return true;
  }
}
```

---

## **🧪 FASE 5: TESTING & INTEGRATION (Semana 3)**
**Prioridade: ALTA** - Validação completa

### 5.1 **Unit Testing**
**Status:** 🔴 Not Started
**Arquivos:** `test/scene-parser.test.js`, `test/scenario-parser.test.js`, etc.

**Criar testes para:**
- Scene individual parsing e code generation
- Scenario individual parsing e code generation  
- ScenarioExecution parsing e code generation
- Event injection integration
- Programming structures execution
- Validation framework

### 5.2 **Integration Testing**
**Status:** 🔴 Not Started
**Arquivos:** `test/integration/complete-hierarchy.test.js`

**Testar execução completa:**
```javascript
describe('Complete SysADL Hierarchy Execution', () => {
  test('ScenarioExecution → Scenarios → Scenes → Events', async () => {
    const model = await createAGVModel();
    
    // Test complete execution chain
    const execution = model.scenarioExecutions['MyScenariosExecution'];
    const result = await execution.execute();
    
    expect(result.success).toBe(true);
    expect(result.scenariosExecuted).toBeGreaterThan(0);
    expect(result.scenesExecuted).toBeGreaterThan(0);
    expect(result.eventsTriggered).toBeGreaterThan(0);
  });
});
```

---

## **📚 FASE 6: FINALIZATION (Semana 4)**
**Prioridade: BAIXA** - Polimento

### 6.1 **Documentation & Examples**
**Status:** 🔴 Not Started
**Arquivos:** `docs/`, `examples/`

**Criar documentação completa:**
- API documentation para todas as novas features
- Usage examples para Scene/Scenario/ScenarioExecution
- Event Injection patterns e best practices
- Programming structures guide
- Integration patterns documentation

### 6.2 **Performance Optimization**
**Status:** 🔴 Not Started
**Arquivos:** Performance profiling de todos os componentes

**Otimizar:**
- ScenarioExecutor memory usage
- ReactiveConditionWatcher evaluation speed
- EventInjector batch processing
- Event processing pipeline
- Condition evaluation caching

---

## **🎯 DEPENDÊNCIAS E ORDEM DE EXECUÇÃO**

```
FASE 1: Parser Foundation
├── 1.1 Scene Parser → 1.2 Scenario Parser → 1.3 ScenarioExecution Parser
│
FASE 2: Code Generation  
├── 2.1 Scene Generation (depends on 1.1)
├── 2.2 Scenario Generation (depends on 1.2)  
├── 2.3 ScenarioExecution Generation (depends on 1.3)
│
FASE 3: Integration
├── 3.1 Event Injection Integration (depends on 2.3)
├── 3.2 Reactive Framework Integration (depends on 2.1)
│
FASE 4: Advanced Features
├── 4.1 Programming Structures (depends on 2.2)
├── 4.2 Validation Framework (depends on 3.1)
│
FASE 5: Testing
├── 5.1 Unit Tests (depends on all previous phases)
├── 5.2 Integration Tests (depends on all previous phases)
│
FASE 6: Finalization
├── 6.1 Documentation (depends on 5.*)
├── 6.2 Performance (depends on 5.*)
```

---

## **🚦 CRITÉRIOS DE SUCESSO**

### **Milestone 1 (Final Semana 1):** Parser Foundation Complete
- ✅ Scene individual parsing working e testado
- ✅ Scenario individual parsing working e testado
- ✅ ScenarioExecution parsing working e testado
- ✅ Event Injection syntax parsing working

### **Milestone 2 (Final Semana 2):** Code Generation Complete
- ✅ Generated JavaScript validates sem erros
- ✅ Scene/Scenario/ScenarioExecution classes funcionais
- ✅ Event Injection integration working
- ✅ Reactive framework integration working

### **Milestone 3 (Final Semana 3):** Integration Complete
- ✅ End-to-end execution working sem falhas
- ✅ Programming structures funcionais (while, for, let, if)
- ✅ Validation framework operacional
- ✅ All unit e integration tests passing

### **Final Milestone (Final Semana 4):** Production Ready
- ✅ Performance optimized
- ✅ Documentation complete
- ✅ Examples working
- ✅ Ready for any SysADL model (genérico)

---

## **🔄 PRÓXIMO PASSO IMEDIATO**

**INICIAR: FASE 1.1 - Scene Individual Parser**

**Arquivo:** `sysadl-parser.js` e `sysadl.peg`

**Tarefa:** Implementar parsing de Scene individuais para extrair:
- `Scene def SCN_Name on { ... }`
- Pre-conditions, start event, finish event, post-conditions
- Criar estrutura AST genérica para múltiplas Scenes

**Comando para começar:**
```bash
cd /Users/tales/desenv/SysAdlWebStudio/tales/v0.4
# Editar sysadl.peg para adicionar regras de Scene individual
# Testar com AGV-completo.sysadl
```

---

## **📊 TRACKING DE PROGRESSO**

| Fase | Componente | Status | Estimativa | Início | Fim |
|------|------------|---------|------------|--------|-----|
| 1.1  | Scene Parser | 🔴 Not Started | 2 dias | | |
| 1.2  | Scenario Parser | 🔴 Not Started | 2 dias | | |
| 1.3  | ScenarioExecution Parser | 🔴 Not Started | 3 dias | | |
| 2.1  | Scene Code Generation | 🔴 Not Started | 2 dias | | |
| 2.2  | Scenario Code Generation | 🔴 Not Started | 3 dias | | |
| 2.3  | ScenarioExecution Code Generation | 🔴 Not Started | 2 dias | | |
| 3.1  | Event Injection Integration | 🔴 Not Started | 2 dias | | |
| 3.2  | Reactive Framework Integration | 🔴 Not Started | 2 dias | | |
| 4.1  | Programming Structures | 🔴 Not Started | 3 dias | | |
| 4.2  | Validation Framework | 🔴 Not Started | 2 dias | | |
| 5.1  | Unit Testing | 🔴 Not Started | 3 dias | | |
| 5.2  | Integration Testing | 🔴 Not Started | 2 dias | | |
| 6.1  | Documentation | 🔴 Not Started | 2 dias | | |
| 6.2  | Performance Optimization | 🔴 Not Started | 2 dias | | |

**Total Estimado:** 32 dias de desenvolvimento

---

*Última atualização: 23 de setembro de 2025*
*Próxima revisão: A cada milestone completado*

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
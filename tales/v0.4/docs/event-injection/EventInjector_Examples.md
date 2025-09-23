# Exemplos de Uso do EventInjector no ScenarioExecution

## 1. Estrutura Básica de Event Injection

O EventInjector é integrado ao ScenarioExecution através do framework SysADL. Aqui estão exemplos práticos:

### 1.1 Event Injection Simples

```sysadl
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // Injeção de evento simples
  inject cmdSupervisor;
  
  // Injeção com delay
  inject AGV1NotifArriveA after 5s;
  
  // Injeção quando condição for atendida
  inject AGV2NotifTravelC when agv2.location == stationC.ID;
  
  Scenario1;
}
```

**Código JavaScript Gerado:**
```javascript
// Configuração de event injection gerada automaticamente
this.executionConfig = {
  eventInjections: [
    {
      type: "single",
      eventName: "cmdSupervisor",
      timing: { type: "immediate" },
      parameters: {},
      options: {}
    },
    {
      type: "single", 
      eventName: "AGV1NotifArriveA",
      timing: { type: "delay", value: 5000 },
      parameters: {},
      options: {}
    },
    {
      type: "single",
      eventName: "AGV2NotifTravelC", 
      timing: { type: "condition", expression: "agv2.location == stationC.ID" },
      parameters: {},
      options: {}
    }
  ]
};

// Execução automática dos event injections
async processEventInjections() {
  for (const injection of this.executionConfig.eventInjections) {
    await this.executeEventInjection(injection);
  }
}
```

### 1.2 Event Injection em Lote (Batch)

```sysadl
ScenarioExecution to MyScenarios {
  // Injeção de múltiplos eventos em sequência
  inject_batch [cmdAGV1toA, cmdAGV2toC] sequential;
  
  // Injeção de múltiplos eventos em paralelo
  inject_batch [AGV1NotifTravelA, AGV2NotifTravelC] parallel after 2s;
  
  Scenario1;
}
```

**Código JavaScript Gerado:**
```javascript
// Event injection batch gerado automaticamente
async injectBatchEvents(injection) {
  const eventSpecs = injection.events.map(eventName => ({
    eventName,
    parameters: injection.parameters || {},
    delay: this.calculateEventDelay(injection.timing),
    options: injection.options || {}
  }));
  
  this.sysadlBase.logger.log(`⚡ Injecting batch events: ${injection.events.join(', ')} (mode: ${injection.mode})`);
  
  return await this.sysadlBase.eventInjector.injectEventBatch(
    eventSpecs,
    { parallel: injection.mode === 'parallel' }
  );
}
```

## 2. Uso Avançado com Timing

### 2.1 Diferentes Tipos de Timing

```javascript
// Exemplos de diferentes tipos de timing no código gerado
calculateEventDelay(timing) {
  if (!timing) return 0;
  
  switch (timing.type) {
    case 'delay':
      // inject AGV1NotifArriveA after 5s;
      return timing.value || 0; // 5000ms
      
    case 'immediate': 
      // inject cmdSupervisor;
      return 0;
      
    case 'condition':
      // inject AGV2NotifTravelC when agv2.location == stationC.ID;
      return 0; // Avaliado em tempo real
      
    case 'before':
      // inject cmdSupervisor before Scenario1;
      return 0; // Coordenado com execução do cenário
      
    case 'after':
      // inject AGV1NotifLoad after SCN_MoveAGV1toA;
      return 0; // Executado após cena específica
      
    default:
      return 0;
  }
}
```

### 2.2 Integração com EventInjector Framework

```javascript
// Método principal de injeção de evento único
async injectSingleEvent(injection) {
  const delay = this.calculateEventDelay(injection.timing);
  
  this.sysadlBase.logger.log(`⚡ Injecting event: ${injection.eventName} (delay: ${delay}ms)`);
  
  // Chamada direta ao EventInjector (557 linhas de framework)
  return await this.sysadlBase.eventInjector.injectEvent(
    injection.eventName,           // Nome do evento
    injection.parameters,          // Parâmetros do evento
    delay,                        // Delay calculado
    injection.options             // Opções adicionais
  );
}
```

## 3. Exemplos Práticos do Sistema AGV

### 3.1 Simulação de Falha de Sistema

```sysadl
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // Iniciar operação normal
  inject cmdSupervisor;
  
  // Simular falha no AGV1 após 10 segundos
  inject AGV1SystemFailure after 10s;
  
  // Ativar protocolo de emergência após detecção de falha
  inject EmergencyProtocol when agv1.status == "failed";
  
  // Reativar sistema após resolução
  inject SystemRestart after 30s;
  
  Scenario1;
}
```

### 3.2 Teste de Carga com Múltiplos Eventos

```sysadl
ScenarioExecution to MyScenarios {
  // Simular múltiplos comandos simultâneos
  inject_batch [
    cmdAGV1toA, 
    cmdAGV2toC, 
    cmdAGV3toE,
    SupervisorStatus
  ] parallel;
  
  // Simular sequência de notificações  
  inject_batch [
    AGV1NotifTravelA,
    AGV1NotifPassB, 
    AGV1NotifArriveA
  ] sequential after 2s;
  
  Scenario3; // Loop de 5 iterações
}
```

### 3.3 Coordenação de Cenários com Events

```javascript
// Código gerado mostrando integração com scenes
class SCN_MoveAGV1toA extends Scene {
  async execute() {
    await this.validatePreConditions();
    
    // Event injection automático no início da cena
    await this.sysadlBase.eventInjector.injectEvent(
      this.startEvent, 
      { source: 'scene:' + this.name }
    );
    
    // Lógica da cena...
    
    await this.validatePostConditions();
  }
}
```

## 4. Logging e Monitoramento

### 4.1 Logs Automáticos de Event Injection

```javascript
// Logs gerados automaticamente pelo sistema
async processEventInjections() {
  if (!this.executionConfig.eventInjections || this.executionConfig.eventInjections.length === 0) {
    return;
  }
  
  this.sysadlBase.logger.log('⚡ Processing event injections');
  
  for (const injection of this.executionConfig.eventInjections) {
    await this.executeEventInjection(injection);
  }
}

// Exemplo de output de log:
// [04:27:52.332] ⚡ Processing event injections
// [04:27:52.335] ⚡ Injecting event: cmdSupervisor (delay: 0ms)
// [04:27:57.340] ⚡ Injecting event: AGV1NotifArriveA (delay: 5000ms)
// [04:27:59.345] ⚡ Injecting batch events: cmdAGV1toA, cmdAGV2toC (mode: sequential)
```

### 4.2 Tratamento de Erros

```javascript
async executeEventInjection(injection) {
  try {
    if (injection.type === 'single') {
      await this.injectSingleEvent(injection);
    } else if (injection.type === 'batch') {
      await this.injectBatchEvents(injection);
    }
  } catch (error) {
    this.sysadlBase.logger.log(`❌ Event injection failed: ${error.message}`);
    throw error;
  }
}
```

## 5. API Completa do EventInjector

### 5.1 Métodos Principais

```javascript
// EventInjector (557 linhas) - Métodos principais usados:

// 1. Injeção de evento único
await this.sysadlBase.eventInjector.injectEvent(
  eventName,      // string: nome do evento
  parameters,     // object: parâmetros do evento  
  delay,         // number: delay em ms
  options        // object: opções adicionais
);

// 2. Injeção de eventos em lote
await this.sysadlBase.eventInjector.injectEventBatch(
  eventSpecs,    // array: especificações de eventos
  batchOptions   // object: { parallel: boolean }
);

// 3. Scheduling de eventos
await this.sysadlBase.eventInjector.scheduleEvent(
  eventName,
  triggerTime,
  parameters
);

// 4. Validação de eventos
const isValid = this.sysadlBase.eventInjector.validateEvent(eventName);

// 5. Logging de eventos
this.sysadlBase.eventInjector.logEventInjection(eventName, result);
```

## 6. Integração com Reactive State Manager

```javascript
// O EventInjector trabalha em conjunto com o ReactiveStateManager
// para tracking de estado e condições reativas

// Exemplo de condição reativa para event injection
async monitorConditionForInjection(injection) {
  if (injection.timing?.type === 'condition') {
    this.sysadlBase.reactiveStateManager.watchCondition(
      injection.timing.expression,
      () => {
        this.injectSingleEvent(injection);
      }
    );
  }
}
```

## Resumo

O EventInjector no ScenarioExecution oferece:

✅ **Injeção de eventos simples e em lote**
✅ **Timing flexível** (immediate, delay, condition, before/after)  
✅ **Integração completa** com framework SysADL Phase 4-6
✅ **Logging detalhado** com ExecutionLogger
✅ **Tratamento de erros** robusto
✅ **API rica** com 557 linhas de funcionalidades
✅ **Coordenação com scenes** e scenarios
✅ **Suporte a condições reativas** via ReactiveStateManager

Isso permite simulação realística, testes de carga, injeção de falhas, e orquestração complexa de eventos em sistemas SysADL.
# EventScheduler - Exemplos de Teste

## Teste Básico: Evento Após Cenário

### Modelo SysADL
```sysadl
model SimpleTest;

// Eventos
datatype event StartMotor;
datatype event StopMotor;

// Cenários
scenario Initialize {
  action start {
    // Inicializa sistema
  }
}

scenario Shutdown {
  action stop {
    // Desliga sistema
  }
}

// Execução
ScenarioExecution to BasicTest {
  inject StartMotor after Initialize;
  inject StopMotor after Shutdown;
  
  Initialize;
  Shutdown;
}
```

### Execução
```bash
node transformer.js SimpleTest.sysadl
node environment-simulator.js generated/SimpleTest-env-scen.js --scenario=BasicTest
```

### Resultado Esperado
```
[INFO] EventScheduler: EventScheduler initialized
[INFO] EventScheduler: Scheduled event 'StartMotor' to fire after scenario 'Initialize'
[INFO] EventScheduler: Scheduled event 'StopMotor' to fire after scenario 'Shutdown'
[INFO] EventScheduler: Scenario 'Initialize' completed, firing 1 scheduled events
[INFO] EventScheduler: Firing event 'StartMotor' (trigger: after_scenario)
[INFO] EventScheduler: Scenario 'Shutdown' completed, firing 1 scheduled events
[INFO] EventScheduler: Firing event 'StopMotor' (trigger: after_scenario)
```

---

## Teste Condicional: Monitoramento de Temperatura

### Modelo SysADL
```sysadl
model TemperatureMonitor;

// Eventos
datatype event AlarmHigh;
datatype event AlarmLow;
datatype event AlarmNormal;

// Ambiente
archetype TemperatureSensor {
  gate temp;
  
  attribute temperature : Integer;
}

// Configuração
EnvironmentConfiguration to TempConfig {
  TemperatureSensor tempSensor;
  
  set tempSensor.temperature = 25;
}

// Cenários
scenario MonitorTemp {
  action monitor {
    // Loop de monitoramento
  }
}

// Execução
ScenarioExecution to TempMonitoring {
  inject AlarmHigh when tempSensor.temperature > 80;
  inject AlarmLow when tempSensor.temperature < 20;
  inject AlarmNormal when tempSensor.temperature >= 20 && tempSensor.temperature <= 80;
  
  MonitorTemp;
}
```

### Teste Manual da Condição
```javascript
// No código gerado ou console
const condition = () => context.model?.environmentConfig?.tempSensor?.temperature > 80;

// Simular mudança de temperatura
context.model.environmentConfig.tempSensor.temperature = 85;

// Verificar condição
console.log(condition()); // true
```

### Execução
```bash
node transformer.js TemperatureMonitor.sysadl
node environment-simulator.js generated/TemperatureMonitor-env-scen.js --scenario=TempMonitoring
```

### Resultado Esperado
```
[INFO] EventScheduler: EventScheduler initialized
[INFO] EventScheduler: Starting conditional event monitoring
[INFO] EventScheduler: Scheduled event 'AlarmHigh' to fire on condition
[INFO] EventScheduler: Scheduled event 'AlarmLow' to fire on condition
[INFO] EventScheduler: Scheduled event 'AlarmNormal' to fire on condition
[INFO] EventScheduler: Condition met for event 'AlarmNormal', firing event
[INFO] EventScheduler: Firing event 'AlarmNormal' (trigger: condition)
```

---

## Teste Complexo: Sistema de AGVs

### Modelo SysADL (AGV-completo.sysadl)
```sysadl
model AGVFleetControl;

// Eventos
datatype event AGV1AtStationA;
datatype event AGV2AtStationB;
datatype event AGV1BatteryLow;
datatype event AGV2BatteryLow;
datatype event CollisionWarning;

// Ambiente
archetype AGV {
  gate cmd;
  gate sensor;
  
  attribute location : String;
  attribute battery : Integer;
  attribute distance : Integer;
}

archetype Station {
  gate service;
  
  const ID : String;
}

// Configuração
EnvironmentConfiguration to FleetConfig {
  AGV agv1, agv2;
  Station stationA, stationB;
  
  set agv1.location = "warehouse";
  set agv1.battery = 100;
  set agv1.distance = 50;
  
  set agv2.location = "warehouse";
  set agv2.battery = 100;
  set agv2.distance = 50;
  
  set stationA.ID = "STATION_A";
  set stationB.ID = "STATION_B";
}

// Cenários
scenario MoveAGV1ToA {
  action move {
    // Move AGV1 para Station A
  }
}

scenario MoveAGV2ToB {
  action move {
    // Move AGV2 para Station B
  }
}

scenario MonitorFleet {
  action monitor {
    // Monitora frota
  }
}

// Execução
ScenarioExecution to FleetControl {
  // Eventos de chegada
  inject AGV1AtStationA after MoveAGV1ToA;
  inject AGV2AtStationB after MoveAGV2ToB;
  
  // Eventos de bateria
  inject AGV1BatteryLow when agv1.battery < 20;
  inject AGV2BatteryLow when agv2.battery < 20;
  
  // Eventos de colisão
  inject CollisionWarning when agv1.distance < 5 || agv2.distance < 5;
  
  // Cenários
  MoveAGV1ToA;
  MoveAGV2ToB;
  MonitorFleet;
}
```

### Execução
```bash
node transformer.js AGV-completo.sysadl
node environment-simulator.js generated/AGV-completo-env-scen.js --scenario=FleetControl
```

### Resultado Esperado
```
[INFO] EventScheduler: EventScheduler initialized
[INFO] EventScheduler: Scheduled event 'AGV1AtStationA' to fire after scenario 'MoveAGV1ToA'
[INFO] EventScheduler: Scheduled event 'AGV2AtStationB' to fire after scenario 'MoveAGV2ToB'
[INFO] EventScheduler: Starting conditional event monitoring
[INFO] EventScheduler: Scheduled event 'AGV1BatteryLow' to fire on condition
[INFO] EventScheduler: Scheduled event 'AGV2BatteryLow' to fire on condition
[INFO] EventScheduler: Scheduled event 'CollisionWarning' to fire on condition
[INFO] EventScheduler: Scenario 'MoveAGV1ToA' completed, firing 1 scheduled events
[INFO] EventScheduler: Firing event 'AGV1AtStationA' (trigger: after_scenario)
[INFO] EventScheduler: Scenario 'MoveAGV2ToB' completed, firing 1 scheduled events
[INFO] EventScheduler: Firing event 'AGV2AtStationB' (trigger: after_scenario)
```

---

## Teste de Performance: Múltiplas Condições

### Modelo SysADL
```sysadl
model PerformanceTest;

// Eventos (20 eventos)
datatype event Event01, Event02, Event03, Event04, Event05;
datatype event Event06, Event07, Event08, Event09, Event10;
datatype event Event11, Event12, Event13, Event14, Event15;
datatype event Event16, Event17, Event18, Event19, Event20;

// Ambiente
archetype Sensor {
  attribute value : Integer;
}

// Configuração
EnvironmentConfiguration to PerfConfig {
  Sensor sensor01, sensor02, sensor03, sensor04, sensor05;
  Sensor sensor06, sensor07, sensor08, sensor09, sensor10;
  
  set sensor01.value = 0;
  set sensor02.value = 0;
  // ... (inicializar todos)
}

// Cenário
scenario Monitor {
  action monitor {
    // Loop de monitoramento
  }
}

// Execução
ScenarioExecution to PerfTest {
  // 20 condições simultâneas
  inject Event01 when sensor01.value > 10;
  inject Event02 when sensor02.value > 10;
  inject Event03 when sensor03.value > 10;
  inject Event04 when sensor04.value > 10;
  inject Event05 when sensor05.value > 10;
  inject Event06 when sensor06.value > 10;
  inject Event07 when sensor07.value > 10;
  inject Event08 when sensor08.value > 10;
  inject Event09 when sensor09.value > 10;
  inject Event10 when sensor10.value > 10;
  inject Event11 when sensor01.value < -10;
  inject Event12 when sensor02.value < -10;
  inject Event13 when sensor03.value < -10;
  inject Event14 when sensor04.value < -10;
  inject Event15 when sensor05.value < -10;
  inject Event16 when sensor06.value < -10;
  inject Event17 when sensor07.value < -10;
  inject Event18 when sensor08.value < -10;
  inject Event19 when sensor09.value < -10;
  inject Event20 when sensor10.value < -10;
  
  Monitor;
}
```

### Métricas Esperadas
```
- Tempo de inicialização: < 10ms
- Tempo por ciclo de monitoramento: < 5ms
- Memória usada: < 10MB
- CPU por ciclo: < 1%
```

---

## Teste de Integração: Event Chains

### Modelo SysADL
```sysadl
model EventChains;

// Eventos
datatype event StartProcess;
datatype event ProcessComplete;
datatype event NotifyUser;
datatype event CleanupResources;

// Cenários
scenario ProcessData {
  action process {
    // Processa dados
  }
}

scenario NotifyUsers {
  action notify {
    // Notifica usuários
  }
}

scenario Cleanup {
  action cleanup {
    // Limpa recursos
  }
}

// Execução (cadeia de eventos)
ScenarioExecution to ChainTest {
  // Evento 1 dispara após cenário inicial
  inject ProcessComplete after ProcessData;
  
  // Evento 2 dispara após notificação
  inject NotifyUser after NotifyUsers;
  
  // Evento 3 dispara após limpeza
  inject CleanupResources after Cleanup;
  
  // Execução sequencial
  ProcessData;
  NotifyUsers;
  Cleanup;
}
```

### Resultado Esperado
```
[INFO] EventScheduler: Scenario 'ProcessData' completed, firing 1 scheduled events
[INFO] EventScheduler: Firing event 'ProcessComplete' (trigger: after_scenario)
[INFO] EventScheduler: Scenario 'NotifyUsers' completed, firing 1 scheduled events
[INFO] EventScheduler: Firing event 'NotifyUser' (trigger: after_scenario)
[INFO] EventScheduler: Scenario 'Cleanup' completed, firing 1 scheduled events
[INFO] EventScheduler: Firing event 'CleanupResources' (trigger: after_scenario)
```

---

## Teste de Erro: Condição Inválida

### Modelo SysADL
```sysadl
model ErrorTest;

datatype event ErrorEvent;

// Configuração sem a propriedade necessária
EnvironmentConfiguration to ErrorConfig {
  // (vazio - faltando sensor)
}

scenario Test {
  action test { }
}

ScenarioExecution to ErrorTest {
  // Condição que tentará acessar propriedade inexistente
  inject ErrorEvent when sensor.value > 10;
  
  Test;
}
```

### Resultado Esperado
```
[ERROR] EventScheduler: Error checking condition for event 'ErrorEvent': Cannot read property 'value' of undefined
[INFO] EventScheduler: Removing event 'ErrorEvent' due to condition error
```

---

## Teste de Delay (API JavaScript)

### Código de Teste
```javascript
const EventScheduler = require('./sysadl-framework/EventScheduler');

// Mock de modelo e logger
const mockModel = {
  eventInjector: {
    injectEvent: (eventName) => {
      console.log(`Event injected: ${eventName}`);
    }
  }
};

const mockLogger = {
  logExecution: (data) => {
    console.log(`[LOG] ${data.type}: ${data.name}`);
  }
};

// Criar scheduler
const scheduler = new EventScheduler(mockModel, mockLogger);

// Agendar eventos com delay
console.log('Scheduling events...');
scheduler.scheduleAfterDelay('Event1', 1000);  // 1 segundo
scheduler.scheduleAfterDelay('Event2', 2000);  // 2 segundos
scheduler.scheduleAfterDelay('Event3', 3000);  // 3 segundos

// Verificar estatísticas
setTimeout(() => {
  const stats = scheduler.getStats();
  console.log('Stats after 1.5s:', stats);
}, 1500);

setTimeout(() => {
  const stats = scheduler.getStats();
  console.log('Stats after 3.5s:', stats);
  
  // Limpar e destruir
  scheduler.destroy();
}, 3500);
```

### Resultado Esperado
```
Scheduling events...
[LOG] event.scheduled: Event1
[LOG] event.scheduled: Event2
[LOG] event.scheduled: Event3
[LOG] event.fired: Event1
Event injected: Event1
Stats after 1.5s: { eventsFired: 1, pendingDelayed: 2, ... }
[LOG] event.fired: Event2
Event injected: Event2
[LOG] event.fired: Event3
Event injected: Event3
Stats after 3.5s: { eventsFired: 3, pendingDelayed: 0, ... }
```

---

## Comandos Úteis para Testes

### Executar com Timeout
```bash
# Executar por 10 segundos e parar
timeout 10 node environment-simulator.js generated/model.js --scenario=MyScenarios
```

### Filtrar Logs do EventScheduler
```bash
# Filtrar apenas mensagens do EventScheduler
node environment-simulator.js generated/model.js --scenario=MyScenarios 2>&1 | grep EventScheduler
```

### Analisar Logs JSONL
```bash
# Ver todos os eventos agendados
cat logs/sysadl-execution-*.jsonl | jq 'select(.what == "event.scheduled")'

# Ver todos os eventos disparados
cat logs/sysadl-execution-*.jsonl | jq 'select(.what == "event.fired")'

# Contar eventos por tipo
cat logs/sysadl-execution-*.jsonl | jq '.context.triggerType' | sort | uniq -c
```

### Verificar Performance
```bash
# Executar com profiling de tempo
time node environment-simulator.js generated/model.js --scenario=MyScenarios

# Executar com profiling de memória
node --max-old-space-size=100 environment-simulator.js generated/model.js --scenario=MyScenarios
```

---

## Checklist de Teste

### ✅ Testes Básicos
- [ ] EventScheduler inicializa sem erros
- [ ] Eventos são agendados corretamente (scheduleAfterScenario)
- [ ] Eventos disparam após conclusão de cenário
- [ ] Eventos condicionais são monitorados
- [ ] Eventos condicionais disparam quando condição é verdadeira
- [ ] Logs narrativos são gerados

### ✅ Testes Intermediários
- [ ] Múltiplos eventos após mesmo cenário
- [ ] Múltiplos eventos condicionais simultâneos
- [ ] Eventos com delay (scheduleAfterDelay)
- [ ] Estatísticas (getStats) retornam valores corretos
- [ ] clearAll() limpa todos os eventos
- [ ] destroy() para monitoramento e limpa recursos

### ✅ Testes Avançados
- [ ] Condições complexas (AND, OR, NOT)
- [ ] Condições com propriedades aninhadas
- [ ] Event chains (evento após evento)
- [ ] Performance com 50+ condições
- [ ] Erro em condição não quebra sistema
- [ ] Propriedades inexistentes em condições são tratadas

### ✅ Testes de Integração
- [ ] EventScheduler funciona com ScenarioExecution
- [ ] Eventos são injetados via EventInjector
- [ ] Logging integrado com ExecutionLogger
- [ ] Context fornece acesso ao EventScheduler
- [ ] Transformação de expressões funciona corretamente

---

## Exemplo de Output Completo

```
=== Starting SysADL Environment Simulator ===
Loading model from: generated/AGV-completo-env-scen.js

[INFO] Model loaded: AGVFleetControl
[INFO] EventScheduler: EventScheduler initialized
[INFO] Scenario Execution registered: FleetControl

=== Starting Scenario Execution: FleetControl ===
[INFO] ExecutionLogger: Logger initialized
[INFO] ExecutionLogger: Log file: logs/sysadl-execution-20251105-143022.jsonl

[INFO] EventScheduler: Scheduled event 'AGV1AtStationA' to fire after scenario 'MoveAGV1ToA'
[INFO] EventScheduler: Scheduled event 'AGV2AtStationB' to fire after scenario 'MoveAGV2ToB'
[INFO] EventScheduler: Starting conditional event monitoring
[INFO] EventScheduler: Scheduled event 'AGV1BatteryLow' to fire on condition
[INFO] EventScheduler: Scheduled event 'AGV2BatteryLow' to fire on condition
[INFO] EventScheduler: Scheduled event 'CollisionWarning' to fire on condition

[INFO] Scenario: MoveAGV1ToA started
[INFO] Scene: SCN_MoveAGV1 executing...
[INFO] Scenario: MoveAGV1ToA completed (duration: 1234ms)
[INFO] EventScheduler: Scenario 'MoveAGV1ToA' completed, firing 1 scheduled events
[INFO] EventScheduler: Firing event 'AGV1AtStationA' (trigger: after_scenario, eventNumber: 1)

[INFO] Scenario: MoveAGV2ToB started
[INFO] Scene: SCN_MoveAGV2 executing...
[INFO] Scenario: MoveAGV2ToB completed (duration: 1189ms)
[INFO] EventScheduler: Scenario 'MoveAGV2ToB' completed, firing 1 scheduled events
[INFO] EventScheduler: Firing event 'AGV2AtStationB' (trigger: after_scenario, eventNumber: 2)

[INFO] Scenario: MonitorFleet started
[INFO] EventScheduler: Condition met for event 'CollisionWarning', firing event
[INFO] EventScheduler: Firing event 'CollisionWarning' (trigger: condition, eventNumber: 3)

=== Execution Statistics ===
Total events fired: 3
Events fired by trigger type:
  - after_scenario: 2
  - condition: 1
  - delay: 0

Pending events:
  - After scenario: 0
  - Conditional: 2 (AGV1BatteryLow, AGV2BatteryLow)
  - Delayed: 0

Monitoring active: true

=== Execution completed successfully ===
```

---

**Framework:** SysADL Framework v0.4  
**Versão:** 1.0.0  
**Data:** 05/11/2025

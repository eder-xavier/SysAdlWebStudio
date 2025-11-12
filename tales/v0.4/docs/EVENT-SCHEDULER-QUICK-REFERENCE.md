# EventScheduler - Guia Rápido de Referência

## Sintaxe SysADL

### 1. Evento Após Cenário/Cena
Dispara um evento quando um cenário ou cena específico termina.

```sysadl
ScenarioExecution to MyScenarios {
  inject EventName after ScenarioName;
  
  ScenarioName;
}
```

**Exemplo:**
```sysadl
ScenarioExecution to AGVControl {
  inject StartMotor after InitializeAGV;
  inject StopMotor after CompleteDelivery;
  
  InitializeAGV;
  MoveToStation;
  CompleteDelivery;
}
```

### 2. Evento Condicional
Dispara um evento quando uma expressão booleana se torna verdadeira.

```sysadl
ScenarioExecution to MyScenarios {
  inject EventName when condition;
  
  ScenarioName;
}
```

**Exemplos:**
```sysadl
ScenarioExecution to TemperatureControl {
  inject AlarmHigh when temperature > 80;
  inject AlarmLow when temperature < 20;
  inject AlarmCritical when temperature > 100 || pressure < 10;
  
  MonitorSystem;
}

ScenarioExecution to AGVControl {
  inject AGV1Arrived when agv1.location == stationA.ID;
  inject BatteryLow when agv1.battery < 20;
  inject CollisionWarning when agv1.distance < 5;
  
  ControlAGV;
}
```

### 3. Múltiplos Eventos
Você pode agendar quantos eventos precisar.

```sysadl
ScenarioExecution to ComplexScenarios {
  // Eventos após cenários
  inject Event1 after Scenario1;
  inject Event2 after Scenario2;
  
  // Eventos condicionais
  inject Event3 when condition1;
  inject Event4 when condition2;
  inject Event5 when condition3;
  
  // Execução
  Scenario1;
  Scenario2;
  Scenario3;
}
```

## API JavaScript (Uso Avançado)

### Criar EventScheduler
```javascript
const EventScheduler = require('./sysadl-framework/EventScheduler');
const eventScheduler = new EventScheduler(modelReference, loggerReference);
```

### Agendar Após Cenário
```javascript
eventScheduler.scheduleAfterScenario('EventName', 'ScenarioName');
```

### Agendar com Condição
```javascript
eventScheduler.scheduleOnCondition('EventName', () => {
  return context.model?.environmentConfig?.temperature > 80;
});
```

### Agendar com Delay
```javascript
eventScheduler.scheduleAfterDelay('EventName', 5000); // 5 segundos
```

### Notificar Conclusão de Cenário
```javascript
eventScheduler.notifyScenarioCompleted('ScenarioName');
```

### Obter Estatísticas
```javascript
const stats = eventScheduler.getStats();
console.log(`Eventos disparados: ${stats.eventsFired}`);
console.log(`Pendentes após cenário: ${stats.pendingAfterScenario.length}`);
console.log(`Pendentes condicionais: ${stats.pendingConditional.length}`);
console.log(`Monitoramento ativo: ${stats.monitoringActive}`);
```

### Limpar Todos os Eventos
```javascript
eventScheduler.clearAll();
```

### Destruir Scheduler
```javascript
eventScheduler.destroy();
```

## Acesso via Contexto

Durante a execução de cenários, o EventScheduler está disponível via contexto:

```javascript
async executeAsync(context) {
  // Agendar eventos
  if (context.eventScheduler) {
    context.eventScheduler.scheduleAfterScenario('EventA', 'ScenarioX');
    context.eventScheduler.scheduleOnCondition('EventB', () => condition);
  }
  
  // Executar cenários
  await this.executeScenario('ScenarioX', context);
}
```

## Expressões Condicionais

### Sintaxe Básica

As condições são expressões JavaScript que retornam booleano. Use a sintaxe:
```
entity.property operator value
```

**Exemplos:**
```sysadl
when temperature > 80
when agv1.location == stationA.ID
when battery < 20
when speed >= 10
when status != "idle"
```

### Transformação Automática

O transformer transforma automaticamente para acessar `environmentConfig`:

**SysADL:**
```sysadl
when agv1.location == stationA.ID
```

**JavaScript Gerado:**
```javascript
() => context.model?.environmentConfig?.agv1?.location == 
      context.model?.environmentConfig?.stationA?.ID
```

### Operadores Suportados

- **Comparação**: `==`, `!=`, `>`, `<`, `>=`, `<=`
- **Lógicos**: `&&` (AND), `||` (OR), `!` (NOT)
- **Aritméticos**: `+`, `-`, `*`, `/`, `%`

**Exemplos:**
```sysadl
// Comparação simples
when temperature > 80

// Comparação com propriedade
when agv1.location == target.ID

// Lógica AND
when temperature > 80 && pressure < 100

// Lógica OR
when battery < 20 || status == "error"

// Negação
when !systemReady

// Expressão complexa
when (temperature > 80 || pressure < 10) && !emergencyStop
```

## Ciclo de Vida dos Eventos

### 1. Agendamento
```
ScenarioExecution.executeAsync()
  → eventScheduler.scheduleAfterScenario() ou scheduleOnCondition()
  → Evento adicionado à fila correspondente
  → [LOG] event.scheduled
```

### 2. Monitoramento (apenas para condicionais)
```
EventScheduler inicia loop de 100ms
  → Para cada evento condicional:
    → Avalia condition()
    → Se true: dispara evento e remove da lista
    → Se false: continua monitorando
  → Para o loop quando não há mais eventos condicionais
```

### 3. Disparo Após Cenário
```
Scenario.execute() completa
  → notifyScenarioCompleted(scenarioName)
  → EventScheduler busca eventos na fila para esse cenário
  → fireEvent() para cada evento encontrado
  → Remove eventos da fila
```

### 4. Disparo do Evento
```
EventScheduler.fireEvent()
  → Incrementa contador eventsFired
  → [LOG] event.fired
  → model.eventInjector.injectEvent()
  → Evento é processado pelo sistema
```

## Exemplos Práticos

### Exemplo 1: Sistema de Alarmes
```sysadl
ScenarioExecution to AlarmSystem {
  // Alarmes baseados em sensores
  inject AlarmHighTemp when temperature > 80;
  inject AlarmLowTemp when temperature < 10;
  inject AlarmHighPressure when pressure > 100;
  inject AlarmLowPressure when pressure < 20;
  
  // Eventos após ações
  inject SystemReady after InitializeSensors;
  inject SystemShutdown after EmergencyStop;
  
  // Cenários
  InitializeSensors;
  MonitorContinuously;
}
```

### Exemplo 2: Controle de AGVs
```sysadl
ScenarioExecution to AGVFleetControl {
  // Eventos de chegada
  inject AGV1AtStationA after MoveAGV1ToA;
  inject AGV2AtStationB after MoveAGV2ToB;
  
  // Eventos de bateria
  inject AGV1BatteryLow when agv1.battery < 20;
  inject AGV2BatteryLow when agv2.battery < 20;
  
  // Eventos de colisão
  inject CollisionWarning when agv1.distance < 5 || agv2.distance < 5;
  
  // Cenários de controle
  MoveAGV1ToA;
  MoveAGV2ToB;
  MonitorFleet;
}
```

### Exemplo 3: Linha de Produção
```sysadl
ScenarioExecution to ProductionLine {
  // Eventos de conclusão de estágios
  inject Stage1Complete after ProcessStage1;
  inject Stage2Complete after ProcessStage2;
  inject Stage3Complete after ProcessStage3;
  
  // Eventos de qualidade
  inject QualityCheckFailed when defectCount > 3;
  inject ProductionTarget when itemsProduced >= 100;
  
  // Eventos de manutenção
  inject MaintenanceRequired when machineHours > 1000;
  inject OverheatWarning when motorTemp > 90;
  
  // Cenários
  ProcessStage1;
  ProcessStage2;
  ProcessStage3;
  QualityControl;
}
```

## Debugging e Logs

### Logs JSONL
Os eventos são registrados em `logs/sysadl-execution-*.jsonl`:

**Evento Agendado:**
```json
{
  "what": "event.scheduled",
  "who": "EventScheduler",
  "summary": "Scheduled event 'AGV1Arrived' to fire after scenario 'MoveAGV1ToA'",
  "context": {
    "eventName": "AGV1Arrived",
    "triggerType": "after_scenario",
    "triggerScenario": "MoveAGV1ToA"
  }
}
```

**Evento Disparado:**
```json
{
  "what": "event.fired",
  "who": "EventScheduler",
  "summary": "Firing event 'AGV1Arrived' (trigger: after_scenario, eventNumber: 1)",
  "context": {
    "eventName": "AGV1Arrived",
    "triggerType": "after_scenario",
    "eventNumber": 1
  }
}
```

### Console Logs
```
[INFO] EventScheduler: EventScheduler initialized
[INFO] EventScheduler: Scheduled event 'AGV1Arrived' to fire after scenario 'MoveAGV1ToA'
[INFO] EventScheduler: Starting conditional event monitoring
[INFO] EventScheduler: Scheduled event 'BatteryLow' to fire on condition
[INFO] EventScheduler: Scenario 'MoveAGV1ToA' completed, firing 1 scheduled events
[INFO] EventScheduler: Firing event 'AGV1Arrived' (trigger: after_scenario)
[INFO] EventScheduler: Condition met for event 'BatteryLow', firing event
```

### Filtrar Logs do EventScheduler
```bash
# Durante execução
node environment-simulator.js generated/model.js --scenario=MyScenarios | grep EventScheduler

# Após execução (logs JSONL)
cat logs/sysadl-execution-*.jsonl | grep event.scheduled
cat logs/sysadl-execution-*.jsonl | grep event.fired
```

## Dicas e Boas Práticas

### ✅ FAÇA

1. **Use nomes descritivos para eventos**
   ```sysadl
   inject AGV1ArrivedAtStationA after MoveAGV1ToStationA;  // ✅ Bom
   inject Event1 after Scenario1;                          // ❌ Ruim
   ```

2. **Agrupe eventos relacionados**
   ```sysadl
   // ✅ Eventos de bateria juntos
   inject AGV1BatteryLow when agv1.battery < 20;
   inject AGV2BatteryLow when agv2.battery < 20;
   
   // ✅ Eventos de chegada juntos
   inject AGV1Arrived after MoveAGV1;
   inject AGV2Arrived after MoveAGV2;
   ```

3. **Condições claras e simples**
   ```sysadl
   inject AlarmHigh when temperature > 80;     // ✅ Simples
   inject AlarmCritical when (temp > 80 && pressure < 10) || emergency;  // ⚠️ Complexa, mas ok
   ```

4. **Teste condições antes de executar**
   ```javascript
   // Verificar se propriedade existe
   when agv1.location == stationA.ID  // ✅ Transformado para context.model?.environmentConfig?.agv1?.location
   ```

### ❌ NÃO FAÇA

1. **Não use variáveis locais em condições**
   ```javascript
   let localVar = 10;
   inject Event when localVar > 5;  // ❌ Não funcionará
   ```

2. **Não crie loops infinitos**
   ```sysadl
   inject TriggerScenario after MyScenario;  // ❌ Se TriggerScenario executa MyScenario novamente
   ```

3. **Não confie em timing exato**
   ```sysadl
   // ⚠️ Monitoramento é a cada 100ms, não é tempo real exato
   inject Event when timer == 1000;  
   ```

4. **Não dispare muitos eventos simultâneos**
   ```sysadl
   // ⚠️ Pode causar sobrecarga
   inject Event1 when condition;
   inject Event2 when condition;
   inject Event3 when condition;
   // ... (dezenas de eventos)
   ```

## Performance

### Configuração do Intervalo de Monitoramento

Por padrão, condições são verificadas a cada 100ms. Para ajustar:

```javascript
const eventScheduler = new EventScheduler(model, logger, 200); // 200ms
```

### Número de Condições

- **1-10 condições**: Performance excelente (< 1ms por ciclo)
- **10-50 condições**: Performance boa (1-5ms por ciclo)
- **50-100 condições**: Performance aceitável (5-10ms por ciclo)
- **> 100 condições**: Considere aumentar intervalo ou usar outra estratégia

### Otimização

Se você tem muitas condições, considere:

1. **Aumentar intervalo de monitoramento**
   ```javascript
   const eventScheduler = new EventScheduler(model, logger, 500); // 500ms
   ```

2. **Usar eventos após cenário quando possível**
   ```sysadl
   // ✅ Melhor performance
   inject Event after Scenario;
   
   // ⚠️ Usa monitoramento
   inject Event when condition;
   ```

3. **Combinar condições**
   ```sysadl
   // ❌ Duas condições sendo monitoradas
   inject Event1 when x > 10;
   inject Event2 when y > 20;
   
   // ✅ Uma condição combinada
   inject Event when x > 10 && y > 20;
   ```

## Troubleshooting

### Evento não dispara após cenário
- ✅ Verifique se o nome do cenário está correto
- ✅ Verifique se o cenário está realmente executando
- ✅ Verifique logs: `grep "scenario.completed" logs/*.jsonl`

### Condição não dispara evento
- ✅ Verifique se a condição está correta
- ✅ Verifique se as propriedades existem em `environmentConfig`
- ✅ Teste a condição manualmente no console
- ✅ Verifique logs: `grep "condition met" logs/*.jsonl`

### EventScheduler não inicializa
- ✅ Verifique se `initializeScenarioExecution()` foi chamado
- ✅ Verifique se o modelo foi carregado corretamente
- ✅ Verifique logs de inicialização

### Muitos eventos disparando
- ✅ Verifique condições duplicadas
- ✅ Verifique se eventos não estão em loop
- ✅ Use `getStats()` para ver eventos pendentes

---

**Documentação Completa:** Veja `EVENT-SCHEDULER-DOCUMENTATION.md`  
**Framework:** SysADL Framework v0.4  
**Versão:** 1.0.0  
**Data:** 05/11/2025

# EventScheduler - Sistema de Agendamento de Eventos

## Visão Geral

O `EventScheduler` é um componente fundamental do SysADL Framework v0.4 que gerencia o agendamento e disparo de eventos durante a execução de cenários. Ele permite que eventos sejam disparados de forma condicional, temporal ou sequencial.

## Data de Implementação

05/11/2025

## Funcionalidades Implementadas

### 1. **Agendamento Após Cenário/Cena** (`scheduleAfterScenario`)

Agenda um evento para ser disparado imediatamente após a conclusão de uma cena ou cenário específico.

**Uso no SysADL:**
```sysadl
inject AGV2atStationD after SCN_MoveAGV1toA;
```

**Código Gerado:**
```javascript
if (context.eventScheduler) {
  context.eventScheduler.scheduleAfterScenario('AGV2atStationD', 'SCN_MoveAGV1toA');
}
```

**Comportamento:**
- O evento é armazenado em uma fila associada ao nome do cenário/cena
- Quando a cena/cenário é concluído, `notifyScenarioCompleted()` é chamado
- Todos os eventos agendados para aquele cenário/cena são disparados imediatamente

### 2. **Agendamento Condicional** (`scheduleOnCondition`)

Agenda um evento para ser disparado quando uma expressão booleana se tornar verdadeira.

**Uso no SysADL:**
```sysadl
inject SetAGV2SensorStationD when agv1.location == stationA.ID;
```

**Código Gerado:**
```javascript
if (context.eventScheduler) {
  context.eventScheduler.scheduleOnCondition('SetAGV2SensorStationD', 
    () => context.model?.environmentConfig?.agv1?.location == context.model?.environmentConfig?.stationA?.ID
  );
}
```

**Comportamento:**
- A condição é avaliada periodicamente (padrão: a cada 100ms)
- Quando a condição se torna verdadeira, o evento é disparado uma única vez
- O monitoramento é iniciado automaticamente e pausado quando não há mais eventos condicionais pendentes

### 3. **Agendamento com Delay** (`scheduleAfterDelay`)

Agenda um evento para ser disparado após um tempo específico.

**API:**
```javascript
eventScheduler.scheduleAfterDelay('EventName', 5000); // 5 segundos
```

**Comportamento:**
- Usa `setTimeout` internamente
- O evento é disparado exatamente uma vez após o delay especificado
- O timeout pode ser cancelado com `clearAll()`

### 4. **Disparo Manual de Eventos** (`fireEvent`)

Dispara um evento imediatamente.

**API:**
```javascript
eventScheduler.fireEvent('EventName', 'manual', { reason: 'test' });
```

**Comportamento:**
- Incrementa contador de eventos disparados
- Registra log narrativo
- Chama `eventInjector.injectEvent()` do modelo
- Captura e registra erros se o disparo falhar

## Integração com o Framework

### Inicialização

O EventScheduler é inicializado automaticamente quando `initializeScenarioExecution()` é chamado:

```javascript
// No SysADLBase.js
initializeScenarioExecution() {
  // ...
  if (!this.eventScheduler) {
    const EventScheduler = require('./EventScheduler');
    this.eventScheduler = new EventScheduler(this, this.logger);
  }
}
```

### Notificação de Conclusão de Cenas

Quando uma cena é concluída, o código gerado notifica o EventScheduler:

```javascript
// Código gerado pelo transformer.js
await this.executeScene('SCN_MoveAGV1toA', context);
if (context.model?.logger) {
  context.model.logger.logExecution({
    type: 'scene.execution.completed',
    name: 'SCN_MoveAGV1toA',
    // ...
  });
}
// Notificar EventScheduler
if (context.eventScheduler?.notifyScenarioCompleted) {
  context.eventScheduler.notifyScenarioCompleted('SCN_MoveAGV1toA');
}
```

### Acesso via Contexto

O EventScheduler é disponibilizado através do contexto de execução:

```javascript
buildExecutionContext() {
  return {
    environment: this.environment,
    entities: this.environment ? this.environment.entities : [],
    events: this.environment ? this.environment.events : [],
    model: this.model,
    execution: this,
    scenarios: this.model?.scenarios || {},
    scenes: this.model?.scenes || {},
    eventScheduler: this.model?.eventScheduler || {}
  };
}
```

## Monitoramento de Condições

### Ciclo de Monitoramento

1. **Início**: Quando o primeiro evento condicional é agendado
2. **Verificação**: A cada 100ms (configurável via `checkIntervalMs`)
3. **Avaliação**: Cada condição é avaliada sequencialmente
4. **Disparo**: Quando uma condição é verdadeira, o evento é disparado e removido da lista
5. **Parada**: Quando não há mais eventos condicionais pendentes

### Tratamento de Erros

Se uma condição lançar uma exceção:
- O erro é registrado no log
- O evento é marcado como disparado (para não tentar novamente)
- O evento é removido da lista de monitoramento

## Logging

Todos os eventos do EventScheduler são registrados com logging narrativo:

### Eventos Agendados
```javascript
{
  type: 'event.scheduled',
  name: 'EventName',
  context: {
    triggerType: 'after_scenario',
    triggerScenario: 'SceneName'
  }
}
```

### Eventos Disparados
```javascript
{
  type: 'event.fired',
  name: 'EventName',
  context: {
    triggerType: 'condition',
    eventNumber: 3
  }
}
```

### Falhas
```javascript
{
  type: 'event.fire.failed',
  name: 'EventName',
  context: {
    error: 'Error message',
    triggerType: 'after_scenario'
  }
}
```

## Estatísticas

O método `getStats()` retorna informações completas sobre o estado do scheduler:

```javascript
const stats = eventScheduler.getStats();
// {
//   eventsFired: 5,
//   pendingAfterScenario: [
//     { scenario: 'SCN_MoveAGV2toC', events: ['EventA', 'EventB'] }
//   ],
//   pendingConditional: [
//     { eventName: 'EventC', condition: '() => x > 10' }
//   ],
//   pendingDelayed: [
//     { eventName: 'EventD', delayMs: 5000 }
//   ],
//   monitoringActive: true
// }
```

## Limpeza e Destruição

### Limpar Todos os Eventos
```javascript
eventScheduler.clearAll();
```
- Cancela todos os timeouts pendentes
- Limpa todas as filas
- Para o monitoramento de condições

### Destruir o Scheduler
```javascript
eventScheduler.destroy();
```
- Chama `clearAll()`
- Remove todas as referências
- Registra log de destruição

## Exemplos de Uso

### Exemplo 1: Evento Após Cena
```sysadl
ScenarioExecution to MyScenarios {
  inject StartMotor after SCN_Initialize;
  
  Scenario1;
}
```

### Exemplo 2: Evento Condicional
```sysadl
ScenarioExecution to MyScenarios {
  inject AlarmHigh when temperature > 80;
  
  Scenario1;
}
```

### Exemplo 3: Múltiplos Eventos
```sysadl
ScenarioExecution to MyScenarios {
  inject Event1 after SCN_A;
  inject Event2 when condition1;
  inject Event3 after SCN_B;
  inject Event4 when condition2;
  
  Scenario1;
  Scenario2;
}
```

## Limitações Conhecidas

1. **Expressões Complexas**: Condições devem ser expressões JavaScript simples. Expressões muito complexas podem ser difíceis de transformar corretamente.

2. **Performance**: O monitoramento de condições usa polling a cada 100ms. Para sistemas com muitas condições, considere aumentar o intervalo.

3. **Escopo de Variáveis**: Condições devem acessar variáveis através de `context.model.environmentConfig`. Variáveis locais não são suportadas.

4. **Event Injector**: Requer que o modelo tenha um `eventInjector` configurado para disparar eventos efetivamente.

## Arquivos Modificados/Criados

1. **Criado**: `sysadl-framework/EventScheduler.js` (novo arquivo, 354 linhas)
2. **Modificado**: `sysadl-framework/SysADLBase.js`
   - Linha ~952: Inicialização do EventScheduler em `initializeScenarioExecution()`
   - Linha ~4418: Notificação em `executeScenario()` após conclusão
   - Linha ~3640: Correção de ordem de parâmetros em `executeScene()`
   - Linha ~3668: Correção de ordem de parâmetros em `executeScenario()`
   - Linha ~4362: Inclusão de `eventScheduler` no contexto
3. **Modificado**: `transformer.js`
   - Linha ~4548: Transformação de expressões condicionais
   - Linha ~4378: Notificação ao EventScheduler após conclusão de cena (dentro de loop)
   - Linha ~4420: Notificação ao EventScheduler após conclusão de cena (fora de loop)

## Status de Implementação

| Funcionalidade | Status | Testado |
|----------------|--------|---------|
| scheduleAfterScenario() | ✅ Completo | ✅ Sim |
| scheduleOnCondition() | ✅ Completo | ✅ Sim |
| scheduleAfterDelay() | ✅ Completo | ⚠️ Parcial |
| fireEvent() | ✅ Completo | ✅ Sim |
| notifyScenarioCompleted() | ✅ Completo | ✅ Sim |
| Monitoramento Condicional | ✅ Completo | ✅ Sim |
| Logging Narrativo | ✅ Completo | ✅ Sim |
| Limpeza/Destruição | ✅ Completo | ⚠️ Parcial |
| Transformação de Expressões | ✅ Completo | ✅ Sim |
| Integração com Framework | ✅ Completo | ✅ Sim |

## Próximos Passos (Opcional)

1. **Priorização de Eventos**: Implementar sistema de prioridades para eventos disparados simultaneamente
2. **Event Queuing**: Adicionar fila de eventos com processamento controlado
3. **Expressões Avançadas**: Suportar expressões mais complexas com transformação AST
4. **Performance**: Otimizar monitoramento condicional com change detection
5. **Testes Unitários**: Criar suite de testes completa para o EventScheduler

## Conclusão

O EventScheduler está **COMPLETO e FUNCIONAL**, permitindo agendamento sofisticado de eventos durante a execução de cenários SysADL. A integração com o framework é transparente e o sistema de logging fornece rastreabilidade completa de todos os eventos agendados e disparados.

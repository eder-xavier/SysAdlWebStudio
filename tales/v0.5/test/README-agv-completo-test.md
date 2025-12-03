# Teste de Execução da Cadeia de Tarefas do AGV-Completo

Este teste executa a cadeia completa de tarefas definida no modelo `AGV-completo.sysadl`, monitorando e listando todas as triggers, condições e Event Injections executadas durante o processo.

## Funcionalidades Testadas

### 🎯 Execução de Cenários
- **Scenario1**: Cenário padrão com fluxo normal
- **Scenario2**: Cenário com falha (teste de robustez)
- **Scenario3**: Cenário com loop (5 iterações)
- **Scenario4**: Cenário aninhado (5 repetições)

### 📊 Monitoramento de Triggers
- Triggers de comando (`cmdSupervisor`, `cmdAGV1toA`, etc.)
- Triggers de notificação (`AGV1NotifTravelA`, `AGV2NotifLoad`, etc.)
- Triggers de localização (`AGV1locationStationA`, etc.)
- Triggers de loop e aninhamento
- Triggers de falha e recuperação

### 📋 Análise de Condições
- Verificação de localização (`agv1.location == stationA.ID`)
- Verificação de velocidade (`agv2.speed > 0`)
- Verificação de sinais (`station.signal detectado`)
- Verificação de notificações (`notification enviada ao supervisor`)

### 💉 Event Injections
- Injeção de eventos de emergência (`emergencyStop when agv1.speed > 15`)
- Injeção com timing (`maintenanceAlert after 2000ms`)
- Injeção condicional (`statusUpdate before scenario ends`)

## Como Executar

### Pré-requisitos
- Node.js instalado
- Parser SysADL funcionando (`sysadl-parser.js`)
- Arquivo `AGV-completo.sysadl` no diretório pai

### Execução
```bash
# Na pasta v0.4/test
node test-agv-completo-execution-chain.js
```

### Execução com logs detalhados
```bash
# Para ver todos os detalhes
NODE_ENV=development node test-agv-completo-execution-chain.js
```

## Saídas do Teste

### 📺 Console Output
O teste exibe no console:
- Status do parsing do modelo
- Estrutura do modelo analisada
- Execução de cada cenário em tempo real
- Triggers executadas com suas condições
- Event Injections disparadas
- Relatório final com estatísticas

### 📁 Arquivo de Relatório
Gera um arquivo JSON em `test/logs/` com:
- Informações do teste (duração, timestamps)
- Estrutura do modelo (componentes, eventos, cenários)
- Métricas de execução (triggers, condições, injections)
- Métricas de performance (triggers/sec, condições/sec)

## Exemplo de Saída

```
🚀 Iniciando Teste da Cadeia de Execução do AGV-Completo
============================================================

📖 Parsing do modelo AGV-completo.sysadl...
📄 Arquivo carregado: 15234 caracteres
✅ Parse realizado com sucesso
🌳 AST gerada com 342 nós

🔍 Analisando estrutura do modelo...
📦 Componentes encontrados: 15
  - FactoryAutomationSystem (component)
  - SupervisorySystem (component)
  - AGVSystem (component)
  - VehicleControl (component)
  ...

🎭 Eventos definidos: 8
  - SupervisoryEvents para supervisor
  - AGV1Events para agv1
  - AGV2Events para agv2
  ...

🎬 Cenários encontrados: 4
  - Scenario1
  - Scenario2
  - Scenario3
  - Scenario4

💉 Event Injections: 2
  - AGV2atStationD after SCN_MoveAGV1toA
  - SetAGV2SensorStationD when agv1.location == stationA.ID

🎬 Executando cenários...

🎯 Executando cenário: Scenario1
  📋 Iniciando execução de Scenario1
    🔄 Executando cenário padrão...
      🎯 Trigger: cmdSupervisor
        📋 Condição: notification enviada ao supervisor
      🎯 Trigger: AGV1NotifTravelA
        📋 Condição: agv1.location verificado
        📋 Condição: notification enviada ao supervisor
        💉 Event Injection: emergencyStop when agv1.speed > 15
      ...
  ✅ Cenário Scenario1 executado em 627ms
  📊 Triggers: 12, Condições: 18

🎯 Monitorando triggers...
📊 Total de triggers executadas: 48
📈 Triggers por tipo:
  - COMMAND: 16
  - NOTIFICATION: 20
  - LOCATION: 8
  - LOOP: 2
  - NESTED: 2

📋 Analisando condições...
📊 Total de condições avaliadas: 72
📈 Condições por tipo:
  - location_check: 24
  - speed_check: 18
  - signal_check: 15
  - notification_check: 15

💉 Verificando Event Injections...
📊 Total de Event Injections executadas: 14
📈 Event Injections por timing:
  - when: 6
  - after: 4
  - before: 4

🎯 RELATÓRIO FINAL:
==================================================
⏱️  Duração total: 2847ms
📦 Componentes: 15
🎭 Eventos: 8
🎬 Cenários executados: 4
🎯 Triggers: 48
📋 Condições: 72
💉 Event Injections: 14
📈 Performance:
   - Triggers/seg: 16.86
   - Condições/seg: 25.29
   - Duração média cenário: 711.75ms
📁 Relatório salvo em: test/logs/agv-completo-execution-report-1727123456789.json

✅ Teste concluído com sucesso!
```

## Estrutura do Relatório JSON

```json
{
  "testInfo": {
    "startTime": "2025-09-23T10:30:45.123Z",
    "endTime": "2025-09-23T10:30:48.970Z",
    "duration": 2847,
    "file": "AGV-completo.sysadl"
  },
  "model": {
    "components": 15,
    "events": 8,
    "scenarios": 4,
    "activities": 12,
    "constraints": 18
  },
  "execution": {
    "scenariosExecuted": 4,
    "totalTriggers": 48,
    "totalConditions": 72,
    "totalEventInjections": 14
  },
  "performance": {
    "averageScenarioDuration": 711.75,
    "triggersPerSecond": 16.86,
    "conditionsPerSecond": 25.29
  }
}
```

## Análise dos Resultados

### 🎯 Triggers
As triggers representam os pontos de ativação no modelo:
- **COMMAND**: Comandos do supervisor para os AGVs
- **NOTIFICATION**: Notificações dos AGVs para o supervisor
- **LOCATION**: Mudanças de localização dos AGVs
- **LOOP**: Iterações em cenários repetitivos
- **NESTED**: Execuções aninhadas de cenários

### 📋 Condições
As condições são verificações realizadas durante a execução:
- **location_check**: Verificação de posição dos AGVs
- **speed_check**: Verificação de velocidade
- **signal_check**: Verificação de sinais das estações
- **notification_check**: Verificação de notificações

### 💉 Event Injections
Event Injections são eventos injetados dinamicamente:
- **when**: Condicionais (ex: quando velocidade > 15)
- **after**: Temporais (ex: após 2000ms)
- **before**: Precedência (ex: antes do cenário terminar)

## Troubleshooting

### Erro de Parse
```
❌ Erro no parsing: Unexpected token at line 123
```
Verifique se o arquivo `AGV-completo.sysadl` está correto e o parser atualizado.

### Arquivo não encontrado
```
❌ Arquivo não encontrado: /path/to/AGV-completo.sysadl
```
Confirme que o arquivo está no diretório correto (`v0.4/AGV-completo.sysadl`).

### Módulo não encontrado
```
❌ Cannot find module '../sysadl-parser.js'
```
Verifique se o parser foi gerado corretamente na pasta v0.4.

## Extensões do Teste

Para adicionar novos tipos de análise:

1. **Novas métricas**: Modifique `generateExecutionReport()`
2. **Novos cenários**: Adicione casos em `simulateScenarioExecution()`
3. **Novas condições**: Estenda `generateConditionsForEvent()`
4. **Novas injections**: Modifique `generateEventInjection()`

## Integração Contínua

Este teste pode ser usado em pipelines de CI/CD para validar:
- Integridade do modelo SysADL
- Performance da execução
- Cobertura de cenários
- Funcionamento das Event Injections
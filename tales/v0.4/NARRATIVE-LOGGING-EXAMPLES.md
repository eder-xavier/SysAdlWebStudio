# 📖 Narrative Logging System - Exemplos Práticos

## Visão Geral

Este documento contém exemplos práticos de uso do Sistema de Logging Narrativo implementado no SysADL Framework v0.4.

---

## 🚀 Execução Básica

### **1. Executar Simulação com Logs**

```bash
# Executar com logging no console
node environment-simulator.js generated/AGV-completo-env-scen.js --stream

# Executar cenário específico
node environment-simulator.js generated/AGV-completo-env-scen.js \
  --stream \
  --scenario=MyScenariosExecution
```

### **2. Filtrar Tipos de Log**

```bash
# Ver apenas eventos
node environment-simulator.js ... --stream | grep '^\[EVENT\]'

# Ver apenas cenas
node environment-simulator.js ... --stream | grep '^\[SCENE\]'

# Ver apenas cenários
node environment-simulator.js ... --stream | grep '^\[SCENARIO\]'

# Ver apenas erros e avisos
node environment-simulator.js ... --stream | grep -E '^\[ERROR\]|^\[WARN\]'

# Excluir mensagens DEBUG
node environment-simulator.js ... --stream | grep -v '^DEBUG:'
```

---

## 📊 Exemplos de Output

### **Console Output (Text-Only Prefixes)**

```
[START] ExecutionLogger initialized for model: SysADLArchitecture
   Session ID: SysADLArchitecture-1762267827226-s6x37s
   Log level: detailed
   
[START] 00:00.000

[EVENT] Triggering event 'cmdSupervisor' on entity 'supervisor'
   Timestamp: 00:00.123
   Entity: supervisor (Supervisory)
   Event: cmdSupervisor
   
[SCENE] Starting scene 'SCN_MoveAGV1toA'
   Pre-conditions: Checking...
   Start event: cmdSupervisor
   Finish event: AGV1NotifArriveA
   
[SCENARIO] Executing scenario 'Scenario1'
   Mode: sequential
   Scenes: 4 total
   
[INFO] Pre-conditions satisfied for scene 'SCN_MoveAGV1toA'
   agv1.location == stationC.ID ✓
   part.location == stationA.ID ✓
   
[EVENT] Event 'AGV1NotifArriveA' triggered (00:01.234)
   Entity: agv1
   Connection: Notify(agv1, supervisor)
   
[OK] Scene 'SCN_MoveAGV1toA' completed successfully
   Duration: 1.234s
   Post-conditions: ✓ Verified
   
[INFO] Scenario 'Scenario1' progress: 1/4 scenes completed

[DONE] Simulation completed
   Total time: 00:05.678
   Scenarios executed: 1
   Events processed: 12
```

### **JSONL File Output**

```jsonl
{"sequence":0,"timestamp":1762267827233,"iso_time":"2025-11-04T14:50:27.233Z","elementType":"scenario_execution_registered","execution":"MyScenariosExecution","when":1762267827233}

{"sequence":1,"timestamp":1762267827236,"iso_time":"2025-11-04T14:50:27.236Z","elementType":"scenario_execution_started","execution":"MyScenariosExecution","when":1762267827235}

{"sequence":2,"timestamp":1762267827345,"iso_time":"2025-11-04T14:50:27.345Z","elementType":"event_triggered","event":"cmdSupervisor","entity":"supervisor","when":1762267827344}

{"sequence":3,"timestamp":1762267827456,"iso_time":"2025-11-04T14:50:27.456Z","elementType":"scene_started","scene":"SCN_MoveAGV1toA","preconditions":{"satisfied":true},"when":1762267827455}

{"sequence":4,"timestamp":1762267828690,"iso_time":"2025-11-04T14:50:28.690Z","elementType":"scene_completed","scene":"SCN_MoveAGV1toA","duration":1234,"postconditions":{"satisfied":true},"when":1762267828689}
```

---

## 🔍 Casos de Uso Práticos

### **Caso 1: Debug de Cenários**

```bash
# Ver execução completa de um cenário específico
node environment-simulator.js generated/AGV-completo-env-scen.js \
  --stream \
  --scenario=MyScenariosExecution \
  | grep -E '^\[SCENARIO\]|^\[SCENE\]|^\[ERROR\]'
```

**Output esperado:**
```
[SCENARIO] Executing scenario 'Scenario1' (00:00.010)
[SCENE] Starting scene 'SCN_MoveAGV1toA' (00:00.012)
[SCENE] Completed scene 'SCN_MoveAGV1toA' (00:01.246)
[SCENE] Starting scene 'SCN_MoveAGV2toC' (00:01.247)
[SCENE] Completed scene 'SCN_MoveAGV2toC' (00:02.481)
[SCENARIO] Completed scenario 'Scenario1' (00:05.678)
```

### **Caso 2: Monitorar Eventos**

```bash
# Ver apenas eventos disparados
node environment-simulator.js ... --stream \
  | grep '^\[EVENT\]' \
  | tee events.log
```

**Output esperado:**
```
[EVENT] Triggering event 'cmdSupervisor' (00:00.123)
[EVENT] Event 'cmdAGV2toC' triggered (00:00.124)
[EVENT] Event 'cmdAGV1toA' triggered (00:00.125)
[EVENT] Event 'AGV1NotifTravelA' triggered (00:00.234)
[EVENT] Event 'AGV2NotifTravelC' triggered (00:00.235)
```

### **Caso 3: Validar Pré/Pós-Condições**

```bash
# Ver apenas verificações de condições
node environment-simulator.js ... --stream \
  | grep -E 'Pre-conditions|Post-conditions'
```

**Output esperado:**
```
[SCENE] Pre-conditions for 'SCN_MoveAGV1toA': ✓ Satisfied
[SCENE] Post-conditions for 'SCN_MoveAGV1toA': ✓ Verified
[SCENE] Pre-conditions for 'SCN_AGV2movePartToE': ✗ Failed
   agv2.location == stationC.ID ✗
   part.location == stationC.ID ✗
```

### **Caso 4: Análise de Performance**

```bash
# Extrair métricas de duração
node environment-simulator.js ... --stream \
  | grep 'Duration:' \
  | awk '{print $NF}'
```

**Output esperado:**
```
1.234s
0.987s
2.345s
1.567s
```

### **Caso 5: Análise com jq (JSONL)**

```bash
# Analisar logs JSONL com jq
cat generated/SysADLArchitecture-*.jsonl | jq -r '
  select(.elementType == "scene_completed") | 
  "\(.scene): \(.duration)ms"
'
```

**Output esperado:**
```
SCN_MoveAGV1toA: 1234ms
SCN_MoveAGV2toC: 987ms
SCN_AGV1movePartToC: 2345ms
SCN_AGV2movePartToE: 1567ms
```

---

## 🛠️ Scripts Úteis

### **Script 1: Resumo de Execução**

```bash
#!/bin/bash
# summary.sh - Gera resumo de uma execução

LOG_FILE=$1

echo "=== Resumo de Execução ==="
echo ""
echo "Total de Eventos:"
grep '^\[EVENT\]' "$LOG_FILE" | wc -l
echo ""
echo "Total de Cenas:"
grep '^\[SCENE\]' "$LOG_FILE" | grep "Starting" | wc -l
echo ""
echo "Cenas Completadas:"
grep '^\[SCENE\]' "$LOG_FILE" | grep "Completed" | wc -l
echo ""
echo "Erros:"
grep '^\[ERROR\]' "$LOG_FILE" | wc -l
```

**Uso:**
```bash
node environment-simulator.js ... --stream > execution.log
./summary.sh execution.log
```

### **Script 2: Timeline de Eventos**

```bash
#!/bin/bash
# timeline.sh - Cria timeline visual

LOG_FILE=$1

grep -E '^\[EVENT\]|^\[SCENE\]|^\[SCENARIO\]' "$LOG_FILE" \
  | sed 's/^\[EVENT\]/  📤/' \
  | sed 's/^\[SCENE\]/    🎬/' \
  | sed 's/^\[SCENARIO\]/  🎯/'
```

**Output esperado:**
```
  🎯 Executing scenario 'Scenario1' (00:00.010)
    🎬 Starting scene 'SCN_MoveAGV1toA' (00:00.012)
  📤 Triggering event 'cmdSupervisor' (00:00.123)
  📤 Event 'cmdAGV2toC' triggered (00:00.124)
    🎬 Completed scene 'SCN_MoveAGV1toA' (00:01.246)
```

### **Script 3: Extrator de Métricas**

```bash
#!/bin/bash
# metrics.sh - Extrai métricas de performance

JSONL_FILE=$1

echo "=== Métricas de Performance ==="
echo ""

# Duração média de cenas
echo "Duração média de cenas:"
cat "$JSONL_FILE" \
  | jq -r 'select(.elementType == "scene_completed") | .duration' \
  | awk '{sum+=$1; n++} END {if(n>0) print sum/n "ms"}'
echo ""

# Top 5 cenas mais lentas
echo "Top 5 cenas mais lentas:"
cat "$JSONL_FILE" \
  | jq -r 'select(.elementType == "scene_completed") | "\(.scene): \(.duration)ms"' \
  | sort -t: -k2 -nr \
  | head -5
```

---

## 📝 Formato de Log Detalhado

### **Estrutura Console**

```
[PREFIX] Sumário narrativo (timestamp relativo)
   Detalhe 1: valor
   Detalhe 2: valor
   Metadata: contexto adicional
```

### **Estrutura JSONL**

```json
{
  "sequence": 0,
  "timestamp": 1762267827233,
  "iso_time": "2025-11-04T14:50:27.233Z",
  "elementType": "scene_started",
  "scene": "SCN_MoveAGV1toA",
  "preconditions": {"satisfied": true},
  "when": 1762267827232
}
```

### **Tipos de Elementos Suportados**

| Element Type | Descrição | Exemplo |
|--------------|-----------|---------|
| `scenario_execution_started` | Início de execução | MyScenariosExecution |
| `scenario_started` | Início de cenário | Scenario1 |
| `scenario_completed` | Fim de cenário | Scenario1 (5.678s) |
| `scene_started` | Início de cena | SCN_MoveAGV1toA |
| `scene_completed` | Fim de cena | SCN_MoveAGV1toA (1.234s) |
| `event_triggered` | Evento disparado | cmdSupervisor |
| `entity_created` | Entidade criada | agv1 (Vehicle) |
| `environment_activated` | Ambiente ativado | MyFactoryConfiguration |

---

## 🎯 Melhores Práticas

### **1. Filtragem Eficiente**

```bash
# ✅ BOM: Filtra apenas o necessário
node simulator.js ... | grep '^\[ERROR\]'

# ❌ RUIM: Processa tudo antes de filtrar
node simulator.js ... > all.log && cat all.log | grep ERROR
```

### **2. Redirecionamento Inteligente**

```bash
# ✅ BOM: Separa console de arquivo
node simulator.js ... --stream \
  | tee >(grep '^\[ERROR\]' > errors.log) \
  | grep -v '^\[INFO\]'

# ❌ RUIM: Mistura tudo
node simulator.js ... > everything.log
```

### **3. Análise JSONL**

```bash
# ✅ BOM: Usa jq para análise estruturada
cat logs/*.jsonl | jq -r 'select(.elementType == "error")'

# ❌ RUIM: Usa grep em JSON
cat logs/*.jsonl | grep '"elementType":"error"'
```

---

## 🔗 Referências

- **Especificação**: `NARRATIVE-LOGGING-IMPLEMENTATION.md`
- **Status**: `NARRATIVE-LOGGING-STATUS.md`
- **Framework**: `sysadl-framework/ExecutionLogger.js`
- **Constantes**: `sysadl-framework/LoggingConstants.js`

---

**Última atualização**: 4 de novembro de 2025  
**Versão**: v0.4  
**Status**: ✅ OPERACIONAL

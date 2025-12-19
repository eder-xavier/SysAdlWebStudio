# SysADLSimulator.js - Guia de Uso

## 📖 Visão Geral

O **SysADLSimulator.js** é um wrapper/orquestrador unificado que simplifica a execução de modelos SysADL, automatizando o processo de transformação e execução.

## 🚀 Uso Básico

### Comando Simples
```bash
node SysADLSimulator.js AGV-completo.sysadl
```

**O que acontece:**
1. ✅ Valida o arquivo `.sysadl`
2. 🔄 Transforma automaticamente para `.js`
3. ▶️ Executa o código gerado
4. 📊 Gera relatório de simulação
5. 💾 Salva relatório em JSON

### Saída Esperada
```
🚀 SysADL Simulator - Unified Execution
================================================================================
📋 Step 1: Validating input...
  ✓ Input file validated: AGV-completo.sysadl
🔄 Step 2: Transforming .sysadl to .js...
  ✓ Generated: generated/AGV-completo.js
  ✓ Generated: generated/AGV-completo-env-scen.js
▶️  Step 3: Executing generated code...
  ✓ Execution completed in 17ms
📊 Step 4: Generating report...
💾 Step 5: Saving report...
  ✓ Report saved: generated/simulation-report-1764736720587.json

📊 Simulation Summary:
  Input: AGV-completo.sysadl
  Total duration: 2130ms
  Generated file: generated/AGV-completo.js (94.52 KB)
  Execution time: 17ms
  Log lines: 0

================================================================================
✅ Simulation completed successfully!
```

---

## ⚙️ Opções Disponíveis

### `--output-dir <dir>`
Especifica o diretório de saída para arquivos gerados.

```bash
node SysADLSimulator.js AGV-completo.sysadl --output-dir ./output
```

**Padrão:** `./generated`

### `--verbose`
Ativa modo verboso com mais detalhes de execução.

```bash
node SysADLSimulator.js AGV-completo.sysadl --verbose
```

### `--enable-sim-logger`
Ativa o SimulationLogger para rastreamento detalhado de fluxo de dados.

```bash
node SysADLSimulator.js AGV-completo.sysadl --enable-sim-logger
```

### `--no-save-report`
Não salva o relatório em arquivo (apenas exibe no console).

```bash
node SysADLSimulator.js AGV-completo.sysadl --no-save-report
```

### `--help` ou `-h`
Exibe ajuda com todas as opções disponíveis.

```bash
node SysADLSimulator.js --help
```

---

## 📁 Arquivos Gerados

### Estrutura de Saída
```
generated/
├── AGV-completo.js                    # Código JavaScript principal
├── AGV-completo-env-scen.js          # Ambiente e cenários
└── simulation-report-<timestamp>.json # Relatório de simulação
```

### Relatório de Simulação
```json
{
  "simulation": {
    "inputFile": "AGV-completo.sysadl",
    "timestamp": "2025-12-03T04:25:20.587Z",
    "totalDuration": 2130
  },
  "transformation": {
    "mainFile": "generated/AGV-completo.js",
    "envScenFile": "generated/AGV-completo-env-scen.js",
    "mainSize": 96788
  },
  "execution": {
    "success": true,
    "duration": 17,
    "logLines": 0
  },
  "config": {
    "outputDir": "./generated",
    "enableSimLogger": false,
    "saveReport": true,
    "verbose": false
  }
}
```

---

## 🔄 Comparação: Antes vs Depois

### ❌ Antes (2 comandos)
```bash
# 1. Transformar
node transformer.js AGV-completo.sysadl generated/AGV-completo.js

# 2. Executar
node generated/AGV-completo.js
```

### ✅ Depois (1 comando)
```bash
node SysADLSimulator.js AGV-completo.sysadl
```

**Benefícios:**
- ✅ Processo simplificado
- ✅ Validação automática
- ✅ Relatórios automáticos
- ✅ Tratamento de erros unificado
- ✅ Configuração centralizada

---

## 🛠️ Uso Avançado

### Exemplo Completo
```bash
node SysADLSimulator.js AGV-completo.sysadl \
  --output-dir ./simulation-output \
  --enable-sim-logger \
  --verbose
```

### Uso como Módulo Node.js
```javascript
const SysADLSimulator = require('./SysADLSimulator');

const simulator = new SysADLSimulator({
  outputDir: './custom-output',
  enableSimLogger: true,
  saveReport: true,
  verbose: false
});

simulator.run('AGV-completo.sysadl')
  .then(report => {
    console.log('Simulation completed!');
    console.log('Duration:', report.simulation.totalDuration, 'ms');
  })
  .catch(error => {
    console.error('Simulation failed:', error.message);
  });
```

---

## ❗ Tratamento de Erros

### Arquivo não encontrado
```bash
$ node SysADLSimulator.js nao-existe.sysadl

❌ Simulation failed!
Error: File not found: nao-existe.sysadl
```

### Extensão inválida
```bash
$ node SysADLSimulator.js arquivo.txt

❌ Simulation failed!
Error: Invalid file extension. Expected .sysadl, got: .txt
```

### Erro de transformação
```bash
❌ Simulation failed!
Error: Transformation failed: Syntax error at line 42
```

---

## 📊 Métricas de Performance

O simulador rastreia automaticamente:
- ⏱️ **Tempo total** de simulação
- 🔄 **Tempo de transformação**
- ▶️ **Tempo de execução**
- 📦 **Tamanho dos arquivos** gerados
- 📝 **Número de linhas** de log

---

## 🎯 Casos de Uso

### 1. Desenvolvimento Rápido
```bash
# Testar mudanças rapidamente
node SysADLSimulator.js meu-modelo.sysadl
```

### 2. Debugging
```bash
# Modo verboso para debugging
node SysADLSimulator.js meu-modelo.sysadl --verbose --enable-sim-logger
```

### 3. Integração Contínua (CI)
```bash
# Executar em pipeline CI/CD
node SysADLSimulator.js modelo.sysadl --no-save-report || exit 1
```

### 4. Análise de Performance
```bash
# Gerar relatórios para análise
node SysADLSimulator.js modelo.sysadl --save-report
cat generated/simulation-report-*.json | jq '.execution.duration'
```

---

## 🔗 Integração com Outras Ferramentas

### Com visualizer.js
```bash
# 1. Executar simulação
node SysADLSimulator.js AGV-completo.sysadl

# 2. Visualizar logs
node visualizer.js generated/AGV-completo.js
```

### Com testes automatizados
```javascript
// test/integration.test.js
const SysADLSimulator = require('../SysADLSimulator');

test('AGV simulation completes successfully', async () => {
  const simulator = new SysADLSimulator({ saveReport: false });
  const report = await simulator.run('AGV-completo.sysadl');
  
  expect(report.execution.success).toBe(true);
  expect(report.execution.duration).toBeLessThan(1000);
});
```

---

## ✅ Conclusão

O **SysADLSimulator.js** simplifica drasticamente o fluxo de trabalho de desenvolvimento e teste de modelos SysADL, automatizando tarefas repetitivas e fornecendo feedback consistente.

**Próximos passos:**
- Experimente com seus próprios modelos `.sysadl`
- Explore as opções de configuração
- Integre com seu fluxo de trabalho existente

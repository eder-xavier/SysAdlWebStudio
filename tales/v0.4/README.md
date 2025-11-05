# SysADL Framework v0.4 - Estrutura do Projeto

Este é o diretório principal do SysADL Framework v0.4, contendo todos os componentes organizados.

## 📁 Estrutura de Diretórios

```
v0.4/
├── 📄 *.sysadl                    # Modelos SysADL (AGV, RTC, Simple, etc.)
├── 📄 *.js                        # Scripts de transformação e simulação
├── 📄 *.peg                       # Gramática PEG.js do parser
├── 📂 sysadl-framework/           # 🏗️ Framework principal
│   ├── SysADLBase.js             # Classe base do framework
│   ├── SceneExecutor.js          # Phase 4: Executor de cenas
│   ├── EventInjector.js          # Phase 4: Injetor de eventos
│   ├── EventScheduler.js         # Phase 5.2: Agendador de eventos ⭐ NEW!
│   ├── ExecutionLogger.js        # Phase 5: Sistema de logging narrativo ✅
│   ├── LoggingConstants.js       # Phase 5: Prefixos e constantes ✅
│   ├── ReactiveConditionWatcher.js # Phase 3: Monitor reativo
│   └── ...                       # Outros componentes
├── 📂 test/                       # 🧪 Todos os testes
│   ├── README.md                 # Documentação dos testes
│   ├── test-phase4-integration.js
│   └── ...                       # Demais testes
├── 📂 docs/                       # 📚 Toda a documentação
│   ├── README.md                 # Índice da documentação
│   ├── PHASE3_COMPLETE.md
│   ├── VALIDATION_REPORT.md
│   └── ...                       # Demais documentos
├── 📂 generated/                  # 🔄 Modelos JavaScript gerados
├── 📂 logs/                       # 📊 Logs e relatórios de execução
└── 🔧 Scripts de transformação
```

## 🎯 Componentes Principais

### **Parser e Transformação**
- `sysadl-parser.js` - Parser principal
- `sysadl.peg` - Gramática PEG.js
- `transformer.js` - Transformador principal
- `transform_all.sh` - Script para transformar todos os modelos

### **Simulação e Ambiente**
- `environment-simulator.js` - Simulador de ambiente
- `simulator.js` - Simulador principal
- `env-scenario-generic-demo.js` - Demo de cenários

### **Modelos SysADL**
- `AGV-completo.sysadl` - Modelo completo do AGV
- `RTC.sysadl` - Modelo Runtime Contract
- `Simple.sysadl` - Modelo simples para testes
- `TestModel.sysadl` - Modelo para testes

## 🚀 Como Usar

### **Desenvolvimento**
```bash
# Executar testes principais
cd test/
node test-phase4-integration.js

# Transformar modelos
./transform_all.sh

# Executar simulação
node environment-simulator.js
```

### **Consultar Documentação**
```bash
# Ver documentação completa
cd docs/
cat README.md

# Ver testes disponíveis
cd test/
cat README.md
```

## 📋 Status do Desenvolvimento

- ✅ **Phase 1**: Parser básico
- ✅ **Phase 2**: Elementos estruturais  
- ✅ **Phase 3**: Sistema reativo completo
- ✅ **Phase 4**: Scene Execution Engine completo
- ✅ **Phase 5**: Narrative Logging System completo
- ✅ **Phase 5.1**: ScenarioExecution Integration completo
- ✅ **Phase 5.2**: EventScheduler Implementation completo
- ✅ **Phase 5.3**: Entity Binding em Cenas completo ⭐ **NEW!**
- 🚧 **Phase 5.4**: Testes Avançados (próximo)

### **🎉 Narrative Logging System**
O framework inclui um sistema de logging narrativo que transforma logs técnicos em narrativas legíveis:

- **Prefixos text-only**: `[START]`, `[EVENT]`, `[SCENE]`, `[SCENARIO]`, etc.
- **Timestamps relativos**: Formato `mm:ss.SSS`
- **Sumários narrativos**: Descrições em linguagem natural
- **Formato híbrido**: Texto + JSON estruturado
- **Output JSONL**: Logs estruturados para análise

📖 Ver: `NARRATIVE-LOGGING-STATUS.md` para detalhes completos

### **🚀 ScenarioExecution Integration**
A integração completa de execução de cenários está funcional:

- **Execução Assíncrona**: Cenários executam em background
- **Método executeScenario()**: Executa cenários individuais por nome
- **Context Enriquecido**: Acesso a scenarios, scenes e eventScheduler
- **Logging Completo**: Rastreamento de início, fim e falhas
- **Geração Automática**: Classes de cenário geradas com método execute()

📖 Ver: `SCENARIO-EXECUTION-STATUS.md` para detalhes técnicos

### **✨ EventScheduler - NEW! (Phase 5.2)**
Sistema completo de agendamento de eventos para execução de cenários:

- **3 Estratégias de Agendamento**:
  - `scheduleAfterScenario()`: Eventos após conclusão de cena/cenário
  - `scheduleOnCondition()`: Eventos baseados em condições booleanas
  - `scheduleAfterDelay()`: Eventos com delay temporal
- **Monitoramento Condicional**: Sistema reativo com verificação a cada 100ms
- **Integração Completa**: Notificações automáticas após cenas/cenários
- **Transformação de Expressões**: Acesso automático a `environmentConfig`
- **Logging Narrativo**: Rastreamento completo de eventos agendados e disparados

**Sintaxe SysADL:**
```sysadl
ScenarioExecution to MyScenarios {
  inject Event1 after Scenario1;           // Após cenário
  inject Event2 when temperature > 80;     // Condicional
  
  Scenario1;
  Scenario2;
}
```

📖 Ver:
- `EVENT-SCHEDULER-DOCUMENTATION.md` - Documentação completa
- `EVENT-SCHEDULER-QUICK-REFERENCE.md` - Guia rápido
- `EVENT-SCHEDULER-TEST-EXAMPLES.md` - Exemplos de teste
- `PHASE-5.2-COMPLETE.md` - Relatório de conclusão

## 🔗 Referências Rápidas

- **Documentação**: [`docs/README.md`](docs/README.md)
- **Testes**: [`test/README.md`](test/README.md)
- **Framework**: [`sysadl-framework/`](sysadl-framework/)
- **Modelos**: [`generated/`](generated/)

---
*SysADL Framework v0.4 - Sistema de Arquitetura e Design Language*
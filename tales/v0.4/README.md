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
│   ├── ExecutionLogger.js        # Phase 4: Sistema de logging
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
- 🚧 **Phase 5**: Scenario Execution Engine (próximo)

## 🔗 Referências Rápidas

- **Documentação**: [`docs/README.md`](docs/README.md)
- **Testes**: [`test/README.md`](test/README.md)
- **Framework**: [`sysadl-framework/`](sysadl-framework/)
- **Modelos**: [`generated/`](generated/)

---
*SysADL Framework v0.4 - Sistema de Arquitetura e Design Language*
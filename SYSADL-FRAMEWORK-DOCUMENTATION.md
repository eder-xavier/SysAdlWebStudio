# SysADL Framework: Documentação Técnica Completa

## Visão Geral

O **SysADL Framework** é um sistema avançado de transformação e execução que converte especificações SysADL (System Architecture Description Language) em código JavaScript executável, oferecendo capacidades de simulação reativa em tempo real para sistemas complexos.

---

## 1. Arquitetura do Framework

### 1.1 Componentes Principais

O framework é estruturado em três camadas principais:

**Camada de Transformação:**
- `transformer.js` - Motor de transformação SysADL → JavaScript
- `parser` - Análise sintática das especificações SysADL
- `code-generator` - Geração de código JavaScript otimizado

**Camada de Execução (SysADL Framework):**
- `SysADLBase.js` - Classes base e infraestrutura fundamental
- `environment-simulator.js` - Simulador de ambientes e cenários
- Componentes reativos (Phase 4-6)

**Camada Reativa (Sistema Avançado):**
- `ReactiveConditionWatcher.js` - Monitoramento reativo de condições
- `ReactiveStateManager.js` - Gerenciamento de estado reativo
- `DependencyTracker.js` - Rastreamento automático de dependências
- `ExecutionLogger.js` - Logging avançado com timestamps
- `EventInjector.js` - Injeção de eventos em tempo real
- `ScenarioExecutor.js` - Execução de cenários complexos

---

## 2. Processo de Transformação

### 2.1 Fluxo de Conversão SysADL → JavaScript

```
Especificação SysADL (.sysadl)
           ↓
    Parser (PEG.js/Nearley)
           ↓
    AST (Abstract Syntax Tree)
           ↓
    Transformer Engine
           ↓
  Código JavaScript Gerado (.js)
           ↓
    Environment Simulator
           ↓
   Execução com Monitoramento Reativo
```

### 2.2 Funcionalidades do Transformer

**Sintaxe Natural de Injeção:**
```javascript
// Comentário preservado no código gerado:
// inject AGV2atStationD after SCN_MoveAGV1toA;

// Implementação JavaScript funcional:
if (!context.entities.AGV2atStationD.location) {
  context.entities.AGV2atStationD.location = {};
}
context.entities.AGV2atStationD.location = 'StationD';
```

**Geração de Classes:**
- Entidades (Entity classes)
- Componentes (Component classes com ports)
- Conectores (Connector classes com binding)
- Tipos de dados (DataType, ValueType, Enum)
- Portas (SimplePort, CompositePort)

**Características Avançadas:**
- **Resolução de Dependências:** Ordenação automática por dependências
- **Mapeamento de Pacotes:** Prefixos automáticos (PT_, CP_, CN_)
- **Instâncias Hierárquicas:** Suporte a componentes aninhados
- **Binding Automático:** Conexão inteligente de portas

---

## 3. Sistema de Execução

### 3.1 Environment Simulator

O `environment-simulator.js` é o motor principal de execução:

**Funcionalidades Principais:**
```javascript
// Carregamento de modelos
const { type, mod, model, factoryFunction } = loadModel(resolvedPath);

// Detecção automática de portas de entrada
const inputPorts = findInputPorts(model);

// Execução de cenários
model.startScenarioExecution(scenarioName);
```

**Modos de Operação:**
- **Stream Mode:** Logs detalhados em tempo real
- **Interactive Mode:** CLI interativo para controle
- **Loop Mode:** Execução contínua
- **Scenario Mode:** Execução de cenários específicos

### 3.2 Gerenciamento de Ciclo de Vida

**Inicialização:**
1. Carregamento e validação do modelo
2. Inicialização dos componentes reativos
3. Setup do sistema de monitoramento
4. Descoberta de portas e cenários

**Execução:**
1. Monitoramento reativo de condições
2. Injeção de eventos automática/manual
3. Execução de cenários sequenciais
4. Logging contínuo com timestamps

**Finalização:**
1. Limpeza de timers e intervalos
2. Flush final dos logs
3. Saída graceful do processo

---

## 4. Sistema Reativo (Phase 4-6)

### 4.1 ReactiveConditionWatcher

Sistema de monitoramento baseado em eventos que substitui polling por avaliação reativa:

**Características:**
- **Performance:** 10-100x melhor que polling tradicional
- **Responsividade:** Avaliação em tempo real baseada em mudanças
- **Rastreamento de Dependências:** Análise automática de expressões
- **Fallback Inteligente:** Polling como backup quando necessário

```javascript
// Exemplo de uso
watcher.watchCondition('AGV_at_station', 
  'vehicle.location == "StationA"', 
  (context) => {
    console.log('AGV chegou na estação!');
    // Executa ações específicas
  }
);
```

### 4.2 ReactiveStateManager

Gerenciador de estado com propagação de mudanças:

```javascript
// Atualização de estado que dispara reações
stateManager.setValue('vehicle.location', 'StationB');

// Subscribe a mudanças específicas
stateManager.subscribe('vehicle.location', (newVal, oldVal) => {
  console.log(`Veículo moveu de ${oldVal} para ${newVal}`);
});
```

### 4.3 ExecutionLogger

Sistema de logging avançado com sessões e batching:

```javascript
// Log com contexto completo
logger.logExecution({
  type: 'scenario_execution',
  name: 'AGV_Transport',
  initialState: { location: 'StationA' },
  finalState: { location: 'StationB' },
  duration: 1500,
  success: true
});
```

---

## 5. Modelo de Dados Gerado

### 5.1 Estrutura do Código Gerado

**Entidades de Ambiente:**
```javascript
class Vehicle extends Entity {
  constructor(name, opts = {}) {
    const defaultProperties = {
      location: null,
      status: 'idle'
    };
    
    super(name, {
      entityType: 'Vehicle',
      properties: { ...defaultProperties, ...opts.properties },
      roles: ["outNotification", "inCommand", "sensor", "arm"]
    });
  }
}
```

**Execução de Cenários:**
```javascript
class MyScenariosExecution extends ScenarioExecution {
  start() {
    console.log('[MyScenariosExecution] Starting custom scenario execution');
    
    // inject AGV2atStationD after SCN_MoveAGV1toA;
    if (!context.entities.AGV2atStationD.location) {
      context.entities.AGV2atStationD.location = {};
    }
    context.entities.AGV2atStationD.location = 'StationD';
    
    return { success: true, message: 'Scenario execution completed successfully' };
  }
}
```

### 5.2 Integração com Framework Tradicional

**Compatibilidade Híbrida:**
```javascript
// Modelo tradicional SysADL
const traditionalModel = require('./AGV-completo');

// Modelo de ambiente e cenários
function createEnvironmentModel() {
  const model = traditionalModel.createModel();
  
  // Integração com componentes reativos
  model.environments = { /* ... */ };
  model.scenarios = { /* ... */ };
  
  return model;
}
```

---

## 6. Características Técnicas Avançadas

### 6.1 Otimizações de Performance

**Avaliação Lazy:**
- Componentes só são inicializados quando necessários
- Portas criadas sob demanda
- Conectores bindados dinamicamente

**Caching Inteligente:**
- AST cacheado para reutilização
- Dependências calculadas uma vez
- Estados anteriores mantidos para comparação

**Batching de Operações:**
- Logs agrupados para I/O eficiente
- Eventos processados em lotes
- Atualizações de estado batched

### 6.2 Tratamento de Erros

**Recuperação Automática:**
```javascript
try {
  // Operação reativa
  this.evaluateCondition(conditionId);
} catch (error) {
  console.error(`Error in reactive evaluation: ${error.message}`);
  
  // Fallback para polling
  if (this.config.enableFallbackPolling) {
    return this.watchConditionWithPolling(conditionId, expression, callback);
  }
  throw error;
}
```

**Validação Robusta:**
- Verificação de tipos em tempo de execução
- Validação de dependências circulares
- Detecção de recursos não encontrados

---

## 7. Casos de Uso e Exemplos

### 7.1 Sistema AGV (Automated Guided Vehicle)

**Contexto:** Sistema de automação fabril com veículos autônomos, estações e supervisório.

**Entidades Principais:**
- `Vehicle` - Veículos com localização e comandos
- `Station` - Estações de trabalho com sinalização
- `Supervisory` - Sistema de controle central
- `PartX` - Peças a serem transportadas

**Cenários Implementados:**
```javascript
// Cenário: Transporte de AGV entre estações
inject AGV1atStationA after setup;
inject AGV1movetoStationB after AGV1atStationA;
inject AGV1atStationB after AGV1movetoStationB;
```

### 7.2 Monitoramento Reativo

**Condições de Exemplo:**
```javascript
// AGV chegou na estação de destino
vehicle.location == target_station

// Sistema pronto para nova operação
supervisory.status == 'ready' && all_vehicles.idle == true

// Condição de emergência
emergency_button.pressed == true || safety_system.fault == true
```

---

## 8. Instalação e Configuração

### 8.1 Estrutura de Arquivos

```
sysadl-project/
├── sysadl-framework/           # Framework core
│   ├── SysADLBase.js
│   ├── ReactiveConditionWatcher.js
│   ├── ReactiveStateManager.js
│   ├── ExecutionLogger.js
│   └── ...
├── generated/                  # Código gerado
│   ├── AGV-completo.js        # Modelo tradicional
│   └── AGV-completo-env-scen.js # Modelo ambiente/cenários
├── transformer.js             # Motor de transformação
├── environment-simulator.js   # Simulador principal
└── *.sysadl                   # Especificações fonte
```

### 8.2 Uso Básico

**1. Transformação:**
```bash
node transformer.js input.sysadl --output generated/model.js
```

**2. Execução Simples:**
```bash
node environment-simulator.js generated/model.js
```

**3. Execução com Cenário:**
```bash
node environment-simulator.js generated/model.js --scenario=MyScenario --stream
```

**4. Modo Interativo:**
```bash
node environment-simulator.js generated/model.js --interactive
```

---

## 9. API e Interfaces

### 9.1 Interface do Simulator

```javascript
const simulator = require('./environment-simulator');

// Carregamento programático
const { model, type } = simulator.loadModel('./generated/model.js');

// Busca de portas
const inputPorts = simulator.findInputPorts(model);

// Execução programática
await simulator.runSimulation();
```

### 9.2 API de Extensão

**Custom Entity:**
```javascript
class CustomEntity extends Entity {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      entityType: 'Custom',
      // Propriedades específicas
    });
  }
  
  // Métodos customizados
  performAction() {
    this.updateProperty('status', 'active');
  }
}
```

**Custom Scenario:**
```javascript
class CustomScenarioExecution extends ScenarioExecution {
  start() {
    // Lógica de execução específica
    return this.executeCustomLogic();
  }
}
```

---

## 10. Monitoramento e Debugging

### 10.1 Logs e Telemetria

**ExecutionLogger Output:**
```json
{
  "sequence": 1,
  "timestamp": 1725819683318,
  "iso_time": "2025-09-25T17:01:23.318Z",
  "elementType": "scenario_execution_started",
  "execution": "MyScenariosExecution",
  "reactive": true,
  "dependencies": ["vehicle.location", "station.status"]
}
```

**Estatísticas de Performance:**
```javascript
const stats = reactiveWatcher.getStatistics();
console.log(`Eficiência: ${stats.efficiencyGain} melhor que polling`);
console.log(`Tempo médio de resposta: ${stats.averageResponseTime}ms`);
```

### 10.2 Debug e Troubleshooting

**Debug Mode:**
```bash
node environment-simulator.js model.js --stream --debug
```

**Dependency Graph:**
```javascript
reactiveWatcher.showDependencyGraph();
// Outputs:
// vehicle.location -> [AGV_at_station, transport_complete]
// station.status -> [station_ready, emergency_stop]
```

---

## 11. Performance e Escalabilidade

### 11.1 Otimizações Implementadas

**Sistema Reativo vs Polling:**
- **Polling tradicional:** ~50ms/condição → 20 eval/seg/condição
- **Sistema reativo:** Avaliação apenas quando necessário
- **Ganho típico:** 10-100x menos avaliações

**Gerenciamento de Memória:**
- Cleanup automático de subscriptions
- Cache com TTL para estados
- Batch processing para reduzir overhead

### 11.2 Limitações e Considerações

**Limites Atuais:**
- Máximo de 50 dependências por condição
- Fallback automático para polling em casos complexos
- Timeout configurável para condições de longa duração

**Boas Práticas:**
- Use expressões simples em condições reativas
- Evite dependências circulares
- Configure timeouts apropriados para cenários longos

---

## 12. Roadmap e Desenvolvimento Futuro

### 12.1 Funcionalidades Planejadas

**Melhorias Técnicas:**
- Suporte a WebSockets para monitoramento remoto
- Interface gráfica para visualização de estados
- Export para formatos de simulação externa (Simulink, etc.)

**Novas Funcionalidades:**
- Distributed execution para sistemas multi-nó
- Real-time constraints com garantias de timing
- Machine learning integration para otimização automática

### 12.2 Contribuição e Extensão

O framework foi projetado para extensibilidade:

**Pontos de Extensão:**
- Custom Entity types
- Custom Scenario logic  
- Custom reactive conditions
- Custom logging formats
- Custom execution modes

---

## Conclusão

O **SysADL Framework** representa uma solução completa e avançada para transformação e execução de sistemas complexos especificados em SysADL. Suas características reativas, otimizações de performance e capacidades de monitoramento em tempo real o tornam adequado tanto para prototipagem rápida quanto para simulações de alta fidelidade de sistemas industriais e arquiteturas de software complexas.

A combinação de sintaxe natural preservada, execução JavaScript eficiente e monitoramento reativo proporciona uma experiência de desenvolvimento produtiva e resultados de simulação confiáveis.

---

**Documento gerado em:** 25 de setembro de 2025  
**Versão do Framework:** v0.4  
**Autor:** SysADL Framework Development Team
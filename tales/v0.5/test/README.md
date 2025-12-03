# Testes do SysADL Framework v0.4

Esta pasta contém todos os testes, demos e scripts de validação do SysADL Framework.

## 📁 Estrutura dos Testes

### 🧪 Testes Principais (test-*.js)

#### Phase 4 - Scene Execution Engine
- **`test-phase4-integration.js`** - Teste completo de integração da Phase 4
- **`test-event-communication.js`** - Teste de comunicação EventInjector ↔ SceneExecutor  
- **`test-emitter-basic.js`** - Teste básico do EventEmitter

#### Phase 3 - Reactive System
- **`test-phase3-final.js`** - Teste final da Phase 3
- **`test-simple-reactive.js`** - Teste básico do sistema reativo
- **`test-reactive-performance.js`** - Teste de performance do sistema reativo
- **`test-simulator-reactive.js`** - Teste do simulador reativo

#### Integração e Validação
- **`test-full-integration.js`** - Teste de integração completa
- **`test-generated-reactive.js`** - Teste de código gerado reativo
- **`test-generated-generic.js`** - Teste de código gerado genérico
- **`test-generic-domain.js`** - Teste de domínio genérico
- **`test-cmdSupervisor-AGV-completo.js`** - Teste do supervisor de comandos AGV

### 🚀 Scripts de Execução (run-*.js)
- **`run-event-test.js`** - Script para execução de testes de eventos
- **`run-event-minitest.js`** - Script para mini-testes de eventos
- **`run-cmdSupervisor-chain.js`** - Script para execução do supervisor de comandos

### 🎯 Demos (demo-*.js)
- **`demo-generic-architecture.js`** - Demo da arquitetura genérica
- **`demo-any-domain.js`** - Demo de domínio genérico
- **`demo-real-integration.js`** - Demo de integração real

## 🏃‍♂️ Como Executar

### Executar da pasta test:
```bash
cd /Users/tales/desenv/SysAdlWebStudio/tales/v0.4/test

# Teste principal da Phase 4
node test-phase4-integration.js

# Teste de comunicação de eventos  
node test-event-communication.js

# Teste básico do EventEmitter
node test-emitter-basic.js
```

### Executar do diretório v0.4:
```bash
cd /Users/tales/desenv/SysAdlWebStudio/tales/v0.4

# Executar teste na pasta test
node test/test-phase4-integration.js
```

## 📊 Resultados Esperados

### ✅ Phase 4 - Scene Execution Engine
- SceneExecutor: Funcionando
- ExecutionLogger: Funcionando  
- EventInjector: Funcionando
- Integração SysADLBase: Funcionando
- Logging automático: Funcionando
- Relatórios detalhados: Funcionando
- Estatísticas de performance: Funcionando

### 📈 Métricas de Performance
- **Event Injector**: Taxa de sucesso 100%, tempo médio < 1ms
- **Scene Executor**: Taxa de sucesso 100%, timeout adequado
- **Total execuções**: Todas operações logadas corretamente

## 🔧 Criando Novos Testes

Quando criar um novo teste, siga estas convenções:

1. **Nome do arquivo**: `test-[funcionalidade].js`
2. **Localização**: Sempre na pasta `/test/`
3. **Imports**: Use caminhos relativos ao diretório pai:
   ```javascript
   const { Model } = require('../sysadl-framework/SysADLBase');
   const generatedModel = require('../generated/[model-name]');
   ```

4. **Estrutura básica**:
   ```javascript
   /**
    * Teste de [Funcionalidade]
    * Descrição do que está sendo testado
    */
   
   async function testFunctionality() {
     console.log('🧪 TESTE [FUNCIONALIDADE]');
     
     try {
       // Setup
       const model = new Model('TestModel', {});
       
       // Testes
       // ...
       
       console.log('✅ Teste concluído com sucesso!');
     } catch (error) {
       console.error('❌ Erro no teste:', error.message);
       process.exit(1);
     }
   }
   
   testFunctionality();
   ```

## 📝 Logs e Relatórios

Os testes geram automaticamente:
- **Logs detalhados** no console
- **Relatórios JSON** na pasta `../logs/`
- **Estatísticas de performance** em tempo real

## 🛠️ Dependências

Todos os testes dependem do framework principal:
- `../sysadl-framework/SysADLBase.js`
- `../sysadl-framework/SceneExecutor.js`
- `../sysadl-framework/EventInjector.js`
- `../sysadl-framework/ExecutionLogger.js`
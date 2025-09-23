#!/usr/bin/env node
/**
 * Exemplo Prático: EventInjector no ScenarioExecution
 * Demonstra diferentes usos de event injection em cenários SysADL
 */

const model = require('./generated/AGV-completo-env-scen.js');

console.log('🚀 Demonstração de EventInjector no ScenarioExecution');
console.log('======================================================\n');

async function demonstrateEventInjection() {
  try {
    // 1. Criar instância do ScenarioExecution
    console.log('📦 1. Criando ScenarioExecution com EventInjector integrado');
    const scenarioExecution = new model.MyScenariosExecution();
    
    console.log('✅ ScenarioExecution criado com:');
    console.log(`   - State initializations: ${scenarioExecution.executionConfig.stateInitializations.length}`);
    console.log(`   - Scenarios: ${scenarioExecution.executionConfig.scenarios.length}`);
    console.log(`   - Event injections: ${scenarioExecution.executionConfig.eventInjections.length}`);
    console.log('');

    // 2. Demonstrar Event Injection Simples
    console.log('⚡ 2. Event Injection Simples');
    console.log('Exemplo de injeção de evento único:');
    console.log(`
    // Sintaxe SysADL:
    inject cmdSupervisor;
    inject AGV1NotifArriveA after 5s;
    inject AGV2NotifTravelC when agv2.location == stationC.ID;
    `);

    // Simular event injection
    const singleInjection = {
      type: 'single',
      eventName: 'cmdSupervisor',
      timing: { type: 'immediate' },
      parameters: {},
      options: {}
    };

    console.log('📋 Configuração de event injection:');
    console.log(JSON.stringify(singleInjection, null, 2));
    console.log('');

    // 3. Demonstrar Event Injection em Lote
    console.log('⚡ 3. Event Injection em Lote (Batch)');
    console.log('Exemplo de injeção de múltiplos eventos:');
    console.log(`
    // Sintaxe SysADL:
    inject_batch [cmdAGV1toA, cmdAGV2toC] sequential;
    inject_batch [AGV1NotifTravelA, AGV2NotifTravelC] parallel after 2s;
    `);

    const batchInjection = {
      type: 'batch',
      events: ['cmdAGV1toA', 'cmdAGV2toC'],
      mode: 'sequential',
      timing: { type: 'delay', value: 2000 },
      parameters: {},
      options: {}
    };

    console.log('📋 Configuração de batch injection:');
    console.log(JSON.stringify(batchInjection, null, 2));
    console.log('');

    // 4. Demonstrar Métodos de EventInjector
    console.log('🔧 4. Métodos do EventInjector disponíveis:');
    
    const injectorMethods = [
      'processEventInjections()',
      'executeEventInjection(injection)',
      'injectSingleEvent(injection)', 
      'injectBatchEvents(injection)',
      'calculateEventDelay(timing)'
    ];

    injectorMethods.forEach(method => {
      console.log(`   ✅ ${method}`);
    });
    console.log('');

    // 5. Demonstrar Cálculo de Delay
    console.log('⏱️ 5. Cálculo de Timing/Delay');
    
    const timingExamples = [
      { type: 'immediate', expected: '0ms' },
      { type: 'delay', value: 5000, expected: '5000ms' },
      { type: 'condition', expression: 'agv.location == target', expected: 'Runtime evaluation' },
      { type: 'before', scenario: 'Scenario1', expected: 'Coordinated with scenario' },
      { type: 'after', scene: 'SCN_MoveAGV1toA', expected: 'After scene completion' }
    ];

    console.log('Exemplos de timing:');
    timingExamples.forEach(timing => {
      const delay = scenarioExecution.calculateEventDelay(timing);
      console.log(`   ${timing.type}: ${delay}ms (${timing.expected})`);
    });
    console.log('');

    // 6. Demonstrar Event Injection Processing
    console.log('🔄 6. Processamento de Event Injections');
    console.log('Simulando processamento de events (array vazio no modelo atual):');
    
    try {
      await scenarioExecution.processEventInjections();
      console.log('✅ Event injection processing executado com sucesso');
    } catch (error) {
      console.log('⚠️ Event injection precisa de SysADLBase configurado:', error.message);
    }
    console.log('');

    // 7. Casos de Uso Práticos
    console.log('🎯 7. Casos de Uso Práticos');
    console.log(`
    Casos típicos de uso do EventInjector:
    
    🔹 Simulação de Falhas:
      inject AGVSystemFailure after 10s;
      inject EmergencyProtocol when agv.status == "failed";
    
    🔹 Teste de Carga:
      inject_batch [cmd1, cmd2, cmd3, cmd4] parallel;
    
    🔹 Sequências Coordenadas:
      inject StartProcess;
      inject CheckStatus after 5s;
      inject StopProcess after StartProcess;
    
    🔹 Condições Reativas:
      inject AlertSupervisor when temperature > 80;
      inject ActivateCooling when temperature > 90;
    `);

    // 8. Framework Integration
    console.log('🔗 8. Integração com Framework SysADL');
    console.log(`
    O EventInjector integra com:
    
    ✅ ExecutionLogger (557 linhas) - Logging detalhado
    ✅ ReactiveStateManager - Monitoramento de condições
    ✅ SceneExecutor - Coordenação com cenas
    ✅ ScenarioExecutor - Orquestração de cenários
    ✅ ExecutionController - Controle master de execução
    `);

    console.log('\n🎉 Demonstração completa do EventInjector no ScenarioExecution!');
    console.log('Para usar na prática, defina event injections no arquivo .sysadl e rode o transformer.');

  } catch (error) {
    console.error('❌ Erro na demonstração:', error);
  }
}

// Executar demonstração
demonstrateEventInjection().catch(console.error);
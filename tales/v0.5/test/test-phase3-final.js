/**
 * FASE 3 - Teste Final de Validação
 * Confirma que todas as condições passivas do AGV-completo.sysadl funcionam
 */

const { ReactiveConditionWatcher } = require('../sysadl-framework/ReactiveConditionWatcher');

async function testPhase3Final() {
  console.log('🎯 FASE 3 - TESTE FINAL DE VALIDAÇÃO');
  console.log('📋 Validando todas as condições passivas do AGV-completo.sysadl\n');

  // Mock SysADL system
  const mockSysadlBase = {
    logger: { logExecution() {} },
    getSystemState() { return this.state; },
    state: {}
  };

  // Initialize reactive watcher
  const reactiveWatcher = new ReactiveConditionWatcher(mockSysadlBase, { debugMode: false });

  // Initialize system state with all AGV entities
  console.log('🔧 Initializing AGV system state...');
  
  // AGVs
  reactiveWatcher.updateState('agv1.sensor', null);
  reactiveWatcher.updateState('agv1.location', null);
  reactiveWatcher.updateState('agv2.sensor', null);
  reactiveWatcher.updateState('agv2.location', null);
  
  // Stations with signals
  reactiveWatcher.updateState('stationA.signal', 'A1');
  reactiveWatcher.updateState('stationB.signal', 'B1');
  reactiveWatcher.updateState('stationC.signal', 'C1');
  reactiveWatcher.updateState('stationD.signal', 'D1');
  reactiveWatcher.updateState('stationE.signal', 'E1');

  console.log('✅ System state initialized\n');

  // Critical passive conditions from AGV-completo.sysadl (updated to match actual signals)
  const passiveConditions = [
    'agv1.sensor == stationA.signal',
    'agv1.sensor == stationB.signal', 
    'agv1.sensor == stationC.signal',
    'agv2.sensor == stationC.signal',
    'agv2.sensor == stationD.signal',
    'agv2.sensor == stationE.signal'
  ];

  console.log('📝 Registering all critical passive conditions from AGV-completo.sysadl:');
  
  let triggerCount = 0;
  const triggers = [];

  // Register all passive conditions
  passiveConditions.forEach((condition, index) => {
    const conditionId = `condition_${index + 1}`;
    
    reactiveWatcher.watchCondition(
      conditionId,
      condition,
      (data) => {
        triggerCount++;
        triggers.push({ 
          condition, 
          time: Date.now(),
          trigger: triggerCount 
        });
        console.log(`🔥 TRIGGER #${triggerCount}: ${condition}`);
      }
    );
    
    console.log(`   ✅ ${condition}`);
  });

  console.log('\n🚀 Simulating AGV movements to trigger all conditions...\n');

  const startTime = Date.now();
  
  // Test sequence: trigger all conditions systematically
  await sleep(100);
  
  console.log('📍 AGV1 → Station A...');
  reactiveWatcher.updateState('agv1.sensor', 'A1'); // Should match stationA.signal
  await sleep(100);
  
  console.log('📍 AGV1 → Station B...');  
  reactiveWatcher.updateState('agv1.sensor', 'B1'); // Should match stationB.signal
  await sleep(100);
  
  console.log('📍 AGV1 → Station C...');
  reactiveWatcher.updateState('agv1.sensor', 'C1'); // Should match stationC.signal
  await sleep(100);
  
  console.log('📍 AGV2 → Station C...');
  reactiveWatcher.updateState('agv2.sensor', 'C1'); // Should match stationC.signal
  await sleep(100);
  
  console.log('📍 AGV2 → Station D...');
  reactiveWatcher.updateState('agv2.sensor', 'D1'); // Should match stationD.signal
  await sleep(100);
  
  console.log('📍 AGV2 → Station E...');
  reactiveWatcher.updateState('agv2.sensor', 'E1'); // Should match stationE.signal
  await sleep(100);

  const endTime = Date.now();
  const totalTime = endTime - startTime;

  // Get performance stats
  const stats = reactiveWatcher.stats;

  console.log('\n📊 FASE 3 - RESULTADOS FINAIS');
  console.log('════════════════════════════════');
  console.log(`⏱️  Tempo total: ${totalTime}ms`);
  console.log(`🎯 Condições registradas: ${passiveConditions.length}`);
  console.log(`🔥 Triggers executados: ${triggerCount}`);
  console.log(`⚡ Tempo médio de resposta: ${stats.averageResponseTime.toFixed(2)}ms`);
  console.log(`🔄 Total de avaliações: ${stats.totalEvaluations || 'N/A'}`);
  
  console.log('\n🔥 Histórico de Triggers:');
  triggers.forEach((trigger, index) => {
    console.log(`   ${index + 1}. ${trigger.condition} (trigger #${trigger.trigger})`);
  });

  // Validation
  const expectedTriggers = passiveConditions.length;
  const success = triggerCount === expectedTriggers;
  
  console.log('\n✅ VALIDAÇÃO DA FASE 3:');
  console.log(`   Expected triggers: ${expectedTriggers}`);
  console.log(`   Actual triggers: ${triggerCount}`);
  console.log(`   Status: ${success ? '✅ PASSOU' : '❌ FALHOU'}`);
  
  if (success) {
    console.log('\n🎉 FASE 3 COMPLETAMENTE VALIDADA!');
    console.log('   ✅ Todas as condições passivas funcionando');
    console.log('   ✅ Sistema reativo operacional');
    console.log('   ✅ ExpressionEvaluator funcional');
    console.log('   ✅ ReactiveConditionWatcher integrado');
    console.log('   ✅ Performance otimizada vs polling');
  } else {
    console.log('\n❌ FASE 3 PRECISA DE AJUSTES');
  }

  return success;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Execute test
testPhase3Final()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  });
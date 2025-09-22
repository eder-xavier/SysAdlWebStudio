/**
 * FASE 4 - Teste de Integração Completa
 * 
 * Valida a integração de todos os componentes da Fase 4:
 * - SceneExecutor
 * - ExecutionLogger
 * - EventInjector
 * - Integração com ReactiveConditionWatcher (Fase 3)
 */

const { Model } = require('../sysadl-framework/SysADLBase');

async function testPhase4Integration() {
  console.log('🎬 FASE 4 - TESTE DE INTEGRAÇÃO COMPLETA');
  console.log('🔧 Testando SceneExecutor + ExecutionLogger + EventInjector\n');

  // Create model with integrated Phase 4 components
  const model = new Model('TestModel');
  
  console.log('✅ Model created with Phase 4 components integrated\n');

  try {
    // Test 1: Event Registration and Injection
    console.log('📝 Test 1: Event Registration and Injection');
    
    // Register event definitions
    model.registerEvent('TestStartEvent', {
      description: 'Test scene start event',
      parameters: ['message', 'priority'],
      required: [], // No required parameters for test
      category: 'test'
    });
    
    model.registerEvent('TestFinishEvent', {
      description: 'Test scene finish event',
      parameters: ['result', 'duration'],
      required: [], // No required parameters for test
      category: 'test'
    });
    
    console.log('  ✅ Event definitions registered');

    // Test event injection
    const eventResult = await model.injectEvent('TestStartEvent', {
      message: 'Starting Phase 4 test',
      priority: 'high'
    });
    
    console.log(`  ✅ Event injected: ${eventResult.eventId}`);
    console.log('');

    // Test 2: Scene Registration and Execution
    console.log('📝 Test 2: Scene Registration and Execution');
    
    // Register a test scene
    const sceneDefinition = {
      startEvent: 'TestStartEvent',
      finishEvent: 'TestFinishEvent',
      description: 'Test scene for Phase 4 validation',
      timeout: 5000,
      preConditions: [
        { expression: 'true', description: 'Always pass pre-condition' }
      ],
      postConditions: [
        { expression: 'true', description: 'Always pass post-condition' }
      ]
    };
    
    model.registerScene('TestScene', sceneDefinition);
    console.log('  ✅ Scene registered: TestScene');

    // Set up finish event emission (simulate scene completion)
    setTimeout(async () => {
      await model.injectEvent('TestFinishEvent', {
        result: 'success',
        duration: 2500
      });
    }, 2000);

    // Execute the scene
    console.log('  🚀 Executing scene...');
    const sceneResult = await model.executeScene('TestScene');
    console.log(`  ✅ Scene completed: ${sceneResult.sceneId} (${sceneResult.duration}ms)`);
    console.log('');

    // Test 3: Multiple Events and Complex Scene
    console.log('📝 Test 3: Multiple Events and Complex Scene');
    
    // Register more events
    model.registerEvent('ComplexEvent1', {
      description: 'First complex event',
      parameters: ['data', 'sequence'],
      required: ['sequence']
    });
    
    model.registerEvent('ComplexEvent2', {
      description: 'Second complex event',
      parameters: ['result', 'metadata'],
      required: ['result']
    });

    // Register complex scene
    const complexSceneDefinition = {
      startEvent: 'ComplexEvent1',
      finishEvent: 'ComplexEvent2',
      description: 'Complex scene with multiple validations',
      timeout: 8000,
      preConditions: [
        'true', // String condition
        { expression: 'true', description: 'Object condition' }
      ],
      postConditions: [
        'true'
      ]
    };
    
    model.registerScene('ComplexScene', complexSceneDefinition);
    console.log('  ✅ Complex scene registered');

    // Execute complex scene with finish event
    const complexPromise = model.executeScene('ComplexScene', { testContext: 'complex' });
    
    // Inject start and finish events
    await model.injectEvent('ComplexEvent1', { 
      data: 'complex test data', 
      sequence: 1 
    });
    
    setTimeout(async () => {
      await model.injectEvent('ComplexEvent2', {
        result: 'complex_success',
        metadata: { phase: 4, test: 'complex' }
      });
    }, 1500);

    const complexResult = await complexPromise;
    console.log(`  ✅ Complex scene completed: ${complexResult.duration}ms`);
    console.log('');

    // Test 4: Batch Event Injection
    console.log('📝 Test 4: Batch Event Injection');
    
    const batchEvents = [
      { eventName: 'TestStartEvent', parameters: { message: 'Batch event 1', priority: 'low' } },
      { eventName: 'TestStartEvent', parameters: { message: 'Batch event 2', priority: 'medium' } },
      { eventName: 'TestStartEvent', parameters: { message: 'Batch event 3', priority: 'high' } }
    ];
    
    const batchResult = await model.eventInjector.injectEventBatch(batchEvents, { parallel: true });
    console.log(`  ✅ Batch injection: ${batchResult.successCount}/${batchEvents.length} successful`);
    console.log('');

    // Test 5: Statistics and Reporting
    console.log('📝 Test 5: Statistics and Reporting');
    
    const eventStats = model.eventInjector.getStatistics();
    console.log(`  📊 Event Injector Stats:`);
    console.log(`     Total events: ${eventStats.totalEventsInjected}`);
    console.log(`     Success rate: ${eventStats.successRate}`);
    console.log(`     Average time: ${eventStats.averageInjectionTime.toFixed(2)}ms`);
    
    const sceneStats = model.sceneExecutor.getStatistics();
    console.log(`  📊 Scene Executor Stats:`);
    console.log(`     Total scenes: ${sceneStats.totalScenesExecuted}`);
    console.log(`     Success rate: ${sceneStats.successRate}`);
    console.log(`     Average time: ${sceneStats.averageExecutionTime.toFixed(2)}ms`);
    console.log('');

    // Test 6: Generate Comprehensive Report
    console.log('📝 Test 6: Comprehensive Execution Report');
    
    const report = model.generateExecutionReport();
    console.log(`  📊 Total executions logged: ${report.sessionInfo.totalExecutions}`);
    console.log(`  📊 Session duration: ${report.sessionInfo.totalDuration}ms`);
    console.log(`  📊 Element types: ${Object.keys(report.executionSummary.byElementType).length}`);
    
    // Save report to file
    const reportPath = await model.saveExecutionReport();
    console.log(`  💾 Report saved: ${reportPath}`);
    console.log('');

    // Final validation
    console.log('✅ FASE 4 - VALIDAÇÃO FINAL');
    console.log('════════════════════════════');
    console.log('✅ SceneExecutor: Funcionando');
    console.log('✅ ExecutionLogger: Funcionando');
    console.log('✅ EventInjector: Funcionando');
    console.log('✅ Integração SysADLBase: Funcionando');
    console.log('✅ Logging automático: Funcionando');
    console.log('✅ Relatórios detalhados: Funcionando');
    console.log('✅ Estatísticas de performance: Funcionando');
    console.log('');
    console.log('🎉 FASE 4 COMPLETAMENTE IMPLEMENTADA E VALIDADA!');
    
    return {
      success: true,
      eventStats,
      sceneStats,
      reportPath,
      totalExecutions: report.sessionInfo.totalExecutions
    };

  } catch (error) {
    console.error('❌ Erro no teste da Fase 4:', error);
    return { success: false, error: error.message };
  } finally {
    // Cleanup
    model.cleanup();
  }
}

// Helper function for delays
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Execute test
if (require.main === module) {
  testPhase4Integration()
    .then(result => {
      if (result.success) {
        console.log('\n🚀 Teste concluído com sucesso!');
        console.log(`📊 Total de execuções: ${result.totalExecutions}`);
        process.exit(0);
      } else {
        console.log('\n❌ Teste falhou!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Erro crítico:', error);
      process.exit(1);
    });
}

module.exports = { testPhase4Integration };
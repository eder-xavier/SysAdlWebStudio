/**
 * Teste simples para validar a comunicação entre EventInjector e SceneExecutor
 */

const SysADLBase = require('../sysadl-framework/SysADLBase');

async function testEventCommunication() {
  console.log('🧪 TESTE DE COMUNICAÇÃO EVENTOS');
  console.log('🔧 Testando comunicação entre EventInjector e SceneExecutor\n');

  try {
    // Create model
    const model = new SysADLBase.Model('CommunicationTest', {});
    console.log('✅ Model created\n');

    // Register simple events (no required parameters)
    model.registerEvent('StartEvent', {
      description: 'Simple start event',
      parameters: [],
      required: [],
      category: 'test'
    });
    
    model.registerEvent('FinishEvent', {
      description: 'Simple finish event', 
      parameters: [],
      required: [],
      category: 'test'
    });
    
    console.log('✅ Events registered\n');

    // Register simple scene with short timeout
    const sceneDefinition = {
      startEvent: 'StartEvent',
      finishEvent: 'FinishEvent',
      description: 'Simple test scene',
      timeout: 2000, // 2 seconds
      preConditions: [],
      postConditions: []
    };
    
    model.registerScene('SimpleScene', sceneDefinition);
    console.log('✅ Scene registered');
    console.log(`   Start event: ${sceneDefinition.startEvent}`);
    console.log(`   Finish event: ${sceneDefinition.finishEvent}`);
    console.log(`   Timeout: ${sceneDefinition.timeout}ms\n`);

    // Test: Inject finish event immediately after starting scene
    console.log('🚀 Starting scene execution...');
    
    // Debug EventEmitter
    console.log('🔍 EventEmitter details:');
    console.log('   eventSystemManager:', !!model.eventSystemManager);
    console.log('   eventInjector.eventEmitter:', !!model.eventInjector.eventEmitter);
    console.log('   Same emitter?', model.eventSystemManager ? 
      (model.eventSystemManager.getGlobalEmitter() === model.eventInjector.eventEmitter) : 'N/A');
    
    const scenePromise = model.executeScene('SimpleScene', null, {});
    
    // Inject finish event after a short delay
    setTimeout(async () => {
      console.log('⚡ Injecting finish event...');
      await model.injectEvent('FinishEvent', {});
      console.log('✅ Finish event injected');
    }, 500);

    // Wait for scene completion
    const result = await scenePromise;
    
    if (result.success) {
      console.log('✅ SUCCESS: Scene completed successfully!');
      console.log(`   Duration: ${result.duration}ms`);
    } else {
      console.log('❌ FAILED: Scene did not complete');
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

testEventCommunication();
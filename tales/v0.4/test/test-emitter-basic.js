/**
 * Teste básico do EventEmitter
 */

const { Model } = require('../sysadl-framework/SysADLBase');

console.log('🧪 TESTE BÁSICO EVENTEMITTER');
console.log('🔧 Testando comunicação direta EventEmitter');

async function testBasicEmitter() {
  // Create model
  const model = new Model({
    modelName: 'EmitterTest',
    logLevel: 'detailed'
  });

  console.log('✅ Model created');

  // Get the EventEmitter directly
  const emitter = model.eventInjector.eventEmitter;
  console.log('📡 EventEmitter obtido:', !!emitter);

  // Set up listener
  let eventReceived = false;
  emitter.once('TestEvent', (data) => {
    console.log('🎯 Evento recebido!', data);
    eventReceived = true;
  });

  console.log('👂 Listener registrado');

  // Emit event directly
  console.log('🚀 Emitindo evento diretamente...');
  emitter.emit('TestEvent', { test: 'data' });

  // Check if received
  setTimeout(() => {
    console.log('✅ Teste direto:', eventReceived ? 'SUCESSO' : 'FALHOU');
    
    // Now test via EventInjector
    testViaInjector(model);
  }, 100);
}

async function testViaInjector(model) {
  console.log('\n🧪 TESTE VIA EVENTINJECTOR');
  
  const emitter = model.eventInjector.eventEmitter;
  let eventReceived = false;
  
  emitter.once('TestEvent2', (data) => {
    console.log('🎯 Evento via injector recebido!', data);
    eventReceived = true;
  });

  console.log('👂 Listener via injector registrado');

  // Inject event
  console.log('⚡ Injetando evento...');
  await model.eventInjector.injectEvent('TestEvent2', { test: 'injected' });

  setTimeout(() => {
    console.log('✅ Teste via injector:', eventReceived ? 'SUCESSO' : 'FALHOU');
    process.exit(0);
  }, 100);
}

testBasicEmitter().catch(console.error);
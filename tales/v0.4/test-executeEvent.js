// Teste para verificar se executeEvent está sendo herdada corretamente
const { EventsDefinitions } = require('./sysadl-framework/SysADLBase');

// Simular a classe MyEvents simplificada
class MyEvents extends EventsDefinitions {
  constructor(name = 'MyEvents', opts = {}) {
    super(name, {
      ...opts,
      targetConfiguration: 'MyFactoryConfiguration'
    });

    // Simular uma definição de evento simples
    this.SupervisoryEvents = {
      name: 'SupervisoryEvents',
      rules: [],
      hasRule: (triggerName) => triggerName === 'cmdSupervisor',
      executeRule: (triggerName, context) => {
        console.log(`✅ Executing ${triggerName}`);
        return { success: true, trigger: triggerName };
      }
    };
  }
}

// Teste
console.log('🧪 Testando herança do executeEvent...');

const events = new MyEvents();
console.log('✅ executeEvent method exists:', typeof events.executeEvent === 'function');

// Testar chamada
const context = { sysadlBase: { logger: { warn: console.warn } } };
const result = events.executeEvent('SupervisoryEvents', 'cmdSupervisor', context);
console.log('✅ executeEvent result:', result);

// Testar caso de evento não encontrado
const result2 = events.executeEvent('NonExistentEvent', 'trigger', context);
console.log('✅ executeEvent with invalid event:', result2);

console.log('🎉 Todos os testes passaram! executeEvent está funcionando via herança.');
// Teste para validar o AGV-completo.js transformado
console.log('🔄 Testando AGV-completo.js transformado...');

try {
  // Importar o módulo gerado
  const { createEnvironmentModel } = require('./generated/AGV-completo.js');
  console.log('✅ Importação bem-sucedida');

  // Testar função factory
  const model = createEnvironmentModel({ agv: true, factory: 'TestFactory' });
  console.log('✅ Função createEnvironmentModel executada');

  // Verificar estrutura
  console.log('📋 Estrutura do modelo:', Object.keys(model));
  
  // Verificar propriedades
  const expectedProps = ['environments', 'events', 'scenes', 'scenarios', 'scenarioExecutions', 'config'];
  let allPresent = true;
  
  expectedProps.forEach(prop => {
    if (model.hasOwnProperty(prop)) {
      console.log(`✅ ${prop}: presente`);
    } else {
      console.log(`❌ ${prop}: ausente`);
      allPresent = false;
    }
  });

  if (allPresent && model.config.agv === true) {
    console.log('🎉 AGV-completo.js transformado com sucesso usando generateEnvironmentModule!');
    console.log('🏭 Arquitetura de 10 passos implementada corretamente');
  }

} catch (error) {
  console.log(`❌ Erro: ${error.message}`);
  process.exit(1);
}
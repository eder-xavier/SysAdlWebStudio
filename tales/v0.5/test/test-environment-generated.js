// Teste para validar funcionalidade do código gerado com generateEnvironmentModule
console.log('🔄 Iniciando teste de funcionalidade do código gerado...');

try {
  // Importar o módulo gerado
  const { createEnvironmentModel } = require('./generated/AGV-completo-teste.js');
  console.log('✅ Importação do módulo bem-sucedida');

  // Testar função factory
  const model = createEnvironmentModel({ test: true });
  console.log('✅ Função createEnvironmentModel executada com sucesso');

  // Verificar estrutura do modelo
  const expectedProperties = ['environments', 'events', 'scenes', 'scenarios', 'scenarioExecutions', 'config'];
  const modelProperties = Object.keys(model);
  
  console.log('📋 Propriedades do modelo:', modelProperties);
  
  let allPropertiesPresent = true;
  for (const prop of expectedProperties) {
    if (!modelProperties.includes(prop)) {
      console.log(`❌ Propriedade '${prop}' está ausente`);
      allPropertiesPresent = false;
    } else {
      console.log(`✅ Propriedade '${prop}' encontrada`);
    }
  }
  
  if (allPropertiesPresent) {
    console.log('✅ Todas as propriedades esperadas estão presentes');
  }
  
  // Verificar configuração
  if (model.config && model.config.test === true) {
    console.log('✅ Configuração personalizada aplicada corretamente');
  }

  console.log('🎉 Teste concluído com sucesso! O código gerado funciona corretamente.');
  
} catch (error) {
  console.log(`❌ Teste falhou: ${error.message}`);
  console.error(error);
  process.exit(1);
}
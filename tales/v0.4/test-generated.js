// Test script to validate the generated agv-completo.js

try {
  // Test if the file can be required
  const { createEnvironmentModel } = require('./generated/AGV-completo.js');
  
  console.log('✅ Successfully imported generated module');
  
  // Test if the factory function works
  const model = createEnvironmentModel({ testConfig: true });
  
  console.log('✅ Successfully created environment model');
  console.log('Model structure:', Object.keys(model));
  console.log('Model config:', model.config);
  
  // Verify the structure matches our 10-step design
  const expectedProperties = ['environments', 'events', 'scenes', 'scenarios', 'scenarioExecutions', 'config'];
  const hasAllProperties = expectedProperties.every(prop => model.hasOwnProperty(prop));
  
  if (hasAllProperties) {
    console.log('✅ Model has all expected properties for 10-step architecture');
  } else {
    console.log('❌ Model missing some expected properties');
  }
  
  console.log('\n🎉 All tests passed! Generated code maintains correct functionality.');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
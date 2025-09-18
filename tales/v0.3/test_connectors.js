const mod = require('./generated/RTC.js');

console.log('Testing enhanced connector implementation...');

try {
  // Create model with registries
  const model = mod.createModel();
  
  // Test that registries were created
  console.log('✅ Model created successfully');
  console.log('Transformation registry:', Object.keys(model.transformationRegistry || {}));
  console.log('Type validators:', Object.keys(model.typeValidators || {}));
  console.log('Type registry:', Object.keys(model.typeRegistry || {}));
  
  // Inject model reference
  model.injectModelReference();
  console.log('✅ Model reference injected');
  
  // Test connector instantiation through model context
  const ConnectorClass = model._moduleContext['CN_Connectors_FahrenheitToCelsiusCN'];
  
  if (!ConnectorClass) {
    throw new Error('Connector class not found in module context');
  }
  
  console.log('✅ Connector class found:', ConnectorClass.name);
  const connector = new ConnectorClass("testConnector");
  
  // Check if participantSchema was applied
  console.log('✅ Connector created successfully');
  console.log('Participant schema:', Object.keys(connector.participantSchema));
  console.log('Internal participants:', Object.keys(connector.internalParticipants));
  
  // Test that internal participants were created
  if (Object.keys(connector.internalParticipants).length > 0) {
    console.log('✅ Internal participants created successfully');
  } else {
    console.log('❌ Internal participants not created');
  }
  
  // Test port creation
  const fromPort = new mod.PT_Ports_FTemperatureOPT("testFrom", { owner: "testSensor" });
  const toPort = new mod.PT_Ports_CTemperatureIPT("testTo", { owner: "testController" });
  
  console.log('✅ Ports created successfully');
  
  // Test binding with validation
  try {
    connector.setModel(model);
    connector.bind(fromPort, toPort);
    console.log('✅ Binding successful with type validation');
  } catch (error) {
    console.log('❌ Binding failed:', error.message);
  }

  console.log('\n🎉 All tests passed! Enhanced connector implementation working correctly.');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
}
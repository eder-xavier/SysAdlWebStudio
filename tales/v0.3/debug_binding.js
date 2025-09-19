const { createModel } = require('./generated/Simple.js');

const model = createModel();

console.log('=== Model Binding Analysis ===');

// Check what getPort returns for different names
console.log('\n=== Root model ports ===');
console.log('model.getPort("temp1"):', !!model.getPort("temp1"));
console.log('model.getPort("temp2"):', !!model.getPort("temp2"));
console.log('model.getPort("avg"):', !!model.getPort("avg"));

console.log('\n=== SystemCP ports ===');
console.log('SystemCP.getPort("temp1"):', !!model.SystemCP.getPort("temp1"));
console.log('SystemCP.getPort("temp2"):', !!model.SystemCP.getPort("temp2"));
console.log('SystemCP.getPort("avg"):', !!model.SystemCP.getPort("avg"));

console.log('\n=== TempMon ports ===');
console.log('tempMon.getPort("s1"):', !!model.SystemCP.tempMon.getPort("s1"));
console.log('tempMon.getPort("s2"):', !!model.SystemCP.tempMon.getPort("s2"));
console.log('tempMon.getPort("average"):', !!model.SystemCP.tempMon.getPort("average"));

console.log('\n=== Connector c1 analysis ===');
const c1 = model.SystemCP.connectors.c1;
console.log('c1 exists:', !!c1);
console.log('c1 participantSchema:', c1.participantSchema);

console.log('\n=== Checking bind operation ===');
try {
  const port1 = model.getPort("temp1");
  const port2 = model.SystemCP.tempMon.getPort("s1");
  console.log('port1 (temp1):', !!port1);
  console.log('port2 (s1):', !!port2);
  if (port1) console.log('port1 binding after init:', !!port1.binding);
  if (port2) console.log('port2 binding after init:', !!port2.binding);
} catch (e) {
  console.log('Error:', e.message);
}
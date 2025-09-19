const { createModel } = require('./generated/Simple.js');

const model = createModel();

console.log('=== Model Structure ===');
console.log('Model name:', model.name);
console.log('SystemCP name:', model.SystemCP.name);
console.log('TempMon name:', model.SystemCP.tempMon.name);

console.log('\n=== TempMon Ports ===');
Object.entries(model.SystemCP.tempMon.ports).forEach(([name, port]) => {
  console.log(`Port ${name}:`);
  console.log(`  name: "${port.name}"`);
  console.log(`  owner: "${port.owner}"`);
  console.log(`  direction: "${port.direction}"`);
  console.log(`  type: ${port.constructor.name}`);
  console.log(`  binding: ${!!port.binding}`);
  console.log('');
});

console.log('\n=== SystemCP Connectors ===');
Object.entries(model.SystemCP.connectors || {}).forEach(([name, connector]) => {
  console.log(`Connector ${name}: ${connector.constructor.name}`);
});
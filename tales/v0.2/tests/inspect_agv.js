const { createModel } = require('../generated/AGV.js');
const m = createModel();
console.log('Model name:', m.name);
console.log('Components:');
for (const c of Object.values(m.components || {})) {
  console.log(' -', c.name, 'def=', c.sysadlDefinition, 'ports=', Object.keys(c.ports || {}).join(','));
}
console.log('Connectors:', Object.keys(m.connectors || {}).length);
console.log('Executables:', Object.keys(m.executables || {}).length);
console.log('Activities:', Object.keys(m._activities || {}).length);
if (process.env.SYSADL_DEBUG) console.log(JSON.stringify(m, null, 2));

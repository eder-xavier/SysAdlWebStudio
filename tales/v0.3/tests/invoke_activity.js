const { createModel } = require('../generated/AGV.js');
const m = createModel();
console.log('executing StartMovingAC::sm directly');
try {
  m.executeActivity('StartMovingAC::sm', []);
} catch(e) { console.error('executeActivity error', e && e.message); }
console.log('log:', JSON.stringify(m.getLog(), null, 2));

const path = require('path');
const gen = require(path.resolve(__dirname, '..', 'generated', 'Simple.js'));
const m = gen.createModel();
function expect(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(2); } }
const checks = [
  { c: 'tempMon', p: 'average' },
  { c: 'tempMon', p: 's1' },
  { c: 's1', p: 'temp1' },
  { c: 'stdOut', p: 'avg' }
];
for (const ch of checks) {
  const comp = m.components && m.components[ch.c];
  expect(comp, `component ${ch.c} not found`);
  const port = comp && comp.ports && comp.ports[ch.p];
  expect(port, `port ${ch.c}.${ch.p} not found`);
}
// sample activity check
const actKey = 'TempMonitorAC::tempMon';
expect(m._activities && m._activities[actKey], `activity ${actKey} not registered`);
console.log('SIMPLE SMOKE PASS');
process.exit(0);

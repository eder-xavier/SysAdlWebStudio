const path = require('path');
const gen = require(path.resolve(__dirname, '..', 'generated', 'RTC.js'));
const m = gen.createModel();
function expect(cond, msg) { if (!cond) { console.error('ASSERT FAIL:', msg); process.exit(2); } }
// basic checks derived from generated RTC.js
const checks = [
  { c: 'rtc', p: 'localtemp1' },
  { c: 'rtc.sm', p: 's1' },
  { c: 'rtc.sm', p: 'current1' },
  { c: 's1', p: 'current1' },
  { c: 'a1', p: 'controllerH' }
];
for (const ch of checks) {
  const comp = m.components && m.components[ch.c];
  expect(comp, `component ${ch.c} not found`);
  const port = comp && comp.ports && comp.ports[ch.p];
  expect(port, `port ${ch.c}.${ch.p} not found`);
}
// check a sample activity registration
const actKey = 'CalculateAverageTemperatureAC::rtc.sm';
expect(m._activities && m._activities[actKey], `activity ${actKey} not registered`);
console.log('RTC SMOKE PASS');
process.exit(0);

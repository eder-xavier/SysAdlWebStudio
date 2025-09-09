const path = require('path');
const gen = require(path.resolve(__dirname, '..', 'generated', 'AGV.js'));
const m = gen.createModel();

function expect(cond, msg) {
  if (!cond) {
    console.error('ASSERT FAIL:', msg);
    process.exit(2);
  }
}

// expected components and ports (short smoke checks)
const expected = [
  { comp: 'agvs', port: 'sendStatus' },
  { comp: 'ds', port: 'receiveStatus' },
  { comp: 'agvs.vc.sm', port: 'move' },
  { comp: 'agvs.vc.cs', port: 'destination' },
  { comp: 'agvs.vc.nm', port: 'inStatusMotor' },
  { comp: 'agvs.vc.ca', port: 'cmd' }
];

for (const e of expected) {
  const comp = m.components && m.components[e.comp];
  expect(comp, `component ${e.comp} not found`);
  const p = comp && comp.ports && comp.ports[e.port];
  expect(p, `port ${e.comp}.${e.port} not found`);
}

// check activities registered for instance
const actKey = 'StartMovingAC::agvs.vc.sm';
const act = m._activities && m._activities[actKey];
expect(act, `activity ${actKey} not registered`);

console.log('SMOKE TEST PASS');
process.exit(0);

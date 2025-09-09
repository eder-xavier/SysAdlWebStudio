const { createModel } = require('../generated/AGV.js');

const m = createModel();
console.log('Model created:', m.name);
console.log('Components:', Object.keys(m.components || {}).length);
console.log('Connectors:', Object.keys(m.connectors || {}).length);
console.log('Executables:', Object.keys(m.executables || {}).length);

function findPort(componentName, portName) {
  const c = m.components[componentName];
  if (!c) return null;
  return (c.ports && c.ports[portName]) || null;
}

// Try sending to some known ports
const p1 = findPort('agvs', 'sendStatus');
if (p1) {
  console.log('Sending to agvs.sendStatus');
  p1.send({ status: 'OK', ts: Date.now() }, m);
} else console.log('Port agvs.sendStatus not found');

const p2 = findPort('ds', 'receiveStatus');
if (p2) {
  console.log('Sending to ds.receiveStatus');
  p2.send({ status: 'OK', from: 'agvs' }, m);
} else console.log('Port ds.receiveStatus not found');

// Also try sending to internal instance ports (to trigger activities)
const internalTargets = [
  { comp: 'agvs.vc.sm', port: 'move' },
  { comp: 'agvs.vc.cs', port: 'destination' },
  { comp: 'agvs.vc.nm', port: 'inStatusMotor' },
  { comp: 'agvs.vc.ca', port: 'cmd' }
];
for (const t of internalTargets) {
  const p = findPort(t.comp, t.port);
  if (p) {
    console.log('Sending to', t.comp + '.' + t.port);
    try { p.send({ val: 'TEST_' + t.port }, m); } catch(e) { console.error('send error', e && e.message); }
  } else console.log('Port', t.comp + '.' + t.port, 'not found');
}

// Invoke an executable if present
const execName = 'SysADLArchitecture.SendCommandEX';
if (m.executables && m.executables[execName]) {
  try {
    console.log('Invoking executable', execName);
    const out = m.executables[execName]('SAMPLE_MOVE');
    console.log('Executable returned:', out);
  } catch (e) {
    console.error('Executable threw:', e && e.message);
  }
} else {
  console.log('Executable', execName, 'not found');
}

// Print collected log
console.log('Event log:');
const log = m.getLog();
for (const e of log) console.log(JSON.stringify(e));

// Show some diagnostics per component: ports and lastValue
console.log('\nComponent port states:');
for (const [k, c] of Object.entries(m.components || {})) {
  const ports = Object.keys(c.ports || {});
  if (ports.length) {
    console.log('-', k, 'ports:', ports.map(pn => `${pn}=${c.ports[pn].lastValue}`).join(', '));
  }
}

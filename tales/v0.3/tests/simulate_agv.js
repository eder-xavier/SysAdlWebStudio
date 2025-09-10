const { createModel } = require('../generated/AGV.js');

function run(){
  const m = createModel();
  console.log('Model created:', m.name);
  // locate a port named 'move' anywhere under top-level component properties
  function findPortByName(root, name) {
    if (!root || typeof root !== 'object') return null;
    // direct check
    if (root.ports && root.ports[name]) return root.ports[name];
    for (const k of Object.keys(root)) {
      try {
        const v = root[k];
        if (!v || typeof v !== 'object') continue;
        const found = findPortByName(v, name);
        if (found) return found;
      } catch (e) { /* ignore */ }
    }
    return null;
  }
  let movePort = null;
  // first check common top-level shortcuts (e.g., m.cs)
  for (const k of Object.keys(m)) {
    if (k.startsWith('_')) continue;
    const comp = m[k];
    if (!comp || typeof comp !== 'object') continue;
    movePort = findPortByName(comp, 'move');
    if (movePort) break;
  }
  if (!movePort) {
    console.error('move port not found');
    process.exit(1);
  }
  // send a message
  console.log('sending move ->');
  movePort.send({ cmd: 'start' }, m);
  console.log('log events:', JSON.stringify(m.getLog(), null, 2));
}

run();

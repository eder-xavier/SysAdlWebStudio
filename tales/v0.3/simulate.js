const path = require('path');
const fs = require('fs');

function loadModel(modelName){
  const p = path.resolve(__dirname, 'generated', modelName + '.js');
  if(!fs.existsSync(p)) throw new Error('Model file not found: '+p);
  const mod = require(p);
  if(!mod.createModel) throw new Error('createModel not exported by '+p);
  return mod.createModel();
}

function findPortByName(root, name){
  if(!root || typeof root !== 'object') return null;
  if(root.ports && root.ports[name]) return root.ports[name];
  for(const k of Object.keys(root)){
    try{
      const v = root[k];
      if(!v || typeof v !== 'object') continue;
      const f = findPortByName(v, name);
      if(f) return f;
    }catch(e){ }
  }
  return null;
}

function sendToPort(model, portName, payload){
  // first try top-level components
  for(const k of Object.keys(model)){
    if(k.startsWith('_')) continue;
    const comp = model[k];
    if(!comp || typeof comp !== 'object') continue;
    const p = findPortByName(comp, portName);
    if(p) return p.send(payload, model);
  }
  throw new Error('Port not found: '+portName);
}

function runFor(modelName, portName, payload){
  console.log('\n--- simulate', modelName, '->', portName);
  const m = loadModel(modelName);
  console.log('Model created:', m.name || m.constructor && m.constructor.name);
  try{
    sendToPort(m, portName, payload);
    console.log('Sent payload to', portName);
  }catch(e){
    console.error('Error sending to port:', e && e.message || e);
  }
  if(typeof m.getLog === 'function'){
    console.log('Log:', JSON.stringify(m.getLog(), null, 2));
  }
}

if(require.main === module){
  const target = process.argv[2] || 'AGV';
  const port = process.argv[3] || 'move';
  const payload = process.argv[4] ? JSON.parse(process.argv[4]) : {cmd:'start'};
  runFor(target, port, payload);
}

module.exports = { runFor, loadModel, sendToPort };

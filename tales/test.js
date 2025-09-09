#!/usr/bin/env node
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

function fail(msg){ console.error(msg); process.exit(1); }

(async ()=>{
  try {
    console.log('Running transformer...');
    const transformer = path.join(__dirname, 'transformer.js');
    const input = path.join(__dirname, 'Simple.sysadl');
    const res = cp.spawnSync(process.execPath, [transformer, input], { stdio: 'inherit' });
    if (res.status !== 0) fail('Transformer failed');

    const genDir = path.join(__dirname, 'generated');
    if (!fs.existsSync(genDir)) fail('generated dir not found: ' + genDir);
    const files = fs.readdirSync(genDir).filter(f => f.endsWith('Model.js'));
    if (files.length === 0) fail('no generated model file found in ' + genDir);
    const genFile = path.join(genDir, files[0]);
    console.log('Using generated file:', genFile);

    const mod = require(genFile);
    if (!mod || typeof mod.createModel !== 'function') fail('generated module does not export createModel');

    const m = mod.createModel();
    console.log('Model instantiated:', m.name || 'unnamed');
    const execNames = Object.keys(m.executables || {});
    console.log('Executables:', execNames);
    if (execNames.length === 0) fail('no executables registered');

    let pass = true;
    // optional FarToCelEX test
    if (m.executables['FarToCelEX']) {
      try {
        const r = m.executables['FarToCelEX'](32);
        if (Math.abs(r - 0) > 1e-6) { console.error('FarToCelEX(32) != 0, got', r); pass = false; }
        else console.log('FarToCelEX OK');
      } catch (e) { console.error('FarToCelEX invocation failed', e.message); pass = false; }
    }

    function sendIfExists(compName, portName, val) {
      const comp = m.components[compName];
      if (!comp) { console.log(`component ${compName} not found`); return false; }
      const port = comp.ports && comp.ports[portName];
      if (!port) { console.log(`port ${compName}.${portName} not found`); return false; }
      console.log(`Sending ${val} to ${compName}.${portName}`);
      port.send(val, m);
      return true;
    }

    const s1sent = sendIfExists('s1','temp1',32);
    const s2sent = sendIfExists('s2','temp2',50);

    const logs = m.getLog();
    console.log('Log length:', logs.length);
    const hasReceiveTemp1 = logs.some(e => e.elementType === 'port_receive' && e.name === 'temp1' && e.inputs && e.inputs[0] === 32);
    const hasReceiveTemp2 = logs.some(e => e.elementType === 'port_receive' && e.name === 'temp2' && e.inputs && e.inputs[0] === 50);
    if (s1sent && !hasReceiveTemp1) { console.error('no port_receive for temp1'); pass = false; }
    if (s2sent && !hasReceiveTemp2) { console.error('no port_receive for temp2'); pass = false; }

    if (pass) { console.log('SMOKE TEST PASS'); process.exit(0); }
    else { console.error('SMOKE TEST FAIL'); process.exit(2); }
  } catch (e) {
    console.error('Test error', e);
    process.exit(3);
  }
})();

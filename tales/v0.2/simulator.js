// v0.2 simulator: load generated model and provide loop/stream/ports list
const path = require('path');
const fs = require('fs');

function resolveModelPath(arg) {
  if (!arg) {
    const genDir = path.join(__dirname, 'generated');
    const files = fs.existsSync(genDir) ? fs.readdirSync(genDir).filter(f => f.endsWith('.js')) : [];
    if (files.length === 0) throw new Error('No generated models in ' + genDir);
    return path.join(genDir, files[0]);
  }
  const resolved = path.isAbsolute(arg) ? arg : path.join(process.cwd(), arg);
  if (!fs.existsSync(resolved)) throw new Error('Path not found: ' + resolved);
  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) {
    const files = fs.readdirSync(resolved).filter(f => f.endsWith('.js'));
    if (files.length === 0) throw new Error('No .js in ' + resolved);
    return path.join(resolved, files[0]);
  }
  return resolved;
}

async function run() {
  try {
    const argv = process.argv.slice(2);
    const argPath = argv[0];
    const modelPath = resolveModelPath(argPath);
    const opts = { loop: argv.includes('--loop') || argv.includes('-l'), stream: argv.includes('--stream') };
    const countIndex = argv.indexOf('--count');
    const intervalIndex = argv.indexOf('--interval');
    const portsIndex = argv.indexOf('--ports');
    const count = countIndex !== -1 && argv[countIndex+1] ? parseInt(argv[countIndex+1],10) : (opts.loop ? Infinity : 1);
    const interval = intervalIndex !== -1 && argv[intervalIndex+1] ? parseInt(argv[intervalIndex+1],10) : 1000;
    const portsList = portsIndex !== -1 && argv[portsIndex+1] ? argv[portsIndex+1].split(',') : null;

    const mod = require(modelPath);
    if (!mod || typeof mod.createModel !== 'function') throw new Error('Generated module does not export createModel');
    const m = mod.createModel();
    console.log('Model instantiated:', m.name);
    if (opts.stream && typeof m.logEvent === 'function') {
      const orig = m.logEvent.bind(m);
      m.logEvent = function(entry) { console.log('[EVENT]', entry.elementType || 'event', JSON.stringify(entry)); return orig(entry); };
    }

    // gather input ports
    const inputPorts = [];
    for (const [cname, comp] of Object.entries(m.components || {})) {
      if (!comp || !comp.ports) continue;
      for (const [pname, port] of Object.entries(comp.ports)) {
        if (!port.direction || port.direction === 'in') inputPorts.push({ component: cname, port: pname, portObj: port });
      }
    }
    let activePorts = inputPorts;
    if (portsList && portsList.length) {
      activePorts = inputPorts.filter(p => portsList.includes(p.component + '.' + p.port) || portsList.includes(p.port));
    }
    if (activePorts.length === 0) console.warn('No input ports found to stimulate.');

    // basic exec tests: call executables
    const execNames = Object.keys(m.executables||{});
    console.log('Executables:', execNames);
    for (const en of execNames) {
      try {
        const fn = m.executables[en];
        const ar = fn.length;
        const args = Array(ar).fill(0);
        const out = fn(...args);
        console.log(`Executable ${en}(${args.join(',')}) ->`, out);
      } catch (e) {
        console.error('Error invoking', en, e.message);
      }
    }

    if (opts.loop) {
      console.log('Entering loop mode. stimulating ports:', activePorts.map(p=>p.component+'.'+p.port));
      let tick = 0;
      const counters = {};
      activePorts.forEach(p=> counters[p.component + '.' + p.port] = 0);
      const handle = () => {
        tick++;
        for (const p of activePorts) {
          const key = p.component + '.' + p.port;
          counters[key] = (counters[key]||0) + 1;
          const value = counters[key];
          try { p.portObj.send(value, m); } catch (e) { console.error('Error sending to', key, e.message); }
        }
        if (tick >= count) { if (typeof m.dumpLog === 'function') { console.log('\n--- Model Log (final) ---'); m.dumpLog(); } process.exit(0); }
      };
      handle();
      if (count > 1) setInterval(handle, interval);
    } else {
      if (typeof m.dumpLog === 'function') { console.log('\n--- Model Log ---'); m.dumpLog(); }
    }
  } catch (e) { console.error(e.message); process.exit(1); }
}

run();

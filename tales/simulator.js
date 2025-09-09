// Simple simulator that loads generated model and exercises executables
const path = require('path');

async function run() {
  const fs = require('fs');
  const arg = process.argv[2];
  let modelModulePath = null;

  if (arg) {
    // if user provided a file or directory, resolve it
    const resolved = path.isAbsolute(arg) ? arg : path.join(process.cwd(), arg);
    if (fs.existsSync(resolved)) {
      const stat = fs.statSync(resolved);
      if (stat.isDirectory()) {
        // pick first .js inside provided dir
        const files = fs.readdirSync(resolved).filter(f => f.endsWith('.js'));
        if (files.length === 0) { console.error('No .js files in', resolved); process.exit(1); }
        modelModulePath = path.join(resolved, files[0]);
      } else {
        modelModulePath = resolved;
      }
    } else {
      console.error('Path not found:', resolved); process.exit(1);
    }
  } else {
    // default behavior: try the canonical generated name, then any .js in generated
    const genPath = path.join(__dirname, 'generated', 'SysADLModelModel.js');
    try {
      require.resolve(genPath);
      modelModulePath = genPath;
    } catch (e) {
      const files = fs.readdirSync(path.join(__dirname, 'generated')).filter(f => f.endsWith('.js'));
      if (files.length === 0) {
        console.error('No generated model found in tales/generated');
        process.exit(1);
      }
      modelModulePath = path.join(__dirname, 'generated', files[0]);
    }
  }

  const mod = require(modelModulePath);
  if (!mod || typeof mod.createModel !== 'function') {
    console.error('Generated module does not export createModel');
    process.exit(1);
  }
  const m = mod.createModel();
  console.log('Model instantiated:', m.name);
  // CLI flags
  const argv = process.argv.slice(2);
  const loopMode = argv.includes('--loop') || argv.includes('-l');
  const streamMode = argv.includes('--stream');
  const countArgIndex = argv.findIndex(a => a === '--count');
  const intervalArgIndex = argv.findIndex(a => a === '--interval');
  const portArgIndex = argv.findIndex(a => a === '--port');
  const iterations = countArgIndex !== -1 && argv[countArgIndex+1] ? parseInt(argv[countArgIndex+1],10) : (loopMode ? Infinity : 1);
  const intervalMs = intervalArgIndex !== -1 && argv[intervalArgIndex+1] ? parseInt(argv[intervalArgIndex+1],10) : 1000;
  const targetPort = portArgIndex !== -1 && argv[portArgIndex+1] ? argv[portArgIndex+1] : null;
  // list executables
  const execNames = Object.keys(m.executables || {});
  console.log('Executables:', execNames);
  // Try to call each executable with dummy numeric args (0)
  for (const en of execNames) {
    const fn = m.executables[en];
    const arity = fn.length;
    const args = Array(arity).fill(0);
    try {
      const out = fn(...args);
      console.log(`Executable ${en}(${args.join(',')}) ->`, out);
    } catch (e) {
      console.error(`Error invoking ${en}:`, e.message);
    }
  }

  // dump log if available
  if (!loopMode && typeof m.dumpLog === 'function') {
    console.log('\n--- Model Log ---');
    m.dumpLog();
  }

  // If running in loop/stream mode, stream events and periodically inject values into ports
  if (loopMode || streamMode) {
    // stream events as they occur by wrapping logEvent
    if (typeof m.logEvent === 'function') {
      const origLog = m.logEvent.bind(m);
      m.logEvent = function(entry) {
        // print human readable event
        try { console.log('[EVENT]', entry.elementType || 'event', JSON.stringify(entry)); } catch (e) { console.log('[EVENT]', entry); }
        return origLog(entry);
      };
    }

    // gather candidate input ports
    const inputPorts = [];
    for (const [cname, comp] of Object.entries(m.components || {})) {
      if (!comp || !comp.ports) continue;
      for (const [pname, port] of Object.entries(comp.ports)) {
        // choose ports that are direction 'in' or unknown
        if (!port.direction || port.direction === 'in') {
          inputPorts.push({ component: cname, port: pname, portObj: port });
        }
      }
    }

    // if user provided specific port in format component.port, filter
    let activePorts = inputPorts;
    if (targetPort) {
      const parts = targetPort.split('.');
      if (parts.length === 2) {
        activePorts = inputPorts.filter(p => p.component === parts[0] && p.port === parts[1]);
      } else {
        // match by port name only
        activePorts = inputPorts.filter(p => p.port === targetPort);
      }
    }

    if (activePorts.length === 0) {
      console.warn('No input ports found to stimulate. Exiting loop mode.');
      if (typeof m.dumpLog === 'function') { console.log('\n--- Model Log ---'); m.dumpLog(); }
      return;
    }

    console.log('Entering loop mode. Stimulating ports:', activePorts.map(p => p.component + '.' + p.port));

    // prepare counters per port
    const counters = {};
    activePorts.forEach(p => { counters[p.component + '.' + p.port] = 0; });

    let tick = 0;
    const maxTicks = iterations;

    const handleTick = () => {
      tick++;
      for (const p of activePorts) {
        const key = p.component + '.' + p.port;
        counters[key] = (counters[key] || 0) + 1;
        const value = counters[key];
        try {
          // send value into port
          if (p.portObj && typeof p.portObj.send === 'function') {
            p.portObj.send(value, m);
          }
        } catch (e) {
          console.error('Error sending to port', key, e.message);
        }
      }
      if (tick >= maxTicks) {
        // finish
        if (typeof m.dumpLog === 'function') {
          console.log('\n--- Model Log (final) ---');
          m.dumpLog();
        }
        process.exit(0);
      }
    };

    // run first tick immediately
    handleTick();
    // schedule subsequent ticks
    if (maxTicks > 1) {
      const id = setInterval(handleTick, intervalMs);
      // clear on process exit
      process.on('SIGINT', () => { clearInterval(id); console.log('Interrupted'); process.exit(0); });
    }
    return;
  }
}

run();

// Extra demonstration: send a temperature value to s1.temp1 if present
try {
  const modPath = require.resolve(path.join(__dirname, 'generated', 'SysADLModelModel.js'));
  const gen = require(modPath);
  const m2 = gen.createModel();
  if (m2 && m2.components && m2.components.s1 && m2.components.s1.ports && m2.components.s1.ports.temp1) {
    console.log('\nSending 32 to s1.temp1');
    m2.components.s1.ports.temp1.send(32, m2);
    console.log('Sending 50 to s2.temp2');
    if (m2.components.s2 && m2.components.s2.ports && m2.components.s2.ports.temp2) {
      m2.components.s2.ports.temp2.send(50, m2);
    }
    if (typeof m2.dumpLog === 'function') {
      console.log('\n--- Log after port send ---');
      m2.dumpLog();
    }
  } else {
    console.log('Port s1.temp1 not found in generated model');
  }
} catch (e) {
  // ignore
}

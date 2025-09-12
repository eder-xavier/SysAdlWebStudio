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

function loadModelFromModulePath(modelPath){
  const mod = require(modelPath);
  if (!mod || typeof mod.createModel !== 'function') throw new Error('Generated module does not export createModel');
  return { mod, model: mod.createModel() };
}

function findInputPorts(model){
  const inputPorts = [];

  // Função auxiliar para buscar portas recursivamente
  const findPortsRecursive = (root, path = '') => {
    if (!root || typeof root !== 'object') return;

    // Se tem portas, processa elas
    if (root.ports) {
      for (const [pname, port] of Object.entries(root.ports)) {
        if (!port.direction || port.direction === 'in') {
          inputPorts.push({
            component: path || (root.name || 'root'),
            port: pname,
            portObj: port,
            fullPath: path ? `${path}.${pname}` : pname
          });
        }
      }
    }

    // Busca recursivamente em subcomponentes
    if (root.components) {
      for (const [cname, comp] of Object.entries(root.components)) {
        const newPath = path ? `${path}.${cname}` : cname;
        findPortsRecursive(comp, newPath);
      }
    }
  };

  // Começar a busca no componente raiz ou no próprio modelo se não houver componentes
  if (model.components && Object.keys(model.components).length > 0) {
    // Se o modelo tem componentes, buscar neles
    for (const [compName, comp] of Object.entries(model.components)) {
      findPortsRecursive(comp, compName);
    }
  } else {
    // Caso contrário, buscar no próprio modelo
    findPortsRecursive(model);
  }

  return inputPorts;
}

function findPortRecursive(root, name){
  if(!root || typeof root !== 'object') return null;
  if(root.ports && root.ports[name]) return root.ports[name];
  for(const k of Object.keys(root)){
    try{
      const v = root[k];
      if(!v || typeof v !== 'object') continue;
      const f = findPortRecursive(v, name);
      if(f) return f;
    }catch(e){ }
  }
  return null;
}

// Resolve alias like 's1.temp1' to actual component+port in the model.
function resolveAliasTarget(model, alias, portAliases){
  if (!alias) return null;

  // Função auxiliar para buscar componente recursivamente
  const findComponentRecursive = (root, name, path = '') => {
    if (!root || typeof root !== 'object') return null;

    // Verifica se o componente atual é o que procuramos
    if (root.name === name || path === name) {
      return { comp: root, path };
    }

    // Busca em subcomponentes
    if (root.components) {
      for (const [cname, comp] of Object.entries(root.components)) {
        const newPath = path ? `${path}.${cname}` : cname;
        const found = findComponentRecursive(comp, name, newPath);
        if (found) return found;
      }
    }

    return null;
  };

  // if alias is component.port
  if (alias.indexOf('.')!==-1){
    const [compName, portName] = alias.split('.');

    // Busca o componente na estrutura hierárquica
    const comps = model.components || model;
    const foundComp = findComponentRecursive(comps, compName);

    if (foundComp && foundComp.comp.ports && foundComp.comp.ports[portName]) {
      return { comp: foundComp.comp, portName };
    }

    // if portName not found, use first available port of component
    if (foundComp && foundComp.comp.ports) {
      const keys = Object.keys(foundComp.comp.ports);
      if (keys.length) return { comp: foundComp.comp, portName: keys[0] };
    }

    // consult generated alias metadata first
    try {
      if (portAliases && portAliases[compName] && portAliases[compName][portName]) {
        const real = portAliases[compName][portName];
        if (foundComp && foundComp.comp.ports && foundComp.comp.ports[real]) {
          return { comp: foundComp.comp, portName: real };
        }
      }
    } catch(e){}

    return null;
  }

  // if alias is only port name, try to find any component that has this port
  const findPortInModel = (root) => {
    if (!root || typeof root !== 'object') return null;

    if (root.ports && root.ports[alias]) {
      return { comp: root, portName: alias };
    }

    if (root.components) {
      for (const comp of Object.values(root.components)) {
        const found = findPortInModel(comp);
        if (found) return found;
      }
    }

    return null;
  };

  const comps = model.components || model;
  return findPortInModel(comps);
}

function sendPayloadToPortByName(model, portName, payload){
  // Função auxiliar para buscar e enviar para porta recursivamente
  const findAndSendPort = (root, name) => {
    if (!root || typeof root !== 'object') return false;

    // Verifica se tem a porta neste nível
    if (root.ports && root.ports[name]) {
      root.ports[name].send(payload, model);
      return true;
    }

    // Busca recursivamente em subcomponentes
    if (root.components) {
      for (const comp of Object.values(root.components)) {
        if (findAndSendPort(comp, name)) {
          return true;
        }
      }
    }

    return false;
  };

  // Tenta encontrar e enviar para a porta
  const comps = model.components || model;
  if (findAndSendPort(comps, portName)) {
    return true;
  }

  throw new Error('Port not found: '+portName);
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
    const payloadIndex = argv.findIndex(a => a === '--payload' || a === '-p');
    const count = countIndex !== -1 && argv[countIndex+1] ? parseInt(argv[countIndex+1],10) : (opts.loop ? Infinity : 1);
    const interval = intervalIndex !== -1 && argv[intervalIndex+1] ? parseInt(argv[intervalIndex+1],10) : 1000;
    const portsList = portsIndex !== -1 && argv[portsIndex+1] ? argv[portsIndex+1].split(',') : null;
    let payloadMap = null;
    if (payloadIndex !== -1 && argv[payloadIndex+1]) {
      const raw = argv[payloadIndex+1];
      try {
        // if raw is a path to a file, load it
        const maybePath = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
        if (fs.existsSync(maybePath)) {
          const txt = fs.readFileSync(maybePath, 'utf8');
          payloadMap = JSON.parse(txt);
        } else {
          payloadMap = JSON.parse(raw);
        }
      } catch (e) { console.error('Failed to parse --payload JSON:', e && e.message); process.exit(1); }
    }

  const loaded = loadModelFromModulePath(modelPath);
  const mod = loaded.mod;
  const m = loaded.model;
  console.log('Model instantiated:', m.name);
  const portAliases = mod && mod.__portAliases ? mod.__portAliases : {};
  // helper for readable timestamp
  const nowISO = () => (new Date()).toISOString();
  // normalize entry: ensure `when` is an ISO string
  const normalizeEntry = (entry) => {
    if (!entry || typeof entry !== 'object') return entry;
    const e = Object.assign({}, entry);
    if (e.when) {
      if (typeof e.when === 'number') e.when = new Date(e.when).toISOString();
      else if (typeof e.when === 'string') {
        // try to parse numeric-like strings
        const n = Number(e.when);
        if (!Number.isNaN(n)) e.when = new Date(n).toISOString();
      }
    } else {
      e.when = nowISO();
    }
    return e;
  };
  // emit a unified step event: element, type (exec/port/log), in, out, when
  const emitStep = ({ element, type, input, output, extra }) => {
    const step = { element, kind: type, in: input === undefined ? null : input, out: output === undefined ? null : output, when: nowISO() };
    if (extra) step.extra = extra;
    console.log('[EVENT]', 'step', JSON.stringify(step));
    return step;
  };
    // Always stream events: wrap logEvent if present to emit unified step events
    if (typeof m.logEvent === 'function') {
      const orig = m.logEvent.bind(m);
      m.logEvent = function(entry) {
        try {
          const e = normalizeEntry(entry);
          emitStep({ element: e.name || e.elementType || 'log', type: 'log', input: e.inputs || null, output: e.output || null, extra: e });
        } catch (e2) { console.log('[EVENT]', 'log', JSON.stringify(entry)); }
        return orig(entry);
      };
    }
    // If model exposes getLog or dumpLog, convert existing entries to stream lines
    if (typeof m.getLog === 'function') {
      try {
        const l = m.getLog();
        if (Array.isArray(l)) {
          for (const entry of l) {
            try { console.log('[EVENT]', (entry && entry.elementType) || 'event', JSON.stringify(normalizeEntry(entry))); } catch (e) { console.log('[EVENT]', entry); }
          }
        }
      } catch (e) { /* ignore */ }
    } else if (typeof m.dumpLog === 'function') {
      // dumpLog writes to stdout; capture by calling and hope it prints entries. As fallback, call and wrap generic output.
      try {
        // attempt to call dumpLog; if it prints structured entries this will be visible. No robust capture here.
        m.dumpLog();
      } catch (e) { /* ignore */ }
    }

    // gather input ports
    const inputPorts = findInputPorts(m);
    let activePorts = inputPorts;
    if (portsList && portsList.length) {
      activePorts = inputPorts.filter(p => portsList.includes(p.component + '.' + p.port) || portsList.includes(p.port));
    }
  if (activePorts.length === 0) console.warn('No input ports found to stimulate.');

    // basic exec tests: call executables and emit step events
    const execNames = Object.keys(m.executables||{});
    // emit an event that lists executables (as normalized entry)
    console.log('[EVENT]', 'executables', JSON.stringify(normalizeEntry({ list: execNames })));
    for (const en of execNames) {
      try {
        const fn = m.executables[en];
        const ar = fn.length;
        const args = Array(ar).fill(0);
        const out = fn(...args);
        emitStep({ element: en, type: 'exec', input: args, output: out });
      } catch (e) {
        emitStep({ element: en, type: 'exec', input: [], output: null, extra: { error: e && e.message } });
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
          // if payloadMap provided, send that value for matching port; otherwise send incremental counter
          let value;
          if (payloadMap && Object.prototype.hasOwnProperty.call(payloadMap, key)) {
            value = payloadMap[key];
          } else if (payloadMap && Object.prototype.hasOwnProperty.call(payloadMap, p.port)) {
            value = payloadMap[p.port];
          } else if (payloadMap && portAliases) {
            // try alias map: component.alias -> value
            const compMap = portAliases[p.component] || {};
            // check common alias names for this component in payloadMap
            for (const aliasName of Object.keys(compMap || {})) {
              const full = p.component + '.' + aliasName;
              if (Object.prototype.hasOwnProperty.call(payloadMap, full)) { value = payloadMap[full]; break; }
              if (Object.prototype.hasOwnProperty.call(payloadMap, aliasName)) { value = payloadMap[aliasName]; break; }
            }
            // also check payload keys like 's1.current' (real port explicit)
            if (value === undefined) {
              const explicit = p.component + '.' + p.port;
              if (Object.prototype.hasOwnProperty.call(payloadMap, explicit)) value = payloadMap[explicit];
            }
          } else {
            counters[key] = (counters[key]||0) + 1;
            value = counters[key];
          }
          try {
            p.portObj.send(value, m);
            emitStep({ element: p.component + '.' + p.port, type: 'port', input: [value], output: null });
          } catch (e) {
            emitStep({ element: p.component + '.' + p.port, type: 'port', input: null, output: null, extra: { error: e && e.message } });
          }
        }
        if (tick >= count) { if (typeof m.dumpLog === 'function') { console.log('\n--- Model Log (final) ---'); m.dumpLog(); } process.exit(0); }
      };
  handle();
      if (count > 1) setInterval(handle, interval);
    } else {
      // single-shot mode: if payloadMap provided, send each mapping once; otherwise just finish
      if (payloadMap) {
        for (const [k,v] of Object.entries(payloadMap)) {
          // locate port by component.port or port name
          let target = activePorts.find(p => (p.component + '.' + p.port) === k || p.port === k);
          if (!target) {
            // try alias resolution fallback
            const resolved = resolveAliasTarget(m, k, portAliases);
            if (resolved) {
              try { resolved.comp.ports && resolved.comp.ports[resolved.portName].send(v, m); emitStep({ element: (resolved.comp && resolved.comp.name) ? resolved.comp.name + '.' + resolved.portName : k, type: 'port', input: [v], output: null }); } catch (e) { emitStep({ element: k, type: 'port', input: null, output: null, extra: { error: e && e.message } }); }
              continue;
            }
            // try recursive send by name
            try {
              sendPayloadToPortByName(m, k, v);
              console.log('[EVENT]', 'step', JSON.stringify(normalizeEntry({ element: k, kind: 'port', in: [v], out: null })));
            } catch (e) {
              console.warn('Payload target not found:', k);
            }
          } else {
            try { target.portObj.send(v, m); emitStep({ element: target.component + '.' + target.port, type: 'port', input: [v], output: null }); } catch (e) { emitStep({ element: target.component + '.' + target.port, type: 'port', input: null, output: null, extra: { error: e && e.message } }); }
          }
        }
      }
      // single-shot mode: no loop, but we still want stream-like output of any logs
      // if model exposes a getLog, those entries were already printed above; also print a summary event
      console.log('[EVENT]', 'simulation_end', JSON.stringify(normalizeEntry({ model: m.name })));
    }
  } catch (e) { console.error(e.message); process.exit(1); }
}

run();


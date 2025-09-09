#!/usr/bin/env node
// Transformer: parse a .sysadl model and generate a JS module (CommonJS) that creates a runtime model

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

async function loadParser(parserPath) {
  // Import the generated parser as an ES module to respect its `export` statement
  const url = pathToFileURL(parserPath).href;
  const mod = await import(url);
  if (!mod || typeof mod.parse !== 'function') throw new Error('Parser did not export parse');
  return mod.parse;
}

function traverse(node, cb) {
  if (!node || typeof node !== 'object') return;
  cb(node);
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (Array.isArray(v)) {
      v.forEach(item => traverse(item, cb));
    } else if (v && typeof v === 'object') {
      traverse(v, cb);
    }
  }
}

function extractExecutablesFromSource(node, source) {
  const executables = [];
  traverse(node, n => {
    if (n && n.type === 'Executable') {
      if (n.location && n.location.start && typeof n.location.start.offset === 'number') {
        const start = n.location.start.offset;
        const end = n.location.end.offset;
        const srcSnippet = source.slice(start, end);
        // try to extract signature and return expression
        const m = srcSnippet.match(/executable\s+def\s+(\w+)\s*\(([^)]*)\)\s*:\s*([^\{]*)\{([\s\S]*)\}/m);
        let name = n.name || (m && m[1]);
        let paramText = m ? m[2].trim() : '';
        const params = [];
        if (paramText) {
          // params like: in f:Real,in temp2:Real  or "in f:Real"
          const parts = paramText.split(',').map(p => p.trim()).filter(Boolean);
          for (const p of parts) {
            // remove leading in/out keywords
            const q = p.replace(/^(in|out)\s+/,'').trim();
            const namePart = q.split(':')[0].trim();
            params.push(namePart);
          }
        }
        // extract return expression from body
        let body = '';
        if (m && m[4]) {
          const bodyText = m[4];
          const rr = bodyText.match(/return\s+([\s\S]*?)\s*;/m);
          if (rr) body = rr[1].trim();
        }
        executables.push({ name, params, body });
      }
    }
  });
  return executables;
}

function extractConfiguration(node) {
  // Returns a configuration object with components and connectors
  const config = { components: {}, connectors: {} };

  // First collect all ComponentUse nodes and their declared PortUse children
  const componentNodes = [];
  traverse(node, n => { if (n && n.type === 'ComponentUse') componentNodes.push(n); });
  for (const c of componentNodes) {
  const name = c.name || (c.id && c.id.name) || c.id || 'unknown';
  const definition = c.definition || c.def || null;
  if (!config.components[name]) config.components[name] = { name, definition, ports: [] };
    // find PortUse nodes inside this component's subtree
    function findPorts(n) {
      if (!n || typeof n !== 'object') return;
      if (n.type === 'PortUse') {
        const pName = n.name || (n.id && n.id.name) || n.id || undefined;
        if (pName && !config.components[name].ports.includes(pName)) config.components[name].ports.push(String(pName));
      }
      for (const k of Object.keys(n)) {
        const v = n[k];
        if (Array.isArray(v)) v.forEach(it => findPorts(it));
        else if (v && typeof v === 'object') findPorts(v);
      }
    }
    findPorts(c);
  }

  // Collect ConnectorUse and their ConnectorBinding entries
  traverse(node, n => {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'ConnectorUse') {
      const name = n.name || (n.id && n.id.name) || n.id || 'unknownConnector';
  if (!config.connectors[name]) config.connectors[name] = { name, bindings: [] };
  if (n.definition) config.connectors[name].definition = n.definition;
      const bl = n.bindingList || n.bindings || n.connects || [];
      if (Array.isArray(bl) && bl.length) {
        for (const b of bl) {
          if (!b) continue;
          const src = (b.source && (b.source.name || b.source.id || b.source)) || b.src || b.from || (typeof b === 'string' ? b : undefined);
          const dst = (b.destination && (b.destination.name || b.destination.id || b.destination)) || b.dst || b.to || undefined;
          if (src && dst) config.connectors[name].bindings.push({ source: String(src), destination: String(dst) });
        }
      }
    }

    if (n.type === 'ConnectorBinding') {
      const src = (n.source && (n.source.name || n.source.id || n.source)) || n.src || n.from;
      const dst = (n.destination && (n.destination.name || n.destination.id || n.destination)) || n.dst || n.to;
      const key = (n.connector && (n.connector.name || n.connector.id)) || '_implicit';
      if (!config.connectors[key]) config.connectors[key] = { name: key, bindings: [] };
      if (src && dst) config.connectors[key].bindings.push({ source: String(src), destination: String(dst) });
    }
  });

  // Heuristic: for bindings that reference a port name and a component instance name
  // (e.g., 'temp1' = 's1'), ensure the port is added to that component instance.
  for (const k of Object.keys(config.connectors)) {
    const conn = config.connectors[k];
    for (const b of conn.bindings) {
      const a = String(b.source);
      const c = String(b.destination);
      // if one side is a known component instance, and the other looks like a port name, add it
      if (config.components[a] && !config.components[c]) {
        // a is component, c is port -> add c to a
        if (!config.components[a].ports.includes(c)) config.components[a].ports.push(c);
      } else if (config.components[c] && !config.components[a]) {
        if (!config.components[c].ports.includes(a)) config.components[c].ports.push(a);
      } else {
        // neither side is a known component name: try to resolve by matching port names declared in components
        // if a unique component declares port 'a' and another declares port 'c', assume those
        const compsWithA = Object.keys(config.components).filter(kc => (config.components[kc].ports||[]).includes(a));
        const compsWithC = Object.keys(config.components).filter(kc => (config.components[kc].ports||[]).includes(c));
        if (compsWithA.length === 1 && compsWithC.length === 1) {
          // binding already resolvable; nothing to add
        } else if (compsWithA.length === 1 && compsWithC.length === 0) {
          // add c to the component that has a
          const target = compsWithA[0];
          if (!config.components[target].ports.includes(c)) config.components[target].ports.push(c);
        } else if (compsWithC.length === 1 && compsWithA.length === 0) {
          const target = compsWithC[0];
          if (!config.components[target].ports.includes(a)) config.components[target].ports.push(a);
        }
      }
    }
  }

  return config;
}

function generateModule(modelName, executables, config, outDir, allocations, activityToConnector, executableToAction, actionToActivity) {
  const relRuntime = path.relative(outDir, path.join(__dirname, 'sysadl-runtime.js'));
  const runtimePath = './' + relRuntime.replace(/\\/g,'/');
  const lines = [];
  lines.push("const { ModelBase, ComponentBase, PortBase, ConnectorBase, createExecutableFromExpression } = require('" + runtimePath + "');");
  lines.push('function createModel() {');
  lines.push(`  const m = new ModelBase('${modelName}');`);
  lines.push('  // create component instances and ports (generated from configuration)');

  // emit components (use safe variable names to avoid collisions)
  function sanitizeId(s) { return String(s).replace(/[^A-Za-z0-9_]/g, '_'); }
  const nameToVar = {};
  // ensure ports referenced in connector bindings are included
  const compPorts = {};
  for (const cname of Object.keys(config.components)) {
    compPorts[cname] = new Set((config.components[cname].ports || []).map(x => String(x)));
  }
  for (const k of Object.keys(config.connectors)) {
    const conn = config.connectors[k];
    for (const b of conn.bindings || []) {
      const src = String(b.source || '');
      const dst = String(b.destination || '');
      const sParts = src.split('.');
      const dParts = dst.split('.');
      if (sParts.length === 2) {
        const [sc, sp] = sParts;
        if (!compPorts[sc]) compPorts[sc] = new Set();
        compPorts[sc].add(sp);
        if (!config.components[sc]) config.components[sc] = { name: sc, ports: [] };
      }
      if (dParts.length === 2) {
        const [dc, dp] = dParts;
        if (!compPorts[dc]) compPorts[dc] = new Set();
        compPorts[dc].add(dp);
        if (!config.components[dc]) config.components[dc] = { name: dc, ports: [] };
      }
    }
  }
  for (const cname of Object.keys(config.components)) {
    const comp = config.components[cname];
    const compVar = 'cmp_' + sanitizeId(cname);
    nameToVar[cname] = compVar;
    lines.push(`  const ${compVar} = new ComponentBase(${JSON.stringify(comp.name)}); ${compVar} && m.addComponent(${compVar});`);
    const ports = Array.from(compPorts[cname] || []);
    for (const p of ports) {
      const pVar = sanitizeId(p);
      lines.push(`  const ${compVar}_${pVar} = new PortBase(${JSON.stringify(p)}, 'in'); ${compVar}_${pVar}.ownerComponent = ${JSON.stringify(comp.name)}; ${compVar}.addPort(${compVar}_${pVar});`);
    }
  }

  // emit connectors (use safe variable names)
  const connNameToVar = {};
  for (const k of Object.keys(config.connectors)) {
    const conn = config.connectors[k];
    const connVar = 'conn_' + sanitizeId(k);
    connNameToVar[k] = connVar;
    lines.push(`  const ${connVar} = new ConnectorBase(${JSON.stringify(conn.name)}); m.addConnector(${connVar});`);
  }

  // register activities based on allocations and discovered actions
  // allocations maps were computed earlier: activityToConnector, executableToAction, actionToActivity
  // Build activity -> inputPorts heuristic: if activity name mentions a component or pins, try to find ports
  const activityInputMap = {}; // activityName -> [portNames]
  // simple heuristic: for each component, if component has ports with names referenced in actions, assign
  for (const act of Object.keys(actionToActivity || {})) {
    const activityName = actionToActivity[act];
    if (!activityInputMap[activityName]) activityInputMap[activityName] = new Set();
  }
  // Inspect connectors bindings and assign ports to activities allocated to components
  for (const [activity, connDef] of Object.entries(activityToConnector || {})) {
    // find connectors in config that reference ports that belong to components
    for (const ck of Object.keys(config.connectors)) {
      const conn = config.connectors[ck];
      // if connector definition name matches connDef, collect its ports referenced in bindings
      if (conn.definition === connDef) {
        for (const b of conn.bindings || []) {
          const partsSrc = String(b.source).split('.');
          const partsDst = String(b.destination).split('.');
          if (partsSrc.length === 2) { if (!activityInputMap[activity]) activityInputMap[activity] = new Set(); activityInputMap[activity].add(partsSrc[1]); }
          if (partsDst.length === 2) { if (!activityInputMap[activity]) activityInputMap[activity] = new Set(); activityInputMap[activity].add(partsDst[1]); }
        }
      }
    }
  }
  // Emit registerActivity calls
  for (const activityName of Object.keys(activityInputMap)) {
    const portSet = activityInputMap[activityName] || new Set();
    const ports = Array.from(portSet || []).map(p => String(p));
    // infer owner component: choose component that owns most of the ports
    let ownerComponent = null;
    let bestMatch = 0;
    for (const [compName, compDef] of Object.entries(config.components || {})) {
      const compPortsList = (compDef.ports || []).map(String);
      const matchCount = ports.filter(p => compPortsList.includes(p)).length;
      if (matchCount > bestMatch) { bestMatch = matchCount; ownerComponent = compName; }
    }
    // if not found by ports, try to infer via activityToConnector -> component definition mapping
    if (!ownerComponent && activityToConnector && activityToConnector[activityName]) {
      const compDefName = activityToConnector[activityName];
      // look for a component instance whose definition matches compDefName
      for (const [compName, compDef] of Object.entries(config.components || {})) {
        if (compDef.definition && compDef.definition === compDefName) { ownerComponent = compName; break; }
      }
    }
    // Build actions list: find actions that map to this activity
    const actionsForActivity = [];
    for (const [actionName, act] of Object.entries(actionToActivity || {})) {
      if (act === activityName) {
        // find executable allocated to this action
        const exeName = Object.keys(executableToAction || {}).find(k => executableToAction[k] === actionName);
        // use input ports as params heuristic
        const params = ports.slice();
        if (exeName) {
          actionsForActivity.push({ name: actionName, executable: exeName, params });
        } else {
          actionsForActivity.push({ name: actionName, params });
        }
      }
    }
    const actionsLiteral = JSON.stringify(actionsForActivity);
    const portsLiteral = ports.map(p => JSON.stringify(p)).join(', ');
    lines.push(`  // register activity ${activityName}\n`);
    lines.push(`  m.registerActivity(${JSON.stringify(activityName)}, { component: ${ownerComponent ? JSON.stringify(ownerComponent) : 'null'}, inputPorts: [${portsLiteral}], actions: ${actionsLiteral} });`);
  }

  // emit basic bindings (forwarding) from connector bindings
  // bindings: simple forwarding based on connector binding entries
  for (const k of Object.keys(config.connectors)) {
    const conn = config.connectors[k];
    for (const b of conn.bindings || []) {
      const src = String(b.source || '');
      const dst = String(b.destination || '');
      const [srcComp, srcPort] = src.split('.');
      const [dstComp, dstPort] = dst.split('.');
      if (srcComp && srcPort && dstComp && dstPort) {
        const srcVar = nameToVar[srcComp] || ('cmp_' + sanitizeId(srcComp));
        const dstVar = nameToVar[dstComp] || ('cmp_' + sanitizeId(dstComp));
        lines.push(`  // binding ${src} -> ${dst}`);
        const connDef = conn.definition || null;
        let allocatedExe = null;
        if (allocations && connDef && Array.isArray(allocations[connDef]) && allocations[connDef].length>0) {
          allocatedExe = allocations[connDef][0];
        }
        if (allocatedExe) {
          lines.push(`  if (${srcVar} && ${srcVar}.ports && ${srcVar}.ports[${JSON.stringify(srcPort)}]) {`);
          lines.push(`    ${srcVar}.ports[${JSON.stringify(srcPort)}].bindTo({ receive: function(v, model){ try { const r = model && model.executables && model.executables['${allocatedExe}'] ? model.executables['${allocatedExe}'](v) : v; if (${dstVar} && ${dstVar}.ports && ${dstVar}.ports[${JSON.stringify(dstPort)}]) { ${dstVar}.ports[${JSON.stringify(dstPort)}].receive(r, model); } } catch(e) { if(model && model.logEvent) model.logEvent({ elementType:'binding_error', name:'${src}->${dst}', error:e.message, when:Date.now() }); } } });`);
          lines.push('  }');
        } else {
          lines.push(`  if (${srcVar} && ${srcVar}.ports && ${srcVar}.ports[${JSON.stringify(srcPort)}]) {`);
          lines.push(`    ${srcVar}.ports[${JSON.stringify(srcPort)}].bindTo({ receive: function(v, model){ if (${dstVar} && ${dstVar}.ports && ${dstVar}.ports[${JSON.stringify(dstPort)}]) { ${dstVar}.ports[${JSON.stringify(dstPort)}].receive(v, model); } } });`);
          lines.push('  }');
        }
        continue;
      }
      // other heuristics preserved but use safe names
      if (!srcPort && dstComp && !dstPort) {
        const srcOwners = Object.keys(config.components).filter(cn => (config.components[cn].ports || []).includes(src));
        if (srcOwners.length > 0) {
          for (const owner of srcOwners) {
            const ownerVar = nameToVar[owner] || ('cmp_' + sanitizeId(owner));
            const targetVar = nameToVar[dst] || ('cmp_' + sanitizeId(dst));
            const ownerPort = src;
            const targetPort = src;
            lines.push(`  // inferred binding ${owner}.${ownerPort} -> ${dst}.${targetPort}`);
            lines.push(`  if (${ownerVar} && ${ownerVar}.ports && ${ownerVar}.ports[${JSON.stringify(ownerPort)}]) {`);
            lines.push(`    ${ownerVar}.ports[${JSON.stringify(ownerPort)}].bindTo({ receive: function(v, model){ if (${targetVar} && ${targetVar}.ports && ${targetVar}.ports[${JSON.stringify(targetPort)}]) { ${targetVar}.ports[${JSON.stringify(targetPort)}].receive(v, model); } } });`);
            lines.push('  }');
          }
        }
        continue;
      }
      if (!dstPort && srcComp && !srcPort) {
        const dstOwners = Object.keys(config.components).filter(cn => (config.components[cn].ports || []).includes(dst));
        if (dstOwners.length > 0) {
          for (const owner of dstOwners) {
            const ownerVar = nameToVar[owner] || ('cmp_' + sanitizeId(owner));
            const sourceVar = nameToVar[src] || ('cmp_' + sanitizeId(src));
            const ownerPort = dst;
            const sourcePort = dst;
            lines.push(`  // inferred binding ${src}.${sourcePort} -> ${owner}.${ownerPort}`);
            lines.push(`  if (${sourceVar} && ${sourceVar}.ports && ${sourceVar}.ports[${JSON.stringify(sourcePort)}]) {`);
            lines.push(`    ${sourceVar}.ports[${JSON.stringify(sourcePort)}].bindTo({ receive: function(v, model){ if (${ownerVar} && ${ownerVar}.ports && ${ownerVar}.ports[${JSON.stringify(ownerPort)}]) { ${ownerVar}.ports[${JSON.stringify(ownerPort)}].receive(v, model); } } });`);
            lines.push('  }');
          }
        }
        continue;
      }
      // otherwise skip
    }
  }

  // add executables
  for (const ex of executables) {
    const rawBody = ex.body || '';
    const body = rawBody === '' ? '' : translateSysADLExpression(rawBody);
    const params = ex.params || [];
    const paramList = params.map(p => `'${p}'`).join(', ');
    lines.push(`  // executable ${ex.name}`);
    if (body === '' || body === 'undefined') {
      lines.push(`  m.addExecutable('${ex.name}', function() { throw new Error('Executable ${ex.name} has no body'); });`);
    } else {
      lines.push(`  m.addExecutable('${ex.name}', createExecutableFromExpression(${JSON.stringify(body)}, [${paramList}]));`);
    }
  }

  lines.push('  return m;');
  lines.push('}');
  lines.push('module.exports = { createModel };');

  // Normalize lines: after any ';' break line so we don't emit multiple statements per line
  const normalized = [];
  for (const raw of lines) {
    if (typeof raw !== 'string') { normalized.push(String(raw)); continue; }
    const leading = raw.match(/^(\s*)/)[1] || '';
    // split by semicolon but keep parentheses and strings intact is hard; we follow user's rule strictly
    if (raw.indexOf(';') === -1) {
      normalized.push(raw);
      continue;
    }
    const parts = raw.split(';');
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === undefined) continue;
      const trimmed = part.trim();
      // if last part and original didn't end with ';', emit without trailing semicolon
      const isLast = (i === parts.length - 1);
      const originalEndsWithSemicolon = raw.trim().endsWith(';');
      if (trimmed === '') {
        // preserve empty (could be trailing semicolon)
        continue;
      }
      if (isLast && !originalEndsWithSemicolon) {
        normalized.push(leading + trimmed);
      } else {
        normalized.push(leading + trimmed + ';');
      }
    }
  }
  return normalized.join('\n');
}

// Translate simple SysADL expression idioms to JavaScript
function translateSysADLExpression(exprText) {
  if (!exprText || typeof exprText !== 'string') return exprText;
  let s = exprText.trim();
  // logical operators: 'and'/'or'/'not' -> JS equivalents
  s = s.replace(/\band\b/gi, '&&').replace(/\bor\b/gi, '||').replace(/\bnot\b/gi, '!');
  // Replace namespace X::Y -> 'X::Y' (string marker)
  s = s.replace(/([A-Za-z_][A-Za-z0-9_]*)::([A-Za-z_][A-Za-z0-9_]*)/g, function(_, a, b) {
    return JSON.stringify(a + '::' + b);
  });
  // Comparison and equality operators often use '=' or '<>' in SysADL — normalize to JS
  s = s.replace(/<>/g, '!=');
  // be careful to replace assignment-looking '=' only when used in comparisons (space padded)
  s = s.replace(/\s=\s/g, ' == ');
  // numeric literals: ensure commas are not used as decimal separators (basic normalization)
  s = s.replace(/(\d),(\d)/g, '$1.$2');
  // Function call passthrough: keep foo(bar) intact but normalize spacing
  s = s.replace(/\s*\(\s*/g, '(').replace(/\s*\)\s*/g, ')');
  // Transform chained a->b->c into safe JS access: convert to a && a['b'] && a['b']['c'] then return last access
  s = s.replace(/([A-Za-z_][A-Za-z0-9_]*(?:\s*->\s*[A-Za-z_][A-Za-z0-9_]*)+)/g, function(chain) {
    const parts = chain.split(/\s*->\s*/).map(p => p.trim());
    if (parts.length === 1) return parts[0];
    // build progressive access array: a, a['b'], a['b']['c'] ... and return (a && a['b'] && a['b']['c'])
    const accesses = parts.map((p, idx) => {
      if (idx === 0) return parts[0];
      return parts.slice(0, idx+1).map((pp, j) => j === 0 ? pp : `[${JSON.stringify(pp)}]`).join('');
    });
    return '(' + accesses.join(' && ') + ')';
  });
  // Normalize multiple spaces
  s = s.replace(/\s+/g, ' ');
  return s;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    console.error('Usage: transformer.js <input.sysadl> [outdir]');
    process.exit(2);
  }
  const inputPath = path.resolve(argv[0]);
  const outDir = path.resolve(argv[1] || path.join(path.dirname(inputPath), 'generated'));
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const parserPath = path.join(__dirname, 'sysadl-parser.js');
  const parse = await loadParser(parserPath);
  const source = fs.readFileSync(inputPath, 'utf8');
  const ast = parse(source, { grammarSource: { source: inputPath, text: source } });

  const executables = extractExecutablesFromSource(ast, source);
  if (executables.length === 0) console.warn('No executables found in model');

  const modelName = (ast && ast.name) ? ast.name : path.basename(inputPath, path.extname(inputPath));
  // Preserve input basename for output file (e.g., Simple.sysadl -> Simple.js)
  const outFile = path.join(outDir, path.basename(inputPath, path.extname(inputPath)) + '.js');
  const config = extractConfiguration(ast);
  // deterministic allocation mapping using AST (avoid relying on AN/AC suffixes)
  const activityToConnector = {}; // ActivityName -> ConnectorDefName
  const executableToAction = {}; // ExecutableName -> ActionName
  if (ast && ast.allocation && Array.isArray(ast.allocation.allocations)) {
    for (const a of ast.allocation.allocations) {
      if (!a || !a.type) continue;
      if (a.type === 'ActivityAllocation' && a.source && a.target) {
        activityToConnector[a.source] = a.target;
      }
      if (a.type === 'ExecutableAllocation' && a.source && a.target) {
        executableToAction[a.source] = a.target;
      }
    }
  }

  // Build action -> activity map by scanning ActivityDef nodes and their action uses
  const actionToActivity = {}; // actionName -> activityName
  traverse(ast, n => {
    if (n && n.type === 'ActivityDef') {
      const activityName = n.name || n.id || null;
      if (!activityName) return;
      // scan subtree of this activity to find ActionUse nodes that reference action names
      function scanForActions(x) {
        if (!x || typeof x !== 'object') return;
        if (x.type && x.type.toLowerCase().includes('action') && x.definition) {
          actionToActivity[x.definition] = activityName;
        }
        for (const k of Object.keys(x)) {
          const v = x[k];
          if (Array.isArray(v)) v.forEach(it => scanForActions(it)); else scanForActions(v);
        }
      }
      scanForActions(n);
    }
  });

  // Now map connectorDef -> [executableName] deterministically: for each executable allocation, find the action it targets,
  // then find the activity containing that action, then the connector allocated to the activity.
  const connectorToExecutables = {};
  for (const [exeName, actionName] of Object.entries(executableToAction)) {
    const activity = actionToActivity[actionName] || null;
    if (activity && activityToConnector[activity]) {
      const connectorDef = activityToConnector[activity];
      if (!connectorToExecutables[connectorDef]) connectorToExecutables[connectorDef] = [];
      connectorToExecutables[connectorDef].push(exeName);
    } else {
      // fallback: if any activity name equals or contains a substring of actionName, map conservatively
      const candidate = Object.keys(activityToConnector).find(a => actionName && (a === actionName || a.indexOf(actionName) !== -1 || actionName.indexOf(a) !== -1));
      if (candidate) {
        const connectorDef = activityToConnector[candidate];
        if (!connectorToExecutables[connectorDef]) connectorToExecutables[connectorDef] = [];
        connectorToExecutables[connectorDef].push(exeName);
      }
    }
  }

  const moduleCode = generateModule(modelName, executables, config, outDir, connectorToExecutables, activityToConnector, executableToAction, actionToActivity);
  fs.writeFileSync(outFile, moduleCode, 'utf8');
  console.log('Generated', outFile);
}

main().catch(e => { console.error(e); process.exit(1); });

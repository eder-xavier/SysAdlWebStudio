#!/usr/bin/env node
// v0.2 transformer: focus on Configuration (ComponentUse/PortUse/ConnectorBinding) and generate JS model

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { sanitizeId, qualify } = require('./utils');

async function loadParser(parserPath) {
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
    if (Array.isArray(v)) v.forEach(item => traverse(item, cb)); else if (v && typeof v === 'object') traverse(v, cb);
  }
}

function traverseWithParents(node, cb, parents = []) {
  if (!node || typeof node !== 'object') return;
  cb(node, parents);
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach(item => traverseWithParents(item, cb, parents.concat([node])));
    else if (v && typeof v === 'object') traverseWithParents(v, cb, parents.concat([node]));
  }
}

function normalizeForMatch(s) {
  if (!s) return '';
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function tryFindBySuffix(target, candidates) {
  if (!target || !candidates || candidates.length === 0) return null;
  const t = String(target);
  // exact
  for (const c of candidates) if (String(c) === t) return c;
  // suffix match
  for (const c of candidates) if (t.endsWith(String(c))) return c;
  for (const c of candidates) if (String(c).endsWith(t)) return c;
  // normalized match
  const tn = normalizeForMatch(t);
  for (const c of candidates) if (normalizeForMatch(c) === tn) return c;
  // partial normalized containment
  for (const c of candidates) if (tn.indexOf(normalizeForMatch(c)) !== -1) return c;
  for (const c of candidates) if (normalizeForMatch(c).indexOf(tn) !== -1) return c;
  return null;
}

function extractConfigurations(ast) {
  const configs = [];
  traverse(ast, n => { if (n && (n.type === 'Configuration' || n.type === 'configuration')) configs.push(n); });
  return configs;
}

function collectComponentUses(configNode) {
  const uses = [];
  traverseWithParents(configNode, (n, parents) => {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'ComponentUse') { uses.push(n); return; }
    // include node when it is an element of an array explicitly named 'components' (case-insensitive)
    for (let i = parents.length - 1; i >= 0; i--) {
      const p = parents[i];
      if (!p || typeof p !== 'object') continue;
      for (const k of Object.keys(p)) {
        if (!k) continue;
        if (Array.isArray(p[k]) && p[k].includes(n) && /^components?$/i.test(k)) {
          // only accept if the node looks like a component (has a definition/def) or explicit ComponentUse
          if (n.type === 'ComponentUse' || n.definition || n.def) { uses.push(n); return; }
        }
      }
    }
  });
  return uses;
}

function collectPortUses(configNode) {
  // attach ownerComponent by walking with parents; match against collected component uses when possible
  const uses = [];
  traverseWithParents(configNode, (n, parents) => {
    if (!n || typeof n !== 'object') return;
    // common port node shapes
    if (n.type === 'PortUse' || /PortUse/i.test(n.type) || (n.name && n.flow)) {
      let owner = null;
      // prefer a parent that is a component instance
      for (let i = parents.length - 1; i >= 0; i--) {
        const p = parents[i];
        if (!p || typeof p !== 'object') continue;
        if (p.type === 'ComponentUse' || /ComponentUse/i.test(p.type)) {
          owner = p.name || (p.id && p.id.name) || p.id || null; break;
        }
        // or parent has 'components' array containing a node with same identity
        if (Object.keys(p).some(k => Array.isArray(p[k]) && p[k].includes(n))) {
          // find nearest ancestor with a 'name' property
          for (let j = i; j >= 0; j--) {
            const anc = parents[j];
            if (anc && anc.name) { owner = anc.name; break; }
          }
          if (owner) break;
        }
      }
      const obj = Object.assign({}, n, { _ownerComponent: owner });
      uses.push(obj);
    }
  });
  return uses;
}

function collectConnectorBindings(configNode) {
  const binds = [];
  traverse(configNode, n => { if (n && (n.type === 'ConnectorBinding' || n.type === 'ConnectorUse')) binds.push(n); });
  return binds;
}

function generateModuleCode(modelName, componentUses, portUses, connectorBindings, executables, activitiesToRegister) {
  const lines = [];
  lines.push("const { ModelBase, ComponentBase, PortBase, ConnectorBase, createExecutableFromExpression, ActivityBase, ActionBase } = require('../sysadl-runtime.js');");
  lines.push('function createModel() {');
  lines.push(`  const m = new ModelBase(${JSON.stringify(modelName)});`);
  lines.push('  // instantiate component uses');
  // build component map and ensure unique var names
  const compNameToVar = {};
  const usedVarNames = new Set();
  function makeUniqueVar(base) {
    let v = base;
    let i = 1;
    while (usedVarNames.has(v)) { v = base + '_' + (i++); }
    usedVarNames.add(v);
    return v;
  }
  // collect initial component names from componentUses
  for (const cu of componentUses) {
    const sysName = cu && (cu.name || (cu.id && cu.id.name) || cu.id) || null;
    if (!sysName) continue; // skip anonymous / irrelevant nodes
    const def = cu && (cu.definition || cu.def) || null;
    if (Object.keys(compNameToVar).some(k => compNameToVar[k].sysName === sysName)) continue; // dedupe
    const key = sysName;
    const varBase = 'cmp_' + sanitizeId(key || 'unknown');
    const varName = makeUniqueVar(varBase);
    compNameToVar[key] = { varName, sysName: key, def };
  }
  // also ensure owners found in portUses are present
  for (const pu of (portUses || [])) {
    const owner = pu && pu._ownerComponent ? pu._ownerComponent : null;
    if (!owner) continue;
    if (!Object.keys(compNameToVar).some(k => compNameToVar[k].sysName === owner)) {
      const varBase = 'cmp_' + sanitizeId(owner);
      const varName = makeUniqueVar(varBase);
      compNameToVar[owner] = { varName, sysName: owner, def: null };
    }
  }
  // emit component declarations
  for (const k of Object.keys(compNameToVar)) {
    const info = compNameToVar[k];
    lines.push(`  const ${info.varName} = new ComponentBase(${JSON.stringify(info.sysName)}, { sysadlDefinition: ${JSON.stringify(info.def)} });`);
    lines.push(`  ${info.varName} && m.addComponent(${info.varName});`);
  }

  // collect ports per component using portUses (more reliable than traversing subtree)
  const compPortsMap = {};
  for (const pu of (portUses || [])) {
    const pname = pu && (pu.name || (pu.id && pu.id.name) || pu.id) || null;
    let owner = pu && pu._ownerComponent ? pu._ownerComponent : null;
    if (!pname) continue;
    if (!owner) {
      const asStr = String((pu && pu.name) || '');
      if (asStr && asStr.indexOf('.') !== -1) owner = asStr.split('.')[0];
    }
    // only include ports whose owner matches a collected component
    if (!owner) continue;
    if (!Object.values(compNameToVar).some(v => v.sysName === owner)) continue;
    compPortsMap[owner] = compPortsMap[owner] || new Set();
    compPortsMap[owner].add(String(pname));
  }

  // emit ports for each component (only when we have a var mapping)
  for (const cname of Object.keys(compPortsMap)) {
    // find var by sysName
    const infoEntry = Object.values(compNameToVar).find(v => v.sysName === cname) || compNameToVar[cname] || null;
    const compVar = infoEntry ? infoEntry.varName : ('cmp_' + sanitizeId(cname));
    const ports = Array.from(compPortsMap[cname] || []);
    for (const p of ports) {
      const pVar = sanitizeId(p);
      lines.push(`  const ${compVar}_${pVar} = new PortBase(${JSON.stringify(p)}, 'in');`);
      lines.push(`  ${compVar}_${pVar}.ownerComponent = ${JSON.stringify(cname)};`);
      lines.push(`  ${compVar}.addPort(${compVar}_${pVar});`);
    }
  }

  // connectors
  const seenConns = new Set();
  for (const cb of connectorBindings) {
    const cname = (cb.name || (cb.id && cb.id.name) || cb.id) || '_implicit';
    if (seenConns.has(cname)) continue;
    seenConns.add(cname);
    const connVar = 'conn_' + sanitizeId(cname);
  lines.push(`  const ${connVar} = new ConnectorBase(${JSON.stringify(cname)});`);
  lines.push(`  m.addConnector(${connVar});`);
    // if cb has bindings list
    const bl = cb.bindingList || cb.bindings || cb.connects || [];
    if (Array.isArray(bl) && bl.length) {
      for (const b of bl) {
        const src = (b.source && (b.source.name || b.source.id || b.source)) || b.src || b.from || null;
        const dst = (b.destination && (b.destination.name || b.destination.id || b.destination)) || b.dst || b.to || null;
        if (src && dst) {
          // produce forwarding binding: srcComp.srcPort -> dstComp.dstPort if dotted
          const sParts = String(src).split('.');
          const dParts = String(dst).split('.');
          if (sParts.length === 2 && dParts.length === 2) {
            const [sc, sp] = sParts;
            const [dc, dp] = dParts;
            const srcVar = 'cmp_' + sanitizeId(sc);
            const dstVar = 'cmp_' + sanitizeId(dc);
            lines.push(`  // binding ${src} -> ${dst}`);
            lines.push(`  if (${srcVar} && ${srcVar}.ports && ${srcVar}.ports[${JSON.stringify(sp)}]) {`);
            lines.push(`    ${srcVar}.ports[${JSON.stringify(sp)}].bindTo({ receive: function(v, model){`);
            lines.push(`      if (${dstVar} && ${dstVar}.ports && ${dstVar}.ports[${JSON.stringify(dp)}]) {`);
            lines.push(`        ${dstVar}.ports[${JSON.stringify(dp)}].receive(v, model);`);
            lines.push('      }');
            lines.push('    } });');
            lines.push('  }');
          }
        }
      }
    }
  }

  // register executables extracted from definitions
  if (Array.isArray(executables) && executables.length) {
    lines.push('  // executables extracted from definitions');
    for (const ex of executables) {
      const params = Array.isArray(ex.params) ? ex.params : (ex.params || []);
      const body = (ex.body || ex.expression || '').trim();
      if (!body) continue; // skip empty executables
      // qualify name with model context if not already
      let ename = ex.name || null;
      if (!ename) {
        ename = `exe.${modelName}.${Math.random().toString(36).slice(2,8)}`;
      } else if (!ename.includes('.')) {
        ename = `${modelName}.${ename}`;
      }
      // use runtime helper to create executable from expression/body
  // format body into a template literal with indentation
  const bodyLines = String(body).split(/;|\n/).map(l => l.trim()).filter(Boolean);
  const formatted = bodyLines.map(l => '    ' + l + ';').join('\n');
  lines.push('  try {');
  lines.push(`    m.addExecutable(${JSON.stringify(ename)}, createExecutableFromExpression(` + '`' + `\n${formatted}\n` + '`' + `, ${JSON.stringify(params)}));`);
  lines.push('  } catch (e) { /* ignore executable creation error */ }');
    }
  }

  // build a list of qualified executable names as they will be added to the model
  const qualifiedExecNames = (Array.isArray(executables) ? executables.map(ex => {
    let en = ex && ex.name ? ex.name : null;
    if (!en) return null;
    if (!en.includes('.')) en = `${modelName}.${en}`;
    return en;
  }).filter(Boolean) : []);

  // register activities at instance level
  if (Array.isArray(activitiesToRegister) && activitiesToRegister.length) {
    lines.push('  // activities registered for component instances');
    // first, create per-action executables for actions that have a body but no executable
    // ensure unique registration per activity+component and unique variable names
    const __seen_activity_keys = new Set();
    for (const a of activitiesToRegister) {
      const actName = a.activityName;
      const desc = a.descriptor || {};
      const comp = desc.component || null;
      const inputPorts = Array.isArray(desc.inputPorts) ? desc.inputPorts : [];
      const actions = Array.isArray(desc.actions) ? desc.actions : [];
      if (!actName || !comp) continue;
      const key = actName + '::' + comp;
      if (__seen_activity_keys.has(key)) continue;
      __seen_activity_keys.add(key);
      try {
        const actVar = '__act_' + sanitizeId(actName) + '_' + sanitizeId(String(comp));
        lines.push('  try {');
        lines.push(`    const ${actVar} = new ActivityBase(${JSON.stringify(actName)}, { component: ${JSON.stringify(comp)}, inputPorts: ${JSON.stringify(inputPorts)} });`);
        // dedupe actions per activity instance
        const __seen_act_actions = new Set();
        for (const act of actions) {
          const actKey = (act.name || '') + '::' + (act.executable || '');
          if (__seen_act_actions.has(actKey)) continue;
          __seen_act_actions.add(actKey);
          let execName = act.executable || null;
          if (execName && !execName.includes('.')) {
            const candidate = `${modelName}.${execName}`;
            const found = qualifiedExecNames.find(n => n === candidate) || qualifiedExecNames.find(n => n && n.endsWith('.' + execName));
            if (found) execName = found; else execName = candidate;
          }
          if (execName) {
            lines.push(`    ${actVar}.addAction(new ActionBase(${JSON.stringify(act.name || execName)}, ${JSON.stringify(act.params || [])}, ${JSON.stringify(execName)}, ${JSON.stringify(act.body || null)}));`);
          } else {
            lines.push(`    ${actVar}.addAction(new ActionBase(${JSON.stringify(act.name || null)}, ${JSON.stringify(act.params || [])}, null, ${JSON.stringify(act.body || null)}));`);
          }
        }
        lines.push(`    m.registerActivity(${JSON.stringify(actName + '::' + comp)}, ${actVar});`);
        lines.push('  } catch (e) { /* ignore */ }');
      } catch (e) { /* ignore */ }
    }

    for (const a of activitiesToRegister) {
      const actName = a.activityName;
      const desc = a.descriptor || {};
      const comp = desc.component || null;
      const inputPorts = Array.isArray(desc.inputPorts) ? desc.inputPorts : [];
      const actions = Array.isArray(desc.actions) ? desc.actions : [];
      // emit code to construct ActivityBase and ActionBase instances
      lines.push('  try {');
      lines.push(`    const __act_${sanitizeId(actName)} = new ActivityBase(${JSON.stringify(actName)}, { component: ${JSON.stringify(comp)}, inputPorts: ${JSON.stringify(inputPorts)} });`);
      const __seenActions = new Set();
      for (const act of actions) {
        const actKey = (act.name || '') + '::' + (act.executable || '');
        if (__seenActions.has(actKey)) continue;
        __seenActions.add(actKey);
        // if action references an executable string, try to map to a fully-qualified executable name
        let execName = act.executable || null;
        if (execName && !execName.includes('.') ) {
          const candidate = `${modelName}.${execName}`;
          const found = qualifiedExecNames.find(n => n === candidate) || qualifiedExecNames.find(n => n && n.endsWith('.' + execName));
          if (found) execName = found;
          else execName = candidate; // optimistic fallback to qualified form
        }
        if (execName) {
          lines.push(`    __act_${sanitizeId(actName)}.addAction(new ActionBase(${JSON.stringify(act.name || execName)}, ${JSON.stringify(act.params || [])}, ${JSON.stringify(execName)}, ${JSON.stringify(act.body || null)}));`);
        } else {
          lines.push(`    __act_${sanitizeId(actName)}.addAction(new ActionBase(${JSON.stringify(act.name || null)}, ${JSON.stringify(act.params || [])}, null, ${JSON.stringify(act.body || null)}));`);
        }
      }
      lines.push(`    m.registerActivity(${JSON.stringify(actName)}, __act_${sanitizeId(actName)});`);
      lines.push('  } catch (e) { /* ignore */ }');
    }
  }

  lines.push('  return m;');
  lines.push('}');
  lines.push('module.exports = { createModel };');
  return lines.join('\n');
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) { console.error('Usage: transformer.js <input.sysadl> [outdir]'); process.exit(2); }
  const input = path.resolve(argv[0]);
  const outDir = path.resolve(argv[1] || path.join(__dirname, 'generated'));
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const parserPath = path.join(__dirname, '..', 'sysadl-parser.js');
  const parse = await loadParser(parserPath);
  const src = fs.readFileSync(input, 'utf8');
  const ast = parse(src, { grammarSource: { source: input, text: src } });
  const configs = extractConfigurations(ast);
  if (configs.length === 0) console.warn('No configuration sections found in model');
  // pick the configuration that contains the most component uses (heuristic)
  let cfg = configs[0] || ast;
  if (configs && configs.length > 1) {
    let best = cfg; let bestCount = -1;
    for (const c of configs) {
      try {
        const count = collectComponentUses(c).length;
        if (count > bestCount) { best = c; bestCount = count; }
      } catch (e) { /* ignore */ }
    }
    cfg = best || cfg;
  }
  const compUses = collectComponentUses(cfg);
  const portUses = collectPortUses(cfg);
  const connBinds = collectConnectorBindings(cfg);
  // extract executables from AST (definitions)
  function extractExecutablesFromAst(astNode, sourceText) {
    const list = [];
    traverseWithParents(astNode, (n) => {
      if (!n || !n.type) return;
      if (n.type === 'Executable' || /Executable/i.test(n.type)) {
        // try to get name and params and body
        const name = n.name || (n.id && n.id.name) || n.id || (n.definition) || null;
        let params = [];
        if (n.parameters && Array.isArray(n.parameters)) {
          params = n.parameters.map(p => (p.name || p.id || String(p)).toString());
        } else if (n.params && Array.isArray(n.params)) {
          params = n.params.map(p => (p.name || p.id || String(p)).toString());
        }
        let body = '';
        if (n.location && n.location.start && typeof n.location.start.offset === 'number') {
          try {
            const start = n.location.start.offset;
            const end = n.location.end.offset;
            const snippet = sourceText.slice(start, end);
            const m = snippet.match(/executable\s+def\s+\w+\s*\([^)]*\)\s*:[^\{]*\{([\s\S]*)\}/m);
            if (m && m[1]) {
              const rr = m[1].match(/return\s+([\s\S]*?)\s*;\s*$/m);
              if (rr) body = rr[1].trim(); else body = m[1].trim();
            }
          } catch (e) { /* ignore */ }
        }
        list.push({ name, params, body });
      }
    });
    return list;
  }
  const executables = extractExecutablesFromAst(ast, src);
  // allocation mappings from ast.allocation if available
  const activityToConnector = {};
  const executableToAction = {};
  if (ast && ast.allocation && Array.isArray(ast.allocation.allocations)) {
    for (const a of ast.allocation.allocations) {
      if (!a || !a.type) continue;
      if (a.type === 'ActivityAllocation' && a.source && a.target) activityToConnector[a.source] = a.target;
      if (a.type === 'ExecutableAllocation' && a.source && a.target) executableToAction[a.source] = a.target;
    }
  }
  // heuristics to link executables->actions will run later after action definitions are collected
  // build action->activity map by scanning ActivityDef nodes
  const actionToActivity = {};
  traverse(ast, n => {
    if (n && (n.type === 'ActivityDef' || /ActivityDef/i.test(n.type))) {
      const activityName = n.name || n.id || null;
      if (!activityName) return;
      traverse(n, x => {
        if (x && x.type && /Action/.test(x.type)) {
          const an = x.definition || x.name || x.id || null;
          if (an) actionToActivity[an] = activityName;
        }
      });
    }
  });
  const modelName = (ast && ast.name) ? ast.name : path.basename(input, path.extname(input));
  // build connector participants map from connectorBindings
  const connParticipants = {};
  for (const cb of connBinds) {
    const cname = (cb.name || (cb.id && cb.id.name) || cb.id) || '_implicit';
    connParticipants[cname] = connParticipants[cname] || [];
    const bl = cb.bindingList || cb.bindings || cb.connects || [];
    if (Array.isArray(bl)) {
      for (const b of bl) {
        const src = (b.source && (b.source.name || b.source.id || b.source)) || b.src || b.from || null;
        const dst = (b.destination && (b.destination.name || b.destination.id || b.destination)) || b.dst || b.to || null;
        // both sides may be dotted comp.port
        [src, dst].forEach(s => {
          if (!s) return;
          const parts = String(s).split('.');
          if (parts.length === 2) {
            connParticipants[cname].push({ component: parts[0], port: parts[1] });
          }
        });
      }
    }
  }

  // map component definition name -> ComponentDef node
  const compDefMap = {};
  traverse(ast, n => { if (n && (n.type === 'ComponentDef' || /ComponentDef/i.test(n.type))) { const nm = n.name || n.id || null; if (nm) compDefMap[nm] = n; } });

  // map executables -> actions -> activities using allocations
  const activityActionsMap = {}; // activityName -> [{ executable, name }]
  for (const ex of executables) {
    if (!ex || !ex.name) continue;
    const actionName = executableToAction[ex.name];
    if (!actionName) continue;
    const activityName = actionToActivity[actionName];
    if (!activityName) continue;
    activityActionsMap[activityName] = activityActionsMap[activityName] || [];
    activityActionsMap[activityName].push({ executable: ex.name, name: actionName });
  }

  // dedupe actions within each activity (by executable or action name)
  for (const k of Object.keys(activityActionsMap)) {
    const seen = new Set();
    const uniq = [];
    for (const it of activityActionsMap[k]) {
      const key = it.executable || it.name || JSON.stringify(it);
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(it);
    }
    activityActionsMap[k] = uniq;
  }

  // extract action defs (params/body) from AST
  const actionDefMap = {};
  traverse(ast, n => {
    if (n && (n.type === 'ActionDef' || /ActionDef/i.test(n.type))) {
      const an = n.name || n.id || null;
      if (!an) return;
      // try to extract params and body
      let params = [];
      if (Array.isArray(n.parameters)) params = n.parameters.map(p => p.name || p.id || String(p));
      else if (Array.isArray(n.params)) params = n.params.map(p => p.name || p.id || String(p));
      let body = null;
      if (n.location && n.location.start && typeof n.location.start.offset === 'number') {
        try {
          const s = n.location.start.offset; const e = n.location.end.offset;
          const snippet = src.slice(s, e);
          const m = snippet.match(/\{([\s\S]*)\}$/m);
          if (m && m[1]) body = m[1].trim();
        } catch (e) { /* ignore */ }
      }
      actionDefMap[an] = { name: an, params, body };
    }
  });

  // now that we have action definitions and action->activity map, try to link executables -> actions heuristically
  try {
    const actionNames = Object.keys(actionDefMap || {});
    const execNames = executables.map(e => e.name).filter(Boolean);
    for (const exName of execNames) {
      if (executableToAction[exName]) continue;
      const candidate = tryFindBySuffix(exName, actionNames);
      if (candidate) executableToAction[exName] = candidate;
    }
    // propagate to activityToAction mapping via actionToActivity
    for (const exName of Object.keys(executableToAction)) {
      const aName = executableToAction[exName];
      const actName = actionToActivity[aName];
      if (actName) {
        activityActionsMap[actName] = activityActionsMap[actName] || [];
        activityActionsMap[actName].push({ executable: exName, name: aName });
      }
    }
  } catch (e) { /* ignore heuristics errors */ }

  // extract constraints (name -> equation expression) from source text as fallback
  const constraintMap = {};
  try {
    const cre = /constraint\s+(\w+)\s*\([\s\S]*?\)\s*\{[\s\S]*?equation\s*=\s*([^;\n\}]+)[;\n\}]/gmi;
    let m;
    while ((m = cre.exec(src)) !== null) {
      const cname = m[1];
      const expr = (m[2] || '').trim();
      if (cname && expr) constraintMap[cname] = expr;
    }
  } catch (e) { /* ignore */ }
  // extract activity definitions from source as fallback
  function extractActivityDefsFromSource(srcText) {
    const map = {};
    const re = /activity\s+def\s+(\w+)\s*\(([^)]*)\)\s*(?:\(([^)]*)\))?/gmi;
    let m;
    while ((m = re.exec(srcText)) !== null) {
      const name = m[1];
      const p1 = m[2] || '';
      const p2 = m[3] || '';
      const gather = (s) => s.split(',').map(x => x.trim()).filter(Boolean).map(x => { const p = x.split(':')[0].trim(); return p; });
      const params = [].concat(gather(p1), gather(p2)).filter(Boolean);
      map[name] = { name, params };
    }
    return map;
  }
  const activityDefs = extractActivityDefsFromSource(src);

  // compute component -> ports map from earlier compUses / portUses
  const compPortsMap_main = {};
  const compNames = (Array.isArray(compUses) ? compUses.map(cu => cu && (cu.name || (cu.id && cu.id.name) || cu.id) ).filter(Boolean) : []);
  for (const key of compNames) {
    compPortsMap_main[key] = new Set();
  }
  for (const pu of (portUses || [])) {
    const owner = pu && pu._ownerComponent ? pu._ownerComponent : null;
    const pname = pu && (pu.name || (pu.id && pu.id.name) || pu.id) || null;
    if (owner && pname && Object.prototype.hasOwnProperty.call(compPortsMap_main, owner)) compPortsMap_main[owner].add(String(pname));
  }

  // create tolerant matching between activity param names and component ports
  function findMatchingPortsForParams(params, portsSet) {
    const ports = Array.from(portsSet || []);
    const matched = [];
    for (const p of params) {
      const pn = String(p);
      const exact = ports.find(x => x === pn);
      if (exact) { matched.push(exact); continue; }
      // suffix/normalized match: try to find port where normalized forms match or port endsWith param
      const cand = tryFindBySuffix(pn, ports);
      if (cand) { matched.push(cand); continue; }
  // fuzzy: look for port that contains param as substring
  const sub = ports.find(x => String(x).toLowerCase().indexOf(pn.toLowerCase()) !== -1);
  if (sub) { matched.push(sub); continue; }
  // token-overlap scoring fallback
  const scored = scorePortsByTokenOverlap(pn, ports);
  if (scored && scored.length) { matched.push(scored[0]); continue; }
      // no match -> fail
      return null;
    }
    return matched;
  }

  // fuzzy token-overlap scoring: returns list of ports ordered by score
  function scorePortsByTokenOverlap(param, ports) {
    const tokens = String(param).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const scores = ports.map(p => {
      const ptoks = String(p).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      let score = 0;
      for (const t of tokens) if (ptoks.includes(t)) score++;
      return { port: p, score };
    }).sort((a,b) => b.score - a.score);
    return scores.filter(s => s.score > 0).map(s => s.port);
  }

  const activitiesToRegister = [];
  // build mapping instanceName -> definition name when available
  const compInstanceDef = {};
  for (const cu of (compUses || [])) {
    const iname = cu && (cu.name || (cu.id && cu.id.name) || cu.id) || null;
    const ddef = cu && (cu.definition || cu.def || (cu.sysadlType && cu.sysadlType.name)) || null;
    if (iname) compInstanceDef[iname] = ddef;
  }
  const registeredActivities = new Set();
  for (const [an, def] of Object.entries(activityDefs)) {
    const params = def.params || [];
    if (!params || params.length === 0) continue;
    // try preferred component by matching activity name root to definition name
    const root = String(an).replace(/AC$/i, '').replace(/Activity$/i, '').trim();
    const prefComp = Object.keys(compInstanceDef).find(k => {
      const d = compInstanceDef[k];
      if (!d) return false;
      return normalizeForMatch(String(d)) === normalizeForMatch(root) || normalizeForMatch(String(k)) === normalizeForMatch(root);
    }) || null;
  if (prefComp) {
      const portsSet = compPortsMap_main[prefComp] || new Set();
      const matched = findMatchingPortsForParams(params, portsSet);
      if (matched) {
        const basicActions = activityActionsMap[an] || [];
        const enriched = basicActions.map(a => { const ddef = actionDefMap[a.name] || {}; return { name: a.name, executable: a.executable, params: ddef.params || [], body: ddef.body || null }; });
        activitiesToRegister.push({ activityName: an, descriptor: { component: prefComp, inputPorts: matched, actions: enriched } });
        registeredActivities.add(an);
        continue;
      }
    }
    // permissive fallback: score components by how many params can be matched
    let best = null;
    let bestScore = -1;
    for (const cuName of Object.keys(compPortsMap_main)) {
      const portsSet = compPortsMap_main[cuName] || new Set();
      const matched = findMatchingPortsForParams(params, portsSet);
      const score = matched ? matched.length : 0;
      if (score > bestScore) { bestScore = score; best = { cuName, matched }; }
    }
    // register if best candidate matches at least half of params (or all)
    const minNeeded = Math.max(1, Math.ceil(params.length / 2));
    if (best && bestScore >= minNeeded && best.matched) {
      const basicActions = activityActionsMap[an] || [];
      const enriched = basicActions.map(a => { const ddef = actionDefMap[a.name] || {}; return { name: a.name, executable: a.executable, params: ddef.params || [], body: ddef.body || null }; });
      activitiesToRegister.push({ activityName: an, descriptor: { component: best.cuName, inputPorts: best.matched, actions: enriched } });
      registeredActivities.add(an);
    }
    // additionally, register per-component partial matches for any remaining params
    for (const cuName of Object.keys(compPortsMap_main)) {
      // skip if already registered for this activity+component
      const regKey = an + '::' + cuName;
      if (registeredActivities.has(regKey)) continue;
      const portsSet = compPortsMap_main[cuName] || new Set();
      // try to match individual params against this component's ports
      const partial = [];
      for (const p of params) {
        const pn = String(p);
        const exact = Array.from(portsSet).find(x => x === pn);
        if (exact) { partial.push(exact); continue; }
        const cand = tryFindBySuffix(pn, Array.from(portsSet));
        if (cand) { partial.push(cand); continue; }
        const sub = Array.from(portsSet).find(x => String(x).toLowerCase().indexOf(pn.toLowerCase()) !== -1);
        if (sub) { partial.push(sub); continue; }
        const scored = scorePortsByTokenOverlap(pn, Array.from(portsSet));
        if (scored && scored.length) { partial.push(scored[0]); continue; }
      }
      if (partial.length > 0) {
        const basicActions = activityActionsMap[an] || [];
        const enriched = basicActions.map(a => { const ddef = actionDefMap[a.name] || {}; return { name: a.name, executable: a.executable, params: ddef.params || [], body: ddef.body || null }; });
        activitiesToRegister.push({ activityName: an, descriptor: { component: cuName, inputPorts: partial, actions: enriched } });
        registeredActivities.add(regKey);
      }
    }
  }

  try {
    console.error('[DEBUG] activitiesToRegister =', activitiesToRegister.map(a => ({ activity: a.activityName, component: a.descriptor && a.descriptor.component, inputPorts: a.descriptor && a.descriptor.inputPorts && (a.descriptor.inputPorts.length ? a.descriptor.inputPorts : a.descriptor.inputPorts) })));
    console.error('[DEBUG] activityDefs detail =', Object.entries(activityDefs).map(([k,v]) => ({ name: k, params: v.params })));
    console.error('[DEBUG] actionDefMap keys =', Object.keys(actionDefMap || {}));
    // print sample of actionDefMap entries
    try { console.error('[DEBUG] actionDefMap =', Object.fromEntries(Object.keys(actionDefMap).slice(0,50).map(k=> [k, { params: actionDefMap[k] && actionDefMap[k].params, body: (actionDefMap[k] && actionDefMap[k].body) ? String(actionDefMap[k].body).slice(0,120) : null }] ))); } catch(e) {}
    console.error('[DEBUG] activityActionsMap =', Object.fromEntries(Object.keys(activityActionsMap).map(k=> [k, activityActionsMap[k]])));
  } catch (e) { /* ignore */ }
  const moduleCode = generateModuleCode(modelName, compUses, portUses, connBinds, executables, activitiesToRegister);
  // post-process generated code: split occurrences of "; " into ";\n" when safe
  function splitSemicolonsSafely(code) {
    let out = '';
    let inSq = false, inDq = false, inBq = false, esc = false;
    for (let i = 0; i < code.length; i++) {
      const ch = code[i];
      if (esc) { out += ch; esc = false; continue; }
      if (ch === '\\') { out += ch; esc = true; continue; }
      if (ch === '\'') { if (!inDq && !inBq) inSq = !inSq; out += ch; continue; }
      if (ch === '"') { if (!inSq && !inBq) inDq = !inDq; out += ch; continue; }
      if (ch === '`') { if (!inSq && !inDq) inBq = !inBq; out += ch; continue; }
      // when we see semicolon followed by space and not inside any quote/backtick -> split
      if (ch === ';' && !inSq && !inDq && !inBq) {
        const next = code[i+1] || '';
        if (next === ' ' || next === '\t') {
          out += ';\n';
          // skip following single space(s)
          let j = i+1;
          while (j < code.length && (code[j] === ' ' || code[j] === '\t')) j++;
          i = j-1;
          continue;
        }
      }
      out += ch;
    }
    return out;
  }
  const finalCode = splitSemicolonsSafely(moduleCode);
  const outFile = path.join(outDir, path.basename(input, path.extname(input)) + '.js');
  fs.writeFileSync(outFile, finalCode, 'utf8');
  console.log('Generated', outFile);
}

main().catch(e => { console.error(e); process.exit(1); });

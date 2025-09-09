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

function generateModuleCode(modelName, componentUses, portUses, connectorBindings, executables, activitiesToRegister, connParticipants) {
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
  // helper map to reference generated port variables at runtime for connector wiring
  lines.push('  const __portVars = {};');
  // ensure ports required by activities exist (create entries so code emits them)
  try {
    if (Array.isArray(activitiesToRegister)) {
      for (const a of activitiesToRegister) {
        const comp = a && a.descriptor && a.descriptor.component;
        const inputPorts = (a && a.descriptor && Array.isArray(a.descriptor.inputPorts)) ? a.descriptor.inputPorts : [];
        if (!comp) continue;
        compPortsMap[comp] = compPortsMap[comp] || new Set();
        for (const ip of inputPorts) {
          if (!ip) continue;
          compPortsMap[comp].add(String(ip));
        }
        // also add to short mapping if exists (e.g., 'agvs.vc.cs' -> 'cs')
        const short = String(comp).split('.').pop();
        if (short && compPortsMap[short]) {
          for (const ip of inputPorts) compPortsMap[short].add(String(ip));
        }
      }
    }
  } catch (e) { /* ignore */ }
  for (const cname of Object.keys(compPortsMap)) {
    // find var by sysName
    const infoEntry = Object.values(compNameToVar).find(v => v.sysName === cname) || compNameToVar[cname] || null;
    const compVar = infoEntry ? infoEntry.varName : ('cmp_' + sanitizeId(cname));
    const ports = Array.from(compPortsMap[cname] || []);
    for (const p of ports) {
  const pVarBase = compVar + '_' + sanitizeId(p);
  const pVar = makeUniqueVar(pVarBase);
  lines.push(`  const ${pVar} = new PortBase(${JSON.stringify(p)}, 'in');`);
  lines.push(`  ${pVar}.ownerComponent = ${JSON.stringify(cname)};`);
  lines.push(`  ${compVar}.addPort(${pVar});`);
    // register port var for later connector wiring
    lines.push(`  __portVars[${JSON.stringify(cname)}] = __portVars[${JSON.stringify(cname)}] || {};`);
    lines.push(`  __portVars[${JSON.stringify(cname)}][${JSON.stringify(p)}] = ${pVar};`);
    }
  }

  // connectors: group by owner (owner may be '' for top-level)
  const connGroups = {};
  for (const cbWrap of connectorBindings || []) {
    const owner = cbWrap && cbWrap.owner !== undefined ? cbWrap.owner : '';
    connGroups[owner] = connGroups[owner] || [];
    const node = cbWrap && cbWrap.node ? cbWrap.node : cbWrap;
    connGroups[owner].push(node);
  }
  // emit connectors grouped by owner as comments so consumer can place them near components
  for (const owner of Object.keys(connGroups)) {
    const nodes = connGroups[owner] || [];
    // comment header for owner's connector block
    lines.push(`  // connectors declared in ${owner || '<root>'}`);
    for (const cb of nodes) {
      const cname = (cb && (cb.name || (cb.id && cb.id.name) || cb.id)) || '_implicit';
  const connVarBase = 'conn_' + sanitizeId(cname || '_implicit');
  const connVar = makeUniqueVar(connVarBase);
  lines.push(`  const ${connVar} = new ConnectorBase(${JSON.stringify(cname)});`);
  lines.push(`  m.addConnector(${connVar});`);
      // build participant list using __portVars and connParticipants if available
      const bl = cb && (cb.bindingList || cb.bindings || cb.connects) || [];
      const participants = connParticipants && connParticipants[cname] ? connParticipants[cname] : [];
      // collect vars for explicit binding entries
      lines.push(`  // connector participants for ${cname}`);
      lines.push(`  const __parts_${connVar} = [];`);
      // prefer explicit bindings in AST
      if (Array.isArray(bl) && bl.length) {
        for (const b of bl) {
          const src = (b.source && (b.source.name || b.source.id || b.source)) || b.src || b.from || null;
          const dst = (b.destination && (b.destination.name || b.destination.id || b.destination)) || b.dst || b.to || null;
          [src, dst].forEach(s => {
            if (!s) return;
            const parts = String(s).split('.');
            if (parts.length === 2) {
              const sc = parts[0]; const sp = parts[1];
              lines.push(`  if (__portVars[${JSON.stringify(sc)}] && __portVars[${JSON.stringify(sc)}][${JSON.stringify(sp)}]) __parts_${connVar}.push(__portVars[${JSON.stringify(sc)}][${JSON.stringify(sp)}]);`);
            }
          });
        }
      }
      // also include participants inferred from connectorParticipants map
      if (participants && participants.length) {
        for (const p of participants) {
          lines.push(`  if (__portVars[${JSON.stringify(p.component)}] && __portVars[${JSON.stringify(p.component)}][${JSON.stringify(p.port)}]) __parts_${connVar}.push(__portVars[${JSON.stringify(p.component)}][${JSON.stringify(p.port)}]);`);
        }
      }
      // make unique and bind: when a part receives, forward to others
      lines.push(`  (function(){`);
      lines.push(`    const parts = __parts_${connVar}.filter(Boolean);`);
      lines.push(`    for (let i=0;i<parts.length;i++){`);
      lines.push(`      (function(p){`);
      lines.push(`        p.bindTo({ receive: function(v, model){`);
      lines.push(`          for (const q of parts){ if (q !== p) q.receive(v, model); }`);
      lines.push(`        } });`);
      lines.push(`      })(parts[i]);`);
      lines.push(`    }`);
      lines.push(`  })();`);
    }
  }

  // parent -> child propagation: when an instance has dotted qname, attempt to wire parent's ports to child ports
  // e.g. sending to 'agvs.sendStatus' should forward to 'agvs.vc.cs' ports that match by name or suffix
  try {
    for (const inst of Object.keys(compNameToVar)) {
      if (!inst || !inst.includes('.')) continue;
      const parts = String(inst).split('.');
      const parent = parts[0];
      const child = inst;
      // for each parent port, try to find child port with same name or suffix
      lines.push(`  // propagation binding parent->child ${parent} -> ${child}`);
      lines.push(`  if (__portVars[${JSON.stringify(parent)}]) {`);
      lines.push(`    Object.keys(__portVars[${JSON.stringify(parent)}] || {}).forEach(function(pp){`);
      lines.push(`      const parentPort = __portVars[${JSON.stringify(parent)}][pp];`);
      lines.push(`      // find matching child port by exact name, then by suffix`);
      lines.push(`      const childCandidates = __portVars[${JSON.stringify(child)}] || {};`);
      lines.push(`      let target = childCandidates[pp];`);
      lines.push(`      if (!target) {`);
      lines.push(`        const keys = Object.keys(childCandidates);`);
      lines.push(`        for (const k of keys) { if (String(k).toLowerCase().endsWith(String(pp).toLowerCase())) { target = childCandidates[k]; break; } }`);
      lines.push(`      }`);
      lines.push(`      if (target) { parentPort.bindTo({ receive: function(v, model){ target.receive(v, model); } }); }`);
      lines.push(`    });`);
      lines.push(`  }`);
    }
  } catch (e) { /* ignore propagation errors */ }

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
  // map component definition name -> ComponentDef node (needed early for root selection)
  const compDefMap = {};
  traverse(ast, n => { if (n && (n.type === 'ComponentDef' || /ComponentDef/i.test(n.type))) { const nm = n.name || (n.id && n.id.name) || n.id || null; if (nm) compDefMap[nm] = n; } });

  const configs = extractConfigurations(ast);
  try { console.debug('[DEBUG] configurations found =', configs.length); } catch(e){}
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
  try { console.debug('[DEBUG] selected cfg name/id =', cfg && (cfg.name || (cfg.id && cfg.id.name) || '<anon>')); } catch(e){}
    // prefer explicit top-level component container when present
    try {
      if (compDefMap && compDefMap['FactoryAutomationSystem']) {
        const fdef = compDefMap['FactoryAutomationSystem'];
        const fcfgs = extractConfigurations(fdef) || [];
        if (fcfgs.length) {
          cfg = fcfgs[0];
          console.error('[DEBUG] using FactoryAutomationSystem inner configuration as root');
        }
      }
    } catch(e) {}
  }
  // compDefMap already declared above near config selection
  // Recursive collection: resolve ComponentUse instances and their ComponentDef
  // configurations, producing qualified instance names (e.g. agvs.vc.cs) and
  // collecting ports with the qualified owner.
  function collectRecursiveInstancesAndPorts(rootConfig) {
    const instances = []; // will hold objects: { qname, name, def, node }
    const ports = []; // will hold port objects with _ownerComponent set to qualified name
  const connectors = []; // will hold { owner: qnameOrEmpty, node }

    // helper map for quick lookup of child qnames within a parent scope
    function processUse(cu, prefix) {
      const localName = cu && (cu.name || (cu.id && cu.id.name) || cu.id) || null;
      if (!localName) return null;
      const defName = cu && (cu.definition || cu.def) || null;
      const qname = prefix ? (prefix + '.' + localName) : localName;
      // only record instance when this node is explicitly a ComponentUse or its definition refers to a ComponentDef
      const defNodeEarly = defName ? (compDefMap[defName] || compDefMap[String(defName)]) : null;
      if (!(cu.type === 'ComponentUse' || /ComponentUse/i.test(cu.type) || defNodeEarly)) {
        // not a component instance (likely a port or typed member) -> skip
      } else {
        instances.push({ qname, name: localName, def: defName, node: cu });
      }

      // if the referenced definition has an internal configuration, process it
      const defNode = compDefMap[defName] || compDefMap[String(defName)] || null;
      if (defNode) {
        const innerConfigs = extractConfigurations(defNode);
        const innerCfg = innerConfigs && innerConfigs.length ? innerConfigs[0] : null;
        if (innerCfg) {
          // traverse innerCfg directly to find child component uses and ports (including composed ports)
          traverseWithParents(innerCfg, (n, parents) => {
            if (!n || typeof n !== 'object') return;
            // collect connectors declared inside this inner configuration and attribute to current qname
            if (n.type === 'ConnectorBinding' || /ConnectorBinding/i.test(n.type) || n.bindings || n.bindingList || n.connects) {
              connectors.push({ owner: qname, node: n });
              return;
            }
            // detect component use-like nodes
            if (n.type === 'ComponentUse' || /ComponentUse/i.test(n.type) || (n.name && (n.definition || n.def))) {
              // avoid processing the same node twice
              if (instances.some(it => it.node === n)) return;
              processUse(n, qname);
              return;
            }
            // detect port container (composed) e.g. node has a 'ports' array or 'members'
            if (Array.isArray(n.ports) && n.name) {
              const parentPortName = n.name;
              // register parent port
              ports.push(Object.assign({}, n, { _ownerComponent: qname, name: parentPortName }));
              for (const sub of n.ports) {
                const subName = sub && (sub.name || (sub.id && sub.id.name) || sub.id) || null;
                if (!subName) continue;
                const copy = Object.assign({}, sub, { _ownerComponent: qname, name: subName });
                ports.push(copy);
              }
              return;
            }
            // detect simple port nodes: type contains 'Port' or has 'flow' property or parent key suggests a port
            const parent = parents && parents.length ? parents[parents.length-1] : null;
            const parentKey = parent && Object.keys(parent).find(k => Array.isArray(parent[k]) && parent[k].includes(n));
            const looksLikePort = n.type && /Port/i.test(n.type) || n.flow || /port/i.test(String(parentKey || '')) || (n.name && (n.flow || n.direction));
            if (looksLikePort) {
              // determine owner: nearest ancestor ComponentUse node in parents
              let ownerLocal = null;
              for (let i = parents.length - 1; i >= 0; i--) {
                const anc = parents[i];
                if (!anc) continue;
                if (anc.type === 'ComponentUse' || /ComponentUse/i.test(anc.type)) {
                  ownerLocal = anc.name || (anc.id && anc.id.name) || anc.id || null; break;
                }
                // or ancestor is a componentDef inner entry with name
                if (anc.name && anc.definition) { ownerLocal = anc.name; break; }
              }
              let owner = qname;
              if (ownerLocal) {
                const childEntry = instances.find(it => it.name === ownerLocal && it.qname.indexOf(qname + '.') === 0);
                if (childEntry) owner = childEntry.qname; else owner = qname;
              }
              const pname = n && (n.name || (n.id && n.id.name) || n.id) || null;
              if (!pname) return;
              const copy = Object.assign({}, n, { _ownerComponent: owner });
              ports.push(copy);
            }
          });
        }
      }
      return qname;
    }

  // start with top-level uses declared in the chosen configuration
  const topUses = collectComponentUses(rootConfig) || [];
  try { console.debug('[DEBUG] topUses count =', topUses.length); } catch(e){}
    for (const u of topUses) processUse(u, '');

    // also collect ports declared directly in the top-level configuration (owner should be top-level instance)
    const topPorts = collectPortUses(rootConfig) || [];
    for (const pu of topPorts) {
      let owner = pu && pu._ownerComponent ? pu._ownerComponent : null;
      // if owner is a top-level local name, map to qualified name (no prefix)
      if (owner) {
        const inst = instances.find(it => it.name === owner && it.qname.indexOf(owner) === 0);
        if (inst) owner = inst.qname; // already same for top-level
      } else {
        // ambiguous port at top-level without explicit owner -> skip
        continue;
      }
      const pname = pu && (pu.name || (pu.id && pu.id.name) || pu.id) || null;
      if (!pname) continue;
      const copy = Object.assign({}, pu, { _ownerComponent: owner });
      ports.push(copy);
    }

    // collect connectors declared directly in the top-level configuration and mark owner as '' (root)
    const rootConn = collectConnectorBindings(rootConfig) || [];
    for (const rc of rootConn) connectors.push({ owner: '', node: rc });

      return { instances, ports, connectors };
  }

  const _collected = collectRecursiveInstancesAndPorts(cfg);
  try { console.debug('[DEBUG] collected instances count =', (_collected.instances||[]).length); } catch(e){}
  // normalize into shapes expected by downstream generator helpers
  const compUses = (_collected.instances || []).map(i => ({ type: 'ComponentUse', name: i.qname, definition: i.def, _orig: i.node }));
  const portUses = _collected.ports || [];
  // prefer connectors found by recursive collector (they carry owner information)
  const connBinds = (_collected.connectors || []).map(c => c);
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
  // build connector participants map from connectorBindings (cb may be {owner,node} or raw node)
  const connParticipants = {};
  for (const cbWrap of connBinds) {
    const cb = cbWrap && cbWrap.node ? cbWrap.node : cbWrap;
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

  // compDefMap already declared above near config selection

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
    // also expose short unqualified name for matching (last segment)
    const parts = String(key).split('.');
    const short = parts.length ? parts[parts.length-1] : key;
    if (short && !compPortsMap_main[short]) compPortsMap_main[short] = compPortsMap_main[key];
  }
  for (const pu of (portUses || [])) {
    const owner = pu && pu._ownerComponent ? pu._ownerComponent : null;
    const pname = pu && (pu.name || (pu.id && pu.id.name) || pu.id) || null;
    if (owner && pname && Object.prototype.hasOwnProperty.call(compPortsMap_main, owner)) compPortsMap_main[owner].add(String(pname));
    // also add to short name mapping when present
    if (owner && pname) {
      const parts = String(owner).split('.');
      const short = parts.length ? parts[parts.length-1] : null;
      if (short && Object.prototype.hasOwnProperty.call(compPortsMap_main, short)) compPortsMap_main[short].add(String(pname));
    }
  }

  // augment ports map using connector participants (they explicitly reference component.port)
  try {
    for (const cname of Object.keys(connParticipants || {})) {
      const parts = connParticipants[cname] || [];
      for (const p of parts) {
        if (!p || !p.component || !p.port) continue;
        const comp = p.component;
        if (!compPortsMap_main[comp]) compPortsMap_main[comp] = new Set();
        compPortsMap_main[comp].add(String(p.port));
        const short = String(comp).split('.').pop();
        if (short && compPortsMap_main[short]) compPortsMap_main[short].add(String(p.port));
      }
    }
  } catch (e) { /* ignore augmentation errors */ }

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

  // attempt to collect ports for a qualified component name including descendant components
  function collectPortsForQualifiedComponent(qname) {
    const result = new Set();
    if (!qname) return result;
    // direct ports
    if (compPortsMap_main[qname]) for (const p of compPortsMap_main[qname]) result.add(p);
    // also collect ports from descendant qualified names that start with qname + '.'
    for (const k of Object.keys(compPortsMap_main)) {
      if (k === qname) continue;
      if (String(k).indexOf(qname + '.') === 0) {
        for (const p of compPortsMap_main[k]) result.add(p);
      }
    }
    // also attempt short-name resolution
    const short = String(qname).split('.').pop();
    if (short && compPortsMap_main[short]) for (const p of compPortsMap_main[short]) result.add(p);
    return result;
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

  // permissive registration: for each activityDef, register it to any instance whose
  // definition or short name matches the activity root; choose input ports by best match
  for (const [an, def] of Object.entries(activityDefs)) {
    const params = def.params || [];
    const root = String(an).replace(/AC$/i, '').replace(/Activity$/i, '').trim();

    // find candidate instances: match by definition name or by short instance name
    const candidates = [];
    for (const instName of Object.keys(compInstanceDef)) {
      const ddef = compInstanceDef[instName];
      if (ddef && normalizeForMatch(String(ddef)) === normalizeForMatch(root)) { candidates.push(instName); continue; }
      const short = String(instName).split('.').pop();
      if (short && normalizeForMatch(short) === normalizeForMatch(root)) { candidates.push(instName); continue; }
      if (normalizeForMatch(instName) === normalizeForMatch(root)) { candidates.push(instName); continue; }
    }
    // fallback: allow partial match on definition
    if (candidates.length === 0) {
      for (const instName of Object.keys(compInstanceDef)) {
        const ddef = compInstanceDef[instName] || '';
        if (normalizeForMatch(String(ddef)).indexOf(normalizeForMatch(root)) !== -1) { candidates.push(instName); }
      }
    }

    // if still no candidates, try all components
    if (candidates.length === 0) candidates.push(...Object.keys(compInstanceDef));

    for (const cand of candidates) {
      const portsSet = collectPortsForQualifiedComponent(cand) || new Set();
      let matched = [];
      if (params && params.length) matched = findMatchingPortsForParams(params, portsSet) || [];
      // fallback: if no matched ports, pick the first available port
      if ((!matched || matched.length === 0) && portsSet && portsSet.size) matched = [Array.from(portsSet)[0]];

      const basicActions = activityActionsMap[an] || [];
      const enriched = basicActions.map(a => { const ddef = actionDefMap[a.name] || {}; return { name: a.name, executable: a.executable, params: ddef.params || [], body: ddef.body || null }; });
      activitiesToRegister.push({ activityName: an, descriptor: { component: cand, inputPorts: matched, actions: enriched } });
    }
  }

  // debug summary suppressed in normal runs; enable by setting DEBUG=1 env var
  try {
    if (process.env.DEBUG) {
      console.error('[DEBUG] activitiesToRegister =', activitiesToRegister.map(a => ({ activity: a.activityName, component: a.descriptor && a.descriptor.component, inputPorts: a.descriptor && a.descriptor.inputPorts && (a.descriptor.inputPorts.length ? a.descriptor.inputPorts : a.descriptor.inputPorts) })));
      console.error('[DEBUG] activityDefs detail =', Object.entries(activityDefs).map(([k,v]) => ({ name: k, params: v.params })));
      console.error('[DEBUG] actionDefMap keys =', Object.keys(actionDefMap || {}));
      try { console.error('[DEBUG] actionDefMap =', Object.fromEntries(Object.keys(actionDefMap).slice(0,50).map(k=> [k, { params: actionDefMap[k] && actionDefMap[k].params, body: (actionDefMap[k] && actionDefMap[k].body) ? String(actionDefMap[k].body).slice(0,120) : null }] ))); } catch(e) {}
      console.error('[DEBUG] activityActionsMap =', Object.fromEntries(Object.keys(activityActionsMap).map(k=> [k, activityActionsMap[k]])));
    }
  } catch (e) { /* ignore */ }
  // Ensure that activitiesToRegister have inputPorts: when empty, fall back to params declared in activityDefs
  try {
    for (const at of activitiesToRegister) {
      if (!at || !at.activityName || !at.descriptor) continue;
      const desc = at.descriptor;
      if ((!desc.inputPorts || desc.inputPorts.length === 0) && activityDefs && activityDefs[at.activityName] && Array.isArray(activityDefs[at.activityName].params)) {
        const params = activityDefs[at.activityName].params || [];
        desc.inputPorts = params.map(pn => sanitizeId(pn)).filter(Boolean);
      }
      // also sanitize any existing inputPorts
      if (desc.inputPorts && desc.inputPorts.length) desc.inputPorts = desc.inputPorts.map(pn => sanitizeId(pn)).filter(Boolean);
    }
  } catch (e) { console.warn('[WARN] while filling activity inputPorts:', e && e.message); }
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

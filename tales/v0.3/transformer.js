#!/usr/bin/env node
// v0.3 transformer: emit class-based modules that use SysADLBase runtime

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { sanitizeId } = require('../v0.2/utils');

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

function extractConfigurations(ast) {
  const configs = [];
  traverse(ast, n => { if (n && (n.type === 'Configuration' || n.type === 'configuration')) configs.push(n); });
  return configs;
}

function collectComponentUses(configNode) {
  const uses = [];
  traverse(configNode, n => { if (!n || typeof n !== 'object') return; if (n.type === 'ComponentUse') uses.push(n); });
  return uses;
}

function collectPortUses(configNode) {
  const uses = [];
  traverse(configNode, n => {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'PortUse' || /PortUse/i.test(n.type) || (n.name && n.flow)) uses.push(n);
  });
  return uses;
}

function generateClassModule(modelName, compUses, portUses, connectorBindings, executables, activitiesToRegister, rootDefs, parentMap, compInstanceDef) {
  const lines = [];
  // runtime imports for generated module
  lines.push("const { Model, Component, Port, Connector, Activity, Action, createExecutableFromExpression } = require('../SysADLBase');");
  // connectorDescriptors: normalized bindings may be provided in outer scope; if not, derive from parameter
  const connectorDescriptors = (typeof connectorBindings !== 'undefined' && connectorBindings) ? connectorBindings : [];
  const typeNames = new Set();
  try { if (typeof compDefMap !== 'undefined' && compDefMap) for (const k of Object.keys(compDefMap)) typeNames.add(k); } catch(e){}
  try {
    if (Array.isArray(compUses)) for (const cu of compUses) { if (cu && cu.definition) typeNames.add(String(cu.definition)); }
  } catch(e){}
  try { if (compInstanceDef && typeof compInstanceDef === 'object') for (const v of Object.values(compInstanceDef)) if (v) typeNames.add(String(v)); } catch(e){}
  try { if (Array.isArray(rootDefs)) for (const r of rootDefs) if (r) typeNames.add(String(r)); } catch(e){}
  try { console.error('[DBG] typeNames:', JSON.stringify(Array.from(typeNames).slice(0,50))); } catch(e){}
  // create simple class per definition (if none, skip)
  for (const t of Array.from(typeNames)) {
    const cls = 'class ' + sanitizeId(String(t)) + ' extends Component { constructor(name){ super(name); } }';
    lines.push(cls);
  }
  lines.push('');

  // emit model class
  lines.push(`class ${sanitizeId(modelName)} extends Model {`);
  lines.push('  constructor(){');
  lines.push(`    super(${JSON.stringify(modelName)});`);
  lines.push('    // instantiate components and expose as properties for direct navigation');

  // Instantiate components respecting hierarchical parents (rootDefs holds top-level composite types)
  // rootDefs: array of type names to create at model root (e.g. ['FactoryAutomationSystem'])
  // parentMap: map instanceName -> parentPath (e.g. { agvs: 'this.FactoryAutomationSystem' })
  const compMap = {};
  // create root composite instances
  if (Array.isArray(rootDefs)) {
    for (const rdef of rootDefs) {
      if (!rdef) continue;
      const prop = sanitizeId(String(rdef));
      lines.push(`    this.${prop} = new ${sanitizeId(String(rdef))}(${JSON.stringify(String(rdef))});`);
      lines.push(`    this.addComponent(this.${prop});`);
    }
  }

  // create all other instances and attach to parents when possible
  // emit instances in top-down order (parents before children) to avoid assigning
  // properties on undefined intermediate objects
  const instances = [];
  for (const cu of compUses) {
    const iname = cu && (cu.name || cu.id || (cu.id && cu.id.name)) ? (cu.name || (cu.id && cu.id.name) || cu.id) : null;
    if (!iname) continue;
    // skip if this instance name collides with a root def property we already created
    if (Array.isArray(rootDefs) && rootDefs.includes(String(iname))) continue;
    const defType = cu.definition || (compInstanceDef && compInstanceDef[iname]) || null;
    const typeCls = defType ? sanitizeId(String(defType)) : 'Component';
    const parentPath = parentMap && parentMap[iname] ? parentMap[iname] : null;
    instances.push({ name: iname, typeCls, parentPath });
  }

  // compute a shallow depth for each instance based on parentPath (fewer segments -> closer to root)
  function depthFor(item) {
    if (!item.parentPath) return 0;
    // count '.' separators to approximate nesting depth (this.<A>.<B> -> depth 2)
    return (item.parentPath.match(/\./g) || []).length;
  }

  instances.sort((a,b) => {
    const da = depthFor(a); const db = depthFor(b);
    if (da !== db) return da - db;
    return String(a.name).localeCompare(String(b.name));
  });

  for (const it of instances) {
    const iname = it.name; const typeCls = it.typeCls; const parentPath = it.parentPath;
    if (parentPath) {
      // attach under parentPath, e.g. this.FactoryAutomationSystem.agvs
      lines.push(`    ${parentPath}.${iname} = new ${typeCls}(${JSON.stringify(String(iname))});`);
      lines.push(`    ${parentPath}.addComponent(${parentPath}.${iname});`);
    } else {
      // fallback to previous behavior: top-level instance
      lines.push(`    this.${iname} = new ${typeCls}(${JSON.stringify(String(iname))});`);
      lines.push(`    this.addComponent(this.${iname});`);
    }
  }

  // small helpers to keep generated code compact
  lines.push('');
  lines.push('    // helper to add executable safely');
  lines.push('    const __addExec = (ename, body, params) => { try { this.addExecutable(ename, createExecutableFromExpression(String(body||""), params||[])); } catch(e) { /* ignore */ } };');
  lines.push('    // helper to attach connector endpoint (model, componentExprOrName, portName)');
  lines.push('    const __attachEndpoint = (conn, compOrName, portName) => { try { let comp = compOrName; if (typeof compOrName === "string") { comp = this.components && this.components[compOrName] ? this.components[compOrName] : Object.values(this.components||{}).find(c=>c && (c.sysadlName === compOrName || c.name === compOrName)); } if (comp && comp.ports && comp.ports[portName]) conn.addEndpoint(this, comp.ports[portName]); } catch(e){} };');
  // helper to find a component (including nested children) that exposes a given port
  lines.push('    const __findPortComponent = (portName) => { try { const seen = new Set(); const rec = (c) => { if (!c || seen.has(c)) return null; seen.add(c); if (c.ports && c.ports[portName]) return c; if (c.components) { for (const k of Object.keys(c.components||{})) { const child = c.components[k]; const f = rec(child); if (f) return f; } } return null; }; for (const top of Object.values(this.components||{})) { const f = rec(top); if (f) return f; } return null; } catch(e){ return null; } };');
  // normalized search: compare port names ignoring non-alnum chars
  lines.push('    const _norm = (s) => { try { return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,""); } catch(e){ return String(s||""); } };');
  lines.push('    const __findPortComponentByNormalized = (portName) => { try { const np = _norm(portName); const seen = new Set(); const rec = (c) => { if (!c || seen.has(c)) return null; seen.add(c); if (c.ports) { for (const pk of Object.keys(c.ports||{})) { if (_norm(pk) === np || _norm(pk).indexOf(np) !== -1 || np.indexOf(_norm(pk)) !== -1) return c; } } if (c.components) { for (const k of Object.keys(c.components||{})) { const child = c.components[k]; const f = rec(child); if (f) return f; } } return null; }; for (const top of Object.values(this.components||{})) { const f = rec(top); if (f) return f; } return null; } catch(e){ return null; } };');

  // build instance path map (instanceName -> expression to reference it in generated code)
  const instancePathMap = {};
  // rootDefs created as this.<TypeName> (prop name is sanitized type)
  if (Array.isArray(rootDefs)) for (const r of rootDefs) if (r) instancePathMap[r] = `this.${sanitizeId(String(r))}`;
  // for declared instances in compUses, prefer parentMap mapping
  for (const cu of compUses) {
    const iname = cu && (cu.name || cu.id || (cu.id && cu.id.name)) ? (cu.name || (cu.id && cu.id.name) || cu.id) : null;
    if (!iname) continue;
    if (parentMap && parentMap[iname]) instancePathMap[iname] = parentMap[iname] + `.${iname}`;
    else instancePathMap[iname] = `this.${iname}`;
  }

  // emit ports (attach to component instances)
  for (const pu of portUses) {
    const pname = pu && (pu.name || pu.id || (pu.id && pu.id.name)) ? (pu.name || (pu.id && pu.id.name) || pu.id) : null;
    const owner = pu && pu._ownerComponent ? pu._ownerComponent : (pu.owner || null);
    if (!pname || !owner) continue;
  const ownerExpr = instancePathMap[owner] || `this.${owner}`;
  lines.push(`    // port ${pname} on ${owner} (expr: ${ownerExpr})`);
  lines.push(`    if (!${ownerExpr}.ports) ${ownerExpr}.ports = {};`);
  lines.push(`    if (!${ownerExpr}.ports[${JSON.stringify(pname)}]) { const __p = new Port(${JSON.stringify(pname)}, 'in', { owner: ${JSON.stringify(owner)} }); ${ownerExpr}.addPort(__p); }`);
  }

  // ensure ports for activity inputPorts exist on their components
  try {
    if (Array.isArray(activitiesToRegister)) {
      for (const a of activitiesToRegister) {
        const comp = a && a.descriptor && a.descriptor.component;
        const inputPorts = (a && a.descriptor && Array.isArray(a.descriptor.inputPorts)) ? a.descriptor.inputPorts : [];
        if (!comp || !inputPorts.length) continue;
        const ownerExpr = instancePathMap[comp] || `this.${comp}`;
        lines.push(`    // ensure activity ports for ${comp} (expr: ${ownerExpr})`);
        lines.push(`    if (!${ownerExpr}.ports) ${ownerExpr}.ports = {};`);
        for (const ip of inputPorts) {
            lines.push(`    if (!${ownerExpr}.ports[${JSON.stringify(ip)}]) { const __p = new Port(${JSON.stringify(ip)}, 'in', { owner: ${JSON.stringify(comp)} }); ${ownerExpr}.addPort(__p); }`);
          }
      }
    }
  } catch(e) { /* ignore */ }

  // add executables (use helper to keep code concise)
  if (Array.isArray(executables) && executables.length) {
    for (const ex of executables) {
      const params = Array.isArray(ex.params) ? ex.params : (ex.params || []);
      const body = (ex.body || ex.expression || '') || '';
      if (!String(body).trim()) continue;
      let en = ex.name || null;
      if (!en) en = `${modelName}.${Math.random().toString(36).slice(2,6)}`;
      else if (!en.includes('.')) en = `${modelName}.${en}`;
      lines.push(`    __addExec(${JSON.stringify(en)}, ${JSON.stringify(String(body))}, ${JSON.stringify(params)});`);
    }
  }

  // register activities
  if (Array.isArray(activitiesToRegister) && activitiesToRegister.length) {
    for (const a of activitiesToRegister) {
      const comp = a.descriptor && a.descriptor.component;
      const inputPorts = a.descriptor && a.descriptor.inputPorts ? a.descriptor.inputPorts : [];
      const actions = a.descriptor && a.descriptor.actions ? a.descriptor.actions : [];
      const actVar = 'act_' + sanitizeId(a.activityName + '_' + String(comp));
      lines.push(`    const ${actVar} = new Activity(${JSON.stringify(a.activityName)}, { component: ${JSON.stringify(comp)}, inputPorts: ${JSON.stringify(inputPorts)} });`);
      for (const act of actions) {
        const exec = act.executable || null;
        if (exec) {
          lines.push(`    ${actVar}.addAction(new Action(${JSON.stringify(act.name || exec)}, ${JSON.stringify(act.params || [])}, ${JSON.stringify(exec)}));`);
        } else {
          lines.push(`    ${actVar}.addAction(new Action(${JSON.stringify(act.name || null)}, ${JSON.stringify(act.params || [])}, null));`);
        }
      }
      lines.push(`    this.registerActivity(${JSON.stringify(a.activityName + '::' + comp)}, ${actVar});`);
    }
  }
  // emit connectors (use normalized connectorDescriptors so we have participants/bindings resolved)
  if (Array.isArray(connectorDescriptors) && connectorDescriptors.length) {
    for (const cb of connectorDescriptors) {
      const cname = cb.name || ('connector_' + Math.random().toString(36).slice(2,6));
      const uid = cb && cb._uid ? '_' + String(cb._uid) : '';
      const varName = 'conn_' + sanitizeId(String(cname)) + uid;
      lines.push(`    // connector ${cname}`);
      lines.push(`    const ${varName} = new Connector(${JSON.stringify(cname)});`);
      // attach participants if present (resolved earlier)
      if (Array.isArray(cb.participants) && cb.participants.length) {
        for (const p of cb.participants) {
          if (!p || !p.owner || !p.port) continue;
          // owner may be qualified like 'a.b' -> prefer instancePathMap lookup to get full expression
          const ownerExpr = (instancePathMap && instancePathMap[p.owner]) ? instancePathMap[p.owner] : `this.${p.owner}`;
          lines.push(`    __attachEndpoint(${varName}, ${ownerExpr}, ${JSON.stringify(p.port)});`);
        }
      }
      // also handle bindings array (may contain strings or resolved objects)
      if (Array.isArray(cb.bindings) && cb.bindings.length) {
        for (const b of cb.bindings) {
          const left = b && (b.left || b.from) ? b.left : null;
          const right = b && (b.right || b.to) ? b.right : null;
          if (!left || !right) continue;
          // string form: attempt to attach using previous heuristics
          if (typeof left === 'string' && typeof right === 'string') {
            const lparts = String(left).split('.'); const rparts = String(right).split('.');
            const lowner = lparts.length>1? lparts[0] : null; const lport = lparts.length>1? lparts.slice(1).join('.') : lparts[0];
            const rowner = rparts.length>1? rparts[0] : null; const rport = rparts.length>1? rparts.slice(1).join('.') : rparts[0];
            if (lowner) {
              const ownerExpr = (instancePathMap && instancePathMap[lowner]) ? instancePathMap[lowner] : `this.${lowner}`;
              lines.push(`    __attachEndpoint(${varName}, ${ownerExpr}, ${JSON.stringify(lport)});`);
            } else {
              lines.push(`    try { let __p = __findPortComponent(${JSON.stringify(lport)}); if(!__p) __p = __findPortComponentByNormalized(${JSON.stringify(lport)}); if(__p) __attachEndpoint(${varName}, __p, ${JSON.stringify(lport)}); } catch(e) {}`);
            }
            if (rowner) {
              const ownerExpr = (instancePathMap && instancePathMap[rowner]) ? instancePathMap[rowner] : `this.${rowner}`;
              lines.push(`    __attachEndpoint(${varName}, ${ownerExpr}, ${JSON.stringify(rport)});`);
            } else {
              lines.push(`    try { let __p = __findPortComponent(${JSON.stringify(rport)}); if(!__p) __p = __findPortComponentByNormalized(${JSON.stringify(rport)}); if(__p) __attachEndpoint(${varName}, __p, ${JSON.stringify(rport)}); } catch(e) {}`);
            }
            continue;
          }
          // object form: { left: { owner, port }, right: { owner, port } }
          const lobj = (typeof left === 'object' && left) ? left : null;
          const robj = (typeof right === 'object' && right) ? right : null;
          if (lobj && lobj.owner && lobj.port) lines.push(`    __attachEndpoint(${varName}, this.${lobj.owner}, ${JSON.stringify(lobj.port)});`);
          if (robj && robj.owner && robj.port) lines.push(`    __attachEndpoint(${varName}, this.${robj.owner}, ${JSON.stringify(robj.port)});`);
        }
      }
      lines.push(`    this.addConnector(${varName});`);
    }
  }

  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push(`function createModel(){ return new ${sanitizeId(modelName)}(); }`);
  lines.push('module.exports = { createModel, ' + sanitizeId(modelName) + ' };');
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

  const compDefMap = {};
  traverse(ast, n => { if (n && (n.type === 'ComponentDef' || /ComponentDef/i.test(n.type))) { const nm = n.name || (n.id && n.id.name) || n.id || null; if (nm) compDefMap[nm] = n; } });

  const configs = extractConfigurations(ast);
  let cfg = configs[0] || ast;
  if (configs && configs.length > 1) {
    let best = cfg; let bestCount = -1;
    for (const c of configs) {
      try { const count = collectComponentUses(c).length; if (count > bestCount) { best = c; bestCount = count; } } catch(e){}
    }
    cfg = best || cfg;
  }

  // collect component uses and ports across the whole AST (to include nested configs)
  const allUses = collectComponentUses(ast) || [];
  const portUses = collectPortUses(ast) || [];
  const compUses = allUses.map(u => ({ type: 'ComponentUse', name: u.name || (u.id && u.id.name) || u.id, definition: u.definition || u.def || null }));

  // collect connector bindings declared anywhere in the AST
  const connectorBindings = [];
  traverse(ast, n => { if (n && (n.type === 'ConnectorBinding' || /ConnectorBinding/i.test(n.type) || n.bindings || n.bindingList || n.connects)) connectorBindings.push({ owner: '', node: n }); });
  try {
    console.error('[DBG] raw connectorBindings sample keys:', connectorBindings.slice(0,6).map(b=>({type:b.node.type, name:b.node.name, keys:Object.keys(b.node).slice(0,8)})));
    for (let i=0;i<Math.min(3, connectorBindings.length); ++i) {
      try { console.error('[DBG] connectorBindings['+i+']:', JSON.stringify(connectorBindings[i].node, null, 2).slice(0,2000)); } catch(e){}
    }
  } catch(e){}

  // Normalize connectorBindings into descriptors we can emit
  // NOTE: we perform normalization here after compPortsMap_main is available so we can
  // resolve unqualified port names to component instances and produce concrete participants.
  const connectorDescriptors = [];
  let connectorCounter = 0;
  try {
    // build a lightweight comp->set(port) map (local) from collected compUses and portUses
    const localCompPorts = {};
    try {
      for (const cu of compUses) {
        const cname = cu && cu.name ? String(cu.name) : null;
        if (!cname) continue;
        if (!localCompPorts[cname]) localCompPorts[cname] = new Set();
      }
      for (const pu of portUses) {
        const owner = pu && (pu._ownerComponent || pu.owner) ? (pu._ownerComponent || pu.owner) : null;
        const pname = pu && (pu.name || pu.id || (pu.id && pu.id.name)) ? (pu.name || (pu.id && pu.id.name) || pu.id) : null;
        if (!owner || !pname) continue;
        if (!localCompPorts[owner]) localCompPorts[owner] = new Set();
        localCompPorts[owner].add(String(pname));
      }
    } catch(e) { /* ignore map build */ }
  try { console.error('[DBG] localCompPorts keys:', Object.keys(localCompPorts).slice(0,20).map(k=>({k,ports:Array.from(localCompPorts[k]||[])}))); } catch(e){}
    function findComponentByNameOrSuffix(name) {
      if (!name) return null;
      if (localCompPorts[name]) return name;
      // try exact sysadlName match
      var bySysadl = Object.keys(localCompPorts).find(function (c) { return c.split('.').pop() === name });
      if (bySysadl) return bySysadl;
      // try contains as suffix
      var bySuffix = Object.keys(localCompPorts).find(function (c) { return c.endsWith('.' + name) || c === name });
      if (bySuffix) return bySuffix;
      return null;
    }

    function resolveSide(side) {
      // side can be string like "agvs.sendStatus" or just "sendStatus" or nested qualified
      if (!side) return null;
      if (typeof side !== 'string') return null;
      var parts = side.split('.');
      if (parts.length > 1) {
        // try progressively longer prefixes as component qnames
        for (var i = parts.length - 1; i >= 1; --i) {
          var ownerCandidate = parts.slice(0, i).join('.');
          var portCandidate = parts.slice(i).join('.');
          if (localCompPorts[ownerCandidate] && localCompPorts[ownerCandidate].has(portCandidate)) {
            return { owner: ownerCandidate, port: portCandidate }
          }
        }
        // fallback: if final segment matches a known component name, treat previous as comp path
        var maybeComp = parts.slice(0, parts.length - 1).join('.');
        var maybePort = parts[parts.length - 1];
        var f = findComponentByNameOrSuffix(maybeComp);
        if (f && localCompPorts[f].has(maybePort)) return { owner: f, port: maybePort };
      }
      // unqualified: find components exposing this port
      var matches = Object.keys(localCompPorts).filter(function (c) {
        return localCompPorts[c].has(side)
      });
      if (matches.length === 1) return { owner: matches[0], port: side };
      if (matches.length > 1) {
        // disambiguate by component name matching suffix or exact sysadlName
        var bySys = matches.filter(function (c) { return c.split('.').pop() === side });
        if (bySys.length === 1) return { owner: bySys[0], port: side };
        var bySuffix = matches.filter(function (c) { return c.endsWith('.' + side) });
        if (bySuffix.length === 1) return { owner: bySuffix[0], port: side };
        // fallback to shortest qname
        var best = matches.reduce(function (a, b) { return a.length <= b.length ? a : b });
        return { owner: best, port: side };
      }
      return null;
    }

    for (const cb of connectorBindings) {
      const node = cb.node || {};
      const nameHint = node.name || (node.definition && node.definition.name) || null;
      const bindings = [];
      const explicitParts = [];

      // helper: try to push pair if left/right present as strings or objects
      function pushBinding(left, right) {
        if (!left || !right) return;
        // if a single string contains an arrow, split it
        try {
          if (typeof left === 'string' && left.indexOf('->') !== -1) {
            const parts = left.split('->').map(s=>s.trim()).filter(Boolean);
            if (parts.length >= 2) { pushBinding(parts[0], parts[1]); return; }
          }
          if (typeof right === 'string' && right.indexOf('->') !== -1) {
            const parts = right.split('->').map(s=>s.trim()).filter(Boolean);
            if (parts.length >= 2) { pushBinding(parts[0], parts[1]); return; }
          }
          if (typeof left === 'string' && typeof right === 'string') {
            bindings.push({ left: String(left), right: String(right) });
            return;
          }
        } catch(e) { /* continue */ }
        // left/right may be objects with owner/component and port/name
        const lobj = (typeof left === 'object') ? left : null;
        const robj = (typeof right === 'object') ? right : null;
        if (lobj && robj) {
          const ls = lobj.owner || lobj.component || null; const lp = lobj.port || lobj.name || null;
          const rs = robj.owner || robj.component || null; const rp = robj.port || robj.name || null;
          if (ls && lp && rs && rp) {
            explicitParts.push({ owner: ls, port: lp });
            explicitParts.push({ owner: rs, port: rp });
            return;
          }
        }
      }

      // ConnectorUse nodes often have .bindings array; these may be tokenized arrays from the parser.
      function flattenToString(x) {
        if (x == null) return null;
        // strings: strip block comments and normalize tokens
        if (typeof x === 'string') {
          try {
            let s = x.replace(/\/\*[\s\S]*?\*\//g, ''); // remove /* .. */
            // keep word chars, dots, arrows and underscores; replace others with space
            s = s.replace(/[^\w\.\->]+/g, ' ');
            s = s.replace(/\s+/g, ' ').trim();
            return s || null;
          } catch(e) { return x; }
        }
        // arrays: flatten and join with space
        if (Array.isArray(x)) {
          try {
            const parts = x.map(item => flattenToString(item)).filter(Boolean);
            if (!parts.length) return null;
            return parts.join(' ');
          } catch(e) { return null; }
        }
        if (typeof x === 'object') {
          if (x.text && typeof x.text === 'string') return flattenToString(x.text);
          if (x.name && typeof x.name === 'string') return flattenToString(x.name);
          for (const k of Object.keys(x)) {
            const v = x[k]; if (Array.isArray(v) && v.length) { const f = flattenToString(v); if (f) return f; }
          }
          return null;
        }
        return String(x);
      }

      if (Array.isArray(node.bindings) && node.bindings.length) {
        for (const b of node.bindings) {
          // b may be a complex token array like ["bindings", [ <tokens> ]]
          if (Array.isArray(b) && b.length === 2 && Array.isArray(b[1])) {
            const inner = b[1];
            // inner may contain pairs or sequences; attempt to find subsequences of two string-like tokens
            const flat = flattenToString(inner);
            if (flat && flat.indexOf('->') !== -1) {
              const parts = flat.split('->').map(s=>s.trim()).filter(Boolean);
              if (parts.length >= 2) pushBinding(parts[0], parts[1]);
            }
            // fallback: try to scan inner for patterns like [ [null, 'left'], [null, ' '], [null, 'right'] ]
            let acc = '';
            const tokens = [];
            for (const it of inner) { const s = flattenToString(it); if (s) { acc += s; tokens.push(s); } }
            if (tokens.length >= 3) {
              // heuristically split on whitespace into two halves
              const joined = tokens.join('');
              const m = joined.match(/([A-Za-z0-9_\.]+)\s+([A-Za-z0-9_\.]+)/);
              if (m) pushBinding(m[1], m[2]);
            }
            continue;
          }
          const left = b && (b.left || b.from) ? (b.left || b.from) : null;
          const right = b && (b.right || b.to) ? (b.right || b.to) : null;
          // try flattening if non-string
          const Ls = flattenToString(left);
          const Rs = flattenToString(right);
          pushBinding(Ls || left, Rs || right);
        }
      }

      // ConnectorBinding nodes may use source/destination
      if (node.source && node.destination) {
        pushBinding(node.source, node.destination);
      }

      // ConnectorBindingList may have items containing source/destination
      if (Array.isArray(node.items) && node.items.length) {
        for (const it of node.items) {
          if (!it) continue;
          if (it.source && it.destination) pushBinding(it.source, it.destination);
          else if (it.bindings && Array.isArray(it.bindings)) for (const b of it.bindings) pushBinding(b.left||b.from, b.right||b.to);
        }
      }

      // also accept participants/connects arrays as explicit endpoints
      if (Array.isArray(node.participants) && node.participants.length) {
        for (const p of node.participants) {
          if (!p) continue;
          if (typeof p === 'string') {
            const parts = String(p).split('.'); if (parts.length>1) explicitParts.push({ owner: parts.slice(0,parts.length-1).join('.'), port: parts.slice(-1)[0] });
          } else if (p && (p.owner || p.component) && (p.port || p.name)) {
            explicitParts.push({ owner: p.owner || p.component, port: p.port || p.name });
          }
        }
      }

      if (Array.isArray(node.connects) && node.connects.length) {
        for (const c of node.connects) {
          if (!c) continue;
          if (typeof c === 'string') {
            const parts = String(c).split('.'); if (parts.length>1) explicitParts.push({ owner: parts.slice(0,parts.length-1).join('.'), port: parts.slice(-1)[0] });
          } else if (c && c.owner && c.port) explicitParts.push({ owner: c.owner, port: c.port });
        }
      }

      // resolve simple bindings into owner/port pairs using compPortsMap_main
      const resolved = [];
      for (const b of bindings) {
          const L = resolveSide(b.left);
          const R = resolveSide(b.right);
          // if we couldn't resolve owner, keep original flattened strings so codegen can try runtime lookup
          if ((!L || !L.owner) && (!R || !R.owner)) {
            const Ls = flattenToString(b.left) || (typeof b.left === 'string' ? b.left : null);
            const Rs = flattenToString(b.right) || (typeof b.right === 'string' ? b.right : null);
            if (Ls || Rs) resolved.push({ left: Ls, right: Rs });
            else {
              if (L || R) resolved.push({ left: L, right: R });
            }
          } else {
            resolved.push({ left: L, right: R });
          }
        }

      // build descriptor name: prefer hint, else create deterministic name from bindings
      let cname = nameHint || null;
      if (!cname) {
        if (resolved.length) {
          try {
            cname = resolved.map(r => {
              const lown = (r.left && (r.left.owner || r.left)) ? (r.left.owner || r.left) : 'x';
              const lprt = (r.left && (r.left.port || (typeof r.left === 'string' ? r.left : null))) ? (r.left.port || r.left) : 'x';
              const rown = (r.right && (r.right.owner || r.right)) ? (r.right.owner || r.right) : 'x';
              const rprt = (r.right && (r.right.port || (typeof r.right === 'string' ? r.right : null))) ? (r.right.port || r.right) : 'x';
              return `${lown}.${lprt}__${rown}.${rprt}`;
            }).join('_');
          } catch(e) { cname = null; }
        }
        if (!cname) cname = 'connector_' + (++connectorCounter).toString(36);
      }

      const parts = [];
      const seen = new Set();
      // include explicitParts first
      for (const p of explicitParts) {
        if (!p || !p.owner || !p.port) continue;
        const key = p.owner + '.' + p.port; if (!seen.has(key)) { parts.push({ owner: p.owner, port: p.port }); seen.add(key); }
      }
      for (const r of resolved) {
        if (r.left && r.left.owner) { const key = r.left.owner + '.' + r.left.port; if (!seen.has(key)) { parts.push({ owner: r.left.owner, port: r.left.port }); seen.add(key); } }
        if (r.right && r.right.owner) { const key = r.right.owner + '.' + r.right.port; if (!seen.has(key)) { parts.push({ owner: r.right.owner, port: r.right.port }); seen.add(key); } }
      }
      // If parts still empty, try to qualify unqualified sides by searching compPortsMap_main
      if (!parts.length && Array.isArray(resolved) && resolved.length) {
        for (const r of resolved) {
          // left
          if (r.left && r.left.port && !r.left.owner) {
            // try ownerHint first
            if (ownerHint && compPortsMap_main[ownerHint] && compPortsMap_main[ownerHint].has(r.left.port)) {
              const key = ownerHint + '.' + r.left.port; if (!seen.has(key)) { parts.push({ owner: ownerHint, port: r.left.port }); seen.add(key); }
            } else {
              // find any component that exposes this port
              const cand = Object.keys(compPortsMap_main).find(c => compPortsMap_main[c] && compPortsMap_main[c].has(r.left.port));
              if (cand) { const key = cand + '.' + r.left.port; if (!seen.has(key)) { parts.push({ owner: cand, port: r.left.port }); seen.add(key); } }
            }
          }
          // right
          if (r.right && r.right.port && !r.right.owner) {
            if (ownerHint && compPortsMap_main[ownerHint] && compPortsMap_main[ownerHint].has(r.right.port)) {
              const key = ownerHint + '.' + r.right.port; if (!seen.has(key)) { parts.push({ owner: ownerHint, port: r.right.port }); seen.add(key); }
            } else {
              const cand = Object.keys(compPortsMap_main).find(c => compPortsMap_main[c] && compPortsMap_main[c].has(r.right.port));
              if (cand) { const key = cand + '.' + r.right.port; if (!seen.has(key)) { parts.push({ owner: cand, port: r.right.port }); seen.add(key); } }
            }
          }
        }
      }
      // If still empty, attempt to extract textual bindings from node.location in the source
      if (!parts.length) {
        try {
          if (node && node.location && node.location.start && typeof node.location.start.offset === 'number' && typeof node.location.end.offset === 'number') {
            const s = node.location.start.offset; const e = node.location.end.offset;
            try {
              const snippet = src.slice(s,e);
              // First, try to extract a bounded 'bindings' or 'connects' block using brace matching
              const lowered = snippet.toLowerCase();
              let foundBlock = null;
              const tryFindBlock = (kw) => {
                const idx = lowered.indexOf(kw);
                if (idx === -1) return null;
                // search for first brace after keyword
                const rest = snippet.slice(idx);
                const braceIdx = rest.indexOf('{');
                if (braceIdx === -1) return null;
                let pos = idx + braceIdx + 1; // position inside snippet after '{'
                let depth = 1; let end = pos;
                while (pos < snippet.length) {
                  const ch = snippet[pos];
                  if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) { end = pos; break; } }
                  pos++;
                }
                if (end > idx) return snippet.slice(idx + braceIdx + 1, end);
                return null;
              };
              foundBlock = tryFindBlock('bindings') || tryFindBlock('connects') || tryFindBlock('participants');
              let candidates = [];
              if (foundBlock) {
                // split block by commas, semicolons or newlines
                candidates = foundBlock.split(/,|;|\n/).map(x=>x.trim()).filter(Boolean);
              } else {
                candidates = snippet.split(/;|\n/).map(x=>x.trim()).filter(Boolean);
              }
              for (const c of candidates) {
                if (!c) continue;
                // ignore comment-only lines
                if (/^\/\*/.test(c) || /^\/\//.test(c)) continue;
                // try arrow patterns A.B.port -> C.D.port or A -> B
                const m = c.match(/([\w\.]+)\s*[-=]*>\s*([\w\.]+)/);
                if (m) {
                  const L = m[1]; const R = m[2];
                  const lparts = L.split('.'); const rparts = R.split('.');
                  const lowner = lparts.length>1? lparts.slice(0,-1).join('.') : null; const lport = lparts.length>1? lparts.slice(-1)[0] : lparts[0];
                  const rowner = rparts.length>1? rparts.slice(0,-1).join('.') : null; const rport = rparts.length>1? rparts.slice(-1)[0] : rparts[0];
                  if (lport) {
                    const owner = lowner || ownerHint || Object.keys(compPortsMap_main).find(cn=> compPortsMap_main[cn] && compPortsMap_main[cn].has(lport)) || null;
                    if (owner) { const key = owner + '.' + lport; if (!seen.has(key)) { parts.push({ owner, port: lport }); seen.add(key); } }
                  }
                  if (rport) {
                    const owner = rowner || ownerHint || Object.keys(compPortsMap_main).find(cn=> compPortsMap_main[cn] && compPortsMap_main[cn].has(rport)) || null;
                    if (owner) { const key = owner + '.' + rport; if (!seen.has(key)) { parts.push({ owner, port: rport }); seen.add(key); } }
                  }
                  continue;
                }
                // fallback: tokens like 'outNotifications' or 'inNotifications'
                const m2 = c.match(/([\w\.]+)/);
                if (m2) {
                  const tok = m2[1];
                  const partsTok = tok.split('.');
                  const port = partsTok.length>1? partsTok.slice(-1)[0] : tok;
                  const owner = partsTok.length>1? partsTok.slice(0,-1).join('.') : ownerHint || Object.keys(compPortsMap_main).find(cn=> compPortsMap_main[cn] && compPortsMap_main[cn].has(port));
                  if (port && owner) { const key = owner + '.' + port; if (!seen.has(key)) { parts.push({ owner, port }); seen.add(key); } }
                }
              }
            } catch(e) {}
          }
        } catch(e) {}
      }

  const descObj = { name: cname, participants: parts, bindings: resolved, _uid: ++connectorCounter };
  connectorDescriptors.push(descObj);
    }
  } catch(e) { /* ignore */ }

  // extract ports and connectors from component definitions and attribute them to instances
  try {
    for (const cu of compUses) {
      const defName = cu.definition || null;
      if (!defName) continue;
      const defNode = compDefMap[defName] || compDefMap[String(defName)];
      if (!defNode) continue;
      const innerCfgs = extractConfigurations(defNode) || [];
      // also, if the ComponentDef node has a top-level 'ports' or 'members' array, register them
      if (Array.isArray(defNode.ports) && defNode.ports.length) {
        for (const p of defNode.ports) {
          const pname = p && (p.name || (p.id && p.id.name) || p.id) || null;
          if (!pname) continue;
          portUses.push(Object.assign({}, p, { _ownerComponent: cu.name, name: pname }));
        }
      }
      if (Array.isArray(defNode.members) && defNode.members.length) {
        for (const p of defNode.members) {
          const pname = p && (p.name || (p.id && p.id.name) || p.id) || null;
          if (!pname) continue;
          portUses.push(Object.assign({}, p, { _ownerComponent: cu.name, name: pname }));
        }
      }
      if (!innerCfgs.length) continue;
      const inner = innerCfgs[0];
      // traverse inner configuration to find port-like nodes and connector bindings
      traverse(inner, n => {
        if (!n || typeof n !== 'object') return;
        // connector binding inside definition -> attribute to this instance
        if (n.type === 'ConnectorBinding' || /ConnectorBinding/i.test(n.type) || n.bindings || n.bindingList || n.connects) {
          connectorBindings.push({ owner: cu.name, node: n });
          return;
        }

  // composed ports container (has ports array) or explicit 'members' that hold ports
        if ((Array.isArray(n.ports) && n.name) || (Array.isArray(n.members) && n.name)) {
          // register parent port-like node
          portUses.push(Object.assign({}, n, { _ownerComponent: cu.name, name: n.name }));
          const children = Array.isArray(n.ports) ? n.ports : n.members;
          for (const sub of children) {
            const subName = sub && (sub.name || (sub.id && sub.id.name) || sub.id) || null;
            if (!subName) continue;
            const copy = Object.assign({}, sub, { _ownerComponent: cu.name, name: subName });
            portUses.push(copy);
          }
          return;
        }

        // participants / ports declared under participant-like containers
        if (n.participants && Array.isArray(n.participants)) {
          for (const p of n.participants) {
            const pname = p && (p.name || (p.id && p.id.name) || p.id) || null;
            if (!pname) continue;
            const copy = Object.assign({}, p, { _ownerComponent: cu.name, name: pname });
            portUses.push(copy);
          }
          return;
        }

        // simple port nodes (permissive: has flow, direction, type, or name inside ports section)
        const looksLikePort = (n.type && /Port/i.test(n.type)) || n.flow || n.direction || n.type === 'PortDef' || (n.name && (n.flow || n.direction || n._ownerComponent));
        if (looksLikePort) {
          const pname = n && (n.name || (n.id && n.id.name) || n.id) || null;
          if (!pname) return;
          const copy = Object.assign({}, n, { _ownerComponent: cu.name, name: pname });
          portUses.push(copy);
        }
      });
    }
  } catch (e) { /* ignore extraction errors */ }

  // extract executables (simple): look for Executable nodes
  const executables = [];
  traverse(ast, n => { if (n && (n.type === 'Executable' || /Executable/i.test(n.type))) { const name = n.name || (n.id && n.id.name) || n.id || null; let params = []; if (Array.isArray(n.parameters)) params = n.parameters.map(p => p.name || p.id || String(p)); let body = ''; if (n.location && n.location.start && typeof n.location.start.offset === 'number') { try { const s = n.location.start.offset; const e = n.location.end.offset; body = src.slice(s,e); } catch(e){} } executables.push({ name, params, body }); } });

  // activities: ported heuristics from v0.2 to map actions->executables and pick input ports
  const activitiesToRegister = [];

  // helpers ported from v0.2
  function normalizeForMatch(s) { if (!s) return ''; return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ''); }
  function tryFindBySuffix(target, candidates) {
    if (!target || !candidates || candidates.length === 0) return null;
    const t = String(target);
    for (const c of candidates) if (String(c) === t) return c;
    for (const c of candidates) if (t.endsWith(String(c))) return c;
    for (const c of candidates) if (String(c).endsWith(t)) return c;
    const tn = normalizeForMatch(t);
    for (const c of candidates) if (normalizeForMatch(c) === tn) return c;
    for (const c of candidates) if (tn.indexOf(normalizeForMatch(c)) !== -1) return c;
    for (const c of candidates) if (normalizeForMatch(c).indexOf(tn) !== -1) return c;
    return null;
  }

  function scorePortsByTokenOverlap(param, ports) {
    const tokens = String(param).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const scores = ports.map(p => {
      const ptoks = String(p).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      let score = 0; for (const t of tokens) if (ptoks.includes(t)) score++; return { port: p, score };
    }).sort((a,b) => b.score - a.score);
    return scores.filter(s => s.score > 0).map(s => s.port);
  }

  // build actionDefMap (params/body) from AST
  const actionDefMap = {};
  traverse(ast, n => {
    if (n && (n.type === 'ActionDef' || /ActionDef/i.test(n.type))) {
      const an = n.name || n.id || null;
      if (!an) return;
      let params = [];
      if (Array.isArray(n.parameters)) params = n.parameters.map(p => p.name || p.id || String(p));
      else if (Array.isArray(n.params)) params = n.params.map(p => p.name || p.id || String(p));
      let body = null;
      if (n.location && n.location.start && typeof n.location.start.offset === 'number') {
        try { const s = n.location.start.offset; const e = n.location.end.offset; const snippet = src.slice(s,e); const m = snippet.match(/\{([\s\S]*)\}$/m); if (m && m[1]) body = m[1].trim(); } catch (e) {}
      }
      actionDefMap[an] = { name: an, params, body };
    }
  });

  // map action name -> activity name by scanning ActivityDef nodes
  const actionToActivity = {};
  traverse(ast, n => {
    if (n && (n.type === 'ActivityDef' || /ActivityDef/i.test(n.type))) {
      const activityName = n.name || n.id || null; if (!activityName) return;
      traverse(n, x => { if (x && x.type && /Action/.test(x.type)) { const an = x.definition || x.name || x.id || null; if (an) actionToActivity[an] = activityName; } });
    }
  });

  // build executableToAction from allocation info if present
  const executableToAction = {};
  if (ast && ast.allocation && Array.isArray(ast.allocation.allocations)) {
    for (const a of ast.allocation.allocations) {
      if (!a || !a.type) continue;
      if (a.type === 'ExecutableAllocation' && a.source && a.target) executableToAction[a.source] = a.target;
    }
  }

  // map executables -> activities via action mapping heuristics
  const execNames = executables.map(e => e.name).filter(Boolean);
  try {
    const actionNames = Object.keys(actionDefMap || {});
    for (const exName of execNames) {
      if (executableToAction[exName]) continue;
      const candidate = tryFindBySuffix(exName, actionNames);
      if (candidate) executableToAction[exName] = candidate;
    }
  } catch (e) { /* ignore */ }

  // build activityActionsMap: activityName -> [{ executable, name }]
  const activityActionsMap = {};
  for (const ex of executables) {
    if (!ex || !ex.name) continue;
    const actionName = executableToAction[ex.name];
    if (!actionName) continue;
    const activityName = actionToActivity[actionName];
    if (!activityName) continue;
    activityActionsMap[activityName] = activityActionsMap[activityName] || [];
    activityActionsMap[activityName].push({ executable: ex.name, name: actionName });
  }

  // dedupe actions within each activity
  for (const k of Object.keys(activityActionsMap)) {
    const seen = new Set(); const uniq = [];
    for (const it of activityActionsMap[k]) { const key = it.executable || it.name || JSON.stringify(it); if (seen.has(key)) continue; seen.add(key); uniq.push(it); }
    activityActionsMap[k] = uniq;
  }

  // build component -> ports map from compUses / portUses
  const compPortsMap_main = {};
  const compNames = (Array.isArray(compUses) ? compUses.map(cu => cu && (cu.name || (cu.id && cu.id.name) || cu.id) ).filter(Boolean) : []);
  for (const key of compNames) { compPortsMap_main[key] = new Set(); const parts = String(key).split('.'); const short = parts.length ? parts[parts.length-1] : key; if (short && !compPortsMap_main[short]) compPortsMap_main[short] = compPortsMap_main[key]; }
  for (const pu of (portUses || [])) {
    const owner = pu && pu._ownerComponent ? pu._ownerComponent : null;
    const pname = pu && (pu.name || (pu.id && pu.id.name) || pu.id) || null;
    if (owner && pname && Object.prototype.hasOwnProperty.call(compPortsMap_main, owner)) compPortsMap_main[owner].add(String(pname));
    if (owner && pname) { const parts = String(owner).split('.'); const short = parts.length ? parts[parts.length-1] : null; if (short && Object.prototype.hasOwnProperty.call(compPortsMap_main, short)) compPortsMap_main[short].add(String(pname)); }
  }
  try { console.error('[DBG] compPortsMap_main keys:', Object.keys(compPortsMap_main).slice(0,40).map(k=>({k,ports:Array.from(compPortsMap_main[k]||[])}))); } catch(e){}
  // second-pass: re-process connectorBindings using compPortsMap_main to qualify unqualified ports
  try {
    for (const cbEntry of connectorBindings) {
      try {
        const node = cbEntry.node || {};
        const nameHint = node.name || (node.definition && node.definition.name) || null;
        const ownerHint = cbEntry && cbEntry.owner ? cbEntry.owner : null;
        const desc = connectorDescriptors.find(d => d.name === nameHint) || null;
        if (!desc) continue;
        if (Array.isArray(desc.participants) && desc.participants.length) continue; // already have participants
          // try normalized matching from existing desc.bindings first (fuzzy match port names)
          try {
            if ((!Array.isArray(parts) || parts.length === 0) && Array.isArray(desc.bindings) && desc.bindings.length) {
              const seen = new Set();
              for (const r of desc.bindings) {
                try {
                  const L = r.left; const R = r.right;
                  if (L && L.port && !L.owner) {
                    const target = String(L.port);
                    const cand = Object.keys(compPortsMap_main).find(cn => {
                      try { return Array.from(compPortsMap_main[cn]||[]).some(p => normalizeForMatch(p) === normalizeForMatch(target) || normalizeForMatch(p).indexOf(normalizeForMatch(target)) !== -1 || normalizeForMatch(target).indexOf(normalizeForMatch(p)) !== -1); } catch(e){ return false; }
                    });
                    if (cand) { const key = cand + '.' + target; if (!seen.has(key)) { parts.push({ owner: cand, port: target }); seen.add(key); } }
                  }
                  if (R && R.port && !R.owner) {
                    const target = String(R.port);
                    const cand = Object.keys(compPortsMap_main).find(cn => {
                      try { return Array.from(compPortsMap_main[cn]||[]).some(p => normalizeForMatch(p) === normalizeForMatch(target) || normalizeForMatch(p).indexOf(normalizeForMatch(target)) !== -1 || normalizeForMatch(target).indexOf(normalizeForMatch(p)) !== -1); } catch(e){ return false; }
                    });
                    if (cand) { const key = cand + '.' + target; if (!seen.has(key)) { parts.push({ owner: cand, port: target }); seen.add(key); } }
                  }
                } catch(e) {}
              }
              if (parts.length) desc.participants = parts;
            }
          } catch(e) {}
          // try to extract snippet
        if (node && node.location && node.location.start && typeof node.location.start.offset === 'number' && typeof node.location.end.offset === 'number') {
          const s = node.location.start.offset; const e = node.location.end.offset;
          const snippet = src.slice(s,e);
          const lowered = snippet.toLowerCase();
          const tryFindBlock = (kw) => {
            const idx = lowered.indexOf(kw);
            if (idx === -1) return null;
            const rest = snippet.slice(idx);
            const braceIdx = rest.indexOf('{');
            if (braceIdx === -1) return null;
            let pos = idx + braceIdx + 1; let depth = 1; let end = pos;
            while (pos < snippet.length) { const ch = snippet[pos]; if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) { end = pos; break; } } pos++; }
            if (end > idx) return snippet.slice(idx + braceIdx + 1, end);
            return null;
          };
          const foundBlock = tryFindBlock('bindings') || tryFindBlock('connects') || tryFindBlock('participants');
          const candidates = (foundBlock ? foundBlock.split(/,|;|\n/) : snippet.split(/;|\n/)).map(x=>x.trim()).filter(Boolean);
          const parts = []; const seen = new Set();
          for (const c of candidates) {
            if (!c) continue; if (/^\/\*/.test(c) || /^\/\//.test(c)) continue;
            const m = c.match(/([\w\.]+)\s*[-=]*>\s*([\w\.]+)/);
            if (m) {
              const L = m[1]; const R = m[2];
              const lparts = L.split('.'); const rparts = R.split('.');
              const lport = lparts.length>1? lparts.slice(-1)[0] : lparts[0];
              const rport = rparts.length>1? rparts.slice(-1)[0] : rparts[0];
              const lowner = lparts.length>1? lparts.slice(0,-1).join('.') : null; const rowner = rparts.length>1? rparts.slice(0,-1).join('.') : null;
              const lownerResolved = lowner || ownerHint || Object.keys(compPortsMap_main).find(cn=> compPortsMap_main[cn] && compPortsMap_main[cn].has(lport)) || null;
              const rownerResolved = rowner || ownerHint || Object.keys(compPortsMap_main).find(cn=> compPortsMap_main[cn] && compPortsMap_main[cn].has(rport)) || null;
              if (lownerResolved && lport) { const key = lownerResolved + '.' + lport; if (!seen.has(key)) { parts.push({ owner: lownerResolved, port: lport }); seen.add(key); } }
              if (rownerResolved && rport) { const key = rownerResolved + '.' + rport; if (!seen.has(key)) { parts.push({ owner: rownerResolved, port: rport }); seen.add(key); } }
            }
          }
          if (parts.length) { desc.participants = parts; }
        }
      } catch(e) {}
    }
  } catch(e) {}

  function collectPortsForQualifiedComponent(qname) {
    const result = new Set(); if (!qname) return result;
    if (compPortsMap_main[qname]) for (const p of compPortsMap_main[qname]) result.add(p);
    for (const k of Object.keys(compPortsMap_main)) { if (k === qname) continue; if (String(k).indexOf(qname + '.') === 0) for (const p of compPortsMap_main[k]) result.add(p); }
    const short = String(qname).split('.').pop(); if (short && compPortsMap_main[short]) for (const p of compPortsMap_main[short]) result.add(p);
    return result;
  }

  function findMatchingPortsForParams(params, portsSet) {
    const ports = Array.from(portsSet || []); const matched = [];
    for (const p of params) {
      const pn = String(p);
      const exact = ports.find(x => x === pn); if (exact) { matched.push(exact); continue; }
      const cand = tryFindBySuffix(pn, ports);
      if (cand) { matched.push(cand); continue; }
      const sub = ports.find(x => String(x).toLowerCase().indexOf(pn.toLowerCase()) !== -1);
      if (sub) { matched.push(sub); continue; }
      const scored = scorePortsByTokenOverlap(pn, ports);
      if (scored && scored.length) { matched.push(scored[0]); continue; }
      return null;
    }
    return matched;
  }

  // permissive registration: for each activityDef in source, register it to instances
  const activityDefs = {};
  const activityRe = /activity\s+def\s+(\w+)\s*\(([^)]*)\)/gmi;
  let mm;
  while ((mm = activityRe.exec(src)) !== null) {
    const name = mm[1]; const p1 = mm[2] || ''; const gather = s => s.split(',').map(x => x.trim()).filter(Boolean).map(x => { const p = x.split(':')[0].trim(); return p; });
    const params = [].concat(gather(p1)).filter(Boolean);
    activityDefs[name] = { name, params };
  }

  const compInstanceDef = {};
  for (const cu of (compUses || [])) { const iname = cu && (cu.name || (cu.id && cu.id.name) || cu.id) || null; const ddef = cu && (cu.definition || cu.def || (cu.sysadlType && cu.sysadlType.name)) || null; if (iname) compInstanceDef[iname] = ddef; }

  for (const [an, def] of Object.entries(activityDefs)) {
    const params = def.params || [];
    const root = String(an).replace(/AC$/i, '').replace(/Activity$/i, '').trim();
    const candidates = [];
    for (const instName of Object.keys(compInstanceDef)) {
      const ddef = compInstanceDef[instName];
      if (ddef && normalizeForMatch(String(ddef)) === normalizeForMatch(root)) { candidates.push(instName); continue; }
      const short = String(instName).split('.').pop(); if (short && normalizeForMatch(short) === normalizeForMatch(root)) { candidates.push(instName); continue; }
      if (normalizeForMatch(instName) === normalizeForMatch(root)) { candidates.push(instName); continue; }
    }
    if (candidates.length === 0) {
      for (const instName of Object.keys(compInstanceDef)) {
        const ddef = compInstanceDef[instName] || '';
        if (normalizeForMatch(String(ddef)).indexOf(normalizeForMatch(root)) !== -1) { candidates.push(instName); }
      }
    }
    if (candidates.length === 0) candidates.push(...Object.keys(compInstanceDef));

    for (const cand of candidates) {
      const portsSet = collectPortsForQualifiedComponent(cand) || new Set();
      let matched = [];
      if (params && params.length) matched = findMatchingPortsForParams(params, portsSet) || [];
      if ((!matched || matched.length === 0) && portsSet && portsSet.size) matched = [Array.from(portsSet)[0]];
      const basicActions = activityActionsMap[an] || [];
      const enriched = basicActions.map(a => { const ddef = actionDefMap[a.name] || {}; return { name: a.name, executable: a.executable, params: ddef.params || [], body: ddef.body || null }; });
      // if no matched inputPorts but action params exist, use them
      let finalInputs = matched || [];
      if ((!finalInputs || finalInputs.length === 0) && enriched && enriched.length) {
        for (const ea of enriched) { if (ea.params && ea.params.length) { finalInputs = ea.params.slice(); break; } }
      }
      activitiesToRegister.push({ activityName: an, descriptor: { component: cand, inputPorts: finalInputs || [], actions: enriched } });
    }
  }

  // prefer using the Model name declared in the SysADL file (if present)
  let declaredModelName = null;
  traverse(ast, n => {
    if (!n || typeof n !== 'object') return;
    if ((n.type === 'Model' || /Model/i.test(n.type)) && (n.name || (n.id && n.id.name))) {
      declaredModelName = n.name || (n.id && n.id.name) || declaredModelName;
    }
  });
  const outModelName = declaredModelName || path.basename(input, path.extname(input));
  // debug: show normalized connector descriptors
  try { console.error('[DBG] connectorDescriptors:', Array.isArray(connectorDescriptors)?connectorDescriptors.length:0, JSON.stringify((connectorDescriptors||[]).slice(0,5).map(d=>({name:d.name, participants:(d.participants||[]).length})))) } catch(e){}
  // determine hierarchical parents: components with 'configuration' are containers (attach children to them)
  const parentMap = {}; // instanceName -> parent expression (e.g. 'this.FactoryAutomationSystem')
  const rootDefs = [];
  try {
    // heuristic: find top-level ComponentUse that refers to FactoryAutomationSystem or components that have 'configuration'
    for (const cu of compUses) {
      try {
        const def = cu.definition || null;
        if (!def) continue;
        // if the definition node has a configuration under compDefMap, treat it as a composite
        const defNode = compDefMap[def] || compDefMap[String(def)];
        if (defNode) {
          const hasCfg = (function(){ let f=false; traverse(defNode, n=>{ if (n && (n.type === 'Configuration' || /Configuration/i.test(n.type))) f=true; }); return f; })();
          if (hasCfg) {
            // if instance name equals FactoryAutomationSystem or type is FactoryAutomationSystem, consider it root
            if (String(def).indexOf('FactoryAutomationSystem') !== -1 || (cu.name && String(cu.name).indexOf('FactoryAutomationSystem') !== -1)) rootDefs.push(def);
          }
        }
      } catch(e){}
    }
    // fallback: if no rootDefs found, try to pick FactoryAutomationSystem by name from compDefs
    if (!rootDefs.length && compDefMap['FactoryAutomationSystem']) rootDefs.push('FactoryAutomationSystem');

    // if FactoryAutomationSystem def exists, attach its declared component names to be children of that root
    try {
      if (compDefMap['FactoryAutomationSystem']) {
        const fasNode = compDefMap['FactoryAutomationSystem'];
        const inner = extractConfigurations(fasNode) || [];
        if (inner.length) {
          traverse(inner[0], n => {
            if (!n || typeof n !== 'object') return;
            if (n.type === 'ComponentUse' || /ComponentUse/i.test(n.type)) {
              const child = n.name || (n.id && n.id.name) || null;
              if (child) parentMap[child] = `this.FactoryAutomationSystem`;
            }
          });
        }
      }
    } catch(e){}

    // Build parentLocal map: childInstanceName -> parentInstanceName, only from explicit ComponentUse nodes
    const parentLocal = {};
    for (const cu of compUses) {
      const instName = cu && (cu.name || (cu.id && cu.id.name) || cu.id) ? (cu.name || (cu.id && cu.id.name) || cu.id) : null;
      const def = cu.definition || null;
      if (!instName || !def) continue;
      const defNode = compDefMap[def] || compDefMap[String(def)];
      if (!defNode) continue;
      const innerCfgs = extractConfigurations(defNode) || [];
      if (!innerCfgs.length) continue;
      const cfgNode = innerCfgs[0];
      // look for explicit ComponentUse nodes inside the configuration
      traverse(cfgNode, n => {
        if (!n || typeof n !== 'object') return;
        if (n.type === 'ComponentUse' || /ComponentUse/i.test(n.type)) {
          const childName = n.name || (n.id && n.id.name) || null;
          if (!childName) return;
          parentLocal[childName] = instName;
        }
      });
    }

    // compute full parent path mapping: instanceName -> 'this.<ancestor>.<parent>' or 'this.<parent>' if top-level
    function getFullParentPath(inst) {
      const visited = new Set();
      function rec(name) {
        if (!name) return null;
        if (visited.has(name)) return `this.${name}`;
        visited.add(name);
        const p = parentLocal[name];
        if (!p) return `this.${name}`;
        const parentPath = rec(p) || `this.${p}`;
        return `${parentPath}.${name}`;
      }
      return rec(inst);
    }

    // merge any existing parentMap entries (e.g. from FactoryAutomationSystem discovery) into parentLocal
    for (const k of Object.keys(parentMap)) {
      try {
        const v = parentMap[k];
        if (typeof v === 'string' && v.indexOf('this.') === 0) {
          const last = v.split('.').pop(); if (last) parentLocal[k] = last;
        }
      } catch(e){}
    }

    for (const child of Object.keys(parentLocal)) {
      const full = getFullParentPath(parentLocal[child]) || `this.${parentLocal[child]}`;
      parentMap[child] = full;
    }
  } catch(e) { /* ignore heuristic build errors */ }

  try { console.error('[DBG] rootDefs:', JSON.stringify(rootDefs || [])); } catch(e){}
  try { console.error('[DBG] parentMap:', JSON.stringify(parentMap || {})); } catch(e){}
  const moduleCode = generateClassModule(outModelName, compUses, portUses, connectorDescriptors, executables, activitiesToRegister, rootDefs, parentMap, compInstanceDef);
  const outFile = path.join(outDir, path.basename(input, path.extname(input)) + '.js');
  fs.writeFileSync(outFile, moduleCode, 'utf8');
  console.log('Generated', outFile);
}

main().catch(e => { console.error(e); process.exit(1); });

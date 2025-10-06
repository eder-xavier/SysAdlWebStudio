// transformer.js — Browser-friendly UMD + Node-safe guards
// Goal: expose `window.Transformer` in browsers with the helpers that app.js expects:
// - extractConfigurations(ast)   -> Array<Config>
// - collectComponentUses(conf)   -> Array<{name, ports[]}>
// - collectPortUses(conf)        -> Array<{component, port}>
// - generateClassModule(name, ... , ast) -> string (CommonJS code exporting a model factory function)
//
// In Node, we keep a minimal CLI behind feature-detection, without breaking the browser.

(function (global) {
  'use strict';

  // --- Small utilities ---
  function traverse(node, cb) {
    if (!node || typeof node !== 'object') return;
    cb && cb(node);
    for (const k in node) {
      const v = node[k];
      if (Array.isArray(v)) v.forEach(it => traverse(it, cb));
      else if (v && typeof v === 'object') traverse(v, cb);
    }
  }

  // Extract a single configuration from the AST (components, ports, connectors + bindings)
  function extractConfiguration(ast) {
    const config = { components: {}, connectors: {} };

    // Collect ComponentUse and the PortUse names mentioned under each component subtree
    const componentNodes = [];
    traverse(ast, n => { if (n && n.type === 'ComponentUse') componentNodes.push(n); });

    for (const c of componentNodes) {
      const name = c.name || (c.id && c.id.name) || c.id || 'comp';
      if (!config.components[name]) config.components[name] = { name, ports: [] };
      const seen = new Set(config.components[name].ports);
      (function findPorts(n){
        if (!n || typeof n !== 'object') return;
        if (n.type === 'PortUse') {
          const p = n.name || (n.id && n.id.name) || n.id;
          if (p && !seen.has(String(p))) { seen.add(String(p)); config.components[name].ports.push(String(p)); }
        }
        for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(findPorts); else if (v && typeof v === 'object') findPorts(v); }
      })(c);
    }

    // Collect ConnectorUse + ConnectorBinding (source -> destination)
    traverse(ast, n => {
      if (!n || typeof n !== 'object') return;
      if (n.type === 'ConnectorUse') {
        const name = n.name || (n.id && n.id.name) || n.id || 'connector';
        if (!config.connectors[name]) config.connectors[name] = { name, bindings: [] };
        if (n.definition) config.connectors[name].definition = n.definition;
        const bl = n.bindingList || n.bindings || n.connects || [];
        if (Array.isArray(bl)) {
          for (const b of bl) {
            if (!b) continue;
            const src = (b.source && (b.source.name || b.source.id || b.source)) || b.src || b.from;
            const dst = (b.destination && (b.destination.name || b.destination.id || b.destination)) || b.dst || b.to;
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

    // Heuristic: ensure ports referenced as component.port inside bindings exist in the component list
    const ensureCompPort = (comp, port) => {
      if (!config.components[comp]) config.components[comp] = { name: comp, ports: [] };
      if (!config.components[comp].ports.includes(port)) config.components[comp].ports.push(port);
    };
    for (const conn of Object.values(config.connectors)) {
      for (const b of conn.bindings || []) {
        const s = String(b.source||''); const d = String(b.destination||'');
        if (s.includes('.')) { const [c,p] = s.split('.'); ensureCompPort(c,p); }
        if (d.includes('.')) { const [c,p] = d.split('.'); ensureCompPort(c,p); }
      }
    }

    return config;
  }

  // API expected by app.js
  function extractConfigurations(ast) {
    return [extractConfiguration(ast)];
  }

  function collectComponentUses(conf) {
    const out = [];
    if (!conf || !conf.components) return out;
    for (const [name, def] of Object.entries(conf.components)) {
      out.push({ name, ports: Array.from(def.ports || []) });
    }
    return out;
  }

  function collectPortUses(conf) {
    const out = [];
    if (!conf || !conf.components) return out;
    for (const [name, def] of Object.entries(conf.components)) {
      for (const p of (def.ports || [])) out.push({ component: name, port: String(p) });
    }
    return out;
  }

  // Generate a CommonJS module that ONLY requires('SysADLBase')
  
function generateClassModule(modelName, compUses, portUses, connectorBindings, executables, activitiesToRegister, rootDefs, parentMap, compInstanceDef, compDefMap, portDefMap, embeddedTypes, connectorDefMap, packageMap, ast) {
  const config = extractConfiguration(ast || {});
  const lines = [];
  const esc = (s) => JSON.stringify(String(s));
  const id = (s) => String(s).replace(/[^A-Za-z0-9_]/g, '_');

  lines.push("const { Model, Component, Port, SimplePort, CompositePort, Connector, Activity, Action, Enum, Int, Boolean, String, Real, Void, valueType, dataType, dimension, unit, Constraint, Executable } = require('SysADLBase');");
  lines.push("");

  const portDir = {};
  const markDir = (k, kind) => { const prev = portDir[k]; portDir[k] = prev && prev !== kind ? 'both' : (prev || kind); };
  const sanitize = id;

  const splitToken = (tok) => {
    if (typeof tok !== 'string') tok = String(tok||'');
    if (!tok) return {comp:null, port:null};
    if (tok.includes('.')) { const [c,p] = tok.split('.'); return {comp:c, port:p}; }
    return {comp:null, port:tok};
  };

  for (const ck of Object.keys(config.connectors || {})) {
    const conn = config.connectors[ck];
    for (const b of (conn.bindings || [])) {
      const s = splitToken(String(b.source||''));
      const d = splitToken(String(b.destination||''));
      if (s.comp && s.port) markDir(`${s.comp}.${s.port}`, 'out');
      if (d.comp && d.port) markDir(`${d.comp}.${d.port}`, 'in');
    }
  }

  const aliasToComp = {};
  for (const [cn, cdef] of Object.entries(config.components || {})) {
    for (const p of (cdef.ports || [])) {
      (aliasToComp[p] ||= new Set()).add(cn);
    }
  }
  const aliasUnique = {};
  for (const [p, comps] of Object.entries(aliasToComp)) {
    if (comps.size === 1) aliasUnique[p] = Array.from(comps)[0];
  }
  for (const ck of Object.keys(config.connectors || {})) {
    const conn = config.connectors[ck];
    for (const b of (conn.bindings || [])) {
      const s = splitToken(String(b.source||''));
      const d = splitToken(String(b.destination||''));
      if (!s.comp && s.port && aliasUnique[s.port]) markDir(`${aliasUnique[s.port]}.${s.port}`, 'out');
      if (!d.comp && d.port && aliasUnique[d.port]) markDir(`${aliasUnique[d.port]}.${d.port}`, 'in');
    }
  }

  const portClasses = {};
  for (const [cn, cdef] of Object.entries(config.components || {})) {
    const ports = Array.from(new Set(cdef.ports||[]));
    for (const p of ports) {
      const key = `${cn}.${p}`;
      const dir = portDir[key] === 'out' ? 'out' : 'in';
      const cls = `PT_${id(modelName||'Model')}_${id(cn)}_${id(p)}_${dir === 'out' ? 'OPT' : 'IPT'}`;
      portClasses[key] = cls;
      lines.push(`class ${cls} extends SimplePort {`);
      lines.push(`  constructor(name, opts = {}) {`);
      lines.push(`    super(name, ${esc(dir)}, { ...{ expectedType: "Real" }, ...opts });`);
      lines.push(`  }`);
      lines.push(`}`);
    }
  }

  const compClassName = {};
  for (const cn of Object.keys(config.components || {})) {
    const cls = `CP_${id(modelName||'Model')}_${id(cn)}`;
    compClassName[cn] = cls;
    lines.push(`class ${cls} extends Component {`);
    lines.push(`  constructor(name, opts = {}) {`);
    lines.push(`    super(name, opts);`);
    const ports = Array.from(new Set(config.components[cn].ports||[]));
    for (const p of ports) {
      const key = `${cn}.${p}`;
      const clsPort = portClasses[key];
      lines.push(`    this.addPort(new ${clsPort}(${esc(p)}, { owner: name }));`);
    }
    lines.push(`  }`);
    lines.push(`}`);
  }

  const connClassName = {};
  for (const ck of Object.keys(config.connectors || {})) {
    const cls = `CN_${id(modelName||'Model')}_${id(ck)}`;
    connClassName[ck] = cls;
    lines.push(`class ${cls} extends Connector {`);
    lines.push(`  constructor(name, opts = {}) {`);
    lines.push(`    super(name, { ...opts });`);
    lines.push(`  }`);
    lines.push(`}`);
  }

  const sysModel = `SysADLModel_${id(modelName||'Model')}`;
  lines.push(`class ${sysModel} extends Model {`);
  lines.push(`  constructor(){`);
  lines.push(`    super(${esc(modelName||'Model')});`);

  for (const cn of Object.keys(config.components || {})) {
    const cls = compClassName[cn];
    lines.push(`    this.${id(cn)} = new ${cls}(${esc(cn)});`);
    lines.push(`    this.addComponent(this.${id(cn)});`);
  }

  for (const ck of Object.keys(config.connectors || {})) {
    const ccls = connClassName[ck];
    lines.push(`    this.addConnector(new ${ccls}(${esc(ck)}));`);
    lines.push(`    const ${id('conn_'+ck)} = this.connectors[${esc(ck)}];`);
    for (const b of (config.connectors[ck].bindings || [])) {
      const s = splitToken(String(b.source||''));
      const d = splitToken(String(b.destination||''));
      let sComp = s.comp, sPort = s.port, dComp = d.comp, dPort = d.port;
      if (!sComp && sPort && aliasUnique[sPort]) sComp = aliasUnique[sPort];
      if (!dComp && dPort && aliasUnique[dPort]) dComp = aliasUnique[dPort];
      if (sComp && sPort && dComp && dPort) {
        lines.push(`    ${id('conn_'+ck)}.bind(this.${id(sComp)}.getPort(${esc(sPort)}), this.${id(dComp)}.getPort(${esc(dPort)}));`);
      }
    }
  }
  lines.push(`  }`);
  lines.push(`}`);

  lines.push(`function createModel(){`);
  lines.push(`  const model = new ${sysModel}();`);
  lines.push(`  model._moduleContext = {`);
  const expose = [];
  for (const cls of Object.values(portClasses)) expose.push(cls);
  for (const cls of Object.values(connClassName)) expose.push(cls);
  for (const cls of Object.values(compClassName)) expose.push(cls);
  lines.push(`    ${expose.join(', ')}`);
  lines.push(`  };`);
  lines.push(`  return model;`);
  lines.push(`}`);
  lines.push(`module.exports = { createModel: createModel, ${sysModel}, ...model?{}:{} };`);

  return lines.join('\n');
}

  // Build the public API object
  const API = {
    extractConfigurations,
    collectComponentUses,
    collectPortUses,
    generateClassModule
  };

  // Attach to browser global
  if (typeof window !== 'undefined') {
    global.Transformer = API; // window.Transformer
  }

  // --- Minimal Node CLI preserved, but guarded so it never runs in the browser ---
  if (typeof process !== 'undefined' && typeof module !== 'undefined' && require && module && module.exports && !global.window) {
    // Optional: export API for Node require
    module.exports = API;

    // Very small CLI: transform a .sysadl file (expects parser at ./sysadl-parser.js ESM)
    if (require.main === module) {
      (async function () {
        try {
          const fs = require('fs');
          const path = require('path');
          const { pathToFileURL } = require('url');
          const inPath = process.argv[2];
          const outPath = process.argv[3] || (inPath ? inPath.replace(/\.sysadl$/i, '.js') : null);
          if (!inPath || !outPath) {
            console.error('Usage: node transformer.js <input.sysadl> <output.js>');
            process.exit(2);
          }
          const parserUrl = pathToFileURL(path.resolve(__dirname, 'sysadl-parser.js')).href;
          const mod = await import(parserUrl);
          const parse = mod && typeof mod.parse === 'function' ? mod.parse : null;
          if (!parse) throw new Error('sysadl-parser.js must export `parse`');
          const src = fs.readFileSync(inPath, 'utf8');
          const ast = parse(src, { grammarSource: { source: inPath, text: src } });
          const js = generateClassModule(path.basename(inPath, path.extname(inPath)), [], [], [], [], [], [], {}, {}, {}, {}, {}, {}, {}, ast);
          fs.writeFileSync(outPath, js, 'utf8');
          console.log('Written:', outPath);
        } catch (e) {
          console.error('Transform error:', e && e.stack || String(e));
          process.exit(1);
        }
      })();
    }
  }

})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));

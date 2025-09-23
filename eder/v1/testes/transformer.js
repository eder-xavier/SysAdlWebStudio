
// Minimal browser-first Transformer
// Exposes small helpers and a pragmatic generateClassModule that works without Node/CommonJS.
// Tries to extract components from the *source* using regex as a fallback.

(function (root) {
  'use strict';

  function traverse(node, cb) {
    try { cb(node); } catch (e) {}
    if (!node || typeof node !== 'object') return;
    for (const k in node) {
      const v = node[k];
      if (Array.isArray(v)) for (const it of v) traverse(it, cb);
      else if (v && typeof v === 'object') traverse(v, cb);
    }
  }

  function extractConfigurations(ast) {
    const out = [];
    traverse(ast, n => {
      if (!n || typeof n !== 'object') return;
      const t = (n.type || n.kind || '').toString().toLowerCase();
      if (t === 'configuration') out.push(n);
    });
    return out;
  }

  function collectComponentUses(conf) {
    const uses = [];
    traverse(conf, n => {
      if (!n || typeof n !== 'object') return;
      const t = (n.type || n.kind || '').toString().toLowerCase();
      if (t === 'componentuse' || (t === 'declaration' && n.category === 'component')) {
        uses.push(n);
      }
      // fallback: { type:'ComponentDecl', name:'X', definition:{name:'Y'} }
      if (t.includes('component') && n.name && n.definition) uses.push(n);
    });
    return uses;
  }

  function collectPortUses(_conf) { return []; }

  function sanitizeId(s) { return String(s||'').replace(/[^A-Za-z0-9_]/g, '_'); }

  function parseComponentsFromSource(source) {
    if (!source) return [];
    // matches: "component <Type> <name>;" inside configuration
    const re = /\bcomponent\s+([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*;/g;
    const comps = [];
    let m;
    while ((m = re.exec(source))) {
      comps.push({ def: m[1], name: m[2] });
    }
    return comps;
  }

  // Generate a CommonJS-like module as a string; the runtime mapping is provided by the caller.
  function generateClassModule(modelName /* ...many rest */, /*conf...*/ ) {
    const args = Array.prototype.slice.call(arguments);
    const src = args[args.length - 1];      // ast
    const source = args[args.length - 0];   // some callers may pass source after ast; tolerate both
    const srcStr = typeof source === 'string' ? source : '';

    // Try to extract components
    let comps = parseComponentsFromSource(srcStr);
    if (!comps.length) {
      // fallback: try to peek into AST very loosely
      const list = [];
      traverse(src, n => {
        if (!n || typeof n !== 'object') return;
        const t = (n.type || n.kind || '').toString().toLowerCase();
        if (t.includes('component') && n.name) {
          const def = (n.definition && (n.definition.name || n.definition.id)) || n.def || n.typeName || 'Component';
          list.push({ def: String(def), name: String(n.name || n.id) });
        }
      });
      comps = list;
    }

    if (!comps.length) {
      // always make at least one component so the simulator has something
      comps = [{ def: 'Component', name: 'main' }];
    }

    const mId = sanitizeId(modelName || 'ModelFromUI');
    const lines = [];
    lines.push(`// Generated ad-hoc from SysADL (browser) — minimal runtime wiring`);
    lines.push(`const Sys = require('./SysADLBase');`);
    lines.push(`function createModel(){`);
    lines.push(`  const model = new Sys.Model('${mId}');`);
    lines.push(`  // components inferred (best-effort)`);
    for (const c of comps) {
      const cn = sanitizeId(c.name);
      lines.push(`  const ${cn} = new Sys.Component('${cn}');`);
      lines.push(`  model.addComponent(${cn});`);
    }
    lines.push(`  return model;`);
    lines.push(`}`);
    lines.push(`module.exports = { createModel };`);
    return lines.join('\n');
  }

  const api = {
    traverse,
    extractConfigurations,
    collectComponentUses,
    collectPortUses,
    sanitizeId,
    generateClassModule,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Transformer = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

async function loadParser() {
  const url = pathToFileURL(path.join(__dirname,'..','sysadl-parser.js')).href;
  const mod = await import(url);
  return mod.parse;
}

async function run() {
  const parse = await loadParser();
  const src = fs.readFileSync(path.join(__dirname,'..','Simple.sysadl'),'utf8');
  const ast = parse(src, { grammarSource: { source: 'Simple.sysadl', text: src } });
  function traverse(n,cb){ if(!n||typeof n!=='object') return; cb(n); for(const k of Object.keys(n)){ const v=n[k]; if(Array.isArray(v)) v.forEach(it=>traverse(it,cb)); else traverse(v,cb); } }
  const comps = [];
  traverse(ast, n=>{ if(n && n.type === 'ComponentUse') comps.push(n); });
  console.log('Found ComponentUse nodes:', comps.length);
  for(const c of comps){ console.log(JSON.stringify({ name: c.name || c.id || null, definition: c.definition || c.def || null, ports: (c.ports || c.using || null) }, null, 2)); }
}
run().catch(e=>{ console.error(e); process.exit(1); });

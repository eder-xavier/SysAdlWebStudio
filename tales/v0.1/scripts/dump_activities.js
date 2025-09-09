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
  const activities = [];
  traverse(ast, n=>{ if(n && n.type === 'ActivityDef') activities.push(n); });
  console.log('Found activities:', activities.length);
  for(const a of activities){ console.log('--- Activity ---'); console.log(JSON.stringify({ name: a.name||a.id, params: a.params||null, location: a.location? a.location.start: null }, null, 2)); traverse(a, x=>{ if(x && x.type && x.type.toLowerCase().includes('action')) console.log(' action node:', JSON.stringify(x, null, 2)); }); }
}
run().catch(e=>{ console.error(e); process.exit(1); });

#!/usr/bin/env node
const fs = require('fs');
const { pathToFileURL } = require('url');
(async ()=>{
  const parserPath = require('path').join(__dirname,'..','sysadl-parser.js');
  const mod = await import(pathToFileURL(parserPath).href);
  const parse = mod.parse;
  const src = fs.readFileSync(require('path').join(__dirname,'..','Simple.sysadl'),'utf8');
  const ast = parse(src, { grammarSource: { source: 'Simple.sysadl', text: src } });
  function traverse(n, cb, path=[]) { if(!n||typeof n!=='object') return; cb(n,path); for(const k of Object.keys(n)){ const v=n[k]; if(Array.isArray(v)) v.forEach((it,i)=>traverse(it,cb,path.concat(k+"["+i+"]"))); else traverse(v,cb,path.concat(k)); } }
  const allocs = [];
  traverse(ast,(n,path)=>{ if(n && (n.type==='Allocation' || n.type==='allocations' || n.type==='AllocationItem' || n.type==='Allocations')) allocs.push({node:n,path}); });
  if(allocs.length===0){ console.log('no allocations found'); process.exit(0); }
  for(const a of allocs){ console.log('--- Allocation node at', JSON.stringify(a.path)); console.log(JSON.stringify(a.node, (k,v)=>{ if(k==='location') return undefined; return v; }, 2).slice(0,2000)); }
})();

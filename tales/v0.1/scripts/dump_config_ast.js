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

  const configs = [];
  traverse(ast,(n,path)=>{
    if(n && n.type === 'Configuration') configs.push({ path, node: n });
  });

  if(configs.length===0){ console.error('No Configuration nodes found'); process.exit(1); }
  // print the first configuration node and a compact map of its keys/types
  const cfg = configs[0].node;
  const summary = {};
  for(const k of Object.keys(cfg)){
    const v = cfg[k];
    summary[k] = Array.isArray(v) ? `Array(${v.length})` : (v && typeof v==='object' ? Object.keys(v).slice(0,5) : typeof v);
  }
  console.log('CONFIG_PATH:', JSON.stringify(configs[0].path));
  console.log('CONFIG_SUMMARY:', JSON.stringify(summary, null, 2));
  // print full config node (limited)
  console.log('CONFIG_NODE_SNIPPET:', JSON.stringify(cfg, (k,v)=>{ if(k==='location') return undefined; return v; }, 2).slice(0,2000));
})();

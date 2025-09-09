#!/usr/bin/env node
const fs = require('fs');
const { pathToFileURL } = require('url');
(async ()=>{
  const parserPath = require('path').join(__dirname,'..','sysadl-parser.js');
  const mod = await import(pathToFileURL(parserPath).href);
  const parse = mod.parse;
  const src = fs.readFileSync(require('path').join(__dirname,'..','Simple.sysadl'),'utf8');
  const ast = parse(src, { grammarSource: { source: 'Simple.sysadl', text: src } });
  const counts = {};
  function traverse(n){ if(!n||typeof n!=='object') return; if(n.type) counts[n.type]=(counts[n.type]||0)+1; for(const k of Object.keys(n)){ const v=n[k]; if(Array.isArray(v)) v.forEach(it=>traverse(it)); else traverse(v); } }
  traverse(ast);
  const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  console.log('Top node types:');
  entries.slice(0,80).forEach(([t,c])=>console.log(t, c));
  // print top-level keys on AST root
  console.log('\nTop-level AST keys:', Object.keys(ast));
  if(ast.allocations) console.log('\nAST.allocations:', JSON.stringify(ast.allocations, null, 2).slice(0,1000));
})();

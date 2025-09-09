#!/usr/bin/env node
const fs = require('fs');
const { pathToFileURL } = require('url');
(async ()=>{
  const parserPath = require('path').join(__dirname,'..','sysadl-parser.js');
  const mod = await import(pathToFileURL(parserPath).href);
  const parse = mod.parse;
  const src = fs.readFileSync(require('path').join(__dirname,'..','Simple.sysadl'),'utf8');
  const ast = parse(src, { grammarSource: { source: 'Simple.sysadl', text: src } });

  function traverse(n, cb, path=[]) { if(!n||typeof n!=='object') return; cb(n,path); for(const k of Object.keys(n)){ const v=n[k]; if(Array.isArray(v)){ v.forEach((it,i)=>traverse(it,cb,path.concat(k+"["+i+"]"))); } else traverse(v,cb,path.concat(k)); } }

  const interesting = [];
  traverse(ast,(n,path)=>{
    if(!n||!n.type) return;
    if(['Configuration','ComponentUse','ConnectorUse','ConnectorBinding','PortUse','ComponentDef'].includes(n.type)) {
      interesting.push({ path, type: n.type, snippet: n });
    }
  });

  // print compact JSON
  console.log(JSON.stringify(interesting, null, 2));
})();

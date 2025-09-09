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

  const connectors = [];
  traverse(ast,(n,path)=>{ if(n && n.type === 'ConnectorDef') connectors.push({node:n, path}); });
  if(connectors.length===0){ console.log('no connector defs'); process.exit(0);} 
  for(const c of connectors){
    console.log('--- ConnectorDef at', JSON.stringify(c.path));
    const n = c.node;
    const name = n.name || n.id || n.definition || 'unknown';
    console.log('name:', name);
    // try to extract participants
    const parts = [];
    function findParts(x){ if(!x||typeof x!=='object') return; if(x.type==='Participant' || x.type==='ParticipantDecl' || x.type==='ParticipantItem') { parts.push(x); }
      for(const k of Object.keys(x)){ const v=x[k]; if(Array.isArray(v)) v.forEach(it=>findParts(it)); else findParts(v); }
    }
    findParts(n);
    console.log('participant raw count:', parts.length);
    const parsed = parts.map(p=>({ raw: p, name: p.name||p.id||p.participant||undefined, type: p.definition||p.participantType||undefined }));
    console.log('participants:', JSON.stringify(parsed, null, 2));
  }
})();

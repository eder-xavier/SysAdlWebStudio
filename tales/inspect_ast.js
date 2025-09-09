const fs = require('fs');
const { pathToFileURL } = require('url');
(async ()=>{
  const parserPath = require('path').join(__dirname, 'sysadl-parser.js');
  const mod = await import(pathToFileURL(parserPath).href);
  const parse = mod.parse;
  const src = fs.readFileSync(require('path').join(__dirname,'Simple.sysadl'),'utf8');
  const ast = parse(src, { grammarSource: { source: 'Simple.sysadl', text: src } });
  function traverse(n, cb) { if(!n||typeof n!=='object') return; cb(n); for(const k of Object.keys(n)){const v=n[k]; if(Array.isArray(v)){v.forEach(it=>traverse(it,cb))} else traverse(v,cb);} }
  const nodes = [];
  traverse(ast, n=>{
    if(!n || !n.type) return;
    if(['ConnectorUse','ConnectorBinding','PortUse','ComponentUse','ComponentDef'].includes(n.type)) nodes.push(n);
  });
  console.log(JSON.stringify(nodes, null, 2));
})();

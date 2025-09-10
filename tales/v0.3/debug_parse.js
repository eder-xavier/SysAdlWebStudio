(async ()=>{
  const path = require('path');
  const { pathToFileURL } = require('url');
  const fs = require('fs');
  const parserPath = path.join(__dirname, '..', 'sysadl-parser.js');
  const url = pathToFileURL(parserPath).href;
  const mod = await import(url);
  const parse = mod.parse;
  const src = fs.readFileSync(path.resolve(process.cwd(), 'AGV.sysadl'), 'utf8');
  const ast = parse(src, { grammarSource: { source: 'AGV.sysadl', text: src } });
  function traverse(n, cb){ if(!n||typeof n!=='object') return; cb(n); for(const k of Object.keys(n)){ const v=n[k]; if(Array.isArray(v)) v.forEach(x=>traverse(x,cb)); else if(v&&typeof v==='object') traverse(v,cb); }}
  console.log('--- ComponentDef summary ---');
  traverse(ast, n=>{
    if(n && (n.type==='ComponentDef' || /ComponentDef/i.test(n.type))){
      console.log('ComponentDef:', n.name || (n.id&&n.id.name) || '\n', 'keys=', Object.keys(n));
      if(n.configuration) console.log('  has configuration');
      if(n.ports) console.log('  ports array length=', Array.isArray(n.ports)?n.ports.length:'?');
      if(n.members) console.log('  members array length=', Array.isArray(n.members)?n.members.length:'?');
      if(n.configuration && n.configuration.connectors) console.log('  configuration.connectors.length=', n.configuration.connectors.length);
      // inspect inner configuration nodes for ports
      if(n.configuration){
        traverse(n.configuration, x=>{
          if(!x||typeof x!=='object') return;
          if(x.type && /Port/i.test(x.type)){
            console.log('   inner port node type=', x.type, 'name=', x.name|| (x.id&&x.id.name)||JSON.stringify(x));
          }
          if(x.ports && Array.isArray(x.ports)){
            console.log('   inner ports container', x.name||'(anon)', 'children=', x.ports.map(p=>p.name||(p.id&&p.id.name)||JSON.stringify(p)));
          }
          if(x.participants && Array.isArray(x.participants)){
            console.log('   inner participants', x.participants.map(p=>p.name||(p.id&&p.id.name)||JSON.stringify(p)));
          }
          if(x.bindings && Array.isArray(x.bindings)){
            console.log('   inner bindings', x.bindings.map(b=> JSON.stringify(b)));
          }
        });
      }
    }
  });
  console.log('--- Top-level connector bindings summary ---');
  traverse(ast, n=>{ if(n && (n.type==='ConnectorBinding' || /ConnectorBinding/i.test(n.type) || n.bindings)){ if(n.connectors) console.log('ConnectorBinding has connectors:', n.connectors.map(c=>c.name)); console.log(' node keys=', Object.keys(n)); }});
})();

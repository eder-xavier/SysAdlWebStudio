const fs = require('fs');
const { pathToFileURL } = require('url');

(async () => {
  const parserPath = require('path').join(__dirname, 'sysadl-parser.js');
  const mod = await import(pathToFileURL(parserPath).href);
  const parse = mod.parse;
  
  const src = fs.readFileSync(require('path').join(__dirname, 'AGV-completo.sysadl'), 'utf8');
  const ast = parse(src, { grammarSource: { source: 'AGV-completo.sysadl', text: src } });
  
  function traverse(n, cb) { 
    if (!n || typeof n !== 'object') return; 
    cb(n); 
    for (const k of Object.keys(n)) {
      const v = n[k]; 
      if (Array.isArray(v)) {
        v.forEach(it => traverse(it, cb));
      } else {
        traverse(v, cb);
      }
    } 
  }
  
  // Find the first EventDef to examine its structure
  let eventDefFound = false;
  traverse(ast, n => {
    if (!eventDefFound && n && n.type === 'EventDef') {
      console.log('Full EventDef structure:');
      console.log(JSON.stringify(n, null, 2));
      eventDefFound = true;
    }
  });
})();
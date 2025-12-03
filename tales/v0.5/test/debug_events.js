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
  
  const eventNodes = [];
  traverse(ast, n => {
    if (!n || !n.type) return;
    // Capture EventsDefinitions and related event nodes
    if (n.type === 'EventsDefinitions' || 
        n.type === 'EventDef' || 
        n.type === 'Event' ||
        (n.type && n.type.includes('Event'))) {
      eventNodes.push({
        type: n.type,
        name: n.name,
        id: n.id,
        structure: JSON.stringify(n, null, 2).substring(0, 500) + '...'
      });
    }
  });
  
  console.log('Event-related nodes found:', eventNodes.length);
  eventNodes.forEach((node, index) => {
    console.log(`\n--- Node ${index + 1} ---`);
    console.log('Type:', node.type);
    console.log('Name:', node.name);
    console.log('ID:', node.id);
    console.log('Structure preview:', node.structure);
  });
})();
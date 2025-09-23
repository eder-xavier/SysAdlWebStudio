(async()=> {
  const fs = require('fs');
  const { pathToFileURL } = require('url');
  const parserPath = pathToFileURL('tales/sysadl-parser.js').href;
  const mod = await import(parserPath);
  if (!mod || typeof mod.parse !== 'function') throw new Error('Parser did not export parse');
  const parse = mod.parse;
  const src = fs.readFileSync('AGV.sysadl','utf8');
  const ast = parse(src, { grammarSource: { source: 'AGV.sysadl', text: src } });
  function traverse(node, cb) { if (!node || typeof node !== 'object') return; cb(node); for (const k of Object.keys(node)) { const v = node[k]; if (Array.isArray(v)) v.forEach(item => traverse(item, cb)); else if (v && typeof v === 'object') traverse(v, cb); } }
  const portDefs = [];
  traverse(ast, n => { if (!n || typeof n !== 'object') return; if (n.type === 'PortDef' || /PortDef/i.test(n.type) || (n.type && /port\s+def/i.test(String(n.type)))) portDefs.push(n); });
  const map = {};
  for (const p of portDefs) {
    const nm = p.name || (p.id && p.id.name) || p.id || '(anon)';
    map[nm] = { keys: Object.keys(p||{}), flow: p.flow, flowType: p.flowType, flowProperties: p.flowProperties, direction: p.direction, value: p.value };
  }
  console.log(JSON.stringify(map, null, 2));
})();

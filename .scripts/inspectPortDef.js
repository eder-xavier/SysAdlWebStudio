import { pathToFileURL } from 'url';
import fs from 'fs';
const parser = await import(pathToFileURL('./tales/sysadl-parser.js').href);
const parse = parser.parse;
const src = fs.readFileSync('./AGV.sysadl','utf8');
const ast = parse(src, { grammarSource: { source: 'AGV.sysadl', text: src } });
function traverse(node, cb){ if(!node||typeof node!=='object') return; cb(node); for(const k of Object.keys(node)){ const v=node[k]; if(Array.isArray(v)) v.forEach(item=>traverse(item,cb)); else if(v&&typeof v==='object') traverse(v,cb); } }
const portDefMap={};
traverse(ast, n=>{ if(n && (n.type==='PortDef' || /PortDef/i.test(n.type) || (n.type && /port\s+def/i.test(String(n.type))))) { const nm = n.name || (n.id && n.id.name) || n.id || null; if(nm) portDefMap[nm]=n; } });
const key = process.argv[2] || 'outCommandToArm';
console.log(JSON.stringify(portDefMap[key], null, 2));

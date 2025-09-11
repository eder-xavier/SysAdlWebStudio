import { pathToFileURL } from 'url';
import fs from 'fs';
const parser = await import(pathToFileURL('./tales/sysadl-parser.js').href);
const parse = parser.parse;
const src = fs.readFileSync('./AGV.sysadl','utf8');
const ast = parse(src, { grammarSource: { source: 'AGV.sysadl', text: src } });
function traverse(node, cb){ if(!node||typeof node!=='object') return; cb(node); for(const k of Object.keys(node)){ const v=node[k]; if(Array.isArray(v)) v.forEach(item=>traverse(item,cb)); else if(v&&typeof v==='object') traverse(v,cb); } }
const compDefMap = {};
traverse(ast, n => { if (n && (n.type === 'ComponentDef' || /ComponentDef/i.test(n.type))) { const nm = n.name || (n.id && n.id.name) || n.id || null; if (nm) compDefMap[nm] = n; } });
const def = compDefMap[process.argv[2] || 'AGVSystem'];
console.log(JSON.stringify(def && (def.ports||def.members||def.configuration) , null, 2));

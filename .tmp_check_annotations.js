(async()=>{
  const fs = require('fs'); const { pathToFileURL } = require('url');
  const parserPath = pathToFileURL('tales/sysadl-parser.js').href; const mod = await import(parserPath); const parse = mod.parse;
  const src = fs.readFileSync('AGV.sysadl','utf8'); const ast = parse(src, { grammarSource: { source: 'AGV.sysadl', text: src } });
  function traverse(node, cb){ if (!node || typeof node !== 'object') return; cb(node); for (const k of Object.keys(node)){ const v=node[k]; if (Array.isArray(v)) v.forEach(item=>traverse(item,cb)); else if (v && typeof v==='object') traverse(v,cb); }}
  const compDefMap = {}; traverse(ast, n => { if (n && (n.type === 'ComponentDef' || /ComponentDef/i.test(n.type))) { const nm = n.name || (n.id && n.id.name) || n.id || null; if (nm) compDefMap[nm] = n; } });
  const portDefMap = {}; traverse(ast, n => { if (n && (n.type === 'PortDef' || /PortDef/i.test(n.type) || (n.type && /port\s+def/i.test(String(n.type))))) { const nm = n.name || (n.id && n.id.name) || n.id || null; if (nm) portDefMap[nm] = n; } });
  const compUses = []; traverse(ast, n => { if (n && (n.type === 'ComponentUse' || /ComponentUse/i.test(n.type))) { const nm = n.name || (n.id && n.id.name) || n.id || null; if (nm) compUses.push({name:nm, node:n}); } });
  const portUses = []; traverse(ast, n => { if (!n || typeof n !== 'object') return; if (n.type === 'PortUse' || /PortUse/i.test(n.type) || (n.name && n.flow)) portUses.push(n); });
  // attach parents
  (function attach(r){ function rec(n,p){ if (!n||typeof n!=='object') return; try{ Object.defineProperty(n,'__parent',{value:p,enumerable:false,writable:true}); }catch(e){} for(const k of Object.keys(n)){ if(k==='__parent') continue; const v=n[k]; if (v===p) continue; if (Array.isArray(v)) v.forEach(it=>rec(it,n)); else if (v && typeof v==='object') rec(v,n); }} rec(r,null); })(ast);
  // build compInstanceDef map
  const compInstanceDef={}; for (const cu of compUses){ const iname = cu && cu.name ? cu.name : null; if (iname){ const ddef = cu && (cu.definition || cu.def || (cu.sysadlType && cu.sysadlType.name)) || null; compInstanceDef[iname]=ddef; }}
  // collect portUses similarly to transformer minimal
  traverse(ast, n => {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'PortUse' || /PortUse/i.test(n.type) || (n.name && n.flow)) {
      // try find enclosing component use name
      let cur=n; let owner=null; while(cur){ if (cur.type && /ComponentUse/i.test(cur.type)){ owner = cur.name || (cur.id && cur.id.name) || cur.id || null; break;} cur = cur.__parent; }
      if (!owner) {
        // fallback: try nearest ancestor ComponentDef's first child
        cur = n; while(cur){ if (cur.type && /ComponentDef/i.test(cur.type)){ owner = null; break;} cur = cur.__parent; }
      }
      const pname = n.name || (n.id && n.id.name) || n.id || null;
      portUses.push(Object.assign({}, n, { _ownerComponent: owner, name: pname }));
    }
  });
  // now annotation pass
  for (const pu of portUses){ try{
    if (!pu || !pu.name) continue; const owner = pu._ownerComponent || pu.owner || null; if (!owner) continue;
    let tname = null; if (pu.definition){ if (typeof pu.definition === 'string') tname = pu.definition; else if (pu.definition.name) tname = pu.definition.name; else if (pu.definition.id && pu.definition.id.name) tname = pu.definition.id.name; }
    if (!tname) tname = pu.type || pu.portType || (pu._type && pu._type.name) || pu.value || null;
    if (!tname){ const defName = compInstanceDef[owner] || null; if (defName && compDefMap[defName]){ const defNode = compDefMap[defName]; const portsList = (defNode.ports && Array.isArray(defNode.ports)) ? defNode.ports : (defNode.configuration && defNode.configuration.ports && Array.isArray(defNode.configuration.ports) ? defNode.configuration.ports : defNode.members && Array.isArray(defNode.members) ? defNode.members : []);
        for (const pd of (portsList||[])){
          const pn = pd && (pd.name || (pd.id && pd.id.name) || pd.id) ? (pd.name || (pd.id && pd.id.name) || pd.id) : null; if (!pn) continue; if (String(pn) === String(pu.name)){
            if (pd.definition){ if (typeof pd.definition === 'string') tname = pd.definition; else if (pd.definition.name) tname = pd.definition.name; }
            if (!tname) tname = pd.type || pd.portType || null;
            break;
          }
        }
      }
    }
    if (tname && portDefMap && (portDefMap[tname] || portDefMap[String(tname)])){
      const resolved = portDefMap[tname] || portDefMap[String(tname)]; pu._portDefName = String(tname); pu._portDefNode = resolved;
    }
  }catch(e){}
  }
  // print portUses for StartMoving
  const startPortUses = portUses.filter(p => p._ownerComponent === 'sm');
  console.log('StartMoving portUses annotated:');
  for (const p of startPortUses) console.log(p.name, 'owner=',p._ownerComponent, '_portDefName=',p._portDefName ? p._portDefName : '(none)');
})();

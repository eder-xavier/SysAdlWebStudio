// parser_fixed.js
// @ts-nocheck
// Parser robusto para SysADL — extrai model, types, ports, components, connectors,
// actions, activities, executables, constraints, allocations, delegations, bindings.
// Expondo window.parseSysADL(modelText)

(function(){
function trim(s){ return (s||'').replace(/\r\n/g,'\n').replace(/\t/g,' ').replace(/\n\s*\n/g,'\n').trim(); }
function extractBlock(str, startIdx){
    if(startIdx === -1 || str[startIdx] !== '{') return '';
    let depth = 1, i = startIdx + 1;
    while(i < str.length && depth > 0){
        if(str[i] === '{') depth++;
        else if(str[i] === '}') depth--;
        i++;
    }
    return str.substring(startIdx+1, i-1);
}
function splitTopLevel(s, sep){
    // split by sep at top level (not inside braces or parentheses)
    const res = [];
    let cur = '', depth = 0;
    for(let i=0;i<s.length;i++){
        const ch = s[i];
        if(ch === '{' || ch === '(') depth++;
        if(ch === '}' || ch === ')') depth--;
        if(depth === 0 && s.substring(i, i+sep.length) === sep){
            res.push(cur);
            cur = '';
            i += sep.length-1;
            continue;
        }
        cur += ch;
    }
    if(cur.trim() !== '') res.push(cur);
    return res;
}
function parseParamsList(raw){
    if(!raw) return [];
    return raw.split(',').map(p=>{
        p = p.trim();
        if(!p) return null;
        const parts = p.split(':').map(x=>x.trim());
        if(parts.length === 2) return { name: parts[0], type: parts[1] };
        return null;
    }).filter(Boolean);
}
function parseConfiguration(cfgText){
    const cfg = { subComponents: [], connectors: [], bindings: [], delegations: [] };
    if(!cfgText) return cfg;
    // normalize
    cfgText = trim(cfgText);

    // Subcomponents: "name : Type { ... }" or "name : Type"
    const subRegex = /([\w\-\_]+)\s*:\s*([\w\.\-]+)(?:\s*{([\s\S]*?)}\s*)?/g;
    let m;
    while((m = subRegex.exec(cfgText)) !== null){
        const name = m[1].trim(), type = m[2].trim(), block = (m[3]||'').trim();
        const sub = { name, type, portAliases: [] };
        if(block){
            const portsMatch = block.match(/using\s+ports\s*:\s*([\s\S]*?)(?=(\}|$))/i);
            if(portsMatch){
                portsMatch[1].split(';').map(x=>x.trim()).filter(Boolean).forEach(pair=>{
                    const parts = pair.split(':').map(z=>z.trim());
                    if(parts.length>=2) sub.portAliases.push({ alias: parts[0], type: parts[1] });
                });
            }
        }
        cfg.subComponents.push(sub);
    }

    // Connectors: look for "name : Type" inside connectors area OR generic "name : Type"
    const connectorsSection = (cfgText.match(/connectors\s*:\s*([\s\S]*?)(?=(components|bindings|delegations|$))/i) || [])[1];
    if(connectorsSection){
        connectorsSection.split(';').map(x=>x.trim()).filter(Boolean).forEach(part=>{
            const mm = part.match(/^([\w\-\_]+)\s*:\s*([\w\.\-]+)/);
            if(mm) cfg.connectors.push({ name: mm[1].trim(), type: mm[2].trim() });
        });
    } else {
        // fallback simple pairs
        cfgText.split(';').map(x=>x.trim()).filter(Boolean).forEach(part=>{
            const mm = part.match(/^([\w\-\_]+)\s*:\s*([\w\.\-]+)/);
            if(mm) cfg.connectors.push({ name:mm[1].trim(), type:mm[2].trim() });
        });
    }

    // bindings: "src.port = tgt.port via connector"
    const bindRegex = /([\w\-\_]+\.[\w\-\_]+)\s*=\s*([\w\-\_]+\.[\w\-\_]+)\s+via\s+([\w\-\_]+)/g;
    while((m = bindRegex.exec(cfgText)) !== null){
        cfg.bindings.push({ source: m[1].trim(), target: m[2].trim(), connector: m[3].trim() });
    }

    // delegations: "a.port to b.port"
    const delRegex = /([\w\-\_]+\.[\w\-\_]+)\s+to\s+([\w\-\_]+\.[\w\-\_]+)/g;
    while((m = delRegex.exec(cfgText)) !== null){
        cfg.delegations.push({ source: m[1].trim(), target: m[2].trim() });
    }

    return cfg;
}

function parseSysADL(text){
    const model = {
        name: 'SysADLModel',
        types: [],
        ports: [],
        components: [],
        connectors: [],
        activities: [],
        actions: [],
        executables: [],
        constraints: [],
        allocations: []
    };
    if(!text || typeof text !== 'string') return model;
    text = trim(text);

    const modelMatch = text.match(/Model\s+([\w\-\_]+)\s*;/i) || text.match(/model\s+([\w\-\_]+)\s*;/i);
    if(modelMatch) model.name = modelMatch[1];

    // Normalize remove single-line comments (//) but keep other content
    const cleaned = text.replace(/\/\/[^\n]*/g,'').replace(/\/\*[\s\S]*?\*\//g,'');

    // Top-level def regex
    const defRegex = /((?:boundary\s+)?component|port|connector|activity|action|executable|constraint|value\s+type)\s+def\s+([\w\-\_]+)(?:\s*\(([^)]*)\))?(?:\s*\(([^)]*)\))?\s*{/gmi;
    let defMatch;
    while((defMatch = defRegex.exec(cleaned)) !== null){
        const rawType = defMatch[1].toLowerCase();
        const kind = rawType.replace('boundary ','').trim();
        const name = defMatch[2];
        const inParamsRaw = defMatch[3] || '';
        const outParamsRaw = defMatch[4] || '';
        const startIdx = cleaned.indexOf('{', defMatch.index);
        const block = extractBlock(cleaned, startIdx).trim();

        if(kind === 'value type'){
            model.types.push({ name, raw: block });
            continue;
        }
        if(kind === 'port'){
            // capture flows
            const port = { name, flows: [] };
            const flowRegex = /flow\s+(in|out|inout)\s+([\w\.\-:]+)/gi;
            let fm;
            while((fm=flowRegex.exec(block))!==null){
                port.flows.push({ direction: fm[1], type: fm[2] });
            }
            model.ports.push(port);
            continue;
        }
        if(kind === 'component'){
            const comp = { name, isBoundary: rawType.indexOf('boundary')!==-1, ports: [], configuration: null };
            // ports: ... ; (up to configuration or end)
            const portsMatch = block.match(/ports\s*:\s*([\s\S]*?)(?=(configuration\s*:|configuration\s*{|\Z))/i);
            if(portsMatch){
                const rawPorts = portsMatch[1];
                rawPorts.split(';').map(x=>x.trim()).filter(Boolean).forEach(p=>{
                    const parts = p.split(':').map(z=>z.trim());
                    if(parts.length === 2) comp.ports.push({ name: parts[0], type: parts[1] });
                });
            }
            // configuration
            const cfgMatch = block.match(/configuration\s*{([\s\S]*?)}\s*$/i) || block.match(/configuration\s*:\s*{([\s\S]*?)}\s*$/i);
            if(cfgMatch) comp.configuration = parseConfiguration(cfgMatch[1]);
            model.components.push(comp);
            continue;
        }
        if(kind === 'connector'){
            const conn = { name, participants: [], flows: [], configuration: null, raw: block };
            const partSec = (block.match(/participants\s*:\s*([\s\S]*?)(?=(flows\s*:|configuration\s*:|$))/i)||[])[1];
            if(partSec){
                partSec.split(';').map(x=>x.trim()).filter(Boolean).forEach(p=>{
                    const parts = p.split(':').map(z=>z.trim());
                    if(parts.length === 2) conn.participants.push({ name: parts[0].replace(/^~/,''), type: parts[1] });
                });
            }
            const flowsSec = (block.match(/flows\s*:\s*([\s\S]*?)(?=(configuration\s*:|$))/i)||[])[1];
            if(flowsSec){
                flowsSec.split(';').map(x=>x.trim()).filter(Boolean).forEach(f=>{
                    const fm = f.match(/([\w\.\-:]+)\s+from\s+([\w\.\-:]+)\s+to\s+([\w\.\-:]+)/i);
                    if(fm) conn.flows.push({ type: fm[1], from: fm[2], to: fm[3] });
                });
            }
            const connCfg = block.match(/configuration\s*{([\s\S]*?)}/i);
            if(connCfg) conn.configuration = parseConfiguration(connCfg[1]);
            model.connectors.push(conn);
            continue;
        }
        if(kind === 'activity'){
            const act = { name, inParameters: parseParamsList(inParamsRaw), outParameters: parseParamsList(outParamsRaw), actions: [], delegates: [], raw: block };
            // parse actions inside activity block: "actions : id : ActionName { using pins: ... } , ..."
            const actionsSection = (block.match(/actions\s*:\s*([\s\S]*?)(?=(delegate\s+|$))/i)||[])[1];
            if(actionsSection){
                // actionsSection may contain "id : Name { using pins : ... }" or "id : Name"
                const items = splitTopLevel(actionsSection, ',');
                items.map(x=>x.trim()).filter(Boolean).forEach(a=>{
                    const mm = a.match(/([\w\-\_]+)\s*:\s*([\w\-\_]+)(?:\s*{([\s\S]*?)})?/);
                    if(mm){
                        const id = mm[1].trim(), actionName = mm[2].trim(), block2 = (mm[3]||'').trim();
                        const actionEntry = { id, name: actionName, pins: [] };
                        if(block2){
                            const pinsMatch = block2.match(/using\s+pins\s*:\s*([\s\S]*?)(?=(\}|$))/i);
                            if(pinsMatch){
                                pinsMatch[1].split(';').map(x=>x.trim()).filter(Boolean).forEach(pair=>{
                                    const parts = pair.split(':').map(z=>z.trim());
                                    if(parts.length === 2) actionEntry.pins.push({ name: parts[0], type: parts[1] });
                                });
                            }
                        }
                        act.actions.push(actionEntry);
                    }
                });
            }
            // delegates
            const delRegex = /delegate\s+([\w\-\_]+)\s+to\s+([\w\-\_]+)/g;
            let dm;
            while((dm=delRegex.exec(block))!==null) act.delegates.push({ source: dm[1], target: dm[2] });
            model.activities.push(act);
            continue;
        }
        if(kind === 'action'){
            // actions can also be top-level like "action def FN(...) : Type { constraint : post-condition X }"
            const action = { name, inParameters: parseParamsList(inParamsRaw), outParameters: parseParamsList(outParamsRaw), constraint: null, raw: block };
            const consMatch = block.match(/constraint\s*:\s*post-condition\s+([\w\-\_]+)/i);
            if(consMatch) action.constraint = consMatch[1];
            model.actions.push(action);
            continue;
        }
        if(kind === 'executable'){
            // body is block content
            const exec = { name, inParameters: parseParamsList(inParamsRaw), outParameters: parseParamsList(outParamsRaw), body: block.trim() };
            model.executables.push(exec);
            continue;
        }
        if(kind === 'constraint'){
            // try to extract equation=...
            let equation = '';
            const eqm = block.match(/equation\s*=\s*([\s\S]*?);?$/i);
            if(eqm) equation = eqm[1].trim();
            else equation = block.trim();
            const cons = { name, inParameters: parseParamsList(inParamsRaw), outParameters: parseParamsList(outParamsRaw), equation: equation };
            model.constraints.push(cons);
            continue;
        }
    } // end defs loop

    // allocations block
    const allocMatch = cleaned.match(/allocations\s*{([\s\S]*?)}\s*/i);
    if(allocMatch){
        const allocText = allocMatch[1];
        allocText.split(/[\n;]+/).map(x=>x.trim()).filter(Boolean).forEach(line=>{
            const m = line.match(/^(\w+)\s+([\w\-\_\.]+)\s+to\s+([\w\-\_\.]+)/i);
            if(m) model.allocations.push({ type: m[1], source: m[2], target: m[3] });
        });
    }

    return model;
}

if(typeof window !== 'undefined') window.parseSysADL = parseSysADL;
if(typeof module !== 'undefined') module.exports = { parseSysADL };

})();

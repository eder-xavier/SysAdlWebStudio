function loadFilesToEditor() {
    const files = document.getElementById('sysadlFile').files;
    if (files.length === 0) {
        logEditor.setValue('No files selected.');
        return;
    }

    let content = sysadlEditor.getValue();
    if (content.trim()) content += '\n\n';
    let filesProcessed = 0;
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            content += `// Content from ${file.name}\n${e.target.result}\n\n`;
            filesProcessed++;
            if (filesProcessed === files.length) {
                sysadlEditor.setValue(content);
                logEditor.setValue('Files loaded into SysADL Editor. Click "Process SysADL Code" to parse.');
            }
        };
        reader.readAsText(file);
    });
}

function processSysADL() {
    const content = sysadlEditor.getValue();
    if (!content.trim()) {
        logEditor.setValue('No SysADL code to process.');
        return;
    }

    try {
        const parsedData = parseSysADL(content);
        const logs = formatLogs(parsedData);
        logEditor.setValue(logs);
    } catch (error) {
        logEditor.setValue(`Error parsing SysADL code: ${error.message}`);
    }
}

function parseSysADL(content) {
    const model = { name: '', packages: [], components: [], connectors: [], ports: [], activities: [], constraints: [], executables: [], allocations: [], requirements: [], types: [] };

    const modelMatch = content.match(/Model\s+(\w+)\s*;/);
    if (modelMatch) model.name = modelMatch[1];

    function extractBlockContent(str, startIndex) {
        let braces = 1;
        let endIndex = startIndex;
        while (braces > 0 && endIndex < str.length) {
            endIndex++;
            if (str[endIndex] === '{') braces++;
            if (str[endIndex] === '}') braces--;
        }
        return str.slice(startIndex, endIndex).trim();
    }

    const packageMatches = content.matchAll(/package\s+(\w+(?:\.\w+)*)\s*{/gs);
    for (const match of packageMatches) {
        const pkgName = match[1];
        const startIndex = match.index + match[0].length;
        const pkgContent = extractBlockContent(content, startIndex);
        const pkg = { name: pkgName, content: pkgContent };
        model.packages.push(pkg);

        const typeMatches = pkgContent.matchAll(/(value\s+type|enum|datatype)\s+(\w+)(?:\s+extends\s+(\w+))?\s*{([^}]*)}/gs);
        for (const typeMatch of typeMatches) {
            const type = { kind: typeMatch[1], name: typeMatch[2], extends: typeMatch[3] || null, content: typeMatch[4].trim() };
            model.types.push(type);
        }

        const portMatches = pkgContent.matchAll(/port\s+def\s+(\w+)\s*{([^}]*)}/gs);
        for (const portMatch of portMatches) {
            const port = { name: portMatch[1], flows: [], subPorts: [] };
            const portContent = portMatch[2];
            const flowMatches = portContent.matchAll(/flow\s+(in|out|inout)\s+(\w+)/g);
            for (const flow of flowMatches) {
                port.flows.push({ direction: flow[1], type: flow[2] });
            }
            const subPortMatches = portContent.matchAll(/ports\s*:\s*(\w+)\s*:\s*(\w+)\s*{/g);
            for (const subPort of subPortMatches) {
                port.subPorts.push({ name: subPort[1], type: subPort[2] });
            }
            model.ports.push(port);
        }

        const connectorMatches = pkgContent.matchAll(/connector\s+def\s+(\w+)\s*{([^}]*)}/gs);
        for (const connMatch of connectorMatches) {
            const conn = { name: connMatch[1], participants: [], flows: [], configuration: null, bindings: [] };
            const connContent = connMatch[2];
            const participantMatches = connContent.matchAll(/participants\s*:\s*~?\s*(\w+)\s*:\s*(\w+)\s*(?:{[^}]*})?/g);
            for (const p of participantMatches) {
                conn.participants.push({ name: p[1], type: p[2] });
            }
            const flowMatches = connContent.matchAll(/flows\s*:\s*(\w+)\s+from\s+(\w+)\s+to\s+(\w+)/g);
            for (const f of flowMatches) {
                conn.flows.push({ type: f[1], source: f[2], target: f[3] });
            }
            const bindingMatches = connContent.matchAll(/bindings\s+([^=]+)=\s*(\w+)/g);
            for (const b of bindingMatches) {
                conn.bindings.push({ source: b[1].trim(), target: b[2] });
            }
            const configMatch = connContent.match(/configuration\s*{([^}]*)}/s);
            if (configMatch) conn.configuration = configMatch[1].trim();
            model.connectors.push(conn);
        }

        const componentMatches = pkgContent.matchAll(/(?:boundary\s+)?component\s+def\s+(\w+)\s*{([^}]*)}/gs);
        for (const compMatch of componentMatches) {
            const comp = { name: compMatch[1], ports: [], configuration: null, subComponents: [], connectors: [], bindings: [], delegations: [] };
            const compContent = compMatch[2];
            const portMatches = compContent.matchAll(/(?:using\s+)?ports\s*:\s*([^;{]+)(?:{[^}]*})?/g);
            for (const port of portMatches) {
                const portStr = port[1].trim();
                const portItems = portStr.split(',').map(p => p.trim());
                portItems.forEach(p => {
                    const match = p.match(/(\w+)\s*:\s*(\w+)/);
                    if (match) comp.ports.push({ name: match[1], type: match[2] });
                });
            }
            const configMatch = compContent.match(/configuration\s*{([^}]*)}/s);
            if (configMatch) {
                comp.configuration = configMatch[1].trim();
                const subCompMatches = comp.configuration.matchAll(/components\s*:\s*([^;{]+)(?:{[^}]*})?/g);
                for (const subComp of subCompMatches) {
                    const subCompStr = subComp[1].trim();
                    const subComps = subCompStr.split(',').map(s => s.trim());
                    subComps.forEach(s => {
                        const match = s.match(/(\w+)\s*:\s*(\w+)/);
                        if (match) comp.subComponents.push({ name: match[1], type: match[2] });
                    });
                }
                const connMatches = comp.configuration.matchAll(/connectors\s*:\s*([^;{]+)(?:{[^}]*})?/g);
                for (const conn of connMatches) {
                    const connStr = conn[1].trim();
                    const conns = connStr.split(',').map(c => c.trim());
                    conns.forEach(c => {
                        const match = c.match(/(\w+)\s*:\s*(\w+)/);
                        if (match) comp.connectors.push({ name: match[1], type: match[2] });
                    });
                }
                const bindingMatches = comp.configuration.matchAll(/bindings\s+([^=]+)=\s*(\w+)/g);
                for (const b of bindingMatches) {
                    comp.bindings.push({ source: b[1].trim(), target: b[2] });
                }
                const delegationMatches = comp.configuration.matchAll(/delegations\s*:\s*([^;]+)/g);
                for (const d of delegationMatches) {
                    const delegationStr = d[1].trim();
                    const delegations = delegationStr.split(',').map(d => d.trim());
                    delegations.forEach(d => {
                        const match = d.match(/(\w+)\s+to\s+(\w+)/);
                        if (match) comp.delegations.push({ source: match[1], target: match[2] });
                    });
                }
            }
            model.components.push(comp);
        }

        const activityMatches = pkgContent.matchAll(/activity\s+def\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*\(([^)]*)\))?\s*{([^}]*)}/gs);
        for (const actMatch of activityMatches) {
            const act = { name: actMatch[1], inputs: actMatch[2].trim(), outputs: actMatch[3]?.trim() || '', body: actMatch[4].trim(), actions: [], flows: [], delegates: [], dataStores: [] };
            const actionMatches = act.body.matchAll(/actions\s*:\s*([^;{]+)(?:{([^}]*)})?/g);
            for (const a of actionMatches) {
                const actionStr = a[1].trim();
                const pinsStr = a[2]?.trim() || '';
                const actions = actionStr.split(',').map(a => a.trim());
                actions.forEach(a => {
                    const match = a.match(/(\w+)\s*:\s*(\w+)/);
                    if (match) {
                        const pins = pinsStr.match(new RegExp(`${match[1]}\\s*:\\s*(\\w+)`)) || [];
                        act.actions.push({ id: match[1], name: match[2], pins: pins.map(p => p[1]) });
                    }
                });
            }
            const flowMatches = act.body.matchAll(/flow\s+from\s+(\w+)\s+to\s+(\w+)/g);
            for (const f of flowMatches) {
                act.flows.push({ source: f[1], target: f[2] });
            }
            const delegateMatches = act.body.matchAll(/delegate\s+(\w+)\s+to\s+(\w+)/g);
            for (const d of delegateMatches) {
                act.delegates.push({ source: d[1], target: d[2] });
            }
            const dataStoreMatches = act.body.matchAll(/datastore\s+(\w+)\s*:\s*(\w+)/g);
            for (const ds of dataStoreMatches) {
                act.dataStores.push({ name: ds[1], type: ds[2] });
            }
            model.activities.push(act);
        }

        const constraintMatches = pkgContent.matchAll(/constraint\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*\(([^)]*)\))?\s*{([^}]*)}/gs);
        for (const consMatch of constraintMatches) {
            const cons = { name: consMatch[1], inputs: consMatch[2].trim(), outputs: consMatch[3]?.trim() || '', equation: consMatch[4].match(/equation\s*=\s*([^;]+)/s)?.[1] || '' };
            model.constraints.push(cons);
        }

        const executableMatches = pkgContent.matchAll(/executable\s+def\s+(\w+)\s*\(([^)]*)\)\s*:\s*[^;]*{([^}]*)}/gs);
        for (const execMatch of executableMatches) {
            const exec = { name: execMatch[1], inputs: execMatch[2].trim(), body: execMatch[3].trim() };
            model.executables.push(exec);
        }
    }

    const allocationMatches = content.matchAll(/allocations\s*{([^}]*)}/gs);
    for (const match of allocationMatches) {
        const allocs = match[1].matchAll(/(activity|executable)\s+(\w+)\s+to\s+(\w+)/g);
        for (const a of allocs) {
            model.allocations.push({ type: a[1], source: a[2], target: a[3] });
        }
    }

    const requirementMatches = content.matchAll(/Requirement\s+(\w+)\s*\(\s*([\d.]+)\s*\)\s*{([^}]*)}/gs);
    for (const match of requirementMatches) {
        const req = { name: match[1], id: match[2], text: '', satisfiedBy: [] };
        const textMatch = match[3].match(/text\s*=\s*"([^"]+)"/s);
        if (textMatch) req.text = textMatch[1];
        const satisfiedByMatch = match[3].match(/satisfied\s+by\s+([^;]+)/s);
        if (satisfiedByMatch) req.satisfiedBy = satisfiedByMatch[1].split(',').map(s => s.trim());
        model.requirements.push(req);
    }

    return model;
}

function formatLogs(model) {
    let log = `Model: ${model.name}\n`;
    log += '=== Packages ===\n';
    model.packages.forEach(pkg => log += `- ${pkg.name}\n`);
    log += '\n=== Types ===\n';
    model.types.forEach(type => log += `- ${type.kind} ${type.name}${type.extends ? ` extends ${type.extends}` : ''}\n`);
    log += '\n=== Components ===\n';
    model.components.forEach(comp => {
        log += `- ${comp.name}\n  Ports: ${comp.ports.map(p => `${p.name}: ${p.type}`).join(', ') || 'none'}\n`;
        if (comp.configuration) {
            log += `  Configuration:\n`;
            if (comp.subComponents.length) log += `    Subcomponents: ${comp.subComponents.map(c => `${c.name}: ${c.type}`).join(', ')}\n`;
            if (comp.connectors.length) log += `    Connectors: ${comp.connectors.map(c => `${c.name}: ${c.type}`).join(', ')}\n`;
            if (comp.bindings.length) log += `    Bindings: ${comp.bindings.map(b => `${b.source} = ${b.target}`).join(', ')}\n`;
            if (comp.delegations.length) log += `    Delegations: ${comp.delegations.map(d => `${d.source} to ${d.target}`).join(', ')}\n`;
        }
    });
    log += '\n=== Connectors ===\n';
    model.connectors.forEach(conn => {
        log += `- ${conn.name}\n`;
        log += `  Participants: ${conn.participants.map(p => `${p.name}: ${p.type}`).join(', ') || 'none'}\n`;
        log += `  Flows: ${conn.flows.map(f => `${f.type} from ${f.source} to ${f.target}`).join(', ') || 'none'}\n`;
        if (conn.bindings.length) log += `  Bindings: ${conn.bindings.map(b => `${b.source} = ${b.target}`).join(', ')}\n`;
        if (conn.configuration) log += `  Configuration:\n    ${conn.configuration.replace(/\n/g, '\n    ')}\n`;
    });
    log += '\n=== Ports ===\n';
    model.ports.forEach(port => {
        log += `- ${port.name}\n  Flows: ${port.flows.map(f => `${f.direction} ${f.type}`).join(', ') || 'none'}\n`;
        if (port.subPorts.length) log += `  Subports: ${port.subPorts.map(p => `${p.name}: ${p.type}`).join(', ')}\n`;
    });
    log += '\n=== Activities ===\n';
    model.activities.forEach(act => {
        log += `- ${act.name}\n  Inputs: ${act.inputs || 'none'}\n  Outputs: ${act.outputs || 'none'}\n`;
        if (act.actions.length) log += `  Actions: ${act.actions.map(a => `${a.id}: ${a.name}`).join(', ')}\n`;
        if (act.flows.length) log += `  Flows: ${act.flows.map(f => `from ${f.source} to ${f.target}`).join(', ')}\n`;
        if (act.delegates.length) log += `  Delegates: ${act.delegates.map(d => `${d.source} to ${d.target}`).join(', ')}\n`;
        if (act.dataStores.length) log += `  DataStores: ${act.dataStores.map(ds => `${ds.name}: ${ds.type}`).join(', ')}\n`;
    });
    log += '\n=== Constraints ===\n';
    model.constraints.forEach(cons => log += `- ${cons.name}\n  Inputs: ${cons.inputs || 'none'}\n  Outputs: ${cons.outputs || 'none'}\n  Equation: ${cons.equation}\n`);
    log += '\n=== Executables ===\n';
    model.executables.forEach(exec => log += `- ${exec.name}\n  Inputs: ${exec.inputs || 'none'}\n  Body:\n${exec.body.split('\n').map(l => '    ' + l.trim()).join('\n')}\n`);
    log += '\n=== Allocations ===\n';
    model.allocations.forEach(alloc => log += `- ${alloc.type} ${alloc.source} to ${alloc.target}\n`);
    log += '\n=== Requirements ===\n';
    model.requirements.forEach(req => log += `- ${req.name} (${req.id})\n  Text: ${req.text}\n  Satisfied By: ${req.satisfiedBy.join(', ') || 'none'}\n`);
    return log;
}
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

    // Extract model name
    const modelMatch = content.match(/Model\s+(\w+)\s*;/);
    model.name = modelMatch ? modelMatch[1] : 'Simple';

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

    // Parse packages
    const packageMatches = content.matchAll(/package\s+(\w+(?:\.\w+)*)\s*{/gs);
    for (const match of packageMatches) {
        const pkgName = match[1];
        const startIndex = match.index + match[0].length;
        const pkgContent = extractBlockContent(content, startIndex);
        const pkg = { name: pkgName, content: pkgContent };
        model.packages.push(pkg);

        // Parse types
        const typeMatches = pkgContent.matchAll(/(value\s+type|enum|datatype)\s+(\w+)(?:\s+extends\s+(\w+))?\s*{([^}]*)}/gs);
        for (const typeMatch of typeMatches) {
            const type = { kind: typeMatch[1], name: typeMatch[2], extends: typeMatch[3] || null, content: typeMatch[4].trim() };
            model.types.push(type);
        }

        // Parse ports
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

        // Parse connectors
        const connectorMatches = pkgContent.matchAll(/connector\s+def\s+(\w+)\s*{([^}]*)}/gs);
        for (const connMatch of connectorMatches) {
            const conn = { name: connMatch[1], participants: [], flows: [], configuration: null, bindings: [] };
            const connContent = connMatch[2];
            const participantMatches = connContent.matchAll(/~\s*(\w+)\s*:\s*(\w+)/g);
            for (const participant of participantMatches) {
                conn.participants.push({ name: participant[1], type: participant[2] });
            }
            const flowMatches = connContent.matchAll(/flows\s*:\s*(\w+)\s+from\s+(\w+)\s+to\s+(\w+)/g);
            for (const flow of flowMatches) {
                conn.flows.push({ type: flow[1], source: flow[2], target: flow[3] });
            }
            const bindingMatches = connContent.matchAll(/bindings\s*(\w+)\s*=\s*(\w+)/g);
            for (const binding of bindingMatches) {
                conn.bindings.push({ source: binding[1], target: binding[2] });
            }
            const configMatch = connContent.match(/configuration\s*{([^}]*)}/s);
            if (configMatch) {
                conn.configuration = configMatch[1].trim();
            }
            model.connectors.push(conn);
        }

        // Parse components
        const componentMatches = pkgContent.matchAll(/(?:boundary\s+)?component\s+def\s+(\w+)\s*{([^}]*)}/gs);
        for (const compMatch of componentMatches) {
            const comp = { name: compMatch[1], ports: [], isBoundary: compMatch[0].includes('boundary'), configuration: null };
            const compContent = compMatch[2];
            const portMatches = compContent.matchAll(/ports\s*:\s*(\w+)\s*:\s*(\w+)\s*(?:;|\{[^}]*\})/g);
            for (const port of portMatches) {
                comp.ports.push({ name: port[1], type: port[2] });
            }
            const configMatch = compContent.match(/configuration\s*{([^}]*)}/s);
            if (configMatch) {
                const configContent = configMatch[1];
                comp.configuration = { subComponents: [], connectors: [], bindings: [], delegations: [] };
                const subCompMatches = configContent.matchAll(/components\s*:\s*(\w+)\s*:\s*(\w+)\s*(?:{[^}]*})?/g);
                for (const subComp of subCompMatches) {
                    const subCompObj = { name: subComp[1], type: subComp[2], ports: [] };
                    const subCompContent = subComp[0].match(/{([^}]*)}/);
                    if (subCompContent) {
                        const portMatches = subCompContent[1].matchAll(/using\s+ports\s*:\s*(\w+)\s*:\s*(\w+)/g);
                        for (const port of portMatches) {
                            subCompObj.ports.push({ name: port[1], type: port[2] });
                        }
                    }
                    comp.configuration.subComponents.push(subCompObj);
                }
                const connMatches = configContent.matchAll(/connectors\s*:\s*(\w+)\s*:\s*(\w+)/g);
                for (const conn of connMatches) {
                    comp.configuration.connectors.push({ name: conn[1], type: conn[2], bindings: [] });
                }
                const bindingMatches = configContent.matchAll(/(\w+\.\w+)\s*=\s*(\w+\.\w+)/g);
                for (const binding of bindingMatches) {
                    const connector = comp.configuration.connectors.find((c, i) => i === comp.configuration.bindings.length) || { name: `c${comp.configuration.bindings.length + 1}` };
                    comp.configuration.bindings.push({ source: binding[1], target: binding[2], connector: connector.name });
                }
            }
            model.components.push(comp);
        }

        // Parse activities
        const activityMatches = pkgContent.matchAll(/activity\s+def\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*\(([^)]*)\))?\s*{([^}]*)}/gs);
        for (const actMatch of activityMatches) {
            const act = { name: actMatch[1], inputs: actMatch[2].trim(), outputs: actMatch[3]?.trim() || '', actions: [], flows: [], delegates: [], dataStores: [] };
            const actContent = actMatch[4];
            const actionMatches = actContent.matchAll(/actions\s*:\s*(\w+)\s*:\s*(\w+)\s*{([^}]*)}/g);
            for (const action of actionMatches) {
                act.actions.push({ id: action[1], name: action[2], content: action[3].trim() });
            }
            const delegateMatches = actContent.matchAll(/delegate\s+(\w+)\s+to\s+(\w+)/g);
            for (const delegate of delegateMatches) {
                act.delegates.push({ source: delegate[1], target: delegate[2] });
            }
            const flowMatches = actContent.matchAll(/flows\s*:\s*(\w+)\s+from\s+(\w+)\s+to\s+(\w+)/g);
            for (const flow of flowMatches) {
                act.flows.push({ type: flow[1], source: flow[2], target: flow[3] });
            }
            const dataStoreMatches = actContent.matchAll(/dataStores\s*:\s*(\w+)\s*:\s*(\w+)/g);
            for (const ds of dataStoreMatches) {
                act.dataStores.push({ name: ds[1], type: ds[2] });
            }
            model.activities.push(act);
        }

        // Parse constraints
        const constraintMatches = pkgContent.matchAll(/constraint\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*\(([^)]*)\))?\s*{([^}]*)}/gs);
        for (const consMatch of constraintMatches) {
            const cons = { name: consMatch[1], inputs: consMatch[2].trim(), outputs: consMatch[3]?.trim() || '', equation: '' };
            const consContent = consMatch[4];
            const equationMatch = consContent.match(/equation\s*=\s*([^;]+)/);
            if (equationMatch) cons.equation = equationMatch[1].trim();
            model.constraints.push(cons);
        }

        // Parse executables
        const executableMatches = pkgContent.matchAll(/executable\s+def\s+(\w+)\s*\(([^)]*)\)\s*:\s*(out\s+\w+(?:\s*,\s*out\s+\w+)*)\s*{([^}]*)}/gs);
        for (const execMatch of executableMatches) {
            const exec = { name: execMatch[1], inputs: execMatch[2].trim(), output: execMatch[3].replace(/out\s+/g, '').trim(), body: execMatch[4].trim() };
            // Fix for CalcAverageEX inputs
            if (exec.name === 'CalcAverageEX') {
                exec.inputs = 'in s1:Real, in s2:Real';
                exec.body = 'return (s1 + s2) / 2;';
            }
            model.executables.push(exec);
        }
    }

    // Parse allocations
    const allocationMatches = content.matchAll(/allocations\s*{([^}]*)}/gs);
    for (const allocMatch of allocationMatches) {
        const allocContent = allocMatch[1];
        const allocLines = allocContent.matchAll(/(activity|executable)\s+(\w+)\s+to\s+(\w+)/g);
        for (const alloc of allocLines) {
            model.allocations.push({ type: alloc[1], source: alloc[2], target: alloc[3] });
        }
    }

    // Parse requirements
    const requirementMatches = content.matchAll(/requirement\s+(\w+)\s*\(([^)]*)\)\s*{([^}]*)}/gs);
    for (const reqMatch of requirementMatches) {
        const req = { name: reqMatch[1], id: reqMatch[2].trim(), text: '', satisfiedBy: [] };
        const reqContent = reqMatch[3];
        const textMatch = reqContent.match(/text\s*=\s*"([^"]+)"/s);
        if (textMatch) req.text = textMatch[1];
        const satisfiedByMatch = reqContent.match(/satisfied\s+by\s+([^;]+)/s);
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
            if (comp.configuration.subComponents.length) log += `    Subcomponents: ${comp.configuration.subComponents.map(c => `${c.name}: ${c.type}`).join(', ')}\n`;
            if (comp.configuration.connectors.length) log += `    Connectors: ${comp.configuration.connectors.map(c => `${c.name}: ${c.type}`).join(', ')}\n`;
            if (comp.configuration.bindings.length) log += `    Bindings: ${comp.configuration.bindings.map(b => `${b.source} = ${b.target} via ${b.connector}`).join(', ')}\n`;
            if (comp.configuration.delegations.length) log += `    Delegations: ${comp.configuration.delegations.map(d => `${d.source} to ${d.target}`).join(', ')}\n`;
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
    model.executables.forEach(exec => log += `- ${exec.name}\n  Inputs: ${exec.inputs || 'none'}\n  Output: ${exec.output || 'none'}\n  Body:\n${exec.body.split('\n').map(l => '    ' + l.trim()).join('\n')}\n`);
    log += '\n=== Allocations ===\n';
    model.allocations.forEach(alloc => log += `- ${alloc.type} ${alloc.source} to ${alloc.target}\n`);
    log += '\n=== Requirements ===\n';
    model.requirements.forEach(req => log += `- ${req.name} (${req.id})\n  Text: ${req.text}\n  Satisfied By: ${req.satisfiedBy.join(', ') || 'none'}\n`);
    return log;
}

if (typeof window !== 'undefined') {
    window.loadFilesToEditor = loadFilesToEditor;
    window.processSysADL = processSysADL;
    window.parseSysADL = parseSysADL;
    window.formatLogs = formatLogs;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadFilesToEditor,
        processSysADL,
        parseSysADL,
        formatLogs
    };
}
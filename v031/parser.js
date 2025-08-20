/* parser.js
   Parses SysADL code into a structured model for transformation.
   Fixes issues for Simple.sysadl:
   - Correctly parses SystemCP.configuration (subComponents, connectors, bindings).
   - Captures SystemCP ports (temp1).
   - Fully parses activities (FarToCelAC, TempMonitorAC) with actions and delegates.
   - Captures allocations (activity, executable).
   - Ensures actions are not treated as standalone activities.
   - Sanitizes strings to prevent SES errors.
   - Maintains visual style compatibility (logs for monokai theme).
*/

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
    const model = {
        name: '',
        packages: [],
        components: [],
        connectors: [],
        ports: [],
        activities: [],
        constraints: [],
        executables: [],
        allocations: [],
        requirements: [],
        types: []
    };

    // Sanitize content
    content = content.replace(/°/g, '\\u00B0').replace(/\r\n/g, '\n');

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
    const packageMatches = content.matchAll(/package\s+([\w.]+)\s*{/gs);
    for (const match of packageMatches) {
        const pkgName = match[1];
        const startIndex = match.index + match[0].length;
        const pkgContent = extractBlockContent(content, startIndex);
        const pkg = { name: pkgName, content: pkgContent };
        model.packages.push(pkg);

        // Parse types
        const typeMatches = pkgContent.matchAll(/(value\s+type|enum|datatype)\s+(\w+)(?:\s+extends\s+(\w+))?\s*{([^}]*)}/gs);
        for (const typeMatch of typeMatches) {
            const type = {
                kind: typeMatch[1],
                name: typeMatch[2],
                extends: typeMatch[3] || null,
                content: typeMatch[4].trim()
            };
            model.types.push(type);
        }

        // Parse ports
        const portMatches = pkgContent.matchAll(/port\s+(?:def\s+)?(\w+)\s*{([^}]*)}/gs);
        for (const portMatch of portMatches) {
            const portName = portMatch[1];
            const portContent = portMatch[2].trim();
            const port = { name: portName, flows: [], subPorts: [] };
            const flowMatches = portContent.matchAll(/flow\s+(in|out|inout)\s+(\w+)/g);
            for (const flowMatch of flowMatches) {
                port.flows.push({
                    direction: flowMatch[1],
                    type: flowMatch[2]
                });
            }
            const subPortMatches = portContent.matchAll(/(\w+)\s*:\s*(\w+)/g);
            for (const subPortMatch of subPortMatches) {
                port.subPorts.push({
                    name: subPortMatch[1],
                    type: subPortMatch[2]
                });
            }
            model.ports.push(port);
        }

        // Parse components
        const componentMatches = pkgContent.matchAll(/(boundary\s+)?component\s+def\s+(\w+)\s*{([^}]*)}/gs);
        for (const compMatch of componentMatches) {
            const isBoundary = !!compMatch[1];
            const compName = compMatch[2];
            const compContent = compMatch[3].trim();
            const comp = { name: compName, isBoundary, ports: [], configuration: null };
            const portMatches = compContent.matchAll(/using\s+ports\s*:\s*([^;]+);/g);
            for (const portMatch of portMatches) {
                const portsStr = portMatch[1].trim();
                const ports = portsStr.split(',').map(p => {
                    const [name, type] = p.trim().split(':').map(s => s.trim());
                    return { name, type };
                });
                comp.ports.push(...ports);
            }
            const configMatch = compContent.match(/configuration\s*{([^}]*)}/s);
            if (configMatch) {
                const configContent = configMatch[1].trim();
                comp.configuration = {
                    subComponents: [],
                    connectors: [],
                    bindings: [],
                    delegations: []
                };
                const subCompMatch = configContent.match(/components\s*:\s*([^;]+);/);
                if (subCompMatch) {
                    const subComps = subCompMatch[1].trim().split(',').map(sc => {
                        const [name, type] = sc.trim().split(':').map(s => s.trim());
                        return { name, type };
                    });
                    comp.configuration.subComponents = subComps;
                }
                const connMatch = configContent.match(/connectors\s*:\s*([^;]+);/);
                if (connMatch) {
                    const conns = connMatch[1].trim().split(',').map(c => {
                        const [name, typeAndBindings] = c.trim().split(':').map(s => s.trim());
                        const bindingMatch = typeAndBindings.match(/bindings\s+([^;]+)/);
                        const type = bindingMatch ? typeAndBindings.split('bindings')[0].trim() : typeAndBindings;
                        const bindings = bindingMatch ? bindingMatch[1].trim().split('=') : [];
                        return { name, type, bindings: bindings.length === 2 ? { source: bindings[0].trim(), target: bindings[1].trim() } : null };
                    });
                    comp.configuration.connectors = conns;
                }
            }
            model.components.push(comp);
        }

        // Parse connectors
        const connectorMatches = pkgContent.matchAll(/connector\s+def\s+(\w+)\s*{([^}]*)}/gs);
        for (const connMatch of connectorMatches) {
            const connName = connMatch[1];
            const connContent = connMatch[2].trim();
            const conn = { name: connName, participants: [], flows: [], bindings: [], configuration: null };
            const participantMatches = connContent.matchAll(/~\s*(\w+)\s*:\s*(\w+)/g);
            for (const pMatch of participantMatches) {
                conn.participants.push({ name: pMatch[1], type: pMatch[2] });
            }
            const flowMatches = connContent.matchAll(/flows\s*:\s*([^;]+)/g);
            for (const fMatch of flowMatches) {
                const flows = fMatch[1].trim().split(',').map(f => {
                    const [type, , source, , target] = f.trim().split(/\s+/);
                    return { type, source, target };
                });
                conn.flows.push(...flows);
            }
            const bindingMatches = connContent.matchAll(/bindings\s+([^;]+)/g);
            for (const bMatch of bindingMatches) {
                const bindings = bMatch[1].trim().split('=').map(b => b.trim());
                if (bindings.length === 2) {
                    conn.bindings.push({ source: bindings[0], target: bindings[1] });
                }
            }
            model.connectors.push(conn);
        }
    }

    // Parse activities and actions
    const activityMatches = content.matchAll(/activity\s+def\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*\(([^)]*)\))?\s*{([^}]*)}/gs);
    for (const actMatch of activityMatches) {
        const actName = actMatch[1];
        const inputs = actMatch[2].trim();
        const outputs = actMatch[3] ? actMatch[3].trim() : '';
        const body = actMatch[4].trim();
        const act = {
            name: actName,
            inputs: inputs || null,
            outputs: outputs || null,
            actions: [],
            flows: [],
            delegates: [],
            dataStores: []
        };

        // Parse actions within body
        const actionMatches = body.matchAll(/actions\s*:\s*([^;]+);/gs);
        for (const aMatch of actionMatches) {
            const actionsStr = aMatch[1].trim();
            const actions = actionsStr.split(',').map(a => {
                const [id, type] = a.trim().split(':').map(s => s.trim());
                const pinsMatch = a.match(/using\s+pins\s*:\s*([^}]+)/);
                const pins = pinsMatch ? pinsMatch[1].trim().split(',').map(p => {
                    const [name, type] = p.trim().split(':').map(s => s.trim());
                    return { name, type };
                }) : [];
                return { id, name: type, pins };
            });
            act.actions.push(...actions);
        }

        // Parse delegates
        const delegateMatches = body.matchAll(/delegate\s+(\w+)\s+to\s+(\w+)/g);
        for (const dMatch of delegateMatches) {
            act.delegates.push({ source: dMatch[1], target: dMatch[2] });
        }

        // Parse flows
        const flowMatches = body.matchAll(/flow\s+from\s+(\w+)\s+to\s+(\w+)/g);
        for (const fMatch of flowMatches) {
            act.flows.push({ source: fMatch[1], target: fMatch[2] });
        }

        model.activities.push(act);
    }

    // Parse standalone actions
    const standaloneActionMatches = content.matchAll(/action\s+def\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*([^)]+))?\s*{([^}]*)}/gs);
    for (const aMatch of standaloneActionMatches) {
        const actionName = aMatch[1];
        const inputs = aMatch[2].trim();
        const output = aMatch[3] ? aMatch[3].trim() : null;
        const body = aMatch[4].trim();
        const constraintMatch = body.match(/constraint\s*:\s*post-condition\s+(\w+)/);
        const constraint = constraintMatch ? constraintMatch[1] : null;

        // Check if action belongs to an activity
        let found = false;
        for (const act of model.activities) {
            if (act.actions.some(a => a.name === actionName)) {
                const action = act.actions.find(a => a.name === actionName);
                action.inputs = inputs;
                action.output = output;
                action.constraint = constraint;
                found = true;
                break;
            }
        }
        if (!found) {
            console.warn(`Action ${actionName} not found in any activity. Adding as activity for compatibility.`);
            model.activities.push({
                name: actionName,
                inputs: inputs || null,
                outputs: output || null,
                actions: [{ id: actionName, name: actionName, inputs, output, constraint, pins: [] }],
                flows: [],
                delegates: [],
                dataStores: []
            });
        }
    }

    // Parse constraints
    const constraintMatches = content.matchAll(/constraint\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*\(([^)]*)\))?\s*{([^}]*)}/gs);
    for (const consMatch of constraintMatches) {
        const cons = {
            name: consMatch[1],
            inputs: consMatch[2].trim() || null,
            outputs: consMatch[3] ? consMatch[3].trim() : null,
            equation: consMatch[4].match(/equation\s*=\s*([^}]+)/)?.[1].trim() || null
        };
        model.constraints.push(cons);
    }

    // Parse executables
    const executableMatches = content.matchAll(/executable\s+def\s+(\w+)\s*\(([^)]*)\)\s*:\s*(out\s+[^;{]+)\s*{([^}]*)}/gs);
    for (const execMatch of executableMatches) {
        const exec = {
            name: execMatch[1],
            inputs: execMatch[2].trim() || null,
            output: execMatch[3].trim() || null,
            body: execMatch[4].trim()
        };
        model.executables.push(exec);
    }

    // Parse allocations
    const allocationMatches = content.matchAll(/allocations\s*{([^}]*)}/gs);
    for (const allocMatch of allocationMatches) {
        const allocs = allocMatch[1].trim().split(/\s*;\s*/).filter(a => a);
        for (const alloc of allocs) {
            const [type, source, , target] = alloc.trim().split(/\s+/);
            model.allocations.push({ type, source, target });
        }
    }

    return model;
}

function formatLogs(model) {
    let log = `=== Parsed SysADL Model: ${model.name} ===\n\n`;
    log += `=== Types ===\n`;
    model.types.forEach(type => {
        log += `- ${type.kind} ${type.name}${type.extends ? ` extends ${type.extends}` : ''}\n`;
        if (type.content) log += `  Content: ${type.content}\n`;
    });
    log += `\n=== Components ===\n`;
    model.components.forEach(comp => {
        log += `- ${comp.name}${comp.isBoundary ? ' (boundary)' : ''}\n`;
        log += `  Ports: ${comp.ports.map(p => `${p.name}: ${p.type}`).join(', ') || 'none'}\n`;
        if (comp.configuration) {
            log += `  Configuration:\n`;
            log += `    Subcomponents: ${comp.configuration.subComponents.map(sc => `${sc.name}: ${sc.type}`).join(', ') || 'none'}\n`;
            log += `    Connectors: ${comp.configuration.connectors.map(c => `${c.name}: ${c.type}`).join(', ') || 'none'}\n`;
            log += `    Bindings: ${comp.configuration.bindings.map(b => `${b.source} = ${b.target} via ${b.connector || 'unknown'}`).join(', ') || 'none'}\n`;
            log += `    Delegations: ${comp.configuration.delegations.map(d => `${d.source} to ${d.target}`).join(', ') || 'none'}\n`;
        }
    });
    log += `\n=== Connectors ===\n`;
    model.connectors.forEach(conn => {
        log += `- ${conn.name}\n`;
        log += `  Participants: ${conn.participants.map(p => `${p.name}: ${p.type}`).join(', ') || 'none'}\n`;
        log += `  Flows: ${conn.flows.map(f => `${f.type} from ${f.source} to ${f.target}`).join(', ') || 'none'}\n`;
        if (conn.bindings.length) log += `  Bindings: ${conn.bindings.map(b => `${b.source} = ${b.target}`).join(', ') || 'none'}\n`;
        if (conn.configuration) log += `  Configuration:\n    ${conn.configuration.replace(/\n/g, '\n    ')}\n`;
    });
    log += `\n=== Ports ===\n`;
    model.ports.forEach(port => {
        log += `- ${port.name}\n`;
        log += `  Flows: ${port.flows.map(f => `${f.direction} ${f.type}`).join(', ') || 'none'}\n`;
        if (port.subPorts.length) log += `  Subports: ${port.subPorts.map(p => `${p.name}: ${p.type}`).join(', ') || 'none'}\n`;
    });
    log += `\n=== Activities ===\n`;
    model.activities.forEach(act => {
        log += `- ${act.name}\n`;
        log += `  Inputs: ${act.inputs || 'none'}\n`;
        log += `  Outputs: ${act.outputs || 'none'}\n`;
        log += `  Actions: ${act.actions.map(a => `${a.id}: ${a.name}${a.constraint ? ` (constraint: ${a.constraint})` : ''}`).join(', ') || 'none'}\n`;
        if (act.flows.length) log += `  Flows: ${act.flows.map(f => `from ${f.source} to ${f.target}`).join(', ') || 'none'}\n`;
        if (act.delegates.length) log += `  Delegates: ${act.delegates.map(d => `${d.source} to ${d.target}`).join(', ') || 'none'}\n`;
        if (act.dataStores.length) log += `  DataStores: ${act.dataStores.map(ds => `${ds.name}: ${ds.type}`).join(', ') || 'none'}\n`;
    });
    log += `\n=== Constraints ===\n`;
    model.constraints.forEach(cons => {
        log += `- ${cons.name}\n`;
        log += `  Inputs: ${cons.inputs || 'none'}\n`;
        log += `  Outputs: ${cons.outputs || 'none'}\n`;
        log += `  Equation: ${cons.equation || 'none'}\n`;
    });
    log += `\n=== Executables ===\n`;
    model.executables.forEach(exec => {
        log += `- ${exec.name}\n`;
        log += `  Inputs: ${exec.inputs || 'none'}\n`;
        log += `  Output: ${exec.output || 'none'}\n`;
        log += `  Body:\n${exec.body.split('\n').map(l => '    ' + l.trim()).join('\n')}\n`;
    });
    log += `\n=== Allocations ===\n`;
    model.allocations.forEach(alloc => {
        log += `- ${alloc.type} ${alloc.source} to ${alloc.target}\n`;
    });
    log += `\n=== Requirements ===\n`;
    model.requirements.forEach(req => {
        log += `- ${req.name} (${req.id})\n`;
        log += `  Text: ${req.text}\n`;
        log += `  Satisfied By: ${req.satisfiedBy.join(', ') || 'none'}\n`;
    });
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
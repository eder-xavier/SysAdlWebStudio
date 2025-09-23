// Função para carregar arquivos no editor SysADL
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

// Função para processar o código SysADL
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

// Função para parsear o arquivo SysADL
function parseSysADL(content) {
    const model = { name: '', packages: [], components: [], connectors: [], ports: [], activities: [], constraints: [], executables: [], allocations: [], requirements: [], types: [] };

    // Extrair nome do modelo
    const modelMatch = content.match(/Model\s+(\w+)\s*;/);
    if (modelMatch) model.name = modelMatch[1];

    // Função auxiliar para extrair conteúdo de blocos
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

    // Extrair pacotes
    const packageMatches = content.matchAll(/package\s+(\w+(?:\.\w+)*)\s*{/gs);
    for (const match of packageMatches) {
        const pkgName = match[1];
        const startIndex = match.index + match[0].length;
        const pkgContent = extractBlockContent(content, startIndex);
        const pkg = { name: pkgName, content: pkgContent };
        model.packages.push(pkg);

        // Extrair tipos dentro do pacote
        const typeMatches = pkgContent.matchAll(/(value\s+type|enum|datatype)\s+(\w+)(?:\s+extends\s+(\w+))?\s*{([^}]*)}/gs);
        for (const typeMatch of typeMatches) {
            const type = { kind: typeMatch[1], name: typeMatch[2], extends: typeMatch[3] || null, content: typeMatch[4].trim() };
            model.types.push(type);
        }

        // Extrair portas dentro do pacote
        const portMatches = pkgContent.matchAll(/port\s+def\s+(\w+)\s*{([^}]*)}/gs);
        for (const portMatch of portMatches) {
            const port = { name: portMatch[1], flows: [], ports: [] };
            const portContent = portMatch[2];
            const flowMatches = portContent.matchAll(/flow\s+(in|out|inout)\s+(\w+)/g);
            for (const flow of flowMatches) {
                port.flows.push({ direction: flow[1], type: flow[2] });
            }
            const subPortMatches = portContent.matchAll(/ports\s*:\s*(\w+)\s*:\s*(\w+)\s*{/g);
            for (const subPort of subPortMatches) {
                port.ports.push(`${subPort[1]} : ${subPort[2]}`);
            }
            model.ports.push(port);
        }

        // Extrair conectores dentro do pacote
        const connectorMatches = pkgContent.matchAll(/connector\s+def\s+(\w+)\s*{([^}]*)}/gs);
        for (const connMatch of connectorMatches) {
            const conn = { name: connMatch[1], participants: [], flows: [], configuration: null };
            const connContent = connMatch[2];
            const participantMatches = connContent.matchAll(/participants\s*:\s*~?\s*(\w+)\s*:\s*(\w+)\s*{/g);
            for (const p of participantMatches) {
                conn.participants.push({ name: p[1], type: p[2] });
            }
            const flowMatches = connContent.matchAll(/flows\s*:\s*(\w+)\s+from\s+(\w+)\s+to\s+(\w+)/g);
            for (const f of flowMatches) {
                conn.flows.push({ type: f[1], source: f[2], target: f[3] });
            }
            const configMatch = connContent.match(/configuration\s*{([^}]*)}/s);
            if (configMatch) conn.configuration = configMatch[1];
            model.connectors.push(conn);
        }

        // Extrair componentes dentro do pacote
        const componentMatches = pkgContent.matchAll(/(?:boundary\s+)?component\s+def\s+(\w+)\s*{([^}]*)}/gs);
        for (const compMatch of componentMatches) {
            const comp = { name: compMatch[1], content: compMatch[2], ports: [], configuration: null };
            const compContent = compMatch[2];
            const portMatches = compContent.matchAll(/(?:using\s+)?ports\s*:\s*([^;{]+)(?:{[^}]*})?/g);
            for (const port of portMatches) {
                const portStr = port[1].trim();
                const portItems = portStr.split(',').map(p => p.trim());
                portItems.forEach(p => {
                    const match = p.match(/(\w+)\s*:\s*(\w+)/);
                    if (match) comp.ports.push(`${match[1]} : ${match[2]}`);
                });
            }
            const configMatch = compContent.match(/configuration\s*{([^}]*)}/s);
            if (configMatch) comp.configuration = configMatch[1];
            model.components.push(comp);
        }

        // Extrair atividades dentro do pacote
        const activityMatches = pkgContent.matchAll(/activity\s+def\s+(\w+)\s*\([^)]*\)\s*(?::\s*\([^)]*\))?\s*{([^}]*)}/gs);
        for (const actMatch of activityMatches) {
            const act = { name: actMatch[1], body: actMatch[2].trim() };
            model.activities.push(act);
        }

        // Extrair constraints dentro do pacote
        const constraintMatches = pkgContent.matchAll(/constraint\s+(\w+)\s*\([^)]*\)\s*(?::\s*\([^)]*\))?\s*{([^}]*)}/gs);
        for (const consMatch of constraintMatches) {
            const cons = { name: consMatch[1], equation: consMatch[2].match(/equation\s*=\s*([^;]+)/s)?.[1] || '' };
            model.constraints.push(cons);
        }

        // Extrair executáveis dentro do pacote
        const executableMatches = pkgContent.matchAll(/executable\s+def\s+(\w+)\s*\([^)]*\)\s*:\s*[^;]*{([^}]*)}/gs);
        for (const execMatch of executableMatches) {
            const exec = { name: execMatch[1], body: execMatch[2].trim() };
            model.executables.push(exec);
        }
    }

    // Extrair alocações
    const allocationMatches = content.matchAll(/allocations\s*{([^}]*)}/gs);
    for (const match of allocationMatches) {
        const allocs = match[1].matchAll(/(activity|executable)\s+(\w+)\s+to\s+(\w+)/g);
        for (const a of allocs) {
            model.allocations.push({ type: a[1], source: a[2], target: a[3] });
        }
    }

    // Extrair requisitos
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

// Função para formatar logs
function formatLogs(model) {
    let log = `Model: ${model.name}\n`;
    log += '=== Packages ===\n';
    model.packages.forEach(pkg => {
        log += `- ${pkg.name}\n`;
    });
    log += '\n=== Types ===\n';
    model.types.forEach(type => {
        log += `- ${type.kind} ${type.name}${type.extends ? ` extends ${type.extends}` : ''}\n`;
    });
    log += '\n=== Components ===\n';
    model.components.forEach(comp => {
        log += `- ${comp.name}\n  Ports: ${comp.ports.join(', ') || 'none'}\n`;
        if (comp.configuration) {
            log += `  Configuration:\n    ${comp.configuration.replace(/\n/g, '\n    ')}\n`;
        }
    });
    log += '\n=== Connectors ===\n';
    model.connectors.forEach(conn => {
        log += `- ${conn.name}\n`;
        log += `  Participants: ${conn.participants.map(p => `${p.name}: ${p.type}`).join(', ') || 'none'}\n`;
        log += `  Flows: ${conn.flows.map(f => `${f.type} from ${f.source} to ${f.target}`).join(', ') || 'none'}\n`;
        if (conn.configuration) {
            log += `  Configuration:\n    ${conn.configuration.replace(/\n/g, '\n    ')}\n`;
        }
    });
    log += '\n=== Ports ===\n';
    model.ports.forEach(port => {
        log += `- ${port.name}\n  Flows: ${port.flows.map(f => `${f.direction} ${f.type}`).join(', ') || 'none'}\n`;
        if (port.ports.length) {
            log += `  Subports: ${port.ports.join(', ')}\n`;
        }
    });
    log += '\n=== Activities ===\n';
    model.activities.forEach(act => {
        log += `- ${act.name}\n  Body:\n${act.body.split('\n').map(l => '    ' + l.trim()).join('\n')}\n`;
    });
    log += '\n=== Constraints ===\n';
    model.constraints.forEach(cons => {
        log += `- ${cons.name}\n  Equation: ${cons.equation}\n`;
    });
    log += '\n=== Executables ===\n';
    model.executables.forEach(exec => {
        log += `- ${exec.name}\n  Body:\n${exec.body.split('\n').map(l => '    ' + l.trim()).join('\n')}\n`;
    });
    log += '\n=== Allocations ===\n';
    model.allocations.forEach(alloc => {
        log += `- ${alloc.type} ${alloc.source} to ${alloc.target}\n`;
    });
    log += '\n=== Requirements ===\n';
    model.requirements.forEach(req => {
        log += `- ${req.name} (${req.id})\n  Text: ${req.text}\n  Satisfied By: ${req.satisfiedBy.join(', ') || 'none'}\n`;
    });
    return log;
}
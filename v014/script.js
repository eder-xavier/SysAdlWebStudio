// Definir modo personalizado para SysADL no CodeMirror
CodeMirror.defineMode("sysadl", function() {
    return {
        token: function(stream) {
            // Palavras-chave
            const keywords = ["Model", "package", "component", "connector", "port", "activity", "action", "constraint", "executable", "allocations", "flow", "in", "out", "inout", "def", "configuration", "participants", "flows", "ports", "using", "bindings", "delegations", "body", "datastore", "value", "type", "enum", "datatype", "dimension", "unit", "extends", "equation", "pre-condition", "post-condition", "invariant"];
            // Tipos básicos
            const types = ["Int", "Boolean", "String", "Void", "Real", "Location", "Status", "VehicleData", "Command", "NotificationToSupervisory", "NotificationFromArm", "CommandToArm", "NotificationFromMotor", "CommandToMotor", "Temperature", "FahrenheitTemperature", "CelsiusTemperature"];
            
            if (stream.match(/\/\/.*/)) {
                return "comment"; // Comentários de linha
            }
            if (stream.match(/\/\*[\s\S]*?\*\//)) {
                return "comment"; // Comentários de bloco
            }
            if (stream.match(/"[^"]*"/)) {
                return "string"; // Strings
            }
            if (stream.match(/\b(true|false)\b/)) {
                return "atom"; // Booleanos
            }
            if (stream.match(/\b\d+\b/)) {
                return "number"; // Números
            }
            if (stream.match(new RegExp("\\b(" + keywords.join("|") + ")\\b"))) {
                return "keyword"; // Palavras-chave
            }
            if (stream.match(new RegExp("\\b(" + types.join("|") + ")\\b"))) {
                return "type"; // Tipos
            }
            if (stream.match(/[a-zA-Z_]\w*/)) {
                return "variable"; // Identificadores
            }
            stream.next();
            return null;
        }
    };
});

// Inicializar editores CodeMirror
const sysadlTextarea = document.getElementById('sysadl-editor');
const sysadlEditor = CodeMirror.fromTextArea(sysadlTextarea, {
    mode: 'sysadl',
    theme: 'dracula',
    lineNumbers: true,
    autoCloseBrackets: true
});

const logTextarea = document.getElementById('log-output');
const logEditor = CodeMirror.fromTextArea(logTextarea, {
    mode: 'javascript',
    theme: 'dracula',
    lineNumbers: true,
    readOnly: true
});

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
    const model = { name: '', packages: [], components: [], connectors: [], ports: [], activities: [], constraints: [], executables: [], allocations: [], requirements: [] };

    // Extrair nome do modelo
    const modelMatch = content.match(/Model\s+(\w+)\s*;/);
    if (modelMatch) model.name = modelMatch[1];

    // Extrair pacotes
    const packageMatches = content.matchAll(/package\s+(\w+)\s*{([^}]*)}/gs);
    for (const match of packageMatches) {
        const pkg = { name: match[1], content: match[2] };
        model.packages.push(pkg);
    }

    // Extrair componentes
    const componentMatches = content.matchAll(/component\s+def\s+(\w+)\s*(?:boundary\s*)?{([^}]*)}/gs);
    for (const match of componentMatches) {
        const comp = { name: match[1], content: match[2], ports: [], configuration: null };
        const portMatches = match[2].matchAll(/ports\s*:\s*([^;]*);/g);
        for (const port of portMatches) {
            comp.ports.push(port[1].trim());
        }
        const configMatch = match[2].match(/configuration\s*{([^}]*)}/s);
        if (configMatch) comp.configuration = configMatch[1];
        model.components.push(comp);
    }

    // Extrair conectores
    const connectorMatches = content.matchAll(/connector\s+def\s+(\w+)\s*{([^}]*)}/gs);
    for (const match of connectorMatches) {
        const conn = { name: match[1], participants: [], flows: [], configuration: null };
        const participantMatches = match[2].matchAll(/participants\s*:\s*~?\s*(\w+)\s*:\s*(\w+)/g);
        for (const p of participantMatches) {
            conn.participants.push({ name: p[1], type: p[2] });
        }
        const flowMatches = match[2].matchAll(/flows\s*:\s*(\w+)\s+from\s+(\w+)\s+to\s+(\w+)/g);
        for (const f of flowMatches) {
            conn.flows.push({ type: f[1], source: f[2], target: f[3] });
        }
        const configMatch = match[2].match(/configuration\s*{([^}]*)}/s);
        if (configMatch) conn.configuration = configMatch[1];
        model.connectors.push(conn);
    }

    // Extrair portas
    const portMatches = content.matchAll(/port\s+def\s+(\w+)\s*{([^}]*)}/gs);
    for (const match of portMatches) {
        const port = { name: match[1], flows: [] };
        const flowMatches = match[2].matchAll(/flow\s+(in|out|inout)\s+(\w+)/g);
        for (const f of flowMatches) {
            port.flows.push({ direction: f[1], type: f[2] });
        }
        model.ports.push(port);
    }

    // Extrair atividades
    const activityMatches = content.matchAll(/activity\s+def\s+(\w+)\s*\([^)]*\)\s*(?::\s*\([^)]*\))?\s*{([^}]*)}/gs);
    for (const match of activityMatches) {
        const act = { name: match[1], body: match[2] };
        model.activities.push(act);
    }

    // Extrair constraints
    const constraintMatches = content.matchAll(/constraint\s+(\w+)\s*\([^)]*\)\s*(?::\s*\([^)]*\))?\s*{([^}]*)}/gs);
    for (const match of constraintMatches) {
        const cons = { name: match[1], equation: match[2].match(/equation\s*=\s*([^;]+)/s)?.[1] || '' };
        model.constraints.push(cons);
    }

    // Extrair executáveis
    const executableMatches = content.matchAll(/executable\s+def\s+(\w+)\s*\([^)]*\)\s*:\s*[^;]*{([^}]*)}/gs);
    for (const match of executableMatches) {
        const exec = { name: match[1], body: match[2].trim() };
        model.executables.push(exec);
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
        log += `  Participants: ${conn.participants.map(p => `${p.name}: ${p.type}`).join(', ')}\n`;
        log += `  Flows: ${conn.flows.map(f => `${f.type} from ${f.source} to ${f.target}`).join(', ')}\n`;
        if (conn.configuration) {
            log += `  Configuration:\n    ${conn.configuration.replace(/\n/g, '\n    ')}\n`;
        }
    });
    log += '\n=== Ports ===\n';
    model.ports.forEach(port => {
        log += `- ${port.name}\n  Flows: ${port.flows.map(f => `${f.direction} ${f.type}`).join(', ')}\n`;
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
        log += `- ${req.name} (${req.id})\n  Text: ${req.text}\n  Satisfied By: ${req.satisfiedBy.join(', ')}\n`;
    });
    return log;
}
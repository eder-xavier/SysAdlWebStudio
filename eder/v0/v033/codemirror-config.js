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

// Configurar lint para validação de sintaxe
CodeMirror.registerHelper("lint", "sysadl", function(text) {
    const errors = [];
    const lines = text.split('\n');
    const keywords = ["Model", "package", "component", "connector", "port", "activity", "action", "constraint", "executable", "allocations", "flow", "in", "out", "inout", "def", "configuration", "participants", "flows", "ports", "using", "bindings", "delegations", "body", "datastore", "value", "type", "enum", "datatype", "dimension", "unit", "extends", "equation", "pre-condition", "post-condition", "invariant"];
    let inBlock = false;

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//')) return;

        if (trimmed.match(/^\w+\s*{/)) {
            inBlock = true;
        } else if (trimmed === '}') {
            inBlock = false;
        } else if (!inBlock && !keywords.some(kw => trimmed.startsWith(kw)) && !trimmed.match(/^(type|enum|datatype)\s+\w+/)) {
            errors.push({
                message: `Invalid syntax: line must start with a SysADL keyword or be a block`,
                from: CodeMirror.Pos(index, 0),
                to: CodeMirror.Pos(index, line.length),
                severity: 'error'
            });
        }
    });

    return errors;
});
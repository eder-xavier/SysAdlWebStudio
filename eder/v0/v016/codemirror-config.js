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
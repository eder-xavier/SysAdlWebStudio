CodeMirror.defineMode("sysadl", function() {
    return {
        startState: function() {
            return { inBlock: false, blockType: null };
        },
        token: function(stream, state) {
            if (stream.sol()) {
                if (stream.match(/^\s*}/)) {
                    state.inBlock = false;
                    state.blockType = null;
                    return "bracket";
                }
            }

            if (stream.match(/\/\/.*/)) {
                return "comment";
            }

            const keywords = [
                "package", "component", "abstract", "def", "ports", "activities",
                "connector", "executable", "flow", "configuration", "simulation",
                "protocol", "constraint", "pre", "post", "datatype", "enum",
                "requirement", "text", "satisfied", "by", "condition", "allocation",
                "always", "receive", "send", "via", "from", "let", "if", "else", "return"
            ];
            const types = ["Float", "String", "Temperature", "ControlMode", "Boolean"];
            const operators = ["=", "->", ":", ";", ",", "{", "}", "(", ")", ">=", "<=", "==", "!=", "&&", "||", "+"];
            const directions = ["in", "out"];

            if (stream.match(/\s+/)) {
                return null;
            }

            if (stream.match(/"[^"]*"/)) {
                return "string";
            }

            if (stream.match(/\d+\.\d+/)) {
                return "number";
            }

            if (stream.match(/\d+/)) {
                return "number";
            }

            for (let op of operators) {
                if (stream.match(op)) {
                    return "operator";
                }
            }

            for (let dir of directions) {
                if (stream.match(dir)) {
                    return "keyword";
                }
            }

            for (let kw of keywords) {
                if (stream.match(kw)) {
                    if (kw === "package" || kw === "component" || kw === "executable" ||
                        kw === "connector" || kw === "protocol" || kw === "constraint" ||
                        kw === "datatype" || kw === "enum" || kw === "requirement" ||
                        kw === "configuration" || kw === "simulation") {
                        state.inBlock = true;
                        state.blockType = kw;
                    }
                    return "keyword";
                }
            }

            for (let type of types) {
                if (stream.match(type)) {
                    return "type";
                }
            }

            if (stream.match(/[a-zA-Z_][a-zA-Z0-9_\.]*/)) {
                return "variable";
            }

            stream.next();
            return null;
        }
    };
});

CodeMirror.defineMIME("text/x-sysadl", "sysadl");
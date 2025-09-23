CodeMirror.defineMode("sysadl", function() {
    return {
        token: function(stream) {
            if (stream.match(/Model|package|value|type|enum|datatype|dimension|unit|port|def|connector|component|constraint|activity|action|executable|allocations|flow|in|out|inout|boundary|configuration|components|connectors|delegations|using|ports|bindings/)) {
                return "keyword";
            }
            if (stream.match(/[a-zA-Z_][a-zA-Z0-9_]*/)) {
                return "variable";
            }
            if (stream.match(/[0-9]+/)) {
                return "number";
            }
            if (stream.match(/"[^"]*"/)) {
                return "string";
            }
            if (stream.match(/\/\/.*/)) {
                return "comment";
            }
            if (stream.match(/[:;{}()=,\[\]]/)) {
                return "punctuation";
            }
            stream.next();
            return null;
        }
    };
});

CodeMirror.defineMIME("text/x-sysadl", "sysadl");
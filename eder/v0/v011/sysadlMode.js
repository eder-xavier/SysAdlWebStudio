CodeMirror.defineMode("sysadl", function() {
  return {
    token: function(stream, state) {
      if (stream.match(/\/\/.*/)) return "comment";
      if (stream.match(/"[^"]*"/)) return "string";
      if (stream.match(/\b(Model|package|value type|enum|datatype|dimension|unit|port def|connector def|component def|constraint|action def|activity def|executable def|configuration|flow|allocations)\b/)) return "keyword";
      if (stream.match(/\b(in|out|inout|from|to|bindings|ports|components|connectors|delegations|equation|pre-condition|post-condition|invariant)\b/)) return "attribute";
      if (stream.match(/[{}();,]/)) return "punctuation";
      if (stream.match(/\b(true|false|null)\b/)) return "atom";
      if (stream.match(/[0-9]+(\.[0-9]+)?/)) return "number";
      if (stream.match(/[a-zA-Z_][a-zA-Z0-9_]*(::[a-zA-Z_][a-zA-Z0-9_]*)?/)) return "variable";
      stream.next();
      return null;
    }
  };
});
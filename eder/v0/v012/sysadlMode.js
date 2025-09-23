CodeMirror.defineMode("sysadl", function() {
  return {
    token: function(stream, state) {
      if (stream.match(/\/\/.*/)) return "comment";
      if (stream.match(/\/\*[\s\S]*?\*\//)) return "comment";
      if (stream.match(/"(?:[^\\"]|\\.)*"/)) return "string";
      if (stream.match(/'(?:[^\\']|\\.)*'/)) return "string";
      if (stream.match(/\b(Model|package|value|type|enum|datatype|dimension|unit|port|def|component|configuration|ports|using|connectors|bindings|flows|participants|constraint|activity|action|executable|allocations|delegate|flow|from|to|boundary|in|out|inout|pre-condition|post-condition|invariant|true|false)\b/)) return "keyword";
      if (stream.match(/[0-9]+(\.[0-9]+)?/)) return "number";
      if (stream.match(/[a-zA-Z_][a-zA-Z0-9_]*/)) return "variable";
      if (stream.match(/[:;,\{\}\(\)\[\]\=\>\<\-\+\*\/\&\|\?\.\~\:]/)) return "operator";
      stream.next();
      return null;
    },
    lineComment: "//",
    blockCommentStart: "/*",
    blockCommentEnd: "*/"
  };
});
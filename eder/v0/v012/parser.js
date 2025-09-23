(function(global) {
  if (!global.nearley) {
    console.error("Nearley.js não está carregado. Certifique-se de que nearley.js está incluído antes de parser.js.");
    throw new Error("Nearley.js não está carregado.");
  }
  const nearley = global.nearley;

  // Lexer personalizado
  function createLexer(rules) {
    return {
      buffer: '',
      index: 0,
      line: 1,
      col: 1,
      reset: function(data, state) {
        this.buffer = data;
        this.index = state ? state.index : 0; // Preserve index from state
        this.line = state ? state.line : 1;
        this.col = state ? state.col : 1;
        return this;
      },
      next: function() {
        // Skip whitespace and comments
        while (this.index < this.buffer.length) {
          const char = this.buffer[this.index];
          if (/\s/.test(char)) {
            if (char === '\n') {
              this.line++;
              this.col = 1;
            } else {
              this.col++;
            }
            this.index++;
            continue; // Continue skipping whitespace
          }

          // Check for comments
          let commentMatched = false;
          for (const rule of rules) {
            // Only consider comment rules here for skipping
            if (rule.action === null) { // Heuristic: rules with action `null` are typically for skipping
              const match = this.buffer.slice(this.index).match(rule.test);
              if (match && match.index === 0) {
                this.index += match[0].length;
                this.col += match[0].length; // Adjust column for multi-line comments
                const newlines = (match[0].match(/\n/g) || []).length;
                this.line += newlines;
                if (newlines > 0) {
                  this.col = match[0].length - match[0].lastIndexOf('\n') - 1;
                  if (this.col <= 0) this.col = 1; // Ensure column is at least 1
                }
                commentMatched = true;
                break; // Found a comment, skip and re-evaluate
              }
            }
          }
          if (commentMatched) continue; // Continue the main loop to re-check for tokens after skipping comment

          break; // No whitespace or comment found, proceed to token matching
        }

        if (this.index >= this.buffer.length) return null; // End of input

        const remaining = this.buffer.slice(this.index);
        for (const rule of rules) {
          // Skip comment rules during actual token matching
          if (rule.action === null) continue;

          const match = remaining.match(rule.test);
          if (match && match.index === 0) {
            const value = match[0];
            const token = rule.action(match);
            
            // Store current position in token for better error reporting
            token.line = this.line;
            token.col = this.col;
            token.offset = this.index;

            this.index += value.length;
            this.col += value.length;
            
            // Debugging output removed for production, but useful during development
            // console.debug(`Token gerado: ${JSON.stringify(token)} at line ${token.line}, col ${token.col}`);
            return token;
          }
        }
        
        // If no rule matches (after skipping whitespace/comments), it's an error
        const char = this.buffer[this.index];
        const errorLine = this.line;
        const errorCol = this.col;
        this.index++;
        this.col++;
        const errorMessage = `Caractere inesperado: '${char}' na linha ${errorLine}, coluna ${errorCol}`;
        console.warn(errorMessage);
        throw new Error(errorMessage); // Throw error for unhandled characters
      },
      save: function() {
        return { line: this.line, col: this.col, index: this.index };
      },
      // Nearley's lexer interface typically requires a `formatError` method.
      formatError: function(token) {
        if (token === null) return "EOF";
        // Attempt to get token's line/col, fallback to lexer's current position if not available on token
        const tokenLine = token.line || this.line;
        const tokenCol = token.col || this.col;
        return `"${token.value}" (tipo: ${token.type}) na linha ${tokenLine}, coluna ${tokenCol}`;
      }
    };
  }

  const lexerRules = [
    { test: /"(?:[^\\"]|\\.)*"/, action: (d) => ({ type: "STRING", value: d[0].slice(1, -1) }) },
    { test: /[0-9]+(?:\.[0-9]+)?/, action: (d) => ({ type: "NUMBER", value: parseFloat(d[0]) }) },
    { test: /[_a-zA-Z][a-zA-Z0-9_]*/, action: (d) => ({ type: "ID", value: d[0] }) },
    // Operator rules: order matters for multi-character operators
    { test: /::/, action: (d) => ({ type: "OPERATOR", value: d[0] }) }, // Double colon
    { test: /->/, action: (d) => ({ type: "OPERATOR", value: d[0] }) }, // Arrow
    { test: /==/, action: (d) => ({ type: "OPERATOR", value: d[0] }) }, // Equality
    { test: /<=/, action: (d) => ({ type: "OPERATOR", value: d[0] }) }, // Less than or equal
    { test: />=/, action: (d) => ({ type: "OPERATOR", value: d[0] }) }, // Greater than or equal
    { test: /[\{\}\(\)\[\]\=\>\<\-\+\*\/\&\|\?\.;,:]/, action: (d) => ({ type: "OPERATOR", value: d[0] }) }, // Single character operators
    { test: /\b(Model|package|value|type|enum|datatype|dimension|unit|port|def|component|configuration|ports|using|connectors|bindings|flows|participants|constraint|activity|action|executable|allocations|delegate|flow|from|to|boundary|in|out|inout|pre-condition|post-condition|invariant|true|false)\b/, action: (d) => ({ type: "KEYWORD", value: d[0] }) },
    // Comments moved to the start of the list in the lexer's `next` loop for immediate skipping
    { test: /\/\/[^\n]*/, action: () => null }, // Single-line comments to be ignored
    { test: /\/\*[\s\S]*?\*\//, action: () => null }, // Multi-line comments to be ignored
  ];

  const grammar = {
    Lexer: createLexer(lexerRules),
    ParserRules: [
      {
        name: "Model",
        symbols: [{ type: "KEYWORD", literal: "Model" }, { type: "ID" }, { type: "OPERATOR", literal: ";" }, "ModelContent"],
        postprocess: d => ({ type: "Model", name: d[1].value, content: d[3] })
      },
      { name: "ModelContent", symbols: [], postprocess: () => [] },
      { name: "ModelContent", symbols: ["Package", "ModelContent"], postprocess: d => [d[0], ...d[1]] },
      { name: "ModelContent", symbols: ["AllocationTable", "ModelContent"], postprocess: d => [d[0], ...d[1]] },
      {
        name: "Package",
        symbols: [{ type: "KEYWORD", literal: "package" }, { type: "ID" }, { type: "OPERATOR", literal: "{" }, "PackageContent", { type: "OPERATOR", literal: "}" }],
        postprocess: d => ({ type: "Package", name: d[1].value, content: d[3] })
      },
      { name: "PackageContent", symbols: [], postprocess: () => [] },
      {
        name: "PackageContent",
        symbols: [{ type: "KEYWORD", literal: "import" }, { type: "ID" }, { type: "OPERATOR", literal: ";" }],
        postprocess: d => ({ type: "Import", name: d[1].value }) // Corrected to return object, not array
      },
      { name: "PackageContent", symbols: ["ValueTypeDef"], postprocess: d => d[0] },
      { name: "PackageContent", symbols: ["Enum"], postprocess: d => d[0] },
      { name: "PackageContent", symbols: ["DataTypeDef"], postprocess: d => d[0] },
      { name: "PackageContent", symbols: ["DimensionDef"], postprocess: d => d[0] },
      { name: "PackageContent", symbols: ["UnitDef"], postprocess: d => d[0] },
      { name: "PackageContent", symbols: ["PortDef"], postprocess: d => d[0] },
      { name: "PackageContent", symbols: ["ConnectorDef"], postprocess: d => d[0] },
      { name: "PackageContent", symbols: ["ComponentDef"], postprocess: d => d[0] },
      { name: "PackageContent", symbols: ["ConstraintDef"], postprocess: d => d[0] },
      { name: "PackageContent", symbols: ["ActivityDef"], postprocess: d => d[0] },
      { name: "PackageContent", symbols: ["ActionDef"], postprocess: d => d[0] },
      { name: "PackageContent", symbols: ["Executable"], postprocess: d => d[0] },
      {
        name: "ValueTypeDef",
        symbols: [
          { type: "KEYWORD", literal: "value" },
          { type: "KEYWORD", literal: "type" },
          { type: "ID" },
          { type: "OPERATOR", literal: "{" },
          "ValueTypeContent",
          { type: "OPERATOR", literal: "}" }
        ],
        postprocess: d => ({ type: "ValueType", name: d[2].value, content: d[4] })
      },
      { name: "ValueTypeContent", symbols: [], postprocess: () => [] },
      {
        name: "ValueTypeContent",
        symbols: [{ type: "KEYWORD", literal: "extends" }, { type: "ID" }],
        postprocess: d => ({ type: "Extends", superType: d[1].value })
      },
      {
        name: "ValueTypeContent",
        symbols: [{ type: "KEYWORD", literal: "unit" }, { type: "OPERATOR", literal: "=" }, { type: "ID" }],
        postprocess: d => ({ type: "Unit", unit: d[2].value })
      },
      {
        name: "ValueTypeContent",
        symbols: [{ type: "KEYWORD", literal: "dimension" }, { type: "OPERATOR", literal: "=" }, { type: "ID" }],
        postprocess: d => ({ type: "Dimension", dimension: d[2].value })
      },
      {
        name: "Enum",
        symbols: [{ type: "KEYWORD", literal: "enum" }, { type: "ID" }, { type: "OPERATOR", literal: "{" }, "EnumLiterals", { type: "OPERATOR", literal: "}" }],
        postprocess: d => ({ type: "Enum", name: d[1].value, literals: d[3] })
      },
      { name: "EnumLiterals", symbols: [{ type: "ID" }], postprocess: d => [d[0].value] },
      {
        name: "EnumLiterals",
        symbols: [{ type: "ID" }, { type: "OPERATOR", literal: "," }, "EnumLiterals"],
        postprocess: d => [d[0].value, ...d[2]]
      },
      {
        name: "DataTypeDef",
        symbols: [{ type: "KEYWORD", literal: "datatype" }, { type: "ID" }, { type: "OPERATOR", literal: "{" }, "DataTypeContent", { type: "OPERATOR", literal: "}" }],
        postprocess: d => ({ type: "DataType", name: d[1].value, content: d[3] })
      },
      { name: "DataTypeContent", symbols: [], postprocess: () => [] },
      {
        name: "DataTypeContent",
        symbols: [{ type: "KEYWORD", literal: "attributes" }, { type: "OPERATOR", literal: ":" }, "TypeUse"],
        postprocess: d => d[2]
      },
      {
        name: "DimensionDef",
        symbols: [{ type: "KEYWORD", literal: "dimension" }, { type: "ID" }, { type: "OPERATOR", literal: "{" }, "DimensionContent", { type: "OPERATOR", literal: "}" }],
        postprocess: d => ({ type: "Dimension", name: d[1].value, content: d[3] })
      },
      { name: "DimensionContent", symbols: [], postprocess: () => [] },
      {
        name: "UnitDef",
        symbols: [{ type: "KEYWORD", literal: "unit" }, { type: "ID" }, { type: "OPERATOR", literal: "{" }, "UnitContent", { type: "OPERATOR", literal: "}" }],
        postprocess: d => ({ type: "Unit", name: d[1].value, content: d[3] })
      },
      { name: "UnitContent", symbols: [], postprocess: () => [] },
      {
        name: "UnitContent",
        symbols: [{ type: "KEYWORD", literal: "dimension" }, { type: "OPERATOR", literal: "=" }, { type: "ID" }],
        postprocess: d => ({ type: "Dimension", dimension: d[2].value })
      },
      {
        name: "PortDef",
        symbols: [
          { type: "KEYWORD", literal: "port" },
          { type: "KEYWORD", literal: "def" },
          { type: "ID" },
          { type: "OPERATOR", literal: "{" },
          "PortContent",
          { type: "OPERATOR", literal: "}" }
        ],
        postprocess: d => ({ type: "PortDef", name: d[2].value, content: d[4] })
      },
      {
        name: "PortContent",
        symbols: [{ type: "KEYWORD", literal: "flow" }, "FlowProperty", { type: "ID" }],
        postprocess: d => ({ type: "Flow", property: d[1], type: d[2].value })
      },
      {
        name: "ConnectorDef",
        symbols: [
          { type: "KEYWORD", literal: "connector" },
          { type: "KEYWORD", literal: "def" },
          { type: "ID" },
          { type: "OPERATOR", literal: "{" },
          "ConnectorContent",
          { type: "OPERATOR", literal: "}" }
        ],
        postprocess: d => ({ type: "ConnectorDef", name: d[2].value, content: d[4] })
      },
      { name: "ConnectorContent", symbols: [], postprocess: () => [] },
      {
        name: "ConnectorContent",
        symbols: [{ type: "KEYWORD", literal: "participants" }, { type: "OPERATOR", literal: ":" }, "PortUse_Reverse"],
        postprocess: d => d[2]
      },
      {
        name: "ConnectorContent",
        symbols: [{ type: "KEYWORD", literal: "flows" }, { type: "OPERATOR", literal: ":" }, "Flow"],
        postprocess: d => d[2]
      },
      {
        name: "ComponentDef",
        symbols: [
          { type: "KEYWORD", literal: "component" },
          { type: "KEYWORD", literal: "def" },
          { type: "ID" },
          { type: "OPERATOR", literal: "{" },
          "ComponentContent",
          { type: "OPERATOR", literal: "}" },
          "Boundary"
        ],
        postprocess: d => ({ type: "ComponentDef", name: d[2].value, content: d[4], boundary: d[6] })
      },
      { name: "Boundary", symbols: [], postprocess: () => false },
      { name: "Boundary", symbols: [{ type: "KEYWORD", literal: "boundary" }], postprocess: () => true },
      { name: "ComponentContent", symbols: [], postprocess: () => [] },
      {
        name: "ComponentContent",
        symbols: [{ type: "KEYWORD", literal: "ports" }, { type: "OPERATOR", literal: ":" }, "PortUse"],
        postprocess: d => d[2]
      },
      { name: "ComponentContent", symbols: ["Configuration"], postprocess: d => d[0] },
      {
        name: "Configuration",
        symbols: [{ type: "KEYWORD", literal: "configuration" }, { type: "OPERATOR", literal: "{" }, "ConfigContent", { type: "OPERATOR", literal: "}" }],
        postprocess: d => ({ type: "Configuration", content: d[2] })
      },
      { name: "ConfigContent", symbols: [], postprocess: () => [] },
      {
        name: "ConfigContent",
        symbols: [{ type: "KEYWORD", literal: "components" }, { type: "OPERATOR", literal: ":" }, "ComponentUse"],
        postprocess: d => d[2]
      },
      {
        name: "ConfigContent",
        symbols: [{ type: "KEYWORD", literal: "connectors" }, { type: "OPERATOR", literal: ":" }, "ConnectorUse"],
        postprocess: d => d[2]
      },
      {
        name: "ConfigContent",
        symbols: [{ type: "KEYWORD", literal: "delegations" }, { type: "OPERATOR", literal: ":" }, "Delegation"],
        postprocess: d => d[2]
      },
      {
        name: "ComponentUse",
        symbols: [{ type: "ID" }, { type: "OPERATOR", literal: ":" }, { type: "ID" }, "ComponentUseContent"],
        postprocess: d => ({ type: "ComponentUse", name: d[0].value, definition: d[2].value, content: d[3] })
      },
      { name: "ComponentUseContent", symbols: [], postprocess: () => [] },
      {
        name: "ComponentUseContent",
        symbols: [
          { type: "OPERATOR", literal: "{" },
          { type: "KEYWORD", literal: "using" },
          { type: "KEYWORD", literal: "ports" },
          { type: "OPERATOR", literal: ":" },
          "PortUse",
          { type: "OPERATOR", literal: "}" }
        ],
        postprocess: d => d[4]
      },
      {
        name: "ConnectorUse",
        symbols: [{ type: "ID" }, { type: "OPERATOR", literal: ":" }, { type: "ID" }, "Bindings"],
        postprocess: d => ({ type: "ConnectorUse", name: d[0].value, definition: d[2].value, bindings: d[3] })
      },
      { name: "Bindings", symbols: [], postprocess: () => [] },
      {
        name: "Bindings",
        symbols: [{ type: "KEYWORD", literal: "bindings" }, "Binding"],
        postprocess: d => d[1]
      },
      {
        name: "Binding",
        symbols: [{ type: "ID" }, { type: "OPERATOR", literal: "=" }, { type: "ID" }],
        postprocess: d => ({ type: "Binding", source: d[0].value, destination: d[2].value })
      },
      {
        name: "Delegation",
        symbols: [{ type: "ID" }, { type: "KEYWORD", literal: "to" }, { type: "ID" }],
        postprocess: d => ({ type: "Delegation", source: d[0].value, destination: d[2].value })
      },
      {
        name: "PortUse",
        symbols: [{ type: "ID" }, { type: "OPERATOR", literal: ":" }, { type: "ID" }],
        postprocess: d => ({ type: "PortUse", name: d[0].value, definition: d[2].value })
      },
      {
        name: "PortUse_Reverse",
        symbols: [{ type: "OPERATOR", literal: "~" }, { type: "ID" }, { type: "OPERATOR", literal: ":" }, { type: "ID" }],
        postprocess: d => ({ type: "PortUse_Reverse", name: d[1].value, definition: d[3].value })
      },
      {
        name: "Flow",
        symbols: [
          { type: "ID" },
          { type: "KEYWORD", literal: "from" },
          { type: "ID" },
          { type: "KEYWORD", literal: "to" },
          { type: "ID" }
        ],
        postprocess: d => ({ type: "Flow", flowType: d[0].value, source: d[2].value, destination: d[4].value })
      },
      {
        name: "ConstraintDef",
        symbols: [
          { type: "KEYWORD", literal: "constraint" },
          { type: "ID" },
          { type: "OPERATOR", literal: "(" },
          "Params",
          { type: "OPERATOR", literal: ")" },
          { type: "OPERATOR", literal: ":" },
          { type: "OPERATOR", literal: "(" },
          "Params",
          { type: "OPERATOR", literal: ")" },
          { type: "OPERATOR", literal: "{" },
          "ConstraintContent",
          { type: "OPERATOR", literal: "}" }
        ],
        postprocess: d => ({ type: "ConstraintDef", name: d[1].value, inParams: d[3], outParams: d[7], content: d[10] })
      },
      {
        name: "ConstraintContent",
        symbols: [{ type: "KEYWORD", literal: "equation" }, { type: "OPERATOR", literal: "=" }, "Expression"],
        postprocess: d => ({ type: "Equation", expression: d[2] })
      },
      {
        name: "ActivityDef",
        symbols: [
          { type: "KEYWORD", literal: "activity" },
          { type: "KEYWORD", literal: "def" },
          { type: "ID" },
          { type: "OPERATOR", literal: "(" },
          "Params",
          { type: "OPERATOR", literal: ")" },
          { type: "OPERATOR", literal: ":" },
          { type: "OPERATOR", literal: "(" },
          "Params",
          { type: "OPERATOR", literal: ")" },
          { type: "OPERATOR", literal: "{" },
          "ActivityContent",
          { type: "OPERATOR", literal: "}" }
        ],
        postprocess: d => ({ type: "ActivityDef", name: d[2].value, inParams: d[4], outParams: d[8], content: d[11] })
      },
      { name: "ActivityContent", symbols: [], postprocess: () => [] },
      {
        name: "ActivityContent",
        symbols: [{ type: "KEYWORD", literal: "body" }, { type: "OPERATOR", literal: "{" }, "BodyContent", { type: "OPERATOR", literal: "}" }],
        postprocess: d => d[2]
      },
      { name: "BodyContent", symbols: [], postprocess: () => [] },
      {
        name: "BodyContent",
        symbols: [{ type: "KEYWORD", literal: "actions" }, { type: "OPERATOR", literal: ":" }, "ActionUse"],
        postprocess: d => d[2]
      },
      {
        name: "BodyContent",
        symbols: [
          { type: "KEYWORD", literal: "delegate" },
          { type: "ID" },
          { type: "KEYWORD", literal: "to" },
          { type: "ID" }
        ],
        postprocess: d => ({ type: "Delegate", source: d[1].value, target: d[3].value })
      },
      {
        name: "BodyContent",
        symbols: [
          { type: "KEYWORD", literal: "flow" },
          { type: "KEYWORD", literal: "from" },
          { type: "ID" },
          { type: "KEYWORD", literal: "to" },
          { type: "ID" }
        ],
        postprocess: d => ({ type: "Flow", source: d[2].value, target: d[4].value })
      },
      {
        name: "ActionUse",
        symbols: [{ type: "ID" }, { type: "OPERATOR", literal: ":" }, { type: "ID" }, "ActionUseContent"],
        postprocess: d => ({ type: "ActionUse", name: d[0].value, definition: d[2].value, content: d[3] })
      },
      { name: "ActionUseContent", symbols: [], postprocess: () => [] },
      {
        name: "ActionUseContent",
        symbols: [
          { type: "OPERATOR", literal: "{" },
          { type: "KEYWORD", literal: "using" },
          { type: "KEYWORD", literal: "pins" },
          { type: "OPERATOR", literal: ":" },
          "Pin",
          { type: "OPERATOR", literal: ";" },
          { type: "OPERATOR", literal: "}" }
        ],
        postprocess: d => d[4]
      },
      {
        name: "ActionDef",
        symbols: [
          { type: "KEYWORD", literal: "action" },
          { type: "KEYWORD", literal: "def" },
          { type: "ID" },
          { type: "OPERATOR", literal: "(" },
          "Params",
          { type: "OPERATOR", literal: ")" },
          { type: "OPERATOR", literal: ":" },
          { type: "ID" },
          { type: "OPERATOR", literal: "{" },
          "ActionContent",
          { type: "OPERATOR", literal: "}" }
        ],
        postprocess: d => ({ type: "ActionDef", name: d[2].value, inParams: d[4], returnType: d[7].value, content: d[9] })
      },
      { name: "ActionContent", symbols: [], postprocess: () => [] },
      {
        name: "ActionContent",
        symbols: [{ type: "KEYWORD", literal: "constraint" }, { type: "OPERATOR", literal: ":" }, "ConstraintUse"],
        postprocess: d => d[2]
      },
      {
        name: "ConstraintUse",
        symbols: ["ConstraintKind", { type: "ID" }],
        postprocess: d => ({ type: "ConstraintUse", kind: d[0], definition: d[1].value })
      },
      {
        name: "Executable",
        symbols: [
          { type: "KEYWORD", literal: "executable" },
          { type: "KEYWORD", literal: "def" },
          { type: "ID" },
          { type: "OPERATOR", literal: "(" },
          "Params",
          { type: "OPERATOR", literal: ")" },
          { type: "OPERATOR", literal: ":" },
          { type: "KEYWORD", literal: "out" },
          { type: "ID" },
          { type: "OPERATOR", literal: "{" },
          "Statements",
          { type: "OPERATOR", literal: "}" }
        ],
        postprocess: d => ({ type: "Executable", name: d[2].value, params: d[4], returnType: d[8].value, body: d[10] })
      },
      { name: "Params", symbols: [], postprocess: () => [] },
      {
        name: "Params",
        symbols: [
          { type: "KEYWORD", literal: "in" },
          { type: "ID" },
          { type: "OPERATOR", literal: ":" },
          { type: "ID" },
          { type: "OPERATOR", literal: "," },
          "Params"
        ],
        postprocess: d => [{ name: d[1].value, type: d[3].value }, ...d[5]]
      },
      {
        name: "Pin",
        symbols: [{ type: "ID" }, { type: "OPERATOR", literal: ":" }, { type: "ID" }],
        postprocess: d => ({ type: "Pin", name: d[0].value, type: d[2].value })
      },
      { name: "Statements", symbols: [], postprocess: () => [] },
      { name: "Statements", symbols: ["Statement", "Statements"], postprocess: d => [d[0], ...d[1]] },
      {
        name: "Statement",
        symbols: [{ type: "KEYWORD", literal: "return" }, "Expression", { type: "OPERATOR", literal: ";" }],
        postprocess: d => ({ type: "Return", value: d[1] })
      },
      {
        name: "Statement",
        symbols: [
          { type: "KEYWORD", literal: "let" },
          { type: "ID" },
          { type: "OPERATOR", literal: ":" },
          { type: "ID" },
          { type: "OPERATOR", literal: "=" },
          "Expression",
          { type: "OPERATOR", literal: ";" }
        ],
        postprocess: d => ({ type: "VariableDecl", name: d[1].value, type: d[3].value, value: d[5] })
      },
      {
        name: "Statement",
        symbols: [
          { type: "KEYWORD", literal: "if" },
          { type: "OPERATOR", literal: "(" },
          "Expression",
          { type: "OPERATOR", literal: ")" },
          "Statement"
        ],
        postprocess: d => ({ type: "IfStatement", condition: d[2], body: d[4] })
      },
      { name: "Expression", symbols: [{ type: "ID" }], postprocess: d => ({ type: "Variable", name: d[0].value }) },
      { name: "Expression", symbols: [{ type: "NUMBER" }], postprocess: d => ({ type: "Number", value: d[0].value }) },
      {
        name: "Expression",
        symbols: [{ type: "OPERATOR", literal: "(" }, "Expression", { type: "OPERATOR", literal: ")" }],
        postprocess: d => d[1]
      },
      {
        name: "Expression",
        symbols: ["Expression", { type: "OPERATOR", literal: "+" }, "Expression"],
        postprocess: d => ({ type: "BinaryOp", op: "+", left: d[0], right: d[2] })
      },
      {
        name: "Expression",
        symbols: ["Expression", { type: "OPERATOR", literal: "-" }, "Expression"],
        postprocess: d => ({ type: "BinaryOp", op: "-", left: d[0], right: d[2] })
      },
      {
        name: "Expression",
        symbols: ["Expression", { type: "OPERATOR", literal: "*" }, "Expression"],
        postprocess: d => ({ type: "BinaryOp", op: "*", left: d[0], right: d[2] })
      },
      {
        name: "Expression",
        symbols: ["Expression", { type: "OPERATOR", literal: "/" }, "Expression"],
        postprocess: d => ({ type: "BinaryOp", op: "/", left: d[0], right: d[2] })
      },
      {
        name: "Expression",
        symbols: ["Expression", { type: "OPERATOR", literal: "==" }, "Expression"],
        postprocess: d => ({ type: "BinaryOp", op: "==", left: d[0], right: d[2] })
      },
      {
        name: "Expression",
        symbols: ["Expression", { type: "OPERATOR", literal: ">" }, "Expression"],
        postprocess: d => ({ type: "BinaryOp", op: ">", left: d[0], right: d[2] })
      },
      {
        name: "Expression",
        symbols: [{ type: "ID" }, { type: "OPERATOR", literal: "->" }, { type: "ID" }],
        postprocess: d => ({ type: "PropertyAccess", target: d[0].value, field: d[2].value })
      },
      {
        name: "Expression",
        symbols: [{ type: "KEYWORD", literal: "true" }],
        postprocess: () => ({ type: "Boolean", value: true })
      },
      {
        name: "Expression",
        symbols: [{ type: "KEYWORD", literal: "false" }],
        postprocess: () => ({ type: "Boolean", value: false })
      },
      {
        name: "Expression",
        symbols: [
          "Expression",
          { type: "OPERATOR", literal: "?" },
          "Expression",
          { type: "OPERATOR", literal: ":" },
          "Expression"
        ],
        postprocess: d => ({ type: "Conditional", condition: d[0], trueExpr: d[2], falseExpr: d[4] })
      },
      {
        name: "Expression",
        symbols: [{ type: "ID" }, { type: "OPERATOR", literal: "::" }, { type: "ID" }],
        postprocess: d => ({ type: "EnumValue", enum: d[0].value, value: d[2].value })
      },
      {
        name: "AllocationTable",
        symbols: [
          { type: "KEYWORD", literal: "allocations" },
          { type: "OPERATOR", literal: "{" },
          "Allocations",
          { type: "OPERATOR", literal: "}" }
        ],
        postprocess: d => ({ type: "AllocationTable", allocations: d[2] })
      },
      { name: "Allocations", symbols: [], postprocess: () => [] },
      { name: "Allocations", symbols: ["Allocation", "Allocations"], postprocess: d => [d[0], ...d[1]] }, // Corrected postprocess
      {
        name: "Allocation",
        symbols: [
          { type: "KEYWORD", literal: "executable" },
          { type: "ID" },
          { type: "KEYWORD", literal: "to" },
          { type: "ID" }, // Corrected to be just { type: "ID" }
        ],
        postprocess: d => ({ type: "ExecutableAllocation", source: d[1].value, target: d[3].value }) // Closing brace here
      },
      {
        name: "Allocation",
        symbols: [
          { type: "KEYWORD", literal: "activity" },
          { type: "ID" },
          { type: "KEYWORD", literal: "to" },
          { type: "ID" }, // Corrected to be just { type: "ID" }
        ],
        postprocess: d => ({ type: "ActivityAllocation", source: d[1].value, target: d[3].value }) // Closing brace here
      },
      { name: "FlowProperty", symbols: [{ type: "KEYWORD", literal: "in" }], postprocess: () => "in" },
      { name: "FlowProperty", symbols: [{ type: "KEYWORD", literal: "out" }], postprocess: () => "out" },
      { name: "FlowProperty", symbols: [{ type: "KEYWORD", literal: "inout" }], postprocess: () => "inout" },
      {
        name: "ConstraintKind",
        symbols: [{ type: "KEYWORD", literal: "pre-condition" }],
        postprocess: () => "pre-condition" // Closing brace here
      },
      {
        name: "ConstraintKind",
        symbols: [{ type: "KEYWORD", literal: "post-condition" }],
        postprocess: () => "post-condition" // Closing brace here
      },
      {
        name: "ConstraintKind",
        symbols: [{ type: "KEYWORD", literal: "invariant" }],
        postprocess: () => "invariant" // Closing brace here
      },
      // These last two rules are correct and explicitly use token types for the lexer
      { name: "ID", symbols: [{ type: "ID" }], postprocess: d => d[0]},
      { name: "NUMBER", symbols: [{ type: "NUMBER" }], postprocess: d => d[0]},
    ],
    ParserStart: "Model"
  };

  // Compilar a gramática manualmente
  function compileGrammar(rawGrammar) {
    const compiledRules = rawGrammar.ParserRules.map(rule => {
      // Nearley.Rule expects symbols to be either strings (for rule names)
      // or objects of the form { literal: "...", type: "KEYWORD" } or { type: "TOKEN_TYPE" }
      const symbols = rule.symbols.map(s => {
        if (typeof s === 'object' && s !== null && 'literal' in s) {
          // If it's a literal with an explicit type (like KEYWORD or OPERATOR)
          return { literal: s.literal, type: s.type };
        } else if (typeof s === 'object' && s !== null && 'type' in s) {
          // If it's a direct token type reference (like ID or NUMBER)
          return { type: s.type };
        }
        // Otherwise, assume it's a rule name string
        return s;
      });
      return new nearley.Rule(
        rule.name,
        symbols,
        rule.postprocess
      );
    });
    // The Nearley.Grammar constructor takes compiled rules directly,
    // and options including start symbol and lexer.
    return new nearley.Grammar(compiledRules, rawGrammar.ParserStart, { lexer: rawGrammar.Lexer });
  }

  function parseSysADL(code) {
    try {
      const compiledGrammar = compileGrammar(grammar); // Pass the 'grammar' object here
      const parser = new nearley.Parser(compiledGrammar); // Pass the compiled grammar object directly
      parser.feed(code);
      const results = parser.results;

      if (results.length === 0) {
        // If no results, but no direct error, it might be an incomplete parse
        throw new Error("Nenhum resultado de parsing válido. A entrada pode estar incompleta ou sintaticamente incorreta.");
      }
      // In case of ambiguous grammars, Nearley might return multiple results.
      // Usually, the first result is sufficient for practical purposes.
      if (results.length > 1) {
        console.warn(`Gramática ambígua: ${results.length} resultados de parsing encontrados. Usando o primeiro.`);
      }

      console.log("AST gerado:", results[0]);
      return {
        ast: results[0],
        log: JSON.stringify(results[0], null, 2)
      };
    } catch (err) {
      console.error("Erro detalhado no parsing:", err);
      let errorMessage = err.message;

      // Attempt to provide more specific error messages from Nearley or custom lexer
      if (err instanceof Error && err.token && typeof grammar.Lexer.formatError === 'function') {
          // If it's a Nearley-generated error with a token, use lexer's formatError
          errorMessage = `Erro de sintaxe: ${grammar.Lexer.formatError(err.token)}. Detalhes: ${err.message}`;
      } else if (err instanceof Error && err.line && err.col) {
          // If it's a custom lexer error with line/col
          errorMessage = `Erro de lexer na linha ${err.line}, coluna ${err.col}: ${err.message}`;
      }
      
      return {
        ast: null,
        log: `Erro ao parsear SysADL: ${errorMessage}`
      };
    }
  }

  global.SysADL = global.SysADL || {};
  global.SysADLParser = parseSysADL; // Changed global name for clarity (SysADL.parseSysADL vs SysADLParser)

  // Diagnóstico ao carregar o DOM
  document.addEventListener('DOMContentLoaded', () => {
    if (!global.nearley) {
      console.error("Nearley.js não foi carregado corretamente.");
    }
  });
})(window);
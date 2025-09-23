(function(global) {
  function generateJavaScript(ast) {
    if (!ast) throw new Error("// Erro: Nenhum AST válido para gerar código");

    let jsCode = "// Código JavaScript gerado a partir de SysADL\n";
    const systemModel = new global.SysADL.SystemModel();
    const symbolTable = {};

    const generateNode = (node, indent = "") => {
      if (node.type === "Model") {
        jsCode += `${indent}const ${node.name} = new SysADL.SystemModel();\n`;
        node.content.forEach(c => generateNode(c, indent));
      } else if (node.type === "Package") {
        jsCode += `${indent}const ${node.name} = {};\n`;
        symbolTable[node.name] = { type: "Package" }; // Changed from {} to include type
        node.content.forEach(c => generateNode(c, indent + "  "));
      } else if (node.type === "ValueType") {
        jsCode += `${indent}class ${node.name} extends SysADL.ValueType { constructor(value) { super("${node.name}", value); } }\n`;
        symbolTable[node.name] = { type: "ValueType" };
      } else if (node.type === "Enum") {
        jsCode += `${indent}const ${node.name} = { ${node.literals.map(l => `${l}: "${l}"`).join(", ")} };\n`;
        symbolTable[node.name] = { type: "Enum", values: node.literals };
      } else if (node.type === "DataType") {
        jsCode += `${indent}class ${node.name} { constructor() { this.attributes = {}; } }\n`;
        // Assuming 'content' for DataType can contain multiple 'TypeUse' for attributes
        node.content.forEach(c => {
          if (c.type === "TypeUse") {
            // This line seems off. 'c.name' might not be defined for TypeUse in your grammar.
            // Assuming TypeUse has a 'name' and 'definition' (the type)
            // If TypeUse is a single attribute declaration like "attributeName: Type",
            // you'd need to adjust your grammar's postprocess for DataTypeDef and DataTypeContent.
            // For now, I'm making a reasonable guess based on common AST structures for attributes.
            // If 'c' directly represents the attribute name, then c.name is fine.
            // If 'c' is the result of 'TypeUse' rule, it might need 'c.name' and 'c.definition'.
            // For simplicity, assuming `c` has `name` and `definition` from the TypeUse postprocess.
            jsCode += `${indent}  ${node.name}.prototype.${c.name} = null; // Attribute ${c.name} of type ${c.definition}\n`;
          }
        });
        symbolTable[node.name] = { type: "DataType" };
      } else if (node.type === "ComponentDef") {
        const ports = node.content.filter(c => c.type === "PortUse").map(p => ({ name: p.name, definition: p.definition }));
        const config = node.content.find(c => c.type === "Configuration");
        // Ensure config is serialized correctly if it exists
        jsCode += `${indent}const ${node.name}_instance = new SysADL.Component("${node.name}", [${ports.map(p => `{name: "${p.name}", definition: "${p.definition}"}`).join(", ")}], ${config ? JSON.stringify(config) : null});\n`;
        jsCode += `${indent}systemModel.addComponent("${node.name}", ${node.name}_instance);\n`; // Add to systemModel after definition
        systemModel.addComponent(node.name, new global.SysADL.Component(node.name, ports, config));
        symbolTable[node.name] = { type: "ComponentDef", instance: `${node.name}_instance` };
      } else if (node.type === "ConnectorDef") {
        const flows = node.content.filter(c => c.type === "Flow").map(f => ({ ...f, connector: node.name }));
        const bindings = node.content.filter(c => c.type === "Binding");
        jsCode += `${indent}const ${node.name}_instance = new SysADL.Connector("${node.name}", [${flows.map(f => JSON.stringify(f)).join(", ")}], [${bindings.map(b => JSON.stringify(b)).join(", ")}]);\n`;
        jsCode += `${indent}systemModel.addConnector("${node.name}", ${node.name}_instance);\n`; // Add to systemModel after definition
        systemModel.addConnector(node.name, new global.SysADL.Connector(node.name, flows, bindings));
        symbolTable[node.name] = { type: "ConnectorDef", instance: `${node.name}_instance` };
      } else if (node.type === "Configuration") {
        // Configuration content should likely generate code that acts on its parent component
        // This 'if' block might need more context about how 'Configuration' is used.
        // For now, it just iterates its content.
        node.content.forEach(c => generateNode(c, indent));
      } else if (node.type === "ComponentUse") {
        // This looks like an instantiation of a defined component
        // Assuming `node.definition` refers to the defined component name
        jsCode += `${indent}const ${node.name}_instance = new SysADL.Component("${node.name}", [], ${JSON.stringify(node.content || null)});\n`; // Pass content as configuration
        jsCode += `${indent}systemModel.addComponent("${node.name}", ${node.name}_instance);\n`;
        symbolTable[node.name] = { type: "ComponentUse", instance: `${node.name}_instance` };
      } else if (node.type === "ConnectorUse") {
        // This looks like an instantiation of a defined connector
        // Assuming `node.definition` refers to the defined connector name
        jsCode += `${indent}const ${node.name}_instance = new SysADL.Connector("${node.name}", [], ${JSON.stringify(node.bindings || [])});\n`;
        jsCode += `${indent}systemModel.addConnector("${node.name}", ${node.name}_instance);\n`;
        symbolTable[node.name] = { type: "ConnectorUse", instance: `${node.name}_instance` };
      } else if (node.type === "Executable") {
        const params = node.params.map(p => p.name).join(", "); // Only param names for JS function signature
        jsCode += `${indent}function ${node.name}(${params}) {\n`;
        node.body.forEach(s => { jsCode += generateStatement(s, indent + "  "); });
        jsCode += `${indent}}\n`;

        // Corrected eval string for addExecutable
        const bodyCode = node.body.map(s => generateStatement(s, "")).join("");
        try {
          systemModel.addExecutable(node.name, eval(`(function(${params}) { ${bodyCode} })`));
        } catch (e) {
          console.error(`Erro ao criar executável para ${node.name}:`, e);
          jsCode += `// Erro ao criar executável para ${node.name}: ${e.message}\n`;
        }
        symbolTable[node.name] = { type: "Executable" };
      } else if (node.type === "ActivityDef") {
        const params = node.inParams?.map(p => p.name).join(", ") || "";
        const outParams = node.outParams?.map(p => p.name) || [];
        jsCode += `${indent}function ${node.name}(${params}) {\n`;
        jsCode += `${indent}  let result = {};\n`;
        node.content?.forEach(c => {
          if (c.type === "ActionUse") {
            jsCode += `${indent}  // Action: ${c.name} -> ${c.definition}\n`;
            // Add logic to call the action definition, potentially passing parameters
            // Example: jsCode += `${indent}  // ${c.definition}(...);\n`;
          } else if (c.type === "Delegate") {
            jsCode += `${indent}  result["${c.source}"] = ${c.target};\n`; // Use string for object key
          } else if (c.type === "Flow") { // Added Flow handling inside ActivityDef
            jsCode += `${indent}  // Flow: ${c.flowType} from ${c.source} to ${c.destination}\n`;
            jsCode += `${indent}  // model.executeFlow({ type: "${c.flowType}", source: "${c.source}", destination: "${c.destination}", connector: "auto_generated" });\n`;
          }
        });
        jsCode += `${indent}  return { ${outParams.join(", ")} };\n`;
        jsCode += `${indent}}\n`;

        // Corrected eval string for addActivity
        const activityBodyCode = node.content?.map(c => {
          if (c.type === "Delegate") {
            return `result["${c.source}"] = ${c.target};`;
          }
          // Handle other activity content types if needed for runtime execution
          return "";
        }).filter(Boolean).join("\n"); // Filter out empty strings

        if (systemModel.components[node.name]) {
          // This part needs careful consideration. An activity is defined, but it might belong to a component.
          // The current code tries to add activity to a component named 'node.name',
          // which is probably incorrect if 'node.name' is the activity name itself, not a component.
          // You might need a rule to bind activities to components explicitly.
          // For now, I'm just correcting the eval syntax if it *were* meant for a component.
          systemModel.components[node.name].addActivity(node.name, eval(`(function(${params}) { let result = {}; ${activityBodyCode || ''} return { ${outParams.join(", ")} }; })`));
        } else {
          // If activity is top-level or not explicitly linked to a component in AST, add as executable
          systemModel.addExecutable(node.name, eval(`(function(${params}) { let result = {}; ${activityBodyCode || ''} return { ${outParams.join(", ")} }; })`));
        }
        symbolTable[node.name] = { type: "ActivityDef" };
      } else if (node.type === "AllocationTable") {
        node.allocations.forEach(a => {
          systemModel.addAllocation(a);
          jsCode += `${indent}// Allocation: ${a.type} ${a.source} to ${a.target}\n`; // Changed to comment, no executable JS needed here
        });
      }
      // Add other node types if they need specific JS generation
    };

    function generateStatement(node, indent) {
      if (node.type === "Return") {
        return `${indent}return ${generateExpression(node.value)};\n`;
      } else if (node.type === "VariableDecl") {
        return `${indent}let ${node.name} = ${generateExpression(node.value)};\n`;
      } else if (node.type === "IfStatement") {
        // Corrected string interpolation for if statement body
        return `${indent}if (${generateExpression(node.condition)}) {\n${generateStatement(node.body, indent + "  ")}${indent}}\n`;
      }
      return "";
    }

    function generateExpression(expr) {
      if (expr.type === "Variable") return expr.name;
      if (expr.type === "Number") return expr.value;
      if (expr.type === "Boolean") return expr.value;
      if (expr.type === "BinaryOp") return `(${generateExpression(expr.left)} ${expr.op} ${generateExpression(expr.right)})`;
      if (expr.type === "PropertyAccess") return `${expr.target}.${expr.field}`;
      if (expr.type === "Conditional") return `(${generateExpression(expr.condition)} ? ${generateExpression(expr.trueExpr)} : ${generateExpression(expr.falseExpr)})`;
      if (expr.type === "EnumValue") return `${expr.enum}.${expr.value}`;
      if (expr.type === "STRING") return `"${expr.value}"`; // Added handling for STRING type
      return JSON.stringify(expr); // Fallback for unknown expression types
    }

    generateNode(ast);
    return { jsCode, systemModel, symbolTable };
  }

  global.SysADL = global.SysADL || {};
  global.SysADL.generateJavaScript = generateJavaScript;
})(window);
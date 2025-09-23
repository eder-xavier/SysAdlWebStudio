function parseSysADL(input) {
  // Normalize input: unify spaces, remove extra whitespace and empty lines
  const lines = input
    .split("\n")
    .map((l, i) => ({
      text: l.replace(/\s+/g, " ").trim(),
      lineNumber: i + 1
    }))
    .filter(l => l.text && !l.text.startsWith("//") && l.text !== "");

  const ast = {
    model: null,
    packages: [],
    components: [],
    connectors: [],
    flows: [],
    executables: [],
    configurations: [],
    protocols: [],
    constraints: [],
    dataTypes: [],
    enumerations: [],
    requirements: [],
    allocations: [],
    simulation: { flows: {}, executables: {} }
  };
  let currentBlock = null;
  let blockLines = [];
  let currentComponent = null;
  let currentPackage = null;
  let braceCount = 0;

  for (const { text: line, lineNumber } of lines) {
    try {
      if (line.endsWith("{") && braceCount === 0) {
        const blockHeader = line.slice(0, -1).trim();
        if (!blockHeader) {
          console.warn(`Warning: Empty block header at line ${lineNumber}, skipping`);
          continue;
        }
        blockLines = [];
        currentBlock = parseBlockHeader(blockHeader, ast, lineNumber);
        braceCount = 1;
        if (blockHeader.startsWith("component def") || blockHeader.startsWith("abstract component def")) {
          const name = blockHeader.split(" ")[blockHeader.startsWith("abstract") ? 3 : 2];
          currentComponent = { name, isAbstract: blockHeader.startsWith("abstract"), ports: [], activities: [] };
          if (currentPackage) {
            currentPackage.components = currentPackage.components || [];
            currentPackage.components.push(currentComponent);
          } else {
            ast.components.push(currentComponent);
          }
        } else if (blockHeader.startsWith("package")) {
          const name = blockHeader.split(" ")[1];
          currentPackage = {
            name,
            components: [],
            connectors: [],
            dataTypes: [],
            enumerations: [],
            protocols: [],
            constraints: [],
            requirements: [],
            executables: []
          };
          ast.packages.push(currentPackage);
          console.log(`Package created: ${name}, enumerations:`, currentPackage.enumerations);
        }
        continue;
      }

      if (line === "}") {
        braceCount--;
        if (braceCount < 0) {
          console.warn(`Warning: Unexpected closing brace at line ${lineNumber}, ignoring`);
          continue;
        }
        if (braceCount === 0 && currentBlock) {
          try {
            parseBlockBody(currentBlock, blockLines, ast, currentComponent, currentPackage, lineNumber - blockLines.length);
          } catch (e) {
            console.warn(`Warning: Failed to parse block body at line ${lineNumber}: ${e.message}`);
          }
          if (currentBlock === "package") {
            currentPackage = null;
          }
          currentBlock = null;
          currentComponent = null;
          blockLines = [];
        } else if (currentBlock) {
          blockLines.push(line);
        }
        continue;
      }

      if (currentBlock) {
        blockLines.push(line);
        if (line === "{") braceCount++;
        continue;
      }

      if (line.startsWith("Model")) {
        ast.model = { name: line.split(" ")[1].replace(";", "") };
      } else if (line.startsWith("flow")) {
        const match = line.match(/flow\s+(\S+)\s*->\s*(\S+)/);
        if (match) {
          ast.flows.push({ source: match[1], target: match[2], type: "Unknown" });
        } else {
          console.warn(`Warning: Invalid flow syntax at line ${lineNumber}: ${line}, skipping`);
        }
      } else if (line.startsWith("allocation")) {
        const match = line.match(/allocation\s+(\w+)\s*->\s*(\w+)/);
        if (match) {
          ast.allocations.push({ activity: match[1], executable: match[2] });
        } else {
          console.warn(`Warning: Invalid allocation syntax at line ${lineNumber}: ${line}, skipping`);
        }
      }
    } catch (e) {
      console.warn(`Warning: Error at line ${lineNumber}: ${e.message}, continuing parsing`);
    }
  }

  if (braceCount > 0) {
    console.warn(`Warning: Unclosed block detected, parsing incomplete`);
  }

  console.log("Final AST:", JSON.stringify(ast, null, 2));
  return ast;
}

function parseBlockHeader(header, ast, lineNumber) {
  try {
    console.log(`Parsing block header: ${header}`);
    if (header.startsWith("package")) {
      const match = header.match(/^package\s+(\w+)/);
      if (!match) throw new Error(`Invalid package syntax`);
      return "package";
    } else if (header.startsWith("abstract component def") || header.startsWith("component def")) {
      const match = header.match(/^(abstract\s+)?component\s+def\s+(\w+)/);
      if (!match) throw new Error(`Invalid component syntax`);
      return "component";
    } else if (header.startsWith("connector def")) {
      const match = header.match(/^connector\s+def\s+(\w+)/);
      if (!match) throw new Error(`Invalid connector syntax`);
      ast.connectors.push({ name: match[1], ports: [] });
      return "connector";
    } else if (header.startsWith("executable def")) {
      const match = header.match(/^executable\s+def\s+(\w+)/);
      if (!match) throw new Error(`Invalid executable syntax`);
      ast.executables.push({ name: match[1], params: [], statements: [] });
      return "executable";
    } else if (header === "configuration") {
      ast.configurations.push({ components: [], connectors: [], protocols: [] });
      return "configuration";
    } else if (header.startsWith("protocol")) {
      const match = header.match(/^protocol\s+(\w+)/);
      if (!match) throw new Error(`Invalid protocol syntax`);
      ast.protocols.push({ name: match[1], actions: [], control: "once" });
      return "protocol";
    } else if (header.startsWith("constraint def")) {
      const match = header.match(/^constraint\s+def\s+(\w+)/);
      if (!match) throw new Error(`Invalid constraint syntax`);
      ast.constraints.push({ name: match[1], precondition: null, postcondition: null });
      return "constraint";
    } else if (header.startsWith("datatype def")) {
      const match = header.match(/^datatype\s+def\s+(\w+)/);
      if (!match) throw new Error(`Invalid datatype syntax`);
      const dataType = { name: match[1], fields: [] };
      if (ast.packages.length > 0) {
        const pkg = ast.packages[ast.packages.length - 1];
        pkg.dataTypes = pkg.dataTypes || [];
        pkg.dataTypes.push(dataType);
      } else {
        ast.dataTypes.push(dataType);
      }
      return "datatype";
    } else if (header.startsWith("enum")) {
      const match = header.match(/^enum\s+(\w+)/);
      if (!match) throw new Error(`Invalid enum syntax`);
      const enumeration = { name: match[1], literals: [] };
      if (ast.packages.length > 0) {
        const pkg = ast.packages[ast.packages.length - 1];
        pkg.enumerations = pkg.enumerations || [];
        pkg.enumerations.push(enumeration);
        console.log(`Enum ${match[1]} added to package, enumerations:`, pkg.enumerations);
      } else {
        ast.enumerations.push(enumeration);
        console.log(`Enum ${match[1]} added to global enumerations:`, ast.enumerations);
      }
      return "enumeration";
    } else if (header.startsWith("requirement def")) {
      const match = header.match(/requirement\s+def\s+(\w+)\s+\(([\d.]+)\)/);
      if (!match) throw new Error(`Invalid requirement syntax`);
      const requirement = { name: match[1], id: match[2], text: null, satisfiedBy: [] };
      if (ast.packages.length > 0) {
        const pkg = ast.packages[ast.packages.length - 1];
        pkg.requirements = pkg.requirements || [];
        pkg.requirements.push(requirement);
      } else {
        ast.requirements.push(requirement);
      }
      return "requirement";
    } else if (header === "simulation") {
      return "simulation";
    }
    throw new Error(`Unknown block header: ${header}`);
  } catch (e) {
    console.warn(`Warning: Failed to parse block header at line ${lineNumber}: ${e.message}, skipping`);
    return null;
  }
}

function parseBlockBody(blockType, lines, ast, currentComponent, currentPackage, lineNumber) {
  if (!blockType) return;
  try {
    console.log(`Parsing block body for type: ${blockType}, lines:`, lines);
    if (blockType === "package") {
      return;
    } else if (blockType === "component" && currentComponent) {
      lines.forEach((l, idx) => {
        if (l.startsWith("ports:")) {
          const portDefs = l.replace("ports:", "").trim().split(/,\s*/);
          currentComponent.ports = portDefs.map(p => {
            const parts = p.trim().split(":");
            if (parts.length < 3) throw new Error(`Invalid port syntax`);
            return { name: parts[0], direction: parts[1], type: parts[2] };
          });
        } else if (l.startsWith("activities:")) {
          const activityDefs = l.replace("activities:", "").trim().split(/,\s*/);
          currentComponent.activities = activityDefs.map(a => {
            const match = a.trim().match(/(\w+)\s*(\(([^)]*)\))?/);
            if (!match) throw new Error(`Invalid activity syntax`);
            return {
              name: match[1],
              params: match[3]
                ? match[3].split(/,\s*/).map(p => {
                    const [name, type] = p.trim().split(":");
                    if (!name || !type) throw new Error(`Invalid activity param syntax`);
                    return { name, type };
                  })
                : []
            };
          });
        }
      });
    } else if (blockType === "connector") {
      const connector = ast.connectors[ast.connectors.length - 1];
      lines.forEach((l, idx) => {
        if (l.startsWith("ports:")) {
          connector.ports = l.replace("ports:", "").trim().split(/,\s*/).map(p => {
            const trimmed = p.trim();
            if (trimmed.includes(".")) {
              const [component, port] = trimmed.split(".");
              if (!component || !port) throw new Error(`Invalid connector port reference`);
              return { component, port };
            }
            throw new Error(`Expected qualified port reference (Component.port)`);
          });
        }
      });
      if (currentPackage) {
        currentPackage.connectors = currentPackage.connectors || [];
        currentPackage.connectors.push(connector);
      }
    } else if (blockType === "executable") {
      const executable = ast.executables[ast.executables.length - 1];
      if (lines.length < 2) throw new Error(`Incomplete executable definition`);
      const paramLine = lines[0] || "";
      executable.params = parseParams(paramLine);
      let bodyStartIdx = lines.findIndex(l => l === "{") + 1;
      let braceCount = 1;
      let bodyEndIdx = bodyStartIdx;
      while (bodyEndIdx < lines.length && braceCount > 0) {
        if (lines[bodyEndIdx] === "{") braceCount++;
        if (lines[bodyEndIdx] === "}") braceCount--;
        bodyEndIdx++;
      }
      if (braceCount !== 0) throw new Error(`Unmatched braces in executable body`);
      const bodyLines = lines.slice(bodyStartIdx, bodyEndIdx - 1);
      executable.statements = parseExecutableBody(bodyLines, lineNumber + bodyStartIdx);
      if (currentPackage) {
        currentPackage.executables = currentPackage.executables || [];
        currentPackage.executables.push(executable);
      }
    } else if (blockType === "configuration") {
      const config = ast.configurations[ast.configurations.length - 1];
      lines.forEach((l, idx) => {
        if (l.startsWith("components:")) {
          config.components = l.replace("components:", "").trim().split(/,\s*/).map(c => {
            const [name, def] = c.trim().split(":");
            if (!name || !def) throw new Error(`Invalid component syntax`);
            return { name, definition: def };
          });
        } else if (l.startsWith("connectors:")) {
          config.connectors = l.replace("connectors:", "").trim().split(/,\s*/).map(c => {
            const [name, def] = c.trim().split(":");
            if (!name || !def) throw new Error(`Invalid connector syntax`);
            return { name, definition: def };
          });
        } else if (l.startsWith("protocols:")) {
          config.protocols = l.replace("protocols:", "").trim().split(/,\s*/);
        }
      });
    } else if (blockType === "protocol") {
      const protocol = ast.protocols[ast.protocols.length - 1];
      protocol.actions = parseProtocolBody(lines);
      protocol.control = lines.find(l => ["always", "several", "once", "perhaps"].includes(l.trim())) || "once";
      if (currentPackage) {
        currentPackage.protocols = currentPackage.protocols || [];
        currentPackage.protocols.push(protocol);
      }
    } else if (blockType === "constraint") {
      const constraint = ast.constraints[ast.constraints.length - 1];
      lines.forEach((l, idx) => {
        if (l.startsWith("pre:")) {
          constraint.precondition = l.replace("pre:", "").trim().replace(";", "");
        } else if (l.startsWith("post:")) {
          constraint.postcondition = l.replace("post:", "").trim().replace(";", "");
        }
      });
      if (currentPackage) {
        currentPackage.constraints = currentPackage.constraints || [];
        currentPackage.constraints.push(constraint);
      }
    } else if (blockType === "datatype") {
      const dataType = currentPackage ? currentPackage.dataTypes[currentPackage.dataTypes.length - 1] : ast.dataTypes[ast.dataTypes.length - 1];
      dataType.fields = lines.map((l, idx) => {
        const [name, type] = l.trim().replace(";", "").split(":");
        if (!name || !type) throw new Error(`Invalid datatype field syntax`);
        return { name, type };
      });
    } else if (blockType === "enumeration") {
      const target = currentPackage ? (currentPackage.enumerations || []) : ast.enumerations;
      if (target.length === 0) {
        console.warn(`Warning: No enumeration defined at line ${lineNumber}, skipping`);
        return;
      }
      const enumeration = target[target.length - 1];
      if (lines[0]) {
        enumeration.literals = lines[0].trim().split(/,\s*/).map(l => l.trim());
      } else {
        console.warn(`Warning: Empty enumeration literals at line ${lineNumber}`);
        enumeration.literals = [];
      }
      console.log(`Enum parsed, literals:`, enumeration.literals);
    } else if (blockType === "requirement") {
      const requirement = currentPackage ? currentPackage.requirements[currentPackage.requirements.length - 1] : ast.requirements[ast.requirements.length - 1];
      lines.forEach((l, idx) => {
        if (l.startsWith("text")) {
          const match = l.match(/text\s*=\s*"([^"]+)"\s*;/);
          if (!match) throw new Error(`Invalid requirement text syntax`);
          requirement.text = match[1];
        } else if (l.startsWith("satisfied by")) {
          requirement.satisfiedBy = l.replace("satisfied by ", "").replace(";", "").trim().split(/,\s*/);
        }
      });
    } else if (blockType === "simulation") {
      lines.forEach((l, idx) => {
        if (l.startsWith("flow ")) {
          const match = l.match(/flow\s+(\S+)\s*=\s*([^;]+)/);
          if (match) {
            ast.simulation.flows[match[1]] = parseExpression(match[2].trim());
          } else {
            console.warn(`Warning: Invalid simulation flow syntax at line ${lineNumber + idx}`);
          }
        } else if (l.startsWith("executable ")) {
          const match = l.match(/executable\s+(\w+)\s*=\s*\[([^)]+)\]/);
          if (match) {
            ast.simulation.executables[match[1]] = match[2].split(",").map(v => parseExpression(v.trim()));
          } else {
            console.warn(`Warning: Invalid simulation executable at line ${lineNumber + idx}`);
          }
        }
      });
    }
  } catch (err) {
    console.warn(`Warning: Error parsing block body at line ${lineNumber}: ${err.message}`);
  }
}

function parseParams(expr) {
  const params = [];
  try {
    const paramMatches = expr.matchAll(/(\w+)\s*:\s*(\w+)/g);
    for (const match of paramMatches) {
      params.push({ name: match[1], type: match[2] });
    }
  } catch (err) {
    console.warn(`Warning: Failed to parse parameters: ${err.message}`);
  }
  return params;
}

function parseExecutableBody(lines, lineNumber) {
  const statements = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      i++;
      continue;
    }
    try {
      if (trimmed.startsWith("let")) {
        const match = trimmed.match(/let\s+(\w+):(\w+)\s*=\s*([^}]+)/);
        if (match) {
          statements.push({ type: "Variable", name: match[1], varType: match[2], value: parseExpression(match[3]) });
        } else {
          console.warn(`Warning: Invalid variable declaration at line ${lineNumber + i}, skipping`);
        }
        i++;
      } else if (trimmed.startsWith("return")) {
        const value = trimmed.replace("return", "").replace(";", "").trim();
        statements.push({ type: "ReturnStatement", expr: parseExpression(value) });
        i++;
      } else if (trimmed.startsWith("if")) {
        const match = trimmed.match(/if\s*\(([^)]+)\)/);
        if (!match) {
          console.warn(`Warning: Invalid if statement at line ${lineNumber + i}, skipping`);
          i++;
          continue;
        }
        const condition = parseExpression(match[1]);
        let bodyLines = [];
        let braceCount = 0;
        let j = i;
        if (lines[j].includes("{")) {
          braceCount = 1;
          j++;
          while (j < lines.length && braceCount > 0) {
            const line = lines[j].trim();
            if (line === "{") braceCount++;
            else if (line === "}") braceCount--;
            if (braceCount > 0 && line) bodyLines.push(line);
            j++;
          }
        } else {
          bodyLines.push(lines[j].trim().replace(/if\s*\([^}]+}\)\s*/, ""));
          j++;
        }
        const body = parseExecutableBody(bodyLines, lineNumber + i + 1);
        let elseStmt = null;
        if (j < lines.length && lines[j].trim().startsWith("else")) {
          let elseLines = [];
          let elseBraceCount = lines[j + 1].trim() === "{" ? 1 : 0;
          j++;
          if (elseBraceCount) {
            j++;
            while (j < lines.length && elseBraceCount > 0) {
              const line = lines[j].trim();
              if (line === "{") elseBraceCount++;
              else if (line === "}") elseBraceCount--;
              if (elseBraceCount > 0 && line) elseLines.push(line);
              j++;
            }
          } else {
            elseLines.push(lines[j].trim());
            j++;
          }
          elseStmt = parseExecutableBody(elseLines, lineNumber + j);
        }
        statements.push({
          type: "IfStmt",
          condition,
          thenStmt: { type: "Block", statements: body },
          elseStmt: elseStmt ? { type: "Block", statements: elseStmt } : null
        });
        i = j;
      } else {
        i++;
      }
    } catch (err) {
      console.warn(`Warning: Error parsing executable body at line ${lineNumber + i}: ${err.message}`);
      i++;
    }
  }
  return statements;
}

function parseProtocolBody(lines) {
  const actions = [];
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    try {
      if (trimmed.startsWith("send")) {
        const match = trimmed.match(/send\s+([^;]+)\s+via\s+(\S+)/);
        if (match) {
          actions.push({ type: "Send", value: parseExpression(match[1]), port: match[2].replace(";", "") });
        } else {
          console.warn(`Warning: Invalid send action at line ${idx + 1}, skipping`);
        }
      } else if (trimmed.startsWith("receive")) {
        const match = trimmed.match(/receive\s+(\w+):(\w+)\s+from\s+(\S+)/);
        if (match) {
          actions.push({ type: "Receive", variable: match[1], type: match[2], port: match[3].replace(";", "") });
        } else {
          console.warn(`Warning: Invalid receive action at line ${idx + 1}, skipping`);
        }
      }
    } catch (err) {
      console.warn(`Warning: Error parsing protocol action at line ${idx + 1}: ${err.message}`);
    }
  });
  return actions;
}

function parseExpression(str) {
  str = str.trim();
  try {
    if (str.match(/^"[^"]*"/)) {
      return { type: "StringLiteral", value: str.slice(1, -1 )};
    } else if (str.match(/^\d+$/)) {
      return { type: "NumericLiteral", value: parseInt(str, 10) };
    } else if (str.match(/^\d+\.\d+$/)) {
      return { type: "NumericLiteral", value: parseFloat(str) };
    } else if (str.match(/^{.*}$/)) {
      const fields = [];
      const content = str.slice(1, -1).trim();
      if (content) {
        content.split(/,\s*/).forEach(field => {
          const [name, value] = field.split(":");
          if (!name || !value) throw new Error(`Invalid object field: ${field}`);
          fields.push({ name: name.trim(), value: parseExpression(value.trim()) });
        });
      }
      return { type: "ObjectLiteral", fields };
    } else if (str.includes(".")) {
      const parts = str.split(".");
      if (parts.length === 2 && parts[0].match(/^\w+$/) && parts[1].match(/^\w+$/)) {
        return { type: "FieldAccess", object: { type: "Identifier", value: parts[0] }, field: parts[1] };
      }
    } else if (str.includes("+") || str.includes("-") || str.includes("*") || str.includes("/") || str.includes("%") ||
               str.includes("<") || str.includes(">") || str.includes("<=") || str.includes(">=") ||
               str.includes("==") || str.includes("!=") || str.includes("&&") || str.includes("||")) {
      const operators = ["||", "&&", "==", "!=", "<=", ">=", "<", ">", "+", "-", "*", "/", "%"];
      const op = operators.find(o => str.includes(o));
      if (op) {
        const [left, right] = str.split(op).map(s => s.trim());
        return { type: "BinaryExpression", operator: op, left: parseExpression(left), right: parseExpression(right) };
      }
    } else if (str.match(/^\w+$/)) {
      return { type: "Identifier", value: str };
    }
    throw new Error(`Invalid expression: ${str}`);
  } catch (err) {
    console.warn(`Warning: Failed to parse expression "${str}": ${err.message}, treating as identifier`);
    return { type: "Identifier", value: str };
  }
}
export function parseParams(line) {
  return line.split(",").map(p => {
    const [name, type] = p.trim().split(":");
    return { name, type };
  }).filter(p => p.name && p.type);
}

export function parseProtocolBody(lines) {
  return lines.map(line => {
    if (line.startsWith("send ")) {
      const match = line.match(/send\s+"([^"]+)"\s+via\s+(\S+)/);
      return match ? { type: "Send", value: match[1], port: match[2].replace(";", "") } : null;
    } else if (line.startsWith("receive ")) {
      const match = line.match(/receive\s+(\w+)\s+from\s+(\S+)/);
      return match ? { type: "Receive", variable: match[1], port: match[2].replace(";", "") } : null;
    }
    return null;
  }).filter(action => action);
}

export function parseExecutableBody(lines, header) {
  const statements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    
    if (line.startsWith("let ")) {
      const match = line.match(/let\s+(\w+):(\w+)\s*=\s*([^;]+)/);
      if (match) {
        statements.push({
          type: "Let",
          name: match[1],
          varType: match[2],
          value: match[3]
        });
      }
    } else if (line.startsWith("for ")) {
      const match = line.match(/for\s*\(let\s+(\w+):(\w+)\s*=\s*([^;]+);\s*([^;]+);\s*([^)]+)\)/);
      if (match) {
        const body = [];
        let braceCount = 0;
        i++;
        while (i < lines.length && (braceCount > 0 || !lines[i].trim().startsWith("}"))) {
          const innerLine = lines[i].trim();
          if (innerLine.includes("{")) braceCount++;
          if (innerLine.includes("}")) braceCount--;
          if (innerLine) body.push(innerLine);
          i++;
        }
        statements.push({
          type: "For",
          variable: match[1],
          varType: match[2],
          init: match[3],
          condition: match[4],
          update: match[5],
          body: parseExecutableBody(body, header)
        });
        continue;
      }
    } else if (line.startsWith("if ")) {
      const match = line.match(/if\s*\(([^)]+)\)/);
      if (match) {
        const condition = match[1];
        const body = [];
        let braceCount = 0;
        i++;
        while (i < lines.length && (braceCount > 0 || !lines[i].trim().startsWith("}"))) {
          const innerLine = lines[i].trim();
          if (innerLine.includes("{")) braceCount++;
          if (innerLine.includes("}")) braceCount--;
          if (innerLine) body.push(innerLine);
          i++;
        }
        statements.push({
          type: "If",
          condition,
          body: parseExecutableBody(body, header)
        });
        continue;
      }
    } else if (line.startsWith("return ")) {
      const match = line.match(/return\s+([^;]+)/);
      if (match) {
        statements.push({
          type: "Return",
          value: match[1]
        });
      }
    } else if (line.includes("=")) {
      const match = line.match(/(\w+)\[(\w+)\]\s*=\s*([^;]+)/);
      if (match) {
        statements.push({
          type: "Assignment",
          target: match[1],
          index: match[2],
          value: match[3]
        });
      }
    }
    i++;
  }
  return statements;
}

export function parseExpression(expr) {
  const binaryMatch = expr.match(/(.+)\s*([+\-*/])\s*(.+)/);
  if (binaryMatch) {
    return {
      type: "Binary",
      left: parseExpression(binaryMatch[1].trim()),
      operator: binaryMatch[2],
      right: parseExpression(binaryMatch[3].trim())
    };
  }
  const accessMatch = expr.match(/(\w+)\.(\w+)/);
  if (accessMatch) {
    return {
      type: "Access",
      object: accessMatch[1],
      property: accessMatch[2]
    };
  }
  const numberMatch = expr.match(/^-?\d+(\.\d+)?$/);
  if (numberMatch) {
    return { type: "Literal", value: parseFloat(expr) };
  }
  return { type: "Variable", name: expr };
}
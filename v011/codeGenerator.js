function generateJavaScript(model) {
  let code = `// Simulador JavaScript gerado a partir do modelo SysADL\n`;
  code += `// Execute com Node.js: node generated.js\n`;
  code += `function simulate() {\n`;
  code += `  const state = {};\n`;
  code += `  const results = [];\n\n`;

  // Definir tipos de dados
  code += `  // Tipos de dados\n`;
  Object.entries(model.dataTypes).forEach(([name, type]) => {
    if (type.literals) {
      code += `  const ${name} = { ${type.literals.map(l => `${l}: "${l}"`).join(", ")} };\n`;
    } else if (type.fields.length > 0) {
      code += `  const ${name} = { ${type.fields.map(f => `${f.name}: null`).join(", ")} };\n`;
    } else {
      code += `  const ${name} = {};\n`;
    }
  });
  code += `\n`;

  // Inicializar portas
  code += `  // Inicialização das portas\n`;
  Object.entries(model.ports).forEach(([key, port]) => {
    const defaultValue = getDefaultValue(port.type);
    code += `  state["${key}"] = ${JSON.stringify(defaultValue)};\n`;
  });

  // Definir entradas iniciais (vazio, para edição manual)
  code += `\n  // Entradas iniciais (edite aqui)\n`;
  code += `  // Exemplo: state["Componente.porta"] = valor;\n`;
  Object.entries(model.ports).forEach(([key, port]) => {
    if (port.direction === "in") {
      code += `  // state["${key}"] = ${JSON.stringify(getDefaultValue(port.type))};\n`;
    }
  });

  // Gerar funções para executáveis
  code += `\n  // Funções executáveis\n`;
  Object.entries(model.executables).forEach(([name, exec]) => {
    code += `  function ${name}(${exec.params.map(p => p.name).join(", ")}) {\n`;
    exec.body.forEach(stmt => {
      if (stmt.type === "VariableDecl") {
        const value = stmt.value ? parseExpressionToJS(stmt.value) : JSON.stringify(getDefaultValue(stmt.type));
        code += `    let ${stmt.name} = ${value};\n`;
      } else if (stmt.type === "ReturnStatement") {
        code += `    return ${parseExpressionToJS(stmt.value)};\n`;
      } else if (stmt.type === "IfStatement") {
        code += `    if (${parseExpressionToJS(stmt.condition)}) {\n`;
        code += `      ${parseExpressionToJS(stmt.body)}\n`;
        code += `    }\n`;
      }
    });
    code += `  }\n`;
  });

  // Propagar fluxos
  code += `\n  // Propagação de fluxos\n`;
  model.flows.forEach(flow => {
    code += `  if (state["${flow.source}"] !== null) {\n`;
    code += `    state["${flow.target}"] = state["${flow.source}"];\n`;
    code += `    console.log("Fluxo ${flow.source} -> ${flow.target}: " + JSON.stringify(state["${flow.target}"]));\n`;
    code += `  }\n`;
  });

  // Gerar atividades
  code += `\n  // Execução de atividades\n`;
  Object.entries(model.activities).forEach(([name, activity]) => {
    code += `  // Atividade: ${name}\n`;
    activity.body.flows.forEach(flow => {
      code += `  if (state["${activity.name}.${flow.source}"] !== null) {\n`;
      code += `    state["${activity.name}.${flow.target}"] = state["${activity.name}.${flow.source}"];\n`;
      code += `    console.log("Fluxo interno ${activity.name}.${flow.source} -> ${activity.name}.${flow.target}: " + JSON.stringify(state["${activity.name}.${flow.target}"]));\n`;
      code += `  }\n`;
    });
    activity.body.delegations.forEach(del => {
      const action = model.actions[del.target];
      if (action) {
        const exec = Object.values(model.executables).find(e =>
          model.allocations.some(a => a.source === name && a.target === e.name)
        );
        if (exec) {
          const params = activity.inParams.map(p => `state["${activity.name}.${p.name}"] || ${JSON.stringify(getDefaultValue(p.type))}`);
          code += `  results.push({ activity: "${name}", action: "${del.target}", result: ${exec.name}(${params.join(", ")}) });\n`;
          code += `  state["${activity.name}.${del.target}"] = results[results.length - 1].result;\n`;
          code += `  console.log("Atividade ${name} executou ${del.target}: " + JSON.stringify(results[results.length - 1].result));\n`;
        }
      }
    });
  });

  // Verificar restrições
  code += `\n  // Verificação de restrições\n`;
  Object.entries(model.constraints).forEach(([name, constraint]) => {
    if (constraint.equation) {
      const expr = parseExpressionToJS(constraint.equation);
      code += `  if (!(${expr})) {\n`;
      code += `    console.error("Restrição ${name} falhou: ${constraint.equation}");\n`;
      code += `  } else {\n`;
      code += `    console.log("Restrição ${name} passou: ${constraint.equation}");\n`;
      code += `  }\n`;
    }
  });

  code += `\n  return results;\n`;
  code += `}\n\n`;
  code += `// Executar a simulação\n`;
  code += `console.log("Iniciando simulação...");\n`;
  code += `const result = simulate();\n`;
  code += `console.log("Resultado da simulação: " + JSON.stringify(result, null, 2));\n`;

  return code;

  function parseExpressionToJS(expr) {
    if (!expr) return "null";
    expr = expr.replace(/==/g, "===")
              .replace(/(\w+)->(\w+)/g, "$1.$2")
              .replace(/(\w+)::(\w+)/g, "$2")
              .replace(/types\.?(\w+)/g, "$1");
    if (expr.includes("?")) {
      const [cond, trueVal, falseVal] = expr.split(/[\?:]/).map(s => s.trim());
      return `(${parseExpressionToJS(cond)}) ? ${parseExpressionToJS(trueVal)} : ${parseExpressionToJS(falseVal)}`;
    }
    if (expr.includes("&&")) {
      const [left, right] = expr.split("&&").map(s => s.trim());
      return `${parseExpressionToJS(left)} && ${parseExpressionToJS(right)}`;
    }
    if (expr.includes("/")) {
      const [left, right] = expr.split("/").map(s => s.trim());
      return `(${parseExpressionToJS(left)}) / (${parseExpressionToJS(right)})`;
    }
    if (expr.includes("+")) {
      const [left, right] = expr.split("+").map(s => s.trim());
      return `(${parseExpressionToJS(left)}) + (${parseExpressionToJS(right)})`;
    }
    return expr;
  }
}
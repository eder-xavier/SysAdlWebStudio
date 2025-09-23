// sysadl-parser.js

// Funções de parsing mais robustas e genéricas

function parseParams(line) {
    const params = [];
    // Remove "in " e "out " antes de tentar parsear os parâmetros
    const cleanedLine = line.replace(/in\s+/g, '').replace(/out\s+/g, '');
    // Captura múltiplos parâmetros separados por vírgula
    const paramMatches = cleanedLine.matchAll(/(\w+):(\w+)/g);
    for (const match of paramMatches) {
        params.push({ name: match[1], type: match[2] });
    }
    return params;
}

function parseExecutableBody(lines) {
    const statements = [];
    // Um mini-parser recursivo para lidar com blocos e aninhamentos
    let i = 0;
    while (i < lines.length) {
        const trimmed = lines[i].trim();

        if (trimmed.startsWith("let")) {
            const match = trimmed.match(/let\s+(\w+):(\w+)\s*=\s*([^;]+);?/);
            if (match) {
                const [, name, type, valueStr] = match;
                statements.push({
                    type: "VariableDecl",
                    name,
                    type,
                    value: parseExpression(valueStr)
                });
            } else {
                console.warn("Could not parse VariableDecl:", trimmed);
            }
        } else if (trimmed.startsWith("return")) {
            const value = trimmed.replace("return", "").replace(";", "").trim();
            statements.push({
                type: "ReturnStatement",
                value: parseExpression(value)
            });
        } else if (trimmed.startsWith("if")) {
            const ifMatch = trimmed.match(/if\s*\(([^)]+)\)\s*(.*)/);
            if (ifMatch) {
                const conditionStr = ifMatch[1];
                const restOfLine = ifMatch[2].trim();
                let ifBody = [];
                let elseBody = [];
                let elseIfStatements = []; // Para `else if`

                if (restOfLine === '{') {
                    // Body is a block
                    let blockDepth = 1;
                    let j = i + 1;
                    while (j < lines.length && blockDepth > 0) {
                        const innerLine = lines[j].trim();
                        if (innerLine === '{') blockDepth++;
                        if (innerLine === '}') blockDepth--;
                        if (blockDepth > 0) ifBody.push(innerLine);
                        j++;
                    }
                    i = j - 1; // Move index past the current block
                } else if (restOfLine.endsWith(';')) {
                    // Single statement body
                    ifBody.push(restOfLine.replace(/;$/, ''));
                } else {
                    // It's a single statement without braces, assume next line is body
                    ifBody.push(lines[++i].trim().replace(/;$/, ''));
                }

                // Check for 'else if' or 'else' immediately following
                let nextLineIndex = i + 1;
                while (nextLineIndex < lines.length) {
                    const nextLineTrimmed = lines[nextLineIndex].trim();
                    if (nextLineTrimmed.startsWith('else if')) {
                        const elseIfMatch = nextLineTrimmed.match(/else if\s*\(([^)]+)\)\s*(.*)/);
                        if (elseIfMatch) {
                            const elseIfConditionStr = elseIfMatch[1];
                            const elseIfRestOfLine = elseIfMatch[2].trim();
                            let currentElseIfBody = [];

                            if (elseIfRestOfLine === '{') {
                                let blockDepth = 1;
                                let j = nextLineIndex + 1;
                                while (j < lines.length && blockDepth > 0) {
                                    const innerLine = lines[j].trim();
                                    if (innerLine === '{') blockDepth++;
                                    if (innerLine === '}') blockDepth--;
                                    if (blockDepth > 0) currentElseIfBody.push(innerLine);
                                    j++;
                                }
                                nextLineIndex = j - 1;
                            } else if (elseIfRestOfLine.endsWith(';')) {
                                currentElseIfBody.push(elseIfRestOfLine.replace(/;$/, ''));
                            } else {
                                currentElseIfBody.push(lines[++nextLineIndex].trim().replace(/;$/, ''));
                            }
                            elseIfStatements.push({
                                type: "IfStatement",
                                condition: parseExpression(elseIfConditionStr),
                                body: parseExecutableBody(currentElseIfBody)
                            });
                        }
                    } else if (nextLineTrimmed.startsWith('else')) {
                        const elseMatch = nextLineTrimmed.match(/else\s*(.*)/);
                        if (elseMatch) {
                            const elseRestOfLine = elseMatch[1].trim();
                            if (elseRestOfLine === '{') {
                                let blockDepth = 1;
                                let j = nextLineIndex + 1;
                                while (j < lines.length && blockDepth > 0) {
                                    const innerLine = lines[j].trim();
                                    if (innerLine === '{') blockDepth++;
                                    if (innerLine === '}') blockDepth--;
                                    if (blockDepth > 0) elseBody.push(innerLine);
                                    j++;
                                }
                                nextLineIndex = j - 1;
                            } else if (elseRestOfLine.endsWith(';')) {
                                elseBody.push(elseRestOfLine.replace(/;$/, ''));
                            } else {
                                elseBody.push(lines[++nextLineIndex].trim().replace(/;$/, ''));
                            }
                        }
                        break; // 'else' é o último bloco condicional
                    } else if (nextLineTrimmed === '}') { // End of a previous block
                        break;
                    } else if (!nextLineTrimmed) { // Skip empty lines
                        // Do nothing, continue loop
                    } else { // Next line is not an 'else if' or 'else'
                        break;
                    }
                    nextLineIndex++;
                }
                i = nextLineIndex - 1; // Update outer loop index

                statements.push({
                    type: "IfBlockStatement",
                    main_if: {
                        type: "IfStatement",
                        condition: parseExpression(conditionStr),
                        body: parseExecutableBody(ifBody) // Recursivamente parsear o corpo
                    },
                    else_ifs: elseIfStatements.length > 0 ? elseIfStatements : undefined,
                    else: elseBody.length > 0 ? { type: "ElseStatement", body: parseExecutableBody(elseBody) } : undefined
                });
            } else {
                console.warn("Could not parse IfStatement:", trimmed);
            }
        }
        i++;
    }
    return statements;
}


function parseProtocolBody(lines) {
    const actions = [];
    lines.forEach(line => {
        const trimmed = line.trim();
        // A gramática SysADL diz: 'send' expression=Expression 'via' flowTo=[Pin|QualifiedName]
        // E: 'receive' var=TypeUse 'from' flowTo=[Pin|QualifiedName]
        if (trimmed.startsWith("send")) {
            const match = trimmed.match(/send\s+(.+)\s+via\s+(\S+);?/);
            if (match) {
                const valueStr = match[1].trim();
                const port = match[2].replace(";", "").trim();
                actions.push({ type: "Send", value: parseExpression(valueStr), port: port });
            } else {
                 console.warn("Could not parse send action:", trimmed);
            }
        } else if (trimmed.startsWith("receive")) {
            const match = trimmed.match(/receive\s+(\w+:\w+)\s+from\s+(\S+);?/); // var é TypeUse, ex: temp:Temperature
            if (match) {
                const varDef = match[1].trim(); // ex: temp:Temperature
                const port = match[2].replace(";", "").trim();
                const [varName, varType] = varDef.split(':');
                actions.push({ type: "Receive", variable: {name: varName, type: varType}, port: port });
            } else {
                console.warn("Could not parse receive action:", trimmed);
            }
        }
    });
    return actions;
}

// Função de parsing de expressão para criar uma AST simples
function parseExpression(str) {
    str = str.trim();

    // 1. Literais
    if (str.match(/^"[^"]*"/)) { // String literal
        return { type: "Literal", value: str.slice(1, -1) };
    } else if (str.match(/^\d+(\.\d+)?$/)) { // Numeric literal (Int or Float)
        return { type: "Literal", value: parseFloat(str) };
    } else if (str === "true") {
        return { type: "Literal", value: true };
    } else if (str === "false") {
        return { type: "Literal", value: false };
    } else if (str === "null") {
        return { type: "Literal", value: null };
    } else if (str.match(/^{.*}$/)) { // Object literal (for complex types)
        try {
            // Regex para adicionar aspas em chaves se não tiverem
            const jsonString = str.replace(/(\w+):/g, '"$1":');
            return { type: "ObjectLiteral", value: JSON.parse(jsonString) };
        } catch (e) {
            console.error("Error parsing object literal:", str, e);
            return { type: "Literal", value: null }; // Fallback
        }
    }

    // 2. Enum Value Literal (ex: HEATING, COOLING, OFF)
    // Assumir que se for uma palavra maiúscula não em aspas, é um enum literal.
    // Ou podemos verificar se existe em alguma enumeração definida no sysadlModel.
    // Por simplicidade, para o exemplo ControlMode, vamos considerar como literal string por enquanto.
    // Para um parser completo, precisaríamos de um lookup nas enums.
    // if (sysadlModel.dataTypes && Object.values(sysadlModel.dataTypes).some(dt => dt.name === str && dt instanceof SysADLEnumeration)) {
    // Para o ControlMode, que está no exemplo, ele não é um TypeDef diretamente, mas um Enum.
    // Vamos considerar que se é uma palavra pura e não é uma variável conhecida, pode ser um enum literal.
    // Uma forma mais robusta seria ter um registro de todos os literais de enum.
    const enumLiterals = ["HEATING", "COOLING", "OFF"]; // Exemplo de literais de enum
    if (enumLiterals.includes(str)) {
        return { type: "Literal", value: str }; // Retorna o valor da enumeração como string
    }

    // 3. Expressões Parentesadas (para precedência)
    if (str.startsWith('(') && str.endsWith(')')) {
        return { type: "ParenthesizedExpression", value: parseExpression(str.slice(1, -1)) };
    }

    // 4. Operadores Binários (da menor para a maior precedência)
    // Ordem de precedência: ||, &&, ==, !=, >, <, >=, <=, +, -
    const operators = [
        /\s*\|\|\s*/, // Conditional Or
        /\s*&&\s*/, // Conditional And
        /\s*implies\s*/, // Conditional Implies (adicionado, conforme gramática)
        /\s*==\s*/, // Equality
        /\s*!=\s*/, // Different
        /\s*>=\s*/, // Greater than or Equal
        /\s*<=\s*/, // Less than or Equal
        /\s*>\s*/, // Greater than
        /\s*<\s*/, // Less than
        /\s*\+\s*/, // Additive
        /\s*-\s*/  // Subtraction
        // Multiplicativo e outros seriam aqui, mas não estão no exemplo atual
    ];

    for (const opRegex of operators) {
        // Encontra o último operador para garantir associatividade à direita para alguns
        // e à esquerda para outros, mas simplificaremos para a primeira ocorrência.
        // Para uma análise de precedência e associatividade completa, um parser shunting-yard
        // ou recursivo descendente seria necessário.
        const parts = str.split(opRegex);
        if (parts.length > 1) {
            // Reconstroi o operador usado, pois split pode perder o separador
            const operator = str.match(opRegex)?.[0].trim();
            const lastPart = parts.pop();
            const rest = parts.join(operator); // Junta o resto da expressão

            return {
                type: "BinaryExpression",
                operator: operator,
                left: parseExpression(rest),
                right: parseExpression(lastPart)
            };
        }
    }

    // 5. Acesso a Membros (FieldAccess ou DataTypeAccess)
    // Ex: Controller.temp.value
    if (str.includes(".")) {
        const parts = str.split(".");
        // Assumindo que a primeira parte é uma variável ou nome de componente/porta
        let current = { type: "Variable", value: parts[0] };
        for (let i = 1; i < parts.length; i++) {
            current = { type: "FieldAccess", object: current, field: parts[i] };
        }
        return current;
    }

    // 6. Variáveis Simples
    return { type: "Variable", value: str };
}
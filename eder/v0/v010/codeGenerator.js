function generateJS(ast) {
    let jsCode = '// Generated JavaScript from SysADL\n';

    // Map types
    const typeMap = {
        'Int': 'number',
        'Boolean': 'boolean',
        'String': 'string',
        'Real': 'number',
        'CelsiusTemperature': 'CelsiusTemperature',
        'FahrenheitTemperature': 'FahrenheitTemperature',
        'Command': 'Command',
        'Commands': 'Commands',
        'Location': 'Location',
        'Status': 'Status',
        'VehicleData': 'VehicleData'
    };

    // Executables
    const executables = ast.children.executableDef || [];
    executables.forEach(exec => {
        const name = exec.children.executableName[0].image;
        const params = exec.children.parameter || [];
        const returnType = exec.children.returnType[0].image;

        jsCode += `function ${name}(${params.map(p => p.children.paramName[0].image).join(', ')}) {\n`;
        
        const body = exec.children.statement || [];
        body.forEach(stmt => {
            if (stmt.children.returnStatement) {
                const expr = stmt.children.returnStatement[0].children.expression[0];
                jsCode += `    return ${generateExpression(expr, returnType)};\n`;
            } else if (stmt.children.ifStatement) {
                const ifStmt = stmt.children.ifStatement[0];
                const condition = generateExpression(ifStmt.children.expression[0]);
                const thenStmt = ifStmt.children.thenStmt[0];
                jsCode += `    if (${condition}) {\n`;
                if (thenStmt.children.returnStatement) {
                    jsCode += `        return ${generateExpression(thenStmt.children.returnStatement[0].children.expression[0], returnType)};\n`;
                }
                if (ifStmt.children.elseStmt) {
                    const elseStmt = ifStmt.children.elseStmt[0];
                    jsCode += `    } else {\n`;
                    if (elseStmt.children.returnStatement) {
                        jsCode += `        return ${generateExpression(elseStmt.children.returnStatement[0].children.expression[0], returnType)};\n`;
                    }
                    jsCode += `    }\n`;
                } else {
                    jsCode += `    }\n`;
                }
            } else if (stmt.children.variableDecl) {
                const varDecl = stmt.children.variableDecl[0];
                const varName = varDecl.children.varName[0].image;
                const initExpr = varDecl.children.expression ? generateExpression(varDecl.children.expression[0]) : 'null';
                jsCode += `    let ${varName} = ${initExpr};\n`;
            }
        });

        jsCode += `}\n\n`;
    });

    // Função de simulação
    jsCode += `function simulateSysADL(inputs) {\n`;
    jsCode += `    const results = {};\n`;
    executables.forEach(exec => {
        const name = exec.children.executableName[0].image;
        const params = exec.children.parameter || [];
        jsCode += `    results.${name} = ${name}(${params.map(p => `inputs.${p.children.paramName[0].image}`).join(', ')});\n`;
    });
    jsCode += `    return results;\n`;
    jsCode += `}\n`;

    return jsCode;
}

function generateExpression(expr, returnType) {
    if (expr.children.Identifier) {
        let id = expr.children.Identifier[0].image;
        if (id.includes('::')) {
            return `"${id.split('::')[1]}"`;
        } else if (id.includes('->')) {
            const [obj, prop] = id.split('->');
            return `${obj}.${prop}`;
        } else if (id === 'f' && returnType === 'CelsiusTemperature') {
            return `convertFahrenheitToCelsius(${id})`;
        }
        return id;
    } else if (expr.children.Integer) {
        return expr.children.Integer[0].image;
    } else if (expr.children.StringLiteral) {
        return expr.children.StringLiteral[0].image;
    } else if (expr.children.LParen) {
        return `(${generateExpression(expr.children.expression[0], returnType)})`;
    } else if (expr.children.addOp) {
        const left = generateExpression(expr.children.term[0]);
        const right = generateExpression(expr.children.term[1]);
        const op = expr.children.addOp[0].image;
        return `${left} ${op} ${right}`;
    } else if (expr.children.mulOp) {
        const left = generateExpression(expr.children.factor[0]);
        const right = generateExpression(expr.children.factor[1]);
        const op = expr.children.mulOp[0].image;
        return `${left} ${op} ${right}`;
    }
    return '';
}
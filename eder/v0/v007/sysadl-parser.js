function parseParams(line) {
    const params = [];
    if (!line) return params;
    const paramMatches = line.matchAll(/(\w+):(\w+)/g);
    for (const match of paramMatches) {
        params.push({ name: match[1], type: match[2] });
    }
    return params;
}

function parseExecutableBody(lines) {
    const statements = [];
    let i = 0;
    while (i < lines.length) {
        const trimmed = lines[i].trim();
        if (!trimmed) {
            i++;
            continue;
        }
        if (trimmed.startsWith("let")) {
            const match = trimmed.match(/let\s+(\w+):(\w+)\s*=\s*([^;]+)/);
            if (match) {
                const [, name, type, value] = match;
                statements.push({ type: "VariableDecl", name, type, value: parseExpression(value) });
            }
        } else if (trimmed.startsWith("return")) {
            const value = trimmed.replace("return", "").replace(/;/, "").trim();
            statements.push({ type: "ReturnStatement", value: parseExpression(value) });
        } else if (trimmed.startsWith("if")) {
            const match = trimmed.match(/if\s*\(([^)]+)\)/);
            if (!match) {
                console.error(`Invalid if statement: ${trimmed}`);
                i++;
                continue;
            }
            const condition = match[1];
            const body = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith("}")) {
                body.push(lines[i].trim());
                i++;
            }
            statements.push({
                type: "IfStatement",
                condition: parseExpression(condition),
                body: parseExecutableBody(body)
            });
        } else if (trimmed.startsWith("else if")) {
            const match = trimmed.match(/else if\s*\(([^)]+)\)/);
            if (!match) {
                console.error(`Invalid else if statement: ${trimmed}`);
                i++;
                continue;
            }
            const condition = match[1];
            const body = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith("}")) {
                body.push(lines[i].trim());
                i++;
            }
            statements.push({
                type: "ElseIfStatement",
                condition: parseExpression(condition),
                body: parseExecutableBody(body)
            });
        } else if (trimmed.startsWith("else")) {
            const body = [];
            i++;
            while (i < lines.length && !lines[i].trim().startsWith("}")) {
                body.push(lines[i].trim());
                i++;
            }
            statements.push({
                type: "ElseStatement",
                body: parseExecutableBody(body)
            });
        }
        i++;
    }
    return statements;
}

function parseExpression(str) {
    str = str.trim();
    if (str.match(/^"[^"]+"$/)) {
        return { type: "Literal", value: str.slice(1, -1) };
    } else if (str.match(/^\d+$/)) {
        return { type: "Literal", value: parseInt(str, 10) };
    } else if (str.match(/^\d+\.\d+$/)) {
        return { type: "Literal", value: parseFloat(str) };
    } else if (str.match(/^{.*}$/)) {
        return { type: "Object", value: JSON.parse(str.replace(/(\w+):/g, '"$1":')) };
    } else if (str.includes(".")) {
        const [obj, field] = str.split(".");
        return { type: "FieldAccess", object: parseExpression(obj), field };
    } else if (str.includes("+")) {
        const [left, right] = str.split("+").map(s => s.trim());
        return {
            type: "Binary",
            operator: "+",
            left: parseExpression(left),
            right: parseExpression(right)
        };
    } else if (str.includes("-")) {
        const [left, right] = str.split("-").map(s => s.trim());
        return {
            type: "Binary",
            operator: "-",
            left: parseExpression(left),
            right: parseExpression(right)
        };
    } else if (str.includes(">")) {
        const [left, right] = str.split(">").map(s => s.trim());
        return {
            type: "Binary",
            operator: ">",
            left: parseExpression(left),
            right: parseExpression(right)
        };
    } else if (str.includes("<")) {
        const [left, right] = str.split("<").map(s => s.trim());
        return {
            type: "Binary",
            operator: "<",
            left: parseExpression(left),
            right: parseExpression(right)
        };
    } else if (str.includes("==")) {
        const [left, right] = str.split("==").map(s => s.trim());
        return {
            type: "Binary",
            operator: "==",
            left: parseExpression(left),
            right: parseExpression(right)
        };
    } else if (str.includes("!=")) {
        const [left, right] = str.split("!=").map(s => s.trim());
        return {
            type: "Binary",
            operator: "!=",
            left: parseExpression(left),
            right: parseExpression(right)
        };
    } else if (str.includes("&&")) {
        const [left, right] = str.split("&&").map(s => s.trim());
        return {
            type: "Binary",
            operator: "&&",
            left: parseExpression(left),
            right: parseExpression(right)
        };
    } else if (str.includes("||")) {
        const [left, right] = str.split("||").map(s => s.trim());
        return {
            type: "Binary",
            operator: "||",
            left: parseExpression(left),
            right: parseExpression(right)
        };
    } else if (["HEATING", "COOLING", "OFF"].includes(str)) {
        return { type: "EnumLiteral", value: str };
    }
    return { type: "Variable", value: str };
}
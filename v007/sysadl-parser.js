// sysadl-parser.js

function parseParams(line) {
    const params = [];
    const paramMatches = line.matchAll(/(\w+):(\w+)/g);
    for (const match of paramMatches) {
        params.push({ name: match[1], type: match[2] });
    }
    return params;
}

function parseExecutableBody(lines) {
    const statements = [];
    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith("let")) {
            const match = trimmed.match(/let\s+(\w+):(\w+)\s*=\s*([^;]+)/);
            if (match) {
                const [, name, type, value] = match;
                statements.push({
                    type: "VariableDecl",
                    name,
                    type,
                    value: parseExpression(value)
                });
            }
        } else if (trimmed.startsWith("return")) {
            const value = trimmed.replace("return", "").replace(";", "").trim();
            statements.push({
                type: "ReturnStatement",
                value: parseExpression(value)
            });
        }
    });
    return statements;
}

function parseProtocolBody(lines) {
    const actions = [];
    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith("send")) {
            const match = trimmed.match(/send\s+(\S+)\s+via\s+(\S+)/);
            if (match) {
                let value = match[1];
                // Try to parse value if it's a literal or object
                try {
                    value = JSON.parse(value.replace(/(\w+):/g, '"$1":'));
                } catch (e) {
                    // Not JSON, keep as string or try number
                    if (!isNaN(value) && !isNaN(parseFloat(value))) {
                        value = parseFloat(value);
                    } else if (value.startsWith('"') && value.endsWith('"')) {
                         value = value.slice(1, -1);
                    }
                }
                actions.push({ type: "Send", value: value, port: match[2].replace(";", "") });
            }
        } else if (trimmed.startsWith("receive")) {
            const match = trimmed.match(/receive\s+(\w+)\s+from\s+(\S+)/);
            if (match) {
                actions.push({ type: "Receive", variable: match[1], port: match[2].replace(";", "") });
            }
        }
    });
    return actions;
}

function parseExpression(str) {
    str = str.trim();
    if (str.match(/^"[^"]*"/)) {
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
    } else if (str.includes("-")) { // Adicionado para operações de subtração
        const [left, right] = str.split("-").map(s => s.trim());
        return {
            type: "Binary",
            operator: "-",
            left: parseExpression(left),
            right: parseExpression(right)
        };
    } else if (str.includes(">")) { // Adicionado para operações de comparação
        const [left, right] = str.split(">").map(s => s.trim());
        return {
            type: "Binary",
            operator: ">",
            left: parseExpression(left),
            right: parseExpression(right)
        };
    } else if (str.includes("<")) { // Adicionado para operações de comparação
        const [left, right] = str.split("<").map(s => s.trim());
        return {
            type: "Binary",
            operator: "<",
            left: parseExpression(left),
            right: parseExpression(right)
        };
    } else if (str.includes("==")) { // Adicionado para operações de igualdade
        const [left, right] = str.split("==").map(s => s.trim());
        return {
            type: "Binary",
            operator: "==",
            left: parseExpression(left),
            right: parseExpression(right)
        };
    } else if (str.includes("!=")) { // Adicionado para operações de diferença
        const [left, right] = str.split("!=").map(s => s.trim());
        return {
            type: "Binary",
            operator: "!=",
            left: parseExpression(left),
            right: parseExpression(right)
        };
    } else {
        return { type: "Variable", value: str };
    }
}
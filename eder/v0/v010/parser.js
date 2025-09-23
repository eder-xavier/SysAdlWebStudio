const { createToken, Lexer, CstParser } = chevrotain;

// Tokens
const Identifier = createToken({ name: "Identifier", pattern: /[a-zA-Z]\w*/ });
const Integer = createToken({ name: "Integer", pattern: /\d+/ });
const StringLiteral = createToken({ name: "StringLiteral", pattern: /"[^"]*"/ });
const LCurly = createToken({ name: "LCurly", pattern: /{/ });
const RCurly = createToken({ name: "RCurly", pattern: /}/ });
const Semicolon = createToken({ name: "Semicolon", pattern: /;/ });
const Colon = createToken({ name: "Colon", pattern: /:/ });
const Equal = createToken({ name: "Equal", pattern: /=/ });
const WhiteSpace = createToken({ name: "WhiteSpace", pattern: /\s+/, group: Lexer.SKIPPED });
// Added 'to' to the Keyword pattern
const Keyword = createToken({ name: "Keyword", pattern: /(Model|package|value|type|enum|datatype|dimension|unit|port|def|connector|component|constraint|activity|action|executable|allocations|flow|in|out|inout|boundary|configuration|components|connectors|delegations|using|ports|bindings|return|if|else|let|to)/ });
const Operator = createToken({ name: "Operator", pattern: /(==|!=|>|<|>=|<=|\+|-|\*|\/|&&|\->|::)/ });
const LParen = createToken({ name: "LParen", pattern: /\(/ });
const RParen = createToken({ name: "RParen", pattern: /\)/ });

const allTokens = [WhiteSpace, Identifier, Integer, StringLiteral, LCurly, RCurly, Semicolon, Colon, Equal, Keyword, Operator, LParen, RParen];
const lexer = new Lexer(allTokens);

class SysADLParser extends CstParser {
    constructor() {
        super(allTokens);
        const $ = this;

        $.RULE("model", () => {
            $.CONSUME(Keyword, { LABEL: "modelKeyword" });
            $.CONSUME(Identifier, { LABEL: "modelName" });
            $.CONSUME(Semicolon);
            $.MANY(() => $.SUBRULE(this.packageDef)); // Missing closing parenthesis
            $.OPTION(() => $.SUBRULE(this.allocationTable));
        });

        $.RULE("packageDef", () => {
            $.CONSUME(Keyword, { LABEL: "packageKeyword" });
            $.CONSUME(Identifier, { LABEL: "packageName" });
            $.CONSUME(LCurly);
            $.MANY(() => {
                $.OR([
                    { ALT: () => $.SUBRULE(this.typeDef) },
                    { ALT: () => $.SUBRULE(this.componentDef) },
                    { ALT: () => $.SUBRULE(this.constraintDef) },
                    { ALT: () => $.SUBRULE(this.executableDef) },
                    { ALT: () => $.SUBRULE(this.activityDef) },
                    { ALT: () => $.SUBRULE(this.actionDef) }
                ]);
            });
            $.CONSUME(RCurly);
        });

        $.RULE("typeDef", () => {
            $.CONSUME(Keyword, { LABEL: "typeKeyword" });
            $.CONSUME(Identifier, { LABEL: "typeName" });
            $.CONSUME(LCurly);
            $.MANY(() => $.SUBRULE(this.property));
            $.CONSUME(RCurly);
        });

        $.RULE("componentDef", () => {
            $.OPTION(() => $.CONSUME(Keyword, { LABEL: "boundaryKeyword" })); // Incorrect OPTION usage
            $.CONSUME(Keyword, { LABEL: "componentKeyword" });
            $.CONSUME(Identifier, { LABEL: "componentName" });
            $.CONSUME(LCurly);
            $.OPTION(() => $.SUBRULE(this.configuration, { LABEL: "config" })); // Incorrect OPTION usage
            $.CONSUME(RCurly);
        });

        $.RULE("constraintDef", () => {
            $.CONSUME(Keyword, { LABEL: "constraintKeyword" });
            $.CONSUME(Identifier, { LABEL: "constraintName" });
            $.CONSUME(LParen);
            $.MANY_SEP({
                SEP: Semicolon,
                DEF: () => $.SUBRULE(this.parameter)
            });
            $.CONSUME(RParen);
            $.CONSUME(LCurly);
            $.OPTION(() => { // Incorrect OPTION usage
                $.CONSUME(Equal);
                $.SUBRULE(this.expression);
            });
            $.CONSUME(RCurly);
        });

        $.RULE("executableDef", () => {
            $.CONSUME(Keyword, { LABEL: "executableKeyword" }); // Missing closing parenthesis
            $.CONSUME(Identifier, { LABEL: "executableName" }); // Missing closing parenthesis
            $.CONSUME(LParen);
            $.MANY_SEP({
                SEP: Semicolon,
                DEF: () => $.SUBRULE(this.parameter)
            });
            $.CONSUME(RParen);
            $.CONSUME(Colon);
            $.CONSUME(Identifier, { LABEL: "returnType" }); // Missing closing parenthesis
            $.CONSUME(LCurly);
            $.MANY(() => $.SUBRULE(this.statement));
            $.CONSUME(RCurly);
        });

        $.RULE("activityDef", () => {
            $.CONSUME(Keyword, { LABEL: "activityKeyword" });
            $.CONSUME(Identifier, { LABEL: "activityName" });
            $.CONSUME(LParen);
            $.MANY_SEP({
                SEP: Semicolon,
                DEF: () => $.SUBRULE(this.parameter)
            });
            $.CONSUME(RParen);
            $.CONSUME(LCurly);
            $.OPTION(() => $.SUBRULE(this.body)); // Incorrect OPTION usage
            $.CONSUME(RCurly);
        });

        $.RULE("actionDef", () => {
            $.CONSUME(Keyword, { LABEL: "actionKeyword" });
            $.CONSUME(Identifier, { LABEL: "actionName" });
            $.CONSUME(LParen);
            $.MANY_SEP({
                SEP: Semicolon,
                DEF: () => $.SUBRULE(this.parameter)
            });
            $.CONSUME(RParen);
            $.CONSUME(Colon);
            $.CONSUME(Identifier, { LABEL: "returnType" });
            $.CONSUME(LCurly);
            $.OPTION(() => $.SUBRULE(this.constraint)); // Incorrect OPTION usage
            $.CONSUME(RCurly);
        });

        $.RULE("parameter", () => {
            $.CONSUME(Identifier, { LABEL: "paramName" });
            $.CONSUME(Colon);
            $.CONSUME(Identifier, { LABEL: "paramType" });
        });

        $.RULE("statement", () => {
            $.OR([
                { ALT: () => $.SUBRULE(this.returnStatement) },
                { ALT: () => $.SUBRULE(this.ifStatement) },
                { ALT: () => $.SUBRULE(this.variableDecl) }
            ]);
        });

        $.RULE("returnStatement", () => {
            $.CONSUME(Keyword, { LABEL: "returnKeyword" });
            $.SUBRULE(this.expression);
            $.CONSUME(Semicolon);
        });

        $.RULE("ifStatement", () => {
            $.CONSUME(Keyword, { LABEL: "ifKeyword" });
            $.CONSUME(LParen);
            $.SUBRULE(this.expression);
            $.CONSUME(RParen);
            $.SUBRULE(this.statement, { LABEL: "thenStmt" });
            $.OPTION(() => { // Incorrect OPTION usage
                $.CONSUME(Keyword, { LABEL: "elseKeyword" });
                $.SUBRULE2(this.statement, { LABEL: "elseStmt" });
            });
        });

        $.RULE("variableDecl", () => {
            $.CONSUME(Keyword, { LABEL: "letKeyword" });
            $.CONSUME(Identifier, { LABEL: "varName" });
            $.CONSUME(Colon);
            $.CONSUME(Identifier, { LABEL: "varType" });
            $.OPTION(() => { // Incorrect OPTION usage
                $.CONSUME(Equal);
                $.SUBRULE(this.expression);
            });
            $.CONSUME(Semicolon);
        });

        // Expressões hierárquicas para evitar recursão à esquerda
        $.RULE("expression", () => {
            $.SUBRULE(this.term);
            $.MANY(() => {
                $.CONSUME(Operator, { LABEL: "addOp" });
                $.SUBRULE2(this.term);
            });
        });

        $.RULE("term", () => {
            $.SUBRULE(this.factor);
            $.MANY(() => {
                $.CONSUME(Operator, { LABEL: "mulOp" });
                $.SUBRULE2(this.factor);
            });
        });

        $.RULE("factor", () => {
            $.OR([
                { ALT: () => $.CONSUME(Identifier) },
                { ALT: () => $.CONSUME(Integer) },
                { ALT: () => $.CONSUME(StringLiteral) },
                { ALT: () => {
                    $.CONSUME(LParen);
                    $.SUBRULE(this.expression);
                    $.CONSUME(RParen);
                }}
            ]);
        });

        $.RULE("property", () => {
            $.CONSUME(Keyword, { LABEL: "propertyKeyword" });
            $.CONSUME(Identifier, { LABEL: "propertyName" });
            $.CONSUME(Colon);
            $.CONSUME(Identifier, { LABEL: "propertyType" });
            $.CONSUME(Semicolon);
        });

        $.RULE("configuration", () => {
            $.CONSUME(Keyword, { LABEL: "configurationKeyword" });
            $.CONSUME(LCurly);
            $.MANY(() => $.SUBRULE(this.componentUse));
            $.CONSUME(RCurly);
        });

        $.RULE("componentUse", () => {
            $.CONSUME(Identifier, { LABEL: "componentUseName" });
            $.CONSUME(Colon);
            $.CONSUME(Identifier, { LABEL: "componentType" });
            $.CONSUME(Semicolon);
        });

        $.RULE("allocationTable", () => {
            $.CONSUME(Keyword, { LABEL: "allocationsKeyword" });
            $.CONSUME(LCurly);
            $.MANY(() => $.SUBRULE(this.allocation));
            $.CONSUME(RCurly);
        });

        $.RULE("allocation", () => {
            $.OR([
                { ALT: () => $.SUBRULE(this.executableAllocation) },
                { ALT: () => $.SUBRULE(this.activityAllocation) }
            ]);
        });

        $.RULE("executableAllocation", () => {
            $.CONSUME(Keyword, { LABEL: "executableKeyword" });
            $.CONSUME(Identifier, { LABEL: "source" });
            $.CONSUME(Keyword, { LABEL: "toKeyword" }); // Using the 'toKeyword' for clarity
            $.CONSUME(Identifier, { LABEL: "target" });
        });

        $.RULE("activityAllocation", () => {
            $.CONSUME(Keyword, { LABEL: "activityKeyword" });
            $.CONSUME(Identifier, { LABEL: "source" });
            $.CONSUME(Keyword, { LABEL: "toKeyword" }); // Using the 'toKeyword' for clarity
            $.CONSUME(Identifier, { LABEL: "target" });
        });

        $.RULE("body", () => {
            $.CONSUME(Keyword, { LABEL: "bodyKeyword" });
            $.CONSUME(LCurly);
            $.MANY(() => $.SUBRULE(this.actionUse));
            $.CONSUME(RCurly);
        });

        $.RULE("actionUse", () => {
            $.CONSUME(Identifier, { LABEL: "actionName" });
            $.CONSUME(Colon);
            $.CONSUME(Identifier, { LABEL: "actionType" });
            $.CONSUME(Semicolon);
        });

        $.RULE("constraint", () => {
            $.CONSUME(Keyword, { LABEL: "constraintKeyword" });
            $.CONSUME(Colon);
            $.CONSUME(Identifier, { LABEL: "constraintType" });
            $.CONSUME(Identifier, { LABEL: "constraintName" });
        });

        this.performSelfAnalysis();
    }
}

const parser = new SysADLParser();

function parseSysADL(code) {
    const lexResult = lexer.tokenize(code);
    parser.input = lexResult.tokens;
    const cst = parser.model();
    const errors = parser.errors;

    let log = '';
    if (errors.length > 0) {
        log = errors.map(e => `Error at line ${e.token.startLine}: ${e.message}`).join('\n');
    } else {
        log = 'Parsing successful!\n' + JSON.stringify(cst, null, 2);
    }

    return { log, ast: cst };
}
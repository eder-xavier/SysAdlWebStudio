// Verificar se as bibliotecas estão carregadas
if (!window.Lezer || !window.CodeMirror) {
    console.error("Bibliotecas Lezer ou CodeMirror não carregadas. Verifique os scripts no index.html.");
    document.getElementById("logOutput").textContent = "Erro: Bibliotecas Lezer ou CodeMirror não carregadas.";
    throw new Error("Bibliotecas Lezer ou CodeMirror não carregadas.");
}

// Definir a gramática SysADL
const sysadlGrammar = `
@top Program { (Model | Package | Component | Port | Connector | Activity | Constraint | Executable | Allocation)* }

Model { "Model" Identifier ";" }
Package { "package" Identifier "{" (TypeDef | Port | Connector | Component | Constraint | Activity | Executable | Allocation)* "}" }
TypeDef { ValueType | Enum | DataType }
ValueType { "value" "type" Identifier ("extends" Identifier)? "{" ("unit" "=" Identifier)? ("dimension" "=" Identifier)? Property* "}" }
Enum { "enum" Identifier "{" Identifier ("," Identifier)* "}" }
DataType { "datatype" Identifier "{" "attributes" ":" TypeUse* "}" }
TypeUse { Identifier ":" Identifier }

Port { "port" "def" Identifier "{" ("flow" FlowProperty Identifier)? ("ports" ":" PortUse)* Property* "}" }
PortUse { Identifier ":" Identifier }
FlowProperty { "in" | "out" | "inout" }

Connector { "connector" "def" Identifier "{" ("participants" ":" PortUseReverse)* ("flows" ":" Flow)* "}" }
PortUseReverse { "~" Identifier ":" Identifier }
Flow { Identifier "from" Identifier "to" Identifier }

Component { ("boundary")? "component" "def" Identifier "{" ("ports" ":" PortUse)* ("configuration" "{" (ComponentUse | ConnectorUse | Delegation)* "}")? Property* "}" }
ComponentUse { Identifier ":" Identifier }
ConnectorUse { Identifier ":" Identifier ("bindings" Binding)* }
Binding { Identifier "=" Identifier }
Delegation { Identifier "to" Identifier }

Activity { "activity" "def" Identifier ("(" Pin ("," Pin)* ")")* (":" "(" Pin ("," Pin)* ")")? "{" ("body" "{" (ActionUse | Flow | DataStore)* "}")? Property* "}" }
Pin { Identifier ":" ("flow")? Identifier }
ActionUse { Identifier ":" Identifier "{" ("using" "pins" ":" Pin)* Property* "}" }
Flow { "flow" "from" Identifier "to" (Identifier | Switch) }
DataStore { "datastore" Identifier ":" Identifier }
Switch { "switch" "{" (Case)* "}" }
Case { "case" Expression ":" Identifier }

Constraint { "constraint" Identifier ("(" Pin ("," Pin)* ")")? (":" "(" Pin ("," Pin)* ")")? "{" ("equation" "=" Expression)? Property* "}" }
Executable { "executable" "def" Identifier "(" ("in" TypeUseNoSemicolon ("," "in" TypeUseNoSemicolon)*)? ")" ":" "out" Identifier "{" Statement* "}" }
TypeUseNoSemicolon { Identifier ":" Identifier }
Allocation { "allocations" "{" (ExecutableAllocation | ActivityAllocation)* "}" }
ExecutableAllocation { "executable" (Identifier | "null") "to" (Identifier | "null") }
ActivityAllocation { "activity" (Identifier | "null") "to" (Identifier | "null") }

Property { "property" Identifier (":" Identifier)? ("=" Expression)? ";" }
Statement { (Assignment | Return | If | VariableDecl) ";" }
Assignment { Identifier "=" Expression }
Return { "return" Expression }
If { "if" "(" Expression ")" Statement ("else" Statement)? }
VariableDecl { "let" Identifier ":" Identifier ("=" Expression)? }
Expression { Identifier | String | Number | Boolean | EnumValue | Operation | PropertyAccess }
String { "\"" ![\\"]* "\"" }
Number { [0-9]+ ("." [0-9]+)? }
Boolean { "true" | "false" }
EnumValue { Identifier "::" Identifier }
Operation { Expression ("==" | ">" | "<" | "+" | "-" | "*" | "/" | "&&") Expression }
PropertyAccess { Expression "->" Identifier }

Identifier { [a-zA-Z][a-zA-Z0-9_]* }
@tokens {
  "{" { "{" }
  "}" { "}" }
  ";" { ";" }
  ":" { ":" }
  "=" { "=" }
  "," { "," }
  "(" { "(" }
  ")" { ")" }
  "to" { "to" }
  "from" { "from" }
  "~" { "~" }
  "->" { "->" }
}
@skip { whitespace | comment }
whitespace { [ \\t\\n\\r]+ }
comment { "//" ![\\n]* \\n | "/*" ![*]* "*/" }
`;

// Criar o parser a partir da gramática
const sysadlParser = window.Lezer.lr.LRParser.deserialize(window.Lezer.lr.LRParser.parse(sysadlGrammar));

// Definir a linguagem SysADL para CodeMirror
const sysadlLanguage = window.CodeMirror.language.LRLanguage.define({
    parser: sysadlParser,
    languageData: {
        commentTokens: { line: "//", block: { open: "/*", close: "*/" } }
    }
});

// Suporte de linguagem para CodeMirror
const sysadlSupport = new window.CodeMirror.language.LanguageSupport(sysadlLanguage);

// Inicializar o editor CodeMirror
const editor = new window.CodeMirror.view.EditorView({
    extensions: [
        window.CodeMirror.basicSetup.basicSetup,
        sysadlSupport
    ],
    parent: document.getElementById("editor"),
    doc: `// Cole o código SysADL aqui ou faça upload do arquivo .sysadl\n`
});

// Função para interpretar o código SysADL
function parseSysADL(code) {
    try {
        const tree = sysadlLanguage.parser.parse(code);
        let log = "=== Log do Parser SysADL ===\n";
        log += "Parsing iniciado em: " + new Date().toLocaleString() + "\n\n";
        log += traverseTree(tree, code, 0);
        log += "\nParsing concluído com sucesso.\n";
        return log;
    } catch (error) {
        return `=== Erro no Parsing ===\nErro: ${error.message}\nPosição aproximada: ${error.pos || 'desconhecida'}\n`;
    }
}

// Função para percorrer a árvore sintática e gerar um log detalhado
function traverseTree(node, code, indent) {
    let output = "";
    const indentStr = "  ".repeat(indent);
    const nodeText = code.slice(node.from, node.to).trim().substring(0, 50) + (code.slice(node.from, node.to).length > 50 ? "..." : "");
    let nodeType = node.name;

    // Mapear tipos de nós para descrições mais amigáveis
    const typeDescriptions = {
        Program: "Programa SysADL",
        Model: "Definição de Modelo",
        Package: "Pacote",
        ValueType: "Tipo de Valor",
        Enum: "Enumeração",
        DataType: "Tipo de Dados",
        Port: "Definição de Porta",
        PortUse: "Uso de Porta",
        Connector: "Definição de Conector",
        Component: "Definição de Componente",
        ComponentUse: "Uso de Componente",
        ConnectorUse: "Uso de Conector",
        Activity: "Definição de Atividade",
        Constraint: "Definição de Restrição",
        Executable: "Definição de Executável",
        Allocation: "Tabela de Alocação",
        Identifier: "Identificador",
        String: "String Literal",
        Number: "Número",
        Boolean: "Booleano",
        EnumValue: "Valor de Enumeração",
        Property: "Propriedade",
        Statement: "Instrução",
        Expression: "Expressão"
    };

    const description = typeDescriptions[nodeType] || nodeType;
    output += `${indentStr}${description} [${node.from}-${node.to}]\n`;
    output += `${indentStr}  Texto: "${nodeText}"\n`;

    // Adicionar contexto semântico
    if (["Model", "Package", "Component", "Port", "Connector", "Activity", "Constraint", "Executable"].includes(nodeType)) {
        const cursor = node.cursor();
        if (cursor.firstChild()) {
            do {
                if (cursor.node.name === "Identifier") {
                    const idText = code.slice(cursor.from, cursor.to);
                    output += `${indentStr}  Nome: ${idText}\n`;
                    break;
                }
            } while (cursor.nextSibling());
            cursor.parent();
        }
    }

    // Percorrer filhos
    const cursor = node.cursor();
    if (cursor.firstChild()) {
        output += `${indentStr}  Filhos:\n`;
        do {
            output += traverseTree(cursor.node, code, indent + 2);
        } while (cursor.nextSibling());
        cursor.parent();
    }

    return output;
}

// Evento para o botão "Interpretar"
document.getElementById("parseButton").addEventListener("click", () => {
    const code = editor.state.doc.toString();
    const log = parseSysADL(code);
    document.getElementById("logOutput").textContent = log;
});

// Evento para upload de arquivo .sysadl
document.getElementById("fileInput").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith(".sysadl")) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            editor.dispatch({
                changes: { from: 0, to: editor.state.doc.length, insert: content }
            });
            document.getElementById("logOutput").textContent = "Arquivo carregado com sucesso. Clique em 'Interpretar' para processar.";
        };
        reader.readAsText(file);
    } else {
        document.getElementById("logOutput").textContent = "Por favor, selecione um arquivo .sysadl válido.";
    }
});
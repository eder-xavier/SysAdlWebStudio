import { EditorView, basicSetup } from "https://unpkg.com/@codemirror/basic-setup?module";
import { javascript } from "https://unpkg.com/@codemirror/lang-javascript?module";

let editor;

// Inicializar CodeMirror
window.addEventListener("DOMContentLoaded", () => {
  editor = new EditorView({
    doc: "// Cole seu código SysADL aqui ou carregue um arquivo .sysadl",
    extensions: [basicSetup],
    parent: document.getElementById("editor"),
  });

  document.getElementById("fileInput").addEventListener("change", handleFileUpload);
});

// Interpretação Simples
function interpretarSysADL() {
  const code = editor.state.doc.toString();
  const log = parseSysADL(code);
  document.getElementById("parserLog").textContent = log;
}

// Leitura do arquivo
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: e.target.result }
    });
  };
  reader.readAsText(file);
}

// Parser muito básico
function parseSysADL(code) {
  const lines = code.split("\n");
  let log = "Iniciando parsing do modelo SysADL...\n";
  let lineCount = 0;

  for (const line of lines) {
    lineCount++;
    const trimmed = line.trim();

    if (trimmed.startsWith("Model")) {
      log += `[Linha ${lineCount}] Detectado início de modelo: ${trimmed}\n`;
    } else if (trimmed.startsWith("package")) {
      log += `[Linha ${lineCount}] Pacote encontrado: ${trimmed}\n`;
    } else if (trimmed.startsWith("value type")) {
      log += `[Linha ${lineCount}] Tipo de valor: ${trimmed}\n`;
    } else if (trimmed.startsWith("enum")) {
      log += `[Linha ${lineCount}] Enumeração: ${trimmed}\n`;
    } else if (trimmed.startsWith("datatype")) {
      log += `[Linha ${lineCount}] Tipo de dado composto: ${trimmed}\n`;
    } else if (trimmed.startsWith("port def")) {
      log += `[Linha ${lineCount}] Definição de porta: ${trimmed}\n`;
    } else if (trimmed === "") {
      continue;
    } else {
      log += `[Linha ${lineCount}] Ignorado: ${trimmed}\n`;
    }
  }

  log += "Parsing finalizado com sucesso.\n";
  return log;
}

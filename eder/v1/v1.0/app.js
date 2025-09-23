// App de orquestração (ESM)

// 0) Importa o parser (ESM) e expõe no window para o transformer usar
import { parse as sysadlParse, SyntaxError as SysADLSyntaxError } from './sysadl-parser.js';
window.SysADLParser = { parse: sysadlParse, SyntaxError: SysADLSyntaxError };

// 1) Monaco via AMD
const monacoReady = new Promise((resolve) => {
  const amdRequire = window.amdRequire || window.require;
  if (!amdRequire) return resolve();
  amdRequire.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
  amdRequire(['vs/editor/editor.main'], () => resolve());
});

// 2) UI refs
const els = {
  editor: document.getElementById('editor'),
  btnTransform: document.getElementById('btnTransform'),
  btnRun: document.getElementById('btnRun'),
  btnExample: document.getElementById('btnExample'),
  fileInput: document.getElementById('fileInput'),
  archOut: document.getElementById('archOut'),
  simOut: document.getElementById('simOut'),
  copyArch: document.getElementById('copyArch'),
  saveArch: document.getElementById('saveArch'),
  copySim: document.getElementById('copySim'),
  saveSim: document.getElementById('saveSim'),
  log: document.getElementById('log'),
  clearLog: document.getElementById('clearLog'),
  traceToggle: document.getElementById('traceToggle'),
  loopCount: document.getElementById('loopCount'),
  parseErr: document.getElementById('parseErr'),
};

// Fallbacks caso um ambiente injete `module.exports` no browser
(function ensureGlobalsFromModuleExports(){
  try {
    if (!window.Transformer && window.module && window.module.exports && window.module.exports.generateClassModule) {
      window.Transformer = window.module.exports;
    }
    if (!window.Simulator && window.module && window.module.exports && window.module.exports.run) {
      window.Simulator = window.module.exports;
    }
  } catch (_e) {}
})();



// 3) Monaco init
let editor;
await monacoReady;
editor = monaco.editor.create(els.editor, {
  value: `// Cole um modelo SysADL aqui e clique em Transformar ▶
// Exemplo simples:
model Sample
configuration {
  component Sensor s1;
  component Display d1;
  connector Wire w1 (s1.out -> d1.in);
}`.trim(),
  language: 'plaintext',
  theme: 'vs-dark',
  automaticLayout: true,
  fontSize: 14,
  minimap: { enabled: false }
});

// 4) Util: salvar arquivo
function saveAs(filename, content){
  const blob = new Blob([content], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 2000);
}

// 5) Shim CJS + require(SysADLBase) para o browser
function cjsPrelude(){
  return [
    'var module = { exports: {} };',
    'var exports = module.exports;',
    'function require(p){',
    "  if (p && String(p).includes('SysADLBase')) return window.SysADLBase;",
    "  throw new Error('require não suportado no browser: '+p);",
    '}'
  ].join('\n');
}
function cjsReturn(){
  return '\n;module.exports';
}

// 6) Transformação (browser) usando as helpers expostas por transformer.js via window.Transformer
async function transformSysADLToJS(source){
  els.parseErr.textContent = '';
  if(!window.Transformer){
    throw new Error('Transformer não carregado. Verifique ./transformer.js');
  }
  const T = window.Transformer;

  // Parse
  let ast;
  try {
    ast = window.SysADLParser.parse(source);
  } catch (err) {
    if (err && err.location) {
      const { start } = err.location;
      els.parseErr.textContent = `Erro de sintaxe (linha ${start.line}, coluna ${start.column}): ${err.message}`;
    } else {
      els.parseErr.textContent = 'Erro ao analisar SysADL: ' + (err?.message || String(err));
    }
    throw err;
  }

  // Attach parents (pequena utility local)
  (function attachParents(node, parent=null){
    if (!node || typeof node !== 'object') return;
    Object.defineProperty(node, '__parent', { value: parent, enumerable:false, configurable:true });
    for (const k of Object.keys(node)){
      const v = node[k];
      if (Array.isArray(v)) v.forEach(ch => attachParents(ch, node));
      else if (v && typeof v === 'object') attachParents(v, node);
    }
  })(ast, null);

  // Configuração (pega a primeira configuration do modelo)
  const conf = (T.extractConfigurations(ast) || [])[0] || {};

  // Coletas
  const compUses = T.collectComponentUses ? T.collectComponentUses(conf) : [];
  const portUses = T.collectPortUses ? T.collectPortUses(conf) : [];

  // Insumos mínimos/placeholder
  const connectorBindings = [];
  const executables = [];
  const activitiesToRegister = [];
  const rootDefs = [];
  const parentMap = {};
  const compInstanceDef = {};
  const compDefMap = {};
  const portDefMap = {};
  const embeddedTypes = {};
  const connectorDefMap = {};
  const packageMap = {};

  // Geração
  const js = T.generateClassModule(
    'ModelFromUI',
    compUses,
    portUses,
    connectorBindings,
    executables,
    activitiesToRegister,
    rootDefs,
    parentMap,
    compInstanceDef,
    compDefMap,
    portDefMap,
    embeddedTypes,
    connectorDefMap,
    packageMap,
    ast
  );

  return js;
}

// 7) Código de simulação padrão (snippet reutilizável pelo usuário)
function buildSimulationSnippet(jsModuleVar='generated'){
  return `// Shim CJS para rodar no browser
${cjsPrelude()}

//
// ==== MÓDULO GERADO PELA TRANSFORMAÇÃO ====
//
${jsModuleVar}

// Retorna o objeto exportado do módulo gerado
;module.exports;
`;
}

// 8) Execução (usa window.Simulator.run do arquivo simulator.js)
function runSimulation(generatedCode, { trace=false, loops=1 }={}){
  const prelude = cjsPrelude();
  const suffix = cjsReturn();
  const code = prelude + '\n' + generatedCode + suffix;

  const options = {
    trace: !!trace,
    loop: loops > 1,
    count: Math.max(1, Number(loops)||1),
  };

  try{
    const output = window.Simulator.run(code, options);
    els.log.textContent += output + '\n';
    els.log.scrollTop = els.log.scrollHeight;
  }catch(err){
    els.log.textContent += '\n[ERRO] ' + err.message + '\n';
    console.error(err);
  }
}

// 9) Handlers UI
els.btnTransform.addEventListener('click', async () => {
  els.log.textContent = '';
  const src = editor.getValue();
  try{
    const js = await transformSysADLToJS(src);
    els.archOut.textContent = js;

    // também mostramos o snippet de simulação padrão
    const snippet = buildSimulationSnippet('// (cole aqui o JS gerado acima)');
    els.simOut.textContent = snippet;

  }catch(err){
    if (!els.archOut.textContent) {
      els.archOut.textContent = 'Erro na transformação (veja detalhes acima).';
    }
    console.error(err);
  }
});

els.btnRun.addEventListener('click', async () => {
  const js = els.archOut.textContent.trim();
  if (!js){
    els.log.textContent += '[AVISO] Gere o JS primeiro (Transformar ▶).\n';
    return;
  }
  const trace = !!els.traceToggle.checked;
  const loops = Number(els.loopCount.value || 1);
  runSimulation(js, { trace, loops });
});

els.copyArch.addEventListener('click', async () => {
  await navigator.clipboard.writeText(els.archOut.textContent);
});
els.copySim.addEventListener('click', async () => {
  await navigator.clipboard.writeText(els.simOut.textContent);
});
els.saveArch.addEventListener('click', () => saveAs('arquitetura_gerada.js', els.archOut.textContent));
els.saveSim.addEventListener('click', () => saveAs('simulacao_padrao.js', els.simOut.textContent));

els.clearLog.addEventListener('click', () => { els.log.textContent = ''; });

els.fileInput.addEventListener('change', async (ev) => {
  const f = ev.target.files && ev.target.files[0];
  if (!f) return;
  const txt = await f.text();
  editor.setValue(txt);
});

els.btnExample.addEventListener('click', () => {
  editor.setValue(`model Demo
configuration {
  component Producer p1;
  component Consumer c1;
  connector Pipe link1 (p1.out -> c1.in);
}`.trim());
});

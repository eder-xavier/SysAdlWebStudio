// App de orquestração (ESM)

// 0) Importa o parser (ESM) e expõe no window para o transformer usar
import { parse as sysadlParse, SyntaxError as SysADLSyntaxError } from './sysadl-parser.js';
window.SysADLParser = { parse: sysadlParse, SyntaxError: SysADLSyntaxError };

// Depuração: verificar se SysADLBase está disponível no window
setTimeout(() => {
  if (window.SysADLBase) {
    console.log('[DEBUG] window.SysADLBase está disponível:', window.SysADLBase);
  } else {
    console.error('[ERRO] window.SysADLBase NÃO está disponível após carregamento!');
  }
}, 500);

// Importar definição de linguagem SysADL para Monaco
import { registerSysADLLanguage } from './sysadl-monaco.js';

// 1) Monaco via AMD
const monacoReady = new Promise((resolve, reject) => {
  const amdRequire = window.amdRequire || window.require;
  if (!amdRequire) {
    console.warn('AMD require not available, Monaco will not load');
    reject(new Error('AMD require not available'));
    return;
  }
  
  try {
    amdRequire.config({ 
      paths: { 
        'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' 
      } 
    });
    
    amdRequire(['vs/editor/editor.main'], () => {
      console.log('Monaco successfully loaded via AMD');
      
      // Registrar linguagem SysADL após Monaco carregar
      try {
        registerSysADLLanguage();
        console.log('✅ SysADL language support registered');
      } catch (error) {
        console.warn('⚠️ Error registering SysADL language:', error);
      }
      
      resolve();
    }, (err) => {
      console.error('Error loading Monaco:', err);
      reject(err);
    });
  } catch (error) {
    console.error('Error setting up Monaco:', error);
    reject(error);
  }
}); // <-- Adiciona o fechamento do executor da Promise

// Fim do script principal

// 2) UI refs
const els = {
  editor: document.getElementById('editor'),
  btnTransform: document.getElementById('btnTransform'),
  btnRun: document.getElementById('btnRun'),
  btnExample: document.getElementById('btnExample'),
  fileInput: document.getElementById('fileInput'),
  archOut: document.getElementById('archOut'),
  copyArch: document.getElementById('copyArch'),
  saveArch: document.getElementById('saveArch'),
  log: document.getElementById('log'),
  clearLog: document.getElementById('clearLog'),
  traceToggle: document.getElementById('traceToggle'),
  loopCount: document.getElementById('loopCount'),
  simulationParams: document.getElementById('simulationParams'),
  parseErr: document.getElementById('parseErr'),
};

// Fallbacks caso um ambiente injete `module.exports` no browser
(function ensureGlobalsFromModuleExports(){
  try {
    // In browser, window.Transformer and window.Simulator are set by their respective scripts
  } catch (_e) {}
})();



// 3) Monaco init
let editor;

// Aguardar Monaco estar pronto
monacoReady.then(() => {
  console.log('Monaco loaded, creating editor...');
  
  try {
    editor = monaco.editor.create(els.editor, {
      value: `// Cole um modelo SysADL aqui e clique em Transformar ▶
// Exemplo simples:
model Sample
configuration {
  component Sensor s1;
  component Display d1;
  connector Wire w1 (s1.out -> d1.in);
}`.trim(),
      language: 'sysadl',
      theme: 'vs-dark',
      automaticLayout: true,
      fontSize: 14,
      minimap: { enabled: false },
      // Configurações adicionais para SysADL
      wordWrap: 'on',
      bracketPairColorization: {
        enabled: true
      },
      suggest: {
        showKeywords: true,
        showSnippets: true
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false
      }
    });
    
    console.log('Monaco editor created successfully with SysADL language support');
  } catch (error) {
    console.error('Error creating Monaco editor:', error);
    
    // Fallback: usar textarea simples
    const fallbackTextarea = document.createElement('textarea');
    fallbackTextarea.id = 'fallback-editor';
    fallbackTextarea.style.cssText = `
      width: 100%; 
      height: 100%; 
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 14px;
      background: #1e1e1e;
      color: #d4d4d4;
      border: 1px solid #3c3c3c;
      padding: 10px;
      resize: none;
    `;
    fallbackTextarea.value = `// Cole um modelo SysADL aqui e clique em Transformar ▶
// Exemplo simples:
model Sample
configuration {
  component Sensor s1;
  component Display d1;
  connector Wire w1 (s1.out -> d1.in);
}`;
    
    els.editor.appendChild(fallbackTextarea);
    
    // Simular interface do Monaco para compatibilidade
    editor = {
      getValue: () => fallbackTextarea.value,
      setValue: (value) => { fallbackTextarea.value = value; }
    };
    
    console.log('Fallback editor created');
  }
}).catch(error => {
  console.error('Error loading Monaco:', error);
  // Fallback completo se Monaco não carregar
  const fallbackTextarea = document.createElement('textarea');
  fallbackTextarea.id = 'fallback-editor';
  fallbackTextarea.style.cssText = `
    width: 100%; 
    height: 100%; 
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 14px;
    background: #1e1e1e;
    color: #d4d4d4;
    border: 1px solid #3c3c3c;
    padding: 10px;
    resize: none;
  `;
  fallbackTextarea.value = `// Cole um modelo SysADL aqui e clique em Transformar ▶
// Exemplo simples:
model Sample
configuration {
  component Sensor s1;
  component Display d1;
  connector Wire w1 (s1.out -> d1.in);
}`;
  els.editor.appendChild(fallbackTextarea);
  editor = {
    getValue: () => fallbackTextarea.value,
    setValue: (value) => { fallbackTextarea.value = value; }
  };
  console.log('Complete fallback editor created');
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
    "  if (p && String(p).includes('SysADLBase')) {",
    "    if (!window.SysADLBase) { console.error('[DEBUG] window.SysADLBase não está disponível!'); return {}; }",
    "    console.log('[DEBUG] require(\"SysADLBase\") retornando:', window.SysADLBase);",
    "    return window.SysADLBase;",
    "  }",
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
// 8) Execução (usa window.Simulator.run do arquivo simulator.js)
function runSimulation(generatedCode, { trace=false, loops=1, params={} }={}){
  const prelude = cjsPrelude();
  const suffix = cjsReturn();
  const code = prelude + '\n' + generatedCode + suffix;

  const options = {
    trace: !!trace,
    loop: loops > 1,
    count: Math.max(1, Number(loops)||1),
    params: params // Passar parâmetros para o simulador
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
  console.log('[DEBUG] Botão Transformar clicado');
  els.log.textContent = '';
  const src = editor.getValue();
  if (!window.Transformer) {
    console.error('[DEBUG] window.Transformer NÃO está disponível');
    els.archOut.textContent = 'Erro: Transformer não carregado.';
    return;
  } else {
    console.log('[DEBUG] window.Transformer está disponível:', window.Transformer);
  }
  try {
    const js = await transformSysADLToJS(src);
    els.archOut.textContent = js;
    if (window.Prism) { Prism.highlightElement(els.archOut); }
    console.log('[DEBUG] Transformação realizada com sucesso');
  } catch (err) {
    if (!els.archOut.textContent) {
      els.archOut.textContent = 'Erro na transformação (veja detalhes acima).';
      if (window.Prism) { Prism.highlightElement(els.archOut); }
    }
    console.error('[DEBUG] Erro na transformação:', err);
  }
        });

els.btnRun.addEventListener('click', async () => {
  const js = els.archOut.textContent.trim();
  if (!js){
    els.log.textContent += '[AVISO] Gere o JS primeiro (Transformar ▶).\n';
    return;
  }
  if (!window.SysADLBase) {
    els.log.textContent += '[ERRO] O runtime SysADLBase não está disponível! Verifique se o arquivo SysADLBase.js foi carregado corretamente.\n';
    console.error('[DEBUG] window.SysADLBase não está disponível!');
    return;
  }
  const trace = !!els.traceToggle.checked;
  const loops = Number(els.loopCount.value || 1);
  // Processar parâmetros de simulação
  let params = {};
  const paramsText = els.simulationParams.value.trim();
  if (paramsText) {
    try {
      params = JSON.parse(paramsText);
      els.log.textContent += `[INFO] Parâmetros carregados: ${Object.keys(params).length} valores\n`;
    } catch (error) {
      els.log.textContent += `[ERRO] Parâmetros JSON inválidos: ${error.message}\n`;
      return;
    }
  }
  runSimulation(js, { trace, loops, params });
});

els.copyArch.addEventListener('click', async () => {
  await navigator.clipboard.writeText(els.archOut.textContent);
});
els.saveArch.addEventListener('click', () => saveAs('arquitetura_gerada.js', els.archOut.textContent));

els.clearLog.addEventListener('click', () => { els.log.textContent = ''; });

els.fileInput.addEventListener('change', async (ev) => {
  console.log('File input changed');
  const f = ev.target.files && ev.target.files[0];
  if (!f) {
    console.log('No file selected');
    return;
  }
  console.log('File selected:', f.name, 'size:', f.size);
  try {
    const txt = await f.text();
    console.log('File content loaded, length:', txt.length);
    if (editor && typeof editor.setValue === 'function') {
      editor.setValue(txt);
      console.log('Content set in editor');
    } else {
      console.error('Editor not available or setValue not a function');
      // Fallback: se tiver textarea
      const textarea = document.querySelector('#fallback-editor');
      if (textarea) {
        textarea.value = txt;
        console.log('Content set in fallback textarea');
      }
    }
  } catch (error) {
    console.error('Error loading file:', error);
  }
    highlightArchOutJS();
  });

  els.btnExample.addEventListener('click', async () => {
  console.log('Example button clicked');
  try {
    // Carrega o arquivo AGV-completo.sysadl
    const response = await fetch('./AGV-completo.sysadl');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const exampleCode = await response.text();
    
    if (editor && typeof editor.setValue === 'function') {
      editor.setValue(exampleCode);
      console.log('AGV-completo.sysadl loaded in Monaco editor');
    } else {
      console.error('Editor not available, trying fallback textarea');
      const textarea = document.querySelector('#fallback-editor');
      if (textarea) {
        textarea.value = exampleCode;
      } else {
        console.error('No textarea fallback available');
      }
    }
  } catch (error) {
    console.error('Failed to load AGV-completo.sysadl:', error);
    // Fallback para exemplo simples
    const exampleCode = `model Demo
configuration {
  component Producer p1;
  component Consumer c1;
  connector Pipe link1 (p1.out -> c1.in);
}`.trim();
    
    if (editor && typeof editor.setValue === 'function') {
      editor.setValue(exampleCode);
      console.log('Fallback example loaded in Monaco editor');
    } else {
      console.error('Editor not available, trying fallback textarea');
      const textarea = document.querySelector('#fallback-editor');
      if (textarea) {
        textarea.value = exampleCode;
        console.log('Fallback example loaded in textarea');
      } else {
        console.error('No editor available (neither Monaco nor fallback)');
      }
    }
  }
});

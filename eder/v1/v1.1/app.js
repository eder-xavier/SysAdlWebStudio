// App simplificado para usar servidor Node.js
// Elimina necessidade de wrappers e compatibilidade browser

import { parse as sysadlParse, SyntaxError as SysADLSyntaxError } from './sysadl-parser.js';
import { registerSysADLLanguage } from './sysadl-monaco.js';
import { renderVisualization } from './visualizer.js';

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
});

// 2) UI refs
const els = {
  editor: document.getElementById('editor'),
  btnTransform: document.getElementById('btnTransform'),
  btnRun: document.getElementById('btnRun'),
  btnExample: document.getElementById('btnExample'),
  fileInput: document.getElementById('fileInput'),
  codeEditor: document.getElementById('codeEditor'),
  copyArch: document.getElementById('copyArch'),
  saveArch: document.getElementById('saveArch'),
  btnVisualize: document.getElementById('btnVisualize'),
  log: document.getElementById('log'),
  clearLog: document.getElementById('clearLog'),
  traceToggle: document.getElementById('traceToggle'),
  loopCount: document.getElementById('loopCount'),
  simulationParams: document.getElementById('simulationParams'),
  parseErr: document.getElementById('parseErr'),
  architectureViz: document.getElementById('architectureViz'),
};

// 3) Monaco init
let editor, codeEditor;

monacoReady.then(() => {
  console.log('Monaco loaded, creating editors...');
  
  try {
    // Editor SysADL (primeira janela)
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
      wordWrap: 'on',
      bracketPairColorization: { enabled: true },
      suggest: { showKeywords: true, showSnippets: true },
      quickSuggestions: { other: true, comments: false, strings: false }
    });
    
    // Editor JavaScript (segunda janela - read-only)
    codeEditor = monaco.editor.create(els.codeEditor, {
      value: '// Código JavaScript gerado aparecerá aqui após a transformação',
      language: 'javascript',
      theme: 'vs-dark',
      automaticLayout: true,
      fontSize: 14,
      minimap: { enabled: false },
      wordWrap: 'on',
      readOnly: true,
      lineNumbers: 'on',  
      scrollBeyondLastLine: false,
      renderLineHighlight: 'none',
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      glyphMargin: false
    });
    
    console.log('✅ Monaco editors created successfully');
  } catch (error) {
    console.error('Error creating Monaco editors:', error);
    createFallbackEditor();
  }
}).catch(error => {
  console.error('Error loading Monaco:', error);
  createFallbackEditor();
});

// Fallback editor
function createFallbackEditor() {
  // SysADL Editor
  const fallbackTextarea = document.createElement('textarea');
  fallbackTextarea.id = 'fallback-editor';
  fallbackTextarea.style.cssText = `
    width: 100%; height: 100%; 
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 14px; background: #1e1e1e; color: #d4d4d4;
    border: 1px solid #3c3c3c; padding: 10px; resize: none;
  `;
  fallbackTextarea.value = `model Sample
configuration {
  component Sensor s1;
  component Display d1;
  connector Wire w1 (s1.out -> d1.in);
}`;
  
  els.editor.appendChild(fallbackTextarea);
  
  // Code Editor (read-only)
  const fallbackCodeArea = document.createElement('textarea');
  fallbackCodeArea.id = 'fallback-code-editor';
  fallbackCodeArea.style.cssText = `
    width: 100%; height: 100%; 
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 14px; background: #1e1e1e; color: #d4d4d4;
    border: 1px solid #3c3c3c; padding: 10px; resize: none;
  `;
  fallbackCodeArea.value = '// Código JavaScript gerado aparecerá aqui após a transformação';
  fallbackCodeArea.readOnly = true;
  
  els.codeEditor.appendChild(fallbackCodeArea);
  
  editor = {
    getValue: () => fallbackTextarea.value,
    setValue: (value) => { fallbackTextarea.value = value; }
  };
  
  codeEditor = {
    getValue: () => fallbackCodeArea.value,
    setValue: (value) => { fallbackCodeArea.value = value; }
  };
  
  console.log('✅ Fallback editors created');
}

// 4) Função de transformação usando servidor Node.js
async function transformSysADLToJS(source) {
  els.parseErr.textContent = '';
  
  try {
    console.log('🔄 Enviando código para servidor Node.js...');
    
    // Fazer requisição para o servidor Node.js
    const response = await fetch('/api/transform', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sysadlCode: source,
        options: {
          includeMetadata: true,
          optimize: true
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Erro desconhecido na transformação');
    }
    
    console.log('✅ Transformação concluída pelo servidor');
    console.log('📊 Metadata:', result.metadata);
    
    return result.javascript;
    
  } catch (error) {
    console.error('❌ Erro na transformação:', error);
    els.parseErr.textContent = `Erro na transformação: ${error.message}`;
    throw error;
  }
}

// 5) Utilitários
function saveAs(filename, content) {
  const blob = new Blob([content], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function cjsPrelude() {
  return [
    'var module = { exports: {} };',
    'var exports = module.exports;',
    'function require(p){',
    "  if (p && String(p).includes('SysADLBase')) {",
    "    if (!window.SysADLBase) { console.error('window.SysADLBase não disponível!'); return {}; }",
    "    return window.SysADLBase;",
    "  }",
    "  throw new Error('require não suportado no browser: '+p);",
    '}'
  ].join('\n');
}

function cjsReturn() {
  return '\n;module.exports';
}

// 6) Execução de simulação
function runSimulation(generatedCode, { trace=false, loops=1, params={} }={}) {
  const prelude = cjsPrelude();
  const suffix = cjsReturn();
  const code = prelude + '\n' + generatedCode + suffix;

  const options = {
    trace: !!trace,
    loop: loops > 1,
    count: Math.max(1, Number(loops)||1),
    params: params
  };

  try {
    const output = window.Simulator.run(code, options);
    els.log.textContent += output + '\n';
    els.log.scrollTop = els.log.scrollHeight;
  } catch(err) {
    els.log.textContent += '\n[ERRO] ' + err.message + '\n';
    console.error(err);
  }
}

// 7) Event Handlers
els.btnTransform.addEventListener('click', async () => {
  console.log('🔄 Botão Transformar clicado');
  els.log.textContent = '';
  const src = editor.getValue();
  
  try {
    const js = await transformSysADLToJS(src);
    codeEditor.setValue(js);
    console.log('✅ Transformação realizada com sucesso');
  } catch (err) {
    if (!codeEditor.getValue() || codeEditor.getValue().trim() === '// Código JavaScript gerado aparecerá aqui após a transformação') {
      codeEditor.setValue('// Erro na transformação (veja detalhes acima).');
    }
    console.error('❌ Erro na transformação:', err);
  }
});

els.btnVisualize.addEventListener('click', () => {
  console.log('🔍 Botão Visualizar Arquitetura clicado');
  const js = codeEditor.getValue().trim();
  if (!js || js === '// Código JavaScript gerado aparecerá aqui após a transformação') {
    els.log.textContent += '[AVISO] Gere o JS primeiro (Transformar ▶).\n';
    return;
  }
  if (!els.architectureViz) {
    console.warn('Contêiner de visualização não encontrado');
    els.log.textContent += '[ERRO] Contêiner de visualização não encontrado\n';
    return;
  }
  renderVisualization('architectureViz', js, els.log);
});

els.btnRun.addEventListener('click', async () => {
  const js = codeEditor.getValue().trim();
  if (!js || js === '// Código JavaScript gerado aparecerá aqui após a transformação') {
    els.log.textContent += '[AVISO] Gere o JS primeiro (Transformar ▶).\n';
    return;
  }
  if (!window.SysADLBase) {
    els.log.textContent += '[ERRO] SysADLBase não disponível!\n';
    return;
  }
  
  const trace = !!els.traceToggle.checked;
  const loops = Number(els.loopCount.value || 1);
  
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
  await navigator.clipboard.writeText(codeEditor.getValue());
});

els.saveArch.addEventListener('click', () => 
  saveAs('arquitetura_gerada.js', codeEditor.getValue())
);

els.clearLog.addEventListener('click', () => { 
  els.log.textContent = ''; 
});

els.fileInput.addEventListener('change', async (ev) => {
  const f = ev.target.files && ev.target.files[0];
  if (!f) return;
  
  try {
    const txt = await f.text();
    if (editor && typeof editor.setValue === 'function') {
      editor.setValue(txt);
    } else {
      const textarea = document.querySelector('#fallback-editor');
      if (textarea) textarea.value = txt;
    }
  } catch (error) {
    console.error('Error loading file:', error);
  }
});

els.btnExample.addEventListener('click', async () => {
  try {
    const response = await fetch('./AGV-completo.sysadl');
    if (response.ok) {
      const exampleCode = await response.text();
      if (editor && typeof editor.setValue === 'function') {
        editor.setValue(exampleCode);
      } else {
        const textarea = document.querySelector('#fallback-editor');
        if (textarea) textarea.value = exampleCode;
      }
    } else {
      throw new Error('Arquivo não encontrado');
    }
  } catch (error) {
    console.error('Failed to load example:', error);
    const fallback = `model Demo
configuration {
  component Producer p1;
  component Consumer c1;
  connector Pipe link1 (p1.out -> c1.in);
}`;
    
    if (editor && typeof editor.setValue === 'function') {
      editor.setValue(fallback);
    } else {
      const textarea = document.querySelector('#fallback-editor');
      if (textarea) textarea.value = fallback;
    }
  }
});

console.log('✅ App carregado - usando servidor Node.js para transformações');
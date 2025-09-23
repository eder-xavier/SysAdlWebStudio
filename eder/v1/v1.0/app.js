// App de orquestração (ESM)

// 0) Importa o parser (ESM) e expõe no window
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

// 3) Monaco init
let editor;
await monacoReady;
editor = monaco.editor.create(els.editor, {
  value: `// Cole um modelo SysADL aqui e clique em Transformar ▶
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

// 5) Shim CJS + require(SysADLBase) + path/fs/process para o browser
function cjsPrelude(){
  return [
    'var module = { exports: {} };',
    'var exports = module.exports;',
    "var process = { env: {} };",
    "var __dirname = '/'; var __filename = '/generated.js';",
    "var path = {",
    "  sep: '/',",
    "  resolve: function(){ return Array.from(arguments).join('/'); },",
    "  join: function(){ return Array.from(arguments).join('/').replace(/\\/+/, '/'); },",
    "  basename: function(p){ var a=p.split(/\\\\|\//); return a[a.length-1]||p; },",
    "  extname: function(p){ var m=p.match(/\.[^/.]+$/); return m?m[0]:''; },",
    "  dirname: function(p){ return p.split(/\\\\|\//).slice(0,-1).join('/'); },",
    "  normalize: function(p){ return p.replace(/\\/+/, '/'); },",
    "  isAbsolute: function(p){ return /^([a-zA-Z]:\\\\|\/)/.test(p); }",
    "};",
    "var fs = { existsSync: function(){return false;}, mkdirSync: function(){}, writeFileSync: function(){}, readFileSync: function(){ throw new Error('fs.readFileSync não suportado no browser'); } };",
    "function require(p){",
    "  if (!p) return {};",
    "  if (p.indexOf('SysADLBase')!==-1) return window.SysADLBase;",
    "  if (p==='path') return path;",
    "  if (p==='fs') return fs;",
    "  if (p==='process') return process;",
    "  throw new Error('require não suportado no browser: '+p);",
    "}"
  ].join('\n');
}
function cjsReturn(){
  return '\n;module.exports';
}

// 6) SANDBOX infra
let sandboxFrame, sandboxReady = false;
function ensureSandbox(){
  return new Promise((resolve) => {
    if (sandboxReady && sandboxFrame && sandboxFrame.contentWindow) return resolve();
    sandboxFrame = document.createElement('iframe');
    sandboxFrame.setAttribute('sandbox', 'allow-scripts');
    sandboxFrame.style.display = 'none';
    sandboxFrame.src = './sandbox.html';
    const onMsg = (ev) => {
      if (ev && ev.data && ev.data.type === 'sandbox-ready') {
        sandboxReady = true;
        window.removeEventListener('message', onMsg);
        resolve();
      }
    };
    window.addEventListener('message', onMsg);
    document.body.appendChild(sandboxFrame);
  });
}

async function transformViaSandbox(ast, source){
  await ensureSandbox();
  let transformerText = '';
  try {
    const res = await fetch('./transformer.js', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    transformerText = await res.text();
  } catch (e) {
    return { ok:false, error: 'Falha ao carregar transformer.js: ' + (e?.message || String(e)) };
  }

  return new Promise((resolve) => {
    const w = sandboxFrame.contentWindow;
    const onMsg = (ev) => {
      if (!ev || !ev.data || ev.data.type !== 'transformResult') return;
      window.removeEventListener('message', onMsg);
      resolve(ev.data);
    };
    window.addEventListener('message', onMsg);
    w.postMessage({ type: 'transform', ast, source, transformer: transformerText }, '*');
  });
}

// 7) Snippet simulação
function buildSimulationSnippet(jsModuleVar='generated'){
  return `// Shim CJS para rodar no browser
${cjsPrelude()}

// ==== MÓDULO GERADO PELA TRANSFORMAÇÃO ====
${jsModuleVar}

// Retorna o objeto exportado do módulo gerado
;module.exports;
`;
}

// 8) Execução (usa window.Simulator.run)
async function runSimulation(generatedCode, { trace=false, loops=1 }={}){
  const prelude = cjsPrelude();
  const suffix = cjsReturn();
  const code = prelude + '\n' + generatedCode + suffix;

  const options = {
    trace: !!trace,
    loop: loops > 1,
    count: Math.max(1, Number(loops)||1),
  };

  try{
    if (!window.Simulator || typeof window.Simulator.run !== 'function') {
      throw new Error('Simulador não carregado.');
    }
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
  els.parseErr.textContent = '';
  const src = editor.getValue();

  // Parse no app
  let ast;
  try {
    ast = window.SysADLParser.parse(src);
  } catch (err) {
    if (err && err.location) {
      const { start } = err.location;
      els.parseErr.textContent = `Erro de sintaxe (linha ${start.line}, coluna ${start.column}): ${err.message}`;
    } else {
      els.parseErr.textContent = 'Erro ao analisar SysADL: ' + (err?.message || String(err));
    }
    console.error(err);
    return;
  }

  try{
    const r = await transformViaSandbox(ast, src);
    if (!r.ok) { throw Object.assign(new Error(r.error||'Falha na transformação'), { location: r.location }); }
    const js = r.code;
    els.archOut.textContent = js;

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

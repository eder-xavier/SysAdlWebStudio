
// Minimal browser-first Simulator
// Exposes Simulator.run(codeString, options) -> string log

(function (root) {
  'use strict';

  function run(modelCode, options={}) {
    const opts = Object.assign({ trace: false, loop: false, count: 1 }, options);
    // Provide a local CommonJS shim for the eval'd module
    const prelude = [
      'var module = { exports: {} };',
      'var exports = module.exports;',
      'function require(p){',
      "  if (p && String(p).includes('SysADLBase')) return (typeof window !== 'undefined' ? window.SysADLBase : (globalThis.SysADLBase||{}));",
      "  throw new Error('require não suportado: '+p);",
      '}'
    ].join('\\n');

    try {
      const mod = eval(prelude + '\\n' + String(modelCode) + '\\n;module.exports;');
      if (!mod || typeof mod.createModel !== 'function') {
        throw new Error('Generated module não exporta createModel');
      }
      const model = mod.createModel();
      let out = `[Simulator] Modelo: ${model && model.name ? model.name : '(sem nome)'}\\n`;
      const comps = model && model.components ? Object.keys(model.components) : [];
      out += `Componentes: ${comps.join(', ') || '(nenhum)'}\\n`;
      if (opts.trace) out += `[trace] Ok — execução simulada ${opts.count}x\\n`;
      return out;
    } catch (e) {
      return `Erro na simulação: ${e && e.message ? e.message : String(e)}`;
    }
  }

  const api = { run };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Simulator = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);

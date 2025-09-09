// v0.2 minimal runtime for SysADL-generated models
// - ElementBase, ModelBase, ComponentBase, ConnectorBase, PortBase
// - activity coordination (multi-port joins)
// - addExecutable that preserves arity and logs inputs/outputs

class ElementBase {
  constructor(sysadlName, opts = {}) {
    this.name = String(sysadlName);
    this.sysadlName = String(sysadlName);
    this.sysadlPath = opts.sysadlPath || null; // dotted or slash path of instantiation
    this.props = { ...opts };
  }
}

class ModelBase extends ElementBase {
  constructor(name) {
    super(name);
    this.components = {}; // map sysadlName -> ComponentBase
    this.connectors = {};
    this.executables = {}; // map name -> fn
    this._log = [];
    this._activities = {};
    this._pendingInputs = {};
    this._instanceEventId = 1;
  }

  addComponent(inst) {
    this.components[inst.name] = inst;
  }

  addConnector(conn) {
    this.connectors[conn.name] = conn;
  }

  addExecutable(name, fn) {
    const model = this;
    const paramCount = typeof fn.length === 'number' ? fn.length : 0;
    const paramNames = Array.from({ length: paramCount }).map((_, i) => 'p' + i);
    const factoryArgs = ['fn', 'model', 'name'];
    const factoryBody = [];
    factoryBody.push('return function(' + paramNames.join(',') + '){');
    factoryBody.push('  const inputs = Array.prototype.slice.call(arguments);');
    factoryBody.push('  let output;');
    factoryBody.push('  try {');
    factoryBody.push('    output = fn.apply(this, inputs);');
    factoryBody.push('  } catch (e) {');
    factoryBody.push("    model.logEvent({ elementType: 'executable', name, inputs, output: undefined, error: e.message, when: Date.now() });");
    factoryBody.push('    throw e;');
    factoryBody.push('  }');
    factoryBody.push("  model.logEvent({ elementType: 'executable', name, inputs, output, when: Date.now() });");
    factoryBody.push('  return output;');
    factoryBody.push('};');
    const factoryCode = factoryBody.join('\n');
    try {
      const factory = new Function(...factoryArgs.concat([factoryCode]));
      const wrapped = factory(fn, model, name);
      this.executables[name] = wrapped;
    } catch (e) {
      const wrapped = function(...args) {
        const inputs = args;
        let output;
        try {
          output = fn.apply(this, args);
        } catch (err) {
          model.logEvent({ elementType: 'executable', name, inputs, output: undefined, error: err.message, when: Date.now() });
          throw err;
        }
        model.logEvent({ elementType: 'executable', name, inputs, output, when: Date.now() });
        return output;
      };
      this.executables[name] = wrapped;
    }
  }

  registerActivity(activityName, descriptor) {
    if (!activityName) return;
    this._activities[activityName] = descriptor;
    this._pendingInputs[activityName] = {};
  }

  handlePortReceive(componentName, portName, value) {
    for (const [actName, desc] of Object.entries(this._activities || {})) {
      if (desc.component !== componentName) continue;
      const inputPorts = desc.inputPorts || [];
      if (!inputPorts.includes(portName)) continue;
      const pending = this._pendingInputs[actName] || {};
      pending[portName] = value;
      this._pendingInputs[actName] = pending;
      const ready = inputPorts.every(p => Object.prototype.hasOwnProperty.call(pending, p));
      if (ready) {
        const inputs = inputPorts.map(p => pending[p]);
        try {
          this.logEvent({ elementType: 'activity_start', name: actName, component: componentName, inputs, when: Date.now() });
          this.executeActivity(actName, inputs);
          this.logEvent({ elementType: 'activity_end', name: actName, component: componentName, when: Date.now() });
        } catch (e) {
          this.logEvent({ elementType: 'activity_error', name: actName, component: componentName, error: e.message, when: Date.now() });
        }
        this._pendingInputs[actName] = {};
      }
    }
  }

  executeActivity(activityName, inputs) {
    const desc = (this._activities || {})[activityName];
    if (!desc) throw new Error('Unknown activity: ' + activityName);
    let lastResult = null;
    for (const action of (desc.actions || [])) {
      const actInputs = (action.params && action.params.length) ? action.params.map((p, i) => inputs[i] || undefined) : inputs;
      if (action.executable && this.executables && this.executables[action.executable]) {
        try {
          this.logEvent({ elementType: 'action_invoke', activity: activityName, action: action.name || action.executable, executable: action.executable, inputs: actInputs, when: Date.now() });
          lastResult = this.executables[action.executable].apply(null, actInputs);
          this.logEvent({ elementType: 'action_result', activity: activityName, action: action.name || action.executable, executable: action.executable, output: lastResult, when: Date.now() });
        } catch (e) {
          this.logEvent({ elementType: 'action_error', activity: activityName, action: action.name || action.executable, executable: action.executable, error: e.message, when: Date.now() });
          throw e;
        }
      } else if (action.body) {
        try {
          this.logEvent({ elementType: 'action_invoke', activity: activityName, action: action.name || '<body>', inputs: actInputs, when: Date.now() });
          const fn = createExecutableFromExpression(action.body, action.params || []);
          lastResult = fn.apply(null, actInputs);
          this.logEvent({ elementType: 'action_result', activity: activityName, action: action.name || '<body>', output: lastResult, when: Date.now() });
        } catch (e) {
          this.logEvent({ elementType: 'action_error', activity: activityName, action: action.name || '<body>', error: e.message, when: Date.now() });
          throw e;
        }
      } else {
        this.logEvent({ elementType: 'action_skipped', activity: activityName, action: action.name || '<unknown>', when: Date.now() });
      }
    }
    return lastResult;
  }

  logEvent(entry) {
    if (typeof global.__globalSysAdlEventId === 'undefined') {
      try { global.__globalSysAdlEventId = global.__globalSysAdlEventId || 1; } catch (e) { this._instanceEventId = this._instanceEventId || 1; }
    }
    const now = new Date();
    let id;
    try { id = global.__globalSysAdlEventId++; } catch (e) { if (!this._instanceEventId) this._instanceEventId = 1; id = this._instanceEventId++; }
    const annotated = Object.assign({}, entry, { when: now.toISOString(), eventId: id });
    this._log.push(annotated);
  }

  getLog() { return this._log.slice(); }
  dumpLog() { for (const e of this._log) console.log(JSON.stringify(e)); }
}

class ComponentBase extends ElementBase {
  constructor(name, opts = {}) {
    super(name, opts);
    this.ports = {};
    this.subcomponents = {};
  }
  addPort(port) { this.ports[port.name] = port; }
  addSubcomponent(inst) { this.subcomponents[inst.name] = inst; }
}

class ConnectorBase extends ElementBase {
  constructor(name, opts = {}) { super(name, opts); this.participants = {}; }
  addParticipant(portRef) { const key = `${portRef.component}.${portRef.port}`; this.participants[key] = portRef; }
}

class PortBase extends ElementBase {
  constructor(name, direction = 'in', opts = {}) {
    super(name, opts);
    this.direction = direction;
    this.type = opts.type || null;
    this.binding = null;
    this.lastValue = undefined;
  }
  bindTo(portRef) { this.binding = portRef; }
  send(value, model) {
    const inputs = [value];
    if (model && typeof model.logEvent === 'function') model.logEvent({ elementType: 'port_send', component: this.ownerComponent, name: this.name, inputs, when: Date.now() });
    this.lastValue = value;
    if (this.binding && typeof this.binding.receive === 'function') this.binding.receive(value, model);
    if (model && typeof model.handlePortReceive === 'function' && this.ownerComponent) {
      try { model.handlePortReceive(this.ownerComponent, this.name, value); } catch (e) {}
    }
    return value;
  }
  receive(value, model) {
    const inputs = [value];
    if (model && typeof model.logEvent === 'function') model.logEvent({ elementType: 'port_receive', component: this.ownerComponent, name: this.name, inputs, when: Date.now() });
    this.lastValue = value;
    if (model && typeof model.handlePortReceive === 'function' && this.ownerComponent) { try { model.handlePortReceive(this.ownerComponent, this.name, value); } catch (e) {} }
    return value;
  }
}

function createExecutableFromExpression(exprText, paramNames = []) {
  const raw = String(exprText || '').trim();

  // quick guard: empty body -> noop
  if (!raw) {
    return function() { return undefined; };
  }

  function translateSysadlExpression(src) {
      // normalize and drop noisy DSL lines
      let s = String(src || '').replace(/\r\n?/g, '\n')
        .split('\n').filter(line => {
          const t = line.trim();
          return t && !/^delegate\b/i.test(t) && !/^using\b/i.test(t) &&
                 !/^constraint\b/i.test(t) && !/^body\b/i.test(t) &&
                 !/^actions\b/i.test(t);
        }).join('\n');

      // basic syntactic translations
      s = s.replace(/->/g, '.');
      s = s.replace(/\band\b/gi, '&&');
      s = s.replace(/\bor\b/gi, '||');
      s = s.replace(/\bnot\b/gi, '!');
      // normalize elsif / else if
      s = s.replace(/\belsif\b/gi, 'else if');
      // handle if ... then ... else ... -> block form when simple
      s = s.replace(/if\s*\(([^)]+)\)\s*then\s*([^\n;\{]+)\s*else\s*([^\n;\{]+)/gi, (m, cond, a, b) => `if (${cond}) { ${a}; } else { ${b}; }`);

      // remove type annotations in declarations: let x:Type -> let x
      s = s.replace(/\b(let|var|const)\s+([A-Za-z_]\w*)\s*:\s*[A-Za-z_][\w<>:]*(\s*=)?/g, (m, kw, id, eq) => kw + ' ' + id + (eq ? eq : ''));
      // remove typed params in parentheses: (a:Type,b:Type) -> (a,b)
      s = s.replace(/\(([^)]*)\)/g, (m, inside) => {
        const parts = inside.split(',').map(p => p.trim()).filter(Boolean).map(p => p.split(':')[0].trim());
        return '(' + parts.join(',') + ')';
      });

      // ':=' -> prefer 'let name = ' when at start of line, otherwise '='
      s = s.replace(/(^|\n)\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*:=/g, (m, nl, name) => `${nl}let ${name} =`);
      s = s.replace(/:=/g, '=');

      // convert NS::LIT tokens to string literal to avoid parse issues
      s = s.replace(/([A-Za-z_][A-Za-z0-9_.]*::[A-Za-z0-9_]+)/g, (m) => JSON.stringify(m));

      // remove stray words and repeated semicolons
      s = s.replace(/post-condition\b/gi, '');
      s = s.replace(/;\s*;+/g, ';');

      s = s.trim();
      return s;
  }

  const pre = translateSysadlExpression(raw);
  // try as expression first
    try {
      // attempt expression wrapped with strict mode and params names
      const inner = new Function(...paramNames, `'use strict'; return (${pre});`);
      return function(...args) { try { return inner.apply(this, args); } catch (e) { return undefined; } };
    } catch (e1) {
      // try as body (multi-statement)
      try {
        let body = pre;
        // if body contains explicit block braces, trust it and don't split semicolons at top-level
        if (!/[{}]/.test(body)) {
          // split only on newlines to preserve inline semicolons inside expressions
          const lines = body.split(/\n/).map(l => l.trim()).filter(Boolean);
          if (lines.length > 1) {
            const lastIdx = lines.length - 1;
            const last = lines[lastIdx];
            // if last line looks like an expression, return it; avoid converting assignments/decls/returns
            if (!/^\s*(return|let|var|const)\b/.test(last) && !/[;{}]$/.test(last)) {
              lines[lastIdx] = 'return ' + last;
            }
            body = lines.join('\n');
          }
        }
        const inner2 = new Function(...paramNames, `'use strict';\n${body}`);
        return function(...args) { try { return inner2.apply(this, args); } catch (e) { return undefined; } };
      } catch (e2) {
      // fallback interpreter similar to previous behavior but safe
      const expr = pre;
      return function(...argsVals) {
        const env = {};
        for (let i = 0; i < paramNames.length; i++) env[paramNames[i]] = argsVals[i];
        try {
          if (/^[0-9.\-+eE]+$/.test(expr)) return Number(expr);
          if (expr.indexOf('.') !== -1 && expr.indexOf('(') === -1 && expr.indexOf('=') === -1) {
            const parts = expr.split('.').map(s => s.trim());
            let cur = env[parts[0]];
            for (let i = 1; i < parts.length; i++) {
              const key = parts[i];
              if (cur == null) { cur = undefined; break; }
              cur = cur[key] !== undefined ? cur[key] : cur[key];
            }
            return cur;
          }
          if (expr.indexOf('::') !== -1) return expr;
          if (paramNames.includes(expr)) return env[expr];
          const fnBody = `return (${expr});`;
          const f = new Function(...Object.keys(env), fnBody);
          return f(...Object.values(env));
        } catch (err) {
          // do not throw; return undefined for safety
          return undefined;
        }
      };
    }
  }
}

module.exports = { ElementBase, ModelBase, ComponentBase, ConnectorBase, PortBase, createExecutableFromExpression };

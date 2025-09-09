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
      // try to wire this executable into existing ActivityBase/ActionBase instances
      try {
        for (const [actName, actObj] of Object.entries(this._activities || {})) {
          // actObj may be ActivityBase instance
          if (actObj && typeof actObj.actions === 'object') {
            for (const a of actObj.actions) {
              if (a && a.executableName === name && !a.executableFn) {
                a.executableFn = wrapped;
              }
            }
          }
        }
      } catch (wireErr) { /* non-fatal */ }
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
      try {
        for (const [actName, actObj] of Object.entries(this._activities || {})) {
          if (actObj && typeof actObj.actions === 'object') {
            for (const a of actObj.actions) {
              if (a && a.executableName === name && !a.executableFn) {
                a.executableFn = wrapped;
              }
            }
          }
        }
      } catch (wireErr) { /* ignore */ }
    }
  }

  // Register an activity. Supports registration per-instance by creating an
  // internal composite key: `${activityName}::${component}` when descriptor
  // contains a `component` field (or ActivityBase instance with .component).
  registerActivity(activityName, descriptor) {
    if (!activityName) return;
    // detect ActivityBase instance
    const isInstance = descriptor && typeof descriptor.invoke === 'function';
    // determine component if provided
    const comp = (isInstance ? (descriptor.component || null) : (descriptor && descriptor.component ? descriptor.component : null));
    const internalKey = comp ? (activityName + '::' + comp) : activityName;

    // store descriptor or instance under internalKey; allow multiple registrations with unique internal keys
    this._activities[internalKey] = descriptor || {};
    // ensure pending input container for this internalKey
    this._pendingInputs[internalKey] = {};
  }

  handlePortReceive(componentName, portName, value) {
    // iterate registered activities (internal keys), match by component or key suffix
    for (const [internalKey, desc] of Object.entries(this._activities || {})) {
      // derive activityName and component from internalKey when possible
      let actComponent = null;
      let actName = internalKey;
      if (String(internalKey).indexOf('::') !== -1) {
        const parts = String(internalKey).split('::');
        actName = parts[0]; actComponent = parts[1];
      } else if (desc && typeof desc === 'object' && desc.component) {
        actComponent = desc.component;
      }
      if (actComponent !== componentName) continue;
      const inputPorts = (desc && desc.inputPorts) ? desc.inputPorts : [];
      if (!inputPorts || !inputPorts.includes(portName)) continue;
      const pending = this._pendingInputs[internalKey] || {};
      pending[portName] = value;
      this._pendingInputs[internalKey] = pending;
      const ready = inputPorts.every(p => Object.prototype.hasOwnProperty.call(pending, p));
      if (ready) {
        const inputs = inputPorts.map(p => pending[p]);
        try {
          this.logEvent({ elementType: 'activity_start', name: actName, component: componentName, inputs, when: Date.now() });
          this.executeActivity(internalKey, inputs);
          this.logEvent({ elementType: 'activity_end', name: actName, component: componentName, when: Date.now() });
        } catch (e) {
          this.logEvent({ elementType: 'activity_error', name: actName, component: componentName, error: e.message, when: Date.now() });
        }
        this._pendingInputs[internalKey] = {};
      }
    }
  }

  executeActivity(activityName, inputs) {
    const actOrDesc = (this._activities || {})[activityName];
    if (!actOrDesc) throw new Error('Unknown activity: ' + activityName);
    // if it's an ActivityBase instance, delegate to its invoke method
    if (actOrDesc && typeof actOrDesc.invoke === 'function') {
      this.logEvent({ elementType: 'activity_invoke', name: activityName, when: Date.now() });
      try {
        const out = actOrDesc.invoke(inputs, this);
        this.logEvent({ elementType: 'activity_end', name: activityName, when: Date.now() });
        return out;
      } catch (e) {
        this.logEvent({ elementType: 'activity_error', name: activityName, error: e.message, when: Date.now() });
        throw e;
      }
    }

    // otherwise, fallback to legacy descriptor behavior
    const desc = actOrDesc || {};
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

class ActionBase {
  constructor(name, params = [], executableFn = null, rawBody = null) {
    this.name = name || null;
    this.params = Array.isArray(params) ? params.slice() : [];
    // executableFn may be a function or null; rawBody is the SysADL body;
    // if name looks like an executable reference, we record it as executableName
    this.executableFn = typeof executableFn === 'function' ? executableFn : null;
    this.rawBody = rawBody;
    this.executableName = (typeof executableFn === 'string' && executableFn) ? executableFn : null;
  }

  invoke(inputs, model) {
    try {
      // lazy resolution: if executableFn not present but executableName is, try to resolve in model.executables
      if (!this.executableFn && this.executableName && model && model.executables && typeof model.executables[this.executableName] === 'function') {
        this.executableFn = model.executables[this.executableName];
      }
      if (typeof this.executableFn === 'function') return this.executableFn.apply(null, inputs);
      if (this.rawBody) {
        const fn = createExecutableFromExpression(this.rawBody, this.params || []);
        this.executableFn = fn; // cache
        return fn.apply(null, inputs);
      }
      return undefined;
    } catch (e) {
      if (model && typeof model.logEvent === 'function') model.logEvent({ elementType: 'action_error', action: this.name || this.executableName, error: e.message, when: Date.now() });
      throw e;
    }
  }
}

class ActivityBase {
  constructor(name, opts = {}) {
    this.name = name || null;
    this.component = opts.component || null;
    this.inputPorts = Array.isArray(opts.inputPorts) ? opts.inputPorts.slice() : [];
    this.actions = Array.isArray(opts.actions) ? opts.actions.map(a => {
      if (a instanceof ActionBase) return a;
      return new ActionBase(a.name || a.executable || null, a.params || [], a.executable && (typeof a.executable === 'function' ? a.executable : null), a.body || a.rawBody || null);
    }) : [];
  }

  addAction(action) { this.actions.push(action instanceof ActionBase ? action : new ActionBase(action.name, action.params, action.executable, action.body)); }

  invoke(inputs, model) {
    let last = undefined;
    for (const a of this.actions) {
      model && typeof model.logEvent === 'function' && model.logEvent({ elementType: 'action_invoke', activity: this.name, action: a.name || '<anon>', inputs, when: Date.now() });
      last = a.invoke(inputs, model);
      model && typeof model.logEvent === 'function' && model.logEvent({ elementType: 'action_result', activity: this.name, action: a.name || '<anon>', output: last, when: Date.now() });
    }
    return last;
  }
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
  if (!raw) return function() { return undefined; };

  // translate SysADL surface syntax into JS-ish source
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
    s = s.replace(/\belsif\b/gi, 'else if');

    // prefer ternary for single-expression if-then-else
    s = s.replace(/if\s*\(([^)]+)\)\s*then\s*([^\n;\{]+)\s*else\s*([^\n;\{]+)/gi, (m, cond, a, b) => `(${cond})?(${a}):(${b})`);

    // remove type annotations in declarations: let x:Type -> let x
    s = s.replace(/\b(let|var|const)\s+([A-Za-z_]\w*)\s*:\s*[A-Za-z_][\w<>:]*(\s*=)?/g, (m, kw, id, eq) => kw + ' ' + id + (eq ? eq : ''));

    // remove typed params in parentheses: (a:Type,b:Type) -> (a,b)
    s = s.replace(/\(([^)]*)\)/g, (m, inside) => {
      const parts = inside.split(',').map(p => p.trim()).filter(Boolean).map(p => p.split(':')[0].trim());
      return '(' + parts.join(',') + ')';
    });

    // ':=' handling: process lines and only introduce 'let' on the first declaration of a name
    const lines = s.split('\n');
    const declared = new Set();
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i];
      const m = L.match(/^\s*(?:let\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*:=/);
      if (m) {
        const nm = m[1];
        if (declared.has(nm) || /\blet\b|\bvar\b|\bconst\b/.test(L)) {
          lines[i] = L.replace(/:=/g, '=');
        } else {
          lines[i] = L.replace(/(^\s*)(?:let\s*)?([A-Za-z_$][A-Za-z0-9_$]*)\s*:=/, (mm, pre, name) => `${pre}let ${name} =`);
          declared.add(nm);
        }
      } else {
        const m2 = L.match(/^\s*(?:let|var|const)\s+([A-Za-z_$][A-Za-z0-9_$]*)\b/);
        if (m2) declared.add(m2[1]);
      }
    }
    s = lines.join('\n');

    // boolean literals
    s = s.replace(/\b(True|False)\b/g, (m) => m.toLowerCase());

    // convert NS::LIT tokens to string literal
    s = s.replace(/([A-Za-z_][A-Za-z0-9_.]*::[A-Za-z0-9_]+)/g, (m) => JSON.stringify(m));

    s = s.replace(/post-condition\b/gi, '');
    s = s.replace(/;\s*;+/g, ';');

    return s.trim();
  }

  // split top-level statements by semicolon/newline but respect quotes, template strings and depth
  function splitTopLevelStatements(src) {
    const parts = [];
    let cur = '';
    let inS = null;
    let esc = false;
    let depth = 0;
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (esc) { cur += ch; esc = false; continue; }
      if (ch === '\\') { cur += ch; esc = true; continue; }
      if (inS) {
        cur += ch;
        if (ch === inS) inS = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') { inS = ch; cur += ch; continue; }
      if (ch === '{' || ch === '(' || ch === '[') { depth++; cur += ch; continue; }
      if (ch === '}' || ch === ')' || ch === ']') { depth = Math.max(0, depth-1); cur += ch; continue; }
      if ((ch === ';' || ch === '\n') && depth === 0) {
        const t = cur.trim(); if (t) parts.push(t);
        cur = '';
        continue;
      }
      cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }

  function dedupeLetDeclarations(body) {
    const lines = body.split('\n');
    const declared = new Set();
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^\s*let\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/);
      if (m) {
        const name = m[1];
        if (declared.has(name)) {
          lines[i] = lines[i].replace(/^\s*let\s+/, '');
        } else declared.add(name);
      } else {
        const m2 = lines[i].match(/^\s*(?:var|const)\s+([A-Za-z_$][A-Za-z0-9_$]*)\b/);
        if (m2) declared.add(m2[1]);
      }
    }
    return lines.join('\n');
  }

  const pre = translateSysadlExpression(raw);
  if (process.env.SYSADL_DEBUG) console.log('[SYSADL-IR] pre:', JSON.stringify(pre));

  // try as expression first
  try {
    const exprFn = new Function(...paramNames, `'use strict'; return (${pre});`);
    return function(...args) { try { return exprFn.apply(this, args); } catch (e) { return undefined; } };
  } catch (exprErr) {
    // try as body (multi-statement)
    let body = pre;
    if (process.env.SYSADL_DEBUG) console.log('[SYSADL-IR] initial body:', JSON.stringify(body));
    try {
      if (!/^{[\s\S]*}$/.test(body.trim())) {
        const stmts = splitTopLevelStatements(body);
        if (stmts.length > 0) {
          const lastIdx = stmts.length - 1;
          const last = stmts[lastIdx];
          if (!/^\s*(return|let|var|const|if|for|while|switch|function)\b/.test(last) && !/[{}]$/.test(last)) {
            stmts[lastIdx] = 'return ' + last;
          }
          body = stmts.join('\n');
        }
      }
      body = dedupeLetDeclarations(body);
      if (process.env.SYSADL_DEBUG) console.log('[SYSADL-IR] final body to compile:', JSON.stringify(body));
      const bodyFn = new Function(...paramNames, `'use strict';\n${body}`);
      return function(...args) { try { return bodyFn.apply(this, args); } catch (e) { return undefined; } };
    } catch (bodyErr) {
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
          return undefined;
        }
      };
    }
  }
}

module.exports = { ElementBase, ModelBase, ComponentBase, ConnectorBase, PortBase, createExecutableFromExpression, ActivityBase, ActionBase };

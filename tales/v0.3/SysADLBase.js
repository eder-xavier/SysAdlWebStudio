// v0.3 runtime (renamed and adapted from v0.2)
// Exports: Model, Element, Component, Connector, Port, Activity, Action, Executable helper

class Element {
  constructor(name, opts = {}) {
    this.name = String(name);
    this.sysadlName = String(name);
    this.props = { ...opts };
  }
}

class Model extends Element {
  constructor(name) {
    super(name);
    this.components = {}; // direct children instances by local name
    this.connectors = {};
    this.executables = {};
    this._log = [];
    this._activities = {};
    this._pendingInputs = {};
  this._connectorEndpoints = {}; // map 'comp.port' -> Set of connectors
  }

  addComponent(inst) {
    if (!inst || !inst.name) return;
    this.components[inst.name] = inst;
  }

  addConnector(conn) { if (conn && conn.name) this.connectors[conn.name] = conn; }

  registerConnectorEndpoint(connector, compName, portName){
    if(!connector || !compName || !portName) return;
    const key = compName + '.' + portName;
    this._connectorEndpoints[key] = this._connectorEndpoints[key] || new Set();
    this._connectorEndpoints[key].add(connector);
  }

  _dispatchConnectors(compName, portName, value){
    const key = compName + '.' + portName;
    const set = this._connectorEndpoints[key];
    if(!set || !set.size) return;
    for(const conn of Array.from(set)){
      try{ if (typeof conn.forwardFrom === 'function') conn.forwardFrom(compName, portName, value, this); } catch(e){}
    }
  }

  addExecutable(name, fn) {
    // keep same behavior wrapping
    const model = this;
    const wrapped = function(...args){
      let output;
      try { output = fn.apply(this, args); } catch (e) { model.logEvent({ elementType: 'executable', name, inputs: args, error: e.message, when: Date.now() }); throw e; }
      model.logEvent({ elementType: 'executable', name, inputs: args, output, when: Date.now() });
      return output;
    };
    this.executables[name] = wrapped;
    // wire to activities by executableName if present
    for (const k of Object.keys(this._activities || {})){
      const a = this._activities[k];
      if (a && a.actions) {
        for (const act of a.actions) {
          if (act && act.executableName === name && !act.executableFn) act.executableFn = wrapped;
        }
      }
    }
  }

  // safe helper used by generated modules: compile and register executable, ignore failures
  addExecutableSafe(name, body, params) {
    try {
      const fn = createExecutableFromExpression(String(body || ''), Array.isArray(params) ? params : (params || []));
      this.addExecutable(name, fn);
    } catch (e) {
      // ignore errors during generation-time registration
    }
  }

  // safe attach for connectors emitted by generator. Accepts either:
  // - (connector, portObj) where portObj is a Port/CompositePort instance
  // - (connector, compObj, portName) where compObj is a Component instance and portName a string
  attachEndpointSafe(connector, compOrPort, portName) {
    try {
      if (!connector || !compOrPort) return;
      // if second argument looks like a Port instance, attach directly
      if (typeof compOrPort === 'object' && compOrPort && compOrPort.name && compOrPort.owner) {
        connector.addEndpoint(this, compOrPort);
        return;
      }
      // otherwise treat compOrPort as a component and portName as the port id
      const comp = compOrPort;
      if (!comp || !portName) return;
      if (comp.ports && comp.ports[portName]) { connector.addEndpoint(this, comp.ports[portName]); return; }
      // fallback: search composite ports for a matching sub-port
      if (comp.ports) {
        for (const k of Object.keys(comp.ports)) {
          try {
            const cp = comp.ports[k];
            if (cp && typeof cp.getSubPort === 'function') {
              const sp = cp.getSubPort(portName);
              if (sp) { connector.addEndpoint(this, sp); return; }
            }
          } catch (e) { /* ignore */ }
        }
      }
    } catch (e) { /* ignore */ }
  }

  registerActivity(key, activity) {
    if (!key) return;
    this._activities[key] = activity;
    this._pendingInputs[key] = {};
  }

  handlePortReceive(instancePath, portName, value) {
    // instancePath is an array of path segments or a dot-string
    const compId = Array.isArray(instancePath) ? instancePath.join('.') : instancePath;
    for (const [k, a] of Object.entries(this._activities || {})){
      let actName = k, comp = null;
      if (String(k).includes('::')) { const [n,c] = k.split('::'); actName = n; comp = c; }
      else if (a && a.component) comp = a.component;
      if (comp !== compId) continue;
      const inputPorts = a.inputPorts || [];
      if (!inputPorts.includes(portName)) continue;
      const pending = this._pendingInputs[k] || {};
      pending[portName] = value;
      this._pendingInputs[k] = pending;
      const ready = inputPorts.every(p => Object.prototype.hasOwnProperty.call(pending, p));
      if (ready) {
        const inputs = inputPorts.map(p => pending[p]);
        this.logEvent({ elementType: 'activity_start', name: actName, component: comp, inputs, when: Date.now() });
        try { this.executeActivity(k, inputs); this.logEvent({ elementType: 'activity_end', name: actName, component: comp, when: Date.now() }); } catch (e) { this.logEvent({ elementType: 'activity_error', name: actName, component: comp, error: e.message, when: Date.now() }); }
        this._pendingInputs[k] = {};
      }
    }
  }

  executeActivity(key, inputs) {
    const a = this._activities[key];
    if (!a) throw new Error('Activity not found: '+key);
    if (typeof a.invoke === 'function') return a.invoke(inputs, this);
    // fallback descriptor
    let last;
    for (const action of (a.actions || [])){
      const actInputs = (action.params && action.params.length) ? action.params.map((p,i) => inputs[i]) : inputs;
      if (action.executableFn) {
        last = action.executableFn.apply(null, actInputs);
      } else if (action.executableName && this.executables[action.executableName]) {
        last = this.executables[action.executableName].apply(null, actInputs);
      } else if (action.rawBody) {
        const fn = createExecutableFromExpression(action.rawBody, action.params || []);
        last = fn.apply(null, actInputs);
      }
    }
    return last;
  }

  // Validate data type before sending through port
  validatePortData(portName, data, expectedType) {
    if (!expectedType) return data; // No type validation if not specified
    // Type validation removed - just return data as-is
    return data;
  }

  // Get type registry for external access (removed)
  getTypeRegistry() {
    return null; // Type registry removed
  }
}

class Component extends Element {
  constructor(name, opts = {}){
    super(name, opts);
    this.ports = {};
    this.components = {}; // child instances
    this.sysadlDefinition = opts && opts.sysadlDefinition ? opts.sysadlDefinition : null;
  // preserve explicit boundary flag when provided by generator
    this.isBoundary = !!(opts && opts.isBoundary);
  }
  addPort(p){ if (!p || !p.name) return; if (this.ports[p.name]) return this.ports[p.name]; this.ports[p.name] = p; return p; }
  addComponent(inst){ this.components[inst.name] = inst; }
}

class Connector extends Element {
  constructor(name, opts = {}){ super(name, opts); this.participants = []; }
  addParticipant(p){ this.participants.push(p); }
  // register a Port endpoint with this connector (model is needed to map back)
  // Accepts a Port or a CompositePort sub-port. No runtime name-based resolution happens here.
  addEndpoint(model, port){
    try{
      this.participants = this.participants || [];
      if(port && port.owner && port.name) this.participants.push(port);
      // inform model about this endpoint for dispatch
      if(model && typeof model.registerConnectorEndpoint === 'function') model.registerConnectorEndpoint(this, port.owner, port.name);
    }catch(e){}
  }
  // forward incoming value from one endpoint to the other endpoints
  forwardFrom(compName, portName, value, model){
    const parts = (this.participants || []).filter(Boolean);
    for(const p of parts){
      try{
        // skip the origin endpoint (match by owner+name)
        if(p.owner === compName && p.name === portName) continue;
        if(typeof p.receive === 'function') p.receive(value, model);
      }catch(e){}
    }
  }
}

class Port extends Element {
  constructor(name, direction='in', opts={}){
    super(name, opts);
    this.direction = direction;
    this.last = undefined;
    this.owner = opts.owner || null;
    this.expectedType = opts.expectedType || null; // Type validation
  }

  send(v, model){
    // Type validation removed
    model && model.logEvent && model.logEvent({ elementType: 'port_send', component: this.owner, name: this.name, inputs: [v], when: Date.now() });
    this.last = v;
    if (this.binding && typeof this.binding.receive === 'function') this.binding.receive(v, model);
    if (model) {
      // dispatch to connectors first (connectors know endpoints and will forward to other ports)
      if (typeof model._dispatchConnectors === 'function') model._dispatchConnectors(this.owner, this.name, v);
      // still notify model of receive to trigger activities on this component
      model.handlePortReceive(this.owner, this.name, v);
    }
  }

  receive(v, model){
    // Type validation removed
    model && model.logEvent && model.logEvent({ elementType: 'port_receive', component: this.owner, name: this.name, inputs: [v], when: Date.now() });
    this.last = v;
    if (model) model.handlePortReceive(this.owner, this.name, v);
  }

  bindTo(ref){ this.binding = ref; }
}

// CompositePort: a Port that contains named sub-ports. Treated as a Port
// for compatibility. Sub-ports are regular Port instances whose owner is
// the composite port's qualified owner path (e.g. 'compName.compositePort').
class CompositePort extends Port {
  constructor(name, direction='in', opts={}){
    super(name, direction, opts);
    this.subports = {}; // name -> Port
  }
  addSubPort(name, port){
  if (!name || !port) return;
  // if sub-port already exists, keep existing instance (idempotent)
  if (this.subports && this.subports[name]) return this.subports[name];
  // port.owner becomes composite qualified owner
  port.owner = (this.owner ? (this.owner + '.' + this.name) : this.owner) || port.owner;
  this.subports[name] = port;
  return port;
  }
  getSubPort(name){ return this.subports && this.subports[name] ? this.subports[name] : null; }
  // send to composite: policy = broadcast to all subports if no sub-name provided
  send(v, model){
    // Type validation removed
    model && model.logEvent && model.logEvent({ elementType: 'port_send', component: this.owner, name: this.name, inputs: [v], when: Date.now() });
    // dispatch to connectors registered on composite-level first
    if (model && typeof model._dispatchConnectors === 'function') model._dispatchConnectors(this.owner, this.name, v);
    // then forward to subports (broadcast)
    for (const sp of Object.values(this.subports || {})) { try { if (sp && typeof sp.receive === 'function') sp.receive(v, model); } catch(e){} }
    // activities: composite itself may have activities bound to its name
    if (model) model.handlePortReceive(this.owner, this.name, v);
  }
  // receiving on composite behaves similarly
  receive(v, model){
    // Type validation removed
    model && model.logEvent && model.logEvent({ elementType: 'port_receive', component: this.owner, name: this.name, inputs: [v], when: Date.now() });
    if (model && typeof model._dispatchConnectors === 'function') model._dispatchConnectors(this.owner, this.name, v);
    for (const sp of Object.values(this.subports || {})) { try { if (sp && typeof sp.receive === 'function') sp.receive(v, model); } catch(e){} }
    if (model) model.handlePortReceive(this.owner, this.name, v);
  }
}

class Action {
  constructor(name, params=[], executableName=null, rawBody=null){ this.name = name; this.params = params.slice(); this.executableName = executableName; this.rawBody = rawBody; this.executableFn = null; }
  invoke(inputs, model){ if (!this.executableFn && this.executableName && model && model.executables[this.executableName]) this.executableFn = model.executables[this.executableName]; if (this.executableFn) return this.executableFn.apply(null, inputs); if (this.rawBody) { const fn = createExecutableFromExpression(this.rawBody, this.params || []); this.executableFn = fn; return fn.apply(null, inputs); } }
}

class Activity {
  constructor(name, opts={}){ this.name = name; this.component = opts.component || null; this.inputPorts = opts.inputPorts ? opts.inputPorts.slice() : []; this.actions = (opts.actions||[]).map(a=> a instanceof Action ? a : new Action(a.name||null, a.params||[], a.executable||null, a.body||null)); }
  addAction(a){ this.actions.push(a instanceof Action ? a : new Action(a.name, a.params, a.executable, a.body)); }
  invoke(inputs, model){ let last; for (const a of this.actions){ model && model.logEvent && model.logEvent({ elementType: 'action_invoke', activity: this.name, action: a.name, inputs, when: Date.now() }); last = a.invoke(inputs, model); model && model.logEvent && model.logEvent({ elementType: 'action_result', activity: this.name, action: a.name, output: last, when: Date.now() }); } return last; }
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

// Built-in SysADL types (simplified, no registration)
const Int = class {
  constructor(value) {
    if (value !== undefined) {
      this.value = parseInt(value, 10);
      if (isNaN(this.value)) throw new Error(`Invalid Int value: ${value}`);
    }
  }
};

const Bool = class {
  constructor(value) {
    if (value !== undefined) {
      this.value = Boolean(value);
    }
  }
};

const Str = class {
  constructor(value) {
    if (value !== undefined) {
      this.value = String(value);
    }
  }
};

const Void = class {
  constructor(value) {
    if (value !== undefined) {
      this.value = value;
    }
  }
};

const Real = class {
  constructor(value) {
    if (value !== undefined) {
      this.value = parseFloat(value);
      if (isNaN(this.value)) throw new Error(`Invalid Real value: ${value}`);
    }
  }
};

// Simple Enum class for generated code
class Enum {
  constructor(...values) {
    this._values = values;

    // Add properties for each enum value (lowercase access)
    values.forEach((value, index) => {
      const propName = value.toLowerCase();
      Object.defineProperty(this, propName, {
        get() { return value; },
        enumerable: true,
        configurable: true
      });
    });
  }

  // Static method to create enum with properties
  static create(...values) {
    return new Enum(...values);
  }
}

// Export everything (type registry removed)
module.exports = {
  Model,
  Element,
  Component,
  Connector,
  Port,
  CompositePort,
  Activity,
  Action,
  createExecutableFromExpression,
  Enum,
  // Built-in types
  Int,
  Boolean: Bool,
  String: Str,
  Void,
  Real
};

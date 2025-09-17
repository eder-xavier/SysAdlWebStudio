// v0.3 runtime (renamed and adapted from v0.2)
// Exports: Model, Element, Component, Connector, Port, Activity, Action, Executable helper

class Element {
  constructor(name, opts = {}) {
    this.name = name ? name.toString() : '';
    this.sysadlName = name ? name.toString() : '';
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
  }

  addComponent(inst) {
    if (!inst || !inst.name) return;
    this.components[inst.name] = inst;
  }

  addConnector(conn) { if (conn && conn.name) this.connectors[conn.name] = conn; }

  logEvent(event) {
    this._log = this._log || [];
    this._log.push(event);
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
    this.connectors = {}; // connectors within this component
    this.sysadlDefinition = opts && opts.sysadlDefinition ? opts.sysadlDefinition : null;
  // preserve explicit boundary flag when provided by generator
    this.isBoundary = !!(opts && opts.isBoundary);
  }
  addPort(p){ if (!p || !p.name) return; if (this.ports[p.name]) return this.ports[p.name]; this.ports[p.name] = p; return p; }
  addComponent(inst){ this.components[inst.name] = inst; }
  addConnector(conn) { if (conn && conn.name) this.connectors[conn.name] = conn; }
  
  // Get a port by name
  getPort(portName) {
    return this.ports[portName] || null;
  }
}

class Connector extends Element {
  constructor(name, opts = {}){ super(name, opts); this.participants = []; }
  addParticipant(p){ this.participants.push(p); }
  
  // Bind two ports together in this connector
  bind(fromPort, toPort) {
    if (!fromPort || !toPort) return;
    this.participants = this.participants || [];
    
    // Add both ports as participants if not already present
    if (!this.participants.some(p => p === fromPort)) {
      this.participants.push(fromPort);
    }
    if (!this.participants.some(p => p === toPort)) {
      this.participants.push(toPort);
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
      // notify model of receive to trigger activities on this component
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

// SimplePort: extends Port for simple data ports
class SimplePort extends Port {
  constructor(name, direction='in', opts={}){
    super(name, direction, opts);
  }
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
    // forward to subports (broadcast)
    for (const sp of Object.values(this.subports || {})) { try { if (sp && typeof sp.receive === 'function') sp.receive(v, model); } catch(e){} }
    // activities: composite itself may have activities bound to its name
    if (model) model.handlePortReceive(this.owner, this.name, v);
  }
  // receiving on composite behaves similarly
  receive(v, model){
    // Type validation removed
    model && model.logEvent && model.logEvent({ elementType: 'port_receive', component: this.owner, name: this.name, inputs: [v], when: Date.now() });
    for (const sp of Object.values(this.subports || {})) { try { if (sp && typeof sp.receive === 'function') sp.receive(v, model); } catch(e){} }
    if (model) model.handlePortReceive(this.owner, this.name, v);
  }
}

// Base class for behavioral elements with pins as parameters
class BehavioralElement extends Element {
  constructor(name, opts = {}) {
    super(name, opts);
    this.inParameters = opts.inParameters || []; // [{name, type, direction: 'in'}]
    this.outParameters = opts.outParameters || []; // [{name, type, direction: 'out'}]
    this.delegates = opts.delegates || []; // [{from, to}] for pin delegations
  }

  // Validate pin parameters generically
  validateParameters(inputs, outputs) {
    if (inputs && this.inParameters.length > 0) {
      for (let i = 0; i < this.inParameters.length; i++) {
        const param = this.inParameters[i];
        const value = inputs[i];
        if (param.type && !this.validatePinType(value, param.type)) {
          throw new Error(`Invalid type for pin ${param.name}: expected ${param.type}, got ${typeof value}`);
        }
      }
    }
    return true;
  }

  // Generic type validation for pins
  validatePinType(value, expectedType) {
    if (!expectedType) return true; // No validation if no type specified
    
    switch (expectedType.toLowerCase()) {
      case 'real': return typeof value === 'number' && !isNaN(value);
      case 'int': return Number.isInteger(value);
      case 'boolean': return typeof value === 'boolean';
      case 'string': return typeof value === 'string';
      case 'void': return true;
      default: return true; // Allow custom types for now
    }
  }

  // Process pin delegations generically
  processDelegations(inputValues, model) {
    const processedValues = [...inputValues];
    for (const delegation of this.delegates) {
      const fromIndex = this.inParameters.findIndex(p => p.name === delegation.from);
      const toIndex = this.outParameters.findIndex(p => p.name === delegation.to);
      if (fromIndex !== -1 && toIndex !== -1) {
        // Delegate value from input pin to output pin
        processedValues[toIndex] = processedValues[fromIndex];
      }
    }
    return processedValues;
  }
}

// Generic Constraint class
class Constraint extends BehavioralElement {
  constructor(name, opts = {}) {
    super(name, opts);
    this.equation = opts.equation || null; // ALF equation as string
    this.compiledFn = null;
  }

  // Compile ALF equation to JavaScript function
  compile() {
    if (this.equation && !this.compiledFn) {
      const paramNames = this.inParameters.map(p => p.name);
      this.compiledFn = createExecutableFromExpression(this.equation, paramNames);
    }
    return this.compiledFn;
  }

  // Evaluate constraint with given inputs
  evaluate(inputs, model) {
    this.validateParameters(inputs);
    if (!this.compiledFn) this.compile();
    
    if (this.compiledFn) {
      const result = this.compiledFn.apply(null, inputs);
      model && model.logEvent && model.logEvent({
        elementType: 'constraint_evaluate',
        name: this.name,
        inputs,
        result,
        when: Date.now()
      });
      return result;
    }
    return true; // Default to true if no constraint
  }
}

// Generic Executable class
class Executable extends BehavioralElement {
  constructor(name, opts = {}) {
    super(name, opts);
    this.body = opts.body || null; // ALF body as string
    this.compiledFn = null;
  }

  // Compile ALF body to JavaScript function
  compile() {
    if (this.body && !this.compiledFn) {
      const paramNames = this.inParameters.map(p => p.name);
      this.compiledFn = createExecutableFromExpression(this.body, paramNames);
    }
    return this.compiledFn;
  }

  // Execute with given inputs
  execute(inputs, model) {
    this.validateParameters(inputs);
    if (!this.compiledFn) this.compile();
    
    if (this.compiledFn) {
      const processedInputs = this.processDelegations(inputs, model);
      const result = this.compiledFn.apply(null, processedInputs);
      model && model.logEvent && model.logEvent({
        elementType: 'executable_execute',
        name: this.name,
        inputs: processedInputs,
        result,
        when: Date.now()
      });
      return result;
    }
    return undefined;
  }
}

// Enhanced Action class with pins as parameters
class Action extends BehavioralElement {
  constructor(name, opts = {}) {
    super(name, opts);
    this.executableName = opts.executableName || null;
    this.rawBody = opts.rawBody || null;
    this.executableFn = null;
    this.constraints = opts.constraints || []; // Array of Constraint instances
    this.executables = opts.executables || []; // Array of Executable instances
  }

  // Register constraint within this action
  registerConstraint(constraint) {
    if (constraint instanceof Constraint) {
      this.constraints.push(constraint);
    }
  }

  // Register executable within this action
  registerExecutable(executable) {
    if (executable instanceof Executable) {
      this.executables.push(executable);
    }
  }

  invoke(inputs, model) {
    this.validateParameters(inputs);
    
    // Process constraints first
    for (const constraint of this.constraints) {
      const constraintResult = constraint.evaluate(inputs, model);
      if (!constraintResult) {
        throw new Error(`Constraint ${constraint.name} failed in action ${this.name}`);
      }
    }

    // Process executables
    let result;
    for (const executable of this.executables) {
      result = executable.execute(inputs, model);
    }

    // Legacy compatibility: fallback to old executable handling
    if (!this.executableFn && this.executableName && model && model.executables[this.executableName]) {
      this.executableFn = model.executables[this.executableName];
    }
    
    if (this.executableFn) {
      result = this.executableFn.apply(null, inputs);
    } else if (this.rawBody) {
      const paramNames = this.inParameters.map(p => p.name);
      const fn = createExecutableFromExpression(this.rawBody, paramNames);
      this.executableFn = fn;
      result = fn.apply(null, inputs);
    }

    return result;
  }
}

// Enhanced Activity class with pins as parameters
class Activity extends BehavioralElement {
  constructor(name, opts = {}) {
    super(name, opts);
    this.component = opts.component || null;
    this.inputPorts = opts.inputPorts ? opts.inputPorts.slice() : [];
    this.actions = opts.actions || [];
  }

  // Register action within this activity
  registerAction(action) {
    if (action instanceof Action) {
      this.actions.push(action);
    }
  }

  addAction(a) {
    if (a instanceof Action) {
      this.actions.push(a);
    } else {
      // Legacy compatibility
      this.actions.push(new Action(a.name, {
        inParameters: a.params ? a.params.map(p => ({name: p, type: null, direction: 'in'})) : [],
        executableName: a.executable,
        rawBody: a.body
      }));
    }
  }

  invoke(inputs, model) {
    this.validateParameters(inputs);
    
    let last;
    for (const action of this.actions) {
      model && model.logEvent && model.logEvent({
        elementType: 'action_invoke',
        activity: this.name,
        action: action.name,
        inputs,
        when: Date.now()
      });
      
      // Map activity inputs to action inputs based on parameters
      const actionInputs = action.inParameters.length > 0 
        ? action.inParameters.map((p, i) => inputs[i])
        : inputs;
      
      last = action.invoke(actionInputs, model);
      
      model && model.logEvent && model.logEvent({
        elementType: 'action_result',
        activity: this.name,
        action: action.name,
        output: last,
        when: Date.now()
      });
    }
    return last;
  }
}

function createExecutableFromExpression(exprText, paramNames = []) {
  const raw = String(exprText || '').trim();

  // quick guard: empty body -> noop
  if (!raw) return function() { return undefined; };

  // translate SysADL surface syntax into JS-ish source
  function translateSysadlExpression(src) {
    // Extract body from executable definitions
    let s = String(src || '').replace(/\r\n?/g, '\n');
    
    // If this is an executable definition, extract just the body
    const execMatch = s.match(/executable\s+def\s+\w+\s*\([^)]*\)\s*:\s*out\s+\w+\s*\{([\s\S]*)\}/i);
    if (execMatch) {
      s = execMatch[1].trim();
    }
    
    // normalize and drop noisy DSL lines
    s = s.split('\n').filter(line => {
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

// Base classes for SysADL type system
class SysADLType {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return String(this.value);
  }
}

class ValueType extends SysADLType {
  constructor(value) {
    super(value);
    this.value = this.parse(value);
    this.validate();
  }

  parse(value) {
    return value; // Override in subclasses
  }

  validate() {
    // Override in subclasses for validation
  }
}

class DataType extends SysADLType {
  constructor(obj = {}) {
    super(obj);
    this.initializeAttributes(obj);
  }

  initializeAttributes(obj) {
    // Will be implemented by generated subclasses
  }
}

class Dimension {
  constructor(name) {
    this.name = name;
  }

  toString() {
    return this.name;
  }
}

class Unit {
  constructor(name, config = {}) {
    this.name = name;
    this.dimension = config.dimension || null;
  }

  toString() {
    return this.name;
  }
}

// Factory functions for type creation
function valueType(name, config = {}) {
  return class extends ValueType {
    constructor(value) {
      super(value);
    }

    parse(value) {
      if (config.extends && typeof config.extends.prototype.parse === 'function') {
        // If extending another ValueType, use its parse method first
        const baseInstance = new config.extends(value);
        return baseInstance.value;
      }
      return config.parse ? config.parse(value) : value;
    }

    validate() {
      if (config.validate && !config.validate(this.value)) {
        throw new Error(`Invalid ${name} value: ${this.value}`);
      }
    }

    static get unit() {
      return config.unit || null;
    }

    static get dimension() {
      return config.dimension || null;
    }
  };
}

function dataType(name, attributes = {}) {
  return class extends DataType {
    initializeAttributes(obj) {
      for (const [attrName, attrType] of Object.entries(attributes)) {
        if (attrName in obj) {
          // Type validation could be added here in the future
          this[attrName] = obj[attrName];
        }
      }
    }
  };
}

function dimension(name) {
  return new Dimension(name);
}

function unit(name, config = {}) {
  return new Unit(name, config);
}

// Built-in primitive types (always available)
const Int = class extends ValueType {
  parse(value) {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) throw new Error(`Invalid Int value: ${value}`);
    return parsed;
  }
};

const SysADLBoolean = class extends ValueType {
  parse(value) {
    return globalThis.Boolean(value);
  }
};

const SysADLString = class extends ValueType {
  parse(value) {
    return globalThis.String(value);
  }
};

const Void = class extends ValueType {
  parse(value) {
    return value;
  }
};

const Real = class extends ValueType {
  parse(value) {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) throw new Error(`Invalid Real value: ${value}`);
    return parsed;
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

// Export everything
module.exports = {
  Model,
  Element,
  Component,
  Connector,
  Port,
  SimplePort,
  CompositePort,
  Activity,
  Action,
  BehavioralElement,
  Constraint,
  Executable,
  createExecutableFromExpression,
  Enum,
  // Built-in primitive types
  Int,
  Boolean: SysADLBoolean,
  String: SysADLString,
  Void,
  Real,
  // Type system
  ValueType,
  DataType,
  Dimension,
  Unit,
  // Factory functions
  valueType,
  dataType,
  dimension,
  unit
};

// Minimal SysADL runtime utilities for generated models

class ElementBase {
  constructor(name, props = {}) {
    this.name = name;
    this.props = { ...props };
  }
}

class ModelBase extends ElementBase {
  constructor(name) {
    super(name);
    this.components = {};
    this.connectors = {};
    this.executables = {};
    this.allocations = [];
  this._log = [];
  }

  addComponent(inst) {
    this.components[inst.name] = inst;
  }

  addConnector(inst) {
    this.connectors[inst.name] = inst;
  }

  addExecutable(name, fn) {
    // wrap executable to record inputs/outputs in model log
    const model = this;
    const paramCount = typeof fn.length === 'number' ? fn.length : 0;
    const paramNames = Array.from({ length: paramCount }).map((_, i) => 'p' + i);
    // create a factory that returns a function with formal parameters so .length matches
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
      // eslint-disable-next-line no-new-func
      const factory = new Function(...factoryArgs.concat([factoryCode]));
      const wrapped = factory(fn, model, name);
      this.executables[name] = wrapped;
    } catch (e) {
      // fallback to simple wrapper
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

  // Activity support: register activities, manage pending inputs and execute when ready
  registerActivity(activityName, descriptor) {
    // descriptor: { component, inputPorts: [p1,p2], actions: [{ name, executable?, params: [] }, ...] }
    if (!this._activities) this._activities = {};
    if (!this._pendingInputs) this._pendingInputs = {};
    this._activities[activityName] = descriptor;
    this._pendingInputs[activityName] = {};
  }

  handlePortReceive(componentName, portName, value) {
    // find activities registered on this component that expect this port
    if (!this._activities) return;
    for (const [actName, desc] of Object.entries(this._activities)) {
      if (desc.component !== componentName) continue;
      const inputPorts = desc.inputPorts || [];
      if (!inputPorts.includes(portName)) continue;
      const pending = this._pendingInputs[actName] || {};
      pending[portName] = value;
      this._pendingInputs[actName] = pending;
      // check if all inputs are present
      const ready = inputPorts.every(p => Object.prototype.hasOwnProperty.call(pending, p));
      if (ready) {
        // clone inputs for execution
        const inputs = inputPorts.map(p => pending[p]);
        try {
          this.logEvent({ elementType: 'activity_start', name: actName, component: componentName, inputs, when: Date.now() });
          this.executeActivity(actName, inputs);
          this.logEvent({ elementType: 'activity_end', name: actName, component: componentName, when: Date.now() });
        } catch (e) {
          this.logEvent({ elementType: 'activity_error', name: actName, component: componentName, error: e.message, when: Date.now() });
        }
        // clear pending inputs for this activity (consume semantics)
        this._pendingInputs[actName] = {};
      }
    }
  }

  executeActivity(activityName, inputs) {
    const desc = (this._activities || {})[activityName];
    if (!desc) throw new Error('Unknown activity: ' + activityName);
    // simple sequential execution of actions. Each action receives inputs array.
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
        // action body as expression
        try {
          this.logEvent({ elementType: 'action_invoke', activity: activityName, action: action.name || '<body>', inputs: actInputs, when: Date.now() });
          const fn = createExecutableFromExpression(action.body, action.params || []);
          // wrap and call without double-logging (use underlying function)
          lastResult = fn.apply(null, actInputs);
          this.logEvent({ elementType: 'action_result', activity: activityName, action: action.name || '<body>', output: lastResult, when: Date.now() });
        } catch (e) {
          this.logEvent({ elementType: 'action_error', activity: activityName, action: action.name || '<body>', error: e.message, when: Date.now() });
          throw e;
        }
      } else {
        // no-op action
        this.logEvent({ elementType: 'action_skipped', activity: activityName, action: action.name || '<unknown>', when: Date.now() });
      }
      // lastResult can be used by next action if needed (not implemented more sophisticated passing)
    }
    return lastResult;
  }

  findComponent(name) {
    return this.components[name];
  }

  logEvent(entry) {
  // entry: { elementType, name, inputs, output, error?, when }
  // Use a module-level global event id so all model instances share a single increasing id
  if (typeof __globalSysAdlEventId === 'undefined') {
    // create on global object if possible, otherwise on this (fallback)
    try { global.__globalSysAdlEventId = global.__globalSysAdlEventId || 1; } catch (e) { this._instanceEventId = this._instanceEventId || 1; }
  }
  const now = new Date();
  let id;
  try {
    id = global.__globalSysAdlEventId++;
  } catch (e) {
    // fallback to instance-local counter if global isn't writable
    if (!this._instanceEventId) this._instanceEventId = 1;
    id = this._instanceEventId++;
  }
  const annotated = Object.assign({}, entry, { when: now.toISOString(), eventId: id });
  this._log.push(annotated);
  }

  getLog() {
    return this._log.slice();
  }

  dumpLog() {
    for (const e of this._log) {
      console.log(JSON.stringify(e));
    }
  }
}

class ComponentBase extends ElementBase {
  constructor(name) {
    super(name);
    this.ports = {};
    this.subcomponents = {};
  }

  addPort(port) {
    this.ports[port.name] = port;
  }

  addSubcomponent(inst) {
    this.subcomponents[inst.name] = inst;
  }
}

class ConnectorBase extends ElementBase {
  constructor(name) {
    super(name);
    this.participants = {};
  }

  addParticipant(portRef) {
    const key = `${portRef.component}.${portRef.port}`;
    this.participants[key] = portRef;
  }
}

class PortBase extends ElementBase {
  constructor(name, direction = 'in', type = null) {
    super(name);
    this.direction = direction; // 'in' | 'out' | 'inout'
    this.type = type;
    this.binding = null; // reference to other port
    this.lastValue = undefined;
  }

  bindTo(portRef) {
    // portRef may be an object with receive(), or a descriptor { component, port }
    this.binding = portRef;
  }

  send(value, model) {
    // model is optional, used for logging
    const inputs = [value];
    // log send from this port
    if (model && typeof model.logEvent === 'function') {
      model.logEvent({ elementType: 'port_send', name: this.name, inputs, when: Date.now() });
    }
    this.lastValue = value;
    // forward to bound port if object
    if (this.binding && typeof this.binding.receive === 'function') {
      // if binding is a port-like object without component info, forward as before
      this.binding.receive(value, model);
    }
    // if model is provided and this port has ownerComponent, inform the model so it can coordinate activities
    if (model && typeof model.handlePortReceive === 'function' && this.ownerComponent) {
      try { model.handlePortReceive(this.ownerComponent, this.name, value); } catch (e) { /* swallow */ }
    }
    return value;
  }

  receive(value, model) {
    // log receive on this port
    const inputs = [value];
    if (model && typeof model.logEvent === 'function') {
      model.logEvent({ elementType: 'port_receive', name: this.name, inputs, when: Date.now() });
    }
    this.lastValue = value;
    // notify model for activity coordination
    if (model && typeof model.handlePortReceive === 'function' && this.ownerComponent) {
      try { model.handlePortReceive(this.ownerComponent, this.name, value); } catch (e) { /* swallow */ }
    }
    return value;
  }
}

function createExecutableFromExpression(exprText, paramNames = []) {
  // Quick generator: create a JS function from expression text.
  // Security: models should be trusted. If not, replace this with a safe evaluator.
  const args = [...paramNames, `return (${exprText});`];
  try {
    // eslint-disable-next-line no-new-func
  const fn = new Function(...args);
  // return plain function; caller (Model) will wrap to log
  return fn;
  } catch (e) {
    // Fallback: implement a tiny interpreter that understands a couple of SysADL idioms
    // - arrow 'a->b' meaning property access: a[b] or a.b
    // - namespace 'Type::member' we'll return a string 'Type::member' as identifier placeholder
    const expr = String(exprText || '').trim();
    return function(...argsVals) {
      // prepare param lookup
      const env = {};
      for (let i = 0; i < paramNames.length; i++) env[paramNames[i]] = argsVals[i];
      // simple numeric or identifier
      if (/^[0-9.\-+eE]+$/.test(expr)) return Number(expr);
      // property access a->b or a->b->c
      if (expr.indexOf('->') !== -1) {
        const parts = expr.split('->').map(s => s.trim());
        let cur = env[parts[0]];
        for (let i = 1; i < parts.length; i++) {
          const key = parts[i];
          if (cur == null) { cur = undefined; break; }
          // if cur is object, try property access; otherwise return undefined
          cur = cur[key] !== undefined ? cur[key] : cur[key];
        }
        return cur;
      }
      // namespace literal like Type::member -> return as string marker
      if (expr.indexOf('::') !== -1) return expr;
      // fallback: if expression matches a single param name, return it
      if (paramNames.includes(expr)) return env[expr];
      // last resort: attempt eval in safe sandbox of params
      try {
        const vmArgs = Object.keys(env).map(k => env[k]);
        const fnBody = `return (${expr});`;
        // eslint-disable-next-line no-new-func
        const f = new Function(...Object.keys(env), fnBody);
        return f(...vmArgs);
      } catch (err) {
        throw new Error(`Failed to evaluate expression fallback: ${err.message}`);
      }
    };
  }
}

module.exports = {
  ElementBase,
  ModelBase,
  ComponentBase,
  ConnectorBase,
  PortBase,
  createExecutableFromExpression,
};

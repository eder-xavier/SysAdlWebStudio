// v0.3 runtime (renamed and adapted from v0.2)
// Generic SysADL runtime without domain-specific configurations

// Exports: Model, Element, Component, Connector, Port, Activity, Action, Executable helper

class Element {
  constructor(name, opts = {}) {
    this.name = name ? name.toString() : '';
    this.sysadlName = name ? name.toString() : '';
    this.props = { ...opts };
  }
}

// Base class for SysADL elements
class SysADLBase extends Element {
  constructor(name, opts = {}) {
    super(name, opts);
    this.components = {};
    this.connectors = {};
    this.ports = {};
  }

  addComponent(comp) {
    if (!comp || !comp.name) return;
    this.components[comp.name] = comp;
  }

  addConnector(conn) {
    if (!conn || !conn.name) return;
    this.connectors[conn.name] = conn;
  }

  addPort(p) {
    if (!p || !p.name) return;
    if (this.ports[p.name]) return this.ports[p.name];
    this.ports[p.name] = p;
    return p;
  }
  
  // Get a port by name
  getPort(portName) {
    return this.ports[portName] || null;
  }
}

class Model extends SysADLBase {
  constructor(name) {
    super(name);
    this._activities = {};
    this._pendingInputs = {};
    this._executionTrace = [];
    this._traceEnabled = false;
    this._executionCounter = 0;
  }

  // Enable/disable execution tracing
  enableTrace() { this._traceEnabled = true; }
  disableTrace() { this._traceEnabled = false; }
  
  // Log structured execution step
  traceExecution(elementType, elementName, operation, input = null, output = null, metadata = {}) {
    if (!this._traceEnabled) return;
    
    const traceEntry = {
      sequence: this._executionCounter++,
      timestamp: Date.now(),
      iso_time: new Date().toISOString(),
      element_type: elementType,
      element_name: elementName,
      operation: operation,
      input: input,
      output: output,
      metadata: metadata
    };
    
    this._executionTrace.push(traceEntry);
    console.log('[TRACE]', JSON.stringify(traceEntry));
    return traceEntry;
  }
  
  // Get execution trace
  getExecutionTrace() { return this._executionTrace.slice(); }
  
  // Clear execution trace
  clearTrace() { 
    this._executionTrace = []; 
    this._executionCounter = 0;
  }

  registerActivity(key, activity) {
    if (!key) return;
    this._activities[key] = activity;
    this._pendingInputs[key] = {};
  }
  
  // Walk through all components recursively and apply function
  walkComponents(fn) {
    const visited = new Set();
    const walk = (obj) => {
      if (!obj || typeof obj !== 'object' || visited.has(obj)) return;
      visited.add(obj);
      
      // Check if this object is a component
      if (obj instanceof Component) {
        fn(obj);
      }
      
      // Recursively check components collection
      if (obj.components && typeof obj.components === 'object') {
        Object.values(obj.components).forEach(walk);
      }
    };
    walk(this);
  }
  
  // Walk through all connectors recursively and apply function
  walkConnectors(fn) {
    const visited = new Set();
    const walk = (obj) => {
      if (!obj || typeof obj !== 'object' || visited.has(obj)) return;
      visited.add(obj);
      
      // Check if this object is a connector
      if (obj instanceof Connector) {
        fn(obj);
      }
      
      // Recursively check connectors collection
      if (obj.connectors && typeof obj.connectors === 'object') {
        Object.values(obj.connectors).forEach(walk);
      }
      
      // Recursively check components (they may have connectors)
      if (obj.components && typeof obj.components === 'object') {
        Object.values(obj.components).forEach(walk);
      }
    };
    walk(this);
  }
  
  // Inject model reference into all components and connectors
  injectModelReference() {
    this.walkComponents(comp => comp.setModel(this));
    this.walkConnectors(conn => conn.setModel(this));
  }
  
  // Find activity associated with a port owner (component/connector)
  findActivityByPortOwner(owner) {
    let foundActivity = null;
    
    // First, try to find component with this owner name that has activityName
    this.walkComponents(comp => {
      if (comp.name === owner && comp.activityName) {
        foundActivity = this._activities[comp.activityName];
      }
    });
    
    if (foundActivity) return foundActivity;
    
    // Then, try to find connector with this owner name that has activityName  
    this.walkConnectors(conn => {
      if (conn.name === owner && conn.activityName) {
        foundActivity = this._activities[conn.activityName];
      }
    });
    
    if (foundActivity) return foundActivity;
    
    // Fallback: search activities that have this owner in their component property
    for (const activity of Object.values(this._activities)) {
      if (activity.props && activity.props.component === owner) {
        foundActivity = activity;
        break;
      }
    }
    
    return foundActivity;
  }
  
  // Central execution engine: handle port data reception and trigger activity execution
  handlePortReceive(owner, portName, value) {
    try {
      // Trace port reception at component level
      if (this._traceEnabled) {
        this.traceExecution('component_port', `${owner}.${portName}`, 'receive', value, null, {
          component: owner,
          port: portName
        });
      }
      
      // First, notify the component about port reception
      this.notifyComponentPortReceive(owner, portName, value);
      
      // Then, find and trigger activity
      const activity = this.findActivityByPortOwner(owner);
      
      if (!activity) {
        console.warn(`No activity found for port owner: ${owner}`);
        return;
      }

      // Trace activity lookup
      if (this._traceEnabled) {
        this.traceExecution('activity_lookup', activity.name, 'found_for_component', value, null, {
          component: owner,
          trigger_port: portName
        });
      }
      
      // Trigger the activity with port data
      if (typeof activity.trigger === 'function') {
        activity.trigger(portName, value);
      } else {
        console.warn(`Activity ${activity.name} does not have trigger method`);
      }
      
    } catch (error) {
      console.error(`Error in handlePortReceive for ${owner}.${portName}:`, error);
    }
  }
  
  // Notify component about port data reception
  notifyComponentPortReceive(owner, portName, value) {
    // Find the component by owner name
    let targetComponent = null;
    
    this.walkComponents(comp => {
      if (comp.name === owner) {
        targetComponent = comp;
      }
    });
    
    // If component found and has onPortReceive method, call it
    if (targetComponent && typeof targetComponent.onPortReceive === 'function') {
      targetComponent.onPortReceive(portName, value);
    }
  }
}

class Component extends SysADLBase {
  constructor(name, opts = {}) {
    super(name, opts);
    this.activityName = opts.activityName || null; // Apply activityName from options
    this._model = null;
    
    // Pin tracking for component activity execution
    this.pinValues = {}; // {portName: value}
    this.requiredInputPorts = new Set(); // ports that must receive data before activity execution
    this.lastExecutionTime = Date.now(); // Use current timestamp instead of hardcoded 0
  }
  
  setModel(model) {
    this._model = model;
    
    // Initialize required input ports based on component's activity
    this.initializeRequiredPorts();
  }
  
  // Initialize required input ports based on activity pins
  initializeRequiredPorts() {
    if (!this.activityName || !this._model) return;
    
    const activity = this._model._activities[this.activityName];
    if (activity) {
      // Map activity input pins to component ports
      activity.inParameters
        .filter(p => p.direction === 'in')
        .forEach(param => {
          // Assume port name matches pin name by default
          const portName = param.name;
          if (this.ports[portName]) {
            this.requiredInputPorts.add(portName);
            this.pinValues[portName] = undefined;
          }
        });
    }
  }
  
  // Called when a port receives data
  onPortReceive(portName, value) {
    // Store the value for this port
    this.pinValues[portName] = value;
    
    // Check if all required input ports have received data
    if (this.canExecuteActivity()) {
      this.executeActivity();
    }
  }
  
  // Check if all required input ports have data
  canExecuteActivity() {
    if (!this.activityName || !this._model) return false;
    
    for (const portName of this.requiredInputPorts) {
      if (this.pinValues[portName] === undefined) {
        return false;
      }
    }
    return true;
  }
  
  // Execute component activity when all inputs are ready
  executeActivity() {
    if (!this.activityName || !this._model) return;
    
    const activity = this._model._activities[this.activityName];
    if (!activity) return;
    
    console.log(`Component ${this.name} executing activity ${this.activityName}`);
    
    // Trigger activity with all collected pin values
    for (const [portName, value] of Object.entries(this.pinValues)) {
      if (value !== undefined) {
        activity.trigger(portName, value);
      }
    }
    
    // Clear pin values for next execution cycle
    this.clearPinValues();
    
    this.lastExecutionTime = Date.now();
  }
  
  // Clear pin values after activity execution
  clearPinValues() {
    Object.keys(this.pinValues).forEach(portName => {
      this.pinValues[portName] = undefined;
    });
  }
  
  // Lazy loading for activity
  getActivity() {
    if (!this.activityName || !this._model) return null;
    return this._model._activities[this.activityName];
  }
}class Connector extends SysADLBase {
  constructor(name, opts = {}){ 
    super(name, opts); 
    this.participants = [];
    this.activityName = null; // Direct reference to activity name
    this._model = null;
    
    // Generic schemas provided externally (no hardcoded values)
    this.participantSchema = opts.participantSchema || {};
    this.flowSchema = opts.flowSchema || [];
    this.internalConnectors = opts.internalConnectors || [];
    this.internalParticipants = {};
    this.internalConnectorInstances = {};
    
    // Initialize generic structure if schema provided
    if (Object.keys(this.participantSchema).length > 0) {
      // Delay initialization until setModel is called
      this._needsInitialization = true;
    }
  }
  
  setModel(model) {
    this._model = model;
    
    // Store reference to module context for class resolution
    if (model && model._moduleContext) {
      this._moduleContext = model._moduleContext;
    }
    
    // Initialize if needed now that classes are available
    if (this._needsInitialization) {
      this.initializeInternalParticipants();
      this.setupInternalFlows();
      this.setupInternalConnectors();
      this._needsInitialization = false;
    }
    
    // Set model for internal connector instances
    Object.values(this.internalConnectorInstances).forEach(connector => {
      connector.setModel(model);
    });
  }
  
  // Lazy loading for activity
  getActivity() {
    if (!this.activityName || !this._model) return null;
    return this._model._activities[this.activityName];
  }
  
  addParticipant(p){ this.participants.push(p); }
  
  // GENERIC: Initialize internal participants based on schema
  initializeInternalParticipants() {
    Object.entries(this.participantSchema).forEach(([name, schema]) => {
      console.log(`Initializing participant ${name} with portClass ${schema.portClass}`);
      
      if (schema.portType === 'composite') {
        // Create composite port
        const CompositePortClass = this.resolvePortClass(schema.portClass);
        console.log(`Resolved composite port class:`, CompositePortClass);
        this.internalParticipants[name] = new CompositePortClass(name, { 
          owner: this.name,
          connectorRole: schema.role 
        });
        
        // Initialize sub-ports for composite port
        this.initializeSubPorts(name, schema);
      } else {
        // Simple port (current behavior)
        const PortClass = this.resolvePortClass(schema.portClass);
        console.log(`Resolved simple port class:`, PortClass);
        console.log(`PortClass type:`, typeof PortClass);
        console.log(`PortClass constructor:`, PortClass && PortClass.constructor);
        
        if (!PortClass || typeof PortClass !== 'function') {
          console.error(`Invalid port class for ${name}: ${schema.portClass}`);
          return;
        }
        
        this.internalParticipants[name] = new PortClass(name, { 
          owner: this.name,
          connectorRole: schema.role 
        });
      }
    });
  }
  
  // GENERIC: Initialize sub-ports for composite ports
  initializeSubPorts(participantName, schema) {
    const compositePort = this.internalParticipants[participantName];
    
    if (schema.subPorts) {
      Object.entries(schema.subPorts).forEach(([subPortName, subPortClass]) => {
        const SubPortClass = this.resolvePortClass(subPortClass);
        const subPort = new SubPortClass(subPortName, {
          owner: `${this.name}.${participantName}`,
          parent: compositePort
        });
        
        compositePort.addSubPort(subPortName, subPort);
      });
    }
  }
  
  // GENERIC: Resolve port class dynamically
  resolvePortClass(className) {
    console.log(`Resolving port class: ${className}`);
    console.log(`Module context available:`, !!this._moduleContext);
    console.log(`Module context keys:`, this._moduleContext ? Object.keys(this._moduleContext) : 'none');
    
    // Try different resolution strategies
    const tryEval = () => {
      try {
        // Try to get from module context first
        if (this._moduleContext && this._moduleContext[className]) {
          console.log(`Found in module context:`, this._moduleContext[className]);
          return this._moduleContext[className];
        }
        
        // Try to get from require.cache or global context
        const ModuleName = className;
        if (global[ModuleName]) {
          console.log(`Found in global:`, global[ModuleName]);
          return global[ModuleName];
        }
        
        // Try eval in different contexts
        const result = eval(`(typeof ${ModuleName} !== 'undefined') ? ${ModuleName} : null`);
        console.log(`Found via eval:`, result);
        return result;
      } catch (e) {
        console.warn(`Could not resolve port class: ${className}`, e.message);
        return null;
      }
    };
    
    const result = global[className] || 
           (this._model && this._model.classRegistry && this._model.classRegistry[className]) ||
           tryEval();
           
    console.log(`Final result for ${className}:`, result);
    return result;
  }
  
  // GENERIC: Setup internal flows based on schema
  setupInternalFlows() {
    this.flowSchema.forEach(flow => {
      const fromParticipant = this.internalParticipants[flow.from];
      const toParticipant = this.internalParticipants[flow.to];
      
      if (fromParticipant && toParticipant) {
        fromParticipant.bindTo({
          receive: (value, model) => {
            // Trace connector flow start
            if (model && model._traceEnabled) {
              model.traceExecution('connector_flow', `${this.name}_${flow.from}_to_${flow.to}`, 'flow_start', value, null, {
                connector: this.name,
                from: flow.from,
                to: flow.to,
                data_type: flow.dataType
              });
            }
            
            // Generic validation
            this.validateDataFlow(flow.from, flow.to, value, flow.dataType);
            
            // Generic logging
            this.logInternalFlow(flow.from, flow.to, value, model);
            
            // Execute connector activity if it exists
            let processedValue = value;
            if (this.activityName && model) {
              const activity = model._activities[this.activityName];
              if (activity) {
                console.log(`Connector ${this.name} executing activity ${this.activityName} with value:`, value);
                
                // Trace activity trigger from connector
                if (model._traceEnabled) {
                  model.traceExecution('activity_trigger', activity.name, 'trigger_from_connector', value, null, {
                    connector: this.name,
                    trigger_port: flow.from
                  });
                }
                
                // Trigger activity with the input data
                activity.trigger(flow.from, value);
                
                // If activity executes immediately, get result
                if (activity.canExecute()) {
                  const result = activity.executeWhenReady();
                  if (result !== undefined) {
                    processedValue = result;
                    
                    // Trace activity result to connector
                    if (model._traceEnabled) {
                      model.traceExecution('activity_result', activity.name, 'result_to_connector', value, processedValue, {
                        connector: this.name
                      });
                    }
                  }
                }
              }
            }
            
            // Generic transformation
            const transformedValue = this.applyTransformation(processedValue, flow.transformation);
            
            // Trace transformation if applied
            if (transformedValue !== processedValue && model && model._traceEnabled) {
              model.traceExecution('transformation', `${this.name}_${flow.transformation}`, 'apply', processedValue, transformedValue, {
                flow: `${flow.from}_to_${flow.to}`,
                connector: this.name
              });
            }
            
            toParticipant.send(transformedValue, model);
            
            // Trace connector flow end
            if (model && model._traceEnabled) {
              model.traceExecution('connector_flow', `${this.name}_${flow.from}_to_${flow.to}`, 'flow_end', value, transformedValue, {
                connector: this.name,
                from: flow.from,
                to: flow.to
              });
            }
          }
        });
      }
    });
  }
  
  // GENERIC: Setup internal connectors
  setupInternalConnectors() {
    this.internalConnectors.forEach(connectorDef => {
      // Create instance of sub-connector
      const ConnectorClass = this.resolveConnectorClass(connectorDef.type);
      const connector = new ConnectorClass(connectorDef.name);
      
      // Configure bindings
      connectorDef.bindings.forEach(binding => {
        const fromPort = this.resolveInternalPort(binding.from);
        const toPort = this.resolveInternalPort(binding.to);
        
        if (fromPort && toPort) {
          connector.bind(fromPort, toPort);
        }
      });
      
      this.internalConnectorInstances[connectorDef.name] = connector;
    });
  }
  
  // GENERIC: Resolve internal ports (including sub-ports)
  resolveInternalPort(portPath) {
    const parts = portPath.split('.');
    
    if (parts.length === 2) {
      // Format: "participant.subPort"
      const [participantName, subPortName] = parts;
      const participant = this.internalParticipants[participantName];
      
      if (participant && participant.getSubPort) {
        return participant.getSubPort(subPortName);
      }
    }
    
    return null;
  }
  
  // GENERIC: Resolve connector class
  resolveConnectorClass(className) {
    return global[className] || 
           (this._model && this._model.classRegistry && this._model.classRegistry[className]) ||
           eval(className);
  }
  
  // GENERIC: Bind external ports with validation
  bind(externalFromPort, externalToPort) {
    const participants = Object.keys(this.participantSchema);
    
    if (participants.length === 0) {
      // Fallback to legacy behavior if no schema
      return this.bindLegacy(externalFromPort, externalToPort);
    }
    
    // Generic strategy: first participant = source, second = target
    const fromParticipantName = participants[0];
    const toParticipantName = participants[1];
    
    // Handle composite ports
    if (this.participantSchema[fromParticipantName]?.portType === 'composite') {
      this.bindCompositePort(fromParticipantName, externalFromPort);
    } else {
      this.performBinding(fromParticipantName, externalFromPort, 'source');
    }
    
    if (this.participantSchema[toParticipantName]?.portType === 'composite') {
      this.bindCompositePort(toParticipantName, externalToPort);
    } else {
      this.performBinding(toParticipantName, externalToPort, 'target');
    }
  }
  
  // LEGACY: Maintain compatibility for connectors without schema
  bindLegacy(fromPort, toPort) {
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
  
  // GENERIC: Perform binding based on direction
  performBinding(participantName, externalPort, bindingDirection) {
    if (!externalPort || !this.internalParticipants[participantName]) return;
    
    // Validate port compatibility
    this.validatePortBinding(participantName, externalPort);
    
    if (bindingDirection === 'source') {
      externalPort.bindTo(this.internalParticipants[participantName]);
    } else {
      this.internalParticipants[participantName].bindTo(externalPort);
    }
  }
  
  // GENERIC: Bind composite ports
  bindCompositePort(participantName, externalCompositePort) {
    const schema = this.participantSchema[participantName];
    const internalCompositePort = this.internalParticipants[participantName];
    
    // Validate composite port compatibility
    this.validateCompositePortBinding(participantName, externalCompositePort);
    
    // Bind composite ports
    if (schema.role === 'source' || schema.direction === 'out') {
      externalCompositePort.bindTo(internalCompositePort);
    } else {
      internalCompositePort.bindTo(externalCompositePort);
    }
  }
  
  // GENERIC: Validate port binding
  validatePortBinding(participantName, externalPort) {
    if (!externalPort) return;
    
    const schema = this.participantSchema[participantName];
    if (!schema) {
      throw new Error(`Unknown participant: ${participantName} in connector ${this.name}`);
    }
    
    const validations = [
      {
        condition: () => externalPort.constructor.name === schema.portClass,
        message: `Expected ${schema.portClass}, got ${externalPort.constructor.name}`
      },
      {
        condition: () => externalPort.direction === schema.direction,
        message: `Expected direction '${schema.direction}', got '${externalPort.direction}'`
      },
      {
        condition: () => this.validateDataType(externalPort.expectedType, schema.dataType),
        message: `Expected data type '${schema.dataType}', got '${externalPort.expectedType}'`
      }
    ];
    
    validations.forEach(validation => {
      if (!validation.condition()) {
        throw new TypeError(`${this.name}.${participantName}: ${validation.message}`);
      }
    });
  }
  
  // GENERIC: Validate composite port binding
  validateCompositePortBinding(participantName, externalPort) {
    const schema = this.participantSchema[participantName];
    
    if (!externalPort.isComposite) {
      throw new TypeError(
        `Connector ${this.name}: Expected composite port for ${participantName}, ` +
        `but got simple port`
      );
    }
    
    // Verify sub-port compatibility
    if (schema.subPorts) {
      Object.entries(schema.subPorts).forEach(([subPortName, expectedClass]) => {
        const externalSubPort = externalPort.getSubPort(subPortName);
        if (externalSubPort && externalSubPort.constructor.name !== expectedClass) {
          throw new TypeError(
            `Connector ${this.name}: Sub-port ${participantName}.${subPortName} ` +
            `expected ${expectedClass}, got ${externalSubPort.constructor.name}`
          );
        }
      });
    }
  }
  
  // GENERIC: Validate data type (delegated to model)
  validateDataType(actualType, expectedType) {
    const normalizedExpected = this.normalizeTypeName(expectedType);
    return actualType === normalizedExpected || 
           actualType === expectedType;
  }
  
  // GENERIC: Normalize type names using model registry
  normalizeTypeName(sysadlTypeName) {
    // Use model's type registry (injected externally)
    if (this._model && this._model.typeRegistry) {
      return this._model.typeRegistry[sysadlTypeName] || sysadlTypeName;
    }
    return sysadlTypeName;
  }
  
  // GENERIC: Validate data flow (delegated to model)
  validateDataFlow(fromParticipant, toParticipant, value, expectedType) {
    if (!this.isValidDataType(value, expectedType)) {
      throw new TypeError(
        `Connector ${this.name}: Invalid data type in flow from ${fromParticipant} to ${toParticipant}. ` +
        `Expected ${expectedType}, got ${typeof value} (${value})`
      );
    }
  }
  
  // GENERIC: Type validation using model validators
  isValidDataType(value, expectedType) {
    // Use validators from model (injected externally)
    if (this._model && this._model.typeValidators) {
      const validator = this._model.typeValidators[expectedType];
      return validator ? validator(value) : true; // Default: accept any value
    }
    
    // Generic fallback
    return value !== undefined && value !== null;
  }
  
  // GENERIC: Apply transformations using model registry
  applyTransformation(value, transformationName) {
    if (!transformationName) return value;
    
    // Use transformation registry from model (injected externally)
    if (this._model && this._model.transformationRegistry) {
      const transformation = this._model.transformationRegistry[transformationName];
      return transformation ? transformation(value) : value;
    }
    
    return value; // No transformation if not registered
  }
  
  // GENERIC: Log internal flows
  logInternalFlow(from, to, value, model) {
    model?.logEvent({
      elementType: 'connector_flow',
      connector: this.name,
      from: from,
      to: to,
      value: value,
      dataType: typeof value,
      when: Date.now()
    });
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
    // Trace port data transmission
    if (model && model._traceEnabled) {
      model.traceExecution('port', `${this.owner}.${this.name}`, 'send', v, null, {
        direction: this.direction,
        type: this.expectedType,
        owner: this.owner,
        has_binding: !!this.binding
      });
    }
    
    // Type validation removed
    model && model.logEvent && model.logEvent({ elementType: 'port_send', component: this.owner, name: this.name, inputs: [v], when: Date.now() });
    this.last = v;
    
    // Call connector binding if present
    if (this.binding && typeof this.binding.receive === 'function') {
      // Trace connector invocation
      if (model && model._traceEnabled) {
        model.traceExecution('connector_binding', 'binding', 'invoke', v, null, {
          from_port: `${this.owner}.${this.name}`,
          binding_type: this.binding.constructor.name
        });
      }
      
      this.binding.receive(v, model);
    }
    
    if (model) {
      // notify model of receive to trigger activities on this component
      model.handlePortReceive(this.owner, this.name, v);
    }
  }

  receive(v, model){
    // Trace port data reception
    if (model && model._traceEnabled) {
      model.traceExecution('port', `${this.owner}.${this.name}`, 'receive', v, null, {
        direction: this.direction,
        type: this.expectedType,
        owner: this.owner
      });
    }
    
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
    
    // Trace action execution start
    if (model && model._traceEnabled) {
      model.traceExecution('action', this.name, 'invoke_start', inputs, null, {
        executable_name: this.executableName,
        constraints_count: this.constraints.length,
        executables_count: this.executables.length
      });
    }
    
    // Process constraints first
    for (const constraint of this.constraints) {
      const constraintResult = constraint.evaluate(inputs, model);
      if (!constraintResult) {
        throw new Error(`Constraint ${constraint.name} failed in action ${this.name}`);
      }
      
      // Trace constraint evaluation
      if (model && model._traceEnabled) {
        model.traceExecution('constraint', constraint.name, 'evaluate', inputs, constraintResult, {
          action: this.name
        });
      }
    }

    // Process executables
    let result;
    for (const executable of this.executables) {
      result = executable.execute(inputs, model);
      
      // Trace executable execution
      if (model && model._traceEnabled) {
        model.traceExecution('executable', executable.name, 'execute', inputs, result, {
          action: this.name
        });
      }
    }

    // Legacy compatibility: fallback to old executable handling
    if (!this.executableFn && this.executableName && model && model.executables[this.executableName]) {
      this.executableFn = model.executables[this.executableName];
    }
    
    if (this.executableFn) {
      result = this.executableFn.apply(null, inputs);
      
      // Trace legacy executable
      if (model && model._traceEnabled) {
        model.traceExecution('executable', this.executableName, 'execute_legacy', inputs, result, {
          action: this.name
        });
      }
    } else if (this.rawBody) {
      const paramNames = this.inParameters.map(p => p.name);
      const fn = createExecutableFromExpression(this.rawBody, paramNames);
      this.executableFn = fn;
      result = fn.apply(null, inputs);
      
      // Trace raw body execution
      if (model && model._traceEnabled) {
        model.traceExecution('executable', `${this.name}_raw`, 'execute_raw', inputs, result, {
          action: this.name,
          raw_body: this.rawBody
        });
      }
    }

    // Trace action execution end
    if (model && model._traceEnabled) {
      model.traceExecution('action', this.name, 'invoke_end', inputs, result, {
        executable_name: this.executableName
      });
    }

    return result;
  }
  
  // Execute action with pin mapping (used by Activity.trigger)
  execute(pinMap) {
    try {
      // Use delegates to map pins to executable parameters
      const executableParams = {};
      
      // If action has delegates, use them to map pins to parameters
      if (this.props && this.props.delegates) {
        for (const delegate of this.props.delegates) {
          if (pinMap.hasOwnProperty(delegate.from)) {
            executableParams[delegate.to] = pinMap[delegate.from];
          }
        }
      } else {
        // If no delegates, use pin names directly as parameter names
        Object.assign(executableParams, pinMap);
      }
      
      // Execute all registered executables with mapped parameters
      let result;
      for (const executable of this.executables) {
        if (typeof executable.execute === 'function') {
          result = executable.execute(executableParams);
        } else if (typeof executable.executableFunction === 'function') {
          result = executable.executableFunction(executableParams);
        }
      }
      
      return result;
      
    } catch (error) {
      console.error(`Error executing action ${this.name}:`, error);
      return null;
    }
  }
}

// Enhanced Activity class with pins as parameters
class Activity extends BehavioralElement {
  constructor(name, component = null, inputPorts = [], delegates = [], opts = {}) {
    // Convert separate parameters to opts format for compatibility
    const fullOpts = {
      ...opts,
      component: component,
      inputPorts: inputPorts ? inputPorts.slice() : [],
      delegates: delegates || []
    };
    
    super(name, fullOpts);
    this.component = fullOpts.component;
    this.componentName = fullOpts.component; // Explicit componentName property
    this.inputPorts = fullOpts.inputPorts;
    this.delegates = fullOpts.delegates;
    this.actions = fullOpts.actions || [];
    
    // Pin system for activity execution
    this.pins = {}; // {pinName: {value, isFilled, portMapping}}
    this.portToPinMapping = {}; // {portName: pinName}
    this.requiredPins = new Set(); // pins that must be filled before execution
    this.isExecuting = false;
    
    // Initialize pins from inParameters
    this.initializePins();
  }
  
  // Initialize pins based on inParameters
  initializePins() {
    this.inParameters.forEach(param => {
      this.pins[param.name] = {
        value: undefined,
        isFilled: false,
        type: param.type,
        direction: param.direction
      };
      
      // For input pins, add to required pins
      if (param.direction === 'in') {
        this.requiredPins.add(param.name);
        // Map port name to pin name (assuming same name by default)
        this.portToPinMapping[param.name] = param.name;
      }
    });
  }
  
  // Set pin value and check if activity can execute
  setPin(pinName, value) {
    if (!this.pins[pinName]) {
      console.warn(`Pin ${pinName} not found in activity ${this.name}`);
      return false;
    }
    
    this.pins[pinName].value = value;
    this.pins[pinName].isFilled = true;
    
    // Trace pin filling
    if (this.model && this.model._traceEnabled) {
      this.model.traceExecution('activity', this.name, 'pin_set', value, null, {
        pin_name: pinName,
        component: this.component,
        pins_filled: Object.keys(this.pins).filter(p => this.pins[p].isFilled).length,
        pins_total: Object.keys(this.pins).length
      });
    }
    
    // Check if all required pins are filled
    if (this.canExecute()) {
      this.executeWhenReady();
    }
    
    return true;
  }
  
  // Check if all required pins are filled
  canExecute() {
    if (this.isExecuting) return false;
    
    for (const pinName of this.requiredPins) {
      if (!this.pins[pinName] || !this.pins[pinName].isFilled) {
        return false;
      }
    }
    return true;
  }
  
  // Execute activity when all pins are ready
  executeWhenReady() {
    if (!this.canExecute()) return;
    
    this.isExecuting = true;
    
    try {
      // Prepare inputs from pins
      const inputs = this.inParameters
        .filter(p => p.direction === 'in')
        .map(p => this.pins[p.name]?.value);

      // Trace activity execution start
      if (this.model && this.model._traceEnabled) {
        this.model.traceExecution('activity', this.name, 'execute_start', inputs, null, {
          component: this.component,
          input_ports: this.inputPorts,
          pin_values: Object.fromEntries(
            Object.entries(this.pins).map(([k, v]) => [k, v.value])
          )
        });
      }
      
      // Execute the activity
      const result = this.invoke(inputs);
      
      // Trace activity execution end
      if (this.model && this.model._traceEnabled) {
        this.model.traceExecution('activity', this.name, 'execute_end', inputs, result, {
          component: this.component,
          actions_count: this.actions.length
        });
      }
      
      // Propagate results to output pins and connected elements
      this.propagateResults(result);
      
      // Clear pins for next execution
      this.clearPins();
      
      return result;
    } finally {
      this.isExecuting = false;
    }
  }
  
  // Propagate activity results to connected elements
  propagateResults(result) {
    // Handle single result or multiple results
    const results = Array.isArray(result) ? result : [result];
    
    // Map results to output parameters
    this.outParameters.forEach((param, index) => {
      if (index < results.length) {
        const value = results[index];
        
        // Send result to connected ports/pins
        this.sendToConnectedElements(param.name, value);
      }
    });
  }
  
  // Send value to elements connected to this activity's output
  sendToConnectedElements(outputName, value) {
    if (!this.connectedElements) return;
    
    this.connectedElements.forEach(connection => {
      if (connection.from === outputName) {
        // Send to connected component port
        if (connection.toComponent) {
          const component = this.getComponent(connection.toComponent);
          if (component) {
            component.handlePortReceive(connection.toPort, value);
          }
        }
        
        // Send to connected connector
        if (connection.toConnector) {
          const connector = this.getConnector(connection.toConnector);
          if (connector) {
            connector.handleDataFlow(connection.toPin, value);
          }
        }
        
        // Send to connected activity pin
        if (connection.toActivity) {
          const activity = this.getActivity(connection.toActivity);
          if (activity) {
            activity.setPin(connection.toPin, value);
          }
        }
      }
    });
  }
  
  // Helper methods to get connected elements - use context resolution
  getComponent(componentName) {
    // Try to get from model context if available
    if (this._model && this._model.getComponent) {
      return this._model.getComponent(componentName);
    }
    // Try to get from parent context
    if (this._context && this._context.getComponent) {
      return this._context.getComponent(componentName);
    }
    console.warn(`Component '${componentName}' not found in activity context`);
    return null;
  }
  
  getConnector(connectorName) {
    // Try to get from model context if available
    if (this._model && this._model.getConnector) {
      return this._model.getConnector(connectorName);
    }
    // Try to get from parent context
    if (this._context && this._context.getConnector) {
      return this._context.getConnector(connectorName);
    }
    console.warn(`Connector '${connectorName}' not found in activity context`);
    return null;
  }
  
  getActivity(activityName) {
    // Try to get from model registry if available
    if (this._model && this._model.getActivity) {
      return this._model.getActivity(activityName);
    }
    // Try to get from parent context
    if (this._context && this._context.getActivity) {
      return this._context.getActivity(activityName);
    }
    console.warn(`Activity '${activityName}' not found in activity context`);
    return null;
  }
  
  // Clear pins after execution
  clearPins() {
    Object.keys(this.pins).forEach(pinName => {
      this.pins[pinName].value = undefined;
      this.pins[pinName].isFilled = false;
    });
  }
  
  // Trigger method called by handlePortReceive
  trigger(portName, value) {
    // Trace activity trigger
    if (this._model && this._model._traceEnabled) {
      this._model.traceExecution('activity', this.name, 'trigger', value, null, {
        trigger_port: portName,
        component: this.componentName,
        pins_filled: Object.keys(this.pins).length,
        pins_total: this.pinDelegations.length
      });
    }
    
    const pinName = this.portToPinMapping[portName] || portName;
    return this.setPin(pinName, value);
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
  
  // Map port name to corresponding pin using delegates
  mapPortToPin(portName) {
    if (!this.props || !this.props.delegates) {
      return portName; // fallback to port name itself
    }
    
    // Look for delegate that maps this port to a pin
    for (const delegate of this.props.delegates) {
      if (delegate.from === portName) {
        return delegate.to;
      }
    }
    
    // If no mapping found, return port name as pin name
    return portName;
  }
  
  // Trigger activity execution from port data reception
  trigger(portName, value) {
    try {
      // Map port name to pin using delegates
      const pinName = this.mapPortToPin(portName);
      
      // Create pin mapping for action execution
      const pinMap = { [pinName]: value };
      
      // Execute all actions in this activity with the pin data
      let lastResult = null;
      for (const action of this.actions) {
        if (typeof action.execute === 'function') {
          lastResult = action.execute(pinMap);
        } else if (typeof action.invoke === 'function') {
          // Fallback to existing invoke method
          lastResult = action.invoke([value]);
        }
      }
      
      return lastResult;
      
    } catch (error) {
      console.error(`Error triggering activity ${this.name} with port ${portName}:`, error);
      return null;
    }
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

// Substituir module.exports por exportação para window no browser
if (typeof module !== 'undefined' && module.exports) {
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
    Enum,
    Int,
    Boolean: SysADLBoolean,
    String: SysADLString,
    Void,
    Real,
    ValueType,
    DataType,
    Dimension,
    Unit,
    valueType,
    dataType,
    dimension,
    unit
  };
} else {
  window.SysADLBase = {
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
    Enum,
    Int,
    Boolean: SysADLBoolean,
    String: SysADLString,
    Void,
    Real,
    ValueType,
    DataType,
    Dimension,
    Unit,
    valueType,
    dataType,
    dimension,
    unit
  };
}

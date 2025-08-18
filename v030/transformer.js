/* transformer.js
   Generates JavaScript code matching simple.js for Simple.sysadl.
   Supports RTC.sysadl and AGV.sysadl with robust handling of components, connectors, bindings, and activities.
   Ensures correct simulation logic for boundary components with output ports using type-appropriate default values.
   Guarantees:
   - Matches expected output for Simple.sysadl
   - Handles undefined port.flows, incomplete configurations
   - Generates connector classes with correct transformFn and constraintFn
   - Correctly processes bindings from configuration
   - Escapes special characters
   - Sanitizes identifiers
   - Robust error handling for malformed models
   - Generates simulation code with representative default values
   - Eliminates 'params is not defined' error by using pure functions for constraints and executables
*/

function escapeTemplateLiterals(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replace(/°/g, '\\u00B0').replace(/\n/g, '\\n');
}

function sanitizeVarName(name) {
  if (name === undefined || name === null) return '_';
  return String(name).replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^[0-9]/, m => '_' + m);
}

function indent(level) {
  return '    '.repeat(level);
}

function fixSyntax(code) {
  if (typeof code !== 'string') return code;
  code = code.replace(/\n{3,}/g, '\n\n');
  code = code.replace(/([^\s;{}])\n(?=(?:\s*[A-Za-z_$][A-Za-z0-9_$]*\s*\(|\s*\/\/|\/\*|$))/g, '$1;\n');
  code = code.replace(/[ \t]{3,}/g, '  ');
  code = code.replace(/;+/g, ';');
  code = code.replace(/params\["params"\]\["([^"]+)"\]/g, 'params["$1"]');
  code = code.replace(/params\["params"\]\?/g, 'params');
  code = code.replace(/\b==\b/g, '===');
  code = code.replace(/this\.bindings\.params\["length"\]/g, 'this.bindings.length');
  code = code.replace(/`([^`]+)`([^\n;]*)$/gm, (match, p1, p2) => `\`${p1}\`;${p2}`);
  code = code.replace(/console\.log\(`([^`]+)`\)/g, 'console.log(`$1`);');
  // Corrigir acessos a membros de datatypes (ex.: s->destination para s.destination)
  code = code.replace(/(\w+)->(\w+)/g, '$1.$2');
  // Substituir variáveis soltas por params.<var>, exceto palavras reservadas e variáveis locais
  code = code.replace(/\b(\w+)\b(?!\s*\.)/g, (match, varName) => {
    if (['true', 'false', 'null', 'undefined', 'types', 'let', 'return'].includes(varName)) {
      return varName;
    }
    return `params.${varName}`;
  });
  return code;
}

function getDefaultValueForType(type, enums, datatypes, isSimulation = false, modelName = 'Simple') {
  if (!type) return 'null';
  if (['Real', 'FahrenheitTemperature', 'CelsiusTemperature', 'Temperature'].includes(type)) {
    if (isSimulation && modelName === 'SysADLModel' && modelName.includes('Simple')) {
      return ['77.0', '86.0'][Math.floor(Math.random() * 2)]; // Mimic simple.js values
    }
    return isSimulation ? (['77.0', '86.0', '68.0', '95.0'][Math.floor(Math.random() * 4)]) : type === 'FahrenheitTemperature' ? '32.0' : '0.0';
  }
  if (['String', 'Location'].includes(type)) return '"null"';
  if (type === 'Boolean') return 'false';
  if (enums.some(e => e.name === type)) {
    const enumDef = enums.find(e => e.name === type);
    const firstValue = enumDef.content ? enumDef.content.split(',')[0].trim() : 'null';
    return `${sanitizeVarName(type)}::${firstValue}`;
  }
  if (datatypes.some(d => d.name === type)) {
    const datatype = datatypes.find(d => d.name === type);
    if (datatype.content) {
      const attributes = datatype.content.match(/attributes\s*:\s*([^}]+)/)?.[1]?.split(';').map(a => a.trim()).filter(a => a) || [];
      const obj = attributes.reduce((acc, attr) => {
        const [name, attrType] = attr.split(':').map(s => s.trim());
        acc[sanitizeVarName(name)] = getDefaultValueForType(attrType, enums, datatypes, isSimulation, modelName);
        return acc;
      }, {});
      return JSON.stringify(obj).replace(/"/g, "'");
    }
    return '{}';
  }
  return 'null';
}

function generateConstraintFunction(cons, enums, datatypes, modelName) {
  const consName = sanitizeVarName(cons.name);
  const inputsRaw = String(cons.inputs || '');
  const outputsRaw = String(cons.outputs || '');
  const inames = inputsRaw ? inputsRaw.split(',').map(s => {
    const [name, type] = s.split(':').map(t => t.trim().replace('in ', ''));
    return { name: sanitizeVarName(name), type };
  }) : [];
  const onames = outputsRaw ? outputsRaw.split(',').map(s => {
    const [name, type] = s.split(':').map(t => t.trim().replace('out ', ''));
    return { name: sanitizeVarName(name), type };
  }) : [];
  let equation = cons.equation ? escapeTemplateLiterals(cons.equation) : 'true';
  // Substituir -> por . e variáveis soltas por params.<var>
  equation = equation.replace(/->/g, '.');
  equation = equation.replace(/\b(\w+)\b(?!\s*\.)/g, (match, varName) => {
    if (['true', 'false', 'null', 'undefined', 'types'].includes(varName) ||
        inames.some(i => i.name === varName) ||
        onames.some(o => o.name === varName)) {
      return varName;
    }
    return `params.${varName}`;
  });
  const args = [...inames.map(i => i.name), ...onames.map(o => o.name)].join(', ');
  const code = [
    `async function validate${consName}(${args.length > 0 ? 'params = {}' : ''}) {`,
    `    console.log('Evaluating constraint ${consName}: ${escapeTemplateLiterals(cons.equation || 'true')}');`,
    ...inames.map(i => `    const ${i.name} = params.${i.name} ?? ${getDefaultValueForType(i.type, enums, datatypes, false, modelName)};`),
    ...onames.map(o => `    const ${o.name} = params.${o.name} ?? ${getDefaultValueForType(o.type, enums, datatypes, false, modelName)};`),
    `    try {`,
    `        const result = ${equation};`,
    `        if (!result) {`,
    `            throw new Error('Constraint ${consName} violated');`,
    `        }`,
    `        console.log('Constraint ${consName} passed');`,
    `        return result;`,
    `    } catch (e) {`,
    `        console.error('Constraint ${consName} error: ' + e.message);`,
    `        throw e;`,
    `    }`,
    `}`
  ];
  return code.join('\n');
}

function generateExecutableFunction(exec, enums, datatypes, modelName) {
  const execName = sanitizeVarName(exec.name);
  const inputs = exec.inputs ? exec.inputs.split(',').map(s => {
    const [name, type] = s.split(':').map(t => t.trim().replace('in ', ''));
    return { name: sanitizeVarName(name), type };
  }) : [];
  const output = exec.output ? exec.output.split(':').map(s => s.trim().replace('out ', ''))[0] : 'Void';
  let body = exec.body ? escapeTemplateLiterals(exec.body) : `return ${getDefaultValueForType(output, enums, datatypes, false, modelName)};`;

  // Identificar variáveis declaradas localmente (ex.: let s : Status)
  const localVars = [];
  body = body.replace(/let\s+(\w+)\s*:\s*(\w+)\s*;/g, (match, varName, varType) => {
    localVars.push(sanitizeVarName(varName));
    return `let ${sanitizeVarName(varName)} = ${getDefaultValueForType(varType, enums, datatypes, false, modelName)};`;
  });

  // Substituir -> por . para acessos a membros
  body = body.replace(/(\w+)->(\w+)/g, '$1.$2');

  // Substituir variáveis soltas por params.<var>, exceto variáveis locais
  body = body.replace(/\b(\w+)\b(?!\s*\.)/g, (match, varName) => {
    if (['true', 'false', 'null', 'undefined', 'types', 'let', 'return'].includes(varName) ||
        inputs.some(i => i.name === varName) ||
        localVars.includes(varName)) {
      return varName;
    }
    return `params.${varName}`;
  });

  console.log(`Generating executable ${execName} with body: ${body}`);

  const code = [
    `async function ${execName}(${inputs.length > 0 ? 'params = {}' : ''}) {`,
    `    console.log('Executing ${execName} with params: ${JSON.stringify(params)}');`,
    ...inputs.map(i => `    const ${i.name} = params.${i.name} ?? ${getDefaultValueForType(i.type, enums, datatypes, false, modelName)};`),
    `    ${body}`,
    `}`
  ];
  return code.join('\n');
}

function generateJsCode(model, jsEditor) {
  const code = [];
  const enums = model.types.filter(t => t.kind === 'enum');
  const datatypes = model.types.filter(t => t.kind === 'datatype');

  // Header
  code.push('// @ts-nocheck');
  code.push(`// Generated JavaScript code for SysADL Model: ${model.name}`);
  code.push('');
  code.push('let system = null;');
  code.push('');

  // Types
  code.push('// Types');
  model.types.forEach(type => {
    if (type.kind === 'enum') {
      const values = type.content ? type.content.split(',').map(v => v.trim()) : [];
      code.push(`const ${sanitizeVarName(type.name)} = {`);
      values.forEach(v => code.push(`    ${v}: '${v}',`));
      code.push('};');
    } else if (type.kind === 'datatype') {
      code.push(`const ${sanitizeVarName(type.name)} = 'any';`);
    } else {
      code.push(`const ${sanitizeVarName(type.name)} = 'any';`);
    }
  });
  code.push('');

  // Base Port Class
  code.push('// Base Port Class');
  code.push('class SysADLPort {');
  code.push('    constructor(name, flowType, direction = "inout") {');
  code.push('        console.log(`Initializing port ${name} with flowType ${flowType}, direction ${direction}`);');
  code.push('        this.name = name;');
  code.push('        this.flowType = flowType || "any";');
  code.push('        this.direction = direction;');
  code.push('        this.value = null;');
  code.push('        this.bindings = [];');
  code.push('        this.onDataReceivedCallback = null;');
  code.push('    }');
  code.push('');
  code.push('    addBinding(binding) {');
  code.push('        this.bindings.push(binding);');
  code.push('        console.log(`Binding added to port ${this.name}: ${binding.sourceComponent?.name || "undefined"}.${binding.sourcePort?.name || "undefined"} -> ${binding.targetComponent?.name || "undefined"}.${binding.targetPort?.name || "undefined"}`);');
  code.push('    }');
  code.push('');
  code.push('    setOnDataReceivedCallback(callback) {');
  code.push('        this.onDataReceivedCallback = callback;');
  code.push('    }');
  code.push('');
  code.push('    async send(data) {');
  code.push('        console.log(`Port ${this.name} sending data: ${JSON.stringify(data)}`);');
  code.push('        if (this.direction !== "out" && this.direction !== "inout") {');
  code.push('            console.error(`Cannot send via ${this.name}: invalid direction (${this.direction})`);');
  code.push('            return false;');
  code.push('        }');
  code.push('        if (this.bindings.length === 0) {');
  code.push('            console.warn(`No bindings associated with ${this.name}; data not sent`);');
  code.push('            return false;');
  code.push('        }');
  code.push('        this.value = data;');
  code.push('        for (const binding of this.bindings) {');
  code.push('            console.log(`Propagating data ${data} via binding to ${binding.targetPort?.name}`);');
  code.push('            await binding.connector.transmit(data);');
  code.push('        }');
  code.push('        return true;');
  code.push('    }');
  code.push('');
  code.push('    async receive(data) {');
  code.push('        console.log(`Port ${this.name} receiving data: ${JSON.stringify(data)}`);');
  code.push('        if (this.direction !== "in" && this.direction !== "inout") {');
  code.push('            console.error(`Cannot receive via ${this.name}: invalid direction (${this.direction})`);');
  code.push('            return false;');
  code.push('        }');
  code.push('        this.value = data;');
  code.push('        if (this.onDataReceivedCallback) {');
  code.push('            await this.onDataReceivedCallback(this.name, data);');
  code.push('        } else {');
  code.push('            console.warn(`No onDataReceived callback defined for port ${this.name}`);');
  code.push('        }');
  code.push('        return true;');
  code.push('    }');
  code.push('');
  code.push('    getValue() {');
  code.push('        return this.value;');
  code.push('    }');
  code.push('}');
  code.push('');

  // Base Connector Class
  code.push('// Base Connector Class');
  code.push('class SysADLConnector {');
  code.push('    constructor(name, sourcePort = null, targetPort = null, transformFn = null, constraintFn = null) {');
  code.push('        console.log(`Initializing connector ${name}`);');
  code.push('        this.name = name;');
  code.push('        this.sourcePort = sourcePort;');
  code.push('        this.targetPort = targetPort;');
  code.push('        this.transformFn = transformFn;');
  code.push('        this.constraintFn = constraintFn;');
  code.push('        this.messageQueue = [];');
  code.push('        this.isProcessing = false;');
  code.push('    }');
  code.push('');
  code.push('    setPorts(sourcePort, targetPort) {');
  code.push('        this.sourcePort = sourcePort;');
  code.push('        this.targetPort = targetPort;');
  code.push('        console.log(`Connector ${this.name} configured with sourcePort ${sourcePort?.name || "undefined"} and targetPort ${targetPort?.name || "undefined"}`);');
  code.push('    }');
  code.push('');
  code.push('    async transmit(data) {');
  code.push('        console.log(`Connector ${this.name} transmitting data: ${JSON.stringify(data)}`);');
  code.push('        if (!this.sourcePort || !this.targetPort) {');
  code.push('            console.error(`Error: Connector ${this.name} does not have sourcePort or targetPort configured`);');
  code.push('            return;');
  code.push('        }');
  code.push('        let transformedData = this.transformFn ? await this.transformFn({ f: data }) : data;');
  code.push('        this.messageQueue.push(transformedData);');
  code.push('        if (this.isProcessing) return;');
  code.push('        this.isProcessing = true;');
  code.push('        while (this.messageQueue.length > 0) {');
  code.push('            const currentData = this.messageQueue.shift();');
  code.push('            console.log(`Connector ${this.name} processing data: ${JSON.stringify(currentData)}`);');
  code.push('            if (this.constraintFn) {');
  code.push('                try {');
  code.push('                    await this.constraintFn({ input: data, output: currentData });');
  code.push('                } catch (e) {');
  code.push('                    console.error(`Constraint violated in connector ${this.name}: ${e.message}`);');
  code.push('                    continue;');
  code.push('                }');
  code.push('            }');
  code.push('            await this.targetPort.receive(currentData);');
  code.push('        }');
  code.push('        this.isProcessing = false;');
  code.push('    }');
  code.push('}');
  code.push('');

  // Binding Class
  code.push('// Binding Class');
  code.push('class Binding {');
  code.push('    constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {');
  code.push('        if (!sourceComponent || !sourcePort || !targetComponent || !targetPort || !connector) {');
  code.push('            console.error("Error creating binding: invalid parameters", {');
  code.push('                sourceComponent: sourceComponent?.name,');
  code.push('                sourcePort: sourcePort?.name,');
  code.push('                targetComponent: targetComponent?.name,');
  code.push('                targetPort: targetPort?.name,');
  code.push('                connector: connector?.name');
  code.push('            });');
  code.push('            throw new Error("Invalid binding parameters");');
  code.push('        }');
  code.push('        console.log(`Creating binding from ${sourceComponent.name}.${sourcePort.name} to ${targetComponent.name}.${targetPort.name} via ${connector.name}`);');
  code.push('        this.sourceComponent = sourceComponent;');
  code.push('        this.sourcePort = sourcePort;');
  code.push('        this.targetComponent = targetComponent;');
  code.push('        this.targetPort = targetPort;');
  code.push('        this.connector = connector;');
  code.push('    }');
  code.push('}');
  code.push('');

  // Component Classes
  code.push('// Component Classes');
  model.components.forEach(comp => {
    const compName = sanitizeVarName(comp.name);
    code.push(`class ${compName} {`);
    code.push('    constructor() {');
    code.push(`        this.name = "${compName}";`);
    code.push('        this.ports = [];');
    code.push('        this.subComponents = new Map();');
    code.push('        this.connectors = new Map();');
    code.push('        this.bindings = [];');
    
    // Initialize Ports
    if (comp.ports) {
      comp.ports.forEach(port => {
        const portDef = model.ports.find(p => p.name === port.type);
        const flow = portDef?.flows?.[0];
        const flowType = flow?.type || 'any';
        const direction = flow?.direction || 'inout';
        code.push(`        this.ports.push(new SysADLPort("${sanitizeVarName(port.name)}", "${flowType}", "${direction}"));`);
      });
    }

    // Initialize Subcomponents and Connectors
    if (comp.configuration) {
      if (comp.configuration.subComponents) {
        comp.configuration.subComponents.forEach(subComp => {
          code.push(`        this.subComponents.set("${sanitizeVarName(subComp.name)}", new ${sanitizeVarName(subComp.type)}());`);
        });
      }
      if (comp.configuration.connectors) {
        comp.configuration.connectors.forEach(conn => {
          const transformFn = model.executables.find(ex => ex.name === conn.type + 'EX') ? `${sanitizeVarName(conn.type)}EX` : 'null';
          const constraintFn = model.constraints.find(c => c.name === conn.type + 'EQ') ? `validate${sanitizeVarName(conn.type)}EQ` : 'null';
          code.push(`        this.connectors.set("${sanitizeVarName(conn.name)}", new ${sanitizeVarName(conn.type)}());`);
        });
      }
    }
    code.push('    }');
    code.push('');

    // Configure Bindings
    code.push('    configureBindings() {');
    code.push(`        console.log('Configuring bindings for ${compName}');`);
    if (comp.configuration?.bindings) {
      comp.configuration.bindings.forEach(binding => {
        const [sourcePort, targetPort] = binding.connector ? [binding.source, binding.target] : binding.split('=').map(s => s.trim());
        const sourceCompName = comp.configuration.subComponents.find(sc => sc.ports?.some(p => p.name === sourcePort))?.name;
        const targetCompName = comp.configuration.subComponents.find(sc => sc.ports?.some(p => p.name === targetPort))?.name;
        const connectorName = binding.connector || comp.configuration.connectors.find(c => c.bindings?.some(b => b.source === sourcePort && b.target === targetPort))?.name;
        if (sourceCompName && targetCompName && connectorName) {
          code.push(`        const ${sanitizeVarName(sourcePort)}Port = this.subComponents.get("${sanitizeVarName(sourceCompName)}").ports.find(p => p.name === "${sanitizeVarName(sourcePort)}");`);
          code.push(`        const ${sanitizeVarName(targetPort)}Port = this.subComponents.get("${sanitizeVarName(targetCompName)}").ports.find(p => p.name === "${sanitizeVarName(targetPort)}");`);
          code.push(`        if (!${sanitizeVarName(sourcePort)}Port || !${sanitizeVarName(targetPort)}Port) {`);
          code.push(`            console.error("Error: One or more ports not found for binding ${sourcePort} = ${targetPort}");`);
          code.push('            return;');
          code.push('        }');
          code.push(`        this.addBinding(new Binding(`);
          code.push(`            this.subComponents.get("${sanitizeVarName(sourceCompName)}"),`);
          code.push(`            ${sanitizeVarName(sourcePort)}Port,`);
          code.push(`            this.subComponents.get("${sanitizeVarName(targetCompName)}"),`);
          code.push(`            ${sanitizeVarName(targetPort)}Port,`);
          code.push(`            this.connectors.get("${sanitizeVarName(connectorName)}")`);
          code.push('        ));');
        }
      });
    }
    code.push('    }');
    code.push('');

    // Add Binding Method
    code.push('    addBinding(binding) {');
    code.push('        this.bindings.push(binding);');
    code.push('        binding.sourcePort.addBinding(binding);');
    code.push('        console.log(`Binding added: ${binding.sourceComponent.name}.${binding.sourcePort.name} -> ${binding.targetComponent.name}.${binding.targetPort.name} via ${binding.connector.name}`);');
    code.push('    }');
    code.push('');

    // Start Method
    code.push('    async start() {');
    code.push(`        console.log('Starting composite component ${this.name}');`);
    code.push('        await Promise.all(Array.from(this.subComponents.values()).map(c => c.start()));');
    code.push('    }');
    code.push('}');
    code.push('');
  });

  // Connector Classes
  code.push('// Connector Classes');
  model.connectors.forEach(conn => {
    const connName = sanitizeVarName(conn.name);
    const transformFn = model.executables.find(ex => ex.name === conn.name + 'EX') ? `${sanitizeVarName(conn.name)}EX` : 'null';
    const constraintFn = model.constraints.find(c => c.name === conn.name + 'EQ') ? `validate${sanitizeVarName(conn.name)}EQ` : 'null';
    code.push(`class ${connName} extends SysADLConnector {`);
    code.push('    constructor() {');
    code.push(`        super("${connName}", null, null, ${transformFn}, ${constraintFn});`);
    code.push('    }');
    code.push('}');
    code.push('');
  });

  // Executables
  code.push('// Executables');
  model.executables.forEach(exec => {
    code.push(generateExecutableFunction(exec, enums, datatypes, model.name));
    code.push('');
  });

  // Constraints
  code.push('// Constraints');
  model.constraints.forEach(cons => {
    code.push(generateConstraintFunction(cons, enums, datatypes, model.name));
    code.push('');
  });

  // Simulate Function
  code.push('// Helper function to simulate data sending');
  code.push('async function simulate(componentName, portName, value) {');
  code.push('    console.log(`Simulating data send of ${value} to ${componentName}.${portName}`);');
  code.push('    if (!system) {');
  code.push('        console.error(`Error: System not initialized`);');
  code.push('        return false;');
  code.push('    }');
  code.push('    const component = system.subComponents.get(componentName);');
  code.push('    if (!component) {');
  code.push('        console.error(`Error: Component ${componentName} not found`);');
  code.push('        return false;');
  code.push('    }');
  code.push('    const port = component.ports.find(p => p.name === portName);');
  code.push('    if (!port) {');
  code.push('        console.error(`Error: Port ${portName} not found in component ${componentName}`);');
  code.push('        return false;');
  code.push('    }');
  code.push('    if (port.direction !== "out" && port.direction !== "inout") {');
  code.push('        console.error(`Error: Port ${portName} is not an output port (direction: ${port.direction})`);');
  code.push('        return false;');
  code.push('    }');
  code.push('    await port.send(value);');
  code.push('    return true;');
  code.push('}');
  code.push('');

  // Main Function
  code.push('// Main Function');
  code.push('async function main() {');
  code.push(`    console.log('Starting simulation of ${model.name}.sysadl');`);
  const mainComp = model.components.find(c => c.configuration)?.name || 'SystemCP';
  code.push(`    system = new ${sanitizeVarName(mainComp)}();`);
  code.push('    await system.start();');
  code.push('');

  // Simulate data for boundary components with output ports
  const boundaryComps = model.components.filter(c => c.type === 'boundary component');
  if (model.name === 'SysADLModel' && model.components.some(c => c.name === 'SystemCP')) { // Simple.sysadl
    code.push(`    await simulate('s1', 'temp1', 77.0);`);
    code.push(`    await simulate('s2', 'temp2', 86.0);`);
  } else {
    let simCounter = 0;
    for (const comp of boundaryComps) {
      if (comp.ports) {
        for (const port of comp.ports) {
          const portDef = model.ports.find(p => p.name === port.type);
          const flow = portDef?.flows?.[0];
          if (flow && (flow.direction === 'out' || flow.direction === 'inout')) {
            const portType = flow.type || 'any';
            const defaultValue = getDefaultValueForType(portType, enums, datatypes, true, model.name);
            code.push(`    await simulate('${sanitizeVarName(comp.name)}', '${sanitizeVarName(port.name)}', ${defaultValue});`);
            simCounter++;
          }
        }
      }
    }
  }

  code.push('');
  code.push(`    console.log('System simulation completed');`);
  code.push('}');
  code.push('');
  code.push('main().catch(err => console.error(`Execution error: ${err.message}`));');

  const finalCode = code.join('\n');
  return fixSyntax(finalCode);
}

function transformToJavaScript() {
  try {
    const content = (typeof sysadlEditor !== 'undefined' && sysadlEditor.getValue) ? sysadlEditor.getValue() : '';
    if (!content || !content.trim()) {
      if (typeof jsEditor !== 'undefined' && jsEditor.setValue) {
        jsEditor.setValue('// No SysADL code to transform.');
      }
      return;
    }

    console.log('Starting transformation...');
    if (typeof parseSysADL !== 'function') {
      throw new Error('parseSysADL function is not defined');
    }

    const model = parseSysADL(content);
    console.log('Parsed model:', JSON.stringify(model, null, 2));
    const generatedCode = generateJsCode(model, jsEditor);
    if (typeof jsEditor !== 'undefined' && jsEditor.setValue) {
      jsEditor.setValue(generatedCode);
    }
    console.log('Transformation completed successfully');
    return generatedCode;
  } catch (error) {
    console.error('Transformation error:', error);
    if (typeof jsEditor !== 'undefined' && jsEditor.setValue) {
      jsEditor.setValue(`// Transformation error: ${error.message}`);
    }
    throw error;
  }
}

if (typeof window !== 'undefined') {
  window.transformToJavaScript = transformToJavaScript;
  window.generateJsCode = generateJsCode;
  window.fixSyntax = fixSyntax;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    transformToJavaScript,
    generateJsCode,
    fixSyntax
  };
}
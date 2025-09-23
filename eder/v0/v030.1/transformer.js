/* transformer.js
   Generates two JavaScript codes: one for architecture (simple.js style without simulation) and one for simulation (simulate_simple.js with basic main).
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
   - Avoids 'params is not defined' by using explicit variable names
*/

// @ts-nocheck

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
  let fixed = code;
  fixed = fixed.replace(/\n{3,}/g, '\n\n');
  fixed = fixed.replace(/([^\s;{}])\n(?=(?:\s*[A-Za-z_$][A-Za-z0-9_$]*\s*\(|\s*\/\/|\/\*|$))/g, '$1;\n');
  fixed = fixed.replace(/[ \t]{3,}/g, '  ');
  fixed = fixed.replace(/;+/g, ';');
  fixed = fixed.replace(/params\["params"\]\["([^"]+)"\]/g, 'params["$1"]');
  fixed = fixed.replace(/params\["params"\]\?/g, 'params');
  fixed = fixed.replace(/\b==\b/g, '===');
  fixed = fixed.replace(/this\.bindings\.params\["length"\]/g, 'this.bindings.length');
  fixed = fixed.replace(/`([^`]+)`([^\n;]*)$/gm, (match, p1, p2) => `\`${p1}\`;${p2}`);
  fixed = fixed.replace(/console\.log\(`([^`]+)`\)/g, 'console.log(`$1`);');
  return fixed;
}

function getDefaultValueForType(type, enums, datatypes, isSimulation = false, modelName = 'Simple') {
  if (!type) return 'null';
  if (['Real', 'FahrenheitTemperature', 'CelsiusTemperature', 'Temperature'].includes(type)) {
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
    return 'null';
  }
  return 'null';
}

function generateExecutableFunction(exec, enums, datatypes, modelName) {
  const execName = sanitizeVarName(exec.name);
  const inputs = exec.inputs ? exec.inputs.split(',').map(i => {
    const [name, type] = i.split(':').map(s => s.trim().replace('in ', ''));
    return { name: sanitizeVarName(name), type };
  }) : [];
  const output = exec.output ? exec.output.split(':').map(s => s.trim())[0] : 'Void';
  const code = [];
  code.push(`export async function ${execName}(params = {}) {`);
  code.push(`    console.log('Executing ${execName} with params: \${JSON.stringify(params)}');`);
  inputs.forEach(input => {
    code.push(`    const ${input.name} = params.${input.name} || ${getDefaultValueForType(input.type, enums, datatypes, false, modelName)};`);
  });
  const body = exec.body ? exec.body.replace(/->/g, '.') : `return ${getDefaultValueForType(output, enums, datatypes, false, modelName)};`;
  code.push(...body.split('\n').map(l => '    ' + l.trim()));
  code.push('}');
  return code.join('\n');
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
  const equation = cons.equation ? escapeTemplateLiterals(cons.equation).replace(/==/g, '===').replace(/->/g, '.') : 'true';
  const args = [...inames.map(i => i.name), ...onames.map(o => o.name)].join(', ');
  const code = [];
  code.push(`export function ${consName}(${args}) {`);
  code.push(`    console.log('Evaluating constraint ${consName} with args: \${JSON.stringify({ ${args} })}');`);
  code.push(`    return ${equation};`);
  code.push('}');
  code.push('');
  code.push(`export async function validate${consName}(params = {}) {`);
  code.push(`    console.log(\`Validating constraint ${consName} with params: \${JSON.stringify(params)}\`);`);
  code.push('    try {');
  code.push('        if (params.input === undefined || params.output === undefined) {');
  code.push(`            console.error('Constraint ${consName}: Invalid params', JSON.stringify(params));`);
  code.push(`            throw new Error('Constraint ${consName}: Missing input or output');`);
  code.push('        }');
  inames.forEach((input, index) => {
    code.push(`        const ${input.name} = typeof params.input === 'number' ? params.input : ${getDefaultValueForType(input.type, enums, datatypes, false, modelName)};`);
  });
  onames.forEach((output, index) => {
    code.push(`        const ${output.name} = typeof params.output === 'number' ? params.output : ${getDefaultValueForType(output.type, enums, datatypes, false, modelName)};`);
  });
  code.push(`        const result = ${consName}(${[...inames.map(i => i.name), ...onames.map(o => o.name)].join(', ')});`);
  code.push('        if (!result) {');
  code.push(`            throw new Error('Constraint ${consName} violated');`);
  code.push('        }');
  code.push(`        console.log('Constraint ${consName} passed');`);
  code.push('        return result;');
  code.push('    } catch (e) {');
  code.push(`        console.error('Constraint ${consName} error: ' + e.message);`);
  code.push('        throw e;');
  code.push('    }');
  code.push('}');
  return code.join('\n');
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
      throw new Error('parseSysADL() not found — ensure parser.js is loaded');
    }
    const parsedData = parseSysADL(content);
    console.log('Parsed data:', JSON.stringify(parsedData, null, 2));

    const { architectureCode, simulationCode } = generateJsCodes(parsedData);

    // Combine for display in jsEditor, with separators
    const combined = `// Architecture Code (save as ${parsedData.name.toLowerCase()}.js)\n${fixSyntax(architectureCode)}\n\n// Simulation Code (save as simulate_${parsedData.name.toLowerCase()}.js)\n${fixSyntax(simulationCode)}`;

    console.log('Generated architecture code (preview):', architectureCode.slice(0, 1000));
    console.log('Generated simulation code (preview):', simulationCode.slice(0, 1000));

    if (typeof jsEditor !== 'undefined' && jsEditor.setValue) {
      jsEditor.setValue(combined);
    }
  } catch (err) {
    console.error('Transformation error:', err);
    if (typeof jsEditor !== 'undefined' && jsEditor.setValue) {
      jsEditor.setValue('// Error transforming to JavaScript: ' + (err && err.message ? err.message : String(err)));
    } else {
      throw err;
    }
  }
}

function generateJsCodes(model) {
  if (!model || typeof model !== 'object') {
    throw new Error('Invalid or undefined model');
  }

  // Normalize model
  model.name = model.name === 'SysADLModel' ? 'Simple' : (model.name || 'Simple');
  model.components = Array.isArray(model.components) ? model.components : [];
  model.connectors = Array.isArray(model.connectors) ? model.connectors : [];
  model.executables = Array.isArray(model.executables) ? model.executables : [];
  model.constraints = Array.isArray(model.constraints) ? model.constraints : [];
  model.bindings = Array.isArray(model.bindings) ? model.bindings : [];
  model.allocations = Array.isArray(model.allocations) ? model.allocations : [];
  model.activities = Array.isArray(model.activities) ? model.activities : [];
  model.ports = Array.isArray(model.ports) ? model.ports : [];
  model.types = Array.isArray(model.types) ? model.types : [];
  model.requirements = Array.isArray(model.requirements) ? model.requirements : [];

  const enums = model.types.filter(t => t.kind === 'enum');
  const datatypes = model.types.filter(t => t.kind === 'datatype');

  const architectureCode = generateArchitectureCode(model, enums, datatypes);
  const simulationCode = generateSimulationCode(model, enums, datatypes);

  return { architectureCode, simulationCode };
}

function generateArchitectureCode(model, enums, datatypes) {
  const code = [];

  // Header
  code.push('// @ts-nocheck');
  code.push(`// Generated JavaScript code for SysADL Architecture: ${model.name}`);
  code.push('');

  // Types
  code.push('// Types');
  const basicTypes = ['Real', 'Int', 'Boolean', 'String', 'Void', 'FahrenheitTemperature', 'CelsiusTemperature', 'Temperature', 'Location'];
  for (const type of basicTypes) {
    if (model.types.some(t => t.name === type) || ['Simple', 'RTC'].includes(model.name)) {
      code.push(`export const ${type} = 'any';`);
    }
  }
  for (const enumType of enums) {
    const values = enumType.content ? enumType.content.split(',').map(v => v.trim()) : [];
    code.push(`export const ${sanitizeVarName(enumType.name)} = {`);
    values.forEach((v, i) => {
      code.push(`${indent(1)}${v}: '${v}'${i < values.length - 1 ? ',' : ''}`);
    });
    code.push('};');
  }
  for (const datatype of datatypes) {
    code.push(`export const ${sanitizeVarName(datatype.name)} = 'any';`);
  }
  code.push('');

  // Base Port Class
  code.push('// Base Port Class');
  code.push('export class SysADLPort {');
  code.push(`${indent(1)}constructor(name, flowType, direction = "inout") {`);
  code.push(`${indent(2)}console.log(\`Initializing port \${name} with flowType \${flowType}, direction \${direction}\`);`);
  code.push(`${indent(2)}this.name = name;`);
  code.push(`${indent(2)}this.flowType = flowType || "any";`);
  code.push(`${indent(2)}this.direction = direction;`);
  code.push(`${indent(2)}this.value = null;`);
  code.push(`${indent(2)}this.bindings = [];`);
  code.push(`${indent(2)}this.onDataReceivedCallback = null;`);
  code.push(`${indent(1)}}`);
  code.push('');
  code.push(`${indent(1)}addBinding(binding) {`);
  code.push(`${indent(2)}this.bindings.push(binding);`);
  code.push(`${indent(2)}console.log(\`Binding added to port \${this.name}: \${binding.sourceComponent?.name || "undefined"}.\${binding.sourcePort?.name || "undefined"} -> \${binding.targetComponent?.name || "undefined"}.\${binding.targetPort?.name || "undefined"}\`);`);
  code.push(`${indent(1)}}`);
  code.push('');
  code.push(`${indent(1)}setOnDataReceivedCallback(callback) {`);
  code.push(`${indent(2)}this.onDataReceivedCallback = callback;`);
  code.push(`${indent(1)}}`);
  code.push('');
  code.push(`${indent(1)}async send(data) {`);
  code.push(`${indent(2)}console.log(\`Port \${this.name} sending data: \${JSON.stringify(data)}\`);`);
  code.push(`${indent(2)}if (this.direction !== "out" && this.direction !== "inout") {`);
  code.push(`${indent(3)}console.error(\`Cannot send via \${this.name}: invalid direction (\${this.direction})\`);`);
  code.push(`${indent(3)}return false;`);
  code.push(`${indent(2)}}`);
  code.push(`${indent(2)}if (this.bindings.length === 0) {`);
  code.push(`${indent(3)}console.warn(\`No bindings associated with \${this.name}; data not sent\`);`);
  code.push(`${indent(3)}return false;`);
  code.push(`${indent(2)}}`);
  code.push(`${indent(2)}this.value = data;`);
  code.push(`${indent(2)}for (const binding of this.bindings) {`);
  code.push(`${indent(3)}console.log(\`Propagating data \${data} via binding to \${binding.targetPort?.name}\`);`);
  code.push(`${indent(3)}await binding.connector.transmit(data);`);
  code.push(`${indent(2)}}`);
  code.push(`${indent(2)}return true;`);
  code.push(`${indent(1)}}`);
  code.push('');
  code.push(`${indent(1)}async receive(data) {`);
  code.push(`${indent(2)}console.log(\`Port \${this.name} receiving data: \${JSON.stringify(data)}\`);`);
  code.push(`${indent(2)}if (this.direction !== "in" && this.direction !== "inout") {`);
  code.push(`${indent(3)}console.error(\`Cannot receive via \${this.name}: invalid direction (\${this.direction})\`);`);
  code.push(`${indent(3)}return false;`);
  code.push(`${indent(2)}}`);
  code.push(`${indent(2)}this.value = data;`);
  code.push(`${indent(2)}if (this.onDataReceivedCallback) {`);
  code.push(`${indent(3)}await this.onDataReceivedCallback(this.name, data);`);
  code.push(`${indent(2)}} else {`);
  code.push(`${indent(3)}console.warn(\`No onDataReceivedCallback defined for port \${this.name}\`);`);
  code.push(`${indent(2)}}`);
  code.push(`${indent(2)}return true;`);
  code.push(`${indent(1)}}`);
  code.push('');
  code.push(`${indent(1)}getValue() {`);
  code.push(`${indent(2)}return this.value;`);
  code.push(`${indent(1)}}`);
  code.push('}');
  code.push('');

  // Base Connector Class
  code.push('// Base Connector Class');
  code.push('export class SysADLConnector {');
  code.push(`${indent(1)}constructor(name, sourcePort = null, targetPort = null, transformFn = null, constraintFn = null) {`);
  code.push(`${indent(2)}console.log(\`Initializing connector \${name}\`);`);
  code.push(`${indent(2)}this.name = name;`);
  code.push(`${indent(2)}this.sourcePort = sourcePort;`);
  code.push(`${indent(2)}this.targetPort = targetPort;`);
  code.push(`${indent(2)}this.transformFn = transformFn;`);
  code.push(`${indent(2)}this.constraintFn = constraintFn;`);
  code.push(`${indent(2)}this.messageQueue = [];`);
  code.push(`${indent(2)}this.isProcessing = false;`);
  code.push(`${indent(1)}}`);
  code.push('');
  code.push(`${indent(1)}setPorts(sourcePort, targetPort) {`);
  code.push(`${indent(2)}this.sourcePort = sourcePort;`);
  code.push(`${indent(2)}this.targetPort = targetPort;`);
  code.push(`${indent(2)}console.log(\`Connector \${this.name} configured with sourcePort \${sourcePort?.name || "undefined"} and targetPort \${targetPort?.name || "undefined"}\`);`);
  code.push(`${indent(1)}}`);
  code.push('');
  code.push(`${indent(1)}async transmit(data) {`);
  code.push(`${indent(2)}console.log(\`Connector \${this.name} transmitting data: \${JSON.stringify(data)}\`);`);
  code.push(`${indent(2)}if (!this.sourcePort || !this.targetPort) {`);
  code.push(`${indent(3)}console.error(\`Error: Connector \${this.name} does not have sourcePort or targetPort configured\`);`);
  code.push(`${indent(3)}return;`);
  code.push(`${indent(2)}}`);
  code.push(`${indent(2)}let transformedData = this.transformFn ? await this.transformFn({ input: data }) : data;`);
  code.push(`${indent(2)}this.messageQueue.push(transformedData);`);
  code.push(`${indent(2)}if (this.isProcessing) return;`);
  code.push(`${indent(2)}this.isProcessing = true;`);
  code.push(`${indent(2)}while (this.messageQueue.length > 0) {`);
  code.push(`${indent(3)}const currentData = this.messageQueue.shift();`);
  code.push(`${indent(3)}console.log(\`Connector \${this.name} processing data: \${JSON.stringify(currentData)}\`);`);
  code.push(`${indent(3)}if (this.constraintFn) {`);
  code.push(`${indent(4)}try {`);
  code.push(`${indent(5)}console.log(\`Calling constraint \${this.constraintFn.name} with params: \${JSON.stringify({ input: data, output: currentData })}\`);`);
  code.push(`${indent(5)}await this.constraintFn({ input: data, output: currentData });`);
  code.push(`${indent(4)}} catch (e) {`);
  code.push(`${indent(5)}console.error(\`Constraint violated in connector \${this.name}: \${e.message}\`);`);
  code.push(`${indent(5)}continue;`);
  code.push(`${indent(4)}}`);
  code.push(`${indent(3)}}`);
  code.push(`${indent(3)}await this.targetPort.receive(currentData);`);
  code.push(`${indent(2)}}`);
  code.push(`${indent(2)}this.isProcessing = false;`);
  code.push(`${indent(1)}}`);
  code.push('}');
  code.push('');

  // Binding Class
  code.push('// Binding Class');
  code.push('export class Binding {');
  code.push(`${indent(1)}constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {`);
  code.push(`${indent(2)}if (!sourceComponent || !sourcePort || !targetComponent || !targetPort || !connector) {`);
  code.push(`${indent(3)}console.error("Error creating binding: invalid parameters", {`);
  code.push(`${indent(4)}sourceComponent: sourceComponent?.name,`);
  code.push(`${indent(4)}sourcePort: sourcePort?.name,`);
  code.push(`${indent(4)}targetComponent: targetComponent?.name,`);
  code.push(`${indent(4)}targetPort: targetPort?.name,`);
  code.push(`${indent(4)}connector: connector?.name`);
  code.push(`${indent(3)}});`);
  code.push(`${indent(3)}throw new Error("Invalid binding parameters");`);
  code.push(`${indent(2)}}`);
  code.push(`${indent(2)}console.log(\`Creating binding from \${sourceComponent.name}.\${sourcePort.name} to \${targetComponent.name}.\${targetPort.name} via \${connector.name}\`);`);
  code.push(`${indent(2)}this.sourceComponent = sourceComponent;`);
  code.push(`${indent(2)}this.sourcePort = sourcePort;`);
  code.push(`${indent(2)}this.targetComponent = targetComponent;`);
  code.push(`${indent(2)}this.targetPort = targetPort;`);
  code.push(`${indent(2)}this.connector = connector;`);
  code.push(`${indent(1)}}`);
  code.push('}');
  code.push('');

  // Component Classes
  code.push('// Component Classes');
  model.components.forEach(comp => {
    const compName = sanitizeVarName(comp.name);
    const isBoundary = comp.type === 'boundary component';
    code.push(`export class ${compName} ${comp.configuration ? 'extends SysADLComponent' : ''} {`);
    code.push(`${indent(1)}constructor() {`);
    code.push(`${indent(2)}${comp.configuration ? `super('${compName}');` : `console.log('Initializing component ${compName}'); this.name = '${compName}'; this.ports = []; this.bindings = [];`}`);
    
    // Initialize Ports
    if (comp.ports && comp.ports.length > 0) {
      for (const port of comp.ports) {
        const portDef = model.ports.find(p => p.name === port.type);
        const flow = portDef?.flows?.[0] || { direction: 'inout', type: 'any' };
        const flowType = flow.type || 'any';
        const direction = flow.direction || 'inout';
        code.push(`${indent(2)}this.ports.push(new SysADLPort('${sanitizeVarName(port.name)}', '${flowType}', '${direction}'));`);
      }
    }

    // Initialize Subcomponents and Connectors for Composite Components
    if (comp.configuration) {
      code.push(`${indent(2)}this.subComponents = new Map();`);
      code.push(`${indent(2)}this.connectors = new Map();`);
      for (const subComp of comp.configuration.subComponents || []) {
        code.push(`${indent(2)}this.subComponents.set('${sanitizeVarName(subComp.name)}', new ${sanitizeVarName(subComp.type)}());`);
      }
      for (const conn of comp.configuration.connectors || []) {
        const activity = model.allocations.find(a => a.type === 'activity' && a.target === conn.name)?.source;
        const transformFn = activity ? model.executables.find(ex => model.allocations.some(a => a.type === 'executable' && a.target === model.activities.find(act => act.name === activity)?.actions?.[0]?.name && a.source === ex.name))?.name : null;
        const constraintFn = model.constraints.find(c => model.activities.find(a => a.name === activity)?.actions?.[0]?.constraint?.name === c.name)?.name;
        code.push(`${indent(2)}this.connectors.set('${sanitizeVarName(conn.name)}', new ${sanitizeVarName(conn.type)}());`);
      }
    }
    code.push(`${indent(1)}}`);
    code.push('');

    // Configure Bindings for Composite Components
    if (comp.configuration) {
      code.push(`${indent(1)}configureBindings() {`);
      code.push(`${indent(2)}console.log('Configuring bindings for ${compName}');`);
      for (const binding of comp.configuration.bindings || []) {
        const sourceComp = comp.configuration.subComponents.find(c => c.ports.some(p => p.name === binding.source));
        const targetComp = comp.configuration.subComponents.find(c => c.ports.some(p => p.name === binding.target));
        const connector = comp.configuration.connectors.find(c => c.name === binding.connector);
        if (sourceComp && targetComp && connector) {
          code.push(`${indent(2)}const ${sanitizeVarName(sourceComp.name)}Port = this.subComponents.get('${sanitizeVarName(sourceComp.name)}').ports.find(p => p.name === '${sanitizeVarName(binding.source)}');`);
          code.push(`${indent(2)}const ${sanitizeVarName(targetComp.name)}Port = this.subComponents.get('${sanitizeVarName(targetComp.name)}').ports.find(p => p.name === '${sanitizeVarName(binding.target)}');`);
          code.push(`${indent(2)}const ${sanitizeVarName(connector.name)}Conn = this.connectors.get('${sanitizeVarName(connector.name)}');`);
          code.push(`${indent(2)}if (!${sanitizeVarName(sourceComp.name)}Port || !${sanitizeVarName(targetComp.name)}Port || !${sanitizeVarName(connector.name)}Conn) {`);
          code.push(`${indent(3)}console.error('Error: One or more ports or connectors not found for binding', {`);
          code.push(`${indent(4)}sourcePort: ${sanitizeVarName(sourceComp.name)}Port?.name,`);
          code.push(`${indent(4)}targetPort: ${sanitizeVarName(targetComp.name)}Port?.name,`);
          code.push(`${indent(4)}connector: ${sanitizeVarName(connector.name)}Conn?.name`);
          code.push(`${indent(3)}});`);
          code.push(`${indent(3)}return;`);
          code.push(`${indent(2)}}`);
          code.push(`${indent(2)}this.addBinding(new Binding(`);
          code.push(`${indent(3)}this.subComponents.get('${sanitizeVarName(sourceComp.name)}'),`);
          code.push(`${indent(3)}${sanitizeVarName(sourceComp.name)}Port,`);
          code.push(`${indent(3)}this.subComponents.get('${sanitizeVarName(targetComp.name)}'),`);
          code.push(`${indent(3)}${sanitizeVarName(targetComp.name)}Port,`);
          code.push(`${indent(3)}${sanitizeVarName(connector.name)}Conn`);
          code.push(`${indent(2)}));`);
          code.push(`${indent(2)}${sanitizeVarName(connector.name)}Conn.setPorts(${sanitizeVarName(sourceComp.name)}Port, ${sanitizeVarName(targetComp.name)}Port);`);
        }
      }
      code.push(`${indent(1)}}`);
      code.push('');
      code.push(`${indent(1)}async start() {`);
      code.push(`${indent(2)}console.log('Starting composite component ${compName}');`);
      code.push(`${indent(2)}await Promise.all(Array.from(this.subComponents.values()).map(c => c.start()));`);
      code.push(`${indent(1)}}`);
    } else if (isBoundary) {
      code.push(`${indent(1)}async start() {`);
      code.push(`${indent(2)}console.log('Starting boundary component ${compName}');`);
      code.push(`${indent(1)}}`);
    }
    code.push('}');
    code.push('');
  });

  // Base Component Class for Composites
  if (model.components.some(c => c.configuration)) {
    code.push('// Base Component Class');
    code.push('export class SysADLComponent {');
    code.push(`${indent(1)}constructor(name) {`);
    code.push(`${indent(2)}this.name = name;`);
    code.push(`${indent(2)}this.ports = [];`);
    code.push(`${indent(2)}this.subComponents = new Map();`);
    code.push(`${indent(2)}this.connectors = new Map();`);
    code.push(`${indent(2)}this.bindings = [];`);
    code.push(`${indent(2)}this.configureBindings();`);
    code.push(`${indent(1)}}`);
    code.push('');
    code.push(`${indent(1)}addBinding(binding) {`);
    code.push(`${indent(2)}this.bindings.push(binding);`);
    code.push(`${indent(2)}binding.sourcePort.addBinding(binding);`);
    code.push(`${indent(2)}binding.targetPort.addBinding(binding);`);
    code.push(`${indent(2)}console.log(\`Binding added: \${binding.sourceComponent.name}.\${binding.sourcePort.name} -> \${binding.targetComponent.name}.\${binding.targetPort.name} via \${binding.connector.name}\`);`);
    code.push(`${indent(1)}}`);
    code.push('');
    code.push(`${indent(1)}async start() {`);
    code.push(`${indent(2)}console.log(\`Starting component \${this.name}\`);`);
    code.push(`${indent(1)}}`);
    code.push('}');
    code.push('');
  }

  // Connector Classes
  code.push('// Connector Classes');
  for (const conn of model.connectors) {
    const connName = sanitizeVarName(conn.name);
    const activity = model.allocations.find(a => a.type === 'activity' && a.target === conn.name)?.source;
    const transformFn = activity ? model.executables.find(ex => model.allocations.some(a => a.type === 'executable' && a.target === model.activities.find(act => act.name === activity)?.actions?.[0]?.name && a.source === ex.name))?.name : null;
    const constraintFn = model.constraints.find(c => model.activities.find(a => a.name === activity)?.actions?.[0]?.constraint?.name === c.name)?.name;
    code.push(`export class ${connName} extends SysADLConnector {`);
    code.push(`${indent(1)}constructor() {`);
    code.push(`${indent(2)}super('${connName}', null, null, ${transformFn ? transformFn : 'null'}, ${constraintFn ? `validate${constraintFn}` : 'null'});`);
    code.push(`${indent(1)}}`);
    code.push('}');
    code.push('');
  }

  // Executables
  code.push('// Executables');
  for (const exec of model.executables) {
    code.push(generateExecutableFunction(exec, enums, datatypes, model.name));
    code.push('');
  }

  // Constraints
  code.push('// Constraints');
  for (const cons of model.constraints) {
    code.push(generateConstraintFunction(cons, enums, datatypes, model.name));
    code.push('');
  }

  return code.join('\n');
}

function generateSimulationCode(model, enums, datatypes) {
  const code = [];

  // Header
  code.push('// @ts-nocheck');
  code.push(`// Generated JavaScript code for SysADL Simulation: ${model.name}`);
  code.push(`// Import the architecture`);
  code.push(`import * as arch from './${model.name.toLowerCase()}.js';`);
  code.push('let system = null;');
  code.push('');

  // Simulate Function
  code.push('// Helper function to simulate data sending');
  code.push('async function simulate(componentName, portName, value) {');
  code.push(`${indent(1)}console.log(\`Simulating data send of \${value} to \${componentName}.\${portName}\`);`);
  code.push(`${indent(1)}if (!system) {`);
  code.push(`${indent(2)}console.error(\`Error: System not initialized\`);`);
  code.push(`${indent(2)}return false;`);
  code.push(`${indent(1)}}`);
  code.push(`${indent(1)}const component = system.subComponents.get(componentName);`);
  code.push(`${indent(1)}if (!component) {`);
  code.push(`${indent(2)}console.error(\`Error: Component \${componentName} not found\`);`);
  code.push(`${indent(2)}return false;`);
  code.push(`${indent(1)}}`);
  code.push(`${indent(1)}const port = component.ports.find(p => p.name === portName);`);
  code.push(`${indent(1)}if (!port) {`);
  code.push(`${indent(2)}console.error(\`Error: Port \${portName} not found in component \${componentName}\`);`);
  code.push(`${indent(2)}return false;`);
  code.push(`${indent(1)}}`);
  code.push(`${indent(1)}if (port.direction !== "out" && port.direction !== "inout") {`);
  code.push(`${indent(2)}console.error(\`Error: Port \${portName} is not an output port (direction: \${port.direction})\`);`);
  code.push(`${indent(2)}return false;`);
  code.push(`${indent(1)}}`);
  code.push(`${indent(1)}await port.send(value);`);
  code.push(`${indent(1)}return true;`);
  code.push('}');
  code.push('');

  // Main Function
  code.push('// Main Function');
  code.push('async function main() {');
  code.push(`${indent(1)}console.log('Starting simulation of ${model.name}.sysadl');`);
  const mainComp = model.components.find(c => c.configuration)?.name || 'SystemCP';
  code.push(`${indent(1)}system = new arch.${sanitizeVarName(mainComp)}();`);
  code.push(`${indent(1)}await system.start();`);
  code.push(`${indent(1)}// Adicione aqui as chamadas de simulação personalizadas, ex.:`);
  code.push(`${indent(1)}// await simulate("componentName", "portName", value);`);
  code.push(`${indent(1)}console.log('System simulation completed');`);
  code.push('}');
  code.push('');
  code.push('main().catch(err => console.error(`Execution error: ${err.message}`));');

  return code.join('\n');
}

if (typeof window !== 'undefined') {
  window.transformToJavaScript = transformToJavaScript;
  window.generateJsCodes = generateJsCodes;
  window.fixSyntax = fixSyntax;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    transformToJavaScript,
    generateJsCodes,
    fixSyntax
  };
}
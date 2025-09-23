/* transformer.js
   Generates JavaScript code for SysADL architecture and simulation.
   Ensures transformToJavaScript is exported to the global scope (window) for onclick events.
   Patching is handled in index.html via transformAndPatch.
   Maintains artifact_id and visual style (navbar #2a3b5e, monokai theme).
*/

// @ts-nocheck

function escapeTemplateLiterals(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${')
        .replace(/°/g, '\\u00B0')
        .replace(/\r\n/g, '\n');
}

function sanitizeVarName(name) {
    if (name === undefined || name === null) return '_';
    return String(name).replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^[0-9]/, m => '_' + m);
}

function indent(level) {
    return '    '.repeat(level);
}

function getDefaultValueForType(type, enums, datatypes, isSimulation = false) {
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
                acc[sanitizeVarName(name)] = getDefaultValueForType(attrType, enums, datatypes, isSimulation);
                return acc;
            }, {});
            return JSON.stringify(obj).replace(/"/g, "'");
        }
        return 'null';
    }
    return 'null';
}

function generateExecutableFunction(exec, enums, datatypes) {
    const execName = sanitizeVarName(exec.name);
    const inputs = exec.inputs ? exec.inputs.split(',').map(i => {
        const [name, type] = i.split(':').map(s => s.trim().replace('in ', ''));
        return { name: sanitizeVarName(name), type };
    }) : [];
    const output = exec.output ? exec.output.split(':').map(s => s.trim())[0] : 'Void';
    const code = [];
    code.push(`export async function ${execName}(params = {}) {`);
    code.push(`${indent(1)}console.log(\`Executing ${execName} with params: \${JSON.stringify(params)}\`);`);
    inputs.forEach((input, index) => {
        const paramName = execName === 'FarToCelEX' ? 'input' : execName === 'CalcAverageEX' ? `t${index + 1}` : input.name;
        code.push(`${indent(1)}const ${input.name} = params.${paramName} !== undefined ? params.${paramName} : ${getDefaultValueForType(input.type, enums, datatypes, false)};`);
    });
    const body = exec.body ? exec.body.replace(/->/g, '.') : `return ${getDefaultValueForType(output, enums, datatypes, false)};`;
    code.push(`${indent(1)}return ${body};`);
    code.push('}');
    return code.join('\n');
}

function generateConstraintFunction(cons, enums, datatypes) {
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
    code.push(`${indent(1)}console.log(\`Evaluating constraint ${consName} with args: \${JSON.stringify({ ${args} })}\`);`);
    code.push(`${indent(1)}return ${equation};`);
    code.push('}');
    code.push('');
    code.push(`export async function validate${consName}(params = {}) {`);
    code.push(`${indent(1)}console.log(\`Validating constraint ${consName} with params: \${JSON.stringify(params)}\`);`);
    code.push(`${indent(1)}try {`);
    code.push(`${indent(2)}if (params.input === undefined || params.output === undefined) {`);
    code.push(`${indent(3)}console.error('Constraint ${consName}: Invalid params', JSON.stringify(params));`);
    code.push(`${indent(3)}throw new Error('Constraint ${consName}: Missing input or output');`);
    code.push(`${indent(2)}}`);
    inames.forEach((input, index) => {
        const paramName = consName === 'FarToCelEQ' ? 'input' : consName === 'CalcAverageEQ' ? `t${index + 1}` : input.name;
        code.push(`${indent(2)}const ${input.name} = params.${paramName} !== undefined ? params.${paramName} : ${getDefaultValueForType(input.type, enums, datatypes, false)};`);
    });
    onames.forEach((output) => {
        code.push(`${indent(2)}const ${output.name} = params.output !== undefined ? params.output : ${getDefaultValueForType(output.type, enums, datatypes, false)};`);
    });
    code.push(`${indent(2)}const result = ${consName}(${[...inames.map(i => i.name), ...onames.map(o => o.name)].join(', ')});`);
    code.push(`${indent(2)}if (!result) {`);
    code.push(`${indent(3)}throw new Error('Constraint ${consName} violated');`);
    code.push(`${indent(2)}}`);
    code.push(`${indent(2)}console.log('Constraint ${consName} passed');`);
    code.push(`${indent(2)}return result;`);
    code.push(`${indent(1)}} catch (e) {`);
    code.push(`${indent(2)}console.error('Constraint ${consName} error: ' + e.message);`);
    code.push(`${indent(2)}throw e;`);
    code.push(`${indent(1)}}`);
    code.push('}');
    return code.join('\n');
}

function transformToJavaScript() {
    try {
        const content = sysadlEditor.getValue();
        if (!content || !content.trim()) {
            archEditor.setValue('// No SysADL code to transform.');
            simEditor.setValue('// No SysADL code to transform.');
            return;
        }

        console.log('Starting transformation...');
        if (typeof parseSysADL !== 'function') {
            throw new Error('parseSysADL() not found — ensure parser.js is loaded');
        }
        const parsedData = parseSysADL(content);
        console.log('Parsed data:', JSON.stringify(parsedData, null, 2));

        if (!parsedData.components || !parsedData.connectors || !parsedData.executables || !parsedData.constraints) {
            throw new Error('Incomplete parsed data: missing components, connectors, executables, or constraints');
        }

        const { architectureCode, simulationCode } = generateJsCodes(parsedData);

        archEditor.setValue(architectureCode);
        simEditor.setValue(simulationCode);

        const modelName = parsedData.name.toLowerCase();
        window.currentArchitectureCode = { code: architectureCode, filename: `${modelName}.js` };
        window.currentSimulationCode = { code: simulationCode, filename: `simulate_${modelName}.js` };
        document.getElementById('downloadArchBtn').disabled = false;
        document.getElementById('downloadSimBtn').disabled = false;

    } catch (err) {
        console.error('Transformation error:', err);
        const errorMessage = '// Error transforming to JavaScript: ' + (err && err.message ? err.message : String(err));
        archEditor.setValue(errorMessage);
        simEditor.setValue(errorMessage);
    }
}

function generateJsCodes(model) {
    if (!model || typeof model !== 'object') {
        throw new Error('Invalid or undefined model');
    }

    model.name = model.name === 'SysADLModel' ? 'Simple' : (model.name || 'Simple');
    model.components = Array.isArray(model.components) ? model.components : [];
    model.connectors = Array.isArray(model.connectors) ? model.connectors : [];
    model.executables = Array.isArray(model.executables) ? model.executables : [];
    model.constraints = Array.isArray(model.constraints) ? model.constraints : [];
    model.bindings = Array.isArray(model.bindings) ? model.bindings : [];
    model.allocations = Array.isArray(model.allocations) ? model.allocations : [];
    model.activities = Array.isArray(model.activities) ? model.activities.map(act => ({
        ...act,
        actions: Array.isArray(act.actions) ? act.actions : []
    })) : [];
    model.ports = Array.isArray(model.ports) ? model.ports : [];
    model.types = Array.isArray(model.types) ? model.types : [];

    const enums = model.types.filter(t => t.kind === 'enum');
    const datatypes = model.types.filter(t => t.kind === 'datatype');

    const architectureCode = generateArchitectureCode(model, enums, datatypes);
    const simulationCode = generateSimulationCode(model, enums, datatypes);

    return { architectureCode, simulationCode };
}

function generateArchitectureCode(model, enums, datatypes) {
    const code = [];

    code.push('// @ts-nocheck');
    code.push(`// Generated JavaScript code for SysADL Architecture: ${model.name}`);
    code.push('');

    code.push('// Types');
    const usedTypes = new Set(['Real', 'FahrenheitTemperature', 'CelsiusTemperature']);
    model.ports.forEach(p => p.flows?.forEach(f => usedTypes.add(f.type)));
    model.executables.forEach(e => {
        if (e.inputs) e.inputs.split(',').forEach(i => usedTypes.add(i.split(':')[1]?.trim()));
        if (e.output) usedTypes.add(e.output.split(':')[0]?.trim());
    });
    model.constraints.forEach(c => {
        if (c.inputs) c.inputs.split(',').forEach(i => usedTypes.add(i.split(':')[1]?.trim()));
        if (c.outputs) c.outputs.split(',').forEach(o => usedTypes.add(o.split(':')[1]?.trim()));
    });
    for (const type of ['Real', 'FahrenheitTemperature', 'CelsiusTemperature']) {
        if (usedTypes.has(type)) {
            code.push(`export const ${type} = 'any';`);
        }
    }
    for (const enumType of enums) {
        if (usedTypes.has(enumType.name)) {
            const values = enumType.content ? enumType.content.split(',').map(v => v.trim()) : [];
            code.push(`export const ${sanitizeVarName(enumType.name)} = {`);
            values.forEach((v, i) => {
                code.push(`${indent(1)}${v}: '${v}'${i < values.length - 1 ? ',' : ''}`);
            });
            code.push('};');
        }
    }
    for (const datatype of datatypes) {
        if (usedTypes.has(datatype.name)) {
            code.push(`export const ${sanitizeVarName(datatype.name)} = 'any';`);
        }
    }
    code.push('');

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
    code.push(`${indent(2)}await Promise.all(Array.from(this.subComponents.values()).map(c => c.start ? c.start() : Promise.resolve()));`);
    code.push(`${indent(1)}}`);
    code.push('}');
    code.push('');

    code.push('// Component Classes');
    model.components.forEach(comp => {
        const compName = sanitizeVarName(comp.name);
        const isComposite = !!comp.configuration;
        code.push(`export class ${compName} ${isComposite ? 'extends SysADLComponent' : ''} {`);
        code.push(`${indent(1)}constructor() {`);
        code.push(`${indent(2)}${isComposite ? `super('${compName}');` : `console.log(\`Initializing component ${compName}\`); this.name = '${compName}'; this.ports = []; this.bindings = [];`}`);
        
        if (comp.ports && comp.ports.length > 0) {
            for (const port of comp.ports) {
                const portDef = model.ports.find(p => p.name === port.type) || { flows: [{ direction: 'inout', type: 'any' }] };
                const flow = portDef.flows?.[0] || { direction: 'inout', type: port.type || 'any' };
                const flowType = flow.type || port.type || 'any';
                const direction = flow.direction || 'inout';
                code.push(`${indent(2)}this.ports.push(new SysADLPort('${sanitizeVarName(port.name)}', '${flowType}', '${direction}'));`);
            }
        }

        if (isComposite && comp.configuration) {
            code.push(`${indent(2)}this.subComponents = new Map();`);
            code.push(`${indent(2)}this.connectors = new Map();`);
            for (const subComp of comp.configuration.subComponents || []) {
                code.push(`${indent(2)}this.subComponents.set('${sanitizeVarName(subComp.name)}', new ${sanitizeVarName(subComp.type)}());`);
                for (const port of subComp.ports || []) {
                    const portDef = model.ports.find(p => p.name === port.type) || { flows: [{ direction: 'inout', type: 'any' }] };
                    const flow = portDef.flows?.[0] || { direction: 'inout', type: port.type || 'any' };
                    const flowType = flow.type || port.type || 'any';
                    const direction = flow.direction || 'inout';
                    code.push(`${indent(2)}this.subComponents.get('${sanitizeVarName(subComp.name)}').ports.push(new SysADLPort('${sanitizeVarName(port.name)}', '${flowType}', '${direction}'));`);
                }
            }
            for (const conn of comp.configuration.connectors || []) {
                const activity = model.activities.find(a => model.allocations.some(al => al.type === 'activity' && al.target === conn.type && al.source === a.name));
                const action = Array.isArray(activity?.actions) && activity.actions.length > 0 ? activity.actions[0] : null;
                const transformFn = action ? model.executables.find(ex => model.allocations.some(al => al.type === 'executable' && al.target === action.name && al.source === ex.name))?.name : null;
                const constraintFn = action?.constraint;
                code.push(`${indent(2)}this.connectors.set('${sanitizeVarName(conn.name)}', new ${sanitizeVarName(conn.type)}());`);
                if (transformFn || constraintFn) {
                    code.push(`${indent(2)}this.connectors.get('${sanitizeVarName(conn.name)}').transformFn = ${transformFn || 'null'};`);
                    code.push(`${indent(2)}this.connectors.get('${sanitizeVarName(conn.name)}').constraintFn = ${constraintFn ? `validate${constraintFn}` : 'null'};`);
                }
            }
        }
        code.push(`${indent(1)}}`);
        code.push('');

        if (isComposite && comp.configuration) {
            code.push(`${indent(1)}configureBindings() {`);
            code.push(`${indent(2)}console.log('Configuring bindings for ${compName}');`);
            for (const binding of comp.configuration.bindings || []) {
                const sourceParts = binding.source.includes('.') ? binding.source.split('.') : [null, binding.source];
                const targetParts = binding.target.includes('.') ? binding.target.split('.') : [null, binding.target];
                const sourceCompName = sourceParts[0] || compName;
                const sourcePortName = sourceParts[sourceParts.length - 1];
                const targetCompName = targetParts[0] || compName;
                const targetPortName = targetParts[targetParts.length - 1];
                const connector = comp.configuration.connectors.find(c => c.name === binding.connector || c.bindings?.some(b => b.source === binding.source || b.target === binding.target));
                if (!sourceCompName || !sourcePortName || !targetCompName || !targetPortName || !connector) {
                    code.push(`${indent(2)}console.error('Invalid binding: ${binding.source} -> ${binding.target} via ${binding.connector}');`);
                    continue;
                }
                const sourceIsThis = sourceCompName === compName;
                const targetIsThis = targetCompName === compName;
                const sourceCompVar = sanitizeVarName(sourceCompName);
                const targetCompVar = sanitizeVarName(targetCompName);
                const sourcePortVar = `${sourceCompVar}Port_${sanitizeVarName(sourcePortName)}`;
                const targetPortVar = `${targetCompVar}Port_${sanitizeVarName(targetPortName)}`;
                const connectorVar = `${sanitizeVarName(connector.name)}Conn`;
                const sourcePortType = model.ports.find(p => p.name === sourcePortName)?.flows?.[0]?.type || 
                                      model.ports.find(p => p.name === sourceCompName)?.flows?.[0]?.type || 'Real';
                const targetPortType = model.ports.find(p => p.name === targetPortName)?.flows?.[0]?.type || 
                                      model.ports.find(p => p.name === targetCompName)?.flows?.[0]?.type || 'Real';
                const sourcePortDirection = model.ports.find(p => p.name === sourcePortName)?.flows?.[0]?.direction || 
                                           model.ports.find(p => p.name === sourceCompName)?.flows?.[0]?.direction || 'inout';
                const targetPortDirection = model.ports.find(p => p.name === targetPortName)?.flows?.[0]?.direction || 
                                           model.ports.find(p => p.name === targetCompName)?.flows?.[0]?.direction || 'inout';
                code.push(`${indent(2)}const ${sourcePortVar} = ${sourceIsThis ? `this.ports.find(p => p.name === '${sanitizeVarName(sourcePortName)}') || new SysADLPort('${sanitizeVarName(sourcePortName)}', '${sourcePortType}', '${sourcePortDirection}')` : 
                    `this.subComponents.get('${sanitizeVarName(sourceCompName)}').ports.find(p => p.name === '${sanitizeVarName(sourcePortName)}')`};`);
                code.push(`${indent(2)}const ${targetPortVar} = ${targetIsThis ? `this.ports.find(p => p.name === '${sanitizeVarName(targetPortName)}') || new SysADLPort('${sanitizeVarName(targetPortName)}', '${targetPortType}', '${targetPortDirection}')` : 
                    `this.subComponents.get('${sanitizeVarName(targetCompName)}').ports.find(p => p.name === '${sanitizeVarName(targetPortName)}')`};`);
                code.push(`${indent(2)}const ${connectorVar} = this.connectors.get('${sanitizeVarName(connector.name)}');`);
                code.push(`${indent(2)}if (!${sourcePortVar} || !${targetPortVar} || !${connectorVar}) {`);
                code.push(`${indent(3)}console.error('Error: One or more ports or connectors not found for binding', {`);
                code.push(`${indent(4)}sourcePort: ${sourcePortVar}?.name,`);
                code.push(`${indent(4)}targetPort: ${targetPortVar}?.name,`);
                code.push(`${indent(4)}connector: ${connectorVar}?.name`);
                code.push(`${indent(3)}});`);
                code.push(`${indent(3)}return;`);
                code.push(`${indent(2)}}`);
                code.push(`${indent(2)}this.addBinding(new Binding(`);
                code.push(`${indent(3)}${sourceIsThis ? 'this' : `this.subComponents.get('${sanitizeVarName(sourceCompName)}')`},`);
                code.push(`${indent(3)}${sourcePortVar},`);
                code.push(`${indent(3)}${targetIsThis ? 'this' : `this.subComponents.get('${sanitizeVarName(targetCompName)}')`},`);
                code.push(`${indent(3)}${targetPortVar},`);
                code.push(`${indent(3)}${connectorVar}`);
                code.push(`${indent(2)}));`);
                code.push(`${indent(2)}${connectorVar}.setPorts(${sourcePortVar}, ${targetPortVar});`);
            }
            code.push(`${indent(1)}}`);
            code.push('');
            code.push(`${indent(1)}async start() {`);
            code.push(`${indent(2)}console.log('Starting composite component ${compName}');`);
            code.push(`${indent(2)}await Promise.all(Array.from(this.subComponents.values()).map(c => c.start ? c.start() : Promise.resolve()));`);
            code.push(`${indent(1)}}`);
        } else {
            code.push(`${indent(1)}async start() {`);
            code.push(`${indent(2)}console.log('Starting simple component ${compName}');`);
            code.push(`${indent(1)}}`);
        }
        code.push('}');
        code.push('');
    });

    code.push('// Connector Classes');
    for (const conn of model.connectors) {
        const connName = sanitizeVarName(conn.name);
        const activity = model.activities.find(a => model.allocations.some(al => al.type === 'activity' && al.target === conn.name && al.source === a.name));
        const action = Array.isArray(activity?.actions) && activity.actions.length > 0 ? activity.actions[0] : null;
        const transformFn = action ? model.executables.find(ex => model.allocations.some(al => al.type === 'executable' && al.target === action.name && al.source === ex.name))?.name : null;
        const constraintFn = action?.constraint;
        code.push(`export class ${connName} extends SysADLConnector {`);
        code.push(`${indent(1)}constructor() {`);
        code.push(`${indent(2)}super('${connName}', null, null, ${transformFn ? transformFn : 'null'}, ${constraintFn ? `validate${constraintFn}` : 'null'});`);
        code.push(`${indent(1)}}`);
        code.push('}');
        code.push('');
    }

    code.push('// Executables');
    for (const exec of model.executables) {
        code.push(generateExecutableFunction(exec, enums, datatypes));
        code.push('');
    }

    code.push('// Constraints');
    for (const cons of model.constraints) {
        code.push(generateConstraintFunction(cons, enums, datatypes));
        code.push('');
    }

    return code.join('\n');
}

function generateSimulationCode(model, enums, datatypes) {
    const code = [];

    code.push('// @ts-nocheck');
    code.push(`// Generated JavaScript code for SysADL Simulation: ${model.name}`);
    code.push(`// Import the architecture`);
    code.push(`import * as architecture from './${model.name.toLowerCase()}.js';`);
    code.push('let system = null;');
    code.push('');

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

    code.push('// Main Function');
    code.push('async function main() {');
    code.push(`${indent(1)}console.log('Starting simulation of ${model.name}.sysadl');`);
    const mainComp = model.components.find(c => c.configuration)?.name || 'SystemCP';
    code.push(`${indent(1)}system = new architecture.${sanitizeVarName(mainComp)}();`);
    code.push(`${indent(1)}await system.start();`);
    code.push(`${indent(1)}// Add custom simulation calls here, e.g.:`);
    code.push(`${indent(1)}// await simulate("s1", "current", 77.0);`);
    code.push(`${indent(1)}// await simulate("s2", "current", 86.0);`);
    code.push(`${indent(1)}console.log('System simulation completed');`);
    code.push('}');
    code.push('');
    code.push('main().catch(err => console.error(`Execution error: ${err.message}`));');

    return code.join('\n');
}

if (typeof window !== 'undefined') {
    window.transformToJavaScript = transformToJavaScript;
    window.generateJsCodes = generateJsCodes;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        transformToJavaScript,
        generateJsCodes
    };
}
/* transformer.js (CORRIGIDO)
   Gera JavaScript para arquitetura e simulação SysADL.
   - Corrige a geração de componentes compostos, subcomponentes e bindings.
   - Associa corretamente executables e constraints aos conectores via allocations.
   - Resolve bugs de sintaxe na geração de funções.
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
        return '0.0';
    }
    if (['String', 'Location'].includes(type)) return '""';
    if (type === 'Boolean') return 'false';
    const enumDef = enums.find(e => e.name === type);
    if (enumDef) {
        const firstValue = enumDef.content ? enumDef.content.split(',')[0].trim() : 'null';
        return `${sanitizeVarName(type)}.${firstValue}`;
    }
    const datatypeDef = datatypes.find(d => d.name === type);
    if (datatypeDef) {
        return '{}'; // Simple object for datatypes
    }
    return 'null';
}


function generateExecutableFunction(exec, enums, datatypes) {
    const execName = sanitizeVarName(exec.name);
    const inputs = exec.inputs ? exec.inputs.split(',').map(i => {
        const [name, type] = i.replace('in ', '').split(':').map(s => s.trim());
        return { name: sanitizeVarName(name), type };
    }) : [];
    const outputType = exec.output ? exec.output.replace('out ', '').trim() : 'Void';

    const code = [];
    code.push(`export async function ${execName}(params = {}) {`);
    code.push(`${indent(1)}console.log(\`Executing ${execName} with params: \${JSON.stringify(params)}\`);`);

    inputs.forEach(input => {
        code.push(`${indent(1)}const ${input.name} = params.${input.name} !== undefined ? params.${input.name} : ${getDefaultValueForType(input.type, enums, datatypes)};`);
    });

    let body = exec.body ? exec.body.replace(/->/g, '.') : `return ${getDefaultValueForType(outputType, enums, datatypes)};`;
    // Fix for double return
    if (!body.trim().startsWith('return')) {
        body = `return ${body}`;
    }
    body = body.replace(/;/g, ''); // Remove semicolons to avoid double ones

    code.push(`${indent(1)}${body};`);
    code.push('}');
    return code.join('\n');
}

function generateConstraintFunction(cons, enums, datatypes) {
    const consName = sanitizeVarName(cons.name);
    const inputs = cons.inputs ? cons.inputs.split(',').map(s => s.trim().split(':')[0].trim()) : [];
    const outputs = cons.outputs ? cons.outputs.split(',').map(s => s.trim().split(':')[0].trim()) : [];
    const args = [...inputs, ...outputs].map(sanitizeVarName).join(', ');
    const equation = cons.equation ? escapeTemplateLiterals(cons.equation).replace(/==/g, '===').replace(/->/g, '.') : 'true';

    const code = [];
    code.push(`function ${consName}(${args}) {`);
    code.push(`${indent(1)}return ${equation};`);
    code.push('}');
    code.push('');

    code.push(`export async function validate${consName}(params = {}) {`);
    code.push(`${indent(1)}console.log(\`Validating constraint ${consName} with params: \${JSON.stringify(params)}\`);`);
    code.push(`${indent(1)}try {`);

    const allParams = [...inputs, ...outputs];
    allParams.forEach(param => {
         code.push(`${indent(2)}const ${sanitizeVarName(param)} = params.${sanitizeVarName(param)};`);
    });

    code.push(`${indent(2)}const result = ${consName}(${args});`);
    code.push(`${indent(2)}if (!result) {`);
    code.push(`${indent(3)}throw new Error('Constraint ${consName} violated with params: ' + JSON.stringify(params));`);
    code.push(`${indent(2)}}`);
    code.push(`${indent(2)}console.log('Constraint ${consName} passed');`);
    code.push(`${indent(2)}return true;`);
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

        if (!parsedData.components || !parsedData.connectors) {
            throw new Error('Incomplete parsed data: missing components or connectors');
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
        const errorMessage = `// Error transforming to JavaScript: ${err.message}\n// Stack: ${err.stack}`;
        archEditor.setValue(errorMessage);
        simEditor.setValue(errorMessage);
    }
}


function generateJsCodes(model) {
    model.name = model.name || 'Simple';
    const enums = (model.types || []).filter(t => t.kind === 'enum');
    const datatypes = (model.types || []).filter(t => t.kind === 'datatype');

    const architectureCode = generateArchitectureCode(model, enums, datatypes);
    const simulationCode = generateSimulationCode(model, enums, datatypes);

    return { architectureCode, simulationCode };
}

function generateArchitectureCode(model, enums, datatypes) {
    const code = [];

    code.push('// @ts-nocheck');
    code.push(`// Generated JavaScript code for SysADL Architecture: ${model.name}`);
    code.push('');

    // --- Base Classes (Port, Connector, Binding, Component) ---
    code.push(`
// Base Port Class
class SysADLPort {
    constructor(name, flowType, direction = 'inout') {
        this.name = name;
        this.flowType = flowType || 'any';
        this.direction = direction;
        this.value = null;
        this.bindings = [];
        this.onDataReceivedCallback = null;
    }
    addBinding(binding) { this.bindings.push(binding); }
    setOnDataReceivedCallback(callback) { this.onDataReceivedCallback = callback; }
    async send(data) {
        console.log(\`Port \${this.name} sending data: \${JSON.stringify(data)}\`);
        if (this.direction === 'in') return false;
        this.value = data;
        for (const binding of this.bindings) {
            await binding.connector.transmit(data, this);
        }
        return true;
    }
    async receive(data) {
        console.log(\`Port \${this.name} receiving data: \${JSON.stringify(data)}\`);
        if (this.direction === 'out') return false;
        this.value = data;
        if (this.onDataReceivedCallback) {
            await this.onDataReceivedCallback(this.name, data);
        }
        return true;
    }
}

// Base Connector Class
class SysADLConnector {
    constructor(name, transformFn = null, constraintFn = null) {
        this.name = name;
        this.transformFn = transformFn;
        this.constraintFn = constraintFn;
    }
    setPorts(sourcePort, targetPort) {
        this.sourcePort = sourcePort;
        this.targetPort = targetPort;
    }
    async transmit(data, sourcePort) {
        console.log(\`Connector \${this.name} transmitting data: \${JSON.stringify(data)}\`);
        const targetPort = sourcePort.bindings.find(b => b.connector === this)?.targetPort;
        if (!targetPort) {
            console.error(\`Connector \${this.name} could not find a target port.\`);
            return;
        }

        const inputData = data;
        let transformedData = this.transformFn ? await this.transformFn({ ...this.params, input: inputData }) : inputData;

        if (this.constraintFn) {
            try {
                await this.constraintFn({ ...this.params, input: inputData, output: transformedData });
            } catch (e) {
                console.error(\`Constraint violated in connector \${this.name}: \${e.message}\`);
                return; // Stop transmission if constraint fails
            }
        }
        await targetPort.receive(transformedData);
    }
}

// Binding Class
class Binding {
    constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {
        this.sourceComponent = sourceComponent;
        this.sourcePort = sourcePort;
        this.targetComponent = targetComponent;
        this.targetPort = targetPort;
        this.connector = connector;
        this.sourcePort.addBinding(this);
        this.connector.setPorts(this.sourcePort, this.targetPort);
    }
}

// Base Component Class
class SysADLComponent {
    constructor(name) {
        this.name = name;
        this.ports = new Map();
        this.subComponents = new Map();
        this.connectors = new Map();
        this.bindings = [];
    }
    addPort(port) { this.ports.set(port.name, port); }
    addBinding(binding) { this.bindings.push(binding); }
    async start() {
        console.log(\`Starting component \${this.name}\`);
        for (const subComp of this.subComponents.values()) {
            if (subComp.start) await subComp.start();
        }
    }
}`);
    code.push('');

    // --- Types (Enums, etc.) ---
    code.push('// Types');
    enums.forEach(enumType => {
        const values = enumType.content ? enumType.content.split(',').map(v => v.trim()) : [];
        code.push(`export const ${sanitizeVarName(enumType.name)} = {`);
        values.forEach(v => code.push(`${indent(1)}${v}: '${v}',`));
        code.push('};');
    });
    code.push('');


    // --- Component Classes ---
    code.push('// Component Classes');
    (model.components || []).forEach(comp => {
        const compName = sanitizeVarName(comp.name);
        const isComposite = !!comp.configuration;

        code.push(`export class ${compName} extends SysADLComponent {`);
        code.push(`${indent(1)}constructor() {`);
        code.push(`${indent(2)}super('${comp.name}');`);

        // Add own ports
        (comp.ports || []).forEach(portRef => {
            const portDef = model.ports.find(p => p.name === portRef.type);
            if (portDef && portDef.flows && portDef.flows.length > 0) {
                const flow = portDef.flows[0];
                code.push(`${indent(2)}this.addPort(new SysADLPort('${sanitizeVarName(portRef.name)}', '${flow.type}', '${flow.direction}'));`);
            }
        });

        if (isComposite) {
            // Instantiate sub-components
            (comp.configuration.subComponents || []).forEach(sub => {
                code.push(`${indent(2)}this.subComponents.set('${sanitizeVarName(sub.name)}', new ${sanitizeVarName(sub.type)}());`);
            });
            // Instantiate connectors
            (comp.configuration.connectors || []).forEach(conn => {
                const connDef = model.connectors.find(c => c.name === conn.type);
                if (connDef) {
                     const activityAlloc = (model.allocations || []).find(a => a.type === 'activity' && a.target === connDef.name);
                     if (activityAlloc) {
                         const activity = (model.activities || []).find(a => a.name === activityAlloc.source);
                         if (activity && activity.actions && activity.actions.length > 0) {
                             const action = activity.actions[0];
                             const execAlloc = (model.allocations || []).find(a => a.type === 'executable' && a.target === action.name);
                             const transformFn = execAlloc ? sanitizeVarName(execAlloc.source) : 'null';
                             const constraintFn = action.constraint ? `validate${sanitizeVarName(action.constraint)}` : 'null';
                             code.push(`${indent(2)}this.connectors.set('${sanitizeVarName(conn.name)}', new ${sanitizeVarName(conn.type)}(${transformFn}, ${constraintFn}));`);
                         } else {
                            code.push(`${indent(2)}this.connectors.set('${sanitizeVarName(conn.name)}', new ${sanitizeVarName(conn.type)}());`);
                         }
                     } else {
                        code.push(`${indent(2)}this.connectors.set('${sanitizeVarName(conn.name)}', new ${sanitizeVarName(conn.type)}());`);
                     }
                }
            });
            code.push(`${indent(2)}this.configureBindings();`);
        }

        code.push(`${indent(1)}}`); // end constructor

        if (isComposite) {
            code.push('');
            code.push(`${indent(1)}configureBindings() {`);
            code.push(`${indent(2)}console.log('Configuring bindings for ${comp.name}');`);
            (comp.configuration.bindings || []).forEach(binding => {
                 // Note: This assumes a parser that provides a structured binding object.
                 // E.g., { source: "s1.temp1", target: "tempMon.s1", connector: "c1" }
                 const [sourceCompName, sourcePortName] = binding.source.split('.');
                 const [targetCompName, targetPortName] = binding.target.split('.');

                 code.push(`${indent(2)}{ // Binding Block`);
                 code.push(`${indent(3)}const sourceComp = this.subComponents.get('${sanitizeVarName(sourceCompName)}');`);
                 code.push(`${indent(3)}const targetComp = this.subComponents.get('${sanitizeVarName(targetCompName)}');`);
                 code.push(`${indent(3)}const sourcePort = sourceComp.ports.get('${sanitizeVarName(sourcePortName)}');`);
                 code.push(`${indent(3)}const targetPort = targetComp.ports.get('${sanitizeVarName(targetPortName)}');`);
                 code.push(`${indent(3)}const connector = this.connectors.get('${sanitizeVarName(binding.connector)}');`);
                 code.push(`${indent(3)}if (sourceComp && targetComp && sourcePort && targetPort && connector) {`);
                 code.push(`${indent(4)}this.addBinding(new Binding(sourceComp, sourcePort, targetComp, targetPort, connector));`);
                 code.push(`${indent(3)}} else {`);
                 code.push(`${indent(4)}console.error('Failed to create binding:', ${JSON.stringify(binding)});`);
                 code.push(`${indent(3)}}`);
                 code.push(`${indent(2)}}`);
            });
            code.push(`${indent(1)}}`);
        }

        code.push('}');
        code.push('');
    });

    // --- Connector Classes ---
    code.push('// Connector Classes');
    (model.connectors || []).forEach(conn => {
        const connName = sanitizeVarName(conn.name);
        code.push(`export class ${connName} extends SysADLConnector {`);
        code.push(`${indent(1)}constructor(transformFn = null, constraintFn = null) {`);
        code.push(`${indent(2)}super('${conn.name}', transformFn, constraintFn);`);
        code.push(`${indent(1)}}`);
        code.push('}');
        code.push('');
    });

    // --- Executables & Constraints ---
    code.push('// Executables');
    (model.executables || []).forEach(exec => {
        code.push(generateExecutableFunction(exec, enums, datatypes));
        code.push('');
    });

    code.push('// Constraints');
    (model.constraints || []).forEach(cons => {
        code.push(generateConstraintFunction(cons, enums, datatypes));
        code.push('');
    });

    return code.join('\n');
}


function generateSimulationCode(model) {
    const code = [];
    const mainComp = (model.components || []).find(c => c.configuration);
    const modelName = model.name || 'Simple';

    code.push('// @ts-nocheck');
    code.push(`// Generated JavaScript code for SysADL Simulation: ${modelName}`);
    code.push(`import * as architecture from './${modelName.toLowerCase()}.js';`);
    code.push('');
    code.push('async function main() {');
    code.push(`${indent(1)}console.log('Starting simulation of ${modelName}.sysadl');`);
    if (mainComp) {
        code.push(`${indent(1)}const system = new architecture.${sanitizeVarName(mainComp.name)}();`);
        code.push(`${indent(1)}await system.start();`);
        code.push('');
        code.push(`${indent(1)}// --- Example Simulation ---`);
        code.push(`${indent(1)}// This is a helper function to simplify sending data to a component's port.`);
        code.push(`${indent(1)}async function simulate(compInstance, portName, value) {`);
        code.push(`${indent(2)}const port = compInstance.ports.get(portName);`);
        code.push(`${indent(2)}if (port) {`);
        code.push(`${indent(3)}console.log(\`SIMULATING: Sending \${value} to \${compInstance.name}.\${portName}\`);`);
        code.push(`${indent(3)}await port.send(value);`);
        code.push(`${indent(2)}} else {`);
        code.push(`${indent(3)}console.error(\`SIMULATION ERROR: Port '\${portName}' not found on component '\${compInstance.name}'.\`);`);
        code.push(`${indent(2)}}`);
        code.push(`${indent(1)}}`);
        code.push('');
        code.push(`${indent(1)}// Find sub-component instances to interact with them`);
        code.push(`${indent(1)}// const s1 = system.subComponents.get('s1');`);
        code.push(`${indent(1)}// const s2 = system.subComponents.get('s2');`);
        code.push('');
        code.push(`${indent(1)}// Example of sending data to the sensors`);
        code.push(`${indent(1)}// if (s1 && s2) {`);
        code.push(`${indent(2)}// await simulate(s1, 'current', 77.0);`);
        code.push(`${indent(2)}// await simulate(s2, 'current', 86.0);`);
        code.push(`${indent(1)}// }`);
    } else {
        code.push(`${indent(1)}console.log('No main component with a configuration found to simulate.');`);
    }

    code.push(`${indent(1)}console.log('System simulation setup complete.');`);
    code.push('}');
    code.push('');
    code.push('main().catch(err => console.error(\`Execution error: \${err.stack}\`));');

    return code.join('\n');
}

// Make functions available to the browser's global scope
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
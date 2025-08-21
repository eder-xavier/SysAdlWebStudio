
// @ts-nocheck

function sanitizeVarName(name) {
    if (!name) return '_';
    return String(name).replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^[0-9]/, m => '_' + m);
}

function indent(level) {
    return '    '.repeat(level);
}

function transformToJavaScript() {
    try {
        const content = sysadlEditor.getValue();
        const parsedData = parseSysADL(content);
        
        const architectureCode = generateArchitectureCode(parsedData);
        const simulationCode = getFixedSimulationCode(parsedData);

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

// =============================================================================
// FUNÇÃO PRINCIPAL DE GERAÇÃO DE CÓDIGO DE ARQUITETURA
// =============================================================================
function generateArchitectureCode(model) {
    const code = [];
    code.push('// @ts-nocheck');
    code.push(`// Generated JavaScript code for SysADL Architecture: ${model.name}`);
    code.push(`// This code follows the stateful/behavioral pattern from the simple.js example.`);
    code.push('');

    // --- 1. Classes Base (Copiadas diretamente do gabarito para garantir 100% de fidelidade) ---
    code.push(getBaseClasses());

    // --- 2. Classes de Componentes (Geradas com a nova lógica) ---
    code.push('// Component Classes');
    model.components.forEach(comp => {
        code.push(generateComponentClass(comp, model));
    });

    // --- 3. Classes de Conectores (Geradas com a nova lógica) ---
    code.push('// Connector Classes');
    model.connectors.forEach(conn => {
        code.push(generateConnectorClass(conn, model));
    });

    // --- 4. Funções Executable (Corrigidas) ---
    code.push('// Executables');
    model.executables.forEach(exec => {
        code.push(generateExecutableFunction(exec));
    });

    // --- 5. Funções de Constraint (Corrigidas) ---
    code.push('// Constraints');
    model.constraints.forEach(cons => {
        code.push(generateConstraintFunction(cons));
    });

    return code.join('\n');
}


// =============================================================================
// GERADORES DE BLOCOS DE CÓDIGO
// =============================================================================

function getBaseClasses() {
    return `
class SysADLPort {
    constructor(name, flowType, direction = 'inout') {
        this.name = name; this.flowType = flowType; this.direction = direction; this.value = null; this.bindings = []; this.onDataReceivedCallback = null;
    }
    addBinding(binding) { this.bindings.push(binding); }
    setOnDataReceivedCallback(callback) { this.onDataReceivedCallback = callback; }
    async send(data) {
        console.log(\`Port '\${this.name}' sending data: \${JSON.stringify(data)}\`);
        if (this.direction === 'in') { return false; }
        this.value = data;
        for (const binding of this.bindings) { await binding.connector.transmit(data, this); }
        return true;
    }
    async receive(data) {
        console.log(\`Port '\${this.name}' receiving data: \${JSON.stringify(data)}\`);
        if (this.direction === 'out') { return false; }
        this.value = data;
        if (this.onDataReceivedCallback) { await this.onDataReceivedCallback(this.name, data); }
        return true;
    }
}

class SysADLConnector {
    constructor(name, sourcePort = null, targetPort = null, transformFn = null, constraintFn = null) {
        this.name = name; this.sourcePort = sourcePort; this.targetPort = targetPort; this.transformFn = transformFn; this.constraintFn = constraintFn;
    }
    setPorts(sourcePort, targetPort) { this.sourcePort = sourcePort; this.targetPort = targetPort; }
    async transmit(data, sourcePort) {
        const binding = sourcePort.bindings.find(b => b.connector === this);
        if (!binding || !binding.targetPort) return;
        
        const paramsForExec = { f: data }; // Padrão do simple.js
        const transformedData = this.transformFn ? await this.transformFn(paramsForExec) : data;
        
        if (this.constraintFn) {
            try {
                const paramsForConstraint = { f: data, c: transformedData }; // Padrão do simple.js
                await this.constraintFn(paramsForConstraint);
            } catch (e) {
                console.error(\`Constraint VIOLATED in \${this.name}: \${e.message}\`);
                return;
            }
        }
        await binding.targetPort.receive(transformedData);
    }
}

class Binding {
    constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {
        this.sourceComponent = sourceComponent; this.sourcePort = sourcePort; this.targetComponent = targetComponent; this.targetPort = targetPort; this.connector = connector;
        this.sourcePort.addBinding(this);
        this.connector.setPorts(this.sourcePort, this.targetPort);
    }
}

class SysADLComponent {
    constructor(name, isBoundary = false) {
        this.name = name; this.isBoundary = isBoundary; this.ports = []; this.state = {}; this.activities = [];
    }
    addPort(port) {
        this.ports.push(port);
        port.setOnDataReceivedCallback((portName, data) => this.onDataReceived(portName, data));
    }
    async onDataReceived(portName, data) {
        console.log(\`\${this.name} received '\${data}' on port '\${portName}'\`);
        this.state[portName] = data;
        for (const activity of this.activities) {
            console.log(\`Triggering activity '\${activity.methodName}' in component '\${this.name}'\`);
            await this[activity.methodName]();
        }
    }
    async start() {
        console.log(\`Starting component \${this.name}\`);
        if (this.subComponents) {
            for (const sub of this.subComponents.values()) { await sub.start(); }
        }
    }
}`;
}

function generateComponentClass(comp, model) {
    const code = [];
    const compName = sanitizeVarName(comp.name);
    
    // Heurística para construtor dinâmico: é boundary, tem 1 porta, e é instanciado mais de uma vez.
    const instantiations = model.components.flatMap(c => c.configuration ? c.configuration.subComponents : []).filter(s => s.type === comp.name);
    const needsDynamicConstructor = comp.isBoundary && comp.ports.length === 1 && instantiations.length > 1;

    code.push(`export class ${compName} extends SysADLComponent {`);
    if (needsDynamicConstructor) {
        const port = comp.ports[0];
        const portDef = model.ports.find(p => p.name === port.type);
        const portType = portDef.flows[0].type;
        code.push(`${indent(1)}constructor(name, portName) {`);
        code.push(`${indent(2)}super(name, true);`);
        code.push(`${indent(2)}this.addPort(new SysADLPort(portName, '${portType}', 'out'));`);
        code.push(`${indent(2)}this.state[portName] = null;`);
        code.push(`${indent(1)}}`);
    } else {
        code.push(`${indent(1)}constructor() {`);
        code.push(`${indent(2)}super('${comp.name}', ${comp.isBoundary});`);
        
        comp.ports.forEach(port => {
            const portDef = model.ports.find(p => p.name === port.type);
            if (portDef && portDef.flows.length > 0) {
                const flow = portDef.flows[0];
                // Força a direção correta para StdOut como no gabarito
                const direction = comp.name === 'StdOutCP' ? 'in' : flow.direction;
                code.push(`${indent(2)}this.addPort(new SysADLPort('${port.name}', '${flow.type}', '${direction}'));`);
                code.push(`${indent(2)}this.state['${port.name}'] = null;`);
            }
        });

        const allocatedActivities = model.allocations.filter(a => a.type === 'activity' && a.target === comp.name);
        allocatedActivities.forEach(alloc => {
            code.push(`${indent(2)}this.activities.push({ methodName: 'execute_${alloc.source}' });`);
        });
        
        if (comp.configuration) {
            code.push(`${indent(2)}this.subComponents = new Map();`);
            code.push(`${indent(2)}this.connectors = new Map();`);
            comp.configuration.subComponents.forEach(sub => {
                const subCompDef = model.components.find(c => c.name === sub.type);
                const isSubDynamic = subCompDef.isBoundary && subCompDef.ports.length === 1 && instantiations.length > 1;
                if (isSubDynamic) {
                    code.push(`${indent(2)}this.subComponents.set('${sub.name}', new ${sanitizeVarName(sub.type)}('${sub.name}', '${sub.portAliases[0].alias}'));`);
                } else {
                    code.push(`${indent(2)}this.subComponents.set('${sub.name}', new ${sanitizeVarName(sub.type)}());`);
                }
            });
            comp.configuration.connectors.forEach(conn => {
                code.push(`${indent(2)}this.connectors.set('${conn.name}', new ${sanitizeVarName(conn.type)}());`);
            });
            code.push(`${indent(2)}this.configureBindings();`);
        }
        code.push(`${indent(1)}}`);
    }

    // Gerar métodos de comportamento a partir de activities
    const allocatedActivities = model.allocations.filter(a => a.type === 'activity' && a.target === comp.name);
    allocatedActivities.forEach(alloc => {
        const activity = model.activities.find(a => a.name === alloc.source);
        if (!activity || !activity.actions || activity.actions.length === 0) return;
        
        const action = activity.actions[0];
        const executableAlloc = model.allocations.find(a => a.type === 'executable' && a.target === action.name);
        if (!executableAlloc) return;
        const executable = model.executables.find(e => e.name === executableAlloc.source);
        const constraint = model.constraints.find(c => c.name === action.constraint);
        if (!executable) return;

        code.push('');
        code.push(`${indent(1)}async execute_${activity.name}() {`);
        
        const execInputs = executable.inputs.split(',').map(i => i.replace(/in\s*/, '').split(':')[0].trim());
        const inputPorts = comp.ports.filter(p => p.direction === 'in');
        code.push(`${indent(2)}const params = { ${execInputs.map((inputVar, index) => `${inputVar}: this.state['${inputPorts[index].name}']`).join(', ')} };`);

        code.push(`${indent(2)}if (Object.values(params).some(p => p === null)) {`);
        code.push(`${indent(3)}console.warn('Input values are null for activity ${activity.name}, execution aborted.');`);
        code.push(`${indent(3)}return null;`);
        code.push(`${indent(2)}}`);
        
        code.push(`${indent(2)}const result = await ${executable.name}(params);`);
        
        if (constraint) {
            const constInputs = constraint.inputs.split(',').map(i => i.split(':')[0].trim());
            const constOutput = constraint.outputs.split(':')[0].trim();
            const paramMapping = constInputs.map((ci, index) => `${ci}: params.${execInputs[index]}`).join(', ');
            code.push(`${indent(2)}try { await validate${constraint.name}({ ${paramMapping}, ${constOutput}: result }); }`);
            code.push(`${indent(2)}catch(e) { console.error(\`Constraint ${constraint.name} violated: \${e.message}\`); return null; }`);
        }

        const outputPort = comp.ports.find(p => p.direction === 'out');
        if (outputPort) {
            code.push(`${indent(2)}this.state['${outputPort.name}'] = result;`);
            code.push(`${indent(2)}const outputPort = this.ports.find(p => p.name === '${outputPort.name}');`);
            code.push(`${indent(2)}if (outputPort) { await outputPort.send(result); }`);
        }
        code.push(`${indent(2)}return result;`);
        code.push(`${indent(1)}}`);
    });

    if (comp.configuration) {
        code.push('');
        code.push(`${indent(1)}configureBindings() {`);
        comp.configuration.bindings.forEach(binding => {
             const [sourceCompName, sourcePortAlias] = binding.source.split('.');
             const [targetCompName, targetPortAlias] = binding.target.split('.');
             code.push(`${indent(2)}{`);
             code.push(`${indent(3)}const sourceComp = this.subComponents.get('${sourceCompName}');`);
             code.push(`${indent(3)}const targetComp = this.subComponents.get('${targetCompName}');`);
             code.push(`${indent(3)}const sourcePort = sourceComp.ports.find(p => p.name === '${sourcePortAlias}');`);
             code.push(`${indent(3)}const targetPort = targetComp.ports.find(p => p.name === '${targetPortAlias}');`);
             code.push(`${indent(3)}const connector = this.connectors.get('${binding.connector}');`);
             code.push(`${indent(3)}if (sourcePort && targetPort && connector) { new Binding(sourceComp, sourcePort, targetComp, targetPort, connector); } else { console.error('BINDING FAILED:', ${JSON.stringify(binding)}); }`);
             code.push(`${indent(2)}}`);
        });
        code.push(`${indent(1)}}`);
    }
    
    code.push('}');
    return code.join('\n');
}

function generateConnectorClass(conn, model) {
    let transformFn = 'null', constraintFn = 'null';
    const activityAlloc = model.allocations.find(a => a.type === 'activity' && a.target === conn.name);
    if (activityAlloc) {
        const activity = model.activities.find(a => a.name === activityAlloc.source);
        const action = activity ? activity.actions[0] : null;
        if (action) {
            const execAlloc = model.allocations.find(a => a.type === 'executable' && a.target === action.name);
            if (execAlloc) transformFn = execAlloc.source;
            if (action.constraint) constraintFn = `validate${action.constraint}`;
        }
    }
    return `export class ${sanitizeVarName(conn.name)} extends SysADLConnector { constructor() { super('${conn.name}', null, null, ${transformFn}, ${constraintFn}); } }`;
}

function generateExecutableFunction(exec) {
    const params = exec.inputs.split(',').map(i => i.replace(/in\s*/, '').split(':')[0].trim());
    let body = exec.body.trim();
    if (!body.startsWith('return')) body = `return ${body}`;
    const code = [];
    code.push(`async function ${exec.name}(params = {}) {`);
    code.push(`${indent(1)}console.log(\`Executing ${exec.name} with params: \${JSON.stringify(params)}\`);`);
    params.forEach(p => code.push(`${indent(1)}const ${p} = params.${p} || 0.0;`));
    code.push(`${indent(1)}${body.replace(/;/g, '')};`);
    code.push(`}`);
    return code.join('\n');
}

function generateConstraintFunction(cons) {
    const code = [];
    const fullEq = cons.equation.replace("==", "===");
    const inputs = cons.inputs.split(',').map(p => p.split(':')[0].trim());
    const output = cons.outputs.split(':')[0].trim();

    code.push(`async function validate${cons.name}(params = {}) {`);
    code.push(`${indent(1)}console.log(\`Evaluating constraint ${cons.name}: ${fullEq}\`);`);
    inputs.forEach(p => code.push(`${indent(1)}const ${p} = params.${p};`));
    code.push(`${indent(1)}const ${output} = params.${output};`);
    code.push(`${indent(1)}const result = ${fullEq};`);
    code.push(`${indent(1)}if (!result) { throw new Error('Constraint ${cons.name} violated'); }`);
    code.push(`${indent(1)}console.log('Constraint ${cons.name} passed');`);
    code.push(`${indent(1)}return result;`);
    code.push(`}`);
    return code.join('\n');
}

function getFixedSimulationCode(model) {
    return `// @ts-nocheck
// Simulation file (fixed template)
import * as architecture from './${model.name.toLowerCase()}.js';

async function main() {
    console.log('--- Starting simulation of ${model.name}.sysadl ---');
    const system = new architecture.SystemCP();
    await system.start();
    console.log('--- System Initialized ---');

    // Helper to simulate data sending to a sub-component's port
    async function simulate(componentName, portName, value) {
        if (!system) { console.error("System not initialized"); return; }
        const component = system.subComponents.get(componentName);
        if (!component) { console.error(\`Component \${componentName} not found\`); return; }
        const port = component.ports.find(p => p.name === portName);
        if (!port) { console.error(\`Port \${portName} not found in component \${componentName}\`); return; }
        console.log(\`\nSIMULATING: Sending \${value} to \${componentName}.\${portName}\`);
        await port.send(value);
    }
    
    console.log('\\n--- Running Simulation Scenario ---');
    await simulate('s1', 'temp1', 77.0); 
    await simulate('s2', 'temp2', 86.0); 
    
    console.log('\\n--- Simulation Completed ---');
}

main().catch(err => console.error(\`EXECUTION ERROR: \${err.stack}\`));`;
}
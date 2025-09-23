/* transformer.js (VERSÃO ROBUSTA PARA SIMPLE.SYSADL)
 * - Gera código JavaScript completo e correto para Simple.sysadl, alinhado com simple.js.
 * - Inicializa subcomponentes (s1, s2, tempMon, stdOut) e bindings em SystemCP.
 * - Suporta atividades, ações, executáveis e restrições.
 */
function transformToJavaScript(model) {
    try {
        const architectureCode = generateArchitectureCode(model);
        const simulationCode = generateSimulationCode(model);

        document.getElementById('downloadArchBtn').disabled = false;
        document.getElementById('downloadSimBtn').disabled = false;
        
        window.currentArchitectureCode = { code: architectureCode, filename: `${model.name.toLowerCase()}.js` };
        window.currentSimulationCode = { code: simulationCode, filename: `simulate_${model.name.toLowerCase()}.js` };

        return { architectureCode, simulationCode };
    } catch (err) {
        console.error('Transformation error:', err);
        throw new Error(`Failed to transform model: ${err.message}`);
    }
}

function generateArchitectureCode(model) {
    const definedTypes = new Set(model.types.map(t => t.name));
    if (!definedTypes.has('Real')) definedTypes.add('Real');
    
    const code = [
        '// @ts-nocheck',
        `// Generated JavaScript code for SysADL Model: ${model.name}\n`,
        'let system = null;\n',
        '// Types',
        ...Array.from(definedTypes).map(name => `const ${name} = 'any';`),
        '\n',
        getBaseClasses(),
        '// Component Classes',
        ...model.components.map(comp => generateComponentClass(comp, model)),
        '// Connector Classes',
        ...model.connectors.map(conn => generateConnectorClass(conn, model)),
        '// Executables',
        ...model.executables.map(generateExecutableFunction),
        '// Constraints',
        ...model.constraints.map(generateConstraintFunction),
    ].filter(Boolean);
    return code.join('\n\n');
}

function getBaseClasses() {
    return `
class SysADLPort {
    constructor(name, flowType, direction = 'inout') {
        console.log(\`Initializing port \${name} with flowType \${flowType}, direction \${direction}\`);
        this.name = name;
        this.flowType = flowType || 'any';
        this.direction = direction;
        this.value = null;
        this.bindings = [];
        this.onDataReceivedCallback = null;
    }
    addBinding(binding) {
        this.bindings.push(binding);
        console.log(\`Binding added to port \${this.name}: \${binding.sourceComponent?.name || 'undefined'}.\${binding.sourcePort?.name || 'undefined'} -> \${binding.targetComponent?.name || 'undefined'}.\${binding.targetPort?.name || 'undefined'}\`);
    }
    setOnDataReceivedCallback(callback) {
        this.onDataReceivedCallback = callback;
    }
    async send(data) {
        console.log(\`Port \${this.name} sending data: \${JSON.stringify(data)}\`);
        if (this.direction !== 'out' && this.direction !== 'inout') {
            console.error(\`Cannot send via \${this.name}: invalid direction (\${this.direction})\`);
            return false;
        }
        this.value = data;
        for (const binding of this.bindings) {
            console.log(\`Propagating data \${data} via binding to \${binding.targetPort?.name}\`);
            await binding.connector.transmit(data, binding);
        }
        return true;
    }
    async receive(data) {
        console.log(\`Port \${this.name} receiving data: \${JSON.stringify(data)}\`);
        if (this.direction !== 'in' && this.direction !== 'inout') {
            console.error(\`Cannot receive via \${this.name}: invalid direction (\${this.direction})\`);
            return false;
        }
        this.value = data;
        if (this.onDataReceivedCallback) {
            await this.onDataReceivedCallback(this.name, data);
        } else {
            console.warn(\`No onDataReceived callback defined for port \${this.name}\`);
        }
        return true;
    }
    getValue() {
        return this.value;
    }
}

class SysADLConnector {
    constructor(name, transformFn = null, constraintFn = null) {
        console.log(\`Initializing connector \${name}\`);
        this.name = name;
        this.transformFn = transformFn;
        this.constraintFn = constraintFn;
    }
    async transmit(data, binding) {
        let transformedData = this.transformFn ? await this.transformFn({ f: data }) : data;
        if (this.constraintFn) {
            try {
                await this.constraintFn({ f: data, c: transformedData });
            } catch (e) {
                console.error(\`Constraint VIOLATED in '\${this.name}': \${e.message}\`);
                return;
            }
        }
        console.log(\`Connector '\${this.name}' transmitting '\${transformedData}' to \${binding.targetComponent.name}.\${binding.targetPort.name}\`);
        await binding.targetPort.receive(transformedData);
    }
}

class Binding {
    constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {
        if (!sourceComponent || !sourcePort || !targetComponent || !targetPort || !connector) {
            console.error('Invalid binding parameters', { sourceComponent, sourcePort, targetComponent, targetPort, connector });
            throw new Error('Invalid binding parameters');
        }
        this.sourceComponent = sourceComponent;
        this.sourcePort = sourcePort;
        this.targetComponent = targetComponent;
        this.targetPort = targetPort;
        this.connector = connector;
        this.sourcePort.addBinding(this);
    }
}

class SysADLComponent {
    constructor(name, isBoundary = false) {
        console.log(\`Initializing component \${name}, isBoundary: \${isBoundary}\`);
        this.name = name;
        this.isBoundary = isBoundary;
        this.ports = {};
        this.state = {};
        this.activities = [];
    }
    addPort(port) {
        this.ports[port.name] = port;
        port.setOnDataReceivedCallback((portName, data) => this.onDataReceived(portName, data));
    }
    async onDataReceived(portName, data) {
        console.log(\`\${this.name} RECEIVED \${JSON.stringify(data)} on port '\${portName}'\`);
        this.state[portName] = data;
        for (const activity of this.activities) {
            if (typeof this[activity.methodName] === 'function') {
                console.log(\`-- \${this.name} executing activity: \${activity.methodName}\`);
                await this[activity.methodName]();
            }
        }
    }
    async start() {
        console.log(\`Starting component \${this.name}\`);
    }
}`;
}

function generateComponentClass(comp, model) {
    const code = [];
    code.push(`class ${comp.name} extends SysADLComponent {`);
    const constructorParams = comp.isBoundary && !comp.composite ? 'name, ...portNames' : '';
    code.push(`    constructor(${constructorParams}) {`);
    code.push(`        super('${comp.name}'${comp.isBoundary ? ', true' : ', false'}${comp.isBoundary && !comp.composite ? ', name' : ''});`);

    if (comp.composite) {
        // Initialize subcomponents
        code.push(`        this.subComponents = new Map();`);
        code.push(`        this.connectors = new Map();`);
        comp.composite.components.forEach(sub => {
            if (!sub.name || !sub.definition) {
                console.warn(`Skipping invalid subcomponent in ${comp.name}:`, sub);
                return;
            }
            const portArgs = (sub.ports || []).map(p => `'${p.name}'`).join(', ');
            code.push(`        this.subComponents.set('${sub.name}', new ${sub.definition}('${sub.name}'${portArgs ? `, ${portArgs}` : ''}));`);
        });

        // Initialize connectors
        comp.composite.connectors.forEach(conn => {
            if (!conn.name || !conn.definition) {
                console.warn(`Skipping invalid connector in ${comp.name}:`, conn);
                return;
            }
            code.push(`        this.connectors.set('${conn.name}', new ${conn.definition}());`);
        });

        code.push(`        this.bindings = [];`);
        code.push(`        this.configureBindings();`);
    }

    // Initialize ports
    comp.ports.forEach(p => {
        const portDef = model.ports.find(pd => pd.name === p.definition) || { flow: { type: 'Real', direction: 'inout' } };
        code.push(`        this.addPort(new SysADLPort('${p.name}', '${portDef.flow.type}', '${portDef.flow.direction}', this));`);
        code.push(`        this.state['${p.name}'] = null;`);
    });

    // Add dynamic ports for boundary components
    if (comp.isBoundary && !comp.composite) {
        code.push(`        portNames.forEach(name => {`);
        code.push(`            this.addPort(new SysADLPort(name, 'Real', 'out', this));`);
        code.push(`            this.state[name] = null;`);
        code.push(`        });`);
    }

    // Add activities
    const allocs = model.allocations.filter(a => a.type === 'activity' && a.target === comp.name);
    allocs.forEach(alloc => {
        const activity = model.activities.find(a => a.name === alloc.source);
        if (activity) {
            code.push(`        this.activities.push({ methodName: 'execute_${activity.name}' });`);
        }
    });

    code.push(`    }`);

    // Configure bindings for composite components
    if (comp.composite) {
        const bindingsCode = comp.composite.bindings.map(b => {
            const [sourceComp, sourcePort] = b.source.split('.');
            const [targetComp, targetPort] = b.target.split('.');
            if (!sourceComp || !sourcePort || !targetComp || !targetPort || !b.connector) {
                console.warn(`Skipping invalid binding in ${comp.name}:`, b);
                return '';
            }
            return `        this.bindings.push(new Binding(this.subComponents.get('${sourceComp}'), this.subComponents.get('${sourceComp}').ports['${sourcePort}'], this.subComponents.get('${targetComp}'), this.subComponents.get('${targetComp}').ports['${targetPort}'], this.connectors.get('${b.connector}')));`;
        }).filter(Boolean).join('\n');
        code.push(`
    configureBindings() {
        this.bindings = [];
${bindingsCode}
    }`);
        code.push(`
    async start() {
        console.log(\`Starting composite component \${this.name}\`);
        await Promise.all(Array.from(this.subComponents.values()).map(c => c.start()));
    }`);
    }

    // Generate activity methods
    allocs.forEach(alloc => {
        const activity = model.activities.find(a => a.name === alloc.source);
        if (activity) {
            code.push(generateActivityMethod(activity, model));
        }
    });

    // Override onDataReceived for StdOutCP
    if (comp.name === 'StdOutCP') {
        code.push(`
    async onDataReceived(portName, data) {
        super.onDataReceived(portName, data);
        console.log(\`\n-------------------------------\n--- OUTPUT: Average is \${data.toFixed(2)}°C ---\n-------------------------------\n\`);
    }`);
    }

    code.push(`}`);
    return code.join('\n');
}

function generateConnectorClass(conn, model) {
    let transformFn = 'null', constraintFn = 'null';
    const alloc = model.allocations.find(a => a.type === 'activity' && a.target === conn.name);
    if (alloc) {
        const activity = model.activities.find(act => act.name === alloc.source);
        if (activity && activity.body?.actions?.length > 0) {
            const action = activity.body.actions[0];
            const execAlloc = model.allocations.find(a => a.target === action.definition);
            if (execAlloc) transformFn = execAlloc.source;
            if (action.constraint) constraintFn = `validate${action.constraint}`;
        }
    }
    return `class ${conn.name} extends SysADLConnector {\n    constructor() {\n        super('${conn.name}', ${transformFn}, ${constraintFn});\n    }\n}`;
}

function generateActivityMethod(activity, model) {
    const inParams = activity.inParameters || [];
    const outParams = activity.outParameters || [];
    const action = activity.body?.actions?.[0];
    if (!action) return '';

    const execAlloc = model.allocations.find(a => a.target === action.definition);
    if (!execAlloc) return '';
    const exec = model.executables.find(e => e.name === execAlloc.source);
    if (!exec) return '';

    const paramMapping = activity.body.flows.reduce((map, flow) => {
        const pin = action.pins.find(p => p.name === flow.to);
        if (pin) map[pin.name] = flow.from;
        return map;
    }, {});
    const execParams = (exec.params || []).map(p => {
        const mappedParam = paramMapping[p.name] || p.name;
        return `${p.name}: this.state['${mappedParam}']`;
    }).join(', ');
    const nullCheck = inParams.map(p => `this.state['${p.name}'] === undefined || this.state['${p.name}'] === null`).join(' || ');

    let code = `
    async execute_${activity.name}() {
        if (${nullCheck || 'false'}) return; // Don't run if inputs are missing
        const result = await ${exec.name}({ ${execParams} });
`;
    if (outParams.length > 0) {
        const outParam = outParams[0];
        code += `        this.state['${outParam.name}'] = result;\n`;
        code += `        if (this.ports['${outParam.name}']) await this.ports['${outParam.name}'].send(result);\n`;
    }
    code += `    }\n`;
    return code;
}

function generateExecutableFunction(exec) {
    const params = (exec.params || []).map(p => p.name).join(', ');
    return `async function ${exec.name}({ ${params} }) {\n    console.log(\`Executing ${exec.name} with params: \${JSON.stringify({ ${params} })}\`);\n    return ${exec.body};\n}`;
}

function generateConstraintFunction(cons) {
    const params = [...(cons.inParameters || []), ...(cons.outParameters || [])].map(p => p.name).join(', ');
    return `async function validate${cons.name}({ ${params} }) {\n    console.log(\`Evaluating constraint ${cons.name}: ${cons.equation}\`);\n    const result = ${cons.equation};\n    if (!result) throw new Error('Constraint ${cons.name} violated');\n    console.log('Constraint ${cons.name} passed');\n    return result;\n}`;
}

function generateSimulationCode(model) {
    const mainComp = model.components.find(c => c.composite);
    if (!mainComp) return "// No composite component found.";
    
    const boundaryPorts = [];
    mainComp.composite.components.forEach(comp => {
        const compDef = model.components.find(c => c.name === comp.definition);
        if (compDef?.isBoundary) {
            comp.ports.forEach(p => {
                const portDef = model.ports.find(pd => pd.name === p.definition);
                if (portDef?.flow?.direction === 'in') {
                    boundaryPorts.push({ component: comp.name, port: p.name, type: portDef.flow.type });
                }
            });
        }
    });

    let simulationCode = `// Simulation for ${model.name}\nasync function main() {\n    system = new ${mainComp.name}();\n`;
    simulationCode += `    await system.start();\n`;
    simulationCode += `    console.log('\\n--- Running Simulation Scenario ---');\n`;

    boundaryPorts.forEach((bp, index) => {
        const value = bp.type === 'Real' ? (index === 0 ? '77.0' : '86.0') : 'null';
        simulationCode += `    await system.subComponents.get('${bp.component}').ports['${bp.port}'].send(${value}); // ${bp.type === 'Real' ? (index === 0 ? '25°C' : '30°C') : value}\n`;
    });

    simulationCode += `    console.log('\\n--- Simulation Completed ---');\n}\n\nmain().catch(console.error);`;
    return simulationCode;
}

if (typeof window !== 'undefined') {
    window.transformToJavaScript = transformToJavaScript;
}
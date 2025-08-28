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

function generateArchitectureCode(model) {
    const code = [];
    code.push('// @ts-nocheck');
    code.push(`// Generated JavaScript code for SysADL Model: ${model.name}`);
    code.push('');

    // Declarar variável global 'system'
    code.push('let system = null;');
    code.push('');

    // Declarar tipos
    code.push('// Types');
    model.types.forEach(t => {
        code.push(`const ${t.name} = 'any';`);
    });
    code.push('');

    // Adicionar classes base
    code.push(getBaseClasses());

    // Gerar classes de componentes
    code.push('// Component Classes');
    model.components.forEach(comp => {
        code.push(generateComponentClass(comp, model));
    });

    // Gerar classes de conectores
    code.push('// Connector Classes');
    model.connectors.forEach(conn => {
        code.push(generateConnectorClass(conn, model));
    });

    // Gerar funções executáveis
    code.push('// Executables');
    model.executables.forEach(exec => {
        code.push(generateExecutableFunction(exec));
    });

    // Gerar funções de restrição
    code.push('// Constraints');
    model.constraints.forEach(cons => {
        code.push(generateConstraintFunction(cons));
    });

    return code.join('\n');
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
        if (this.bindings.length === 0) {
            console.warn(\`No bindings associated with \${this.name}; data not sent\`);
            return false;
        }
        this.value = data;
        for (const binding of this.bindings) {
            console.log(\`Propagating data \${data} via binding to \${binding.targetPort?.name}\`);
            await binding.connector.transmit(data);
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
    constructor(name, sourcePort = null, targetPort = null, transformFn = null, constraintFn = null) {
        console.log(\`Initializing connector \${name}\`);
        this.name = name;
        this.sourcePort = sourcePort;
        this.targetPort = targetPort;
        this.transformFn = transformFn;
        this.constraintFn = constraintFn;
        this.messageQueue = [];
        this.isProcessing = false;
    }
    setPorts(sourcePort, targetPort) {
        this.sourcePort = sourcePort;
        this.targetPort = targetPort;
        console.log(\`Connector \${this.name} configured with sourcePort \${sourcePort?.name || 'undefined'} and targetPort \${targetPort?.name || 'undefined'}\`);
    }
    async transmit(data) {
        console.log(\`Connector \${this.name} transmitting data: \${JSON.stringify(data)}\`);
        if (!this.sourcePort || !this.targetPort) {
            console.error(\`Error: Connector \${this.name} does not have sourcePort or targetPort configured\`);
            return;
        }
        let transformedData = this.transformFn ? await this.transformFn({ f: data }) : data;
        this.messageQueue.push(transformedData);
        if (this.isProcessing) return;
        this.isProcessing = true;
        while (this.messageQueue.length > 0) {
            const currentData = this.messageQueue.shift();
            console.log(\`Connector \${this.name} processing data: \${JSON.stringify(currentData)}\`);
            if (this.constraintFn) {
                try {
                    await this.constraintFn({ input: data, output: currentData });
                } catch (e) {
                    console.error(\`Constraint violated in connector \${this.name}: \${e.message}\`);
                    continue;
                }
            }
            await this.targetPort.receive(currentData);
        }
        this.isProcessing = false;
    }
}

class Binding {
    constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {
        if (!sourceComponent || !sourcePort || !targetComponent || !targetPort || !connector) {
            console.error('Error creating binding: invalid parameters', {
                sourceComponent: sourceComponent?.name,
                sourcePort: sourcePort?.name,
                targetComponent: targetComponent?.name,
                targetPort: targetPort?.name,
                connector: connector?.name
            });
            throw new Error('Invalid binding parameters');
        }
        console.log(\`Creating binding from \${sourceComponent.name}.\${sourcePort.name} to \${targetComponent.name}.\${targetPort.name} via \${connector.name}\`);
        this.sourceComponent = sourceComponent;
        this.sourcePort = sourcePort;
        this.targetComponent = targetComponent;
        this.targetPort = targetPort;
        this.connector = connector;
        this.sourcePort.addBinding(this);
        this.connector.setPorts(this.sourcePort, this.targetPort);
    }
}

class SysADLComponent {
    constructor(name, isBoundary = false) {
        console.log(\`Initializing component \${name}, isBoundary: \${isBoundary}\`);
        this.name = name;
        this.isBoundary = isBoundary;
        this.ports = [];
        this.state = {};
        this.activities = [];
    }
    async addPort(port) {
        this.ports.push(port);
        port.setOnDataReceivedCallback((portName, data) => this.onDataReceived(portName, data));
        console.log(\`Port \${port.name} added to component \${this.name}, flowType: \${port.flowType}\`);
    }
    async onDataReceived(portName, data) {
        console.log(\`Component \${this.name} received data on port \${portName}: \${JSON.stringify(data)}\`);
        this.state[portName] = data;
        for (const activity of this.activities) {
            console.log(\`Triggering activity \${activity.methodName} in component \${this.name}\`);
            await this[activity.methodName]();
        }
    }
    async start() {
        console.log(\`Starting component \${this.name}\`);
        if (this.subComponents) {
            await Promise.all(Array.from(this.subComponents.values()).map(sub => sub.start()));
        }
    }
}
`;
}

function generateComponentClass(comp, model) {
    const code = [];
    const className = sanitizeVarName(comp.name);
    const isBoundary = comp.isBoundary ? 'true' : 'false';
    code.push(`class ${className} extends SysADLComponent {`);
    code.push(`${indent(1)}constructor${comp.name === 'SensorCP' ? '(name, portName)' : '()'} {`);
    code.push(`${indent(2)}super('${comp.name === 'SensorCP' ? "' + name + '" : className}', ${isBoundary});`);

    if (comp.configuration) {
        // Componente composto (SystemCP)
        code.push(`${indent(2)}this.subComponents = new Map();`);
        code.push(`${indent(2)}this.connectors = new Map();`);
        code.push(`${indent(2)}this.bindings = [];`);
        comp.configuration.subComponents.forEach(sub => {
            const subClassName = sanitizeVarName(sub.type);
            const portAlias = sub.portAliases[0]?.alias || (sub.type === 'SensorCP' ? `'${sub.name === 's1' ? 'temp1' : 'temp2'}'` : `'${sub.name}'`);
            code.push(`${indent(2)}this.addSubComponent('${sub.name}', new ${subClassName}('${sub.name}', ${portAlias}));`);
        });
        comp.configuration.connectors.forEach(conn => {
            const connClassName = sanitizeVarName(conn.type);
            code.push(`${indent(2)}this.addConnector('${conn.name}', new ${connClassName}());`);
        });
        code.push(`${indent(2)}this.configureBindings();`);
    } else {
        // Componentes simples (SensorCP, TempMonitorCP, StdOutCP)
        comp.ports.forEach(p => {
            const port = model.ports.find(mp => mp.name === p.type);
            const direction = port?.flows[0]?.direction || 'inout';
            const portName = comp.name === 'SensorCP' ? 'portName' : `'${p.name}'`;
            code.push(`${indent(2)}this.addPort(new SysADLPort(${portName}, '${p.type}', '${direction}'));`);
            code.push(`${indent(2)}this.state[${portName}] = null;`);
        });
    }

    // Adicionar atividades
    const activities = model.activities.filter(a => model.allocations.some(al => al.type === 'activity' && al.target === comp.name));
    activities.forEach(act => {
        code.push(`${indent(2)}this.activities.push({ methodName: 'execute_${act.name}' });`);
        code.push(`${indent(1)}async execute_${act.name}() {`);
        code.push(`${indent(2)}console.log('Executing activity ${act.name} in component ${className}');`);
        const params = act.inParameters.reduce((acc, p) => {
            acc[p.name] = `this.state['${p.name}']`;
            return acc;
        }, {});
        code.push(`${indent(2)}const params = { ${Object.entries(params).map(([k, v]) => `${k}: ${v}`).join(', ')} };`);
        code.push(`${indent(2)}console.log(\`Parameters received: \${JSON.stringify(params)}\`);`);
        code.push(`${indent(2)}if (${Object.keys(params).map(k => `params.${k} === null`).join(' || ')}) {`);
        code.push(`${indent(3)}console.warn('Input values are null, activity ${act.name} aborted');`);
        code.push(`${indent(3)}return null;`);
        code.push(`${indent(2)}}`);

        const action = act.actions[0];
        if (action) {
            const execAlloc = model.allocations.find(a => a.type === 'executable' && a.target === action.name);
            if (execAlloc) {
                code.push(`${indent(2)}const result = await ${execAlloc.source}(params);`);
                if (action.constraint) {
                    code.push(`${indent(2)}try {`);
                    code.push(`${indent(3)}await validate${action.constraint}({ ${act.inParameters.map(p => `${p.name}: params.${p.name}`).join(', ')}, ${act.outParameters[0]?.name || 'output'}: result });`);
                    code.push(`${indent(2)}} catch (e) {`);
                    code.push(`${indent(3)}console.error(\`Constraint ${action.constraint} violated: \${e.message}\`);`);
                    code.push(`${indent(3)}return null;`);
                    code.push(`${indent(2)}}`);
                }
                if (act.outParameters.length > 0) {
                    const outParam = act.outParameters[0].name;
                    code.push(`${indent(2)}this.state['${outParam}'] = result;`);
                    code.push(`${indent(2)}const ${outParam}Port = this.ports.find(p => p.name === '${outParam}');`);
                    code.push(`${indent(2)}if (${outParam}Port) {`);
                    code.push(`${indent(3)}console.log(\`Sending ${outParam} \${result} via port ${outParam}\`);`);
                    code.push(`${indent(3)}await ${outParam}Port.send(result);`);
                    code.push(`${indent(2)}}`);
                }
                code.push(`${indent(2)}console.log(\`Activity ${act.name} returning: \${result}\`);`);
                code.push(`${indent(2)}return result;`);
            }
        }
        code.push(`${indent(1)}}`);
    });

    // Sobrescrever onDataReceived para StdOutCP
    if (comp.name === 'StdOutCP') {
        code.push(`${indent(1)}async onDataReceived(portName, data) {`);
        code.push(`${indent(2)}console.log(\`StdOutCP received data on port \${portName}: \${JSON.stringify(data)}\`);`);
        code.push(`${indent(2)}this.state[portName] = data;`);
        code.push(`${indent(2)}console.log(\`Average temperature displayed: \${data}\\u00B0C\`);`);
        code.push(`${indent(1)}}`);
    }

    // Métodos para componentes compostos
    if (comp.configuration) {
        code.push(`${indent(1)}async addSubComponent(name, component) {`);
        code.push(`${indent(2)}this.subComponents.set(name, component);`);
        code.push(`${indent(2)}console.log(\`Subcomponent \${name} added to \${this.name}\`);`);
        code.push(`${indent(1)}}`);
        code.push(`${indent(1)}async addConnector(name, connector) {`);
        code.push(`${indent(2)}this.connectors.set(name, connector);`);
        code.push(`${indent(2)}console.log(\`Connector \${name} added to \${this.name}\`);`);
        code.push(`${indent(1)}}`);
        code.push(`${indent(1)}async addBinding(binding) {`);
        code.push(`${indent(2)}this.bindings.push(binding);`);
        code.push(`${indent(2)}console.log(\`Binding added: \${binding.sourceComponent.name}.\${binding.sourcePort.name} -> \${binding.targetComponent.name}.\${binding.targetPort.name} via \${binding.connector.name}\`);`);
        code.push(`${indent(1)}}`);
        code.push(`${indent(1)}configureBindings() {`);
        code.push(`${indent(2)}console.log('Configuring bindings for ${className}');`);
        comp.configuration.bindings.forEach(binding => {
            const [sourceCompName, sourcePortName] = binding.source.split('.');
            const [targetCompName, targetPortName] = binding.target.split('.');
            code.push(`${indent(2)}const ${sanitizeVarName(sourceCompName)}Port = this.subComponents.get('${sourceCompName}').ports.find(p => p.name === '${sourcePortName}');`);
            code.push(`${indent(2)}const ${sanitizeVarName(targetCompName)}Port = this.subComponents.get('${targetCompName}').ports.find(p => p.name === '${targetPortName}');`);
            code.push(`${indent(2)}if (!${sanitizeVarName(sourceCompName)}Port || !${sanitizeVarName(targetCompName)}Port) {`);
            code.push(`${indent(3)}console.error('Error: One or more ports not found for configuring bindings', {`);
            code.push(`${indent(4)}source: '${binding.source}',`);
            code.push(`${indent(4)}target: '${binding.target}'`);
            code.push(`${indent(3)}});`);
            code.push(`${indent(3)}return;`);
            code.push(`${indent(2)}}`);
            code.push(`${indent(2)}this.addBinding(new Binding(`);
            code.push(`${indent(3)}this.subComponents.get('${sourceCompName}'),`);
            code.push(`${indent(3)}${sanitizeVarName(sourceCompName)}Port,`);
            code.push(`${indent(3)}this.subComponents.get('${targetCompName}'),`);
            code.push(`${indent(3)}${sanitizeVarName(targetCompName)}Port,`);
            code.push(`${indent(3)}this.connectors.get('${binding.connector}')`);
            code.push(`${indent(2)}));`);
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
        if (activity && activity.actions.length > 0) {
            const action = activity.actions[0];
            const execAlloc = model.allocations.find(a => a.type === 'executable' && a.target === action.name);
            if (execAlloc) transformFn = execAlloc.source;
            if (action.constraint) constraintFn = `validate${action.constraint}`;
        }
    }
    return `class ${sanitizeVarName(conn.name)} extends SysADLConnector { constructor() { super('${conn.name}', null, null, ${transformFn}, ${constraintFn}); } }`;
}

function generateExecutableFunction(exec) {
    const params = exec.inParameters.map(p => p.name);
    let body = exec.body.trim();
    if (!body.startsWith('return') && !body.includes('return ')) body = `return ${body}`;
    const code = [];
    code.push(`async function ${exec.name}(params = {}) {`);
    code.push(`${indent(1)}console.log(\`Executing ${exec.name} with params: \${JSON.stringify(params)}\`);`);
    params.forEach(p => code.push(`${indent(1)}const ${p} = params.${p} || 0.0;`));
    code.push(`${indent(1)}${body.replace(/;/g, '')};`);
    code.push(`}`);
    return code.join('\n');
}

function generateConstraintFunction(cons) {
    const inputs = cons.inParameters.map(p => p.name);
    const output = cons.outParameters[0]?.name || 'output';
    const code = [];
    code.push(`async function validate${cons.name}(params = {}) {`);
    code.push(`${indent(1)}console.log(\`Evaluating constraint ${cons.name}: ${cons.equation}\`);`);
    inputs.forEach(p => code.push(`${indent(1)}const ${p} = params.${p} || params.input || 0.0;`));
    code.push(`${indent(1)}const ${output} = params.${output} || params.output || 0.0;`);
    code.push(`${indent(1)}const result = ${cons.equation.replace(/==/g, '===')};`);
    code.push(`${indent(1)}if (!result) { throw new Error('Constraint ${cons.name} violated'); }`);
    code.push(`${indent(1)}console.log('Constraint ${cons.name} passed');`);
    code.push(`${indent(1)}return result;`);
    code.push(`}`);
    return code.join('\n');
}

function getFixedSimulationCode(model) {
    const boundaryPorts = [];
    model.components.forEach(comp => {
        if (comp.isBoundary && comp.ports.length > 0) {
            comp.ports.forEach(p => {
                const port = model.ports.find(mp => mp.name === p.type);
                if (port?.flows.some(f => f.direction === 'out')) {
                    boundaryPorts.push({ component: comp.name, port: p.name });
                }
            });
        }
    });

    let simulationCode = `// @ts-nocheck
// Simulation file for ${model.name}
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
`;

    boundaryPorts.forEach((bp, index) => {
        simulationCode += `    await simulate('${bp.component === 'SensorCP' ? (index === 0 ? 's1' : 's2') : bp.component}', '${bp.component === 'SensorCP' ? (index === 0 ? 'temp1' : 'temp2') : bp.port}', ${index === 0 ? '77.0' : '86.0'});\n`;
    });

    simulationCode += `
    console.log('\\n--- Simulation Completed ---');
}

main().catch(err => console.error(\`EXECUTION ERROR: \${err.stack}\`));`;

    return simulationCode;
}
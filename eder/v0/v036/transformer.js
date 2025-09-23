/* transformer.js
   - Gera código JavaScript a partir do modelo SysADL parseado
   - Suporta Simple.sysadl, RTC.sysadl, AGV.sysadl
   - Gera código completo para componentes compostos
*/

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
        console.log('Transformando modelo:', JSON.stringify(parsedData, null, 2));

        if (!parsedData.components || !parsedData.components.length) {
            throw new Error('Modelo parseado não contém componentes');
        }

        const architectureCode = generateArchitectureCode(parsedData);
        const simulationCode = generateSimulationCode(parsedData);

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
            await this.onDataReceivedCallback(data);
        }
        return true;
    }
}

class SysADLComponent {
    constructor(name) {
        this.name = name;
        this.ports = [];
        this.subComponents = new Map();
        this.connectors = new Map();
    }

    addPort(port) {
        this.ports.push(port);
    }

    addSubComponent(component) {
        this.subComponents.set(component.name, component);
    }

    addConnector(name, connector) {
        this.connectors.set(name, connector);
    }

    addBinding(binding) {
        const sourcePort = this.ports.find(p => p.name === binding.sourcePort.name) || 
                          this.subComponents.get(binding.sourceComponent.name)?.ports.find(p => p.name === binding.sourcePort.name);
        sourcePort?.addBinding(binding);
    }

    async start() {
        console.log(\`Starting component \${this.name}\`);
    }
}

class SysADLConnector {
    constructor(name, sourcePort, targetPort, transformFn, constraintFn) {
        this.name = name;
        this.sourcePort = sourcePort;
        this.targetPort = targetPort;
        this.transformFn = transformFn;
        this.constraintFn = constraintFn;
    }

    async transmit(data) {
        console.log(\`Connector \${this.name} transmitting: \${JSON.stringify(data)}\`);
        if (this.constraintFn) {
            const isValid = await this.constraintFn({ input: data });
            if (!isValid) {
                throw new Error(\`Constraint violated in \${this.name}\`);
            }
        }
        const transformed = this.transformFn ? await this.transformFn({ input: data }) : data;
        if (this.targetPort) {
            await this.targetPort.receive(transformed);
        }
    }
}

class Binding {
    constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {
        this.sourceComponent = sourceComponent;
        this.sourcePort = sourcePort;
        this.targetComponent = targetComponent;
        this.targetPort = targetPort;
        this.connector = connector;
        this.connector.sourcePort = sourcePort;
        this.connector.targetPort = targetPort;
    }
}
`;
}

function generateComponentClass(comp, model) {
    let code = [];
    code.push(`class ${comp.name} extends SysADLComponent {`);
    code.push(`${indent(1)}constructor() {`);
    code.push(`${indent(2)}super('${comp.name}');`);

    // Adicionar portas
    if (comp.ports && comp.ports.length) {
        comp.ports.forEach(port => {
            const portType = model.ports.find(p => p.name === port.type)?.flows[0]?.type || 'any';
            const direction = port.direction || model.ports.find(p => p.name === port.type)?.flows[0]?.direction || 'inout';
            code.push(`${indent(2)}this.addPort(new SysADLPort('${port.name}', '${portType}', '${direction}'));`);
        });
    }

    // Adicionar subcomponentes, conectores e bindings para componentes compostos
    if (comp.configuration) {
        if (comp.configuration.components) {
            comp.configuration.components.forEach(sub => {
                code.push(`${indent(2)}this.addSubComponent(new ${sub.type}('${sub.name}'));`);
                sub.portAliases.forEach(port => {
                    const portType = model.ports.find(p => p.name === port.type)?.flows[0]?.type || 'any';
                    const direction = model.ports.find(p => p.name === port.type)?.flows[0]?.direction || 'inout';
                    code.push(`${indent(2)}this.subComponents.get('${sub.name}').addPort(new SysADLPort('${port.alias}', '${portType}', '${direction}'));`);
                });
            });
        }
        if (comp.configuration.connectors) {
            comp.configuration.connectors.forEach(conn => {
                const activity = model.allocations.find(alloc => alloc.target === conn.type);
                const action = activity ? model.activities.find(act => act.name === activity.source)?.actions[0] : null;
                const transformFn = action ? model.executables.find(ex => ex.name === action.executable)?.name : null;
                const constraintFn = action ? action.constraint : null;
                code.push(`${indent(2)}this.addConnector('${conn.name}', new ${conn.type}('${conn.name}', null, null${transformFn ? `, ${transformFn}` : ''}${constraintFn ? `, validate${constraintFn}` : ''}));`);
            });
        }
        if (comp.configuration.bindings) {
            comp.configuration.bindings.forEach(binding => {
                const sourceParts = binding.source.split('.');
                const targetParts = binding.target.split('.');
                const sourceCompName = sourceParts[0];
                const sourcePortName = sourceParts[1] || sourceParts[0];
                const targetCompName = targetParts[0];
                const targetPortName = targetParts[1] || targetParts[0];

                code.push(`${indent(2)}const ${sanitizeVarName(sourceCompName + '_' + sourcePortName)} = this.subComponents.get('${sourceCompName}')?.ports.find(p => p.name === '${sourcePortName}') || this.ports.find(p => p.name === '${sourcePortName}');`);
                code.push(`${indent(2)}const ${sanitizeVarName(targetCompName + '_' + targetPortName)} = this.subComponents.get('${targetCompName}')?.ports.find(p => p.name === '${targetPortName}') || this.ports.find(p => p.name === '${targetPortName}');`);
                code.push(`${indent(2)}this.addBinding(new Binding(`);
                code.push(`${indent(3)}this.subComponents.get('${sourceCompName}') || this,`);
                code.push(`${indent(3)}${sanitizeVarName(sourceCompName + '_' + sourcePortName)},`);
                code.push(`${indent(3)}this.subComponents.get('${targetCompName}') || this,`);
                code.push(`${indent(3)}${sanitizeVarName(targetCompName + '_' + targetPortName)},`);
                code.push(`${indent(3)}this.connectors.get('${binding.connector}')`);
                code.push(`${indent(2)}));`);
            });
        }
    }

    code.push(`${indent(1)}async start() {`);
    code.push(`${indent(2)}console.log(\`Starting ${comp.configuration ? 'composite ' : ''}component \${this.name}\`);`);
    if (comp.configuration?.components) {
        code.push(`${indent(2)}await Promise.all(Array.from(this.subComponents.values()).map(c => c.start()));`);
    }
    code.push(`${indent(1)}}`);
    code.push(`}`);
    return code.join('\n');
}

function generateArchitectureCode(model) {
    const code = [];
    code.push('// @ts-nocheck');
    code.push(`// Generated JavaScript code for SysADL Model: ${model.name}`);
    code.push('');

    // Variável global
    code.push('let system = null;');
    code.push('');

    // Tipos
    code.push('// Types');
    model.types.forEach(t => {
        code.push(`const ${t.name} = 'any';`);
    });
    code.push('');

    // Classes base
    code.push(getBaseClasses());

    // Classes de componentes
    code.push('// Component Classes');
    model.components.forEach(comp => {
        code.push(generateComponentClass(comp, model));
    });

    // Classes de conectores
    code.push('// Connector Classes');
    model.connectors.forEach(conn => {
        const activity = model.allocations.find(alloc => alloc.target === conn.name);
        const action = activity ? model.activities.find(act => act.name === activity.source)?.actions[0] : null;
        const transformFn = action ? model.executables.find(ex => ex.name === action.executable)?.name : null;
        const constraintFn = action ? action.constraint : null;
        code.push(`class ${conn.name} extends SysADLConnector {`);
        code.push(`${indent(1)}constructor() {`);
        code.push(`${indent(2)}super('${conn.name}', null, null${transformFn ? `, ${transformFn}` : ''}${constraintFn ? `, validate${constraintFn}` : ''});`);
        code.push(`${indent(1)}}`);
        code.push(`}`);
    });

    // Executáveis
    code.push('// Executables');
    model.executables.forEach(exec => {
        const params = exec.inputs.map(i => {
            const [name] = i.split(':').map(s => s.trim());
            return name;
        }).join(', ');
        code.push(`async function ${exec.name}(params = {}) {`);
        code.push(`${indent(1)}console.log(\`Executing ${exec.name} with params: \${JSON.stringify(params)}\`);`);
        exec.inputs.forEach(i => {
            const [name] = i.split(':').map(s => s.trim());
            code.push(`${indent(1)}const ${name} = params.${name} || 0.0;`);
        });
        code.push(`${indent(1)}return ${exec.body};`);
        code.push(`}`);
    });

    // Constraints
    code.push('// Constraints');
    model.constraints.forEach(constr => {
        const params = [...constr.inputs, ...constr.outputs].map(i => {
            const [name] = i.split(':').map(s => s.trim());
            return name;
        }).join(', ');
        code.push(`async function validate${constr.name}(params = {}) {`);
        code.push(`${indent(1)}console.log(\`Evaluating constraint ${constr.name}: ${constr.equation}\`);`);
        [...constr.inputs, ...constr.outputs].forEach(i => {
            const [name] = i.split(':').map(s => s.trim());
            code.push(`${indent(1)}const ${name} = params.${name} || params.input || 0.0;`);
        });
        code.push(`${indent(1)}const result = ${constr.equation};`);
        code.push(`${indent(1)}if (!result) {`);
        code.push(`${indent(2)}throw new Error('Constraint ${constr.name} violated');`);
        code.push(`${indent(1)}}`);
        code.push(`${indent(1)}console.log('Constraint ${constr.name} passed');`);
        code.push(`${indent(1)}return result;`);
        code.push(`}`);
    });

    return code.join('\n');
}

function generateSimulationCode(model) {
    const code = [];
    code.push('// @ts-nocheck');
    code.push(`// Simulation file for ${model.name}`);
    code.push(`import * as architecture from './${model.name.toLowerCase()}.js';`);
    code.push('');
    code.push('async function main() {');
    code.push(`${indent(1)}console.log('--- Starting simulation of ${model.name}.sysadl ---');`);
    code.push(`${indent(1)}const system = new architecture.${model.components.find(c => c.configuration)?.name || 'SystemCP'}();`);
    code.push(`${indent(1)}await system.start();`);
    code.push(`${indent(1)}console.log('--- System Initialized ---');`);
    code.push('');
    code.push(`${indent(1)}// Helper to simulate data sending to a sub-component's port`);
    code.push(`${indent(1)}async function simulate(componentName, portName, value) {`);
    code.push(`${indent(2)}if (!system) { console.error("System not initialized"); return; }`);
    code.push(`${indent(2)}const component = system.subComponents.get(componentName);`);
    code.push(`${indent(2)}if (!component) { console.error(\`Component \${componentName} not found\`); return; }`);
    code.push(`${indent(2)}const port = component.ports.find(p => p.name === portName);`);
    code.push(`${indent(2)}if (!port) { console.error(\`Port \${portName} not found in component \${componentName}\`); return; }`);
    code.push(`${indent(2)}console.log(\`\\nSIMULATING: Sending \${value} to \${componentName}.\${portName}\`);`);
    code.push(`${indent(2)}await port.send(value);`);
    code.push(`${indent(2)}window.updateDiagramForSimulation(window.currentParsedModel, { component: componentName, port: portName });`);
    code.push(`${indent(1)}}`);
    code.push('');
    code.push(`${indent(1)}// Simulation scenario (editável)`);
    code.push(`${indent(1)}console.log('\\n--- Running Simulation Scenario ---');`);

    const boundaryPorts = [];
    const compositeComp = model.components.find(c => c.configuration);
    if (compositeComp?.configuration?.components) {
        compositeComp.configuration.components.forEach(comp => {
            const compDef = model.components.find(c => c.name === comp.type);
            if (compDef?.isBoundary) {
                comp.portAliases.forEach(p => {
                    const portDef = model.ports.find(mp => mp.name === p.type);
                    if (portDef?.flows.some(f => f.direction === 'in' || f.direction === 'inout')) {
                        boundaryPorts.push({ component: comp.name, port: p.alias });
                    }
                });
            }
        });
    }

    boundaryPorts.forEach((bp, index) => {
        code.push(`${indent(1)}await simulate('${bp.component}', '${bp.port}', ${index === 0 ? '77.0' : '86.0'});`);
    });

    code.push(`${indent(1)}console.log('\\n--- Simulation Completed ---');`);
    code.push('}');
    code.push('');
    code.push('main().catch(err => console.error(`EXECUTION ERROR: ${err.stack}`));');

    return code.join('\n');
}

if (typeof window !== 'undefined') {
    window.transformToJavaScript = transformToJavaScript;
}
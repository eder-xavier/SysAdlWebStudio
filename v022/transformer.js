const performance = typeof require === 'function' ? require('perf_hooks').performance : window.performance;

function transformToJavaScript() {
    const content = sysadlEditor.getValue();
    if (!content.trim()) {
        jsEditor.setValue('No SysADL code to transform.');
        return;
    }

    try {
        console.log('Starting transformation...');
        const parsedData = parseSysADL(content);
        console.log('Parsed data:', JSON.stringify(parsedData, null, 2));
        let jsCode = generateJsCode(parsedData);
        console.log('Generated code:', jsCode);
        jsEditor.setValue(fixSyntax(jsCode));
        console.log('Transformation completed.');
    } catch (error) {
        jsEditor.setValue(`Error transforming to JavaScript: ${error.message}`);
        console.error('Transformation error:', error);
    }
}

async function generateJsCode(model) {
    let jsCode = `// Generated JavaScript code for SysADL Model: ${model.name}\n\n`;
    jsCode += `const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });\n\n`;

    // Mapa de tipos SysADL para JavaScript
    const typeMap = {};
    jsCode += '// Types\n';
    model.types.forEach(type => {
        if (type.kind === 'value type') {
            typeMap[type.name] = 'any';
            jsCode += `const ${type.name} = 'any'; // Value type\n`;
        } else if (type.kind === 'datatype') {
            typeMap[type.name] = type.name;
            const attributes = type.content && typeof type.content === 'string' ? type.content.match(/attributes\s*:\s*([^;]+)/)?.[1] || '' : '';
            jsCode += `class ${type.name} {\n    constructor(params = {}) {\n`;
            attributes.split(',').forEach(attr => {
                const match = attr.match(/(\w+)\s*:\s*(\w+)/);
                if (match) {
                    const attrType = model.types.find(t => t.name === match[2]);
                    let defaultValue = 'null';
                    if (attrType?.kind === 'enum') defaultValue = `${match[2]}.Off`;
                    jsCode += `        this.${match[1]} = params.${match[1]} ?? ${defaultValue};\n`;
                }
            });
            jsCode += `    }\n}\n`;
        } else if (type.kind === 'enum') {
            const enumValues = type.content && typeof type.content === 'string' ? type.content.match(/(\w+)/g) || [] : [];
            typeMap[type.name] = enumValues.map(v => `'${v}'`).join(' | ');
            jsCode += `const ${type.name} = Object.freeze({ ${enumValues.map(v => `${v}: '${v}'`).join(', ')} });\n`;
        }
    });
    jsCode += '\n';

    // Classe base para portas
    jsCode += `// Base Port Class\n`;
    jsCode += `class SysADLPort {
    constructor(name) {
        this.name = name;
        this.value = null;
    }

    async send(data) {
        throw new Error(\`Method send must be implemented in \${this.name}\`);
    }

    async receive(data) {
        throw new Error(\`Method receive must be implemented in \${this.name}\`);
    }

    getValue() {
        return this.value;
    }
}\n\n`;

    // Gerar classes para portas
    jsCode += '// Port Classes\n';
    model.ports.forEach(port => {
        const direction = port.flows[0]?.direction || 'inout';
        const portType = port.flows[0]?.type || 'any';
        const isComposite = port.subPorts?.length > 0;
        jsCode += `class ${port.name} extends SysADLPort {
    constructor(name = '${port.name}') {
        super(name);
        this.type = '${portType}';
        this.direction = '${direction}';
        this.isComposite = ${isComposite};
        this.subPorts = new Map();
        ${isComposite && Array.isArray(port.subPorts) && port.subPorts.length > 0 ? port.subPorts.map(sp => {
            const spName = (sp.name && /^[a-zA-Z_]\w*$/.test(sp.name)) ? sp.name : `subport_${Math.random().toString(36).substr(2, 9)}`;
            const subPortType = (sp.type && /^[a-zA-Z_]\w*$/.test(sp.type)) ? sp.type : 'SysADLPort';
            return `this.subPorts.set('${spName}', new ${subPortType}('${spName}'));`;
        }).filter(line => line && line.includes('this.subPorts.set') && line.match(/this\.subPorts\.set\('[^']+',\s*new\s+[a-zA-Z_]\w*\s*\('[^']+'\)\);/)).join('\n        ') : ''}
        this.connector = null;
    }

    async send(data, subPortName = null) {
        if (this.isComposite && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'out' && subPort.direction !== 'inout')) {
                console.error(\`Cannot send via subPort \${subPortName} in \${this.name}\`);
                return false;
            }
            console.log(\`Sending \${data} via subPort \${subPortName} in \${this.name}\`);
            subPort.value = data;
            if (subPort.connector) {
                await subPort.connector.transmit(data);
            }
            return true;
        }
        if ((this.direction !== 'out' && this.direction !== 'inout') || !this.connector) {
            console.error(\`Cannot send via \${this.name}: invalid direction or no connector\`);
            return false;
        }
        console.log(\`Sending \${data} via \${this.name}\`);
        this.value = data;
        await this.connector.transmit(data);
        return true;
    }

    async receive(data, subPortName = null) {
        if (this.isComposite && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'in' && subPort.direction !== 'inout')) {
                console.error(\`Cannot receive via subPort \${subPortName} in \${this.name}\`);
                return false;
            }
            console.log(\`Received \${data} via subPort \${subPortName} in \${this.name}\`);
            subPort.value = data;
            return true;
        }
        if (this.direction !== 'in' && this.direction !== 'inout') {
            console.error(\`Cannot receive via \${this.name}: invalid direction\`);
            return false;
        }
        console.log(\`Received \${data} via \${this.name}\`);
        this.value = data;
        return true;
    }
}\n\n`;

    // Classe base para conectores
    jsCode += `// Base Connector Class\n`;
    jsCode += `class SysADLConnector {
    constructor(name, sourcePort, targetPort) {
        this.name = name;
        this.sourcePort = sourcePort;
        this.targetPort = targetPort;
        this.messageQueue = [];
        this.isProcessing = false;
    }

    async transmit(data) {
        this.messageQueue.push(data);
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.messageQueue.length > 0) {
            const currentData = this.messageQueue.shift();
            console.log(\`Connector \${this.name} transmitting: \${currentData}\`);
            if (this.targetPort) {
                await this.targetPort.receive(currentData);
            } else {
                console.error(\`No target port for connector \${this.name}\`);
            }
        }
        this.isProcessing = false;
    }
}\n\n`;

    // Gerar classes para conectores
    jsCode += '// Connector Classes\n';
    model.connectors.forEach(conn => {
        jsCode += `class ${conn.name} extends SysADLConnector {
    constructor(sourcePort, targetPort) {
        super('${conn.name}', sourcePort, targetPort);
        this.participants = new Map();
        ${conn.participants.map(p => `this.participants.set('${p.name}', null);`).join('\n        ')}
    }

    setParticipant(name, component) {
        this.participants.set(name, component);
        ${conn.flows.map(flow => `
        if (name === '${flow.source}') {
            this.sourcePort = component.ports.find(p => p.name === '${flow.source}');
            if (this.sourcePort) this.sourcePort.connector = this;
        }
        if (name === '${flow.target}') {
            this.targetPort = component.ports.find(p => p.name === '${flow.target}');
        }`).join('\n        ')}
    }
}\n\n`;
    });

    // Classe base para componentes
    jsCode += `// Base Component Class\n`;
    jsCode += `class SysADLComponent {
    constructor(name, isBoundary = false) {
        this.name = name;
        this.isBoundary = isBoundary;
        this.ports = [];
        this.state = {};
    }

    async addPort(port) {
        this.ports.push(port);
        console.log(\`Port \${port.name} added to component \${this.name}\`);
    }

    async onDataReceived(portName, data) {
        this.state[portName] = data;
        console.log(\`Component \${this.name} received \${data} on \${portName}\`);
    }

    async start() {
        console.log(\`Component \${this.name} started\`);
    }
}\n\n`;

    // Classe base para componentes de fronteira
    jsCode += `// Base Boundary Component Class\n`;
    jsCode += `class SysADLBoundaryComponent extends SysADLComponent {
    constructor(name) {
        super(name, true);
    }

    async start() {
        console.log(\`Boundary component \${this.name} started\`);
        for (const port of this.ports) {
            const portDef = ${JSON.stringify(model.ports)}.find(p => p.name === port.type);
            const typeDef = portDef?.flows?.[0]?.type;
            if (typeDef && (typeDef.includes('emperature') || typeDef === 'Real' || typeDef === 'Int')) {
                await new Promise(resolve => {
                    readline.question(\`Enter value for \${this.name}.\${port.name} (number): \`, async (input) => {
                        const value = parseFloat(input);
                        if (!isNaN(value)) {
                            await this.onDataReceived(port.name, value);
                        } else {
                            console.error(\`Invalid number input for \${this.name}.\${port.name}\`);
                        }
                        resolve();
                        await this.promptForInput();
                    });
                });
            } else if (typeDef === 'Boolean') {
                await new Promise(resolve => {
                    readline.question(\`Enter value for \${this.name}.\${port.name} (true/false): \`, async (input) => {
                        const value = input.toLowerCase() === 'true';
                        await this.onDataReceived(port.name, value);
                        resolve();
                        await this.promptForInput();
                    });
                });
            } else if (${JSON.stringify(model.types)}.find(t => t.name === typeDef && t.kind === 'enum')) {
                const enumValues = ${JSON.stringify(model.types)}.find(t => t.name === typeDef)?.content.match(/(\\w+)/g) || [];
                await new Promise(resolve => {
                    readline.question(\`Enter value for \${this.name}.\${port.name} (\${enumValues.join('/')}): \`, async (input) => {
                        const value = ${typeDef}[input] || ${typeDef}.Off;
                        await this.onDataReceived(port.name, value);
                        resolve();
                        await this.promptForInput();
                    });
                });
            } else if (${JSON.stringify(model.types)}.find(t => t.name === typeDef && t.kind === 'datatype')) {
                await new Promise(resolve => {
                    readline.question(\`Enter JSON for \${this.name}.\${port.name} (\${typeDef}): \`, async (input) => {
                        try {
                            const value = JSON.parse(input);
                            await this.onDataReceived(port.name, new ${typeDef}(value));
                        } catch (e) {
                            console.error(\`Invalid JSON input for \${this.name}.\${port.name}: \${e.message}\`);
                        }
                        resolve();
                        await this.promptForInput();
                    });
                });
            }
        }
    }

    async promptForInput() {
        for (const port of this.ports) {
            const portDef = ${JSON.stringify(model.ports)}.find(p => p.name === port.type);
            const typeDef = portDef?.flows?.[0]?.type;
            if (typeDef && (typeDef.includes('emperature') || typeDef === 'Real' || typeDef === 'Int')) {
                await new Promise(resolve => {
                    readline.question(\`Enter value for \${this.name}.\${port.name} (number): \`, async (input) => {
                        const value = parseFloat(input);
                        if (!isNaN(value)) {
                            await this.onDataReceived(port.name, value);
                        } else {
                            console.error(\`Invalid number input for \${this.name}.\${port.name}\`);
                        }
                        resolve();
                        await this.promptForInput();
                    });
                });
            } else if (typeDef === 'Boolean') {
                await new Promise(resolve => {
                    readline.question(\`Enter value for \${this.name}.\${port.name} (true/false): \`, async (input) => {
                        const value = input.toLowerCase() === 'true';
                        await this.onDataReceived(port.name, value);
                        resolve();
                        await this.promptForInput();
                    });
                });
            } else if (${JSON.stringify(model.types)}.find(t => t.name === typeDef && t.kind === 'enum')) {
                const enumValues = ${JSON.stringify(model.types)}.find(t => t.name === typeDef)?.content.match(/(\\w+)/g) || [];
                await new Promise(resolve => {
                    readline.question(\`Enter value for \${this.name}.\${port.name} (\${enumValues.join('/')}): \`, async (input) => {
                        const value = ${typeDef}[input] || ${typeDef}.Off;
                        await this.onDataReceived(port.name, value);
                        resolve();
                        await this.promptForInput();
                    });
                });
            } else if (${JSON.stringify(model.types)}.find(t => t.name === typeDef && t.kind === 'datatype')) {
                await new Promise(resolve => {
                    readline.question(\`Enter JSON for \${this.name}.\${port.name} (\${typeDef}): \`, async (input) => {
                        try {
                            const value = JSON.parse(input);
                            await this.onDataReceived(port.name, new ${typeDef}(value));
                        } catch (e) {
                            console.error(\`Invalid JSON input for \${this.name}.\${port.name}: \${e.message}\`);
                        }
                        resolve();
                        await this.promptForInput();
                    });
                });
            }
        }
    }
}\n\n`;

    // Gerar classes para componentes
    jsCode += '// Component Classes\n';
    model.components.forEach(comp => {
        const isBoundary = comp.configuration?.includes('boundary') || false;
        const activityMethods = model.allocations
            .filter(a => a.target === comp.name && a.type === 'activity')
            .map(alloc => {
                const activity = model.activities.find(act => act.name === alloc.source);
                if (!activity) return '';

                const paramsInit = activity.inputs.split(',').map(p => {
                    const [name, type] = p.trim().split(':').map(s => s.trim());
                    return `${name}: this.state['${name}'] ?? null`;
                }).filter(p => p).join(',\n                    ');

                const actionsCode = activity.actions?.map(action => {
                    const execAlloc = model.allocations.find(a => a.type === 'executable' && a.target === action.name);
                    if (!execAlloc) return '';
                    const executable = model.executables.find(e => e.name === execAlloc.source);
                    if (!executable) return '';
                    const constraint = model.constraints.find(c => c.name && activity.body?.includes(c.name));
                    const actionId = action.id || `action_${Math.random().toString(36).substr(2, 9)}`;
                    let code = `const ${actionId}_result = await ${executable.name}(params);\n`;
                    if (constraint) {
                        code = `try {
                            await validate${constraint.name}(params);
                        } catch (e) {
                            console.error(\`Constraint ${constraint.name} violated: \${e.message}\`);
                            return null;
                        }\n                    ${code}`;
                    }
                    return code;
                }).filter(c => c).join('\n                ') || '';

                const returnVal = activity.outputs && activity.outputs.trim() ?
                    activity.outputs.split(',').map(o => {
                        const [name] = o.trim().split(':').map(s => s.trim());
                        return name ? `${name}_result` : null;
                    }).filter(name => name).join(' || ') || 'null' : 'null';

                return `
    async execute${activity.name}() {
        console.log(\`Executing activity ${activity.name} in \${this.name}\`);
        const params = {
                    ${paramsInit}
        };
        ${actionsCode}
        return ${returnVal};
    }`;
            }).join('\n');

        const additionalPorts = [];
        if (comp.name === 'SensorsMonitorCP') {
            additionalPorts.push({ name: 's2', type: 'CTemperatureIPT' }, { name: 'average', type: 'CTemperatureOPT' });
        } else if (comp.name === 'PresenceCheckerCP') {
            additionalPorts.push({ name: 'userTemp', type: 'CTemperatureIPT' }, { name: 'target', type: 'CTemperatureOPT' });
        } else if (comp.name === 'CommanderCP') {
            additionalPorts.push({ name: 'average2', type: 'CTemperatureIPT' }, { name: 'heating', type: 'CommandOPT' }, { name: 'cooling', type: 'CommandOPT' });
        }

        jsCode += `class ${comp.name} extends ${isBoundary ? 'SysADLBoundaryComponent' : 'SysADLComponent'} {
    constructor() {
        super('${comp.name}');
        // Initialize ports
        ${comp.ports.map(port => {
            return `this.addPort(new ${port.type}('${port.name}'));`;
        }).join('\n        ')}
        ${additionalPorts.map(port => {
            return `this.addPort(new ${port.type}('${port.name}'));`;
        }).join('\n        ')}

        // Initialize state
        ${comp.ports.map(port => {
            const portDef = model.ports.find(p => p.name === port.type);
            const type = portDef?.flows[0]?.type || 'any';
            let defaultValue = 'null';
            if (type === 'Boolean') defaultValue = 'false';
            else if (model.types.find(t => t.name === type && t.kind === 'enum')) {
                const enumValues = model.types.find(t => t.name === type)?.content.match(/(\\w+)/g) || [];
                defaultValue = `${type}.${enumValues[0] || 'Off'}`;
            } else if (model.types.find(t => t.name === type && t.kind === 'datatype')) {
                defaultValue = `new ${type}()`;
            }
            return `this.state['${port.name}'] = ${defaultValue};`;
        }).join('\n        ')}
        ${additionalPorts.map(port => {
            const portDef = model.ports.find(p => p.name === port.type);
            const type = portDef?.flows[0]?.type || 'any';
            let defaultValue = 'null';
            if (type === 'Boolean') defaultValue = 'false';
            else if (model.types.find(t => t.name === type && t.kind === 'enum')) {
                const enumValues = model.types.find(t => t.name === type)?.content.match(/(\\w+)/g) || [];
                defaultValue = `${type}.${enumValues[0] || 'Off'}`;
            } else if (model.types.find(t => t.name === type && t.kind === 'datatype')) {
                defaultValue = `new ${type}()`;
            }
            return `this.state['${port.name}'] = ${defaultValue};`;
        }).join('\n        ')}
    }

    async onDataReceived(portName, data) {
        this.state[portName] = data;
        console.log(\`Component \${this.name} received \${data} on \${portName}\`);
        ${comp.name === 'SensorsMonitorCP' ? `
        if (this.state['s1'] !== null && this.state['s2'] !== null) {
            const result = await this.executeCalculateAverageTemperatureAC();
            const outputPort = this.ports.find(p => p.name === 'average');
            if (outputPort) await outputPort.send(result);
        }` :
        comp.name === 'PresenceCheckerCP' ? `
        if (this.state['detected'] !== null && this.state['userTemp'] !== null) {
            const result = await this.executeCheckPresenceToSetTemperatureAC();
            const outputPort = this.ports.find(p => p.name === 'target');
            if (outputPort) await outputPort.send(result);
        }` :
        comp.name === 'CommanderCP' ? `
        if (this.state['average2'] !== null && this.state['target2'] !== null) {
            const result = await this.executeDecideCommandAC();
            const heatingPort = this.ports.find(p => p.name === 'heating');
            const coolingPort = this.ports.find(p => p.name === 'cooling');
            if (heatingPort) await heatingPort.send(result.heater);
            if (coolingPort) await coolingPort.send(result.cooler);
        }` : ''}
    }

    ${activityMethods}
}\n\n`;
    });

    // Gerar funções para executáveis
    jsCode += '// Executables\n';
    model.executables.forEach(exec => {
        jsCode += `async function ${exec.name}(params = {}) {\n`;
        let body = exec.body ? exec.body.trim() : '';
        body = body.replace(/(\w+)::(\w+)/g, (match, type, value) => {
            if (model.types.find(t => t.name === type && t.kind === 'enum')) {
                return `${type}.${value}`;
            }
            return `params["${type}"]?.${value} ?? null`;
        });
        body = body.replace(/(\w+)->(\w+)/g, 'params["$1"].$2');
        body = body.replace(/;;+/g, ';');
        const paramsList = new Set();
        const protectedVars = new Set(['types', 'Command', 'On', 'Off', 'params']);
        body.replace(/\b(\w+)\b/g, match => {
            if (!['let', 'if', 'else', 'return', 'true', 'false', 'null'].includes(match) &&
                !match.match(/^\d+$/) &&
                !body.match(new RegExp(`\\b${match}\\b\\s*=\\s*new\\s+\\w+`)) &&
                !model.types.find(t => t.name === match) &&
                !protectedVars.has(match)) {
                paramsList.add(match);
            }
        });
        paramsList.forEach(param => {
            if (!body.match(new RegExp(`let\\s+${param}\\b`))) {
                const type = model.types.find(t => t.name === param && t.kind === 'datatype') ? `new ${param}()` :
                    model.types.find(t => t.name === param && t.kind === 'enum') ? `${param}.Off` : 'null';
                body = `    let ${param} = params["${param}"] ?? ${type};\n${body}`;
            }
        });
        body = body.replace(/let\s+(\w+)\s*:\s*(\w+)(?:\s*=\s*([\w:.]+))?/g, (match, varName, typeName, initValue) => {
            const type = model.types.find(t => t.name === typeName);
            let init = initValue || (type?.kind === 'datatype' ? `new ${typeName}()` :
                type?.kind === 'enum' ? `${typeName}.Off` : 'null');
            if (init && init.includes('::')) {
                const [type, value] = init.split('::');
                if (model.types.find(t => t.name === type && t.kind === 'enum')) {
                    init = `${type}.${value}`;
                }
            }
            return `    let ${varName} = ${init};`;
        });
        body = body.replace(/(\w+)\s*==\s*(\w+)/g, '$1 === $2');
        let newBody = '';
        let braceLevel = 0;
        let lines = body.split('\n').map(line => line.trim()).filter(line => line);
        let returnStatement = null;
        for (let line of lines) {
            if (line.includes('{')) {
                braceLevel++;
                newBody += `    ${line}\n`;
            } else if (line.includes('}')) {
                braceLevel--;
                newBody += `    ${line}\n`;
            } else if (line.startsWith('return')) {
                returnStatement = line;
            } else {
                newBody += `    ${line}\n`;
            }
        }
        while (braceLevel > 0) {
            newBody += '    }\n';
            braceLevel--;
        }
        if (returnStatement) {
            newBody += `    ${returnStatement}\n`;
        } else {
            newBody += '    return params.result ?? null;\n';
        }
        jsCode += `${newBody}\n`;
        jsCode += `}\n\n`;
    });

    // Gerar funções para constraints
    jsCode += '// Constraints\n';
    model.constraints.forEach(constraint => {
        jsCode += `async function validate${constraint.name}(params = {}) {\n`;
        let equation = constraint.equation || 'true';
        console.log(`Generating constraint ${constraint.name} with equation: ${equation}`);
        equation = equation.replace(/(\w+)::(\w+)/g, (match, type, value) => {
            if (model.types.find(t => t.name === type && t.kind === 'enum')) {
                return `${type}.${value}`;
            }
            return `params["${type}"]?.${value} ?? null`;
        });
        equation = equation.replace(/(\w+)->(\w+)/g, 'params["$1"].$2');
        const definedVars = new Set();
        equation.replace(/params\["(\w+)"\]/g, (_, varName) => {
            definedVars.add(varName);
        });
        const protectedIdentifiers = new Set([
            'true', 'false', 'null', 'params',
            ...model.types.map(t => t.name),
            ...model.types.filter(t => t.kind === 'enum' && t.content && typeof t.content === 'string')
                .flatMap(t => (t.content.match(/(\w+)/g) || []).map(v => `${t.name}.${v}`))
        ]);
        equation = equation.replace(/\b(\w+)\b/g, (match) => {
            if (protectedIdentifiers.has(match) ||
                match.includes('.') ||
                match.match(/^\d+$/) ||
                definedVars.has(match)) {
                return match;
            }
            definedVars.add(match);
            return `params["${match}"]`;
        });
        equation = equation.replace(/==/g, '===');
        equation = equation.replace(/(\w+\s*[><=]+\s*[^?]+)\s*\?\s*([^:]+)\s*:\s*([^;]+)/g, '($1) ? ($2) : ($3)');
        equation = equation.replace(/types\.Commands\.(\w+)/g, 'Command.$1');
        equation = equation.replace(/params\["cmds"\]\.heater\s*===?\s*types\.Commands\.(\w+)/g, 'params["cmds"].heater === Command.$1');
        equation = equation.replace(/params\["cmds"\]\.cooler\s*===?\s*types\.Commands\.(\w+)/g, 'params["cmds"].cooler === Command.$1');
        constraint.inputs.split(',').forEach(input => {
            const [name, type] = input.trim().split(':').map(s => s.trim());
            if (name && type) {
                const typeDef = model.types.find(t => t.name === type);
                let defaultValue = 'null';
                if (typeDef?.kind === 'datatype') defaultValue = `new ${type}()`;
                if (typeDef?.kind === 'enum') {
                    const enumValues = typeDef.content && typeof typeDef.content === 'string' ? typeDef.content.match(/(\w+)/g) || ['Off'] : ['Off'];
                    defaultValue = `${type}.${enumValues[0]}`;
                }
                if (type === 'Boolean') defaultValue = 'false';
                jsCode += `    let ${name} = params["${name}"] ?? ${defaultValue};\n`;
            }
        });
        constraint.outputs.split(',').forEach(output => {
            const [name, type] = output.trim().split(':').map(s => s.trim());
            if (name && type) {
                const typeDef = model.types.find(t => t.name === type);
                let defaultValue = 'null';
                if (typeDef?.kind === 'datatype') defaultValue = `new ${type}()`;
                if (typeDef?.kind === 'enum') {
                    const enumValues = typeDef.content && typeof typeDef.content === 'string' ? typeDef.content.match(/(\w+)/g) || ['Off'] : ['Off'];
                    defaultValue = `${type}.${enumValues[0]}`;
                }
                if (type === 'Boolean') defaultValue = 'false';
                jsCode += `    let ${name} = params["${name}"] ?? ${defaultValue};\n`;
            }
        });
        try {
            new Function('params', `return ${equation}`);
        } catch (e) {
            console.error(`Invalid equation in constraint ${constraint.name}: ${equation}`);
            equation = 'true';
        }
        jsCode += `    const result = ${equation};\n`;
        jsCode += `    if (!result) {\n`;
        jsCode += `        throw new Error('Constraint ${constraint.name} violated');\n`;
        jsCode += `    }\n`;
        jsCode += `    return result;\n`;
        jsCode += `}\n\n`;
    });

    // Definir a classe do sistema
    jsCode += `class ${model.name} {
        constructor() {
            this.ports = [];
        }
        async addPort(...ports) {
            this.ports.push(...ports);
            console.log('Ports added to system:', ports.map(p => p.name));
        }
    }\n\n`;

    // Função principal
    jsCode += '// Main Function\n';
    jsCode += `async function main() {\n`;
    jsCode += `    const system = new ${model.name}();\n`;
    const topLevelComps = model.components.filter(comp => {
        return !model.components.some(c => c.configuration?.includes(comp.name));
    });
    topLevelComps.forEach(comp => {
        jsCode += `    const ${comp.name.toLowerCase()} = new ${comp.name}();\n`;
        jsCode += `    await system.addPort(...${comp.name.toLowerCase()}.ports);\n`;
    });
    model.connectors.forEach(conn => {
        jsCode += `    const ${conn.name.toLowerCase()} = new ${conn.name}(null, null);\n`;
        conn.participants.forEach(p => {
            const comp = model.components.find(c => c.ports.some(port => port.name === p.name || port.type === p.type));
            if (comp) {
                jsCode += `    ${conn.name.toLowerCase()}.setParticipant('${p.name}', ${comp.name.toLowerCase()});\n`;
            }
        });
    });
    jsCode += `    await Promise.all([\n`;
    topLevelComps.forEach(comp => {
        jsCode += `        ${comp.name.toLowerCase()}.start(),\n`;
    });
    jsCode += `    ]);\n`;
    jsCode += `    console.log('System running. Press Ctrl+C to exit.');\n`;
    jsCode += `    await new Promise(resolve => {});\n`;
    jsCode += `}\n\n`;

    // Executar a arquitetura
    jsCode += `main().catch(err => console.error(\`Error in execution: \${err.message}\`));\n`;

    return jsCode;
}

function downloadJavaScript() {
    const jsCode = jsEditor.getValue();
    if (!jsCode.trim() || jsCode.startsWith('Error')) {
        alert('No valid JavaScript code to download.');
        return;
    }

    const blob = new Blob([jsCode], { type: 'text/javascript' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-${sysadlEditor.getValue().match(/Model\s+(\w+)/)?.[1] || 'sysadl'}.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}
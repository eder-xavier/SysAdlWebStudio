const performance = typeof require === 'function' ? require('perf_hooks').performance : window.performance;

async function transformToJavaScript() {
    const content = sysadlEditor.getValue();
    if (!content.trim()) {
        jsEditor.setValue('No SysADL code to transform.');
        return;
    }

    try {
        console.log('Starting transformation...');
        const parsedData = parseSysADL(content);
        console.log('Parsed data:', JSON.stringify(parsedData, null, 2));
        let jsCode = await generateJsCode(parsedData);
        console.log('Generated code:', jsCode);
        if (typeof jsCode !== 'string') {
            throw new Error('generateJsCode did not return a string, got type: ' + typeof jsCode);
        }
        jsEditor.setValue(fixSyntax(jsCode));
        console.log('Transformation completed.');
    } catch (error) {
        jsEditor.setValue('Error transforming to JavaScript: ' + error.message);
        console.error('Transformation error:', error);
    }
}

async function generateJsCode(model) {
    let jsCode = '// @ts-nocheck\n';
    jsCode += '// Generated JavaScript code for SysADL Model: ' + (model.name || 'SysADLModel') + '\n\n';

    // Validate model
    if (!model.ports || !Array.isArray(model.ports)) {
        console.error('Invalid or missing model.ports:', model.ports);
        throw new Error('Model ports are undefined or not an array');
    }
    if (!model.types || !Array.isArray(model.types)) {
        console.error('Invalid or missing model.types:', model.types);
        throw new Error('Model types are undefined or not an array');
    }
    if (!model.components || !Array.isArray(model.components)) {
        console.error('Invalid or missing model.components:', model.components);
        throw new Error('Model components are undefined or not an array');
    }

    // Model Metadata
    jsCode += '// Model Metadata\n';
    jsCode += 'const modelPorts = ' + JSON.stringify(model.ports || [], null, 2) + ';\n';
    jsCode += 'const modelTypes = ' + JSON.stringify(model.types || [], null, 2) + ';\n\n';

    // Types
    jsCode += '// Types\n';
    model.types.forEach(type => {
        if (type.kind === 'value type') {
            jsCode += `const ${type.name} = 'any'; // Value type\n`;
        } else if (type.kind === 'enum') {
            const enumValues = type.content?.match(/(\w+)/g) || [];
            jsCode += `const ${type.name} = Object.freeze({ ${enumValues.map(v => `${v}: '${v}'`).join(', ')} });\n`;
        } else if (type.kind === 'datatype') {
            const attributes = type.content?.match(/attributes\s*:\s*([^;]+)/)?.[1] || '';
            jsCode += `class ${type.name} {\n    constructor(params = {}) {\n`;
            attributes.split(';').forEach(attr => {
                const match = attr.match(/(\w+)\s*:\s*(\w+)/);
                if (match) {
                    const [, attrName, attrType] = match;
                    const flowType = model.types.find(t => t.name === attrType);
                    let defaultValue = 'null';
                    if (flowType?.kind === 'enum') defaultValue = `${attrType}.${flowType.content?.match(/(\w+)/g)?.[0] || 'Off'}`;
                    else if (flowType?.kind === 'datatype') defaultValue = `new ${attrType}({})`;
                    else if (attrType === 'Boolean') defaultValue = 'false';
                    jsCode += `        this.${attrName} = params.${attrName} ?? ${defaultValue};\n`;
                }
            });
            jsCode += '    }\n}\n';
        }
    });
    jsCode += '\n';

    // Base Port Class
    jsCode += '// Base Port Class\n';
    jsCode += `class SysADLPort {
    constructor(name, type, direction = 'inout', subPorts = [], flowType = 'any', component = null) {
        console.log(\`Initializing port \${name} with type \${type}, direction \${direction}, flowType \${flowType}\`);
        this.name = name;
        this.type = type;
        this.direction = direction;
        this.flowType = flowType || 'any';
        this.value = null;
        this.component = component;
        this.subPorts = new Map(subPorts.map(sp => {
            console.log(\`Initializing subPort \${sp.name} with type \${sp.type}, flowType \${sp.flowType || 'any'}\`);
            return [sp.name, sp];
        }));
        this.connector = null;
    }

    async send(data, subPortName = null) {
        console.log(\`Port \${this.name} sending data: \${JSON.stringify(data)}\${subPortName ? ' via subPort ' + subPortName : ''}\`);
        if (this.subPorts.size > 0 && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'out' && subPort.direction !== 'inout')) {
                console.error(\`Cannot send via subPort \${subPortName} in \${this.name}: invalid direction\`);
                return false;
            }
            subPort.value = data;
            if (subPort.connector) await subPort.connector.transmit(data);
            return true;
        }
        if (this.direction !== 'out' && this.direction !== 'inout') {
            console.error(\`Cannot send via \${this.name}: invalid direction (\${this.direction})\`);
            return false;
        }
        if (!this.connector) {
            console.warn(\`No connector attached to \${this.name}; data not sent\`);
            return false;
        }
        this.value = data;
        await this.connector.transmit(data);
        return true;
    }

    async receive(data, subPortName = null) {
        console.log(\`Port \${this.name} receiving data: \${JSON.stringify(data)}\${subPortName ? ' via subPort ' + subPortName : ''}\`);
        if (this.subPorts.size > 0 && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'in' && subPort.direction !== 'inout')) {
                console.error(\`Cannot receive via subPort \${subPortName} in \${this.name}: invalid direction\`);
                return false;
            }
            subPort.value = data;
            if (this.component) {
                await this.component.onDataReceived(subPort.name, data);
            }
            return true;
        }
        if (this.direction !== 'in' && this.direction !== 'inout') {
            console.error(\`Cannot receive via \${this.name}: invalid direction (\${this.direction})\`);
            return false;
        }
        this.value = data;
        if (this.component) {
            await this.component.onDataReceived(this.name, data);
        }
        return true;
    }

    getValue() {
        return this.value;
    }
}\n\n`;

    // Base Connector Class
    jsCode += '// Base Connector Class\n';
    jsCode += `class SysADLConnector {
    constructor(name, flows = []) {
        console.log(\`Initializing connector \${name}\`);
        this.name = name;
        this.flows = flows;
        this.messageQueue = [];
        this.isProcessing = false;
    }

    async transmit(data) {
        console.log(\`Connector \${this.name} transmitting data: \${JSON.stringify(data)}\`);
        this.messageQueue.push(data);
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.messageQueue.length > 0) {
            const currentData = this.messageQueue.shift();
            for (const flow of this.flows) {
                console.log(\`Connector \${this.name} processing flow from \${flow.source} to \${flow.target}, type: \${flow.type}\`);
                if (flow.targetPort) {
                    await flow.targetPort.receive(currentData);
                } else {
                    console.warn(\`No target port defined for flow from \${flow.source} to \${flow.target}\`);
                }
            }
        }
        this.isProcessing = false;
    }
}\n\n`;

    // Binding Class
    jsCode += '// Binding Class\n';
    jsCode += `class Binding {
    constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {
        console.log(\`Creating binding from \${sourceComponent.name}.\${sourcePort.name} to \${targetComponent.name}.\${targetPort.name} via connector \${connector.name}\`);
        this.sourceComponent = sourceComponent;
        this.sourcePort = sourcePort;
        this.targetComponent = targetComponent;
        this.targetPort = targetPort;
        this.connector = connector;
        this.sourcePort.connector = connector;
        connector.flows.push({ source: sourcePort.name, target: targetPort.name, type: sourcePort.flowType || 'any', targetPort: this.targetPort });
    }

    async transmit(data) {
        console.log(\`Binding transmitting data \${JSON.stringify(data)} from \${this.sourceComponent.name}.\${this.sourcePort.name} to \${this.targetComponent.name}.\${this.targetPort.name}\`);
        await this.connector.transmit(data);
    }
}\n\n`;

    // Connector Classes
    jsCode += '// Connector Classes\n';
    (model.connectors || []).forEach(conn => {
        jsCode += `class ${conn.name} extends SysADLConnector {\n`;
        jsCode += '    constructor() {\n';
        jsCode += `        super('${conn.name}', [\n`;
        jsCode += `            ${conn.flows.map(f => `{ type: '${f.type || 'any'}', source: '${f.source}', target: '${f.target}' }`).join(',\n            ')}\n`;
        jsCode += '        ]);\n';
        jsCode += '    }\n';
        jsCode += '}\n\n';
    });

    // Base Component Class
    jsCode += '// Base Component Class\n';
    jsCode += `class SysADLComponent {
    constructor(name, isBoundary = false, modelPorts = [], modelTypes = []) {
        console.log(\`Initializing component \${name}, isBoundary: \${isBoundary}\`);
        this.name = name;
        this.isBoundary = isBoundary;
        this.ports = [];
        this.state = {};
        this.activities = [];
        this.modelPorts = modelPorts;
        this.modelTypes = modelTypes;
        this.subComponents = new Map();
    }

    async addPort(port) {
        port.component = this;
        this.ports.push(port);
        console.log(\`Port \${port.name} added to component \${this.name}, flowType: \${port.flowType}\`);
    }

    async addSubComponent(name, component) {
        this.subComponents.set(name, component);
        console.log(\`SubComponent \${name} added to \${this.name}\`);
    }

    async onDataReceived(portName, data) {
        console.log(\`Component \${this.name} received data on port \${portName}: \${JSON.stringify(data)}\`);
        this.state[portName] = data;
        console.log(\`Processing activities for component \${this.name} due to data on \${portName}\`);
        for (const activity of this.activities) {
            console.log(\`Triggering activity \${activity.methodName} in component \${this.name}\`);
            await this[activity.methodName]();
        }
        for (const [subCompName, subComp] of this.subComponents) {
            for (const activity of subComp.activities) {
                console.log(\`Triggering subcomponent activity \${subCompName}.\${activity.methodName}\`);
                await this[\`\${subCompName}_execute\`](activity.methodName);
            }
        }
    }

    async start() {
        console.log(\`Starting component \${this.name}\`);
        if (this.isBoundary) {
            await this.simulateInput();
        }
        for (const subComp of this.subComponents.values()) {
            await subComp.start();
        }
    }

    async simulateInput() {
        console.log(\`Simulating input for component \${this.name}\`);
        for (const port of this.ports) {
            console.log(\`Processing port \${port.name} with type \${port.type}, flowType: \${port.flowType}\`);
            if (!port.flowType || typeof port.flowType !== 'string') {
                console.warn(\`Skipping port \${port.name} due to invalid flowType: \${port.flowType}\`);
                continue;
            }
            let simulatedValue;
            if (port.flowType.includes('emperature') || port.flowType === 'Real' || port.flowType === 'Int') {
                simulatedValue = 42.0;
                console.log(\`Simulating number input \${simulatedValue} for \${this.name}.\${port.name}\`);
            } else if (port.flowType === 'Boolean') {
                simulatedValue = true;
                console.log(\`Simulating boolean input \${simulatedValue} for \${this.name}.\${port.name}\`);
            } else if (this.modelTypes.find(t => t.name === port.flowType && t.kind === 'enum')) {
                const enumValues = this.modelTypes.find(t => t.name === port.flowType)?.content.match(/(\w+)/g) || ['Off'];
                simulatedValue = ${model.name || 'Command'}[enumValues[0]];
                console.log(\`Simulating enum input \${simulatedValue} for \${this.name}.\${port.name}\`);
            } else if (this.modelTypes.find(t => t.name === port.flowType && t.kind === 'datatype')) {
                simulatedValue = new ${model.name || 'Commands'}({});
                console.log(\`Simulating datatype input for \${this.name}.\${port.name}\`);
            } else {
                console.warn(\`Unsupported flow type \${port.flowType} for port \${this.name}.\${port.name}\`);
                continue;
            }
            await this.onDataReceived(port.name, simulatedValue);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}\n\n`;

    // Component Classes
    jsCode += '// Component Classes\n';
    model.components.forEach(comp => {
        const isBoundary = comp.configuration?.includes('boundary') || false;
        const allocatedActivities = (model.allocations || [])
            .filter(a => a.target === comp.name && a.type === 'activity')
            .map(a => (model.activities || []).find(act => act.name === a.source))
            .filter(act => act);

        const activityMethods = allocatedActivities.map(activity => {
            const paramsInit = (activity.inputs || '').split(',').map(p => {
                if (!p.trim()) return '';
                const [name, type] = p.trim().split(':').map(s => s.trim());
                return name && type ? `${name}: this.state['${name}'] ?? null` : '';
            }).filter(p => p).join(', ');
            let actionExecCode = '';
            const dataStores = activity.dataStores || [];
            const flows = activity.flows || [];
            const delegates = activity.delegates || [];

            dataStores.forEach(ds => {
                const flowType = model.types.find(t => t.name === ds.type);
                let defaultValue = 'null';
                if (flowType?.kind === 'enum') defaultValue = `${ds.type}.${flowType.content?.match(/(\w+)/g)?.[0] || 'Off'}`;
                else if (flowType?.kind === 'datatype') defaultValue = `new ${ds.type}({})`;
                else if (ds.type === 'Boolean') defaultValue = 'false';
                actionExecCode += `        let ${ds.name} = this.state['${ds.name}'] ?? ${defaultValue};\n`;
            });

            (activity.actions || []).forEach(action => {
                const execAlloc = (model.allocations || []).find(a => a.type === 'executable' && a.target === action.name);
                if (!execAlloc) return;
                const executable = (model.executables || []).find(e => e.name === execAlloc.source);
                if (!executable) return;

                const constraint = (model.constraints || []).find(c => c.name === action.name + 'EQ');
                let actionCode = `            console.log('Executing action ${action.id} with executable ${executable.name} in activity ${activity.name}');\n`;
                const paramsList = (executable.inputs || '').split(',').map(p => {
                    if (!p.trim()) return '';
                    const [name, type] = p.trim().split(':').map(s => s.trim());
                    return name && type ? `${name}: this.state['${name}'] ?? null` : '';
                }).filter(p => p).join(', ');
                actionCode += `            const ${action.id}_result = await ${executable.name}({ ${paramsList} });\n`;
                if (constraint) {
                    actionCode += `            console.log('Validating constraint ${constraint.name}');\n`;
                    actionCode += `            try {\n`;
                    actionCode += `                await validate${constraint.name}({ ${paramsList}, ${action.id}: ${action.id}_result });\n`;
                    actionCode += `            } catch (e) {\n`;
                    actionCode += `                console.error('Constraint ${constraint.name} violated: ' + e.message);\n`;
                    actionCode += `                return null;\n`;
                    actionCode += `            }\n`;
                }

                flows.forEach(flow => {
                    if (flow.source === action.id) {
                        actionCode += `            console.log('Storing result ' + ${action.id}_result + ' to state ${flow.target} from action ${action.id}');\n`;
                        actionCode += `            this.state['${flow.target}'] = ${action.id}_result;\n`;
                    }
                });

                delegates.forEach(delegate => {
                    const targetPort = comp.ports?.find(p => p && (p.name === delegate.target || p.type === delegate.target));
                    if (targetPort) {
                        actionCode += `            console.log('Delegating data from ${comp.name} to port ${targetPort.name} in activity ${activity.name}');\n`;
                        actionCode += `            const ${delegate.source}_port = this.ports.find(p => p.name === '${targetPort.name}');\n`;
                        actionCode += `            if (${delegate.source}_port) await ${delegate.source}_port.send(this.state['${delegate.source}']);\n`;
                    }
                });

                actionExecCode += actionCode;
            });

            const returnVal = (activity.outputs || '').trim() ?
                activity.outputs.split(',').map(o => {
                    if (!o.trim()) return null;
                    const [name] = o.trim().split(':').map(s => s.trim());
                    return name ? `this.state['${name}']` : null;
                }).filter(name => name).join(' || ') || 'null' : 'null';

            return {
                methodName: `execute${activity.name}`,
                code: `\n    async execute${activity.name}() {\n` +
                      `        console.log('Executing activity ${activity.name} in component ${this.name}');\n` +
                      `        const params = { ${paramsInit} };\n` +
                      actionExecCode +
                      `        console.log('Activity ${activity.name} returning: ' + ${returnVal});\n` +
                      `        return ${returnVal};\n` +
                      `    }`
            };
        });

        jsCode += `class ${comp.name} extends SysADLComponent {\n`;
        jsCode += '    constructor() {\n';
        jsCode += `        super('${comp.name}', ${isBoundary}, modelPorts, modelTypes);\n`;
        jsCode += '        // Initialize ports\n';
        (comp.ports || []).forEach(port => {
            if (!port || !port.name || !port.type) {
                console.warn(`Invalid port in component ${comp.name}:`, port);
                return;
            }
            const portDef = model.ports.find(p => p.name === port.type);
            const direction = portDef?.flows?.[0]?.direction || 'inout';
            const flowType = portDef?.flows?.[0]?.type || 'any';
            const subPorts = portDef?.subPorts?.map(sp => {
                const spDef = model.ports.find(p => p.name === sp.type);
                return {
                    name: sp.name,
                    type: sp.type,
                    direction: spDef?.flows?.[0]?.direction || 'inout',
                    flowType: spDef?.flows?.[0]?.type || 'any'
                };
            }) || [];
            jsCode += `        this.addPort(new SysADLPort('${port.name}', '${port.type}', '${direction}', [${subPorts.map(sp => `{ name: '${sp.name}', type: '${sp.type}', direction: '${sp.direction}', flowType: '${sp.flowType}' }`).join(', ')}], '${flowType}'));\n`;
        });

        // Initialize subcomponents
        jsCode += '\n        // Initialize subcomponents\n';
        if (comp.configuration) {
            const subComponents = comp.configuration.match(/components\s*:\s*([^;]+)/)?.[1] || '';
            subComponents.split(',').forEach(subComp => {
                const match = subComp.match(/(\w+)\s*:\s*(\w+)\s*(?:{([^}]*)})?/);
                if (match) {
                    const [, instanceName, compType, portsStr] = match;
                    jsCode += `        this.${instanceName} = new ${compType}();\n`;
                    jsCode += `        this.addSubComponent('${instanceName}', this.${instanceName});\n`;
                    if (portsStr) {
                        const subPorts = portsStr.match(/using ports\s*:\s*([^}]+)/)?.[1] || '';
                        subPorts.split(';').forEach(port => {
                            const portMatch = port.match(/(\w+)\s*:\s*(\w+)/);
                            if (portMatch) {
                                const [, portName, portType] = portMatch;
                                const portDef = model.ports.find(p => p.name === portType);
                                const direction = portDef?.flows?.[0]?.direction || 'inout';
                                const flowType = portDef?.flows?.[0]?.type || 'any';
                                jsCode += `        this.${instanceName}.addPort(new SysADLPort('${portName}', '${portType}', '${direction}', [], '${flowType}'));\n`;
                            }
                        });
                    }
                }
            });
        }

        jsCode += '\n        // Initialize state\n';
        (comp.ports || []).forEach(port => {
            if (!port || !port.name || !port.type) {
                console.warn(`Invalid port in state initialization for component ${comp.name}:`, port);
                return;
            }
            const portDef = model.ports.find(p => p.name === port.type);
            const flowType = portDef?.flows?.[0]?.type || 'any';
            let defaultValue = 'null';
            if (flowType === 'Boolean') defaultValue = 'false';
            else if (model.types.find(t => t.name === flowType && t.kind === 'enum')) {
                const enumValues = model.types.find(t => t.name === flowType)?.content.match(/(\w+)/g) || [];
                defaultValue = `${flowType}.${enumValues[0] || 'Off'}`;
            } else if (model.types.find(t => t.name === flowType && t.kind === 'datatype')) {
                defaultValue = `new ${flowType}({})`;
            }
            jsCode += `        this.state['${port.name}'] = ${defaultValue};\n`;
        });

        // Initialize state for data stores
        allocatedActivities.forEach(activity => {
            (activity.dataStores || []).forEach(ds => {
                const flowType = model.types.find(t => t.name === ds.type);
                let defaultValue = 'null';
                if (flowType?.kind === 'enum') defaultValue = `${ds.type}.${flowType.content?.match(/(\w+)/g)?.[0] || 'Off'}`;
                else if (flowType?.kind === 'datatype') defaultValue = `new ${ds.type}({})`;
                else if (ds.type === 'Boolean') defaultValue = 'false';
                jsCode += `        this.state['${ds.name}'] = ${defaultValue};\n`;
            });
        });

        jsCode += '\n        // Register activities\n';
        activityMethods.forEach(a => {
            jsCode += `        this.activities.push({ methodName: '${a.methodName}' });\n`;
        });

        if (comp.configuration) {
            const subComponents = comp.configuration.match(/components\s*:\s*([^;]+)/)?.[1] || '';
            subComponents.split(',').forEach(subComp => {
                const match = subComp.match(/(\w+)\s*:\s*(\w+)/);
                if (match) {
                    const [, instanceName] = match;
                    jsCode += `        this.${instanceName}.activities.forEach(activity => this.activities.push({ methodName: '${instanceName}_execute_\${activity.methodName}' }));\n`;
                }
            });
        }

        jsCode += '    }\n';
        activityMethods.forEach(a => {
            jsCode += a.code + '\n';
        });

        if (comp.configuration) {
            const subComponents = comp.configuration.match(/components\s*:\s*([^;]+)/)?.[1] || '';
            subComponents.split(',').forEach(subComp => {
                const match = subComp.match(/(\w+)\s*:\s*(\w+)/);
                if (match) {
                    const [, instanceName] = match;
                    jsCode += `    async ${instanceName}_execute(methodName) {\n`;
                    jsCode += `        console.log(\`Executing subcomponent activity ${instanceName}.\${methodName}\`);\n`;
                    jsCode += `        return await this.${instanceName}[methodName]();\n`;
                    jsCode += '    }\n';
                }
            });
        }

        jsCode += '}\n\n';
    });

    // Executables
    jsCode += '// Executables\n';
    (model.executables || []).forEach(exec => {
        jsCode += `async function ${exec.name}(params = {}) {\n`;
        jsCode += `    console.log(\`Executing executable ${exec.name} with params: \${JSON.stringify(params)}\`);\n`;
        let body = exec.body?.trim() || '';
        body = body.replace(/(\w+)::(\w+)/g, (match, type, value) => {
            if (model.types.find(t => t.name === type && t.kind === 'enum')) {
                return `${type}.${value}`;
            }
            return `params.${type}.${value}`;
        });
        body = body.replace(/(\w+)->(\w+)/g, `params.$1.$2`);
        body = body.replace(/;;+/g, ';');
        const paramsList = new Set();
        const protectedVars = new Set(['Command', 'On', 'Off', 'params', 'true', 'false', 'null']);
        body.replace(/\b(\w+)\b/g, match => {
            if (!['let', 'if', 'else', 'return'].includes(match) &&
                !match.match(/^\d+$/) &&
                !body.match(new RegExp(`\\b${match}\\b\\s*=\\s*new\\s+\\w+`)) &&
                !model.types.find(t => t.name === match) &&
                !protectedVars.has(match)) {
                paramsList.add(match);
            }
        });
        paramsList.forEach(param => {
            if (!body.match(new RegExp(`let\\s+${param}\\b`))) {
                const flowType = model.types.find(t => t.name === param && t.kind === 'datatype') ? `new ${param}()` :
                    model.types.find(t => t.name === param && t.kind === 'enum') ? `${param}.${model.types.find(t => t.name === param)?.content.match(/(\w+)/g)?.[0] || 'Off'}` : 'null';
                body = `    let ${param} = params.${param} ?? ${flowType};\n` + body;
            }
        });
        body = body.replace(/let\s+(\w+)\s*:\s*(\w+)(?:\s*=\s*([\w:.]+))?/g, (match, varName, typeName, initValue) => {
            const type = model.types.find(t => t.name === typeName);
            let init = initValue || (type?.kind === 'datatype' ? `new ${typeName}()` :
                type?.kind === 'enum' ? `${typeName}.${type.content?.match(/(\w+)/g)?.[0] || 'Off'}` : 'null');
            if (init && init.includes('::')) {
                const [type, value] = init.split('::');
                if (model.types.find(t => t.name === type && t.kind === 'enum')) {
                    init = `${type}.${value}`;
                }
            }
            return `    let ${varName} = params.${varName} ?? ${init};\n`;
        });
        const returnType = model.types.find(t => exec.outputs?.includes(t.name))?.name || 'null';
        if (!body.match(/return\s+[^;]+;/)) {
            if (returnType === 'Commands') {
                body += `    return new Commands({ heater: heater || Command.Off, cooler: cooler || Command.Off });\n`;
            } else {
                body += `    return ${exec.name === 'FahrenheitToCelsiusEx' ? `(5 * (params.f - 32)) / 9` : 'null'};\n`;
            }
        }
        jsCode += body + '\n';
        jsCode += '}\n\n';
    });

    // Constraints
    jsCode += '// Constraints\n';
    (model.constraints || []).forEach(constraint => {
        jsCode += `async function validate${constraint.name}(params = {}) {\n`;
        let equation = constraint.equation || 'true';
        equation = equation.replace(/(\w+)::(\w+)/g, (match, type, value) => {
            if (model.types.find(t => t.name === type && t.kind === 'enum')) {
                return `${type}.${value}`;
            }
            return `params.${type}.${value}`;
        });
        equation = equation.replace(/(\w+)->(\w+)/g, `params.$1.$2`);
        const definedVars = new Set();
        equation.replace(/params\.(\w+)/g, (_, varName) => {
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
            return `params.${match}`;
        });
        equation = equation.replace(/==/g, '===');
        equation = equation.replace(/(\w+\s*[><=]+\s*[^?]+)\s*\?\s*([^:]+)\s*:\s*([^;]+)/g, '($1) ? ($2) : ($3)');
        (constraint.inputs || '').split(',').forEach(input => {
            if (!input.trim()) return;
            const [name, type] = input.trim().split(':').map(s => s.trim());
            if (name && type) {
                const flowType = model.types.find(t => t.name === type);
                let defaultValue = 'null';
                if (flowType?.kind === 'datatype') defaultValue = `new ${type}({})`;
                else if (flowType?.kind === 'enum') {
                    const enumValues = flowType.content?.match(/(\w+)/g) || ['Off'];
                    defaultValue = `${type}.${enumValues[0]}`;
                } else if (type === 'Boolean') defaultValue = 'false';
                else if (type.includes('emperature') || type === 'Real' || type === 'Int') defaultValue = '0';
                jsCode += `    const ${name} = params.${name} ?? ${defaultValue};\n`;
            }
        });
        (constraint.outputs || '').split(',').forEach(output => {
            if (!output.trim()) return;
            const [name, type] = output.trim().split(':').map(s => s.trim());
            if (name && type) {
                const flowType = model.types.find(t => t.name === type);
                let defaultValue = 'null';
                if (flowType?.kind === 'datatype') defaultValue = `new ${type}({})`;
                else if (flowType?.kind === 'enum') {
                    const enumValues = flowType.content?.match(/(\w+)/g) || ['Off'];
                    defaultValue = `${type}.${enumValues[0]}`;
                } else if (type === 'Boolean') defaultValue = 'false';
                else if (type.includes('emperature') || type === 'Real' || type === 'Int') defaultValue = '0';
                jsCode += `    const ${name} = params.${name} ?? ${defaultValue};\n`;
            }
        });
        jsCode += `    console.log(\`Evaluating constraint ${constraint.name}: ${equation}\`);\n`;
        jsCode += `    const result = ${equation};\n`;
        jsCode += `    if (!result) {\n`;
        jsCode += `        throw new Error('Constraint ${constraint.name} violated');\n`;
        jsCode += `    }\n`;
        jsCode += `    console.log('Constraint ${constraint.name} passed');\n`;
        jsCode += `    return result;\n`;
        jsCode += '}\n\n';
    });

    // System Class
    jsCode += `class ${model.name || 'SysADLModel'} {\n`;
    jsCode += '    constructor() {\n';
    jsCode += `        console.log('Initializing system ${model.name || 'SysADLModel'}');\n`;
    jsCode += '        this.components = new Map();\n';
    jsCode += '        this.connectors = new Map();\n';
    jsCode += '        this.bindings = [];\n';
    jsCode += '        this.ports = [];\n';
    jsCode += '    }\n\n';
    jsCode += '    async addComponent(name, component) {\n';
    jsCode += '        this.components.set(name, component);\n';
    jsCode += '        this.ports.push(...component.ports);\n';
    jsCode += '        console.log(`Component ${name} added to system`);\n';
    jsCode += '    }\n\n';
    jsCode += '    async addConnector(name, connector) {\n';
    jsCode += '        this.connectors.set(name, connector);\n';
    jsCode += '        console.log(`Connector ${name} added to system`);\n';
    jsCode += '    }\n\n';
    jsCode += '    async addBinding(binding) {\n';
    jsCode += '        this.bindings.push(binding);\n';
    jsCode += '        console.log(`Binding added: ${binding.sourceComponent.name}.${binding.sourcePort.name} -> ${binding.targetComponent.name}.${binding.targetPort.name} via ${binding.connector.name}`);\n';
    jsCode += '    }\n\n';
    jsCode += '    async start() {\n';
    jsCode += `        console.log('System ${model.name || 'SysADLModel'} starting');\n`;
    jsCode += '        await Promise.all(Array.from(this.components.values()).map(c => c.start()));\n';
    jsCode += `        console.log('System ${model.name || 'SysADLModel'} simulation completed');\n`;
    jsCode += '    }\n';
    jsCode += '}\n\n';

    // Main Function
    jsCode += '// Main Function\n';
    jsCode += 'async function main() {\n';
    jsCode += `    console.log('Starting simulation of ${model.name || 'SysADLModel'}');\n`;
    jsCode += `    const system = new ${model.name || 'SysADLModel'}();\n\n`;

    // Initialize components
    jsCode += '    // Initialize components\n';
    model.components.forEach(comp => {
        const varName = comp.name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
        jsCode += `    const ${varName} = new ${comp.name}();\n`;
        jsCode += `    await system.addComponent('${comp.name}', ${varName});\n`;
    });

    // Initialize connectors
    jsCode += '\n    // Initialize connectors\n';
    (model.connectors || []).forEach(conn => {
        const varName = conn.name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
        jsCode += `    const ${varName} = new ${conn.name}();\n`;
        jsCode += `    await system.addConnector('${conn.name}', ${varName});\n`;
    });

    // Configure bindings
    jsCode += '\n    // Configure bindings\n';
    (model.bindings || []).forEach(binding => {
        const [sourceComp, sourcePort] = binding.source.split('.');
        const [targetComp, targetPort] = binding.target.split('.');
        const connector = binding.connector || 'SysADLConnector';
        jsCode += `    await system.addBinding(new Binding(
        system.components.get('${sourceComp}'),
        system.components.get('${sourceComp}').ports.find(p => p.name === '${sourcePort}'),
        system.components.get('${targetComp}'),
        system.components.get('${targetComp}').ports.find(p => p.name === '${targetPort}'),
        system.connectors.get('${connector}')
    ));\n`;
    });

    // Configure delegations
    jsCode += '\n    // Configure delegations\n';
    const compositeComp = model.components.find(c => c.configuration?.includes('components'));
    if (compositeComp) {
        const subComponents = compositeComp.configuration.match(/components\s*:\s*([^;]+)/)?.[1] || '';
        const compVarName = compositeComp.name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
        jsCode += `    const ${compVarName} = system.components.get('${compositeComp.name}');\n`;
        (model.delegations || []).forEach(delegation => {
            const [sourceComp, sourcePort] = delegation.source.split('.');
            const [targetComp, targetPort] = delegation.target.split('.');
            jsCode += `    const ${sourcePort}Port = system.components.get('${sourceComp}')?.ports.find(p => p.name === '${sourcePort}');\n`;
            jsCode += `    const ${targetPort}Port = ${compVarName}.ports.find(p => p.name === '${targetPort}');\n`;
            jsCode += `    if (${targetPort}Port && ${sourcePort}Port) {\n`;
            jsCode += `        console.log('Configuring delegation from ${sourceComp}.${sourcePort} to ${compositeComp.name}.${targetPort}');\n`;
            jsCode += `        ${sourcePort}Port.receive = async (data) => {\n`;
            jsCode += `            console.log(\`Delegating data \${JSON.stringify(data)} from ${sourceComp}.${sourcePort} to ${compositeComp.name}.${targetPort}\`);\n`;
            jsCode += `            await ${targetPort}Port.receive(data);\n`;
            jsCode += `            await ${compVarName}.onDataReceived('${targetPort}', data);\n`;
            jsCode += `        };\n`;
            jsCode += `    }\n`;
        });

        // Delegations from composite to subcomponents
        subComponents.split(',').forEach(subComp => {
            const match = subComp.match(/(\w+)\s*:\s*(\w+)/);
            if (match) {
                const [, instanceName, compType] = match;
                (model.delegations || []).forEach(delegation => {
                    const [sourceComp, sourcePort] = delegation.source.split('.');
                    const [targetComp, targetPort] = delegation.target.split('.');
                    if (sourceComp === compositeComp.name && targetComp === compType) {
                        jsCode += `    const ${sourcePort}Port = ${compVarName}.ports.find(p => p.name === '${sourcePort}');\n`;
                        jsCode += `    const ${targetPort}Port = system.components.get('${compType}_${instanceName}')?.ports.find(p => p.name === '${targetPort}');\n`;
                        jsCode += `    if (${sourcePort}Port && ${targetPort}Port) {\n`;
                        jsCode += `        console.log('Configuring delegation from ${compositeComp.name}.${sourcePort} to ${compType}_${instanceName}.${targetPort}');\n`;
                        jsCode += `        ${sourcePort}Port.send = async (data) => {\n`;
                        jsCode += `            console.log(\`Delegating data \${JSON.stringify(data)} from ${compositeComp.name}.${sourcePort} to ${compType}_${instanceName}.${targetPort}\`);\n`;
                        jsCode += `            await ${targetPort}Port.receive(data);\n`;
                        jsCode += `            await system.components.get('${compType}_${instanceName}').onDataReceived('${targetPort}', data);\n`;
                        jsCode += `        };\n`;
                        jsCode += `    }\n`;
                    }
                });
            }
        });
    }

    jsCode += '\n    await system.start();\n';
    jsCode += `    console.log('System simulation completed');\n`;
    jsCode += '}\n\n';

    jsCode += `main().catch(err => console.error(\`Error in execution: \${err.message}\`));\n`;

    return jsCode;
}

function fixSyntax(code) {
    return code
        .replace(/\n\s*\n/g, '\n')
        .replace(/;+\s*;/g, ';')
        .replace(/(\w+)\s*::\s*(\w+)/g, '$1.$2');
}

// Placeholder for parseSysADL (to be implemented based on SysADL grammar)
function parseSysADL(content) {
    return {
        name: 'RTC',
        types: [
            { kind: 'value type', name: 'Int', extends: null, content: '' },
            { kind: 'value type', name: 'Boolean', extends: null, content: '' },
            { kind: 'value type', name: 'String', extends: null, content: '' },
            { kind: 'value type', name: 'Void', extends: null, content: '' },
            { kind: 'value type', name: 'Real', extends: null, content: '' },
            { kind: 'enum', name: 'Command', extends: null, content: 'On , Off' },
            { kind: 'datatype', name: 'Commands', extends: null, content: 'attributes : heater : Command ; cooler : Command ;' },
            { kind: 'value type', name: 'temperature', extends: 'Real', content: 'dimension = Temperature' },
            { kind: 'value type', name: 'FahrenheitTemperature', extends: 'temperature', content: 'unit = Fahrenheit dimension = Temperature' },
            { kind: 'value type', name: 'CelsiusTemperature', extends: 'temperature', content: 'unit = Celsius dimension = Temperature' }
        ],
        ports: [
            { name: 'FTemperatureOPT', flows: [{ direction: 'out', type: 'FahrenheitTemperature' }], subPorts: [] },
            { name: 'PresenceIPT', flows: [{ direction: 'in', type: 'Boolean' }], subPorts: [] },
            { name: 'PresenceOPT', flows: [{ direction: 'out', type: 'Boolean' }], subPorts: [] },
            { name: 'CTemperatureIPT', flows: [{ direction: 'in', type: 'CelsiusTemperature' }], subPorts: [] },
            { name: 'CommandIPT', flows: [{ direction: 'in', type: 'Command' }], subPorts: [] },
            { name: 'CommandOPT', flows: [{ direction: 'out', type: 'Command' }], subPorts: [] },
            { name: 'CTemperatureOPT', flows: [{ direction: 'out', type: 'CelsiusTemperature' }], subPorts: [] }
        ],
        components: [
            {
                name: 'RTCSystemCFD',
                configuration: 'boundary',
                ports: [
                    { name: 'current1', type: 'FTemperatureOPT' },
                    { name: 'current2', type: 'FTemperatureOPT' },
                    { name: 'detected', type: 'PresenceOPT' },
                    { name: 'desired', type: 'CTemperatureOPT' }
                ]
            },
            {
                name: 'RoomTemperatureControllerCP',
                configuration: 'components: S1:TemperatureSensorCP; S2:TemperatureSensorCP; sensorsMonitor:SensorsMonitorCP; presenceChecker:PresenceCheckerCP; userInterface:UserInterfaceCP; commander:CommanderCP; heater:HeaterCP; cooler:CoolerCP',
                ports: [
                    { name: 'detectedRTC', type: 'PresenceIPT' },
                    { name: 's1', type: 'CTemperatureIPT' },
                    { name: 's2', type: 'CTemperatureIPT' },
                    { name: 'desiredRTC', type: 'CTemperatureIPT' },
                    { name: 'commandH', type: 'CommandOPT' },
                    { name: 'commandC', type: 'CommandOPT' }
                ]
            },
            {
                name: 'TemperatureSensorCP',
                ports: [{ name: 'current', type: 'FTemperatureOPT' }]
            },
            {
                name: 'PresenceSensorCP',
                ports: [{ name: 'detected', type: 'PresenceOPT' }]
            },
            {
                name: 'UserInterfaceCP',
                ports: [{ name: 'desired', type: 'CTemperatureOPT' }]
            },
            {
                name: 'HeaterCP',
                ports: [{ name: 'controllerH', type: 'CommandIPT' }]
            },
            {
                name: 'CoolerCP',
                ports: [{ name: 'controllerC', type: 'CommandIPT' }]
            },
            {
                name: 'PresenceCheckerCP',
                ports: [
                    { name: 'detected', type: 'PresenceIPT' },
                    { name: 'target1', type: 'CTemperatureOPT' }
                ]
            },
            {
                name: 'CommanderCP',
                ports: [
                    { name: 'target2', type: 'CTemperatureIPT' },
                    { name: 'commandH', type: 'CommandOPT' },
                    { name: 'commandC', type: 'CommandOPT' }
                ]
            },
            {
                name: 'SensorsMonitorCP',
                ports: [
                    { name: 's1', type: 'CTemperatureIPT' },
                    { name: 's2', type: 'CTemperatureIPT' },
                    { name: 'average', type: 'CTemperatureOPT' }
                ]
            }
        ],
        connectors: [
            {
                name: 'FahrenheitToCelsiusCN',
                flows: [{ type: 'FahrenheitTemperature', source: 'Ft', target: 'Ct' }]
            },
            {
                name: 'PresenceCN',
                flows: [{ type: 'Boolean', source: 'pOut', target: 'pIn' }]
            },
            {
                name: 'CommandCN',
                flows: [{ type: 'Command', source: 'commandOut', target: 'commandIn' }]
            },
            {
                name: 'CTemperatureCN',
                flows: [{ type: 'CelsiusTemperature', source: 'CtOut', target: 'ctIn' }]
            }
        ],
        bindings: [
            { source: 'TemperatureSensorCP_S1.current', target: 'SensorsMonitorCP.s1', connector: 'FahrenheitToCelsiusCN' },
            { source: 'TemperatureSensorCP_S2.current', target: 'SensorsMonitorCP.s2', connector: 'FahrenheitToCelsiusCN' },
            { source: 'PresenceSensorCP.detected', target: 'PresenceCheckerCP.detected', connector: 'PresenceCN' },
            { source: 'UserInterfaceCP.desired', target: 'PresenceCheckerCP.target1', connector: 'CTemperatureCN' },
            { source: 'PresenceCheckerCP.target1', target: 'CommanderCP.target2', connector: 'CTemperatureCN' },
            { source: 'CommanderCP.commandH', target: 'HeaterCP.controllerH', connector: 'CommandCN' },
            { source: 'CommanderCP.commandC', target: 'CoolerCP.controllerC', connector: 'CommandCN' },
            { source: 'SensorsMonitorCP.average', target: 'CommanderCP.target2', connector: 'CTemperatureCN' }
        ],
        delegations: [
            { source: 'RTCSystemCFD.current1', target: 'RoomTemperatureControllerCP.s1' },
            { source: 'RTCSystemCFD.current2', target: 'RoomTemperatureControllerCP.s2' },
            { source: 'PresenceSensorCP.detected', target: 'RoomTemperatureControllerCP.detectedRTC' },
            { source: 'UserInterfaceCP.desired', target: 'RoomTemperatureControllerCP.desiredRTC' },
            { source: 'RoomTemperatureControllerCP.commandH', target: 'HeaterCP.controllerH' },
            { source: 'RoomTemperatureControllerCP.commandC', target: 'CoolerCP.controllerC' }
        ],
        activities: [
            {
                name: 'ControlTemperature',
                inputs: 'detectedRTC:Boolean, s1:CelsiusTemperature, s2:CelsiusTemperature, desiredRTC:CelsiusTemperature',
                outputs: 'commandH:Command, commandC:Command',
                dataStores: [],
                actions: [],
                flows: [],
                delegates: []
            },
            {
                name: 'CalculateAverageTemperature',
                inputs: 'temp1:CelsiusTemperature, temp2:CelsiusTemperature',
                outputs: 'average:CelsiusTemperature',
                dataStores: [{ name: 'temp1', type: 'CelsiusTemperature' }, { name: 'temp2', type: 'CelsiusTemperature' }],
                actions: [{ id: 'calculateAverage', name: 'CalculateAverageTemperature' }],
                flows: [{ source: 'calculateAverage', target: 'average' }],
                delegates: []
            },
            {
                name: 'CheckPresence',
                inputs: 'detected:Boolean, userTemp:CelsiusTemperature',
                outputs: 'target1:CelsiusTemperature',
                dataStores: [{ name: 'userTemp', type: 'CelsiusTemperature' }],
                actions: [{ id: 'checkPresence', name: 'CheckPresenceToSetTemperature' }],
                flows: [{ source: 'checkPresence', target: 'target1' }],
                delegates: []
            },
            {
                name: 'CompareTemperature',
                inputs: 'target:CelsiusTemperature, average:CelsiusTemperature',
                outputs: 'commandH:Command, commandC:Command',
                dataStores: [{ name: 'average', type: 'CelsiusTemperature' }],
                actions: [{ id: 'compare', name: 'CompareTemperature' }],
                flows: [{ source: 'compare', target: 'cmds' }],
                delegates: []
            }
        ],
        executables: [
            {
                name: 'CommandCoolerEx',
                inputs: 'cmds:Commands',
                outputs: 'c:Command',
                body: 'return cmds.cooler;'
            },
            {
                name: 'CommandHeaterEx',
                inputs: 'cmds:Commands',
                outputs: 'c:Command',
                body: 'return cmds.heater;'
            },
            {
                name: 'FahrenheitToCelsiusEx',
                inputs: 'f:FahrenheitTemperature',
                outputs: 'c:CelsiusTemperature',
                body: 'let c = (5 * (f - 32)) / 9; return c;'
            },
            {
                name: 'CalculateAverageTemperatureEx',
                inputs: 'temp1:CelsiusTemperature, temp2:CelsiusTemperature',
                outputs: 'average:CelsiusTemperature',
                body: 'return (temp1 + temp2) / 2;'
            },
            {
                name: 'CheckPresenceToSetTemperature',
                inputs: 'userTemp:CelsiusTemperature, presence:Boolean',
                outputs: 'target:CelsiusTemperature',
                body: 'return presence ? userTemp : 2;'
            },
            {
                name: 'CompareTemperatureEx',
                inputs: 'target:CelsiusTemperature, average:CelsiusTemperature',
                outputs: 'cmds:Commands',
                body: `
                    let heater = Command.Off;
                    let cooler = Command.Off;
                    if (average > target) {
                        heater = Command.Off;
                        cooler = Command.On;
                    } else {
                        heater = Command.On;
                        cooler = Command.Off;
                    }
                    return new Commands({ heater, cooler });
                `
            }
        ],
        constraints: [
            {
                name: 'CalculateAverageTemperatureEQ',
                inputs: 't1:CelsiusTemperature, t2:CelsiusTemperature',
                outputs: 'av:CelsiusTemperature',
                equation: 'av === (t1 + t2)/2'
            },
            {
                name: 'CompareTemperatureEQ',
                inputs: 'target:CelsiusTemperature, average:CelsiusTemperature',
                outputs: 'cmds:Commands',
                equation: 'average > target ? cmds.heater === Command.Off && cmds.cooler === Command.On : cmds.heater === Command.On && cmds.cooler === Command.Off'
            },
            {
                name: 'FahrenheitToCelsiusEQ',
                inputs: 'f:FahrenheitTemperature',
                outputs: 'c:CelsiusTemperature',
                equation: 'c === (5*(f - 32)/9)'
            },
            {
                name: 'CommandHeaterEQ',
                inputs: 'cmds:Commands',
                outputs: 'c:Command',
                equation: 'c === cmds.heater'
            },
            {
                name: 'CommandCoolerEQ',
                inputs: 'cmds:Commands',
                outputs: 'c:Command',
                equation: 'c === cmds.cooler'
            },
            {
                name: 'CheckPresenceToSetTemperatureEQ',
                inputs: 'detected:Boolean, userTemp:CelsiusTemperature',
                outputs: 'target:CelsiusTemperature',
                equation: 'detected ? target === userTemp : target === 2'
            }
        ],
        allocations: [
            { type: 'activity', source: 'ControlTemperature', target: 'RoomTemperatureControllerCP' },
            { type: 'activity', source: 'CalculateAverageTemperature', target: 'SensorsMonitorCP' },
            { type: 'activity', source: 'CheckPresence', target: 'PresenceCheckerCP' },
            { type: 'activity', source: 'CompareTemperature', target: 'CommanderCP' },
            { type: 'executable', source: 'CalculateAverageTemperatureEx', target: 'CalculateAverageTemperature' },
            { type: 'executable', source: 'CheckPresenceToSetTemperature', target: 'CheckPresenceToSetTemperature' },
            { type: 'executable', source: 'CompareTemperatureEx', target: 'CompareTemperature' },
            { type: 'executable', source: 'CommandCoolerEx', target: 'CommandCooler' },
            { type: 'executable', source: 'CommandHeaterEx', target: 'CommandHeater' },
            { type: 'executable', source: 'FahrenheitToCelsiusEx', target: 'FahrenheitToCelsius' }
        ]
    };
}
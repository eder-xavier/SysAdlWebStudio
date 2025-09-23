// @ts-nocheck
// transformer.js
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
    jsCode += 'const modelPorts = ' + JSON.stringify(model.ports || []) + ';\n';
    jsCode += 'const modelTypes = ' + JSON.stringify(model.types || []) + ';\n\n';

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
            attributes.split(',').forEach(attr => {
                const match = attr.match(/(\w+)\s*:\s*(\w+)/);
                if (match) {
                    const [, attrName, attrType] = match;
                    const flowType = model.types.find(t => t.name === attrType);
                    let defaultValue = 'null';
                    if (flowType?.kind === 'enum') defaultValue = `${attrType}.${flowType.content?.match(/(\w+)/g)?.[0] || 'Off'}`;
                    else if (flowType?.kind === 'datatype') defaultValue = `new ${attrType}({})`;
                    else if (attrType === 'Boolean') defaultValue = 'false';
                    jsCode += `        this.${attrName} = params["${attrName}"] ?? ${defaultValue};\n`;
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
        console.log('Initializing port ' + name + ' with type ' + type + ', direction ' + direction + ', flowType ' + flowType);
        this.name = name;
        this.type = type;
        this.direction = direction;
        this.flowType = flowType || 'any';
        this.value = null;
        this.component = component;
        this.subPorts = new Map(subPorts.map(sp => {
            console.log('Initializing subPort ' + sp.name + ' with type ' + sp.type + ', flowType ' + (sp.flowType || 'any'));
            return [sp.name, sp];
        }));
        this.connector = null;
    }

    async send(data, subPortName = null) {
        console.log('Port ' + this.name + ' sending data: ' + JSON.stringify(data) + (subPortName ? ' via subPort ' + subPortName : ''));
        if (this.subPorts.size > 0 && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'out' && subPort.direction !== 'inout')) {
                console.error('Cannot send via subPort ' + subPortName + ' in ' + this.name + ': invalid direction');
                return false;
            }
            subPort.value = data;
            if (subPort.connector) await subPort.connector.transmit(data);
            return true;
        }
        if (this.direction !== 'out' && this.direction !== 'inout') {
            console.error('Cannot send via ' + this.name + ': invalid direction (' + this.direction + ')');
            return false;
        }
        if (!this.connector) {
            console.warn('No connector attached to ' + this.name + '; data not sent');
            return false;
        }
        this.value = data;
        await this.connector.transmit(data);
        return true;
    }

    async receive(data, subPortName = null) {
        console.log('Port ' + this.name + ' receiving data: ' + JSON.stringify(data) + (subPortName ? ' via subPort ' + subPortName : ''));
        if (this.subPorts.size > 0 && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'in' && subPort.direction !== 'inout')) {
                console.error('Cannot receive via subPort ' + subPortName + ' in ' + this.name + ': invalid direction');
                return false;
            }
            subPort.value = data;
            if (this.component) {
                await this.component.onDataReceived(subPort.name, data);
            }
            return true;
        }
        if (this.direction !== 'in' && this.direction !== 'inout') {
            console.error('Cannot receive via ' + this.name + ': invalid direction (' + this.direction + ')');
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
        console.log('Initializing connector ' + name);
        this.name = name;
        this.flows = flows;
        this.messageQueue = [];
        this.isProcessing = false;
    }

    async transmit(data) {
        console.log('Connector ' + this.name + ' transmitting data: ' + JSON.stringify(data));
        this.messageQueue.push(data);
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.messageQueue.length > 0) {
            const currentData = this.messageQueue.shift();
            for (const flow of this.flows) {
                console.log('Connector ' + this.name + ' processing flow from ' + flow.source + ' to ' + flow.target + ', type: ' + flow.type);
                if (flow.targetPort) {
                    await flow.targetPort.receive(currentData);
                } else {
                    console.warn('No target port defined for flow from ' + flow.source + ' to ' + flow.target);
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
        console.log('Creating binding from ' + sourceComponent.name + '.' + sourcePort.name + ' to ' + targetComponent.name + '.' + targetPort.name + ' via connector ' + connector.name);
        this.sourceComponent = sourceComponent;
        this.sourcePort = sourcePort;
        this.targetComponent = targetComponent;
        this.targetPort = targetPort;
        this.connector = connector;
        this.sourcePort.connector = connector;
        connector.flows.push({ source: sourcePort.name, target: targetPort.name, type: sourcePort.flowType || 'any', targetPort: this.targetPort });
    }

    async transmit(data) {
        console.log('Binding transmitting data ' + JSON.stringify(data) + ' from ' + this.sourceComponent.name + '.' + this.sourcePort.name + ' to ' + this.targetComponent.name + '.' + this.targetPort.name);
        await this.connector.transmit(data);
    }
}\n\n`;

    // Connector Classes
    jsCode += '// Connector Classes\n';
    model.connectors.forEach(conn => {
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
        console.log('Initializing component ' + name + ', isBoundary: ' + isBoundary);
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
        console.log('Port ' + port.name + ' added to component ' + this.name + ', flowType: ' + port.flowType);
    }

    async addSubComponent(name, component) {
        this.subComponents.set(name, component);
        console.log('SubComponent ' + name + ' added to ' + this.name);
    }

    async onDataReceived(portName, data) {
        console.log('Component ' + this.name + ' received data on port ' + portName + ': ' + JSON.stringify(data));
        this.state[portName] = data;
        console.log('Processing activities for component ' + this.name + ' due to data on ' + portName);
        for (const activity of this.activities) {
            console.log('Triggering activity ' + activity.methodName + ' in component ' + this.name);
            await this[activity.methodName]();
        }
        for (const [subCompName, subComp] of this.subComponents) {
            for (const activity of subComp.activities) {
                console.log('Triggering subcomponent activity ' + subCompName + '.' + activity.methodName);
                await this[subCompName + '_execute'](activity.methodName);
            }
        }
    }

    async start() {
        console.log('Starting component ' + this.name);
        if (this.isBoundary) {
            await this.simulateInput();
        }
        for (const subComp of this.subComponents.values()) {
            await subComp.start();
        }
    }

    async simulateInput() {
        console.log('Simulating input for component ' + this.name);
        for (const port of this.ports) {
            console.log('Processing port ' + port.name + ' with type ' + port.type + ', flowType: ' + port.flowType);
            if (!port.flowType || typeof port.flowType !== 'string') {
                console.warn('Skipping port ' + port.name + ' due to invalid flowType: ' + port.flowType);
                continue;
            }
            let simulatedValue;
            if (port.flowType.includes('emperature') || port.flowType === 'Real' || port.flowType === 'Int') {
                simulatedValue = 42.0;
                console.log('Simulating number input ' + simulatedValue + ' for ' + this.name + '.' + port.name);
            } else if (port.flowType === 'Boolean') {
                simulatedValue = true;
                console.log('Simulating boolean input ' + simulatedValue + ' for ' + this.name + '.' + port.name);
            } else if (this.modelTypes.find(t => t.name === port.flowType && t.kind === 'enum')) {
                const enumValues = this.modelTypes.find(t => t.name === port.flowType)?.content.match(/(\w+)/g) || ['Off'];
                simulatedValue = eval(port.flowType + '.' + enumValues[0]);
                console.log('Simulating enum input ' + simulatedValue + ' for ' + this.name + '.' + port.name);
            } else if (this.modelTypes.find(t => t.name === port.flowType && t.kind === 'datatype')) {
                simulatedValue = eval('new ' + port.flowType + '({})');
                console.log('Simulating datatype input for ' + this.name + '.' + port.name);
            } else {
                console.warn('Unsupported flow type ' + port.flowType + ' for port ' + this.name + '.' + port.name);
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
                const [name, type] = p.trim().split(':').map(s => s.trim());
                return name ? `${name}: this.state['${name}'] ?? null` : '';
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
                    const [name, type] = p.trim().split(':').map(s => s.trim());
                    return name ? `${name}: this.state['${name}'] ?? null` : '';
                }).filter(p => p).join(', ');
                actionCode += `            const ${action.id}_result = await ${executable.name}({ ${paramsList} });\n`;
                if (constraint) {
                    actionCode += `            console.log('Validating constraint ${constraint.name} for action ${action.id}');\n`;
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

                actionExecCode += actionCode;
            });

            delegates.forEach(delegate => {
                const targetPort = comp.ports?.find(p => p && (p.name === delegate.target || p.type === delegate.target));
                if (targetPort) {
                    actionExecCode += `            console.log('Delegating data from ${comp.name} to port ${targetPort.name} in activity ${activity.name}');\n`;
                    actionExecCode += `            const ${delegate.source}_port = this.ports.find(p => p.name === '${targetPort.name}');\n`;
                    actionExecCode += `            if (${delegate.source}_port) await ${delegate.source}_port.send(this.state['${delegate.source}']);\n`;
                }
            });

            const returnVal = (activity.outputs || '').trim() ?
                activity.outputs.split(',').map(o => {
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
                    jsCode += `        this.${instanceName}.activities.forEach(activity => this.activities.push({ methodName: '${instanceName}_execute' + activity.methodName }));\n`;
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
                    jsCode += `        console.log('Executing subcomponent activity ${instanceName}.' + methodName);\n`;
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
        jsCode += `    console.log('Executing executable ${exec.name} with params: ' + JSON.stringify(params));\n`;
        let body = exec.body?.trim() || '';
        body = body.replace(/(\w+)::(\w+)/g, (match, type, value) => {
            if (model.types.find(t => t.name === type && t.kind === 'enum')) {
                return `${type}.${value}`;
            }
            return `params["${type}"].${value}`;
        });
        body = body.replace(/(\w+)->(\w+)/g, `params["$1"].$2`);
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
                body = `    let ${param} = params["${param}"] ?? ${flowType};\n` + body;
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
            return `    let ${varName} = ${init};\n`;
        });
        const returnType = model.types.find(t => exec.outputs?.includes(t.name))?.name || 'null';
        if (!body.match(/return\s+[^;]+;/)) {
            if (returnType === 'Commands') {
                body += `    return new Commands({ heater: heater || Command.Off, cooler: cooler || Command.Off });\n`;
            } else {
                body += `    return null;\n`;
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
            return `params["${type}"].${value}`;
        });
        equation = equation.replace(/(\w+)->(\w+)/g, `params["$1"].$2`);
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
        (constraint.inputs || '').split(',').forEach(input => {
            const [name, type] = input.trim().split(':').map(s => s.trim());
            if (name && type) {
                const flowType = model.types.find(t => t.name === type);
                let defaultValue = 'null';
                if (flowType?.kind === 'datatype') defaultValue = `new ${type}({})`;
                if (flowType?.kind === 'enum') {
                    const enumValues = flowType.content?.match(/(\w+)/g) || ['Off'];
                    defaultValue = `${type}.${enumValues[0]}`;
                }
                if (type === 'Boolean') defaultValue = 'false';
                jsCode += `    let ${name} = params["${name}"] ?? ${defaultValue};\n`;
            }
        });
        (constraint.outputs || '').split(',').forEach(output => {
            const [name, type] = output.trim().split(':').map(s => s.trim());
            if (name && type) {
                const flowType = model.types.find(t => t.name === type);
                let defaultValue = 'null';
                if (flowType?.kind === 'datatype') defaultValue = `new ${type}({})`;
                if (flowType?.kind === 'enum') {
                    const enumValues = flowType.content?.match(/(\w+)/g) || ['Off'];
                    defaultValue = `${type}.${enumValues[0]}`;
                }
                if (type === 'Boolean') defaultValue = 'false';
                jsCode += `    let ${name} = params["${name}"] ?? ${defaultValue};\n`;
            }
        });
        const escapedEquation = equation.replace(/'/g, '\\\'').replace(/"/g, '\\"');
        try {
            new Function('params', 'return ' + equation);
        } catch (e) {
            console.error(`Invalid equation in constraint ${constraint.name}: ${equation}`);
            equation = 'true';
        }
        jsCode += `    console.log('Evaluating constraint ${constraint.name}: ' + '${escapedEquation}');\n`;
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
    jsCode += `        console.log('Component ' + name + ' added to system');\n`;
    jsCode += '    }\n\n';
    jsCode += '    async addConnector(name, connector) {\n';
    jsCode += '        this.connectors.set(name, connector);\n';
    jsCode += `        console.log('Connector ' + name + ' added to system');\n`;
    jsCode += '    }\n\n';
    jsCode += '    async addBinding(binding) {\n';
    jsCode += '        this.bindings.push(binding);\n';
    jsCode += `        console.log('Binding added: ' + binding.sourceComponent.name + '.' + binding.sourcePort.name + ' -> ' + binding.targetComponent.name + '.' + binding.targetPort.name + ' via ' + binding.connector.name);\n`;
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
    jsCode += `    const system = new ${model.name || 'SysADLModel'}();\n`;

    // Add components and subcomponents
    const topLevelComps = model.components.filter(comp => {
        return !model.components.some(c => c.configuration?.includes(comp.name));
    });
    topLevelComps.forEach(comp => {
        const instanceName = comp.name.charAt(0).toLowerCase() + comp.name.slice(1);
        jsCode += `    const ${instanceName} = new ${comp.name}();\n`;
        jsCode += `    await system.addComponent('${comp.name}', ${instanceName});\n`;
        if (comp.configuration) {
            const subComponents = comp.configuration.match(/components\s*:\s*([^;]+)/)?.[1] || '';
            subComponents.split(',').forEach(subComp => {
                const match = subComp.match(/(\w+)\s*:\s*(\w+)\s*(?:{([^}]*)})?/);
                if (match) {
                    const [, subInstanceName, subCompType, portsStr] = match;
                    jsCode += `    const ${subInstanceName} = new ${subCompType}();\n`;
                    jsCode += `    await system.addComponent('${subCompType}_${subInstanceName}', ${subInstanceName});\n`;
                    jsCode += `    await ${instanceName}.addSubComponent('${subInstanceName}', ${subInstanceName});\n`;
                    if (portsStr) {
                        const subPorts = portsStr.match(/using ports\s*:\s*([^}]+)/)?.[1] || '';
                        subPorts.split(';').forEach(port => {
                            const portMatch = port.match(/(\w+)\s*:\s*(\w+)/);
                            if (portMatch) {
                                const [, portName, portType] = portMatch;
                                const portDef = model.ports.find(p => p.name === portType);
                                const direction = portDef?.flows?.[0]?.direction || 'inout';
                                const flowType = portDef?.flows?.[0]?.type || 'any';
                                jsCode += `    await ${subInstanceName}.addPort(new SysADLPort('${portName}', '${portType}', '${direction}', [], '${flowType}'));\n`;
                            }
                        });
                    }
                }
            });
        }
    });

    // Add connectors
    jsCode += '\n    // Initialize connectors\n';
    model.connectors.forEach(conn => {
        const instanceName = conn.name.charAt(0).toLowerCase() + conn.name.slice(1);
        jsCode += `    const ${instanceName} = new ${conn.name}();\n`;
        jsCode += `    await system.addConnector('${conn.name}', ${instanceName});\n`;
    });

    // Configure bindings
    jsCode += '\n    // Configure bindings\n';
    (model.connectors || []).forEach(conn => {
        if (conn.bindings) {
            conn.bindings.forEach(b => {
                const [sourceCompName, sourcePortName] = b.source.split('.');
                const [targetCompName, targetPortName] = b.target.split('.');
                const sourceComp = model.components.find(c => c.name === sourceCompName || c.configuration?.includes(sourceCompName));
                const targetComp = model.components.find(c => c.name === targetCompName || c.configuration?.includes(targetCompName));
                if (sourceComp && targetComp) {
                    const sourceCompInstance = sourceComp.configuration?.includes(sourceCompName) ? `${sourceComp.name}_${sourceCompName}` : sourceCompName;
                    const targetCompInstance = targetComp.configuration?.includes(targetCompName) ? `${targetComp.name}_${targetCompName}` : targetCompName;
                    jsCode += `    await system.addBinding(new Binding(\n`;
                    jsCode += `        system.components.get('${sourceCompInstance}'),\n`;
                    jsCode += `        system.components.get('${sourceCompInstance}').ports.find(p => p && (p.name === '${sourcePortName}' || p.type === '${sourcePortName}')),\n`;
                    jsCode += `        system.components.get('${targetCompInstance}'),\n`;
                    jsCode += `        system.components.get('${targetCompInstance}').ports.find(p => p && (p.name === '${targetPortName}' || p.type === '${targetPortName}')),\n`;
                    jsCode += `        system.connectors.get('${conn.name}')\n`;
                    jsCode += `    ));\n`;
                }
            });
        }
    });
    model.components.forEach(comp => {
        if (comp.configuration) {
            const connectors = comp.configuration.match(/connectors\s*:\s*([^}]+)/)?.[1] || '';
            connectors.split(';').forEach(conn => {
                const match = conn.match(/(\w+)\s*:\s*(\w+)\s*bindings\s*([^=]+)\s*=\s*([^;]+)/);
                if (match) {
                    const [, connInstance, connType, source, target] = match;
                    const [sourceCompName, sourcePortName] = source.trim().split('.');
                    const [targetCompName, targetPortName] = target.trim().split('.');
                    const sourceComp = model.components.find(c => c.name === sourceCompName || c.configuration?.includes(sourceCompName));
                    const targetComp = model.components.find(c => c.name === targetCompName || c.configuration?.includes(targetCompName));
                    if (sourceComp && targetComp) {
                        const sourceCompInstance = sourceComp.configuration?.includes(sourceCompName) ? `${sourceComp.name}_${sourceCompName}` : sourceCompName;
                        const targetCompInstance = targetComp.configuration?.includes(targetCompName) ? `${targetComp.name}_${targetCompName}` : targetCompName;
                        jsCode += `    await system.addBinding(new Binding(\n`;
                        jsCode += `        system.components.get('${sourceCompInstance}'),\n`;
                        jsCode += `        system.components.get('${sourceCompInstance}').ports.find(p => p && (p.name === '${sourcePortName}' || p.type === '${sourcePortName}')),\n`;
                        jsCode += `        system.components.get('${targetCompInstance}'),\n`;
                        jsCode += `        system.components.get('${targetCompInstance}').ports.find(p => p && (p.name === '${targetPortName}' || p.type === '${targetPortName}')),\n`;
                        jsCode += `        system.connectors.get('${connType}_${connInstance}') || new ${connType}()\n`;
                        jsCode += `    ));\n`;
                    }
                }
            });
        }
    });

    // Configure delegations
    jsCode += '\n    // Configure delegations\n';
    model.components.forEach(comp => {
        if (comp.delegations) {
            comp.delegations.forEach(d => {
                const sourcePort = comp.ports?.find(p => p && (p.name === d.source || p.type === d.source));
                const targetPort = comp.ports?.find(p => p && (p.name === d.target || p.type === d.target));
                if (sourcePort && targetPort) {
                    jsCode += `    {\n`;
                    jsCode += `        const comp = system.components.get('${comp.name}');\n`;
                    jsCode += `        const sourcePort = comp.ports.find(p => p && (p.name === '${d.source}' || p.type === '${d.source}'));\n`;
                    jsCode += `        const targetPort = comp.ports.find(p => p && (p.name === '${d.target}' || p.type === '${d.target}'));\n`;
                    jsCode += `        if (sourcePort && targetPort) {\n`;
                    jsCode += `            console.log('Configuring delegation from ${comp.name}.${sourcePort.name} to ${comp.name}.${targetPort.name}');\n`;
                    jsCode += `            sourcePort.receive = async (data, subPortName) => {\n`;
                    jsCode += `                console.log('Delegating data ' + JSON.stringify(data) + ' from ${comp.name}.' + sourcePort.name + ' to ${comp.name}.' + targetPort.name);\n`;
                    jsCode += `                await targetPort.receive(data, subPortName);\n`;
                    jsCode += `                await comp.onDataReceived(targetPort.name, data);\n`;
                    jsCode += `            };\n`;
                    jsCode += `        }\n`;
                    jsCode += `    }\n`;
                }
            });
        }
    });

    jsCode += '\n    await system.start();\n';
    jsCode += `    console.log('System simulation completed');\n`;
    jsCode += '}\n\n';

    jsCode += `main().catch(err => console.error('Error in execution: ' + err.message));\n`;

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
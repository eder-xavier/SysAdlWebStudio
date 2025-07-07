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
        console.log('Model ports:', JSON.stringify(parsedData.ports, null, 2));
        console.log('Model types:', JSON.stringify(parsedData.types, null, 2));
        let jsCode = await generateJsCode(parsedData);
        console.log('Generated code type:', typeof jsCode);
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
    let jsCode = '// Generated JavaScript code for SysADL Model: ' + model.name + '\n\n';

    // Validate model.ports and model.types
    if (!model.ports || !Array.isArray(model.ports)) {
        console.error('Invalid or missing model.ports:', model.ports);
        throw new Error('Model ports are undefined or not an array');
    }
    if (!model.types || !Array.isArray(model.types)) {
        console.error('Invalid or missing model.types:', model.types);
        throw new Error('Model types are undefined or not an array');
    }
    console.log('Model ports:', JSON.stringify(model.ports, null, 2));
    console.log('Model types:', JSON.stringify(model.types, null, 2));

    // Define ports and types as constants
    jsCode += '// Model Metadata\n';
    jsCode += 'const modelPorts = ' + JSON.stringify(model.ports || []) + ';\n';
    jsCode += 'const modelTypes = ' + JSON.stringify(model.types || []) + ';\n\n';

    // Map SysADL types to JavaScript
    const typeMap = {};
    jsCode += '// Types\n';
    try {
        model.types.forEach(type => {
            if (type.kind === 'value type') {
                typeMap[type.name] = 'any';
                jsCode += 'const ' + type.name + ' = \'any\'; // Value type\n';
            } else if (type.kind === 'datatype') {
                typeMap[type.name] = type.name;
                const attributes = type.content?.match(/attributes\s*:\s*([^;]+)/)?.[1] || '';
                jsCode += 'class ' + type.name + ' {\n    constructor(params = {}) {\n';
                attributes.split(',').forEach(attr => {
                    const match = attr.match(/(\w+)\s*:\s*(\w+)/);
                    if (match) {
                        const attrType = model.types.find(t => t.name === match[2]);
                        let defaultValue = 'null';
                        if (attrType?.kind === 'enum') defaultValue = match[2] + '.Off';
                        else if (attrType?.kind === 'datatype') defaultValue = 'new ' + match[2] + '()';
                        else if (match[2] === 'Boolean') defaultValue = 'false';
                        jsCode += '        this.' + match[1] + ' = params["' + match[1] + '"] ?? ' + defaultValue + ';\n';
                    }
                });
                jsCode += '    }\n}\n';
            } else if (type.kind === 'enum') {
                const enumValues = type.content?.match(/(\w+)/g) || [];
                typeMap[type.name] = enumValues.map(v => `'${v}'`).join(' | ');
                jsCode += 'const ' + type.name + ' = Object.freeze({ ' + enumValues.map(v => v + ': \'' + v + '\'').join(', ') + ' });\n';
            }
        });
        jsCode += '\n';
    } catch (error) {
        console.error('Error processing types:', error);
        throw new Error('Failed to process types: ' + error.message);
    }

    // Base Port Class
    jsCode += '// Base Port Class\n';
    jsCode += `class SysADLPort {
    constructor(name, type, direction = 'inout', subPorts = [], flowType = 'any') {
        console.log('Initializing port ' + name + ' with type ' + type + ', direction ' + direction + ', flowType ' + flowType);
        this.name = name;
        this.type = type;
        this.direction = direction;
        this.flowType = flowType || 'any';
        this.value = null;
        this.subPorts = new Map(subPorts.map(sp => {
            console.log('Initializing subPort ' + sp.name + ' with type ' + sp.type + ', flowType ' + (sp.flowType || 'any'));
            return [sp.name, sp];
        }));
        this.connector = null;
    }

    async send(data, subPortName = null) {
        console.log('Port ' + this.name + ' sending data: ' + data + (subPortName ? ' via subPort ' + subPortName : ''));
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
        console.log('Port ' + this.name + ' receiving data: ' + data + (subPortName ? ' via subPort ' + subPortName : ''));
        if (this.subPorts.size > 0 && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'in' && subPort.direction !== 'inout')) {
                console.error('Cannot receive via subPort ' + subPortName + ' in ' + this.name + ': invalid direction');
                return false;
            }
            subPort.value = data;
            return true;
        }
        if (this.direction !== 'in' && this.direction !== 'inout') {
            console.error('Cannot receive via ' + this.name + ': invalid direction (' + this.direction + ')');
            return false;
        }
        this.value = data;
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
        console.log('Connector ' + this.name + ' transmitting data: ' + data);
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
        console.log('Binding transmitting data ' + data + ' from ' + this.sourceComponent.name + '.' + this.sourcePort.name + ' to ' + this.targetComponent.name + '.' + this.targetPort.name);
        await this.connector.transmit(data);
    }
}\n\n`;

    // Generate connector classes
    jsCode += '// Connector Classes\n';
    try {
        model.connectors.forEach(conn => {
            jsCode += 'class ' + conn.name + ' extends SysADLConnector {\n';
            jsCode += '    constructor() {\n';
            jsCode += '        super(\'' + conn.name + '\', [\n';
            jsCode += '            ' + conn.flows.map(f => '{ type: \'' + (f.type || 'any') + '\', source: \'' + f.source + '\', target: \'' + f.target + '\' }').join(', ') + '\n';
            jsCode += '        ]);\n';
            jsCode += '    }\n';
            jsCode += '}\n\n';
        });
    } catch (error) {
        console.error('Error processing connectors:', error);
        throw new Error('Failed to process connectors: ' + error.message);
    }

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
    }

    async addPort(port) {
        this.ports.push(port);
        console.log('Port ' + port.name + ' added to component ' + this.name + ', flowType: ' + port.flowType);
    }

    async onDataReceived(portName, data) {
        console.log('Component ' + this.name + ' received ' + data + ' on port ' + portName);
        this.state[portName] = data;
        for (const activity of this.activities) {
            console.log('Triggering activity ' + activity.methodName + ' in component ' + this.name);
            await this[activity.methodName]();
        }
    }

    async start() {
        console.log('Starting component ' + this.name);
        if (this.isBoundary) {
            await this.simulateInput();
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
                const enumValues = this.modelTypes.find(t => t.name === port.flowType)?.content.match(/(\\w+)/g) || ['Off'];
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

    // Generate component classes
    jsCode += '// Component Classes\n';
    try {
        model.components.forEach(comp => {
            console.log('Processing component:', comp.name, 'Ports:', JSON.stringify(comp.ports, null, 2));
            if (!comp.ports || !Array.isArray(comp.ports)) {
                console.warn('Component ' + comp.name + ' has no valid ports array:', comp.ports);
                comp.ports = [];
            }
            const isBoundary = comp.configuration?.includes('boundary') || false;
            const allocatedActivities = model.allocations
                .filter(a => a.target === comp.name && a.type === 'activity')
                .map(a => model.activities.find(act => act.name === a.source))
                .filter(act => act);

            const activityMethods = allocatedActivities.map(activity => {
                const paramsInit = activity.inputs.split(',').map(p => {
                    const [name, type] = p.trim().split(':').map(s => s.trim());
                    return name ? (name + ': this.state[\'' + name + '\'] ?? null') : '';
                }).filter(p => p).join(', ');
                let actionExecCode = '';
                const dataStores = activity.dataStores || [];
                const flows = activity.flows || [];
                const delegates = activity.delegates || [];

                dataStores.forEach(ds => {
                    const flowType = model.types.find(t => t.name === ds.type);
                    let defaultValue = 'null';
                    if (flowType?.kind === 'enum') defaultValue = ds.type + '.Off';
                    else if (flowType?.kind === 'datatype') defaultValue = 'new ' + ds.type + '()';
                    else if (ds.type === 'Boolean') defaultValue = 'false';
                    actionExecCode += '        let ' + ds.name + ' = this.state[\'' + ds.name + '\'] ?? ' + defaultValue + ';\n';
                });

                activity.actions.forEach(action => {
                    const execAlloc = model.allocations.find(a => a.type === 'executable' && a.target === action.name);
                    if (!execAlloc) return;
                    const executable = model.executables.find(e => e.name === execAlloc.source);
                    if (!executable) return;

                    const constraint = model.constraints.find(c => action.body?.includes(c.name));
                    let actionCode = '            console.log(\'Executing action ' + action.id + ' with executable ' + executable.name + '\');\n';
                    actionCode += '            const ' + action.id + '_result = await ' + executable.name + '(params);\n';
                    if (constraint) {
                        actionCode = '            console.log(\'Validating constraint ' + constraint.name + '\');\n' +
                                     '            try {\n' +
                                     '                await validate' + constraint.name + '(params);\n' +
                                     '            } catch (e) {\n' +
                                     '                console.error(\'Constraint ' + constraint.name + ' violated: \' + e.message);\n' +
                                     '                return null;\n' +
                                     '            }\n' + actionCode;
                    }

                    flows.forEach(flow => {
                        if (flow.source === action.id) {
                            actionCode += '            console.log(\'Storing result \' + ' + action.id + '_result + \' to state ' + flow.target + '\');\n';
                            actionCode += '            this.state[\'' + flow.target + '\'] = ' + action.id + '_result;\n';
                        }
                    });

                    actionExecCode += actionCode;
                });

                delegates.forEach(delegate => {
                    const targetPort = comp.ports.find(p => p.name === delegate.target || p.type === delegate.target);
                    if (targetPort) {
                        actionExecCode += '            console.log(\'Delegating data from ' + comp.name + ' to port ' + targetPort.name + '\');\n';
                        actionExecCode += '            const ' + delegate.source + '_port = this.ports.find(p => p.name === \'' + targetPort.name + '\');\n';
                        actionExecCode += '            if (' + delegate.source + '_port) await ' + delegate.source + '_port.send(this.state[\'' + delegate.source + '\']);\n';
                    }
                });

                const returnVal = activity.outputs && activity.outputs.trim() ?
                    activity.outputs.split(',').map(o => {
                        const [name] = o.trim().split(':').map(s => s.trim());
                        return name ? 'this.state[\'' + name + '\']' : null;
                    }).filter(name => name).join(' || ') || 'null' : 'null';

                return {
                    methodName: 'execute' + activity.name,
                    code: '\n    async execute' + activity.name + '() {\n' +
                          '        console.log(\'Executing activity ' + activity.name + ' in \' + this.name);\n' +
                          '        const params = { ' + paramsInit + ' };\n' +
                          actionExecCode +
                          '        console.log(\'Activity ' + activity.name + ' returning: \' + ' + returnVal + ');\n' +
                          '        return ' + returnVal + ';\n' +
                          '    }'
                };
            });

            jsCode += 'class ' + comp.name + ' extends SysADLComponent {\n';
            jsCode += '    constructor() {\n';
            jsCode += '        super(\'' + comp.name + '\', ' + isBoundary + ', modelPorts, modelTypes);\n';
            jsCode += '        // Initialize ports\n';
            comp.ports.forEach(port => {
                if (!port || !port.name || !port.type) {
                    console.warn('Invalid port in component ' + comp.name + ':', port);
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
                jsCode += '        this.addPort(new SysADLPort(\'' + port.name + '\', \'' + port.type + '\', \'' + direction + '\', [' + 
                          subPorts.map(sp => '{ name: \'' + sp.name + '\', type: \'' + sp.type + '\', direction: \'' + sp.direction + '\', flowType: \'' + sp.flowType + '\' }').join(', ') + 
                          '], \'' + flowType + '\'));\n';
            });

            jsCode += '\n        // Initialize state\n';
            comp.ports.forEach(port => {
                if (!port || !port.name || !port.type) {
                    console.warn('Invalid port in state initialization for component ' + comp.name + ':', port);
                    return;
                }
                const portDef = model.ports.find(p => p.name === port.type);
                const flowType = portDef?.flows?.[0]?.type || 'any';
                let defaultValue = 'null';
                if (flowType === 'Boolean') defaultValue = 'false';
                else if (model.types.find(t => t.name === flowType && t.kind === 'enum')) {
                    const enumValues = model.types.find(t => t.name === flowType)?.content.match(/(\\w+)/g) || [];
                    defaultValue = flowType + '.' + (enumValues[0] || 'Off');
                } else if (model.types.find(t => t.name === flowType && t.kind === 'datatype')) {
                    defaultValue = 'new ' + flowType + '({})';
                }
                jsCode += '        this.state[\'' + port.name + '\'] = ' + defaultValue + ';\n';
            });

            jsCode += '\n        // Register activities\n';
            activityMethods.forEach(a => {
                jsCode += '        this.activities.push({ methodName: \'' + a.methodName + '\' });\n';
            });
            jsCode += '    }\n';
            activityMethods.forEach(a => {
                jsCode += a.code + '\n';
            });
            jsCode += '}\n\n';
        });
    } catch (error) {
        console.error('Error processing components:', error);
        throw new Error('Failed to process components: ' + error.message);
    }

    // Generate executable functions
    jsCode += '// Executables\n';
    try {
        model.executables.forEach(exec => {
            jsCode += 'async function ' + exec.name + '(params = {}) {\n';
            let body = exec.body?.trim() || '';
            body = body.replace(/(\w+)::(\w+)/g, (match, type, value) => {
                if (model.types.find(t => t.name === type && t.kind === 'enum')) {
                    return type + '.' + value;
                }
                return 'params["' + type + '"]?.' + value + ' ?? null';
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
                    const flowType = model.types.find(t => t.name === param && t.kind === 'datatype') ? 'new ' + param + '()' :
                        model.types.find(t => t.name === param && t.kind === 'enum') ? param + '.Off' : 'null';
                    body = '    let ' + param + ' = params["' + param + '"] ?? ' + flowType + ';\n' + body;
                }
            });
            body = body.replace(/let\s+(\w+)\s*:\s*(\w+)(?:\s*=\s*([\w:.]+))?/g, (match, varName, typeName, initValue) => {
                const type = model.types.find(t => t.name === typeName);
                let init = initValue || (type?.kind === 'datatype' ? 'new ' + typeName + '()' :
                    type?.kind === 'enum' ? typeName + '.Off' : 'null');
                if (init && init.includes('::')) {
                    const [type, value] = init.split('::');
                    if (model.types.find(t => t.name === type && t.kind === 'enum')) {
                        init = type + '.' + value;
                    }
                }
                return '    let ' + varName + ' = ' + init + ';';
            });
            jsCode += '    console.log(\'Executing executable ' + exec.name + ' with params: \' + JSON.stringify(params));\n';
            jsCode += body + '\n';
            jsCode += '}\n\n';
        });
    } catch (error) {
        console.error('Error processing executables:', error);
        throw new Error('Failed to process executables: ' + error.message);
    }

    // Generate constraint functions
    jsCode += '// Constraints\n';
    try {
        model.constraints.forEach(constraint => {
            jsCode += 'async function validate' + constraint.name + '(params = {}) {\n';
            let equation = constraint.equation || 'true';
            equation = equation.replace(/(\w+)::(\w+)/g, (match, type, value) => {
                if (model.types.find(t => t.name === type && t.kind === 'enum')) {
                    return type + '.' + value;
                }
                return 'params["' + type + '"]?.' + value + ' ?? null';
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
                    .flatMap(t => (t.content.match(/(\w+)/g) || []).map(v => t.name + '.' + v))
            ]);
            equation = equation.replace(/\b(\w+)\b/g, (match) => {
                if (protectedIdentifiers.has(match) ||
                    match.includes('.') ||
                    match.match(/^\d+$/) ||
                    definedVars.has(match)) {
                    return match;
                }
                definedVars.add(match);
                return 'params["' + match + '"]';
            });
            equation = equation.replace(/==/g, '===');
            equation = equation.replace(/(\w+\s*[><=]+\s*[^?]+)\s*\?\s*([^:]+)\s*:\s*([^;]+)/g, '($1) ? ($2) : ($3)');
            constraint.inputs.split(',').forEach(input => {
                const [name, type] = input.trim().split(':').map(s => s.trim());
                if (name && type) {
                    const flowType = model.types.find(t => t.name === type);
                    let defaultValue = 'null';
                    if (flowType?.kind === 'datatype') defaultValue = 'new ' + type + '()';
                    if (flowType?.kind === 'enum') {
                        const enumValues = flowType.content?.match(/(\w+)/g) || ['Off'];
                        defaultValue = type + '.' + enumValues[0];
                    }
                    if (type === 'Boolean') defaultValue = 'false';
                    jsCode += '    let ' + name + ' = params["' + name + '"] ?? ' + defaultValue + ';\n';
                }
            });
            constraint.outputs.split(',').forEach(output => {
                const [name, type] = output.trim().split(':').map(s => s.trim());
                if (name && type) {
                    const flowType = model.types.find(t => t.name === type);
                    let defaultValue = 'null';
                    if (flowType?.kind === 'datatype') defaultValue = 'new ' + type + '()';
                    if (flowType?.kind === 'enum') {
                        const enumValues = flowType.content?.match(/(\w+)/g) || ['Off'];
                        defaultValue = type + '.' + enumValues[0];
                    }
                    if (type === 'Boolean') defaultValue = 'false';
                    jsCode += '    let ' + name + ' = params["' + name + '"] ?? ' + defaultValue + ';\n';
                }
            });
            try {
                new Function('params', 'return ' + equation);
            } catch (e) {
                console.error('Invalid equation in constraint ' + constraint.name + ': ' + equation);
                equation = 'true';
            }
            jsCode += '    console.log(\'Evaluating constraint ' + constraint.name + ': \' + \'' + equation + '\');\n';
            jsCode += '    const result = ' + equation + ';\n';
            jsCode += '    if (!result) {\n';
            jsCode += '        throw new Error(\'Constraint ' + constraint.name + ' violated\');\n';
            jsCode += '    }\n';
            jsCode += '    console.log(\'Constraint ' + constraint.name + ' passed\');\n';
            jsCode += '    return result;\n';
            jsCode += '}\n\n';
        });
    } catch (error) {
        console.error('Error processing constraints:', error);
        throw new Error('Failed to process constraints: ' + error.message);
    }

    // System class
    jsCode += 'class ' + model.name + ' {\n';
    jsCode += '    constructor() {\n';
    jsCode += '        console.log(\'Initializing system ' + model.name + '\');\n';
    jsCode += '        this.components = new Map();\n';
    jsCode += '        this.connectors = new Map();\n';
    jsCode += '        this.bindings = [];\n';
    jsCode += '        this.ports = [];\n';
    jsCode += '    }\n\n';
    jsCode += '    async addComponent(name, component) {\n';
    jsCode += '        this.components.set(name, component);\n';
    jsCode += '        this.ports.push(...component.ports);\n';
    jsCode += '        console.log(\'Component \' + name + \' added to system\');\n';
    jsCode += '    }\n\n';
    jsCode += '    async addConnector(name, connector) {\n';
    jsCode += '        this.connectors.set(name, connector);\n';
    jsCode += '        console.log(\'Connector \' + name + \' added to system\');\n';
    jsCode += '    }\n\n';
    jsCode += '    async addBinding(binding) {\n';
    jsCode += '        this.bindings.push(binding);\n';
    jsCode += '        console.log(\'Binding added: \' + binding.sourceComponent.name + \'.\' + binding.sourcePort.name + \' -> \' + binding.targetComponent.name + \'.\' + binding.targetPort.name);\n';
    jsCode += '    }\n\n';
    jsCode += '    async start() {\n';
    jsCode += '        console.log(\'System ' + model.name + ' starting\');\n';
    jsCode += '        await Promise.all(Array.from(this.components.values()).map(c => c.start()));\n';
    jsCode += '        console.log(\'System ' + model.name + ' simulation completed\');\n';
    jsCode += '    }\n';
    jsCode += '}\n\n';

    // Main function
    jsCode += '// Main Function\n';
    jsCode += 'async function main() {\n';
    jsCode += '    console.log(\'Starting simulation of ' + model.name + '\');\n';
    jsCode += '    const system = new ' + model.name + '();\n';

    try {
        const topLevelComps = model.components.filter(comp => {
            return !model.components.some(c => c.configuration?.includes(comp.name));
        });
        topLevelComps.forEach(comp => {
            const instanceName = comp.name.toLowerCase();
            jsCode += '    const ' + instanceName + ' = new ' + comp.name + '();\n';
            jsCode += '    await system.addComponent(\'' + comp.name + '\', ' + instanceName + ');\n';
        });

        model.connectors.forEach(conn => {
            const instanceName = conn.name.toLowerCase();
            jsCode += '    const ' + instanceName + ' = new ' + conn.name + '();\n';
            jsCode += '    await system.addConnector(\'' + conn.name + '\', ' + instanceName + ');\n';
        });

        model.connectors.forEach(conn => {
            const connectorName = conn.name.toLowerCase();
            if (conn.bindings) {
                conn.bindings.forEach(b => {
                    const sourceComp = model.components.find(c => c.ports && c.ports.some(p => p && (p.name === b.source || p.type === b.source)));
                    const targetComp = model.components.find(c => c.ports && c.ports.some(p => p && (p.name === b.target || p.type === b.target)));
                    if (sourceComp && targetComp) {
                        jsCode += '    {\n';
                        jsCode += '        const sourceComp = system.components.get(\'' + sourceComp.name + '\');\n';
                        jsCode += '        const targetComp = system.components.get(\'' + targetComp.name + '\');\n';
                        jsCode += '        const sourcePort = sourceComp.ports.find(p => p && (p.name === \'' + b.source + '\' || p.type === \'' + b.source + '\'));\n';
                        jsCode += '        const targetPort = targetComp.ports.find(p => p && (p.name === \'' + b.target + '\' || p.type === \'' + b.target + '\'));\n';
                        jsCode += '        if (sourcePort && targetPort) {\n';
                        jsCode += '            const binding = new Binding(sourceComp, sourcePort, targetComp, targetPort, ' + connectorName + ');\n';
                        jsCode += '            system.addBinding(binding);\n';
                        jsCode += '        } else {\n';
                        jsCode += '            console.warn(\'Cannot create binding: sourcePort \' + (sourcePort ? sourcePort.name : \'not found\') + \' or targetPort \' + (targetPort ? targetPort.name : \'not found\') + \' undefined\');\n';
                        jsCode += '        }\n';
                        jsCode += '    }\n';
                    }
                });
            }
        });

        model.components.forEach(comp => {
            if (comp.delegations) {
                comp.delegations.forEach(d => {
                    const sourcePort = comp.ports.find(p => p && (p.name === d.source || p.type === d.source));
                    const targetPort = comp.ports.find(p => p && (p.name === d.target || p.type === d.target));
                    if (sourcePort && targetPort) {
                        jsCode += '    {\n';
                        jsCode += '        const comp = system.components.get(\'' + comp.name + '\');\n';
                        jsCode += '        const sourcePort = comp.ports.find(p => p && (p.name === \'' + d.source + '\' || p.type === \'' + d.source + '\'));\n';
                        jsCode += '        const targetPort = comp.ports.find(p => p && (p.name === \'' + d.target + '\' || p.type === \'' + d.target + '\'));\n';
                        jsCode += '        if (sourcePort && targetPort) {\n';
                        jsCode += '            sourcePort.receive = async (data, subPortName) => {\n';
                        jsCode += '                console.log(\'Delegating data \' + data + \' from ' + comp.name + '.\' + sourcePort.name + \' to ' + comp.name + '.\' + targetPort.name);\n';
                        jsCode += '                await targetPort.receive(data, subPortName);\n';
                        jsCode += '            };\n';
                        jsCode += '        }\n';
                        jsCode += '    }\n';
                    }
                });
            }
        });

        jsCode += '    await system.start();\n';
        jsCode += '    console.log(\'System simulation completed\');\n';
        jsCode += '}\n\n';

        jsCode += 'main().catch(err => console.error(\'Error in execution: \' + err.message));\n';
    } catch (error) {
        console.error('Error generating main function:', error);
        throw new Error('Failed to generate main function: ' + error.message);
    }

    if (typeof jsCode !== 'string') {
        console.error('generateJsCode produced non-string output:', jsCode);
        throw new Error('generateJsCode did not produce a string, got ' + typeof jsCode);
    }
    console.log('Final jsCode length:', jsCode.length);
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
    a.download = 'generated-' + (sysadlEditor.getValue().match(/Model\s+(\w+)/)?.[1] || 'sysadl') + '.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}
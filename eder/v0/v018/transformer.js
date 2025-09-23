// Função para transformar o código SysADL em JavaScript
function transformToJavaScript() {
    const content = sysadlEditor.getValue();
    if (!content.trim()) {
        jsEditor.setValue('No SysADL code to transform.');
        return;
    }

    try {
        const parsedData = parseSysADL(content);
        const jsCode = generateJsCode(parsedData);
        jsEditor.setValue(jsCode);
    } catch (error) {
        jsEditor.setValue(`Error transforming to JavaScript: ${error.message}`);
    }
}

// Função para gerar o código JavaScript a partir do modelo parseado
function generateJsCode(model) {
    let jsCode = `// Generated JavaScript code for SysADL Model: ${model.name}\n\n`;

    // Mapa de tipos SysADL para JavaScript
    const typeMap = {};
    jsCode += '// Types\n';
    model.types.forEach(type => {
        if (type.kind === 'value type') {
            typeMap[type.name] = 'any';
            jsCode += `const ${type.name} = 'any'; // Value type\n`;
        } else if (type.kind === 'datatype') {
            typeMap[type.name] = type.name;
            const attributes = type.content.match(/attributes\s*:\s*([^;]+)/)?.[1] || '';
            jsCode += `class ${type.name} {\n    constructor() {\n`;
            attributes.split(',').forEach(attr => {
                const match = attr.match(/(\w+)\s*:\s*(\w+)/);
                if (match) {
                    jsCode += `        this.${match[1]} = null;\n`;
                }
            });
            jsCode += `    }\n}\n`;
        } else if (type.kind === 'enum') {
            const enumValues = type.content.match(/(\w+)/g) || [];
            typeMap[type.name] = enumValues.map(v => `'${v}'`).join(' | ');
            jsCode += `const ${type.name} = { ${enumValues.map(v => `${v}: '${v}'`).join(', ')} };\n`;
        }
    });
    jsCode += '\n';

    // Definir runtime básico
    jsCode += `// Runtime Environment\n`;
    jsCode += `class SysADLComponent {
    constructor(name) {
        this.name = name;
        this.ports = new Map();
        this.subscribers = new Map();
        this.subComponents = new Map();
        this.connectors = new Map();
        this.state = {};
    }

    addPort(name, type, direction) {
        this.ports.set(name, { type, direction, value: null });
    }

    send(portName, data) {
        const port = this.ports.get(portName);
        if (port && (port.direction === 'out' || port.direction === 'inout')) {
            port.value = data;
            const subs = this.subscribers.get(portName) || [];
            subs.forEach(sub => {
                if (typeof sub.callback === 'function') {
                    sub.callback(data);
                }
            });
        }
    }

    receive(portName, data) {
        const port = this.ports.get(portName);
        if (port && (port.direction === 'in' || port.direction === 'inout')) {
            port.value = data;
            this.state[portName] = data;
        }
    }

    subscribe(portName, subscriber, callback) {
        const subs = this.subscribers.get(portName) || [];
        subs.push({ subscriber, callback });
        this.subscribers.set(portName, subs);
    }
}\n\n`;

    // Gerar classes para componentes
    jsCode += '// Components\n';
    model.components.forEach(comp => {
        jsCode += `class ${comp.name} extends SysADLComponent {
    constructor() {
        super('${comp.name}');
        // Initialize ports\n`;
        comp.ports.forEach(portStr => {
            const match = portStr.match(/(\w+)\s*:\s*(\w+)/);
            if (match) {
                const portName = match[1];
                const portType = match[2];
                const portDef = model.ports.find(p => p.name === portType);
                if (portDef) {
                    if (portDef.flows.length) {
                        portDef.flows.forEach(flow => {
                            jsCode += `        this.addPort('${portName}', '${flow.type}', '${flow.direction}');\n`;
                        });
                    } else if (portDef.ports.length) {
                        portDef.ports.forEach(subPort => {
                            const subMatch = subPort.match(/(\w+)\s*:\s*(\w+)/);
                            if (subMatch) {
                                const subPortName = subMatch[1];
                                const subPortType = subMatch[2];
                                const subPortDef = model.ports.find(p => p.name === subPortType);
                                if (subPortDef && subPortDef.flows) {
                                    subPortDef.flows.forEach(flow => {
                                        jsCode += `        this.addPort('${subPortName}', '${flow.type}', '${flow.direction}');\n`;
                                    });
                                }
                            }
                        });
                    }
                }
            }
        });

        // Initialize configuration
        if (comp.configuration) {
            jsCode += `        // Configuration\n`;
            const subCompsMatch = comp.configuration.match(/components\s*:\s*{([^}]*)}/s);
            if (subCompsMatch) {
                subCompsMatch[1].split(';').forEach(line => {
                    const match = line.match(/(\w+)\s*:\s*(\w+)(?:\s*\[\s*(\d+),\s*([-]?\d+)\s*\])?/);
                    if (match) {
                        const [, name, type] = match;
                        jsCode += `        this.subComponents.set('${name}', new ${type}());\n`;
                    }
                });
            }
            const connsMatch = comp.configuration.match(/connectors\s*:\s*{([^}]*)}/s);
            if (connsMatch) {
                connsMatch[1].split(';').forEach(conn => {
                    const match = conn.match(/(\w+)\s*:\s*(\w+)/);
                    if (match) {
                        const [, name, type] = match;
                        jsCode += `        this.connectors.set('${name}', new ${type}());\n`;
                    }
                });
            }
            const bindingsMatch = comp.configuration.match(/bindings\s*:\s*{([^}]*)}/s);
            if (bindingsMatch) {
                bindingsMatch[1].split(';').forEach(binding => {
                    const match = binding.match(/(\w+)\.(\w+)\s*->\s*(\w+)\.(\w+)/);
                    if (match) {
                        const [, fromComp, fromPort, toComp, toPort] = match;
                        jsCode += `        this.subComponents.get('${fromComp}').subscribe('${fromPort}', this.subComponents.get('${toComp}'), data => this.subComponents.get('${toComp}').receive('${toPort}', data));\n`;
                    }
                });
            }
            const delegationsMatch = comp.configuration.match(/delegations\s*:\s*{([^}]*)}/s);
            if (delegationsMatch) {
                delegationsMatch[1].split(';').forEach(delegation => {
                    const match = delegation.match(/(\w+)\s*to\s*(\w+)\.(\w+)/);
                    if (match) {
                        const [, fromPort, toComp, toPort] = match;
                        jsCode += `        this.subscribe('${fromPort}', this.subComponents.get('${toComp}'), data => this.subComponents.get('${toComp}').receive('${toPort}', data));\n`;
                    }
                });
            }
        }

        // Adicionar métodos para atividades alocadas
        const compActivities = model.allocations.filter(a => a.target === comp.name && a.type === 'activity');
        compActivities.forEach(alloc => {
            const activity = model.activities.find(act => act.name === alloc.source);
            if (activity) {
                jsCode += `    execute${activity.name}() {\n`;
                jsCode += `        console.log('Executing activity ${activity.name}');\n`;
                const actionsMatch = activity.body.match(/actions\s*:\s*([^;{]+)(?:{([^}]*)})?/s);
                if (actionsMatch) {
                    const actionStr = actionsMatch[1].trim();
                    const pinsStr = actionsMatch[2] || '';
                    const actions = actionStr.split(',').map(a => {
                        const match = a.match(/(\w+)\s*:\s*(\w+)/);
                        return match ? { id: match[1], name: match[2] } : null;
                    }).filter(Boolean);
                    actions.forEach(action => {
                        jsCode += `        this.executeAction${action.id}();\n`;
                    });
                    const pins = pinsStr.match(/(\w+)\s*:\s*(\w+)/g) || [];
                    actions.forEach(action => {
                        jsCode += `    executeAction${action.id}() {\n`;
                        jsCode += `        console.log('Executing action ${action.name}');\n`;
                        const execAlloc = model.allocations.find(a => a.type === 'executable' && a.target === action.name);
                        if (execAlloc) {
                            const exec = model.executables.find(e => e.name === execAlloc.source);
                            if (exec) {
                                jsCode += `        const params = {};\n`;
                                pins.forEach(pin => {
                                    const pinMatch = pin.match(/(\w+)\s*:\s*(\w+)/);
                                    if (pinMatch && pinMatch[1] === action.id) {
                                        jsCode += `        params['${pinMatch[1]}'] = this.state['${pinMatch[1]}'];\n`;
                                    }
                                });
                                jsCode += `        const result = ${exec.name}(params);\n`;
                                const port = comp.ports.find(p => p.includes(action.id))?.match(/(\w+)/)[1] || action.id;
                                jsCode += `        this.send('${port}', result);\n`;
                            }
                        }
                        jsCode += `    }\n`;
                    });
                }
                const flowsMatch = activity.body.match(/flows\s*:\s*from\s+(\w+)\s+to\s+(\w+)/g);
                if (flowsMatch) {
                    flowsMatch.forEach(flow => {
                        const flowMatch = flow.match(/from\s+(\w+)\s+to\s+(\w+)/);
                        if (flowMatch) {
                            jsCode += `        this.send('${flowMatch[2]}', this.state['${flowMatch[1]}']);\n`;
                        }
                    });
                }
                const delegatesMatch = activity.body.match(/delegate\s+(\w+)\s+to\s+(\w+)/g);
                if (delegatesMatch) {
                    delegatesMatch.forEach(delegate => {
                        const match = delegate.match(/delegate\s+(\w+)\s+to\s+(\w+)/);
                        if (match) {
                            jsCode += `        this.send('${match[2]}', this.state['${match[1]}']);\n`;
                        }
                    });
                }
                jsCode += `    }\n`;
            }
        });

        jsCode += `}\n\n`;
    });

    // Gerar classes para conectores
    jsCode += '// Connectors\n';
    model.connectors.forEach(conn => {
        jsCode += `class ${conn.name} {
    constructor() {
        this.participants = new Map();\n`;
        conn.participants.forEach(p => {
            jsCode += `        this.participants.set('${p.name}', null);\n`;
        });
        jsCode += `    }\n`;

        // Gerar métodos de conexão para fluxos
        const flows = conn.flows.length ? conn.flows : [];
        flows.forEach(flow => {
            jsCode += `    connect${flow.source}_${flow.target}() {\n`;
            jsCode += `        const source = this.participants.get('${flow.source}');\n`;
            jsCode += `        const target = this.participants.get('${flow.target}');\n`;
            jsCode += `        if (source && target) {\n`;
            jsCode += `            source.subscribe('${flow.source}', target, data => target.receive('${flow.target}', data));\n`;
            jsCode += `        }\n`;
            jsCode += `    }\n`;
        });

        if (conn.configuration) {
            const connsMatch = conn.configuration.match(/connectors\s*:\s*{([^}]*)}/s);
            if (connsMatch) {
                connsMatch[1].split(';').forEach(subConn => {
                    const match = subConn.match(/(\w+)\s*:\s*(\w+)/);
                    if (match) {
                        jsCode += `    init${match[1]}() {\n`;
                        jsCode += `        const connector = new ${match[2]}();\n`;
                        jsCode += `        this.participants.set('${match[1]}', connector);\n`;
                        jsCode += `    }\n`;
                    }
                });
            }
        }

        jsCode += `    setParticipant(name, component) {\n`;
        jsCode += `        this.participants.set(name, component);\n`;
        jsCode += `    }\n`;
        jsCode += `}\n\n`;
    });

    // Gerar funções para executáveis
    jsCode += '// Executables\n';
    model.executables.forEach(exec => {
        jsCode += `function ${exec.name}(params = {}) {\n`;
        let body = exec.body.trim();
        // Substituir Type::Value por Type.Value
        body = body.replace(/(\w+)::(\w+)/g, '$1.$2');
        // Substituir obj->prop por params.obj?.prop
        body = body.replace(/(\w+)->(\w+)/g, 'params.$1?.$2');
        // Inicializar variáveis com params
        body = body.replace(/(\w+)\s*=/g, 'params.$1 = params.$1 || ');
        // Substituir let var : Type por let var = new Type()
        body = body.replace(/let\s+(\w+)\s*:\s*(\w+)/g, 'let $1 = new $2()');
        // Garantir indentação
        body = body.split('\n').map(line => `    ${line.trim()}`).join('\n');
        jsCode += `${body}\n`;
        jsCode += `    return params.result || null;\n`;
        jsCode += `}\n\n`;
    });

    // Gerar funções para constraints
    jsCode += '// Constraints\n';
    model.constraints.forEach(cons => {
        jsCode += `function validate${cons.name}(params = {}) {\n`;
        let equation = cons.equation || 'true';
        // Substituir Type::Value por Type.Value
        equation = equation.replace(/(\w+)::(\w+)/g, '$1.$2');
        // Substituir obj->prop por params.obj?.prop
        equation = equation.replace(/(\w+)->(\w+)/g, 'params.$1?.$2');
        // Substituir variáveis soltas por params.var
        equation = equation.replace(/\b(\w+)\b/g, (match) => {
            if (['true', 'false', 'null'].includes(match) || match.includes('.')) return match;
            return `params.${match}`;
        });
        // Substituir == por ===
        equation = equation.replace(/==/g, '===');
        // Substituir SysADL.types.Void por null
        equation = equation.replace(/SysADL\.types\.Void/g, 'null');
        jsCode += `    const result = ${equation};\n`;
        jsCode += `    if (!result) {\n`;
        jsCode += `        throw new Error('Constraint ${cons.name} violated');\n`;
        jsCode += `    }\n`;
        jsCode += `    return result;\n`;
        jsCode += `}\n\n`;
    });

    // Gerar inicialização do modelo
    jsCode += '// System Initialization\n';
    jsCode += `class ${model.name} extends SysADLComponent {
    constructor() {
        super('${model.name}');
        // Initialize top-level components\n`;
        const topLevelComps = model.components.filter(comp => {
            return !model.components.some(c => c.configuration?.includes(comp.name));
        });
        topLevelComps.forEach(comp => {
            jsCode += `        this.subComponents.set('${comp.name}', new ${comp.name}());\n`;
        });

        model.connectors.forEach(conn => {
            if (!model.components.some(c => c.configuration?.includes(conn.name))) {
                jsCode += `        this.connectors.set('${conn.name}', new ${conn.name}());\n`;
                conn.participants.forEach(p => {
                    const comp = model.components.find(c => c.ports.some(port => {
                        const match = port.match(/(\w+)\s*:\s*(\w+)/);
                        return match && match[2] === p.type;
                    }));
                    if (comp) {
                        jsCode += `        this.connectors.get('${conn.name}').setParticipant('${p.name}', this.subComponents.get('${comp.name}'));\n`;
                    }
                });
                conn.flows.forEach(flow => {
                    jsCode += `        this.connectors.get('${conn.name}').connect${flow.source}_${flow.target}();\n`;
                });
            }
        });

        jsCode += `    }\n\n`;
        jsCode += `    run() {\n`;
        jsCode += `        console.log('Running system ${model.name}');\n`;
        model.allocations.forEach(alloc => {
            if (alloc.type === 'activity') {
                const activity = model.activities.find(act => act.name === alloc.source);
                if (activity) {
                    jsCode += `        this.subComponents.get('${alloc.target}').execute${activity.name}();\n`;
                }
            }
        });
        model.constraints.forEach(cons => {
            jsCode += `        validate${cons.name}({});\n`;
        });
        jsCode += `    }\n`;
        jsCode += `}\n\n`;
        jsCode += `const system = new ${model.name}();\n`;
        jsCode += `system.run();\n`;

    return jsCode;
}

// Função para fazer download do código JavaScript
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
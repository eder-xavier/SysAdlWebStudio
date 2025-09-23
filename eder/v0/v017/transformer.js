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
    if (Array.isArray(model.types)) {
        model.types.forEach(type => {
            if (type.kind === 'value type' || type.kind === 'datatype') {
                typeMap[type.name] = 'any'; // Simplificado para 'any' por extensibilidade
            } else if (type.kind === 'enum') {
                const enumValues = type.content.match(/(\w+)/g) || [];
                typeMap[type.name] = enumValues.map(v => `'${v}'`).join(' | ');
                jsCode += `// Enum ${type.name}\nconst ${type.name} = { ${enumValues.map(v => `${v}: '${v}'`).join(', ')} };\n\n`;
            }
        });
    }

    // Definir runtime básico
    jsCode += `// Runtime Environment\n`;
    jsCode += `class SysADLComponent {
    constructor(name) {
        this.name = name;
        this.ports = new Map();
        this.subscribers = new Map();
        this.subComponents = new Map();
        this.connectors = new Map();
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
        comp.ports.forEach(portName => {
            const portDef = model.ports.find(p => portName.includes(p.name));
            if (portDef) {
                portDef.flows.forEach(flow => {
                    jsCode += `        this.addPort('${portDef.name}', '${flow.type}', '${flow.direction}');\n`;
                });
            }
        });

        // Initialize configuration
        if (comp.configuration) {
            jsCode += `        // Configuration\n`;
            const subCompsMatch = comp.configuration.match(/components\s*:\s*([^;]+)/);
            if (subCompsMatch) {
                subCompsMatch[1].split(',').forEach(sub => {
                    const [name, type] = sub.trim().split(/\s*:\s*/);
                    if (name && type) {
                        jsCode += `        this.subComponents.set('${name}', new ${type.replace(/\s*{[^}]*}/, '')}());\n`;
                    }
                });
            }
            const connsMatch = comp.configuration.match(/connectors\s*:\s*{([^}]+)}/);
            if (connsMatch) {
                connsMatch[1].split(';').forEach(conn => {
                    const [name, type] = conn.trim().split(/\s*:\s*/);
                    if (name && type) {
                        jsCode += `        this.connectors.set('${name}', new ${type.replace(/bindings.*/, '')}());\n`;
                    }
                });
            }
            const bindingsMatch = comp.configuration.match(/bindings\s*:\s*{([^}]+)}/);
            if (bindingsMatch) {
                bindingsMatch[1].split(';').forEach(binding => {
                    const match = binding.match(/(\w+)\.(\w+)\s*->\s*(\w+)\.(\w+)/);
                    if (match) {
                        const [, fromComp, fromPort, toComp, toPort] = match;
                        jsCode += `        this.subComponents.get('${fromComp}').subscribe('${fromPort}', this.subComponents.get('${toComp}'), data => this.subComponents.get('${toComp}').receive('${toPort}', data));\n`;
                    }
                });
            }
            const delegationsMatch = comp.configuration.match(/delegations\s*:\s*{([^}]+)}/);
            if (delegationsMatch) {
                delegationsMatch[1].split(';').forEach(delegation => {
                    const match = delegation.match(/(\w+)\s*->\s*(\w+)\.(\w+)/);
                    if (match) {
                        const [, fromPort, toComp, toPort] = match;
                        jsCode += `        this.subscribe('${fromPort}', this.subComponents.get('${toComp}'), data => this.subComponents.get('${toComp}').receive('${toPort}', data));\n`;
                    }
                });
            }
        }
        jsCode += `    }\n`;

        // Adicionar métodos para atividades alocadas
        const compActivities = model.allocations.filter(a => a.target === comp.name && a.type === 'activity');
        compActivities.forEach(alloc => {
            const activity = model.activities.find(act => act.name === alloc.source);
            if (activity) {
                jsCode += `    execute${activity.name}() {\n`;
                jsCode += `        // Simplified implementation of activity ${activity.name}\n`;
                const actionsMatch = activity.body.match(/actions\s*:\s*([^}]+)/);
                if (actionsMatch) {
                    actionsMatch[1].split(',').forEach(action => {
                        const actionDef = model.activities.find(act => act.name === action.trim());
                        if (actionDef) {
                            jsCode += `        console.log('Executing action ${action.trim()} in ${activity.name}');\n`;
                        } else {
                            jsCode += `        console.log('Executing action ${action.trim()}');\n`;
                        }
                    });
                }
                const flowsMatch = activity.body.match(/flows\s*:\s*([^}]+)/);
                if (flowsMatch) {
                    flowsMatch[1].split(',').forEach(flow => {
                        const flowMatch = flow.match(/(\w+)\s*->\s*(\w+)/);
                        if (flowMatch) {
                            const [, fromPort, toPort] = flowMatch;
                            jsCode += `        this.send('${fromPort}', this.ports.get('${fromPort}')?.value);\n`;
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

        // Implementar fluxos
        conn.flows.forEach(flow => {
            jsCode += `    connect${flow.source}_${flow.target}() {\n`;
            jsCode += `        const source = this.participants.get('${flow.source}');\n`;
            jsCode += `        const target = this.participants.get('${flow.target}');\n`;
            jsCode += `        if (source && target) {\n`;
            jsCode += `            source.subscribe('${flow.source}', target, data => target.receive('${flow.target}', data));\n`;
            jsCode += `        }\n`;
            jsCode += `    }\n`;
        });

        jsCode += `    setParticipant(name, component) {\n`;
        jsCode += `        this.participants.set(name, component);\n`;
        jsCode += `    }\n`;
        jsCode += `}\n\n`;
    });

    // Gerar funções para executáveis
    jsCode += '// Executables\n';
    model.executables.forEach(exec => {
        jsCode += `function ${exec.name}() {\n`;
        jsCode += `    // Simplified implementation of executable ${exec.name}\n`;
        jsCode += `    console.log('Executing ${exec.name}');\n`;
        jsCode += `    ${exec.body.replace(/;/g, ';\n    ')}\n`;
        jsCode += `}\n\n`;
    });

    // Gerar funções para constraints
    jsCode += '// Constraints\n';
    model.constraints.forEach(cons => {
        jsCode += `function validate${cons.name}() {\n`;
        jsCode += `    // Simplified validation for constraint ${cons.name}\n`;
        const equation = cons.equation.replace(/==/g, '===').replace(/=/g, '==');
        jsCode += `    const result = ${equation || 'true'};\n`;
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
        model.components.forEach(comp => {
            if (!comp.configuration) {
                jsCode += `        this.subComponents.set('${comp.name}', new ${comp.name}());\n`;
            }
        });
        model.connectors.forEach(conn => {
            jsCode += `        this.connectors.set('${conn.name}', new ${conn.name}());\n`;
            conn.participants.forEach(p => {
                jsCode += `        this.connectors.get('${conn.name}').setParticipant('${p.name}', this.subComponents.get('${p.type}'));\n`;
            });
            conn.flows.forEach(flow => {
                jsCode += `        this.connectors.get('${conn.name}').connect${flow.source}_${flow.target}();\n`;
            });
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
            jsCode += `        validate${cons.name}();\n`;
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
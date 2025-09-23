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
        jsEditor.setValue(jsCode);
        console.log('Transformation completed.');
    } catch (error) {
        jsEditor.setValue(`Error transforming to JavaScript: ${error.message}`);
        console.error('Transformation error:', error);
    }
}

let generationCount = 0;

function generateJsCode(model) {
    generationCount++;
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
            jsCode += `class ${type.name} {\n    constructor(params = {}) {\n`;
            attributes.split(',').forEach(attr => {
                const match = attr.match(/(\w+)\s*:\s*(\w+)/);
                if (match) {
                    jsCode += `        this.${match[1]} = params.${match[1]} ?? null;\n`;
                }
            });
            jsCode += `    }\n}\n`;
        } else if (type.kind === 'enum') {
            const enumValues = type.content.match(/(\w+)/g) || [];
            typeMap[type.name] = enumValues.map(v => `'${v}'`).join(' | ');
            jsCode += `const ${type.name} = Object.freeze({ ${enumValues.map(v => `${v}: '${v}'`).join(', ')} });\n`;
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

    addPort(name, type, direction, isComposite = false, subPorts = []) {
        const port = { type, direction, value: null, isComposite, subPorts: new Map() };
        if (isComposite) {
            subPorts.forEach(sp => {
                const subPortDef = ${JSON.stringify(model.ports)}.find(p => p.name === sp.type);
                const direction = subPortDef?.flows?.[0]?.direction || 'inout';
                port.subPorts.set(sp.name, { type: sp.type, direction, value: null });
            });
        }
        this.ports.set(name, port);
    }

    send(portName, data, subPortName = null) {
        const port = this.ports.get(portName);
        if (!port) return;
        if (port.isComposite && subPortName) {
            const subPort = port.subPorts.get(subPortName);
            if (subPort && (subPort.direction === 'out' || subPort.direction === 'inout')) {
                subPort.value = data;
                const subs = this.subscribers.get(\`\${portName}.\${subPortName}\`) || [];
                subs.forEach(sub => {
                    if (typeof sub.callback === 'function') {
                        sub.callback(data);
                    }
                });
            }
        } else if (!port.isComposite && (port.direction === 'out' || port.direction === 'inout')) {
            port.value = data;
            const subs = this.subscribers.get(portName) || [];
            subs.forEach(sub => {
                if (typeof sub.callback === 'function') {
                    sub.callback(data);
                }
            });
        }
    }

    receive(portName, data, subPortName = null) {
        const port = this.ports.get(portName);
        if (!port) return;
        if (port.isComposite && subPortName) {
            const subPort = port.subPorts.get(subPortName);
            if (subPort && (subPort.direction === 'in' || subPort.direction === 'inout')) {
                subPort.value = data;
                this.state[\`\${portName}.\${subPortName}\`] = data;
            }
        } else if (!port.isComposite && (port.direction === 'in' || port.direction === 'inout')) {
            port.value = data;
            this.state[portName] = data;
        }
    }

    subscribe(portName, subPortName, subscriber, callback) {
        const key = subPortName ? \`\${portName}.\${subPortName}\` : portName;
        const subs = this.subscribers.get(key) || [];
        subs.push({ subscriber, callback });
        this.subscribers.set(key, subs);
    }
}\n\n`;

    // Gerar classes para componentes
    jsCode += '// Components\n';
    model.components.forEach(comp => {
        jsCode += `class ${comp.name} extends SysADLComponent {\n`;
        jsCode += `    constructor() {\n`;
        jsCode += `        super('${comp.name}');\n`;
        jsCode += `        // Initialize ports\n`;
        comp.ports.forEach(port => {
            const portDef = model.ports.find(p => p.name === port.type);
            if (portDef) {
                if (portDef.subPorts?.length) {
                    jsCode += `        this.addPort('${port.name}', '${port.type}', 'inout', true, [\n`;
                    portDef.subPorts.forEach(sp => {
                        jsCode += `            { name: '${sp.name}', type: '${sp.type}' },\n`;
                    });
                    jsCode += `        ]);\n`;
                } else if (portDef.flows?.length) {
                    portDef.flows.forEach(flow => {
                        jsCode += `        this.addPort('${port.name}', '${flow.type}', '${flow.direction}');\n`;
                    });
                }
            }
        });

        if (comp.configuration) {
            jsCode += `        // Configuration\n`;
            comp.subComponents.forEach(subComp => {
                jsCode += `        this.subComponents.set('${subComp.name}', new ${subComp.type}());\n`;
            });
            comp.connectors.forEach(conn => {
                jsCode += `        this.connectors.set('${conn.name}', new ${conn.type}());\n`;
            });
            comp.bindings.forEach(binding => {
                const sourceMatch = binding.source.match(/(\w+)\.(\w+)(?:\.(\w+))?/);
                const targetMatch = binding.target.match(/(\w+)\.(\w+)(?:\.(\w+))?/);
                if (sourceMatch && targetMatch) {
                    const [, fromComp, fromPort, fromSubPort] = sourceMatch;
                    const [, toComp, toPort, toSubPort] = targetMatch;
                    jsCode += `        this.subComponents.get('${fromComp}').subscribe('${fromPort}', ${fromSubPort ? `'${fromSubPort}'` : 'null'}, this.subComponents.get('${toComp}'), data => this.subComponents.get('${toComp}').receive('${toPort}', ${toSubPort ? `'${toSubPort}'` : 'null'}, data));\n`;
                }
            });
            comp.delegations.forEach(delegation => {
                const match = delegation.source.match(/(\w+)(?:\.(\w+))?/);
                const [, fromPort, fromSubPort] = match || [];
                jsCode += `        this.subscribe('${fromPort}', ${fromSubPort ? `'${fromSubPort}'` : 'null'}, this.subComponents.get('${delegation.target}'), data => this.subComponents.get('${delegation.target}').receive('${fromPort}', ${fromSubPort ? `'${fromSubPort}'` : 'null'}, data));\n`;
            });
        }

        jsCode += `    }\n`;

        // Adicionar métodos para atividades
        const compActivities = model.allocations.filter(a => a.target === comp.name && a.type === 'activity');
        compActivities.forEach(alloc => {
            const activity = model.activities.find(act => act.name === alloc.source);
            if (activity) {
                jsCode += `    async execute${activity.name}() {\n`;
                jsCode += `        console.log('Executing activity ${activity.name} in ${this.name}');\n`;
                activity.actions.forEach(action => {
                    jsCode += `        await this.executeAction${action.id}();\n`;
                });
                activity.flows.forEach(flow => {
                    jsCode += `        this.send('${flow.target}', this.state['${flow.source}']);\n`;
                });
                jsCode += `    }\n`;

                activity.actions.forEach(action => {
                    jsCode += `    async executeAction${action.id}() {\n`;
                    jsCode += `        console.log('Executing action ${action.name} in ${this.name}');\n`;
                    const execAlloc = model.allocations.find(a => a.type === 'executable' && a.target === action.name);
                    if (execAlloc) {
                        const exec = model.executables.find(e => e.name === execAlloc.source);
                        if (exec) {
                            const constraint = model.constraints.find(c => activity.body.includes(c.name));
                            if (constraint) {
                                jsCode += `        try {\n`;
                                jsCode += `            validate${constraint.name}({ ${activity.inputs.split(',').map(p => {
                                    const [name] = p.trim().split(':').map(s => s.trim());
                                    return `${name}: this.state['${name}']`;
                                }).join(', ')} });\n`;
                                jsCode += `        } catch (e) {\n`;
                                jsCode += `            console.error(e.message);\n`;
                                jsCode += `            return;\n`;
                                jsCode += `        }\n`;
                            }
                            jsCode += `        const params = { ${activity.inputs.split(',').map(p => {
                                const [name, type] = p.trim().split(':').map(s => s.trim());
                                const typeDef = model.types.find(t => t.name === type);
                                let defaultValue = 'null';
                                if (typeDef?.kind === 'datatype') defaultValue = `new ${type}()`;
                                if (typeDef?.kind === 'enum') defaultValue = `${type}.Off`;
                                return `${name}: this.state['${name}'] ?? ${defaultValue}`;
                            }).join(', ')} };\n`;
                            jsCode += `        const result = ${exec.name}(params);\n`;
                            jsCode += `        this.send('${action.id}', result);\n`;
                        }
                    }
                    jsCode += `    }\n`;
                });
            }
        });

        jsCode += `}\n\n`;
    });

    // Gerar classes para conectores
    jsCode += '// Connectors\n';
    model.connectors.forEach(conn => {
        jsCode += `class ${conn.name} {\n`;
        jsCode += `    constructor() {\n`;
        jsCode += `        this.participants = new Map();\n`;
        conn.participants.forEach(p => {
            jsCode += `        this.participants.set('${p.name}', null);\n`;
        });
        jsCode += `    }\n`;

        conn.flows.forEach(flow => {
            jsCode += `    connect${flow.source}_${flow.target}() {\n`;
            jsCode += `        const source = this.participants.get('${flow.source}');\n`;
            jsCode += `        const target = this.participants.get('${flow.target}');\n`;
            jsCode += `        if (source && target) {\n`;
            jsCode += `            source.subscribe('${flow.source}', null, target, data => target.receive('${flow.target}', null, data));\n`;
            jsCode += `        }\n`;
            jsCode += `    }\n`;
        });

        conn.bindings.forEach(binding => {
            const sourceMatch = binding.source.match(/(\w+)\.(\w+)(?:\.(\w+))?/);
            const targetMatch = binding.target.match(/(\w+)\.(\w+)(?:\.(\w+))?/);
            if (sourceMatch && targetMatch) {
                const [, sourceComp, sourcePort, sourceSubPort] = sourceMatch;
                const [, targetComp, targetPort, targetSubPort] = targetMatch;
                jsCode += `    bind${sourceComp}_${sourcePort}${sourceSubPort ? `_${sourceSubPort}` : ''}_to_${targetComp}_${targetPort}${targetSubPort ? `_${targetSubPort}` : ''}() {\n`;
                jsCode += `        const source = this.participants.get('${sourceComp}');\n`;
                jsCode += `        const target = this.participants.get('${targetComp}');\n`;
                jsCode += `        if (source && target) {\n`;
                jsCode += `            source.subscribe('${sourcePort}', ${sourceSubPort ? `'${sourceSubPort}'` : 'null'}, target, data => target.receive('${targetPort}', ${targetSubPort ? `'${targetSubPort}'` : 'null'}, data));\n`;
                jsCode += `        }\n`;
                jsCode += `    }\n`;
            }
        });

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
        body = body.replace(/(\w+)::(\w+)/g, (match, type, value) => {
            if (model.types.find(t => t.name === type && t.kind === 'enum')) {
                return `${type}.${value}`;
            }
            return `params["${type}"]?.${value} ?? null`;
        });
        // Substituir obj->prop por params[obj].prop
        body = body.replace(/(\w+)->(\w+)/g, 'params["$1"].$2');
        // Inicializar variáveis
        const paramsList = new Set();
        const protectedVars = new Set(['types', 'Command', 'On', 'Off']);
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
        // Substituir let var : Type [= init]
        body = body.replace(/let\s+(\w+)\s*:\s*(\w+)(?:\s*=\s*([\w:.]+))?/g, (match, varName, typeName, initValue) => {
            const type = model.types.find(t => t.name === typeName);
            let init = initValue || (type?.kind === 'datatype' ? `new ${typeName}()` : 
                                    type?.kind === 'enum' ? `${typeName}.Off` : 'null');
            if (init && init.includes('::')) {
                const [type, value] = initValue.split('::');
                if (model.types.find(t => t.name === type && t.kind === 'enum')) {
                    init = `${type}.${value}`;
                }
            }
            return `    let ${varName} = ${init};`;
        });
        // Corrigir condicionais
        body = body.replace(/(\w+)\s*==\s*(\w+)/g, '$1 === $2');
        // Balancear chaves
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
    model.constraints.forEach(cons => {
        jsCode += `function validate${cons.name}(params = {}) {\n`;
        let equation = cons.equation || 'true';
        // Substituir Type::Value por Type.Value
        equation = equation.replace(/(\w+)::(\w+)/g, (match, type, value) => {
            if (model.types.find(t => t.name === type && t.kind === 'enum')) {
                return `${type}.${value}`;
            }
            return `params["${type}"]?.${value} ?? null`;
        });
        // Substituir obj->prop por params[obj].prop
        equation = equation.replace(/(\w+)->(\w+)/g, 'params["$1"].$2');
        // Substituir variáveis soltas por params[var]
        const definedVars = new Set();
        equation.replace(/params\["(\w+)"\]/g, (_, varName) => {
            definedVars.add(varName);
        });
        const protectedIdentifiers = new Set([
            'true', 'false', 'null', 'params',
            ...model.types.map(t => t.name),
            ...model.types.filter(t => t.kind === 'enum').flatMap(t => 
                (t.content.match(/(\w+)/g) || []).map(v => `${t.name}.${v}`)
            )
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
        // Substituir == por ===
        equation = equation.replace(/==/g, '===');
        // Garantir parênteses em expressões ternárias
        equation = equation.replace(/(\w+\s*[><=]+\s*\w+)\s*\?\s*([^:]+)\s*:\s*([^;]+)/g, '($1) ? ($2) : ($3)');
        // Inicializar variáveis de entrada
        cons.inputs.split(',').forEach(input => {
            const [name, type] = input.trim().split(':').map(s => s.trim());
            if (name && type) {
                const typeDef = model.types.find(t => t.name === type);
                let defaultValue = 'null';
                if (typeDef?.kind === 'datatype') defaultValue = `new ${type}()`;
                if (typeDef?.kind === 'enum') defaultValue = `${type}.Off`;
                jsCode += `    let ${name} = params["${name}"] ?? ${defaultValue};\n`;
            }
        });
        // Inicializar variáveis de saída
        cons.outputs.split(',').forEach(output => {
            const [name, type] = output.trim().split(':').map(s => s.trim());
            if (name && type) {
                const typeDef = model.types.find(t => t.name === type);
                let defaultValue = 'null';
                if (typeDef?.kind === 'datatype') defaultValue = `new ${type}()`;
                if (typeDef?.kind === 'enum') defaultValue = `${type}.Off`;
                jsCode += `    let ${name} = params["${name}"] ?? ${defaultValue};\n`;
            }
        });
        jsCode += `    const result = ${equation};\n`;
        jsCode += `    if (!result) {\n`;
        jsCode += `        throw new Error('Constraint ${cons.name} violated');\n`;
        jsCode += `    }\n`;
        jsCode += `    return result;\n`;
        jsCode += `}\n\n`;
    });

    // Gerar inicialização do modelo
    jsCode += '// System Initialization\n';
    jsCode += `class ${model.name} extends SysADLComponent {\n`;
    jsCode += `    constructor() {\n`;
    jsCode += `        super('${model.name}');\n`;
    jsCode += `        // Initialize top-level components\n`;
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
                const comp = model.components.find(c => c.ports.some(port => port.type === p.type));
                if (comp) {
                    jsCode += `        this.connectors.get('${conn.name}').setParticipant('${p.name}', this.subComponents.get('${comp.name}'));\n`;
                }
            });
            conn.flows.forEach(flow => {
                jsCode += `        this.connectors.get('${conn.name}').connect${flow.source}_${flow.target}();\n`;
            });
            conn.bindings.forEach(binding => {
                const sourceMatch = binding.source.match(/(\w+)\.(\w+)(?:\.(\w+))?/);
                const targetMatch = binding.target.match(/(\w+)\.(\w+)(?:\.(\w+))?/);
                if (sourceMatch && targetMatch) {
                    const [, sourceComp, sourcePort, sourceSubPort] = sourceMatch;
                    const [, targetComp, targetPort, targetSubPort] = targetMatch;
                    jsCode += `        this.connectors.get('${conn.name}').bind${sourceComp}_${sourcePort}${sourceSubPort ? `_${sourceSubPort}` : ''}_to_${targetComp}_${targetPort}${targetSubPort ? `_${targetSubPort}` : ''}();\n`;
                }
            });
        }
    });

    jsCode += `    }\n\n`;
    jsCode += `    async run() {\n`;
    jsCode += `        console.log('Running system ${model.name}');\n`;
    model.allocations.forEach(alloc => {
        if (alloc.type === 'activity') {
            const activity = model.activities.find(act => act.name === alloc.source);
            if (activity) {
                jsCode += `        await this.subComponents.get('${alloc.target}').execute${activity.name}();\n`;
            }
        }
    });
    model.constraints.forEach(cons => {
        jsCode += `        try {\n`;
        jsCode += `            validate${cons.name}({});\n`;
        jsCode += `        } catch (e) {\n`;
        jsCode += `            console.error(e.message);\n`;
        jsCode += `        }\n`;
    });
    jsCode += `    }\n`;
    jsCode += `}\n\n`;
    jsCode += `const system = new ${model.name}();\n`;
    jsCode += `system.run().catch(err => console.error(err));\n`;

    generationCount = 0;
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
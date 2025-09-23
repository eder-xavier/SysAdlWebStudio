/* parser.js
   - Parseia modelos SysADL (Simple.sysadl, RTC.sysadl, AGV.sysadl)
   - Captura packages, types, ports, components, connectors, activities, executables, constraints, allocations
   - Suporta configurações complexas com bindings
   - Adaptado para Model sem bloco {} explícito
*/

// @ts-nocheck

function parseSysADL(content) {
    const model = {
        type: 'Model',
        name: 'SysADLModel',
        involvedElements: [],
        types: [],
        ports: [],
        components: [],
        connectors: [],
        activities: [],
        executables: [],
        constraints: [],
        allocations: []
    };

    // Log do conteúdo bruto
    console.log('Conteúdo bruto:', content);

    // Normalizar conteúdo: remover comentários, mas preservar estrutura
    content = content
        .replace(/\/\/[^\n\r]*/g, '') // Remove comentários de linha
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comentários de bloco
        .replace(/\r\n/g, '\n') // Normaliza quebras de linha
        .trim();

    console.log('Conteúdo normalizado:', content);

    // Função auxiliar para extrair conteúdo de blocos {}
    function extractBlockContent(str, startIndex) {
        if (startIndex === -1 || str[startIndex] !== '{') {
            console.error('Erro: Bloco {} não encontrado na posição', startIndex);
            return '';
        }
        let openBraces = 1;
        let i = startIndex + 1;
        while (i < str.length && openBraces > 0) {
            if (str[i] === '{') openBraces++;
            if (str[i] === '}') openBraces--;
            i++;
        }
        if (openBraces !== 0) {
            console.error('Erro: Bloco {} não fechado corretamente');
            return '';
        }
        return str.substring(startIndex + 1, i - 1).trim();
    }

    // Extrair nome do modelo e conteúdo
    const modelMatch = content.match(/Model\s+([\w\.]+)\s*;/);
    if (modelMatch) {
        model.name = modelMatch[1];
        console.log('Modelo encontrado:', model.name);
        // Tratar todo o conteúdo após "Model SysADLModel ;" como o corpo do modelo
        const modelContentStart = modelMatch.index + modelMatch[0].length;
        content = content.substring(modelContentStart).trim();
    } else {
        console.error('Erro: Nenhum "Model" encontrado');
        return model;
    }

    console.log('Conteúdo do Model:', content);

    // Parse de packages
    const packageRegex = /package\s+([\w\.]+)\s*{([\s\S]*?)}\s*(?=(?:package|allocations|$))/g;
    let packageMatch;
    while ((packageMatch = packageRegex.exec(content)) !== null) {
        const packageName = packageMatch[1];
        const packageContent = packageMatch[2];
        console.log(`Parseando package: ${packageName}`);

        // Parse de imports
        const importRegex = /import\s+([\w\.]+)\s*;/g;
        let importMatch;
        while ((importMatch = importRegex.exec(packageContent)) !== null) {
            model.involvedElements.push(importMatch[1]);
        }

        // Parse de value types
        const typeRegex = /(?:value\s+type|enum|datatype)\s+([\w\.]+)(?:\s+extends\s+([\w\.]+))?\s*{([\s\S]*?)}/g;
        let typeMatch;
        while ((typeMatch = typeRegex.exec(packageContent)) !== null) {
            const typeName = typeMatch[1];
            const extendsType = typeMatch[2] || null;
            const typeContent = typeMatch[3];
            const attributes = [];
            const attrMatch = typeContent.match(/attributes\s*:\s*([\s\S]*?)(?=(?:}|$))/);
            if (attrMatch) {
                const attrContent = attrMatch[1].split(';').map(a => a.trim()).filter(Boolean);
                attrContent.forEach(attr => {
                    const [name, type] = attr.split(':').map(s => s.trim());
                    if (name && type) attributes.push({ name, type });
                });
            }
            model.types.push({ kind: 'value type', name: typeName, extends: extendsType, attributes });
        }

        // Parse de ports
        const portRegex = /port\s+def\s+([\w\.]+)\s*{([\s\S]*?)}/g;
        let portMatch;
        while ((portMatch = portRegex.exec(packageContent)) !== null) {
            const portName = portMatch[1];
            const portContent = portMatch[2];
            const flows = [];
            const flowRegex = /flow\s+(in|out|inout)\s+([\w\.]+|\w+)/g;
            let flowMatch;
            while ((flowMatch = flowRegex.exec(portContent)) !== null) {
                flows.push({ direction: flowMatch[1], name: 'temp', type: flowMatch[2] });
            }
            model.ports.push({ name: portName, flows, subPorts: [] });
        }

        // Parse de components
        const compRegex = /(?:boundary\s+)?component\s+(?:def\s+)?([\w\.]+)\s*{([\s\S]*?)}/g;
        let compMatch;
        while ((compMatch = compRegex.exec(packageContent)) !== null) {
            const compName = compMatch[1];
            const compContent = compMatch[2];
            console.log('Componente encontrado:', compName);
            const comp = {
                name: compName,
                isBoundary: compMatch[0].includes('boundary'),
                ports: [],
                configuration: null
            };

            // Parse ports
            const portsMatch = compContent.match(/ports\s*:\s*([\s\S]*?)(?=(?:configuration|$))/);
            if (portsMatch) {
                const portsContent = portsMatch[1].split(';').map(p => p.trim()).filter(Boolean);
                portsContent.forEach(port => {
                    const portParts = port.match(/([\w\.]+)\s*:\s*([\w\.]+)(?:\s*,\s*(in|out|inout))?/);
                    if (portParts) {
                        comp.ports.push({
                            name: portParts[1],
                            type: portParts[2],
                            direction: portParts[3] || model.ports.find(p => p.name === portParts[2])?.flows[0]?.direction || 'inout'
                        });
                    }
                });
            }

            // Parse configuration
            const configMatch = compContent.match(/configuration\s*{([\s\S]*?)}/);
            if (configMatch) {
                comp.configuration = parseConfiguration(configMatch[1]);
            }

            model.components.push(comp);
        }

        // Parse de connectors
        const connRegex = /connector\s+(?:def\s+)?([\w\.]+)\s*{([\s\S]*?)}/g;
        let connMatch;
        while ((connMatch = connRegex.exec(packageContent)) !== null) {
            const connName = connMatch[1];
            const connContent = connMatch[2];
            const conn = { name: connName, participants: [], flows: [] };

            // Parse participants
            const partMatch = connContent.match(/participants\s*:\s*([\s\S]*?)(?=(?:flows|$))/);
            if (partMatch) {
                const partContent = partMatch[1].split(';').map(p => p.trim()).filter(Boolean);
                partContent.forEach(part => {
                    const partParts = part.match(/~\s*([\w\.]+)\s*:\s*([\w\.]+)/);
                    if (partParts) {
                        conn.participants.push({ name: partParts[1], type: partParts[2] });
                    }
                });
            }

            // Parse flows
            const flowMatch = connContent.match(/flows\s*:\s*([\s\S]*?)(?=(?:}|$))/);
            if (flowMatch) {
                const flowContent = flowMatch[1].split(';').map(f => f.trim()).filter(Boolean);
                flowContent.forEach(flow => {
                    const flowParts = flow.match(/([\w\.]+)\s+from\s+([\w\.]+)\s+to\s+([\w\.]+)/);
                    if (flowParts) {
                        conn.flows.push({ type: flowParts[1], source: flowParts[2], target: flowParts[3] });
                    }
                });
            }

            model.connectors.push(conn);
        }

        // Parse de activities
        const actRegex = /activity\s+(?:def\s+)?([\w\.]+)\s*\(([\s\S]*?)\)\s*:\s*\(([\s\S]*?)\)\s*{([\s\S]*?)}/g;
        let actMatch;
        while ((actMatch = actRegex.exec(packageContent)) !== null) {
            const actName = actMatch[1];
            const inputs = actMatch[2].split(',').map(i => i.trim()).filter(Boolean);
            const outputs = actMatch[3].split(',').map(o => o.trim()).filter(Boolean);
            const actContent = actMatch[4];
            const act = { name: actName, inputs, outputs, actions: [], delegates: [] };

            // Parse body
            const bodyMatch = actContent.match(/body\s*{([\s\S]*?)}/);
            if (bodyMatch) {
                const bodyContent = bodyMatch[1];

                // Parse actions
                const actionsMatch = bodyContent.match(/actions\s*:\s*([\w\.]+)\s*:\s*([\w\.]+)\s*{([\s\S]*?)}/g);
                if (actionsMatch) {
                    actionsMatch.forEach(action => {
                        const actionParts = action.match(/([\w\.]+)\s*:\s*([\w\.]+)\s*{([\s\S]*?)}/);
                        if (actionParts) {
                            const actionName = actionParts[1];
                            const actionType = actionParts[2];
                            const actionContent = actionParts[3];
                            const pins = [];
                            const pinMatch = actionContent.match(/using\s+pins\s*:\s*([\s\S]*?)(?=(?:constraint|delegate|$))/);
                            if (pinMatch) {
                                pinMatch[1].split(';').map(p => p.trim()).filter(Boolean).forEach(pin => {
                                    const [name, type] = pin.split(':').map(s => s.trim());
                                    if (name && type) pins.push({ name, type });
                                });
                            }
                            const constraintMatch = actionContent.match(/constraint\s*:\s*post-condition\s+([\w\.]+)/);
                            act.actions.push({
                                name: actionName,
                                type: actionType,
                                pins,
                                constraint: constraintMatch ? constraintMatch[1] : null
                            });
                        }
                    });
                }

                // Parse delegates
                const delegateMatch = bodyContent.match(/delegate\s+([\w\.]+)\s+to\s+([\w\.]+)/g);
                if (delegateMatch) {
                    delegateMatch.forEach(d => {
                        const [_, source, target] = d.match(/delegate\s+([\w\.]+)\s+to\s+([\w\.]+)/);
                        act.delegates.push({ source, target });
                    });
                }
            }

            model.activities.push(act);
        }

        // Parse de actions
        const actionRegex = /action\s+(?:def\s+)?([\w\.]+)\s*\(([\s\S]*?)\)\s*:\s*([\w\.]+)\s*{([\s\S]*?)}/g;
        let actionMatch;
        while ((actionMatch = actionRegex.exec(packageContent)) !== null) {
            const actionName = actionMatch[1];
            const inputs = actionMatch[2].split(',').map(i => i.trim()).filter(Boolean);
            const output = actionMatch[3];
            const actionContent = actionMatch[4];
            const action = { name: actionName, inputs, output, constraint: null, delegates: [] };

            const constraintMatch = actionContent.match(/constraint\s*:\s*post-condition\s+([\w\.]+)/);
            if (constraintMatch) {
                action.constraint = constraintMatch[1];
            }

            const delegateMatch = actionContent.match(/delegate\s+([\w\.]+)\s+to\s+([\w\.]+)/g);
            if (delegateMatch) {
                delegateMatch.forEach(d => {
                    const [_, source, target] = d.match(/delegate\s+([\w\.]+)\s+to\s+([\w\.]+)/);
                    action.delegates.push({ source, target });
                });
            }

            model.activities.push(action);
        }

        // Parse de executables
        const execRegex = /executable\s+(?:def\s+)?([\w\.]+)\s*\(([\s\S]*?)\)\s*:\s*(?:out\s+)?([\w\.]+)\s*{([\s\S]*?)}/g;
        let execMatch;
        while ((execMatch = execRegex.exec(packageContent)) !== null) {
            const execName = execMatch[1];
            const inputs = execMatch[2].split(',').map(i => i.trim()).filter(Boolean);
            const output = execMatch[3];
            const body = execMatch[4].replace(/return\s+/, '').replace(/;/, '').trim();
            model.executables.push({ name: execName, inputs, output, body });
        }

        // Parse de constraints
        const constrRegex = /constraint\s+([\w\.]+)\s*\(([\s\S]*?)\)\s*:\s*\(([\s\S]*?)\)\s*{([\s\S]*?)}/g;
        let constrMatch;
        while ((constrMatch = constrRegex.exec(packageContent)) !== null) {
            const constrName = constrMatch[1];
            const inputs = constrMatch[2].split(',').map(i => i.trim()).filter(Boolean);
            const outputs = constrMatch[3].split(',').map(o => o.trim()).filter(Boolean);
            const equationMatch = constrMatch[4].match(/equation\s*=\s*([\s\S]*?)(?=(?:}|$))/);
            const equation = equationMatch ? equationMatch[1].trim() : '';
            model.constraints.push({ name: constrName, inputs, outputs, equation });
        }
    }

    // Parse de allocations
    const allocMatch = content.match(/allocations\s*{([\s\S]*?)}/);
    if (allocMatch) {
        const allocContent = allocMatch[1];
        const allocRegex = /(activity|executable)\s+([\w\.]+)\s+to\s+([\w\.]+)/g;
        let allocDefMatch;
        while ((allocDefMatch = allocRegex.exec(allocContent)) !== null) {
            model.allocations.push({ type: allocDefMatch[1], source: allocDefMatch[2], target: allocDefMatch[3] });
        }
    }

    // Função para parsear configuração
    function parseConfiguration(configContent) {
        const config = { components: [], connectors: [], bindings: [], delegations: [] };
        console.log('Parseando configuration:', configContent);

        // Parse components
        const compMatch = configContent.match(/components\s*:\s*([\s\S]*?)(?=(?:connectors|bindings|$))/);
        if (compMatch) {
            const compContent = compMatch[1];
            const subCompRegex = /([\w\.]+)\s*:\s*([\w\.]+)\s*{([\s\S]*?)}/g;
            let subCompMatch;
            while ((subCompMatch = subCompRegex.exec(compContent)) !== null) {
                const sub = { name: subCompMatch[1], type: subCompMatch[2], portAliases: [] };
                const portContent = subCompMatch[3];
                const portMatch = portContent.match(/using\s+ports\s*:\s*([\s\S]*?)(?=(?:}|$))/);
                if (portMatch) {
                    portMatch[1].split(';').map(p => p.trim()).filter(Boolean).forEach(port => {
                        const portParts = port.match(/([\w\.]+)\s*:\s*([\w\.]+)/);
                        if (portParts) {
                            sub.portAliases.push({ alias: portParts[1], type: portParts[2] });
                        }
                    });
                } else {
                    // Inferir portas do tipo do componente
                    const compType = model.components.find(c => c.name === sub.type);
                    if (compType && compType.ports) {
                        sub.portAliases = compType.ports.map(p => ({ alias: p.name, type: p.type }));
                    }
                }
                config.components.push(sub);
            }
        }

        // Parse connectors
        const connMatch = configContent.match(/connectors\s*:\s*([\s\S]*?)(?=(?:components|bindings|$))/);
        if (connMatch) {
            const connContent = connMatch[1].split(';').map(c => c.trim()).filter(Boolean);
            connContent.forEach(conn => {
                const [name, type] = conn.split(':').map(s => s.trim());
                if (name && type) config.connectors.push({ name, type });
            });
        }

        // Parse bindings
        const bindingMatch = configContent.match(/bindings\s+([\w\.]+)\s*=\s*([\w\.]+)/g);
        if (bindingMatch) {
            config.bindings = bindingMatch.map(b => {
                const bindingParts = b.match(/bindings\s+([\w\.]+)\s*=\s*([\w\.]+)/);
                if (bindingParts) {
                    const sourceParts = bindingParts[1].split('.');
                    const targetParts = bindingParts[2].split('.');
                    const source = sourceParts.length > 1 ? bindingParts[1] : `${config.components[0]?.name}.${bindingParts[1]}`;
                    const target = targetParts.length > 1 ? bindingParts[2] : `${config.components[1]?.name}.${bindingParts[2]}`;
                    const connector = config.connectors.find(c => c.name.includes('c'))?.name || 'c1';
                    return { source, target, connector };
                }
                return null;
            }).filter(Boolean);
        }

        return config;
    }

    console.log('Modelo parseado final:', JSON.stringify(model, null, 2));
    return model;
}

if (typeof window !== 'undefined') {
    window.parseSysADL = parseSysADL;
}
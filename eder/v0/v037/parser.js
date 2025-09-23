/* parser.js (VERSÃO REVISADA E ROBUSTA)
   - Melhorias para suportar exemplos complexos de SysADL, com mais verificações de erro e capturas mais detalhadas.
*/

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

    // Normalizar conteúdo: remover comentários e quebras de linha extras
    content = content
        .replace(/\/\/[^\n\r]*/g, '') // remove comentários de linha
        .replace(/\/\*[\s\S]*?\*\//g, '') // remove comentários em bloco
        .replace(/\r\n/g, '\n') // normaliza para novas linhas UNIX
        .replace(/\n\s*\n/g, '\n') // remove quebras de linha extras
        .trim();

    // Extrair nome do modelo
    const modelMatch = content.match(/Model\s+([\w\.]+)\s*;/);
    if (modelMatch) {
        model.name = modelMatch[1];
    }

    // Função auxiliar para extrair conteúdo de blocos {}
    function extractBlockContent(str, startIndex) {
        if (startIndex === -1 || str[startIndex] !== '{') return '';
        let openBraces = 1;
        let i = startIndex + 1;
        while (i < str.length && openBraces > 0) {
            if (str[i] === '{') openBraces++;
            if (str[i] === '}') openBraces--;
            i++;
        }
        return str.substring(startIndex + 1, i - 1).trim();
    }

    // Parse de involvedElements
    const involvedRegex = /using\s+([\w\.]+)\s*;/g;
    let involvedMatch;
    while ((involvedMatch = involvedRegex.exec(content)) !== null) {
        model.involvedElements.push(involvedMatch[1]);
    }

    // Parse de definições (component, port, connector, activity, executable, constraint)
    const defRegex = /((?:boundary\s+)?component|port|connector|activity|action|executable|constraint|value\s+type)\s+def\s+([\w\.]+)(?:\s*\(([^)]*)\))?(?:\s*\(([^)]*)\))?\s*{/gs;
    let defMatch;
    while ((defMatch = defRegex.exec(content)) !== null) {
        const type = defMatch[1].replace('boundary ', '').trim();
        const name = defMatch[2];
        const inParams = defMatch[3] ? defMatch[3].trim() : '';
        const outParams = defMatch[4] ? defMatch[4].trim() : '';
        const blockStartIndex = content.indexOf('{', defMatch.index);
        const blockContent = extractBlockContent(content, blockStartIndex);

        switch (type) {
            case 'value type':
                const valueType = { type: 'ValueTypeDef', name, dimension: null, unit: null, extends: null };
                const dimensionMatch = blockContent.match(/dimension\s*=\s*(\w+)/);
                if (dimensionMatch) valueType.dimension = dimensionMatch[1];
                const unitMatch = blockContent.match(/unit\s*=\s*(\w+)/);
                if (unitMatch) valueType.unit = unitMatch[1];
                const extendsMatch = blockContent.match(/extends\s+(\w+)/);
                if (extendsMatch) valueType.extends = extendsMatch[1];
                model.types.push(valueType);
                break;

            case 'port':
                const port = { type: 'PortDef', name, flows: [] };
                const flowMatches = blockContent.match(/flow\s+(in|out|inout)\s+([\w\.]+)/g) || [];
                flowMatches.forEach(fm => {
                    const [, direction, flowType] = fm.match(/flow\s+(in|out|inout)\s+([\w\.]+)/);
                    port.flows.push({ direction, type: flowType });
                });
                model.ports.push(port);
                break;

            case 'component':
                const comp = { 
                    type: 'ComponentDef', 
                    name, 
                    isBoundary: defMatch[1].startsWith('boundary'), 
                    ports: [], 
                    configuration: null 
                };
                const portsMatch = blockContent.match(/ports\s*:\s*([\s\S]*?)(?=(?:configuration|$))/);
                if (portsMatch) {
                    comp.ports = portsMatch[1].split(';').map(p => {
                        const parts = p.trim().split(':').map(s => s.trim());
                        if (parts.length < 2) return null;
                        return { name: parts[0], type: parts[1] };
                    }).filter(p => p);
                }
                const configMatch = blockContent.match(/configuration\s*{([\s\S]*)}/);
                if (configMatch) {
                    comp.configuration = parseConfiguration(configMatch[1]);
                }
                model.components.push(comp);
                break;

            case 'connector':
                const connector = { type: 'ConnectorDef', name, participants: [], flows: [], configuration: null };
                const participantMatch = blockContent.match(/participants\s*:\s*([\s\S]*?)(?=(?:flows|configuration|$))/);
                if (participantMatch) {
                    connector.participants = participantMatch[1].split(';').map(p => {
                        const parts = p.trim().split(':').map(s => s.trim());
                        if (parts.length < 2) return null;
                        return { name: parts[0].replace('~', ''), type: parts[1] };
                    }).filter(p => p);
                }
                const flowMatch = blockContent.match(/flows\s*:\s*([\s\S]*?)(?=(?:configuration|$))/);
                if (flowMatch) {
                    connector.flows = flowMatch[1].split(';').map(f => {
                        const parts = f.trim().split(/\s+from\s+|\s+to\s+/).map(s => s.trim());
                        if (parts.length < 3) return null;
                        return { type: parts[0], from: parts[1], to: parts[2] };
                    }).filter(f => f);
                }
                const connConfigMatch = blockContent.match(/configuration\s*{([\s\S]*)}/);
                if (connConfigMatch) {
                    connector.configuration = parseConfiguration(connConfigMatch[1]);
                }
                model.connectors.push(connector);
                break;

            case 'activity':
                const activity = { type: 'ActivityDef', name, inParameters: [], outParameters: [], actions: [], delegates: [] };
                if (inParams) {
                    activity.inParameters = inParams.split(',').map(p => {
                        const [name, type] = p.trim().split(':').map(s => s.trim());
                        return name && type ? { name, type } : null;
                    }).filter(p => p);
                }
                if (outParams) {
                    activity.outParameters = outParams.split(',').map(p => {
                        const [name, type] = p.trim().split(':').map(s => s.trim());
                        return name && type ? { name, type } : null;
                    }).filter(p => p);
                }
                const actionsMatch = blockContent.match(/actions\s*:\s*([\s\S]*?)(?=(?:delegate|$))/);
                if (actionsMatch) {
                    activity.actions = actionsMatch[1].split(',').map(a => {
                        const parts = a.trim().split(':').map(s => s.trim());
                        if (parts.length < 2) return null;
                        const action = { id: parts[0], name: parts[1], pins: [], constraint: null };
                        const pinsMatch = a.match(/using\s+pins\s*:\s*([\s\S]*?)(?=(?:constraint|$))/);
                        if (pinsMatch) {
                            action.pins = pinsMatch[1].split(';').map(p => {
                                const pinParts = p.trim().split(':').map(s => s.trim());
                                return pinParts.length >= 2 ? { name: pinParts[0], type: pinParts[1] } : null;
                            }).filter(p => p);
                        }
                        const constraintMatch = a.match(/constraint\s*:\s*post-condition\s+([\w\.]+)/);
                        if (constraintMatch) action.constraint = constraintMatch[1];
                        return action;
                    }).filter(a => a);
                }
                const delegateMatch = blockContent.match(/delegate\s+(\w+)\s+to\s+(\w+)/g);
                if (delegateMatch) {
                    activity.delegates = delegateMatch.map(d => {
                        const [, source, target] = d.match(/delegate\s+(\w+)\s+to\s+(\w+)/);
                        return { source, target };
                    });
                }
                model.activities.push(activity);
                break;

            case 'executable':
                const executable = { type: 'ExecutableDef', name, inParameters: [], outParameters: [], body: blockContent.trim() };
                if (inParams) {
                    executable.inParameters = inParams.split(',').map(p => {
                        const [name, type] = p.trim().split(':').map(s => s.trim());
                        return name && type ? { name, type } : null;
                    }).filter(p => p);
                }
                if (outParams) {
                    executable.outParameters = outParams.split(',').map(p => {
                        const [name, type] = p.trim().split(':').map(s => s.trim());
                        return name && type ? { name, type } : null;
                    }).filter(p => p);
                }
                model.executables.push(executable);
                break;

            case 'constraint':
                const constraint = { type: 'ConstraintDef', name, inParameters: [], outParameters: [], equation: null };
                if (inParams) {
                    constraint.inParameters = inParams.split(',').map(p => {
                        const [name, type] = p.trim().split(':').map(s => s.trim());
                        return name && type ? { name, type } : null;
                    }).filter(p => p);
                }
                if (outParams) {
                    constraint.outParameters = outParams.split(',').map(p => {
                        const [name, type] = p.trim().split(':').map(s => s.trim());
                        return name && type ? { name, type } : null;
                    }).filter(p => p);
                }
                const equationMatch = blockContent.match(/equation\s*=\s*([\s\S]+)/);
                if (equationMatch) constraint.equation = equationMatch[1].trim().replace(/;/g, '');
                model.constraints.push(constraint);
                break;
        }
    }

    // Parse de allocations
    const allocsMatch = content.match(/allocations\s*{([\s\S]*?)}/);
    if (allocsMatch) {
        const allocsContent = allocsMatch[1].trim();
        model.allocations = allocsContent.split('\n').map(l => {
            const parts = l.trim().split(/\s+/);
            if (parts.length >= 4 && parts[2].toLowerCase() === 'to') {
                return { type: parts[0], source: parts[1], target: parts[3] };
            }
            return null;
        }).filter(Boolean);
    }

    return model;
}

function parseConfiguration(configContent) {
    const config = { subComponents: [], connectors: [], bindings: [], delegations: [] };

    // Parse sub-components
    const subCompMatch = configContent.match(/components\s*:\s*([\s\S]*?)(?=(?:connectors|delegations|$))/);
    if (subCompMatch) {
        const subCompRegex = /([\w\s\[\],\-\d]+)\s*:\s*([\w\.]+)(?:\s*{([\s\S]*?)})?/g;
        let scMatch;
        while ((scMatch = subCompRegex.exec(subCompMatch[1])) !== null) {
            const name = scMatch[1].trim().split(' ')[0];
            const type = scMatch[2].trim();
            const portsBlock = scMatch[3] || '';
            const sub = { name, type, portAliases: [] };
            const portMatch = portsBlock.match(/using\s+ports\s*:\s*([\s\S]*?)(?=\s*(?:}|$))/);
            if (portMatch) {
                sub.portAliases = portMatch[1].split(';').map(p => {
                    const [alias, portType] = p.trim().split(':').map(s => s.trim());
                    return alias && portType ? { alias, type: portType } : null;
                }).filter(Boolean);
            }
            config.subComponents.push(sub);
        }
    }

    // Parse connectors
    const connMatch = configContent.match(/connectors\s*:\s*([\s\S]*?)(?=(?:components|delegations|$))/);
    if (connMatch) {
        const connPairs = connMatch[1].split(';').map(c => c.trim()).filter(Boolean);
        connPairs.forEach(pair => {
            const [namePart, rest] = pair.split(':', 2);
            if (!namePart || !rest) return;
            const name = namePart.trim();
            const typeMatch = rest.match(/^\s*([\w\.]+)/);
            if (!typeMatch) return;
            const type = typeMatch[1];
            config.connectors.push({ name, type });
        });
    }

    // Parse bindings
    const bindingMatch = configContent.match(/bindings\s*:\s*([\s\S]*?)(?=(?:components|connectors|delegations|$))/);
    if (bindingMatch) {
        config.bindings = bindingMatch[1].split(';').map(b => {
            const parts = b.trim().split(/\s*=\s*/);
            if (parts.length < 2) return null;
            const [source, rest] = parts;
            const [target, connector] = rest.split(/\s*via\s*/).map(s => s.trim());
            return { source, target, connector };
        }).filter(Boolean);
    }

    // Parse delegations
    const delegationsMatch = configContent.match(/delegations\s*:\s*([\s\S]*?)(?=(?:components|connectors|$))/);
    if (delegationsMatch) {
        config.delegations = delegationsMatch[1].split(';').map(d => {
            const [source, target] = d.trim().split(/\s+to\s+/).map(s => s.trim());
            return source && target ? { source, target } : null;
        }).filter(Boolean);
    }

    return config;
}

if (typeof window !== 'undefined') {
    window.parseSysADL = parseSysADL;
}


/* parser.js (VERSÃO FINAL)
   - Extrai de forma mais limpa as definições e os aliases de portas.
   - Melhora a robustez geral da análise para lidar com múltiplos arquivos e sintaxes complexas.
*/

// @ts-nocheck

function parseSysADL(content) {
    const model = {
        name: 'SysADLModel',
        components: [],
        connectors: [],
        ports: [],
        activities: [],
        constraints: [],
        executables: [],
        allocations: [],
        types: []
    };

    // Pré-processamento: remove comentários e normaliza quebras de linha
    content = content.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\r\n/g, '\n');

    const modelMatch = content.match(/Model\s+([\w\.]+)\s*;/);
    if (modelMatch) model.name = modelMatch[1];

    // Função auxiliar para extrair blocos aninhados de forma segura
    function extractBlockContent(str, startIndex) {
        if (startIndex === -1 || str[startIndex] !== '{') return null;
        let openBraces = 1;
        let i = startIndex + 1;
        while (i < str.length && openBraces > 0) {
            if (str[i] === '{') openBraces++;
            if (str[i] === '}') openBraces--;
            i++;
        }
        return str.substring(startIndex + 1, i - 1);
    }

    // Pass 1: Parse de todas as definições de alto nível
    const definitionsRegex = /((?:boundary\s+)?component|connector|port|activity|action|constraint|executable|enum|datatype|value type)\s+def\s+([\w\.]+)/gs;
    let defMatch;
    while ((defMatch = definitionsRegex.exec(content)) !== null) {
        const type = defMatch[1].replace('boundary ', '').trim();
        const name = defMatch[2];
        const isBoundary = defMatch[1].startsWith('boundary');
        const blockStartIndex = content.indexOf('{', defMatch.index);
        const blockContent = extractBlockContent(content, blockStartIndex);

        if (blockContent === null) continue;

        switch (type) {
            case 'component':
                const comp = { name, isBoundary, ports: [], configuration: null };
                // Regex para encontrar a definição de portas do componente
                const portsDefMatch = blockContent.match(/ports\s*:\s*([\s\S]*?)(configuration|$)/);
                if (portsDefMatch) {
                    comp.ports = portsDefMatch[1].split(';').map(p => {
                        const parts = p.trim().split(':');
                        if (parts.length < 2) return null;
                        return { name: parts[0].trim(), type: parts[1].trim() };
                    }).filter(p => p && p.name && p.type);
                }
                const configMatch = blockContent.match(/configuration\s*{([\s\S]*)}/);
                if (configMatch) {
                    comp.configuration = parseConfiguration(configMatch[1]);
                }
                model.components.push(comp);
                break;

            case 'port':
                const port = { name, flows: [] };
                const flowMatches = [...blockContent.matchAll(/flow\s+(in|out|inout)\s+([\w\.]+)/g)];
                flowMatches.forEach(fm => port.flows.push({ direction: fm[1], type: fm[2] }));
                model.ports.push(port);
                break;
            
             case 'connector':
                 const connector = { name, participants: [] };
                 model.connectors.push(connector);
                 break;

            case 'activity':
                 const activity = { name, actions: [] };
                 const actionsMatch = blockContent.match(/actions\s*:\s*([\s\S]*?);/);
                 if (actionsMatch) {
                    activity.actions = actionsMatch[1].split(',').map(a => {
                        const [id, actionName] = a.trim().split(':').map(s => s.trim());
                        return { id, name: actionName };
                    });
                 }
                 model.activities.push(activity);
                 break;
            
             case 'action':
                 const actionConstraintMatch = blockContent.match(/constraint\s*:\s*post-condition\s+([\w\.]+)/);
                 if (actionConstraintMatch) {
                     const constraintName = actionConstraintMatch[1];
                     model.activities.forEach(act => {
                         const targetAction = act.actions.find(a => a.name === name);
                         if (targetAction) targetAction.constraint = constraintName;
                     });
                 }
                 break;

            case 'constraint':
                 const constraint = { name };
                 const equationMatch = blockContent.match(/equation\s*=\s*([\s\S]+)/);
                 if (equationMatch) constraint.equation = equationMatch[1].trim().replace(/;/g, '');
                 
                 const fullConstraintRegex = new RegExp(`constraint\\s+${name}\\s*\\(([^)]*)\\)\\s*(?::\\s*\\(([^)]*)\\))?`);
                 const paramsMatch = content.substring(defMatch.index).match(fullConstraintRegex);
                 if (paramsMatch) {
                     constraint.inputs = paramsMatch[1].trim();
                     constraint.outputs = paramsMatch[2] ? paramsMatch[2].trim() : '';
                 }
                 model.constraints.push(constraint);
                 break;

            case 'executable':
                 const executable = { name, body: blockContent.trim() };
                 const fullExecRegex = new RegExp(`executable\\s+def\\s+${name}\\s*\\(([^)]*)\\)\\s*:\\s*out\\s+([^\\{]+)`);
                 const execMatch = content.substring(defMatch.index).match(fullExecRegex);
                 if (execMatch) {
                     executable.inputs = execMatch[1].trim();
                     executable.output = execMatch[2].trim();
                 }
                 model.executables.push(executable);
                 break;
        }
    }
    
    // Pass 2: Parse allocations
    const allocsMatch = content.match(/allocations\s*{([\s\S]*?)}/);
    if (allocsMatch) {
        const allocsContent = allocsMatch[1].trim();
        model.allocations = allocsContent.split('\n').map(l => {
            const parts = l.trim().split(/\s+/);
            if (parts.length === 4 && parts[2].toLowerCase() === 'to') {
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
    const subCompContentMatch = configContent.match(/components\s*:\s*([\s\S]*?)(?=\s*connectors|\s*delegations|$)/);
    if (subCompContentMatch) {
        const subCompRegex = /([\w\s\[\],\-\d]+)\s*:\s*([\w\.]+)\s*{([\s\S]*?)}/g;
        let scMatch;
        while ((scMatch = subCompRegex.exec(subCompContentMatch[1])) !== null) {
            const name = scMatch[1].trim().split(' ')[0];
            const type = scMatch[2].trim();
            const portsBlock = scMatch[3];
            const sub = { name, type, portAliases: [] };
            const portMatch = portsBlock.match(/using\s+ports\s*:\s*([\s\S]+)/);
            if (portMatch) {
                sub.portAliases = portMatch[1].split(';').map(p => {
                    const [alias, portType] = p.trim().split(':');
                    return alias && portType ? { alias: alias.trim(), type: portType.trim() } : null;
                }).filter(Boolean);
            }
            config.subComponents.push(sub);
        }
    }

    // Parse connectors and bindings
    const connContentMatch = configContent.match(/connectors\s*:\s*([\s\S]*?)(?=\s*components|\s*delegations|$)/);
    if (connContentMatch) {
        const connPairs = connContentMatch[1].split(';').map(c => c.trim()).filter(Boolean);
        connPairs.forEach(pair => {
            const [namePart, typePart] = pair.split(':', 2);
            if (!namePart || !typePart) return;
            const name = namePart.trim();
            const type = typePart.match(/^\s*(\w+)/)[1];
            config.connectors.push({ name, type });
            
            const bindingMatch = typePart.match(/bindings\s+([\w\.]+)\s*=\s*([\w\.]+)/);
            if (bindingMatch) {
                const alias1 = bindingMatch[1].trim();
                const alias2 = bindingMatch[2].trim();
                // Encontrar a qual subcomponente cada alias pertence
                const comp1 = config.subComponents.find(sc => sc.portAliases.some(pa => pa.alias === alias1));
                const comp2 = config.subComponents.find(sc => sc.portAliases.some(pa => pa.alias === alias2));
                if (comp1 && comp2) {
                    config.bindings.push({
                        connector: name,
                        source: `${comp1.name}.${alias1}`,
                        target: `${comp2.name}.${alias2}`
                    });
                }
            }
        });
    }

    return config;
}

if (typeof window !== 'undefined') {
    window.parseSysADL = parseSysADL;
}
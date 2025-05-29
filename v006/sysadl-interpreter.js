// sysadl-interpreter.js

// Variável global para armazenar o modelo SysADL
const sysadlModel = {
    components: {},
    ports: {},
    connectors: {},
    flows: [],
    executables: {},
    configurations: [],
    protocols: {},
    constraints: {},
    dataTypes: {},
    allocations: [],
    requirements: {},
    simulationInputs: { flows: {}, executables: {} },
    enums: {}
};

// Funções para depuração (se precisar)
// const log = msg => (document.getElementById("log").innerText += msg + "\n");
// const trace = [];

function interpretSysADL() {
    const input = editor.getValue();
    const logEl = document.getElementById("log");
    logEl.innerText = "";
    const log = msg => (logEl.innerText += msg + "\n");
    const trace = [];

    // 0. Resetar o modelo antes de cada interpretação
    sysadlModel.components = {};
    sysadlModel.ports = {};
    sysadlModel.connectors = {};
    sysadlModel.flows = [];
    sysadlModel.executables = {};
    sysadlModel.configurations = [];
    sysadlModel.protocols = {};
    sysadlModel.constraints = {};
    sysadlModel.dataTypes = {};
    sysadlModel.allocations = [];
    sysadlModel.requirements = {};
    sysadlModel.simulationInputs = { flows: {}, executables: {} };
    sysadlModel.enums = {};

    console.log("DEBUG: Initial sysadlModel.executables (after reset):", sysadlModel.executables); // DEBUG 1

    let currentBlock = null;
    let blockLines = [];
    let currentComponent = null;

    const lines = input.split("\n");
    const parsedBlocks = []; // Para armazenar blocos parseados para a segunda passagem

    // --- PRIMEIRA PASSAGEM: Coletar Todas as Definições ---
    // Nesta passagem, vamos identificar os blocos e seus conteúdos
    // e criar os objetos de modelo *básicos* (sem resolver todas as referências ainda).
    log("--- Parsing Pass 1: Collecting Definitions ---");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith("//")) continue;

        if (line.endsWith("{")) {
            const blockHeader = line.slice(0, -1).trim();
            blockLines = [];
            let blockType = null;
            let blockName = null;
            let paramsStr = ''; // Para executables

            if (blockHeader.startsWith("abstract component def")) {
                blockType = "component";
                blockName = blockHeader.split(" ")[3];
                currentComponent = new SysADLComponent(blockName, null, true);
                sysadlModel.components[blockName] = currentComponent;
            } else if (blockHeader.startsWith("component def")) {
                blockType = "component";
                blockName = blockHeader.split(" ")[2];
                currentComponent = new SysADLComponent(blockName);
                sysadlModel.components[blockName] = currentComponent;
            } else if (blockHeader.startsWith("connector def")) {
                blockType = "connector";
                blockName = blockHeader.split(" ")[2];
                sysadlModel.connectors[blockName] = new SysADLConnector(blockName, []);
            } else if (blockHeader.startsWith("executable def")) {
                blockType = "executable";
                const match = blockHeader.match(/executable def (\w+)\s*(?:\(([^)]*)\))?\s*:\s*out\s+(\w+)/);
                if (match) {
                    blockName = match[1];
                    paramsStr = match[2] || '';
                    const returnType = match[3];
                    const params = parseParams(paramsStr);
                    sysadlModel.executables[blockName] = new SysADLExecutable(blockName, params, returnType, []);
                    console.log(`DEBUG P1: Executable '${blockName}' registered with basic object. sysadlModel.executables['${blockName}'] now:`, sysadlModel.executables[blockName]); // DEBUG 2
                } else {
                    const basicMatch = blockHeader.match(/executable def (\w+)/);
                    blockName = basicMatch ? basicMatch[1] : `unnamed_executable_${Object.keys(sysadlModel.executables).length}`;
                    sysadlModel.executables[blockName] = new SysADLExecutable(blockName, [], 'Unknown', []);
                    console.warn(`Warning P1: Executable '${blockName}' parsed with basic match. Parameters/return type might be missing.`);
                }
            } else if (blockHeader === "configuration") {
                blockType = "configuration";
                sysadlModel.configurations.push({ components: [], connectors: [], protocols: [] });
            } else if (blockHeader === "simulation") {
                blockType = "simulation";
            } else if (blockHeader.startsWith("protocol")) {
                blockType = "protocol";
                blockName = blockHeader.split(" ")[1];
                sysadlModel.protocols[blockName] = { name: blockName, actions: [] };
            } else if (blockHeader.startsWith("constraint def")) {
                blockType = "constraint";
                blockName = blockHeader.split(" ")[2];
                sysadlModel.constraints[blockName] = { name: blockName, precondition: null, postcondition: null };
            } else if (blockHeader.startsWith("datatype def")) {
                blockType = "datatype";
                blockName = blockHeader.split(" ")[2];
                sysadlModel.dataTypes[blockName] = { name: blockName, fields: [] };
            } else if (blockHeader.startsWith("enum")) {
                blockType = "enum";
                blockName = blockHeader.split(" ")[1];
                sysadlModel.enums[blockName] = { name: blockName, literals: [] };
            } else if (blockHeader.startsWith("requirement def")) {
                blockType = "requirement";
                const match = blockHeader.match(/requirement def (\w+)\s*\(([^)]*)\)/);
                blockName = match ? match[1] : blockHeader.split(" ")[2];
                sysadlModel.requirements[blockName] = { name: blockName, condition: null };
            }
            currentBlock = { type: blockType, name: blockName, startIndex: i + 1, lines: [] };
            continue;
        }

        if (line === "}") {
            if (currentBlock) {
                // Ao fechar um bloco, armazene-o para processamento posterior
                currentBlock.endIndex = i;
                parsedBlocks.push(currentBlock);
                currentBlock = null;
                currentComponent = null; // Reset currentComponent after block closes
            }
            continue;
        }

        if (currentBlock) {
            currentBlock.lines.push(line);
            continue;
        }

        // Linhas fora de blocos na primeira passagem (para flows e allocations)
        // Isso permite que flows e allocations sejam conhecidos antes da simulação
        if (line.startsWith("flow")) {
            const match = line.match(/flow\s+([\w\.]+)\s+->\s+([\w\.]+);?/);
            if (match) {
                const [, src, tgt] = match;
                sysadlModel.flows.push(new SysADLFlow(src, tgt)); // Apenas registra o fluxo
            }
        } else if (line.startsWith("allocation")) {
            const match = line.match(/allocation\s+(\w+)\s*->\s*(\w+);?/);
            if (match) {
                const [, activity, executable] = match;
                sysadlModel.allocations.push(new SysADLAllocation(activity, executable)); // Apenas registra a alocação
            }
        }
    }

    // --- SEGUNDA PASSAGEM: Preencher Detalhes e Executar Lógica ---
    // Agora que todos os objetos básicos estão em sysadlModel, podemos preencher seus detalhes
    // e realizar a simulação.
    log("\n--- Parsing Pass 2: Filling Details and Preparing Simulation ---");

    parsedBlocks.forEach(block => {
        switch (block.type) {
            case "component":
                // Preencher portas e atividades do componente
                const comp = sysadlModel.components[block.name];
                block.lines.forEach(bl => {
                    const bLine = bl.trim();
                    if (bLine.startsWith("ports:")) {
                        const portDefs = bLine.replace("ports:", "").trim().split(",").filter(p => p.trim() !== '');
                        portDefs.forEach(p => {
                            const parts = p.trim().split(":");
                            const pname = parts[0];
                            const direction = parts[1];
                            const type = parts[2] || "Unknown";
                            const port = new SysADLPort(pname, direction, comp.name, type);
                            comp.addPort(port);
                            sysadlModel.ports[`${comp.name}.${pname}`] = port;
                        });
                    } else if (bLine.startsWith("activities:")) {
                        const activityDefs = bLine.replace("activities:", "").trim().split(",").filter(a => a.trim() !== '');
                        activityDefs.forEach(a => {
                            const match = a.trim().match(/(\w+)\s*(\(([^)]*)\))?/);
                            const name = match[1];
                            const params = match[3] ? match[3].split(",").map(p => p.trim()) : [];
                            const activity = new SysADLActivity(name, params);
                            comp.addActivity(activity);
                        });
                    }
                });
                break;
            case "connector":
                const conn = sysadlModel.connectors[block.name];
                block.lines.forEach(bl => {
                    const bLine = bl.trim();
                    if (bLine.startsWith("ports:")) {
                        const portDefs = bLine.replace("ports:", "").trim().split(",").filter(p => p.trim() !== '');
                        conn.ports = portDefs.map(p => p.trim());
                        // As portas do conector são referências, não objetos SysADLPort diretamente aqui.
                        // Elas serão resolvidas na simulação dos flows.
                    }
                });
                break;
            case "executable":
                // Preencher statements do executável
                const exec = sysadlModel.executables[block.name];
                if (exec) {
                    exec.statements = parseExecutableBody(block.lines);
                    console.log(`DEBUG P2: Executable '${block.name}' statements parsed. sysadlModel.executables['${block.name}'] final state:`, sysadlModel.executables[block.name]); // DEBUG 3
                } else {
                    console.error(`ERROR P2: Executable '${block.name}' not found during second pass.`);
                }
                break;
            case "configuration":
                const config = sysadlModel.configurations[sysadlModel.configurations.length - 1]; // Pega a última config
                block.lines.forEach(l => {
                    if (l.startsWith("components:")) {
                        config.components = l.replace("components:", "").trim().split(",").filter(c => c.trim() !== '').map(c => {
                            const [name, def] = c.trim().split(":");
                            return { name, definition: def };
                        });
                    } else if (l.startsWith("connectors:")) {
                        config.connectors = l.replace("connectors:", "").trim().split(",").filter(c => c.trim() !== '').map(c => {
                            const [name, def] = c.trim().split(":");
                            return { name, definition: def };
                        });
                    } else if (l.startsWith("protocols:")) {
                        config.protocols = l.replace("protocols:", "").trim().split(",").filter(p => p.trim() !== '');
                    }
                });
                break;
            case "simulation":
                block.lines.forEach(l => {
                    if (l.startsWith("flow ")) {
                        const match = l.match(/flow\s+([\w\.]+)\s*=\s*([^;]+);?/);
                        if (match) {
                            const port = match[1];
                            let valueStr = match[2].trim();
                            let value = parseExpression(valueStr).value;
                            sysadlModel.simulationInputs.flows[port] = value;
                        }
                    } else if (l.startsWith("executable ")) {
                        const match = l.match(/executable\s+(\w+)\s*=\s*\[([^\]]+)\];?/);
                        if (match) {
                            const name = match[1];
                            const valuesStr = match[2].split(",").map(v => v.trim());
                            const values = valuesStr.map(v => parseExpression(v).value);
                            sysadlModel.simulationInputs.executables[name] = values;
                        }
                    }
                });
                break;
            case "protocol":
                const proto = sysadlModel.protocols[block.name];
                if (proto) {
                    proto.actions = parseProtocolBody(block.lines);
                }
                break;
            case "constraint":
                const constr = sysadlModel.constraints[block.name];
                block.lines.forEach(l => {
                    if (l.startsWith("pre:")) {
                        constr.precondition = l.replace("pre:", "").trim().replace(";", "");
                    } else if (l.startsWith("post:")) {
                        constr.postcondition = l.replace("post:", "").trim().replace(";", "");
                    }
                });
                break;
            case "datatype":
                const dt = sysadlModel.dataTypes[block.name];
                dt.fields = block.lines.map(l => {
                    const trimmed = l.trim();
                    if (trimmed) {
                        const [fname, ftype] = trimmed.replace(";", "").split(":");
                        return { name: fname.trim(), type: ftype.trim() };
                    }
                    return null;
                }).filter(f => f !== null);
                break;
            case "enum":
                const enumDef = sysadlModel.enums[block.name];
                enumDef.literals = block.lines.map(l => l.trim().replace(",", "").replace(";", "")).filter(l => l !== '');
                break;
            case "requirement":
                const req = sysadlModel.requirements[block.name];
                block.lines.forEach(l => {
                    const trimmed = l.trim();
                    if (trimmed.startsWith("text =")) {
                        req.text = trimmed.replace("text =", "").replace(/;?$/, '').trim();
                    } else if (trimmed.startsWith("satisfied by")) {
                        req.satisfiedBy = trimmed.replace("satisfied by", "").replace(/;?$/, '').split(',').map(s => s.trim());
                    } else if (trimmed.startsWith("condition:")) {
                        req.condition = trimmed.replace("condition:", "").trim().replace(";", "");
                    }
                });
                break;
            default:
                // Ignorar linhas fora de blocos que já foram processadas na Passagem 1 (flows, allocations)
                break;
        }
    });

    log("\n--- Simulation Start ---");

    // --- FASE DE SIMULAÇÃO (após tudo estar parseado e referenciado) ---

    // Validar requisitos (agora todas as portas e dados devem estar populados)
    Object.values(sysadlModel.requirements).forEach(req => {
        const context = { variables: {} };
        // Preencher o contexto com o estado atual de todos os elementos do modelo
        // (portas, componentes, etc. para que evaluateConstraint possa acessá-los)
        Object.entries(sysadlModel.ports).forEach(([portName, port]) => {
            const nameParts = portName.split('.');
            let currentContextObj = context.variables;
            for (let i = 0; i < nameParts.length - 1; i++) {
                const part = nameParts[i];
                if (!currentContextObj[part]) {
                    currentContextObj[part] = {};
                }
                currentContextObj = currentContextObj[part];
            }
            currentContextObj[nameParts[nameParts.length - 1]] = port.value;
        });

        if (!req.condition) {
            log(`Requirement '${req.name}' has no condition to evaluate.`);
            trace.push(`Requirement '${req.name}' has no condition.`);
            return;
        }

        let isValid = false;
        try {
            isValid = evaluateConstraint(req.condition, context);
        } catch (e) {
            log(`Error evaluating requirement '${req.name}' condition: ${req.condition}. Error: ${e.message}`);
            isValid = false;
        }

        if (!isValid) {
            log(`Requirement '${req.name}' FAILED: ${req.condition}`);
        } else {
            log(`Requirement '${req.name}' PASSED: ${req.condition}`);
            trace.push(`Requirement '${req.name}' PASSED: ${req.condition}`);
        }
    });

    // Inicializar portas com valores da seção simulation (seção `simulation` já foi parseada na Passagem 2)
    Object.entries(sysadlModel.simulationInputs.flows).forEach(([port, value]) => {
        if (sysadlModel.ports[port]) {
            sysadlModel.ports[port].value = value;
            const compName = port.split(".")[0];
            if (sysadlModel.components[compName]) {
                sysadlModel.components[compName].state[port.split(".")[1]] = value;
            }
            trace.push(`Port ${port} initialized with: ${JSON.stringify(value)}`);
        }
    });

    // Propagar fluxos
    sysadlModel.flows.forEach(f => {
        const srcPort = sysadlModel.ports[f.source];
        if (!srcPort) {
            log(`Error: Source port '${f.source}' for flow not found during simulation. Skipping.`);
            return;
        }
        const flowData = sysadlModel.simulationInputs.flows[f.source] !== undefined
            ? sysadlModel.simulationInputs.flows[f.source]
            : getDefaultValue(srcPort.type);
        trace.push(`Flow ${f.source} initialized with: ${JSON.stringify(flowData)}`);
        const propagatedData = f.propagate(flowData, sysadlModel.components, sysadlModel.ports, log, trace);
        const tgtPort = sysadlModel.ports[f.target];
        if (tgtPort) {
            const tgtComp = sysadlModel.components[tgtPort.component];
            if (tgtComp) {
                tgtComp.activities.forEach(act => {
                    const result = act.execute(tgtComp, [propagatedData], trace);
                    log(result.log);
                });
            }
        } else {
            log(`Error: Target port '${f.target}' for flow not found during simulation. Skipping.`);
        }
    });

    // Executar atividades dos subcomponentes na configuração
    sysadlModel.configurations.forEach(config => {
        config.components.forEach(c => {
            const compDef = sysadlModel.components[c.definition];
            if (compDef) {
                const subCompInstance = new SysADLComponent(c.name, c.definition, compDef.isAbstract);
                compDef.ports.forEach(p => {
                    const port = new SysADLPort(p.name, p.direction, c.name, p.type, p.value);
                    subCompInstance.addPort(port);
                    sysadlModel.ports[`${c.name}.${p.name}`] = port;
                    subCompInstance.state[port.name] = sysadlModel.simulationInputs.flows[`${c.name}.${p.name}`] !== undefined ?
                                                    sysadlModel.simulationInputs.flows[`${c.name}.${p.name}`] : getDefaultValue(port.type);
                });
                compDef.activities.forEach(a => subCompInstance.addActivity(new SysADLActivity(a.name, a.params)));
                sysadlModel.components[c.name] = subCompInstance;

                subCompInstance.activities.forEach(act => {
                    const paramName = act.params[0]?.split(":")[0];
                    const paramType = act.params[0]?.split(":")[1];
                    const input = subCompInstance.state[paramName] ||
                                sysadlModel.simulationInputs.flows[`${subCompInstance.type}.${paramName}`] ||
                                sysadlModel.simulationInputs.flows[`${c.name}.${paramName}`] ||
                                getDefaultValue(paramType);
                    const result = act.execute(subCompInstance, [input], trace);
                    log(result.log);
                });
            } else {
                log(`Warning: Component definition ${c.definition} not found for ${c.name}.`);
            }
        });

        config.protocols.forEach(protoName => {
            const proto = sysadlModel.protocols[protoName];
            if (proto) {
                const comp = sysadlModel.components[config.components[0]?.name] || Object.values(sysadlModel.components)[0];
                if (comp) {
                    const result = proto.execute(comp, sysadlModel.ports, log, trace);
                    log(`Protocol '${proto.name}' executed: ${JSON.stringify(result)}`);
                } else {
                    log(`Warning: No component found to execute protocol '${proto.name}'.`);
                }
            } else {
                log(`Warning: Protocol '${protoName}' not defined.`);
            }
        });
    });

    // Executar executáveis com alocações
    sysadlModel.allocations.forEach(alloc => {
        const activity = Object.values(sysadlModel.components)
            .flatMap(c => c.activities)
            .find(a => a.name === alloc.activity);
        const executable = sysadlModel.executables[alloc.executable]; // DEBUG PONTO 4

        console.log(`DEBUG: Trying to allocate executable '${alloc.executable}'. Is it in sysadlModel.executables?`, !!executable, sysadlModel.executables); // DEBUG PONTO 4b

        if (activity && executable) {
            const comp = Object.values(sysadlModel.components).find(c =>
                c.activities.some(act => act.name === activity.name)
            );

            const inputs = [];
            executable.params.forEach(param => {
                let inputValue = null;
                if (sysadlModel.simulationInputs.executables[executable.name] && sysadlModel.simulationInputs.executables[executable.name].length > 0) {
                    inputValue = sysadlModel.simulationInputs.executables[executable.name].shift();
                } else if (comp && comp.state[param.name]) {
                    inputValue = comp.state[param.name];
                } else if (sysadlModel.ports[`${comp?.name}.${param.name}`]) {
                    inputValue = sysadlModel.ports[`${comp?.name}.${param.name}`].value;
                } else if (sysadlModel.ports[param.name]) {
                    inputValue = sysadlModel.ports[param.name].value;
                } else {
                    inputValue = getDefaultValue(param.type);
                }
                inputs.push(inputValue);
            });

            const applicableConstraints = Object.values(sysadlModel.constraints).filter(c =>
                (c.precondition) || (c.postcondition) // Verifica se pre/postcondition existem
            );
            const result = executable.execute(inputs, log, applicableConstraints, trace);
            log(`Executable '${executable.name}' for activity '${activity.name}' result: ${JSON.stringify(result)}`);
        } else {
            log(`Warning: Allocation ${alloc.activity} -> ${alloc.executable} not resolved. Activity or Executable not found.`);
            if (!activity) log(`  Activity '${alloc.activity}' not found.`);
            if (!executable) log(`  Executable '${alloc.executable}' not found. Current executables: ${Object.keys(sysadlModel.executables).join(', ')}`);
        }
    });

    // Executar executáveis não alocados
    Object.values(sysadlModel.executables).forEach(ex => {
        if (!sysadlModel.allocations.some(a => a.executable === ex.name)) {
            console.log(`DEBUG: Executing unallocated executable '${ex.name}'. Is it valid?`, !!ex); // DEBUG 5
            const inputs = sysadlModel.simulationInputs.executables[ex.name] || ex.params.map(p => getDefaultValue(p.type));
            const applicableConstraints = Object.values(sysadlModel.constraints).filter(c =>
                (c.precondition) || (c.postcondition)
            );
            const result = ex.execute(inputs, log, applicableConstraints, trace);
            log(`Executable '${ex.name}' result: ${JSON.stringify(result)}`);
        }
    });

    log("\n--- Parameter Trace Summary ---");
    trace.forEach((entry, i) => {
        log(`${i + 1}. ${entry}`);
    });

    log("--- Simulation End ---");

    } 

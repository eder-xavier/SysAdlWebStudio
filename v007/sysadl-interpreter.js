// sysadl-interpreter.js

// Certifique-se de que todas as classes e funções auxiliares estejam disponíveis no escopo global
// ou importadas se estiver usando módulos ES6. Para a abordagem simples de "script" como você está usando,
// declará-las em arquivos separados e incluí-las na ordem correta no HTML funciona.

// Variáveis globais para armazenar os elementos do modelo
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
    requirements: [],
    simulationInputs: { flows: {}, executables: {} }
};

let currentBlock = null;
let blockLines = [];
let currentComponent = null; // Mantenha isso se o parsing ainda usar

function interpretSysADL() {
    const input = editor.getValue();
    const logEl = document.getElementById("log");
    logEl.innerText = "";
    const log = msg => (logEl.innerText += msg + "\n");
    const trace = [];

    // Resetar o modelo antes de cada interpretação
    Object.keys(sysadlModel).forEach(key => {
        if (Array.isArray(sysadlModel[key])) {
            sysadlModel[key] = [];
        } else if (typeof sysadlModel[key] === 'object' && sysadlModel[key] !== null) {
            sysadlModel[key] = {};
        }
    });
    sysadlModel.simulationInputs = { flows: {}, executables: {} }; // Resetar inputs da simulação

    currentBlock = null;
    blockLines = [];
    currentComponent = null;

    try {
        const lines = input.split("\n");
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith("//")) continue;

            if (line.endsWith("{")) {
                const blockHeader = line.slice(0, -1).trim();
                blockLines = [];

                if (blockHeader.startsWith("abstract component def")) {
                    const name = blockHeader.split(" ")[3];
                    currentComponent = new SysADLComponent(name, null, true);
                    sysadlModel.components[name] = currentComponent;
                    currentBlock = "component";
                    log(`Component defined: ${name} (abstract)`);
                } else if (blockHeader.startsWith("component def")) {
                    const name = blockHeader.split(" ")[2];
                    currentComponent = new SysADLComponent(name);
                    sysadlModel.components[name] = currentComponent;
                    currentBlock = "component";
                    log(`Component defined: ${name}`);
                } else if (blockHeader.startsWith("connector def")) {
                    const name = blockHeader.split(" ")[2];
                    currentBlock = "connector";
                    sysadlModel.connectors[name] = new SysADLConnector(name, []);
                    log(`Connector defined: ${name}`);
                } else if (blockHeader.startsWith("executable def")) {
                    const match = blockHeader.match(/executable def (\w+)\s*(?:\(([^)]*)\))?\s*:\s*out\s+(\w+)/);
                    let name, paramsStr, returnType;
                    if (match) {
                        name = match[1];
                        paramsStr = match[2] || '';
                        returnType = match[3];
                    } else { // Fallback for older format if necessary
                        const basicMatch = blockHeader.match(/executable def (\w+)/);
                        name = basicMatch ? basicMatch[1] : `unnamed_executable_${Object.keys(sysadlModel.executables).length}`;
                        paramsStr = '';
                        returnType = 'Unknown';
                    }
                    currentBlock = "executable";
                    const params = parseParams(paramsStr.replace(/in\s+/g, ''));
                    sysadlModel.executables[name] = { name, params, returnType, statements: [] };
                    log(`Executable defined: ${name}`);
                } else if (blockHeader === "configuration") {
                    currentBlock = "configuration";
                    sysadlModel.configurations.push({ components: [], connectors: [], protocols: [] });
                    log(`Configuration defined`);
                } else if (blockHeader === "simulation") {
                    currentBlock = "simulation";
                    log(`Simulation inputs defined`);
                } else if (blockHeader.startsWith("protocol")) {
                    const name = blockHeader.split(" ")[1];
                    currentBlock = "protocol";
                    sysadlModel.protocols[name] = { name, actions: [] };
                    log(`Protocol defined: ${name}`);
                } else if (blockHeader.startsWith("constraint def")) {
                    const name = blockHeader.split(" ")[2];
                    currentBlock = "constraint";
                    sysadlModel.constraints[name] = { name, precondition: null, postcondition: null };
                    log(`Constraint defined: ${name}`);
                } else if (blockHeader.startsWith("datatype def")) {
                    const name = blockHeader.split(" ")[2];
                    currentBlock = "datatype";
                    sysadlModel.dataTypes[name] = { name, fields: [] };
                    log(`DataType defined: ${name}`);
                } else if (blockHeader.startsWith("requirement def")) {
                    const match = blockHeader.match(/requirement def (\w+)\s*\(([^)]*)\)/);
                    const name = match ? match[1] : blockHeader.split(" ")[2];
                    currentBlock = "requirement";
                    sysadlModel.requirements[name] = { name, condition: null };
                    log(`Requirement defined: ${name}`);
                }
                continue;
            }

            if (line === "}") {
                if (currentBlock === "component" && currentComponent) {
                    blockLines.forEach(bl => {
                        const bLine = bl.trim();
                        if (bLine.startsWith("ports:")) {
                            const portDefs = bLine.replace("ports:", "").trim().split(",");
                            portDefs.forEach(p => {
                                const parts = p.trim().split(":");
                                const pname = parts[0];
                                const direction = parts[1];
                                const type = parts[2] || "Unknown";
                                const port = new SysADLPort(pname, direction, currentComponent.name, type);
                                currentComponent.addPort(port);
                                sysadlModel.ports[`${currentComponent.name}.${pname}`] = port;
                                log(`  Port ${pname} (${direction}, ${type}) added to ${currentComponent.name}`);
                            });
                        } else if (bLine.startsWith("activities:")) {
                            const activityDefs = bLine.replace("activities:", "").trim().split(",");
                            activityDefs.forEach(a => {
                                const match = a.trim().match(/(\w+)\s*(\(([^)]*)\))?/);
                                const name = match[1];
                                const params = match[3] ? match[3].split(",").map(p => p.trim()) : [];
                                const activity = new SysADLActivity(name, params);
                                currentComponent.addActivity(activity);
                                log(`  Activity defined: ${name} (${params.join(", ")}) in ${currentComponent.name}`);
                            });
                        }
                    });
                    currentComponent = null;
                } else if (currentBlock === "connector") {
                    const name = Object.keys(sysadlModel.connectors).pop();
                    const portDefs = blockLines.join(" ").replace("ports:", "").trim().split(",");
                    sysadlModel.connectors[name].ports = portDefs.map(p => p.trim());
                    portDefs.forEach(p => {
                        const [pname, direction] = p.trim().split(":");
                        sysadlModel.ports[`${name}.${pname}`] = new SysADLPort(pname, direction, name);
                    });
                    log(`  Connector ports: ${sysadlModel.connectors[name].ports.join(", ")}`);
                } else if (currentBlock === "executable") {
                    const name = Object.keys(sysadlModel.executables).pop();
                    const executable = sysadlModel.executables[name];
                    // O parsing de parâmetros e returnType agora deve ser feito no início do bloco Executable
                    // parseParams(blockLines[0] || ""); // Já feito no início do bloco
                    executable.statements = parseExecutableBody(blockLines); // Passa todas as linhas do corpo
                    sysadlModel.executables[name] = new SysADLExecutable(
                        executable.name,
                        executable.params,
                        executable.returnType,
                        executable.statements
                    );
                    log(`  Executable body parsed`);
                } else if (currentBlock === "configuration") {
                    const config = sysadlModel.configurations[sysadlModel.configurations.length - 1];
                    blockLines.forEach(l => {
                        if (l.startsWith("components:")) {
                            const comps = l.replace("components:", "").trim().split(",");
                            config.components = comps.map(c => {
                                const [name, def] = c.trim().split(":");
                                return { name, definition: def };
                            });
                            log(`  Configuration components: ${comps.map(c => c.trim()).join(", ")}`);
                        } else if (l.startsWith("connectors:")) {
                            const conns = l.replace("connectors:", "").trim().split(",");
                            config.connectors = conns.map(c => {
                                const [name, def] = c.trim().split(":");
                                return { name, definition: def };
                            });
                            log(`  Configuration connectors: ${conns.map(c => c.trim()).join(", ")}`);
                        } else if (l.startsWith("protocols:")) {
                            const protos = l.replace("protocols:", "").trim().split(",");
                            config.protocols = protos.map(p => p.trim());
                            log(`  Configuration protocols: ${protos.join(", ")}`);
                        }
                    });
                } else if (currentBlock === "simulation") {
                    blockLines.forEach(l => {
                        if (l.startsWith("flow ")) {
                            const match = l.match(/flow\s+(\S+)\s*=\s*([^;]+)/);
                            if (match) {
                                const port = match[1];
                                if (!sysadlModel.ports[port]) throw new Error(`Port ${port} not found in simulation inputs`);
                                let value = match[2].trim();
                                if (value.match(/^{.*}$/)) {
                                    value = JSON.parse(value.replace(/(\w+):/g, '"$1":'));
                                    if (sysadlModel.ports[port].type === "Load") {
                                        if (!value.id || typeof value.weight !== "number") {
                                            throw new Error(`Invalid Load object for ${port}: expected { id: String, weight: Int }`);
                                        }
                                    }
                                } else if (value.match(/^\d+$/)) {
                                    value = parseInt(value);
                                } else if (value.match(/^\d+\.\d+$/)) {
                                    value = parseFloat(value);
                                } else if (value.startsWith('"') && value.endsWith('"')) {
                                    value = value.slice(1, -1);
                                } else if (value === "true") {
                                    value = true;
                                } else if (value === "false") {
                                    value = false;
                                } else if (sysadlModel.dataTypes.hasOwnProperty(value)) { // Check if it's an enum value
                                    value = value; // Keep as string for enum matching
                                }
                                sysadlModel.simulationInputs.flows[port] = value;
                                log(`  Simulation input: flow ${port} = ${JSON.stringify(value)}`);
                            }
                        } else if (l.startsWith("executable ")) {
                            const match = l.match(/executable\s+(\w+)\s*=\s*\[([^;]+)\]/);
                            if (match) {
                                const name = match[1];
                                if (!sysadlModel.executables[name]) throw new Error(`Executable ${name} not found in simulation inputs`);
                                const values = match[2].split(",").map(v => {
                                    v = v.trim();
                                    if (v.match(/^{.*}$/)) {
                                        return JSON.parse(v.replace(/(\w+):/g, '"$1":'));
                                    }
                                    if (v.match(/^\d+$/)) return parseInt(v);
                                    if (v.match(/^\d+\.\d+$/)) return parseFloat(v);
                                    if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
                                    if (v === "true") return true;
                                    if (v === "false") return false;
                                    return v;
                                });
                                sysadlModel.simulationInputs.executables[name] = values;
                                log(`  Simulation input: executable ${name} = ${JSON.stringify(values)}`);
                            }
                        }
                    });
                } else if (currentBlock === "protocol") {
                    const name = Object.keys(sysadlModel.protocols).pop();
                    const actions = parseProtocolBody(blockLines);
                    sysadlModel.protocols[name] = new SysADLProtocol(name, actions);
                    log(`  Protocol actions parsed`);
                } else if (currentBlock === "constraint") {
                    const name = Object.keys(sysadlModel.constraints).pop();
                    blockLines.forEach(l => {
                        if (l.startsWith("pre:")) {
                            sysadlModel.constraints[name].precondition = l.replace("pre:", "").trim().replace(";", "");
                            log(`  Precondition: ${sysadlModel.constraints[name].precondition}`);
                        } else if (l.startsWith("post:")) {
                            sysadlModel.constraints[name].postcondition = l.replace("post:", "").trim().replace(";", "");
                            log(`  Postcondition: ${sysadlModel.constraints[name].postcondition}`);
                        }
                    });
                    sysadlModel.constraints[name] = new SysADLConstraint(
                        name,
                        sysadlModel.constraints[name].precondition,
                        sysadlModel.constraints[name].postcondition
                    );
                } else if (currentBlock === "datatype") {
                    const name = Object.keys(sysadlModel.dataTypes).pop();
                    sysadlModel.dataTypes[name].fields = blockLines.map(l => {
                        const [fname, ftype] = l.trim().replace(";", "").split(":");
                        return { name: fname, type: ftype };
                    });
                    sysadlModel.dataTypes[name] = new SysADLDataType(name, sysadlModel.dataTypes[name].fields);
                    log(`  DataType fields: ${sysadlModel.dataTypes[name].fields.map(f => `${f.name}:${f.type}`).join(", ")}`);
                } else if (currentBlock === "requirement") {
                    const name = Object.keys(sysadlModel.requirements).pop();
                    blockLines.forEach(l => {
                        const trimmed = l.trim();
                        if (trimmed.startsWith("text =")) {
                            sysadlModel.requirements[name].text = trimmed.replace("text =", "").replace(/;?$/, '').trim();
                        } else if (trimmed.startsWith("satisfied by")) {
                            sysadlModel.requirements[name].satisfiedBy = trimmed.replace("satisfied by", "").replace(/;?$/, '').split(',').map(s => s.trim());
                        } else if (trimmed.startsWith("condition:")) {
                            sysadlModel.requirements[name].condition = trimmed.replace("condition:", "").trim().replace(";", "");
                            log(`  Requirement condition: ${sysadlModel.requirements[name].condition}`);
                        }
                    });
                    sysadlModel.requirements[name] = new SysADLRequirement(name, sysadlModel.requirements[name].condition);
                }
                currentBlock = null;
                blockLines = [];
                continue;
            }

            if (currentBlock) {
                blockLines.push(line);
                continue;
            }

            // Processa linhas fora de blocos
            if (line.startsWith("flow")) {
                const match = line.match(/flow\s+([\w\.]+)\s+->\s+([\w\.]+)/);
                if (match) {
                    const [, src, tgt] = match;
                    if (!sysadlModel.ports[src] || !sysadlModel.ports[tgt]) {
                        log(`Warning: Flow ports not found: ${src}, ${tgt}. Skipping flow.`);
                        continue;
                    }
                    sysadlModel.flows.push(new SysADLFlow(src, tgt));
                    log(`Flow defined: ${src} -> ${tgt}`);
                }
            } else if (line.startsWith("allocation")) {
                const match = line.match(/allocation\s+(\w+)\s*->\s*(\w+)/);
                if (match) {
                    const [, activity, executable] = match;
                    sysadlModel.allocations.push(new SysADLAllocation(activity, executable));
                    log(`Allocation defined: ${activity} -> ${executable}`);
                }
            }
        }

        // Validar requisitos
        Object.values(sysadlModel.requirements).forEach(req => {
            const context = { variables: {} };
            Object.values(sysadlModel.ports).forEach(p => {
                context.variables[p.name] = p.value;
            });
            const valid = evaluateConstraint(req.condition, context);
            if (!valid) {
                log(`Requirement '${req.name}' failed: ${req.condition}`);
            } else {
                log(`Requirement '${req.name}' passed: ${req.condition}`);
                trace.push(`Requirement '${req.name}' passed: ${req.condition}`);
            }
        });

        // Inicializar portas com valores da seção simulation
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

        // Simulation
        log("\n--- Simulation Start ---");

        // Propagar fluxos
        sysadlModel.flows.forEach(f => {
            const srcPort = sysadlModel.ports[f.source];
            const flowData = sysadlModel.simulationInputs.flows[f.source] !== undefined
                ? sysadlModel.simulationInputs.flows[f.source]
                : getDefaultValue(srcPort?.type); // Use optional chaining for srcPort
            if (srcPort) { // Only propagate if source port exists
                trace.push(`Flow ${f.source} initialized with: ${JSON.stringify(flowData)}`);
                const propagatedData = f.propagate(flowData, sysadlModel.components, sysadlModel.ports, log, trace);
                const tgtPort = sysadlModel.ports[f.target];
                const tgtComp = sysadlModel.components[tgtPort?.component]; // Use optional chaining for tgtPort
                if (tgtComp) {
                    tgtComp.activities.forEach(act => {
                        const result = act.execute(tgtComp, [propagatedData], trace);
                        log(result.log);
                    });
                }
            }
        });

        // Executar atividades dos subcomponentes na configuração
        sysadlModel.configurations.forEach(config => {
            config.components.forEach(c => {
                const compDef = sysadlModel.components[c.definition];
                if (compDef) {
                    const subComp = new SysADLComponent(c.name, c.definition, compDef.isAbstract);
                    compDef.ports.forEach(p => {
                        const port = new SysADLPort(p.name, p.direction, c.name, p.type, p.value);
                        subComp.addPort(port);
                        sysadlModel.ports[`${c.name}.${p.name}`] = port;
                    });
                    compDef.activities.forEach(a => subComp.addActivity(new SysADLActivity(a.name, a.params)));
                    sysadlModel.components[c.name] = subComp; // Adicionar o subcomponente aos componentes principais
                    subComp.activities.forEach(act => {
                        const paramName = act.params[0]?.split(":")[0];
                        const paramType = act.params[0]?.split(":")[1];
                        const input = subComp.state[paramName] ||
                            sysadlModel.simulationInputs.flows[`${subComp.type}.${paramName}`] ||
                            sysadlModel.simulationInputs.flows[`${c.name}.${paramName}`] ||
                            getDefaultValue(paramType);
                        const result = act.execute(subComp, [input], trace);
                        log(result.log);
                    });
                } else {
                    log(`Warning: Component definition ${c.definition} not found for ${c.name}`);
                }
            });
            // Executar protocolos
            config.protocols.forEach(protoName => {
                const proto = sysadlModel.protocols[protoName];
                if (proto) {
                    // Tentar encontrar um componente associado ao protocolo (pode precisar de uma lógica mais robusta)
                    const comp = sysadlModel.components[config.components[0]?.name] || Object.values(sysadlModel.components)[0];
                    if (comp) {
                        const result = proto.execute(comp, sysadlModel.ports, log, trace);
                        log(`Protocol '${proto.name}' executed: ${JSON.stringify(result)}`);
                    } else {
                        log(`Warning: No component found to execute protocol '${proto.name}'.`);
                    }
                }
            });
        });

        // Executar executáveis com alocações
        sysadlModel.allocations.forEach(alloc => {
            const activity = Object.values(sysadlModel.components)
                .flatMap(c => c.activities)
                .find(a => a.name === alloc.activity);
            const executable = sysadlModel.executables[alloc.executable];
            if (activity && executable) {
                const comp = Object.values(sysadlModel.components).find(c => c.activities.includes(activity));
                const paramName = activity.params[0]?.split(":")[0];
                const paramType = activity.params[0]?.split(":")[1];
                const input = comp?.state[paramName] || // Use optional chaining for comp.state
                    sysadlModel.simulationInputs.flows[`${comp?.type}.${paramName}`] ||
                    sysadlModel.simulationInputs.flows[`${comp?.name}.${paramName}`] ||
                    sysadlModel.simulationInputs.executables[alloc.executable]?.[0] ||
                    getDefaultValue(paramType);
                const applicableConstraints = Object.values(sysadlModel.constraints).filter(c =>
                    (c.precondition && executable.params.some(p => c.precondition.includes(p.name))) ||
                    (c.postcondition && executable.params.some(p => c.postcondition.includes(p.name) || c.postcondition.includes("result")))
                );
                const result = executable.execute([input], log, applicableConstraints, trace);
                log(`Executable '${executable.name}' for activity '${activity.name}' result: ${JSON.stringify(result)}`);
            } else {
                log(`Warning: Allocation ${alloc.activity} -> ${alloc.executable} not resolved`);
            }
        });

        // Executar executáveis não alocados
        Object.values(sysadlModel.executables).forEach(ex => {
            if (!sysadlModel.allocations.some(a => a.executable === ex.name)) {
                const inputs = sysadlModel.simulationInputs.executables[ex.name] || ex.params.map(p => getDefaultValue(p.type));
                const applicableConstraints = Object.values(sysadlModel.constraints).filter(c =>
                    (c.precondition && ex.params.some(p => c.precondition.includes(p.name))) ||
                    (c.postcondition && ex.params.some(p => c.postcondition.includes(p.name) || c.postcondition.includes("result")))
                );
                const result = ex.execute(inputs, log, applicableConstraints, trace);
                log(`Executable '${ex.name}' result: ${JSON.stringify(result)}`);
            }
        });

        // Resumo do rastreamento
        log("\n--- Parameter Trace Summary ---");
        trace.forEach((entry, i) => {
            log(`${i + 1}. ${entry}`);
        });

        log("--- Simulation End ---");

    } catch (e) {
        log(`Error: ${e.message}`);
        console.error(e); // Para depuração
    }
}
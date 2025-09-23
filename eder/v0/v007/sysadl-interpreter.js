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
let currentComponent = null;
let blockDepth = 0;
let currentPackage = null;

function parseProtocolBody(lines) {
    const actions = [];
    lines.forEach(line => {
        const trimmed = line.trim();
        if (["always", "several", "once", "perhaps"].includes(trimmed)) {
            actions.push({ type: "Control", value: trimmed });
            return;
        }
        if (trimmed.startsWith("send")) {
            const match = trimmed.match(/send\s+(\S+)\s+via\s+(\S+)/);
            if (match) {
                let value = match[1];
                try {
                    value = JSON.parse(value.replace(/(\w+):/g, '"$1":'));
                } catch (e) {
                    if (!isNaN(value) && !isNaN(parseFloat(value))) {
                        value = parseFloat(value);
                    } else if (value.startsWith('"') && value.endsWith('"')) {
                        value = value.slice(1, -1);
                    } else if (["HEATING", "COOLING", "OFF"].includes(value)) {
                        value = value;
                    }
                }
                const portName = match[2].replace(";", "");
                const qualifiedPort = portName.includes(".") ? portName : resolveQualifiedName(portName, currentPackage);
                actions.push({ type: "Send", value: value, port: qualifiedPort });
            }
        } else if (trimmed.startsWith("receive")) {
            const match = trimmed.match(/receive\s+(\w+)(?::(\S+))?\s+from\s+(\S+)/);
            if (match) {
                const portName = match[3].replace(";", "");
                const qualifiedPort = portName.includes(".") ? portName : resolveQualifiedName(portName, currentPackage);
                actions.push({ type: "Receive", variable: match[1], port: qualifiedPort });
            }
        }
    });
    return actions;
}

function interpretSysADL() {
    const input = editor.getValue();
    const logEl = document.getElementById("log");
    logEl.innerText = "";
    const log = msg => (logEl.innerText += msg + "\n");
    const trace = [];

    Object.keys(sysadlModel).forEach(key => {
        if (Array.isArray(sysadlModel[key])) {
            sysadlModel[key] = [];
        } else if (typeof sysadlModel[key] === 'object' && sysadlModel[key] !== null) {
            sysadlModel[key] = {};
        }
    });
    sysadlModel.simulationInputs = { flows: {}, executables: {} };

    currentBlock = null;
    blockLines = [];
    currentComponent = null;
    blockDepth = 0;
    currentPackage = null;

    try {
        const lines = input.split("\n");
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith("//")) continue;

            if (line.endsWith("{")) {
                blockDepth++;
                const blockHeader = line.slice(0, -1).trim();
                blockLines = [];

                if (blockHeader.startsWith("package")) {
                    currentPackage = blockHeader.split(" ")[1];
                    currentBlock = "package";
                    log(`Package defined: ${currentPackage}`);
                } else if (blockHeader.startsWith("abstract component def")) {
                    const name = blockHeader.split(" ")[3];
                    currentComponent = new SysADLComponent(name, null, true, currentPackage);
                    sysadlModel.components[currentComponent.qualifiedName] = currentComponent;
                    currentBlock = "component";
                    log(`Component defined: ${currentComponent.qualifiedName} (Abstract)`);
                } else if (blockHeader.startsWith("component def")) {
                    const name = blockHeader.split(" ")[2];
                    currentComponent = new SysADLComponent(name, null, false, currentPackage);
                    sysadlModel.components[currentComponent.qualifiedName] = currentComponent;
                    currentBlock = "component";
                    log(`Component defined: ${currentComponent.qualifiedName}`);
                } else if (blockHeader.startsWith("connector def")) {
                    const name = blockHeader.split(" ")[2];
                    currentBlock = "connector";
                    sysadlModel.connectors[resolveQualifiedName(name, currentPackage)] = new SysADLConnector(name, [], currentPackage);
                    log(`Connector defined: ${resolveQualifiedName(name, currentPackage)}`);
                } else if (blockHeader.startsWith("executable def")) {
                    const match = blockHeader.match(/executable\s+def\s+(\w+)\s*(?:\(([^)]*)\))?\s*:\s*out\s+(\w+)/);
                    if (!match) {
                        log(`Error: Invalid executable definition: ${blockHeader}`);
                        continue;
                    }
                    const [, name, paramsStr, returnType] = match;
                    currentBlock = "executable";
                    const params = parseParams(paramsStr);
                    sysadlModel.executables[resolveQualifiedName(name, currentPackage)] = { name, params, returnType, statements: [] };
                    log(`Executable defined: ${resolveQualifiedName(name, currentPackage)} (${paramsStr || ""} : ${returnType})`);
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
                    sysadlModel.protocols[resolveQualifiedName(name, currentPackage)] = { name: name, actions: [] };
                    log(`Protocol defined: ${resolveQualifiedName(name, currentPackage)}`);
                } else if (blockHeader.startsWith("constraint def")) {
                    const name = blockHeader.split(" ")[2];
                    currentBlock = "constraint";
                    sysadlModel.constraints[resolveQualifiedName(name, currentPackage)] = { name, precondition: null, postcondition: null };
                    log(`Constraint defined: ${resolveQualifiedName(name, currentPackage)}`);
                } else if (blockHeader.startsWith("datatype def")) {
                    const name = blockHeader.split(" ")[2];
                    currentBlock = "datatype";
                    sysadlModel.dataTypes[resolveQualifiedName(name, currentPackage)] = { name: name, fields: [] };
                    log(`DataType defined: ${resolveQualifiedName(name, currentPackage)}`);
                } else if (blockHeader.startsWith("enum")) {
                    const name = blockHeader.split(" ")[1];
                    currentBlock = "enum";
                    sysadlModel.dataTypes[resolveQualifiedName(name, currentPackage)] = { name: name, literals: [] };
                    log(`Enum defined: ${resolveQualifiedName(name, currentPackage)}`);
                } else if (blockHeader.startsWith("requirement def")) {
                    const match = blockHeader.match(/requirement\s+def\s+(\w+)\s*\(([^)]*)\)/) || [, blockHeader.split(" ")[2], ""];
                    const name = match[1];
                    currentBlock = "requirement";
                    sysadlModel.requirements[resolveQualifiedName(name, currentPackage)] = { name: name, condition: null };
                    log(`Requirement defined: ${resolveQualifiedName(name, currentPackage)}`);
                }
                continue;
            }

            if (line === "}") {
                blockDepth--;
                if (blockDepth === 0 || currentBlock !== "package") {
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
                                    const port = new SysADLPort(pname, direction, currentComponent.qualifiedName, type);
                                    currentComponent.addPort(port);
                                    sysadlModel.ports[`${currentComponent.qualifiedName}.${pname}`] = port;
                                    log(`  Port ${pname} (${direction}, ${type}) added to ${currentComponent.qualifiedName}`);
                                });
                            } else if (bLine.startsWith("activities:")) {
                                const activityDefs = bLine.replace("activities:", "").trim().split(",");
                                activityDefs.forEach(a => {
                                    const match = a.trim().match(/(\w+)\s*(\(([^)]*)\))?/);
                                    const name = match[1];
                                    const params = match[3] ? match[3].split(",").map(p => p.trim()) : [];
                                    const activity = new SysADLActivity(name, params);
                                    currentComponent.addActivity(activity);
                                    log(`  Activity defined: ${name} (${params.join(", ")}) in ${currentComponent.qualifiedName}`);
                                });
                            }
                        });
                        currentComponent = null;
                    } else if (currentBlock === "connector") {
                        const name = Object.keys(sysadlModel.connectors).pop();
                        const portDefs = blockLines.join(" ").replace("ports:", "").trim().split(",");
                        sysadlModel.connectors[name].ports = portDefs.map(p => {
                            const portName = p.trim();
                            return portName.includes(".") ? portName : resolveQualifiedName(portName, currentPackage);
                        });
                        log(`  Connector ports: ${sysadlModel.connectors[name].ports.join(", ")}`);
                    } else if (currentBlock === "executable") {
                        const name = Object.keys(sysadlModel.executables).pop();
                        const executable = sysadlModel.executables[name];
                        executable.statements = parseExecutableBody(blockLines);
                        sysadlModel.executables[name] = new SysADLExecutable(
                            executable.name,
                            executable.params,
                            executable.returnType,
                            executable.statements,
                            currentPackage
                        );
                        log(`  Executable body parsed for ${name}`);
                    } else if (currentBlock === "configuration") {
                        const config = sysadlModel.configurations[sysadlModel.configurations.length - 1];
                        blockLines.forEach(l => {
                            if (l.startsWith("components:")) {
                                const comps = l.replace("components:", "").trim().split(",");
                                config.components = comps.map(c => {
                                    const [name, def] = c.trim().split(":");
                                    return { name, definition: resolveQualifiedName(def, currentPackage) };
                                });
                                log(`  Configuration components: ${comps.map(c => c.trim()).join(", ")}`);
                            } else if (l.startsWith("connectors:")) {
                                const conns = l.replace("connectors:", "").trim().split(",");
                                config.connectors = conns.map(c => {
                                    const [name, def] = c.trim().split(":");
                                    return { name, definition: resolveQualifiedName(def, currentPackage) };
                                });
                                log(`  Configuration connectors: ${conns.map(c => c.trim()).join(", ")}`);
                            } else if (l.startsWith("protocols:")) {
                                const protos = l.replace("protocols:", "").trim().split(",");
                                config.protocols = protos.map(p => resolveQualifiedName(p.trim(), currentPackage));
                                log(`  Configuration protocols: ${protos.join(", ")}`);
                            }
                        });
                    } else if (currentBlock === "simulation") {
                        blockLines.forEach(l => {
                            if (l.startsWith("flow ")) {
                                const match = l.match(/flow\s+(\S+)\s*=\s*([^;]+)/);
                                if (match) {
                                    const portName = match[1];
                                    const port = portName.includes(".") ? portName : resolveQualifiedName(portName, currentPackage);
                                    if (!sysadlModel.ports[port]) throw new Error(`Port ${port} not found in simulation inputs`);
                                    let value = match[2].trim();
                                    if (value.match(/^{.*}$/)) {
                                        value = JSON.parse(value.replace(/(\w+):/g, '"$1":'));
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
                                    } else if (sysadlModel.dataTypes[resolveQualifiedName("ControlMode", currentPackage)]?.literals.includes(value)) {
                                        value = value;
                                    }
                                    if (!sysadlModel.ports[port].validateValue(value, sysadlModel.dataTypes)) {
                                        throw new Error(`Invalid value for ${port}: expected ${sysadlModel.ports[port].type}, got ${JSON.stringify(value)}`);
                                    }
                                    sysadlModel.simulationInputs.flows[port] = value;
                                    log(`  Simulation input: flow ${port} = ${JSON.stringify(value)}`);
                                }
                            } else if (l.startsWith("executable ")) {
                                const match = l.match(/executable\s+(\w+)\s*=\s*\[([^;]+)\]/);
                                if (match) {
                                    const name = resolveQualifiedName(match[1], currentPackage);
                                    if (!sysadlModel.executables[name]) {
                                        log(`Warning: Executable ${name} not found, registering placeholder`);
                                        sysadlModel.executables[name] = { name: match[1], params: [], returnType: "Unknown", statements: [] };
                                    }
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
                                    log(`  Simulation input: executable ${name} = ${JSON.stringify(values)}`);
                                }
                            }
                        });
                    } else if (currentBlock === "protocol") {
                        const name = Object.keys(sysadlModel.protocols).pop();
                        const actions = parseProtocolBody(blockLines);
                        sysadlModel.protocols[name] = new SysADLProtocol(name.split(".").pop(), actions, name.includes(".") ? name.split(".").slice(0, -1).join(".") : null);
                        log(`  Protocol actions parsed`);
                    } else if (currentBlock === "constraint") {
                        const name = Object.keys(sysadlModel.constraints).pop();
                        blockLines.forEach(l => {
                            if (l.startsWith("pre:")) {
                                sysadlModel.constraints[name].precondition = l.replace("pre:", "").trim().replace(";", "");
                                log(`  Precondition: ${sysadlModel.constraints[name].precondition}`);
                            } else if (l.startsWith("post:")) {
                                sysadlModel.constraints[name].postcondition = l.replace("post:", "").trim().replace(";", "");
                                log(`  Postcondition: ${sysadlModel.constraints[name].postcondition}`);
                            }
                        });
                        sysadlModel.constraints[name] = new SysADLConstraint(
                            name.split(".").pop(),
                            name.includes(".") ? name.split(".").slice(0, -1).join(".") + "." : "",
                            sysadlModel.constraints[name].precondition,
                            sysadlModel.constraints[name].postcondition
                        );
                    } else if (currentBlock === "datatype") {
                        const name = Object.keys(sysadlModel.dataTypes).pop();
                        sysadlModel.dataTypes[name].fields = blockLines.map(l => {
                            const [fname, ftype] = l.trim().replace(";", "").split(":");
                            return { name: fname, type: ftype };
                        });
                        sysadlModel.dataTypes[name] = new SysADLDataType(name.split(".").pop(), sysadlModel.dataTypes[name].fields, [], name.includes(".") ? name.split(".").slice(0, -1).join(".") : null);
                        log(`  DataType fields: ${sysadlModel.dataTypes[name].fields.map(f => `${f.name}:${f.type}`).join(", ")}`);
                    } else if (currentBlock === "enum") {
                        const name = Object.keys(sysadlModel.dataTypes).pop();
                        sysadlModel.dataTypes[name].literals = blockLines.join(" ").trim().split(/\s*,\s*/).map(l => l.trim());
                        sysadlModel.dataTypes[name] = new SysADLDataType(name.split(".").pop(), [], sysadlModel.dataTypes[name].literals, name.includes(".") ? name.split(".").slice(0, -1).join(".") : null);
                        log(`  Enum literals: ${sysadlModel.dataTypes[name].literals.join(", ")}`);
                    } else if (currentBlock === "requirement") {
                        const name = Object.keys(sysadlModel.requirements).pop();
                        blockLines.forEach(l => {
                            const trimmed = l.trim();
                            if (trimmed.startsWith("text =")) {
                                sysadlModel.requirements[name].text = trimmed.replace("text =", "").replace(/;?$/, "").trim();
                            } else if (trimmed.startsWith("satisfied by")) {
                                sysadlModel.requirements[name].satisfiedBy = trimmed.replace("satisfied by", "").replace(/;?$/, "").split(",").map(s => resolveQualifiedName(s.trim(), currentPackage));
                            } else if (trimmed.startsWith("condition:")) {
                                sysadlModel.requirements[name].condition = trimmed.replace("condition:", "").trim().replace(";", "");
                                log(`  Requirement condition: ${sysadlModel.requirements[name].condition}`);
                            }
                        });
                        sysadlModel.requirements[name] = new SysADLRequirement(name.split(".").pop(), name.includes(".") ? name.split(".").slice(0, -1).join(".") + "." : "", sysadlModel.requirements[name].condition);
                    } else if (currentBlock === "package") {
                        log(`Package ${currentPackage} closed`);
                        currentPackage = null;
                    }
                    currentBlock = null;
                    blockLines = [];
                    continue;
                }
            }

            if (currentBlock) {
                blockLines.push(line);
                continue;
            }

            if (line.startsWith("flow")) {
                const match = line.match(/flow\s+([\w\.]+)\s+->\s+([\w\.]+)/);
                if (match) {
                    let [, src, tgt] = match;
                    src = src.includes(".") ? src : resolveQualifiedName(src, currentPackage);
                    tgt = tgt.includes(".") ? tgt : resolveQualifiedName(tgt, currentPackage);
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
                    sysadlModel.allocations.push(new SysADLAllocation(activity, resolveQualifiedName(executable, currentPackage)));
                    log(`Allocation defined: ${activity} -> ${resolveQualifiedName(executable, currentPackage)}`);
                }
            }
        }

        log(`Final executables registered: ${Object.keys(sysadlModel.executables).join(", ")}`);

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

        log("\n--- Simulation Start ---");

        sysadlModel.flows.forEach(f => {
            const srcPort = sysadlModel.ports[f.source];
            const flowData = sysadlModel.simulationInputs.flows[f.source] !== undefined
                ? sysadlModel.simulationInputs.flows[f.source]
                : getDefaultValue(srcPort?.type);
            if (srcPort) {
                trace.push(`Flow ${f.source} initialized with: ${JSON.stringify(flowData)}`);
                const propagatedData = f.propagate(flowData, sysadlModel.components, sysadlModel.ports, log, trace, sysadlModel.dataTypes);
                const tgtPort = sysadlModel.ports[f.target];
                const tgtComp = sysadlModel.components[tgtPort?.component];
                if (tgtComp) {
                    tgtComp.activities.forEach(act => {
                        const result = act.execute(tgtComp, [propagatedData], trace);
                        log(result.log);
                    });
                }
            }
        });

        sysadlModel.configurations.forEach(config => {
            config.components.forEach(c => {
                const compDef = sysadlModel.components[c.definition];
                if (compDef) {
                    const subComp = new SysADLComponent(c.name, c.definition, compDef.isAbstract, currentPackage);
                    compDef.ports.forEach(p => {
                        const port = new SysADLPort(p.name, p.direction, subComp.qualifiedName, p.type, p.value);
                        subComp.addPort(port);
                        sysadlModel.ports[`${subComp.qualifiedName}.${p.name}`] = port;
                    });
                    compDef.activities.forEach(a => subComp.addActivity(new SysADLActivity(a.name, a.params)));
                    sysadlModel.components[subComp.qualifiedName] = subComp;
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
            config.protocols.forEach(protoName => {
                const proto = sysadlModel.protocols[protoName];
                if (proto) {
                    const comp = sysadlModel.components[config.components[0]?.name] || Object.values(sysadlModel.components)[0];
                    if (comp) {
                        const result = proto.execute(comp, sysadlModel.ports, log, trace, 3);
                        log(`Protocol '${proto.qualifiedName}' executed: ${JSON.stringify(result)}`);
                    } else {
                        log(`Warning: No component found to execute protocol '${proto.qualifiedName}'`);
                    }
                }
            });
        });

        log(`Available executables: ${Object.keys(sysadlModel.executables).join(", ")}`);
        sysadlModel.allocations.forEach(alloc => {
            const activity = Object.values(sysadlModel.components)
                .flatMap(c => c.activities)
                .find(a => a.name === alloc.activity);
            const executable = sysadlModel.executables[alloc.executable];
            if (activity && executable) {
                const comp = Object.values(sysadlModel.components).find(c => c.activities.includes(activity));
                const paramName = activity.params[0]?.split(":")[0];
                const paramType = activity.params[0]?.split(":")[1];
                const input = comp?.state[paramName] ||
                    sysadlModel.simulationInputs.flows[`${comp?.type}.${paramName}`] ||
                    sysadlModel.simulationInputs.flows[`${comp?.qualifiedName}.${paramName}`] ||
                    sysadlModel.simulationInputs.executables[alloc.executable]?.[0] ||
                    getDefaultValue(paramType);
                const applicableConstraints = Object.values(sysadlModel.constraints).filter(c =>
                    (c.precondition && executable.params.some(p => c.precondition.includes(p.name))) ||
                    (c.postcondition && (executable.params.some(p => c.postcondition.includes(p.name)) || c.postcondition.includes("result")))
                );
                const result = executable.execute([input], log, applicableConstraints, trace, sysadlModel.dataTypes);
                log(`Executable '${executable.qualifiedName}' for activity '${activity.name}' result: ${JSON.stringify(result)}`);
            } else {
                log(`Warning: Allocation ${alloc.activity} -> ${alloc.executable} not resolved`);
            }
        });

        log(`Available simulation inputs: ${Object.keys(sysadlModel.simulationInputs.executables).join(", ")}`);
        Object.values(sysadlModel.executables).forEach(ex => {
            if (!sysadlModel.allocations.some(a => a.executable === ex.qualifiedName)) {
                const inputs = sysadlModel.simulationInputs.executables[ex.qualifiedName] || ex.params.map(p => getDefaultValue(p.type));
                const applicableConstraints = Object.values(sysadlModel.constraints).filter(c =>
                    (c.precondition && ex.params.some(p => c.precondition.includes(p.name))) ||
                    (c.postcondition && (ex.params.some(p => c.postcondition.includes(p.name)) || c.postcondition.includes("result")))
                );
                const result = ex.execute(inputs, log, applicableConstraints, trace, sysadlModel.dataTypes);
                log(`Executable '${ex.qualifiedName}' result: ${JSON.stringify(result)}`);
            }
        });

        log("\n--- Parameter Trace Summary ---");
        trace.forEach((entry, i) => {
            log(`${i + 1}. ${entry}`);
        });

        log("--- Simulation End ---");

    } catch (e) {
        log(`Error: ${e.message}`);
        console.error(e);
    }
}
let editor;

// Initialize CodeMirror
document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("input");
  editor = CodeMirror.fromTextArea(textarea, {
    mode: "javascript",
    lineNumbers: true,
    theme: "default"
  });
});

function interpretSysADL() {
  const input = editor.getValue();
  const logEl = document.getElementById("log");
  logEl.innerText = "";
  const log = msg => (logEl.innerText += msg + "\n");
  const trace = [];

  try {
    const ast = parseSysADL(input);
    const components = {};
    const ports = {};
    const connectors = {};
    const flows = [];
    const executables = {};
    const configurations = [];
    const protocols = {};
    const constraints = {};
    const dataTypes = {};
    const enumerations = {};
    const allocations = [];
    const requirements = {};
    const simulationInputs = { flows: {}, executables: {} };

    // Process packages and elements
    ast.packages.forEach(pkg => {
      pkg.elements.forEach(el => {
        if (el.type === "ComponentDef") {
          components[el.name] = new SysADLComponent(el.name, el.name, el.isBoundary);
          el.ports.forEach(p => {
            const port = new SysADLPort(p.name, p.definition.split(".").pop(), el.name, p.definition);
            components[el.name].addPort(port);
            ports[`${el.name}.${p.name}`] = port;
            log(`Port ${p.name} (${p.definition}, ${p.definition}) added to ${el.name}`);
          });
          el.elements.forEach(elem => {
            if (elem.type === "ActivityDef") {
              components[el.name].addActivity(new SysADLActivity(elem.name, elem.params, elem.body));
              log(`Activity defined: ${elem.name} (${elem.params.map(p => `${p.name}:${p.definition}`).join(", ")}) in ${el.name}`);
            }
          });
        } else if (el.type === "ConnectorDef") {
          connectors[el.name] = new SysADLConnector(el.name, el.ports.map(p => `${p.definition}.${p.name}`));
          el.ports.forEach(p => {
            ports[`${el.name}.${p.name}`] = new SysADLPort(p.name, p.definition.split(".").pop(), el.name, p.definition);
          });
          log(`Connector defined: ${el.name} with ports ${el.ports.map(p => p.name).join(", ")}`);
        } else if (el.type === "Flow") {
          flows.push(new SysADLFlow(el.source, el.destination, el.typeName));
          log(`Flow defined: ${el.source} -> ${el.destination}`);
        } else if (el.type === "Executable") {
          executables[el.name] = new SysADLExecutable(el.name, el.params, el.returnType, el.body);
          log(`Executable defined: ${el.name}`);
        } else if (el.type === "Protocol") {
          protocols[el.name] = new SysADLProtocol(el.name, el.body.body ? [el.body.body] : [], el.body.control);
          log(`Protocol defined: ${el.name} (${el.body.control})`);
        } else if (el.type === "ConstraintDef") {
          constraints[el.name] = new SysADLConstraint(el.name, el.equation, el.equation);
          log(`Constraint defined: ${el.name}`);
        } else if (el.type === "DataTypeDef") {
          dataTypes[el.name] = new SysADLDataType(el.name, el.attributes);
          log(`DataType defined: ${el.name} (${el.attributes.map(a => `${a.name}:${a.definition}`).join(", ")})`);
        } else if (el.type === "Enumeration") {
          enumerations[el.name] = new SysADELEnumeration(el.name, el.literals);
          log(`Enumeration defined: ${el.name} (${el.literals.join(", ")})`);
        } else if (el.type === "Requirement") {
          requirements[el.name] = new SysADLRequirement(el.name, el.id, el.text, el.satisfiedBy);
          log(`Requirement defined: ${el.name} (${el.id})`);
        }
      });
    });

    // Process configurations
    ast.packages.forEach(pkg => {
      pkg.elements.forEach(el => {
        if (el.type === "Configuration") {
          configurations.push(new SysADLConfiguration(el.components, el.connectors, el.protocols));
          log(`Configuration defined with components: ${el.components.map(c => c.name).join(", ")}`);
        }
      });
    });

    // Process allocations
    if (ast.allocations) {
      ast.allocations.allocations.forEach(alloc => {
        if (alloc.type === "ActivityAllocation") {
          allocations.push(new SysADLAllocation(alloc.source, alloc.target));
          log(`Allocation defined: ${alloc.source} -> ${alloc.target}`);
        }
      });
    }

    // Process simulation inputs (manually parsed for now, as PEG.js doesn't handle this directly)
    const simulationMatch = input.split("\n").filter(l => l.trim().startsWith("simulation"));
    if (simulationMatch.length) {
      const simLines = input.split("\n").slice(input.split("\n").indexOf(simulationMatch[0]) + 1);
      let inBlock = false;
      simLines.forEach(l => {
        l = l.trim();
        if (l === "{") inBlock = true;
        else if (l === "}") inBlock = false;
        else if (inBlock && l) {
          if (l.startsWith("flow ")) {
            const match = l.match(/flow\s+(\S+)\s*=\s*([^;]+)/);
            if (match) {
              simulationInputs.flows[match[1]] = parseExpression(match[2].trim());
            }
          } else if (l.startsWith("executable ")) {
            const match = l.match(/executable\s+(\w+)\s*=\s*\[([^;]+)\]/);
            if (match) {
              simulationInputs.executables[match[1]] = match[2].split(",").map(v => parseExpression(v.trim()));
            }
          }
        }
      });
    }

    // Validate requirements
    Object.values(requirements).forEach(req => {
      const context = { variables: {} };
      Object.values(ports).forEach(p => {
        context.variables[p.name] = p.value;
      });
      const valid = evaluateConstraint(req.text || "true", context);
      log(`Requirement '${req.name}' ${valid ? "passed" : "failed"}: ${req.text}`);
      trace.push(`Requirement '${req.name}' ${valid ? "passed" : "failed"}: ${req.text}`);
    });

    // Initialize ports with simulation inputs
    Object.entries(simulationInputs.flows).forEach(([port, value]) => {
      if (ports[port]) {
        ports[port].value = evaluateExpression(value, {});
        const compName = port.split(".")[0];
        if (components[compName]) {
          components[compName].state[port.split(".")[1]] = ports[port].value;
        }
        trace.push(`Port ${port} initialized with: ${JSON.stringify(ports[port].value)}`);
      }
    });

    // Simulation
    log("\n--- Simulation Start ---");

    // Propagate flows
    flows.forEach(f => {
      const srcPort = ports[f.source];
      const flowData = simulationInputs.flows[f.source] !== undefined
        ? evaluateExpression(simulationInputs.flows[f.source], {})
        : getDefaultValue(srcPort.type);
      trace.push(`Flow ${f.source} initialized with: ${JSON.stringify(flowData)}`);
      const propagatedData = f.propagate(flowData, components, ports, log, trace);
      const tgtPort = ports[f.target];
      const tgtComp = components[tgtPort.component];
      if (tgtComp) {
        tgtComp.activities.forEach(act => {
          const result = act.execute(tgtComp, [propagatedData], trace, log);
          log(result.log);
        });
      }
    });

    // Execute configurations
    configurations.forEach(config => {
      config.components.forEach(c => {
        const compDef = components[c.definition];
        if (compDef) {
          const subComp = new SysADLComponent(c.name, c.definition, compDef.isAbstract);
          compDef.ports.forEach(p => {
            const port = new SysADLPort(p.name, p.direction, c.name, p.type, p.value);
            subComp.addPort(port);
            ports[`${c.name}.${p.name}`] = port;
          });
          compDef.activities.forEach(a => subComp.addActivity(new SysADLActivity(a.name, a.params, a.body)));
          components[c.name] = subComp;
          subComp.activities.forEach(act => {
            const paramName = act.params[0]?.name;
            const paramType = act.params[0]?.type;
            const input = subComp.state[paramName] ||
                          simulationInputs.flows[`${subComp.type}.${paramName}`] ||
                          simulationInputs.flows[`${c.name}.${paramName}`] ||
                          evaluateExpression(simulationInputs.executables[act.name], {}) ||
                          getDefaultValue(paramType);
            const result = act.execute(subComp, [input], trace, log);
            log(result.log);
          });
        } else {
          log(`Warning: Component definition ${c.definition} not found for ${c.name}`);
        }
      });
      config.protocols.forEach(protoName => {
        const proto = protocols[protoName];
        if (proto) {
          const comp = components[config.components[0]?.name || Object.keys(components)[0]];
          if (comp) {
            const result = proto.execute(comp, ports, log, trace);
            log(`Protocol '${proto.name}' executed: ${JSON.stringify(result)}`);
          }
        }
      });
    });

    // Execute allocated executables
    allocations.forEach(alloc => {
      const activity = Object.values(components)
        .flatMap(c => c.activities)
        .find(a => a.name === alloc.activity);
      const executable = executables[alloc.executable];
      if (activity && executable) {
        const comp = Object.values(components).find(c => c.activities.includes(activity));
        const paramName = activity.params[0]?.name;
        const paramType = activity.params[0]?.type;
        const input = comp.state[paramName] ||
                      simulationInputs.flows[`${comp.type}.${paramName}`] ||
                      simulationInputs.flows[`${comp.name}.${paramName}`] ||
                      simulationInputs.executables[alloc.executable]?.[0] ||
                      getDefaultValue(paramType);
        const applicableConstraints = Object.values(constraints).filter(c =>
          c.equation && executable.params.some(p => c.equation.includes(p.name)) ||
          c.equation && c.equation.includes("result")
        );
        const result = executable.execute([input], log, applicableConstraints, trace);
        log(`Executable '${executable.name}' for activity '${activity.name}' result: ${JSON.stringify(result)}`);
      } else {
        log(`Warning: Allocation ${alloc.activity} -> ${alloc.executable} not resolved`);
      }
    });

    // Execute non-allocated executables
    Object.values(executables).forEach(ex => {
      if (!allocations.some(a => a.executable === ex.name)) {
        const inputs = simulationInputs.executables[ex.name]?.map(v => evaluateExpression(v, {})) || ex.params.map(p => getDefaultValue(p.type));
        const applicableConstraints = Object.values(constraints).filter(c =>
          c.equation && ex.params.some(p => c.equation.includes(p.name)) ||
          c.equation && c.equation.includes("result")
        );
        const result = ex.execute(inputs, log, applicableConstraints, trace);
        log(`Executable '${ex.name}' result: ${JSON.stringify(result)}`);
      }
    });

    // Trace summary
    log("\n--- Parameter Trace Summary ---");
    trace.forEach((entry, i) => {
      log(`${i + 1}. ${entry}`);
    });

    log("--- Simulation End ---");
  } catch (e) {
    log(`Error: ${e.message}`);
  }
}
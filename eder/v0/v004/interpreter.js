import { SysADLStyle, SysADLAbstractComponent, SysADLAbstractConnector, SysADLAbstractActivity, SysADLAbstractProtocol, SysADLComponent, SysADLPort, SysADLCompositePort, SysADLConnector, SysADLConnectorBinding, SysADLDelegation, SysADLFlow, SysADLActivity, SysADLActivitySwitch, SysADLDataStore, SysADLDataBuffer, SysADLExecutable, SysADLProtocol, SysADLConstraint, SysADLDataType, SysADLValueType, SysADEnumeration, SysADLUnit, SysADLDimension, SysADLConfiguration, SysADLAllocation, SysADLRequirement, SysADLPackage, SysADLInvariant, SysADLFunction } from './model.js';
import { parseParams, parseProtocolBody, parseExecutableBody, parseExpression } from './parser.js';
import { evaluateConstraint, evaluateExpression } from './executor.js';
import { getDefaultValue, log } from './utils.js';

export function interpretSysADL() {
  const editor = document.querySelector('.CodeMirror').CodeMirror;
  const input = editor.getValue();
  const logEl = document.getElementById("log");
  logEl.innerText = "";
  const trace = [];
  const lines = input.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("//"));
  let packageName = null;
  const model = { components: {}, connectors: {}, activities: {}, protocols: {}, executables: {}, constraints: {}, requirements: {}, types: {}, configurations: [], simulation: null, usings: [] };
  let currentBlock = null;
  let blockLines = [];
  let simulationInputs = { flows: {}, executables: {} };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    let match = line.match(/package\s+(\w+)/);
    if (match) {
      packageName = match[1];
      model.package = new SysADLPackage(packageName);
      continue;
    }

    match = line.match(/import\s+(\w+)/);
    if (match) {
      model.package.imports.push(match[1]);
      continue;
    }

    match = line.match(/using\s+(\w+)/);
    if (match) {
      model.usings.push(match[1]);
      continue;
    }

    match = line.match(/dimension\s+(\w+)/);
    if (match) {
      const name = match[1];
      model.types[name] = new SysADLDimension(name);
      continue;
    }

    match = line.match(/unit\s+(\w+)\s*\{([^}]*)\}/);
    if (match) {
      const name = match[1];
      const dimensionMatch = match[2].match(/dimension\s*=\s*(\w+)/);
      if (dimensionMatch) {
        model.types[name] = new SysADLUnit(name, dimensionMatch[1]);
      } else {
        log(`Erro: Dimension não especificada para unit ${name}`);
      }
      continue;
    }

    match = line.match(/value type\s+(\w+)\s*\{/);
    if (match) {
      blockLines = [];
      currentBlock = "value type";
      blockLines.push(line);
      continue;
    }

    match = line.match(/datatype\s+(\w+)\s*\{/);
    if (match) {
      blockLines = [];
      currentBlock = "datatype";
      blockLines.push(line);
      continue;
    }

    match = line.match(/enum\s+(\w+)\s*\{([^}]*)\}/);
    if (match) {
      const name = match[1];
      const literals = match[2].split(",").map(l => l.trim());
      model.types[name] = new SysADEnumeration(name, literals);
      continue;
    }

    if (line === "{") {
      if (i > 0) {
        currentBlock = lines[i - 1].split(" ")[0];
        blockLines = [lines[i - 1]];
      }
      continue;
    } else if (line === "}") {
      if (currentBlock === "style") {
        const styleMatch = blockLines[0].match(/style\s+(\w+)/);
        if (!styleMatch) {
          log(`Erro: Nome de style inválido em ${blockLines[0]}`);
          currentBlock = null;
          continue;
        }
        const styleName = styleMatch[1];
        const invariants = blockLines.filter(l => l.startsWith("invariant ")).map(l => {
          const invMatch = l.match(/invariant\s+(\w+)\s*=\s*"([^"]+)"/);
          return invMatch ? new SysADLInvariant(invMatch[1], invMatch[2]) : null;
        }).filter(i => i);
        const functions = blockLines.filter(l => l.startsWith("function ")).map(l => {
          const funcMatch = l.match(/function\s+(\w+)\s*=\s*"([^"]+)"/);
          return funcMatch ? new SysADLFunction(funcMatch[1], funcMatch[2]) : null;
        }).filter(f => f);
        const definitions = blockLines.filter(l => l.includes("def ")).map(l => {
          const defMatch = l.match(/(abstract\s+)?(\w+)\s+def\s+(\w+)/);
          return defMatch ? { type: defMatch[2], name: defMatch[3], isAbstract: !!defMatch[1] } : null;
        }).filter(d => d);
        model.package.styles.push(new SysADLStyle(styleName, invariants, functions, definitions));
      } else if (currentBlock === "value type") {
        const nameMatch = blockLines[0].match(/value type\s+(\w+)/);
        if (!nameMatch) {
          log(`Erro: Nome inválido de value type em ${blockLines[0]}`);
          currentBlock = null;
          continue;
        }
        const name = nameMatch[1];
        const props = blockLines.slice(1).join(" ").split(";").map(p => p.trim()).filter(p => p);
        const unitMatch = props.find(p => p.startsWith("unit"))?.match(/unit\s*=\s*(\w+)/);
        const dimensionMatch = props.find(p => p.startsWith("dimension"))?.match(/dimension\s*=\s*(\w+)/);
        model.types[name] = new SysADLValueType(name, unitMatch?.[1], dimensionMatch?.[1]);
      } else if (currentBlock === "datatype") {
        const nameMatch = blockLines[0].match(/datatype\s+(\w+)/);
        if (!nameMatch) {
          log(`Erro: Nome inválido de datatype em ${blockLines[0]}`);
          currentBlock = null;
          continue;
        }
        const name = nameMatch[1];
        const fields = blockLines.slice(1).join(" ").split(";").map(f => f.trim()).filter(f => f).map(f => {
          const [fieldName, type] = f.split(":");
          return { name: fieldName, type };
        });
        model.types[name] = new SysADLDataType(name, fields);
      } else if (currentBlock === "configuration") {
        const components = blockLines.filter(l => l.startsWith("components:")).map(l => {
          const compMatch = l.match(/components:\s*(.+)/);
          if (!compMatch) return [];
          return compMatch[1].split(",").map(c => {
            const [name, type] = c.trim().split(":");
            return { name, type };
          });
        }).flat();
        const connectors = blockLines.filter(l => l.startsWith("connectors:")).map(l => {
          const connMatch = l.match(/connectors:\s*(.+)/);
          if (!connMatch) return [];
          return connMatch[1].split(",").map(c => {
            const [name, type] = c.trim().split(":");
            return { name, type };
          });
        }).flat();
        const protocols = blockLines.filter(l => l.startsWith("protocols:")).map(l => {
          const protoMatch = l.match(/protocols:\s*(.+)/);
          if (!protoMatch) return [];
          return protoMatch[1].split(",").map(p => p.trim());
        }).flat();
        const delegations = blockLines.filter(l => l.startsWith("delegations:")).map(l => {
          const delMatch = l.match(/delegations:\s*(.+)/);
          if (!delMatch) return [];
          return delMatch[1].split(",").map(d => {
            const [source, target] = d.trim().split(/\s+to\s+/);
            return new SysADLDelegation(source, target);
          });
        }).flat();
        model.configurations.push(new SysADLConfiguration(components, connectors, protocols, delegations));
      } else if (currentBlock === "simulation") {
        blockLines.forEach(l => {
          const flowMatch = l.match(/flow\s+(\S+)\s*=\s*([^;]+)/);
          if (flowMatch) {
            try {
              simulationInputs.flows[flowMatch[1]] = JSON.parse(flowMatch[2].replace(/(\w+):/g, '"$1":'));
            } catch (e) {
              log(`Erro ao parsear flow: ${l}`);
            }
            return;
          }
          const execMatch = l.match(/executable\s+(\w+)\s*=\s*([^;]+)/);
          if (execMatch) {
            try {
              simulationInputs.executables[execMatch[1]] = JSON.parse(execMatch[2].replace(/(\w+):/g, '"$1":'));
            } catch (e) {
              log(`Erro ao parsear executable: ${l}`);
            }
          }
        });
      }
      currentBlock = null;
      blockLines = [];
      continue;
    }

    if (currentBlock) {
      blockLines.push(line);
      continue;
    }

    match = line.match(/style\s+(\w+)/);
    if (match) {
      currentBlock = "style";
      blockLines.push(line);
      continue;
    }

    match = line.match(/abstract component def\s+(\w+)/);
    if (match) {
      const name = match[1];
      const component = new SysADLAbstractComponent(name);
      blockLines.push(line);
      currentBlock = "abstract component";
      model.components[name] = component;
      continue;
    }

    match = line.match(/abstract activity def\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*\(([^)]*)\))?/);
    if (match) {
      const name = match[1];
      const inParams = match[2] ? match[2].split(",").map(p => p.trim()) : [];
      const outParams = match[3] ? match[3].split(",").map(p => p.trim()) : [];
      model.activities[name] = new SysADLAbstractActivity(name, inParams, outParams);
      continue;
    }

    match = line.match(/component def\s+(\w+)(?:\s+implements\s+(\w+))?/);
    if (match) {
      const name = match[1];
      const abstractType = match[2] || null;
      const component = new SysADLComponent(name, null, false, [], abstractType ? model.components[abstractType] : null);
      blockLines.push(line);
      currentBlock = "component";
      model.components[name] = component;
      continue;
    }

    match = line.match(/connector def\s+(\w+)/);
    if (match) {
      const name = match[1];
      const connector = new SysADLConnector(name);
      blockLines.push(line);
      currentBlock = "connector";
      model.connectors[name] = connector;
      continue;
    }

    match = line.match(/flow\s+(\w+)\s+from\s+(\S+)\s+to\s+(\S+)/);
    if (match) {
      const type = match[1];
      const source = match[2];
      const target = match[3];
      model.connectors[`flow_${source}_${target}`] = new SysADLFlow(source, target, type);
      continue;
    }

    match = line.match(/protocol\s+(\w+)/);
    if (match) {
      const name = match[1];
      blockLines.push(line);
      currentBlock = "protocol";
      model.protocols[name] = new SysADLProtocol(name, []);
      continue;
    }

    match = line.match(/executable def\s+(\w+)/);
    if (match) {
      blockLines.push(line);
      currentBlock = "executable";
      model.executables[match[1]] = null;
      continue;
    }

    match = line.match(/constraint def\s+(\w+)/);
    if (match) {
      blockLines.push(line);
      currentBlock = "constraint";
      model.constraints[match[1]] = null;
      continue;
    }

    match = line.match(/requirement\s+(\w+)\s*\(([^)]+)\)/);
    if (match) {
      blockLines.push(line);
      currentBlock = "requirement";
      model.requirements[match[1]] = { name: match[1], version: match[2] };
      continue;
    }

    if (line.startsWith("configuration ")) {
      currentBlock = "configuration";
      blockLines.push(line);
      continue;
    }

    if (line.startsWith("simulation ")) {
      currentBlock = "simulation";
      blockLines.push(line);
      continue;
    }

    if (currentBlock === "component" && line.includes("ports:")) {
      match = line.match(/ports:\s*(.+)/);
      if (!match) {
        log(`Erro: Formato inválido de ports em ${line}`);
        continue;
      }
      const ports = match[1].split(",").map(p => {
        const [nameDir, type] = p.trim().split(":");
        const [name, direction] = nameDir.includes("in:") || nameDir.includes("out:") ? [nameDir.split(":")[0], nameDir.split(":")[1]] : [nameDir, type.includes("in") ? "in" : "out"];
        return new SysADLPort(name, direction, model.components[blockLines[0].match(/component def\s+(\w+)/)[1]], type.replace(/(in|out):/, ""));
      });
      model.components[blockLines[0].match(/component def\s+(\w+)/)[1]].ports.push(...ports);
      continue;
    }

    if (currentBlock === "component" && line.includes("activities:")) {
      match = line.match(/activities:\s*(.+)/);
      if (!match) {
        log(`Erro: Formato inválido de activities em ${line}`);
        continue;
      }
      const activities = match[1].split(",").map(a => {
        const activityMatch = a.match(/(\w+)\s*\(([^)]*)\)(?:\s+implements\s+(\S+))?/);
        if (!activityMatch) {
          log(`Erro: Formato inválido de activity: ${a}`);
          return null;
        }
        const name = activityMatch[1];
        const params = activityMatch[2] ? activityMatch[2].split(",").map(p => p.trim()) : [];
        const abstractActivity = activityMatch[3] ? model.activities[activityMatch[3]] : null;
        return new SysADLActivity(name, params, abstractActivity);
      }).filter(a => a);
      model.components[blockLines[0].match(/component def\s+(\w+)/)[1]].activities.push(...activities);
      continue;
    }

    if (currentBlock === "component" && line.includes("property ")) {
      match = line.match(/property\s+(\w+):(\w+)\s*=\s*([^;]+)/);
      if (!match) {
        log(`Erro: Formato inválido de property em ${line}`);
        continue;
      }
      const component = model.components[blockLines[0].match(/component def\s+(\w+)/)[1]];
      try {
        component.addProperty({ name: match[1], type: match[2], value: JSON.parse(match[3].replace(/(\w+):/g, '"$1":')) });
      } catch (e) {
        log(`Erro ao parsear property: ${line}`);
      }
      continue;
    }

    if (currentBlock === "connector" && line.includes("participants:")) {
      match = line.match(/participants:\s*(.+)/);
      if (!match) {
        log(`Erro: Formato inválido de participants em ${line}`);
        continue;
      }
      const ports = match[1].split(",").map(p => {
        const [compPort, role] = p.trim().split(":");
        const [component, port] = compPort.replace("~", "").split(".");
        return { component, port, role };
      });
      model.connectors[blockLines[0].match(/connector def\s+(\w+)/)[1]].ports.push(...ports);
      continue;
    }

    if (currentBlock === "connector" && line.includes("flows:")) {
      match = line.match(/flows:\s*(.+)/);
      if (!match) {
        log(`Erro: Formato inválido de flows em ${line}`);
        continue;
      }
      const flows = match[1].split(";").map(f => {
        const flowMatch = f.match(/flow\s+(\S+)\s+to\s+(\S+)/);
        return flowMatch ? new SysADLFlow(flowMatch[1], flowMatch[2]) : null;
      }).filter(f => f);
      model.connectors[blockLines[0].match(/connector def\s+(\w+)/)[1]].flows.push(...flows);
      continue;
    }

    if (currentBlock === "connector" && line.includes("bindings:")) {
      match = line.match(/bindings:\s*(.+)/);
      if (!match) {
        log(`Erro: Formato inválido de bindings em ${line}`);
        continue;
      }
      const bindings = match[1].split(",").map(b => {
        const [source, target] = b.split("=").map(s => s.trim());
        return new SysADLConnectorBinding(source, target);
      });
      model.connectors[blockLines[0].match(/connector def\s+(\w+)/)[1]].bindings.push(...bindings);
      continue;
    }

    if (currentBlock === "protocol") {
      const controlMatch = line.match(/^(always|once|several|perhaps)/);
      const control = controlMatch ? controlMatch[1] : "once";
      const actions = blockLines.slice(1).map(l => {
        if (l.startsWith("send ")) {
          const sendMatch = l.match(/send\s+"([^"]+)"\s+via\s+(\S+)/);
          return sendMatch ? { type: "Send", value: sendMatch[1], port: sendMatch[2].replace(";", "") } : null;
        } else if (l.startsWith("receive ")) {
          const recvMatch = l.match(/receive\s+(\w+)\s+from\s+(\S+)/);
          return recvMatch ? { type: "Receive", variable: recvMatch[1], port: recvMatch[2].replace(";", "") } : null;
        } else if (l.startsWith("(")) {
          return { type: "Nested", body: parseProtocolBody([l.replace(/[()]/g, "")]) };
        }
        return null;
      }).filter(a => a);
      const protoMatch = blockLines[0].match(/protocol\s+(\w+)/);
      if (protoMatch) {
        const protocolName = protoMatch[1];
        model.protocols[protocolName] = new SysADLProtocol(protocolName, actions, control);
      }
      if (line === "}") currentBlock = null;
      continue;
    }

    if (currentBlock === "executable") {
      if (line.startsWith("{")) {
        const execLines = [];
        let braceCount = 1;
        i++;
        while (braceCount > 0 && i < lines.length) {
          const nextLine = lines[i].trim();
          if (nextLine.includes("{")) braceCount++;
          if (nextLine.includes("}")) braceCount--;
          if (braceCount > 0 && nextLine) execLines.push(nextLine);
          i++;
        }
        i--;
        const header = blockLines[0];
        const paramMatch = header.match(/executable def\s+(\w+)\s*(?:in\s+([^)]+))?(?:\s+out\s*([^)]+))?/);
        if (!paramMatch) {
          log(`Erro: Formato inválido de parâmetros em ${header}`);
          continue;
        }
        const name = paramMatch[1];
        const inParams = paramMatch[2] ? parseParams(paramMatch[2]) : [];
        const outParams = paramMatch[3] ? parseParams(paramMatch[3]) : [];
        const returnType = outParams[0]?.type || "void";
        model.executables[name] = new SysADLExecutable(name, inParams, returnType, parseExecutableBody(execLines, header));
        currentBlock = null;
        blockLines = [];
        continue;
      }
    }

    if (currentBlock === "constraint") {
      const nameMatch = blockLines[0].match(/constraint def\s+(\w+)/);
      if (!nameMatch) {
        log(`Erro: Nome inválido de constraint em ${blockLines[0]}`);
        continue;
      }
      const name = nameMatch[1];
      const kindMatch = blockLines.find(l => l.startsWith("kind:"))?.match(/kind:\s*(\w+)/);
      const preMatch = blockLines.find(l => l.startsWith("pre:"))?.match(/pre:\s*([^;]+)/);
      const postMatch = blockLines.find(l => l.startsWith("post:"))?.match(/post:\s*([^;]+)/);
      model.constraints[name] = new SysADLConstraint(name, preMatch?.[1], postMatch?.[1], kindMatch?.[1] || "invariant");
      if (line === "}") currentBlock = null;
      continue;
    }

    if (currentBlock === "requirement") {
      const nameMatch = blockLines[0].match(/requirement\s+(\w+)\s*\(([^)]+)\)/);
      if (!nameMatch) {
        log(`Erro: Nome inválido de requirement em ${blockLines[0]}`);
        continue;
      }
      const name = nameMatch[1];
      const conditionMatch = blockLines.find(l => l.startsWith("condition:"))?.match(/condition:\s*([^;]+)/);
      const derivedMatch = blockLines.find(l => l.startsWith("derive"))?.match(/derive\s+(\w+)/);
      const textMatch = blockLines.find(l => l.startsWith("text"))?.match(/text\s*=\s*"([^"]+)"/);
      model.requirements[name].condition = conditionMatch?.[1];
      model.requirements[name].derived = derivedMatch ? [derivedMatch[1]] : [];
      model.requirements[name].text = textMatch?.[1];
      if (line === "}") currentBlock = null;
      continue;
    }

    log(`Aviso: Linha não processada: ${line}`);
  }

  // Configuração dos componentes
  const components = {};
  const ports = {};
  model.configurations.forEach(config => {
    config.components.forEach(c => {
      const compDef = model.components[c.type];
      if (!compDef) {
        log(`Erro: Component type ${c.type} não encontrado`);
        return;
      }
      components[c.name] = new SysADLComponent(c.name, c.type, false, [], compDef.abstractComponent);
      compDef.ports.forEach(p => {
        const port = new SysADLPort(p.name, p.direction, c.name, p.type, simulationInputs.flows[`${c.name}.${p.name}`] || getDefaultValue(p.type));
        components[c.name].addPort(port);
        ports[`${c.name}.${p.name}`] = port;
        log(`Port criado: ${c.name}.${p.name} (type: ${p.type}, direction: ${p.direction})`);
      });
      compDef.activities.forEach(a => components[c.name].addActivity(a));
      compDef.properties.forEach(p => components[c.name].addProperty(p));
    });
    config.connectors.forEach(c => {
      const connDef = model.connectors[c.type];
      if (!connDef) {
        log(`Erro: Connector type ${c.type} não encontrado`);
        return;
      }
      components[c.name] = new SysADLConnector(c.name, connDef.ports, connDef.bindings, connDef.flows);
    });
    config.delegations.forEach(d => {
      const sourcePort = ports[d.source];
      const targetPort = ports[d.target];
      if (!sourcePort || !targetPort) {
        log(`Erro: Delegação inválida: ${d.source} to ${d.target}`);
        return;
      }
      if (sourcePort.type !== targetPort.type) {
        log(`Erro: Tipos incompatíveis na delegação: ${d.source} (${sourcePort.type}) to ${d.target} (${targetPort.type})`);
        return;
      }
      components[sourcePort.component].addBinding(new SysADLConnectorBinding(d.source, d.target));
      log(`Delegação criada: ${d.source} to ${d.target}`);
    });
  });

  // Propagação de fluxos
  Object.values(model.connectors).filter(c => c instanceof SysADLFlow).forEach(flow => {
    const sourcePort = ports[flow.source];
    const targetPort = ports[flow.target];
    if (!sourcePort || !targetPort) {
      log(`Erro na propagação de fluxo ${flow.source} -> ${flow.target}: Portos não encontrados`);
      return;
    }
    if (sourcePort.type !== flow.type || targetPort.type !== flow.type) {
      log(`Erro na propagação de fluxo ${flow.source} -> ${flow.target}: Tipo inválido (${flow.type})`);
      return;
    }
    try {
      flow.propagate(simulationInputs.flows[flow.source] || getDefaultValue(flow.type), components, ports, log, trace);
      log(`Fluxo propagado: ${flow.source} -> ${flow.target}`);
    } catch (e) {
      log(`Erro na propagação de fluxo ${flow.source} -> ${flow.target}: ${e.message}`);
    }
  });

  // Execução de protocolos
  model.configurations.forEach(config => {
    config.protocols.forEach(p => {
      const protocol = model.protocols[p];
      if (!protocol) {
        log(`Erro: Protocolo ${p} não encontrado`);
        return;
      }
      config.components.forEach(c => {
        const comp = components[c.name];
        try {
          protocol.execute(comp, ports, log, trace);
          log(`Protocolo ${p} executado no componente ${c.name}`);
        } catch (e) {
          log(`Erro na execução do protocolo ${p} no componente ${c.name}: ${e.message}`);
        }
      });
    });
  });

  // Execução de executáveis
  Object.entries(simulationInputs.executables).forEach(([name, inputs]) => {
    const executable = model.executables[name];
    if (!executable) {
      log(`Erro: Executável ${name} não encontrado`);
      return;
    }
    const constraints = Object.values(model.constraints).filter(c => c.kind === "pre-condition" || c.kind === "invariant");
    try {
      const result = executable.execute(inputs, log, constraints, trace);
      log(`Executável '${name}' resultado: ${JSON.stringify(result)}`);
      trace.push(`Executável '${name}' resultado: ${JSON.stringify(result)}`);
    } catch (e) {
      log(`Erro na execução do executável ${name}: ${e.message}`);
    }
  });

  // Validação de requisitos
  Object.entries(model.requirements).forEach(([name, req]) => {
    const context = { variables: {} };
    try {
      if (!req.condition) {
        log(`Erro: Condição não definida para requisito ${name}`);
        return;
      }
      const valid = evaluateConstraint(req.condition, context);
      log(`Requisito ${name} (${req.version}): ${req.condition} -> ${valid ? "Satisfeito" : "Não satisfeito"}`);
      trace.push(`Requisito ${name} (${req.version}): ${req.condition} -> ${valid ? "Satisfeito" : "Não satisfeito"}`);
    } catch (e) {
      log(`Erro ao validar requisito ${name}: ${e.message}`);
    }
  });

  // Visualização do caminho no canvas (desativado por enquanto)
  function drawPath(path) {
    const canvas = document.getElementById("agvPath");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    const scale = 5;
    ctx.moveTo(path[0].x * scale, path[0].y * scale);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x * scale, path[i].y * scale);
    }
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    ctx.stroke();
    log(`Caminho desenhado no canvas com ${path.length} pontos`);
  }

  if (simulationInputs.executables["ComputePath"]) {
    try {
      // drawPath(simulationInputs.executables["ComputePath"]);
      log(`ComputePath encontrado, mas desenho desativado`);
    } catch (e) {
      log(`Erro ao desenhar o caminho: ${e.message}`);
    }
  }
}
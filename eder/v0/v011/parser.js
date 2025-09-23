function parseSysADL(input, log) {
  const model = new SysADLModel();
  const lines = input.split("\n").map(line => line.trim());
  let currentPackage = null;
  let currentComponent = null;
  let currentConnector = null;
  let currentActivity = null;
  let currentBlock = null;
  let blockStack = [];
  let blockLines = [];
  let blockDepth = 0;

  log("Iniciando parsing do código SysADL...");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith("//")) continue;

    // Detectar início de bloco
    if (line.includes("{")) {
      blockDepth += (line.match(/{/g) || []).length;
      const blockHeader = line.split("{")[0].trim();
      blockLines = [];
      blockStack.push({ type: blockHeader, lines: blockLines, depth: blockDepth });

      if (blockHeader.startsWith("Model")) {
        const name = blockHeader.split(" ")[1];
        model.name = name;
        currentBlock = "model";
        log(`Modelo definido: ${name}`);
      } else if (blockHeader.startsWith("package")) {
        currentPackage = blockHeader.split(" ")[1];
        model.packages.push(currentPackage);
        currentBlock = "package";
        log(`Pacote definido: ${currentPackage}`);
      } else if (blockHeader.startsWith("value type")) {
        const [, , name, , superType] = blockHeader.split(" ");
        model.dataTypes[name] = new SysADLDataType(name);
        if (superType) model.dataTypes[name].superType = superType;
        currentBlock = "datatype";
        log(`Tipo de valor definido: ${name}${superType ? ` extends ${superType}` : ""}`);
      } else if (blockHeader.startsWith("enum")) {
        const name = blockHeader.split(" ")[1];
        model.dataTypes[name] = new SysADLDataType(name);
        currentBlock = "enum";
        log(`Enumeração definida: ${name}`);
      } else if (blockHeader.startsWith("datatype")) {
        const name = blockHeader.split(" ")[1];
        model.dataTypes[name] = new SysADLDataType(name);
        currentBlock = "datatype";
        log(`Tipo de dado definido: ${name}`);
      } else if (blockHeader.startsWith("dimension")) {
        const name = blockHeader.split(" ")[1];
        model.dataTypes[name] = new SysADLDataType(name);
        currentBlock = "dimension";
        log(`Dimensão definida: ${name}`);
      } else if (blockHeader.startsWith("unit")) {
        const name = blockHeader.split(" ")[1];
        model.dataTypes[name] = new SysADLDataType(name);
        currentBlock = "unit";
        log(`Unidade definida: ${name}`);
      } else if (blockHeader.startsWith("port def")) {
        const name = blockHeader.split(" ")[2];
        model.ports[name] = { name, flow: null };
        currentBlock = "port";
        log(`Porta definida: ${name}`);
      } else if (blockHeader.startsWith("connector def")) {
        const name = blockHeader.split(" ")[2];
        currentConnector = new SysADLConnector(name);
        model.connectors[name] = currentConnector;
        currentBlock = "connector";
        log(`Conector definido: ${name}`);
      } else if (blockHeader.startsWith("component def")) {
        const name = blockHeader.split(" ")[2];
        const isBoundary = blockHeader.includes("boundary");
        currentComponent = new SysADLComponent(name, isBoundary);
        model.components[name] = currentComponent;
        currentBlock = "component";
        log(`Componente definido: ${name}${isBoundary ? " (boundary)" : ""}`);
      } else if (blockHeader.startsWith("constraint")) {
        const match = blockHeader.match(/constraint (\w+)/);
        if (!match) {
          log(`Erro: Sintaxe inválida para restrição: ${blockHeader}`);
          continue;
        }
        const name = match[1];
        model.constraints[name] = new SysADLConstraint(name, null);
        currentBlock = "constraint";
        log(`Restrição definida: ${name}`);
      } else if (blockHeader.startsWith("action def")) {
        const match = blockHeader.match(/action def (\w+)\s*\((.*?)\)\s*:\s*(\w+)/);
        if (!match) {
          log(`Erro: Sintaxe inválida para ação: ${blockHeader}`);
          continue;
        }
        const name = match[1];
        const inParams = match[2] ? match[2].split(",").map(p => {
          const [pname, ptype] = p.trim().split(":").map(s => s.trim());
          return { name: pname, type: ptype };
        }) : [];
        const returnType = match[3];
        model.actions[name] = new SysADLAction(name, inParams, returnType, []);
        currentBlock = "action";
        log(`Ação definida: ${name}(${inParams.map(p => `${p.name}:${p.type}`).join(", ")}) : ${returnType}`);
      } else if (blockHeader.startsWith("activity def")) {
        const match = blockHeader.match(/activity def (\w+)\s*(?:\((.*?)\))?(?:\s*:\s*\((.*?)\))?/);
        if (!match) {
          log(`Erro: Sintaxe inválida para atividade: ${blockHeader}`);
          continue;
        }
        const name = match[1];
        const inParams = match[2] ? match[2].split(",").map(p => {
          const [pname, ptype] = p.trim().split(":").map(s => s.trim());
          return { name: pname, type: ptype };
        }) : [];
        const outParams = match[3] ? match[3].split(",").map(p => {
          const [pname, ptype] = p.trim().split(":").map(s => s.trim());
          return { name: pname, type: ptype };
        }) : [];
        currentActivity = new SysADLActivity(name, inParams, outParams, { actions: [], delegations: [], flows: [] });
        model.activities[name] = currentActivity;
        currentBlock = "activity";
        log(`Atividade definida: ${name}(${inParams.map(p => `${p.name}:${p.type}`).join(", ")}) : (${outParams.map(p => `${p.name}:${p.type}`).join(", ")})`);
      } else if (blockHeader.startsWith("executable def")) {
        const match = blockHeader.match(/executable def (\w+)\s*\(\s*(.*?)\s*\)\s*:\s*out\s+(\w+)/);
        if (!match) {
          log(`Erro: Sintaxe inválida para executável: ${blockHeader}`);
          continue;
        }
        const name = match[1];
        const params = match[2] ? match[2].split(",").map(p => {
          const [pname, ptype] = p.trim().split(":").map(s => s.trim());
          return { name: pname, type: ptype };
        }) : [];
        const returnType = match[3];
        model.executables[name] = new SysADLExecutable(name, params, returnType, []);
        currentBlock = "executable";
        log(`Executável definido: ${name}(${params.map(p => `${p.name}:${p.type}`).join(", ")}) : ${returnType}`);
      } else if (blockHeader === "configuration") {
        currentBlock = "configuration";
        model.configurations.push({ components: [], connectors: [], delegations: [] });
        log(`Configuração definida`);
      } else if (blockHeader === "allocations") {
        currentBlock = "allocations";
        log(`Alocações definidas`);
      } else if (blockHeader.startsWith("body")) {
        currentBlock = "body";
        log(`Corpo de atividade definido`);
      } else {
        log(`Aviso: Bloco não reconhecido: ${blockHeader}`);
      }
      continue;
    }

    // Detectar fim de bloco
    if (line.includes("}")) {
      blockDepth -= (line.match(/}/g) || []).length;
      if (blockDepth < 0) {
        log(`Erro: Fechamento de bloco inesperado na linha ${i + 1}`);
        blockDepth = 0;
        continue;
      }
      while (blockStack.length > 0 && blockStack[blockStack.length - 1].depth > blockDepth) {
        const block = blockStack.pop();
        const blockHeader = block.type;
        blockLines = block.lines;

        if (blockHeader.startsWith("package")) {
          currentPackage = null;
          currentBlock = blockStack.length > 0 ? blockStack[blockStack.length - 1].type : null;
        } else if (blockHeader.startsWith("component def") && currentComponent) {
          blockLines.forEach(bl => {
            if (bl.startsWith("ports :")) {
              const portDefs = bl.replace("ports :", "").trim().split(";").filter(p => p.trim());
              portDefs.forEach(p => {
                const [name, def] = p.trim().split(":").map(s => s.trim());
                const direction = def.includes("IPT") ? "in" : "out";
                const type = def.match(/(\w+)/)[1];
                const port = new SysADLPort(name, direction, type, currentComponent.name);
                currentComponent.ports.push(port);
                model.ports[`${currentComponent.name}.${name}`] = port;
                log(`  Porta ${name} (${direction}, ${type}) adicionada a ${currentComponent.name}`);
              });
            } else if (bl.startsWith("configuration")) {
              const config = model.configurations[model.configurations.length - 1];
              let innerBlock = [];
              let innerDepth = -0;
              const configLines = blockLines.slice(blockLines.indexOf(bl) + 1);
              configLines.forEach(l => {
                if (l.includes("{")) innerDepth++;
                if (l.includes("}")) innerDepth--;
                if (innerDepth > 0 || l.includes("{")) {
                  innerBlock.push(l);
                  return;
                }
                if (l.startsWith("components :")) {
                  const comps = l.replace("components :", "").trim().split(";").filter(c => c.trim());
                  config.components = comps.map(c => {
                    const [name, def] = c.trim().split(":").map(s => s.trim());
                    const subcomp = { name, definition: def, ports: [] };
                    const compLines = innerBlock.filter(il => il.includes(`${name} : ${def}`));
                    compLines.forEach(cl => {
                      if (cl.includes("using ports :")) {
                        const ports = cl.replace("using ports :", "").trim().split(";").filter(p => p.trim());
                        subcomp.ports = ports.map(p => {
                          const [pname, ptype] = p.trim().split(":").map(s => s.trim());
                          return { name: pname, type: ptype };
                        });
                        log(`    Portas do subcomponente ${name}: ${subcomp.ports.map(p => `${p.name}:${p.type}`).join(", ")}`);
                      }
                    });
                    return subcomp;
                  });
                  log(`  Componentes da configuração: ${config.components.map(c => c.name).join(", ")}`);
                } else if (l.startsWith("connectors :")) {
                  const conns = l.replace("connectors :", "").trim().split(";").filter(c => c.trim());
                  config.connectors = conns.map(c => {
                    const [name, def] = c.trim().split(":").map(s => s.trim());
                    const bindingsMatch = c.match(/bindings (.+)/);
                    const bindings = bindingsMatch ? bindingsMatch[1].split(";").map(b => {
                      const [src, tgt] = b.trim().split("=").map(s => s.trim());
                      return { source: src, destination: tgt };
                    }) : [];
                    return { name, definition: def, bindings };
                  });
                  log(`  Conectores da configuração: ${config.connectors.map(c => `${c.name} [${c.bindings.map(b => `${b.source}=${b.destination}`).join(", ")}]`).join(", ")}`);
                } else if (l.startsWith("delegations :")) {
                  const dels = l.replace("delegations :", "").trim().split(";").filter(d => d.trim());
                  config.delegations = dels.map(d => {
                    const [src, , tgt] = d.trim().split(" ");
                    return { source: src, destination: tgt };
                  });
                  log(`  Delegações: ${config.delegations.map(d => `${d.source} -> ${d.destination}`).join(", ")}`);
                }
              });
            }
          });
          currentComponent = null;
        } else if (blockHeader.startsWith("connector def") && currentConnector) {
          blockLines.forEach(bl => {
            if (bl.startsWith("participants :")) {
              const ports = bl.replace("participants :", "").trim().split(";").filter(p => p.trim());
              currentConnector.ports = ports.map(p => {
                const [, name, def] = p.trim().match(/~ (\w+) : (\w+)/) || [];
                return { name, definition: def };
              }).filter(p => p.name);
              log(`  Portas do conector ${currentConnector.name}: ${currentConnector.ports.map(p => `${p.name}:${p.definition}`).join(", ")}`);
            } else if (bl.startsWith("flows :")) {
              const flows = bl.replace("flows :", "").trim().split(";").filter(f => f.trim());
              currentConnector.flows = flows.map(f => {
                const [, type, , src, , tgt] = f.trim().split(" ");
                return new SysADLFlow(type, src, tgt);
              });
              model.flows.push(...currentConnector.flows);
              log(`  Fluxos do conector ${currentConnector.name}: ${currentConnector.flows.map(f => `${f.type} ${f.source} -> ${f.target}`).join(", ")}`);
            }
          });
          currentConnector = null;
        } else if (blockHeader.startsWith("port def")) {
          blockLines.forEach(bl => {
            if (bl.startsWith("flow")) {
              const [, direction, type] = bl.trim().split(" ");
              const portName = Object.keys(model.ports).pop();
              model.ports[portName].flow = { direction, type };
              log(`  Fluxo da porta ${portName}: ${direction} ${type}`);
            }
          });
        } else if (blockHeader.startsWith("executable def")) {
          const name = Object.keys(model.executables).pop();
          model.executables[name].body = blockLines.map(l => {
            if (l.startsWith("return")) {
              return { type: "ReturnStatement", value: l.replace("return", "").replace(";", "").trim() };
            } else if (l.startsWith("let")) {
              const [, name, type, , value] = l.match(/let (\w+):(\w+)( = (.+))?;/) || [];
              return { type: "VariableDecl", name, type, value: value || null };
            } else if (l.startsWith("if")) {
              const [, condition, , body] = l.match(/if \((.+)\) \{(.+)\}/) || [];
              return { type: "IfStatement", condition, body };
            }
            return null;
          }).filter(s => s);
          log(`  Corpo do executável ${name}:\n${JSON.stringify(model.executables[name].body, null, 2)}`);
        } else if (blockHeader.startsWith("activity def") && currentActivity) {
          blockLines.forEach(bl => {
            if (bl.startsWith("body")) {
              const bodyLines = blockLines.slice(blockLines.indexOf(bl) + 1);
              let innerBlock = [];
              let innerDepth = 0;
              bodyLines.forEach(l => {
                if (l.includes("{")) innerDepth++;
                if (l.includes("}")) innerDepth--;
                if (innerDepth > 0 || l.includes("{")) {
                  innerBlock.push(l);
                  return;
                }
                if (l.startsWith("actions :")) {
                  const acts = l.replace("actions :", "").trim().split(";").filter(a => a.trim());
                  currentActivity.body.actions = acts.map(a => {
                    const [name, def] = a.trim().split(":").map(s => s.trim());
                    const pinsMatch = innerBlock.join(" ").match(new RegExp(`${name}\\s*:\\s*${def}\\s*using pins :\\s*([^}]+)`));
                    const pins = pinsMatch ? pinsMatch[1].split(";").map(p => {
                      const [pname, ptype] = p.trim().split(":").map(s => s.trim());
                      return { name: pname, type: ptype };
                    }) : [];
                    return { name, definition: def, pins };
                  });
                  log(`  Ações da atividade ${currentActivity.name}: ${currentActivity.body.actions.map(a => `${a.name}(${a.pins.map(p => `${p.name}:${p.type}`).join(", ")})`).join(", ")}`);
                } else if (l.startsWith("delegate")) {
                  const [, src, , tgt] = l.trim().split(" ");
                  currentActivity.body.delegations.push({ source: src, target: tgt });
                  log(`  Delegação na atividade ${currentActivity.name}: ${src} -> ${tgt}`);
                } else if (l.startsWith("flow")) {
                  const [, , src, , tgt] = l.trim().split(" ");
                  currentActivity.body.flows.push({ source: src, target: tgt });
                  log(`  Fluxo na atividade ${currentActivity.name}: ${src} -> ${tgt}`);
                }
              });
            }
          });
          currentActivity = null;
        } else if (blockHeader.startsWith("action def")) {
          const name = Object.keys(model.actions).pop();
          blockLines.forEach(bl => {
            if (bl.startsWith("constraint :")) {
              const [, kind, def] = bl.trim().match(/constraint : (\w+) (\w+)/) || [];
              if (kind && def) {
                model.actions[name].constraints.push({ kind, definition: def });
                log(`  Restrição ${kind} adicionada à ação ${name}: ${def}`);
              }
            }
          });
        } else if (blockHeader.startsWith("constraint")) {
          const name = Object.keys(model.constraints).pop();
          blockLines.forEach(bl => {
            if (bl.startsWith("equation =")) {
              model.constraints[name].equation = bl.replace("equation =", "").trim().replace(";", "");
              log(`  Equação da restrição ${name}: ${model.constraints[name].equation}`);
            }
          });
        } else if (blockHeader.startsWith("datatype")) {
          const name = Object.keys(model.dataTypes).pop();
          blockLines.forEach(bl => {
            if (bl.startsWith("attributes :")) {
              const attrs = bl.replace("attributes :", "").trim().split(";").filter(a => a.trim());
              model.dataTypes[name].fields = attrs.map(a => {
                const [name, type] = a.trim().split(":").map(s => s.trim());
                return { name, type };
              });
              log(`  Atributos do tipo ${name}: ${model.dataTypes[name].fields.map(f => `${f.name}:${f.type}`).join(", ")}`);
            } else if (bl.includes("unit =") || bl.includes("dimension =")) {
              const [key, value] = bl.split("=").map(s => s.trim().replace(";", ""));
              model.dataTypes[name][key.trim()] = value;
              log(`  ${key} do tipo ${name}: ${value}`);
            }
          });
        } else if (blockHeader.startsWith("enum")) {
          const name = Object.keys(model.dataTypes).pop();
          const literals = blockLines[0].split(",").map(l => l.trim());
          model.dataTypes[name].literals = literals;
          log(`  Literais do enum ${name}: ${literals.join(", ")}`);
        } else if (blockHeader.startsWith("dimension") || blockHeader.startsWith("unit")) {
          const name = Object.keys(model.dataTypes).pop();
          blockLines.forEach(bl => {
            if (bl.includes("dimension =")) {
              const [, value] = bl.split("=").map(s => s.trim().replace(";", ""));
              model.dataTypes[name].dimension = value;
              log(`  Dimensão da unidade ${name}: ${value}`);
            }
          });
        } else if (blockHeader === "allocations") {
          blockLines.forEach(bl => {
            if (bl.startsWith("activity") || bl.startsWith("executable")) {
              const [, type, src, , tgt] = bl.trim().split(" ");
              model.allocations.push({ type, source: src, target: tgt });
              log(`  Alocação: ${type} ${src} -> ${tgt}`);
            }
          });
        }
        currentBlock = blockStack.length > 0 ? blockStack[blockStack.length - 1].type : null;
      }
      continue;
    }

    // Coletar linhas dentro de um bloco
    if (blockDepth > 0 && blockStack.length > 0) {
      blockStack[blockStack.length - 1].lines.push(line);
      continue;
    }

    // Processar fluxos globais
    if (line.startsWith("flow")) {
      const [, type, , src, , tgt] = line.split(" ");
      model.flows.push(new SysADLFlow(type, src, tgt));
      log(`Fluxo global definido: ${type} ${src} -> ${tgt}`);
    }
  }

  if (blockDepth !== 0) {
    log(`Erro: Blocos não fechados corretamente (blockDepth = ${blockDepth})`);
  }

  log("Parsing concluído.");
  return model;
}
/**
 * Visualizer for SysADL architecture based on generated JS code
 * Uses vis.js (vis-network) to render components, ports, and connectors
 */

import { Network } from 'https://cdn.jsdelivr.net/npm/vis-network@9.1.9/+esm';

// Function to create a model from generated JS code
function createDynamicModel(generatedCode, logElement) {
  try {
    let normalizedCode = generatedCode.replace(/['"]use strict['"];/g, '');

    const prelude = [
      'var module = { exports: {} };',
      'var exports = module.exports;',
      'function require(p) {',
      "  if (typeof p === 'string' && p.includes('SysADLBase')) {",
      "    if (!window.SysADLBase) { throw new Error('window.SysADLBase não disponível!'); }",
      "    return window.SysADLBase;",
      "  }",
      "  throw new Error('require não suportado no browser: '+p);",
      '}'
    ].join('\n');
    const suffix = '\nreturn module.exports;';
    const code = prelude + '\n' + normalizedCode + suffix;

    let modelModule;
    try {
      modelModule = eval(`(function() { ${code} })()`);
    } catch (evalError) {
      console.error('Erro ao avaliar o código JavaScript:', evalError);
      if (logElement) logElement.textContent += `[ERRO] Falha ao avaliar o código JavaScript: ${evalError.message}\n`;
      return null;
    }

    if (!modelModule) {
      console.error('Nenhum módulo exportado pelo código gerado');
      if (logElement) logElement.textContent += '[ERRO] Código gerado não exporta um módulo\n';
      return null;
    }

    if (typeof modelModule.createModel !== 'function') {
      console.error('Módulo não exporta a função createModel. Exportações:', Object.keys(modelModule));
      if (logElement) logElement.textContent += `[ERRO] Módulo não exporta a função createModel. Exportações: ${Object.keys(modelModule).join(', ')}\n`;
      return null;
    }

    let model;
    try {
      model = modelModule.createModel();
    } catch (createError) {
      console.error('Erro ao executar createModel:', createError);
      if (logElement) logElement.textContent += `[ERRO] Falha ao executar createModel: ${createError.message}\n`;
      return null;
    }

    if (!model || typeof model !== 'object') {
      console.error('createModel retornou um valor inválido:', model);
      if (logElement) logElement.textContent += `[ERRO] createModel retornou um valor inválido: ${String(model)}\n`;
      return null;
    }

    console.log('✅ Modelo criado com sucesso:', model.name || 'Sem nome');
    if (logElement) logElement.textContent += `[INFO] Modelo criado com sucesso: ${model.name || 'Sem nome'}\n`;
    return model;
  } catch (error) {
    console.error('Erro geral ao criar modelo dinâmico:', error);
    if (logElement) logElement.textContent += `[ERRO] Erro ao criar modelo dinâmico: ${error.message}\n`;
    return null;
  }
}

// Function to extract architecture data from generated JS model
function extractArchitectureData(model, logElement) {
  const nodes = new Map();
  const edges = [];
  const ports = new Map();

  // Helper to add a component as a node
  function addComponentNode(comp, parentId = null) {
    if (!comp || !comp.name) {
      console.warn('Componente inválido ou sem nome:', comp);
      if (logElement) logElement.textContent += `[AVISO] Componente inválido ou sem nome: ${JSON.stringify(comp)}\n`;
      return;
    }
    const id = comp.name;
    nodes.set(id, {
      id,
      label: comp.name,
      group: parentId ? 'subcomponent' : 'component',
      parentId,
      shape: 'box',
      color: { background: parentId ? '#66bb6a' : '#0288d1', border: '#01579b' },
      font: { color: '#ffffff', face: 'Arial', size: 14 },
      shadow: { enabled: true, size: 6, x: 3, y: 3 },
      margin: parentId ? 20 : 15,
      title: `Componente: ${comp.name}${parentId ? ` (Subcomponente de ${parentId})` : ''}`,
    });

    if (comp.ports && typeof comp.ports === 'object') {
      Object.entries(comp.ports).forEach(([portName, port]) => {
        if (!port || !portName) {
          console.warn('Porta inválida:', portName, port);
          if (logElement) logElement.textContent += `[AVISO] Porta inválida: ${portName}\n`;
          return;
        }
        const portId = `${id}.${portName}`;
        nodes.set(portId, {
          id: portId,
          label: portName,
          group: 'port',
          parentId: id,
          shape: 'circle',
          size: 10,
          color: { background: port.direction === 'out' ? '#ffca28' : '#d32f2f', border: port.direction === 'out' ? '#f9a825' : '#b71c1c' },
          font: { color: '#ffffff', face: 'Arial', size: 10 },
          shadow: { enabled: true, size: 4 },
          title: `Porta: ${portName}\nDireção: ${port.direction || 'desconhecida'}\nTipo: ${port.opts?.expectedType || port.dataType || 'desconhecido'}`,
        });
        ports.set(portId, {
          componentId: id,
          name: portName,
          direction: port.direction || 'unknown',
          expectedType: port.opts?.expectedType || port.dataType || 'unknown',
        });
        edges.push({
          from: id,
          to: portId,
          color: { color: '#b0bec5' },
          dashes: true,
          arrows: 'none',
          width: 1.5,
        });
      });
    } else {
      console.warn('Nenhuma porta encontrada para o componente:', id);
      if (logElement) logElement.textContent += `[AVISO] Nenhuma porta encontrada para o componente: ${id}\n`;
    }

    if (comp.components && typeof comp.components === 'object') {
      Object.values(comp.components).forEach(subComp => {
        addComponentNode(subComp, id);
      });
    }
  }

  // Helper to find component by port role or binding
  function findComponentByPortRole(model, role, portClass, direction, connector) {
    let foundComp = null;
    let foundPort = null;

    // Check bindings in connector
    if (connector && connector.bindings && typeof connector.bindings === 'object') {
      const binding = connector.bindings[role];
      if (binding && binding.owner && binding.port && binding.port.name) {
        foundComp = binding.owner;
        foundPort = binding.port.name;
        return { componentName: foundComp, portName: foundPort };
      }
    }

    // Fallback: Check top-level component ports
    if (model.ports && typeof model.ports === 'object') {
      Object.entries(model.ports).forEach(([portName, port]) => {
        if (
          portName === role ||
          (port.portClass === portClass && port.direction === direction) ||
          (port.opts?.expectedType === portClass.split('_').pop().replace('OPT', '').replace('IPT', ''))
        ) {
          foundComp = model.name;
          foundPort = portName;
        }
      });
    }

    // Check subcomponents
    if (!foundComp && model.components && typeof model.components === 'object') {
      Object.values(model.components).forEach(comp => {
        if (comp.ports && typeof comp.ports === 'object') {
          Object.entries(comp.ports).forEach(([portName, port]) => {
            if (
              portName === role ||
              (port.portClass === portClass && port.direction === direction) ||
              (port.opts?.expectedType === portClass.split('_').pop().replace('OPT', '').replace('IPT', ''))
            ) {
              foundComp = comp.name;
              foundPort = portName;
            }
          });
        }
      });
    }

    return { componentName: foundComp, portName: foundPort };
  }

  // Helper to add connectors as edges
  function addConnectorEdges(comp) {
    if (comp.connectors && typeof comp.connectors === 'object') {
      Object.entries(comp.connectors).forEach(([connName, conn]) => {
        console.log(`Processando conector: ${connName}`, conn);
        if (logElement) logElement.textContent += `[DEBUG] Processando conector: ${connName}, Estrutura: ${JSON.stringify(conn, null, 2)}\n`;

        if (!conn) {
          console.warn('Conector nulo:', connName);
          if (logElement) logElement.textContent += `[AVISO] Conector nulo: ${connName}\n`;
          return;
        }

        let flow = null;
        let fromPort, toPort, fromCompName, toCompName;

        if (conn.flowSchema && Array.isArray(conn.flowSchema) && conn.flowSchema.length > 0) {
          flow = conn.flowSchema[0];
          if (conn.participantSchema) {
            fromPort = conn.participantSchema[flow.from];
            toPort = conn.participantSchema[flow.to];

            if (fromPort && toPort) {
              const fromMatch = findComponentByPortRole(comp, flow.from, fromPort.portClass, fromPort.direction, conn);
              const toMatch = findComponentByPortRole(comp, flow.to, toPort.portClass, toPort.direction, conn);
              fromCompName = fromMatch.componentName;
              fromPort = { role: fromMatch.portName || fromPort.role || flow.from };
              toCompName = toMatch.componentName;
              toPort = { role: toMatch.portName || toPort.role || flow.to };
            }
          }
        } else if (conn.from && conn.to) {
          flow = { from: conn.from, to: conn.to };
          fromPort = { role: flow.from.split('.').pop() };
          toPort = { role: flow.to.split('.').pop() };
          fromCompName = flow.from.split('.')[0];
          toCompName = flow.to.split('.')[0];
        } else if (conn.props && typeof conn.props === 'object' && conn.props.flowSchema) {
          flow = conn.props.flowSchema[0];
          if (conn.props.participantSchema) {
            fromPort = conn.props.participantSchema[flow.from];
            toPort = conn.props.participantSchema[flow.to];

            if (fromPort && toPort) {
              const fromMatch = findComponentByPortRole(comp, flow.from, fromPort.portClass, fromPort.direction, conn);
              const toMatch = findComponentByPortRole(comp, flow.to, toPort.portClass, toPort.direction, conn);
              fromCompName = fromMatch.componentName;
              fromPort = { role: fromMatch.portName || fromPort.role || flow.from };
              toCompName = toMatch.componentName;
              toPort = { role: toMatch.portName || toPort.role || flow.to };
            }
          }
        } else {
          console.warn('Conector sem flowSchema, from/to ou props.flowSchema válidos:', connName, conn);
          if (logElement) logElement.textContent += `[AVISO] Conector sem flowSchema, from/to ou props.flowSchema válidos: ${connName}\n`;
          return;
        }

        if (!fromPort || !toPort || !fromCompName || !toCompName) {
          console.warn('Conector com informações incompletas:', connName, {
            fromPort,
            toPort,
            fromCompName,
            toCompName,
          });
          if (logElement) logElement.textContent += `[AVISO] Conector com informações incompletas: ${connName}, from: ${fromCompName}.${fromPort?.role}, to: ${toCompName}.${toPort?.role}\n`;
          return;
        }

        const fromPortId = `${fromCompName}.${fromPort.role}`;
        const toPortId = `${toCompName}.${toPort.role}`;

        if (fromPortId && toPortId && nodes.has(fromPortId) && nodes.has(toPortId)) {
          edges.push({
            from: fromPortId,
            to: toPortId,
            label: connName + (conn.activityName || conn.props?.activityName ? ` (${conn.activityName || conn.props.activityName})` : ''),
            arrows: { to: { enabled: true, type: 'arrow', scaleFactor: 0.9 } },
            color: { color: '#d81b60', highlight: '#ad1457' },
            font: { align: 'middle', size: 12, face: 'Arial', background: 'rgba(255, 255, 255, 0.8)', color: '#333' },
            width: 2,
            shadow: { enabled: true, size: 4 },
            title: `Conector: ${connName}\nAtividade: ${conn.activityName || conn.props?.activityName || 'N/A'}\nTipo de Dado: ${flow.dataType || 'desconhecido'}`,
          });
        } else {
          console.warn('Conector inválido:', connName, { fromPortId, toPortId, fromExists: nodes.has(fromPortId), toExists: nodes.has(toPortId) });
          if (logElement) logElement.textContent += `[AVISO] Conector inválido: ${connName}, from: ${fromPortId} (existe: ${nodes.has(fromPortId)}), to: ${toPortId} (existe: ${nodes.has(toPortId)})\n`;
        }
      });
    }

    if (comp.components && typeof comp.components === 'object') {
      Object.values(comp.components).forEach(subComp => {
        addConnectorEdges(subComp);
      });
    }
  }

  if (model && typeof model === 'object') {
    try {
      addComponentNode(model);
      addConnectorEdges(model);
    } catch (error) {
      console.error('Erro ao extrair dados da arquitetura:', error);
      if (logElement) logElement.textContent += `[ERRO] Falha ao extrair dados da arquitetura: ${error.message}\n`;
    }
  } else {
    console.warn('Modelo inválido ou não fornecido');
    if (logElement) logElement.textContent += '[ERRO] Modelo inválido ou não fornecido\n';
  }

  return { nodes: Array.from(nodes.values()), edges, ports: Array.from(ports.entries()) };
}

// Function to render the visualization
function renderVisualization(containerId, generatedCode, logElement) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('Contêiner de visualização não encontrado:', containerId);
    if (logElement) logElement.textContent += `[ERRO] Contêiner de visualização não encontrado: ${containerId}\n`;
    return;
  }

  try {
    const model = createDynamicModel(generatedCode, logElement);
    if (!model) {
      console.warn('Nenhum modelo válido para visualizar');
      if (logElement) logElement.textContent += '[ERRO] Nenhum modelo válido para visualizar\n';
      return;
    }
    const { nodes, edges } = extractArchitectureData(model, logElement);
    if (nodes.length === 0 && edges.length === 0) {
      console.warn('Nenhum dado de arquitetura válido para visualizar');
      if (logElement) logElement.textContent += `[ERRO] Nenhum dado de arquitetura válido para visualizar\n`;
      return;
    }
    const data = { nodes, edges };
    const options = {
      layout: {
        hierarchical: {
          direction: 'UD',
          sortMethod: 'directed',
          nodeSpacing: 300,
          levelSeparation: 200,
        },
      },
      nodes: {
        shapeProperties: { borderRadius: 8 },
        margin: 20,
        font: { size: 14, face: 'Arial', color: '#ffffff' },
        borderWidth: 2,
        shadow: { enabled: true, size: 6, x: 3, y: 3 },
      },
      edges: {
        smooth: { type: 'cubicBezier', roundness: 0.4 },
        font: { size: 12, face: 'Arial', background: 'rgba(255, 255, 255, 0.8)', color: '#333' },
        width: 2,
        shadow: { enabled: true, size: 4 },
      },
      physics: {
        enabled: false,
      },
      interaction: {
        zoomView: true,
        dragView: true,
        hover: true,
        tooltipDelay: 150,
      },
    };

    new Network(container, data, options);
    console.log('✅ Visualização renderizada com', nodes.length, 'nós e', edges.length, 'arestas');
    if (logElement) logElement.textContent += `[INFO] Visualização renderizada com ${nodes.length} nós e ${edges.length} arestas\n`;
  } catch (error) {
    console.error('Erro ao renderizar visualização:', error);
    if (logElement) logElement.textContent += `[ERRO] Falha ao renderizar visualização: ${error.message}\n`;
  }
}

// Export for use in app.js
export { renderVisualization };
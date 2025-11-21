/**
 * Visualizer for SysADL architecture based on generated JS code
 * Uses vis.js (vis-network) to render components, ports, and connectors
 */

import { Network } from 'https://cdn.jsdelivr.net/npm/vis-network@9.1.9/+esm';

const palette = {
  canvas: '#eef2ff',
  canvasAccent: 'radial-gradient(circle at 10% 20%, rgba(79, 70, 229, 0.18), transparent 70%)',
  componentBg: '#dbeafe',
  componentBorder: '#312e81',
  componentHighlight: '#4338ca',
  subcomponentBg: '#f1f5f9',
  subcomponentBorder: '#475569',
  subcomponentHighlight: '#2563eb',
  portOut: '#22d3ee',
  portIn: '#fb7185',
  portUnknown: '#94a3b8',
  portShadow: 'rgba(15, 23, 42, 0.18)',
  connectorEdge: '#334155',
  connectorHighlight: '#0ea5e9',
  connectorLabelBg: 'rgba(255, 255, 255, 0.94)',
  swimlaneStroke: 'rgba(148, 163, 184, 0.35)',
  portLink: '#b4c2d9'
};

class FlowAnimator {
  constructor(network, overlay) {
    this.network = network;
    this.overlay = overlay;
    this.markers = new Map();
    this.targets = new Map();
    this.radius = 18;
  }

  _key(flowId) {
    if (flowId && flowId !== '--') return String(flowId);
    return '__default';
  }

  _ensureMarker(flowId) {
    const key = this._key(flowId);
    if (this.markers.has(key)) return this.markers.get(key);
    const marker = document.createElement('div');
    marker.className = 'flow-marker';
    marker.dataset.state = 'hidden';
    marker.style.opacity = '0';
    const valueLabel = document.createElement('span');
    valueLabel.className = 'flow-marker-value';
    marker.appendChild(valueLabel);
    this.overlay.appendChild(marker);
    this.markers.set(key, marker);
    return marker;
  }

  _formatValue(value) {
    if (value === undefined) return '';
    if (value === null) return 'null';
    if (typeof value === 'object') {
      try {
        const str = JSON.stringify(value);
        return str;
      } catch {
        return '[object]';
      }
    }
    return String(value);
  }

  _positionMarker(marker, domPos) {
    if (!domPos) return;
    marker.style.transform = `translate(${domPos.x - this.radius}px, ${domPos.y - this.radius}px)`;
  }

  _getDomPosition(nodeId) {
    if (!nodeId) return null;
    const positions = this.network.getPositions([nodeId]);
    const canvasPos = positions[nodeId];
    if (!canvasPos) return null;
    return this.network.canvasToDOM(canvasPos);
  }

  _setValue(marker, value) {
    const label = marker.querySelector('.flow-marker-value');
    const stringValue = this._formatValue(value);
    const trimmed = stringValue.length > 14 ? `${stringValue.slice(0, 13)}…` : stringValue;
    if (label) {
      label.textContent = trimmed;
    }
    if (stringValue) {
      marker.title = stringValue;
      marker.setAttribute('data-value', stringValue);
    } else {
      marker.removeAttribute('title');
      marker.removeAttribute('data-value');
    }
  }

  deemphasize() {
    this.markers.forEach(marker => {
      if (marker.dataset.state === 'visible') {
        marker.classList.remove('active');
        marker.style.opacity = marker.style.opacity && Number(marker.style.opacity) > 0 ? '0.25' : '0';
      }
    });
  }

  focus(flowId) {
    const key = this._key(flowId);
    this.markers.forEach((marker, markerKey) => {
      if (marker.dataset.state !== 'visible') return;
      if (markerKey === key) {
        marker.classList.add('active');
        marker.style.opacity = '1';
      } else {
        marker.classList.remove('active');
        marker.style.opacity = '0.25';
      }
    });
  }

  moveToNode(flowId, nodeId, value) {
    const domPos = this._getDomPosition(nodeId);
    if (!domPos) return false;
    const marker = this._ensureMarker(flowId);
    marker.dataset.state = 'visible';
    marker.style.transition = 'transform 0.4s ease, opacity 0.3s ease';
    marker.style.opacity = '0.65';
    this._positionMarker(marker, domPos);
    this._setValue(marker, value);
    this.targets.set(this._key(flowId), { type: 'node', id: nodeId });
    return true;
  }

  animate(flowId, fromId, toId, value) {
    const fromDom = this._getDomPosition(fromId) || this._getDomPosition(toId);
    if (!fromDom) return false;
    const marker = this._ensureMarker(flowId);
    marker.dataset.state = 'visible';
    marker.style.transition = 'transform 0.45s ease, opacity 0.3s ease';
    marker.style.opacity = '0.65';
    this._positionMarker(marker, fromDom);
    this._setValue(marker, value);
    const toDom = this._getDomPosition(toId);
    if (toDom) {
      requestAnimationFrame(() => this._positionMarker(marker, toDom));
    }
    this.targets.set(this._key(flowId), { type: 'node', id: toId || fromId });
    return true;
  }

  hide(flowId) {
    const marker = this.markers.get(this._key(flowId));
    if (marker) {
      marker.dataset.state = 'hidden';
      marker.classList.remove('active');
      marker.style.opacity = '0';
    }
    this.targets.delete(this._key(flowId));
  }

  hideAll() {
    this.markers.forEach(marker => {
      marker.dataset.state = 'hidden';
      marker.classList.remove('active');
      marker.style.opacity = '0';
    });
    this.targets.clear();
  }

  refresh() {
    this.targets.forEach((target, key) => {
      if (!target || target.type !== 'node') return;
      const domPos = this._getDomPosition(target.id);
      const marker = this.markers.get(key);
      if (!domPos || !marker) return;
      marker.style.transition = 'none';
      this._positionMarker(marker, domPos);
      requestAnimationFrame(() => {
        if (marker.dataset.state === 'visible') {
          marker.style.transition = 'transform 0.4s ease, opacity 0.3s ease';
        }
      });
    });
  }
}

// Function to create a model from generated JS code
function createDynamicModel(generatedCode, logElement) {
  try {
    let normalizedCode = generatedCode.replace(/['"]use strict['"];/g, '');

    const prelude = [
      'var module = { exports: {} };',
      'var exports = module.exports;',
      'function require(p) {',
      "  if (typeof p === 'string' && p.includes('SysADLBase')) {",
      "    if (!window.SysADLBase) { throw new Error('window.SysADLBase is not available!'); }",
      "    return window.SysADLBase;",
      "  }",
      "  throw new Error('require is not supported in the browser: '+p);",
      '}'
    ].join('\n');
    const suffix = '\nreturn module.exports;';
    const code = prelude + '\n' + normalizedCode + suffix;

    let modelModule;
    try {
      modelModule = eval(`(function() { ${code} })()`);
    } catch (evalError) {
      console.error('Error evaluating generated JavaScript:', evalError);
      if (logElement) logElement.textContent += `[ERROR] Failed to evaluate generated JavaScript: ${evalError.message}\n`;
      return null;
    }

    if (!modelModule) {
      console.error('Generated code did not export a module');
      if (logElement) logElement.textContent += '[ERROR] Generated code did not export a module\n';
      return null;
    }

    if (typeof modelModule.createModel !== 'function') {
      console.error('Module does not export createModel. Exports:', Object.keys(modelModule));
      if (logElement) logElement.textContent += `[ERROR] Module does not export createModel. Exports: ${Object.keys(modelModule).join(', ')}\n`;
      return null;
    }

    let model;
    try {
      model = modelModule.createModel();
    } catch (createError) {
      console.error('Error while executing createModel:', createError);
      if (logElement) logElement.textContent += `[ERROR] Failed to execute createModel: ${createError.message}\n`;
      return null;
    }

    if (!model || typeof model !== 'object') {
      console.error('createModel returned an invalid value:', model);
      if (logElement) logElement.textContent += `[ERROR] createModel returned an invalid value: ${String(model)}\n`;
      return null;
    }

    console.log('✅ Model instantiated successfully:', model.name || 'Unnamed');
    if (logElement) logElement.textContent += `[INFO] Model instantiated successfully: ${model.name || 'Unnamed'}\n`;
    return model;
  } catch (error) {
    console.error('Unexpected error while creating dynamic model:', error);
    if (logElement) logElement.textContent += `[ERROR] Unexpected error while creating dynamic model: ${error.message}\n`;
    return null;
  }
}

// Function to extract architecture data from generated JS model
function extractArchitectureData(model, logElement) {
  const nodes = new Map();
  const edges = [];
  const ports = new Map();
  const portIndex = new Map();
  const portPathIndex = new Map();
  const componentPathIndex = new Map();
  const edgeLookup = new Map();
  const rootModel = model;
  const componentPortMap = new Map();
  const componentNodeIds = new Set();

  const warn = (message) => {
    console.warn(message);
    if (logElement) {
      logElement.textContent += `[WARN] ${message}\n`;
    }
  };

  function normalizeComponentId(name, fallback) {
    if (typeof name === 'string' && name.trim().length > 0) {
      return name.trim();
    }
    return fallback || 'anonymous-component';
  }

  function buildPortId(componentName, portName) {
    if (!componentName || !portName) return null;
    return `${componentName}.${portName}`;
  }

  function registerPath(map, key, id) {
    if (!key || !id) return;
    const norm = key.trim();
    if (!norm) return;
    const list = map.get(norm);
    if (list) {
      if (!list.includes(id)) list.push(id);
    } else {
      map.set(norm, [id]);
    }
  }

  function registerEdgeLookup(fromId, toId, edgeId) {
    if (!fromId || !toId || !edgeId) return;
    const key = `${fromId}->${toId}`;
    const list = edgeLookup.get(key);
    if (list) {
      list.push(edgeId);
    } else {
      edgeLookup.set(key, [edgeId]);
    }
  }

  function addComponentNode(comp, parentId = null, level = 0, parentPath = null) {
    if (!comp || !comp.name) {
      warn(`Invalid component or missing name: ${JSON.stringify(comp)}`);
      return;
    }
    const componentId = normalizeComponentId(comp.name, parentId ? `${parentId}-child` : 'component');
    componentNodeIds.add(componentId);
    const resolvedPath = parentPath ? `${parentPath}.${comp.name}` : comp.name;
    registerPath(componentPathIndex, resolvedPath, componentId);
    registerPath(componentPathIndex, comp.name, componentId);

    if (!componentPortMap.has(componentId)) {
      componentPortMap.set(componentId, { in: [], out: [], other: [] });
    }

    nodes.set(componentId, {
      id: componentId,
      label: comp.name,
      group: parentId ? 'subcomponent' : 'component',
      parentId,
      level,
      shape: 'box',
      widthConstraint: { maximum: 320, minimum: 160 },
      heightConstraint: { minimum: 52 },
      margin: parentId ? 18 : 24,
      color: parentId
        ? {
            background: palette.subcomponentBg,
            border: palette.subcomponentBorder,
            highlight: { background: palette.subcomponentHighlight, border: palette.subcomponentHighlight },
            hover: { background: palette.subcomponentHighlight, border: palette.subcomponentHighlight }
          }
        : {
            background: palette.componentBg,
            border: palette.componentBorder,
            highlight: { background: palette.componentHighlight, border: palette.componentHighlight },
            hover: { background: palette.componentHighlight, border: palette.componentHighlight }
          },
      borderWidth: 0,
      font: {
        color: '#0f172a',
        face: 'Inter, "Segoe UI", sans-serif',
        size: parentId ? 14 : 16,
        vadjust: 6
      },
      shadow: {
        enabled: true,
        size: parentId ? 6 : 12,
        x: 0,
        y: 6,
        color: 'rgba(15, 23, 42, 0.24)'
      },
      title: `Component: ${comp.name}${parentId ? ` (child of ${parentId})` : ''}`
    });

    if (comp.ports && typeof comp.ports === 'object') {
      Object.entries(comp.ports).forEach(([portName, port]) => {
        if (!port || !portName) {
          warn(`Invalid port detected in ${componentId}`);
          return;
        }

        const portId = `${componentId}.${portName}`;
        const direction = port.direction || 'unknown';
        const group = direction === 'out' ? 'port_out' : direction === 'in' ? 'port_in' : 'port_unknown';

        nodes.set(portId, {
          id: portId,
          label: portName,
          group,
          parentId: componentId,
          shape: 'dot',
          size: 12,
          borderWidth: 1.5,
          shadow: { enabled: true, size: 6, x: 0, y: 2, color: palette.portShadow },
          physics: false,
          level,
          title: `Port: ${portName}\nDirection: ${direction}\nExpected type: ${port.expectedType || 'unknown'}`
        });

        ports.set(portId, {
          componentId,
          name: portName,
          direction,
          expectedType: port.expectedType || 'unknown',
          portRef: port
        });

        portIndex.set(port, portId);
        registerPath(portPathIndex, `${resolvedPath}.${portName}`, portId);
        registerPath(portPathIndex, `${comp.name}.${portName}`, portId);
        registerPath(portPathIndex, portName, portId);

        const groupMeta = componentPortMap.get(componentId);
        const bucket = direction === 'out' ? 'out' : direction === 'in' ? 'in' : 'other';
        groupMeta[bucket].push({
          id: portId,
          name: portName,
          direction
        });

        const compPortEdgeId = `cp:${componentId}->${portId}:${edges.length}`;
        edges.push({
          id: compPortEdgeId,
          from: componentId,
          to: portId,
          color: { color: palette.portLink },
          dashes: true,
          arrows: 'none',
          width: 1,
          smooth: false,
          physics: false,
          length: 28,
          selectionWidth: 0,
          hoverWidth: 0
        });
        registerEdgeLookup(componentId, portId, compPortEdgeId);
      });
    } else {
      warn(`No ports found for component: ${componentId}`);
    }

    if (comp.components && typeof comp.components === 'object') {
      Object.values(comp.components).forEach(child => addComponentNode(child, componentId, level + 1, resolvedPath));
    }
  }

  function getFlowSchema(connector) {
    if (Array.isArray(connector?.flowSchema)) return connector.flowSchema;
    if (Array.isArray(connector?.props?.flowSchema)) return connector.props.flowSchema;
    return [];
  }

  function getParticipantSchema(connector) {
    return connector?.participantSchema || connector?.props?.participantSchema || {};
  }

  function normalizeOwnerName(ownerPath) {
    if (!ownerPath) return null;
    if (typeof ownerPath === 'string') {
      const trimmed = ownerPath.trim();
      if (!trimmed) return null;
      return trimmed.includes('.') ? trimmed.split('.')[0] : trimmed;
    }
    if (ownerPath.name) return ownerPath.name;
    return null;
  }

  function bindingFromMap(binding, directionHint) {
    if (!binding) return null;
    const componentName = binding.componentName || normalizeOwnerName(binding.ownerPath || binding.owner);
    const portName = binding.portName || binding.port?.name || binding.portRef?.name || null;
    const portRef = binding.portRef || binding.port || null;
    const portId = portRef && portIndex.has(portRef) ? portIndex.get(portRef) : buildPortId(componentName, portName);
    return {
      componentName,
      portName,
      portId,
      portRef,
      direction: binding.direction || binding.port?.direction || directionHint || null
    };
  }

  function getBindingFromConnector(connector, role, directionHint) {
    if (!connector) return null;
    if (connector.boundParticipants && connector.boundParticipants[role]) {
      return bindingFromMap(connector.boundParticipants[role], directionHint);
    }
    if (connector.bindings && connector.bindings[role]) {
      return bindingFromMap(connector.bindings[role], directionHint);
    }
    return null;
  }

  function matchesSchema(port, portName, role, schema, directionHint) {
    if (!port) return false;
    const normalizedDirection = directionHint || schema?.direction || null;
    const schemaPortClass = schema?.portClass || null;
    const schemaType = schema?.dataType || null;

    if (role && portName === role) return true;
    if (schemaPortClass && port.constructor && port.constructor.name === schemaPortClass) return true;
    if (normalizedDirection && port.direction === normalizedDirection) return true;
    if (schemaType && port.expectedType === schemaType) return true;
    return false;
  }

  function searchPort(component, role, schema, directionHint) {
    if (!component) return null;

    if (component.ports && typeof component.ports === 'object') {
      for (const [portName, port] of Object.entries(component.ports)) {
        if (matchesSchema(port, portName, role, schema, directionHint)) {
          const componentName = component.name || normalizeComponentId(null, 'component');
          const portId = portIndex.get(port) || buildPortId(componentName, portName);
          return {
            componentName,
            portName,
            portId,
            portRef: port,
            direction: port.direction
          };
        }
      }
    }

    if (component.components && typeof component.components === 'object') {
      for (const child of Object.values(component.components)) {
        const candidate = searchPort(child, role, schema, directionHint);
        if (candidate) return candidate;
      }
    }

    return null;
  }

  function resolveBinding(connector, role, schema, directionHint) {
    const direct = getBindingFromConnector(connector, role, directionHint || schema?.direction);
    if (direct && direct.portId) {
      return direct;
    }
    const fallback = searchPort(rootModel, role, schema, directionHint);
    return fallback || direct || null;
  }

  function addConnectorEdges(comp) {
    if (!comp || !comp.connectors || typeof comp.connectors !== 'object') return;

    Object.entries(comp.connectors).forEach(([connName, conn]) => {
      if (!conn) {
        warn(`Connector ${connName} is null`);
        return;
      }

      const flows = getFlowSchema(conn);
      const participantSchema = getParticipantSchema(conn);

      if (flows.length > 0) {
        flows.forEach(flow => {
          if (!flow || !flow.from || !flow.to) return;
          const fromSchema = participantSchema[flow.from] || {};
          const toSchema = participantSchema[flow.to] || {};

          let fromBinding = resolveBinding(conn, flow.from, fromSchema, fromSchema.direction);
          let toBinding = resolveBinding(conn, flow.to, toSchema, toSchema.direction);

          const fromDir = (fromBinding?.portRef?.direction || fromBinding?.direction || '').toLowerCase();
          const toDir = (toBinding?.portRef?.direction || toBinding?.direction || '').toLowerCase();
          const shouldSwap =
            (fromDir === 'in' && toDir === 'out') ||
            (fromDir === 'in' && (!toDir || toDir === 'in')) ||
            (fromDir !== 'out' && toDir === 'out');

          if (shouldSwap) {
            const temp = fromBinding;
            fromBinding = toBinding;
            toBinding = temp;
          }

          const fromPortId = fromBinding?.portId;
          const toPortId = toBinding?.portId;

          if (fromPortId && toPortId && nodes.has(fromPortId) && nodes.has(toPortId)) {
            const edgeId = `conn:${connName}:${edges.length}`;
            edges.push({
              id: edgeId,
              from: fromPortId,
              to: toPortId,
              label: connName,
              arrows: { to: { enabled: true, type: 'triangle', scaleFactor: 0.82 } },
              color: { color: palette.connectorEdge, highlight: palette.connectorHighlight },
              width: 2.6,
              smooth: { type: 'cubicBezier', roundness: 0.34 },
              shadow: { enabled: true, size: 6, x: 0, y: 2, color: 'rgba(15, 23, 42, 0.18)' },
              font: {
                size: 12,
                face: 'Inter, "Segoe UI", sans-serif',
                color: '#0f172a',
                background: palette.connectorLabelBg,
                strokeWidth: 0,
                vadjust: -4
              },
              selectionWidth: 2,
              hoverWidth: 2,
              title: `Connector: ${connName}\nFlow: ${flow.from} → ${flow.to}\nData type: ${flow.dataType || conn.activityName || conn.props?.activityName || 'unknown'}`
            });
            registerEdgeLookup(fromPortId, toPortId, edgeId);
          } else {
            warn(`Connector ${connName} could not map ports (${fromPortId || '??'} → ${toPortId || '??'})`);
          }
        });
      } else if (conn.from && conn.to) {
        const fromParts = conn.from.split('.');
        const toParts = conn.to.split('.');
          let fromPortId = buildPortId(fromParts[0], fromParts[1]);
          let toPortId = buildPortId(toParts[0], toParts[1]);

          if (fromPortId && toPortId && nodes.has(fromPortId) && nodes.has(toPortId)) {
            const fromNode = ports.get(fromPortId);
            const toNode = ports.get(toPortId);
            const fromDir = (fromNode?.direction || '').toLowerCase();
            const toDir = (toNode?.direction || '').toLowerCase();
            const shouldSwap =
              (fromDir === 'in' && toDir === 'out') ||
              (fromDir === 'in' && (!toDir || toDir === 'in')) ||
              (fromDir !== 'out' && toDir === 'out');
            if (shouldSwap) {
              const tmp = fromPortId;
              fromPortId = toPortId;
              toPortId = tmp;
            }
          }

        if (fromPortId && toPortId && nodes.has(fromPortId) && nodes.has(toPortId)) {
          const edgeId = `conn:${connName}:${edges.length}`;
          edges.push({
            id: edgeId,
            from: fromPortId,
            to: toPortId,
            label: connName,
            arrows: { to: { enabled: true, type: 'triangle', scaleFactor: 0.82 } },
            color: { color: palette.connectorEdge, highlight: palette.connectorHighlight },
            width: 2.6,
            smooth: { type: 'cubicBezier', roundness: 0.34 },
            shadow: { enabled: true, size: 6, x: 0, y: 2, color: 'rgba(15, 23, 42, 0.18)' },
            font: {
              size: 12,
              face: 'Inter, "Segoe UI", sans-serif',
              color: '#0f172a',
              background: palette.connectorLabelBg,
              strokeWidth: 0,
              vadjust: -4
            },
            title: `Connector: ${connName}\nDirect link: ${conn.from} → ${conn.to}`
          });
          registerEdgeLookup(fromPortId, toPortId, edgeId);
        } else {
          warn(`Connector ${connName} did not locate direct ports (${conn.from} → ${conn.to})`);
        }
      } else {
        warn(`Connector without a recognized flow schema: ${connName}`);
      }
    });

    if (comp.components && typeof comp.components === 'object') {
      Object.values(comp.components).forEach(child => addConnectorEdges(child));
    }
  }

  if (model && typeof model === 'object') {
    try {
      addComponentNode(model);
      addConnectorEdges(model);
    } catch (error) {
      console.error('Error extracting architecture data:', error);
      if (logElement) {
        logElement.textContent += `[ERROR] Failed to extract architecture data: ${error.message}\n`;
      }
    }
  } else {
    warn('Model is invalid or was not provided');
  }

  const nodesArray = Array.from(nodes.values());

  const levelBuckets = new Map();
  nodesArray.forEach(node => {
    if (node.group === 'component' || node.group === 'subcomponent') {
      const level = node.level || 0;
      const bucket = levelBuckets.get(level) || [];
      bucket.push(node);
      levelBuckets.set(level, bucket);
    }
  });

  levelBuckets.forEach((bucket, level) => {
    const verticalSpacing = 220;
    const startY = -((bucket.length - 1) * verticalSpacing) / 2;
    bucket.forEach((node, index) => {
      node.x = level * 420;
      node.y = startY + index * verticalSpacing;
      node.fixed = { x: true, y: true };
      node.physics = false;
    });
  });

  componentPortMap.forEach((groups, componentId) => {
    const compNode = nodes.get(componentId);
    if (!compNode) return;

    const baseX = compNode.x || 0;
    const baseY = compNode.y || 0;
    const verticalSpacing = 70;
    const leftXApprox = baseX - 140;
    const rightXApprox = baseX + 140;
    const bottomYApprox = baseY + 120;

    const placePorts = (portsArr, targetX, align = 'vertical') => {
      if (!Array.isArray(portsArr) || portsArr.length === 0) return;
      const count = portsArr.length;
      portsArr.forEach((port, index) => {
        const portNode = nodes.get(port.id);
        if (!portNode) return;
        if (align === 'vertical') {
          const offset = (index - (count - 1) / 2) * verticalSpacing;
          portNode.x = targetX;
          portNode.y = baseY + offset;
        } else {
          const offset = (index - (count - 1) / 2) * verticalSpacing;
          portNode.x = baseX + offset;
          portNode.y = targetX;
        }
        portNode.fixed = { x: true, y: true };
        portNode.physics = false;
      });
    };

    placePorts(groups?.in, leftXApprox, 'vertical');
    placePorts(groups?.out, rightXApprox, 'vertical');
    placePorts(groups?.other, bottomYApprox, 'horizontal');
  });

  return {
    nodes: nodesArray,
    edges,
    ports: Array.from(ports.entries()),
    componentPortMap: Object.fromEntries(componentPortMap),
    componentNodeIds: Array.from(componentNodeIds),
    portPathIndex: Array.from(portPathIndex.entries()),
    componentPathIndex: Array.from(componentPathIndex.entries()),
    edgeLookup: Array.from(edgeLookup.entries())
  };
}

// Function to render the visualization
function renderVisualization(containerId, generatedCode, logElement) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('Visualization container not found:', containerId);
    if (logElement) logElement.textContent += `[ERROR] Visualization container not found: ${containerId}\n`;
    return;
  }

  try {
    const model = createDynamicModel(generatedCode, logElement);
    if (!model) {
      console.warn('No valid model available to visualize');
      if (logElement) logElement.textContent += '[ERROR] No valid model available to visualize\n';
      return;
    }
    const {
      nodes,
      edges,
      componentPortMap,
      componentNodeIds,
      portPathIndex,
      componentPathIndex,
      edgeLookup
    } = extractArchitectureData(model, logElement);
    const portPathMap = new Map(portPathIndex || []);
    const componentPathMap = new Map(componentPathIndex || []);
    const edgeLookupMap = new Map(edgeLookup || []);
    if (nodes.length === 0 && edges.length === 0) {
      console.warn('No architecture data available to visualize');
      if (logElement) logElement.textContent += '[ERROR] No architecture data available to visualize\n';
      return;
    }
    const data = { nodes, edges };
    container.style.background = palette.canvas;
    container.style.backgroundImage = `${palette.canvasAccent}, repeating-linear-gradient(90deg, transparent, transparent 360px, ${palette.swimlaneStroke} 360px, ${palette.swimlaneStroke} 364px)`;
    container.style.border = '1px solid rgba(99, 102, 241, 0.35)';
    container.style.borderRadius = '20px';
    container.style.boxShadow = '0 26px 52px rgba(15, 23, 42, 0.14)';
    container.style.padding = '0';
    container.style.minHeight = '450px';
    container.style.height = '450px';
    container.style.width = '100%';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    const options = {
      layout: {
        improvedLayout: false
      },
      nodes: {
        shapeProperties: { borderRadius: 10 },
        margin: 24,
        font: {
          size: 16,
          face: 'Inter, "Segoe UI", sans-serif',
          color: '#0f172a',
          bold: { size: 18, color: '#0f172a' }
        },
        borderWidth: 0,
        shadow: { enabled: true, size: 12, x: 0, y: 6, color: 'rgba(15, 23, 42, 0.18)' }
      },
      groups: {
        component: {
          color: {
            background: palette.componentBg,
            border: palette.componentBorder,
            highlight: { background: palette.componentHighlight, border: palette.componentHighlight },
            hover: { background: palette.componentHighlight, border: palette.componentHighlight }
          },
          font: { color: '#0f172a', bold: { color: '#0f172a', size: 17 } }
        },
        subcomponent: {
          color: {
            background: palette.subcomponentBg,
            border: palette.subcomponentBorder,
            highlight: { background: palette.subcomponentHighlight, border: palette.subcomponentHighlight },
            hover: { background: palette.subcomponentHighlight, border: palette.subcomponentHighlight }
          },
          font: { color: '#0f172a', bold: { color: '#0f172a', size: 15 } }
        },
        port_out: {
          shape: 'dot',
          color: {
            background: palette.portOut,
            border: '#0b5675',
            highlight: { background: '#38bdf8', border: '#0b5675' },
            hover: { background: '#38bdf8', border: '#0b5675' }
          },
          size: 12,
          borderWidth: 1.5
        },
        port_in: {
          shape: 'dot',
          color: {
            background: palette.portIn,
            border: '#c2410c',
            highlight: { background: '#fb923c', border: '#c2410c' },
            hover: { background: '#fb923c', border: '#c2410c' }
          },
          size: 12,
          borderWidth: 1.5
        },
        port_unknown: {
          shape: 'dot',
          color: {
            background: palette.portUnknown,
            border: '#64748b',
            highlight: { background: '#94a3b8', border: '#475569' },
            hover: { background: '#94a3b8', border: '#475569' }
          },
          size: 12,
          borderWidth: 1.5
        }
      },
      edges: {
        arrows: { to: { enabled: true, type: 'triangle', scaleFactor: 0.82 } },
        color: { color: palette.connectorEdge, highlight: palette.connectorHighlight },
        width: 2.6,
        smooth: false,
        shadow: { enabled: true, size: 6, x: 0, y: 2, color: 'rgba(15, 23, 42, 0.18)' },
        font: {
          size: 12,
          face: 'Inter, "Segoe UI", sans-serif',
          color: '#0f172a',
          background: palette.connectorLabelBg,
          strokeWidth: 0,
          vadjust: -4
        }
      },
      physics: {
        enabled: false
      },
      interaction: {
        dragNodes: true,
        dragView: true,
        zoomView: true,
        hover: true,
        tooltipDelay: 120,
        hoverConnectedEdges: true,
        multiselect: true,
        selectable: true,
        navigationButtons: true,
        keyboard: { enabled: true, bindToWindow: false }
      },
      manipulation: {
        enabled: false
      }
    };

    const network = new Network(container, data, options);

    Array.from(container.querySelectorAll('.flow-overlay')).forEach(el => el.remove());
    const overlay = document.createElement('div');
    overlay.className = 'flow-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    container.appendChild(overlay);
    const flowAnimator = new FlowAnimator(network, overlay);


    // Animation support: highlight nodes/edges based on trace events
    const baseNodeStyles = new Map(nodes.map(n => [n.id, { color: n.color, size: n.size, borderWidth: n.borderWidth, shadow: n.shadow }]));
    const baseEdgeStyles = new Map(edges.map(e => [e.id || `${e.from}->${e.to}`, { color: e.color, width: e.width }]));
    let activeNodes = new Set();
    let activeEdges = new Set();

    const nodeDataset = network.body?.data?.nodes;
    const edgeDataset = network.body?.data?.edges;

    const resolvePortNode = (path) => {
      if (!path) return null;
      const trimmed = path.trim();
      const mapHit = portPathMap.get(trimmed) || portPathMap.get(trimmed.split('.').slice(-2).join('.')) || portPathMap.get(trimmed.split('.').slice(-1)[0]);
      if (mapHit && nodeDataset?.get(mapHit[0])) return mapHit[0];
      const candidates = [trimmed, trimmed.substring(trimmed.lastIndexOf('.') + 1)];
      for (const cand of candidates) {
        if (nodeDataset?.get(cand)) return cand;
      }
      return null;
    };

    const resolveComponentNode = (path) => {
      if (!path) return null;
      if (componentPathMap.get(path)?.[0]) return componentPathMap.get(path)[0];
      const trimmed = path.substring(path.lastIndexOf('.') + 1);
      if (componentPathMap.get(trimmed)?.[0]) return componentPathMap.get(trimmed)[0];
      return nodeDataset?.get(path) ? path : null;
    };

    const resetHighlights = () => {
      if (nodeDataset && activeNodes.size) {
        const updates = [];
        activeNodes.forEach(id => {
          const base = baseNodeStyles.get(id);
          if (!base) return;
          updates.push({ id, color: base.color, size: base.size, borderWidth: base.borderWidth, shadow: base.shadow });
        });
        if (updates.length) nodeDataset.update(updates);
      }
      if (edgeDataset && activeEdges.size) {
        const updates = [];
        activeEdges.forEach(id => {
          const base = baseEdgeStyles.get(id);
          if (!base) return;
          updates.push({ id, color: base.color, width: base.width });
        });
        if (updates.length) edgeDataset.update(updates);
      }
      activeNodes = new Set();
      activeEdges = new Set();
    };

    const glowNodes = (ids = []) => {
      if (!nodeDataset) return;
      const updates = [];
      ids.filter(Boolean).forEach(id => {
        const base = baseNodeStyles.get(id);
        if (!base) return;
        updates.push({
          id,
          color: { background: '#facc15', border: '#ca8a04' },
          shadow: { enabled: true, size: 18, color: 'rgba(250,204,21,0.45)' },
          size: base.size ? base.size * 1.1 : undefined,
          borderWidth: (base.borderWidth || 1) + 2
        });
        activeNodes.add(id);
      });
      if (updates.length) nodeDataset.update(updates);
    };

    const glowEdge = (fromId, toId) => {
      if (!edgeDataset) return;
      const key = `${fromId}->${toId}`;
      const ids = edgeLookupMap.get(key) || [];
      const updates = [];
      ids.forEach(eid => {
        const base = baseEdgeStyles.get(eid);
        updates.push({
          id: eid,
          color: { color: '#f97316', highlight: '#facc15' },
          width: (base?.width || 2) + 1
        });
        activeEdges.add(eid);
      });
      if (updates.length) edgeDataset.update(updates);
    };

    const highlightEvent = (event) => {
      resetHighlights();
      if (!event) {
        flowAnimator.hideAll();
        return 'No event';
      }
      const data = event.data || {};
      const flowId = event.flowId;
      let message = event.type;
      let moved = false;

      switch (event.type) {
        case 'PARAM_SET': {
          const portId = resolvePortNode(`${data.component}.${data.port}`);
          const componentId = resolveComponentNode(data.component);
          glowNodes([portId, componentId]);
          moved = flowAnimator.moveToNode(flowId, portId, data.value);
          message = `Set ${data.component}.${data.port} = ${data.value}`;
          break;
        }
        case 'PORT_SEND':
        case 'PORT_RECEIVE': {
          const pid = resolvePortNode(data.portPath);
          const compId = pid ? pid.split('.').slice(0, -1).join('.') : null;
          glowNodes([pid, compId]);
          moved = flowAnimator.moveToNode(flowId, pid, data.value);
          message = `${event.type.replace('_', ' ')} ${data.portPath}${data.value !== undefined ? ` = ${data.value}` : ''}`;
          break;
        }
        case 'CONNECTOR_TRIGGERED': {
          const fromId = resolvePortNode(data.from);
          const toId = resolvePortNode(data.to);
          glowNodes([fromId, toId]);
          if (fromId && toId) glowEdge(fromId, toId);
          moved = flowAnimator.animate(flowId, fromId, toId, data.activityName || data.connectorName || '');
          message = `Connector ${data.connectorName || ''}: ${data.from} → ${data.to}`;
          break;
        }
        case 'CONNECTOR_DIRECT_TRANSFER': {
          const fromId = resolvePortNode(data.from || '');
          const toId = resolvePortNode(data.to || '');
          glowNodes([fromId, toId]);
          if (fromId && toId) glowEdge(fromId, toId);
          moved = flowAnimator.animate(flowId, fromId, toId, data.value);
          message = `Direct transfer ${data.connectorName || ''}`;
          break;
        }
        case 'ACTIVITY_WRITE_OUTPUT': {
          const targetId = resolvePortNode(data.targetPort);
          glowNodes([targetId]);
          moved = flowAnimator.moveToNode(flowId, targetId, data.value);
          message = `Activity ${data.activityName || ''} → ${data.targetPort}`;
          break;
        }
        default: {
          if (data.component) {
            glowNodes([resolveComponentNode(data.component)]);
            message = `${event.type} ${data.component}`;
          }
          break;
        }
      }

      if (moved) {
        flowAnimator.deemphasize();
        flowAnimator.focus(flowId);
      }

      return message;
    };

    const pinPortsToComponents = () => {
      if (!componentPortMap || !network?.body?.data?.nodes) return;
      const updates = [];
      const nodesDataset = network.body.data.nodes;

      Object.entries(componentPortMap).forEach(([componentId, groups]) => {
        const box = network.getBoundingBox(componentId);
        if (!box || !isFinite(box.top) || !isFinite(box.bottom)) return;

        const height = Math.max(box.bottom - box.top, 60);
        const width = Math.max(box.right - box.left, 120);
        const leftX = box.left - 12;
        const rightX = box.right + 12;
        const topY = box.top;
        const bottomY = box.bottom;

        const inPorts = Array.isArray(groups?.in) ? groups.in : [];
        const outPorts = Array.isArray(groups?.out) ? groups.out : [];
        const otherPorts = Array.isArray(groups?.other) ? groups.other : [];

        const inStep = height / Math.max(inPorts.length + 1, 2);
        inPorts.forEach((port, index) => {
          if (!nodesDataset.get(port.id)) return;
          const y = topY + inStep * (index + 1);
          updates.push({ id: port.id, x: leftX, y, fixed: { x: true, y: true } });
        });

        const outStep = height / Math.max(outPorts.length + 1, 2);
        outPorts.forEach((port, index) => {
          if (!nodesDataset.get(port.id)) return;
          const y = topY + outStep * (index + 1);
          updates.push({ id: port.id, x: rightX, y, fixed: { x: true, y: true } });
        });

        const otherStep = width / Math.max(otherPorts.length + 1, 2);
        otherPorts.forEach((port, index) => {
          if (!nodesDataset.get(port.id)) return;
          const x = box.left + otherStep * (index + 1);
          const y = bottomY + 12;
          updates.push({ id: port.id, x, y, fixed: { x: true, y: true } });
        });
      });

      if (updates.length) {
        nodesDataset.update(updates);
        network.redraw();
      }
      flowAnimator.refresh();
    };

    network.once('stabilized', () => {
      requestAnimationFrame(() => {
        pinPortsToComponents();
        requestAnimationFrame(() => pinPortsToComponents());
      });
    });

    let pinQueued = false;
    const schedulePin = () => {
      if (pinQueued) return;
      pinQueued = true;
      requestAnimationFrame(() => {
        pinQueued = false;
        pinPortsToComponents();
      });
    };

    const releaseComponentsForDrag = () => {
      const updates = [];
      const nodesDataset = network.body.data.nodes;
      componentNodeIds.forEach(id => {
        const node = nodesDataset.get(id);
        if (!node) return;
        updates.push({ id, fixed: false });
      });
      if (updates.length) {
        nodesDataset.update(updates);
      }
    };

    network.once('afterDrawing', schedulePin);
    network.on('dragStart', schedulePin);
    network.on('dragging', schedulePin);
    network.on('dragEnd', schedulePin);
    network.on('zoom', schedulePin);
    network.on('resize', schedulePin);

    schedulePin();
    requestAnimationFrame(releaseComponentsForDrag);

    const controller = {
      highlightEvent,
      clearHighlights: () => {
        resetHighlights();
        flowAnimator.hideAll();
      }
    };

    console.log('✅ Visualization rendered with', nodes.length, 'nodes and', edges.length, 'edges');
    if (logElement) logElement.textContent += `[INFO] Visualization rendered with ${nodes.length} nodes and ${edges.length} edges\n`;
    return controller;
  } catch (error) {
    console.error('Error while rendering visualization:', error);
    if (logElement) logElement.textContent += `[ERROR] Failed to render visualization: ${error.message}\n`;
    return null;
  }
}

// Export for use in app.js
export { renderVisualization };

/**
 * SimulationLogger for SysADL
 * 
 * Detailed architectural logging system that tracks data flow through
 * SysADL components, ports, activities, actions, and executables.
 * 
 * Features:
 * - Hierarchical execution trace
 * - Parallel flow tracking
 * - Real-time console output
 * - Component/Activity/Action/Executable instrumentation
 * - Pin and Delegate tracking
 */

console.log('📦 SimulationLogger.js loading...');

class SimulationLogger {
  constructor() {
    this.enabled = false;
    this.events = [];           // Array de eventos [{timestamp, flowId, type, data}]
    this.flows = new Map();     // flowId -> {origin, startTime, events}
    this.startTime = null;
    this.flowCounter = 0;
  }

  // ===== Controle =====

  enable() {
    this.enabled = true;
    this.startTime = Date.now();
  }

  disable() {
    this.enabled = false;
  }

  clear() {
    this.events = [];
    this.flows.clear();
    this.flowCounter = 0;
  }

  // ===== Gerenciamento de Fluxos =====

  createFlow(origin) {
    const flowId = `F${++this.flowCounter}`;
    this.flows.set(flowId, {
      origin,
      startTime: Date.now(),
      events: []
    });
    return flowId;
  }

  mergeFlows(flowIds) {
    if (Array.isArray(flowIds)) {
      return flowIds.filter(f => f && f !== '--').join(',');
    }
    return flowIds;
  }

  // ===== Core Logging =====

  logEvent(type, data, flowId = '--') {
    if (!this.enabled) return;

    const event = {
      timestamp: Date.now() - this.startTime,
      flowId,
      type,
      data
    };

    this.events.push(event);

    // Associar ao(s) fluxo(s)
    const flows = typeof flowId === 'string' ? flowId.split(',') : [flowId];
    flows.forEach(fid => {
      if (fid && fid !== '--' && this.flows.has(fid)) {
        this.flows.get(fid).events.push(event);
      }
    });
  }

  // ===== Métodos de Logging Específicos =====

  logParamSet(component, port, value, flowId) {
    this.logEvent('PARAM_SET', { component, port, value }, flowId);
  }

  logPortSend(portPath, portType, direction, value, flowId) {
    this.logEvent('PORT_SEND', { portPath, portType, direction, value }, flowId);
  }

  logPortReceive(portPath, portType, direction, value, flowId, sourceConnector = null) {
    this.logEvent('PORT_RECEIVE', {
      portPath, portType, direction, value, sourceConnector
    }, flowId);
  }

  logConnectorTriggered(connectorName, connectorClass, from, to, hasActivity, activityName, flowId) {
    this.logEvent('CONNECTOR_TRIGGERED', {
      connectorName, connectorClass, from, to, hasActivity, activityName
    }, flowId);
  }

  logConnectorDirectTransfer(connectorName, value, flowId) {
    this.logEvent('CONNECTOR_DIRECT_TRANSFER', { connectorName, value }, flowId);
  }

  logActivityStart(activityName, activityClass, owner, ownerType, trigger, flowId) {
    this.logEvent('ACTIVITY_START', {
      activityName, activityClass, owner, ownerType, trigger
    }, flowId);
  }

  logActivityInputPins(activityName, pins, flowId, owner = null, ownerType = null) {
    // pins = [{name, source, value, originalFlow}]
    this.logEvent('ACTIVITY_INPUT_PINS', { activityName, pins, owner, ownerType }, flowId);
  }

  logActivityDelegates(activityName, delegates, flowId, owner = null, ownerType = null) {
    // delegates = [{from, to}]
    this.logEvent('ACTIVITY_DELEGATES', { activityName, delegates, owner, ownerType }, flowId);
  }

  logActivityWriteOutput(activityName, outputPin, targetPort, value, flowId) {
    this.logEvent('ACTIVITY_WRITE_OUTPUT', {
      activityName, outputPin, targetPort, value
    }, flowId);
  }

  logActivityEnd(activityName, status, duration, actionsExecuted, flowId, owner = null, ownerType = null) {
    this.logEvent('ACTIVITY_END', {
      activityName, status, duration, actionsExecuted, owner, ownerType
    }, flowId);
  }

  logActionStart(actionName, actionClass, parentActivity, inParams, outParams, flowId) {
    this.logEvent('ACTION_START', {
      actionName, actionClass, parentActivity, inParams, outParams
    }, flowId);
  }

  logActionInputParams(actionName, params, flowId) {
    // params = [{name, source, value}]
    this.logEvent('ACTION_INPUT_PARAMS', { actionName, params }, flowId);
  }

  logActionDelegates(actionName, delegates, flowId) {
    this.logEvent('ACTION_DELEGATES', { actionName, delegates }, flowId);
  }

  logActionOutput(actionName, result, delegateTo, flowId) {
    this.logEvent('ACTION_OUTPUT', { actionName, result, delegateTo }, flowId);
  }

  logActionEnd(actionName, status, duration, flowId) {
    this.logEvent('ACTION_END', { actionName, status, duration }, flowId);
  }

  logConstraintEvaluation(constraintName, constraintClass, equation, inputVars, result, flowId) {
    this.logEvent('CONSTRAINT_EVALUATION', {
      constraintName, constraintClass, equation, inputVars, result
    }, flowId);
  }

  logExecutableCall(executableName, executableClass, signature, body, flowId) {
    this.logEvent('EXECUTABLE_CALL', {
      executableName, executableClass, signature, body
    }, flowId);
  }

  logExecutableInput(executableName, params, flowId) {
    // params = [{name, type, value}]
    this.logEvent('EXECUTABLE_INPUT', { executableName, params }, flowId);
  }

  logExecutableExecution(executableName, code, calculation, result, flowId) {
    this.logEvent('EXECUTABLE_EXECUTION', {
      executableName, code, calculation, result
    }, flowId);
  }

  logExecutableOutput(executableName, type, value, flowId) {
    this.logEvent('EXECUTABLE_OUTPUT', { executableName, type, value }, flowId);
  }

  logSyncCheck(component, componentClass, activityName, triggerPolicy, flowId) {
    this.logEvent('SYNC_CHECK', {
      component, componentClass, activityName, triggerPolicy
    }, flowId);
  }

  logInputPortsStatus(component, portsStatus, flowId) {
    // portsStatus = [{name, status, value, flow, receivedAt}]
    this.logEvent('INPUT_PORTS_STATUS', { component, portsStatus }, flowId);
  }

  logSyncDecision(component, decision, reason, missingPorts, mergedFlows, flowId) {
    this.logEvent('SYNC_DECISION', {
      component, decision, reason, missingPorts, mergedFlows
    }, flowId);
  }

  logComponentInstantiation(path, componentClass, props, flowId) {
    this.logEvent('COMPONENT_INSTANTIATION', { path, componentClass, props }, flowId);
  }

  logPortInstantiation(path, portClass, direction, flowId) {
    this.logEvent('PORT_INSTANTIATION', { path, portClass, direction }, flowId);
  }

  logConnectionEstablished(from, to, connectorName, flowId) {
    this.logEvent('CONNECTION_ESTABLISHED', { from, to, connectorName }, flowId);
  }

  logComponentNoActivity(component, reason, flowId) {
    this.logEvent('COMPONENT_NO_ACTIVITY', { component, reason }, flowId);
  }

  // ===== Formatação e Impressão =====

  // Retorna trace formatado como string
  getFormattedTrace() {
    let output = '';

    this.events.forEach(event => {
      output += this.formatEvent(event);
      output += '\n';
    });

    output += '\n' + '='.repeat(80) + '\n';
    output += this.getFormattedSummary();

    return output;
  }

  formatEvent(event) {
    const time = `t=${event.timestamp}ms`;
    const flow = `[${event.flowId}]`;
    const type = event.type.replace(/_/g, ' ');

    let output = `${time.padEnd(10)} ${flow.padEnd(8)} ${type}\n`;
    output += this.formatEventData(event.type, event.data);

    return output;
  }

  formatEventData(type, data) {
    const indent = '       ';
    let output = '';

    switch (type) {
      case 'PARAM_SET':
        output += `${indent}Component: ${data.component}\n`;
        output += `${indent}Port: ${data.port}\n`;
        output += `${indent}Value: ${data.value}\n`;
        break;

      case 'PORT_SEND':
        output += `${indent}Port: ${data.portPath}\n`;
        output += `${indent}Direction: ${data.direction}\n`;
        output += `${indent}Type: ${data.portType}\n`;
        output += `${indent}Value: ${data.value}\n`;
        break;

      case 'PORT_RECEIVE':
        output += `${indent}Port: ${data.portPath}\n`;
        output += `${indent}Direction: ${data.direction}\n`;
        output += `${indent}Type: ${data.portType}\n`;
        output += `${indent}Value: ${data.value}\n`;
        break;

      case 'COMPONENT_INSTANTIATION':
        output += `${indent}Component: ${data.path}\n`;
        output += `${indent}Class: ${data.componentClass}\n`;
        if (data.props && Object.keys(data.props).length > 0) {
          output += `${indent}Props: ${Object.keys(data.props).join(', ')}\n`;
        }
        break;

      case 'PORT_INSTANTIATION':
        output += `${indent}Port: ${data.path}\n`;
        output += `${indent}Class: ${data.portClass}\n`;
        output += `${indent}Direction: ${data.direction}\n`;
        break;

      case 'CONNECTION_ESTABLISHED':
        output += `${indent}From: ${data.from}\n`;
        output += `${indent}To: ${data.to}\n`;
        output += `${indent}Connector: ${data.connectorName}\n`;
        break;

      case 'COMPONENT_NO_ACTIVITY':
        output += `${indent}Component: ${data.component}\n`;
        output += `${indent}Reason: ${data.reason}\n`;
        output += `${indent}Action: Value stored in port\n`;
        break;

      default:
        output += `${indent}Data: ${JSON.stringify(data, null, 2).split('\n').join('\n' + indent)}\n`;
    }

    return output;
  }

  getFormattedSummary() {
    let output = 'SIMULATION SUMMARY\n';
    output += '='.repeat(80) + '\n';

    const lastEvent = this.events[this.events.length - 1];
    const duration = lastEvent ? lastEvent.timestamp : 0;

    output += `Duration: ${duration}ms\n`;
    output += `Total Flows: ${this.flows.size}\n`;
    output += `Total Events: ${this.events.length}\n`;

    // Contar por tipo
    const byType = {};
    this.events.forEach(e => {
      byType[e.type] = (byType[e.type] || 0) + 1;
    });

    // Estatísticas específicas
    const componentsCreated = byType['COMPONENT_INSTANTIATION'] || 0;
    const portsCreated = byType['PORT_INSTANTIATION'] || 0;
    const connections = byType['CONNECTION_ESTABLISHED'] || 0;
    const activitiesExecuted = byType['ACTIVITY_START'] || 0;
    const actionsExecuted = byType['ACTION_START'] || 0;
    const executablesCalled = byType['EXECUTABLE_CALL'] || 0;
    const constraintsEvaluated = byType['CONSTRAINT_EVALUATION'] || 0;

    output += `Components Instantiated: ${componentsCreated}\n`;
    output += `Ports Created: ${portsCreated}\n`;
    output += `Connectors: ${connections}\n`;
    output += `Activities Executed: ${activitiesExecuted}\n`;
    output += `Actions Executed: ${actionsExecuted}\n`;
    output += `Executables Called: ${executablesCalled}\n`;
    output += `Constraints Evaluated: ${constraintsEvaluated}\n`;

    // Final port values
    const finalValues = {};
    this.events.forEach(e => {
      if (e.type === 'PORT_RECEIVE' || e.type === 'PORT_SEND') {
        finalValues[e.data.portPath] = e.data.value;
      }
    });

    if (Object.keys(finalValues).length > 0) {
      output += '\nFinal Port Values:\n';
      Object.entries(finalValues).forEach(([port, value]) => {
        output += `  ${port} = ${value}\n`;
      });
    }

    return output;
  }

  print() {
    console.log('\n[EXECUTION TRACE]');
    console.log('='.repeat(80));
    console.log();

    this.events.forEach(event => {
      this.printEvent(event);
    });

    console.log('\n' + '='.repeat(80));
    this.printSummary();
  }

  printEvent(event) {
    const time = `t=${event.timestamp}ms`;
    const flow = `[${event.flowId}]`;
    const type = event.type.replace(/_/g, ' ');

    console.log(`${time.padEnd(10)} ${flow.padEnd(8)} ${type}`);
    this.printEventData(event.type, event.data);
    console.log(); // Linha em branco
  }

  printEventData(type, data) {
    const indent = '       ';

    switch (type) {
      case 'PARAM_SET':
        console.log(`${indent}Component: ${data.component}`);
        console.log(`${indent}Port: ${data.port}`);
        console.log(`${indent}Value: ${data.value}`);
        break;

      case 'PORT_SEND':
        console.log(`${indent}Port: ${data.portPath}`);
        console.log(`${indent}Direction: ${data.direction}`);
        console.log(`${indent}Type: ${data.portType}`);
        console.log(`${indent}Value: ${data.value}`);
        break;

      case 'PORT_RECEIVE':
        console.log(`${indent}Port: ${data.portPath}`);
        console.log(`${indent}Direction: ${data.direction}`);
        console.log(`${indent}Type: ${data.portType}`);
        console.log(`${indent}Value: ${data.value}`);
        break;

      case 'CONNECTOR_TRIGGERED':
        console.log(`${indent}Connector: ${data.connectorName}`);
        console.log(`${indent}Class: ${data.connectorClass}`);
        console.log(`${indent}From: ${data.from}`);
        console.log(`${indent}To: ${data.to}`);
        console.log(`${indent}Has Activity: ${data.hasActivity ? `Yes (${data.activityName})` : 'No'}`);
        break;

      case 'CONNECTOR_DIRECT_TRANSFER':
        console.log(`${indent}Connector: ${data.connectorName}`);
        console.log(`${indent}No activity to execute`);
        console.log(`${indent}Direct propagation: ${data.value}`);
        break;

      case 'ACTIVITY_START':
        console.log(`${indent}Activity: ${data.activityName}`);
        console.log(`${indent}Class: ${data.activityClass}`);
        console.log(`${indent}Owner: ${data.owner} (${data.ownerType})`);
        console.log(`${indent}Trigger: ${data.trigger}`);
        break;

      case 'ACTIVITY_INPUT_PINS':
        console.log(`${indent}Activity: ${data.activityName}`);
        data.pins.forEach(pin => {
          console.log(`${indent}Pin: ${pin.name}`);
          console.log(`${indent}  Source: ${pin.source}`);
          console.log(`${indent}  Value: ${pin.value}`);
          if (pin.originalFlow) {
            console.log(`${indent}  Original Flow: ${pin.originalFlow}`);
          }
        });
        break;

      case 'ACTIVITY_DELEGATES':
        console.log(`${indent}Activity: ${data.activityName}`);
        data.delegates.forEach(d => {
          console.log(`${indent}Delegate: ${d.from} (activity) -> ${d.to} (action)`);
        });
        break;

      case 'ACTIVITY_WRITE_OUTPUT':
        console.log(`${indent}Activity: ${data.activityName}`);
        console.log(`${indent}Output Pin: ${data.outputPin}`);
        console.log(`${indent}Target Port: ${data.targetPort}`);
        console.log(`${indent}Value: ${data.value}`);
        break;

      case 'ACTIVITY_END':
        console.log(`${indent}Activity: ${data.activityName}`);
        console.log(`${indent}Status: ${data.status}`);
        console.log(`${indent}Duration: ${data.duration}ms`);
        if (data.actionsExecuted !== undefined) {
          console.log(`${indent}Total Actions Executed: ${data.actionsExecuted}`);
        }
        break;

      case 'ACTION_START':
        console.log(`${indent}Action: ${data.actionName}`);
        console.log(`${indent}Class: ${data.actionClass}`);
        console.log(`${indent}Parent Activity: ${data.parentActivity}`);
        console.log(`${indent}InParams: ${data.inParams ? data.inParams.map(p => p.name || p).join(', ') : '(none)'}`);
        console.log(`${indent}OutParams: ${data.outParams ? data.outParams.map(p => p.name || p).join(', ') : '(none)'}`);
        break;

      case 'ACTION_INPUT_PARAMS':
        console.log(`${indent}Action: ${data.actionName}`);
        data.params.forEach(param => {
          console.log(`${indent}Param: ${param.name}`);
          console.log(`${indent}  Source: ${param.source}`);
          console.log(`${indent}  Value: ${param.value}`);
        });
        break;

      case 'ACTION_DELEGATES':
        console.log(`${indent}Action: ${data.actionName}`);
        data.delegates.forEach(d => {
          console.log(`${indent}Delegate: ${d.from} (action) -> ${d.to} (executable)`);
        });
        break;

      case 'ACTION_OUTPUT':
        console.log(`${indent}Action: ${data.actionName}`);
        console.log(`${indent}Result: ${data.result}`);
        console.log(`${indent}Delegate to: ${data.delegateTo}`);
        break;

      case 'ACTION_END':
        console.log(`${indent}Action: ${data.actionName}`);
        console.log(`${indent}Status: ${data.status}`);
        console.log(`${indent}Duration: ${data.duration}ms`);
        break;

      case 'CONSTRAINT_EVALUATION':
        console.log(`${indent}Constraint: ${data.constraintName}`);
        console.log(`${indent}Class: ${data.constraintClass}`);
        console.log(`${indent}Equation: ${data.equation}`);
        console.log(`${indent}Variables: ${JSON.stringify(data.inputVars)}`);
        console.log(`${indent}Result: ${data.result}`);
        break;

      case 'EXECUTABLE_CALL':
        console.log(`${indent}Executable: ${data.executableName}`);
        console.log(`${indent}Class: ${data.executableClass}`);
        if (data.signature) {
          console.log(`${indent}Signature: ${data.signature}`);
        }
        if (data.body) {
          console.log(`${indent}Body: ${data.body.substring(0, 80)}${data.body.length > 80 ? '...' : ''}`);
        }
        break;

      case 'EXECUTABLE_INPUT':
        console.log(`${indent}Executable: ${data.executableName}`);
        data.params.forEach(param => {
          console.log(`${indent}Parameter: ${param.name}`);
          console.log(`${indent}  Type: ${param.type}`);
          console.log(`${indent}  Value: ${param.value}`);
        });
        break;

      case 'EXECUTABLE_EXECUTION':
        console.log(`${indent}Executable: ${data.executableName}`);
        if (data.code) {
          console.log(`${indent}Code: ${data.code}`);
        }
        console.log(`${indent}Calculation: ${data.calculation}`);
        console.log(`${indent}Result: ${data.result}`);
        break;

      case 'EXECUTABLE_OUTPUT':
        console.log(`${indent}Executable: ${data.executableName}`);
        console.log(`${indent}Type: ${data.type}`);
        console.log(`${indent}Value: ${data.value}`);
        break;

      case 'SYNC_CHECK':
        console.log(`${indent}Component: ${data.component}`);
        console.log(`${indent}Class: ${data.componentClass}`);
        console.log(`${indent}Activity: ${data.activityName || '(none defined)'}`);
        console.log(`${indent}Trigger Policy: ${data.triggerPolicy}`);
        break;

      case 'INPUT_PORTS_STATUS':
        console.log(`${indent}Component: ${data.component}`);
        data.portsStatus.forEach(port => {
          console.log(`${indent}Port: ${port.name}`);
          console.log(`${indent}  Status: ${port.status}`);
          if (port.value !== undefined) {
            console.log(`${indent}  Value: ${port.value}`);
          }
          if (port.flow) {
            console.log(`${indent}  Flow: ${port.flow}`);
          }
          if (port.receivedAt !== undefined) {
            console.log(`${indent}  Received at: t=${port.receivedAt}ms`);
          }
        });
        break;

      case 'SYNC_DECISION':
        console.log(`${indent}Component: ${data.component}`);
        console.log(`${indent}Decision: ${data.decision}`);
        console.log(`${indent}Reason: ${data.reason}`);
        if (data.missingPorts && data.missingPorts.length > 0) {
          console.log(`${indent}Missing: ${data.missingPorts.length} port(s)`);
        }
        if (data.mergedFlows) {
          console.log(`${indent}Merged Flows: [${data.mergedFlows}]`);
        }
        break;

      case 'COMPONENT_INSTANTIATION':
        console.log(`${indent}Component: ${data.path}`);
        console.log(`${indent}Class: ${data.componentClass}`);
        if (data.props && Object.keys(data.props).length > 0) {
          const propKeys = Object.keys(data.props).filter(k => k !== 'sysadlDefinition');
          if (propKeys.length > 0) {
            console.log(`${indent}Props: ${propKeys.join(', ')}`);
          }
        }
        break;

      case 'PORT_INSTANTIATION':
        console.log(`${indent}Port: ${data.path}`);
        console.log(`${indent}Class: ${data.portClass}`);
        console.log(`${indent}Direction: ${data.direction}`);
        break;

      case 'CONNECTION_ESTABLISHED':
        console.log(`${indent}From: ${data.from}`);
        console.log(`${indent}To: ${data.to}`);
        console.log(`${indent}Connector: ${data.connectorName}`);
        break;

      case 'COMPONENT_NO_ACTIVITY':
        console.log(`${indent}Component: ${data.component}`);
        console.log(`${indent}Reason: ${data.reason}`);
        console.log(`${indent}Action: Value stored in port`);
        break;

      default:
        console.log(`${indent}Data: ${JSON.stringify(data, null, 2).split('\n').join('\n' + indent)}`);
    }
  }

  printSummary() {
    console.log('SIMULATION SUMMARY');
    console.log('='.repeat(80));

    const lastEvent = this.events[this.events.length - 1];
    const duration = lastEvent ? lastEvent.timestamp : 0;

    console.log(`Duration: ${duration}ms`);
    console.log(`Total Flows: ${this.flows.size}`);
    console.log(`Total Events: ${this.events.length}`);

    // Contar por tipo
    const byType = {};
    this.events.forEach(e => {
      byType[e.type] = (byType[e.type] || 0) + 1;
    });

    // Estatísticas específicas
    const componentsCreated = byType['COMPONENT_INSTANTIATION'] || 0;
    const portsCreated = byType['PORT_INSTANTIATION'] || 0;
    const connections = byType['CONNECTION_ESTABLISHED'] || 0;
    const activitiesExecuted = byType['ACTIVITY_START'] || 0;
    const actionsExecuted = byType['ACTION_START'] || 0;
    const executablesCalled = byType['EXECUTABLE_CALL'] || 0;
    const constraintsEvaluated = byType['CONSTRAINT_EVALUATION'] || 0;

    console.log(`Components Instantiated: ${componentsCreated}`);
    console.log(`Ports Created: ${portsCreated}`);
    console.log(`Connectors: ${connections}`);
    console.log(`Activities Executed: ${activitiesExecuted}`);
    console.log(`Actions Executed: ${actionsExecuted}`);
    console.log(`Executables Called: ${executablesCalled}`);
    console.log(`Constraints Evaluated: ${constraintsEvaluated}`);

    // Final port values (extrair dos últimos PORT_RECEIVE)
    const finalValues = {};
    this.events.forEach(e => {
      if (e.type === 'PORT_RECEIVE' || e.type === 'PORT_SEND') {
        finalValues[e.data.portPath] = e.data.value;
      }
    });

    if (Object.keys(finalValues).length > 0) {
      console.log('\nFinal Port Values:');
      Object.entries(finalValues).forEach(([port, value]) => {
        console.log(`  ${port} = ${value}`);
      });
    }
  }
}

// UMD Pattern - funciona em Browser E Node.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js
    console.log('📦 SimulationLogger: Exporting for Node.js');
    module.exports = factory();
  } else {
    // Browser
    console.log('📦 SimulationLogger: Exporting for Browser as window.SimulationLogger');
    root.SimulationLogger = factory();
    console.log('📦 SimulationLogger exported! typeof:', typeof root.SimulationLogger);
  }
}(typeof self !== 'undefined' ? self : this, function () {
  console.log('📦 SimulationLogger factory called, returning class');
  return SimulationLogger;
}));

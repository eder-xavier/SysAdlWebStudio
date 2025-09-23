// @ts-nocheck;
// Generated JavaScript code for SysADL Model: Simple;

// Types
const Int = 'any'; // Value type from SysADL.types
const Boolean = 'any'; // Value type from SysADL.types
const String = 'any'; // Value type from SysADL.types
const Void = 'any'; // Value type from SysADL.types
const Real = 'any'; // Value type from SysADL.types;

// Base class for ports
class SysADLPort {
  constructor(name, flowType, direction = 'inout') {
  console.log(`Initializing port ${name} with flowType ${flowType}, direction ${direction}`);;
  this.name = name;
  this.flowType = flowType || 'any';
  this.direction = direction;
  this.value = null;
  this.bindings = [];
  this.onDataReceivedCallback = null;
  }

  addBinding(binding) {
  this.bindings.push(binding);
  console.log(`Binding added to port ${this.name}: ${binding.sourceComponent?.name || 'undefined'}.${binding.sourcePort?.name || 'undefined'} -> ${binding.targetComponent?.name || 'undefined'}.${binding.targetPort?.name || 'undefined'}`);;
  }

  setOnDataReceivedCallback(callback) {
  this.onDataReceivedCallback = callback;
  }

  async send(data) {
  console.log(`Port ${this.name} sending data: ${JSON.stringify(data)}`);;
  if (this.direction !== 'out' && this.direction !== 'inout') {
  console.error(`Cannot send via ${this.name}: invalid direction (${this.direction})`);
  return false;
  }
  if (this.bindings.length === 0) {
  console.warn(`No binding associated with ${this.name}; data not sent`);
  return false;
  }
  this.value = data;
  for (const binding of this.bindings) {
  console.log(`Propagating data ${data} via binding to ${binding.targetPort?.name}`);;
  await binding.connector.transmit(data);
  }
  return true;
  }

  receive(data) {
  console.log(`Port ${this.name} receiving data: ${JSON.stringify(data)}`);;
  if (this.direction !== 'in' && this.direction !== 'inout') {
  console.error(`Cannot receive via ${this.name}: invalid direction (${this.direction})`);
  return false;
  }
  this.value = data;
  if (this.onDataReceivedCallback) {
  this.onDataReceivedCallback(this.name, data);
  } else {
  console.warn(`No onDataReceived callback defined for port ${this.name}`);
  }
  return true;
  }

  getValue() {
  return this.value;
  }
}

// Base Connector Class
class SysADLConnector {
  constructor(name, sourcePort = null, targetPort = null, transformFn = null, constraintFn = null) {
  console.log(`Initializing connector ${name}`);;
  this.name = name;
  this.sourcePort = sourcePort;
  this.targetPort = targetPort;
  this.transformFn = transformFn;
  this.constraintFn = constraintFn;
  this.messageQueue = [];
  this.isProcessing = false;
  }

  setPorts(sourcePort, targetPort) {
  this.sourcePort = sourcePort;
  this.targetPort = targetPort;
  console.log(`Connector ${this.name} configured with sourcePort ${sourcePort?.name || 'undefined'} and targetPort ${targetPort?.name || 'undefined'}`);;
  }

  async transmit(data) {
  console.log(`Connector ${this.name} transmitting data: ${JSON.stringify(data)}`);;
  if (!this.sourcePort || !this.targetPort) {
  console.error(`Error: Connector ${this.name} has no sourcePort or targetPort configured`);
  return;
  }
  let transformedData = this.transformFn ? this.transformFn({ f: data }) : data;
  this.messageQueue.push(transformedData);
  if (this.isProcessing) return;
  this.isProcessing = true;

  while (this.messageQueue.length > 0) {
  const currentData = this.messageQueue.shift();
  console.log(`Connector ${this.name} processing data: ${JSON.stringify(currentData)}`);;
  if (this.constraintFn) {
  try {
  this.constraintFn({ input: data, output: currentData });
  } catch (e) {
  console.error(`Constraint violated in connector ${this.name}: ${e.message}`);
  continue;
  }
  }
  await this.targetPort.receive(currentData);
  }
  this.isProcessing = false;
  }
}

// Connector Classes
class FarToCelCN extends SysADLConnector {
  constructor() {
  super('FarToCelCN', null, null, FarToCelEX, validateFarToCelEQ);
  }
}

class CelToCelCN extends SysADLConnector {
  constructor() {
  super('CelToCelCN', null, null, null, null);
  }
}

// Binding Class
class Binding {
  constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {
  if (!sourceComponent || !sourcePort || !targetComponent || !targetPort || !connector) {
  console.error('Error creating binding: invalid parameters', {
sourceComponent: sourceComponent?.name,
sourcePort: sourcePort?.name,
targetComponent: targetComponent?.name,
targetPort: targetPort?.name,
connector: connector?.name;
});;
  throw new Error('Invalid binding parameters');
  }
  console.log(`Creating binding from ${sourceComponent.name}.${sourcePort.name} to ${targetComponent.name}.${targetPort.name} via connector ${connector.name}`);;
  this.sourceComponent = sourceComponent;
  this.sourcePort = sourcePort;
  this.targetComponent = targetComponent;
  this.targetPort = targetPort;
  this.connector = connector;
  this.sourcePort.addBinding(this);
  this.connector.setPorts(this.sourcePort, this.targetPort);
  }
}

// Base Component Class
class SysADLComponent {
  constructor(name, isBoundary = false) {
  console.log(`Initializing component ${name}, isBoundary: ${isBoundary}`);;
  this.name = name;
  this.isBoundary = isBoundary;
  this.ports = [];
  this.state = {};
  this.activities = [];
  }

  addPort(port) {
  this.ports.push(port);
  port.setOnDataReceivedCallback((portName, data) => this.onDataReceived(portName, data));
  console.log(`Port ${port.name} added to component ${this.name}, flowType: ${port.flowType}`);;
  }

  onDataReceived(portName, data) {
  console.log(`Component ${this.name} received data on port ${portName}: ${JSON.stringify(data)}`);;
  this.state[portName] = data;
  for (const activity of this.activities) {
  console.log(`Triggering activity ${activity.methodName} in component ${this.name}`);;
  this[activity.methodName]();
  }
  }

  async start() {
  console.log(`Starting component ${this.name}`);;
  }
}

class SystemCP extends SysADLComponent {
  constructor() {
  super("SystemCP", false);
  this.subComponents = new Map();
  this.connectors = new Map();
  this.bindings = [];

  // Initialize subcomponents
  this.s1 = new SensorCP('s1', 'temp1');
  this.addSubComponent('s1', this.s1);
  this.s2 = new SensorCP('s2', 'temp2');
  this.addSubComponent('s2', this.s2);
  this.tempMon = new TempMonitorCP();
  this.addSubComponent('tempMon', this.tempMon);
  this.stdOut = new StdOutCP();
  this.addSubComponent('stdOut', this.stdOut);

  // Initialize connectors
  this.addConnector('c1', new FarToCelCN());
  this.addConnector('c2', new FarToCelCN());
  this.addConnector('c3', new CelToCelCN());

  // Configure bindings
  this.configureBindings();

  }

  addSubComponent(name, component) {
  this.subComponents.set(name, component);
  console.log(`SubComponent ${name} added to ${this.name}`);;
  }

  addConnector(name, connector) {
  this.connectors.set(name, connector);
  console.log(`Connector ${name} added to ${this.name}`);;
  }

  addBinding(binding) {
  this.bindings.push(binding);
  console.log(`Binding added: ${binding.sourceComponent.name}.${binding.sourcePort.name} -> ${binding.targetComponent.name}.${binding.targetPort.name} via ${binding.connector.name}`);;
  }

  configureBindings() {
  console.log(`Configuring bindings for SystemCP`);;
  const s1Port0 = this.subComponents.get('s1')?.ports.find(p => p.name === 'temp1');
  const tempMonPort0 = this.subComponents.get('tempMon')?.ports.find(p => p.name === 's1');
  if (!s1Port0 || !tempMonPort0) {
  console.error('Error: One or more ports not found for configuring bindings', {
s1Port0: s1Port0?.name,
tempMonPort0: tempMonPort0?.name;
});;
  return;
  }
  this.addBinding(new Binding(
  this.subComponents.get('s1'),
  s1Port0,
  this.subComponents.get('tempMon'),
  tempMonPort0,
  this.connectors.get('c1')
  ));
  const s2Port1 = this.subComponents.get('s2')?.ports.find(p => p.name === 'temp2');
  const tempMonPort1 = this.subComponents.get('tempMon')?.ports.find(p => p.name === 's2');
  if (!s2Port1 || !tempMonPort1) {
  console.error('Error: One or more ports not found for configuring bindings', {
s2Port1: s2Port1?.name,
tempMonPort1: tempMonPort1?.name;
});;
  return;
  }
  this.addBinding(new Binding(
  this.subComponents.get('s2'),
  s2Port1,
  this.subComponents.get('tempMon'),
  tempMonPort1,
  this.connectors.get('c2')
  ));
  const tempMonPort2 = this.subComponents.get('tempMon')?.ports.find(p => p.name === 'average');
  const stdOutPort2 = this.subComponents.get('stdOut')?.ports.find(p => p.name === 'avg');
  if (!tempMonPort2 || !stdOutPort2) {
  console.error('Error: One or more ports not found for configuring bindings', {
tempMonPort2: tempMonPort2?.name,
stdOutPort2: stdOutPort2?.name;
});;
  return;
  }
  this.addBinding(new Binding(
  this.subComponents.get('tempMon'),
  tempMonPort2,
  this.subComponents.get('stdOut'),
  stdOutPort2,
  this.connectors.get('c3')
  ));
  }

  async start() {
  console.log(`Starting composite component `);;
  await Promise.all(Array.from(this.subComponents.values()).map(c => c.start()));
  }
}

class TempMonitorCP extends SysADLComponent {
  constructor() {
  super("TempMonitorCP", true);
  this.addPort(new SysADLPort('s1', 'Real', 'in'));
  this.state['s1'] = null;
  this.addPort(new SysADLPort('s2', 'Real', 'in'));
  this.state['s2'] = null;
  this.addPort(new SysADLPort('average', 'Real', 'out'));
  this.state['average'] = null;
  this.activities.push({ methodName: 'executeTempMonitorAC' });
  }

  executeTempMonitorAC() {
  console.log(`Executing activity TempMonitorAC in component ${this.name}`);;
  const params = {
  t1: this.state['s1'],
  t2: this.state['s2']
  };
  console.log(`Parameters received: t1=${params.t1}, t2=${params.t2}`);;
  if (params.t1 === null || params.t2 === null) {
  console.warn('Null input values, activity aborted');
  return null;
  }
  const result = CalcAverageEX(params);
  try {
  validateCalcAverageEQ({ t1: params.t1, t2: params.t2, av: result });
  } catch (e) {
  console.error(`Constraint CalcAverageEQ violated: ${e.message}`);
  return null;
  }
  this.state['average'] = result;
  const averagePort = this.ports.find(p => p.name === 'average');
  if (averagePort) {
  console.log(`Sending ${result} via port average`);;
  averagePort.send(result);
  }
  console.log(`Activity TempMonitorAC returning: ${result}`);;
  return result;
  }
}

class SensorCP extends SysADLComponent {
  constructor(name, portName) {
  super(name, true);
  this.addPort(new SysADLPort('portName', 'Real', 'out'));
  this.state['portName'] = null;
  this.activities.push({ methodName: 'sendData' });
  }

  async sendData(dataValue = 77.0) {
  console.log(`Sending simulated data from component ${this.name}: ${dataValue}`);;
  const outPort = this.ports.find(p => p.direction === 'out' || p.direction === 'inout');
  if (outPort) {
  await outPort.send(dataValue);
  } else {
  console.error(`Error: No output port found in ${this.name}`);
  }
  }

}

class StdOutCP extends SysADLComponent {
  constructor() {
  super("StdOutCP", true);
  this.addPort(new SysADLPort('avg', 'Real', 'in'));
  this.state['avg'] = null;
  }

  displayData() {
  for (const port of this.ports) {
  if (port.direction === 'in' && this.state[port.name] !== null) {
  console.log(`Displaying data received in ${this.name} on port ${port.name}: ${JSON.stringify(this.state[port.name])}`);;
  }
  }
  }

}

// Executables
function FarToCelEX(params = {}) {
  console.log(`Executing FarToCelEX with params: ${JSON.stringify(params)}`);;
  const f = params.f || 32.0;
  return 5*(f - 32)/9 ;
}

function CalcAverageEX(params = {}) {
  console.log(`Executing CalcAverageEX with params: ${JSON.stringify(params)}`);;
  const s1 = params.s1 || 0;
  const s2 = params.s2 || 0;
  return (s1 + s2) / 2;
}

// Constraints
function validateFarToCelEQ(params = {}) {
  const f = params.f || 32.0;
  const c = params.c || 0;
  console.log(`Evaluating constraint FarToCelEQ: c === (5*(f - 32)/9)`);;
  const result = c === (5*(f - 32)/9);
  if (!result) {
  throw new Error('Constraint FarToCelEQ violated');
  }
  console.log('Constraint FarToCelEQ passed');
  return result;
}

function validateCalcAverageEQ(params = {}) {
  const t1 = params.t1 || 0;
  const t2 = params.t2 || 0;
  const av = params.av || 0;
  console.log(`Evaluating constraint CalcAverageEQ: av === (t1 + t2)/2`);;
  const result = av === (t1 + t2)/2;
  if (!result) {
  throw new Error('Constraint CalcAverageEQ violated');
  }
  console.log('Constraint CalcAverageEQ passed');
  return result;
}

// Main Function
async function main() {
  console.log('Starting simulation of Simple.sysadl');
  const system = new SystemCP();
  await system.start();
  await system.s1.sendData(77);
  await system.s2.sendData(77);
  console.log('System simulation completed');
}

main();
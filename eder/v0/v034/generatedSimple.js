// @ts-nocheck
// Generated JavaScript code for SysADL Architecture: SysADLModel


// Base Port Class
class SysADLPort {
  constructor(name, flowType, direction = 'inout') {
    this.name = name;
    this.flowType = flowType || 'any';
    this.direction = direction;
    this.value = null;
    this.bindings = [];
    this.onDataReceivedCallback = null;
  }
  addBinding(binding) { this.bindings.push(binding); }
  setOnDataReceivedCallback(callback) { this.onDataReceivedCallback = callback; }
  async send(data) {
    console.log(`Port ${this.name} sending data: ${JSON.stringify(data)}`);
    if (this.direction === 'in') return false;
    this.value = data;
    for (const binding of this.bindings) {
      await binding.connector.transmit(data, this);
    }
    return true;
  }
  async receive(data) {
    console.log(`Port ${this.name} receiving data: ${JSON.stringify(data)}`);
    if (this.direction === 'out') return false;
    this.value = data;
    if (this.onDataReceivedCallback) {
      await this.onDataReceivedCallback(this.name, data);
    }
    return true;
  }
}

// Base Connector Class
class SysADLConnector {
  constructor(name, transformFn = null, constraintFn = null) {
    this.name = name;
    this.transformFn = transformFn;
    this.constraintFn = constraintFn;
  }
  setPorts(sourcePort, targetPort) {
    this.sourcePort = sourcePort;
    this.targetPort = targetPort;
  }
  async transmit(data, sourcePort) {
    console.log(`Connector ${this.name} transmitting data: ${JSON.stringify(data)}`);
    const targetPort = sourcePort.bindings.find(b => b.connector === this)?.targetPort;
    if (!targetPort) {
      console.error(`Connector ${this.name} could not find a target port.`);
      return;
    }

    const inputData = data;
    let transformedData = this.transformFn ? await this.transformFn({ ...this.params, input: inputData }) : inputData;

    if (this.constraintFn) {
      try {
        await this.constraintFn({ ...this.params, input: inputData, output: transformedData });
      } catch (e) {
        console.error(`Constraint violated in connector ${this.name}: ${e.message}`);
        return; // Stop transmission if constraint fails
      }
    }
    await targetPort.receive(transformedData);
  }
}

// Binding Class
class Binding {
  constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {
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
  constructor(name) {
    this.name = name;
    this.ports = new Map();
    this.subComponents = new Map();
    this.connectors = new Map();
    this.bindings = [];
  }
  addPort(port) { this.ports.set(port.name, port); }
  addBinding(binding) { this.bindings.push(binding); }
  async start() {
    console.log(`Starting component ${this.name}`);
    for (const subComp of this.subComponents.values()) {
      if (subComp.start) await subComp.start();
    }
  }
}

// Types

// Component Classes
export class SystemCP extends SysADLComponent {
  constructor() {
    super('SystemCP');
    this.addPort(new SysADLPort('temp1', 'Real', 'in'));
    this.subComponents.set('s1', new SensorCP());
    this.subComponents.set('s2', new SensorCP());
    this.subComponents.set('tempMon', new TempMonitorCP());
    this.subComponents.set('stdOut', new StdOutCP());
    this.connectors.set('c1', new FarToCelCN(null, null));
    this.connectors.set('c2', new FarToCelCN(null, null));
    this.connectors.set('c3', new CelToCelCN());
    this.configureBindings();
  }

  configureBindings() {
    console.log('Configuring bindings for SystemCP');
    { // Binding Block
      const sourceComp = this.subComponents.get('s1');
      const targetComp = this.subComponents.get('tempMon');
      const sourcePort = sourceComp.ports.get('temp1');
      const targetPort = targetComp.ports.get('s1');
      const connector = this.connectors.get('c1');
      if (sourceComp && targetComp && sourcePort && targetPort && connector) {
        this.addBinding(new Binding(sourceComp, sourcePort, targetComp, targetPort, connector));
      } else {
        console.error('Failed to create binding:', { "connector": "c1", "source": "s1.temp1", "target": "tempMon.s1" });
      }
    }
    { // Binding Block
      const sourceComp = this.subComponents.get('s2');
      const targetComp = this.subComponents.get('tempMon');
      const sourcePort = sourceComp.ports.get('temp2');
      const targetPort = targetComp.ports.get('s2');
      const connector = this.connectors.get('c2');
      if (sourceComp && targetComp && sourcePort && targetPort && connector) {
        this.addBinding(new Binding(sourceComp, sourcePort, targetComp, targetPort, connector));
      } else {
        console.error('Failed to create binding:', { "connector": "c2", "source": "s2.temp2", "target": "tempMon.s2" });
      }
    }
    { // Binding Block
      const sourceComp = this.subComponents.get('tempMon');
      const targetComp = this.subComponents.get('stdOut');
      const sourcePort = sourceComp.ports.get('average');
      const targetPort = targetComp.ports.get('avg');
      const connector = this.connectors.get('c3');
      if (sourceComp && targetComp && sourcePort && targetPort && connector) {
        this.addBinding(new Binding(sourceComp, sourcePort, targetComp, targetPort, connector));
      } else {
        console.error('Failed to create binding:', { "connector": "c3", "source": "tempMon.average", "target": "stdOut.avg" });
      }
    }
  }
}

export class TempMonitorCP extends SysADLComponent {
  constructor() {
    super('TempMonitorCP');
    this.addPort(new SysADLPort('s1', 'Real', 'in'));
    this.addPort(new SysADLPort('s2', 'Real', 'in'));
    this.addPort(new SysADLPort('average', 'Real', 'out'));
  }
}

export class SensorCP extends SysADLComponent {
  constructor() {
    super('SensorCP');
    this.addPort(new SysADLPort('current', 'Real', 'in'));
  }
}

export class StdOutCP extends SysADLComponent {
  constructor() {
    super('StdOutCP');
    this.addPort(new SysADLPort('c3', 'Real', 'in'));
  }
}

// Connector Classes
export class FarToCelCN extends SysADLConnector {
  constructor(transformFn = null, constraintFn = null) {
    super('FarToCelCN', transformFn, constraintFn);
  }
}

export class CelToCelCN extends SysADLConnector {
  constructor(transformFn = null, constraintFn = null) {
    super('CelToCelCN', transformFn, constraintFn);
  }
}

// Executables
export async function FarToCelEX(params = {}) {
  console.log(`Executing FarToCelEX with params: ${JSON.stringify(params)}`);
  const f = params.f !== undefined ? params.f : 0.0;
  return 5 * (f - 32) / 9;
}

export async function CalcAverageEX(params = {}) {
  console.log(`Executing CalcAverageEX with params: ${JSON.stringify(params)}`);
  const temp1 = params.temp1 !== undefined ? params.temp1 : 0.0;
  const temp2 = params.temp2 !== undefined ? params.temp2 : 0.0;
  return (temp1 + temp2) / 2;
}

// Constraints
function FarToCelEQ(f, c) {
  return c === (5 * (f - 32) / 9);
}

export async function validateFarToCelEQ(params = {}) {
  console.log(`Validating constraint FarToCelEQ with params: ${JSON.stringify(params)}`);
  try {
    const f = params.f;
    const c = params.c;
    const result = FarToCelEQ(f, c);
    if (!result) {
      throw new Error('Constraint FarToCelEQ violated with params: ' + JSON.stringify(params));
    }
    console.log('Constraint FarToCelEQ passed');
    return true;
  } catch (e) {
    console.error('Constraint FarToCelEQ error: ' + e.message);
    throw e;
  }
}

function CalcAverageEQ(t1, t2, av) {
  return av === (t1 + t2) / 2;
}

export async function validateCalcAverageEQ(params = {}) {
  console.log(`Validating constraint CalcAverageEQ with params: ${JSON.stringify(params)}`);
  try {
    const t1 = params.t1;
    const t2 = params.t2;
    const av = params.av;
    const result = CalcAverageEQ(t1, t2, av);
    if (!result) {
      throw new Error('Constraint CalcAverageEQ violated with params: ' + JSON.stringify(params));
    }
    console.log('Constraint CalcAverageEQ passed');
    return true;
  } catch (e) {
    console.error('Constraint CalcAverageEQ error: ' + e.message);
    throw e;
  }
}

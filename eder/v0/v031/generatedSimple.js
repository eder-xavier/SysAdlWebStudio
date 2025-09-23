// Architecture Code (save as simple.js)
// @ts-nocheck;
// Generated JavaScript code for SysADL Architecture: Simple;

// Types
export const Real = 'any';
export const Int = 'any';
export const Boolean = 'any';
export const String = 'any';
export const Void = 'any';
export const FahrenheitTemperature = 'any';
export const CelsiusTemperature = 'any';
export const Temperature = 'any';
export const Location = 'any';

// Base Port Class
export class SysADLPort {
  constructor(name, flowType, direction = "inout") {
    console.log(`Initializing port ${name} with flowType ${flowType}, direction ${direction}`);;
    this.name = name;
    this.flowType = flowType || "any";
    this.direction = direction;
    this.value = null;
    this.bindings = [];
    this.onDataReceivedCallback = null;
  }

  addBinding(binding) {
    this.bindings.push(binding);
    console.log(`Binding added to port ${this.name}: ${binding.sourceComponent?.name || "undefined"}.${binding.sourcePort?.name || "undefined"} -> ${binding.targetComponent?.name || "undefined"}.${binding.targetPort?.name || "undefined"}`);;
  }

  setOnDataReceivedCallback(callback) {
    this.onDataReceivedCallback = callback;
  }

  async send(data) {
    console.log(`Port ${this.name} sending data: ${JSON.stringify(data)}`);;
    if (this.direction !== "out" && this.direction !== "inout") {
      console.error(`Cannot send via ${this.name}: invalid direction (${this.direction})`);
      return false;
    }
    if (this.bindings.length === 0) {
      console.warn(`No bindings associated with ${this.name}; data not sent`);
      return false;
    }
    this.value = data;
    for (const binding of this.bindings) {
      console.log(`Propagating data ${data} via binding to ${binding.targetPort?.name}`);;
      await binding.connector.transmit(data);
    }
    return true;
  }

  async receive(data) {
    console.log(`Port ${this.name} receiving data: ${JSON.stringify(data)}`);;
    if (this.direction !== "in" && this.direction !== "inout") {
      console.error(`Cannot receive via ${this.name}: invalid direction (${this.direction})`);
      return false;
    }
    this.value = data;
    if (this.onDataReceivedCallback) {
      await this.onDataReceivedCallback(this.name, data);
    } else {
      console.warn(`No onDataReceivedCallback defined for port ${this.name}`);
    }
    return true;
  }

  getValue() {
    return this.value;
  }
}

// Base Connector Class
export class SysADLConnector {
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
    console.log(`Connector ${this.name} configured with sourcePort ${sourcePort?.name || "undefined"} and targetPort ${targetPort?.name || "undefined"}`);;
  }

  async transmit(data) {
    console.log(`Connector ${this.name} transmitting data: ${JSON.stringify(data)}`);;
    if (!this.sourcePort || !this.targetPort) {
      console.error(`Error: Connector ${this.name} does not have sourcePort or targetPort configured`);
      return;
    }
    let transformedData = this.transformFn ? await this.transformFn({ input: data }) : data;
    this.messageQueue.push(transformedData);
    if (this.isProcessing) return;
    this.isProcessing = true;
    while (this.messageQueue.length > 0) {
      const currentData = this.messageQueue.shift();
      console.log(`Connector ${this.name} processing data: ${JSON.stringify(currentData)}`);;
      if (this.constraintFn) {
        try {
          console.log(`Calling constraint ${this.constraintFn.name} with params: ${JSON.stringify({ input: data, output: currentData })}`);;
          await this.constraintFn({ input: data, output: currentData });
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

// Binding Class
export class Binding {
  constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {
    if (!sourceComponent || !sourcePort || !targetComponent || !targetPort || !connector) {
      console.error("Error creating binding: invalid parameters", {
        sourceComponent: sourceComponent?.name,
        sourcePort: sourcePort?.name,
        targetComponent: targetComponent?.name,
        targetPort: targetPort?.name,
        connector: connector?.name
      });
      throw new Error("Invalid binding parameters");
    }
    console.log(`Creating binding from ${sourceComponent.name}.${sourcePort.name} to ${targetComponent.name}.${targetPort.name} via ${connector.name}`);;
    this.sourceComponent = sourceComponent;
    this.sourcePort = sourcePort;
    this.targetComponent = targetComponent;
    this.targetPort = targetPort;
    this.connector = connector;
  }
}

// Component Classes
export class SystemCP {
  constructor() {
    console.log('Initializing component SystemCP'); this.name = 'SystemCP'; this.ports = []; this.bindings = [];
    this.ports.push(new SysADLPort('temp1', 'Real', 'in'));
  }

}

export class TempMonitorCP {
  constructor() {
    console.log('Initializing component TempMonitorCP'); this.name = 'TempMonitorCP'; this.ports = []; this.bindings = [];
    this.ports.push(new SysADLPort('s1', 'Real', 'in'));
  }

}

export class SensorCP {
  constructor() {
    console.log('Initializing component SensorCP'); this.name = 'SensorCP'; this.ports = []; this.bindings = [];
    this.ports.push(new SysADLPort('current', 'Real', 'in'));
  }

}

export class StdOutCP {
  constructor() {
    console.log('Initializing component StdOutCP'); this.name = 'StdOutCP'; this.ports = []; this.bindings = [];
    this.ports.push(new SysADLPort('c3', 'Real', 'in'));
  }

}

// Connector Classes
export class FarToCelCN extends SysADLConnector {
  constructor() {
    super('FarToCelCN', null, null, null, null);
  }
}

export class CelToCelCN extends SysADLConnector {
  constructor() {
    super('CelToCelCN', null, null, null, null);
  }
}

// Executables
export async function FarToCelEX(params = {}) {
  console.log('Executing FarToCelEX with params: ${JSON.stringify(params)}');
  const f = params.f || 0.0;
  return 5 * (f - 32) / 9;
}

export async function CalcAverageEX(params = {}) {
  console.log('Executing CalcAverageEX with params: ${JSON.stringify(params)}');
  const s1 = params.s1 || 0.0;
  const s2 = params.s2 || 0.0;
  return (s1 + s2) / 2;
}

// Constraints
export function FarToCelEQ(f, c) {
  console.log('Evaluating constraint FarToCelEQ with args: ${JSON.stringify({ f, c })}');
  return c === (5 * (f - 32) / 9);
}

export async function validateFarToCelEQ(params = {}) {
  console.log(`Validating constraint FarToCelEQ with params: ${JSON.stringify(params)}`);;
  try {
    if (params.input === undefined || params.output === undefined) {
      console.error('Constraint FarToCelEQ: Invalid params', JSON.stringify(params));
      throw new Error('Constraint FarToCelEQ: Missing input or output');
    }
    const f = typeof params.input === 'number' ? params.input : 0.0;
    const c = typeof params.output === 'number' ? params.output : 0.0;
    const result = FarToCelEQ(f, c);
    if (!result) {
      throw new Error('Constraint FarToCelEQ violated');
    }
    console.log('Constraint FarToCelEQ passed');
    return result;
  } catch (e) {
    console.error('Constraint FarToCelEQ error: ' + e.message);
    throw e;
  }
}

export function CalcAverageEQ(t1, t2, av) {
  console.log('Evaluating constraint CalcAverageEQ with args: ${JSON.stringify({ t1, t2, av })}');
  return av === (t1 + t2) / 2;
}

export async function validateCalcAverageEQ(params = {}) {
  console.log(`Validating constraint CalcAverageEQ with params: ${JSON.stringify(params)}`);;
  try {
    if (params.input === undefined || params.output === undefined) {
      console.error('Constraint CalcAverageEQ: Invalid params', JSON.stringify(params));
      throw new Error('Constraint CalcAverageEQ: Missing input or output');
    }
    const t1 = typeof params.input === 'number' ? params.input : 0.0;
    const t2 = typeof params.input === 'number' ? params.input : 0.0;
    const av = typeof params.output === 'number' ? params.output : 0.0;
    const result = CalcAverageEQ(t1, t2, av);
    if (!result) {
      throw new Error('Constraint CalcAverageEQ violated');
    }
    console.log('Constraint CalcAverageEQ passed');
    return result;
  } catch (e) {
    console.error('Constraint CalcAverageEQ error: ' + e.message);
    throw e;
  }
}


// Simulation Code (save as simulate_simple.js)
// @ts-nocheck;
// Generated JavaScript code for SysADL Simulation: Simple;
// Import the architecture
import * as arch from './simple.js';
let system = null;

// Helper function to simulate data sending
async function simulate(componentName, portName, value) {
  console.log(`Simulating data send of ${value} to ${componentName}.${portName}`);;
  if (!system) {
    console.error(`Error: System not initialized`);
    return false;
  }
  const component = system.subComponents.get(componentName);
  if (!component) {
    console.error(`Error: Component ${componentName} not found`);
    return false;
  }
  const port = component.ports.find(p => p.name === portName);
  if (!port) {
    console.error(`Error: Port ${portName} not found in component ${componentName}`);
    return false;
  }
  if (port.direction !== "out" && port.direction !== "inout") {
    console.error(`Error: Port ${portName} is not an output port (direction: ${port.direction})`);
    return false;
  }
  await port.send(value);
  return true;
}

// Main Function
async function main() {
  console.log('Starting simulation of Simple.sysadl');
  system = new arch.SystemCP();
  await system.start();
  // Adicione aqui as chamadas de simulação personalizadas, ex.:;
  // await simulate("componentName", "portName", value);
  console.log('System simulation completed');
}

main().catch(err => console.error(`Execution error: ${err.message}`));
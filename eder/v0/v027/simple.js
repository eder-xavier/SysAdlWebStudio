// @ts-nocheck
// Generated JavaScript code for SysADL Model: Simple

let system = null;

// Types
const Real = 'any';
const Int = 'any';
const Boolean = 'any'; 
const String = 'any'; 
const Void = 'any'; 

// Base Port Class
class SysADLPort {
    constructor(name, flowType, direction = 'inout') {
        console.log(`Initializing port ${name} with flowType ${flowType}, direction ${direction}`);
        this.name = name;
        this.flowType = flowType || 'any';
        this.direction = direction;
        this.value = null;
        this.bindings = [];
        this.onDataReceivedCallback = null;
    }

    addBinding(binding) {
        this.bindings.push(binding);
        console.log(`Binding added to port ${this.name}: ${binding.sourceComponent?.name || 'undefined'}.${binding.sourcePort?.name || 'undefined'} -> ${binding.targetComponent?.name || 'undefined'}.${binding.targetPort?.name || 'undefined'}`);
    }

    setOnDataReceivedCallback(callback) {
        this.onDataReceivedCallback = callback;
    }

    async send(data) {
        console.log(`Port ${this.name} sending data: ${JSON.stringify(data)}`);
        if (this.direction !== 'out' && this.direction !== 'inout') {
            console.error(`Cannot send via ${this.name}: invalid direction (${this.direction})`);
            return false;
        }
        if (this.bindings.length === 0) {
            console.warn(`No bindings associated with ${this.name}; data not sent`);
            return false;
        }
        this.value = data;
        for (const binding of this.bindings) {
            console.log(`Propagating data ${data} via binding to ${binding.targetPort?.name}`);
            await binding.connector.transmit(data);
        }
        return true;
    }

    async receive(data) {
        console.log(`Port ${this.name} receiving data: ${JSON.stringify(data)}`);
        if (this.direction !== 'in' && this.direction !== 'inout') {
            console.error(`Cannot receive via ${this.name}: invalid direction (${this.direction})`);
            return false;
        }
        this.value = data;
        if (this.onDataReceivedCallback) {
            await this.onDataReceivedCallback(this.name, data);
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
        console.log(`Initializing connector ${name}`);
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
        console.log(`Connector ${this.name} configured with sourcePort ${sourcePort?.name || 'undefined'} and targetPort ${targetPort?.name || 'undefined'}`);
    }

    async transmit(data) {
        console.log(`Connector ${this.name} transmitting data: ${JSON.stringify(data)}`);
        if (!this.sourcePort || !this.targetPort) {
            console.error(`Error: Connector ${this.name} does not have sourcePort or targetPort configured`);
            return;
        }
        let transformedData = this.transformFn ? await this.transformFn({ f: data }) : data;
        this.messageQueue.push(transformedData);
        if (this.isProcessing) return;
        this.isProcessing = true;
        while (this.messageQueue.length > 0) {
            const currentData = this.messageQueue.shift();
            console.log(`Connector ${this.name} processing data: ${JSON.stringify(currentData)}`);
            if (this.constraintFn) {
                try {
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
class Binding {
    constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {
        if (!sourceComponent || !sourcePort || !targetComponent || !targetPort || !connector) {
            console.error('Error creating binding: invalid parameters', {
                sourceComponent: sourceComponent?.name,
                sourcePort: sourcePort?.name,
                targetComponent: targetComponent?.name,
                targetPort: targetPort?.name,
                connector: connector?.name
            });
            throw new Error('Invalid binding parameters');
        }
        console.log(`Creating binding from ${sourceComponent.name}.${sourcePort.name} to ${targetComponent.name}.${targetPort.name} via ${connector.name}`);
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
        console.log(`Initializing component ${name}, isBoundary: ${isBoundary}`);
        this.name = name;
        this.isBoundary = isBoundary;
        this.ports = [];
        this.state = {};
        this.activities = [];
    }

    async addPort(port) {
        this.ports.push(port);
        port.setOnDataReceivedCallback((portName, data) => this.onDataReceived(portName, data));
        console.log(`Port ${port.name} added to component ${this.name}, flowType: ${port.flowType}`);
    }

    async onDataReceived(portName, data) {
        console.log(`Component ${this.name} received data on port ${portName}: ${JSON.stringify(data)}`);
        this.state[portName] = data;
        for (const activity of this.activities) {
            console.log(`Triggering activity ${activity.methodName} in component ${this.name}`);
            await this[activity.methodName]();
        }
    }

    async start() {
        console.log(`Starting component ${this.name}`);
    }
}

// Component Classes
class SensorCP extends SysADLComponent {
    constructor(name, portName) {
        super(name, true);
        this.addPort(new SysADLPort(portName, 'Real', 'out'));
        this.state[portName] = null;
    }

    async start() {
        console.log(`Starting component ${this.name}`);
    }
}

class TempMonitorCP extends SysADLComponent {
    constructor() {
        super('TempMonitorCP', false);
        this.addPort(new SysADLPort('s1', 'Real', 'in'));
        this.addPort(new SysADLPort('s2', 'Real', 'in'));
        this.addPort(new SysADLPort('average', 'Real', 'out'));
        this.state['s1'] = null;
        this.state['s2'] = null;
        this.state['average'] = null;
        this.activities.push({ methodName: 'executeFarToCelAC' });
        this.activities.push({ methodName: 'executeTempMonitorAC' });
    }

    async executeFarToCelAC() {
        console.log('Executing activity FarToCelAC in component TempMonitorCP');
        const params = { far: this.state['s1'] || this.state['s2'] };
        console.log(`Parameters received: far=${params.far}`);
        if (params.far === null) {
            console.warn('Input values are null, activity FarToCelAC aborted');
            return null;
        }
        const result = await FarToCelEX(params);
        try {
            await validateFarToCelEQ({ f: params.far, c: result });
        } catch (e) {
            console.error(`Constraint FarToCelEQ violated: ${e.message}`);
            return null;
        }
        this.state['s1'] = result;
        console.log(`Activity FarToCelAC returning: ${result}`);
        return result;
    }

    async executeTempMonitorAC() {
        console.log('Executing activity TempMonitorAC in component TempMonitorCP');
        const params = { s1: this.state['s1'], s2: this.state['s2'] };
        console.log(`Parameters received: s1=${params.s1}, s2=${params.s2}`);
        if (params.s1 === null || params.s2 === null) {
            console.warn('Input values are null, activity TempMonitorAC aborted');
            return null;
        }
        const result = await CalcAverageEX(params);
        try {
            await validateCalcAverageEQ({ t1: params.s1, t2: params.s2, av: result });
        } catch (e) {
            console.error(`Constraint CalcAverageEQ violated: ${e.message}`);
            return null;
        }
        this.state['average'] = result;
        const averagePort = this.ports.find(p => p.name === 'average');
        if (averagePort) {
            console.log(`Sending average ${result} via port average`);
            await averagePort.send(result);
        }
        console.log(`Activity TempMonitorAC returning: ${result}`);
        return result;
    }
}

class StdOutCP extends SysADLComponent {
    constructor() {
        super('StdOutCP', true);
        this.addPort(new SysADLPort('avg', 'Real', 'in'));
        this.state['avg'] = null;
    }

    async onDataReceived(portName, data) {
        console.log(`StdOutCP received data on port ${portName}: ${JSON.stringify(data)}`);
        this.state[portName] = data;
        console.log(`Average temperature displayed: ${data}\u00B0C`);
    }
}

class SystemCP extends SysADLComponent {
    constructor() {
        super('SystemCP', false);
        this.subComponents = new Map();
        this.connectors = new Map();
        this.bindings = [];
        this.addSubComponent('s1', new SensorCP('s1', 'temp1'));
        this.addSubComponent('s2', new SensorCP('s2', 'temp2'));
        this.addSubComponent('tempMon', new TempMonitorCP());
        this.addSubComponent('stdOut', new StdOutCP());
        this.addConnector('c1', new FarToCelCN());
        this.addConnector('c2', new FarToCelCN());
        this.addConnector('c3', new CelToCelCN());
        this.configureBindings();
    }

    async addSubComponent(name, component) {
        this.subComponents.set(name, component);
        console.log(`Subcomponent ${name} added to ${this.name}`);
    }

    async addConnector(name, connector) {
        this.connectors.set(name, connector);
        console.log(`Connector ${name} added to ${this.name}`);
    }

    async addBinding(binding) {
        this.bindings.push(binding);
        console.log(`Binding added: ${binding.sourceComponent.name}.${binding.sourcePort.name} -> ${binding.targetComponent.name}.${binding.targetPort.name} via ${binding.connector.name}`);
    }

    configureBindings() {
        console.log('Configuring bindings for SystemCP');
        const s1Port = this.subComponents.get('s1').ports.find(p => p.name === 'temp1');
        const tempMonS1Port = this.subComponents.get('tempMon').ports.find(p => p.name === 's1');
        const s2Port = this.subComponents.get('s2').ports.find(p => p.name === 'temp2');
        const tempMonS2Port = this.subComponents.get('tempMon').ports.find(p => p.name === 's2');
        const tempMonAvgPort = this.subComponents.get('tempMon').ports.find(p => p.name === 'average');
        const stdOutAvgPort = this.subComponents.get('stdOut').ports.find(p => p.name === 'avg');
        if (!s1Port || !tempMonS1Port || !s2Port || !tempMonS2Port || !tempMonAvgPort || !stdOutAvgPort) {
            console.error('Error: One or more ports not found for configuring bindings', {
                s1Port: s1Port?.name,
                tempMonS1Port: tempMonS1Port?.name,
                s2Port: s2Port?.name,
                tempMonS2Port: tempMonS2Port?.name,
                tempMonAvgPort: tempMonAvgPort?.name,
                stdOutAvgPort: stdOutAvgPort?.name
            });
            return;
        }
        this.addBinding(new Binding(
            this.subComponents.get('s1'),
            s1Port,
            this.subComponents.get('tempMon'),
            tempMonS1Port,
            this.connectors.get('c1')
        ));
        this.addBinding(new Binding(
            this.subComponents.get('s2'),
            s2Port,
            this.subComponents.get('tempMon'),
            tempMonS2Port,
            this.connectors.get('c2')
        ));
        this.addBinding(new Binding(
            this.subComponents.get('tempMon'),
            tempMonAvgPort,
            this.subComponents.get('stdOut'),
            stdOutAvgPort,
            this.connectors.get('c3')
        ));
    }

    async start() {
        console.log(`Starting composite component ${this.name}`);
        await Promise.all(Array.from(this.subComponents.values()).map(c => c.start()));
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

// Executables
async function FarToCelEX(params = {}) {
    console.log(`Executing FarToCelEX with params: ${JSON.stringify(params)}`);
    const f = params.f || 0.0;
    return (5 * (f - 32) / 9);
}

async function CalcAverageEX(params = {}) {
    console.log(`Executing CalcAverageEX with params: ${JSON.stringify(params)}`);
    const s1 = params.s1 || 0.0;
    const s2 = params.s2 || 0.0;
    return (s1 + s2) / 2;
}

// Constraints
async function validateFarToCelEQ(params = {}) {
    console.log(`Evaluating constraint FarToCelEQ: c === (5 * (f - 32) / 9)`);
    const f = params.f || params.input || 32.0;
    const c = params.c || params.output || 0.0;
    const result = c === (5 * (f - 32) / 9);
    if (!result) {
        throw new Error('Constraint FarToCelEQ violated');
    }
    console.log('Constraint FarToCelEQ passed');
    return result;
}

async function validateCalcAverageEQ(params = {}) {
    console.log(`Evaluating constraint CalcAverageEQ: av === (t1 + t2) / 2`);
    const t1 = params.t1 || 0.0;
    const t2 = params.t2 || 0.0;
    const av = params.av || 0.0;
    const result = av === (t1 + t2) / 2;
    if (!result) {
        throw new Error('Constraint CalcAverageEQ violated');
    }
    console.log('Constraint CalcAverageEQ passed');
    return result;
}

// Helper function to simulate data sending
async function simulate(componentName, portName, value) {
    console.log(`Simulating data send of ${value} to ${componentName}.${portName}`);
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
    if (port.direction !== 'out' && port.direction !== 'inout') {
        console.error(`Error: Port ${portName} is not an output port (direction: ${port.direction})`);
        return false;
    }
    await port.send(value);
    return true;
}

// Main Function
async function main() {
    console.log('Starting simulation of Simple.sysadl');
    system = new SystemCP();
    await system.start();
    
    // Simulate data sending for boundary components with output ports
    await simulate('s1', 'temp1', 77.0);
    await simulate('s2', 'temp2', 86.0);
    
    console.log('System simulation completed');
}

main().catch(err => console.error(`Execution error: ${err.message}`));
// @ts-nocheck
// Generated JavaScript code for SysADL Architecture: SysADLModel

let system = null;

// Types


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
            console.log(`Propagating data ${JSON.stringify(data)} via binding to ${binding.targetPort?.name}`);
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
            console.warn(`No onDataReceivedCallback defined for port ${this.name}`);
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
        let transformedData = this.transformFn ? await this.transformFn({ input: data }) : data;
        this.messageQueue.push(transformedData);
        if (this.isProcessing) return;
        this.isProcessing = true;
        while (this.messageQueue.length > 0) {
            const currentData = this.messageQueue.shift();
            console.log(`Connector ${this.name} processing data: ${JSON.stringify(currentData)}`);
            if (this.constraintFn) {
                try {
                    console.log(`Calling constraint ${this.constraintFn.name} with params: ${JSON.stringify({ input: data, output: currentData })}`);
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
            console.error("Error creating binding: invalid parameters", {
                sourceComponent: sourceComponent?.name,
                sourcePort: sourcePort?.name,
                targetComponent: targetComponent?.name,
                targetPort: targetPort?.name,
                connector: connector?.name
            });
            throw new Error("Invalid binding parameters");
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
    constructor(name) {
        this.name = name;
        this.ports = [];
        this.subComponents = new Map();
        this.connectors = new Map();
        this.bindings = [];
        this.configureBindings();
    }

    addSubComponent(name, component) {
        this.subComponents.set(name, component);
        console.log(`Subcomponent ${name} added to ${this.name}`);
    }

    addConnector(name, connector) {
        this.connectors.set(name, connector);
        console.log(`Connector ${name} added to ${this.name}`);
    }

    addBinding(binding) {
        this.bindings.push(binding);
        console.log(`Binding added: ${binding.sourceComponent.name}.${binding.sourcePort.name} -> ${binding.targetComponent.name}.${binding.targetPort.name} via ${binding.connector.name}`);
    }

    configureBindings() {
        // To be overridden in composite components
    }

    async start() {
        console.log(`Starting component ${this.name}`);
        await Promise.all(Array.from(this.subComponents.values()).map(c => c.start ? c.start() : Promise.resolve()));
    }
}
// Component Classes
export class SystemCP extends SysADLComponent {
    constructor() {
        super('SystemCP');
        this.subComponents = new Map();
        this.connectors = new Map();
        this.addSubComponent('s1', new SensorCP());
        this.addSubComponent('s2', new SensorCP());
        this.addSubComponent('tempMon', new TempMonitorCP());
        this.addSubComponent('stdOut', new StdOutCP());
        this.addConnector('c1', new FarToCelCN());
        this.addConnector('c2', new FarToCelCN());
        this.addConnector('c3', new CelToCelCN());
        this.configureBindings();
    }
    configureBindings() {
        console.log('Configuring bindings for SystemCP');
        const sourcePort = this.subComponents.get('s1').ports.find(p => p.name === 'temp1');
        const targetPort = this.subComponents.get('tempMon').ports.find(p => p.name === 's1');
        if (!sourcePort || !targetPort) {
            console.error('Error: One or more ports not found for configuring bindings', {
                sourcePort: sourcePort?.name,
                targetPort: targetPort?.name
            });
            return;
        }
        this.addBinding(new Binding(
            this.subComponents.get('s1'),
            sourcePort,
            this.subComponents.get('tempMon'),
            targetPort,
            this.connectors.get('c1')
        ));
        const sourcePort = this.subComponents.get('s2').ports.find(p => p.name === 'temp2');
        const targetPort = this.subComponents.get('tempMon').ports.find(p => p.name === 's2');
        if (!sourcePort || !targetPort) {
            console.error('Error: One or more ports not found for configuring bindings', {
                sourcePort: sourcePort?.name,
                targetPort: targetPort?.name
            });
            return;
        }
        this.addBinding(new Binding(
            this.subComponents.get('s2'),
            sourcePort,
            this.subComponents.get('tempMon'),
            targetPort,
            this.connectors.get('c2')
        ));
        const sourcePort = this.subComponents.get('tempMon').ports.find(p => p.name === 'average');
        const targetPort = this.subComponents.get('stdOut').ports.find(p => p.name === 'avg');
        if (!sourcePort || !targetPort) {
            console.error('Error: One or more ports not found for configuring bindings', {
                sourcePort: sourcePort?.name,
                targetPort: targetPort?.name
            });
            return;
        }
        this.addBinding(new Binding(
            this.subComponents.get('tempMon'),
            sourcePort,
            this.subComponents.get('stdOut'),
            targetPort,
            this.connectors.get('c3')
        ));
    }
    async start() {
        console.log(`Starting composite component SystemCP`);
        await Promise.all(Array.from(this.subComponents.values()).map(c => c.start ? c.start() : Promise.resolve()));
    }
}

export class TempMonitorCP extends SysADLComponent {
    constructor() {
        super('TempMonitorCP');
        this.ports.push(new SysADLPort('s1', 'Real', 'in'));
        this.ports.push(new SysADLPort('s2', 'Real', 'in'));
        this.ports.push(new SysADLPort('average', 'Real', 'out'));
    }
    async start() {
        console.log(`Starting simple component TempMonitorCP`);
    }
}

export class SensorCP extends SysADLComponent {
    constructor() {
        super('SensorCP');
        this.ports.push(new SysADLPort('current', 'Real', 'in'));
    }
    async start() {
        console.log(`Starting simple component SensorCP`);
    }
}

export class StdOutCP extends SysADLComponent {
    constructor() {
        super('StdOutCP');
        this.ports.push(new SysADLPort('c3', 'Real', 'in'));
    }
    async start() {
        console.log(`Starting simple component StdOutCP`);
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
async function FarToCelEX(params = {}) {
    console.log(`Executing FarToCelEX with params: ${JSON.stringify(params)}`);
    const f = params.f !== undefined ? params.f : 0.0;
    return 5*(f - 32)/9 ;
}
async function CalcAverageEX(params = {}) {
    console.log(`Executing CalcAverageEX with params: ${JSON.stringify(params)}`);
    const temp1 = params.temp1 !== undefined ? params.temp1 : 0.0;
    const temp2 = params.temp2 !== undefined ? params.temp2 : 0.0;
    return (temp1 + temp2)/2 ;
}
// Constraints
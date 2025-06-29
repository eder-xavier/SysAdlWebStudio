// Generated JavaScript code for SysADL Model: SysADLModel

const { performance } = require('perf_hooks');

// Types
const Int = 'any'; // Value type
const Boolean = 'any'; // Value type
const String = 'any'; // Value type
const Void = 'any'; // Value type
const Real = 'any'; // Value type
const Command = Object.freeze({ On: 'On', Off: 'Off' });
class Commands {
    constructor(params = {}) {
        this.heater = params.heater ?? null;
    }
}
const temperature = 'any'; // Value type
const FahrenheitTemperature = 'any'; // Value type
const CelsiusTemperature = 'any'; // Value type

// Base Port Class
class SysADLPort {
    constructor(name) {
        this.name = name;
        this.value = null;
    }

    async send(data) {
        throw new Error(`Method send must be implemented in ${this.name}`);
    }

    async receive(data) {
        throw new Error(`Method receive must be implemented in ${this.name}`);
    }

    getValue() {
        return this.value;
    }
}

// Port Classes
class FTemperatureOPT extends SysADLPort {
    constructor(name = 'FTemperatureOPT') {
        super(name);
        this.type = 'FahrenheitTemperature';
        this.direction = 'out';
        this.isComposite = false;
        this.subPorts = new Map();
        
        this.connector = null;
    }

    async send(data, subPortName = null) {
        if (this.isComposite && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'out' && subPort.direction !== 'inout')) {
                console.error(`Cannot send via subPort ${subPortName} in ${this.name}`);
                return false;
            }
            console.log(`Sending ${data} via subPort ${subPortName} in ${this.name}`);
            subPort.value = data;
            if (subPort.connector) {
                await subPort.connector.transmit(data);
            }
            return true;
        }
        if ((this.direction !== 'out' && this.direction !== 'inout') || !this.connector) {
            console.error(`Cannot send via ${this.name}: invalid direction or no connector`);
            return false;
        }
        console.log(`Sending ${data} via ${this.name}`);
        this.value = data;
        await this.connector.transmit(data);
        return true;
    }

    async receive(data, subPortName = null) {
        if (this.isComposite && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'in' && subPort.direction !== 'inout')) {
                console.error(`Cannot receive via subPort ${subPortName} in ${this.name}`);
                return false;
            }
            console.log(`Received ${data} via subPort ${subPortName} in ${this.name}`);
            subPort.value = data;
            return true;
        }
        if (this.direction !== 'in' && this.direction !== 'inout') {
            console.error(`Cannot receive via ${this.name}: invalid direction`);
            return false;
        }
        console.log(`Received ${data} via ${this.name}`);
        this.value = data;
        return true;
    }
}

class PresenceIPT extends SysADLPort {
    constructor(name = 'PresenceIPT') {
        super(name);
        this.type = 'Boolean';
        this.direction = 'in';
        this.isComposite = false;
        this.subPorts = new Map();
        
        this.connector = null;
    }

    async send(data, subPortName = null) {
        if (this.isComposite && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'out' && subPort.direction !== 'inout')) {
                console.error(`Cannot send via subPort ${subPortName} in ${this.name}`);
                return false;
            }
            console.log(`Sending ${data} via subPort ${subPortName} in ${this.name}`);
            subPort.value = data;
            if (subPort.connector) {
                await subPort.connector.transmit(data);
            }
            return true;
        }
        if ((this.direction !== 'out' && this.direction !== 'inout') || !this.connector) {
            console.error(`Cannot send via ${this.name}: invalid direction or no connector`);
            return false;
        }
        console.log(`Sending ${data} via ${this.name}`);
        this.value = data;
        await this.connector.transmit(data);
        return true;
    }

    async receive(data, subPortName = null) {
        if (this.isComposite && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'in' && subPort.direction !== 'inout')) {
                console.error(`Cannot receive via subPort ${subPortName} in ${this.name}`);
                return false;
            }
            console.log(`Received ${data} via subPort ${subPortName} in ${this.name}`);
            subPort.value = data;
            return true;
        }
        if (this.direction !== 'in' && this.direction !== 'inout') {
            console.error(`Cannot receive via ${this.name}: invalid direction`);
            return false;
        }
        console.log(`Received ${data} via ${this.name}`);
        this.value = data;
        return true;
    }
}

class PresenceOPT extends SysADLPort {
    constructor(name = 'PresenceOPT') {
        super(name);
        this.type = 'Boolean';
        this.direction = 'out';
        this.isComposite = false;
        this.subPorts = new Map();
        
        this.connector = null;
    }

    async send(data, subPortName = null) {
        if (this.isComposite && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'out' && subPort.direction !== 'inout')) {
                console.error(`Cannot send via subPort ${subPortName} in ${this.name}`);
                return false;
            }
            console.log(`Sending ${data} via subPort ${subPortName} in ${this.name}`);
            subPort.value = data;
            if (subPort.connector) {
                await subPort.connector.transmit(data);
            }
            return true;
        }
        if ((this.direction !== 'out' && this.direction !== 'inout') || !this.connector) {
            console.error(`Cannot send via ${this.name}: invalid direction or no connector`);
            return false;
        }
        console.log(`Sending ${data} via ${this.name}`);
        this.value = data;
        await this.connector.transmit(data);
        return true;
    }

    async receive(data, subPortName = null) {
        if (this.isComposite && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'in' && subPort.direction !== 'inout')) {
                console.error(`Cannot receive via subPort ${subPortName} in ${this.name}`);
                return false;
            }
            console.log(`Received ${data} via subPort ${subPortName} in ${this.name}`);
            subPort.value = data;
            return true;
        }
        if (this.direction !== 'in' && this.direction !== 'inout') {
            console.error(`Cannot receive via ${this.name}: invalid direction`);
            return false;
        }
        console.log(`Received ${data} via ${this.name}`);
        this.value = data;
        return true;
    }
}

class CTemperatureIPT extends SysADLPort {
    constructor(name = 'CTemperatureIPT') {
        super(name);
        this.type = 'CelsiusTemperature';
        this.direction = 'in';
        this.isComposite = false;
        this.subPorts = new Map();
        
        this.connector = null;
    }

    async send(data, subPortName = null) {
        if (this.isComposite && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'out' && subPort.direction !== 'inout')) {
                console.error(`Cannot send via subPort ${subPortName} in ${this.name}`);
                return false;
            }
            console.log(`Sending ${data} via subPort ${subPortName} in ${this.name}`);
            subPort.value = data;
            if (subPort.connector) {
                await subPort.connector.transmit(data);
            }
            return true;
        }
        if ((this.direction !== 'out' && this.direction !== 'inout') || !this.connector) {
            console.error(`Cannot send via ${this.name}: invalid direction or no connector`);
            return false;
        }
        console.log(`Sending ${data} via ${this.name}`);
        this.value = data;
        await this.connector.transmit(data);
        return true;
    }

    async receive(data, subPortName = null) {
        if (this.isComposite && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'in' && subPort.direction !== 'inout')) {
                console.error(`Cannot receive via subPort ${subPortName} in ${this.name}`);
                return false;
            }
            console.log(`Received ${data} via subPort ${subPortName} in ${this.name}`);
            subPort.value = data;
            return true;
        }
        if (this.direction !== 'in' && this.direction !== 'inout') {
            console.error(`Cannot receive via ${this.name}: invalid direction`);
            return false;
        }
        console.log(`Received ${data} via ${this.name}`);
        this.value = data;
        return true;
    }
}

class CommandIPT extends SysADLPort {
    constructor(name = 'CommandIPT') {
        super(name);
        this.type = 'Command';
        this.direction = 'in';
        this.isComposite = false;
        this.subPorts = new Map();
        
        this.connector = null;
    }

    async send(data, subPortName = null) {
        if (this.isComposite && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'out' && subPort.direction !== 'inout')) {
                console.error(`Cannot send via subPort ${subPortName} in ${this.name}`);
                return false;
            }
            console.log(`Sending ${data} via subPort ${subPortName} in ${this.name}`);
            subPort.value = data;
            if (subPort.connector) {
                await subPort.connector.transmit(data);
            }
            return true;
        }
        if ((this.direction !== 'out' && this.direction !== 'inout') || !this.connector) {
            console.error(`Cannot send via ${this.name}: invalid direction or no connector`);
            return false;
        }
        console.log(`Sending ${data} via ${this.name}`);
        this.value = data;
        await this.connector.transmit(data);
        return true;
    }

    async receive(data, subPortName = null) {
        if (this.isComposite && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'in' && subPort.direction !== 'inout')) {
                console.error(`Cannot receive via subPort ${subPortName} in ${this.name}`);
                return false;
            }
            console.log(`Received ${data} via subPort ${subPortName} in ${this.name}`);
            subPort.value = data;
            return true;
        }
        if (this.direction !== 'in' && this.direction !== 'inout') {
            console.error(`Cannot receive via ${this.name}: invalid direction`);
            return false;
        }
        console.log(`Received ${data} via ${this.name}`);
        this.value = data;
        return true;
    }
}

class CommandOPT extends SysADLPort {
    constructor(name = 'CommandOPT') {
        super(name);
        this.type = 'Command';
        this.direction = 'out';
        this.isComposite = false;
        this.subPorts = new Map();
        
        this.connector = null;
    }

    async send(data, subPortName = null) {
        if (this.isComposite && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'out' && subPort.direction !== 'inout')) {
                console.error(`Cannot send via subPort ${subPortName} in ${this.name}`);
                return false;
            }
            console.log(`Sending ${data} via subPort ${subPortName} in ${this.name}`);
            subPort.value = data;
            if (subPort.connector) {
                await subPort.connector.transmit(data);
            }
            return true;
        }
        if ((this.direction !== 'out' && this.direction !== 'inout') || !this.connector) {
            console.error(`Cannot send via ${this.name}: invalid direction or no connector`);
            return false;
        }
        console.log(`Sending ${data} via ${this.name}`);
        this.value = data;
        await this.connector.transmit(data);
        return true;
    }

    async receive(data, subPortName = null) {
        if (this.isComposite && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'in' && subPort.direction !== 'inout')) {
                console.error(`Cannot receive via subPort ${subPortName} in ${this.name}`);
                return false;
            }
            console.log(`Received ${data} via subPort ${subPortName} in ${this.name}`);
            subPort.value = data;
            return true;
        }
        if (this.direction !== 'in' && this.direction !== 'inout') {
            console.error(`Cannot receive via ${this.name}: invalid direction`);
            return false;
        }
        console.log(`Received ${data} via ${this.name}`);
        this.value = data;
        return true;
    }
}

class CTemperatureOPT extends SysADLPort {
    constructor(name = 'CTemperatureOPT') {
        super(name);
        this.type = 'CelsiusTemperature';
        this.direction = 'out';
        this.isComposite = false;
        this.subPorts = new Map();
        
        this.connector = null;
    }

    async send(data, subPortName = null) {
        if (this.isComposite && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'out' && subPort.direction !== 'inout')) {
                console.error(`Cannot send via subPort ${subPortName} in ${this.name}`);
                return false;
            }
            console.log(`Sending ${data} via subPort ${subPortName} in ${this.name}`);
            subPort.value = data;
            if (subPort.connector) {
                await subPort.connector.transmit(data);
            }
            return true;
        }
        if ((this.direction !== 'out' && this.direction !== 'inout') || !this.connector) {
            console.error(`Cannot send via ${this.name}: invalid direction or no connector`);
            return false;
        }
        console.log(`Sending ${data} via ${this.name}`);
        this.value = data;
        await this.connector.transmit(data);
        return true;
    }

    async receive(data, subPortName = null) {
        if (this.isComposite && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'in' && subPort.direction !== 'inout')) {
                console.error(`Cannot receive via subPort ${subPortName} in ${this.name}`);
                return false;
            }
            console.log(`Received ${data} via subPort ${subPortName} in ${this.name}`);
            subPort.value = data;
            return true;
        }
        if (this.direction !== 'in' && this.direction !== 'inout') {
            console.error(`Cannot receive via ${this.name}: invalid direction`);
            return false;
        }
        console.log(`Received ${data} via ${this.name}`);
        this.value = data;
        return true;
    }
}

// Base Connector Class
class SysADLConnector {
    constructor(name, sourcePort, targetPort) {
        this.name = name;
        this.sourcePort = sourcePort;
        this.targetPort = targetPort;
        this.messageQueue = [];
        this.isProcessing = false;
    }

    async transmit(data) {
        this.messageQueue.push(data);
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.messageQueue.length > 0) {
            const currentData = this.messageQueue.shift();
            console.log(`Connector ${this.name} transmitting: ${currentData}`);
            if (this.targetPort) {
                await this.targetPort.receive(currentData);
            } else {
                console.error(`No target port for connector ${this.name}`);
            }
        }
        this.isProcessing = false;
    }
}

// Connector Classes
class FahrenheitToCelsiusCN extends SysADLConnector {
    constructor(sourcePort, targetPort) {
        super('FahrenheitToCelsiusCN', sourcePort, targetPort);
        this.participants = new Map();
        this.participants.set('Ft', null);
    }

    setParticipant(name, component) {
        this.participants.set(name, component);
        
        if (params["name"] === 'Ft') {
            this.sourcePort = component.ports.find(p => p.params["name"] === 'Ft');
            if (this.sourcePort) this.sourcePort.connector = this;
        }
        if (params["name"] === 'Ct') {
            this.targetPort = component.ports.find(p => p.params["name"] === 'Ct');
        }
    }
}

class PresenceCN extends SysADLConnector {
    constructor(sourcePort, targetPort) {
        super('PresenceCN', sourcePort, targetPort);
        this.participants = new Map();
        this.participants.set('pOut', null);
    }

    setParticipant(name, component) {
        this.participants.set(name, component);
        
        if (params["name"] === 'pOut') {
            this.sourcePort = component.ports.find(p => p.params["name"] === 'pOut');
            if (this.sourcePort) this.sourcePort.connector = this;
        }
        if (params["name"] === 'pIn') {
            this.targetPort = component.ports.find(p => p.params["name"] === 'pIn');
        }
    }
}

class CommandCN extends SysADLConnector {
    constructor(sourcePort, targetPort) {
        super('CommandCN', sourcePort, targetPort);
        this.participants = new Map();
        this.participants.set('commandOut', null);
    }

    setParticipant(name, component) {
        this.participants.set(name, component);
        
        if (params["name"] === 'commandOut') {
            this.sourcePort = component.ports.find(p => p.params["name"] === 'commandOut');
            if (this.sourcePort) this.sourcePort.connector = this;
        }
        if (params["name"] === 'commandIn') {
            this.targetPort = component.ports.find(p => p.params["name"] === 'commandIn');
        }
    }
}

class CTemperatureCN extends SysADLConnector {
    constructor(sourcePort, targetPort) {
        super('CTemperatureCN', sourcePort, targetPort);
        this.participants = new Map();
        this.participants.set('CtOut', null);
    }

    setParticipant(name, component) {
        this.participants.set(name, component);
        
        if (params["name"] === 'CtOut') {
            this.sourcePort = component.ports.find(p => p.params["name"] === 'CtOut');
            if (this.sourcePort) this.sourcePort.connector = this;
        }
        if (params["name"] === 'ctIn') {
            this.targetPort = component.ports.find(p => p.params["name"] === 'ctIn');
        }
    }
}

// Base Component Class
class SysADLComponent {
    constructor(name, isBoundary = false) {
        this.name = name;
        this.isBoundary = isBoundary;
        this.ports = [];
        this.state = {};
    }

    addPort(port) {
        this.ports.push(port);
        console.log(`Port ${port.name} added to component ${this.name}`);
    }

    async onDataReceived(portName, data) {
        this.state[portName] = data;
        console.log(`Component ${this.name} received ${data} on ${portName}`);
    }

    async start() {
        console.log(`Component ${this.name} started`);
    }
}

// Base Boundary Component Class
class SysADLBoundaryComponent extends SysADLComponent {
    constructor(name) {
        super(name, true);
    }

    async start() {
        console.log(`Boundary component ${this.name} started`);
        // Data enter with external input in main
    }
}

// Component Classes
class RTCSystemCFD extends SysADLComponent {
    constructor() {
        super('RTCSystemCFD');
        // Initialize ports
        this.addPort(new FTemperatureOPT('current1'));

        // Initialize state
        this.state['current1'] = 20;
    }

    async onDataReceived(portName, data) {
        this.state[portName] = data;
        console.log(`Component ${this.name} updated ${portName} with ${data}`);
        
    }
    
}

class RoomTemperatureControllerCP extends SysADLComponent {
    constructor() {
        super('RoomTemperatureControllerCP');
        // Initialize ports
        this.addPort(new PresenceIPT('detectedRTC'));
        this.addPort(new CTemperatureIPT('s1'));

        // Initialize state
        this.state['detectedRTC'] = false;
        this.state['s1'] = 20;
    }

    async onDataReceived(portName, data) {
        this.state[portName] = data;
        console.log(`Component ${this.name} updated ${portName} with ${data}`);
        
    }
    
}

class TemperatureSensorCP extends SysADLComponent {
    constructor() {
        super('TemperatureSensorCP');
        // Initialize ports
        this.addPort(new FTemperatureOPT('current'));

        // Initialize state
        this.state['current'] = 20;
    }

    async onDataReceived(portName, data) {
        this.state[portName] = data;
        console.log(`Component ${this.name} updated ${portName} with ${data}`);
        
    }
    
}

class PresenceSensorCP extends SysADLComponent {
    constructor() {
        super('PresenceSensorCP');
        // Initialize ports
        this.addPort(new PresenceOPT('detected'));

        // Initialize state
        this.state['detected'] = false;
    }

    async onDataReceived(portName, data) {
        this.state[portName] = data;
        console.log(`Component ${this.name} updated ${portName} with ${data}`);
        
    }
    
}

class UserInterfaceCP extends SysADLComponent {
    constructor() {
        super('UserInterfaceCP');
        // Initialize ports
        this.addPort(new CTemperatureOPT('desired'));

        // Initialize state
        this.state['desired'] = 20;
    }

    async onDataReceived(portName, data) {
        this.state[portName] = data;
        console.log(`Component ${this.name} updated ${portName} with ${data}`);
        
    }
    
}

class HeaterCP extends SysADLComponent {
    constructor() {
        super('HeaterCP');
        // Initialize ports
        this.addPort(new CommandIPT('controllerH'));

        // Initialize state
        this.state['controllerH'] = Command.Off;
    }

    async onDataReceived(portName, data) {
        this.state[portName] = data;
        console.log(`Component ${this.name} updated ${portName} with ${data}`);
        
    }
    
}

class CoolerCP extends SysADLComponent {
    constructor() {
        super('CoolerCP');
        // Initialize ports
        this.addPort(new CommandIPT('controllerC'));

        // Initialize state
        this.state['controllerC'] = Command.Off;
    }

    async onDataReceived(portName, data) {
        this.state[portName] = data;
        console.log(`Component ${this.name} updated ${portName} with ${data}`);
        
    }
    
}

class PresenceCheckerCP extends SysADLComponent {
    constructor() {
        super('PresenceCheckerCP');
        // Initialize ports
        this.addPort(new PresenceIPT('detected'));

        // Initialize state
        this.state['detected'] = false;
    }

    async onDataReceived(portName, data) {
        this.state[portName] = data;
        console.log(`Component ${this.name} updated ${portName} with ${data}`);
        
        if (this.state['detected'] !== null && this.state['userTemp'] !== null) {
            const result = await this.executeCheckPresenceToSetTemperatureAC();
            const outputPort = this.ports.find(p => p.params["name"] === 'target');
            if (outputPort) await outputPort.send(result);
        }
    }
    
}

class CommanderCP extends SysADLComponent {
    constructor() {
        super('CommanderCP');
        // Initialize ports
        this.addPort(new CTemperatureIPT('target2'));

        // Initialize state
        this.state['target2'] = 20;
    }

    async onDataReceived(portName, data) {
        this.state[portName] = data;
        console.log(`Component ${this.name} updated ${portName} with ${data}`);
        
        if (this.state['average2'] !== null && this.state['target2'] !== null) {
            const result = await this.executeDecideCommandAC();
            const heatingPort = this.ports.find(p => p.params["name"] === 'heating');
            const coolingPort = this.ports.find(p => p.params["name"] === 'cooling');
            if (heatingPort) await heatingPort.send(result.heater);
            if (coolingPort) await coolingPort.send(result.cooler);
        }
    }
    
}

class SensorsMonitorCP extends SysADLComponent {
    constructor() {
        super('SensorsMonitorCP');
        // Initialize ports
        this.addPort(new CTemperatureIPT('s1'));

        // Initialize state
        this.state['s1'] = 20;
    }

    async onDataReceived(portName, data) {
        this.state[portName] = data;
        console.log(`Component ${this.name} updated ${portName} with ${data}`);
        
        if (this.state['s1'] !== null && this.state['s2'] !== null) {
            const result = await this.executeCalculateAverageTemperatureAC();
            const outputPort = this.ports.find(p => p.params["name"] === 'average');
            if (outputPort) await outputPort.send(result);
        }
    }
    
}

// Executables
function CommandCoolerEx(params = {}) {
    let cooler = params["cooler"] ?? null;
    let cmds = params["cmds"] ?? null;
    let params = params["params"] ?? null;
    return params["cmds"].cooler ;

}

function CommandHeaterEx(params = {}) {
    let heater = params["heater"] ?? null;
    let cmds = params["cmds"] ?? null;
    let params = params["params"] ?? null;
    return params["cmds"].heater ;

}

function FahrenheitToCelsiusEx(params = {}) {
    let f = params["f"] ?? null;
    return 5*(f - 32)/9 ;

}

function CalculateAverageTemperatureEx(params = {}) {
    let temp2 = params["temp2"] ?? null;
    let temp1 = params["temp1"] ?? null;
    return (temp1 + temp2)/2 ;

}

function CheckPresenceToSetTemperature(params = {}) {
    let userTemp = params["userTemp"] ?? null;
    let presence = params["presence"] ?? null;
    if(params["presence"] === true) return userTemp; else return 2;
    return params.result ?? null;

}

function CompareTemperatureEx(params = {}) {
    let target = params["target"] ?? null;
    let average = params["average"] ?? null;
    let heater = types.Command.Off;     let cooler = types.Command.Off; if(average > target) {heater = types.Command.Off; cooler = types.Command.On ;
    }
    return params.result ?? null;

}

// Constraints
function validateCalculateAverageTemperatureEQ(params = {}) {
    let t1 = params["t1"] ?? 20;
    let t2 = params["t2"] ?? 20;
    let av = params["av"] ?? 20;
    const result = params["av"] === (params["t1"] + params["t2"])/2
	;
    if (!result) {
        throw new Error('Constraint CalculateAverageTemperatureEQ violated');
    }
    return result;
}

function validateCompareTemperatureEQ(params = {}) {
    let target = params["target"] ?? 20;
    let average = params["average"] ?? 20;
    let cmds = params["cmds"] ?? new Commands();
    const result = params["average"] > params["target"] ? params["cmds"] === Command.heater.params["Off"] && Command.On : Command.params["heater"].On && params["cmds"] === Command.params["cooler"].Off ;
    if (!result) {
        throw new Error('Constraint CompareTemperatureEQ violated');
    }
    return result;
}

function validateFahrenheitToCelsiusEQ(params = {}) {
    let f = params["f"] ?? 20;
    let c = params["c"] ?? 20;
    const result = params["c"] === (5*(params["f"] - 32)/9);
    if (!result) {
        throw new Error('Constraint FahrenheitToCelsiusEQ violated');
    }
    return result;
}

function validateCommandHeaterEQ(params = {}) {
    let cmds = params["cmds"] ?? new Commands();
    let c = params["c"] ?? Command.Off;
    const result = params["c"] === params["cmds"].params["heater"] ;
    if (!result) {
        throw new Error('Constraint CommandHeaterEQ violated');
    }
    return result;
}

function validateCommandCoolerEQ(params = {}) {
    let cmds = params["cmds"] ?? new Commands();
    let c = params["c"] ?? Command.Off;
    const result = params["c"] === params["cmds"].params["cooler"] ;
    if (!result) {
        throw new Error('Constraint CommandCoolerEQ violated');
    }
    return result;
}

function validateCheckPresenceToSetTemperatureEQ(params = {}) {
    let detected = params["detected"] ?? false;
    let userTemp = params["userTemp"] ?? 20;
    let target = params["target"] ?? 20;
    const result = params["detected"] === true ? params["target"] === params["userTemp"] : params["target"] === 2 ;
    if (!result) {
        throw new Error('Constraint CheckPresenceToSetTemperatureEQ violated');
    }
    return result;
}

// Main Function
async function main() {
    const system = new SysADLModel();
    const rtcsystemcfd = new RTCSystemCFD();
    system.addPort(...rtcsystemcfd.ports);
    const roomtemperaturecontrollercp = new RoomTemperatureControllerCP();
    system.addPort(...roomtemperaturecontrollercp.ports);
    const temperaturesensorcp = new TemperatureSensorCP();
    system.addPort(...temperaturesensorcp.ports);
    const presencesensorcp = new PresenceSensorCP();
    system.addPort(...presencesensorcp.ports);
    const userinterfacecp = new UserInterfaceCP();
    system.addPort(...userinterfacecp.ports);
    const heatercp = new HeaterCP();
    system.addPort(...heatercp.ports);
    const coolercp = new CoolerCP();
    system.addPort(...coolercp.ports);
    const presencecheckercp = new PresenceCheckerCP();
    system.addPort(...presencecheckercp.ports);
    const commandercp = new CommanderCP();
    system.addPort(...commandercp.ports);
    const sensorsmonitorcp = new SensorsMonitorCP();
    system.addPort(...sensorsmonitorcp.ports);
    const fahrenheittocelsiuscn = new FahrenheitToCelsiusCN(null, null);
    fahrenheittocelsiuscn.setParticipant('Ft', rtcsystemcfd);
    const presencecn = new PresenceCN(null, null);
    presencecn.setParticipant('pOut', presencesensorcp);
    const commandcn = new CommandCN(null, null);
    const ctemperaturecn = new CTemperatureCN(null, null);
    ctemperaturecn.setParticipant('CtOut', userinterfacecp);
    await Promise.all([
        rtcsystemcfd.start(),
        roomtemperaturecontrollercp.start(),
        temperaturesensorcp.start(),
        presencesensorcp.start(),
        userinterfacecp.start(),
        heatercp.start(),
        coolercp.start(),
        presencecheckercp.start(),
        commandercp.start(),
        sensorsmonitorcp.start(),
    ]);
}

main().catch(err => console.error(`Error in execution: ${err.message}`));

// Generated JavaScript code for SysADL Model: SysADLModel

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

// Runtime Environment
class SysADLComponent {
    constructor(name) {
        this.name = name;
        this.ports = new Map();
        this.subscribers = new Map();
        this.subComponents = new Map();
        this.connectors = new Map();
        this.state = {};
    }

    addPort(name, type, direction, isComposite = false, subPorts = []) {
        const port = { type, direction, value: null, isComposite, subPorts: new Map() };
        if (isComposite) {
            subPorts.forEach(sp => {
                const subPortDef = [{"name":"FTemperatureOPT","flows":[{"direction":"out","type":"FahrenheitTemperature"}],"subPorts":[]},{"name":"PresenceIPT","flows":[{"direction":"in","type":"Boolean"}],"subPorts":[]},{"name":"PresenceOPT","flows":[{"direction":"out","type":"Boolean"}],"subPorts":[]},{"name":"CTemperatureIPT","flows":[{"direction":"in","type":"CelsiusTemperature"}],"subPorts":[]},{"name":"CommandIPT","flows":[{"direction":"in","type":"Command"}],"subPorts":[]},{"name":"CommandOPT","flows":[{"direction":"out","type":"Command"}],"subPorts":[]},{"name":"CTemperatureOPT","flows":[{"direction":"out","type":"CelsiusTemperature"}],"subPorts":[]}].find(p => p.name === sp.type);
                const direction = subPortDef?.flows?.[0]?.direction || 'inout';
                port.subPorts.set(sp.name, { type: sp.type, direction, value: null });
            });
        }
        this.ports.set(name, port);
    }

    send(portName, data, subPortName = null) {
        const port = this.ports.get(portName);
        if (!port) return;
        if (port.isComposite && subPortName) {
            const subPort = port.subPorts.get(subPortName);
            if (subPort && (subPort.direction === 'out' || subPort.direction === 'inout')) {
                subPort.value = data;
                const subs = this.subscribers.get(`${portName}.${subPortName}`) || [];
                subs.forEach(sub => {
                    if (typeof sub.callback === 'function') {
                        sub.callback(data);
                    }
                });
            }
        } else if (!port.isComposite && (port.direction === 'out' || port.direction === 'inout')) {
            port.value = data;
            const subs = this.subscribers.get(portName) || [];
            subs.forEach(sub => {
                if (typeof sub.callback === 'function') {
                    sub.callback(data);
                }
            });
        }
    }

    receive(portName, data, subPortName = null) {
        const port = this.ports.get(portName);
        if (!port) return;
        if (port.isComposite && subPortName) {
            const subPort = port.subPorts.get(subPortName);
            if (subPort && (subPort.direction === 'in' || subPort.direction === 'inout')) {
                subPort.value = data;
                this.state[`${portName}.${subPortName}`] = data;
            }
        } else if (!port.isComposite && (port.direction === 'in' || port.direction === 'inout')) {
            port.value = data;
            this.state[portName] = data;
        }
    }

    subscribe(portName, subPortName, subscriber, callback) {
        const key = subPortName ? `${portName}.${subPortName}` : portName;
        const subs = this.subscribers.get(key) || [];
        subs.push({ subscriber, callback });
        this.subscribers.set(key, subs);
    }
}

// Components
class RTCSystemCFD extends SysADLComponent {
    constructor() {
        super('RTCSystemCFD');
        // Initialize ports
        this.addPort('current1', 'FahrenheitTemperature', 'out');
    }
}

class RoomTemperatureControllerCP extends SysADLComponent {
    constructor() {
        super('RoomTemperatureControllerCP');
        // Initialize ports
        this.addPort('detectedRTC', 'Boolean', 'in');
        this.addPort('s1', 'CelsiusTemperature', 'in');
    }
}

class TemperatureSensorCP extends SysADLComponent {
    constructor() {
        super('TemperatureSensorCP');
        // Initialize ports
        this.addPort('current', 'FahrenheitTemperature', 'out');
    }
}

class PresenceSensorCP extends SysADLComponent {
    constructor() {
        super('PresenceSensorCP');
        // Initialize ports
        this.addPort('detected', 'Boolean', 'out');
    }
}

class UserInterfaceCP extends SysADLComponent {
    constructor() {
        super('UserInterfaceCP');
        // Initialize ports
        this.addPort('desired', 'CelsiusTemperature', 'out');
    }
}

class HeaterCP extends SysADLComponent {
    constructor() {
        super('HeaterCP');
        // Initialize ports
        this.addPort('controllerH', 'Command', 'in');
    }
}

class CoolerCP extends SysADLComponent {
    constructor() {
        super('CoolerCP');
        // Initialize ports
        this.addPort('controllerC', 'Command', 'in');
    }
}

class PresenceCheckerCP extends SysADLComponent {
    constructor() {
        super('PresenceCheckerCP');
        // Initialize ports
        this.addPort('detected', 'Boolean', 'in');
    }
}

class CommanderCP extends SysADLComponent {
    constructor() {
        super('CommanderCP');
        // Initialize ports
        this.addPort('target2', 'CelsiusTemperature', 'in');
    }
}

class SensorsMonitorCP extends SysADLComponent {
    constructor() {
        super('SensorsMonitorCP');
        // Initialize ports
        this.addPort('s1', 'CelsiusTemperature', 'in');
    }
}

// Connectors
class FahrenheitToCelsiusCN {
    constructor() {
        this.participants = new Map();
        this.participants.set('Ft', null);
    }
    connectFt_Ct() {
        const source = this.participants.get('Ft');
        const target = this.participants.get('Ct');
        if (source && target) {
            source.subscribe('Ft', null, target, data => target.receive('Ct', null, data));
        }
    }
    setParticipant(name, component) {
        this.participants.set(name, component);
    }
}

class PresenceCN {
    constructor() {
        this.participants = new Map();
        this.participants.set('pOut', null);
    }
    connectpOut_pIn() {
        const source = this.participants.get('pOut');
        const target = this.participants.get('pIn');
        if (source && target) {
            source.subscribe('pOut', null, target, data => target.receive('pIn', null, data));
        }
    }
    setParticipant(name, component) {
        this.participants.set(name, component);
    }
}

class CommandCN {
    constructor() {
        this.participants = new Map();
        this.participants.set('commandOut', null);
    }
    connectcommandOut_commandIn() {
        const source = this.participants.get('commandOut');
        const target = this.participants.get('commandIn');
        if (source && target) {
            source.subscribe('commandOut', null, target, data => target.receive('commandIn', null, data));
        }
    }
    setParticipant(name, component) {
        this.participants.set(name, component);
    }
}

class CTemperatureCN {
    constructor() {
        this.participants = new Map();
        this.participants.set('CtOut', null);
    }
    connectCtOut_ctIn() {
        const source = this.participants.get('CtOut');
        const target = this.participants.get('ctIn');
        if (source && target) {
            source.subscribe('CtOut', null, target, data => target.receive('ctIn', null, data));
        }
    }
    setParticipant(name, component) {
        this.participants.set(name, component);
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
    if(presence === true) return userTemp; else return 2;
    return params.result ?? null;

}

function CompareTemperatureEx(params = {}) {
    let target = params["target"] ?? null;
    let average = params["average"] ?? null;
    let heater = types.Command.Off;;     let cooler = types.Command.Off;; if(average > target) {heater = types.Command.Off; cooler = types.Command.On ;
    }
    return params.result ?? null;

}

// Constraints
function validateCalculateAverageTemperatureEQ(params = {}) {
    let t1 = params["t1"] ?? null;
    let t2 = params["t2"] ?? null;
    let av = params["av"] ?? null;
    const result = params["av"] === (params["t1"] + params["t2"])/2
	;
    if (!result) {
        throw new Error('Constraint CalculateAverageTemperatureEQ violated');
    }
    return result;
}

function validateCompareTemperatureEQ(params = {}) {
    let target = params["target"] ?? null;
    let average = params["average"] ?? null;
    let cmds = params["cmds"] ?? new Commands();
    const result = params["average"] > params["target"] ? params["cmds"] === params["types"].Commands.params["heater"].params["Off"] && types.Commands.params["cooler"].params["On"] : types.Commands.params["heater"].On && cmds === types.Commands.params["cooler"].Off ;
    if (!result) {
        throw new Error('Constraint CompareTemperatureEQ violated');
    }
    return result;
}

function validateFahrenheitToCelsiusEQ(params = {}) {
    let f = params["f"] ?? null;
    let c = params["c"] ?? null;
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
    let detected = params["detected"] ?? null;
    let userTemp = params["userTemp"] ?? null;
    let target = params["target"] ?? null;
    const result = params["detected"] === true ? params["target"] === params["userTemp"] : target === 2 ;
    if (!result) {
        throw new Error('Constraint CheckPresenceToSetTemperatureEQ violated');
    }
    return result;
}

// System Initialization
class SysADLModel extends SysADLComponent {
    constructor() {
        super('SysADLModel');
        // Initialize top-level components
        this.subComponents.set('RTCSystemCFD', new RTCSystemCFD());
        this.subComponents.set('RoomTemperatureControllerCP', new RoomTemperatureControllerCP());
        this.subComponents.set('TemperatureSensorCP', new TemperatureSensorCP());
        this.subComponents.set('PresenceSensorCP', new PresenceSensorCP());
        this.subComponents.set('UserInterfaceCP', new UserInterfaceCP());
        this.subComponents.set('HeaterCP', new HeaterCP());
        this.subComponents.set('CoolerCP', new CoolerCP());
        this.subComponents.set('PresenceCheckerCP', new PresenceCheckerCP());
        this.subComponents.set('CommanderCP', new CommanderCP());
        this.subComponents.set('SensorsMonitorCP', new SensorsMonitorCP());
        this.connectors.set('FahrenheitToCelsiusCN', new FahrenheitToCelsiusCN());
        this.connectors.get('FahrenheitToCelsiusCN').setParticipant('Ft', this.subComponents.get('RTCSystemCFD'));
        this.connectors.get('FahrenheitToCelsiusCN').connectFt_Ct();
        this.connectors.set('PresenceCN', new PresenceCN());
        this.connectors.get('PresenceCN').setParticipant('pOut', this.subComponents.get('PresenceSensorCP'));
        this.connectors.get('PresenceCN').connectpOut_pIn();
        this.connectors.set('CommandCN', new CommandCN());
        this.connectors.get('CommandCN').connectcommandOut_commandIn();
        this.connectors.set('CTemperatureCN', new CTemperatureCN());
        this.connectors.get('CTemperatureCN').setParticipant('CtOut', this.subComponents.get('UserInterfaceCP'));
        this.connectors.get('CTemperatureCN').connectCtOut_ctIn();
    }

    async run() {
        console.log('Running system SysADLModel');
        await this.subComponents.get('FahrenheitToCelsiusCN').executeFahrenheitToCelsiusAC();
        try {
            validateCalculateAverageTemperatureEQ({});
        } catch (e) {
            console.error(e.message);
        }
        try {
            validateCompareTemperatureEQ({});
        } catch (e) {
            console.error(e.message);
        }
        try {
            validateFahrenheitToCelsiusEQ({});
        } catch (e) {
            console.error(e.message);
        }
        try {
            validateCommandHeaterEQ({});
        } catch (e) {
            console.error(e.message);
        }
        try {
            validateCommandCoolerEQ({});
        } catch (e) {
            console.error(e.message);
        }
        try {
            validateCheckPresenceToSetTemperatureEQ({});
        } catch (e) {
            console.error(e.message);
        }
    }
}

const system = new SysADLModel();
system.run().catch(err => console.error(err));

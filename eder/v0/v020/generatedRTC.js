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
            source.subscribe('Ft', null, target, data => target.receive('Ct', data));
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
            source.subscribe('pOut', null, target, data => target.receive('pIn', data));
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
            source.subscribe('commandOut', null, target, data => target.receive('commandIn', data));
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
            source.subscribe('CtOut', null, target, data => target.receive('ctIn', data));
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
    const result = params["average"] > params["target"] ? params["cmds"] === Command.heater.params["Off"] && Command.On : Command.params["heater"].On && cmds === Command.params["cooler"].Off ;
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
    const result = params["detected"] === true ? params["target"] === params["userTemp"] : target === 2 ;
    if (!result) {
        throw new Error('Constraint CheckPresenceToSetTemperatureEQ violated');
    }
    return result;
}

// System Initialization
class SysADLModel extends SysADLComponent {
    constructor(config = {}) {
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
        const RoomTemperatureControllerCP_detectedRTC = config["detectedRTC"] ?? false;
        this.subComponents.get('RoomTemperatureControllerCP').receive('detectedRTC', RoomTemperatureControllerCP_detectedRTC);
        const RoomTemperatureControllerCP_s1 = config["s1"] ?? 20;
        this.subComponents.get('RoomTemperatureControllerCP').receive('s1', RoomTemperatureControllerCP_s1);
        const HeaterCP_controllerH = config["controllerH"] ?? Command.Off;
        this.subComponents.get('HeaterCP').receive('controllerH', HeaterCP_controllerH);
        const CoolerCP_controllerC = config["controllerC"] ?? Command.Off;
        this.subComponents.get('CoolerCP').receive('controllerC', CoolerCP_controllerC);
        const PresenceCheckerCP_detected = config["detected"] ?? false;
        this.subComponents.get('PresenceCheckerCP').receive('detected', PresenceCheckerCP_detected);
        const CommanderCP_target2 = config["target2"] ?? 20;
        this.subComponents.get('CommanderCP').receive('target2', CommanderCP_target2);
        const SensorsMonitorCP_s1 = config["s1"] ?? 20;
        this.subComponents.get('SensorsMonitorCP').receive('s1', SensorsMonitorCP_s1);
        this.connectors.get('FahrenheitToCelsiusCN').connectFt_Ct();
        this.connectors.get('PresenceCN').connectpOut_pIn();
        this.connectors.get('CommandCN').connectcommandOut_commandIn();
        this.connectors.get('CTemperatureCN').connectCtOut_ctIn();
    }

    async run() {
        console.log('Running system SysADLModel');
        // Step 1: Process inputs and calculate results
        const RoomTemperatureControllerCP_detectedRTC = this.subComponents.get('RoomTemperatureControllerCP').state.detectedRTC ?? null;
        const RoomTemperatureControllerCP_s1 = this.subComponents.get('RoomTemperatureControllerCP').state.s1 ?? null;
        const HeaterCP_controllerH = this.subComponents.get('HeaterCP').state.controllerH ?? null;
        const CoolerCP_controllerC = this.subComponents.get('CoolerCP').state.controllerC ?? null;
        const PresenceCheckerCP_detected = this.subComponents.get('PresenceCheckerCP').state.detected ?? null;
        const CommanderCP_target2 = this.subComponents.get('CommanderCP').state.target2 ?? null;
        const SensorsMonitorCP_s1 = this.subComponents.get('SensorsMonitorCP').state.s1 ?? null;
        const CommandCoolerEx_result = CommandCoolerEx({  });
        console.log('CommandCoolerEx result: ' + JSON.stringify(CommandCoolerEx_result));
        const CommandHeaterEx_result = CommandHeaterEx({  });
        console.log('CommandHeaterEx result: ' + JSON.stringify(CommandHeaterEx_result));
        const FahrenheitToCelsiusEx_result = FahrenheitToCelsiusEx({  });
        console.log('FahrenheitToCelsiusEx result: ' + JSON.stringify(FahrenheitToCelsiusEx_result));
        const CalculateAverageTemperatureEx_result = CalculateAverageTemperatureEx({  });
        console.log('CalculateAverageTemperatureEx result: ' + JSON.stringify(CalculateAverageTemperatureEx_result));
        const CheckPresenceToSetTemperature_result = CheckPresenceToSetTemperature({  });
        console.log('CheckPresenceToSetTemperature result: ' + JSON.stringify(CheckPresenceToSetTemperature_result));
        const CompareTemperatureEx_result = CompareTemperatureEx({  });
        console.log('CompareTemperatureEx result: ' + JSON.stringify(CompareTemperatureEx_result));
        try {
            validateCalculateAverageTemperatureEQ({  });
            console.log('Constraint CalculateAverageTemperatureEQ satisfied');
        } catch (e) {
            console.error(e.message);
        }
        try {
            validateCompareTemperatureEQ({  });
            console.log('Constraint CompareTemperatureEQ satisfied');
        } catch (e) {
            console.error(e.message);
        }
        try {
            validateFahrenheitToCelsiusEQ({  });
            console.log('Constraint FahrenheitToCelsiusEQ satisfied');
        } catch (e) {
            console.error(e.message);
        }
        try {
            validateCommandHeaterEQ({  });
            console.log('Constraint CommandHeaterEQ satisfied');
        } catch (e) {
            console.error(e.message);
        }
        try {
            validateCommandCoolerEQ({  });
            console.log('Constraint CommandCoolerEQ satisfied');
        } catch (e) {
            console.error(e.message);
        }
        try {
            validateCheckPresenceToSetTemperatureEQ({  });
            console.log('Constraint CheckPresenceToSetTemperatureEQ satisfied');
        } catch (e) {
            console.error(e.message);
        }
    }
}

const config = {
    detectedRTC: process.argv[2] || false,
    s1: process.argv[3] || 20,
    controllerH: process.argv[4] || Command.Off,
    controllerC: process.argv[5] || Command.Off,
    detected: process.argv[6] || false,
    target2: process.argv[7] || 20,
};
const system = new SysADLModel(config);
system.run().catch(err => console.error(err));

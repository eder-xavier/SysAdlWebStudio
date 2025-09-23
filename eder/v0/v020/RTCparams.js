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
        this.cooler = params.cooler ?? null;
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
                const subPortDef = [
                    {"name":"FTemperatureOPT","flows":[{"direction":"out","type":"FahrenheitTemperature"}],"subPorts":[]},
                    {"name":"PresenceIPT","flows":[{"direction":"in","type":"Boolean"}],"subPorts":[]},
                    {"name":"PresenceOPT","flows":[{"direction":"out","type":"Boolean"}],"subPorts":[]},
                    {"name":"CTemperatureIPT","flows":[{"direction":"in","type":"CelsiusTemperature"}],"subPorts":[]},
                    {"name":"CommandIPT","flows":[{"direction":"in","type":"Command"}],"subPorts":[]},
                    {"name":"CommandOPT","flows":[{"direction":"out","type":"Command"}],"subPorts":[]},
                    {"name":"CTemperatureOPT","flows":[{"direction":"out","type":"CelsiusTemperature"}],"subPorts":[]}
                ].find(p => p.name === sp.type);
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
        this.addPort('current1', 'FahrenheitTemperature', 'out');
    }
}

class RoomTemperatureControllerCP extends SysADLComponent {
    constructor() {
        super('RoomTemperatureControllerCP');
        this.addPort('detectedRTC', 'Boolean', 'in');
        this.addPort('s1', 'CelsiusTemperature', 'in');
        this.addPort('controllerH', 'Command', 'out');
        this.addPort('controllerC', 'Command', 'out');
    }
}

class TemperatureSensorCP extends SysADLComponent {
    constructor() {
        super('TemperatureSensorCP');
        this.addPort('current', 'FahrenheitTemperature', 'out');
    }
}

class PresenceSensorCP extends SysADLComponent {
    constructor() {
        super('PresenceSensorCP');
        this.addPort('detected', 'Boolean', 'out');
    }
}

class UserInterfaceCP extends SysADLComponent {
    constructor() {
        super('UserInterfaceCP');
        this.addPort('desired', 'CelsiusTemperature', 'out');
    }
}

class HeaterCP extends SysADLComponent {
    constructor() {
        super('HeaterCP');
        this.addPort('controllerH', 'Command', 'in');
    }
}

class CoolerCP extends SysADLComponent {
    constructor() {
        super('CoolerCP');
        this.addPort('controllerC', 'Command', 'in');
    }
}

class PresenceCheckerCP extends SysADLComponent {
    constructor() {
        super('PresenceCheckerCP');
        this.addPort('detected', 'Boolean', 'in');
        this.addPort('target', 'CelsiusTemperature', 'out');
    }
}

class CommanderCP extends SysADLComponent {
    constructor() {
        super('CommanderCP');
        this.addPort('target2', 'CelsiusTemperature', 'in');
        this.addPort('controllerH', 'Command', 'out');
        this.addPort('controllerC', 'Command', 'out');
    }
}

class SensorsMonitorCP extends SysADLComponent {
    constructor() {
        super('SensorsMonitorCP');
        this.addPort('s1', 'CelsiusTemperature', 'in');
        this.addPort('average', 'CelsiusTemperature', 'out');
    }
}

// Connectors
class FahrenheitToCelsiusCN {
    constructor() {
        this.participants = new Map();
        this.participants.set('Ft', null);
        this.participants.set('Ct', null);
    }
    connectFt_Ct() {
        const source = this.participants.get('Ft');
        const target = this.participants.get('Ct');
        if (source && target) {
            source.subscribe('current', null, target, data => {
                const celsius = FahrenheitToCelsiusEx({ f: data });
                target.receive('s1', celsius);
            });
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
        this.participants.set('pIn', null);
    }
    connectpOut_pIn() {
        const source = this.participants.get('pOut');
        const target = this.participants.get('pIn');
        if (source && target) {
            source.subscribe('detected', null, target, data => target.receive('detectedRTC', data));
        }
    }
    setParticipant(name, component) {
        this.participants.set(name, component);
    }
}

class CommandCN {
    constructor() {
        this.participants = new Map();
        this.participants.set('commandOutH', null);
        this.participants.set('commandOutC', null);
        this.participants.set('commandInH', null);
        this.participants.set('commandInC', null);
    }
    connectcommandOut_commandIn() {
        const sourceH = this.participants.get('commandOutH');
        const targetH = this.participants.get('commandInH');
        const sourceC = this.participants.get('commandOutC');
        const targetC = this.participants.get('commandInC');
        if (sourceH && targetH) {
            sourceH.subscribe('controllerH', null, targetH, data => targetH.receive('controllerH', data));
        }
        if (sourceC && targetC) {
            sourceC.subscribe('controllerC', null, targetC, data => targetC.receive('controllerC', data));
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
        this.participants.set('ctIn', null);
    }
    connectCtOut_ctIn() {
        const source = this.participants.get('CtOut');
        const target = this.participants.get('ctIn');
        if (source && target) {
            source.subscribe('desired', null, target, data => {
                const targetTemp = CheckPresenceToSetTemperature({ userTemp: data, presence: target.state.detectedRTC });
                target.receive('target2', targetTemp);
            });
        }
    }
    setParticipant(name, component) {
        this.participants.set(name, component);
    }
}

// Executables
function CommandCoolerEx(params = {}) {
    let cmds = params["cmds"] ?? new Commands();
    return cmds.cooler || Command.Off;
}

function CommandHeaterEx(params = {}) {
    let cmds = params["cmds"] ?? new Commands();
    return cmds.heater || Command.Off;
}

function FahrenheitToCelsiusEx(params = {}) {
    let f = params["f"] ?? 32; // Default to 32°F (0°C)
    return (5 * (f - 32)) / 9;
}

function CalculateAverageTemperatureEx(params = {}) {
    let temp1 = params["temp1"] ?? 0;
    let temp2 = params["temp2"] ?? 0;
    return (temp1 + temp2) / 2;
}

function CheckPresenceToSetTemperature(params = {}) {
    let userTemp = params["userTemp"] ?? 20; // Default to 20°C
    let presence = params["presence"] ?? false;
    return presence ? userTemp : 2;
}

function CompareTemperatureEx(params = {}) {
    let target = params["target"] ?? 20; // Default to 20°C
    let average = params["average"] ?? 20;
    let heater = Command.Off;
    let cooler = Command.Off;
    if (average > target) {
        heater = Command.Off;
        cooler = Command.On;
    } else {
        heater = Command.On;
        cooler = Command.Off;
    }
    return new Commands({ heater, cooler });
}

// Constraints
function validateCalculateAverageTemperatureEQ(params = {}) {
    let t1 = params["t1"] ?? 0;
    let t2 = params["t2"] ?? 0;
    let av = params["av"] ?? 0;
    const result = av === (t1 + t2) / 2;
    if (!result) {
        throw new Error('Constraint CalculateAverageTemperatureEQ violated');
    }
    return result;
}

function validateCompareTemperatureEQ(params = {}) {
    let target = params["target"] ?? 20;
    let average = params["average"] ?? 20;
    let cmds = params["cmds"] ?? new Commands({ heater: Command.Off, cooler: Command.Off });
    const result = average > target
        ? (cmds.heater === Command.Off && cmds.cooler === Command.On)
        : (cmds.heater === Command.On && cmds.cooler === Command.Off);
    if (!result) {
        throw new Error('Constraint CompareTemperatureEQ violated');
    }
    return result;
}

function validateFahrenheitToCelsiusEQ(params = {}) {
    let f = params["f"] ?? 32;
    let c = params["c"] ?? 0;
    const result = c === (5 * (f - 32)) / 9;
    if (!result) {
        throw new Error('Constraint FahrenheitToCelsiusEQ violated');
    }
    return result;
}

function validateCommandHeaterEQ(params = {}) {
    let cmds = params["cmds"] ?? new Commands();
    let c = params["c"] ?? Command.Off;
    const result = c === (cmds.heater || Command.Off);
    if (!result) {
        throw new Error('Constraint CommandHeaterEQ violated');
    }
    return result;
}

function validateCommandCoolerEQ(params = {}) {
    let cmds = params["cmds"] ?? new Commands();
    let c = params["c"] ?? Command.Off;
    const result = c === (cmds.cooler || Command.Off);
    if (!result) {
        throw new Error('Constraint CommandCoolerEQ violated');
    }
    return result;
}

function validateCheckPresenceToSetTemperatureEQ(params = {}) {
    let detected = params["detected"] ?? false;
    let userTemp = params["userTemp"] ?? 70;
    let target = params["target"] ?? 2;
    const result = detected ? target === userTemp : target === 2;
    if (!result) {
        throw new Error('Constraint CheckPresenceToSetTemperatureEQ violated');
    }
    return result;
}


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

        // Initialize connectors
        this.connectors.set('FahrenheitToCelsiusCN', new FahrenheitToCelsiusCN());
        this.connectors.get('FahrenheitToCelsiusCN').setParticipant('Ft', this.subComponents.get('TemperatureSensorCP'));
        this.connectors.get('FahrenheitToCelsiusCN').setParticipant('Ct', this.subComponents.get('SensorsMonitorCP'));
        this.connectors.get('FahrenheitToCelsiusCN').connectFt_Ct();

        this.connectors.set('PresenceCN', new PresenceCN());
        this.connectors.get('PresenceCN').setParticipant('pOut', this.subComponents.get('PresenceSensorCP'));
        this.connectors.get('PresenceCN').setParticipant('pIn', this.subComponents.get('PresenceCheckerCP'));
        this.connectors.get('PresenceCN').connectpOut_pIn();

        this.connectors.set('CommandCN', new CommandCN());
        this.connectors.get('CommandCN').setParticipant('commandOutH', this.subComponents.get('CommanderCP'));
        this.connectors.get('CommandCN').setParticipant('commandOutC', this.subComponents.get('CommanderCP'));
        this.connectors.get('CommandCN').setParticipant('commandInH', this.subComponents.get('HeaterCP'));
        this.connectors.get('CommandCN').setParticipant('commandInC', this.subComponents.get('CoolerCP'));
        this.connectors.get('CommandCN').connectcommandOut_commandIn();

        this.connectors.set('CTemperatureCN', new CTemperatureCN());
        this.connectors.get('CTemperatureCN').setParticipant('CtOut', this.subComponents.get('UserInterfaceCP'));
        this.connectors.get('CTemperatureCN').setParticipant('ctIn', this.subComponents.get('PresenceCheckerCP'));
        this.connectors.get('CTemperatureCN').connectCtOut_ctIn();

        // Set initial parameters
        const currentTemp = config.currentTemperature ?? 77; //  77°F (25°C)
        const desiredTemp = config.desiredTemperature ?? 22; // 22°C
        const presenceDetected = config.presenceDetected ?? true;

        this.subComponents.get('TemperatureSensorCP').receive('current', currentTemp);
        this.subComponents.get('UserInterfaceCP').receive('desired', desiredTemp);
        this.subComponents.get('PresenceSensorCP').receive('detected', presenceDetected);

        // Propagate initial values
        this.connectors.get('FahrenheitToCelsiusCN').connectFt_Ct();
        this.connectors.get('PresenceCN').connectpOut_pIn();
        this.connectors.get('CTemperatureCN').connectCtOut_ctIn();
    }

    async run() {
        console.log('Running system SysADLModel');

        // Step 1: Calculate average temperature
        const temp1 = this.subComponents.get('SensorsMonitorCP').state.s1 || 20;
        const temp2 = this.subComponents.get('SensorsMonitorCP').state.s1 || 20; // Assuming single sensor for simplicity
        const averageTemp = CalculateAverageTemperatureEx({ temp1, temp2 });
        this.subComponents.get('SensorsMonitorCP').receive('average', averageTemp);
        console.log(`Average Temperature: ${averageTemp}°C`);

        try {
            validateCalculateAverageTemperatureEQ({ t1: temp1, t2: temp2, av: averageTemp });
            console.log('Constraint CalculateAverageTemperatureEQ satisfied');
        } catch (e) {
            console.error(e.message);
        }

        // Step 2: Check presence and set target temperature
        const presence = this.subComponents.get('PresenceCheckerCP').state.detectedRTC;
        const userTemp = this.subComponents.get('PresenceCheckerCP').state.desired || 20;
        const targetTemp = CheckPresenceToSetTemperature({ userTemp, presence });
        this.subComponents.get('PresenceCheckerCP').receive('target', targetTemp);
        console.log(`Target Temperature: ${targetTemp}°C`);

        try {
            validateCheckPresenceToSetTemperatureEQ({ detected: presence, userTemp, target: targetTemp });
            console.log('Constraint CheckPresenceToSetTemperatureEQ satisfied');
        } catch (e) {
            console.error(e.message);
        }

        // Step 3: Compare temperature and set commands
        const cmds = CompareTemperatureEx({ target: targetTemp, average: averageTemp });
        this.subComponents.get('CommanderCP').receive('controllerH', cmds.heater);
        this.subComponents.get('CommanderCP').receive('controllerC', cmds.cooler);
        console.log(`Commands: Heater=${cmds.heater}, Cooler=${cmds.cooler}`);

        try {
            validateCompareTemperatureEQ({ target: targetTemp, average: averageTemp, cmds });
            console.log('Constraint CompareTemperatureEQ satisfied');
        } catch (e) {
            console.error(e.message);
        }

        try {
            validateCommandHeaterEQ({ cmds, c: cmds.heater });
            console.log('Constraint CommandHeaterEQ satisfied');
        } catch (e) {
            console.error(e.message);
        }

        try {
            validateCommandCoolerEQ({ cmds, c: cmds.cooler });
            console.log('Constraint CommandCoolerEQ satisfied');
        } catch (e) {
            console.error(e.message);
        }

        // Step 4: Propagate commands
        this.connectors.get('CommandCN').connectcommandOut_commandIn();
        console.log(`Heater Command: ${this.subComponents.get('HeaterCP').state.controllerH}`);
        console.log(`Cooler Command: ${this.subComponents.get('CoolerCP').state.controllerC}`);
    }
}

// Node.js execution
const config = {
    currentTemperature: parseFloat(process.argv[2]) || 77, // Fahrenheit
    desiredTemperature: parseFloat(process.argv[3]) || 22, // Celsius
    presenceDetected: process.argv[4] === 'false' || false
};

const system = new SysADLModel(config);
system.run().catch(err => console.error(err));
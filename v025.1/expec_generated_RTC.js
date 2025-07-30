// @ts-nocheck
// Generated JavaScript code for SysADL Model: RTC

// Model Metadata
const modelPorts = [
    {"name":"FTemperatureOPT","flows":[{"direction":"out","type":"FahrenheitTemperature"}],"subPorts":[]},
    {"name":"PresenceIPT","flows":[{"direction":"in","type":"Boolean"}],"subPorts":[]},
    {"name":"PresenceOPT","flows":[{"direction":"out","type":"Boolean"}],"subPorts":[]},
    {"name":"CTemperatureIPT","flows":[{"direction":"in","type":"CelsiusTemperature"}],"subPorts":[]},
    {"name":"CommandIPT","flows":[{"direction":"in","type":"Command"}],"subPorts":[]},
    {"name":"CommandOPT","flows":[{"direction":"out","type":"Command"}],"subPorts":[]},
    {"name":"CTemperatureOPT","flows":[{"direction":"out","type":"CelsiusTemperature"}],"subPorts":[]}
];
const modelTypes = [
    {"kind":"value type","name":"Int","extends":null,"content":""},
    {"kind":"value type","name":"Boolean","extends":null,"content":""},
    {"kind":"value type","name":"String","extends":null,"content":""},
    {"kind":"value type","name":"Void","extends":null,"content":""},
    {"kind":"value type","name":"Real","extends":null,"content":""},
    {"kind":"enum","name":"Command","extends":null,"content":"On , Off"},
    {"kind":"datatype","name":"Commands","extends":null,"content":"attributes : heater : Command ; cooler : Command ;"},
    {"kind":"value type","name":"temperature","extends":"Real","content":"dimension = Temperature"},
    {"kind":"value type","name":"FahrenheitTemperature","extends":"temperature","content":"unit = Fahrenheit dimension = Temperature"},
    {"kind":"value type","name":"CelsiusTemperature","extends":"temperature","content":"unit = Celsius dimension = Temperature"}
];

// Types
const Int = 'any'; // Value type
const Boolean = 'any'; // Value type
const String = 'any'; // Value type
const Void = 'any'; // Value type
const Real = 'any'; // Value type
const Command = Object.freeze({ On: 'On', Off: 'Off' });
class Commands {
    constructor(params = {}) {
        this.heater = params.heater ?? Command.Off;
        this.cooler = params.cooler ?? Command.Off;
    }
}
const temperature = 'any'; // Value type
const FahrenheitTemperature = 'any'; // Value type
const CelsiusTemperature = 'any'; // Value type

// Base Port Class
class SysADLPort {
    constructor(name, type, direction = 'inout', subPorts = [], flowType = 'any', component = null) {
        console.log(`Initializing port ${name} with type ${type}, direction ${direction}, flowType ${flowType}`);
        this.name = name;
        this.type = type;
        this.direction = direction;
        this.flowType = flowType || 'any';
        this.value = null;
        this.component = component;
        this.subPorts = new Map(subPorts.map(sp => {
            console.log(`Initializing subPort ${sp.name} with type ${sp.type}, flowType ${sp.flowType || 'any'}`);
            return [sp.name, sp];
        }));
        this.connector = null;
    }

    async send(data, subPortName = null) {
        console.log(`Port ${this.name} sending data: ${JSON.stringify(data)}${subPortName ? ' via subPort ' + subPortName : ''}`);
        if (this.subPorts.size > 0 && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'out' && subPort.direction !== 'inout')) {
                console.error(`Cannot send via subPort ${subPortName} in ${this.name}: invalid direction`);
                return false;
            }
            subPort.value = data;
            if (subPort.connector) await subPort.connector.transmit(data);
            return true;
        }
        if (this.direction !== 'out' && this.direction !== 'inout') {
            console.error(`Cannot send via ${this.name}: invalid direction (${this.direction})`);
            return false;
        }
        if (!this.connector) {
            console.warn(`No connector attached to ${this.name}; data not sent`);
            return false;
        }
        this.value = data;
        await this.connector.transmit(data);
        return true;
    }

    async receive(data, subPortName = null) {
        console.log(`Port ${this.name} receiving data: ${JSON.stringify(data)}${subPortName ? ' via subPort ' + subPortName : ''}`);
        if (this.subPorts.size > 0 && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'in' && subPort.direction !== 'inout')) {
                console.error(`Cannot receive via subPort ${subPortName} in ${this.name}: invalid direction`);
                return false;
            }
            subPort.value = data;
            if (this.component) {
                await this.component.onDataReceived(subPort.name, data);
            }
            return true;
        }
        if (this.direction !== 'in' && this.direction !== 'inout') {
            console.error(`Cannot receive via ${this.name}: invalid direction (${this.direction})`);
            return false;
        }
        this.value = data;
        if (this.component) {
            await this.component.onDataReceived(this.name, data);
        }
        return true;
    }

    getValue() {
        return this.value;
    }
}

// Base Connector Class
class SysADLConnector {
    constructor(name, flows = []) {
        console.log(`Initializing connector ${name}`);
        this.name = name;
        this.flows = flows;
        this.messageQueue = [];
        this.isProcessing = false;
    }

    async transmit(data) {
        console.log(`Connector ${this.name} transmitting data: ${JSON.stringify(data)}`);
        this.messageQueue.push(data);
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.messageQueue.length > 0) {
            const currentData = this.messageQueue.shift();
            for (const flow of this.flows) {
                console.log(`Connector ${this.name} processing flow from ${flow.source} to ${flow.target}, type: ${flow.type}`);
                if (flow.targetPort) {
                    await flow.targetPort.receive(currentData);
                } else {
                    console.warn(`No target port defined for flow from ${flow.source} to ${flow.target}`);
                }
            }
        }
        this.isProcessing = false;
    }
}

// Binding Class
class Binding {
    constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {
        console.log(`Creating binding from ${sourceComponent.name}.${sourcePort.name} to ${targetComponent.name}.${targetPort.name} via connector ${connector.name}`);
        this.sourceComponent = sourceComponent;
        this.sourcePort = sourcePort;
        this.targetComponent = targetComponent;
        this.targetPort = targetPort;
        this.connector = connector;
        this.sourcePort.connector = connector;
        connector.flows.push({ source: sourcePort.name, target: targetPort.name, type: sourcePort.flowType || 'any', targetPort: this.targetPort });
    }

    async transmit(data) {
        console.log(`Binding transmitting data ${JSON.stringify(data)} from ${this.sourceComponent.name}.${this.sourcePort.name} to ${this.targetComponent.name}.${this.targetPort.name}`);
        await this.connector.transmit(data);
    }
}

// Connector Classes
class FahrenheitToCelsiusCN extends SysADLConnector {
    constructor() {
        super('FahrenheitToCelsiusCN', [
            { type: 'FahrenheitTemperature', source: 'Ft', target: 'Ct' }
        ]);
    }
}

class PresenceCN extends SysADLConnector {
    constructor() {
        super('PresenceCN', [
            { type: 'Boolean', source: 'pOut', target: 'pIn' }
        ]);
    }
}

class CommandCN extends SysADLConnector {
    constructor() {
        super('CommandCN', [
            { type: 'Command', source: 'commandOut', target: 'commandIn' }
        ]);
    }
}

class CTemperatureCN extends SysADLConnector {
    constructor() {
        super('CTemperatureCN', [
            { type: 'CelsiusTemperature', source: 'CtOut', target: 'ctIn' }
        ]);
    }
}

// Base Component Class
class SysADLComponent {
    constructor(name, isBoundary = false, modelPorts = [], modelTypes = []) {
        console.log(`Initializing component ${name}, isBoundary: ${isBoundary}`);
        this.name = name;
        this.isBoundary = isBoundary;
        this.ports = [];
        this.state = {};
        this.activities = [];
        this.modelPorts = modelPorts;
        this.modelTypes = modelTypes;
        this.subComponents = new Map();
    }

    async addPort(port) {
        port.component = this;
        this.ports.push(port);
        console.log(`Port ${port.name} added to component ${this.name}, flowType: ${port.flowType}`);
    }

    async addSubComponent(name, component) {
        this.subComponents.set(name, component);
        console.log(`SubComponent ${name} added to ${this.name}`);
    }

    async onDataReceived(portName, data) {
        console.log(`Component ${this.name} received data on port ${portName}: ${JSON.stringify(data)}`);
        this.state[portName] = data;
        console.log(`Processing activities for component ${this.name} due to data on ${portName}`);
        for (const activity of this.activities) {
            console.log(`Triggering activity ${activity.methodName} in component ${this.name}`);
            await this[activity.methodName]();
        }
        for (const [subCompName, subComp] of this.subComponents) {
            for (const activity of subComp.activities) {
                console.log(`Triggering subcomponent activity ${subCompName}.${activity.methodName}`);
                await this[`${subCompName}_execute`](activity.methodName);
            }
        }
    }

    async start() {
        console.log(`Starting component ${this.name}`);
        if (this.isBoundary) {
            await this.simulateInput();
        }
        for (const subComp of this.subComponents.values()) {
            await subComp.start();
        }
    }

    async simulateInput() {
        console.log(`Simulating input for component ${this.name}`);
        for (const port of this.ports) {
            console.log(`Processing port ${port.name} with type ${port.type}, flowType: ${port.flowType}`);
            if (!port.flowType || typeof port.flowType !== 'string') {
                console.warn(`Skipping port ${port.name} due to invalid flowType: ${port.flowType}`);
                continue;
            }
            let simulatedValue;
            if (port.flowType.includes('emperature') || port.flowType === 'Real' || port.flowType === 'Int') {
                simulatedValue = 42.0;
                console.log(`Simulating number input ${simulatedValue} for ${this.name}.${port.name}`);
            } else if (port.flowType === 'Boolean') {
                simulatedValue = true;
                console.log(`Simulating boolean input ${simulatedValue} for ${this.name}.${port.name}`);
            } else if (this.modelTypes.find(t => t.name === port.flowType && t.kind === 'enum')) {
                const enumValues = this.modelTypes.find(t => t.name === port.flowType)?.content.match(/(\w+)/g) || ['Off'];
                simulatedValue = Command[enumValues[0]];
                console.log(`Simulating enum input ${simulatedValue} for ${this.name}.${port.name}`);
            } else if (this.modelTypes.find(t => t.name === port.flowType && t.kind === 'datatype')) {
                simulatedValue = new Commands({});
                console.log(`Simulating datatype input for ${this.name}.${port.name}`);
            } else {
                console.warn(`Unsupported flow type ${port.flowType} for port ${this.name}.${port.name}`);
                continue;
            }
            await this.onDataReceived(port.name, simulatedValue);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// Component Classes
class RTCSystemCFD extends SysADLComponent {
    constructor() {
        super('RTCSystemCFD', true, modelPorts, modelTypes);
        this.addPort(new SysADLPort('current1', 'FTemperatureOPT', 'out', [], 'FahrenheitTemperature'));
        this.addPort(new SysADLPort('current2', 'FTemperatureOPT', 'out', [], 'FahrenheitTemperature'));
        this.addPort(new SysADLPort('detected', 'PresenceOPT', 'out', [], 'Boolean'));
        this.addPort(new SysADLPort('desired', 'CTemperatureOPT', 'out', [], 'CelsiusTemperature'));

        this.state['current1'] = null;
        this.state['current2'] = null;
        this.state['detected'] = false;
        this.state['desired'] = null;
    }
}

class RoomTemperatureControllerCP extends SysADLComponent {
    constructor() {
        super('RoomTemperatureControllerCP', false, modelPorts, modelTypes);
        this.addPort(new SysADLPort('detectedRTC', 'PresenceIPT', 'in', [], 'Boolean'));
        this.addPort(new SysADLPort('s1', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('s2', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('desiredRTC', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('commandH', 'CommandOPT', 'out', [], 'Command'));
        this.addPort(new SysADLPort('commandC', 'CommandOPT', 'out', [], 'Command'));

        this.S1 = new TemperatureSensorCP();
        this.addSubComponent('S1', this.S1);
        this.S2 = new TemperatureSensorCP();
        this.addSubComponent('S2', this.S2);
        this.sensorsMonitor = new SensorsMonitorCP();
        this.addSubComponent('sensorsMonitor', this.sensorsMonitor);
        this.presenceChecker = new PresenceCheckerCP();
        this.addSubComponent('presenceChecker', this.presenceChecker);
        this.userInterface = new UserInterfaceCP();
        this.addSubComponent('userInterface', this.userInterface);
        this.commander = new CommanderCP();
        this.addSubComponent('commander', this.commander);
        this.heater = new HeaterCP();
        this.addSubComponent('heater', this.heater);
        this.cooler = new CoolerCP();
        this.addSubComponent('cooler', this.cooler);

        this.state['detectedRTC'] = false;
        this.state['s1'] = null;
        this.state['s2'] = null;
        this.state['desiredRTC'] = null;
        this.state['commandH'] = Command.Off;
        this.state['commandC'] = Command.Off;

        this.activities.push({ methodName: 'executeControlTemperature' });
        this.sensorsMonitor.activities.forEach(activity => this.activities.push({ methodName: `sensorsMonitor_execute_${activity.methodName}` }));
        this.presenceChecker.activities.forEach(activity => this.activities.push({ methodName: `presenceChecker_execute_${activity.methodName}` }));
        this.commander.activities.forEach(activity => this.activities.push({ methodName: `commander_execute_${activity.methodName}` }));

        this.sensorsMonitor.addPort(new SysADLPort('s2', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.commander.addPort(new SysADLPort('commandH', 'CommandOPT', 'out', [], 'Command'));
        this.commander.addPort(new SysADLPort('commandC', 'CommandOPT', 'out', [], 'Command'));
    }

    async executeControlTemperature() {
        console.log('Executing activity ControlTemperature in component RoomTemperatureControllerCP');
        const params = {
            detectedRTC: this.state['detectedRTC'],
            s1: this.state['s1'],
            s2: this.state['s2'],
            desiredRTC: this.state['desiredRTC']
        };
        console.log(`Activity ControlTemperature returning: ${JSON.stringify(params)}`);
        return params;
    }

    async sensorsMonitor_execute(methodName) {
        console.log(`Executing subcomponent activity sensorsMonitor.${methodName}`);
        return await this.sensorsMonitor[methodName]();
    }

    async presenceChecker_execute(methodName) {
        console.log(`Executing subcomponent activity presenceChecker.${methodName}`);
        return await this.presenceChecker[methodName]();
    }

    async commander_execute(methodName) {
        console.log(`Executing subcomponent activity commander.${methodName}`);
        return await this.commander[methodName]();
    }
}

class TemperatureSensorCP extends SysADLComponent {
    constructor() {
        super('TemperatureSensorCP', false, modelPorts, modelTypes);
        this.addPort(new SysADLPort('current', 'FTemperatureOPT', 'out', [], 'FahrenheitTemperature'));
        this.state['current'] = null;
    }
}

class PresenceSensorCP extends SysADLComponent {
    constructor() {
        super('PresenceSensorCP', false, modelPorts, modelTypes);
        this.addPort(new SysADLPort('detected', 'PresenceOPT', 'out', [], 'Boolean'));
        this.state['detected'] = false;
    }
}

class UserInterfaceCP extends SysADLComponent {
    constructor() {
        super('UserInterfaceCP', false, modelPorts, modelTypes);
        this.addPort(new SysADLPort('desired', 'CTemperatureOPT', 'out', [], 'CelsiusTemperature'));
        this.state['desired'] = null;
    }
}

class HeaterCP extends SysADLComponent {
    constructor() {
        super('HeaterCP', false, modelPorts, modelTypes);
        this.addPort(new SysADLPort('controllerH', 'CommandIPT', 'in', [], 'Command'));
        this.state['controllerH'] = Command.Off;
    }
}

class CoolerCP extends SysADLComponent {
    constructor() {
        super('CoolerCP', false, modelPorts, modelTypes);
        this.addPort(new SysADLPort('controllerC', 'CommandIPT', 'in', [], 'Command'));
        this.state['controllerC'] = Command.Off;
    }
}

class PresenceCheckerCP extends SysADLComponent {
    constructor() {
        super('PresenceCheckerCP', false, modelPorts, modelTypes);
        this.addPort(new SysADLPort('detected', 'PresenceIPT', 'in', [], 'Boolean'));
        this.addPort(new SysADLPort('target1', 'CTemperatureOPT', 'out', [], 'CelsiusTemperature'));
        this.state['detected'] = false;
        this.state['target1'] = null;
        this.state['userTemp'] = null;
        this.activities.push({ methodName: 'executeCheckPresence' });
    }

    async executeCheckPresence() {
        console.log('Executing activity CheckPresence in component PresenceCheckerCP');
        const params = { detected: this.state['detected'], userTemp: this.state['userTemp'] };
        const result = await CheckPresenceToSetTemperature(params);
        console.log(`Validating constraint CheckPresenceToSetTemperatureEQ`);
        try {
            await validateCheckPresenceToSetTemperatureEQ({ detected: params.detected, userTemp: params.userTemp, target: result });
        } catch (e) {
            console.error(`Constraint CheckPresenceToSetTemperatureEQ violated: ${e.message}`);
            return null;
        }
        console.log(`Storing result ${result} to state target1 from action checkPresence`);
        this.state['target1'] = result;
        const target1_port = this.ports.find(p => p.name === 'target1');
        if (target1_port) await target1_port.send(this.state['target1']);
        console.log(`Activity CheckPresence returning: ${result}`);
        return result;
    }
}

class CommanderCP extends SysADLComponent {
    constructor() {
        super('CommanderCP', false, modelPorts, modelTypes);
        this.addPort(new SysADLPort('target2', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('commandH', 'CommandOPT', 'out', [], 'Command'));
        this.addPort(new SysADLPort('commandC', 'CommandOPT', 'out', [], 'Command'));
        this.state['target2'] = null;
        this.state['commandH'] = Command.Off;
        this.state['commandC'] = Command.Off;
        this.state['average'] = null;
        this.activities.push({ methodName: 'executeCompareTemperature' });
    }

    async executeCompareTemperature() {
        console.log('Executing activity CompareTemperature in component CommanderCP');
        const params = { target: this.state['target2'], average: this.state['average'] };
        const result = await CompareTemperatureEx({ target: params.target, average: params.average, types: { Command } });
        console.log(`Validating constraint CompareTemperatureEQ`);
        try {
            await validateCompareTemperatureEQ({ target: params.target, average: params.average, cmds: result });
        } catch (e) {
            console.error(`Constraint CompareTemperatureEQ violated: ${e.message}`);
            return null;
        }
        console.log(`Storing result ${JSON.stringify(result)} to state cmds from action compare`);
        this.state['cmds'] = result;
        const commandH_port = this.ports.find(p => p.name === 'commandH');
        if (commandH_port) await commandH_port.send(result ? result.heater : Command.Off);
        const commandC_port = this.ports.find(p => p.name === 'commandC');
        if (commandC_port) await commandC_port.send(result ? result.cooler : Command.Off);
        console.log(`Activity CompareTemperature returning: ${JSON.stringify(result)}`);
        return result;
    }
}

class SensorsMonitorCP extends SysADLComponent {
    constructor() {
        super('SensorsMonitorCP', false, modelPorts, modelTypes);
        this.addPort(new SysADLPort('s1', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('s2', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('average', 'CTemperatureOPT', 'out', [], 'CelsiusTemperature'));
        this.state['s1'] = null;
        this.state['s2'] = null;
        this.state['temp1'] = null;
        this.state['temp2'] = null;
        this.state['average'] = null;
        this.activities.push({ methodName: 'executeCalculateAverageTemperature' });
    }

    async executeCalculateAverageTemperature() {
        console.log('Executing activity CalculateAverageTemperature in component SensorsMonitorCP');
        const params = { temp1: this.state['s1'], temp2: this.state['s2'] };
        const result = await CalculateAverageTemperatureEx(params);
        console.log(`Validating constraint CalculateAverageTemperatureEQ`);
        try {
            await validateCalculateAverageTemperatureEQ({ t1: params.temp1, t2: params.temp2, av: result });
        } catch (e) {
            console.error(`Constraint CalculateAverageTemperatureEQ violated: ${e.message}`);
            return null;
        }
        console.log(`Storing result ${result} to state average from action calculateAverage`);
        this.state['average'] = result;
        const average_port = this.ports.find(p => p.name === 'average');
        if (average_port) await average_port.send(this.state['average']);
        console.log(`Activity CalculateAverageTemperature returning: ${result}`);
        return result;
    }
}

// Executables
async function CommandCoolerEx(params = {}) {
    console.log(`Executing executable CommandCoolerEx with params: ${JSON.stringify(params)}`);
    const cmds = params.cmds || new Commands({});
    const result = await validateCommandCoolerEQ({ cmds, c: cmds.cooler });
    return result ? cmds.cooler : Command.Off;
}

async function CommandHeaterEx(params = {}) {
    console.log(`Executing executable CommandHeaterEx with params: ${JSON.stringify(params)}`);
    const cmds = params.cmds || new Commands({});
    const result = await validateCommandHeaterEQ({ cmds, c: cmds.heater });
    return result ? cmds.heater : Command.Off;
}

async function FahrenheitToCelsiusEx(params = {}) {
    console.log(`Executing executable FahrenheitToCelsiusEx with params: ${JSON.stringify(params)}`);
    const f = params.f || 32.0;
    const result = (5 * (f - 32)) / 9;
    await validateFahrenheitToCelsiusEQ({ f, c: result });
    return result;
}

async function CalculateAverageTemperatureEx(params = {}) {
    console.log(`Executing executable CalculateAverageTemperatureEx with params: ${JSON.stringify(params)}`);
    const temp1 = params.temp1 || 0;
    const temp2 = params.temp2 || 0;
    return (temp1 + temp2) / 2;
}

async function CheckPresenceToSetTemperature(params = {}) {
    console.log(`Executing executable CheckPresenceToSetTemperature with params: ${JSON.stringify(params)}`);
    const userTemp = params.userTemp || 20;
    const presence = params.presence || false;
    return presence ? userTemp : 2;
}

async function CompareTemperatureEx(params = {}) {
    console.log(`Executing executable CompareTemperatureEx with params: ${JSON.stringify(params)}`);
    const target = params.target || 20;
    const average = params.average || 20;
    const types = params.types || { Command };
    let heater = types.Command.Off;
    let cooler = types.Command.Off;
    if (average > target) {
        heater = types.Command.Off;
        cooler = types.Command.On;
    } else {
        heater = types.Command.On;
        cooler = types.Command.Off;
    }
    const result = new Commands({ heater, cooler });
    await validateCompareTemperatureEQ({ target, average, cmds: result, types });
    return result;
}

// Constraints
async function validateCalculateAverageTemperatureEQ(params = {}) {
    const t1 = params.t1 ?? 0;
    const t2 = params.t2 ?? 0;
    const av = params.av ?? 0;
    console.log(`Evaluating constraint CalculateAverageTemperatureEQ: av === (t1 + t2)/2`);
    const result = av === (t1 + t2) / 2;
    if (!result) {
        throw new Error('Constraint CalculateAverageTemperatureEQ violated');
    }
    console.log('Constraint CalculateAverageTemperatureEQ passed');
    return result;
}

async function validateCompareTemperatureEQ(params = {}) {
    const target = params.target ?? 20;
    const average = params.average ?? 20;
    const cmds = params.cmds ?? new Commands({});
    const types = params.types ?? { Command };
    console.log(`Evaluating constraint CompareTemperatureEQ`);
    const result = average > target ?
        cmds.heater === types.Command.Off && cmds.cooler === types.Command.On :
        cmds.heater === types.Command.On && cmds.cooler === types.Command.Off;
    if (!result) {
        throw new Error('Constraint CompareTemperatureEQ violated');
    }
    console.log('Constraint CompareTemperatureEQ passed');
    return result;
}

async function validateFahrenheitToCelsiusEQ(params = {}) {
    const f = params.f ?? 32;
    const c = params.c ?? 0;
    console.log(`Evaluating constraint FahrenheitToCelsiusEQ: c === (5*(f - 32)/9)`);
    const result = c === (5 * (f - 32) / 9);
    if (!result) {
        throw new Error('Constraint FahrenheitToCelsiusEQ violated');
    }
    console.log('Constraint FahrenheitToCelsiusEQ passed');
    return result;
}

async function validateCommandHeaterEQ(params = {}) {
    const cmds = params.cmds ?? new Commands({});
    const c = params.c ?? Command.Off;
    console.log(`Evaluating constraint CommandHeaterEQ: c === cmds.heater`);
    const result = c === cmds.heater;
    if (!result) {
        throw new Error('Constraint CommandHeaterEQ violated');
    }
    console.log('Constraint CommandHeaterEQ passed');
    return result;
}

async function validateCommandCoolerEQ(params = {}) {
    const cmds = params.cmds ?? new Commands({});
    const c = params.c ?? Command.Off;
    console.log(`Evaluating constraint CommandCoolerEQ: c === cmds.cooler`);
    const result = c === cmds.cooler;
    if (!result) {
        throw new Error('Constraint CommandCoolerEQ violated');
    }
    console.log('Constraint CommandCoolerEQ passed');
    return result;
}

async function validateCheckPresenceToSetTemperatureEQ(params = {}) {
    const detected = params.detected ?? false;
    const userTemp = params.userTemp ?? 20;
    const target = params.target ?? 2;
    console.log(`Evaluating constraint CheckPresenceToSetTemperatureEQ: detected ? target === userTemp : target === 2`);
    const result = detected ? target === userTemp : target === 2;
    if (!result) {
        throw new Error('Constraint CheckPresenceToSetTemperatureEQ violated');
    }
    console.log('Constraint CheckPresenceToSetTemperatureEQ passed');
    return result;
}

class RTC {
    constructor() {
        console.log('Initializing system RTC');
        this.components = new Map();
        this.connectors = new Map();
        this.bindings = [];
        this.ports = [];
    }

    async addComponent(name, component) {
        this.components.set(name, component);
        this.ports.push(...component.ports);
        console.log(`Component ${name} added to system`);
    }

    async addConnector(name, connector) {
        this.connectors.set(name, connector);
        console.log(`Connector ${name} added to system`);
    }

    async addBinding(binding) {
        this.bindings.push(binding);
        console.log(`Binding added: ${binding.sourceComponent.name}.${binding.sourcePort.name} -> ${binding.targetComponent.name}.${binding.targetPort.name} via ${binding.connector.name}`);
    }

    async start() {
        console.log('System RTC starting');
        await Promise.all(Array.from(this.components.values()).map(c => c.start()));
        console.log('System RTC simulation completed');
    }
}

// Main Function
async function main() {
    console.log('Starting simulation of RTC');
    const system = new RTC();

    // Initialize components
    const rtcSystemCFD = new RTCSystemCFD();
    await system.addComponent('RTCSystemCFD', rtcSystemCFD);
    const roomTemperatureControllerCP = new RoomTemperatureControllerCP();
    await system.addComponent('RoomTemperatureControllerCP', roomTemperatureControllerCP);
    const temperatureSensorCP_S1 = new TemperatureSensorCP();
    await system.addComponent('TemperatureSensorCP_S1', temperatureSensorCP_S1);
    const temperatureSensorCP_S2 = new TemperatureSensorCP();
    await system.addComponent('TemperatureSensorCP_S2', temperatureSensorCP_S2);
    const presenceSensorCP = new PresenceSensorCP();
    await system.addComponent('PresenceSensorCP', presenceSensorCP);
    const userInterfaceCP = new UserInterfaceCP();
    await system.addComponent('UserInterfaceCP', userInterfaceCP);
    const heaterCP = new HeaterCP();
    await system.addComponent('HeaterCP', heaterCP);
    const coolerCP = new CoolerCP();
    await system.addComponent('CoolerCP', coolerCP);
    const presenceCheckerCP = new PresenceCheckerCP();
    await system.addComponent('PresenceCheckerCP', presenceCheckerCP);
    const commanderCP = new CommanderCP();
    await system.addComponent('CommanderCP', commanderCP);
    const sensorsMonitorCP = new SensorsMonitorCP();
    await system.addComponent('SensorsMonitorCP', sensorsMonitorCP);

    // Initialize connectors
    const fahrenheitToCelsiusCN = new FahrenheitToCelsiusCN();
    await system.addConnector('FahrenheitToCelsiusCN', fahrenheitToCelsiusCN);
    const presenceCN = new PresenceCN();
    await system.addConnector('PresenceCN', presenceCN);
    const commandCN = new CommandCN();
    await system.addConnector('CommandCN', commandCN);
    const cTemperatureCN = new CTemperatureCN();
    await system.addConnector('CTemperatureCN', cTemperatureCN);

    // Configure bindings
    await system.addBinding(new Binding(
        system.components.get('TemperatureSensorCP_S1'),
        system.components.get('TemperatureSensorCP_S1').ports.find(p => p.name === 'current'),
        system.components.get('SensorsMonitorCP'),
        system.components.get('SensorsMonitorCP').ports.find(p => p.name === 's1'),
        system.connectors.get('FahrenheitToCelsiusCN')
    ));
    await system.addBinding(new Binding(
        system.components.get('TemperatureSensorCP_S2'),
        system.components.get('TemperatureSensorCP_S2').ports.find(p => p.name === 'current'),
        system.components.get('SensorsMonitorCP'),
        system.components.get('SensorsMonitorCP').ports.find(p => p.name === 's2'),
        system.connectors.get('FahrenheitToCelsiusCN')
    ));
    await system.addBinding(new Binding(
        system.components.get('PresenceSensorCP'),
        system.components.get('PresenceSensorCP').ports.find(p => p.name === 'detected'),
        system.components.get('PresenceCheckerCP'),
        system.components.get('PresenceCheckerCP').ports.find(p => p.name === 'detected'),
        system.connectors.get('PresenceCN')
    ));
    await system.addBinding(new Binding(
        system.components.get('UserInterfaceCP'),
        system.components.get('UserInterfaceCP').ports.find(p => p.name === 'desired'),
        system.components.get('PresenceCheckerCP'),
        system.components.get('PresenceCheckerCP').ports.find(p => p.name === 'target1'),
        system.connectors.get('CTemperatureCN')
    ));
    await system.addBinding(new Binding(
        system.components.get('PresenceCheckerCP'),
        system.components.get('PresenceCheckerCP').ports.find(p => p.name === 'target1'),
        system.components.get('CommanderCP'),
        system.components.get('CommanderCP').ports.find(p => p.name === 'target2'),
        system.connectors.get('CTemperatureCN')
    ));
    await system.addBinding(new Binding(
        system.components.get('CommanderCP'),
        system.components.get('CommanderCP').ports.find(p => p.name === 'commandH'),
        system.components.get('HeaterCP'),
        system.components.get('HeaterCP').ports.find(p => p.name === 'controllerH'),
        system.connectors.get('CommandCN')
    ));
    await system.addBinding(new Binding(
        system.components.get('CommanderCP'),
        system.components.get('CommanderCP').ports.find(p => p.name === 'commandC'),
        system.components.get('CoolerCP'),
        system.components.get('CoolerCP').ports.find(p => p.name === 'controllerC'),
        system.connectors.get('CommandCN')
    ));
    await system.addBinding(new Binding(
        system.components.get('SensorsMonitorCP'),
        system.components.get('SensorsMonitorCP').ports.find(p => p.name === 'average'),
        system.components.get('CommanderCP'),
        system.components.get('CommanderCP').ports.find(p => p.name === 'target2'),
        system.connectors.get('CTemperatureCN')
    ));

    // Configure delegations
    const roomTempController = system.components.get('RoomTemperatureControllerCP');
    const s1Port = roomTempController.ports.find(p => p.name === 's1');
    const s2Port = roomTempController.ports.find(p => p.name === 's2');
    const detectedRTCPort = roomTempController.ports.find(p => p.name === 'detectedRTC');
    const desiredRTCPort = roomTempController.ports.find(p => p.name === 'desiredRTC');
    const commandHPort = roomTempController.ports.find(p => p.name === 'commandH');
    const commandCPort = roomTempController.ports.find(p => p.name === 'commandC');
    
    if (s1Port && rtcSystemCFD.ports.find(p => p.name === 'current1')) {
        console.log('Configuring delegation from RTCSystemCFD.current1 to RoomTemperatureControllerCP.s1');
        const sourcePort = rtcSystemCFD.ports.find(p => p.name === 'current1');
        sourcePort.receive = async (data) => {
            console.log(`Delegating data ${JSON.stringify(data)} from RTCSystemCFD.current1 to RoomTemperatureControllerCP.s1`);
            await s1Port.receive(data);
            await roomTempController.onDataReceived(s1Port.name, data);
        };
    }
    if (s2Port && rtcSystemCFD.ports.find(p => p.name === 'current2')) {
        console.log('Configuring delegation from RTCSystemCFD.current2 to RoomTemperatureControllerCP.s2');
        const sourcePort = rtcSystemCFD.ports.find(p => p.name === 'current2');
        sourcePort.receive = async (data) => {
            console.log(`Delegating data ${JSON.stringify(data)} from RTCSystemCFD.current2 to RoomTemperatureControllerCP.s2`);
            await s2Port.receive(data);
            await roomTempController.onDataReceived(s2Port.name, data);
        };
    }
    if (detectedRTCPort && system.components.get('PresenceSensorCP').ports.find(p => p.name === 'detected')) {
        console.log('Configuring delegation from PresenceSensorCP.detected to RoomTemperatureControllerCP.detectedRTC');
        const sourcePort = system.components.get('PresenceSensorCP').ports.find(p => p.name === 'detected');
        sourcePort.receive = async (data) => {
            console.log(`Delegating data ${JSON.stringify(data)} from PresenceSensorCP.detected to RoomTemperatureControllerCP.detectedRTC`);
            await detectedRTCPort.receive(data);
            await roomTempController.onDataReceived(detectedRTCPort.name, data);
        };
    }
    if (desiredRTCPort && system.components.get('UserInterfaceCP').ports.find(p => p.name === 'desired')) {
        console.log('Configuring delegation from UserInterfaceCP.desired to RoomTemperatureControllerCP.desiredRTC');
        const sourcePort = system.components.get('UserInterfaceCP').ports.find(p => p.name === 'desired');
        sourcePort.receive = async (data) => {
            console.log(`Delegating data ${JSON.stringify(data)} from UserInterfaceCP.desired to RoomTemperatureControllerCP.desiredRTC`);
            await desiredRTCPort.receive(data);
            await roomTempController.onDataReceived(desiredRTCPort.name, data);
        };
    }
    if (commandHPort && system.components.get('HeaterCP').ports.find(p => p.name === 'controllerH')) {
        console.log('Configuring delegation from RoomTemperatureControllerCP.commandH to HeaterCP.controllerH');
        const targetPort = system.components.get('HeaterCP').ports.find(p => p.name === 'controllerH');
        commandHPort.send = async (data) => {
            console.log(`Delegating data ${JSON.stringify(data)} from RoomTemperatureControllerCP.commandH to HeaterCP.controllerH`);
            await targetPort.receive(data);
            await system.components.get('HeaterCP').onDataReceived(targetPort.name, data);
        };
    }
    if (commandCPort && system.components.get('CoolerCP').ports.find(p => p.name === 'controllerC')) {
        console.log('Configuring delegation from RoomTemperatureControllerCP.commandC to CoolerCP.controllerC');
        const targetPort = system.components.get('CoolerCP').ports.find(p => p.name === 'controllerC');
        commandCPort.send = async (data) => {
            console.log(`Delegating data ${JSON.stringify(data)} from RoomTemperatureControllerCP.commandC to CoolerCP.controllerC`);
            await targetPort.receive(data);
            await system.components.get('CoolerCP').onDataReceived(targetPort.name, data);
        };
    }

    await system.start();
    console.log('System simulation completed');
}

main().catch(err => console.error(`Error in execution: ${err.message}`));
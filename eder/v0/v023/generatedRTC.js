// @ts-nocheck
// Generated JavaScript code for SysADL Model: SysADLModel

// Model Metadata
const modelPorts = [{"name":"FTemperatureOPT","flows":[{"direction":"out","type":"FahrenheitTemperature"}],"subPorts":[]},{"name":"PresenceIPT","flows":[{"direction":"in","type":"Boolean"}],"subPorts":[]},{"name":"PresenceOPT","flows":[{"direction":"out","type":"Boolean"}],"subPorts":[]},{"name":"CTemperatureIPT","flows":[{"direction":"in","type":"CelsiusTemperature"}],"subPorts":[]},{"name":"CommandIPT","flows":[{"direction":"in","type":"Command"}],"subPorts":[]},{"name":"CommandOPT","flows":[{"direction":"out","type":"Command"}],"subPorts":[]},{"name":"CTemperatureOPT","flows":[{"direction":"out","type":"CelsiusTemperature"}],"subPorts":[]}];
const modelTypes = [{"kind":"value type","name":"Int","extends":null,"content":""},{"kind":"value type","name":"Boolean","extends":null,"content":""},{"kind":"value type","name":"String","extends":null,"content":""},{"kind":"value type","name":"Void","extends":null,"content":""},{"kind":"value type","name":"Real","extends":null,"content":""},{"kind":"enum","name":"Command","extends":null,"content":"On , Off"},{"kind":"datatype","name":"Commands","extends":null,"content":"attributes : heater : Command ; cooler : Command ;"},{"kind":"value type","name":"temperature","extends":"Real","content":"dimension = Temperature"},{"kind":"value type","name":"FahrenheitTemperature","extends":"temperature","content":"unit = Fahrenheit dimension = Temperature"},{"kind":"value type","name":"CelsiusTemperature","extends":"temperature","content":"unit = Celsius dimension = Temperature"}];

// Types
const Int = 'any'; // Value type
const Boolean = 'any'; // Value type
const String = 'any'; // Value type
const Void = 'any'; // Value type
const Real = 'any'; // Value type
const Command = Object.freeze({ On: 'On', Off: 'Off' });
class Commands {
    constructor(params = {}) {
        this.heater = params["heater"] ?? Command.On;
    }
}
const temperature = 'any'; // Value type
const FahrenheitTemperature = 'any'; // Value type
const CelsiusTemperature = 'any'; // Value type

// Base Port Class
class SysADLPort {
    constructor(name, type, direction = 'inout', subPorts = [], flowType = 'any', component = null) {
        console.log('Initializing port ' + name + ' with type ' + type + ', direction ' + direction + ', flowType ' + flowType);
        this.name = name;
        this.type = type;
        this.direction = direction;
        this.flowType = flowType || 'any';
        this.value = null;
        this.component = component;
        this.subPorts = new Map(subPorts.map(sp => {
            console.log('Initializing subPort ' + sp.name + ' with type ' + sp.type + ', flowType ' + (sp.flowType || 'any'));
            return [sp.name, sp];
        }));
        this.connector = null;
    }

    async send(data, subPortName = null) {
        console.log('Port ' + this.name + ' sending data: ' + JSON.stringify(data) + (subPortName ? ' via subPort ' + subPortName : ''));
        if (this.subPorts.size > 0 && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'out' && subPort.direction !== 'inout')) {
                console.error('Cannot send via subPort ' + subPortName + ' in ' + this.name + ': invalid direction');
                return false;
            }
            subPort.value = data;
            if (subPort.connector) await subPort.connector.transmit(data);
            return true;
        }
        if (this.direction !== 'out' && this.direction !== 'inout') {
            console.error('Cannot send via ' + this.name + ': invalid direction (' + this.direction + ')');
            return false;
        }
        if (!this.connector) {
            console.warn('No connector attached to ' + this.name + '; data not sent');
            return false;
        }
        this.value = data;
        await this.connector.transmit(data);
        return true;
    }

    async receive(data, subPortName = null) {
        console.log('Port ' + this.name + ' receiving data: ' + JSON.stringify(data) + (subPortName ? ' via subPort ' + subPortName : ''));
        if (this.subPorts.size > 0 && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'in' && subPort.direction !== 'inout')) {
                console.error('Cannot receive via subPort ' + subPortName + ' in ' + this.name + ': invalid direction');
                return false;
            }
            subPort.value = data;
            if (this.component) {
                await this.component.onDataReceived(subPort.name, data);
            }
            return true;
        }
        if (this.direction !== 'in' && this.direction !== 'inout') {
            console.error('Cannot receive via ' + this.name + ': invalid direction (' + this.direction + ')');
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
        console.log('Initializing connector ' + name);
        this.name = name;
        this.flows = flows;
        this.messageQueue = [];
        this.isProcessing = false;
    }

    async transmit(data) {
        console.log('Connector ' + this.name + ' transmitting data: ' + JSON.stringify(data));
        this.messageQueue.push(data);
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.messageQueue.length > 0) {
            const currentData = this.messageQueue.shift();
            for (const flow of this.flows) {
                console.log('Connector ' + this.name + ' processing flow from ' + flow.source + ' to ' + flow.target + ', type: ' + flow.type);
                if (flow.targetPort) {
                    await flow.targetPort.receive(currentData);
                } else {
                    console.warn('No target port defined for flow from ' + flow.source + ' to ' + flow.target);
                }
            }
        }
        this.isProcessing = false;
    }
}

// Binding Class
class Binding {
    constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {
        console.log('Creating binding from ' + sourceComponent.name + '.' + sourcePort.name + ' to ' + targetComponent.name + '.' + targetPort.name + ' via connector ' + connector.name);
        this.sourceComponent = sourceComponent;
        this.sourcePort = sourcePort;
        this.targetComponent = targetComponent;
        this.targetPort = targetPort;
        this.connector = connector;
        this.sourcePort.connector = connector;
        connector.flows.push({ source: sourcePort.name, target: targetPort.name, type: sourcePort.flowType || 'any', targetPort: this.targetPort });
    }

    async transmit(data) {
        console.log('Binding transmitting data ' + JSON.stringify(data) + ' from ' + this.sourceComponent.name + '.' + this.sourcePort.name + ' to ' + this.targetComponent.name + '.' + this.targetPort.name);
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
        console.log('Initializing component ' + name + ', isBoundary: ' + isBoundary);
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
        console.log('Port ' + port.name + ' added to component ' + this.name + ', flowType: ' + port.flowType);
    }

    async addSubComponent(name, component) {
        this.subComponents.set(name, component);
        console.log('SubComponent ' + name + ' added to ' + this.name);
    }

    async onDataReceived(portName, data) {
        console.log('Component ' + this.name + ' received data on port ' + portName + ': ' + JSON.stringify(data));
        this.state[portName] = data;
        console.log('Processing activities for component ' + this.name + ' due to data on ' + portName);
        for (const activity of this.activities) {
            console.log('Triggering activity ' + activity.methodName + ' in component ' + this.name);
            await this[activity.methodName]();
        }
        for (const [subCompName, subComp] of this.subComponents) {
            for (const activity of subComp.activities) {
                console.log('Triggering subcomponent activity ' + subCompName + '.' + activity.methodName);
                await this[subCompName + '_execute'](activity.methodName);
            }
        }
    }

    async start() {
        console.log('Starting component ' + this.name);
        if (this.isBoundary) {
            await this.simulateInput();
        }
        for (const subComp of this.subComponents.values()) {
            await subComp.start();
        }
    }

    async simulateInput() {
        console.log('Simulating input for component ' + this.name);
        for (const port of this.ports) {
            console.log('Processing port ' + port.name + ' with type ' + port.type + ', flowType: ' + port.flowType);
            if (!port.flowType || typeof port.flowType !== 'string') {
                console.warn('Skipping port ' + port.name + ' due to invalid flowType: ' + port.flowType);
                continue;
            }
            let simulatedValue;
            if (port.flowType.includes('emperature') || port.params["flowType"] === 'Real' || port.params["flowType"] === 'Int') {
                simulatedValue = 42.0;
                console.log('Simulating number input ' + simulatedValue + ' for ' + this.name + '.' + port.name);
            } else if (port.params["flowType"] === 'Boolean') {
                simulatedValue = true;
                console.log('Simulating boolean input ' + simulatedValue + ' for ' + this.name + '.' + port.name);
            } else if (this.modelTypes.find(t => t.params["name"] === port.flowType && t.params["kind"] === 'enum')) {
                const enumValues = this.modelTypes.find(t => t.params["name"] === port.flowType)?.content.match(/(w+)/g) || ['Off'];
                simulatedValue = eval(port.flowType + '.' + enumValues[0]);
                console.log('Simulating enum input ' + simulatedValue + ' for ' + this.name + '.' + port.name);
            } else if (this.modelTypes.find(t => t.params["name"] === port.flowType && t.params["kind"] === 'datatype')) {
                simulatedValue = eval('new ' + port.flowType + '({})');
                console.log('Simulating datatype input for ' + this.name + '.' + port.name);
            } else {
                console.warn('Unsupported flow type ' + port.flowType + ' for port ' + this.name + '.' + port.name);
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
        super('RTCSystemCFD', false, modelPorts, modelTypes);
        // Initialize ports
        this.addPort(new SysADLPort('current1', 'FTemperatureOPT', 'out', [], 'FahrenheitTemperature'));

        // Initialize subcomponents

        // Initialize state
        this.state['current1'] = null;

        // Register activities
    }
}

class RoomTemperatureControllerCP extends SysADLComponent {
    constructor() {
        super('RoomTemperatureControllerCP', false, modelPorts, modelTypes);
        // Initialize ports
        this.addPort(new SysADLPort('detectedRTC', 'PresenceIPT', 'in', [], 'Boolean'));
        this.addPort(new SysADLPort('s1', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));

        // Initialize subcomponents

        // Initialize state
        this.state['detectedRTC'] = false;
        this.state['s1'] = null;

        // Register activities
    }
}

class TemperatureSensorCP extends SysADLComponent {
    constructor() {
        super('TemperatureSensorCP', false, modelPorts, modelTypes);
        // Initialize ports
        this.addPort(new SysADLPort('current', 'FTemperatureOPT', 'out', [], 'FahrenheitTemperature'));

        // Initialize subcomponents

        // Initialize state
        this.state['current'] = null;

        // Register activities
    }
}

class PresenceSensorCP extends SysADLComponent {
    constructor() {
        super('PresenceSensorCP', false, modelPorts, modelTypes);
        // Initialize ports
        this.addPort(new SysADLPort('detected', 'PresenceOPT', 'out', [], 'Boolean'));

        // Initialize subcomponents

        // Initialize state
        this.state['detected'] = false;

        // Register activities
    }
}

class UserInterfaceCP extends SysADLComponent {
    constructor() {
        super('UserInterfaceCP', false, modelPorts, modelTypes);
        // Initialize ports
        this.addPort(new SysADLPort('desired', 'CTemperatureOPT', 'out', [], 'CelsiusTemperature'));

        // Initialize subcomponents

        // Initialize state
        this.state['desired'] = null;

        // Register activities
    }
}

class HeaterCP extends SysADLComponent {
    constructor() {
        super('HeaterCP', false, modelPorts, modelTypes);
        // Initialize ports
        this.addPort(new SysADLPort('controllerH', 'CommandIPT', 'in', [], 'Command'));

        // Initialize subcomponents

        // Initialize state
        this.state['controllerH'] = Command.On;

        // Register activities
    }
}

class CoolerCP extends SysADLComponent {
    constructor() {
        super('CoolerCP', false, modelPorts, modelTypes);
        // Initialize ports
        this.addPort(new SysADLPort('controllerC', 'CommandIPT', 'in', [], 'Command'));

        // Initialize subcomponents

        // Initialize state
        this.state['controllerC'] = Command.On;

        // Register activities
    }
}

class PresenceCheckerCP extends SysADLComponent {
    constructor() {
        super('PresenceCheckerCP', false, modelPorts, modelTypes);
        // Initialize ports
        this.addPort(new SysADLPort('detected', 'PresenceIPT', 'in', [], 'Boolean'));

        // Initialize subcomponents

        // Initialize state
        this.state['detected'] = false;

        // Register activities
    }
}

class CommanderCP extends SysADLComponent {
    constructor() {
        super('CommanderCP', false, modelPorts, modelTypes);
        // Initialize ports
        this.addPort(new SysADLPort('target2', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));

        // Initialize subcomponents

        // Initialize state
        this.state['target2'] = null;

        // Register activities
    }
}

class SensorsMonitorCP extends SysADLComponent {
    constructor() {
        super('SensorsMonitorCP', false, modelPorts, modelTypes);
        // Initialize ports
        this.addPort(new SysADLPort('s1', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));

        // Initialize subcomponents

        // Initialize state
        this.state['s1'] = null;

        // Register activities
    }
}

// Executables
async function CommandCoolerEx(params = {}) {
    console.log('Executing executable CommandCoolerEx with params: ' + JSON.stringify(params));
    let cooler = params["cooler"] ?? null;
    let cmds = params["cmds"] ?? null;
return params["cmds"].cooler ;
}

async function CommandHeaterEx(params = {}) {
    console.log('Executing executable CommandHeaterEx with params: ' + JSON.stringify(params));
    let heater = params["heater"] ?? null;
    let cmds = params["cmds"] ?? null;
return params["cmds"].heater ;
}

async function FahrenheitToCelsiusEx(params = {}) {
    console.log('Executing executable FahrenheitToCelsiusEx with params: ' + JSON.stringify(params));
    let f = params["f"] ?? null;
return 5*(f - 32)/9 ;
}

async function CalculateAverageTemperatureEx(params = {}) {
    console.log('Executing executable CalculateAverageTemperatureEx with params: ' + JSON.stringify(params));
    let temp2 = params["temp2"] ?? null;
    let temp1 = params["temp1"] ?? null;
return (temp1 + temp2)/2 ;
}

async function CheckPresenceToSetTemperature(params = {}) {
    console.log('Executing executable CheckPresenceToSetTemperature with params: ' + JSON.stringify(params));
    let userTemp = params["userTemp"] ?? null;
    let presence = params["presence"] ?? null;
if(presence == true) return userTemp; else return 2;
}

async function CompareTemperatureEx(params = {}) {
    console.log('Executing executable CompareTemperatureEx with params: ' + JSON.stringify(params));
    let target = params["target"] ?? null;
    let average = params["average"] ?? null;
    let types = params["types"] ?? null;
    let heater = types.Command.Off;
;     let cooler = types.Command.Off;
; if(average > target) {heater = types.Command.Off; cooler = types.Command.On ;    return null;

}

// Constraints
async function validateCalculateAverageTemperatureEQ(params = {}) {
    let t1 = params["t1"] ?? null;
    let t2 = params["t2"] ?? null;
    let av = params["av"] ?? null;
    console.log('Evaluating constraint CalculateAverageTemperatureEQ: ' + 'params[\"av\"] === (params[\"t1\"] + params[\"t2\"])/2');
    const result = params["av"] === (params["t1"] + params["t2"])/2
	;
    if (!result) {
        throw new Error('Constraint CalculateAverageTemperatureEQ violated');
    }
    console.log('Constraint CalculateAverageTemperatureEQ passed');
    return result;
}

async function validateCompareTemperatureEQ(params = {}) {
    let target = params["target"] ?? null;
    let average = params["average"] ?? null;
    let cmds = params["cmds"] ?? new Commands({});
    console.log('Evaluating constraint CompareTemperatureEQ: ' + 'params[\"average\"] > params[\"target\"] ? params[\"cmds\"] === params[\"types\"].Commands.params[\"heater\"].params[\"Off\"] && types.Commands.params[\"cooler\"].params[\"On\"] : types.Commands.params[\"heater\"].On && params["cmds"] === types.Commands.params[\"cooler\"].Off ');
    const result = params["average"] > params["target"] ? params["cmds"] === params["types"].Commands.params["heater"].params["Off"] && types.Commands.params["cooler"].params["On"] : types.Commands.params["heater"].On && params["cmds"] === types.Commands.params["cooler"].Off ;
    if (!result) {
        throw new Error('Constraint CompareTemperatureEQ violated');
    }
    console.log('Constraint CompareTemperatureEQ passed');
    return result;
}

async function validateFahrenheitToCelsiusEQ(params = {}) {
    let f = params["f"] ?? null;
    let c = params["c"] ?? null;
    console.log('Evaluating constraint FahrenheitToCelsiusEQ: ' + 'params[\"c\"] === (5*(params[\"f\"] - 32)/9)');
    const result = params["c"] === (5*(params["f"] - 32)/9);
    if (!result) {
        throw new Error('Constraint FahrenheitToCelsiusEQ violated');
    }
    console.log('Constraint FahrenheitToCelsiusEQ passed');
    return result;
}

async function validateCommandHeaterEQ(params = {}) {
    let cmds = params["cmds"] ?? new Commands({});
    let c = params["c"] ?? Command.On;
    console.log('Evaluating constraint CommandHeaterEQ: ' + 'params[\"c\"] === params[\"cmds\"].params[\"heater\"] ');
    const result = params["c"] === params["cmds"].params["heater"] ;
    if (!result) {
        throw new Error('Constraint CommandHeaterEQ violated');
    }
    console.log('Constraint CommandHeaterEQ passed');
    return result;
}

async function validateCommandCoolerEQ(params = {}) {
    let cmds = params["cmds"] ?? new Commands({});
    let c = params["c"] ?? Command.On;
    console.log('Evaluating constraint CommandCoolerEQ: ' + 'params[\"c\"] === params[\"cmds\"].params[\"cooler\"] ');
    const result = params["c"] === params["cmds"].params["cooler"] ;
    if (!result) {
        throw new Error('Constraint CommandCoolerEQ violated');
    }
    console.log('Constraint CommandCoolerEQ passed');
    return result;
}

async function validateCheckPresenceToSetTemperatureEQ(params = {}) {
    let detected = params["detected"] ?? false;
    let userTemp = params["userTemp"] ?? null;
    let target = params["target"] ?? null;
    console.log('Evaluating constraint CheckPresenceToSetTemperatureEQ: ' + 'params[\"detected\"] === true ? params[\"target\"] === params[\"userTemp\"] : params["target"] === 2 ');
    const result = params["detected"] === true ? params["target"] === params["userTemp"] : params["target"] === 2 ;
    if (!result) {
        throw new Error('Constraint CheckPresenceToSetTemperatureEQ violated');
    }
    console.log('Constraint CheckPresenceToSetTemperatureEQ passed');
    return result;
}

class SysADLModel {
    constructor() {
        console.log('Initializing system SysADLModel');
        this.components = new Map();
        this.connectors = new Map();
        this.bindings = [];
        this.ports = [];
    }

    async addComponent(name, component) {
        this.components.set(name, component);
        this.ports.push(...component.ports);
        console.log('Component ' + name + ' added to system');
    }

    async addConnector(name, connector) {
        this.connectors.set(name, connector);
        console.log('Connector ' + name + ' added to system');
    }

    async addBinding(binding) {
        this.bindings.push(binding);
        console.log('Binding added: ' + binding.sourceComponent.name + '.' + binding.sourcePort.name + ' -> ' + binding.targetComponent.name + '.' + binding.targetPort.name + ' via ' + binding.connector.name);
    }

    async start() {
        console.log('System SysADLModel starting');
        await Promise.all(Array.from(this.components.values()).map(c => c.start()));
        console.log('System SysADLModel simulation completed');
    }
}

// Main Function
async function main() {
    console.log('Starting simulation of SysADLModel');
    const system = new SysADLModel();
    const rTCSystemCFD = new RTCSystemCFD();
    await system.addComponent('RTCSystemCFD', rTCSystemCFD);
    const roomTemperatureControllerCP = new RoomTemperatureControllerCP();
    await system.addComponent('RoomTemperatureControllerCP', roomTemperatureControllerCP);
    const temperatureSensorCP = new TemperatureSensorCP();
    await system.addComponent('TemperatureSensorCP', temperatureSensorCP);
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

    // Configure delegations

    await system.start();
    console.log('System simulation completed');
}

main().catch(err => console.error('Error in execution: ' + err.message))};

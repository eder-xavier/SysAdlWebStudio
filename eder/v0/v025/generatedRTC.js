// @ts-nocheck
// Generated JavaScript code for SysADL Model: RTC
// Model Metadata
const modelPorts = [
  {
    "name": "FTemperatureOPT",
    "flows": [
      {
        "direction": "out",
        "type": "FahrenheitTemperature"
      }
    ],
    "subPorts": []
  },
  {
    "name": "PresenceIPT",
    "flows": [
      {
        "direction": "in",
        "type": "Boolean"
      }
    ],
    "subPorts": []
  },
  {
    "name": "PresenceOPT",
    "flows": [
      {
        "direction": "out",
        "type": "Boolean"
      }
    ],
    "subPorts": []
  },
  {
    "name": "CTemperatureIPT",
    "flows": [
      {
        "direction": "in",
        "type": "CelsiusTemperature"
      }
    ],
    "subPorts": []
  },
  {
    "name": "CommandIPT",
    "flows": [
      {
        "direction": "in",
        "type": "Command"
      }
    ],
    "subPorts": []
  },
  {
    "name": "CommandOPT",
    "flows": [
      {
        "direction": "out",
        "type": "Command"
      }
    ],
    "subPorts": []
  },
  {
    "name": "CTemperatureOPT",
    "flows": [
      {
        "direction": "out",
        "type": "CelsiusTemperature"
      }
    ],
    "subPorts": []
  }
];
const modelTypes = [
  {
    "kind": "value type",
    "name": "Int",
    "extends": null,
    "content": ""
  },
  {
    "kind": "value type",
    "name": "Boolean",
    "extends": null,
    "content": ""
  },
  {
    "kind": "value type",
    "name": "String",
    "extends": null,
    "content": ""
  },
  {
    "kind": "value type",
    "name": "Void",
    "extends": null,
    "content": ""
  },
  {
    "kind": "value type",
    "name": "Real",
    "extends": null,
    "content": ""
  },
  {
    "kind": "enum",
    "name": "Command",
    "extends": null,
    "content": "On , Off"
  },
  {
    "kind": "datatype",
    "name": "Commands",
    "extends": null,
    "content": "attributes : heater : Command ; cooler : Command ;"
  },
  {
    "kind": "value type",
    "name": "temperature",
    "extends": "Real",
    "content": "dimension = Temperature"
  },
  {
    "kind": "value type",
    "name": "FahrenheitTemperature",
    "extends": "temperature",
    "content": "unit = Fahrenheit dimension = Temperature"
  },
  {
    "kind": "value type",
    "name": "CelsiusTemperature",
    "extends": "temperature",
    "content": "unit = Celsius dimension = Temperature"
  }
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
        this.heater = params.heater ?? Command.On;
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
                const enumValues = this.modelTypes.find(t => t.name === port.flowType)?.content.match(/(w+)/g) || ['Off'];
                simulatedValue = RTC[enumValues[0]];
                console.log(`Simulating enum input ${simulatedValue} for ${this.name}.${port.name}`);
            } else if (this.modelTypes.find(t => t.name === port.flowType && t.kind === 'datatype')) {
                simulatedValue = new RTC({});
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
        // Initialize ports
        this.addPort(new SysADLPort('current1', 'FTemperatureOPT', 'out', [], 'FahrenheitTemperature'));
        this.addPort(new SysADLPort('current2', 'FTemperatureOPT', 'out', [], 'FahrenheitTemperature'));
        this.addPort(new SysADLPort('detected', 'PresenceOPT', 'out', [], 'Boolean'));
        this.addPort(new SysADLPort('desired', 'CTemperatureOPT', 'out', [], 'CelsiusTemperature'));
        // Initialize subcomponents
        // Initialize state
        this.state['current1'] = null;
        this.state['current2'] = null;
        this.state['detected'] = false;
        this.state['desired'] = null;
        // Register activities
    }
}
class RoomTemperatureControllerCP extends SysADLComponent {
    constructor() {
        super('RoomTemperatureControllerCP', false, modelPorts, modelTypes);
        // Initialize ports
        this.addPort(new SysADLPort('detectedRTC', 'PresenceIPT', 'in', [], 'Boolean'));
        this.addPort(new SysADLPort('s1', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('s2', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('desiredRTC', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('commandH', 'CommandOPT', 'out', [], 'Command'));
        this.addPort(new SysADLPort('commandC', 'CommandOPT', 'out', [], 'Command'));
        // Initialize subcomponents
        this.S1 = new TemperatureSensorCP();
        this.addSubComponent('S1', this.S1);
        // Initialize state
        this.state['detectedRTC'] = false;
        this.state['s1'] = null;
        this.state['s2'] = null;
        this.state['desiredRTC'] = null;
        this.state['commandH'] = Command.On;
        this.state['commandC'] = Command.On;
        // Register activities
        this.activities.push({ methodName: 'executeControlTemperature' });
        this.S1.activities.forEach(activity => this.activities.push({ methodName: 'S1_execute_${activity.methodName}' }));
    }
    async executeControlTemperature() {
        console.log('Executing activity ControlTemperature in component ');
        const params = { detectedRTC: this.state['detectedRTC'] ?? null, s1: this.state['s1'] ?? null, s2: this.state['s2'] ?? null, desiredRTC: this.state['desiredRTC'] ?? null };
        console.log('Activity ControlTemperature returning: ' + this.state['commandH'] || this.state['commandC']);
        return this.state['commandH'] || this.state['commandC'];
    }
    async S1_execute(methodName) {
        console.log(`Executing subcomponent activity S1.${methodName}`);
        return await this.S1[methodName]();
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
        this.addPort(new SysADLPort('target1', 'CTemperatureOPT', 'out', [], 'CelsiusTemperature'));
        // Initialize subcomponents
        // Initialize state
        this.state['detected'] = false;
        this.state['target1'] = null;
        this.state['userTemp'] = null;
        // Register activities
        this.activities.push({ methodName: 'executeCheckPresence' });
    }
    async executeCheckPresence() {
        console.log('Executing activity CheckPresence in component ');
        const params = { detected: this.state['detected'] ?? null, userTemp: this.state['userTemp'] ?? null };
        let userTemp = this.state['userTemp'] ?? null;
            console.log('Executing action checkPresence with executable CheckPresenceToSetTemperature in activity CheckPresence');
            const checkPresence_result = await CheckPresenceToSetTemperature({ userTemp: this.state['userTemp'] ?? null, presence: this.state['presence'] ?? null });
            console.log('Validating constraint CheckPresenceToSetTemperatureEQ');
            try {
                await validateCheckPresenceToSetTemperatureEQ({ userTemp: this.state['userTemp'] ?? null, presence: this.state['presence'] ?? null, checkPresence: checkPresence_result });
            } catch (e) {
                console.error('Constraint CheckPresenceToSetTemperatureEQ violated: ' + e.message);
                return null;
            }
            console.log('Storing result ' + checkPresence_result + ' to state target1 from action checkPresence');
            this.state['target1'] = checkPresence_result;
        console.log('Activity CheckPresence returning: ' + this.state['target1']);
        return this.state['target1'];
    }
}
class CommanderCP extends SysADLComponent {
    constructor() {
        super('CommanderCP', false, modelPorts, modelTypes);
        // Initialize ports
        this.addPort(new SysADLPort('target2', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('commandH', 'CommandOPT', 'out', [], 'Command'));
        this.addPort(new SysADLPort('commandC', 'CommandOPT', 'out', [], 'Command'));
        // Initialize subcomponents
        // Initialize state
        this.state['target2'] = null;
        this.state['commandH'] = Command.On;
        this.state['commandC'] = Command.On;
        this.state['average'] = null;
        // Register activities
        this.activities.push({ methodName: 'executeCompareTemperature' });
    }
    async executeCompareTemperature() {
        console.log('Executing activity CompareTemperature in component ');
        const params = { target: this.state['target'] ?? null, average: this.state['average'] ?? null };
        let average = this.state['average'] ?? null;
            console.log('Executing action compare with executable CompareTemperatureEx in activity CompareTemperature');
            const compare_result = await CompareTemperatureEx({ target: this.state['target'] ?? null, average: this.state['average'] ?? null });
            console.log('Validating constraint CompareTemperatureEQ');
            try {
                await validateCompareTemperatureEQ({ target: this.state['target'] ?? null, average: this.state['average'] ?? null, compare: compare_result });
            } catch (e) {
                console.error('Constraint CompareTemperatureEQ violated: ' + e.message);
                return null;
            }
            console.log('Storing result ' + compare_result + ' to state cmds from action compare');
            this.state['cmds'] = compare_result;
        console.log('Activity CompareTemperature returning: ' + this.state['commandH'] || this.state['commandC']);
        return this.state['commandH'] || this.state['commandC'];
    }
}
class SensorsMonitorCP extends SysADLComponent {
    constructor() {
        super('SensorsMonitorCP', false, modelPorts, modelTypes);
        // Initialize ports
        this.addPort(new SysADLPort('s1', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('s2', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('average', 'CTemperatureOPT', 'out', [], 'CelsiusTemperature'));
        // Initialize subcomponents
        // Initialize state
        this.state['s1'] = null;
        this.state['s2'] = null;
        this.state['average'] = null;
        this.state['temp1'] = null;
        this.state['temp2'] = null;
        // Register activities
        this.activities.push({ methodName: 'executeCalculateAverageTemperature' });
    }
    async executeCalculateAverageTemperature() {
        console.log('Executing activity CalculateAverageTemperature in component ');
        const params = { temp1: this.state['temp1'] ?? null, temp2: this.state['temp2'] ?? null };
        let temp1 = this.state['temp1'] ?? null;
        let temp2 = this.state['temp2'] ?? null;
            console.log('Executing action calculateAverage with executable CalculateAverageTemperatureEx in activity CalculateAverageTemperature');
            const calculateAverage_result = await CalculateAverageTemperatureEx({ temp1: this.state['temp1'] ?? null, temp2: this.state['temp2'] ?? null });
            console.log('Validating constraint CalculateAverageTemperatureEQ');
            try {
                await validateCalculateAverageTemperatureEQ({ temp1: this.state['temp1'] ?? null, temp2: this.state['temp2'] ?? null, calculateAverage: calculateAverage_result });
            } catch (e) {
                console.error('Constraint CalculateAverageTemperatureEQ violated: ' + e.message);
                return null;
            }
            console.log('Storing result ' + calculateAverage_result + ' to state average from action calculateAverage');
            this.state['average'] = calculateAverage_result;
        console.log('Activity CalculateAverageTemperature returning: ' + this.state['average']);
        return this.state['average'];
    }
}
// Executables
async function CommandCoolerEx(params = {}) {
    console.log(`Executing executable CommandCoolerEx with params: ${JSON.stringify(params)}`);
    let cooler = params.cooler ?? null;
    let cmds = params.cmds ?? null;
return cmds.cooler;
}
async function CommandHeaterEx(params = {}) {
    console.log(`Executing executable CommandHeaterEx with params: ${JSON.stringify(params)}`);
    let heater = params.heater ?? null;
    let cmds = params.cmds ?? null;
return cmds.heater;
}
async function FahrenheitToCelsiusEx(params = {}) {
    console.log(`Executing executable FahrenheitToCelsiusEx with params: ${JSON.stringify(params)}`);
    let f = params.f ?? null;
let c = (5 * (f - 32)) / 9; return c;
}
async function CalculateAverageTemperatureEx(params = {}) {
    console.log(`Executing executable CalculateAverageTemperatureEx with params: ${JSON.stringify(params)}`);
    let temp2 = params.temp2 ?? null;
    let temp1 = params.temp1 ?? null;
return (temp1 + temp2) / 2;
}
async function CheckPresenceToSetTemperature(params = {}) {
    console.log(`Executing executable CheckPresenceToSetTemperature with params: ${JSON.stringify(params)}`);
    let userTemp = params.userTemp ?? null;
    let presence = params.presence ?? null;
return presence ? userTemp : 2;
}
async function CompareTemperatureEx(params = {}) {
    console.log(`Executing executable CompareTemperatureEx with params: ${JSON.stringify(params)}`);
    let new = params.new ?? null;
    let target = params.target ?? null;
    let average = params.average ?? null;
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
async function validateCalculateAverageTemperatureEQ(params = {}) {
    const t1 = params.t1 ?? 0;
    const t2 = params.t2 ?? 0;
    const av = params.av ?? 0;
    console.log(`Evaluating constraint CalculateAverageTemperatureEQ: params.av ==== (params.t1 + params.t2)/2`);
    const result = params.av ==== (params.t1 + params.t2)/2;
    if (!result) {
        throw new Error('Constraint CalculateAverageTemperatureEQ violated');
    }
    console.log('Constraint CalculateAverageTemperatureEQ passed');
    return result;
}
async function validateCompareTemperatureEQ(params = {}) {
    const target = params.target ?? 0;
    const average = params.average ?? 0;
    const cmds = params.cmds ?? new Commands({});
    console.log(`Evaluating constraint CompareTemperatureEQ: params.(average > params.target ) ? (params.cmds.params.heater ==== Command.params.Off && cmds.params.cooler ==== Command.params.On ) : (cmds.heater ==== Command.On && cmds.cooler ==== Command.Off)`);
    const result = params.(average > params.target ) ? (params.cmds.params.heater ==== Command.params.Off && cmds.params.cooler ==== Command.params.On ) : (cmds.heater ==== Command.On && cmds.cooler ==== Command.Off);
    if (!result) {
        throw new Error('Constraint CompareTemperatureEQ violated');
    }
    console.log('Constraint CompareTemperatureEQ passed');
    return result;
}
async function validateFahrenheitToCelsiusEQ(params = {}) {
    const f = params.f ?? 0;
    const c = params.c ?? 0;
    console.log(`Evaluating constraint FahrenheitToCelsiusEQ: params.c ==== (5*(params.f - 32)/9)`);
    const result = params.c ==== (5*(params.f - 32)/9);
    if (!result) {
        throw new Error('Constraint FahrenheitToCelsiusEQ violated');
    }
    console.log('Constraint FahrenheitToCelsiusEQ passed');
    return result;
}
async function validateCommandHeaterEQ(params = {}) {
    const cmds = params.cmds ?? new Commands({});
    const c = params.c ?? Command.On;
    console.log(`Evaluating constraint CommandHeaterEQ: params.c ==== params.cmds.params.heater`);
    const result = params.c ==== params.cmds.params.heater;
    if (!result) {
        throw new Error('Constraint CommandHeaterEQ violated');
    }
    console.log('Constraint CommandHeaterEQ passed');
    return result;
}
async function validateCommandCoolerEQ(params = {}) {
    const cmds = params.cmds ?? new Commands({});
    const c = params.c ?? Command.On;
    console.log(`Evaluating constraint CommandCoolerEQ: params.c ==== params.cmds.params.cooler`);
    const result = params.c ==== params.cmds.params.cooler;
    if (!result) {
        throw new Error('Constraint CommandCoolerEQ violated');
    }
    console.log('Constraint CommandCoolerEQ passed');
    return result;
}
async function validateCheckPresenceToSetTemperatureEQ(params = {}) {
    const detected = params.detected ?? false;
    const userTemp = params.userTemp ?? 0;
    const target = params.target ?? 0;
    console.log(`Evaluating constraint CheckPresenceToSetTemperatureEQ: params.detected ? params.target ==== params.userTemp : target ==== 2`);
    const result = params.detected ? params.target ==== params.userTemp : target ==== 2;
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
    const r_t_c_system_c_f_d = new RTCSystemCFD();
    await system.addComponent('RTCSystemCFD', r_t_c_system_c_f_d);
    const room_temperature_controller_c_p = new RoomTemperatureControllerCP();
    await system.addComponent('RoomTemperatureControllerCP', room_temperature_controller_c_p);
    const temperature_sensor_c_p = new TemperatureSensorCP();
    await system.addComponent('TemperatureSensorCP', temperature_sensor_c_p);
    const presence_sensor_c_p = new PresenceSensorCP();
    await system.addComponent('PresenceSensorCP', presence_sensor_c_p);
    const user_interface_c_p = new UserInterfaceCP();
    await system.addComponent('UserInterfaceCP', user_interface_c_p);
    const heater_c_p = new HeaterCP();
    await system.addComponent('HeaterCP', heater_c_p);
    const cooler_c_p = new CoolerCP();
    await system.addComponent('CoolerCP', cooler_c_p);
    const presence_checker_c_p = new PresenceCheckerCP();
    await system.addComponent('PresenceCheckerCP', presence_checker_c_p);
    const commander_c_p = new CommanderCP();
    await system.addComponent('CommanderCP', commander_c_p);
    const sensors_monitor_c_p = new SensorsMonitorCP();
    await system.addComponent('SensorsMonitorCP', sensors_monitor_c_p);
    // Initialize connectors
    const fahrenheit_to_celsius_c_n = new FahrenheitToCelsiusCN();
    await system.addConnector('FahrenheitToCelsiusCN', fahrenheit_to_celsius_c_n);
    const presence_c_n = new PresenceCN();
    await system.addConnector('PresenceCN', presence_c_n);
    const command_c_n = new CommandCN();
    await system.addConnector('CommandCN', command_c_n);
    const c_temperature_c_n = new CTemperatureCN();
    await system.addConnector('CTemperatureCN', c_temperature_c_n);
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
    const room_temperature_controller_c_p = system.components.get('RoomTemperatureControllerCP');
    const current1Port = system.components.get('RTCSystemCFD')?.ports.find(p => p.name === 'current1');
    const s1Port = room_temperature_controller_c_p.ports.find(p => p.name === 's1');
    if (s1Port && current1Port) {
        console.log('Configuring delegation from RTCSystemCFD.current1 to RoomTemperatureControllerCP.s1');
        current1Port.receive = async (data) => {
            console.log(`Delegating data ${JSON.stringify(data)} from RTCSystemCFD.current1 to RoomTemperatureControllerCP.s1`);
            await s1Port.receive(data);
            await room_temperature_controller_c_p.onDataReceived('s1', data);
        };
    }
    const current2Port = system.components.get('RTCSystemCFD')?.ports.find(p => p.name === 'current2');
    const s2Port = room_temperature_controller_c_p.ports.find(p => p.name === 's2');
    if (s2Port && current2Port) {
        console.log('Configuring delegation from RTCSystemCFD.current2 to RoomTemperatureControllerCP.s2');
        current2Port.receive = async (data) => {
            console.log(`Delegating data ${JSON.stringify(data)} from RTCSystemCFD.current2 to RoomTemperatureControllerCP.s2`);
            await s2Port.receive(data);
            await room_temperature_controller_c_p.onDataReceived('s2', data);
        };
    }
    const detectedPort = system.components.get('PresenceSensorCP')?.ports.find(p => p.name === 'detected');
    const detectedRTCPort = room_temperature_controller_c_p.ports.find(p => p.name === 'detectedRTC');
    if (detectedRTCPort && detectedPort) {
        console.log('Configuring delegation from PresenceSensorCP.detected to RoomTemperatureControllerCP.detectedRTC');
        detectedPort.receive = async (data) => {
            console.log(`Delegating data ${JSON.stringify(data)} from PresenceSensorCP.detected to RoomTemperatureControllerCP.detectedRTC`);
            await detectedRTCPort.receive(data);
            await room_temperature_controller_c_p.onDataReceived('detectedRTC', data);
        };
    }
    const desiredPort = system.components.get('UserInterfaceCP')?.ports.find(p => p.name === 'desired');
    const desiredRTCPort = room_temperature_controller_c_p.ports.find(p => p.name === 'desiredRTC');
    if (desiredRTCPort && desiredPort) {
        console.log('Configuring delegation from UserInterfaceCP.desired to RoomTemperatureControllerCP.desiredRTC');
        desiredPort.receive = async (data) => {
            console.log(`Delegating data ${JSON.stringify(data)} from UserInterfaceCP.desired to RoomTemperatureControllerCP.desiredRTC`);
            await desiredRTCPort.receive(data);
            await room_temperature_controller_c_p.onDataReceived('desiredRTC', data);
        };
    }
    const commandHPort = system.components.get('RoomTemperatureControllerCP')?.ports.find(p => p.name === 'commandH');
    const controllerHPort = room_temperature_controller_c_p.ports.find(p => p.name === 'controllerH');
    if (controllerHPort && commandHPort) {
        console.log('Configuring delegation from RoomTemperatureControllerCP.commandH to RoomTemperatureControllerCP.controllerH');
        commandHPort.receive = async (data) => {
            console.log(`Delegating data ${JSON.stringify(data)} from RoomTemperatureControllerCP.commandH to RoomTemperatureControllerCP.controllerH`);
            await controllerHPort.receive(data);
            await room_temperature_controller_c_p.onDataReceived('controllerH', data);
        };
    }
    const commandCPort = system.components.get('RoomTemperatureControllerCP')?.ports.find(p => p.name === 'commandC');
    const controllerCPort = room_temperature_controller_c_p.ports.find(p => p.name === 'controllerC');
    if (controllerCPort && commandCPort) {
        console.log('Configuring delegation from RoomTemperatureControllerCP.commandC to RoomTemperatureControllerCP.controllerC');
        commandCPort.receive = async (data) => {
            console.log(`Delegating data ${JSON.stringify(data)} from RoomTemperatureControllerCP.commandC to RoomTemperatureControllerCP.controllerC`);
            await controllerCPort.receive(data);
            await room_temperature_controller_c_p.onDataReceived('controllerC', data);
        };
    }
    await system.start();
    console.log('System simulation completed');
}
main().catch(err => console.error(`Error in execution: ${err.message}`));

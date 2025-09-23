// @ts-nocheck
// Generated JavaScript code for SysADL Architecture: Simple

// Types
export const Real = 'any';
export const FahrenheitTemperature = 'any';
export const CelsiusTemperature = 'any';
export const Command = {
    On: 'On',
    Off: 'Off'
};
export const Commands = 'any';

// Base Port Class
export class SysADLPort {
    constructor(name, flowType, direction = "inout") {
        console.log(`Initializing port ${name} with flowType ${flowType}, direction ${direction}`);
        this.name = name;
        this.flowType = flowType || "any";
        this.direction = direction;
        this.value = null;
        this.bindings = [];
        this.onDataReceivedCallback = null;
    }

    addBinding(binding) {
        this.bindings.push(binding);
        console.log(`Binding added to port ${this.name}: ${binding.sourceComponent?.name || "undefined"}.${binding.sourcePort?.name || "undefined"} -> ${binding.targetComponent?.name || "undefined"}.${binding.targetPort?.name || "undefined"}`);
    }

    setOnDataReceivedCallback(callback) {
        this.onDataReceivedCallback = callback;
    }

    async send(data) {
        console.log(`Port ${this.name} sending data: ${JSON.stringify(data)}`);
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
            console.log(`Propagating data ${data} via binding to ${binding.targetPort?.name}`);
            await binding.connector.transmit(data);
        }
        return true;
    }

    async receive(data) {
        console.log(`Port ${this.name} receiving data: ${JSON.stringify(data)}`);
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
        console.log(`Connector ${this.name} configured with sourcePort ${sourcePort?.name || "undefined"} and targetPort ${targetPort?.name || "undefined"}`);
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
        console.log(`Creating binding from ${sourceComponent.name}.${sourcePort.name} to ${targetComponent.name}.${targetPort.name} via ${connector.name}`);
        this.sourceComponent = sourceComponent;
        this.sourcePort = sourcePort;
        this.targetComponent = targetComponent;
        this.targetPort = targetPort;
        this.connector = connector;
    }
}

// Base Component Class
export class SysADLComponent {
    constructor(name) {
        this.name = name;
        this.ports = [];
        this.subComponents = new Map();
        this.connectors = new Map();
        this.bindings = [];
        this.configureBindings();
    }

    addBinding(binding) {
        this.bindings.push(binding);
        binding.sourcePort.addBinding(binding);
        binding.targetPort.addBinding(binding);
        console.log(`Binding added: ${binding.sourceComponent.name}.${binding.sourcePort.name} -> ${binding.targetComponent.name}.${binding.targetPort.name} via ${binding.connector.name}`);
    }

    async start() {
        console.log(`Starting component ${this.name}`);
        await Promise.all(Array.from(this.subComponents.values()).map(c => c.start ? c.start() : Promise.resolve()));
    }
}

// Component Classes
export class RTCSystemCFD  {
    constructor() {
        console.log(`Initializing component RTCSystemCFD`); this.name = 'RTCSystemCFD'; this.ports = []; this.bindings = [];
        this.ports.push(new SysADLPort('current1', 'FahrenheitTemperature', 'out'));
    }

    async start() {
        console.log('Starting simple component RTCSystemCFD');
    }
}

export class RoomTemperatureControllerCP  {
    constructor() {
        console.log(`Initializing component RoomTemperatureControllerCP`); this.name = 'RoomTemperatureControllerCP'; this.ports = []; this.bindings = [];
        this.ports.push(new SysADLPort('s1', 'CelsiusTemperature', 'in'));
    }

    async start() {
        console.log('Starting simple component RoomTemperatureControllerCP');
    }
}

export class TemperatureSensorCP  {
    constructor() {
        console.log(`Initializing component TemperatureSensorCP`); this.name = 'TemperatureSensorCP'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component TemperatureSensorCP');
    }
}

export class PresenceSensorCP  {
    constructor() {
        console.log(`Initializing component PresenceSensorCP`); this.name = 'PresenceSensorCP'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component PresenceSensorCP');
    }
}

export class UserInterfaceCP  {
    constructor() {
        console.log(`Initializing component UserInterfaceCP`); this.name = 'UserInterfaceCP'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component UserInterfaceCP');
    }
}

export class HeaterCP  {
    constructor() {
        console.log(`Initializing component HeaterCP`); this.name = 'HeaterCP'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component HeaterCP');
    }
}

export class CoolerCP  {
    constructor() {
        console.log(`Initializing component CoolerCP`); this.name = 'CoolerCP'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component CoolerCP');
    }
}

export class PresenceCheckerCP  {
    constructor() {
        console.log(`Initializing component PresenceCheckerCP`); this.name = 'PresenceCheckerCP'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component PresenceCheckerCP');
    }
}

export class CommanderCP  {
    constructor() {
        console.log(`Initializing component CommanderCP`); this.name = 'CommanderCP'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component CommanderCP');
    }
}

export class SensorsMonitorCP  {
    constructor() {
        console.log(`Initializing component SensorsMonitorCP`); this.name = 'SensorsMonitorCP'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component SensorsMonitorCP');
    }
}

// Connector Classes
export class FahrenheitToCelsiusCN extends SysADLConnector {
    constructor() {
        super('FahrenheitToCelsiusCN', null, null, null, null);
    }
}

export class PresenceCN extends SysADLConnector {
    constructor() {
        super('PresenceCN', null, null, null, null);
    }
}

export class CommandCN extends SysADLConnector {
    constructor() {
        super('CommandCN', null, null, null, null);
    }
}

export class CTemperatureCN extends SysADLConnector {
    constructor() {
        super('CTemperatureCN', null, null, null, null);
    }
}

// Executables
export async function CommandCoolerEx(params = {}) {
    console.log(`Executing CommandCoolerEx with params: ${JSON.stringify(params)}`);
    const cmds = params.cmds !== undefined ? params.cmds : {'heater':'Command::On','cooler':'Command::On'};
    return return cmds.cooler ;;
}

export async function CommandHeaterEx(params = {}) {
    console.log(`Executing CommandHeaterEx with params: ${JSON.stringify(params)}`);
    const cmds = params.cmds !== undefined ? params.cmds : {'heater':'Command::On','cooler':'Command::On'};
    return return cmds.heater ;;
}

export async function FahrenheitToCelsiusEx(params = {}) {
    console.log(`Executing FahrenheitToCelsiusEx with params: ${JSON.stringify(params)}`);
    const f = params.f !== undefined ? params.f : 32.0;
    return return 5*(f - 32)/9 ;;
}

export async function CalculateAverageTemperatureEx(params = {}) {
    console.log(`Executing CalculateAverageTemperatureEx with params: ${JSON.stringify(params)}`);
    const temp1 = params.temp1 !== undefined ? params.temp1 : 0.0;
    const temp2 = params.temp2 !== undefined ? params.temp2 : 0.0;
    return return (temp1 + temp2)/2 ;;
}

export async function CheckPresenceToSetTemperature(params = {}) {
    console.log(`Executing CheckPresenceToSetTemperature with params: ${JSON.stringify(params)}`);
    const presence = params.presence !== undefined ? params.presence : false;
    const userTemp = params.userTemp !== undefined ? params.userTemp : 0.0;
    return if(presence == true) return userTemp; else return 2;;
}

export async function CompareTemperatureEx(params = {}) {
    console.log(`Executing CompareTemperatureEx with params: ${JSON.stringify(params)}`);
    const target = params.target !== undefined ? params.target : 0.0;
    const average = params.average !== undefined ? params.average : 0.0;
    return let heater:Command = types.Command::Off; let cooler:Command = types.Command::Off; if(average > target) {heater = types.Command::Off; cooler = types.Command::On ;;
}

// Constraints
export function CalculateAverageTemperatureEQ(t1, t2, av) {
    console.log(`Evaluating constraint CalculateAverageTemperatureEQ with args: ${JSON.stringify({ t1, t2, av })}`);
    return av === (t1 + t2)/2;
}

export async function validateCalculateAverageTemperatureEQ(params = {}) {
    console.log(`Validating constraint CalculateAverageTemperatureEQ with params: ${JSON.stringify(params)}`);
    try {
        if (params.input === undefined || params.output === undefined) {
            console.error('Constraint CalculateAverageTemperatureEQ: Invalid params', JSON.stringify(params));
            throw new Error('Constraint CalculateAverageTemperatureEQ: Missing input or output');
        }
        const t1 = params.t1 !== undefined ? params.t1 : 0.0;
        const t2 = params.t2 !== undefined ? params.t2 : 0.0;
        const av = params.output !== undefined ? params.output : 0.0;
        const result = CalculateAverageTemperatureEQ(t1, t2, av);
        if (!result) {
            throw new Error('Constraint CalculateAverageTemperatureEQ violated');
        }
        console.log('Constraint CalculateAverageTemperatureEQ passed');
        return result;
    } catch (e) {
        console.error('Constraint CalculateAverageTemperatureEQ error: ' + e.message);
        throw e;
    }
}

export function CompareTemperatureEQ(target, average, cmds) {
    console.log(`Evaluating constraint CompareTemperatureEQ with args: ${JSON.stringify({ target, average, cmds })}`);
    return average > target ? cmds === types.Commands.heater.Off && types.Commands.cooler.On : types.Commands.heater.On && cmds === types.Commands.cooler.Off;
}

export async function validateCompareTemperatureEQ(params = {}) {
    console.log(`Validating constraint CompareTemperatureEQ with params: ${JSON.stringify(params)}`);
    try {
        if (params.input === undefined || params.output === undefined) {
            console.error('Constraint CompareTemperatureEQ: Invalid params', JSON.stringify(params));
            throw new Error('Constraint CompareTemperatureEQ: Missing input or output');
        }
        const target = params.target !== undefined ? params.target : 0.0;
        const average = params.average !== undefined ? params.average : 0.0;
        const cmds = params.output !== undefined ? params.output : {'heater':'Command::On','cooler':'Command::On'};
        const result = CompareTemperatureEQ(target, average, cmds);
        if (!result) {
            throw new Error('Constraint CompareTemperatureEQ violated');
        }
        console.log('Constraint CompareTemperatureEQ passed');
        return result;
    } catch (e) {
        console.error('Constraint CompareTemperatureEQ error: ' + e.message);
        throw e;
    }
}

export function FahrenheitToCelsiusEQ(f, c) {
    console.log(`Evaluating constraint FahrenheitToCelsiusEQ with args: ${JSON.stringify({ f, c })}`);
    return c === (5*(f - 32)/9);
}

export async function validateFahrenheitToCelsiusEQ(params = {}) {
    console.log(`Validating constraint FahrenheitToCelsiusEQ with params: ${JSON.stringify(params)}`);
    try {
        if (params.input === undefined || params.output === undefined) {
            console.error('Constraint FahrenheitToCelsiusEQ: Invalid params', JSON.stringify(params));
            throw new Error('Constraint FahrenheitToCelsiusEQ: Missing input or output');
        }
        const f = params.f !== undefined ? params.f : 32.0;
        const c = params.output !== undefined ? params.output : 0.0;
        const result = FahrenheitToCelsiusEQ(f, c);
        if (!result) {
            throw new Error('Constraint FahrenheitToCelsiusEQ violated');
        }
        console.log('Constraint FahrenheitToCelsiusEQ passed');
        return result;
    } catch (e) {
        console.error('Constraint FahrenheitToCelsiusEQ error: ' + e.message);
        throw e;
    }
}

export function CommandHeaterEQ(cmds, c) {
    console.log(`Evaluating constraint CommandHeaterEQ with args: ${JSON.stringify({ cmds, c })}`);
    return c === cmds.heater;
}

export async function validateCommandHeaterEQ(params = {}) {
    console.log(`Validating constraint CommandHeaterEQ with params: ${JSON.stringify(params)}`);
    try {
        if (params.input === undefined || params.output === undefined) {
            console.error('Constraint CommandHeaterEQ: Invalid params', JSON.stringify(params));
            throw new Error('Constraint CommandHeaterEQ: Missing input or output');
        }
        const cmds = params.cmds !== undefined ? params.cmds : {'heater':'Command::On','cooler':'Command::On'};
        const c = params.output !== undefined ? params.output : Command::On;
        const result = CommandHeaterEQ(cmds, c);
        if (!result) {
            throw new Error('Constraint CommandHeaterEQ violated');
        }
        console.log('Constraint CommandHeaterEQ passed');
        return result;
    } catch (e) {
        console.error('Constraint CommandHeaterEQ error: ' + e.message);
        throw e;
    }
}

export function CommandCoolerEQ(cmds, c) {
    console.log(`Evaluating constraint CommandCoolerEQ with args: ${JSON.stringify({ cmds, c })}`);
    return c === cmds.cooler;
}

export async function validateCommandCoolerEQ(params = {}) {
    console.log(`Validating constraint CommandCoolerEQ with params: ${JSON.stringify(params)}`);
    try {
        if (params.input === undefined || params.output === undefined) {
            console.error('Constraint CommandCoolerEQ: Invalid params', JSON.stringify(params));
            throw new Error('Constraint CommandCoolerEQ: Missing input or output');
        }
        const cmds = params.cmds !== undefined ? params.cmds : {'heater':'Command::On','cooler':'Command::On'};
        const c = params.output !== undefined ? params.output : Command::On;
        const result = CommandCoolerEQ(cmds, c);
        if (!result) {
            throw new Error('Constraint CommandCoolerEQ violated');
        }
        console.log('Constraint CommandCoolerEQ passed');
        return result;
    } catch (e) {
        console.error('Constraint CommandCoolerEQ error: ' + e.message);
        throw e;
    }
}

export function CheckPresenceToSetTemperatureEQ(detected, userTemp, target) {
    console.log(`Evaluating constraint CheckPresenceToSetTemperatureEQ with args: ${JSON.stringify({ detected, userTemp, target })}`);
    return detected === true ? target === userTemp : target === 2;
}

export async function validateCheckPresenceToSetTemperatureEQ(params = {}) {
    console.log(`Validating constraint CheckPresenceToSetTemperatureEQ with params: ${JSON.stringify(params)}`);
    try {
        if (params.input === undefined || params.output === undefined) {
            console.error('Constraint CheckPresenceToSetTemperatureEQ: Invalid params', JSON.stringify(params));
            throw new Error('Constraint CheckPresenceToSetTemperatureEQ: Missing input or output');
        }
        const detected = params.detected !== undefined ? params.detected : false;
        const userTemp = params.userTemp !== undefined ? params.userTemp : 0.0;
        const target = params.output !== undefined ? params.output : 0.0;
        const result = CheckPresenceToSetTemperatureEQ(detected, userTemp, target);
        if (!result) {
            throw new Error('Constraint CheckPresenceToSetTemperatureEQ violated');
        }
        console.log('Constraint CheckPresenceToSetTemperatureEQ passed');
        return result;
    } catch (e) {
        console.error('Constraint CheckPresenceToSetTemperatureEQ error: ' + e.message);
        throw e;
    }
}

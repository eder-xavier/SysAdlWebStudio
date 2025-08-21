// @ts-nocheck
// Generated JavaScript code for SysADL Architecture: SysADLArchitecture

// Types
export const Real = 'any';
export const FahrenheitTemperature = 'any';
export const CelsiusTemperature = 'any';
export const NotificationToSupervisory = {
    departed: 'departed',
    arrived: 'arrived',
    passed: 'passed',
    traveling: 'traveling'
};
export const NotificationFromArm = {
    loaded: 'loaded',
    unloaded: 'unloaded'
};
export const CommandToArm = {
    load: 'load',
    unload: 'unload',
    idle: 'idle'
};
export const NotificationFromMotor = {
    started: 'started',
    stopped: 'stopped'
};
export const CommandToMotor = {
    start: 'start',
    stop: 'stop'
};
export const Status = 'any';
export const Location = 'any';
export const VehicleData = 'any';

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
export class FactoryAutomationSystem  {
    constructor() {
        console.log(`Initializing component FactoryAutomationSystem`); this.name = 'FactoryAutomationSystem'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component FactoryAutomationSystem');
    }
}

export class DisplaySystem  {
    constructor() {
        console.log(`Initializing component DisplaySystem`); this.name = 'DisplaySystem'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component DisplaySystem');
    }
}

export class SupervisorySystem  {
    constructor() {
        console.log(`Initializing component SupervisorySystem`); this.name = 'SupervisorySystem'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component SupervisorySystem');
    }
}

export class AGVSystem  {
    constructor() {
        console.log(`Initializing component AGVSystem`); this.name = 'AGVSystem'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component AGVSystem');
    }
}

export class RobotArm  {
    constructor() {
        console.log(`Initializing component RobotArm`); this.name = 'RobotArm'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component RobotArm');
    }
}

export class Motor  {
    constructor() {
        console.log(`Initializing component Motor`); this.name = 'Motor'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component Motor');
    }
}

export class ArrivalSensor  {
    constructor() {
        console.log(`Initializing component ArrivalSensor`); this.name = 'ArrivalSensor'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component ArrivalSensor');
    }
}

export class VehicleControl  {
    constructor() {
        console.log(`Initializing component VehicleControl`); this.name = 'VehicleControl'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component VehicleControl');
    }
}

export class VehicleTimer  {
    constructor() {
        console.log(`Initializing component VehicleTimer`); this.name = 'VehicleTimer'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component VehicleTimer');
    }
}

export class NotifierArm  {
    constructor() {
        console.log(`Initializing component NotifierArm`); this.name = 'NotifierArm'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component NotifierArm');
    }
}

export class ControlArm  {
    constructor() {
        console.log(`Initializing component ControlArm`); this.name = 'ControlArm'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component ControlArm');
    }
}

export class CheckStation  {
    constructor() {
        console.log(`Initializing component CheckStation`); this.name = 'CheckStation'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component CheckStation');
    }
}

export class NotifierMotor  {
    constructor() {
        console.log(`Initializing component NotifierMotor`); this.name = 'NotifierMotor'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component NotifierMotor');
    }
}

export class StartMoving  {
    constructor() {
        console.log(`Initializing component StartMoving`); this.name = 'StartMoving'; this.ports = []; this.bindings = [];
    }

    async start() {
        console.log('Starting simple component StartMoving');
    }
}

// Connector Classes
export class notifySupervisory extends SysADLConnector {
    constructor() {
        super('notifySupervisory', null, null, null, null);
    }
}

export class sendVehicleData extends SysADLConnector {
    constructor() {
        super('sendVehicleData', null, null, null, null);
    }
}

export class notificationMotor extends SysADLConnector {
    constructor() {
        super('notificationMotor', null, null, null, null);
    }
}

export class commandArm extends SysADLConnector {
    constructor() {
        super('commandArm', null, null, null, null);
    }
}

export class notificationArm extends SysADLConnector {
    constructor() {
        super('notificationArm', null, null, null, null);
    }
}

export class commandMotor extends SysADLConnector {
    constructor() {
        super('commandMotor', null, null, null, null);
    }
}

export class interactionAGVAndSupervisory extends SysADLConnector {
    constructor() {
        super('interactionAGVAndSupervisory', null, null, null, null);
    }
}

export class locationVehicle extends SysADLConnector {
    constructor() {
        super('locationVehicle', null, null, null, null);
    }
}

export class status extends SysADLConnector {
    constructor() {
        super('status', null, null, null, null);
    }
}

// Executables
export async function SendStartMotorEX(params = {}) {
    console.log(`Executing SendStartMotorEX with params: ${JSON.stringify(params)}`);
    const move = params.move !== undefined ? params.move : {'destination':'\'null\'','command':'CommandToArm::load'};
    return return CommandToMotor::start;;
}

export async function SendCommandEX(params = {}) {
    console.log(`Executing SendCommandEX with params: ${JSON.stringify(params)}`);
    const move = params.move !== undefined ? params.move : {'destination':'\'null\'','command':'CommandToArm::load'};
    return return move.command;;
}

export async function SendDestinationEX(params = {}) {
    console.log(`Executing SendDestinationEX with params: ${JSON.stringify(params)}`);
    const move = params.move !== undefined ? params.move : {'destination':'\'null\'','command':'CommandToArm::load'};
    return return move.destination;;
}

export async function NotifyAGVFromMotorEX(params = {}) {
    console.log(`Executing NotifyAGVFromMotorEX with params: ${JSON.stringify(params)}`);
    const statusMotor = params.statusMotor !== undefined ? params.statusMotor : NotificationFromMotor::started;
    return return statusMotor;;
}

export async function NotifySupervisoryFromMotorEX(params = {}) {
    console.log(`Executing NotifySupervisoryFromMotorEX with params: ${JSON.stringify(params)}`);
    const statusMotor = params.statusMotor !== undefined ? params.statusMotor : NotificationFromMotor::started;
    return if (statusMotor == NotificationFromMotor::started) 
			return NotificationToSupervisory::departed;
		else
			return NotificationToSupervisory::traveling;;
}

export async function CompareStationsEX(params = {}) {
    console.log(`Executing CompareStationsEX with params: ${JSON.stringify(params)}`);
    const destination = params.destination !== undefined ? params.destination : "null";
    const location = params.location !== undefined ? params.location : "null";
    const statusMotor = params.statusMotor !== undefined ? params.statusMotor : NotificationFromMotor::started;
    return if(statusMotor == NotificationFromMotor::started && destination == location)
			return true;
		else
			return false;;
}

export async function StopMotorEX(params = {}) {
    console.log(`Executing StopMotorEX with params: ${JSON.stringify(params)}`);
    const comparisonResult = params.comparisonResult !== undefined ? params.comparisonResult : false;
    return if(comparisonResult == true)
			return CommandToMotor::stop;
		else
			return null;;
}

export async function PassedMotorEX(params = {}) {
    console.log(`Executing PassedMotorEX with params: ${JSON.stringify(params)}`);
    const comparisonResult = params.comparisonResult !== undefined ? params.comparisonResult : false;
    return if(comparisonResult == false)
			return NotificationToSupervisory::passed;
		else
			return null;;
}

export async function SendCurrentLocationEX(params = {}) {
    console.log(`Executing SendCurrentLocationEX with params: ${JSON.stringify(params)}`);
    const location = params.location !== undefined ? params.location : "null";
    return return location;;
}

export async function ControlArmEX(params = {}) {
    console.log(`Executing ControlArmEX with params: ${JSON.stringify(params)}`);
    const statusMotor = params.statusMotor !== undefined ? params.statusMotor : NotificationFromMotor::started;
    const cmd = params.cmd !== undefined ? params.cmd : CommandToArm::load;
    return if(statusMotor == NotificationFromMotor::stopped)
			return cmd;
		else
			return CommandToArm::idle;;
}

export async function NotifierArmEX(params = {}) {
    console.log(`Executing NotifierArmEX with params: ${JSON.stringify(params)}`);
    const statusArm = params.statusArm !== undefined ? params.statusArm : NotificationFromArm::loaded;
    return return NotificationToSupervisory::arrived;;
}

export async function VehicleTimerEX(params = {}) {
    console.log(`Executing VehicleTimerEX with params: ${JSON.stringify(params)}`);
    const location = params.location !== undefined ? params.location : "null";
    const cmd = params.cmd !== undefined ? params.cmd : CommandToArm::load;
    const destination = params.destination !== undefined ? params.destination : "null";
    return let s : Status;
		s.destination = destination;
		s.location = location;
		s.command = cmd;
		
		return s;;
}

// Constraints
export function SendStartMotorEQ(cmd) {
    console.log(`Evaluating constraint SendStartMotorEQ with args: ${JSON.stringify({ cmd })}`);
    return cmd === /*Se der um Ctrl+space aqui ele n�o mostra as op��es do escopo*/ CommandToMotor::start;
}

export async function validateSendStartMotorEQ(params = {}) {
    console.log(`Validating constraint SendStartMotorEQ with params: ${JSON.stringify(params)}`);
    try {
        if (params.input === undefined || params.output === undefined) {
            console.error('Constraint SendStartMotorEQ: Invalid params', JSON.stringify(params));
            throw new Error('Constraint SendStartMotorEQ: Missing input or output');
        }
        const cmd = params.output !== undefined ? params.output : CommandToMotor::start;
        const result = SendStartMotorEQ(cmd);
        if (!result) {
            throw new Error('Constraint SendStartMotorEQ violated');
        }
        console.log('Constraint SendStartMotorEQ passed');
        return result;
    } catch (e) {
        console.error('Constraint SendStartMotorEQ error: ' + e.message);
        throw e;
    }
}

export function SendDestinationEQ(move, destination) {
    console.log(`Evaluating constraint SendDestinationEQ with args: ${JSON.stringify({ move, destination })}`);
    return destination === move.destination;
}

export async function validateSendDestinationEQ(params = {}) {
    console.log(`Validating constraint SendDestinationEQ with params: ${JSON.stringify(params)}`);
    try {
        if (params.input === undefined || params.output === undefined) {
            console.error('Constraint SendDestinationEQ: Invalid params', JSON.stringify(params));
            throw new Error('Constraint SendDestinationEQ: Missing input or output');
        }
        const move = params.move !== undefined ? params.move : {'destination':'\'null\'','command':'CommandToArm::load'};
        const destination = params.output !== undefined ? params.output : "null";
        const result = SendDestinationEQ(move, destination);
        if (!result) {
            throw new Error('Constraint SendDestinationEQ violated');
        }
        console.log('Constraint SendDestinationEQ passed');
        return result;
    } catch (e) {
        console.error('Constraint SendDestinationEQ error: ' + e.message);
        throw e;
    }
}

export function NotifyAGVFromMotorEQ(inStatusMotor, outStatusMotor) {
    console.log(`Evaluating constraint NotifyAGVFromMotorEQ with args: ${JSON.stringify({ inStatusMotor, outStatusMotor })}`);
    return outStatusMotor === inStatusMotor;
}

export async function validateNotifyAGVFromMotorEQ(params = {}) {
    console.log(`Validating constraint NotifyAGVFromMotorEQ with params: ${JSON.stringify(params)}`);
    try {
        if (params.input === undefined || params.output === undefined) {
            console.error('Constraint NotifyAGVFromMotorEQ: Invalid params', JSON.stringify(params));
            throw new Error('Constraint NotifyAGVFromMotorEQ: Missing input or output');
        }
        const inStatusMotor = params.inStatusMotor !== undefined ? params.inStatusMotor : NotificationFromMotor::started;
        const outStatusMotor = params.output !== undefined ? params.output : NotificationFromMotor::started;
        const result = NotifyAGVFromMotorEQ(inStatusMotor, outStatusMotor);
        if (!result) {
            throw new Error('Constraint NotifyAGVFromMotorEQ violated');
        }
        console.log('Constraint NotifyAGVFromMotorEQ passed');
        return result;
    } catch (e) {
        console.error('Constraint NotifyAGVFromMotorEQ error: ' + e.message);
        throw e;
    }
}

export function SendCommandEQ(move, cmd) {
    console.log(`Evaluating constraint SendCommandEQ with args: ${JSON.stringify({ move, cmd })}`);
    return cmd === move.command;
}

export async function validateSendCommandEQ(params = {}) {
    console.log(`Validating constraint SendCommandEQ with params: ${JSON.stringify(params)}`);
    try {
        if (params.input === undefined || params.output === undefined) {
            console.error('Constraint SendCommandEQ: Invalid params', JSON.stringify(params));
            throw new Error('Constraint SendCommandEQ: Missing input or output');
        }
        const move = params.move !== undefined ? params.move : {'destination':'\'null\'','command':'CommandToArm::load'};
        const cmd = params.output !== undefined ? params.output : CommandToArm::load;
        const result = SendCommandEQ(move, cmd);
        if (!result) {
            throw new Error('Constraint SendCommandEQ violated');
        }
        console.log('Constraint SendCommandEQ passed');
        return result;
    } catch (e) {
        console.error('Constraint SendCommandEQ error: ' + e.message);
        throw e;
    }
}

export function NotifySupervisoryFromMotorEQ(statusMotor, ack) {
    console.log(`Evaluating constraint NotifySupervisoryFromMotorEQ with args: ${JSON.stringify({ statusMotor, ack })}`);
    return statusMotor === NotificationFromMotor::started ? 
			ack === NotificationToSupervisory::departed : 
			ack === NotificationToSupervisory::traveling;
}

export async function validateNotifySupervisoryFromMotorEQ(params = {}) {
    console.log(`Validating constraint NotifySupervisoryFromMotorEQ with params: ${JSON.stringify(params)}`);
    try {
        if (params.input === undefined || params.output === undefined) {
            console.error('Constraint NotifySupervisoryFromMotorEQ: Invalid params', JSON.stringify(params));
            throw new Error('Constraint NotifySupervisoryFromMotorEQ: Missing input or output');
        }
        const statusMotor = params.statusMotor !== undefined ? params.statusMotor : NotificationFromMotor::started;
        const ack = params.output !== undefined ? params.output : NotificationToSupervisory::departed;
        const result = NotifySupervisoryFromMotorEQ(statusMotor, ack);
        if (!result) {
            throw new Error('Constraint NotifySupervisoryFromMotorEQ violated');
        }
        console.log('Constraint NotifySupervisoryFromMotorEQ passed');
        return result;
    } catch (e) {
        console.error('Constraint NotifySupervisoryFromMotorEQ error: ' + e.message);
        throw e;
    }
}

export function NotificationMotorIsStartedEQ(statusMotor) {
    console.log(`Evaluating constraint NotificationMotorIsStartedEQ with args: ${JSON.stringify({ statusMotor })}`);
    return statusMotor === NotificationFromMotor::started;
}

export async function validateNotificationMotorIsStartedEQ(params = {}) {
    console.log(`Validating constraint NotificationMotorIsStartedEQ with params: ${JSON.stringify(params)}`);
    try {
        if (params.input === undefined || params.output === undefined) {
            console.error('Constraint NotificationMotorIsStartedEQ: Invalid params', JSON.stringify(params));
            throw new Error('Constraint NotificationMotorIsStartedEQ: Missing input or output');
        }
        const statusMotor = params.statusMotor !== undefined ? params.statusMotor : NotificationFromMotor::started;
        const result = NotificationMotorIsStartedEQ(statusMotor);
        if (!result) {
            throw new Error('Constraint NotificationMotorIsStartedEQ violated');
        }
        console.log('Constraint NotificationMotorIsStartedEQ passed');
        return result;
    } catch (e) {
        console.error('Constraint NotificationMotorIsStartedEQ error: ' + e.message);
        throw e;
    }
}

export function CompareStationsEQ(dest, loc, result) {
    console.log(`Evaluating constraint CompareStationsEQ with args: ${JSON.stringify({ dest, loc, result })}`);
    return dest === loc ? result === true : result === false;
}

export async function validateCompareStationsEQ(params = {}) {
    console.log(`Validating constraint CompareStationsEQ with params: ${JSON.stringify(params)}`);
    try {
        if (params.input === undefined || params.output === undefined) {
            console.error('Constraint CompareStationsEQ: Invalid params', JSON.stringify(params));
            throw new Error('Constraint CompareStationsEQ: Missing input or output');
        }
        const dest = params.dest !== undefined ? params.dest : "null";
        const loc = params.loc !== undefined ? params.loc : "null";
        const result = params.output !== undefined ? params.output : false;
        const result = CompareStationsEQ(dest, loc, result);
        if (!result) {
            throw new Error('Constraint CompareStationsEQ violated');
        }
        console.log('Constraint CompareStationsEQ passed');
        return result;
    } catch (e) {
        console.error('Constraint CompareStationsEQ error: ' + e.message);
        throw e;
    }
}

export function StopMotorEQ(result, cmd) {
    console.log(`Evaluating constraint StopMotorEQ with args: ${JSON.stringify({ result, cmd })}`);
    return result === true ? cmd === CommandToMotor::stop : cmd === SysADL.types.Void;
}

export async function validateStopMotorEQ(params = {}) {
    console.log(`Validating constraint StopMotorEQ with params: ${JSON.stringify(params)}`);
    try {
        if (params.input === undefined || params.output === undefined) {
            console.error('Constraint StopMotorEQ: Invalid params', JSON.stringify(params));
            throw new Error('Constraint StopMotorEQ: Missing input or output');
        }
        const result = params.result !== undefined ? params.result : false;
        const cmd = params.output !== undefined ? params.output : CommandToMotor::start;
        const result = StopMotorEQ(result, cmd);
        if (!result) {
            throw new Error('Constraint StopMotorEQ violated');
        }
        console.log('Constraint StopMotorEQ passed');
        return result;
    } catch (e) {
        console.error('Constraint StopMotorEQ error: ' + e.message);
        throw e;
    }
}

export function PassedMotorEQ(result, ack) {
    console.log(`Evaluating constraint PassedMotorEQ with args: ${JSON.stringify({ result, ack })}`);
    return result === false ? ack === NotificationToSupervisory::passed : ack === SysADL.types.Void;
}

export async function validatePassedMotorEQ(params = {}) {
    console.log(`Validating constraint PassedMotorEQ with params: ${JSON.stringify(params)}`);
    try {
        if (params.input === undefined || params.output === undefined) {
            console.error('Constraint PassedMotorEQ: Invalid params', JSON.stringify(params));
            throw new Error('Constraint PassedMotorEQ: Missing input or output');
        }
        const result = params.result !== undefined ? params.result : false;
        const ack = params.output !== undefined ? params.output : NotificationToSupervisory::departed;
        const result = PassedMotorEQ(result, ack);
        if (!result) {
            throw new Error('Constraint PassedMotorEQ violated');
        }
        console.log('Constraint PassedMotorEQ passed');
        return result;
    } catch (e) {
        console.error('Constraint PassedMotorEQ error: ' + e.message);
        throw e;
    }
}

export function SendCurrentLocationEQ(inLocation, outLocation) {
    console.log(`Evaluating constraint SendCurrentLocationEQ with args: ${JSON.stringify({ inLocation, outLocation })}`);
    return outLocation === inLocation;
}

export async function validateSendCurrentLocationEQ(params = {}) {
    console.log(`Validating constraint SendCurrentLocationEQ with params: ${JSON.stringify(params)}`);
    try {
        if (params.input === undefined || params.output === undefined) {
            console.error('Constraint SendCurrentLocationEQ: Invalid params', JSON.stringify(params));
            throw new Error('Constraint SendCurrentLocationEQ: Missing input or output');
        }
        const inLocation = params.inLocation !== undefined ? params.inLocation : "null";
        const outLocation = params.output !== undefined ? params.output : "null";
        const result = SendCurrentLocationEQ(inLocation, outLocation);
        if (!result) {
            throw new Error('Constraint SendCurrentLocationEQ violated');
        }
        console.log('Constraint SendCurrentLocationEQ passed');
        return result;
    } catch (e) {
        console.error('Constraint SendCurrentLocationEQ error: ' + e.message);
        throw e;
    }
}

export function ControlArmEQ(cmd, statusMotor, startArm) {
    console.log(`Evaluating constraint ControlArmEQ with args: ${JSON.stringify({ cmd, statusMotor, startArm })}`);
    return statusMotor === NotificationFromMotor::stopped ?
			startArm === cmd : startArm === CommandToArm::idle;
}

export async function validateControlArmEQ(params = {}) {
    console.log(`Validating constraint ControlArmEQ with params: ${JSON.stringify(params)}`);
    try {
        if (params.input === undefined || params.output === undefined) {
            console.error('Constraint ControlArmEQ: Invalid params', JSON.stringify(params));
            throw new Error('Constraint ControlArmEQ: Missing input or output');
        }
        const cmd = params.cmd !== undefined ? params.cmd : CommandToArm::load;
        const statusMotor = params.statusMotor !== undefined ? params.statusMotor : NotificationFromMotor::started;
        const startArm = params.output !== undefined ? params.output : CommandToArm::load;
        const result = ControlArmEQ(cmd, statusMotor, startArm);
        if (!result) {
            throw new Error('Constraint ControlArmEQ violated');
        }
        console.log('Constraint ControlArmEQ passed');
        return result;
    } catch (e) {
        console.error('Constraint ControlArmEQ error: ' + e.message);
        throw e;
    }
}

export function NotifierArmEQ(ack) {
    console.log(`Evaluating constraint NotifierArmEQ with args: ${JSON.stringify({ ack })}`);
    return ack === NotificationToSupervisory::arrived;
}

export async function validateNotifierArmEQ(params = {}) {
    console.log(`Validating constraint NotifierArmEQ with params: ${JSON.stringify(params)}`);
    try {
        if (params.input === undefined || params.output === undefined) {
            console.error('Constraint NotifierArmEQ: Invalid params', JSON.stringify(params));
            throw new Error('Constraint NotifierArmEQ: Missing input or output');
        }
        const ack = params.output !== undefined ? params.output : NotificationToSupervisory::departed;
        const result = NotifierArmEQ(ack);
        if (!result) {
            throw new Error('Constraint NotifierArmEQ violated');
        }
        console.log('Constraint NotifierArmEQ passed');
        return result;
    } catch (e) {
        console.error('Constraint NotifierArmEQ error: ' + e.message);
        throw e;
    }
}

export function VehicleTimerEQ(dest, loc, cmd, s) {
    console.log(`Evaluating constraint VehicleTimerEQ with args: ${JSON.stringify({ dest, loc, cmd, s })}`);
    return s.destination === dest && s.location === loc && s.command === cmd;
}

export async function validateVehicleTimerEQ(params = {}) {
    console.log(`Validating constraint VehicleTimerEQ with params: ${JSON.stringify(params)}`);
    try {
        if (params.input === undefined || params.output === undefined) {
            console.error('Constraint VehicleTimerEQ: Invalid params', JSON.stringify(params));
            throw new Error('Constraint VehicleTimerEQ: Missing input or output');
        }
        const dest = params.dest !== undefined ? params.dest : "null";
        const loc = params.loc !== undefined ? params.loc : "null";
        const cmd = params.cmd !== undefined ? params.cmd : CommandToArm::load;
        const s = params.output !== undefined ? params.output : {'location':'\'null\'','destination':'\'null\'','command':'CommandToArm::load'};
        const result = VehicleTimerEQ(dest, loc, cmd, s);
        if (!result) {
            throw new Error('Constraint VehicleTimerEQ violated');
        }
        console.log('Constraint VehicleTimerEQ passed');
        return result;
    } catch (e) {
        console.error('Constraint VehicleTimerEQ error: ' + e.message);
        throw e;
    }
}

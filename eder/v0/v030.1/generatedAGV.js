// @ts-nocheck;
// Generated JavaScript code for SysADL Model: SysADLArchitecture;

// Types
const Real = 'any'; // Value type from SysADL.types;

// Classe base para portas
class SysADLPort {
    constructor(name, flowType, direction = 'inout') {
        console.log(`Inicializando porta ${name} com flowType ${flowType}, direção ${direction}`);;
        this.name = name;
        this.flowType = flowType || 'any';
        this.direction = direction;
        this.value = null;
        this.bindings = [];
        this.onDataReceivedCallback = null;
    }

    addBinding(binding) {
        this.bindings.push(binding);
        console.log(`Binding adicionado à porta ${this.name}: ${binding.sourceComponent?.name || 'undefined'}.${binding.sourcePort?.name || 'undefined'} -> ${binding.targetComponent?.name || 'undefined'}.${binding.targetPort?.name || 'undefined'}`);;
    }

    setOnDataReceivedCallback(callback) {
        this.onDataReceivedCallback = callback;
    }

    send(data) {
        console.log(`Porta ${this.name} enviando dados: ${JSON.stringify(data)}`);;
        if (this.direction !== 'out' && this.direction !== 'inout') {
            console.error(`Não pode enviar via ${this.name}: direção inválida (${this.direction})`);
            return false;
        }
        if (this.bindings.length === 0) {
            console.warn(`Nenhum binding associado à ${this.name}; dados não enviados`);
            return false;
        }
        this.value = data;
        for (const binding of this.bindings) {
            console.log(`Propagando dados ${data} via binding para ${binding.targetPort?.name}`);;
            binding.connector.transmit(data);
        }
        return true;
    }

    receive(data) {
        console.log(`Porta ${this.name} recebendo dados: ${JSON.stringify(data)}`);;
        if (this.direction !== 'in' && this.direction !== 'inout') {
            console.error(`Não pode receber via ${this.name}: direção inválida (${this.direction})`);
            return false;
        }
        this.value = data;
        if (this.onDataReceivedCallback) {
            this.onDataReceivedCallback(this.name, data);
        } else {
            console.warn(`Nenhum callback de onDataReceived definido para porta ${this.name}`);
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
        console.log(`Inicializando conector ${name}`);;
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
        console.log(`Conector ${this.name} configurado com sourcePort ${sourcePort?.name || 'undefined'} e targetPort ${targetPort?.name || 'undefined'}`);;
    }

    transmit(data) {
        console.log(`Conector ${this.name} transmitindo dados: ${JSON.stringify(data)}`);;
        if (!this.sourcePort || !this.targetPort) {
            console.error(`Erro: Conector ${this.name} não tem sourcePort ou targetPort configurados`);
            return;
        }
        let transformedData = this.transformFn ? this.transformFn({ f: data }) : data;
        this.messageQueue.push(transformedData);
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.messageQueue.length > 0) {
            const currentData = this.messageQueue.shift();
            console.log(`Conector ${this.name} processando dados: ${JSON.stringify(currentData)}`);;
            if (this.constraintFn) {
                try {
                    this.constraintFn({ input: data, output: currentData });
                } catch (e) {
                    console.error(`Restrição violada no conector ${this.name}: ${e.message}`);
                    continue;
                }
            }
            this.targetPort.receive(currentData);
        }
        this.isProcessing = false;
    }
}

// Connector Classes
class notifySupervisory extends SysADLConnector {
    constructor() {
        super('notifySupervisory', null, null, null, null);
    }
}

class sendVehicleData extends SysADLConnector {
    constructor() {
        super('sendVehicleData', null, null, null, null);
    }
}

class notificationMotor extends SysADLConnector {
    constructor() {
        super('notificationMotor', null, null, null, null);
    }
}

class commandArm extends SysADLConnector {
    constructor() {
        super('commandArm', null, null, null, null);
    }
}

class notificationArm extends SysADLConnector {
    constructor() {
        super('notificationArm', null, null, null, null);
    }
}

class commandMotor extends SysADLConnector {
    constructor() {
        super('commandMotor', null, null, null, null);
    }
}

class interactionAGVAndSupervisory extends SysADLConnector {
    constructor() {
        super('interactionAGVAndSupervisory', null, null, null, null);
    }
}

class locationVehicle extends SysADLConnector {
    constructor() {
        super('locationVehicle', null, null, null, null);
    }
}

class status extends SysADLConnector {
    constructor() {
        super('status', null, null, null, null);
    }
}

// Binding Class
class Binding {
    constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {
        if (!sourceComponent || !sourcePort || !targetComponent || !targetPort || !connector) {
            console.error('Erro ao criar binding: parâmetros inválidos', {
                sourceComponent: sourceComponent?.name,
                sourcePort: sourcePort?.name,
                targetComponent: targetComponent?.name,
                targetPort: targetPort?.name,
                connector: connector?.name
            });
            throw new Error('Parâmetros de binding inválidos');
        }
        console.log(`Criando binding de ${sourceComponent.name}.${sourcePort.name} para ${targetComponent.name}.${targetPort.name} via conector ${connector.name}`);;
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
    constructor(name, isBoundary = false) {
        console.log(`Inicializando componente ${name}, isBoundary: ${isBoundary}`);;
        this.name = name;
        this.isBoundary = isBoundary;
        this.ports = [];
        this.state = {};
        this.activities = [];
    }

    addPort(port) {
        this.ports.push(port);
        port.setOnDataReceivedCallback((portName, data) => this.onDataReceived(portName, data));
        console.log(`Porta ${port.name} adicionada ao componente ${this.name}, flowType: ${port.flowType}`);;
    }

    onDataReceived(portName, data) {
        console.log(`Componente ${this.name} recebeu dados na porta ${portName}: ${JSON.stringify(data)}`);;
        this.state[portName] = data;
        for (const activity of this.activities) {
            console.log(`Disparando atividade ${activity.methodName} no componente ${this.name}`);;
            this[activity.methodName]();
        }
    }

    async start() {
        console.log(`Iniciando componente ${this.name}`);;
        if (this.isBoundary) {
            await this.simulateInput();
        }
    }
}

class FactoryAutomationSystem extends SysADLComponent {
    constructor() {
        super("FactoryAutomationSystem", false);
    }

class DisplaySystem extends SysADLComponent {
    constructor() {
        super("DisplaySystem", true);
    }

class SupervisorySystem extends SysADLComponent {
    constructor() {
        super("SupervisorySystem", true);
    }

class AGVSystem extends SysADLComponent {
    constructor() {
        super("AGVSystem", false);
    }

class RobotArm extends SysADLComponent {
    constructor() {
        super("RobotArm", true);
    }

class Motor extends SysADLComponent {
    constructor() {
        super("Motor", true);
    }

class ArrivalSensor extends SysADLComponent {
    constructor() {
        super("ArrivalSensor", true);
    }

class VehicleControl extends SysADLComponent {
    constructor() {
        super("VehicleControl", false);
    }

class VehicleTimer extends SysADLComponent {
    constructor() {
        super("VehicleTimer", false);
    }

class NotifierArm extends SysADLComponent {
    constructor() {
        super("NotifierArm", false);
    }

class ControlArm extends SysADLComponent {
    constructor() {
        super("ControlArm", false);
    }

class CheckStation extends SysADLComponent {
    constructor() {
        super("CheckStation", false);
    }

class NotifierMotor extends SysADLComponent {
    constructor() {
        super("NotifierMotor", false);
    }

class StartMoving extends SysADLComponent {
    constructor() {
        super("StartMoving", false);
    }

// Executables
function SendStartMotorEX(params = {}) {
    console.log(`Executando SendStartMotorEX com params: ${JSON.stringify(params)}`);;
    const move = params.move || 0;
    return CommandToMotor:: start;
}

function SendCommandEX(params = {}) {
    console.log(`Executando SendCommandEX com params: ${JSON.stringify(params)}`);;
    const move = params.move || 0;
    return move -> command;
}

function SendDestinationEX(params = {}) {
    console.log(`Executando SendDestinationEX com params: ${JSON.stringify(params)}`);;
    const move = params.move || 0;
    return move -> destination;
}

function NotifyAGVFromMotorEX(params = {}) {
    console.log(`Executando NotifyAGVFromMotorEX com params: ${JSON.stringify(params)}`);;
    const statusMotor = params.statusMotor || 0;
    return statusMotor;
}

function NotifySupervisoryFromMotorEX(params = {}) {
    console.log(`Executando NotifySupervisoryFromMotorEX com params: ${JSON.stringify(params)}`);;
    const statusMotor = params.statusMotor || 0;
    if (statusMotor == NotificationFromMotor::started) \n  return NotificationToSupervisory:: departed; \n		else \n  return NotificationToSupervisory:: traveling;
}

function CompareStationsEX(params = {}) {
    console.log(`Executando CompareStationsEX com params: ${JSON.stringify(params)}`);;
    const destination = params.destination || 0;
    const location = params.location || 0;
    const statusMotor = params.statusMotor || 0;
    if (statusMotor == NotificationFromMotor:: started && destination == location) \n  return true; \n		else \n  return false;
}

function StopMotorEX(params = {}) {
    console.log(`Executando StopMotorEX com params: ${JSON.stringify(params)}`);;
    const comparisonResult = params.comparisonResult || 0;
    if (comparisonResult == true) \n  return CommandToMotor:: stop; \n		else \n  return null;
}

function PassedMotorEX(params = {}) {
    console.log(`Executando PassedMotorEX com params: ${JSON.stringify(params)}`);;
    const comparisonResult = params.comparisonResult || 0;
    if (comparisonResult == false) \n  return NotificationToSupervisory:: passed; \n		else \n  return null;
}

function SendCurrentLocationEX(params = {}) {
    console.log(`Executando SendCurrentLocationEX com params: ${JSON.stringify(params)}`);;
    const location = params.location || 0;
    return location;
}

function ControlArmEX(params = {}) {
    console.log(`Executando ControlArmEX com params: ${JSON.stringify(params)}`);;
    const statusMotor = params.statusMotor || 0;
    const cmd = params.cmd || 0;
    if (statusMotor == NotificationFromMotor::stopped) \n  return cmd; \n		else \n  return CommandToArm:: idle;
}

function NotifierArmEX(params = {}) {
    console.log(`Executando NotifierArmEX com params: ${JSON.stringify(params)}`);;
    const statusArm = params.statusArm || 0;
    return NotificationToSupervisory:: arrived;
}

function VehicleTimerEX(params = {}) {
    console.log(`Executando VehicleTimerEX com params: ${JSON.stringify(params)}`);;
    const location = params.location || 0;
    const cmd = params.cmd || 0;
    const destination = params.destination || 0;
    let s: Status; \n		s -> destination = destination; \n		s -> location = location; \n		s -> command = cmd; \n		\n		return s;
}

// Constraints
function validateSendStartMotorEQ(params = {}) {
    const cmd = params.cmd || 0;
    console.log(`Avaliando restrição SendStartMotorEQ: cmd === /*Se der um Ctrl+space aqui ele n�o mostra as op��es do escopo*/ CommandToMotor::start`);;
    const result = cmd === /*Se der um Ctrl+space aqui ele n�o mostra as op��es do escopo*/ CommandToMotor:: start;
    if (!result) {
        throw new Error('Restrição SendStartMotorEQ violada');
    }
    console.log('Restrição SendStartMotorEQ passou');
    return result;
}

function validateSendDestinationEQ(params = {}) {
    const move = params.move || 0;
    const destination = params.destination || 0;
    console.log(`Avaliando restrição SendDestinationEQ: destination === move->destination`);;
    const result = destination === move -> destination;
    if (!result) {
        throw new Error('Restrição SendDestinationEQ violada');
    }
    console.log('Restrição SendDestinationEQ passou');
    return result;
}

function validateNotifyAGVFromMotorEQ(params = {}) {
    const inStatusMotor = params.inStatusMotor || 0;
    const outStatusMotor = params.outStatusMotor || 0;
    console.log(`Avaliando restrição NotifyAGVFromMotorEQ: outStatusMotor === inStatusMotor`);;
    const result = outStatusMotor === inStatusMotor;
    if (!result) {
        throw new Error('Restrição NotifyAGVFromMotorEQ violada');
    }
    console.log('Restrição NotifyAGVFromMotorEQ passou');
    return result;
}

function validateSendCommandEQ(params = {}) {
    const move = params.move || 0;
    const cmd = params.cmd || 0;
    console.log(`Avaliando restrição SendCommandEQ: cmd === move->command`);;
    const result = cmd === move -> command;
    if (!result) {
        throw new Error('Restrição SendCommandEQ violada');
    }
    console.log('Restrição SendCommandEQ passou');
    return result;
}

function validateNotifySupervisoryFromMotorEQ(params = {}) {
    const statusMotor = params.statusMotor || 0;
    const ack = params.ack || 0;
    console.log(`Avaliando restrição NotifySupervisoryFromMotorEQ: statusMotor === NotificationFromMotor::started ? \n  ack === NotificationToSupervisory::departed : \n  ack === NotificationToSupervisory::traveling`);;
    const result = statusMotor === NotificationFromMotor:: started ?\n  ack === NotificationToSupervisory:: departed: \n  ack === NotificationToSupervisory:: traveling;
    if (!result) {
        throw new Error('Restrição NotifySupervisoryFromMotorEQ violada');
    }
    console.log('Restrição NotifySupervisoryFromMotorEQ passou');
    return result;
}

function validateNotificationMotorIsStartedEQ(params = {}) {
    const statusMotor = params.statusMotor || 0;
    console.log(`Avaliando restrição NotificationMotorIsStartedEQ: statusMotor === NotificationFromMotor::started`);;
    const result = statusMotor === NotificationFromMotor:: started;
    if (!result) {
        throw new Error('Restrição NotificationMotorIsStartedEQ violada');
    }
    console.log('Restrição NotificationMotorIsStartedEQ passou');
    return result;
}

function validateCompareStationsEQ(params = {}) {
    const dest = params.dest || 0;
    const loc = params.loc || 0;
    const result = params.result || 0;
    console.log(`Avaliando restrição CompareStationsEQ: dest === loc ? result === true : result === false`);;
    const result = dest === loc ? result === true : result === false;
    if (!result) {
        throw new Error('Restrição CompareStationsEQ violada');
    }
    console.log('Restrição CompareStationsEQ passou');
    return result;
}

function validateStopMotorEQ(params = {}) {
    const result = params.result || 0;
    const cmd = params.cmd || 0;
    console.log(`Avaliando restrição StopMotorEQ: result === true ? cmd === CommandToMotor::stop : cmd === SysADL.types.Void`);;
    const result = result === true ? cmd === CommandToMotor :: stop: cmd === SysADL.types.Void;
    if (!result) {
        throw new Error('Restrição StopMotorEQ violada');
    }
    console.log('Restrição StopMotorEQ passou');
    return result;
}

function validatePassedMotorEQ(params = {}) {
    const result = params.result || 0;
    const ack = params.ack || 0;
    console.log(`Avaliando restrição PassedMotorEQ: result === false ? ack === NotificationToSupervisory::passed : ack === SysADL.types.Void`);;
    const result = result === false ? ack === NotificationToSupervisory :: passed: ack === SysADL.types.Void;
    if (!result) {
        throw new Error('Restrição PassedMotorEQ violada');
    }
    console.log('Restrição PassedMotorEQ passou');
    return result;
}

function validateSendCurrentLocationEQ(params = {}) {
    const inLocation = params.inLocation || 0;
    const outLocation = params.outLocation || 0;
    console.log(`Avaliando restrição SendCurrentLocationEQ: outLocation === inLocation`);;
    const result = outLocation === inLocation;
    if (!result) {
        throw new Error('Restrição SendCurrentLocationEQ violada');
    }
    console.log('Restrição SendCurrentLocationEQ passou');
    return result;
}

function validateControlArmEQ(params = {}) {
    const cmd = params.cmd || 0;
    const statusMotor = params.statusMotor || 0;
    const startArm = params.startArm || 0;
    console.log(`Avaliando restrição ControlArmEQ: statusMotor === NotificationFromMotor::stopped ?\n  startArm === cmd : startArm === CommandToArm::idle`);;
    const result = statusMotor === NotificationFromMotor:: stopped ?\n  startArm === cmd : startArm === CommandToArm:: idle;
    if (!result) {
        throw new Error('Restrição ControlArmEQ violada');
    }
    console.log('Restrição ControlArmEQ passou');
    return result;
}

function validateNotifierArmEQ(params = {}) {
    const ack = params.ack || 0;
    console.log(`Avaliando restrição NotifierArmEQ: ack === NotificationToSupervisory::arrived`);;
    const result = ack === NotificationToSupervisory:: arrived;
    if (!result) {
        throw new Error('Restrição NotifierArmEQ violada');
    }
    console.log('Restrição NotifierArmEQ passou');
    return result;
}

function validateVehicleTimerEQ(params = {}) {
    const dest = params.dest || 0;
    const loc = params.loc || 0;
    const cmd = params.cmd || 0;
    const s = params.s || 0;
    console.log(`Avaliando restrição VehicleTimerEQ: s->destination === dest && s->location === loc && s->command === cmd`);;
    const result = s -> destination === dest && s -> location === loc && s -> command === cmd;
    if (!result) {
        throw new Error('Restrição VehicleTimerEQ violada');
    }
    console.log('Restrição VehicleTimerEQ passou');
    return result;
}

// Main Function
function main() {
    console.log('Iniciando simulação do SysADLArchitecture.sysadl');
    const system = new SystemCP();
    system.start();
    console.log('Simulação do sistema concluída');
}

main();
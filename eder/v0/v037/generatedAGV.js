// Generated JavaScript code for SysADL Model: SysADLArchitecture

// ---------- Value "types" (placeholders) ----------
const Real = 'any'; // Value type from SysADL.types

// ---------- Simple enums / symbols converted from the SysADL model ----------
const CommandToMotor = Object.freeze({ start: 'start', stop: 'stop' });
const CommandToArm   = Object.freeze({ idle: 'idle' });
const NotificationFromMotor     = Object.freeze({ started: 'started', stopped: 'stopped' });
const NotificationToSupervisory = Object.freeze({
  departed: 'departed',
  traveling: 'traveling',
  passed: 'passed',
  arrived: 'arrived',
});

// ---------- Base Port ----------
class SysADLPort {
  constructor(name, flowType, direction = 'inout') {
    console.log(`Inicializando porta ${name} com flowType ${flowType}, direção ${direction}`);
    this.name = name;
    this.flowType = flowType || 'any';
    this.direction = direction;
    this.value = null;
    this.bindings = [];
    this.onDataReceivedCallback = null;
  }

  addBinding(binding) {
    this.bindings.push(binding);
    console.log(
      `Binding adicionado à porta ${this.name}: ${binding.sourceComponent?.name || 'undefined'}.${
        binding.sourcePort?.name || 'undefined'
      } -> ${binding.targetComponent?.name || 'undefined'}.${
        binding.targetPort?.name || 'undefined'
      }`
    );
  }

  setOnDataReceivedCallback(callback) {
    this.onDataReceivedCallback = callback;
  }

  send(data) {
    console.log(`Porta ${this.name} enviando dados: ${JSON.stringify(data)}`);
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
      console.log(`Propagando dados ${JSON.stringify(data)} via binding para ${binding.targetPort?.name}`);
      binding.connector.transmit(data);
    }
    return true;
  }

  receive(data) {
    console.log(`Porta ${this.name} recebendo dados: ${JSON.stringify(data)}`);
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

// ---------- Base Connector ----------
class SysADLConnector {
  constructor(name, sourcePort = null, targetPort = null, transformFn = null, constraintFn = null) {
    console.log(`Inicializando conector ${name}`);
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
    console.log(
      `Conector ${this.name} configurado com sourcePort ${sourcePort?.name || 'undefined'} e targetPort ${
        targetPort?.name || 'undefined'
      }`
    );
  }

  transmit(data) {
    console.log(`Conector ${this.name} transmitindo dados: ${JSON.stringify(data)}`);
    if (!this.sourcePort || !this.targetPort) {
      console.error(`Erro: Conector ${this.name} não tem sourcePort ou targetPort configurados`);
      return;
    }
    const transformedData = this.transformFn ? this.transformFn({ f: data }) : data;
    this.messageQueue.push(transformedData);
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const currentData = this.messageQueue.shift();
      console.log(`Conector ${this.name} processando dados: ${JSON.stringify(currentData)}`);
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

// ---------- Concrete Connectors ----------
class notifySupervisory extends SysADLConnector { constructor() { super('notifySupervisory'); } }
class sendVehicleData   extends SysADLConnector { constructor() { super('sendVehicleData'); } }
class notificationMotor extends SysADLConnector { constructor() { super('notificationMotor'); } }
class commandArm        extends SysADLConnector { constructor() { super('commandArm'); } }
class notificationArm   extends SysADLConnector { constructor() { super('notificationArm'); } }
class commandMotor      extends SysADLConnector { constructor() { super('commandMotor'); } }
class interactionAGVAndSupervisory extends SysADLConnector { constructor() { super('interactionAGVAndSupervisory'); } }
class locationVehicle   extends SysADLConnector { constructor() { super('locationVehicle'); } }
class status            extends SysADLConnector { constructor() { super('status'); } }

// ---------- Binding ----------
class Binding {
  constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {
    if (!sourceComponent || !sourcePort || !targetComponent || !targetPort || !connector) {
      console.error('Erro ao criar binding: parâmetros inválidos', {
        sourceComponent: sourceComponent?.name,
        sourcePort: sourcePort?.name,
        targetComponent: targetComponent?.name,
        targetPort: targetPort?.name,
        connector: connector?.name,
      });
      throw new Error('Parâmetros de binding inválidos');
    }
    console.log(
      `Criando binding de ${sourceComponent.name}.${sourcePort.name} para ${targetComponent.name}.${targetPort.name} via conector ${connector.name}`
    );
    this.sourceComponent = sourceComponent;
    this.sourcePort = sourcePort;
    this.targetComponent = targetComponent;
    this.targetPort = targetPort;
    this.connector = connector;
    this.sourcePort.addBinding(this);
    this.connector.setPorts(this.sourcePort, this.targetPort);
  }
}

// ---------- Base Component ----------
class SysADLComponent {
  constructor(name, isBoundary = false) {
    console.log(`Inicializando componente ${name}, isBoundary: ${isBoundary}`);
    this.name = name;
    this.isBoundary = isBoundary;
    this.ports = [];
    this.state = {};
    this.activities = [];
  }

  addPort(port) {
    this.ports.push(port);
    port.setOnDataReceivedCallback((portName, data) => this.onDataReceived(portName, data));
    console.log(`Porta ${port.name} adicionada ao componente ${this.name}, flowType: ${port.flowType}`);
  }

  onDataReceived(portName, data) {
    console.log(`Componente ${this.name} recebeu dados na porta ${portName}: ${JSON.stringify(data)}`);
    this.state[portName] = data;
    for (const activity of this.activities) {
      console.log(`Disparando atividade ${activity.methodName} no componente ${this.name}`);
      if (typeof this[activity.methodName] === 'function') this[activity.methodName]();
    }
  }

  async start() {
    console.log(`Iniciando componente ${this.name}`);
    if (this.isBoundary) {
      await this.simulateInput?.();
    }
  }

  async simulateInput() {
    // Default no-op for boundary components; override as needed
    console.log(`simulateInput() padrão do componente ${this.name} (sem ação)`);
  }
}

// ---------- Concrete Components (empty shells for now) ----------
class FactoryAutomationSystem extends SysADLComponent { constructor() { super('FactoryAutomationSystem', false); } }
class DisplaySystem           extends SysADLComponent { constructor() { super('DisplaySystem', true); } }
class SupervisorySystem       extends SysADLComponent { constructor() { super('SupervisorySystem', true); } }
class AGVSystem               extends SysADLComponent { constructor() { super('AGVSystem', false); } }
class RobotArm                extends SysADLComponent { constructor() { super('RobotArm', true); } }
class Motor                   extends SysADLComponent { constructor() { super('Motor', true); } }
class ArrivalSensor           extends SysADLComponent { constructor() { super('ArrivalSensor', true); } }
class VehicleControl          extends SysADLComponent { constructor() { super('VehicleControl', false); } }
class VehicleTimer            extends SysADLComponent { constructor() { super('VehicleTimer', false); } }
class NotifierArm             extends SysADLComponent { constructor() { super('NotifierArm', false); } }
class ControlArm              extends SysADLComponent { constructor() { super('ControlArm', false); } }
class CheckStation            extends SysADLComponent { constructor() { super('CheckStation', false); } }
class NotifierMotor           extends SysADLComponent { constructor() { super('NotifierMotor', false); } }
class StartMoving             extends SysADLComponent { constructor() { super('StartMoving', false); } }

// ---------- Executables (converted to valid JS) ----------
function SendStartMotorEX(params = {}) {
  console.log(`Executando SendStartMotorEX com params: ${JSON.stringify(params)}`);
  return CommandToMotor.start;
}

function SendCommandEX(params = {}) {
  console.log(`Executando SendCommandEX com params: ${JSON.stringify(params)}`);
  const move = params.move || {};
  return move.command;
}

function SendDestinationEX(params = {}) {
  console.log(`Executando SendDestinationEX com params: ${JSON.stringify(params)}`);
  const move = params.move || {};
  return move.destination;
}

function NotifyAGVFromMotorEX(params = {}) {
  console.log(`Executando NotifyAGVFromMotorEX com params: ${JSON.stringify(params)}`);
  const statusMotor = params.statusMotor;
  return statusMotor;
}

function NotifySupervisoryFromMotorEX(params = {}) {
  console.log(`Executando NotifySupervisoryFromMotorEX com params: ${JSON.stringify(params)}`);
  const statusMotor = params.statusMotor;
  if (statusMotor === NotificationFromMotor.started) return NotificationToSupervisory.departed;
  return NotificationToSupervisory.traveling;
}

function CompareStationsEX(params = {}) {
  console.log(`Executando CompareStationsEX com params: ${JSON.stringify(params)}`);
  const destination = params.destination;
  const location = params.location;
  const statusMotor = params.statusMotor;
  return statusMotor === NotificationFromMotor.started && destination === location;
}

function StopMotorEX(params = {}) {
  console.log(`Executando StopMotorEX com params: ${JSON.stringify(params)}`);
  const comparisonResult = params.comparisonResult;
  return comparisonResult === true ? CommandToMotor.stop : null;
}

function PassedMotorEX(params = {}) {
  console.log(`Executando PassedMotorEX com params: ${JSON.stringify(params)}`);
  const comparisonResult = params.comparisonResult;
  return comparisonResult === false ? NotificationToSupervisory.passed : null;
}

function SendCurrentLocationEX(params = {}) {
  console.log(`Executando SendCurrentLocationEX com params: ${JSON.stringify(params)}`);
  const location = params.location;
  return location;
}

function ControlArmEX(params = {}) {
  console.log(`Executando ControlArmEX com params: ${JSON.stringify(params)}`);
  const statusMotor = params.statusMotor;
  const cmd = params.cmd;
  return statusMotor === NotificationFromMotor.stopped ? cmd : CommandToArm.idle;
}

function NotifierArmEX(params = {}) {
  console.log(`Executando NotifierArmEX com params: ${JSON.stringify(params)}`);
  return NotificationToSupervisory.arrived;
}

function VehicleTimerEX(params = {}) {
  console.log(`Executando VehicleTimerEX com params: ${JSON.stringify(params)}`);
  const location = params.location;
  const cmd = params.cmd;
  const destination = params.destination;
  const s = { destination, location, command: cmd };
  return s;
}

// ---------- Constraints (converted to valid JS) ----------
function validateSendStartMotorEQ(params = {}) {
  const cmd = params.cmd;
  const ok = cmd === CommandToMotor.start;
  if (!ok) throw new Error('Restrição SendStartMotorEQ violada');
  return ok;
}

function validateSendDestinationEQ(params = {}) {
  const move = params.move || {};
  const destination = params.destination;
  const ok = destination === move.destination;
  if (!ok) throw new Error('Restrição SendDestinationEQ violada');
  return ok;
}

function validateNotifyAGVFromMotorEQ(params = {}) {
  const inStatusMotor = params.inStatusMotor;
  const outStatusMotor = params.outStatusMotor;
  const ok = outStatusMotor === inStatusMotor;
  if (!ok) throw new Error('Restrição NotifyAGVFromMotorEQ violada');
  return ok;
}

function validateSendCommandEQ(params = {}) {
  const move = params.move || {};
  const cmd = params.cmd;
  const ok = cmd === move.command;
  if (!ok) throw new Error('Restrição SendCommandEQ violada');
  return ok;
}

function validateNotifySupervisoryFromMotorEQ(params = {}) {
  const statusMotor = params.statusMotor;
  const ack = params.ack;
  const ok =
    statusMotor === NotificationFromMotor.started
      ? ack === NotificationToSupervisory.departed
      : ack === NotificationToSupervisory.traveling;
  if (!ok) throw new Error('Restrição NotifySupervisoryFromMotorEQ violada');
  return ok;
}

function validateNotificationMotorIsStartedEQ(params = {}) {
  const statusMotor = params.statusMotor;
  const ok = statusMotor === NotificationFromMotor.started;
  if (!ok) throw new Error('Restrição NotificationMotorIsStartedEQ violada');
  return ok;
}

function validateCompareStationsEQ(params = {}) {
  const dest = params.dest;
  const loc = params.loc;
  const resultValue = params.result; // rename to avoid shadowing
  const ok = dest === loc ? resultValue === true : resultValue === false;
  if (!ok) throw new Error('Restrição CompareStationsEQ violada');
  return ok;
}

function validateStopMotorEQ(params = {}) {
  const resultValue = params.result;
  const cmd = params.cmd;
  const ok = resultValue === true ? cmd === CommandToMotor.stop : cmd == null;
  if (!ok) throw new Error('Restrição StopMotorEQ violada');
  return ok;
}

function validatePassedMotorEQ(params = {}) {
  const resultValue = params.result;
  const ack = params.ack;
  const ok = resultValue === false ? ack === NotificationToSupervisory.passed : ack == null;
  if (!ok) throw new Error('Restrição PassedMotorEQ violada');
  return ok;
}

function validateSendCurrentLocationEQ(params = {}) {
  const inLocation = params.inLocation;
  const outLocation = params.outLocation;
  const ok = outLocation === inLocation;
  if (!ok) throw new Error('Restrição SendCurrentLocationEQ violada');
  return ok;
}

function validateControlArmEQ(params = {}) {
  const cmd = params.cmd;
  const statusMotor = params.statusMotor;
  const startArm = params.startArm;
  const ok =
    statusMotor === NotificationFromMotor.stopped ? startArm === cmd : startArm === CommandToArm.idle;
  if (!ok) throw new Error('Restrição ControlArmEQ violada');
  return ok;
}

function validateNotifierArmEQ(params = {}) {
  const ack = params.ack;
  const ok = ack === NotificationToSupervisory.arrived;
  if (!ok) throw new Error('Restrição NotifierArmEQ violada');
  return ok;
}

function validateVehicleTimerEQ(params = {}) {
  const dest = params.dest;
  const loc = params.loc;
  const cmd = params.cmd;
  const s = params.s || {};
  const ok = s.destination === dest && s.location === loc && s.command === cmd;
  if (!ok) throw new Error('Restrição VehicleTimerEQ violada');
  return ok;
}

// ---------- Minimal SystemCP so main() runs ----------
class SystemCP {
  constructor() {
    this.motor = new Motor();
    this.superv = new SupervisorySystem();
    this.notifConn = new notifySupervisory();

    // Simple demo ports
    this.motor.outStatus = new SysADLPort('outStatus', 'any', 'out');
    this.superv.inAck = new SysADLPort('inAck', 'any', 'in');

    this.motor.addPort(this.motor.outStatus);
    this.superv.addPort(this.superv.inAck);

    // Minimal binding motor -> supervisory
    new Binding(this.motor, this.motor.outStatus, this.superv, this.superv.inAck, this.notifConn);
  }

  start() {
    console.log('SystemCP.start()');
    // Simulate a motor update and route to supervisory:
    const status = NotifySupervisoryFromMotorEX({ statusMotor: NotificationFromMotor.started });
    this.motor.outStatus.send(status);
  }
}

// ---------- Main ----------
function main() {
  console.log('Iniciando simulação do SysADLArchitecture.sysadl');
  const system = new SystemCP();
  system.start();
  console.log('Simulação do sistema concluída');
}

main();

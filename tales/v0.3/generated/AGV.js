const { Model, Component, Port, SimplePort, CompositePort, Connector, Activity, Action, createExecutableFromExpression, Enum, Int, Boolean, String, Real, Void, valueType, dataType, dimension, unit, Constraint, Executable } = require('../SysADLBase');

// Types
const EN_NotificationToSupervisory = new Enum("departed", "arrived", "passed", "traveling");
const EN_NotificationFromArm = new Enum("loaded", "unloaded");
const EN_CommandToArm = new Enum("load", "unload", "idle");
const EN_NotificationFromMotor = new Enum("started", "stopped");
const EN_CommandToMotor = new Enum("start", "stop");
const DT_Location = dataType('Location', { location: String });
const DT_Status = dataType('Status', { location: DT_Location, destination: DT_Location, command: EN_CommandToArm });
const DT_VehicleData = dataType('VehicleData', { destination: DT_Location, command: EN_CommandToArm });

// Ports
class PT_ComponentsAGV_inLocation extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Location" }, ...opts });
  }
}
class PT_ComponentsAGV_outLocation extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "Location" }, ...opts });
  }
}
class PT_PortsAGV_inStatus extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Status" }, ...opts });
  }
}
class PT_PortsAGV_outStatus extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "Status" }, ...opts });
  }
}
class PT_PortsAGV_inVehicleData extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "VehicleData" }, ...opts });
  }
}
class PT_PortsAGV_outVehicleData extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "VehicleData" }, ...opts });
  }
}
class PT_PortsAGV_inNotificationFromMotor extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "NotificationFromMotor" }, ...opts });
  }
}
class PT_PortsAGV_outNotificationFromMotor extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "NotificationFromMotor" }, ...opts });
  }
}
class PT_PortsAGV_inCommandToMotor extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "CommandToMotor" }, ...opts });
  }
}
class PT_PortsAGV_outCommandToMotor extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "CommandToMotor" }, ...opts });
  }
}
class PT_PortsAGV_inNotificationFromArm extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "NotificationFromArm" }, ...opts });
  }
}
class PT_PortsAGV_outNotificationFromArm extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "NotificationFromArm" }, ...opts });
  }
}
class PT_PortsAGV_inCommandToArm extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "CommandToArm" }, ...opts });
  }
}
class PT_PortsAGV_outCommandToArm extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "CommandToArm" }, ...opts });
  }
}
class PT_PortsAGV_inNotificationToSupervisory extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "NotificationToSupervisory" }, ...opts });
  }
}
class PT_PortsAGV_outNotificationToSupervisory extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "NotificationToSupervisory" }, ...opts });
  }
}
class PT_PortsAGV_IAGVSystem extends CompositePort {
  constructor(name, opts = {}) {
    super(name, 'composite', opts);
    // Add sub-ports
    this.addSubPort("inMoveToStation", new SimplePort("inMoveToStation", "in", { ...{ expectedType: "VehicleData" }, owner: this.owner }));
    this.addSubPort("outNotifications", new SimplePort("outNotifications", "out", { ...{ expectedType: "NotificationToSupervisory" }, owner: this.owner }));
  }
}
class PT_PortsAGV_ISupervisorySystem extends CompositePort {
  constructor(name, opts = {}) {
    super(name, 'composite', opts);
    // Add sub-ports
    this.addSubPort("outMoveToStation", new SimplePort("outMoveToStation", "out", { ...{ expectedType: "VehicleData" }, owner: this.owner }));
    this.addSubPort("inNotifications", new SimplePort("inNotifications", "in", { ...{ expectedType: "NotificationToSupervisory" }, owner: this.owner }));
  }
}

// Connectors
class CN_ConnectorsAGV_notifySupervisory extends Connector {
  constructor(name, fromPort, toPort, opts = {}) {
    super(name, opts);
    // Flows: NotificationToSupervisory from nsOPT to nsIPT
    if (fromPort && toPort) {
      this.bind(fromPort, toPort);
    }
  }
}
class CN_ConnectorsAGV_sendVehicleData extends Connector {
  constructor(name, fromPort, toPort, opts = {}) {
    super(name, opts);
    // Flows: VehicleData from vdOPT to vdIPT
    if (fromPort && toPort) {
      this.bind(fromPort, toPort);
    }
  }
}
class CN_ConnectorsAGV_notificationMotor extends Connector {
  constructor(name, fromPort, toPort, opts = {}) {
    super(name, opts);
    // Flows: NotificationFromMotor from nmOPT to nmIPT
    if (fromPort && toPort) {
      this.bind(fromPort, toPort);
    }
  }
}
class CN_ConnectorsAGV_commandArm extends Connector {
  constructor(name, fromPort, toPort, opts = {}) {
    super(name, opts);
    // Flows: CommandToArm from caOPT to caIPT
    if (fromPort && toPort) {
      this.bind(fromPort, toPort);
    }
  }
}
class CN_ConnectorsAGV_notificationArm extends Connector {
  constructor(name, fromPort, toPort, opts = {}) {
    super(name, opts);
    // Flows: NotificationFromArm from naOPT to naIPT
    if (fromPort && toPort) {
      this.bind(fromPort, toPort);
    }
  }
}
class CN_ConnectorsAGV_commandMotor extends Connector {
  constructor(name, fromPort, toPort, opts = {}) {
    super(name, opts);
    // Flows: CommandToMotor from cmOPT to cmIPT
    if (fromPort && toPort) {
      this.bind(fromPort, toPort);
    }
  }
}
class CN_ConnectorsAGV_interactionAGVAndSupervisory extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Composite connector with internal connectors
    this.nS = new CN_ConnectorsAGV_notifySupervisory("nS");
    this.sVD = new CN_ConnectorsAGV_sendVehicleData("sVD");
    
    // Extract sub-ports and bind to internal connectors
    if (arguments.length > 1) {
      const portArgs = Array.from(arguments).slice(1, -1); // exclude name and opts
      // notifySupervisory: nsOPT -> nsIPT
      this.nS.bind(
        portArgs[0] && portArgs[0].getSubPort('nsOPT'),
        portArgs[1] && portArgs[1].getSubPort('nsIPT')
      );
      // sendVehicleData: vdOPT -> vdIPT
      this.sVD.bind(
        portArgs[0] && portArgs[0].getSubPort('vdOPT'),
        portArgs[1] && portArgs[1].getSubPort('vdIPT')
      );
    }
    
    this.connectors = this.connectors || {};
    this.connectors["nS"] = this.nS;
    this.connectors = this.connectors || {};
    this.connectors["sVD"] = this.sVD;
  }
}
class CN_ConnectorsAGV_locationVehicle extends Connector {
  constructor(name, fromPort, toPort, opts = {}) {
    super(name, opts);
    // Flows: Location from lOPT to lIPT
    if (fromPort && toPort) {
      this.bind(fromPort, toPort);
    }
  }
}
class CN_ComponentsAGV_status extends Connector {
  constructor(name, fromPort, toPort, opts = {}) {
    super(name, opts);
    // Flows: Status from sOPT to sIPT
    if (fromPort && toPort) {
      this.bind(fromPort, toPort);
    }
  }
}

// Components
class CP_ComponentsAGV_SupervisorySystem extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_PortsAGV_ISupervisorySystem("in_outDataSup", { owner: name }));
    }
}
class CP_ComponentsAGV_AGVSystem extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_PortsAGV_outStatus("sendStatus", "out", { owner: name }));
      this.addPort(new PT_PortsAGV_IAGVSystem("in_outDataAGV", { owner: name }));
    }
}
class CP_ComponentsAGV_DisplaySystem extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_PortsAGV_inStatus("receiveStatus", "in", { owner: name }));
    }
}
class CP_ComponentsAGV_Motor extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_PortsAGV_inCommandToMotor("start_stop", "in", { owner: name }));
      this.addPort(new PT_PortsAGV_outNotificationFromMotor("started_stopped", "out", { owner: name }));
    }
}
class CP_ComponentsAGV_ArrivalSensor extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_ComponentsAGV_outLocation("arrivalDetected", "out", { owner: name }));
    }
}
class CP_ComponentsAGV_RobotArm extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_PortsAGV_inCommandToArm("start", "in", { owner: name }));
      this.addPort(new PT_PortsAGV_outNotificationFromArm("started", "out", { owner: name }));
    }
}
class CP_ComponentsAGV_VehicleControl extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_PortsAGV_outStatus("sendStatus", "out", { owner: name }));
      this.addPort(new PT_ComponentsAGV_inLocation("arrivalDetected", "in", { owner: name }));
      this.addPort(new PT_PortsAGV_outCommandToArm("startArm", "out", { owner: name }));
      this.addPort(new PT_PortsAGV_inNotificationFromArm("startedArm", "in", { owner: name }));
      this.addPort(new PT_PortsAGV_inNotificationFromMotor("started_stopped", "in", { owner: name }));
      this.addPort(new PT_PortsAGV_outCommandToMotor("start_stop", "out", { owner: name }));
      this.addPort(new PT_PortsAGV_IAGVSystem("in_outDataAGV", { owner: name }));
    }
}
class CP_ComponentsAGV_CheckStation extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_PortsAGV_inNotificationFromMotor("ack", "in", { owner: name }));
      this.addPort(new PT_ComponentsAGV_outLocation("location", "out", { owner: name }));
      this.addPort(new PT_ComponentsAGV_inLocation("destination", "in", { owner: name }));
      this.addPort(new PT_PortsAGV_outCommandToMotor("stop", "out", { owner: name }));
      this.addPort(new PT_ComponentsAGV_inLocation("arrivalDetected", "in", { owner: name }));
      this.addPort(new PT_PortsAGV_outNotificationToSupervisory("passed", "out", { owner: name }));
    }
}
class CP_ComponentsAGV_ControlArm extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_PortsAGV_inCommandToArm("cmd", "in", { owner: name }));
      this.addPort(new PT_PortsAGV_inNotificationFromMotor("ack", "in", { owner: name }));
      this.addPort(new PT_PortsAGV_outCommandToArm("startArm", "out", { owner: name }));
    }
}
class CP_ComponentsAGV_NotifierMotor extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_PortsAGV_inNotificationFromMotor("inAck", "in", { owner: name }));
      this.addPort(new PT_PortsAGV_outNotificationToSupervisory("ack", "out", { owner: name }));
      this.addPort(new PT_PortsAGV_outNotificationFromMotor("outAck", "out", { owner: name }));
    }
}
class CP_ComponentsAGV_StartMoving extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_PortsAGV_inVehicleData("move", "in", { owner: name }));
      this.addPort(new PT_PortsAGV_outCommandToArm("cmd", "out", { owner: name }));
      this.addPort(new PT_ComponentsAGV_outLocation("destination", "out", { owner: name }));
      this.addPort(new PT_PortsAGV_outCommandToMotor("start", "out", { owner: name }));
    }
}
class CP_ComponentsAGV_NotifierArm extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_PortsAGV_outNotificationToSupervisory("arrivedStatus", "out", { owner: name }));
      this.addPort(new PT_PortsAGV_inNotificationFromArm("loaded_unloaded", "in", { owner: name }));
    }
}
class CP_ComponentsAGV_VehicleTimer extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_PortsAGV_outStatus("AGVStatus", "out", { owner: name }));
      this.addPort(new PT_ComponentsAGV_inLocation("location", "in", { owner: name }));
      this.addPort(new PT_ComponentsAGV_inLocation("destination", "in", { owner: name }));
      this.addPort(new PT_PortsAGV_inCommandToArm("cmd", "in", { owner: name }));
    }
}
class CP_ComponentsAGV_FactoryAutomationSystem extends Component { }

// ===== Behavioral Element Classes =====
// Activity class: StartMovingAC
class AC_ComponentsAGV_StartMovingAC extends Activity {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"move","type":"Pin","direction":"in"},{"name":"cmd","type":"Pin","direction":"in"},{"name":"destination","type":"Pin","direction":"in"},{"name":"start","type":"Pin","direction":"in"}],
      outParameters: []
    });
  }
}

// Activity class: NotifierMotorAC
class AC_ComponentsAGV_NotifierMotorAC extends Activity {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"inStatusMotor","type":"Pin","direction":"in"},{"name":"outStatusMotor","type":"Pin","direction":"in"},{"name":"ack","type":"Pin","direction":"in"}],
      outParameters: []
    });
  }
}

// Activity class: CheckStationAC
class AC_ComponentsAGV_CheckStationAC extends Activity {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"statusMotor","type":"Pin","direction":"in"},{"name":"destination","type":"Pin","direction":"in"},{"name":"inLocation","type":"Pin","direction":"in"},{"name":"stopMotor","type":"Pin","direction":"in"},{"name":"outLocation","type":"Pin","direction":"in"},{"name":"passed","type":"Pin","direction":"in"}],
      outParameters: []
    });
  }
}

// Activity class: ControlArmAC
class AC_ComponentsAGV_ControlArmAC extends Activity {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"cmd","type":"Pin","direction":"in"},{"name":"statusMotor","type":"Pin","direction":"in"},{"name":"startArm","type":"Pin","direction":"in"}],
      outParameters: []
    });
  }
}

// Activity class: NotifierArmAC
class AC_ComponentsAGV_NotifierArmAC extends Activity {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"statusArm","type":"Pin","direction":"in"},{"name":"ack","type":"Pin","direction":"in"}],
      outParameters: []
    });
  }
}

// Activity class: VehicleTimerAC
class AC_ComponentsAGV_VehicleTimerAC extends Activity {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"destination","type":"Pin","direction":"in"},{"name":"location","type":"Pin","direction":"in"},{"name":"cmd","type":"Pin","direction":"in"},{"name":"status","type":"Pin","direction":"in"}],
      outParameters: []
    });
  }
}

// Action class: SendStartMotorAN
class AN_ComponentsAGV_SendStartMotorAN extends Action {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"move","type":"Pin","direction":"in"}],
      outParameters: [],
    });
  }
}

// Action class: SendCommandAN
class AN_ComponentsAGV_SendCommandAN extends Action {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"move","type":"Pin","direction":"in"}],
      outParameters: [],
    });
  }
}

// Action class: SendDestinationAN
class AN_ComponentsAGV_SendDestinationAN extends Action {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"move","type":"Pin","direction":"in"}],
      outParameters: [],
    });
  }
}

// Action class: NotifyAGVFromMotorAN
class AN_ComponentsAGV_NotifyAGVFromMotorAN extends Action {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"statusMotor","type":"Pin","direction":"in"}],
      outParameters: [],
    });
  }
}

// Action class: NotifySupervisoryFromMotorAN
class AN_ComponentsAGV_NotifySupervisoryFromMotorAN extends Action {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"statusMotor","type":"Pin","direction":"in"}],
      outParameters: [],
    });
  }
}

// Action class: CompareStationsAN
class AN_ComponentsAGV_CompareStationsAN extends Action {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"statusMotor","type":"Pin","direction":"in"},{"name":"destination","type":"Pin","direction":"in"},{"name":"location","type":"Pin","direction":"in"}],
      outParameters: [],
    });
  }
}

// Action class: StopMotorAN
class AN_ComponentsAGV_StopMotorAN extends Action {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"comparisonResult","type":"Pin","direction":"in"}],
      outParameters: [],
    });
  }
}

// Action class: PassedMotorAN
class AN_ComponentsAGV_PassedMotorAN extends Action {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"comparisonResult","type":"Pin","direction":"in"}],
      outParameters: [],
    });
  }
}

// Action class: SendCurrentLocationAN
class AN_ComponentsAGV_SendCurrentLocationAN extends Action {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"location","type":"Pin","direction":"in"}],
      outParameters: [],
    });
  }
}

// Action class: ControlArmAN
class AN_ComponentsAGV_ControlArmAN extends Action {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"cmd","type":"Pin","direction":"in"},{"name":"statusMotor","type":"Pin","direction":"in"}],
      outParameters: [],
    });
  }
}

// Action class: NotifierArmAN
class AN_ComponentsAGV_NotifierArmAN extends Action {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"statusArm","type":"Pin","direction":"in"}],
      outParameters: [],
    });
  }
}

// Action class: VehicleTimerAN
class AN_ComponentsAGV_VehicleTimerAN extends Action {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"destination","type":"Pin","direction":"in"},{"name":"location","type":"Pin","direction":"in"},{"name":"cmd","type":"Pin","direction":"in"}],
      outParameters: [],
    });
  }
}

// Constraint class: SendStartMotorEQ
class CT_ComponentsAGV_SendStartMotorEQ extends Constraint {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      outParameters: [],
      equation: "(cmd == CommandToMotor.start)",
      constraintFunction: function(params) {// Constraint equation: (cmd == CommandToMotor.start)
          const { CommandToMotor, start } = params;
          
          // Type validation
          if (typeof CommandToMotor !== 'number') throw new Error('Parameter CommandToMotor must be a Real (number)');
          if (typeof start !== 'number') throw new Error('Parameter start must be a Real (number)');
          return cmd == CommandToMotor.start;
        }
    });
  }
}

// Constraint class: SendDestinationEQ
class CT_ComponentsAGV_SendDestinationEQ extends Constraint {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      outParameters: [],
      equation: "(destination == move.destination)",
      constraintFunction: function(params) {// Constraint equation: (destination == move.destination)
          const { move } = params;
          
          // Type validation
          if (typeof move !== 'number') throw new Error('Parameter move must be a Real (number)');
          return destination == move.destination;
        }
    });
  }
}

// Constraint class: NotifyAGVFromMotorEQ
class CT_ComponentsAGV_NotifyAGVFromMotorEQ extends Constraint {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      outParameters: [],
      equation: "(outStatusMotor == inStatusMotor)",
      constraintFunction: function(params) {// Constraint equation: (outStatusMotor == inStatusMotor)
          const { inStatusMotor } = params;
          
          // Type validation
          if (typeof inStatusMotor !== 'number') throw new Error('Parameter inStatusMotor must be a Real (number)');
          return outStatusMotor == inStatusMotor;
        }
    });
  }
}

// Constraint class: SendCommandEQ
class CT_ComponentsAGV_SendCommandEQ extends Constraint {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      outParameters: [],
      equation: "(cmd == move.command)",
      constraintFunction: function(params) {// Constraint equation: (cmd == move.command)
          const { move, command } = params;
          
          // Type validation
          if (typeof move !== 'number') throw new Error('Parameter move must be a Real (number)');
          if (typeof command !== 'number') throw new Error('Parameter command must be a Real (number)');
          return cmd == move.command;
        }
    });
  }
}

// Constraint class: NotifySupervisoryFromMotorEQ
class CT_ComponentsAGV_NotifySupervisoryFromMotorEQ extends Constraint {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      outParameters: [],
      equation: "((statusMotor == NotificationFromMotor.started) ? (ack == NotificationToSupervisory.departed) : (ack == NotificationToSupervisory.traveling))",
      constraintFunction: function(params) {// Conditional constraint: ((statusMotor == NotificationFromMotor.started) ? (ack == NotificationToSupervisory.departed) : (ack == NotificationToSupervisory.traveling))
          const { statusMotor, NotificationFromMotor, started, ack, NotificationToSupervisory, departed, traveling } = params;
          
          // Type validation
          if (typeof statusMotor !== 'number') throw new Error('Parameter statusMotor must be a Real (number)');
          if (typeof NotificationFromMotor !== 'number') throw new Error('Parameter NotificationFromMotor must be a Real (number)');
          if (typeof started !== 'number') throw new Error('Parameter started must be a Real (number)');
          if (typeof ack !== 'number') throw new Error('Parameter ack must be a Real (number)');
          if (typeof NotificationToSupervisory !== 'number') throw new Error('Parameter NotificationToSupervisory must be a Real (number)');
          if (typeof departed !== 'number') throw new Error('Parameter departed must be a Real (number)');
          if (typeof traveling !== 'number') throw new Error('Parameter traveling must be a Real (number)');
          return (statusMotor == NotificationFromMotor.started) ? (ack == NotificationToSupervisory.departed) : (ack == NotificationToSupervisory.traveling);
        }
    });
  }
}

// Constraint class: NotificationMotorIsStartedEQ
class CT_ComponentsAGV_NotificationMotorIsStartedEQ extends Constraint {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      outParameters: [],
      equation: "(statusMotor == NotificationFromMotor.started)",
      constraintFunction: function(params) {// Constraint equation: (statusMotor == NotificationFromMotor.started)
          const { NotificationFromMotor, started } = params;
          
          // Type validation
          if (typeof NotificationFromMotor !== 'number') throw new Error('Parameter NotificationFromMotor must be a Real (number)');
          if (typeof started !== 'number') throw new Error('Parameter started must be a Real (number)');
          return statusMotor == NotificationFromMotor.started;
        }
    });
  }
}

// Constraint class: CompareStationsEQ
class CT_ComponentsAGV_CompareStationsEQ extends Constraint {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      outParameters: [],
      equation: "((dest == loc) ? (result == true) : (result == false))",
      constraintFunction: function(params) {// Conditional constraint: ((dest == loc) ? (result == true) : (result == false))
          const { dest, loc, result } = params;
          
          // Type validation
          if (typeof dest !== 'number') throw new Error('Parameter dest must be a Real (number)');
          if (typeof loc !== 'number') throw new Error('Parameter loc must be a Real (number)');
          if (typeof result !== 'number') throw new Error('Parameter result must be a Real (number)');
          return (dest == loc) ? (result == true) : (result == false);
        }
    });
  }
}

// Constraint class: StopMotorEQ
class CT_ComponentsAGV_StopMotorEQ extends Constraint {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      outParameters: [],
      equation: "((result == true) ? (cmd == CommandToMotor.stop) : (cmd == SysADL.types.Void))",
      constraintFunction: function(params) {// Conditional constraint: ((result == true) ? (cmd == CommandToMotor.stop) : (cmd == SysADL.types.Void))
          const { result, cmd, CommandToMotor, stop, SysADL, Void } = params;
          
          // Type validation
          if (typeof result !== 'number') throw new Error('Parameter result must be a Real (number)');
          if (typeof cmd !== 'number') throw new Error('Parameter cmd must be a Real (number)');
          if (typeof CommandToMotor !== 'number') throw new Error('Parameter CommandToMotor must be a Real (number)');
          if (typeof stop !== 'number') throw new Error('Parameter stop must be a Real (number)');
          if (typeof SysADL !== 'number') throw new Error('Parameter SysADL must be a Real (number)');
          if (typeof Void !== 'number') throw new Error('Parameter Void must be a Real (number)');
          return (result == true) ? (cmd == CommandToMotor.stop) : (cmd == SysADL.types.Void);
        }
    });
  }
}

// Constraint class: PassedMotorEQ
class CT_ComponentsAGV_PassedMotorEQ extends Constraint {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      outParameters: [],
      equation: "((result == false) ? (ack == NotificationToSupervisory.passed) : (ack == SysADL.types.Void))",
      constraintFunction: function(params) {// Conditional constraint: ((result == false) ? (ack == NotificationToSupervisory.passed) : (ack == SysADL.types.Void))
          const { result, ack, NotificationToSupervisory, passed, SysADL, Void } = params;
          
          // Type validation
          if (typeof result !== 'number') throw new Error('Parameter result must be a Real (number)');
          if (typeof ack !== 'number') throw new Error('Parameter ack must be a Real (number)');
          if (typeof NotificationToSupervisory !== 'number') throw new Error('Parameter NotificationToSupervisory must be a Real (number)');
          if (typeof passed !== 'number') throw new Error('Parameter passed must be a Real (number)');
          if (typeof SysADL !== 'number') throw new Error('Parameter SysADL must be a Real (number)');
          if (typeof Void !== 'number') throw new Error('Parameter Void must be a Real (number)');
          return (result == false) ? (ack == NotificationToSupervisory.passed) : (ack == SysADL.types.Void);
        }
    });
  }
}

// Constraint class: SendCurrentLocationEQ
class CT_ComponentsAGV_SendCurrentLocationEQ extends Constraint {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      outParameters: [],
      equation: "(outLocation == inLocation)",
      constraintFunction: function(params) {// Constraint equation: (outLocation == inLocation)
          const { inLocation } = params;
          
          // Type validation
          if (typeof inLocation !== 'number') throw new Error('Parameter inLocation must be a Real (number)');
          return outLocation == inLocation;
        }
    });
  }
}

// Constraint class: ControlArmEQ
class CT_ComponentsAGV_ControlArmEQ extends Constraint {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      outParameters: [],
      equation: "((statusMotor == NotificationFromMotor.stopped) ? (startArm == cmd) : (startArm == CommandToArm.idle))",
      constraintFunction: function(params) {// Conditional constraint: ((statusMotor == NotificationFromMotor.stopped) ? (startArm == cmd) : (startArm == CommandToArm.idle))
          const { statusMotor, NotificationFromMotor, stopped, startArm, cmd, CommandToArm, idle } = params;
          
          // Type validation
          if (typeof statusMotor !== 'number') throw new Error('Parameter statusMotor must be a Real (number)');
          if (typeof NotificationFromMotor !== 'number') throw new Error('Parameter NotificationFromMotor must be a Real (number)');
          if (typeof stopped !== 'number') throw new Error('Parameter stopped must be a Real (number)');
          if (typeof startArm !== 'number') throw new Error('Parameter startArm must be a Real (number)');
          if (typeof cmd !== 'number') throw new Error('Parameter cmd must be a Real (number)');
          if (typeof CommandToArm !== 'number') throw new Error('Parameter CommandToArm must be a Real (number)');
          if (typeof idle !== 'number') throw new Error('Parameter idle must be a Real (number)');
          return (statusMotor == NotificationFromMotor.stopped) ? (startArm == cmd) : (startArm == CommandToArm.idle);
        }
    });
  }
}

// Constraint class: NotifierArmEQ
class CT_ComponentsAGV_NotifierArmEQ extends Constraint {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      outParameters: [],
      equation: "(ack == NotificationToSupervisory.arrived)",
      constraintFunction: function(params) {// Constraint equation: (ack == NotificationToSupervisory.arrived)
          const { NotificationToSupervisory, arrived } = params;
          
          // Type validation
          if (typeof NotificationToSupervisory !== 'number') throw new Error('Parameter NotificationToSupervisory must be a Real (number)');
          if (typeof arrived !== 'number') throw new Error('Parameter arrived must be a Real (number)');
          return ack == NotificationToSupervisory.arrived;
        }
    });
  }
}

// Constraint class: VehicleTimerEQ
class CT_ComponentsAGV_VehicleTimerEQ extends Constraint {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      outParameters: [],
      equation: "(((s.destination == dest) && (s.location == loc)) && (s.command == cmd))",
      constraintFunction: function(params) {// Executable expression: (((s.destination == dest) && (s.location == loc)) && (s.command == cmd))
          const {  } = params;
          
          return (((s.destination == dest) && (s.location == loc)) && (s.command == cmd));
        }
    });
  }
}

// Executable class: SendStartMotorEX
class EX_ComponentsAGV_SendStartMotorEX extends Executable {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      body: "executable def SendStartMotorEX ( in move : VehicleData) : out CommandToMotor {\n\t\treturn CommandToMotor::start;\n\t}",
      executableFunction: function(params) {
          // Type validation
          // Type validation for move: (auto-detected from usage)
          const { move } = params;
          return CommandToMotor.start;
        }
    });
  }
}

// Executable class: SendCommandEX
class EX_ComponentsAGV_SendCommandEX extends Executable {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      body: "executable def SendCommandEX ( in move : VehicleData) : out CommandToArm {\n\t\treturn move->command;\n\t}",
      executableFunction: function(params) {
          // Type validation
          // Type validation for move: (auto-detected from usage)
          const { move } = params;
          return move.command;
        }
    });
  }
}

// Executable class: SendDestinationEX
class EX_ComponentsAGV_SendDestinationEX extends Executable {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      body: "executable def SendDestinationEX ( in move : VehicleData) : out Location {\n\t\treturn move->destination;\n\t}",
      executableFunction: function(params) {
          // Type validation
          // Type validation for move: (auto-detected from usage)
          const { move } = params;
          return move.destination;
        }
    });
  }
}

// Executable class: NotifyAGVFromMotorEX
class EX_ComponentsAGV_NotifyAGVFromMotorEX extends Executable {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      body: "executable def NotifyAGVFromMotorEX ( in statusMotor : NotificationFromMotor) : \n\tout NotificationFromMotor{\n\t\treturn statusMotor;\n\t}",
      executableFunction: function(params) {
          // Type validation
          // Type validation for statusMotor: (auto-detected from usage)
          const { statusMotor } = params;
          return statusMotor;
        }
    });
  }
}

// Executable class: NotifySupervisoryFromMotorEX
class EX_ComponentsAGV_NotifySupervisoryFromMotorEX extends Executable {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      body: "executable def NotifySupervisoryFromMotorEX ( in statusMotor : NotificationFromMotor) : \n\t\tout\tNotificationToSupervisory {\n\t\tif (statusMotor == NotificationFromMotor::started) \n\t\t\treturn NotificationToSupervisory::departed;\n\t\telse\n\t\t\treturn NotificationToSupervisory::traveling;\n\t}",
      executableFunction: function(params) {
          // Type validation
          // Type validation for statusMotor: (auto-detected from usage)
          const { statusMotor } = params;
          if (statusMotor == NotificationFromMotor.started) {
          return NotificationToSupervisory.departed;
        } else {
          return NotificationToSupervisory.traveling;
        }
        }
    });
  }
}

// Executable class: CompareStationsEX
class EX_ComponentsAGV_CompareStationsEX extends Executable {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      body: "executable def CompareStationsEX ( in destination : Location, in location : Location, \n\t\tin statusMotor : NotificationFromMotor) : \tout Boolean {\n\t\tif(statusMotor == NotificationFromMotor::started && destination == location)\n\t\t\treturn true;\n\t\telse\n\t\t\treturn false;\n\t}",
      executableFunction: function(params) {
          // Type validation
          // Type validation for destination: (auto-detected from usage)
          // Type validation for location: (auto-detected from usage)
          // Type validation for statusMotor: (auto-detected from usage)
          const { destination, location, statusMotor } = params;
          if(statusMotor == NotificationFromMotor.started && destination == location) {
          return true;
        } else {
          return false;
        }
        }
    });
  }
}

// Executable class: StopMotorEX
class EX_ComponentsAGV_StopMotorEX extends Executable {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      body: "executable def StopMotorEX ( in comparisonResult : Boolean) :\n\tout CommandToMotor {\n\t\tif(comparisonResult == true)\n\t\t\treturn CommandToMotor::stop;\n\t\telse\n\t\t\treturn null;\n\t}",
      executableFunction: function(params) {
          // Type validation
          // Type validation for comparisonResult: (auto-detected from usage)
          const { comparisonResult } = params;
          if(comparisonResult == true) {
          return CommandToMotor.stop;
        } else {
          return null;
        }
        }
    });
  }
}

// Executable class: PassedMotorEX
class EX_ComponentsAGV_PassedMotorEX extends Executable {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      body: "executable def PassedMotorEX ( in comparisonResult : Boolean) :\n\tout NotificationToSupervisory {\n\t\tif(comparisonResult == false)\n\t\t\treturn NotificationToSupervisory::passed;\n\t\telse\n\t\t\treturn null;\n\t}",
      executableFunction: function(params) {
          // Type validation
          // Type validation for comparisonResult: (auto-detected from usage)
          const { comparisonResult } = params;
          if(comparisonResult == false) {
          return NotificationToSupervisory.passed;
        } else {
          return null;
        }
        }
    });
  }
}

// Executable class: SendCurrentLocationEX
class EX_ComponentsAGV_SendCurrentLocationEX extends Executable {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      body: "executable def SendCurrentLocationEX ( in location : Location)\n\t: out Location {\n\t\treturn location;\n\t}",
      executableFunction: function(params) {
          // Type validation
          // Type validation for location: (auto-detected from usage)
          const { location } = params;
          return location;
        }
    });
  }
}

// Executable class: ControlArmEX
class EX_ComponentsAGV_ControlArmEX extends Executable {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      body: "executable def ControlArmEX ( in statusMotor : NotificationFromMotor, in cmd : CommandToArm) : out CommandToArm {\n\t\tif(statusMotor == NotificationFromMotor::stopped)\n\t\t\treturn cmd;\n\t\telse\n\t\t\treturn CommandToArm::idle;\n\t}",
      executableFunction: function(params) {
          // Type validation
          // Type validation for statusMotor: (auto-detected from usage)
          // Type validation for cmd: (auto-detected from usage)
          const { statusMotor, cmd } = params;
          if(statusMotor == NotificationFromMotor.stopped) {
          return cmd;
        } else {
          return CommandToArm.idle;
        }
        }
    });
  }
}

// Executable class: NotifierArmEX
class EX_ComponentsAGV_NotifierArmEX extends Executable {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      body: "executable def NotifierArmEX ( in statusArm : NotificationFromArm) : \n\tout\tNotificationToSupervisory {\n\t\treturn NotificationToSupervisory::arrived;\n\t}",
      executableFunction: function(params) {
          // Type validation
          // Type validation for statusArm: (auto-detected from usage)
          const { statusArm } = params;
          return NotificationToSupervisory.arrived;
        }
    });
  }
}

// Executable class: VehicleTimerEX
class EX_ComponentsAGV_VehicleTimerEX extends Executable {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      body: "executable def VehicleTimerEX ( in location : Location, in cmd : CommandToArm, \n\t\tin destination : Location) : out Status {\n\t\t\n\t\tlet s : Status;\n\t\ts->destination = destination;\n\t\ts->location = location;\n\t\ts->command = cmd;\n\t\t\n\t\treturn s;\n\t}",
      executableFunction: function(params) {
          // Type validation
          // Type validation for location: (auto-detected from usage)
          // Type validation for cmd: (auto-detected from usage)
          // Type validation for destination: (auto-detected from usage)
          const { location, cmd, destination } = params;
          let s;
		s.destination = destination;
		s.location = location;
		s.command = cmd;
		
		return s;
        }
    });
  }
}

// ===== End Behavioral Element Classes =====

class SysADLArchitecture extends Model {
  constructor(){
    super("SysADLArchitecture");
    this.FactoryAutomationSystem = new CP_ComponentsAGV_FactoryAutomationSystem("FactoryAutomationSystem", { sysadlDefinition: "FactoryAutomationSystem" });
    this.addComponent(this.FactoryAutomationSystem);
    this.FactoryAutomationSystem.agvs = new CP_ComponentsAGV_AGVSystem("agvs", { sysadlDefinition: "AGVSystem" });
    this.FactoryAutomationSystem.addComponent(this.FactoryAutomationSystem.agvs);
    this.FactoryAutomationSystem.ds = new CP_ComponentsAGV_DisplaySystem("ds", { isBoundary: true, sysadlDefinition: "DisplaySystem" });
    this.FactoryAutomationSystem.addComponent(this.FactoryAutomationSystem.ds);
    this.FactoryAutomationSystem.ss = new CP_ComponentsAGV_SupervisorySystem("ss", { isBoundary: true, sysadlDefinition: "SupervisorySystem" });
    this.FactoryAutomationSystem.addComponent(this.FactoryAutomationSystem.ss);
    this.FactoryAutomationSystem.agvs.as = new CP_ComponentsAGV_ArrivalSensor("as", { isBoundary: true, sysadlDefinition: "ArrivalSensor" });
    this.FactoryAutomationSystem.agvs.addComponent(this.FactoryAutomationSystem.agvs.as);
    this.FactoryAutomationSystem.agvs.m = new CP_ComponentsAGV_Motor("m", { isBoundary: true, sysadlDefinition: "Motor" });
    this.FactoryAutomationSystem.agvs.addComponent(this.FactoryAutomationSystem.agvs.m);
    this.FactoryAutomationSystem.agvs.ra = new CP_ComponentsAGV_RobotArm("ra", { isBoundary: true, sysadlDefinition: "RobotArm" });
    this.FactoryAutomationSystem.agvs.addComponent(this.FactoryAutomationSystem.agvs.ra);
    this.FactoryAutomationSystem.agvs.vc = new CP_ComponentsAGV_VehicleControl("vc", { sysadlDefinition: "VehicleControl" });
    this.FactoryAutomationSystem.agvs.addComponent(this.FactoryAutomationSystem.agvs.vc);
    this.FactoryAutomationSystem.agvs.vc.ca = new CP_ComponentsAGV_ControlArm("ca", { sysadlDefinition: "ControlArm" });
    this.FactoryAutomationSystem.agvs.vc.addComponent(this.FactoryAutomationSystem.agvs.vc.ca);
    this.FactoryAutomationSystem.agvs.vc.cs = new CP_ComponentsAGV_CheckStation("cs", { sysadlDefinition: "CheckStation" });
    this.FactoryAutomationSystem.agvs.vc.addComponent(this.FactoryAutomationSystem.agvs.vc.cs);
    this.FactoryAutomationSystem.agvs.vc.na = new CP_ComponentsAGV_NotifierArm("na", { sysadlDefinition: "NotifierArm" });
    this.FactoryAutomationSystem.agvs.vc.addComponent(this.FactoryAutomationSystem.agvs.vc.na);
    this.FactoryAutomationSystem.agvs.vc.nm = new CP_ComponentsAGV_NotifierMotor("nm", { sysadlDefinition: "NotifierMotor" });
    this.FactoryAutomationSystem.agvs.vc.addComponent(this.FactoryAutomationSystem.agvs.vc.nm);
    this.FactoryAutomationSystem.agvs.vc.sm = new CP_ComponentsAGV_StartMoving("sm", { sysadlDefinition: "StartMoving" });
    this.FactoryAutomationSystem.agvs.vc.addComponent(this.FactoryAutomationSystem.agvs.vc.sm);
    this.FactoryAutomationSystem.agvs.vc.vt = new CP_ComponentsAGV_VehicleTimer("vt", { sysadlDefinition: "VehicleTimer" });
    this.FactoryAutomationSystem.agvs.vc.addComponent(this.FactoryAutomationSystem.agvs.vc.vt);

    this.FactoryAutomationSystem.agvs.addConnector(new CN_ConnectorsAGV_locationVehicle("arrived", this.FactoryAutomationSystem.getPort("arrivalDetected_out"), this.FactoryAutomationSystem.getPort("arrivalDetected_in")));
    this.FactoryAutomationSystem.agvs.addConnector(new CN_ConnectorsAGV_notificationArm("ackArm", this.FactoryAutomationSystem.agvs.ra.getPort("started"), this.FactoryAutomationSystem.agvs.vc.getPort("startedArm")));
    this.FactoryAutomationSystem.agvs.addConnector(new CN_ConnectorsAGV_commandArm("cmdArm", this.FactoryAutomationSystem.agvs.vc.getPort("startArm"), this.FactoryAutomationSystem.agvs.ra.getPort("start")));
    this.FactoryAutomationSystem.agvs.addConnector(new CN_ConnectorsAGV_notificationMotor("ackMotor", this.FactoryAutomationSystem.getPort("started_stopped_out"), this.FactoryAutomationSystem.getPort("started_stopped_in")));
    this.FactoryAutomationSystem.agvs.addConnector(new CN_ConnectorsAGV_commandMotor("cmdMotor", this.FactoryAutomationSystem.getPort("start_stop_out"), this.FactoryAutomationSystem.getPort("start_stop_in")));
    this.FactoryAutomationSystem.agvs.vc.addConnector(new CN_ConnectorsAGV_locationVehicle("destinationStation2", this.FactoryAutomationSystem.agvs.vc.cs.getPort("destination"), this.FactoryAutomationSystem.agvs.getPort("destination_vt")));
    this.FactoryAutomationSystem.agvs.vc.addConnector(new CN_ConnectorsAGV_locationVehicle("destinationStation", this.FactoryAutomationSystem.agvs.vc.cs.getPort("destination"), this.FactoryAutomationSystem.agvs.getPort("destination_cs")));
    this.FactoryAutomationSystem.agvs.vc.addConnector(new CN_ConnectorsAGV_commandArm("command", this.FactoryAutomationSystem.agvs.getPort("cmd_sm"), this.FactoryAutomationSystem.agvs.vc.ca.getPort("cmd")));
    this.FactoryAutomationSystem.agvs.vc.addConnector(new CN_ConnectorsAGV_commandArm("command2", this.FactoryAutomationSystem.agvs.getPort("cmd_sm"), this.FactoryAutomationSystem.agvs.getPort("cmd_ca")));
    this.FactoryAutomationSystem.agvs.vc.addConnector(new CN_ConnectorsAGV_locationVehicle("currentLocation", this.FactoryAutomationSystem.agvs.getPort("location_cs"), this.FactoryAutomationSystem.agvs.getPort("location_vt")));
    this.FactoryAutomationSystem.agvs.vc.addConnector(new CN_ConnectorsAGV_notificationMotor("sendNotificationMotor", this.FactoryAutomationSystem.agvs.vc.nm.getPort("outAck"), this.FactoryAutomationSystem.agvs.getPort("ack_ca")));
    this.FactoryAutomationSystem.agvs.vc.addConnector(new CN_ConnectorsAGV_notificationMotor("sendNotificationMotor2", this.FactoryAutomationSystem.agvs.vc.nm.getPort("outAck"), this.FactoryAutomationSystem.agvs.getPort("ack_cs")));
    this.FactoryAutomationSystem.addConnector(new CN_ConnectorsAGV_interactionAGVAndSupervisory("dataExchange", this.getPort("in_outDataS"), this.getPort("in_outDataAgv")));
    this.FactoryAutomationSystem.addConnector(new CN_ComponentsAGV_status("updateStatus", this.FactoryAutomationSystem.agvs.getPort("sendStatus"), this.FactoryAutomationSystem.ds.getPort("receiveStatus")));

    const act_StartMovingAC_StartMoving = new AC_ComponentsAGV_StartMovingAC("StartMovingAC", { component: "StartMoving", inputPorts: [], delegates: [{"from":"destination","to":"sc"},{"from":"cmd","to":"sd"},{"from":"start","to":"ssm"},{"from":"move","to":"moveSD"},{"from":"move","to":"moveSC"},{"from":"move","to":"moveSSM"}] });
    const action_SendStartMotorAN_StartMovingAC_StartMoving = new AN_ComponentsAGV_SendStartMotorAN("SendStartMotorAN", { delegates: [{"from":"SendStartMotorAN","to":"cmd"}] });
    const constraint_SendStartMotorEQ_StartMovingAC_StartMoving = new CT_ComponentsAGV_SendStartMotorEQ("SendStartMotorEQ");
    action_SendStartMotorAN_StartMovingAC_StartMoving.registerConstraint(constraint_SendStartMotorEQ_StartMovingAC_StartMoving);
    const exec_SendStartMotorEX_StartMovingAC_StartMoving = new EX_ComponentsAGV_SendStartMotorEX("SendStartMotorEX");
    action_SendStartMotorAN_StartMovingAC_StartMoving.registerExecutable(exec_SendStartMotorEX_StartMovingAC_StartMoving);
    act_StartMovingAC_StartMoving.registerAction(action_SendStartMotorAN_StartMovingAC_StartMoving);
    const action_SendCommandAN_StartMovingAC_StartMoving = new AN_ComponentsAGV_SendCommandAN("SendCommandAN", { delegates: [{"from":"SendCommandAN","to":"cmd"},{"from":"move","to":"move"}] });
    const constraint_SendCommandEQ_StartMovingAC_StartMoving = new CT_ComponentsAGV_SendCommandEQ("SendCommandEQ");
    action_SendCommandAN_StartMovingAC_StartMoving.registerConstraint(constraint_SendCommandEQ_StartMovingAC_StartMoving);
    const exec_SendCommandEX_StartMovingAC_StartMoving = new EX_ComponentsAGV_SendCommandEX("SendCommandEX");
    action_SendCommandAN_StartMovingAC_StartMoving.registerExecutable(exec_SendCommandEX_StartMovingAC_StartMoving);
    act_StartMovingAC_StartMoving.registerAction(action_SendCommandAN_StartMovingAC_StartMoving);
    const action_SendDestinationAN_StartMovingAC_StartMoving = new AN_ComponentsAGV_SendDestinationAN("SendDestinationAN", { delegates: [{"from":"SendDestinationAN","to":"destination"},{"from":"move","to":"move"}] });
    const constraint_SendDestinationEQ_StartMovingAC_StartMoving = new CT_ComponentsAGV_SendDestinationEQ("SendDestinationEQ");
    action_SendDestinationAN_StartMovingAC_StartMoving.registerConstraint(constraint_SendDestinationEQ_StartMovingAC_StartMoving);
    const exec_SendDestinationEX_StartMovingAC_StartMoving = new EX_ComponentsAGV_SendDestinationEX("SendDestinationEX");
    action_SendDestinationAN_StartMovingAC_StartMoving.registerExecutable(exec_SendDestinationEX_StartMovingAC_StartMoving);
    act_StartMovingAC_StartMoving.registerAction(action_SendDestinationAN_StartMovingAC_StartMoving);
    this.registerActivity("StartMovingAC::StartMoving", act_StartMovingAC_StartMoving);
    const act_NotifierMotorAC_NotifierMotor = new AC_ComponentsAGV_NotifierMotorAC("NotifierMotorAC", { component: "NotifierMotor", inputPorts: [], delegates: [{"from":"outStatusMotor","to":"nagvm"},{"from":"ack","to":"nsm"},{"from":"inStatusMotor","to":"statusMotor"},{"from":"inStatusMotor","to":"statusMotor"}] });
    const action_NotifyAGVFromMotorAN_NotifierMotorAC_NotifierMotor = new AN_ComponentsAGV_NotifyAGVFromMotorAN("NotifyAGVFromMotorAN", { delegates: [{"from":"NotifyAGVFromMotorAN","to":"outStatusMotor"},{"from":"statusMotor","to":"inStatusMotor"}] });
    const constraint_NotifyAGVFromMotorEQ_NotifierMotorAC_NotifierMotor = new CT_ComponentsAGV_NotifyAGVFromMotorEQ("NotifyAGVFromMotorEQ");
    action_NotifyAGVFromMotorAN_NotifierMotorAC_NotifierMotor.registerConstraint(constraint_NotifyAGVFromMotorEQ_NotifierMotorAC_NotifierMotor);
    const exec_NotifyAGVFromMotorEX_NotifierMotorAC_NotifierMotor = new EX_ComponentsAGV_NotifyAGVFromMotorEX("NotifyAGVFromMotorEX");
    action_NotifyAGVFromMotorAN_NotifierMotorAC_NotifierMotor.registerExecutable(exec_NotifyAGVFromMotorEX_NotifierMotorAC_NotifierMotor);
    act_NotifierMotorAC_NotifierMotor.registerAction(action_NotifyAGVFromMotorAN_NotifierMotorAC_NotifierMotor);
    const action_NotifySupervisoryFromMotorAN_NotifierMotorAC_NotifierMotor = new AN_ComponentsAGV_NotifySupervisoryFromMotorAN("NotifySupervisoryFromMotorAN", { delegates: [{"from":"NotifySupervisoryFromMotorAN","to":"ack"},{"from":"statusMotor","to":"statusMotor"}] });
    const constraint_NotifySupervisoryFromMotorEQ_NotifierMotorAC_NotifierMotor = new CT_ComponentsAGV_NotifySupervisoryFromMotorEQ("NotifySupervisoryFromMotorEQ");
    action_NotifySupervisoryFromMotorAN_NotifierMotorAC_NotifierMotor.registerConstraint(constraint_NotifySupervisoryFromMotorEQ_NotifierMotorAC_NotifierMotor);
    const exec_NotifySupervisoryFromMotorEX_NotifierMotorAC_NotifierMotor = new EX_ComponentsAGV_NotifySupervisoryFromMotorEX("NotifySupervisoryFromMotorEX");
    action_NotifySupervisoryFromMotorAN_NotifierMotorAC_NotifierMotor.registerExecutable(exec_NotifySupervisoryFromMotorEX_NotifierMotorAC_NotifierMotor);
    act_NotifierMotorAC_NotifierMotor.registerAction(action_NotifySupervisoryFromMotorAN_NotifierMotorAC_NotifierMotor);
    this.registerActivity("NotifierMotorAC::NotifierMotor", act_NotifierMotorAC_NotifierMotor);
    const act_CheckStationAC_CheckStation = new AC_ComponentsAGV_CheckStationAC("CheckStationAC", { component: "CheckStation", inputPorts: [], delegates: [{"from":"statusMotor","to":"NotificationsMotor"},{"from":"destination","to":"Destinations"},{"from":"inLocation","to":"location"},{"from":"outLocation","to":"scl"},{"from":"inLocation","to":"location"},{"from":"stopMotor","to":"sm"},{"from":"passed","to":"pm"}] });
    const action_CompareStationsAN_CheckStationAC_CheckStation = new AN_ComponentsAGV_CompareStationsAN("CompareStationsAN", { delegates: [{"from":"CompareStationsAN","to":"result"},{"from":"location","to":"loc"},{"from":"destination","to":"dest"},{"from":"statusMotor","to":"statusMotor"}] });
    const constraint_CompareStationsEQ_CheckStationAC_CheckStation = new CT_ComponentsAGV_CompareStationsEQ("CompareStationsEQ");
    action_CompareStationsAN_CheckStationAC_CheckStation.registerConstraint(constraint_CompareStationsEQ_CheckStationAC_CheckStation);
    const constraint_NotificationMotorIsStartedEQ_CheckStationAC_CheckStation = new CT_ComponentsAGV_NotificationMotorIsStartedEQ("NotificationMotorIsStartedEQ");
    action_CompareStationsAN_CheckStationAC_CheckStation.registerConstraint(constraint_NotificationMotorIsStartedEQ_CheckStationAC_CheckStation);
    const exec_CompareStationsEX_CheckStationAC_CheckStation = new EX_ComponentsAGV_CompareStationsEX("CompareStationsEX");
    action_CompareStationsAN_CheckStationAC_CheckStation.registerExecutable(exec_CompareStationsEX_CheckStationAC_CheckStation);
    act_CheckStationAC_CheckStation.registerAction(action_CompareStationsAN_CheckStationAC_CheckStation);
    const action_StopMotorAN_CheckStationAC_CheckStation = new AN_ComponentsAGV_StopMotorAN("StopMotorAN", { delegates: [{"from":"comparisonResult","to":"result"},{"from":"StopMotorAN","to":"cmd"}] });
    const constraint_StopMotorEQ_CheckStationAC_CheckStation = new CT_ComponentsAGV_StopMotorEQ("StopMotorEQ");
    action_StopMotorAN_CheckStationAC_CheckStation.registerConstraint(constraint_StopMotorEQ_CheckStationAC_CheckStation);
    const exec_StopMotorEX_CheckStationAC_CheckStation = new EX_ComponentsAGV_StopMotorEX("StopMotorEX");
    action_StopMotorAN_CheckStationAC_CheckStation.registerExecutable(exec_StopMotorEX_CheckStationAC_CheckStation);
    act_CheckStationAC_CheckStation.registerAction(action_StopMotorAN_CheckStationAC_CheckStation);
    const action_PassedMotorAN_CheckStationAC_CheckStation = new AN_ComponentsAGV_PassedMotorAN("PassedMotorAN", { delegates: [{"from":"PassedMotorAN","to":"ack"},{"from":"comparisonResult","to":"result"}] });
    const constraint_PassedMotorEQ_CheckStationAC_CheckStation = new CT_ComponentsAGV_PassedMotorEQ("PassedMotorEQ");
    action_PassedMotorAN_CheckStationAC_CheckStation.registerConstraint(constraint_PassedMotorEQ_CheckStationAC_CheckStation);
    const exec_PassedMotorEX_CheckStationAC_CheckStation = new EX_ComponentsAGV_PassedMotorEX("PassedMotorEX");
    action_PassedMotorAN_CheckStationAC_CheckStation.registerExecutable(exec_PassedMotorEX_CheckStationAC_CheckStation);
    act_CheckStationAC_CheckStation.registerAction(action_PassedMotorAN_CheckStationAC_CheckStation);
    const action_SendCurrentLocationAN_CheckStationAC_CheckStation = new AN_ComponentsAGV_SendCurrentLocationAN("SendCurrentLocationAN", { delegates: [{"from":"location","to":"inLocation"},{"from":"SendCurrentLocationAN","to":"outLocation"}] });
    const constraint_SendCurrentLocationEQ_CheckStationAC_CheckStation = new CT_ComponentsAGV_SendCurrentLocationEQ("SendCurrentLocationEQ");
    action_SendCurrentLocationAN_CheckStationAC_CheckStation.registerConstraint(constraint_SendCurrentLocationEQ_CheckStationAC_CheckStation);
    const exec_SendCurrentLocationEX_CheckStationAC_CheckStation = new EX_ComponentsAGV_SendCurrentLocationEX("SendCurrentLocationEX");
    action_SendCurrentLocationAN_CheckStationAC_CheckStation.registerExecutable(exec_SendCurrentLocationEX_CheckStationAC_CheckStation);
    act_CheckStationAC_CheckStation.registerAction(action_SendCurrentLocationAN_CheckStationAC_CheckStation);
    this.registerActivity("CheckStationAC::CheckStation", act_CheckStationAC_CheckStation);
    const act_ControlArmAC_ControlArm = new AC_ComponentsAGV_ControlArmAC("ControlArmAC", { component: "ControlArm", inputPorts: [], delegates: [{"from":"startArm","to":"ca"},{"from":"cmd","to":"cmd"},{"from":"statusMotor","to":"statusMotor"}] });
    const action_ControlArmAN_ControlArmAC_ControlArm = new AN_ComponentsAGV_ControlArmAN("ControlArmAN", { delegates: [{"from":"ControlArmAN","to":"startArm"},{"from":"statusMotor","to":"statusMotor"},{"from":"cmd","to":"cmd"}] });
    const constraint_ControlArmEQ_ControlArmAC_ControlArm = new CT_ComponentsAGV_ControlArmEQ("ControlArmEQ");
    action_ControlArmAN_ControlArmAC_ControlArm.registerConstraint(constraint_ControlArmEQ_ControlArmAC_ControlArm);
    const exec_ControlArmEX_ControlArmAC_ControlArm = new EX_ComponentsAGV_ControlArmEX("ControlArmEX");
    action_ControlArmAN_ControlArmAC_ControlArm.registerExecutable(exec_ControlArmEX_ControlArmAC_ControlArm);
    act_ControlArmAC_ControlArm.registerAction(action_ControlArmAN_ControlArmAC_ControlArm);
    this.registerActivity("ControlArmAC::ControlArm", act_ControlArmAC_ControlArm);
    const act_NotifierArmAC_NotifierArm = new AC_ComponentsAGV_NotifierArmAC("NotifierArmAC", { component: "NotifierArm", inputPorts: [], delegates: [{"from":"ack","to":"na"},{"from":"statusArm","to":"statusArm"}] });
    const action_NotifierArmAN_NotifierArmAC_NotifierArm = new AN_ComponentsAGV_NotifierArmAN("NotifierArmAN", { delegates: [{"from":"NotifierArmAN","to":"ack"}] });
    const constraint_NotifierArmEQ_NotifierArmAC_NotifierArm = new CT_ComponentsAGV_NotifierArmEQ("NotifierArmEQ");
    action_NotifierArmAN_NotifierArmAC_NotifierArm.registerConstraint(constraint_NotifierArmEQ_NotifierArmAC_NotifierArm);
    const exec_NotifierArmEX_NotifierArmAC_NotifierArm = new EX_ComponentsAGV_NotifierArmEX("NotifierArmEX");
    action_NotifierArmAN_NotifierArmAC_NotifierArm.registerExecutable(exec_NotifierArmEX_NotifierArmAC_NotifierArm);
    act_NotifierArmAC_NotifierArm.registerAction(action_NotifierArmAN_NotifierArmAC_NotifierArm);
    this.registerActivity("NotifierArmAC::NotifierArm", act_NotifierArmAC_NotifierArm);
    const act_VehicleTimerAC_VehicleTimer = new AC_ComponentsAGV_VehicleTimerAC("VehicleTimerAC", { component: "VehicleTimer", inputPorts: [], delegates: [{"from":"status","to":"vt"},{"from":"cmd","to":"cmd"},{"from":"destination","to":"destination"},{"from":"location","to":"location"}] });
    const action_VehicleTimerAN_VehicleTimerAC_VehicleTimer = new AN_ComponentsAGV_VehicleTimerAN("VehicleTimerAN", { delegates: [{"from":"VehicleTimerAN","to":"s"},{"from":"location","to":"loc"},{"from":"destination","to":"dest"},{"from":"cmd","to":"cmd"}] });
    const constraint_VehicleTimerEQ_VehicleTimerAC_VehicleTimer = new CT_ComponentsAGV_VehicleTimerEQ("VehicleTimerEQ");
    action_VehicleTimerAN_VehicleTimerAC_VehicleTimer.registerConstraint(constraint_VehicleTimerEQ_VehicleTimerAC_VehicleTimer);
    const exec_VehicleTimerEX_VehicleTimerAC_VehicleTimer = new EX_ComponentsAGV_VehicleTimerEX("VehicleTimerEX");
    action_VehicleTimerAN_VehicleTimerAC_VehicleTimer.registerExecutable(exec_VehicleTimerEX_VehicleTimerAC_VehicleTimer);
    act_VehicleTimerAC_VehicleTimer.registerAction(action_VehicleTimerAN_VehicleTimerAC_VehicleTimer);
    this.registerActivity("VehicleTimerAC::VehicleTimer", act_VehicleTimerAC_VehicleTimer);
  }
}

const __portAliases = {};
function createModel(){ return new SysADLArchitecture(); }
module.exports = { createModel, SysADLArchitecture, __portAliases, EN_NotificationToSupervisory, EN_NotificationFromArm, EN_CommandToArm, EN_NotificationFromMotor, EN_CommandToMotor, DT_Status, DT_Location, DT_VehicleData, PT_ComponentsAGV_inLocation, PT_ComponentsAGV_outLocation, PT_PortsAGV_inStatus, PT_PortsAGV_outStatus, PT_PortsAGV_inVehicleData, PT_PortsAGV_outVehicleData, PT_PortsAGV_inNotificationFromMotor, PT_PortsAGV_outNotificationFromMotor, PT_PortsAGV_inCommandToMotor, PT_PortsAGV_outCommandToMotor, PT_PortsAGV_inNotificationFromArm, PT_PortsAGV_outNotificationFromArm, PT_PortsAGV_inCommandToArm, PT_PortsAGV_outCommandToArm, PT_PortsAGV_inNotificationToSupervisory, PT_PortsAGV_outNotificationToSupervisory, PT_PortsAGV_IAGVSystem, PT_PortsAGV_ISupervisorySystem };
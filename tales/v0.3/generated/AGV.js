const { Model, Component, Port, SimplePort, CompositePort, Connector, Activity, Action, createExecutableFromExpression, Enum, Int, Boolean, String, Real, Void, valueType, dataType, dimension, unit } = require('../SysADLBase');

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

    this.addExecutableSafe("SysADLArchitecture.SendStartMotorEX", "executable def SendStartMotorEX ( in move : VehicleData) : out CommandToMotor {\n\t\treturn CommandToMotor::start;\n\t}", []);
    this.addExecutableSafe("SysADLArchitecture.SendCommandEX", "executable def SendCommandEX ( in move : VehicleData) : out CommandToArm {\n\t\treturn move->command;\n\t}", []);
    this.addExecutableSafe("SysADLArchitecture.SendDestinationEX", "executable def SendDestinationEX ( in move : VehicleData) : out Location {\n\t\treturn move->destination;\n\t}", []);
    this.addExecutableSafe("SysADLArchitecture.NotifyAGVFromMotorEX", "executable def NotifyAGVFromMotorEX ( in statusMotor : NotificationFromMotor) : \n\tout NotificationFromMotor{\n\t\treturn statusMotor;\n\t}", []);
    this.addExecutableSafe("SysADLArchitecture.NotifySupervisoryFromMotorEX", "executable def NotifySupervisoryFromMotorEX ( in statusMotor : NotificationFromMotor) : \n\t\tout\tNotificationToSupervisory {\n\t\tif (statusMotor == NotificationFromMotor::started) \n\t\t\treturn NotificationToSupervisory::departed;\n\t\telse\n\t\t\treturn NotificationToSupervisory::traveling;\n\t}", []);
    this.addExecutableSafe("SysADLArchitecture.CompareStationsEX", "executable def CompareStationsEX ( in destination : Location, in location : Location, \n\t\tin statusMotor : NotificationFromMotor) : \tout Boolean {\n\t\tif(statusMotor == NotificationFromMotor::started && destination == location)\n\t\t\treturn true;\n\t\telse\n\t\t\treturn false;\n\t}", []);
    this.addExecutableSafe("SysADLArchitecture.StopMotorEX", "executable def StopMotorEX ( in comparisonResult : Boolean) :\n\tout CommandToMotor {\n\t\tif(comparisonResult == true)\n\t\t\treturn CommandToMotor::stop;\n\t\telse\n\t\t\treturn null;\n\t}", []);
    this.addExecutableSafe("SysADLArchitecture.PassedMotorEX", "executable def PassedMotorEX ( in comparisonResult : Boolean) :\n\tout NotificationToSupervisory {\n\t\tif(comparisonResult == false)\n\t\t\treturn NotificationToSupervisory::passed;\n\t\telse\n\t\t\treturn null;\n\t}", []);
    this.addExecutableSafe("SysADLArchitecture.SendCurrentLocationEX", "executable def SendCurrentLocationEX ( in location : Location)\n\t: out Location {\n\t\treturn location;\n\t}", []);
    this.addExecutableSafe("SysADLArchitecture.ControlArmEX", "executable def ControlArmEX ( in statusMotor : NotificationFromMotor, in cmd : CommandToArm) : out CommandToArm {\n\t\tif(statusMotor == NotificationFromMotor::stopped)\n\t\t\treturn cmd;\n\t\telse\n\t\t\treturn CommandToArm::idle;\n\t}", []);
    this.addExecutableSafe("SysADLArchitecture.NotifierArmEX", "executable def NotifierArmEX ( in statusArm : NotificationFromArm) : \n\tout\tNotificationToSupervisory {\n\t\treturn NotificationToSupervisory::arrived;\n\t}", []);
    this.addExecutableSafe("SysADLArchitecture.VehicleTimerEX", "executable def VehicleTimerEX ( in location : Location, in cmd : CommandToArm, \n\t\tin destination : Location) : out Status {\n\t\t\n\t\tlet s : Status;\n\t\ts->destination = destination;\n\t\ts->location = location;\n\t\ts->command = cmd;\n\t\t\n\t\treturn s;\n\t}", []);
    this.addExecutableSafe("SysADLArchitecture.vphn", "executable CompareStationsEX to CompareStationsAN", []);
    this.addExecutableSafe("SysADLArchitecture.bohj", "executable ControlArmEX to ControlArmAN", []);
    this.addExecutableSafe("SysADLArchitecture.6u5i", "executable NotifierArmEX to NotifierArmAN", []);
    this.addExecutableSafe("SysADLArchitecture.gi56", "executable NotifyAGVFromMotorEX to NotifyAGVFromMotorAN", []);
    this.addExecutableSafe("SysADLArchitecture.a8hv", "executable NotifySupervisoryFromMotorEX to NotifySupervisoryFromMotorAN", []);
    this.addExecutableSafe("SysADLArchitecture.02dz", "executable PassedMotorEX to PassedMotorAN", []);
    this.addExecutableSafe("SysADLArchitecture.jkwg", "executable SendCommandEX to SendCommandAN", []);
    this.addExecutableSafe("SysADLArchitecture.wmeb", "executable SendCurrentLocationEX to SendCurrentLocationAN", []);
    this.addExecutableSafe("SysADLArchitecture.rs1z", "executable SendDestinationEX to SendDestinationAN", []);
    this.addExecutableSafe("SysADLArchitecture.cf96", "executable SendStartMotorEX to SendStartMotorAN", []);
    this.addExecutableSafe("SysADLArchitecture.34c6", "executable StopMotorEX to StopMotorAN", []);
    this.addExecutableSafe("SysADLArchitecture.apzi", "executable VehicleTimerEX to VehicleTimerAN", []);
    const act_StartMovingAC_sm = new Activity("StartMovingAC", { component: "sm", inputPorts: ["move"] });
    act_StartMovingAC_sm.addAction(new Action("SendStartMotorAN", [], "SendStartMotorEX"));
    act_StartMovingAC_sm.addAction(new Action("SendCommandAN", [], "SendCommandEX"));
    act_StartMovingAC_sm.addAction(new Action("SendDestinationAN", [], "SendDestinationEX"));
    this.registerActivity("StartMovingAC::sm", act_StartMovingAC_sm);
    const act_NotifierMotorAC_nm = new Activity("NotifierMotorAC", { component: "nm", inputPorts: ["inAck"] });
    act_NotifierMotorAC_nm.addAction(new Action("NotifyAGVFromMotorAN", [], "NotifyAGVFromMotorEX"));
    act_NotifierMotorAC_nm.addAction(new Action("NotifySupervisoryFromMotorAN", [], "NotifySupervisoryFromMotorEX"));
    this.registerActivity("NotifierMotorAC::nm", act_NotifierMotorAC_nm);
    const act_CheckStationAC_cs = new Activity("CheckStationAC", { component: "cs", inputPorts: ["ack"] });
    act_CheckStationAC_cs.addAction(new Action("CompareStationsAN", [], "CompareStationsEX"));
    act_CheckStationAC_cs.addAction(new Action("StopMotorAN", [], "StopMotorEX"));
    act_CheckStationAC_cs.addAction(new Action("PassedMotorAN", [], "PassedMotorEX"));
    act_CheckStationAC_cs.addAction(new Action("SendCurrentLocationAN", [], "SendCurrentLocationEX"));
    this.registerActivity("CheckStationAC::cs", act_CheckStationAC_cs);
    const act_ControlArmAC_ca = new Activity("ControlArmAC", { component: "ca", inputPorts: ["cmd"] });
    act_ControlArmAC_ca.addAction(new Action("ControlArmAN", [], "ControlArmEX"));
    this.registerActivity("ControlArmAC::ca", act_ControlArmAC_ca);
    const act_NotifierArmAC_na = new Activity("NotifierArmAC", { component: "na", inputPorts: ["arrivedStatus"] });
    act_NotifierArmAC_na.addAction(new Action("NotifierArmAN", [], "NotifierArmEX"));
    this.registerActivity("NotifierArmAC::na", act_NotifierArmAC_na);
    const act_VehicleTimerAC_vt = new Activity("VehicleTimerAC", { component: "vt", inputPorts: ["destination"] });
    act_VehicleTimerAC_vt.addAction(new Action("VehicleTimerAN", [], "VehicleTimerEX"));
    this.registerActivity("VehicleTimerAC::vt", act_VehicleTimerAC_vt);
  }
}

const __portAliases = {};
function createModel(){ return new SysADLArchitecture(); }
module.exports = { createModel, SysADLArchitecture, __portAliases, EN_NotificationToSupervisory, EN_NotificationFromArm, EN_CommandToArm, EN_NotificationFromMotor, EN_CommandToMotor, DT_Status, DT_Location, DT_VehicleData, PT_ComponentsAGV_inLocation, PT_ComponentsAGV_outLocation, PT_PortsAGV_inStatus, PT_PortsAGV_outStatus, PT_PortsAGV_inVehicleData, PT_PortsAGV_outVehicleData, PT_PortsAGV_inNotificationFromMotor, PT_PortsAGV_outNotificationFromMotor, PT_PortsAGV_inCommandToMotor, PT_PortsAGV_outCommandToMotor, PT_PortsAGV_inNotificationFromArm, PT_PortsAGV_outNotificationFromArm, PT_PortsAGV_inCommandToArm, PT_PortsAGV_outCommandToArm, PT_PortsAGV_inNotificationToSupervisory, PT_PortsAGV_outNotificationToSupervisory, PT_PortsAGV_IAGVSystem, PT_PortsAGV_ISupervisorySystem };
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
class PT_inLocation extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Location" }, ...opts });
  }
}
class PT_outLocation extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "Location" }, ...opts });
  }
}
class PT_inStatus extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Status" }, ...opts });
  }
}
class PT_outStatus extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "Status" }, ...opts });
  }
}
class PT_inVehicleData extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "VehicleData" }, ...opts });
  }
}
class PT_outVehicleData extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "VehicleData" }, ...opts });
  }
}
class PT_inNotificationFromMotor extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "NotificationFromMotor" }, ...opts });
  }
}
class PT_outNotificationFromMotor extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "NotificationFromMotor" }, ...opts });
  }
}
class PT_inCommandToMotor extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "CommandToMotor" }, ...opts });
  }
}
class PT_outCommandToMotor extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "CommandToMotor" }, ...opts });
  }
}
class PT_inNotificationFromArm extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "NotificationFromArm" }, ...opts });
  }
}
class PT_outNotificationFromArm extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "NotificationFromArm" }, ...opts });
  }
}
class PT_inCommandToArm extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "CommandToArm" }, ...opts });
  }
}
class PT_outCommandToArm extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "CommandToArm" }, ...opts });
  }
}
class PT_inNotificationToSupervisory extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "NotificationToSupervisory" }, ...opts });
  }
}
class PT_outNotificationToSupervisory extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "NotificationToSupervisory" }, ...opts });
  }
}
class PT_IAGVSystem extends CompositePort {
  constructor(name, opts = {}) {
    super(name, 'composite', opts);
    // Add sub-ports
    this.addSubPort("inMoveToStation", new SimplePort("inMoveToStation", "in", { ...{ expectedType: "VehicleData" }, owner: this.owner }));
    this.addSubPort("outNotifications", new SimplePort("outNotifications", "out", { ...{ expectedType: "NotificationToSupervisory" }, owner: this.owner }));
  }
}
class PT_ISupervisorySystem extends CompositePort {
  constructor(name, opts = {}) {
    super(name, 'composite', opts);
    // Add sub-ports
    this.addSubPort("outMoveToStation", new SimplePort("outMoveToStation", "out", { ...{ expectedType: "VehicleData" }, owner: this.owner }));
    this.addSubPort("inNotifications", new SimplePort("inNotifications", "in", { ...{ expectedType: "NotificationToSupervisory" }, owner: this.owner }));
  }
}

// Connectors
class CN_notifySupervisory extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from nsOPT to undefined
  }
}
class CN_sendVehicleData extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from vdOPT to undefined
  }
}
class CN_notificationMotor extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from nmOPT to undefined
  }
}
class CN_commandArm extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from caOPT to undefined
  }
}
class CN_notificationArm extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from naOPT to undefined
  }
}
class CN_commandMotor extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from cmOPT to undefined
  }
}
class CN_interactionAGVAndSupervisory extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: 
  }
}
class CN_locationVehicle extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from lOPT to undefined
  }
}
class CN_status extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from sOPT to undefined
  }
}

// Components
class CP_SupervisorySystem extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_ISupervisorySystem("in_outData", { owner: name }));
    }
}
class CP_AGVSystem extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_outStatus("sendStatus", "out", { owner: name }));
      this.addPort(new PT_IAGVSystem("in_outData", { owner: name }));
    }
}
class CP_DisplaySystem extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_inStatus("receiveStatus", "in", { owner: name }));
    }
}
class CP_Motor extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_inCommandToMotor("start_stop", "in", { owner: name }));
      this.addPort(new PT_outNotificationFromMotor("started_stopped", "out", { owner: name }));
    }
}
class CP_ArrivalSensor extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_outLocation("arrivalDetected", "out", { owner: name }));
    }
}
class CP_RobotArm extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_inCommandToArm("start", "in", { owner: name }));
      this.addPort(new PT_outNotificationFromArm("started", "out", { owner: name }));
    }
}
class CP_VehicleControl extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_outStatus("sendStatus", "out", { owner: name }));
      this.addPort(new PT_inLocation("arrivalDetected", "in", { owner: name }));
      this.addPort(new PT_outCommandToArm("startArm", "out", { owner: name }));
      this.addPort(new PT_inNotificationFromArm("startedArm", "in", { owner: name }));
      this.addPort(new PT_inNotificationFromMotor("started_stopped", "in", { owner: name }));
      this.addPort(new PT_outCommandToMotor("start_stop", "out", { owner: name }));
      this.addPort(new PT_IAGVSystem("in_outData", { owner: name }));
    }
}
class CP_CheckStation extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_inNotificationFromMotor("ack", "in", { owner: name }));
      this.addPort(new PT_outLocation("location", "out", { owner: name }));
      this.addPort(new PT_inLocation("destination", "in", { owner: name }));
      this.addPort(new PT_outCommandToMotor("stop", "out", { owner: name }));
      this.addPort(new PT_inLocation("arrivalDetected", "in", { owner: name }));
      this.addPort(new PT_outNotificationToSupervisory("passed", "out", { owner: name }));
    }
}
class CP_ControlArm extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_inCommandToArm("cmd", "in", { owner: name }));
      this.addPort(new PT_inNotificationFromMotor("ack", "in", { owner: name }));
      this.addPort(new PT_outCommandToArm("startArm", "out", { owner: name }));
    }
}
class CP_NotifierMotor extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_inNotificationFromMotor("inAck", "in", { owner: name }));
      this.addPort(new PT_outNotificationToSupervisory("ack", "out", { owner: name }));
      this.addPort(new PT_outNotificationFromMotor("outAck", "out", { owner: name }));
    }
}
class CP_StartMoving extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_inVehicleData("move", "in", { owner: name }));
      this.addPort(new PT_outCommandToArm("cmd", "out", { owner: name }));
      this.addPort(new PT_outLocation("destination", "out", { owner: name }));
      this.addPort(new PT_outCommandToMotor("start", "out", { owner: name }));
    }
}
class CP_NotifierArm extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_outNotificationToSupervisory("arrivedStatus", "out", { owner: name }));
      this.addPort(new PT_inNotificationFromArm("loaded_unloaded", "in", { owner: name }));
    }
}
class CP_VehicleTimer extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_outStatus("AGVStatus", "out", { owner: name }));
      this.addPort(new PT_inLocation("location", "in", { owner: name }));
      this.addPort(new PT_inLocation("destination", "in", { owner: name }));
      this.addPort(new PT_inCommandToArm("cmd", "in", { owner: name }));
    }
}
class CP_FactoryAutomationSystem extends Component { }

class SysADLArchitecture extends Model {
  constructor(){
    super("SysADLArchitecture");
    this.FactoryAutomationSystem = new CP_FactoryAutomationSystem("FactoryAutomationSystem", { sysadlDefinition: "FactoryAutomationSystem" });
    this.addComponent(this.FactoryAutomationSystem);
    this.FactoryAutomationSystem.agvs = new CP_AGVSystem("agvs", { sysadlDefinition: "AGVSystem" });
    this.FactoryAutomationSystem.addComponent(this.FactoryAutomationSystem.agvs);
    this.FactoryAutomationSystem.ds = new CP_DisplaySystem("ds", { isBoundary: true, sysadlDefinition: "DisplaySystem" });
    this.FactoryAutomationSystem.addComponent(this.FactoryAutomationSystem.ds);
    this.FactoryAutomationSystem.ss = new CP_SupervisorySystem("ss", { isBoundary: true, sysadlDefinition: "SupervisorySystem" });
    this.FactoryAutomationSystem.addComponent(this.FactoryAutomationSystem.ss);
    this.FactoryAutomationSystem.agvs.as = new CP_ArrivalSensor("as", { isBoundary: true, sysadlDefinition: "ArrivalSensor" });
    this.FactoryAutomationSystem.agvs.addComponent(this.FactoryAutomationSystem.agvs.as);
    this.FactoryAutomationSystem.agvs.m = new CP_Motor("m", { isBoundary: true, sysadlDefinition: "Motor" });
    this.FactoryAutomationSystem.agvs.addComponent(this.FactoryAutomationSystem.agvs.m);
    this.FactoryAutomationSystem.agvs.ra = new CP_RobotArm("ra", { isBoundary: true, sysadlDefinition: "RobotArm" });
    this.FactoryAutomationSystem.agvs.addComponent(this.FactoryAutomationSystem.agvs.ra);
    this.FactoryAutomationSystem.agvs.vc = new CP_VehicleControl("vc", { sysadlDefinition: "VehicleControl" });
    this.FactoryAutomationSystem.agvs.addComponent(this.FactoryAutomationSystem.agvs.vc);
    this.FactoryAutomationSystem.agvs.vc.ca = new CP_ControlArm("ca", { sysadlDefinition: "ControlArm" });
    this.FactoryAutomationSystem.agvs.vc.addComponent(this.FactoryAutomationSystem.agvs.vc.ca);
    this.FactoryAutomationSystem.agvs.vc.cs = new CP_CheckStation("cs", { sysadlDefinition: "CheckStation" });
    this.FactoryAutomationSystem.agvs.vc.addComponent(this.FactoryAutomationSystem.agvs.vc.cs);
    this.FactoryAutomationSystem.agvs.vc.na = new CP_NotifierArm("na", { sysadlDefinition: "NotifierArm" });
    this.FactoryAutomationSystem.agvs.vc.addComponent(this.FactoryAutomationSystem.agvs.vc.na);
    this.FactoryAutomationSystem.agvs.vc.nm = new CP_NotifierMotor("nm", { sysadlDefinition: "NotifierMotor" });
    this.FactoryAutomationSystem.agvs.vc.addComponent(this.FactoryAutomationSystem.agvs.vc.nm);
    this.FactoryAutomationSystem.agvs.vc.sm = new CP_StartMoving("sm", { sysadlDefinition: "StartMoving" });
    this.FactoryAutomationSystem.agvs.vc.addComponent(this.FactoryAutomationSystem.agvs.vc.sm);
    this.FactoryAutomationSystem.agvs.vc.vt = new CP_VehicleTimer("vt", { sysadlDefinition: "VehicleTimer" });
    this.FactoryAutomationSystem.agvs.vc.addComponent(this.FactoryAutomationSystem.agvs.vc.vt);

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
    this.addExecutableSafe("SysADLArchitecture.1wfj", "executable CompareStationsEX to CompareStationsAN", []);
    this.addExecutableSafe("SysADLArchitecture.52jd", "executable ControlArmEX to ControlArmAN", []);
    this.addExecutableSafe("SysADLArchitecture.2xek", "executable NotifierArmEX to NotifierArmAN", []);
    this.addExecutableSafe("SysADLArchitecture.5oc7", "executable NotifyAGVFromMotorEX to NotifyAGVFromMotorAN", []);
    this.addExecutableSafe("SysADLArchitecture.eqd9", "executable NotifySupervisoryFromMotorEX to NotifySupervisoryFromMotorAN", []);
    this.addExecutableSafe("SysADLArchitecture.clw6", "executable PassedMotorEX to PassedMotorAN", []);
    this.addExecutableSafe("SysADLArchitecture.1frj", "executable SendCommandEX to SendCommandAN", []);
    this.addExecutableSafe("SysADLArchitecture.cy8y", "executable SendCurrentLocationEX to SendCurrentLocationAN", []);
    this.addExecutableSafe("SysADLArchitecture.p39a", "executable SendDestinationEX to SendDestinationAN", []);
    this.addExecutableSafe("SysADLArchitecture.ra75", "executable SendStartMotorEX to SendStartMotorAN", []);
    this.addExecutableSafe("SysADLArchitecture.lryz", "executable StopMotorEX to StopMotorAN", []);
    this.addExecutableSafe("SysADLArchitecture.j5ax", "executable VehicleTimerEX to VehicleTimerAN", []);
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
    const CN_dataExchange_1 = new CN_interactionAGVAndSupervisory("dataExchange");
    this.addConnector(CN_dataExchange_1);
    const CN_updateStatus_4 = new CN_status("updateStatus");
    this.addConnector(CN_updateStatus_4);
    const CN_arrived_7 = new CN_locationVehicle("arrived");
    this.addConnector(CN_arrived_7);
    const CN_ackArm_10 = new CN_notificationArm("ackArm");
    this.addConnector(CN_ackArm_10);
    const CN_cmdArm_13 = new CN_commandArm("cmdArm");
    this.addConnector(CN_cmdArm_13);
    const CN_ackMotor_16 = new CN_notificationMotor("ackMotor");
    this.addConnector(CN_ackMotor_16);
    const CN_cmdMotor_19 = new CN_commandMotor("cmdMotor");
    this.addConnector(CN_cmdMotor_19);
    const CN_destinationStation2_22 = new CN_locationVehicle("destinationStation2");
    this.addConnector(CN_destinationStation2_22);
    const CN_destinationStation_25 = new CN_locationVehicle("destinationStation");
    this.addConnector(CN_destinationStation_25);
    const CN_command_28 = new CN_commandArm("command");
    this.addConnector(CN_command_28);
    const CN_command2_31 = new CN_commandArm("command2");
    this.addConnector(CN_command2_31);
    const CN_currentLocation_34 = new CN_locationVehicle("currentLocation");
    this.addConnector(CN_currentLocation_34);
    const CN_sendNotificationMotor_37 = new CN_notificationMotor("sendNotificationMotor");
    this.addConnector(CN_sendNotificationMotor_37);
    const CN_sendNotificationMotor2_40 = new CN_notificationMotor("sendNotificationMotor2");
    this.addConnector(CN_sendNotificationMotor2_40);
    const CN_arrived_43 = new CN_locationVehicle("arrived");
    this.addConnector(CN_arrived_43);
    const CN_ackArm_46 = new CN_notificationArm("ackArm");
    this.addConnector(CN_ackArm_46);
    const CN_cmdArm_49 = new CN_commandArm("cmdArm");
    this.addConnector(CN_cmdArm_49);
    const CN_ackMotor_52 = new CN_notificationMotor("ackMotor");
    this.addConnector(CN_ackMotor_52);
    const CN_cmdMotor_55 = new CN_commandMotor("cmdMotor");
    this.addConnector(CN_cmdMotor_55);
    const CN_destinationStation2_58 = new CN_locationVehicle("destinationStation2");
    this.addConnector(CN_destinationStation2_58);
    const CN_destinationStation_61 = new CN_locationVehicle("destinationStation");
    this.addConnector(CN_destinationStation_61);
    const CN_command_64 = new CN_commandArm("command");
    this.addConnector(CN_command_64);
    const CN_command2_67 = new CN_commandArm("command2");
    this.addConnector(CN_command2_67);
    const CN_currentLocation_70 = new CN_locationVehicle("currentLocation");
    this.addConnector(CN_currentLocation_70);
    const CN_sendNotificationMotor_73 = new CN_notificationMotor("sendNotificationMotor");
    this.addConnector(CN_sendNotificationMotor_73);
    const CN_sendNotificationMotor2_76 = new CN_notificationMotor("sendNotificationMotor2");
    this.addConnector(CN_sendNotificationMotor2_76);
  }
}

const __portAliases = {};
function createModel(){ return new SysADLArchitecture(); }
module.exports = { createModel, SysADLArchitecture, __portAliases, EN_NotificationToSupervisory, EN_NotificationFromArm, EN_CommandToArm, EN_NotificationFromMotor, EN_CommandToMotor, DT_Status, DT_Location, DT_VehicleData, PT_inLocation, PT_outLocation, PT_inStatus, PT_outStatus, PT_inVehicleData, PT_outVehicleData, PT_inNotificationFromMotor, PT_outNotificationFromMotor, PT_inCommandToMotor, PT_outCommandToMotor, PT_inNotificationFromArm, PT_outNotificationFromArm, PT_inCommandToArm, PT_outCommandToArm, PT_inNotificationToSupervisory, PT_outNotificationToSupervisory, PT_IAGVSystem, PT_ISupervisorySystem };
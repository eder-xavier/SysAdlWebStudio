const { Model, Component, Port, SimplePort, CompositePort, Connector, Activity, Action, createExecutableFromExpression, Enum, Int, Boolean, String, Real, Void, valueType, dataType, dimension, unit } = require('../SysADLBase');

// Types
const EN_NotificationToSupervisory = new Enum("departed", "arrived", "passed", "traveling");
const EN_NotificationFromArm = new Enum("loaded", "unloaded");
const EN_CommandToArm = new Enum("load", "unload", "idle");
const EN_NotificationFromMotor = new Enum("started", "stopped");
const EN_CommandToMotor = new Enum("start", "stop");
const DT_Status = dataType('Status', { location: DT_Location, destination: DT_Location, command: EN_CommandToArm });
const DT_Location = dataType('Location', { location: String });
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
      this.addPort(new PT_outStatus("sendStatus", { owner: name }));
      this.addPort(new PT_IAGVSystem("in_outData", { owner: name }));
    }
}
class CP_DisplaySystem extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_inStatus("receiveStatus", { owner: name }));
    }
}
class CP_Motor extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_inCommandToMotor("start_stop", { owner: name }));
      this.addPort(new PT_outNotificationFromMotor("started_stopped", { owner: name }));
    }
}
class CP_ArrivalSensor extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_outLocation("arrivalDetected", { owner: name }));
    }
}
class CP_RobotArm extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_inCommandToArm("start", { owner: name }));
      this.addPort(new PT_outNotificationFromArm("started", { owner: name }));
    }
}
class CP_VehicleControl extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_outStatus("sendStatus", { owner: name }));
      this.addPort(new PT_inLocation("arrivalDetected", { owner: name }));
      this.addPort(new PT_outCommandToArm("startArm", { owner: name }));
      this.addPort(new PT_inNotificationFromArm("startedArm", { owner: name }));
      this.addPort(new PT_inNotificationFromMotor("started_stopped", { owner: name }));
      this.addPort(new PT_outCommandToMotor("start_stop", { owner: name }));
      this.addPort(new PT_IAGVSystem("in_outData", { owner: name }));
    }
}
class CP_CheckStation extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_inNotificationFromMotor("ack", { owner: name }));
      this.addPort(new PT_outLocation("location", { owner: name }));
      this.addPort(new PT_inLocation("destination", { owner: name }));
      this.addPort(new PT_outCommandToMotor("stop", { owner: name }));
      this.addPort(new PT_inLocation("arrivalDetected", { owner: name }));
      this.addPort(new PT_outNotificationToSupervisory("passed", { owner: name }));
    }
}
class CP_ControlArm extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_inCommandToArm("cmd", { owner: name }));
      this.addPort(new PT_inNotificationFromMotor("ack", { owner: name }));
      this.addPort(new PT_outCommandToArm("startArm", { owner: name }));
    }
}
class CP_NotifierMotor extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_inNotificationFromMotor("inAck", { owner: name }));
      this.addPort(new PT_outNotificationToSupervisory("ack", { owner: name }));
      this.addPort(new PT_outNotificationFromMotor("outAck", { owner: name }));
    }
}
class CP_StartMoving extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_inVehicleData("move", { owner: name }));
      this.addPort(new PT_outCommandToArm("cmd", { owner: name }));
      this.addPort(new PT_outLocation("destination", { owner: name }));
      this.addPort(new PT_outCommandToMotor("start", { owner: name }));
    }
}
class CP_NotifierArm extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_outNotificationToSupervisory("arrivedStatus", { owner: name }));
      this.addPort(new PT_inNotificationFromArm("loaded_unloaded", { owner: name }));
    }
}
class CP_VehicleTimer extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_outStatus("AGVStatus", { owner: name }));
      this.addPort(new PT_inLocation("location", { owner: name }));
      this.addPort(new PT_inLocation("destination", { owner: name }));
      this.addPort(new PT_inCommandToArm("cmd", { owner: name }));
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

    this.FactoryAutomationSystem.ss.addPort(new PT_ISupervisorySystem("in_outData", "in", { owner: "ss" }));
    this.FactoryAutomationSystem.agvs.addPort(new PT_outStatus("sendStatus", "out", { owner: "agvs" }));
    this.FactoryAutomationSystem.agvs.addPort(new PT_IAGVSystem("in_outData", "in", { owner: "agvs" }));
    this.FactoryAutomationSystem.agvs.addPort(new PT_inCommandToMotor("start_stop_in", "in", { owner: "agvs" }));
    this.FactoryAutomationSystem.agvs.addPort(new PT_outNotificationFromMotor("started_stopped_out", "out", { owner: "agvs" }));
    this.FactoryAutomationSystem.agvs.addPort(new PT_outLocation("arrivalDetected_out", "out", { owner: "agvs" }));
    this.FactoryAutomationSystem.agvs.addPort(new PT_inCommandToArm("start", "in", { owner: "agvs" }));
    this.FactoryAutomationSystem.agvs.addPort(new PT_outNotificationFromArm("started", "out", { owner: "agvs" }));
    this.FactoryAutomationSystem.agvs.addPort(new PT_inLocation("arrivalDetected_in", "in", { owner: "agvs" }));
    this.FactoryAutomationSystem.agvs.addPort(new PT_outCommandToArm("startArm", "out", { owner: "agvs" }));
    this.FactoryAutomationSystem.agvs.addPort(new PT_inNotificationFromArm("startedArm", "in", { owner: "agvs" }));
    this.FactoryAutomationSystem.agvs.addPort(new PT_inNotificationFromMotor("started_stopped_in", "in", { owner: "agvs" }));
    this.FactoryAutomationSystem.agvs.addPort(new PT_outCommandToMotor("start_stop_out", "out", { owner: "agvs" }));
    this.FactoryAutomationSystem.ds.addPort(new PT_inStatus("receiveStatus", "in", { owner: "ds" }));
    this.FactoryAutomationSystem.agvs.m.addPort(new PT_inCommandToMotor("start_stop", "in", { owner: "m" }));
    this.FactoryAutomationSystem.agvs.m.addPort(new PT_outNotificationFromMotor("started_stopped", "out", { owner: "m" }));
    this.FactoryAutomationSystem.agvs.as.addPort(new PT_outLocation("arrivalDetected", "out", { owner: "as" }));
    this.FactoryAutomationSystem.agvs.ra.addPort(new PT_inCommandToArm("start", "in", { owner: "ra" }));
    this.FactoryAutomationSystem.agvs.ra.addPort(new PT_outNotificationFromArm("started", "out", { owner: "ra" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_outStatus("sendStatus", "out", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_inLocation("arrivalDetected", "in", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_outCommandToArm("startArm", "out", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_inNotificationFromArm("startedArm", "in", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_inNotificationFromMotor("started_stopped", "in", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_outCommandToMotor("start_stop", "out", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_IAGVSystem("in_outData", "in", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_inNotificationFromMotor("ack_cs", "in", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_outLocation("location_cs", "out", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_inLocation("destination_cs", "in", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_outCommandToMotor("stop", "out", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_outNotificationToSupervisory("passed", "out", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_inCommandToArm("cmd_ca", "in", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_inNotificationFromMotor("ack_ca", "in", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_inNotificationFromMotor("inAck", "in", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_outNotificationToSupervisory("ack", "out", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_outNotificationFromMotor("outAck", "out", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_inVehicleData("move", "in", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_outCommandToArm("cmd_sm", "out", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_outLocation("destination", "out", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_outCommandToMotor("start", "out", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_outNotificationToSupervisory("arrivedStatus", "out", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_inNotificationFromArm("loaded_unloaded", "in", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_outStatus("AGVStatus", "out", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_inLocation("location_vt", "in", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_inLocation("destination_vt", "in", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.addPort(new PT_inCommandToArm("cmd", "in", { owner: "vc" }));
    this.FactoryAutomationSystem.agvs.vc.cs.addPort(new PT_inNotificationFromMotor("ack", "in", { owner: "cs" }));
    this.FactoryAutomationSystem.agvs.vc.cs.addPort(new PT_outLocation("location", "out", { owner: "cs" }));
    this.FactoryAutomationSystem.agvs.vc.cs.addPort(new PT_inLocation("destination", "in", { owner: "cs" }));
    this.FactoryAutomationSystem.agvs.vc.cs.addPort(new PT_outCommandToMotor("stop", "out", { owner: "cs" }));
    this.FactoryAutomationSystem.agvs.vc.cs.addPort(new PT_inLocation("arrivalDetected", "in", { owner: "cs" }));
    this.FactoryAutomationSystem.agvs.vc.cs.addPort(new PT_outNotificationToSupervisory("passed", "out", { owner: "cs" }));
    this.FactoryAutomationSystem.agvs.vc.ca.addPort(new PT_inCommandToArm("cmd", "in", { owner: "ca" }));
    this.FactoryAutomationSystem.agvs.vc.ca.addPort(new PT_inNotificationFromMotor("ack", "in", { owner: "ca" }));
    this.FactoryAutomationSystem.agvs.vc.ca.addPort(new PT_outCommandToArm("startArm", "out", { owner: "ca" }));
    this.FactoryAutomationSystem.agvs.vc.nm.addPort(new PT_inNotificationFromMotor("inAck", "in", { owner: "nm" }));
    this.FactoryAutomationSystem.agvs.vc.nm.addPort(new PT_outNotificationToSupervisory("ack", "out", { owner: "nm" }));
    this.FactoryAutomationSystem.agvs.vc.nm.addPort(new PT_outNotificationFromMotor("outAck", "out", { owner: "nm" }));
    this.FactoryAutomationSystem.agvs.vc.sm.addPort(new PT_inVehicleData("move", "in", { owner: "sm" }));
    this.FactoryAutomationSystem.agvs.vc.sm.addPort(new PT_outCommandToArm("cmd", "out", { owner: "sm" }));
    this.FactoryAutomationSystem.agvs.vc.sm.addPort(new PT_outLocation("destination", "out", { owner: "sm" }));
    this.FactoryAutomationSystem.agvs.vc.sm.addPort(new PT_outCommandToMotor("start", "out", { owner: "sm" }));
    this.FactoryAutomationSystem.agvs.vc.na.addPort(new PT_outNotificationToSupervisory("arrivedStatus", "out", { owner: "na" }));
    this.FactoryAutomationSystem.agvs.vc.na.addPort(new PT_inNotificationFromArm("loaded_unloaded", "in", { owner: "na" }));
    this.FactoryAutomationSystem.agvs.vc.vt.addPort(new PT_outStatus("AGVStatus", "out", { owner: "vt" }));
    this.FactoryAutomationSystem.agvs.vc.vt.addPort(new PT_inLocation("location", "in", { owner: "vt" }));
    this.FactoryAutomationSystem.agvs.vc.vt.addPort(new PT_inLocation("destination", "in", { owner: "vt" }));
    this.FactoryAutomationSystem.agvs.vc.vt.addPort(new PT_inCommandToArm("cmd", "in", { owner: "vt" }));
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
    this.addExecutableSafe("SysADLArchitecture.q2i9", "executable CompareStationsEX to CompareStationsAN", []);
    this.addExecutableSafe("SysADLArchitecture.50k4", "executable ControlArmEX to ControlArmAN", []);
    this.addExecutableSafe("SysADLArchitecture.pwn8", "executable NotifierArmEX to NotifierArmAN", []);
    this.addExecutableSafe("SysADLArchitecture.003t", "executable NotifyAGVFromMotorEX to NotifyAGVFromMotorAN", []);
    this.addExecutableSafe("SysADLArchitecture.9u26", "executable NotifySupervisoryFromMotorEX to NotifySupervisoryFromMotorAN", []);
    this.addExecutableSafe("SysADLArchitecture.ckq3", "executable PassedMotorEX to PassedMotorAN", []);
    this.addExecutableSafe("SysADLArchitecture.czza", "executable SendCommandEX to SendCommandAN", []);
    this.addExecutableSafe("SysADLArchitecture.h0ej", "executable SendCurrentLocationEX to SendCurrentLocationAN", []);
    this.addExecutableSafe("SysADLArchitecture.x806", "executable SendDestinationEX to SendDestinationAN", []);
    this.addExecutableSafe("SysADLArchitecture.lgoc", "executable SendStartMotorEX to SendStartMotorAN", []);
    this.addExecutableSafe("SysADLArchitecture.0lhh", "executable StopMotorEX to StopMotorAN", []);
    this.addExecutableSafe("SysADLArchitecture.wcue", "executable VehicleTimerEX to VehicleTimerAN", []);
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
    const conn_dataExchange_1 = new Connector("dataExchange");
    const conn_dataExchange_1__seen = new Set();
    if(!conn_dataExchange_1__seen.has("ss::in_outData")) { this.attachEndpointSafe(conn_dataExchange_1, this.FactoryAutomationSystem.ss, "in_outData"); conn_dataExchange_1__seen.add("ss::in_outData"); }
    this.addConnector(conn_dataExchange_1);
    const conn_ss_in_outData__x_x_ss_in_outData__x_x_2 = new Connector("ss.in_outData__x.x_ss.in_outData__x.x");
    const conn_ss_in_outData__x_x_ss_in_outData__x_x_2__seen = new Set();
    if(!conn_ss_in_outData__x_x_ss_in_outData__x_x_2__seen.has("ss::in_outData")) { this.attachEndpointSafe(conn_ss_in_outData__x_x_ss_in_outData__x_x_2, this.FactoryAutomationSystem.ss, "in_outData"); conn_ss_in_outData__x_x_ss_in_outData__x_x_2__seen.add("ss::in_outData"); }
    this.addConnector(conn_ss_in_outData__x_x_ss_in_outData__x_x_2);
    const conn_updateStatus_4 = new Connector("updateStatus");
    const conn_updateStatus_4__seen = new Set();
    if(!conn_updateStatus_4__seen.has("ds::receiveStatus")) { this.attachEndpointSafe(conn_updateStatus_4, this.FactoryAutomationSystem.ds, "receiveStatus"); conn_updateStatus_4__seen.add("ds::receiveStatus"); }
    this.addConnector(conn_updateStatus_4);
    const conn_x_x__ds_receiveStatus_x_x__ds_receiveStatus_5 = new Connector("x.x__ds.receiveStatus_x.x__ds.receiveStatus");
    const conn_x_x__ds_receiveStatus_x_x__ds_receiveStatus_5__seen = new Set();
    if(!conn_x_x__ds_receiveStatus_x_x__ds_receiveStatus_5__seen.has("ds::receiveStatus")) { this.attachEndpointSafe(conn_x_x__ds_receiveStatus_x_x__ds_receiveStatus_5, this.FactoryAutomationSystem.ds, "receiveStatus"); conn_x_x__ds_receiveStatus_x_x__ds_receiveStatus_5__seen.add("ds::receiveStatus"); }
    this.addConnector(conn_x_x__ds_receiveStatus_x_x__ds_receiveStatus_5);
    const conn_arrived_7 = new Connector("arrived");
    const conn_arrived_7__seen = new Set();
    if(!conn_arrived_7__seen.has("agvs::arrivalDetected_out")) { this.attachEndpointSafe(conn_arrived_7, this.FactoryAutomationSystem.agvs, "arrivalDetected_out"); conn_arrived_7__seen.add("agvs::arrivalDetected_out"); }
    if(!conn_arrived_7__seen.has("agvs::arrivalDetected_in")) { this.attachEndpointSafe(conn_arrived_7, this.FactoryAutomationSystem.agvs, "arrivalDetected_in"); conn_arrived_7__seen.add("agvs::arrivalDetected_in"); }
    this.addConnector(conn_arrived_7);
    const conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_8 = new Connector("arrivalDetected_out.arrivalDetected_out__arrivalDetected_in.arrivalDetected_in_arrivalDetected_out.arrivalDetected_out__arrivalDetected_in.arrivalDetected_in");
    const conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_8__seen = new Set();
    if(!conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_8__seen.has("agvs::arrivalDetected_out")) { this.attachEndpointSafe(conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_8, this.FactoryAutomationSystem.agvs, "arrivalDetected_out"); conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_8__seen.add("agvs::arrivalDetected_out"); }
    if(!conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_8__seen.has("agvs::arrivalDetected_in")) { this.attachEndpointSafe(conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_8, this.FactoryAutomationSystem.agvs, "arrivalDetected_in"); conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_8__seen.add("agvs::arrivalDetected_in"); }
    this.addConnector(conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_8);
    const conn_ackArm_10 = new Connector("ackArm");
    const conn_ackArm_10__seen = new Set();
    if(!conn_ackArm_10__seen.has("ra::started")) { this.attachEndpointSafe(conn_ackArm_10, this.FactoryAutomationSystem.agvs.ra, "started"); conn_ackArm_10__seen.add("ra::started"); }
    if(!conn_ackArm_10__seen.has("vc::startedArm")) { this.attachEndpointSafe(conn_ackArm_10, this.FactoryAutomationSystem.agvs.vc, "startedArm"); conn_ackArm_10__seen.add("vc::startedArm"); }
    this.addConnector(conn_ackArm_10);
    const conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_11 = new Connector("started.started__startedArm.startedArm_started.started__startedArm.startedArm");
    const conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_11__seen = new Set();
    if(!conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_11__seen.has("ra::started")) { this.attachEndpointSafe(conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_11, this.FactoryAutomationSystem.agvs.ra, "started"); conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_11__seen.add("ra::started"); }
    if(!conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_11__seen.has("vc::startedArm")) { this.attachEndpointSafe(conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_11, this.FactoryAutomationSystem.agvs.vc, "startedArm"); conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_11__seen.add("vc::startedArm"); }
    this.addConnector(conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_11);
    const conn_cmdArm_13 = new Connector("cmdArm");
    const conn_cmdArm_13__seen = new Set();
    if(!conn_cmdArm_13__seen.has("ra::start")) { this.attachEndpointSafe(conn_cmdArm_13, this.FactoryAutomationSystem.agvs.ra, "start"); conn_cmdArm_13__seen.add("ra::start"); }
    this.addConnector(conn_cmdArm_13);
    const conn_x_x__ra_start_x_x__ra_start_14 = new Connector("x.x__ra.start_x.x__ra.start");
    const conn_x_x__ra_start_x_x__ra_start_14__seen = new Set();
    if(!conn_x_x__ra_start_x_x__ra_start_14__seen.has("ra::start")) { this.attachEndpointSafe(conn_x_x__ra_start_x_x__ra_start_14, this.FactoryAutomationSystem.agvs.ra, "start"); conn_x_x__ra_start_x_x__ra_start_14__seen.add("ra::start"); }
    this.addConnector(conn_x_x__ra_start_x_x__ra_start_14);
    const conn_ackMotor_16 = new Connector("ackMotor");
    const conn_ackMotor_16__seen = new Set();
    if(!conn_ackMotor_16__seen.has("agvs::started_stopped_out")) { this.attachEndpointSafe(conn_ackMotor_16, this.FactoryAutomationSystem.agvs, "started_stopped_out"); conn_ackMotor_16__seen.add("agvs::started_stopped_out"); }
    if(!conn_ackMotor_16__seen.has("agvs::started_stopped_in")) { this.attachEndpointSafe(conn_ackMotor_16, this.FactoryAutomationSystem.agvs, "started_stopped_in"); conn_ackMotor_16__seen.add("agvs::started_stopped_in"); }
    this.addConnector(conn_ackMotor_16);
    const conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_17 = new Connector("started_stopped_out.started_stopped_out__started_stopped_in.started_stopped_in_started_stopped_out.started_stopped_out__started_stopped_in.started_stopped_in");
    const conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_17__seen = new Set();
    if(!conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_17__seen.has("agvs::started_stopped_out")) { this.attachEndpointSafe(conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_17, this.FactoryAutomationSystem.agvs, "started_stopped_out"); conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_17__seen.add("agvs::started_stopped_out"); }
    if(!conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_17__seen.has("agvs::started_stopped_in")) { this.attachEndpointSafe(conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_17, this.FactoryAutomationSystem.agvs, "started_stopped_in"); conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_17__seen.add("agvs::started_stopped_in"); }
    this.addConnector(conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_17);
    const conn_cmdMotor_19 = new Connector("cmdMotor");
    const conn_cmdMotor_19__seen = new Set();
    if(!conn_cmdMotor_19__seen.has("m::start_stop_in")) { this.attachEndpointSafe(conn_cmdMotor_19, this.FactoryAutomationSystem.agvs.m, "start_stop_in"); conn_cmdMotor_19__seen.add("m::start_stop_in"); }
    this.addConnector(conn_cmdMotor_19);
    const conn_x_x__m_start_stop_in_x_x__m_start_stop_in_20 = new Connector("x.x__m.start_stop_in_x.x__m.start_stop_in");
    const conn_x_x__m_start_stop_in_x_x__m_start_stop_in_20__seen = new Set();
    if(!conn_x_x__m_start_stop_in_x_x__m_start_stop_in_20__seen.has("m::start_stop_in")) { this.attachEndpointSafe(conn_x_x__m_start_stop_in_x_x__m_start_stop_in_20, this.FactoryAutomationSystem.agvs.m, "start_stop_in"); conn_x_x__m_start_stop_in_x_x__m_start_stop_in_20__seen.add("m::start_stop_in"); }
    this.addConnector(conn_x_x__m_start_stop_in_x_x__m_start_stop_in_20);
    const conn_destinationStation2_22 = new Connector("destinationStation2");
    const conn_destinationStation2_22__seen = new Set();
    if(!conn_destinationStation2_22__seen.has("cs::destination")) { this.attachEndpointSafe(conn_destinationStation2_22, this.FactoryAutomationSystem.agvs.vc.cs, "destination"); conn_destinationStation2_22__seen.add("cs::destination"); }
    if(!conn_destinationStation2_22__seen.has("vc::destination_vt")) { this.attachEndpointSafe(conn_destinationStation2_22, this.FactoryAutomationSystem.agvs.vc, "destination_vt"); conn_destinationStation2_22__seen.add("vc::destination_vt"); }
    this.addConnector(conn_destinationStation2_22);
    const conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_23 = new Connector("destination.destination__destination_vt.destination_vt_destination.destination__destination_vt.destination_vt");
    const conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_23__seen = new Set();
    if(!conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_23__seen.has("cs::destination")) { this.attachEndpointSafe(conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_23, this.FactoryAutomationSystem.agvs.vc.cs, "destination"); conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_23__seen.add("cs::destination"); }
    if(!conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_23__seen.has("vc::destination_vt")) { this.attachEndpointSafe(conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_23, this.FactoryAutomationSystem.agvs.vc, "destination_vt"); conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_23__seen.add("vc::destination_vt"); }
    this.addConnector(conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_23);
    const conn_destinationStation_25 = new Connector("destinationStation");
    const conn_destinationStation_25__seen = new Set();
    if(!conn_destinationStation_25__seen.has("cs::destination")) { this.attachEndpointSafe(conn_destinationStation_25, this.FactoryAutomationSystem.agvs.vc.cs, "destination"); conn_destinationStation_25__seen.add("cs::destination"); }
    if(!conn_destinationStation_25__seen.has("vc::destination_cs")) { this.attachEndpointSafe(conn_destinationStation_25, this.FactoryAutomationSystem.agvs.vc, "destination_cs"); conn_destinationStation_25__seen.add("vc::destination_cs"); }
    this.addConnector(conn_destinationStation_25);
    const conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_26 = new Connector("destination.destination__destination_cs.destination_cs_destination.destination__destination_cs.destination_cs");
    const conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_26__seen = new Set();
    if(!conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_26__seen.has("cs::destination")) { this.attachEndpointSafe(conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_26, this.FactoryAutomationSystem.agvs.vc.cs, "destination"); conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_26__seen.add("cs::destination"); }
    if(!conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_26__seen.has("vc::destination_cs")) { this.attachEndpointSafe(conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_26, this.FactoryAutomationSystem.agvs.vc, "destination_cs"); conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_26__seen.add("vc::destination_cs"); }
    this.addConnector(conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_26);
    const conn_command_28 = new Connector("command");
    const conn_command_28__seen = new Set();
    if(!conn_command_28__seen.has("vc::cmd_sm")) { this.attachEndpointSafe(conn_command_28, this.FactoryAutomationSystem.agvs.vc, "cmd_sm"); conn_command_28__seen.add("vc::cmd_sm"); }
    if(!conn_command_28__seen.has("ca::cmd")) { this.attachEndpointSafe(conn_command_28, this.FactoryAutomationSystem.agvs.vc.ca, "cmd"); conn_command_28__seen.add("ca::cmd"); }
    this.addConnector(conn_command_28);
    const conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_29 = new Connector("cmd_sm.cmd_sm__cmd.cmd_cmd_sm.cmd_sm__cmd.cmd");
    const conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_29__seen = new Set();
    if(!conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_29__seen.has("vc::cmd_sm")) { this.attachEndpointSafe(conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_29, this.FactoryAutomationSystem.agvs.vc, "cmd_sm"); conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_29__seen.add("vc::cmd_sm"); }
    if(!conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_29__seen.has("ca::cmd")) { this.attachEndpointSafe(conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_29, this.FactoryAutomationSystem.agvs.vc.ca, "cmd"); conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_29__seen.add("ca::cmd"); }
    this.addConnector(conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_29);
    const conn_command2_31 = new Connector("command2");
    const conn_command2_31__seen = new Set();
    if(!conn_command2_31__seen.has("ca::cmd_ca")) { this.attachEndpointSafe(conn_command2_31, this.FactoryAutomationSystem.agvs.vc.ca, "cmd_ca"); conn_command2_31__seen.add("ca::cmd_ca"); }
    this.addConnector(conn_command2_31);
    const conn_x_x__ca_cmd_ca_x_x__ca_cmd_ca_32 = new Connector("x.x__ca.cmd_ca_x.x__ca.cmd_ca");
    const conn_x_x__ca_cmd_ca_x_x__ca_cmd_ca_32__seen = new Set();
    if(!conn_x_x__ca_cmd_ca_x_x__ca_cmd_ca_32__seen.has("ca::cmd_ca")) { this.attachEndpointSafe(conn_x_x__ca_cmd_ca_x_x__ca_cmd_ca_32, this.FactoryAutomationSystem.agvs.vc.ca, "cmd_ca"); conn_x_x__ca_cmd_ca_x_x__ca_cmd_ca_32__seen.add("ca::cmd_ca"); }
    this.addConnector(conn_x_x__ca_cmd_ca_x_x__ca_cmd_ca_32);
    const conn_currentLocation_34 = new Connector("currentLocation");
    const conn_currentLocation_34__seen = new Set();
    if(!conn_currentLocation_34__seen.has("vc::location_cs")) { this.attachEndpointSafe(conn_currentLocation_34, this.FactoryAutomationSystem.agvs.vc, "location_cs"); conn_currentLocation_34__seen.add("vc::location_cs"); }
    if(!conn_currentLocation_34__seen.has("vc::location_vt")) { this.attachEndpointSafe(conn_currentLocation_34, this.FactoryAutomationSystem.agvs.vc, "location_vt"); conn_currentLocation_34__seen.add("vc::location_vt"); }
    this.addConnector(conn_currentLocation_34);
    const conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_35 = new Connector("location_cs.location_cs__location_vt.location_vt_location_cs.location_cs__location_vt.location_vt");
    const conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_35__seen = new Set();
    if(!conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_35__seen.has("vc::location_cs")) { this.attachEndpointSafe(conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_35, this.FactoryAutomationSystem.agvs.vc, "location_cs"); conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_35__seen.add("vc::location_cs"); }
    if(!conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_35__seen.has("vc::location_vt")) { this.attachEndpointSafe(conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_35, this.FactoryAutomationSystem.agvs.vc, "location_vt"); conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_35__seen.add("vc::location_vt"); }
    this.addConnector(conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_35);
    const conn_sendNotificationMotor_37 = new Connector("sendNotificationMotor");
    const conn_sendNotificationMotor_37__seen = new Set();
    if(!conn_sendNotificationMotor_37__seen.has("nm::outAck")) { this.attachEndpointSafe(conn_sendNotificationMotor_37, this.FactoryAutomationSystem.agvs.vc.nm, "outAck"); conn_sendNotificationMotor_37__seen.add("nm::outAck"); }
    if(!conn_sendNotificationMotor_37__seen.has("vc::ack_ca")) { this.attachEndpointSafe(conn_sendNotificationMotor_37, this.FactoryAutomationSystem.agvs.vc, "ack_ca"); conn_sendNotificationMotor_37__seen.add("vc::ack_ca"); }
    this.addConnector(conn_sendNotificationMotor_37);
    const conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_38 = new Connector("outAck.outAck__ack_ca.ack_ca_outAck.outAck__ack_ca.ack_ca");
    const conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_38__seen = new Set();
    if(!conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_38__seen.has("nm::outAck")) { this.attachEndpointSafe(conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_38, this.FactoryAutomationSystem.agvs.vc.nm, "outAck"); conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_38__seen.add("nm::outAck"); }
    if(!conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_38__seen.has("vc::ack_ca")) { this.attachEndpointSafe(conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_38, this.FactoryAutomationSystem.agvs.vc, "ack_ca"); conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_38__seen.add("vc::ack_ca"); }
    this.addConnector(conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_38);
    const conn_sendNotificationMotor2_40 = new Connector("sendNotificationMotor2");
    const conn_sendNotificationMotor2_40__seen = new Set();
    if(!conn_sendNotificationMotor2_40__seen.has("cs::ack_cs")) { this.attachEndpointSafe(conn_sendNotificationMotor2_40, this.FactoryAutomationSystem.agvs.vc.cs, "ack_cs"); conn_sendNotificationMotor2_40__seen.add("cs::ack_cs"); }
    this.addConnector(conn_sendNotificationMotor2_40);
    const conn_x_x__cs_ack_cs_x_x__cs_ack_cs_41 = new Connector("x.x__cs.ack_cs_x.x__cs.ack_cs");
    const conn_x_x__cs_ack_cs_x_x__cs_ack_cs_41__seen = new Set();
    if(!conn_x_x__cs_ack_cs_x_x__cs_ack_cs_41__seen.has("cs::ack_cs")) { this.attachEndpointSafe(conn_x_x__cs_ack_cs_x_x__cs_ack_cs_41, this.FactoryAutomationSystem.agvs.vc.cs, "ack_cs"); conn_x_x__cs_ack_cs_x_x__cs_ack_cs_41__seen.add("cs::ack_cs"); }
    this.addConnector(conn_x_x__cs_ack_cs_x_x__cs_ack_cs_41);
  }
}

const __portAliases = {};
function createModel(){ return new SysADLArchitecture(); }
module.exports = { createModel, SysADLArchitecture, __portAliases, EN_NotificationToSupervisory, EN_NotificationFromArm, EN_CommandToArm, EN_NotificationFromMotor, EN_CommandToMotor, DT_Status, DT_Location, DT_VehicleData, PT_inLocation, PT_outLocation, PT_inStatus, PT_outStatus, PT_inVehicleData, PT_outVehicleData, PT_inNotificationFromMotor, PT_outNotificationFromMotor, PT_inCommandToMotor, PT_outCommandToMotor, PT_inNotificationFromArm, PT_outNotificationFromArm, PT_inCommandToArm, PT_outCommandToArm, PT_inNotificationToSupervisory, PT_outNotificationToSupervisory, PT_IAGVSystem, PT_ISupervisorySystem };
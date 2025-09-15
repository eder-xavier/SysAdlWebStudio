const { Model, Component, Port, SimplePort, CompositePort, Connector, Activity, Action, createExecutableFromExpression, Enum, Int, Boolean, String, Real, Void, valueType, dataType, dimension, unit } = require('../SysADLBase');

// Types
const EN_InfraredCode = new Enum("increase", "decrease", "turn_on", "turn_off");
const EN_TypeSensor = new Enum("temperature", "humidity", "presence");
const DT_DataSensor = dataType('DataSensor', { id: String, value: String, typeSensor: EN_TypeSensor });
const DT_Sensor = dataType('Sensor', { room: String, type_sensor: EN_TypeSensor, id: String });
const DT_Schedule = dataType('Schedule', { timestamp: Int });
const DT_Location = dataType('Location', { latitude: Real, longitude: Real });
const DT_Room = dataType('Room', { id: String, building: String });
const DT_SmartPlaceComponents_AirConditioner = dataType('AirConditioner', { room: String, id: String });
const DT_FrameList = dataType('FrameList', {});
const DT_Measurement = dataType('Measurement', { value: String, schedule: DT_Schedule, sensor: DT_Sensor });
const DT_UpdateDB = dataType('UpdateDB', { idAirCond: String, currentTime: DT_Schedule, actionTemp: EN_InfraredCode });
const DT_Building = dataType('Building', { id: String, location: DT_Location });
const DT_Intervention = dataType('Intervention', { icAirCond: EN_InfraredCode, airCond: DT_SmartPlaceComponents_AirConditioner, schedule: DT_Schedule });
const DT_ContextInformation = dataType('ContextInformation', { sensor: DT_Sensor, air_conditioner: DT_SmartPlaceComponents_AirConditioner, room: DT_Room, building: DT_Building });
const DT_RestFulRaspeberry = dataType('RestFulRaspeberry', { ip: String, port: String, path: String, i: DT_Intervention, m: DT_Measurement });

// Ports
class PT_SmartPlacePorts_ValueOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "Int" }, ...opts });
  }
}
class PT_SmartPlacePorts_ValueIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Int" }, ...opts });
  }
}
class PT_SmartPlacePorts_ReservationResponseIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Boolean" }, ...opts });
  }
}
class PT_SmartPlacePorts_ReservationResponseOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "Boolean" }, ...opts });
  }
}
class PT_SmartPlacePorts_RequestOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "String" }, ...opts });
  }
}
class PT_SmartPlacePorts_RequestIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "String" }, ...opts });
  }
}
class PT_SmartPlacePorts_InfraredSignalIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Void" }, ...opts });
  }
}
class PT_SmartPlacePorts_InfraredSignalOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "Void" }, ...opts });
  }
}
class PT_SmartPlacePorts_ContextInformationOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "ContextInformation" }, ...opts });
  }
}
class PT_SmartPlacePorts_ContextInformationIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "ContextInformation" }, ...opts });
  }
}
class PT_SmartPlacePorts_UndefinedOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "Void" }, ...opts });
  }
}
class PT_SmartPlacePorts_UndefinedIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Void" }, ...opts });
  }
}
class PT_SmartPlacePorts_CommandIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "InfraredCode" }, ...opts });
  }
}
class PT_SmartPlacePorts_CommandOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "InfraredCode" }, ...opts });
  }
}
class PT_SmartPlacePorts_RestfulRaspberryIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "RestFulRaspeberry" }, ...opts });
  }
}
class PT_SmartPlacePorts_RestfulRaspberryOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "RestFulRaspeberry" }, ...opts });
  }
}
class PT_SmartPlacePorts_DataBaseRespOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "String" }, ...opts });
  }
}
class PT_SmartPlacePorts_DataBaseRespIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "String" }, ...opts });
  }
}
class PT_SmartPlacePorts_ScheduleOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "Schedule" }, ...opts });
  }
}
class PT_SmartPlacePorts_ScheduleIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Schedule" }, ...opts });
  }
}
class PT_SmartPlacePorts_UpdateIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "UpdateDB" }, ...opts });
  }
}
class PT_SmartPlacePorts_UpdateOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "UpdateDB" }, ...opts });
  }
}
class PT_SmartPlacePorts_FrameListIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "FrameList" }, ...opts });
  }
}
class PT_SmartPlacePorts_FrameListOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "FrameList" }, ...opts });
  }
}
class PT_SmartPlacePorts_DataBaseO2I extends CompositePort {
  constructor(name, opts = {}) {
    super(name, 'composite', opts);
    // Add sub-ports
    this.addSubPort("reqODB", new SimplePort("reqODB", "in", { ...{ expectedType: "RequestOPT" }, owner: this.owner }));
    this.addSubPort("respIDB", new SimplePort("respIDB", "in", { ...{ expectedType: "DataBaseRespIPT" }, owner: this.owner }));
  }
}
class PT_SmartPlacePorts_DataBaseI2O extends CompositePort {
  constructor(name, opts = {}) {
    super(name, 'composite', opts);
    // Add sub-ports
    this.addSubPort("reqIDB", new SimplePort("reqIDB", "in", { ...{ expectedType: "RequestIPT" }, owner: this.owner }));
    this.addSubPort("respODB", new SimplePort("respODB", "in", { ...{ expectedType: "DataBaseRespOPT" }, owner: this.owner }));
  }
}
class PT_SmartPlacePorts_ReservationInformationO2I extends CompositePort {
  constructor(name, opts = {}) {
    super(name, 'composite', opts);
    // Add sub-ports
    this.addSubPort("reqORI", new SimplePort("reqORI", "in", { ...{ expectedType: "RequestOPT" }, owner: this.owner }));
    this.addSubPort("respIRI", new SimplePort("respIRI", "in", { ...{ expectedType: "ReservationResponseIPT" }, owner: this.owner }));
  }
}
class PT_SmartPlacePorts_ReservationInformationI2O extends CompositePort {
  constructor(name, opts = {}) {
    super(name, 'composite', opts);
    // Add sub-ports
    this.addSubPort("reqIRI", new SimplePort("reqIRI", "in", { ...{ expectedType: "RequestIPT" }, owner: this.owner }));
    this.addSubPort("respORI", new SimplePort("respORI", "in", { ...{ expectedType: "ReservationResponseOPT" }, owner: this.owner }));
  }
}
class PT_SmartPlacePorts_ContextO2I extends CompositePort {
  constructor(name, opts = {}) {
    super(name, 'composite', opts);
    // Add sub-ports
    this.addSubPort("reqOC", new SimplePort("reqOC", "in", { ...{ expectedType: "RequestOPT" }, owner: this.owner }));
    this.addSubPort("respIC", new SimplePort("respIC", "in", { ...{ expectedType: "ContextInformationIPT" }, owner: this.owner }));
  }
}
class PT_SmartPlacePorts_ContextI2O extends CompositePort {
  constructor(name, opts = {}) {
    super(name, 'composite', opts);
    // Add sub-ports
    this.addSubPort("reqIC", new SimplePort("reqIC", "in", { ...{ expectedType: "RequestIPT" }, owner: this.owner }));
    this.addSubPort("respOC", new SimplePort("respOC", "in", { ...{ expectedType: "ContextInformationOPT" }, owner: this.owner }));
  }
}

// Connectors
class CN_SmartPlaceConnectors_UndefinedCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from undO to undefined
  }
}
class CN_SmartPlaceConnectors_SendValueCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from vO to undefined
  }
}
class CN_SmartPlaceConnectors_InfraCodeCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from cmdO to undefined
  }
}
class CN_SmartPlaceConnectors_CmdRestfulCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from restO to undefined
  }
}
class CN_SmartPlaceConnectors_SendReservationInfoCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from rRespO to undefined
  }
}
class CN_SmartPlaceConnectors_RequestCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from rReqO to undefined
  }
}
class CN_SmartPlaceConnectors_SendContextCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from ciO to undefined
  }
}
class CN_SmartPlaceConnectors_InfraredSignalCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from isO to undefined
  }
}
class CN_SmartPlaceConnectors_ReservationCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: 
  }
}
class CN_SmartPlaceConnectors_QueryDataBaseCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: 
  }
}
class CN_SmartPlaceConnectors_SendPostgreSQLInfoCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from psqlO to undefined
  }
}
class CN_SmartPlaceConnectors_ScheduleCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from dO to undefined
  }
}
class CN_SmartPlaceConnectors_FrameListCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from fO to undefined
  }
}
class CN_SmartPlaceConnectors_ContextCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: 
  }
}

// Components
class CP_SmartPlaceComponents_SmartPlaceWeb extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_SmartPlacePorts_ContextInformationOPT("co", "out", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_RestfulRaspberryIPT("rr", "in", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_DataBaseO2I("db", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_UpdateOPT("u", "out", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_ContextO2I("ctx", { owner: name }));
    }
}
class CP_SmartPlaceComponents_RoomReservationSystem extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_SmartPlacePorts_ReservationInformationI2O("ri", { owner: name }));
    }
}
class CP_SmartPlaceComponents_OrionContextBroker extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_SmartPlacePorts_ContextInformationIPT("ci", "in", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_ContextI2O("ctx", { owner: name }));
    }
}
class CP_SmartPlaceComponents_TemperatureAndHumiditySensor extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_SmartPlacePorts_ValueOPT("temperature", "out", { owner: name }));
    }
}
class CP_SmartPlaceComponents_PresenceSensor extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_SmartPlacePorts_ValueOPT("presence", "out", { owner: name }));
    }
}
class CP_SmartPlaceComponents_DB_PostgreSQL extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_SmartPlacePorts_DataBaseI2O("db", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_UpdateIPT("u", "in", { owner: name }));
    }
}
class CP_SmartPlaceComponents_AirConditioner extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_SmartPlacePorts_InfraredSignalIPT("is", "in", { owner: name }));
    }
}
class CP_SmartPlaceComponents_Led extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_SmartPlacePorts_CommandIPT("c", "in", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_InfraredSignalOPT("is", "out", { owner: name }));
    }
}
class CP_SmartPlaceComponents_Raspberry extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_SmartPlacePorts_CommandOPT("c", "out", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_ReservationInformationO2I("ri", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_FrameListIPT("f", "in", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_ValueIPT("temperature", "in", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_ValueIPT("presence", "in", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_RestfulRaspberryOPT("rr", "out", { owner: name }));
    }
}
class CP_SmartPlaceComponents_Camera extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_SmartPlacePorts_FrameListOPT("f", "out", { owner: name }));
    }
}
class CP_SmartPlaceComponents_CamMonitor extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_SmartPlacePorts_FrameListIPT("f", "in", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_ValueOPT("numPeople", "out", { owner: name }));
    }
}
class CP_SmartPlaceComponents_TemperatureController extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_SmartPlacePorts_ValueIPT("presence", "in", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_RestfulRaspberryOPT("rrasp", "out", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_ReservationInformationO2I("ri", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_ValueIPT("temperature", "in", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_ValueIPT("numPeople", "in", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_CommandOPT("c", "out", { owner: name }));
    }
}
class CP_SmartPlaceComponents_DB_SQLite extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_SmartPlacePorts_ReservationInformationI2O("ri", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_ReservationResponseIPT("rresp", "in", { owner: name }));
    }
}
class CP_SmartPlaceComponents_Fotosensor extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_SmartPlacePorts_UndefinedOPT("u", "out", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_InfraredSignalIPT("is", "in", { owner: name }));
    }
}
class CP_SmartPlaceComponents_AirConditionerController extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_SmartPlacePorts_UndefinedIPT("u", "in", { owner: name }));
    }
}
class CP_SmartPlaceComponents_RegistrationController extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_SmartPlacePorts_ContextInformationOPT("ci", "out", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_ContextInformationIPT("regUi", "in", { owner: name }));
    }
}
class CP_SmartPlaceComponents_ReportGenerator extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_SmartPlacePorts_ContextInformationIPT("a", "in", { owner: name }));
    }
}
class CP_SmartPlaceComponents_GraphicsGenerator extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_SmartPlacePorts_DataBaseO2I("db", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_ContextO2I("ctx", { owner: name }));
    }
}
class CP_SmartPlaceComponents_HistoricController extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_SmartPlacePorts_RestfulRaspberryIPT("rr", "in", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_UpdateOPT("u", "out", { owner: name }));
      this.addPort(new PT_SmartPlacePorts_ContextO2I("ctx", { owner: name }));
    }
}
class CP_SmartPlaceComponents_SmartPlace extends Component { }

class SysADLArchitecture extends Model {
  constructor(){
    super("SysADLArchitecture");
    this.SmartPlace = new CP_SmartPlaceComponents_SmartPlace("SmartPlace", { sysadlDefinition: "SmartPlace" });
    this.addComponent(this.SmartPlace);
    this.SmartPlace.ac = new CP_SmartPlaceComponents_AirConditioner("ac", { sysadlDefinition: "AirConditioner" });
    this.SmartPlace.addComponent(this.SmartPlace.ac);
    this.SmartPlace.Camera = new CP_SmartPlaceComponents_Camera("Camera", { isBoundary: true, sysadlDefinition: "Camera" });
    this.SmartPlace.addComponent(this.SmartPlace.Camera);
    this.SmartPlace.Led = new CP_SmartPlaceComponents_Led("Led", { isBoundary: true, sysadlDefinition: "Led" });
    this.SmartPlace.addComponent(this.SmartPlace.Led);
    this.SmartPlace.ocb = new CP_SmartPlaceComponents_OrionContextBroker("ocb", { isBoundary: true, sysadlDefinition: "OrionContextBroker" });
    this.SmartPlace.addComponent(this.SmartPlace.ocb);
    this.SmartPlace.ps = new CP_SmartPlaceComponents_PresenceSensor("ps", { isBoundary: true, sysadlDefinition: "PresenceSensor" });
    this.SmartPlace.addComponent(this.SmartPlace.ps);
    this.SmartPlace.psql = new CP_SmartPlaceComponents_DB_PostgreSQL("psql", { isBoundary: true, sysadlDefinition: "DB_PostgreSQL" });
    this.SmartPlace.addComponent(this.SmartPlace.psql);
    this.SmartPlace.Raspberry = new CP_SmartPlaceComponents_Raspberry("Raspberry", { sysadlDefinition: "Raspberry" });
    this.SmartPlace.addComponent(this.SmartPlace.Raspberry);
    this.SmartPlace.rrs = new CP_SmartPlaceComponents_RoomReservationSystem("rrs", { isBoundary: true, sysadlDefinition: "RoomReservationSystem" });
    this.SmartPlace.addComponent(this.SmartPlace.rrs);
    this.SmartPlace.spw = new CP_SmartPlaceComponents_SmartPlaceWeb("spw", { sysadlDefinition: "SmartPlaceWeb" });
    this.SmartPlace.addComponent(this.SmartPlace.spw);
    this.SmartPlace.ths = new CP_SmartPlaceComponents_TemperatureAndHumiditySensor("ths", { isBoundary: true, sysadlDefinition: "TemperatureAndHumiditySensor" });
    this.SmartPlace.addComponent(this.SmartPlace.ths);
    this.SmartPlace.ac.acc = new CP_SmartPlaceComponents_AirConditionerController("acc", { isBoundary: true, sysadlDefinition: "AirConditionerController" });
    this.SmartPlace.ac.addComponent(this.SmartPlace.ac.acc);
    this.SmartPlace.Raspberry.cm = new CP_SmartPlaceComponents_CamMonitor("cm", { isBoundary: true, sysadlDefinition: "CamMonitor" });
    this.SmartPlace.Raspberry.addComponent(this.SmartPlace.Raspberry.cm);
    this.SmartPlace.ac.f = new CP_SmartPlaceComponents_Fotosensor("f", { isBoundary: true, sysadlDefinition: "Fotosensor" });
    this.SmartPlace.ac.addComponent(this.SmartPlace.ac.f);
    this.SmartPlace.spw.gg = new CP_SmartPlaceComponents_GraphicsGenerator("gg", { isBoundary: true, sysadlDefinition: "GraphicsGenerator" });
    this.SmartPlace.spw.addComponent(this.SmartPlace.spw.gg);
    this.SmartPlace.spw.hc = new CP_SmartPlaceComponents_HistoricController("hc", { sysadlDefinition: "HistoricController" });
    this.SmartPlace.spw.addComponent(this.SmartPlace.spw.hc);
    this.SmartPlace.spw.rc = new CP_SmartPlaceComponents_RegistrationController("rc", { sysadlDefinition: "RegistrationController" });
    this.SmartPlace.spw.addComponent(this.SmartPlace.spw.rc);
    this.SmartPlace.spw.rg = new CP_SmartPlaceComponents_ReportGenerator("rg", { sysadlDefinition: "ReportGenerator" });
    this.SmartPlace.spw.addComponent(this.SmartPlace.spw.rg);
    this.SmartPlace.Raspberry.sqlite = new CP_SmartPlaceComponents_DB_SQLite("sqlite", { isBoundary: true, sysadlDefinition: "DB_SQLite" });
    this.SmartPlace.Raspberry.addComponent(this.SmartPlace.Raspberry.sqlite);
    this.SmartPlace.Raspberry.tc = new CP_SmartPlaceComponents_TemperatureController("tc", { sysadlDefinition: "TemperatureController" });
    this.SmartPlace.Raspberry.addComponent(this.SmartPlace.Raspberry.tc);

    this.SmartPlace.addConnector(new CN_SmartPlaceConnectors_QueryDataBaseCN("qdb"));
    this.SmartPlace.addConnector(new CN_SmartPlaceConnectors_SendPostgreSQLInfoCN("spsqli"));
    this.SmartPlace.addConnector(new CN_SmartPlaceConnectors_SendContextCN("ci1"));
    this.SmartPlace.addConnector(new CN_SmartPlaceConnectors_ContextCN("c"));
    this.SmartPlace.addConnector(new CN_SmartPlaceConnectors_CmdRestfulCN("cr"));
    this.SmartPlace.addConnector(new CN_SmartPlaceConnectors_SendValueCN("sendPresence"));
    this.SmartPlace.addConnector(new CN_SmartPlaceConnectors_FrameListCN("fl"));
    this.SmartPlace.addConnector(new CN_SmartPlaceConnectors_SendValueCN("sendTempHumi"));
    this.SmartPlace.addConnector(new CN_SmartPlaceConnectors_ReservationCN("rn"));
    this.SmartPlace.addConnector(new CN_SmartPlaceConnectors_InfraCodeCN("ic"));
    this.SmartPlace.addConnector(new CN_SmartPlaceConnectors_InfraredSignalCN("is"));
    this.SmartPlace.addConnector(new CN_SmartPlaceConnectors_SendValueCN("countPeople"));
    this.SmartPlace.addConnector(new CN_SmartPlaceConnectors_ReservationCN("rn"));
    this.SmartPlace.addConnector(new CN_SmartPlaceConnectors_UndefinedCN("u"));
    this.SmartPlace.addConnector(new CN_SmartPlaceConnectors_UndefinedCN("u"));
    this.SmartPlace.addConnector(new CN_SmartPlaceConnectors_SendValueCN("countPeople"));
    this.SmartPlace.addConnector(new CN_SmartPlaceConnectors_ReservationCN("rn"));

    const act_RaspberryControllerAC_spw = new Activity("RaspberryControllerAC", { component: "spw", inputPorts: ["u"] });
    this.registerActivity("RaspberryControllerAC::spw", act_RaspberryControllerAC_spw);
    const act_RaspberryControllerAC_rrs = new Activity("RaspberryControllerAC", { component: "rrs", inputPorts: ["ri"] });
    this.registerActivity("RaspberryControllerAC::rrs", act_RaspberryControllerAC_rrs);
    const act_RaspberryControllerAC_ocb = new Activity("RaspberryControllerAC", { component: "ocb", inputPorts: ["ci"] });
    this.registerActivity("RaspberryControllerAC::ocb", act_RaspberryControllerAC_ocb);
    const act_RaspberryControllerAC_ths = new Activity("RaspberryControllerAC", { component: "ths", inputPorts: ["temperature"] });
    this.registerActivity("RaspberryControllerAC::ths", act_RaspberryControllerAC_ths);
    const act_RaspberryControllerAC_ps = new Activity("RaspberryControllerAC", { component: "ps", inputPorts: ["presence"] });
    this.registerActivity("RaspberryControllerAC::ps", act_RaspberryControllerAC_ps);
    const act_RaspberryControllerAC_psql = new Activity("RaspberryControllerAC", { component: "psql", inputPorts: ["u"] });
    this.registerActivity("RaspberryControllerAC::psql", act_RaspberryControllerAC_psql);
    const act_RaspberryControllerAC_ac = new Activity("RaspberryControllerAC", { component: "ac", inputPorts: ["is"] });
    this.registerActivity("RaspberryControllerAC::ac", act_RaspberryControllerAC_ac);
    const act_RaspberryControllerAC_Led = new Activity("RaspberryControllerAC", { component: "Led", inputPorts: ["c"] });
    this.registerActivity("RaspberryControllerAC::Led", act_RaspberryControllerAC_Led);
    const act_RaspberryControllerAC_Raspberry = new Activity("RaspberryControllerAC", { component: "Raspberry", inputPorts: ["f"] });
    this.registerActivity("RaspberryControllerAC::Raspberry", act_RaspberryControllerAC_Raspberry);
    const act_RaspberryControllerAC_Camera = new Activity("RaspberryControllerAC", { component: "Camera", inputPorts: ["f"] });
    this.registerActivity("RaspberryControllerAC::Camera", act_RaspberryControllerAC_Camera);
    const act_RaspberryControllerAC_cm = new Activity("RaspberryControllerAC", { component: "cm", inputPorts: ["f"] });
    this.registerActivity("RaspberryControllerAC::cm", act_RaspberryControllerAC_cm);
    const act_RaspberryControllerAC_tc = new Activity("RaspberryControllerAC", { component: "tc", inputPorts: ["presence"] });
    this.registerActivity("RaspberryControllerAC::tc", act_RaspberryControllerAC_tc);
    const act_RaspberryControllerAC_sqlite = new Activity("RaspberryControllerAC", { component: "sqlite", inputPorts: ["ri"] });
    this.registerActivity("RaspberryControllerAC::sqlite", act_RaspberryControllerAC_sqlite);
    const act_RaspberryControllerAC_f = new Activity("RaspberryControllerAC", { component: "f", inputPorts: ["u"] });
    this.registerActivity("RaspberryControllerAC::f", act_RaspberryControllerAC_f);
    const act_RaspberryControllerAC_acc = new Activity("RaspberryControllerAC", { component: "acc", inputPorts: ["u"] });
    this.registerActivity("RaspberryControllerAC::acc", act_RaspberryControllerAC_acc);
    const act_RaspberryControllerAC_rc = new Activity("RaspberryControllerAC", { component: "rc", inputPorts: ["ci"] });
    this.registerActivity("RaspberryControllerAC::rc", act_RaspberryControllerAC_rc);
    const act_RaspberryControllerAC_rg = new Activity("RaspberryControllerAC", { component: "rg", inputPorts: ["a"] });
    this.registerActivity("RaspberryControllerAC::rg", act_RaspberryControllerAC_rg);
    const act_RaspberryControllerAC_gg = new Activity("RaspberryControllerAC", { component: "gg", inputPorts: ["db"] });
    this.registerActivity("RaspberryControllerAC::gg", act_RaspberryControllerAC_gg);
    const act_RaspberryControllerAC_hc = new Activity("RaspberryControllerAC", { component: "hc", inputPorts: ["u"] });
    this.registerActivity("RaspberryControllerAC::hc", act_RaspberryControllerAC_hc);
    const act_TemperatureControllerAC_tc = new Activity("TemperatureControllerAC", { component: "tc", inputPorts: ["presence"] });
    this.registerActivity("TemperatureControllerAC::tc", act_TemperatureControllerAC_tc);
    const act_UpdateContextSensorsAC_spw = new Activity("UpdateContextSensorsAC", { component: "spw", inputPorts: ["a","rr"] });
    this.registerActivity("UpdateContextSensorsAC::spw", act_UpdateContextSensorsAC_spw);
    const act_UpdateContextSensorsAC_rrs = new Activity("UpdateContextSensorsAC", { component: "rrs", inputPorts: ["ri"] });
    this.registerActivity("UpdateContextSensorsAC::rrs", act_UpdateContextSensorsAC_rrs);
    const act_UpdateContextSensorsAC_ocb = new Activity("UpdateContextSensorsAC", { component: "ocb", inputPorts: ["ci"] });
    this.registerActivity("UpdateContextSensorsAC::ocb", act_UpdateContextSensorsAC_ocb);
    const act_UpdateContextSensorsAC_ths = new Activity("UpdateContextSensorsAC", { component: "ths", inputPorts: ["temperature"] });
    this.registerActivity("UpdateContextSensorsAC::ths", act_UpdateContextSensorsAC_ths);
    const act_UpdateContextSensorsAC_ps = new Activity("UpdateContextSensorsAC", { component: "ps", inputPorts: ["presence"] });
    this.registerActivity("UpdateContextSensorsAC::ps", act_UpdateContextSensorsAC_ps);
    const act_UpdateContextSensorsAC_psql = new Activity("UpdateContextSensorsAC", { component: "psql", inputPorts: ["db"] });
    this.registerActivity("UpdateContextSensorsAC::psql", act_UpdateContextSensorsAC_psql);
    const act_UpdateContextSensorsAC_ac = new Activity("UpdateContextSensorsAC", { component: "ac", inputPorts: ["is"] });
    this.registerActivity("UpdateContextSensorsAC::ac", act_UpdateContextSensorsAC_ac);
    const act_UpdateContextSensorsAC_Led = new Activity("UpdateContextSensorsAC", { component: "Led", inputPorts: ["c"] });
    this.registerActivity("UpdateContextSensorsAC::Led", act_UpdateContextSensorsAC_Led);
    const act_UpdateContextSensorsAC_Raspberry = new Activity("UpdateContextSensorsAC", { component: "Raspberry", inputPorts: ["c"] });
    this.registerActivity("UpdateContextSensorsAC::Raspberry", act_UpdateContextSensorsAC_Raspberry);
    const act_UpdateContextSensorsAC_Camera = new Activity("UpdateContextSensorsAC", { component: "Camera", inputPorts: ["f"] });
    this.registerActivity("UpdateContextSensorsAC::Camera", act_UpdateContextSensorsAC_Camera);
    const act_UpdateContextSensorsAC_cm = new Activity("UpdateContextSensorsAC", { component: "cm", inputPorts: ["f"] });
    this.registerActivity("UpdateContextSensorsAC::cm", act_UpdateContextSensorsAC_cm);
    const act_UpdateContextSensorsAC_tc = new Activity("UpdateContextSensorsAC", { component: "tc", inputPorts: ["presence"] });
    this.registerActivity("UpdateContextSensorsAC::tc", act_UpdateContextSensorsAC_tc);
    const act_UpdateContextSensorsAC_sqlite = new Activity("UpdateContextSensorsAC", { component: "sqlite", inputPorts: ["ri"] });
    this.registerActivity("UpdateContextSensorsAC::sqlite", act_UpdateContextSensorsAC_sqlite);
    const act_UpdateContextSensorsAC_f = new Activity("UpdateContextSensorsAC", { component: "f", inputPorts: ["u"] });
    this.registerActivity("UpdateContextSensorsAC::f", act_UpdateContextSensorsAC_f);
    const act_UpdateContextSensorsAC_acc = new Activity("UpdateContextSensorsAC", { component: "acc", inputPorts: ["u"] });
    this.registerActivity("UpdateContextSensorsAC::acc", act_UpdateContextSensorsAC_acc);
    const act_UpdateContextSensorsAC_rc = new Activity("UpdateContextSensorsAC", { component: "rc", inputPorts: ["ci"] });
    this.registerActivity("UpdateContextSensorsAC::rc", act_UpdateContextSensorsAC_rc);
    const act_UpdateContextSensorsAC_rg = new Activity("UpdateContextSensorsAC", { component: "rg", inputPorts: ["a"] });
    this.registerActivity("UpdateContextSensorsAC::rg", act_UpdateContextSensorsAC_rg);
    const act_UpdateContextSensorsAC_gg = new Activity("UpdateContextSensorsAC", { component: "gg", inputPorts: ["db"] });
    this.registerActivity("UpdateContextSensorsAC::gg", act_UpdateContextSensorsAC_gg);
    const act_UpdateContextSensorsAC_hc = new Activity("UpdateContextSensorsAC", { component: "hc", inputPorts: ["rr"] });
    this.registerActivity("UpdateContextSensorsAC::hc", act_UpdateContextSensorsAC_hc);
  }
}

const __portAliases = {};
function createModel(){ return new SysADLArchitecture(); }
module.exports = { createModel, SysADLArchitecture, __portAliases, EN_InfraredCode, EN_TypeSensor, DT_DataSensor, DT_RestFulRaspeberry, DT_Sensor, DT_Measurement, DT_Schedule, DT_Location, DT_Building, DT_Room, DT_SmartPlaceComponents_AirConditioner, DT_ContextInformation, DT_UpdateDB, DT_FrameList, DT_Intervention, PT_SmartPlacePorts_ValueOPT, PT_SmartPlacePorts_ValueIPT, PT_SmartPlacePorts_ReservationResponseIPT, PT_SmartPlacePorts_ReservationResponseOPT, PT_SmartPlacePorts_RequestOPT, PT_SmartPlacePorts_RequestIPT, PT_SmartPlacePorts_InfraredSignalIPT, PT_SmartPlacePorts_InfraredSignalOPT, PT_SmartPlacePorts_ContextInformationOPT, PT_SmartPlacePorts_ContextInformationIPT, PT_SmartPlacePorts_UndefinedOPT, PT_SmartPlacePorts_UndefinedIPT, PT_SmartPlacePorts_CommandIPT, PT_SmartPlacePorts_CommandOPT, PT_SmartPlacePorts_RestfulRaspberryIPT, PT_SmartPlacePorts_RestfulRaspberryOPT, PT_SmartPlacePorts_DataBaseRespOPT, PT_SmartPlacePorts_DataBaseRespIPT, PT_SmartPlacePorts_ScheduleOPT, PT_SmartPlacePorts_ScheduleIPT, PT_SmartPlacePorts_UpdateIPT, PT_SmartPlacePorts_UpdateOPT, PT_SmartPlacePorts_FrameListIPT, PT_SmartPlacePorts_FrameListOPT, PT_SmartPlacePorts_DataBaseO2I, PT_SmartPlacePorts_DataBaseI2O, PT_SmartPlacePorts_ReservationInformationO2I, PT_SmartPlacePorts_ReservationInformationI2O, PT_SmartPlacePorts_ContextO2I, PT_SmartPlacePorts_ContextI2O };
const { Model, Component, Port, SimplePort, CompositePort, Connector, Activity, Action, createExecutableFromExpression, Enum, Int, Boolean, String, Real, Void, valueType, dataType, dimension, unit } = require('../SysADLBase');

// Types
const DM_types_Temperature = dimension('Temperature');
const UN_types_Celsius = unit('Celsius');
const UN_types_Fahrenheit = unit('Fahrenheit');
const VT_types_temperature = valueType('temperature', { extends: Real, dimension: DM_types_Temperature });
const VT_types_FahrenheitTemperature = valueType('FahrenheitTemperature', { extends: VT_types_temperature, unit: UN_types_Fahrenheit, dimension: DM_types_Temperature });
const VT_types_CelsiusTemperature = valueType('CelsiusTemperature', { extends: VT_types_temperature, unit: UN_types_Celsius, dimension: DM_types_Temperature });
const EN_types_Command = new Enum("On", "Off");
const DT_types_Commands = dataType('Commands', { heater: EN_types_Command, cooler: EN_types_Command });

// Ports
class PT_Ports_FTemperatureOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "FahrenheitTemperature" }, ...opts });
  }
}
class PT_Ports_PresenceIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Boolean" }, ...opts });
  }
}
class PT_Ports_PresenceOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "Boolean" }, ...opts });
  }
}
class PT_Ports_CTemperatureIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "CelsiusTemperature" }, ...opts });
  }
}
class PT_Ports_CommandIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Command" }, ...opts });
  }
}
class PT_Ports_CommandOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "Command" }, ...opts });
  }
}
class PT_Ports_CTemperatureOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "CelsiusTemperature" }, ...opts });
  }
}

// Connectors
class CN_Connectors_FahrenheitToCelsiusCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from Ft to undefined
  }
}
class CN_Connectors_PresenceCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from pOut to undefined
  }
}
class CN_Connectors_CommandCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from commandOut to undefined
  }
}
class CN_Connectors_CTemperatureCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from CtOut to undefined
  }
}

// Components
class CP_Components_TemperatureSensorCP extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_Ports_FTemperatureOPT("current", "out", { owner: name }));
    }
}
class CP_Components_PresenceSensorCP extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_Ports_PresenceOPT("detected", "out", { owner: name }));
    }
}
class CP_Components_UserInterfaceCP extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_Ports_CTemperatureOPT("desired", "out", { owner: name }));
    }
}
class CP_Components_CoolerCP extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_Ports_CommandIPT("controllerC", "in", { owner: name }));
    }
}
class CP_Components_HeaterCP extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_Ports_CommandIPT("controllerH", "in", { owner: name }));
    }
}
class CP_Components_RoomTemperatureControllerCP extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_Ports_PresenceIPT("detectedRTC", "in", { owner: name }));
      this.addPort(new PT_Ports_CTemperatureIPT("localtemp1", "in", { owner: name }));
      this.addPort(new PT_Ports_CTemperatureIPT("localTemp2", "in", { owner: name }));
      this.addPort(new PT_Ports_CTemperatureIPT("userTempRTC", "in", { owner: name }));
      this.addPort(new PT_Ports_CommandOPT("heatingRTC", "out", { owner: name }));
      this.addPort(new PT_Ports_CommandOPT("coolingRTC", "out", { owner: name }));
    }
}
class CP_Components_SensorsMonitorCP extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_Ports_CTemperatureIPT("s1", "in", { owner: name }));
      this.addPort(new PT_Ports_CTemperatureIPT("s2", "in", { owner: name }));
      this.addPort(new PT_Ports_CTemperatureOPT("average", "out", { owner: name }));
    }
}
class CP_Components_CommanderCP extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_Ports_CTemperatureIPT("target2", "in", { owner: name }));
      this.addPort(new PT_Ports_CTemperatureIPT("average2", "in", { owner: name }));
      this.addPort(new PT_Ports_CommandOPT("heating", "out", { owner: name }));
      this.addPort(new PT_Ports_CommandOPT("cooling", "out", { owner: name }));
    }
}
class CP_Components_PresenceCheckerCP extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_Ports_PresenceIPT("detected", "in", { owner: name }));
      this.addPort(new PT_Ports_CTemperatureIPT("userTemp", "in", { owner: name }));
      this.addPort(new PT_Ports_CTemperatureOPT("target", "out", { owner: name }));
    }
}
class CP_Components_RTCSystemCFD extends Component { }

class SysADLModel extends Model {
  constructor(){
    super("SysADLModel");
    this.RTCSystemCFD = new CP_Components_RTCSystemCFD("RTCSystemCFD", { sysadlDefinition: "RTCSystemCFD" });
    this.addComponent(this.RTCSystemCFD);
    this.RTCSystemCFD.a1 = new CP_Components_HeaterCP("a1", { isBoundary: true, sysadlDefinition: "HeaterCP" });
    this.RTCSystemCFD.addComponent(this.RTCSystemCFD.a1);
    this.RTCSystemCFD.a2 = new CP_Components_CoolerCP("a2", { isBoundary: true, sysadlDefinition: "CoolerCP" });
    this.RTCSystemCFD.addComponent(this.RTCSystemCFD.a2);
    this.RTCSystemCFD.rtc = new CP_Components_RoomTemperatureControllerCP("rtc", { sysadlDefinition: "RoomTemperatureControllerCP" });
    this.RTCSystemCFD.addComponent(this.RTCSystemCFD.rtc);
    this.RTCSystemCFD.s1 = new CP_Components_TemperatureSensorCP("s1", { isBoundary: true, sysadlDefinition: "TemperatureSensorCP" });
    this.RTCSystemCFD.addComponent(this.RTCSystemCFD.s1);
    this.RTCSystemCFD.s2 = new CP_Components_TemperatureSensorCP("s2", { isBoundary: true, sysadlDefinition: "TemperatureSensorCP" });
    this.RTCSystemCFD.addComponent(this.RTCSystemCFD.s2);
    this.RTCSystemCFD.s3 = new CP_Components_PresenceSensorCP("s3", { isBoundary: true, sysadlDefinition: "PresenceSensorCP" });
    this.RTCSystemCFD.addComponent(this.RTCSystemCFD.s3);
    this.RTCSystemCFD.ui = new CP_Components_UserInterfaceCP("ui", { isBoundary: true, sysadlDefinition: "UserInterfaceCP" });
    this.RTCSystemCFD.addComponent(this.RTCSystemCFD.ui);
    this.RTCSystemCFD.rtc.cm = new CP_Components_CommanderCP("cm", { sysadlDefinition: "CommanderCP" });
    this.RTCSystemCFD.rtc.addComponent(this.RTCSystemCFD.rtc.cm);
    this.RTCSystemCFD.rtc.pc = new CP_Components_PresenceCheckerCP("pc", { sysadlDefinition: "PresenceCheckerCP" });
    this.RTCSystemCFD.rtc.addComponent(this.RTCSystemCFD.rtc.pc);
    this.RTCSystemCFD.rtc.sm = new CP_Components_SensorsMonitorCP("sm", { sysadlDefinition: "SensorsMonitorCP" });
    this.RTCSystemCFD.rtc.addComponent(this.RTCSystemCFD.rtc.sm);

    this.addExecutableSafe("SysADLModel.CommandCoolerEx", "executable def CommandCoolerEx(in cmds:Commands): out Command{return cmds->cooler ; }", []);
    this.addExecutableSafe("SysADLModel.CommandHeaterEx", "executable def CommandHeaterEx(in cmds:Commands): out Command{return cmds->heater ; }", []);
    this.addExecutableSafe("SysADLModel.FahrenheitToCelsiusEx", "executable def FahrenheitToCelsiusEx(in f:FahrenheitTemperature): out CelsiusTemperature{return 5*(f - 32)/9 ; }", []);
    this.addExecutableSafe("SysADLModel.CalculateAverageTemperatureEx", "executable def CalculateAverageTemperatureEx(in temp1:CelsiusTemperature,in temp2:CelsiusTemperature):out CelsiusTemperature{return (temp1 + temp2)/2 ; }", []);
    this.addExecutableSafe("SysADLModel.CheckPresenceToSetTemperature", "executable def CheckPresenceToSetTemperature(in presence:Boolean, in userTemp:CelsiusTemperature):out CelsiusTemperature{if(presence == true) return userTemp; else return 2; }", []);
    this.addExecutableSafe("SysADLModel.CompareTemperatureEx", "executable def CompareTemperatureEx(in target:CelsiusTemperature, in average:CelsiusTemperature):out Commands{let heater:Command = types.Command::Off; let cooler:Command = types.Command::Off; if(average > target) {heater = types.Command::Off; cooler = types.Command::On ; } else {heater = types.Command::On; cooler = types.Command::Off ;} }", []);
    this.addExecutableSafe("SysADLModel.veyz", "executable FahrenheitToCelsiusEx to FahrenheitToCelsiusAN", []);
    this.addExecutableSafe("SysADLModel.8j0w", "executable CompareTemperatureEx to CompareTemperatureAN", []);
    this.addExecutableSafe("SysADLModel.orcr", "executable CommandHeaterEx to CommandHeaterAN", []);
    this.addExecutableSafe("SysADLModel.hn3o", "executable CommandCoolerEx to CommandCoolerAN", []);
    this.addExecutableSafe("SysADLModel.0cbv", "executable CheckPresenceToSetTemperature to CheckPeresenceToSetTemperatureAN", []);
    this.addExecutableSafe("SysADLModel.1gs6", "executable CalculateAverageTemperatureEx to CalculateAverageTemperatureAN", []);
    const act_CalculateAverageTemperatureAC_s1 = new Activity("CalculateAverageTemperatureAC", { component: "s1", inputPorts: ["current"] });
    act_CalculateAverageTemperatureAC_s1.addAction(new Action("CalculateAverageTemperatureAN", [], "CalculateAverageTemperatureEx"));
    this.registerActivity("CalculateAverageTemperatureAC::s1", act_CalculateAverageTemperatureAC_s1);
    const act_CalculateAverageTemperatureAC_s2 = new Activity("CalculateAverageTemperatureAC", { component: "s2", inputPorts: ["current"] });
    act_CalculateAverageTemperatureAC_s2.addAction(new Action("CalculateAverageTemperatureAN", [], "CalculateAverageTemperatureEx"));
    this.registerActivity("CalculateAverageTemperatureAC::s2", act_CalculateAverageTemperatureAC_s2);
    const act_CalculateAverageTemperatureAC_s3 = new Activity("CalculateAverageTemperatureAC", { component: "s3", inputPorts: ["detected"] });
    act_CalculateAverageTemperatureAC_s3.addAction(new Action("CalculateAverageTemperatureAN", [], "CalculateAverageTemperatureEx"));
    this.registerActivity("CalculateAverageTemperatureAC::s3", act_CalculateAverageTemperatureAC_s3);
    const act_CalculateAverageTemperatureAC_ui = new Activity("CalculateAverageTemperatureAC", { component: "ui", inputPorts: ["desired"] });
    act_CalculateAverageTemperatureAC_ui.addAction(new Action("CalculateAverageTemperatureAN", [], "CalculateAverageTemperatureEx"));
    this.registerActivity("CalculateAverageTemperatureAC::ui", act_CalculateAverageTemperatureAC_ui);
    const act_CalculateAverageTemperatureAC_a2 = new Activity("CalculateAverageTemperatureAC", { component: "a2", inputPorts: ["controllerC"] });
    act_CalculateAverageTemperatureAC_a2.addAction(new Action("CalculateAverageTemperatureAN", [], "CalculateAverageTemperatureEx"));
    this.registerActivity("CalculateAverageTemperatureAC::a2", act_CalculateAverageTemperatureAC_a2);
    const act_CalculateAverageTemperatureAC_a1 = new Activity("CalculateAverageTemperatureAC", { component: "a1", inputPorts: ["controllerH"] });
    act_CalculateAverageTemperatureAC_a1.addAction(new Action("CalculateAverageTemperatureAN", [], "CalculateAverageTemperatureEx"));
    this.registerActivity("CalculateAverageTemperatureAC::a1", act_CalculateAverageTemperatureAC_a1);
    const act_CalculateAverageTemperatureAC_rtc = new Activity("CalculateAverageTemperatureAC", { component: "rtc", inputPorts: ["s1"] });
    act_CalculateAverageTemperatureAC_rtc.addAction(new Action("CalculateAverageTemperatureAN", [], "CalculateAverageTemperatureEx"));
    this.registerActivity("CalculateAverageTemperatureAC::rtc", act_CalculateAverageTemperatureAC_rtc);
    const act_CalculateAverageTemperatureAC_sm = new Activity("CalculateAverageTemperatureAC", { component: "sm", inputPorts: ["s1"] });
    act_CalculateAverageTemperatureAC_sm.addAction(new Action("CalculateAverageTemperatureAN", [], "CalculateAverageTemperatureEx"));
    this.registerActivity("CalculateAverageTemperatureAC::sm", act_CalculateAverageTemperatureAC_sm);
    const act_CalculateAverageTemperatureAC_cm = new Activity("CalculateAverageTemperatureAC", { component: "cm", inputPorts: ["target2"] });
    act_CalculateAverageTemperatureAC_cm.addAction(new Action("CalculateAverageTemperatureAN", [], "CalculateAverageTemperatureEx"));
    this.registerActivity("CalculateAverageTemperatureAC::cm", act_CalculateAverageTemperatureAC_cm);
    const act_CalculateAverageTemperatureAC_pc = new Activity("CalculateAverageTemperatureAC", { component: "pc", inputPorts: ["detected"] });
    act_CalculateAverageTemperatureAC_pc.addAction(new Action("CalculateAverageTemperatureAN", [], "CalculateAverageTemperatureEx"));
    this.registerActivity("CalculateAverageTemperatureAC::pc", act_CalculateAverageTemperatureAC_pc);
    const act_CheckPresenceToSetTemperatureAC_s1 = new Activity("CheckPresenceToSetTemperatureAC", { component: "s1", inputPorts: ["current"] });
    act_CheckPresenceToSetTemperatureAC_s1.addAction(new Action("CheckPeresenceToSetTemperatureAN", [], "CheckPresenceToSetTemperature"));
    this.registerActivity("CheckPresenceToSetTemperatureAC::s1", act_CheckPresenceToSetTemperatureAC_s1);
    const act_CheckPresenceToSetTemperatureAC_s2 = new Activity("CheckPresenceToSetTemperatureAC", { component: "s2", inputPorts: ["current"] });
    act_CheckPresenceToSetTemperatureAC_s2.addAction(new Action("CheckPeresenceToSetTemperatureAN", [], "CheckPresenceToSetTemperature"));
    this.registerActivity("CheckPresenceToSetTemperatureAC::s2", act_CheckPresenceToSetTemperatureAC_s2);
    const act_CheckPresenceToSetTemperatureAC_s3 = new Activity("CheckPresenceToSetTemperatureAC", { component: "s3", inputPorts: ["detected"] });
    act_CheckPresenceToSetTemperatureAC_s3.addAction(new Action("CheckPeresenceToSetTemperatureAN", [], "CheckPresenceToSetTemperature"));
    this.registerActivity("CheckPresenceToSetTemperatureAC::s3", act_CheckPresenceToSetTemperatureAC_s3);
    const act_CheckPresenceToSetTemperatureAC_ui = new Activity("CheckPresenceToSetTemperatureAC", { component: "ui", inputPorts: ["desired"] });
    act_CheckPresenceToSetTemperatureAC_ui.addAction(new Action("CheckPeresenceToSetTemperatureAN", [], "CheckPresenceToSetTemperature"));
    this.registerActivity("CheckPresenceToSetTemperatureAC::ui", act_CheckPresenceToSetTemperatureAC_ui);
    const act_CheckPresenceToSetTemperatureAC_a2 = new Activity("CheckPresenceToSetTemperatureAC", { component: "a2", inputPorts: ["controllerC"] });
    act_CheckPresenceToSetTemperatureAC_a2.addAction(new Action("CheckPeresenceToSetTemperatureAN", [], "CheckPresenceToSetTemperature"));
    this.registerActivity("CheckPresenceToSetTemperatureAC::a2", act_CheckPresenceToSetTemperatureAC_a2);
    const act_CheckPresenceToSetTemperatureAC_a1 = new Activity("CheckPresenceToSetTemperatureAC", { component: "a1", inputPorts: ["controllerH"] });
    act_CheckPresenceToSetTemperatureAC_a1.addAction(new Action("CheckPeresenceToSetTemperatureAN", [], "CheckPresenceToSetTemperature"));
    this.registerActivity("CheckPresenceToSetTemperatureAC::a1", act_CheckPresenceToSetTemperatureAC_a1);
    const act_CheckPresenceToSetTemperatureAC_rtc = new Activity("CheckPresenceToSetTemperatureAC", { component: "rtc", inputPorts: ["detected"] });
    act_CheckPresenceToSetTemperatureAC_rtc.addAction(new Action("CheckPeresenceToSetTemperatureAN", [], "CheckPresenceToSetTemperature"));
    this.registerActivity("CheckPresenceToSetTemperatureAC::rtc", act_CheckPresenceToSetTemperatureAC_rtc);
    const act_CheckPresenceToSetTemperatureAC_sm = new Activity("CheckPresenceToSetTemperatureAC", { component: "sm", inputPorts: ["s1"] });
    act_CheckPresenceToSetTemperatureAC_sm.addAction(new Action("CheckPeresenceToSetTemperatureAN", [], "CheckPresenceToSetTemperature"));
    this.registerActivity("CheckPresenceToSetTemperatureAC::sm", act_CheckPresenceToSetTemperatureAC_sm);
    const act_CheckPresenceToSetTemperatureAC_cm = new Activity("CheckPresenceToSetTemperatureAC", { component: "cm", inputPorts: ["target2"] });
    act_CheckPresenceToSetTemperatureAC_cm.addAction(new Action("CheckPeresenceToSetTemperatureAN", [], "CheckPresenceToSetTemperature"));
    this.registerActivity("CheckPresenceToSetTemperatureAC::cm", act_CheckPresenceToSetTemperatureAC_cm);
    const act_CheckPresenceToSetTemperatureAC_pc = new Activity("CheckPresenceToSetTemperatureAC", { component: "pc", inputPorts: ["detected"] });
    act_CheckPresenceToSetTemperatureAC_pc.addAction(new Action("CheckPeresenceToSetTemperatureAN", [], "CheckPresenceToSetTemperature"));
    this.registerActivity("CheckPresenceToSetTemperatureAC::pc", act_CheckPresenceToSetTemperatureAC_pc);
    const act_DecideCommandAC_s1 = new Activity("DecideCommandAC", { component: "s1", inputPorts: ["current"] });
    act_DecideCommandAC_s1.addAction(new Action("CommandCoolerAN", [], "CommandCoolerEx"));
    act_DecideCommandAC_s1.addAction(new Action("CommandHeaterAN", [], "CommandHeaterEx"));
    act_DecideCommandAC_s1.addAction(new Action("CompareTemperatureAN", [], "CompareTemperatureEx"));
    this.registerActivity("DecideCommandAC::s1", act_DecideCommandAC_s1);
    const act_DecideCommandAC_s2 = new Activity("DecideCommandAC", { component: "s2", inputPorts: ["current"] });
    act_DecideCommandAC_s2.addAction(new Action("CommandCoolerAN", [], "CommandCoolerEx"));
    act_DecideCommandAC_s2.addAction(new Action("CommandHeaterAN", [], "CommandHeaterEx"));
    act_DecideCommandAC_s2.addAction(new Action("CompareTemperatureAN", [], "CompareTemperatureEx"));
    this.registerActivity("DecideCommandAC::s2", act_DecideCommandAC_s2);
    const act_DecideCommandAC_s3 = new Activity("DecideCommandAC", { component: "s3", inputPorts: ["detected"] });
    act_DecideCommandAC_s3.addAction(new Action("CommandCoolerAN", [], "CommandCoolerEx"));
    act_DecideCommandAC_s3.addAction(new Action("CommandHeaterAN", [], "CommandHeaterEx"));
    act_DecideCommandAC_s3.addAction(new Action("CompareTemperatureAN", [], "CompareTemperatureEx"));
    this.registerActivity("DecideCommandAC::s3", act_DecideCommandAC_s3);
    const act_DecideCommandAC_ui = new Activity("DecideCommandAC", { component: "ui", inputPorts: ["desired"] });
    act_DecideCommandAC_ui.addAction(new Action("CommandCoolerAN", [], "CommandCoolerEx"));
    act_DecideCommandAC_ui.addAction(new Action("CommandHeaterAN", [], "CommandHeaterEx"));
    act_DecideCommandAC_ui.addAction(new Action("CompareTemperatureAN", [], "CompareTemperatureEx"));
    this.registerActivity("DecideCommandAC::ui", act_DecideCommandAC_ui);
    const act_DecideCommandAC_a2 = new Activity("DecideCommandAC", { component: "a2", inputPorts: ["controllerC"] });
    act_DecideCommandAC_a2.addAction(new Action("CommandCoolerAN", [], "CommandCoolerEx"));
    act_DecideCommandAC_a2.addAction(new Action("CommandHeaterAN", [], "CommandHeaterEx"));
    act_DecideCommandAC_a2.addAction(new Action("CompareTemperatureAN", [], "CompareTemperatureEx"));
    this.registerActivity("DecideCommandAC::a2", act_DecideCommandAC_a2);
    const act_DecideCommandAC_a1 = new Activity("DecideCommandAC", { component: "a1", inputPorts: ["controllerH"] });
    act_DecideCommandAC_a1.addAction(new Action("CommandCoolerAN", [], "CommandCoolerEx"));
    act_DecideCommandAC_a1.addAction(new Action("CommandHeaterAN", [], "CommandHeaterEx"));
    act_DecideCommandAC_a1.addAction(new Action("CompareTemperatureAN", [], "CompareTemperatureEx"));
    this.registerActivity("DecideCommandAC::a1", act_DecideCommandAC_a1);
    const act_DecideCommandAC_rtc = new Activity("DecideCommandAC", { component: "rtc", inputPorts: ["average2"] });
    act_DecideCommandAC_rtc.addAction(new Action("CommandCoolerAN", [], "CommandCoolerEx"));
    act_DecideCommandAC_rtc.addAction(new Action("CommandHeaterAN", [], "CommandHeaterEx"));
    act_DecideCommandAC_rtc.addAction(new Action("CompareTemperatureAN", [], "CompareTemperatureEx"));
    this.registerActivity("DecideCommandAC::rtc", act_DecideCommandAC_rtc);
    const act_DecideCommandAC_sm = new Activity("DecideCommandAC", { component: "sm", inputPorts: ["average"] });
    act_DecideCommandAC_sm.addAction(new Action("CommandCoolerAN", [], "CommandCoolerEx"));
    act_DecideCommandAC_sm.addAction(new Action("CommandHeaterAN", [], "CommandHeaterEx"));
    act_DecideCommandAC_sm.addAction(new Action("CompareTemperatureAN", [], "CompareTemperatureEx"));
    this.registerActivity("DecideCommandAC::sm", act_DecideCommandAC_sm);
    const act_DecideCommandAC_cm = new Activity("DecideCommandAC", { component: "cm", inputPorts: ["average2"] });
    act_DecideCommandAC_cm.addAction(new Action("CommandCoolerAN", [], "CommandCoolerEx"));
    act_DecideCommandAC_cm.addAction(new Action("CommandHeaterAN", [], "CommandHeaterEx"));
    act_DecideCommandAC_cm.addAction(new Action("CompareTemperatureAN", [], "CompareTemperatureEx"));
    this.registerActivity("DecideCommandAC::cm", act_DecideCommandAC_cm);
    const act_DecideCommandAC_pc = new Activity("DecideCommandAC", { component: "pc", inputPorts: ["detected"] });
    act_DecideCommandAC_pc.addAction(new Action("CommandCoolerAN", [], "CommandCoolerEx"));
    act_DecideCommandAC_pc.addAction(new Action("CommandHeaterAN", [], "CommandHeaterEx"));
    act_DecideCommandAC_pc.addAction(new Action("CompareTemperatureAN", [], "CompareTemperatureEx"));
    this.registerActivity("DecideCommandAC::pc", act_DecideCommandAC_pc);
    const act_FahrenheitToCelsiusAC_s1 = new Activity("FahrenheitToCelsiusAC", { component: "s1", inputPorts: ["current"] });
    act_FahrenheitToCelsiusAC_s1.addAction(new Action("FahrenheitToCelsiusAN", [], "FahrenheitToCelsiusEx"));
    this.registerActivity("FahrenheitToCelsiusAC::s1", act_FahrenheitToCelsiusAC_s1);
    const act_FahrenheitToCelsiusAC_s2 = new Activity("FahrenheitToCelsiusAC", { component: "s2", inputPorts: ["current"] });
    act_FahrenheitToCelsiusAC_s2.addAction(new Action("FahrenheitToCelsiusAN", [], "FahrenheitToCelsiusEx"));
    this.registerActivity("FahrenheitToCelsiusAC::s2", act_FahrenheitToCelsiusAC_s2);
    const act_FahrenheitToCelsiusAC_s3 = new Activity("FahrenheitToCelsiusAC", { component: "s3", inputPorts: ["detected"] });
    act_FahrenheitToCelsiusAC_s3.addAction(new Action("FahrenheitToCelsiusAN", [], "FahrenheitToCelsiusEx"));
    this.registerActivity("FahrenheitToCelsiusAC::s3", act_FahrenheitToCelsiusAC_s3);
    const act_FahrenheitToCelsiusAC_ui = new Activity("FahrenheitToCelsiusAC", { component: "ui", inputPorts: ["desired"] });
    act_FahrenheitToCelsiusAC_ui.addAction(new Action("FahrenheitToCelsiusAN", [], "FahrenheitToCelsiusEx"));
    this.registerActivity("FahrenheitToCelsiusAC::ui", act_FahrenheitToCelsiusAC_ui);
    const act_FahrenheitToCelsiusAC_a2 = new Activity("FahrenheitToCelsiusAC", { component: "a2", inputPorts: ["controllerC"] });
    act_FahrenheitToCelsiusAC_a2.addAction(new Action("FahrenheitToCelsiusAN", [], "FahrenheitToCelsiusEx"));
    this.registerActivity("FahrenheitToCelsiusAC::a2", act_FahrenheitToCelsiusAC_a2);
    const act_FahrenheitToCelsiusAC_a1 = new Activity("FahrenheitToCelsiusAC", { component: "a1", inputPorts: ["controllerH"] });
    act_FahrenheitToCelsiusAC_a1.addAction(new Action("FahrenheitToCelsiusAN", [], "FahrenheitToCelsiusEx"));
    this.registerActivity("FahrenheitToCelsiusAC::a1", act_FahrenheitToCelsiusAC_a1);
    const act_FahrenheitToCelsiusAC_rtc = new Activity("FahrenheitToCelsiusAC", { component: "rtc", inputPorts: ["detectedRTC"] });
    act_FahrenheitToCelsiusAC_rtc.addAction(new Action("FahrenheitToCelsiusAN", [], "FahrenheitToCelsiusEx"));
    this.registerActivity("FahrenheitToCelsiusAC::rtc", act_FahrenheitToCelsiusAC_rtc);
    const act_FahrenheitToCelsiusAC_sm = new Activity("FahrenheitToCelsiusAC", { component: "sm", inputPorts: ["s1"] });
    act_FahrenheitToCelsiusAC_sm.addAction(new Action("FahrenheitToCelsiusAN", [], "FahrenheitToCelsiusEx"));
    this.registerActivity("FahrenheitToCelsiusAC::sm", act_FahrenheitToCelsiusAC_sm);
    const act_FahrenheitToCelsiusAC_cm = new Activity("FahrenheitToCelsiusAC", { component: "cm", inputPorts: ["target2"] });
    act_FahrenheitToCelsiusAC_cm.addAction(new Action("FahrenheitToCelsiusAN", [], "FahrenheitToCelsiusEx"));
    this.registerActivity("FahrenheitToCelsiusAC::cm", act_FahrenheitToCelsiusAC_cm);
    const act_FahrenheitToCelsiusAC_pc = new Activity("FahrenheitToCelsiusAC", { component: "pc", inputPorts: ["detected"] });
    act_FahrenheitToCelsiusAC_pc.addAction(new Action("FahrenheitToCelsiusAN", [], "FahrenheitToCelsiusEx"));
    this.registerActivity("FahrenheitToCelsiusAC::pc", act_FahrenheitToCelsiusAC_pc);
    const CN_c1_1 = new CN_Connectors_FahrenheitToCelsiusCN("c1");
    this.addConnector(CN_c1_1);
    const CN_uc_4 = new CN_Connectors_CTemperatureCN("uc");
    this.addConnector(CN_uc_4);
    const CN_cc2_7 = new CN_Connectors_CommandCN("cc2");
    this.addConnector(CN_cc2_7);
    const CN_pc_10 = new CN_Connectors_PresenceCN("pc");
    this.addConnector(CN_pc_10);
    const CN_c2_13 = new CN_Connectors_FahrenheitToCelsiusCN("c2");
    this.addConnector(CN_c2_13);
    const CN_cc1_16 = new CN_Connectors_CommandCN("cc1");
    this.addConnector(CN_cc1_16);
    const CN_Components_target_19 = new CN_Connectors_CTemperatureCN("target");
    this.addConnector(CN_Components_target_19);
    const CN_Components_average_22 = new CN_Connectors_CTemperatureCN("average");
    this.addConnector(CN_Components_average_22);
    const CN_Components_target_25 = new CN_Connectors_CTemperatureCN("target");
    this.addConnector(CN_Components_target_25);
    const CN_Components_average_28 = new CN_Connectors_CTemperatureCN("average");
    this.addConnector(CN_Components_average_28);
  }
}

const __portAliases = {};
function createModel(){ return new SysADLModel(); }
module.exports = { createModel, SysADLModel, __portAliases, VT_types_temperature, VT_types_FahrenheitTemperature, VT_types_CelsiusTemperature, EN_types_Command, DT_types_Commands, DM_types_Temperature, UN_types_Celsius, UN_types_Fahrenheit, PT_Ports_FTemperatureOPT, PT_Ports_PresenceIPT, PT_Ports_PresenceOPT, PT_Ports_CTemperatureIPT, PT_Ports_CommandIPT, PT_Ports_CommandOPT, PT_Ports_CTemperatureOPT };
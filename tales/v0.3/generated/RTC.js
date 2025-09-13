const { Model, Component, Port, SimplePort, CompositePort, Connector, Activity, Action, createExecutableFromExpression, Enum, Int, Boolean, String, Real, Void, valueType, dataType, dimension, unit } = require('../SysADLBase');

// Types
const DM_Temperature = dimension('Temperature');
const UN_Celsius = unit('Celsius');
const UN_Fahrenheit = unit('Fahrenheit');
const VT_temperature = valueType('temperature', { extends: Real, dimension: DM_Temperature });
const VT_FahrenheitTemperature = valueType('FahrenheitTemperature', { extends: VT_temperature, unit: UN_Fahrenheit, dimension: DM_Temperature });
const VT_CelsiusTemperature = valueType('CelsiusTemperature', { extends: VT_temperature, unit: UN_Celsius, dimension: DM_Temperature });
const EN_Command = new Enum("On", "Off");
const DT_Commands = dataType('Commands', { heater: EN_Command, cooler: EN_Command });

// Ports
class PT_FTemperatureOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "FahrenheitTemperature" }, ...opts });
  }
}
class PT_PresenceIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Boolean" }, ...opts });
  }
}
class PT_PresenceOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "Boolean" }, ...opts });
  }
}
class PT_CTemperatureIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "CelsiusTemperature" }, ...opts });
  }
}
class PT_CommandIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Command" }, ...opts });
  }
}
class PT_CommandOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "Command" }, ...opts });
  }
}
class PT_CTemperatureOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "CelsiusTemperature" }, ...opts });
  }
}

// Components
class CP_TemperatureSensorCP extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_FTemperatureOPT("current", { owner: name }));
    }
}
class CP_PresenceSensorCP extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_PresenceOPT("detected", { owner: name }));
    }
}
class CP_UserInterfaceCP extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_CTemperatureOPT("desired", { owner: name }));
    }
}
class CP_CoolerCP extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_CommandIPT("controllerC", { owner: name }));
    }
}
class CP_HeaterCP extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_CommandIPT("controllerH", { owner: name }));
    }
}
class CP_RoomTemperatureControllerCP extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_PresenceIPT("detectedRTC", { owner: name }));
      this.addPort(new PT_CTemperatureIPT("localtemp1", { owner: name }));
      this.addPort(new PT_CTemperatureIPT("localTemp2", { owner: name }));
      this.addPort(new PT_CTemperatureIPT("userTempRTC", { owner: name }));
      this.addPort(new PT_CommandOPT("heatingRTC", { owner: name }));
      this.addPort(new PT_CommandOPT("coolingRTC", { owner: name }));
    }
}
class CP_SensorsMonitorCP extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_CTemperatureIPT("s1", { owner: name }));
      this.addPort(new PT_CTemperatureIPT("s2", { owner: name }));
      this.addPort(new PT_CTemperatureOPT("average", { owner: name }));
    }
}
class CP_CommanderCP extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_CTemperatureIPT("target2", { owner: name }));
      this.addPort(new PT_CTemperatureIPT("average2", { owner: name }));
      this.addPort(new PT_CommandOPT("heating", { owner: name }));
      this.addPort(new PT_CommandOPT("cooling", { owner: name }));
    }
}
class CP_PresenceCheckerCP extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_PresenceIPT("detected", { owner: name }));
      this.addPort(new PT_CTemperatureIPT("userTemp", { owner: name }));
      this.addPort(new PT_CTemperatureOPT("target", { owner: name }));
    }
}
class CP_RTCSystemCFD extends Component { }

class SysADLModel extends Model {
  constructor(){
    super("SysADLModel");
    this.RTCSystemCFD = new CP_RTCSystemCFD("RTCSystemCFD", { sysadlDefinition: "RTCSystemCFD" });
    this.addComponent(this.RTCSystemCFD);
    this.RTCSystemCFD.a1 = new CP_HeaterCP("a1", { isBoundary: true, sysadlDefinition: "HeaterCP" });
    this.RTCSystemCFD.addComponent(this.RTCSystemCFD.a1);
    this.RTCSystemCFD.a2 = new CP_CoolerCP("a2", { isBoundary: true, sysadlDefinition: "CoolerCP" });
    this.RTCSystemCFD.addComponent(this.RTCSystemCFD.a2);
    this.RTCSystemCFD.rtc = new CP_RoomTemperatureControllerCP("rtc", { sysadlDefinition: "RoomTemperatureControllerCP" });
    this.RTCSystemCFD.addComponent(this.RTCSystemCFD.rtc);
    this.RTCSystemCFD.s1 = new CP_TemperatureSensorCP("s1", { isBoundary: true, sysadlDefinition: "TemperatureSensorCP" });
    this.RTCSystemCFD.addComponent(this.RTCSystemCFD.s1);
    this.RTCSystemCFD.s2 = new CP_TemperatureSensorCP("s2", { isBoundary: true, sysadlDefinition: "TemperatureSensorCP" });
    this.RTCSystemCFD.addComponent(this.RTCSystemCFD.s2);
    this.RTCSystemCFD.s3 = new CP_PresenceSensorCP("s3", { isBoundary: true, sysadlDefinition: "PresenceSensorCP" });
    this.RTCSystemCFD.addComponent(this.RTCSystemCFD.s3);
    this.RTCSystemCFD.ui = new CP_UserInterfaceCP("ui", { isBoundary: true, sysadlDefinition: "UserInterfaceCP" });
    this.RTCSystemCFD.addComponent(this.RTCSystemCFD.ui);
    this.RTCSystemCFD.rtc.cm = new CP_CommanderCP("cm", { sysadlDefinition: "CommanderCP" });
    this.RTCSystemCFD.rtc.addComponent(this.RTCSystemCFD.rtc.cm);
    this.RTCSystemCFD.rtc.pc = new CP_PresenceCheckerCP("pc", { sysadlDefinition: "PresenceCheckerCP" });
    this.RTCSystemCFD.rtc.addComponent(this.RTCSystemCFD.rtc.pc);
    this.RTCSystemCFD.rtc.sm = new CP_SensorsMonitorCP("sm", { sysadlDefinition: "SensorsMonitorCP" });
    this.RTCSystemCFD.rtc.addComponent(this.RTCSystemCFD.rtc.sm);

    this.RTCSystemCFD.s1.addPort(new PT_FTemperatureOPT("current", "out", { owner: "s1" }));
    this.RTCSystemCFD.s2.addPort(new PT_FTemperatureOPT("current", "out", { owner: "s2" }));
    this.RTCSystemCFD.s3.addPort(new PT_PresenceOPT("detected", "out", { owner: "s3" }));
    this.RTCSystemCFD.ui.addPort(new PT_CTemperatureOPT("desired", "out", { owner: "ui" }));
    this.RTCSystemCFD.a2.addPort(new PT_CommandIPT("controllerC", "in", { owner: "a2" }));
    this.RTCSystemCFD.a1.addPort(new PT_CommandIPT("controllerH", "in", { owner: "a1" }));
    this.RTCSystemCFD.rtc.addPort(new PT_PresenceIPT("detectedRTC", "in", { owner: "rtc" }));
    this.RTCSystemCFD.rtc.addPort(new PT_CTemperatureIPT("localtemp1", "in", { owner: "rtc" }));
    this.RTCSystemCFD.rtc.addPort(new PT_CTemperatureIPT("localTemp2", "in", { owner: "rtc" }));
    this.RTCSystemCFD.rtc.addPort(new PT_CTemperatureIPT("userTempRTC", "in", { owner: "rtc" }));
    this.RTCSystemCFD.rtc.addPort(new PT_CommandOPT("heatingRTC", "out", { owner: "rtc" }));
    this.RTCSystemCFD.rtc.addPort(new PT_CommandOPT("coolingRTC", "out", { owner: "rtc" }));
    this.RTCSystemCFD.rtc.addPort(new PT_CTemperatureIPT("s1", "in", { owner: "rtc" }));
    this.RTCSystemCFD.rtc.addPort(new PT_CTemperatureIPT("s2", "in", { owner: "rtc" }));
    this.RTCSystemCFD.rtc.addPort(new PT_CTemperatureOPT("average", "out", { owner: "rtc" }));
    this.RTCSystemCFD.rtc.addPort(new PT_CTemperatureIPT("target2", "in", { owner: "rtc" }));
    this.RTCSystemCFD.rtc.addPort(new PT_CTemperatureIPT("average2", "in", { owner: "rtc" }));
    this.RTCSystemCFD.rtc.addPort(new PT_CommandOPT("heating", "out", { owner: "rtc" }));
    this.RTCSystemCFD.rtc.addPort(new PT_CommandOPT("cooling", "out", { owner: "rtc" }));
    this.RTCSystemCFD.rtc.addPort(new PT_PresenceIPT("detected", "in", { owner: "rtc" }));
    this.RTCSystemCFD.rtc.addPort(new PT_CTemperatureIPT("userTemp", "in", { owner: "rtc" }));
    this.RTCSystemCFD.rtc.addPort(new PT_CTemperatureOPT("target", "out", { owner: "rtc" }));
    this.RTCSystemCFD.rtc.sm.addPort(new PT_CTemperatureIPT("s1", "in", { owner: "sm" }));
    this.RTCSystemCFD.rtc.sm.addPort(new PT_CTemperatureIPT("s2", "in", { owner: "sm" }));
    this.RTCSystemCFD.rtc.sm.addPort(new PT_CTemperatureOPT("average", "out", { owner: "sm" }));
    this.RTCSystemCFD.rtc.cm.addPort(new PT_CTemperatureIPT("target2", "in", { owner: "cm" }));
    this.RTCSystemCFD.rtc.cm.addPort(new PT_CTemperatureIPT("average2", "in", { owner: "cm" }));
    this.RTCSystemCFD.rtc.cm.addPort(new PT_CommandOPT("heating", "out", { owner: "cm" }));
    this.RTCSystemCFD.rtc.cm.addPort(new PT_CommandOPT("cooling", "out", { owner: "cm" }));
    this.RTCSystemCFD.rtc.pc.addPort(new PT_PresenceIPT("detected", "in", { owner: "pc" }));
    this.RTCSystemCFD.rtc.pc.addPort(new PT_CTemperatureIPT("userTemp", "in", { owner: "pc" }));
    this.RTCSystemCFD.rtc.pc.addPort(new PT_CTemperatureOPT("target", "out", { owner: "pc" }));
    this.addExecutableSafe("SysADLModel.CommandCoolerEx", "executable def CommandCoolerEx(in cmds:Commands): out Command{return cmds->cooler ; }", []);
    this.addExecutableSafe("SysADLModel.CommandHeaterEx", "executable def CommandHeaterEx(in cmds:Commands): out Command{return cmds->heater ; }", []);
    this.addExecutableSafe("SysADLModel.FahrenheitToCelsiusEx", "executable def FahrenheitToCelsiusEx(in f:FahrenheitTemperature): out CelsiusTemperature{return 5*(f - 32)/9 ; }", []);
    this.addExecutableSafe("SysADLModel.CalculateAverageTemperatureEx", "executable def CalculateAverageTemperatureEx(in temp1:CelsiusTemperature,in temp2:CelsiusTemperature):out CelsiusTemperature{return (temp1 + temp2)/2 ; }", []);
    this.addExecutableSafe("SysADLModel.CheckPresenceToSetTemperature", "executable def CheckPresenceToSetTemperature(in presence:Boolean, in userTemp:CelsiusTemperature):out CelsiusTemperature{if(presence == true) return userTemp; else return 2; }", []);
    this.addExecutableSafe("SysADLModel.CompareTemperatureEx", "executable def CompareTemperatureEx(in target:CelsiusTemperature, in average:CelsiusTemperature):out Commands{let heater:Command = types.Command::Off; let cooler:Command = types.Command::Off; if(average > target) {heater = types.Command::Off; cooler = types.Command::On ; } else {heater = types.Command::On; cooler = types.Command::Off ;} }", []);
    this.addExecutableSafe("SysADLModel.qneq", "executable FahrenheitToCelsiusEx to FahrenheitToCelsiusAN", []);
    this.addExecutableSafe("SysADLModel.w9s4", "executable CompareTemperatureEx to CompareTemperatureAN", []);
    this.addExecutableSafe("SysADLModel.h7d6", "executable CommandHeaterEx to CommandHeaterAN", []);
    this.addExecutableSafe("SysADLModel.w63o", "executable CommandCoolerEx to CommandCoolerAN", []);
    this.addExecutableSafe("SysADLModel.1udw", "executable CheckPresenceToSetTemperature to CheckPeresenceToSetTemperatureAN", []);
    this.addExecutableSafe("SysADLModel.lnlt", "executable CalculateAverageTemperatureEx to CalculateAverageTemperatureAN", []);
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
    const conn_c1_1 = new Connector("c1");
    const conn_c1_1__seen = new Set();
    if(!conn_c1_1__seen.has("s1::current")) { this.attachEndpointSafe(conn_c1_1, this.RTCSystemCFD.s1, "current"); conn_c1_1__seen.add("s1::current"); }
    this.addConnector(conn_c1_1);
    const conn_s1_current__x_x_s1_current__x_x_2 = new Connector("s1.current__x.x_s1.current__x.x");
    const conn_s1_current__x_x_s1_current__x_x_2__seen = new Set();
    if(!conn_s1_current__x_x_s1_current__x_x_2__seen.has("s1::current")) { this.attachEndpointSafe(conn_s1_current__x_x_s1_current__x_x_2, this.RTCSystemCFD.s1, "current"); conn_s1_current__x_x_s1_current__x_x_2__seen.add("s1::current"); }
    this.addConnector(conn_s1_current__x_x_s1_current__x_x_2);
    const conn_uc_4 = new Connector("uc");
    const conn_uc_4__seen = new Set();
    if(!conn_uc_4__seen.has("ui::desired")) { this.attachEndpointSafe(conn_uc_4, this.RTCSystemCFD.ui, "desired"); conn_uc_4__seen.add("ui::desired"); }
    this.addConnector(conn_uc_4);
    const conn_ui_desired__x_x_ui_desired__x_x_5 = new Connector("ui.desired__x.x_ui.desired__x.x");
    const conn_ui_desired__x_x_ui_desired__x_x_5__seen = new Set();
    if(!conn_ui_desired__x_x_ui_desired__x_x_5__seen.has("ui::desired")) { this.attachEndpointSafe(conn_ui_desired__x_x_ui_desired__x_x_5, this.RTCSystemCFD.ui, "desired"); conn_ui_desired__x_x_ui_desired__x_x_5__seen.add("ui::desired"); }
    this.addConnector(conn_ui_desired__x_x_ui_desired__x_x_5);
    const conn_cc2_7 = new Connector("cc2");
    const conn_cc2_7__seen = new Set();
    if(!conn_cc2_7__seen.has("a2::controllerC")) { this.attachEndpointSafe(conn_cc2_7, this.RTCSystemCFD.a2, "controllerC"); conn_cc2_7__seen.add("a2::controllerC"); }
    this.addConnector(conn_cc2_7);
    const conn_x_x__a2_controllerC_x_x__a2_controllerC_8 = new Connector("x.x__a2.controllerC_x.x__a2.controllerC");
    const conn_x_x__a2_controllerC_x_x__a2_controllerC_8__seen = new Set();
    if(!conn_x_x__a2_controllerC_x_x__a2_controllerC_8__seen.has("a2::controllerC")) { this.attachEndpointSafe(conn_x_x__a2_controllerC_x_x__a2_controllerC_8, this.RTCSystemCFD.a2, "controllerC"); conn_x_x__a2_controllerC_x_x__a2_controllerC_8__seen.add("a2::controllerC"); }
    this.addConnector(conn_x_x__a2_controllerC_x_x__a2_controllerC_8);
    const conn_pc_10 = new Connector("pc");
    const conn_pc_10__seen = new Set();
    if(!conn_pc_10__seen.has("s3::detected")) { this.attachEndpointSafe(conn_pc_10, this.RTCSystemCFD.s3, "detected"); conn_pc_10__seen.add("s3::detected"); }
    if(!conn_pc_10__seen.has("rtc::detected")) { this.attachEndpointSafe(conn_pc_10, this.RTCSystemCFD.rtc, "detected"); conn_pc_10__seen.add("rtc::detected"); }
    this.addConnector(conn_pc_10);
    const conn_s3_detected__rtc_detected_s3_detected__rtc_detected_11 = new Connector("s3.detected__rtc.detected_s3.detected__rtc.detected");
    const conn_s3_detected__rtc_detected_s3_detected__rtc_detected_11__seen = new Set();
    if(!conn_s3_detected__rtc_detected_s3_detected__rtc_detected_11__seen.has("s3::detected")) { this.attachEndpointSafe(conn_s3_detected__rtc_detected_s3_detected__rtc_detected_11, this.RTCSystemCFD.s3, "detected"); conn_s3_detected__rtc_detected_s3_detected__rtc_detected_11__seen.add("s3::detected"); }
    if(!conn_s3_detected__rtc_detected_s3_detected__rtc_detected_11__seen.has("rtc::detected")) { this.attachEndpointSafe(conn_s3_detected__rtc_detected_s3_detected__rtc_detected_11, this.RTCSystemCFD.rtc, "detected"); conn_s3_detected__rtc_detected_s3_detected__rtc_detected_11__seen.add("rtc::detected"); }
    this.addConnector(conn_s3_detected__rtc_detected_s3_detected__rtc_detected_11);
    const conn_c2_13 = new Connector("c2");
    const conn_c2_13__seen = new Set();
    if(!conn_c2_13__seen.has("s2::current")) { this.attachEndpointSafe(conn_c2_13, this.RTCSystemCFD.s2, "current"); conn_c2_13__seen.add("s2::current"); }
    this.addConnector(conn_c2_13);
    const conn_s2_current__x_x_s2_current__x_x_14 = new Connector("s2.current__x.x_s2.current__x.x");
    const conn_s2_current__x_x_s2_current__x_x_14__seen = new Set();
    if(!conn_s2_current__x_x_s2_current__x_x_14__seen.has("s2::current")) { this.attachEndpointSafe(conn_s2_current__x_x_s2_current__x_x_14, this.RTCSystemCFD.s2, "current"); conn_s2_current__x_x_s2_current__x_x_14__seen.add("s2::current"); }
    this.addConnector(conn_s2_current__x_x_s2_current__x_x_14);
    const conn_cc1_16 = new Connector("cc1");
    const conn_cc1_16__seen = new Set();
    if(!conn_cc1_16__seen.has("a1::controllerH")) { this.attachEndpointSafe(conn_cc1_16, this.RTCSystemCFD.a1, "controllerH"); conn_cc1_16__seen.add("a1::controllerH"); }
    this.addConnector(conn_cc1_16);
    const conn_x_x__a1_controllerH_x_x__a1_controllerH_17 = new Connector("x.x__a1.controllerH_x.x__a1.controllerH");
    const conn_x_x__a1_controllerH_x_x__a1_controllerH_17__seen = new Set();
    if(!conn_x_x__a1_controllerH_x_x__a1_controllerH_17__seen.has("a1::controllerH")) { this.attachEndpointSafe(conn_x_x__a1_controllerH_x_x__a1_controllerH_17, this.RTCSystemCFD.a1, "controllerH"); conn_x_x__a1_controllerH_x_x__a1_controllerH_17__seen.add("a1::controllerH"); }
    this.addConnector(conn_x_x__a1_controllerH_x_x__a1_controllerH_17);
    const conn_target_19 = new Connector("target");
    const conn_target_19__seen = new Set();
    if(!conn_target_19__seen.has("cm::target2")) { this.attachEndpointSafe(conn_target_19, this.RTCSystemCFD.rtc.cm, "target2"); conn_target_19__seen.add("cm::target2"); }
    this.addConnector(conn_target_19);
    const conn_x_x__cm_target2_x_x__cm_target2_20 = new Connector("x.x__cm.target2_x.x__cm.target2");
    const conn_x_x__cm_target2_x_x__cm_target2_20__seen = new Set();
    if(!conn_x_x__cm_target2_x_x__cm_target2_20__seen.has("cm::target2")) { this.attachEndpointSafe(conn_x_x__cm_target2_x_x__cm_target2_20, this.RTCSystemCFD.rtc.cm, "target2"); conn_x_x__cm_target2_x_x__cm_target2_20__seen.add("cm::target2"); }
    this.addConnector(conn_x_x__cm_target2_x_x__cm_target2_20);
    const conn_average_22 = new Connector("average");
    const conn_average_22__seen = new Set();
    if(!conn_average_22__seen.has("sm::average")) { this.attachEndpointSafe(conn_average_22, this.RTCSystemCFD.rtc.sm, "average"); conn_average_22__seen.add("sm::average"); }
    if(!conn_average_22__seen.has("cm::average2")) { this.attachEndpointSafe(conn_average_22, this.RTCSystemCFD.rtc.cm, "average2"); conn_average_22__seen.add("cm::average2"); }
    this.addConnector(conn_average_22);
    const conn_average_average__average2_average2_average_average__average2_average2_23 = new Connector("average.average__average2.average2_average.average__average2.average2");
    const conn_average_average__average2_average2_average_average__average2_average2_23__seen = new Set();
    if(!conn_average_average__average2_average2_average_average__average2_average2_23__seen.has("sm::average")) { this.attachEndpointSafe(conn_average_average__average2_average2_average_average__average2_average2_23, this.RTCSystemCFD.rtc.sm, "average"); conn_average_average__average2_average2_average_average__average2_average2_23__seen.add("sm::average"); }
    if(!conn_average_average__average2_average2_average_average__average2_average2_23__seen.has("cm::average2")) { this.attachEndpointSafe(conn_average_average__average2_average2_average_average__average2_average2_23, this.RTCSystemCFD.rtc.cm, "average2"); conn_average_average__average2_average2_average_average__average2_average2_23__seen.add("cm::average2"); }
    this.addConnector(conn_average_average__average2_average2_average_average__average2_average2_23);
  }
}

const __portAliases = {};
function createModel(){ return new SysADLModel(); }
module.exports = { createModel, SysADLModel, __portAliases, VT_temperature, VT_FahrenheitTemperature, VT_CelsiusTemperature, EN_Command, DT_Commands, DM_Temperature, UN_Celsius, UN_Fahrenheit, PT_FTemperatureOPT, PT_PresenceIPT, PT_PresenceOPT, PT_CTemperatureIPT, PT_CommandIPT, PT_CommandOPT, PT_CTemperatureOPT };
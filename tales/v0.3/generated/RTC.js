const { Model, Component, Port, CompositePort, Connector, Activity, Action, createExecutableFromExpression } = require('../SysADLBase');
class TemperatureSensorCP extends Component { constructor(name){ super(name); } }
class PresenceSensorCP extends Component { constructor(name){ super(name); } }
class UserInterfaceCP extends Component { constructor(name){ super(name); } }
class CoolerCP extends Component { constructor(name){ super(name); } }
class HeaterCP extends Component { constructor(name){ super(name); } }
class RoomTemperatureControllerCP extends Component { constructor(name){ super(name); } }
class SensorsMonitorCP extends Component { constructor(name){ super(name); } }
class CommanderCP extends Component { constructor(name){ super(name); } }
class PresenceCheckerCP extends Component { constructor(name){ super(name); } }

class SysADLModel extends Model {
  constructor(){
    super("SysADLModel");
    // instantiate components and expose as properties for direct navigation
    this.a1 = new HeaterCP("a1");
    this.addComponent(this.a1);
    this.a2 = new CoolerCP("a2");
    this.addComponent(this.a2);
    this.rtc = new RoomTemperatureControllerCP("rtc");
    this.addComponent(this.rtc);
    this.s1 = new TemperatureSensorCP("s1");
    this.addComponent(this.s1);
    this.s2 = new TemperatureSensorCP("s2");
    this.addComponent(this.s2);
    this.s3 = new PresenceSensorCP("s3");
    this.addComponent(this.s3);
    this.ui = new UserInterfaceCP("ui");
    this.addComponent(this.ui);
    this.rtc.cm = new CommanderCP("cm");
    this.rtc.addComponent(this.rtc.cm);
    this.rtc.pc = new PresenceCheckerCP("pc");
    this.rtc.addComponent(this.rtc.pc);
    this.rtc.sm = new SensorsMonitorCP("sm");
    this.rtc.addComponent(this.rtc.sm);

    // helper to add executable safely
    const __addExec = (ename, body, params) => { try { this.addExecutable(ename, createExecutableFromExpression(String(body||""), params||[])); } catch(e) { /* ignore */ } };
    // helper to attach connector endpoint: expects a concrete component object or expression (no runtime lookup)
    const __attachEndpoint = (conn, compObj, portName) => { try { if (!compObj || !portName) return; if (compObj && compObj.ports && compObj.ports[portName]) conn.addEndpoint(this, compObj.ports[portName]); } catch(e){} };
    // port current on s1 (expr: this.s1)
    if (!this.s1.ports) this.s1.ports = {};
    if (!this.s1.ports["current"]) { const __p = new Port("current", 'in', { owner: "s1" }); this.s1.addPort(__p); }
    // port current on s2 (expr: this.s2)
    if (!this.s2.ports) this.s2.ports = {};
    if (!this.s2.ports["current"]) { const __p = new Port("current", 'in', { owner: "s2" }); this.s2.addPort(__p); }
    // port detected on s3 (expr: this.s3)
    if (!this.s3.ports) this.s3.ports = {};
    if (!this.s3.ports["detected"]) { const __p = new Port("detected", 'in', { owner: "s3" }); this.s3.addPort(__p); }
    // port desired on ui (expr: this.ui)
    if (!this.ui.ports) this.ui.ports = {};
    if (!this.ui.ports["desired"]) { const __p = new Port("desired", 'in', { owner: "ui" }); this.ui.addPort(__p); }
    // port controllerC on a2 (expr: this.a2)
    if (!this.a2.ports) this.a2.ports = {};
    if (!this.a2.ports["controllerC"]) { const __p = new Port("controllerC", 'in', { owner: "a2" }); this.a2.addPort(__p); }
    // port controllerH on a1 (expr: this.a1)
    if (!this.a1.ports) this.a1.ports = {};
    if (!this.a1.ports["controllerH"]) { const __p = new Port("controllerH", 'in', { owner: "a1" }); this.a1.addPort(__p); }
    // port detectedRTC on rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["detectedRTC"]) { const __p = new Port("detectedRTC", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // port localtemp1 on rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["localtemp1"]) { const __p = new Port("localtemp1", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // port localTemp2 on rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["localTemp2"]) { const __p = new Port("localTemp2", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // port userTempRTC on rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["userTempRTC"]) { const __p = new Port("userTempRTC", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // port heatingRTC on rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["heatingRTC"]) { const __p = new Port("heatingRTC", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // port coolingRTC on rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["coolingRTC"]) { const __p = new Port("coolingRTC", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // port s1 on rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["s1"]) { const __p = new Port("s1", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // port s2 on rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["s2"]) { const __p = new Port("s2", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // port average on rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["average"]) { const __p = new Port("average", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // port target2 on rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["target2"]) { const __p = new Port("target2", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // port average2 on rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["average2"]) { const __p = new Port("average2", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // port heating on rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["heating"]) { const __p = new Port("heating", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // port cooling on rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["cooling"]) { const __p = new Port("cooling", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // port detected on rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["detected"]) { const __p = new Port("detected", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // port userTemp on rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["userTemp"]) { const __p = new Port("userTemp", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // port target on rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["target"]) { const __p = new Port("target", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // port s1 on sm (expr: this.rtc.sm)
    if (!this.rtc.sm.ports) this.rtc.sm.ports = {};
    if (!this.rtc.sm.ports["s1"]) { const __p = new Port("s1", 'in', { owner: "sm" }); this.rtc.sm.addPort(__p); }
    // port s2 on sm (expr: this.rtc.sm)
    if (!this.rtc.sm.ports) this.rtc.sm.ports = {};
    if (!this.rtc.sm.ports["s2"]) { const __p = new Port("s2", 'in', { owner: "sm" }); this.rtc.sm.addPort(__p); }
    // port average on sm (expr: this.rtc.sm)
    if (!this.rtc.sm.ports) this.rtc.sm.ports = {};
    if (!this.rtc.sm.ports["average"]) { const __p = new Port("average", 'in', { owner: "sm" }); this.rtc.sm.addPort(__p); }
    // port target2 on cm (expr: this.rtc.cm)
    if (!this.rtc.cm.ports) this.rtc.cm.ports = {};
    if (!this.rtc.cm.ports["target2"]) { const __p = new Port("target2", 'in', { owner: "cm" }); this.rtc.cm.addPort(__p); }
    // port average2 on cm (expr: this.rtc.cm)
    if (!this.rtc.cm.ports) this.rtc.cm.ports = {};
    if (!this.rtc.cm.ports["average2"]) { const __p = new Port("average2", 'in', { owner: "cm" }); this.rtc.cm.addPort(__p); }
    // port heating on cm (expr: this.rtc.cm)
    if (!this.rtc.cm.ports) this.rtc.cm.ports = {};
    if (!this.rtc.cm.ports["heating"]) { const __p = new Port("heating", 'in', { owner: "cm" }); this.rtc.cm.addPort(__p); }
    // port cooling on cm (expr: this.rtc.cm)
    if (!this.rtc.cm.ports) this.rtc.cm.ports = {};
    if (!this.rtc.cm.ports["cooling"]) { const __p = new Port("cooling", 'in', { owner: "cm" }); this.rtc.cm.addPort(__p); }
    // port detected on pc (expr: this.rtc.pc)
    if (!this.rtc.pc.ports) this.rtc.pc.ports = {};
    if (!this.rtc.pc.ports["detected"]) { const __p = new Port("detected", 'in', { owner: "pc" }); this.rtc.pc.addPort(__p); }
    // port userTemp on pc (expr: this.rtc.pc)
    if (!this.rtc.pc.ports) this.rtc.pc.ports = {};
    if (!this.rtc.pc.ports["userTemp"]) { const __p = new Port("userTemp", 'in', { owner: "pc" }); this.rtc.pc.addPort(__p); }
    // port target on pc (expr: this.rtc.pc)
    if (!this.rtc.pc.ports) this.rtc.pc.ports = {};
    if (!this.rtc.pc.ports["target"]) { const __p = new Port("target", 'in', { owner: "pc" }); this.rtc.pc.addPort(__p); }
    // ensure activity ports for s1 (expr: this.s1)
    if (!this.s1.ports) this.s1.ports = {};
    if (!this.s1.ports["current"]) { const __p = new Port("current", 'in', { owner: "s1" }); this.s1.addPort(__p); }
    // ensure activity ports for s2 (expr: this.s2)
    if (!this.s2.ports) this.s2.ports = {};
    if (!this.s2.ports["current"]) { const __p = new Port("current", 'in', { owner: "s2" }); this.s2.addPort(__p); }
    // ensure activity ports for s3 (expr: this.s3)
    if (!this.s3.ports) this.s3.ports = {};
    if (!this.s3.ports["detected"]) { const __p = new Port("detected", 'in', { owner: "s3" }); this.s3.addPort(__p); }
    // ensure activity ports for ui (expr: this.ui)
    if (!this.ui.ports) this.ui.ports = {};
    if (!this.ui.ports["desired"]) { const __p = new Port("desired", 'in', { owner: "ui" }); this.ui.addPort(__p); }
    // ensure activity ports for a2 (expr: this.a2)
    if (!this.a2.ports) this.a2.ports = {};
    if (!this.a2.ports["controllerC"]) { const __p = new Port("controllerC", 'in', { owner: "a2" }); this.a2.addPort(__p); }
    // ensure activity ports for a1 (expr: this.a1)
    if (!this.a1.ports) this.a1.ports = {};
    if (!this.a1.ports["controllerH"]) { const __p = new Port("controllerH", 'in', { owner: "a1" }); this.a1.addPort(__p); }
    // ensure activity ports for rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["s1"]) { const __p = new Port("s1", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // ensure activity ports for sm (expr: this.rtc.sm)
    if (!this.rtc.sm.ports) this.rtc.sm.ports = {};
    if (!this.rtc.sm.ports["s1"]) { const __p = new Port("s1", 'in', { owner: "sm" }); this.rtc.sm.addPort(__p); }
    // ensure activity ports for cm (expr: this.rtc.cm)
    if (!this.rtc.cm.ports) this.rtc.cm.ports = {};
    if (!this.rtc.cm.ports["target2"]) { const __p = new Port("target2", 'in', { owner: "cm" }); this.rtc.cm.addPort(__p); }
    // ensure activity ports for pc (expr: this.rtc.pc)
    if (!this.rtc.pc.ports) this.rtc.pc.ports = {};
    if (!this.rtc.pc.ports["detected"]) { const __p = new Port("detected", 'in', { owner: "pc" }); this.rtc.pc.addPort(__p); }
    // ensure activity ports for s1 (expr: this.s1)
    if (!this.s1.ports) this.s1.ports = {};
    if (!this.s1.ports["current"]) { const __p = new Port("current", 'in', { owner: "s1" }); this.s1.addPort(__p); }
    // ensure activity ports for s2 (expr: this.s2)
    if (!this.s2.ports) this.s2.ports = {};
    if (!this.s2.ports["current"]) { const __p = new Port("current", 'in', { owner: "s2" }); this.s2.addPort(__p); }
    // ensure activity ports for s3 (expr: this.s3)
    if (!this.s3.ports) this.s3.ports = {};
    if (!this.s3.ports["detected"]) { const __p = new Port("detected", 'in', { owner: "s3" }); this.s3.addPort(__p); }
    // ensure activity ports for ui (expr: this.ui)
    if (!this.ui.ports) this.ui.ports = {};
    if (!this.ui.ports["desired"]) { const __p = new Port("desired", 'in', { owner: "ui" }); this.ui.addPort(__p); }
    // ensure activity ports for a2 (expr: this.a2)
    if (!this.a2.ports) this.a2.ports = {};
    if (!this.a2.ports["controllerC"]) { const __p = new Port("controllerC", 'in', { owner: "a2" }); this.a2.addPort(__p); }
    // ensure activity ports for a1 (expr: this.a1)
    if (!this.a1.ports) this.a1.ports = {};
    if (!this.a1.ports["controllerH"]) { const __p = new Port("controllerH", 'in', { owner: "a1" }); this.a1.addPort(__p); }
    // ensure activity ports for rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["detected"]) { const __p = new Port("detected", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // ensure activity ports for sm (expr: this.rtc.sm)
    if (!this.rtc.sm.ports) this.rtc.sm.ports = {};
    if (!this.rtc.sm.ports["s1"]) { const __p = new Port("s1", 'in', { owner: "sm" }); this.rtc.sm.addPort(__p); }
    // ensure activity ports for cm (expr: this.rtc.cm)
    if (!this.rtc.cm.ports) this.rtc.cm.ports = {};
    if (!this.rtc.cm.ports["target2"]) { const __p = new Port("target2", 'in', { owner: "cm" }); this.rtc.cm.addPort(__p); }
    // ensure activity ports for pc (expr: this.rtc.pc)
    if (!this.rtc.pc.ports) this.rtc.pc.ports = {};
    if (!this.rtc.pc.ports["detected"]) { const __p = new Port("detected", 'in', { owner: "pc" }); this.rtc.pc.addPort(__p); }
    // ensure activity ports for s1 (expr: this.s1)
    if (!this.s1.ports) this.s1.ports = {};
    if (!this.s1.ports["current"]) { const __p = new Port("current", 'in', { owner: "s1" }); this.s1.addPort(__p); }
    // ensure activity ports for s2 (expr: this.s2)
    if (!this.s2.ports) this.s2.ports = {};
    if (!this.s2.ports["current"]) { const __p = new Port("current", 'in', { owner: "s2" }); this.s2.addPort(__p); }
    // ensure activity ports for s3 (expr: this.s3)
    if (!this.s3.ports) this.s3.ports = {};
    if (!this.s3.ports["detected"]) { const __p = new Port("detected", 'in', { owner: "s3" }); this.s3.addPort(__p); }
    // ensure activity ports for ui (expr: this.ui)
    if (!this.ui.ports) this.ui.ports = {};
    if (!this.ui.ports["desired"]) { const __p = new Port("desired", 'in', { owner: "ui" }); this.ui.addPort(__p); }
    // ensure activity ports for a2 (expr: this.a2)
    if (!this.a2.ports) this.a2.ports = {};
    if (!this.a2.ports["controllerC"]) { const __p = new Port("controllerC", 'in', { owner: "a2" }); this.a2.addPort(__p); }
    // ensure activity ports for a1 (expr: this.a1)
    if (!this.a1.ports) this.a1.ports = {};
    if (!this.a1.ports["controllerH"]) { const __p = new Port("controllerH", 'in', { owner: "a1" }); this.a1.addPort(__p); }
    // ensure activity ports for rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["average2"]) { const __p = new Port("average2", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // ensure activity ports for sm (expr: this.rtc.sm)
    if (!this.rtc.sm.ports) this.rtc.sm.ports = {};
    if (!this.rtc.sm.ports["average"]) { const __p = new Port("average", 'in', { owner: "sm" }); this.rtc.sm.addPort(__p); }
    // ensure activity ports for cm (expr: this.rtc.cm)
    if (!this.rtc.cm.ports) this.rtc.cm.ports = {};
    if (!this.rtc.cm.ports["average2"]) { const __p = new Port("average2", 'in', { owner: "cm" }); this.rtc.cm.addPort(__p); }
    // ensure activity ports for pc (expr: this.rtc.pc)
    if (!this.rtc.pc.ports) this.rtc.pc.ports = {};
    if (!this.rtc.pc.ports["detected"]) { const __p = new Port("detected", 'in', { owner: "pc" }); this.rtc.pc.addPort(__p); }
    // ensure activity ports for s1 (expr: this.s1)
    if (!this.s1.ports) this.s1.ports = {};
    if (!this.s1.ports["current"]) { const __p = new Port("current", 'in', { owner: "s1" }); this.s1.addPort(__p); }
    // ensure activity ports for s2 (expr: this.s2)
    if (!this.s2.ports) this.s2.ports = {};
    if (!this.s2.ports["current"]) { const __p = new Port("current", 'in', { owner: "s2" }); this.s2.addPort(__p); }
    // ensure activity ports for s3 (expr: this.s3)
    if (!this.s3.ports) this.s3.ports = {};
    if (!this.s3.ports["detected"]) { const __p = new Port("detected", 'in', { owner: "s3" }); this.s3.addPort(__p); }
    // ensure activity ports for ui (expr: this.ui)
    if (!this.ui.ports) this.ui.ports = {};
    if (!this.ui.ports["desired"]) { const __p = new Port("desired", 'in', { owner: "ui" }); this.ui.addPort(__p); }
    // ensure activity ports for a2 (expr: this.a2)
    if (!this.a2.ports) this.a2.ports = {};
    if (!this.a2.ports["controllerC"]) { const __p = new Port("controllerC", 'in', { owner: "a2" }); this.a2.addPort(__p); }
    // ensure activity ports for a1 (expr: this.a1)
    if (!this.a1.ports) this.a1.ports = {};
    if (!this.a1.ports["controllerH"]) { const __p = new Port("controllerH", 'in', { owner: "a1" }); this.a1.addPort(__p); }
    // ensure activity ports for rtc (expr: this.rtc)
    if (!this.rtc.ports) this.rtc.ports = {};
    if (!this.rtc.ports["detectedRTC"]) { const __p = new Port("detectedRTC", 'in', { owner: "rtc" }); this.rtc.addPort(__p); }
    // ensure activity ports for sm (expr: this.rtc.sm)
    if (!this.rtc.sm.ports) this.rtc.sm.ports = {};
    if (!this.rtc.sm.ports["s1"]) { const __p = new Port("s1", 'in', { owner: "sm" }); this.rtc.sm.addPort(__p); }
    // ensure activity ports for cm (expr: this.rtc.cm)
    if (!this.rtc.cm.ports) this.rtc.cm.ports = {};
    if (!this.rtc.cm.ports["target2"]) { const __p = new Port("target2", 'in', { owner: "cm" }); this.rtc.cm.addPort(__p); }
    // ensure activity ports for pc (expr: this.rtc.pc)
    if (!this.rtc.pc.ports) this.rtc.pc.ports = {};
    if (!this.rtc.pc.ports["detected"]) { const __p = new Port("detected", 'in', { owner: "pc" }); this.rtc.pc.addPort(__p); }
    __addExec("SysADLModel.CommandCoolerEx", "executable def CommandCoolerEx(in cmds:Commands): out Command{return cmds->cooler ; }", []);
    __addExec("SysADLModel.CommandHeaterEx", "executable def CommandHeaterEx(in cmds:Commands): out Command{return cmds->heater ; }", []);
    __addExec("SysADLModel.FahrenheitToCelsiusEx", "executable def FahrenheitToCelsiusEx(in f:FahrenheitTemperature): out CelsiusTemperature{return 5*(f - 32)/9 ; }", []);
    __addExec("SysADLModel.CalculateAverageTemperatureEx", "executable def CalculateAverageTemperatureEx(in temp1:CelsiusTemperature,in temp2:CelsiusTemperature):out CelsiusTemperature{return (temp1 + temp2)/2 ; }", []);
    __addExec("SysADLModel.CheckPresenceToSetTemperature", "executable def CheckPresenceToSetTemperature(in presence:Boolean, in userTemp:CelsiusTemperature):out CelsiusTemperature{if(presence == true) return userTemp; else return 2; }", []);
    __addExec("SysADLModel.CompareTemperatureEx", "executable def CompareTemperatureEx(in target:CelsiusTemperature, in average:CelsiusTemperature):out Commands{let heater:Command = types.Command::Off; let cooler:Command = types.Command::Off; if(average > target) {heater = types.Command::Off; cooler = types.Command::On ; } else {heater = types.Command::On; cooler = types.Command::Off ;} }", []);
    __addExec("SysADLModel.v10l", "executable FahrenheitToCelsiusEx to FahrenheitToCelsiusAN", []);
    __addExec("SysADLModel.mces", "executable CompareTemperatureEx to CompareTemperatureAN", []);
    __addExec("SysADLModel.5862", "executable CommandHeaterEx to CommandHeaterAN", []);
    __addExec("SysADLModel.qbo3", "executable CommandCoolerEx to CommandCoolerAN", []);
    __addExec("SysADLModel.hvqn", "executable CheckPresenceToSetTemperature to CheckPeresenceToSetTemperatureAN", []);
    __addExec("SysADLModel.9se1", "executable CalculateAverageTemperatureEx to CalculateAverageTemperatureAN", []);
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
    // connector c1
    const conn_c1_1 = new Connector("c1");
    __attachEndpoint(conn_c1_1, this.s1, "current");
    __attachEndpoint(conn_c1_1, this.s1, "current");
    this.addConnector(conn_c1_1);
    // connector s1.current__x.x_s1.current__x.x
    const conn_s1_current__x_x_s1_current__x_x_2 = new Connector("s1.current__x.x_s1.current__x.x");
    __attachEndpoint(conn_s1_current__x_x_s1_current__x_x_2, this.s1, "current");
    __attachEndpoint(conn_s1_current__x_x_s1_current__x_x_2, this.s1, "current");
    __attachEndpoint(conn_s1_current__x_x_s1_current__x_x_2, this.s1, "current");
    this.addConnector(conn_s1_current__x_x_s1_current__x_x_2);
    // connector s1.current__x.x_s1.current__x.x
    const conn_s1_current__x_x_s1_current__x_x_3 = new Connector("s1.current__x.x_s1.current__x.x");
    __attachEndpoint(conn_s1_current__x_x_s1_current__x_x_3, this.s1, "current");
    __attachEndpoint(conn_s1_current__x_x_s1_current__x_x_3, this.s1, "current");
    __attachEndpoint(conn_s1_current__x_x_s1_current__x_x_3, this.s1, "current");
    this.addConnector(conn_s1_current__x_x_s1_current__x_x_3);
    // connector uc
    const conn_uc_4 = new Connector("uc");
    __attachEndpoint(conn_uc_4, this.ui, "desired");
    __attachEndpoint(conn_uc_4, this.ui, "desired");
    this.addConnector(conn_uc_4);
    // connector ui.desired__x.x_ui.desired__x.x
    const conn_ui_desired__x_x_ui_desired__x_x_5 = new Connector("ui.desired__x.x_ui.desired__x.x");
    __attachEndpoint(conn_ui_desired__x_x_ui_desired__x_x_5, this.ui, "desired");
    __attachEndpoint(conn_ui_desired__x_x_ui_desired__x_x_5, this.ui, "desired");
    __attachEndpoint(conn_ui_desired__x_x_ui_desired__x_x_5, this.ui, "desired");
    this.addConnector(conn_ui_desired__x_x_ui_desired__x_x_5);
    // connector ui.desired__x.x_ui.desired__x.x
    const conn_ui_desired__x_x_ui_desired__x_x_6 = new Connector("ui.desired__x.x_ui.desired__x.x");
    __attachEndpoint(conn_ui_desired__x_x_ui_desired__x_x_6, this.ui, "desired");
    __attachEndpoint(conn_ui_desired__x_x_ui_desired__x_x_6, this.ui, "desired");
    __attachEndpoint(conn_ui_desired__x_x_ui_desired__x_x_6, this.ui, "desired");
    this.addConnector(conn_ui_desired__x_x_ui_desired__x_x_6);
    // connector cc2
    const conn_cc2_7 = new Connector("cc2");
    __attachEndpoint(conn_cc2_7, this.a2, "controllerC");
    __attachEndpoint(conn_cc2_7, this.a2, "controllerC");
    this.addConnector(conn_cc2_7);
    // connector x.x__a2.controllerC_x.x__a2.controllerC
    const conn_x_x__a2_controllerC_x_x__a2_controllerC_8 = new Connector("x.x__a2.controllerC_x.x__a2.controllerC");
    __attachEndpoint(conn_x_x__a2_controllerC_x_x__a2_controllerC_8, this.a2, "controllerC");
    __attachEndpoint(conn_x_x__a2_controllerC_x_x__a2_controllerC_8, this.a2, "controllerC");
    __attachEndpoint(conn_x_x__a2_controllerC_x_x__a2_controllerC_8, this.a2, "controllerC");
    this.addConnector(conn_x_x__a2_controllerC_x_x__a2_controllerC_8);
    // connector x.x__a2.controllerC_x.x__a2.controllerC
    const conn_x_x__a2_controllerC_x_x__a2_controllerC_9 = new Connector("x.x__a2.controllerC_x.x__a2.controllerC");
    __attachEndpoint(conn_x_x__a2_controllerC_x_x__a2_controllerC_9, this.a2, "controllerC");
    __attachEndpoint(conn_x_x__a2_controllerC_x_x__a2_controllerC_9, this.a2, "controllerC");
    __attachEndpoint(conn_x_x__a2_controllerC_x_x__a2_controllerC_9, this.a2, "controllerC");
    this.addConnector(conn_x_x__a2_controllerC_x_x__a2_controllerC_9);
    // connector pc
    const conn_pc_10 = new Connector("pc");
    __attachEndpoint(conn_pc_10, this.s3, "detected");
    __attachEndpoint(conn_pc_10, this.rtc, "detected");
    __attachEndpoint(conn_pc_10, this.s3, "detected");
    __attachEndpoint(conn_pc_10, this.rtc, "detected");
    this.addConnector(conn_pc_10);
    // connector s3.detected__rtc.detected_s3.detected__rtc.detected
    const conn_s3_detected__rtc_detected_s3_detected__rtc_detected_11 = new Connector("s3.detected__rtc.detected_s3.detected__rtc.detected");
    __attachEndpoint(conn_s3_detected__rtc_detected_s3_detected__rtc_detected_11, this.s3, "detected");
    __attachEndpoint(conn_s3_detected__rtc_detected_s3_detected__rtc_detected_11, this.rtc, "detected");
    __attachEndpoint(conn_s3_detected__rtc_detected_s3_detected__rtc_detected_11, this.s3, "detected");
    __attachEndpoint(conn_s3_detected__rtc_detected_s3_detected__rtc_detected_11, this.rtc, "detected");
    __attachEndpoint(conn_s3_detected__rtc_detected_s3_detected__rtc_detected_11, this.s3, "detected");
    __attachEndpoint(conn_s3_detected__rtc_detected_s3_detected__rtc_detected_11, this.rtc, "detected");
    this.addConnector(conn_s3_detected__rtc_detected_s3_detected__rtc_detected_11);
    // connector s3.detected__rtc.detected_s3.detected__rtc.detected
    const conn_s3_detected__rtc_detected_s3_detected__rtc_detected_12 = new Connector("s3.detected__rtc.detected_s3.detected__rtc.detected");
    __attachEndpoint(conn_s3_detected__rtc_detected_s3_detected__rtc_detected_12, this.s3, "detected");
    __attachEndpoint(conn_s3_detected__rtc_detected_s3_detected__rtc_detected_12, this.rtc, "detected");
    __attachEndpoint(conn_s3_detected__rtc_detected_s3_detected__rtc_detected_12, this.s3, "detected");
    __attachEndpoint(conn_s3_detected__rtc_detected_s3_detected__rtc_detected_12, this.rtc, "detected");
    __attachEndpoint(conn_s3_detected__rtc_detected_s3_detected__rtc_detected_12, this.s3, "detected");
    __attachEndpoint(conn_s3_detected__rtc_detected_s3_detected__rtc_detected_12, this.rtc, "detected");
    this.addConnector(conn_s3_detected__rtc_detected_s3_detected__rtc_detected_12);
    // connector c2
    const conn_c2_13 = new Connector("c2");
    __attachEndpoint(conn_c2_13, this.s2, "current");
    __attachEndpoint(conn_c2_13, this.s2, "current");
    this.addConnector(conn_c2_13);
    // connector s2.current__x.x_s2.current__x.x
    const conn_s2_current__x_x_s2_current__x_x_14 = new Connector("s2.current__x.x_s2.current__x.x");
    __attachEndpoint(conn_s2_current__x_x_s2_current__x_x_14, this.s2, "current");
    __attachEndpoint(conn_s2_current__x_x_s2_current__x_x_14, this.s2, "current");
    __attachEndpoint(conn_s2_current__x_x_s2_current__x_x_14, this.s2, "current");
    this.addConnector(conn_s2_current__x_x_s2_current__x_x_14);
    // connector s2.current__x.x_s2.current__x.x
    const conn_s2_current__x_x_s2_current__x_x_15 = new Connector("s2.current__x.x_s2.current__x.x");
    __attachEndpoint(conn_s2_current__x_x_s2_current__x_x_15, this.s2, "current");
    __attachEndpoint(conn_s2_current__x_x_s2_current__x_x_15, this.s2, "current");
    __attachEndpoint(conn_s2_current__x_x_s2_current__x_x_15, this.s2, "current");
    this.addConnector(conn_s2_current__x_x_s2_current__x_x_15);
    // connector cc1
    const conn_cc1_16 = new Connector("cc1");
    __attachEndpoint(conn_cc1_16, this.a1, "controllerH");
    __attachEndpoint(conn_cc1_16, this.a1, "controllerH");
    this.addConnector(conn_cc1_16);
    // connector x.x__a1.controllerH_x.x__a1.controllerH
    const conn_x_x__a1_controllerH_x_x__a1_controllerH_17 = new Connector("x.x__a1.controllerH_x.x__a1.controllerH");
    __attachEndpoint(conn_x_x__a1_controllerH_x_x__a1_controllerH_17, this.a1, "controllerH");
    __attachEndpoint(conn_x_x__a1_controllerH_x_x__a1_controllerH_17, this.a1, "controllerH");
    __attachEndpoint(conn_x_x__a1_controllerH_x_x__a1_controllerH_17, this.a1, "controllerH");
    this.addConnector(conn_x_x__a1_controllerH_x_x__a1_controllerH_17);
    // connector x.x__a1.controllerH_x.x__a1.controllerH
    const conn_x_x__a1_controllerH_x_x__a1_controllerH_18 = new Connector("x.x__a1.controllerH_x.x__a1.controllerH");
    __attachEndpoint(conn_x_x__a1_controllerH_x_x__a1_controllerH_18, this.a1, "controllerH");
    __attachEndpoint(conn_x_x__a1_controllerH_x_x__a1_controllerH_18, this.a1, "controllerH");
    __attachEndpoint(conn_x_x__a1_controllerH_x_x__a1_controllerH_18, this.a1, "controllerH");
    this.addConnector(conn_x_x__a1_controllerH_x_x__a1_controllerH_18);
    // connector target
    const conn_target_19 = new Connector("target");
    __attachEndpoint(conn_target_19, this.rtc.cm, "target2");
    __attachEndpoint(conn_target_19, this.rtc.cm, "target2");
    this.addConnector(conn_target_19);
    // connector x.x__cm.target2_x.x__cm.target2
    const conn_x_x__cm_target2_x_x__cm_target2_20 = new Connector("x.x__cm.target2_x.x__cm.target2");
    __attachEndpoint(conn_x_x__cm_target2_x_x__cm_target2_20, this.rtc.cm, "target2");
    __attachEndpoint(conn_x_x__cm_target2_x_x__cm_target2_20, this.rtc.cm, "target2");
    __attachEndpoint(conn_x_x__cm_target2_x_x__cm_target2_20, this.rtc.cm, "target2");
    this.addConnector(conn_x_x__cm_target2_x_x__cm_target2_20);
    // connector x.x__cm.target2_x.x__cm.target2
    const conn_x_x__cm_target2_x_x__cm_target2_21 = new Connector("x.x__cm.target2_x.x__cm.target2");
    __attachEndpoint(conn_x_x__cm_target2_x_x__cm_target2_21, this.rtc.cm, "target2");
    __attachEndpoint(conn_x_x__cm_target2_x_x__cm_target2_21, this.rtc.cm, "target2");
    __attachEndpoint(conn_x_x__cm_target2_x_x__cm_target2_21, this.rtc.cm, "target2");
    this.addConnector(conn_x_x__cm_target2_x_x__cm_target2_21);
    // connector average
    const conn_average_22 = new Connector("average");
    __attachEndpoint(conn_average_22, this.rtc.sm, "average");
    __attachEndpoint(conn_average_22, this.rtc.cm, "average2");
    this.addConnector(conn_average_22);
    // connector average.average__average2.average2_average.average__average2.average2
    const conn_average_average__average2_average2_average_average__average2_average2_23 = new Connector("average.average__average2.average2_average.average__average2.average2");
    __attachEndpoint(conn_average_average__average2_average2_average_average__average2_average2_23, this.rtc.sm, "average");
    __attachEndpoint(conn_average_average__average2_average2_average_average__average2_average2_23, this.rtc.cm, "average2");
    __attachEndpoint(conn_average_average__average2_average2_average_average__average2_average2_23, this.rtc.sm, "average");
    __attachEndpoint(conn_average_average__average2_average2_average_average__average2_average2_23, this.rtc.cm, "average2");
    this.addConnector(conn_average_average__average2_average2_average_average__average2_average2_23);
    // connector average.average__average2.average2_average.average__average2.average2
    const conn_average_average__average2_average2_average_average__average2_average2_24 = new Connector("average.average__average2.average2_average.average__average2.average2");
    __attachEndpoint(conn_average_average__average2_average2_average_average__average2_average2_24, this.rtc.sm, "average");
    __attachEndpoint(conn_average_average__average2_average2_average_average__average2_average2_24, this.rtc.cm, "average2");
    __attachEndpoint(conn_average_average__average2_average2_average_average__average2_average2_24, this.rtc.sm, "average");
    __attachEndpoint(conn_average_average__average2_average2_average_average__average2_average2_24, this.rtc.cm, "average2");
    this.addConnector(conn_average_average__average2_average2_average_average__average2_average2_24);
  }
}

function createModel(){ return new SysADLModel(); }
module.exports = { createModel, SysADLModel };
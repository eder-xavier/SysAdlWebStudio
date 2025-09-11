const { Model, Component, Port, CompositePort, Connector, Activity, Action, createExecutableFromExpression } = require('../SysADLBase');
class SensorCP extends Component { constructor(name){ super(name); } }
class TempMonitorCP extends Component { constructor(name){ super(name); } }
class StdOutCP extends Component { constructor(name){ super(name); } }
class SystemCP extends Component { constructor(name){ super(name); } }

class SysADLModel extends Model {
  constructor(){
    super("SysADLModel");
    // instantiate components and expose as properties for direct navigation
    this.SystemCP = new SystemCP("SystemCP");
    this.addComponent(this.SystemCP);
    this.SystemCP.s1 = new SensorCP("s1");
    this.SystemCP.addComponent(this.SystemCP.s1);
    this.SystemCP.s2 = new SensorCP("s2");
    this.SystemCP.addComponent(this.SystemCP.s2);
    this.SystemCP.stdOut = new StdOutCP("stdOut");
    this.SystemCP.addComponent(this.SystemCP.stdOut);
    this.SystemCP.tempMon = new TempMonitorCP("tempMon");
    this.SystemCP.addComponent(this.SystemCP.tempMon);

    // Note: uses runtime helpers addExecutableSafe and attachEndpointSafe provided by SysADLBase
    // port current on s1 (expr: this.SystemCP.s1)
    if (!this.SystemCP.s1.ports["current"]) { const __p = new Port("current", 'in', { owner: "s1" }); this.SystemCP.s1.addPort(__p); }
    // port current on s2 (expr: this.SystemCP.s2)
    if (!this.SystemCP.s2.ports["current"]) { const __p = new Port("current", 'in', { owner: "s2" }); this.SystemCP.s2.addPort(__p); }
    // port s1 on tempMon (expr: this.SystemCP.tempMon)
    if (!this.SystemCP.tempMon.ports["s1"]) { const __p = new Port("s1", 'in', { owner: "tempMon" }); this.SystemCP.tempMon.addPort(__p); }
    // port s2 on tempMon (expr: this.SystemCP.tempMon)
    if (!this.SystemCP.tempMon.ports["s2"]) { const __p = new Port("s2", 'in', { owner: "tempMon" }); this.SystemCP.tempMon.addPort(__p); }
    // port average on tempMon (expr: this.SystemCP.tempMon)
    if (!this.SystemCP.tempMon.ports["average"]) { const __p = new Port("average", 'in', { owner: "tempMon" }); this.SystemCP.tempMon.addPort(__p); }
    // port c3 on stdOut (expr: this.SystemCP.stdOut)
    if (!this.SystemCP.stdOut.ports["c3"]) { const __p = new Port("c3", 'in', { owner: "stdOut" }); this.SystemCP.stdOut.addPort(__p); }
    // ensure activity ports for s1 (expr: this.SystemCP.s1)
    // ensure activity ports for s2 (expr: this.SystemCP.s2)
    // ensure activity ports for tempMon (expr: this.SystemCP.tempMon)
    // ensure activity ports for stdOut (expr: this.SystemCP.stdOut)
    // ensure activity ports for tempMon (expr: this.SystemCP.tempMon)
    this.addExecutableSafe("SysADLModel.FarToCelEX", "executable def FarToCelEX (in f:Real): out Real {\n\t\treturn 5*(f - 32)/9 ;\n\t}", []);
    this.addExecutableSafe("SysADLModel.CalcAverageEX", "executable def CalcAverageEX(in temp1:Real,in temp2:Real):out Real{\n\t\treturn (temp1 + temp2)/2 ;\n\t}", []);
    this.addExecutableSafe("SysADLModel.4emc", "executable FarToCelEX to FarToCelAN", []);
    this.addExecutableSafe("SysADLModel.zk5w", "executable CalcAverageEX to TempMonitorAN", []);
    const act_FarToCelAC_s1 = new Activity("FarToCelAC", { component: "s1", inputPorts: ["current"] });
    act_FarToCelAC_s1.addAction(new Action("FarToCelAN", [], "FarToCelEX"));
    this.registerActivity("FarToCelAC::s1", act_FarToCelAC_s1);
    const act_FarToCelAC_s2 = new Activity("FarToCelAC", { component: "s2", inputPorts: ["current"] });
    act_FarToCelAC_s2.addAction(new Action("FarToCelAN", [], "FarToCelEX"));
    this.registerActivity("FarToCelAC::s2", act_FarToCelAC_s2);
    const act_FarToCelAC_tempMon = new Activity("FarToCelAC", { component: "tempMon", inputPorts: ["s1"] });
    act_FarToCelAC_tempMon.addAction(new Action("FarToCelAN", [], "FarToCelEX"));
    this.registerActivity("FarToCelAC::tempMon", act_FarToCelAC_tempMon);
    const act_FarToCelAC_stdOut = new Activity("FarToCelAC", { component: "stdOut", inputPorts: ["c3"] });
    act_FarToCelAC_stdOut.addAction(new Action("FarToCelAN", [], "FarToCelEX"));
    this.registerActivity("FarToCelAC::stdOut", act_FarToCelAC_stdOut);
    const act_TempMonitorAC_tempMon = new Activity("TempMonitorAC", { component: "tempMon", inputPorts: ["s1"] });
    act_TempMonitorAC_tempMon.addAction(new Action("TempMonitorAN", [], "CalcAverageEX"));
    this.registerActivity("TempMonitorAC::tempMon", act_TempMonitorAC_tempMon);
    // connector c1
    const conn_c1_1 = new Connector("c1");
    const conn_c1_1__seen = new Set();
    if(!conn_c1_1__seen.has("s1::current")) { this.attachEndpointSafe(conn_c1_1, this.SystemCP.s1, "current"); conn_c1_1__seen.add("s1::current"); }
    if(!conn_c1_1__seen.has("tempMon::s1")) { this.attachEndpointSafe(conn_c1_1, this.SystemCP.tempMon, "s1"); conn_c1_1__seen.add("tempMon::s1"); }
    this.addConnector(conn_c1_1);
    // connector s1.current__tempMon.s1_s1.current__tempMon.s1
    const conn_s1_current__tempMon_s1_s1_current__tempMon_s1_2 = new Connector("s1.current__tempMon.s1_s1.current__tempMon.s1");
    const conn_s1_current__tempMon_s1_s1_current__tempMon_s1_2__seen = new Set();
    if(!conn_s1_current__tempMon_s1_s1_current__tempMon_s1_2__seen.has("s1::current")) { this.attachEndpointSafe(conn_s1_current__tempMon_s1_s1_current__tempMon_s1_2, this.SystemCP.s1, "current"); conn_s1_current__tempMon_s1_s1_current__tempMon_s1_2__seen.add("s1::current"); }
    if(!conn_s1_current__tempMon_s1_s1_current__tempMon_s1_2__seen.has("tempMon::s1")) { this.attachEndpointSafe(conn_s1_current__tempMon_s1_s1_current__tempMon_s1_2, this.SystemCP.tempMon, "s1"); conn_s1_current__tempMon_s1_s1_current__tempMon_s1_2__seen.add("tempMon::s1"); }
    this.addConnector(conn_s1_current__tempMon_s1_s1_current__tempMon_s1_2);
    // connector c2
    const conn_c2_4 = new Connector("c2");
    const conn_c2_4__seen = new Set();
    if(!conn_c2_4__seen.has("s2::current")) { this.attachEndpointSafe(conn_c2_4, this.SystemCP.s2, "current"); conn_c2_4__seen.add("s2::current"); }
    if(!conn_c2_4__seen.has("tempMon::s1")) { this.attachEndpointSafe(conn_c2_4, this.SystemCP.tempMon, "s1"); conn_c2_4__seen.add("tempMon::s1"); }
    this.addConnector(conn_c2_4);
    // connector s2.current__x.x_s2.current__x.x
    const conn_s2_current__x_x_s2_current__x_x_5 = new Connector("s2.current__x.x_s2.current__x.x");
    const conn_s2_current__x_x_s2_current__x_x_5__seen = new Set();
    if(!conn_s2_current__x_x_s2_current__x_x_5__seen.has("s2::current")) { this.attachEndpointSafe(conn_s2_current__x_x_s2_current__x_x_5, this.SystemCP.s2, "current"); conn_s2_current__x_x_s2_current__x_x_5__seen.add("s2::current"); }
    if(!conn_s2_current__x_x_s2_current__x_x_5__seen.has("tempMon::s1")) { this.attachEndpointSafe(conn_s2_current__x_x_s2_current__x_x_5, this.SystemCP.tempMon, "s1"); conn_s2_current__x_x_s2_current__x_x_5__seen.add("tempMon::s1"); }
    if(!conn_s2_current__x_x_s2_current__x_x_5__seen.has("tempMon::s2")) { this.attachEndpointSafe(conn_s2_current__x_x_s2_current__x_x_5, this.SystemCP.tempMon, "s2"); conn_s2_current__x_x_s2_current__x_x_5__seen.add("tempMon::s2"); }
    this.addConnector(conn_s2_current__x_x_s2_current__x_x_5);
    // connector c3
    const conn_c3_7 = new Connector("c3");
    const conn_c3_7__seen = new Set();
    if(!conn_c3_7__seen.has("stdOut::c3")) { this.attachEndpointSafe(conn_c3_7, this.SystemCP.stdOut, "c3"); conn_c3_7__seen.add("stdOut::c3"); }
    if(!conn_c3_7__seen.has("s1::current")) { this.attachEndpointSafe(conn_c3_7, this.SystemCP.s1, "current"); conn_c3_7__seen.add("s1::current"); }
    this.addConnector(conn_c3_7);
    // connector x.x__stdOut.c3_x.x__stdOut.c3
    const conn_x_x__stdOut_c3_x_x__stdOut_c3_8 = new Connector("x.x__stdOut.c3_x.x__stdOut.c3");
    const conn_x_x__stdOut_c3_x_x__stdOut_c3_8__seen = new Set();
    if(!conn_x_x__stdOut_c3_x_x__stdOut_c3_8__seen.has("stdOut::c3")) { this.attachEndpointSafe(conn_x_x__stdOut_c3_x_x__stdOut_c3_8, this.SystemCP.stdOut, "c3"); conn_x_x__stdOut_c3_x_x__stdOut_c3_8__seen.add("stdOut::c3"); }
    if(!conn_x_x__stdOut_c3_x_x__stdOut_c3_8__seen.has("s1::current")) { this.attachEndpointSafe(conn_x_x__stdOut_c3_x_x__stdOut_c3_8, this.SystemCP.s1, "current"); conn_x_x__stdOut_c3_x_x__stdOut_c3_8__seen.add("s1::current"); }
    if(!conn_x_x__stdOut_c3_x_x__stdOut_c3_8__seen.has("s2::current")) { this.attachEndpointSafe(conn_x_x__stdOut_c3_x_x__stdOut_c3_8, this.SystemCP.s2, "current"); conn_x_x__stdOut_c3_x_x__stdOut_c3_8__seen.add("s2::current"); }
    this.addConnector(conn_x_x__stdOut_c3_x_x__stdOut_c3_8);
  }
}

const __portAliases = {};
function createModel(){ return new SysADLModel(); }
module.exports = { createModel, SysADLModel, __portAliases };
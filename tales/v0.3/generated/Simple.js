const { Model, Component, Port, CompositePort, Connector, Activity, Action, createExecutableFromExpression } = require('../SysADLBase');
class SensorCP extends Component { constructor(name){ super(name); } }
class TempMonitorCP extends Component { constructor(name){ super(name); } }
class StdOutCP extends Component { constructor(name){ super(name); } }

class SysADLModel extends Model {
  constructor(){
    super("SysADLModel");
    // instantiate components and expose as properties for direct navigation
    this.s1 = new SensorCP("s1");
    this.addComponent(this.s1);
    this.s2 = new SensorCP("s2");
    this.addComponent(this.s2);
    this.stdOut = new StdOutCP("stdOut");
    this.addComponent(this.stdOut);
    this.tempMon = new TempMonitorCP("tempMon");
    this.addComponent(this.tempMon);

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
    // port s1 on tempMon (expr: this.tempMon)
    if (!this.tempMon.ports) this.tempMon.ports = {};
    if (!this.tempMon.ports["s1"]) { const __p = new Port("s1", 'in', { owner: "tempMon" }); this.tempMon.addPort(__p); }
    // port s2 on tempMon (expr: this.tempMon)
    if (!this.tempMon.ports) this.tempMon.ports = {};
    if (!this.tempMon.ports["s2"]) { const __p = new Port("s2", 'in', { owner: "tempMon" }); this.tempMon.addPort(__p); }
    // port average on tempMon (expr: this.tempMon)
    if (!this.tempMon.ports) this.tempMon.ports = {};
    if (!this.tempMon.ports["average"]) { const __p = new Port("average", 'in', { owner: "tempMon" }); this.tempMon.addPort(__p); }
    // port c3 on stdOut (expr: this.stdOut)
    if (!this.stdOut.ports) this.stdOut.ports = {};
    if (!this.stdOut.ports["c3"]) { const __p = new Port("c3", 'in', { owner: "stdOut" }); this.stdOut.addPort(__p); }
    // ensure activity ports for s1 (expr: this.s1)
    if (!this.s1.ports) this.s1.ports = {};
    if (!this.s1.ports["current"]) { const __p = new Port("current", 'in', { owner: "s1" }); this.s1.addPort(__p); }
    // ensure activity ports for s2 (expr: this.s2)
    if (!this.s2.ports) this.s2.ports = {};
    if (!this.s2.ports["current"]) { const __p = new Port("current", 'in', { owner: "s2" }); this.s2.addPort(__p); }
    // ensure activity ports for tempMon (expr: this.tempMon)
    if (!this.tempMon.ports) this.tempMon.ports = {};
    if (!this.tempMon.ports["s1"]) { const __p = new Port("s1", 'in', { owner: "tempMon" }); this.tempMon.addPort(__p); }
    // ensure activity ports for stdOut (expr: this.stdOut)
    if (!this.stdOut.ports) this.stdOut.ports = {};
    if (!this.stdOut.ports["c3"]) { const __p = new Port("c3", 'in', { owner: "stdOut" }); this.stdOut.addPort(__p); }
    // ensure activity ports for tempMon (expr: this.tempMon)
    if (!this.tempMon.ports) this.tempMon.ports = {};
    if (!this.tempMon.ports["s1"]) { const __p = new Port("s1", 'in', { owner: "tempMon" }); this.tempMon.addPort(__p); }
    __addExec("SysADLModel.FarToCelEX", "executable def FarToCelEX (in f:Real): out Real {\n\t\treturn 5*(f - 32)/9 ;\n\t}", []);
    __addExec("SysADLModel.CalcAverageEX", "executable def CalcAverageEX(in temp1:Real,in temp2:Real):out Real{\n\t\treturn (temp1 + temp2)/2 ;\n\t}", []);
    __addExec("SysADLModel.wj6p", "executable FarToCelEX to FarToCelAN", []);
    __addExec("SysADLModel.wwl2", "executable CalcAverageEX to TempMonitorAN", []);
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
    __attachEndpoint(conn_c1_1, this.s1, "current");
    __attachEndpoint(conn_c1_1, this.tempMon, "s1");
    __attachEndpoint(conn_c1_1, this.s1, "current");
    __attachEndpoint(conn_c1_1, this.tempMon, "s1");
    this.addConnector(conn_c1_1);
    // connector s1.current__tempMon.s1_s1.current__tempMon.s1
    const conn_s1_current__tempMon_s1_s1_current__tempMon_s1_2 = new Connector("s1.current__tempMon.s1_s1.current__tempMon.s1");
    __attachEndpoint(conn_s1_current__tempMon_s1_s1_current__tempMon_s1_2, this.s1, "current");
    __attachEndpoint(conn_s1_current__tempMon_s1_s1_current__tempMon_s1_2, this.tempMon, "s1");
    __attachEndpoint(conn_s1_current__tempMon_s1_s1_current__tempMon_s1_2, this.s1, "current");
    __attachEndpoint(conn_s1_current__tempMon_s1_s1_current__tempMon_s1_2, this.tempMon, "s1");
    __attachEndpoint(conn_s1_current__tempMon_s1_s1_current__tempMon_s1_2, this.s1, "current");
    __attachEndpoint(conn_s1_current__tempMon_s1_s1_current__tempMon_s1_2, this.tempMon, "s1");
    this.addConnector(conn_s1_current__tempMon_s1_s1_current__tempMon_s1_2);
    // connector s1.current__tempMon.s1_s1.current__tempMon.s1
    const conn_s1_current__tempMon_s1_s1_current__tempMon_s1_3 = new Connector("s1.current__tempMon.s1_s1.current__tempMon.s1");
    __attachEndpoint(conn_s1_current__tempMon_s1_s1_current__tempMon_s1_3, this.s1, "current");
    __attachEndpoint(conn_s1_current__tempMon_s1_s1_current__tempMon_s1_3, this.tempMon, "s1");
    __attachEndpoint(conn_s1_current__tempMon_s1_s1_current__tempMon_s1_3, this.s1, "current");
    __attachEndpoint(conn_s1_current__tempMon_s1_s1_current__tempMon_s1_3, this.tempMon, "s1");
    __attachEndpoint(conn_s1_current__tempMon_s1_s1_current__tempMon_s1_3, this.s1, "current");
    __attachEndpoint(conn_s1_current__tempMon_s1_s1_current__tempMon_s1_3, this.tempMon, "s1");
    this.addConnector(conn_s1_current__tempMon_s1_s1_current__tempMon_s1_3);
    // connector c2
    const conn_c2_4 = new Connector("c2");
    __attachEndpoint(conn_c2_4, this.s2, "current");
    __attachEndpoint(conn_c2_4, this.s2, "current");
    __attachEndpoint(conn_c2_4, this.tempMon, "s1");
    this.addConnector(conn_c2_4);
    // connector s2.current__x.x_s2.current__x.x
    const conn_s2_current__x_x_s2_current__x_x_5 = new Connector("s2.current__x.x_s2.current__x.x");
    __attachEndpoint(conn_s2_current__x_x_s2_current__x_x_5, this.s2, "current");
    __attachEndpoint(conn_s2_current__x_x_s2_current__x_x_5, this.s2, "current");
    __attachEndpoint(conn_s2_current__x_x_s2_current__x_x_5, this.tempMon, "s1");
    __attachEndpoint(conn_s2_current__x_x_s2_current__x_x_5, this.s2, "current");
    __attachEndpoint(conn_s2_current__x_x_s2_current__x_x_5, this.tempMon, "s2");
    this.addConnector(conn_s2_current__x_x_s2_current__x_x_5);
    // connector s2.current__x.x_s2.current__x.x
    const conn_s2_current__x_x_s2_current__x_x_6 = new Connector("s2.current__x.x_s2.current__x.x");
    __attachEndpoint(conn_s2_current__x_x_s2_current__x_x_6, this.s2, "current");
    __attachEndpoint(conn_s2_current__x_x_s2_current__x_x_6, this.s2, "current");
    __attachEndpoint(conn_s2_current__x_x_s2_current__x_x_6, this.tempMon, "s1");
    __attachEndpoint(conn_s2_current__x_x_s2_current__x_x_6, this.s2, "current");
    __attachEndpoint(conn_s2_current__x_x_s2_current__x_x_6, this.tempMon, "s2");
    this.addConnector(conn_s2_current__x_x_s2_current__x_x_6);
    // connector c3
    const conn_c3_7 = new Connector("c3");
    __attachEndpoint(conn_c3_7, this.stdOut, "c3");
    __attachEndpoint(conn_c3_7, this.s1, "current");
    __attachEndpoint(conn_c3_7, this.stdOut, "c3");
    this.addConnector(conn_c3_7);
    // connector x.x__stdOut.c3_x.x__stdOut.c3
    const conn_x_x__stdOut_c3_x_x__stdOut_c3_8 = new Connector("x.x__stdOut.c3_x.x__stdOut.c3");
    __attachEndpoint(conn_x_x__stdOut_c3_x_x__stdOut_c3_8, this.stdOut, "c3");
    __attachEndpoint(conn_x_x__stdOut_c3_x_x__stdOut_c3_8, this.s1, "current");
    __attachEndpoint(conn_x_x__stdOut_c3_x_x__stdOut_c3_8, this.stdOut, "c3");
    __attachEndpoint(conn_x_x__stdOut_c3_x_x__stdOut_c3_8, this.s2, "current");
    __attachEndpoint(conn_x_x__stdOut_c3_x_x__stdOut_c3_8, this.stdOut, "c3");
    this.addConnector(conn_x_x__stdOut_c3_x_x__stdOut_c3_8);
    // connector x.x__stdOut.c3_x.x__stdOut.c3
    const conn_x_x__stdOut_c3_x_x__stdOut_c3_9 = new Connector("x.x__stdOut.c3_x.x__stdOut.c3");
    __attachEndpoint(conn_x_x__stdOut_c3_x_x__stdOut_c3_9, this.stdOut, "c3");
    __attachEndpoint(conn_x_x__stdOut_c3_x_x__stdOut_c3_9, this.s1, "current");
    __attachEndpoint(conn_x_x__stdOut_c3_x_x__stdOut_c3_9, this.stdOut, "c3");
    __attachEndpoint(conn_x_x__stdOut_c3_x_x__stdOut_c3_9, this.s2, "current");
    __attachEndpoint(conn_x_x__stdOut_c3_x_x__stdOut_c3_9, this.stdOut, "c3");
    this.addConnector(conn_x_x__stdOut_c3_x_x__stdOut_c3_9);
  }
}

function createModel(){ return new SysADLModel(); }
module.exports = { createModel, SysADLModel };
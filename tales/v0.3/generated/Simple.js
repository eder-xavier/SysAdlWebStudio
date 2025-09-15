const { Model, Component, Port, SimplePort, CompositePort, Connector, Activity, Action, createExecutableFromExpression, Enum, Int, Boolean, String, Real, Void, valueType, dataType, dimension, unit } = require('../SysADLBase');


// Ports
class PT_CTempIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Real" }, ...opts });
  }
}
class PT_CTempOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "Real" }, ...opts });
  }
}
class PT_FTempOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Real" }, ...opts });
  }
}

// Connectors
class CN_FarToCelCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from f to undefined
  }
}
class CN_CelToCelCN extends Connector {
  constructor(name, opts = {}) {
    super(name, opts);
    // Flows: Flow from c1 to undefined
  }
}

// Components
class CP_SensorCP extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_FTempOPT("current", "in", { owner: name }));
    }
}
class CP_TempMonitorCP extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_CTempIPT("s1", "in", { owner: name }));
      this.addPort(new PT_CTempIPT("s2", "in", { owner: name }));
      this.addPort(new PT_CTempOPT("average", "out", { owner: name }));
    }
}
class CP_StdOutCP extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_CTempIPT("c3", "in", { owner: name }));
    }
}
class CP_SystemCP extends Component { }

class SysADLModel extends Model {
  constructor(){
    super("SysADLModel");
    this.SystemCP = new CP_SystemCP("SystemCP", { sysadlDefinition: "SystemCP" });
    this.addComponent(this.SystemCP);
    this.SystemCP.s1 = new CP_SensorCP("s1", { isBoundary: true, sysadlDefinition: "SensorCP" });
    this.SystemCP.addComponent(this.SystemCP.s1);
    this.SystemCP.s2 = new CP_SensorCP("s2", { isBoundary: true, sysadlDefinition: "SensorCP" });
    this.SystemCP.addComponent(this.SystemCP.s2);
    this.SystemCP.stdOut = new CP_StdOutCP("stdOut", { isBoundary: true, sysadlDefinition: "StdOutCP" });
    this.SystemCP.addComponent(this.SystemCP.stdOut);
    this.SystemCP.tempMon = new CP_TempMonitorCP("tempMon", { sysadlDefinition: "TempMonitorCP" });
    this.SystemCP.addComponent(this.SystemCP.tempMon);

    this.addExecutableSafe("SysADLModel.FarToCelEX", "executable def FarToCelEX (in f:Real): out Real {\n\t\treturn 5*(f - 32)/9 ;\n\t}", []);
    this.addExecutableSafe("SysADLModel.CalcAverageEX", "executable def CalcAverageEX(in temp1:Real,in temp2:Real):out Real{\n\t\treturn (temp1 + temp2)/2 ;\n\t}", []);
    this.addExecutableSafe("SysADLModel.zrxw", "executable FarToCelEX to FarToCelAN", []);
    this.addExecutableSafe("SysADLModel.84ij", "executable CalcAverageEX to TempMonitorAN", []);
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
    const CN_c1_1 = new CN_FarToCelCN("c1");
    this.addConnector(CN_c1_1);
    const CN_c2_4 = new CN_FarToCelCN("c2");
    this.addConnector(CN_c2_4);
    const CN_c3_7 = new CN_CelToCelCN("c3");
    this.addConnector(CN_c3_7);
  }
}

const __portAliases = {};
function createModel(){ return new SysADLModel(); }
module.exports = { createModel, SysADLModel, __portAliases, PT_CTempIPT, PT_CTempOPT, PT_FTempOPT };
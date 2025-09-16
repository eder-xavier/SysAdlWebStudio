const { Model, Component, Port, SimplePort, CompositePort, Connector, Activity, Action, createExecutableFromExpression, Enum, Int, Boolean, String, Real, Void, valueType, dataType, dimension, unit } = require('../SysADLBase');


// Ports
class PT_Elements_CTempIPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Real" }, ...opts });
  }
}
class PT_Elements_CTempOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "Real" }, ...opts });
  }
}
class PT_Elements_FTempOPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Real" }, ...opts });
  }
}

// Connectors
class CN_Elements_FarToCelCN extends Connector {
  constructor(name, fromPort, toPort, opts = {}) {
    super(name, opts);
    // Flows: Real from f to c
    if (fromPort && toPort) {
      this.bind(fromPort, toPort);
    }
  }
}
class CN_Elements_CelToCelCN extends Connector {
  constructor(name, fromPort, toPort, opts = {}) {
    super(name, opts);
    // Flows: Real from c1 to c2
    if (fromPort && toPort) {
      this.bind(fromPort, toPort);
    }
  }
}

// Components
class CP_Elements_SensorCP extends Component {
  constructor(name, opts={}) {
      super(name, opts);
      // Add ports from component definition
      this.addPort(new PT_Elements_FTempOPT("current", "in", { owner: name }));
    }
}
class CP_Elements_TempMonitorCP extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_Elements_CTempIPT("s1", "in", { owner: name }));
      this.addPort(new PT_Elements_CTempIPT("s2", "in", { owner: name }));
      this.addPort(new PT_Elements_CTempOPT("average", "out", { owner: name }));
    }
}
class CP_Elements_StdOutCP extends Component {
  constructor(name, opts={}) {
      super(name, { ...opts, isBoundary: true });
      // Add ports from component definition
      this.addPort(new PT_Elements_CTempIPT("c3", "in", { owner: name }));
    }
}
class CP_Elements_SystemCP extends Component { }

class SysADLModel extends Model {
  constructor(){
    super("SysADLModel");
    this.SystemCP = new CP_Elements_SystemCP("SystemCP", { sysadlDefinition: "SystemCP" });
    this.addComponent(this.SystemCP);
    this.SystemCP.s1 = new CP_Elements_SensorCP("s1", { sysadlDefinition: "SensorCP" });
    this.SystemCP.addComponent(this.SystemCP.s1);
    this.SystemCP.s2 = new CP_Elements_SensorCP("s2", { sysadlDefinition: "SensorCP" });
    this.SystemCP.addComponent(this.SystemCP.s2);
    this.SystemCP.stdOut = new CP_Elements_StdOutCP("stdOut", { isBoundary: true, sysadlDefinition: "StdOutCP" });
    this.SystemCP.addComponent(this.SystemCP.stdOut);
    this.SystemCP.tempMon = new CP_Elements_TempMonitorCP("tempMon", { isBoundary: true, sysadlDefinition: "TempMonitorCP" });
    this.SystemCP.addComponent(this.SystemCP.tempMon);

    this.SystemCP.addConnector(new CN_Elements_FarToCelCN("c1", this.getPort("temp1"), this.SystemCP.tempMon.getPort("s1")));
    this.SystemCP.addConnector(new CN_Elements_FarToCelCN("c2", this.getPort("temp2"), this.SystemCP.tempMon.getPort("s2")));
    this.SystemCP.addConnector(new CN_Elements_CelToCelCN("c3", this.SystemCP.tempMon.getPort("average"), this.getPort("avg")));

    this.addExecutableSafe("SysADLModel.FarToCelEX", "executable def FarToCelEX (in f:Real): out Real {\n\t\treturn 5*(f - 32)/9 ;\n\t}", []);
    this.addExecutableSafe("SysADLModel.CalcAverageEX", "executable def CalcAverageEX(in temp1:Real,in temp2:Real):out Real{\n\t\treturn (temp1 + temp2)/2 ;\n\t}", []);
    this.addExecutableSafe("SysADLModel.r42c", "executable FarToCelEX to FarToCelAN", []);
    this.addExecutableSafe("SysADLModel.umu3", "executable CalcAverageEX to TempMonitorAN", []);
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
  }
}

const __portAliases = {};
function createModel(){ return new SysADLModel(); }
module.exports = { createModel, SysADLModel, __portAliases, PT_Elements_CTempIPT, PT_Elements_CTempOPT, PT_Elements_FTempOPT };
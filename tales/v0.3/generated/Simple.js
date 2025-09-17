const { Model, Component, Port, SimplePort, CompositePort, Connector, Activity, Action, createExecutableFromExpression, Enum, Int, Boolean, String, Real, Void, valueType, dataType, dimension, unit, Constraint, Executable } = require('../SysADLBase');


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

// ===== Behavioral Element Classes =====
// Activity class: FarToCelAC
class AC_Elements_FarToCelAC extends Activity {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"far","type":"Pin","direction":"in"},{"name":"cel","type":"Pin","direction":"in"}],
      outParameters: []
    });
  }
}

// Activity class: TempMonitorAC
class AC_Elements_TempMonitorAC extends Activity {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"s1","type":"Pin","direction":"in"},{"name":"s2","type":"Pin","direction":"in"},{"name":"average","type":"Pin","direction":"in"}],
      outParameters: []
    });
  }
}

// Action class: FarToCelAN
class AN_Elements_FarToCelAN extends Action {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"far","type":"Pin","direction":"in"}],
      outParameters: [],
    });
  }
}

// Action class: TempMonitorAN
class AN_Elements_TempMonitorAN extends Action {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [{"name":"t1","type":"Pin","direction":"in"},{"name":"t2","type":"Pin","direction":"in"}],
      outParameters: [],
    });
  }
}

// Constraint class: FarToCelEQ
class CT_Elements_FarToCelEQ extends Constraint {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      outParameters: [],
      equation: "(c == ((5 * (f - 32)) / 9))",
      constraintFunction: function(f) {
          // Type validation
          if (typeof f !== 'number') throw new Error('Parameter f must be a Real (number)');
          // Constraint equation: (c == ((5 * (f - 32)) / 9))
          const expectedValue = (5 * (f - 32)) / 9;
          const actualValue = c;
          return Math.abs(expectedValue - actualValue) < 1e-10; // tolerance for floating point comparison
        }
    });
  }
}

// Constraint class: CalcAverageEQ
class CT_Elements_CalcAverageEQ extends Constraint {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      outParameters: [],
      equation: "(av == ((t1 + t2) / 2))",
      constraintFunction: function(t1, t2) {
          // Type validation
          if (typeof t1 !== 'number') throw new Error('Parameter t1 must be a Real (number)');
          if (typeof t2 !== 'number') throw new Error('Parameter t2 must be a Real (number)');
          // Constraint equation: (av == ((t1 + t2) / 2))
          const expectedValue = (t1 + t2) / 2;
          const actualValue = av;
          return Math.abs(expectedValue - actualValue) < 1e-10; // tolerance for floating point comparison
        }
    });
  }
}

// Executable class: FarToCelEX
class EX_Elements_FarToCelEX extends Executable {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      body: "executable def FarToCelEX (in f:Real): out Real {\n\t\treturn 5*(f - 32)/9 ;\n\t}",
      executableFunction: function(f) {
          // Type validation
          // Type validation for f: (auto-detected from usage)
          return 5*(f - 32)/9;
        }
    });
  }
}

// Executable class: CalcAverageEX
class EX_Elements_CalcAverageEX extends Executable {
  constructor(name, opts = {}) {
    super(name, {
      ...opts,
      inParameters: [],
      body: "executable def CalcAverageEX(in temp1:Real,in temp2:Real):out Real{\n\t\treturn (temp1 + temp2)/2 ;\n\t}",
      executableFunction: function(temp1, temp2) {
          // Type validation
          // Type validation for temp1: (auto-detected from usage)
          // Type validation for temp2: (auto-detected from usage)
          return (temp1 + temp2)/2;
        }
    });
  }
}

// ===== End Behavioral Element Classes =====

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

    this.addExecutableSafe("SysADLModel.FarToCelEX", "executable def FarToCelEX (in f:Real): out Real {\n\t\treturn 5*(f - 32)/9 ;\n\t}", ["f"]);
    this.addExecutableSafe("SysADLModel.CalcAverageEX", "executable def CalcAverageEX(in temp1:Real,in temp2:Real):out Real{\n\t\treturn (temp1 + temp2)/2 ;\n\t}", ["temp1","temp2"]);
    this.addExecutableSafe("SysADLModel.u95x", "executable FarToCelEX to FarToCelAN", []);
    this.addExecutableSafe("SysADLModel.jxh0", "executable CalcAverageEX to TempMonitorAN", []);
    const act_FarToCelAC_FarToCelCN = new AC_Elements_FarToCelAC("FarToCelAC", { component: "FarToCelCN", inputPorts: [], delegates: [{"from":"far","to":"far"},{"from":"cel","to":"ftoc"}] });
    const action_FarToCelAN_FarToCelAC_FarToCelCN = new AN_Elements_FarToCelAN("FarToCelAN", { delegates: [{"from":"far","to":"f"},{"from":"FarToCelAN","to":"c"}] });
    const constraint_FarToCelEQ_FarToCelAC_FarToCelCN = new CT_Elements_FarToCelEQ("FarToCelEQ");
    action_FarToCelAN_FarToCelAC_FarToCelCN.registerConstraint(constraint_FarToCelEQ_FarToCelAC_FarToCelCN);
    const exec_FarToCelEX_FarToCelAC_FarToCelCN = new EX_Elements_FarToCelEX("FarToCelEX");
    action_FarToCelAN_FarToCelAC_FarToCelCN.registerExecutable(exec_FarToCelEX_FarToCelAC_FarToCelCN);
    act_FarToCelAC_FarToCelCN.registerAction(action_FarToCelAN_FarToCelAC_FarToCelCN);
    this.registerActivity("FarToCelAC::FarToCelCN", act_FarToCelAC_FarToCelCN);
    const act_TempMonitorAC_TempMonitorCP = new AC_Elements_TempMonitorAC("TempMonitorAC", { component: "TempMonitorCP", inputPorts: [], delegates: [{"from":"s1","to":"t1"},{"from":"s2","to":"t2"},{"from":"average","to":"TempMonitorAN"}] });
    const action_TempMonitorAN_TempMonitorAC_TempMonitorCP = new AN_Elements_TempMonitorAN("TempMonitorAN", { delegates: [{"from":"t1","to":"t1"},{"from":"t2","to":"t2"},{"from":"TempMonitorAN","to":"av"}] });
    const constraint_CalcAverageEQ_TempMonitorAC_TempMonitorCP = new CT_Elements_CalcAverageEQ("CalcAverageEQ");
    action_TempMonitorAN_TempMonitorAC_TempMonitorCP.registerConstraint(constraint_CalcAverageEQ_TempMonitorAC_TempMonitorCP);
    const exec_CalcAverageEX_TempMonitorAC_TempMonitorCP = new EX_Elements_CalcAverageEX("CalcAverageEX");
    action_TempMonitorAN_TempMonitorAC_TempMonitorCP.registerExecutable(exec_CalcAverageEX_TempMonitorAC_TempMonitorCP);
    act_TempMonitorAC_TempMonitorCP.registerAction(action_TempMonitorAN_TempMonitorAC_TempMonitorCP);
    this.registerActivity("TempMonitorAC::TempMonitorCP", act_TempMonitorAC_TempMonitorCP);
  }
}

const __portAliases = {};
function createModel(){ return new SysADLModel(); }
module.exports = { createModel, SysADLModel, __portAliases, PT_Elements_CTempIPT, PT_Elements_CTempOPT, PT_Elements_FTempOPT };
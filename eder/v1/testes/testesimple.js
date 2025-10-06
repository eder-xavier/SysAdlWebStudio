const { Model, Component, Port, SimplePort, CompositePort, Connector, Activity, Action, Enum, Int, Boolean, String, Real, Void, valueType, dataType, dimension, unit, Constraint, Executable } = require('SysADLBase');

class PT_ModelFromUI_s1_temp1_OPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "Real" }, ...opts });
  }
}
class PT_ModelFromUI_s2_temp2_OPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "Real" }, ...opts });
  }
}
class PT_ModelFromUI_tempMon_s1_IPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Real" }, ...opts });
  }
}
class PT_ModelFromUI_tempMon_s2_IPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Real" }, ...opts });
  }
}
class PT_ModelFromUI_tempMon_average_OPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "out", { ...{ expectedType: "Real" }, ...opts });
  }
}
class PT_ModelFromUI_stdOut_avg_IPT extends SimplePort {
  constructor(name, opts = {}) {
    super(name, "in", { ...{ expectedType: "Real" }, ...opts });
  }
}
class CP_ModelFromUI_s1 extends Component {
  constructor(name, opts = {}) {
    super(name, opts);
    this.addPort(new PT_ModelFromUI_s1_temp1_OPT("temp1", { owner: name }));
  }
}
class CP_ModelFromUI_s2 extends Component {
  constructor(name, opts = {}) {
    super(name, opts);
    this.addPort(new PT_ModelFromUI_s2_temp2_OPT("temp2", { owner: name }));
  }
}
class CP_ModelFromUI_tempMon extends Component {
  constructor(name, opts = {}) {
    super(name, opts);
    this.addPort(new PT_ModelFromUI_tempMon_s1_IPT("s1", { owner: name }));
    this.addPort(new PT_ModelFromUI_tempMon_s2_IPT("s2", { owner: name }));
    this.addPort(new PT_ModelFromUI_tempMon_average_OPT("average", { owner: name }));
  }
}
class CP_ModelFromUI_stdOut extends Component {
  constructor(name, opts = {}) {
    super(name, opts);
    this.addPort(new PT_ModelFromUI_stdOut_avg_IPT("avg", { owner: name }));
  }
}
class CN_ModelFromUI_c1 extends Connector {
  constructor(name, opts = {}) {
    super(name, { ...opts });
  }
}
class CN_ModelFromUI__implicit extends Connector {
  constructor(name, opts = {}) {
    super(name, { ...opts });
  }
}
class CN_ModelFromUI_c2 extends Connector {
  constructor(name, opts = {}) {
    super(name, { ...opts });
  }
}
class CN_ModelFromUI_c3 extends Connector {
  constructor(name, opts = {}) {
    super(name, { ...opts });
  }
}
class SysADLModel_ModelFromUI extends Model {
  constructor(){
    super("ModelFromUI");
    this.s1 = new CP_ModelFromUI_s1("s1");
    this.addComponent(this.s1);
    this.s2 = new CP_ModelFromUI_s2("s2");
    this.addComponent(this.s2);
    this.tempMon = new CP_ModelFromUI_tempMon("tempMon");
    this.addComponent(this.tempMon);
    this.stdOut = new CP_ModelFromUI_stdOut("stdOut");
    this.addComponent(this.stdOut);
    this.addConnector(new CN_ModelFromUI_c1("c1"));
    const conn_c1 = this.connectors["c1"];
    this.addConnector(new CN_ModelFromUI__implicit("_implicit"));
    const conn__implicit = this.connectors["_implicit"];
    conn__implicit.bind(this.s1.getPort("temp1"), this.tempMon.getPort("s1"));
    conn__implicit.bind(this.s2.getPort("temp2"), this.tempMon.getPort("s2"));
    conn__implicit.bind(this.tempMon.getPort("average"), this.stdOut.getPort("avg"));
    this.addConnector(new CN_ModelFromUI_c2("c2"));
    const conn_c2 = this.connectors["c2"];
    this.addConnector(new CN_ModelFromUI_c3("c3"));
    const conn_c3 = this.connectors["c3"];
  }
}
function createModel(){
  const model = new SysADLModel_ModelFromUI();
  model._moduleContext = {
    PT_ModelFromUI_s1_temp1_OPT, PT_ModelFromUI_s2_temp2_OPT, PT_ModelFromUI_tempMon_s1_IPT, PT_ModelFromUI_tempMon_s2_IPT, PT_ModelFromUI_tempMon_average_OPT, PT_ModelFromUI_stdOut_avg_IPT, CN_ModelFromUI_c1, CN_ModelFromUI__implicit, CN_ModelFromUI_c2, CN_ModelFromUI_c3, CP_ModelFromUI_s1, CP_ModelFromUI_s2, CP_ModelFromUI_tempMon, CP_ModelFromUI_stdOut
  };
  return model;
}
module.exports = { createModel: createModel, SysADLModel_ModelFromUI, ...model?{}:{} };
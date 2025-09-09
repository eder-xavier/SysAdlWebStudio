const { ModelBase, ComponentBase, PortBase, ConnectorBase, createExecutableFromExpression } = require('./../sysadl-runtime.js');
function createModel() {
  const m = new ModelBase('SysADLModel');
  // create component instances and ports (generated from configuration)
  const cmp_s1 = new ComponentBase("s1");
  cmp_s1 && m.addComponent(cmp_s1);
  const cmp_s1_temp1 = new PortBase("temp1", 'in');
  cmp_s1_temp1.ownerComponent = "s1";
  cmp_s1.addPort(cmp_s1_temp1);
  const cmp_s2 = new ComponentBase("s2");
  cmp_s2 && m.addComponent(cmp_s2);
  const cmp_s2_temp2 = new PortBase("temp2", 'in');
  cmp_s2_temp2.ownerComponent = "s2";
  cmp_s2.addPort(cmp_s2_temp2);
  const cmp_tempMon = new ComponentBase("tempMon");
  cmp_tempMon && m.addComponent(cmp_tempMon);
  const cmp_tempMon_s1 = new PortBase("s1", 'in');
  cmp_tempMon_s1.ownerComponent = "tempMon";
  cmp_tempMon.addPort(cmp_tempMon_s1);
  const cmp_tempMon_s2 = new PortBase("s2", 'in');
  cmp_tempMon_s2.ownerComponent = "tempMon";
  cmp_tempMon.addPort(cmp_tempMon_s2);
  const cmp_tempMon_average = new PortBase("average", 'in');
  cmp_tempMon_average.ownerComponent = "tempMon";
  cmp_tempMon.addPort(cmp_tempMon_average);
  const cmp_stdOut = new ComponentBase("stdOut");
  cmp_stdOut && m.addComponent(cmp_stdOut);
  const cmp_stdOut_avg = new PortBase("avg", 'in');
  cmp_stdOut_avg.ownerComponent = "stdOut";
  cmp_stdOut.addPort(cmp_stdOut_avg);
  const conn_c1 = new ConnectorBase("c1");
  m.addConnector(conn_c1);
  const conn__implicit = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit);
  const conn_c2 = new ConnectorBase("c2");
  m.addConnector(conn_c2);
  const conn_c3 = new ConnectorBase("c3");
  m.addConnector(conn_c3);
  // register activity FarToCelAC

  m.registerActivity("FarToCelAC", { component: null, inputPorts: [], actions: [{"name":"FarToCelAN","executable":"FarToCelEX","params":[]}] });
  // register activity TempMonitorAC

  m.registerActivity("TempMonitorAC", { component: "tempMon", inputPorts: [], actions: [{"name":"TempMonitorAN","executable":"CalcAverageEX","params":[]}] });
  // inferred binding s1.temp1 -> s1.temp1
  if (cmp_s1 && cmp_s1.ports && cmp_s1.ports["temp1"]) {
    cmp_s1.ports["temp1"].bindTo({ receive: function(v, model){ if (cmp_s1 && cmp_s1.ports && cmp_s1.ports["temp1"]) { cmp_s1.ports["temp1"].receive(v, model);
    } } });
  }
  // inferred binding s2.temp2 -> s2.temp2
  if (cmp_s2 && cmp_s2.ports && cmp_s2.ports["temp2"]) {
    cmp_s2.ports["temp2"].bindTo({ receive: function(v, model){ if (cmp_s2 && cmp_s2.ports && cmp_s2.ports["temp2"]) { cmp_s2.ports["temp2"].receive(v, model);
    } } });
  }
  // inferred binding tempMon.average -> avg.average
  if (cmp_tempMon && cmp_tempMon.ports && cmp_tempMon.ports["average"]) {
    cmp_tempMon.ports["average"].bindTo({ receive: function(v, model){ if (cmp_avg && cmp_avg.ports && cmp_avg.ports["average"]) { cmp_avg.ports["average"].receive(v, model);
    } } });
  }
  // executable FarToCelEX
  m.addExecutable('FarToCelEX', createExecutableFromExpression("5*(f - 32)/9", ['f']));
  // executable CalcAverageEX
  m.addExecutable('CalcAverageEX', createExecutableFromExpression("(temp1 + temp2)/2", ['temp1', 'temp2']));
  return m;
}
module.exports = { createModel };
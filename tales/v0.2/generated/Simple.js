const { ModelBase, ComponentBase, PortBase, ConnectorBase, createExecutableFromExpression, ActivityBase, ActionBase } = require('../sysadl-runtime.js');
function createModel() {
  const m = new ModelBase("SysADLModel");
  // instantiate component uses
  const cmp_s1 = new ComponentBase("s1", { sysadlDefinition: "SensorCP" });
  cmp_s1 && m.addComponent(cmp_s1);
  const cmp_s2 = new ComponentBase("s2", { sysadlDefinition: "SensorCP" });
  cmp_s2 && m.addComponent(cmp_s2);
  const cmp_tempMon = new ComponentBase("tempMon", { sysadlDefinition: "TempMonitorCP" });
  cmp_tempMon && m.addComponent(cmp_tempMon);
  const cmp_stdOut = new ComponentBase("stdOut", { sysadlDefinition: "StdOutCP" });
  cmp_stdOut && m.addComponent(cmp_stdOut);
  const cmp_s1_temp1 = new PortBase("temp1", 'in');
  cmp_s1_temp1.ownerComponent = "s1";
  cmp_s1.addPort(cmp_s1_temp1);
  const cmp_s2_temp2 = new PortBase("temp2", 'in');
  cmp_s2_temp2.ownerComponent = "s2";
  cmp_s2.addPort(cmp_s2_temp2);
  const cmp_tempMon_s1 = new PortBase("s1", 'in');
  cmp_tempMon_s1.ownerComponent = "tempMon";
  cmp_tempMon.addPort(cmp_tempMon_s1);
  const cmp_tempMon_s2 = new PortBase("s2", 'in');
  cmp_tempMon_s2.ownerComponent = "tempMon";
  cmp_tempMon.addPort(cmp_tempMon_s2);
  const cmp_tempMon_average = new PortBase("average", 'in');
  cmp_tempMon_average.ownerComponent = "tempMon";
  cmp_tempMon.addPort(cmp_tempMon_average);
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
  // executables extracted from definitions
  try {
    m.addExecutable("SysADLModel.FarToCelEX", createExecutableFromExpression(`
    5*(f - 32)/9;
`, ["f"]));
  } catch (e) { /* ignore executable creation error */ }
  try {
    m.addExecutable("SysADLModel.CalcAverageEX", createExecutableFromExpression(`
    (temp1 + temp2)/2;
`, ["temp1","temp2"]));
  } catch (e) { /* ignore executable creation error */ }
  // activities registered for component instances
  try {
    const __act_TempMonitorAC = new ActivityBase("TempMonitorAC", { component: "tempMon", inputPorts: ["s1","s2"] });
    __act_TempMonitorAC.addAction(new ActionBase("TempMonitorAN", [], "SysADLModel.CalcAverageEX", "constraint : post-condition CalcAverageEQ\n\t\tdelegate t1 to t1 \n\t\tdelegate t2 to t2 delegate \n\t\tTempMonitorAN to av"));
    __act_TempMonitorAC.addAction(new ActionBase("TempMonitorAN", [], "SysADLModel.CalcAverageEX", "constraint : post-condition CalcAverageEQ\n\t\tdelegate t1 to t1 \n\t\tdelegate t2 to t2 delegate \n\t\tTempMonitorAN to av"));
    m.registerActivity("TempMonitorAC", __act_TempMonitorAC);
  } catch (e) { /* ignore */ }
  return m;
}
module.exports = { createModel };
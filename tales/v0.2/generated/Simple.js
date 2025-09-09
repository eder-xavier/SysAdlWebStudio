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
  const __portVars = {};
  const cmp_s1_temp1 = new PortBase("temp1", 'in');
  cmp_s1_temp1.ownerComponent = "s1";
  cmp_s1.addPort(cmp_s1_temp1);
  __portVars["s1"] = __portVars["s1"] || {};
  __portVars["s1"]["temp1"] = cmp_s1_temp1;
  const cmp_s2_temp2 = new PortBase("temp2", 'in');
  cmp_s2_temp2.ownerComponent = "s2";
  cmp_s2.addPort(cmp_s2_temp2);
  __portVars["s2"] = __portVars["s2"] || {};
  __portVars["s2"]["temp2"] = cmp_s2_temp2;
  const cmp_tempMon_s1 = new PortBase("s1", 'in');
  cmp_tempMon_s1.ownerComponent = "tempMon";
  cmp_tempMon.addPort(cmp_tempMon_s1);
  __portVars["tempMon"] = __portVars["tempMon"] || {};
  __portVars["tempMon"]["s1"] = cmp_tempMon_s1;
  const cmp_tempMon_s2 = new PortBase("s2", 'in');
  cmp_tempMon_s2.ownerComponent = "tempMon";
  cmp_tempMon.addPort(cmp_tempMon_s2);
  __portVars["tempMon"] = __portVars["tempMon"] || {};
  __portVars["tempMon"]["s2"] = cmp_tempMon_s2;
  const cmp_tempMon_average = new PortBase("average", 'in');
  cmp_tempMon_average.ownerComponent = "tempMon";
  cmp_tempMon.addPort(cmp_tempMon_average);
  __portVars["tempMon"] = __portVars["tempMon"] || {};
  __portVars["tempMon"]["average"] = cmp_tempMon_average;
  const cmp_stdOut_avg = new PortBase("avg", 'in');
  cmp_stdOut_avg.ownerComponent = "stdOut";
  cmp_stdOut.addPort(cmp_stdOut_avg);
  __portVars["stdOut"] = __portVars["stdOut"] || {};
  __portVars["stdOut"]["avg"] = cmp_stdOut_avg;
  // connectors declared in <root>
  const conn_c1 = new ConnectorBase("c1");
  m.addConnector(conn_c1);
  // connector participants for c1
  const __parts_conn_c1 = [];
  (function(){
    const parts = __parts_conn_c1.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit);
  // connector participants for _implicit
  const __parts_conn__implicit = [];
  (function(){
    const parts = __parts_conn__implicit.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn_c2 = new ConnectorBase("c2");
  m.addConnector(conn_c2);
  // connector participants for c2
  const __parts_conn_c2 = [];
  (function(){
    const parts = __parts_conn_c2.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_1 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_1);
  // connector participants for _implicit
  const __parts_conn__implicit_1 = [];
  (function(){
    const parts = __parts_conn__implicit_1.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn_c3 = new ConnectorBase("c3");
  m.addConnector(conn_c3);
  // connector participants for c3
  const __parts_conn_c3 = [];
  (function(){
    const parts = __parts_conn_c3.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_2 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_2);
  // connector participants for _implicit
  const __parts_conn__implicit_2 = [];
  (function(){
    const parts = __parts_conn__implicit_2.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
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
    const __act_FarToCelAC_s1 = new ActivityBase("FarToCelAC", { component: "s1", inputPorts: ["temp1"] });
    __act_FarToCelAC_s1.addAction(new ActionBase("FarToCelAN", [], "SysADLModel.FarToCelEX", "constraint : post-condition FarToCelEQ\n\t\tdelegate far to f \n\t\tdelegate FarToCelAN to c"));
    m.registerActivity("FarToCelAC::s1", __act_FarToCelAC_s1);
  } catch (e) { /* ignore */ }
  try {
    const __act_FarToCelAC_s2 = new ActivityBase("FarToCelAC", { component: "s2", inputPorts: ["temp2"] });
    __act_FarToCelAC_s2.addAction(new ActionBase("FarToCelAN", [], "SysADLModel.FarToCelEX", "constraint : post-condition FarToCelEQ\n\t\tdelegate far to f \n\t\tdelegate FarToCelAN to c"));
    m.registerActivity("FarToCelAC::s2", __act_FarToCelAC_s2);
  } catch (e) { /* ignore */ }
  try {
    const __act_FarToCelAC_tempMon = new ActivityBase("FarToCelAC", { component: "tempMon", inputPorts: ["s1"] });
    __act_FarToCelAC_tempMon.addAction(new ActionBase("FarToCelAN", [], "SysADLModel.FarToCelEX", "constraint : post-condition FarToCelEQ\n\t\tdelegate far to f \n\t\tdelegate FarToCelAN to c"));
    m.registerActivity("FarToCelAC::tempMon", __act_FarToCelAC_tempMon);
  } catch (e) { /* ignore */ }
  try {
    const __act_FarToCelAC_stdOut = new ActivityBase("FarToCelAC", { component: "stdOut", inputPorts: ["avg"] });
    __act_FarToCelAC_stdOut.addAction(new ActionBase("FarToCelAN", [], "SysADLModel.FarToCelEX", "constraint : post-condition FarToCelEQ\n\t\tdelegate far to f \n\t\tdelegate FarToCelAN to c"));
    m.registerActivity("FarToCelAC::stdOut", __act_FarToCelAC_stdOut);
  } catch (e) { /* ignore */ }
  try {
    const __act_TempMonitorAC_tempMon = new ActivityBase("TempMonitorAC", { component: "tempMon", inputPorts: ["s1","s2"] });
    __act_TempMonitorAC_tempMon.addAction(new ActionBase("TempMonitorAN", [], "SysADLModel.CalcAverageEX", "constraint : post-condition CalcAverageEQ\n\t\tdelegate t1 to t1 \n\t\tdelegate t2 to t2 delegate \n\t\tTempMonitorAN to av"));
    m.registerActivity("TempMonitorAC::tempMon", __act_TempMonitorAC_tempMon);
  } catch (e) { /* ignore */ }
  try {
    const __act_FarToCelAC = new ActivityBase("FarToCelAC", { component: "s1", inputPorts: ["temp1"] });
    __act_FarToCelAC.addAction(new ActionBase("FarToCelAN", [], "SysADLModel.FarToCelEX", "constraint : post-condition FarToCelEQ\n\t\tdelegate far to f \n\t\tdelegate FarToCelAN to c"));
    m.registerActivity("FarToCelAC", __act_FarToCelAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_FarToCelAC = new ActivityBase("FarToCelAC", { component: "s2", inputPorts: ["temp2"] });
    __act_FarToCelAC.addAction(new ActionBase("FarToCelAN", [], "SysADLModel.FarToCelEX", "constraint : post-condition FarToCelEQ\n\t\tdelegate far to f \n\t\tdelegate FarToCelAN to c"));
    m.registerActivity("FarToCelAC", __act_FarToCelAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_FarToCelAC = new ActivityBase("FarToCelAC", { component: "tempMon", inputPorts: ["s1"] });
    __act_FarToCelAC.addAction(new ActionBase("FarToCelAN", [], "SysADLModel.FarToCelEX", "constraint : post-condition FarToCelEQ\n\t\tdelegate far to f \n\t\tdelegate FarToCelAN to c"));
    m.registerActivity("FarToCelAC", __act_FarToCelAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_FarToCelAC = new ActivityBase("FarToCelAC", { component: "stdOut", inputPorts: ["avg"] });
    __act_FarToCelAC.addAction(new ActionBase("FarToCelAN", [], "SysADLModel.FarToCelEX", "constraint : post-condition FarToCelEQ\n\t\tdelegate far to f \n\t\tdelegate FarToCelAN to c"));
    m.registerActivity("FarToCelAC", __act_FarToCelAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_TempMonitorAC = new ActivityBase("TempMonitorAC", { component: "tempMon", inputPorts: ["s1","s2"] });
    __act_TempMonitorAC.addAction(new ActionBase("TempMonitorAN", [], "SysADLModel.CalcAverageEX", "constraint : post-condition CalcAverageEQ\n\t\tdelegate t1 to t1 \n\t\tdelegate t2 to t2 delegate \n\t\tTempMonitorAN to av"));
    m.registerActivity("TempMonitorAC", __act_TempMonitorAC);
  } catch (e) { /* ignore */ }
  return m;
}
module.exports = { createModel };
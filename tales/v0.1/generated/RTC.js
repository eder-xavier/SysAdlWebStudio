const { ModelBase, ComponentBase, PortBase, ConnectorBase, createExecutableFromExpression } = require('./../sysadl-runtime.js');
function createModel() {
  const m = new ModelBase('SysADLModel');
  // create component instances and ports (generated from configuration)
  const cmp_s1 = new ComponentBase("s1");
  cmp_s1 && m.addComponent(cmp_s1);
  const cmp_s1_current1 = new PortBase("current1", 'in');
  cmp_s1_current1.ownerComponent = "s1";
  cmp_s1.addPort(cmp_s1_current1);
  const cmp_s2 = new ComponentBase("s2");
  cmp_s2 && m.addComponent(cmp_s2);
  const cmp_s2_current2 = new PortBase("current2", 'in');
  cmp_s2_current2.ownerComponent = "s2";
  cmp_s2.addPort(cmp_s2_current2);
  const cmp_s3 = new ComponentBase("s3");
  cmp_s3 && m.addComponent(cmp_s3);
  const cmp_s3_detectedS = new PortBase("detectedS", 'in');
  cmp_s3_detectedS.ownerComponent = "s3";
  cmp_s3.addPort(cmp_s3_detectedS);
  const cmp_ui = new ComponentBase("ui");
  cmp_ui && m.addComponent(cmp_ui);
  const cmp_ui_desired = new PortBase("desired", 'in');
  cmp_ui_desired.ownerComponent = "ui";
  cmp_ui.addPort(cmp_ui_desired);
  const cmp_a2 = new ComponentBase("a2");
  cmp_a2 && m.addComponent(cmp_a2);
  const cmp_a2_controllerC = new PortBase("controllerC", 'in');
  cmp_a2_controllerC.ownerComponent = "a2";
  cmp_a2.addPort(cmp_a2_controllerC);
  const cmp_a1 = new ComponentBase("a1");
  cmp_a1 && m.addComponent(cmp_a1);
  const cmp_a1_controllerH = new PortBase("controllerH", 'in');
  cmp_a1_controllerH.ownerComponent = "a1";
  cmp_a1.addPort(cmp_a1_controllerH);
  const cmp_rtc = new ComponentBase("rtc");
  cmp_rtc && m.addComponent(cmp_rtc);
  const cmp_rtc_detected = new PortBase("detected", 'in');
  cmp_rtc_detected.ownerComponent = "rtc";
  cmp_rtc.addPort(cmp_rtc_detected);
  const cmp_rtc_localtemp1 = new PortBase("localtemp1", 'in');
  cmp_rtc_localtemp1.ownerComponent = "rtc";
  cmp_rtc.addPort(cmp_rtc_localtemp1);
  const cmp_rtc_localTemp2 = new PortBase("localTemp2", 'in');
  cmp_rtc_localTemp2.ownerComponent = "rtc";
  cmp_rtc.addPort(cmp_rtc_localTemp2);
  const cmp_rtc_userTemp = new PortBase("userTemp", 'in');
  cmp_rtc_userTemp.ownerComponent = "rtc";
  cmp_rtc.addPort(cmp_rtc_userTemp);
  const cmp_rtc_heating = new PortBase("heating", 'in');
  cmp_rtc_heating.ownerComponent = "rtc";
  cmp_rtc.addPort(cmp_rtc_heating);
  const cmp_rtc_cooling = new PortBase("cooling", 'in');
  cmp_rtc_cooling.ownerComponent = "rtc";
  cmp_rtc.addPort(cmp_rtc_cooling);
  const cmp_sm = new ComponentBase("sm");
  cmp_sm && m.addComponent(cmp_sm);
  const cmp_sm_s1 = new PortBase("s1", 'in');
  cmp_sm_s1.ownerComponent = "sm";
  cmp_sm.addPort(cmp_sm_s1);
  const cmp_sm_s2 = new PortBase("s2", 'in');
  cmp_sm_s2.ownerComponent = "sm";
  cmp_sm.addPort(cmp_sm_s2);
  const cmp_sm_average = new PortBase("average", 'in');
  cmp_sm_average.ownerComponent = "sm";
  cmp_sm.addPort(cmp_sm_average);
  const cmp_cm = new ComponentBase("cm");
  cmp_cm && m.addComponent(cmp_cm);
  const cmp_cm_target2 = new PortBase("target2", 'in');
  cmp_cm_target2.ownerComponent = "cm";
  cmp_cm.addPort(cmp_cm_target2);
  const cmp_cm_average2 = new PortBase("average2", 'in');
  cmp_cm_average2.ownerComponent = "cm";
  cmp_cm.addPort(cmp_cm_average2);
  const cmp_cm_heating = new PortBase("heating", 'in');
  cmp_cm_heating.ownerComponent = "cm";
  cmp_cm.addPort(cmp_cm_heating);
  const cmp_cm_cooling = new PortBase("cooling", 'in');
  cmp_cm_cooling.ownerComponent = "cm";
  cmp_cm.addPort(cmp_cm_cooling);
  const cmp_pc = new ComponentBase("pc");
  cmp_pc && m.addComponent(cmp_pc);
  const cmp_pc_detected = new PortBase("detected", 'in');
  cmp_pc_detected.ownerComponent = "pc";
  cmp_pc.addPort(cmp_pc_detected);
  const cmp_pc_userTemp = new PortBase("userTemp", 'in');
  cmp_pc_userTemp.ownerComponent = "pc";
  cmp_pc.addPort(cmp_pc_userTemp);
  const cmp_pc_target = new PortBase("target", 'in');
  cmp_pc_target.ownerComponent = "pc";
  cmp_pc.addPort(cmp_pc_target);
  const conn_c1 = new ConnectorBase("c1");
  m.addConnector(conn_c1);
  const conn__implicit = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit);
  const conn_uc = new ConnectorBase("uc");
  m.addConnector(conn_uc);
  const conn_cc2 = new ConnectorBase("cc2");
  m.addConnector(conn_cc2);
  const conn_pc = new ConnectorBase("pc");
  m.addConnector(conn_pc);
  const conn_c2 = new ConnectorBase("c2");
  m.addConnector(conn_c2);
  const conn_cc1 = new ConnectorBase("cc1");
  m.addConnector(conn_cc1);
  const conn_target = new ConnectorBase("target");
  m.addConnector(conn_target);
  const conn_average = new ConnectorBase("average");
  m.addConnector(conn_average);
  // register activity CalculateAverageTemperatureAC

  m.registerActivity("CalculateAverageTemperatureAC", { component: "sm", inputPorts: [], actions: [{"name":"CalculateAverageTemperatureAN","executable":"CalculateAverageTemperatureEx","params":[]}] });
  // register activity CheckPresenceToSetTemperatureAC

  m.registerActivity("CheckPresenceToSetTemperatureAC", { component: "pc", inputPorts: [], actions: [{"name":"CheckPeresenceToSetTemperatureAN","executable":"CheckPresenceToSetTemperature","params":[]}] });
  // register activity DecideCommandAC

  m.registerActivity("DecideCommandAC", { component: "cm", inputPorts: [], actions: [{"name":"CompareTemperatureAN","executable":"CompareTemperatureEx","params":[]},{"name":"CommandHeaterAN","executable":"CommandHeaterEx","params":[]},{"name":"CommandCoolerAN","executable":"CommandCoolerEx","params":[]}] });
  // register activity FahrenheitToCelsiusAC

  m.registerActivity("FahrenheitToCelsiusAC", { component: null, inputPorts: [], actions: [{"name":"FahrenheitToCelsiusAN","executable":"FahrenheitToCelsiusEx","params":[]}] });
  // inferred binding s1.current1 -> localtemp1.current1
  if (cmp_s1 && cmp_s1.ports && cmp_s1.ports["current1"]) {
    cmp_s1.ports["current1"].bindTo({ receive: function(v, model){ if (cmp_localtemp1 && cmp_localtemp1.ports && cmp_localtemp1.ports["current1"]) { cmp_localtemp1.ports["current1"].receive(v, model);
    } } });
  }
  // inferred binding ui.desired -> userTemp.desired
  if (cmp_ui && cmp_ui.ports && cmp_ui.ports["desired"]) {
    cmp_ui.ports["desired"].bindTo({ receive: function(v, model){ if (cmp_userTemp && cmp_userTemp.ports && cmp_userTemp.ports["desired"]) { cmp_userTemp.ports["desired"].receive(v, model);
    } } });
  }
  // inferred binding rtc.cooling -> controllerC.cooling
  if (cmp_rtc && cmp_rtc.ports && cmp_rtc.ports["cooling"]) {
    cmp_rtc.ports["cooling"].bindTo({ receive: function(v, model){ if (cmp_controllerC && cmp_controllerC.ports && cmp_controllerC.ports["cooling"]) { cmp_controllerC.ports["cooling"].receive(v, model);
    } } });
  }
  // inferred binding cm.cooling -> controllerC.cooling
  if (cmp_cm && cmp_cm.ports && cmp_cm.ports["cooling"]) {
    cmp_cm.ports["cooling"].bindTo({ receive: function(v, model){ if (cmp_controllerC && cmp_controllerC.ports && cmp_controllerC.ports["cooling"]) { cmp_controllerC.ports["cooling"].receive(v, model);
    } } });
  }
  // inferred binding s3.detectedS -> detected.detectedS
  if (cmp_s3 && cmp_s3.ports && cmp_s3.ports["detectedS"]) {
    cmp_s3.ports["detectedS"].bindTo({ receive: function(v, model){ if (cmp_detected && cmp_detected.ports && cmp_detected.ports["detectedS"]) { cmp_detected.ports["detectedS"].receive(v, model);
    } } });
  }
  // inferred binding s2.current2 -> localTemp2.current2
  if (cmp_s2 && cmp_s2.ports && cmp_s2.ports["current2"]) {
    cmp_s2.ports["current2"].bindTo({ receive: function(v, model){ if (cmp_localTemp2 && cmp_localTemp2.ports && cmp_localTemp2.ports["current2"]) { cmp_localTemp2.ports["current2"].receive(v, model);
    } } });
  }
  // inferred binding rtc.heating -> controllerH.heating
  if (cmp_rtc && cmp_rtc.ports && cmp_rtc.ports["heating"]) {
    cmp_rtc.ports["heating"].bindTo({ receive: function(v, model){ if (cmp_controllerH && cmp_controllerH.ports && cmp_controllerH.ports["heating"]) { cmp_controllerH.ports["heating"].receive(v, model);
    } } });
  }
  // inferred binding cm.heating -> controllerH.heating
  if (cmp_cm && cmp_cm.ports && cmp_cm.ports["heating"]) {
    cmp_cm.ports["heating"].bindTo({ receive: function(v, model){ if (cmp_controllerH && cmp_controllerH.ports && cmp_controllerH.ports["heating"]) { cmp_controllerH.ports["heating"].receive(v, model);
    } } });
  }
  // inferred binding pc.target -> target2.target
  if (cmp_pc && cmp_pc.ports && cmp_pc.ports["target"]) {
    cmp_pc.ports["target"].bindTo({ receive: function(v, model){ if (cmp_target2 && cmp_target2.ports && cmp_target2.ports["target"]) { cmp_target2.ports["target"].receive(v, model);
    } } });
  }
  // inferred binding sm.average -> average2.average
  if (cmp_sm && cmp_sm.ports && cmp_sm.ports["average"]) {
    cmp_sm.ports["average"].bindTo({ receive: function(v, model){ if (cmp_average2 && cmp_average2.ports && cmp_average2.ports["average"]) { cmp_average2.ports["average"].receive(v, model);
    } } });
  }
  // executable CommandCoolerEx
  m.addExecutable('CommandCoolerEx', createExecutableFromExpression("(cmds && cmds[\"cooler\"])", ['cmds']));
  // executable CommandHeaterEx
  m.addExecutable('CommandHeaterEx', createExecutableFromExpression("(cmds && cmds[\"heater\"])", ['cmds']));
  // executable FahrenheitToCelsiusEx
  m.addExecutable('FahrenheitToCelsiusEx', createExecutableFromExpression("5*(f - 32)/9", ['f']));
  // executable CalculateAverageTemperatureEx
  m.addExecutable('CalculateAverageTemperatureEx', createExecutableFromExpression("(temp1 + temp2)/2", ['temp1', 'temp2']));
  // executable CheckPresenceToSetTemperature
  m.addExecutable('CheckPresenceToSetTemperature', createExecutableFromExpression("userTemp", ['presence', 'userTemp']));
  // executable CompareTemperatureEx
  m.addExecutable('CompareTemperatureEx', function() { throw new Error('Executable CompareTemperatureEx has no body');
  });
  return m;
}
module.exports = { createModel };
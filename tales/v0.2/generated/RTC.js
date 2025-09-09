const { ModelBase, ComponentBase, PortBase, ConnectorBase, createExecutableFromExpression } = require('../sysadl-runtime.js');
function createModel() {
  const m = new ModelBase("SysADLModel");
  // instantiate component uses
  const cmp_s1 = new ComponentBase("s1", { sysadlDefinition: "TemperatureSensorCP" });
  cmp_s1 && m.addComponent(cmp_s1);
  const cmp_s2 = new ComponentBase("s2", { sysadlDefinition: "TemperatureSensorCP" });
  cmp_s2 && m.addComponent(cmp_s2);
  const cmp_s3 = new ComponentBase("s3", { sysadlDefinition: "PresenceSensorCP" });
  cmp_s3 && m.addComponent(cmp_s3);
  const cmp_ui = new ComponentBase("ui", { sysadlDefinition: "UserInterfaceCP" });
  cmp_ui && m.addComponent(cmp_ui);
  const cmp_a2 = new ComponentBase("a2", { sysadlDefinition: "CoolerCP" });
  cmp_a2 && m.addComponent(cmp_a2);
  const cmp_a1 = new ComponentBase("a1", { sysadlDefinition: "HeaterCP" });
  cmp_a1 && m.addComponent(cmp_a1);
  const cmp_rtc = new ComponentBase("rtc", { sysadlDefinition: "RoomTemperatureControllerCP" });
  cmp_rtc && m.addComponent(cmp_rtc);
  const cmp_s1_current1 = new PortBase("current1", 'in');
  cmp_s1_current1.ownerComponent = "s1";
  cmp_s1.addPort(cmp_s1_current1);
  const cmp_s2_current2 = new PortBase("current2", 'in');
  cmp_s2_current2.ownerComponent = "s2";
  cmp_s2.addPort(cmp_s2_current2);
  const cmp_s3_detectedS = new PortBase("detectedS", 'in');
  cmp_s3_detectedS.ownerComponent = "s3";
  cmp_s3.addPort(cmp_s3_detectedS);
  const cmp_ui_desired = new PortBase("desired", 'in');
  cmp_ui_desired.ownerComponent = "ui";
  cmp_ui.addPort(cmp_ui_desired);
  const cmp_a2_controllerC = new PortBase("controllerC", 'in');
  cmp_a2_controllerC.ownerComponent = "a2";
  cmp_a2.addPort(cmp_a2_controllerC);
  const cmp_a1_controllerH = new PortBase("controllerH", 'in');
  cmp_a1_controllerH.ownerComponent = "a1";
  cmp_a1.addPort(cmp_a1_controllerH);
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
  // executables extracted from definitions
  try {
    m.addExecutable("SysADLModel.CommandCoolerEx", createExecutableFromExpression(`
    cmds->cooler;
`, ["cmds"]));
  } catch (e) { /* ignore executable creation error */ }
  try {
    m.addExecutable("SysADLModel.CommandHeaterEx", createExecutableFromExpression(`
    cmds->heater;
`, ["cmds"]));
  } catch (e) { /* ignore executable creation error */ }
  try {
    m.addExecutable("SysADLModel.FahrenheitToCelsiusEx", createExecutableFromExpression(`
    5*(f - 32)/9;
`, ["f"]));
  } catch (e) { /* ignore executable creation error */ }
  try {
    m.addExecutable("SysADLModel.CalculateAverageTemperatureEx", createExecutableFromExpression(`
    (temp1 + temp2)/2;
`, ["temp1","temp2"]));
  } catch (e) { /* ignore executable creation error */ }
  try {
    m.addExecutable("SysADLModel.CheckPresenceToSetTemperature", createExecutableFromExpression(`
    userTemp;
    else return 2;
`, ["presence","userTemp"]));
  } catch (e) { /* ignore executable creation error */ }
  try {
    m.addExecutable("SysADLModel.CompareTemperatureEx", createExecutableFromExpression(`
    let heater:Command = types.Command::Off;
    let cooler:Command = types.Command::Off;
    if(average > target) {heater = types.Command::Off;
    cooler = types.Command::On;
    } else {heater = types.Command::On;
    cooler = types.Command::Off;
    };
`, ["target","average"]));
  } catch (e) { /* ignore executable creation error */ }
  // activities registered for component instances
  try {
    m.registerActivity("FahrenheitToCelsiusAC",     {
      "component": "s1",
      "inputPorts": [
        "current1"
      ],
      "actions": [
        {
          "name": "FahrenheitToCelsiusAN",
          "executable": "FahrenheitToCelsiusEx",
          "params": [],
          "body": "constraint : post-condition FahrenheitToCelsiusEQ"
        }
      ]
    });
  } catch (e) { /* ignore */ }
  try {
    m.registerActivity("CheckPresenceToSetTemperatureAC",     {
      "component": "rtc",
      "inputPorts": [
        "detected",
        "userTemp"
      ],
      "actions": [
        {
          "name": "CheckPeresenceToSetTemperatureAN",
          "executable": "CheckPresenceToSetTemperature",
          "params": [],
          "body": "constraint : post-condition CheckPresenceToSetTemperatureEQ"
        }
      ]
    });
  } catch (e) { /* ignore */ }
  return m;
}
module.exports = { createModel };
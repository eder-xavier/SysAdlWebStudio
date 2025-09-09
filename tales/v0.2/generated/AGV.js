const { ModelBase, ComponentBase, PortBase, ConnectorBase, createExecutableFromExpression, ActivityBase, ActionBase } = require('../sysadl-runtime.js');
function createModel() {
  const m = new ModelBase("SysADLArchitecture");
  // instantiate component uses
  const cmp_cs = new ComponentBase("cs", { sysadlDefinition: "CheckStation" });
  cmp_cs && m.addComponent(cmp_cs);
  const cmp_ca = new ComponentBase("ca", { sysadlDefinition: "ControlArm" });
  cmp_ca && m.addComponent(cmp_ca);
  const cmp_nm = new ComponentBase("nm", { sysadlDefinition: "NotifierMotor" });
  cmp_nm && m.addComponent(cmp_nm);
  const cmp_sm = new ComponentBase("sm", { sysadlDefinition: "StartMoving" });
  cmp_sm && m.addComponent(cmp_sm);
  const cmp_na = new ComponentBase("na", { sysadlDefinition: "NotifierArm" });
  cmp_na && m.addComponent(cmp_na);
  const cmp_vt = new ComponentBase("vt", { sysadlDefinition: "VehicleTimer" });
  cmp_vt && m.addComponent(cmp_vt);
  const cmp_cs_ack_cs = new PortBase("ack_cs", 'in');
  cmp_cs_ack_cs.ownerComponent = "cs";
  cmp_cs.addPort(cmp_cs_ack_cs);
  const cmp_cs_location_cs = new PortBase("location_cs", 'in');
  cmp_cs_location_cs.ownerComponent = "cs";
  cmp_cs.addPort(cmp_cs_location_cs);
  const cmp_cs_destination_cs = new PortBase("destination_cs", 'in');
  cmp_cs_destination_cs.ownerComponent = "cs";
  cmp_cs.addPort(cmp_cs_destination_cs);
  const cmp_cs_stop = new PortBase("stop", 'in');
  cmp_cs_stop.ownerComponent = "cs";
  cmp_cs.addPort(cmp_cs_stop);
  const cmp_cs_arrivalDetected = new PortBase("arrivalDetected", 'in');
  cmp_cs_arrivalDetected.ownerComponent = "cs";
  cmp_cs.addPort(cmp_cs_arrivalDetected);
  const cmp_cs_passed = new PortBase("passed", 'in');
  cmp_cs_passed.ownerComponent = "cs";
  cmp_cs.addPort(cmp_cs_passed);
  const cmp_ca_cmd_ca = new PortBase("cmd_ca", 'in');
  cmp_ca_cmd_ca.ownerComponent = "ca";
  cmp_ca.addPort(cmp_ca_cmd_ca);
  const cmp_ca_ack_ca = new PortBase("ack_ca", 'in');
  cmp_ca_ack_ca.ownerComponent = "ca";
  cmp_ca.addPort(cmp_ca_ack_ca);
  const cmp_ca_startArm = new PortBase("startArm", 'in');
  cmp_ca_startArm.ownerComponent = "ca";
  cmp_ca.addPort(cmp_ca_startArm);
  const cmp_nm_inAck = new PortBase("inAck", 'in');
  cmp_nm_inAck.ownerComponent = "nm";
  cmp_nm.addPort(cmp_nm_inAck);
  const cmp_nm_ack = new PortBase("ack", 'in');
  cmp_nm_ack.ownerComponent = "nm";
  cmp_nm.addPort(cmp_nm_ack);
  const cmp_nm_outAck = new PortBase("outAck", 'in');
  cmp_nm_outAck.ownerComponent = "nm";
  cmp_nm.addPort(cmp_nm_outAck);
  const cmp_sm_move = new PortBase("move", 'in');
  cmp_sm_move.ownerComponent = "sm";
  cmp_sm.addPort(cmp_sm_move);
  const cmp_sm_cmd_sm = new PortBase("cmd_sm", 'in');
  cmp_sm_cmd_sm.ownerComponent = "sm";
  cmp_sm.addPort(cmp_sm_cmd_sm);
  const cmp_sm_destination = new PortBase("destination", 'in');
  cmp_sm_destination.ownerComponent = "sm";
  cmp_sm.addPort(cmp_sm_destination);
  const cmp_sm_start = new PortBase("start", 'in');
  cmp_sm_start.ownerComponent = "sm";
  cmp_sm.addPort(cmp_sm_start);
  const cmp_na_arrivedStatus = new PortBase("arrivedStatus", 'in');
  cmp_na_arrivedStatus.ownerComponent = "na";
  cmp_na.addPort(cmp_na_arrivedStatus);
  const cmp_na_loaded_unloaded = new PortBase("loaded_unloaded", 'in');
  cmp_na_loaded_unloaded.ownerComponent = "na";
  cmp_na.addPort(cmp_na_loaded_unloaded);
  const cmp_vt_AGVStatus = new PortBase("AGVStatus", 'in');
  cmp_vt_AGVStatus.ownerComponent = "vt";
  cmp_vt.addPort(cmp_vt_AGVStatus);
  const cmp_vt_location_vt = new PortBase("location_vt", 'in');
  cmp_vt_location_vt.ownerComponent = "vt";
  cmp_vt.addPort(cmp_vt_location_vt);
  const cmp_vt_destination_vt = new PortBase("destination_vt", 'in');
  cmp_vt_destination_vt.ownerComponent = "vt";
  cmp_vt.addPort(cmp_vt_destination_vt);
  const cmp_vt_cmd = new PortBase("cmd", 'in');
  cmp_vt_cmd.ownerComponent = "vt";
  cmp_vt.addPort(cmp_vt_cmd);
  const conn_destinationStation2 = new ConnectorBase("destinationStation2");
  m.addConnector(conn_destinationStation2);
  const conn__implicit = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit);
  const conn_destinationStation = new ConnectorBase("destinationStation");
  m.addConnector(conn_destinationStation);
  const conn_command = new ConnectorBase("command");
  m.addConnector(conn_command);
  const conn_command2 = new ConnectorBase("command2");
  m.addConnector(conn_command2);
  const conn_currentLocation = new ConnectorBase("currentLocation");
  m.addConnector(conn_currentLocation);
  const conn_sendNotificationMotor = new ConnectorBase("sendNotificationMotor");
  m.addConnector(conn_sendNotificationMotor);
  const conn_sendNotificationMotor2 = new ConnectorBase("sendNotificationMotor2");
  m.addConnector(conn_sendNotificationMotor2);
  // executables extracted from definitions
  try {
    m.addExecutable("SysADLArchitecture.SendStartMotorEX", createExecutableFromExpression(`
    CommandToMotor::start;
`, ["move"]));
  } catch (e) { /* ignore executable creation error */ }
  try {
    m.addExecutable("SysADLArchitecture.SendCommandEX", createExecutableFromExpression(`
    move->command;
`, ["move"]));
  } catch (e) { /* ignore executable creation error */ }
  try {
    m.addExecutable("SysADLArchitecture.SendDestinationEX", createExecutableFromExpression(`
    move->destination;
`, ["move"]));
  } catch (e) { /* ignore executable creation error */ }
  try {
    m.addExecutable("SysADLArchitecture.NotifyAGVFromMotorEX", createExecutableFromExpression(`
    statusMotor;
`, ["statusMotor"]));
  } catch (e) { /* ignore executable creation error */ }
  try {
    m.addExecutable("SysADLArchitecture.NotifySupervisoryFromMotorEX", createExecutableFromExpression(`
    NotificationToSupervisory::departed;
`, ["statusMotor"]));
  } catch (e) { /* ignore executable creation error */ }
  try {
    m.addExecutable("SysADLArchitecture.CompareStationsEX", createExecutableFromExpression(`
    true;
`, ["destination","location","statusMotor"]));
  } catch (e) { /* ignore executable creation error */ }
  try {
    m.addExecutable("SysADLArchitecture.StopMotorEX", createExecutableFromExpression(`
    CommandToMotor::stop;
`, ["comparisonResult"]));
  } catch (e) { /* ignore executable creation error */ }
  try {
    m.addExecutable("SysADLArchitecture.PassedMotorEX", createExecutableFromExpression(`
    NotificationToSupervisory::passed;
`, ["comparisonResult"]));
  } catch (e) { /* ignore executable creation error */ }
  try {
    m.addExecutable("SysADLArchitecture.SendCurrentLocationEX", createExecutableFromExpression(`
    location;
`, ["location"]));
  } catch (e) { /* ignore executable creation error */ }
  try {
    m.addExecutable("SysADLArchitecture.ControlArmEX", createExecutableFromExpression(`
    cmd;
`, ["statusMotor","cmd"]));
  } catch (e) { /* ignore executable creation error */ }
  try {
    m.addExecutable("SysADLArchitecture.NotifierArmEX", createExecutableFromExpression(`
    NotificationToSupervisory::arrived;
`, ["statusArm"]));
  } catch (e) { /* ignore executable creation error */ }
  try {
    m.addExecutable("SysADLArchitecture.VehicleTimerEX", createExecutableFromExpression(`
    s;
`, ["location","cmd","destination"]));
  } catch (e) { /* ignore executable creation error */ }
  // activities registered for component instances
  try {
    const __act_StartMovingAC_sm = new ActivityBase("StartMovingAC", { component: "sm", inputPorts: ["move"] });
    __act_StartMovingAC_sm.addAction(new ActionBase("SendStartMotorAN", [], "SysADLArchitecture.SendStartMotorEX", "constraint : post-condition SendStartMotorEQ\n\t\tdelegate SendStartMotorAN to cmd"));
    __act_StartMovingAC_sm.addAction(new ActionBase("SendCommandAN", [], "SysADLArchitecture.SendCommandEX", "constraint : post-condition SendCommandEQ\n\tdelegate SendCommandAN to cmd delegate move to move"));
    __act_StartMovingAC_sm.addAction(new ActionBase("SendDestinationAN", [], "SysADLArchitecture.SendDestinationEX", "constraint : post-condition SendDestinationEQ\n\tdelegate SendDestinationAN to destination delegate move to move"));
    m.registerActivity("StartMovingAC::sm", __act_StartMovingAC_sm);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckStationAC_cs = new ActivityBase("CheckStationAC", { component: "cs", inputPorts: ["destination_cs"] });
    __act_CheckStationAC_cs.addAction(new ActionBase("CompareStationsAN", [], "SysADLArchitecture.CompareStationsEX", "constraint : post-condition CompareStationsEQ pre-condition NotificationMotorIsStartedEQ\n\tdelegate CompareStationsAN to result delegate location to\n\t\tloc delegate destination to dest\n\t\tdelegate statusMotor to statusMotor"));
    __act_CheckStationAC_cs.addAction(new ActionBase("StopMotorAN", [], "SysADLArchitecture.StopMotorEX", "constraint : post-condition StopMotorEQ\n\tdelegate comparisonResult to result delegate StopMotorAN to cmd"));
    __act_CheckStationAC_cs.addAction(new ActionBase("PassedMotorAN", [], "SysADLArchitecture.PassedMotorEX", "constraint : post-condition PassedMotorEQ\n\tdelegate PassedMotorAN to ack delegate comparisonResult to result"));
    __act_CheckStationAC_cs.addAction(new ActionBase("SendCurrentLocationAN", [], "SysADLArchitecture.SendCurrentLocationEX", "constraint : post-condition SendCurrentLocationEQ\n\tdelegate location to inLocation delegate\n\t\tSendCurrentLocationAN to outLocation"));
    m.registerActivity("CheckStationAC::cs", __act_CheckStationAC_cs);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckStationAC_sm = new ActivityBase("CheckStationAC", { component: "sm", inputPorts: ["destination"] });
    __act_CheckStationAC_sm.addAction(new ActionBase("CompareStationsAN", [], "SysADLArchitecture.CompareStationsEX", "constraint : post-condition CompareStationsEQ pre-condition NotificationMotorIsStartedEQ\n\tdelegate CompareStationsAN to result delegate location to\n\t\tloc delegate destination to dest\n\t\tdelegate statusMotor to statusMotor"));
    __act_CheckStationAC_sm.addAction(new ActionBase("StopMotorAN", [], "SysADLArchitecture.StopMotorEX", "constraint : post-condition StopMotorEQ\n\tdelegate comparisonResult to result delegate StopMotorAN to cmd"));
    __act_CheckStationAC_sm.addAction(new ActionBase("PassedMotorAN", [], "SysADLArchitecture.PassedMotorEX", "constraint : post-condition PassedMotorEQ\n\tdelegate PassedMotorAN to ack delegate comparisonResult to result"));
    __act_CheckStationAC_sm.addAction(new ActionBase("SendCurrentLocationAN", [], "SysADLArchitecture.SendCurrentLocationEX", "constraint : post-condition SendCurrentLocationEQ\n\tdelegate location to inLocation delegate\n\t\tSendCurrentLocationAN to outLocation"));
    m.registerActivity("CheckStationAC::sm", __act_CheckStationAC_sm);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckStationAC_vt = new ActivityBase("CheckStationAC", { component: "vt", inputPorts: ["destination_vt"] });
    __act_CheckStationAC_vt.addAction(new ActionBase("CompareStationsAN", [], "SysADLArchitecture.CompareStationsEX", "constraint : post-condition CompareStationsEQ pre-condition NotificationMotorIsStartedEQ\n\tdelegate CompareStationsAN to result delegate location to\n\t\tloc delegate destination to dest\n\t\tdelegate statusMotor to statusMotor"));
    __act_CheckStationAC_vt.addAction(new ActionBase("StopMotorAN", [], "SysADLArchitecture.StopMotorEX", "constraint : post-condition StopMotorEQ\n\tdelegate comparisonResult to result delegate StopMotorAN to cmd"));
    __act_CheckStationAC_vt.addAction(new ActionBase("PassedMotorAN", [], "SysADLArchitecture.PassedMotorEX", "constraint : post-condition PassedMotorEQ\n\tdelegate PassedMotorAN to ack delegate comparisonResult to result"));
    __act_CheckStationAC_vt.addAction(new ActionBase("SendCurrentLocationAN", [], "SysADLArchitecture.SendCurrentLocationEX", "constraint : post-condition SendCurrentLocationEQ\n\tdelegate location to inLocation delegate\n\t\tSendCurrentLocationAN to outLocation"));
    m.registerActivity("CheckStationAC::vt", __act_CheckStationAC_vt);
  } catch (e) { /* ignore */ }
  try {
    const __act_ControlArmAC_ca = new ActivityBase("ControlArmAC", { component: "ca", inputPorts: ["cmd_ca"] });
    __act_ControlArmAC_ca.addAction(new ActionBase("ControlArmAN", [], "SysADLArchitecture.ControlArmEX", "constraint : post-condition ControlArmEQ\n\tdelegate ControlArmAN to startArm delegate statusMotor to\n\t\tstatusMotor delegate cmd to cmd"));
    m.registerActivity("ControlArmAC::ca", __act_ControlArmAC_ca);
  } catch (e) { /* ignore */ }
  try {
    const __act_ControlArmAC_sm = new ActivityBase("ControlArmAC", { component: "sm", inputPorts: ["cmd_sm"] });
    __act_ControlArmAC_sm.addAction(new ActionBase("ControlArmAN", [], "SysADLArchitecture.ControlArmEX", "constraint : post-condition ControlArmEQ\n\tdelegate ControlArmAN to startArm delegate statusMotor to\n\t\tstatusMotor delegate cmd to cmd"));
    m.registerActivity("ControlArmAC::sm", __act_ControlArmAC_sm);
  } catch (e) { /* ignore */ }
  try {
    const __act_ControlArmAC_vt = new ActivityBase("ControlArmAC", { component: "vt", inputPorts: ["cmd"] });
    __act_ControlArmAC_vt.addAction(new ActionBase("ControlArmAN", [], "SysADLArchitecture.ControlArmEX", "constraint : post-condition ControlArmEQ\n\tdelegate ControlArmAN to startArm delegate statusMotor to\n\t\tstatusMotor delegate cmd to cmd"));
    m.registerActivity("ControlArmAC::vt", __act_ControlArmAC_vt);
  } catch (e) { /* ignore */ }
  try {
    const __act_VehicleTimerAC_vt = new ActivityBase("VehicleTimerAC", { component: "vt", inputPorts: ["destination_vt","location_vt"] });
    __act_VehicleTimerAC_vt.addAction(new ActionBase("VehicleTimerAN", [], "SysADLArchitecture.VehicleTimerEX", "constraint : post-condition VehicleTimerEQ\n\tdelegate VehicleTimerAN to s delegate location to\n\t\tloc delegate destination to dest delegate cmd\n\t\tto cmd"));
    m.registerActivity("VehicleTimerAC::vt", __act_VehicleTimerAC_vt);
  } catch (e) { /* ignore */ }
  try {
    const __act_StartMovingAC = new ActivityBase("StartMovingAC", { component: "sm", inputPorts: ["move"] });
    __act_StartMovingAC.addAction(new ActionBase("SendStartMotorAN", [], "SysADLArchitecture.SendStartMotorEX", "constraint : post-condition SendStartMotorEQ\n\t\tdelegate SendStartMotorAN to cmd"));
    __act_StartMovingAC.addAction(new ActionBase("SendCommandAN", [], "SysADLArchitecture.SendCommandEX", "constraint : post-condition SendCommandEQ\n\tdelegate SendCommandAN to cmd delegate move to move"));
    __act_StartMovingAC.addAction(new ActionBase("SendDestinationAN", [], "SysADLArchitecture.SendDestinationEX", "constraint : post-condition SendDestinationEQ\n\tdelegate SendDestinationAN to destination delegate move to move"));
    m.registerActivity("StartMovingAC", __act_StartMovingAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckStationAC = new ActivityBase("CheckStationAC", { component: "cs", inputPorts: ["destination_cs"] });
    __act_CheckStationAC.addAction(new ActionBase("CompareStationsAN", [], "SysADLArchitecture.CompareStationsEX", "constraint : post-condition CompareStationsEQ pre-condition NotificationMotorIsStartedEQ\n\tdelegate CompareStationsAN to result delegate location to\n\t\tloc delegate destination to dest\n\t\tdelegate statusMotor to statusMotor"));
    __act_CheckStationAC.addAction(new ActionBase("StopMotorAN", [], "SysADLArchitecture.StopMotorEX", "constraint : post-condition StopMotorEQ\n\tdelegate comparisonResult to result delegate StopMotorAN to cmd"));
    __act_CheckStationAC.addAction(new ActionBase("PassedMotorAN", [], "SysADLArchitecture.PassedMotorEX", "constraint : post-condition PassedMotorEQ\n\tdelegate PassedMotorAN to ack delegate comparisonResult to result"));
    __act_CheckStationAC.addAction(new ActionBase("SendCurrentLocationAN", [], "SysADLArchitecture.SendCurrentLocationEX", "constraint : post-condition SendCurrentLocationEQ\n\tdelegate location to inLocation delegate\n\t\tSendCurrentLocationAN to outLocation"));
    m.registerActivity("CheckStationAC", __act_CheckStationAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckStationAC = new ActivityBase("CheckStationAC", { component: "sm", inputPorts: ["destination"] });
    __act_CheckStationAC.addAction(new ActionBase("CompareStationsAN", [], "SysADLArchitecture.CompareStationsEX", "constraint : post-condition CompareStationsEQ pre-condition NotificationMotorIsStartedEQ\n\tdelegate CompareStationsAN to result delegate location to\n\t\tloc delegate destination to dest\n\t\tdelegate statusMotor to statusMotor"));
    __act_CheckStationAC.addAction(new ActionBase("StopMotorAN", [], "SysADLArchitecture.StopMotorEX", "constraint : post-condition StopMotorEQ\n\tdelegate comparisonResult to result delegate StopMotorAN to cmd"));
    __act_CheckStationAC.addAction(new ActionBase("PassedMotorAN", [], "SysADLArchitecture.PassedMotorEX", "constraint : post-condition PassedMotorEQ\n\tdelegate PassedMotorAN to ack delegate comparisonResult to result"));
    __act_CheckStationAC.addAction(new ActionBase("SendCurrentLocationAN", [], "SysADLArchitecture.SendCurrentLocationEX", "constraint : post-condition SendCurrentLocationEQ\n\tdelegate location to inLocation delegate\n\t\tSendCurrentLocationAN to outLocation"));
    m.registerActivity("CheckStationAC", __act_CheckStationAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckStationAC = new ActivityBase("CheckStationAC", { component: "vt", inputPorts: ["destination_vt"] });
    __act_CheckStationAC.addAction(new ActionBase("CompareStationsAN", [], "SysADLArchitecture.CompareStationsEX", "constraint : post-condition CompareStationsEQ pre-condition NotificationMotorIsStartedEQ\n\tdelegate CompareStationsAN to result delegate location to\n\t\tloc delegate destination to dest\n\t\tdelegate statusMotor to statusMotor"));
    __act_CheckStationAC.addAction(new ActionBase("StopMotorAN", [], "SysADLArchitecture.StopMotorEX", "constraint : post-condition StopMotorEQ\n\tdelegate comparisonResult to result delegate StopMotorAN to cmd"));
    __act_CheckStationAC.addAction(new ActionBase("PassedMotorAN", [], "SysADLArchitecture.PassedMotorEX", "constraint : post-condition PassedMotorEQ\n\tdelegate PassedMotorAN to ack delegate comparisonResult to result"));
    __act_CheckStationAC.addAction(new ActionBase("SendCurrentLocationAN", [], "SysADLArchitecture.SendCurrentLocationEX", "constraint : post-condition SendCurrentLocationEQ\n\tdelegate location to inLocation delegate\n\t\tSendCurrentLocationAN to outLocation"));
    m.registerActivity("CheckStationAC", __act_CheckStationAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_ControlArmAC = new ActivityBase("ControlArmAC", { component: "ca", inputPorts: ["cmd_ca"] });
    __act_ControlArmAC.addAction(new ActionBase("ControlArmAN", [], "SysADLArchitecture.ControlArmEX", "constraint : post-condition ControlArmEQ\n\tdelegate ControlArmAN to startArm delegate statusMotor to\n\t\tstatusMotor delegate cmd to cmd"));
    m.registerActivity("ControlArmAC", __act_ControlArmAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_ControlArmAC = new ActivityBase("ControlArmAC", { component: "sm", inputPorts: ["cmd_sm"] });
    __act_ControlArmAC.addAction(new ActionBase("ControlArmAN", [], "SysADLArchitecture.ControlArmEX", "constraint : post-condition ControlArmEQ\n\tdelegate ControlArmAN to startArm delegate statusMotor to\n\t\tstatusMotor delegate cmd to cmd"));
    m.registerActivity("ControlArmAC", __act_ControlArmAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_ControlArmAC = new ActivityBase("ControlArmAC", { component: "vt", inputPorts: ["cmd"] });
    __act_ControlArmAC.addAction(new ActionBase("ControlArmAN", [], "SysADLArchitecture.ControlArmEX", "constraint : post-condition ControlArmEQ\n\tdelegate ControlArmAN to startArm delegate statusMotor to\n\t\tstatusMotor delegate cmd to cmd"));
    m.registerActivity("ControlArmAC", __act_ControlArmAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_VehicleTimerAC = new ActivityBase("VehicleTimerAC", { component: "vt", inputPorts: ["destination_vt","location_vt"] });
    __act_VehicleTimerAC.addAction(new ActionBase("VehicleTimerAN", [], "SysADLArchitecture.VehicleTimerEX", "constraint : post-condition VehicleTimerEQ\n\tdelegate VehicleTimerAN to s delegate location to\n\t\tloc delegate destination to dest delegate cmd\n\t\tto cmd"));
    m.registerActivity("VehicleTimerAC", __act_VehicleTimerAC);
  } catch (e) { /* ignore */ }
  return m;
}
module.exports = { createModel };
const { ModelBase, ComponentBase, PortBase, ConnectorBase, createExecutableFromExpression } = require('../sysadl-runtime.js');
function createModel() {
  const m = new ModelBase("SysADLArchitecture");
  // instantiate component uses
  const conn_nS = new ConnectorBase("nS");
  m.addConnector(conn_nS);
  const conn__implicit = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit);
  const conn_sVD = new ConnectorBase("sVD");
  m.addConnector(conn_sVD);
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
  return m;
}
module.exports = { createModel };
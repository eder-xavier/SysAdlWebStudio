const { ModelBase, ComponentBase, PortBase, ConnectorBase, createExecutableFromExpression } = require('./../sysadl-runtime.js');
function createModel() {
  const m = new ModelBase('SysADLArchitecture');
  // create component instances and ports (generated from configuration)
  const cmp_ss = new ComponentBase("ss");
  cmp_ss && m.addComponent(cmp_ss);
  const cmp_ss_in_outDataS = new PortBase("in_outDataS", 'in');
  cmp_ss_in_outDataS.ownerComponent = "ss";
  cmp_ss.addPort(cmp_ss_in_outDataS);
  const cmp_agvs = new ComponentBase("agvs");
  cmp_agvs && m.addComponent(cmp_agvs);
  const cmp_agvs_sendStatus = new PortBase("sendStatus", 'in');
  cmp_agvs_sendStatus.ownerComponent = "agvs";
  cmp_agvs.addPort(cmp_agvs_sendStatus);
  const cmp_agvs_in_outDataAgv = new PortBase("in_outDataAgv", 'in');
  cmp_agvs_in_outDataAgv.ownerComponent = "agvs";
  cmp_agvs.addPort(cmp_agvs_in_outDataAgv);
  const cmp_ds = new ComponentBase("ds");
  cmp_ds && m.addComponent(cmp_ds);
  const cmp_ds_receiveStatus = new PortBase("receiveStatus", 'in');
  cmp_ds_receiveStatus.ownerComponent = "ds";
  cmp_ds.addPort(cmp_ds_receiveStatus);
  const cmp_m = new ComponentBase("m");
  cmp_m && m.addComponent(cmp_m);
  const cmp_m_start_stop_in = new PortBase("start_stop_in", 'in');
  cmp_m_start_stop_in.ownerComponent = "m";
  cmp_m.addPort(cmp_m_start_stop_in);
  const cmp_m_started_stopped_out = new PortBase("started_stopped_out", 'in');
  cmp_m_started_stopped_out.ownerComponent = "m";
  cmp_m.addPort(cmp_m_started_stopped_out);
  const cmp_as = new ComponentBase("as");
  cmp_as && m.addComponent(cmp_as);
  const cmp_as_arrivalDetected_out = new PortBase("arrivalDetected_out", 'in');
  cmp_as_arrivalDetected_out.ownerComponent = "as";
  cmp_as.addPort(cmp_as_arrivalDetected_out);
  const cmp_ra = new ComponentBase("ra");
  cmp_ra && m.addComponent(cmp_ra);
  const cmp_ra_start = new PortBase("start", 'in');
  cmp_ra_start.ownerComponent = "ra";
  cmp_ra.addPort(cmp_ra_start);
  const cmp_ra_started = new PortBase("started", 'in');
  cmp_ra_started.ownerComponent = "ra";
  cmp_ra.addPort(cmp_ra_started);
  const cmp_vc = new ComponentBase("vc");
  cmp_vc && m.addComponent(cmp_vc);
  const cmp_vc_sendStatus = new PortBase("sendStatus", 'in');
  cmp_vc_sendStatus.ownerComponent = "vc";
  cmp_vc.addPort(cmp_vc_sendStatus);
  const cmp_vc_arrivalDetected_in = new PortBase("arrivalDetected_in", 'in');
  cmp_vc_arrivalDetected_in.ownerComponent = "vc";
  cmp_vc.addPort(cmp_vc_arrivalDetected_in);
  const cmp_vc_startArm = new PortBase("startArm", 'in');
  cmp_vc_startArm.ownerComponent = "vc";
  cmp_vc.addPort(cmp_vc_startArm);
  const cmp_vc_startedArm = new PortBase("startedArm", 'in');
  cmp_vc_startedArm.ownerComponent = "vc";
  cmp_vc.addPort(cmp_vc_startedArm);
  const cmp_vc_started_stopped_in = new PortBase("started_stopped_in", 'in');
  cmp_vc_started_stopped_in.ownerComponent = "vc";
  cmp_vc.addPort(cmp_vc_started_stopped_in);
  const cmp_vc_start_stop_out = new PortBase("start_stop_out", 'in');
  cmp_vc_start_stop_out.ownerComponent = "vc";
  cmp_vc.addPort(cmp_vc_start_stop_out);
  const cmp_vc_in_outData = new PortBase("in_outData", 'in');
  cmp_vc_in_outData.ownerComponent = "vc";
  cmp_vc.addPort(cmp_vc_in_outData);
  const cmp_cs = new ComponentBase("cs");
  cmp_cs && m.addComponent(cmp_cs);
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
  const cmp_ca = new ComponentBase("ca");
  cmp_ca && m.addComponent(cmp_ca);
  const cmp_ca_cmd_ca = new PortBase("cmd_ca", 'in');
  cmp_ca_cmd_ca.ownerComponent = "ca";
  cmp_ca.addPort(cmp_ca_cmd_ca);
  const cmp_ca_ack_ca = new PortBase("ack_ca", 'in');
  cmp_ca_ack_ca.ownerComponent = "ca";
  cmp_ca.addPort(cmp_ca_ack_ca);
  const cmp_ca_startArm = new PortBase("startArm", 'in');
  cmp_ca_startArm.ownerComponent = "ca";
  cmp_ca.addPort(cmp_ca_startArm);
  const cmp_nm = new ComponentBase("nm");
  cmp_nm && m.addComponent(cmp_nm);
  const cmp_nm_inAck = new PortBase("inAck", 'in');
  cmp_nm_inAck.ownerComponent = "nm";
  cmp_nm.addPort(cmp_nm_inAck);
  const cmp_nm_ack = new PortBase("ack", 'in');
  cmp_nm_ack.ownerComponent = "nm";
  cmp_nm.addPort(cmp_nm_ack);
  const cmp_nm_outAck = new PortBase("outAck", 'in');
  cmp_nm_outAck.ownerComponent = "nm";
  cmp_nm.addPort(cmp_nm_outAck);
  const cmp_sm = new ComponentBase("sm");
  cmp_sm && m.addComponent(cmp_sm);
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
  const cmp_na = new ComponentBase("na");
  cmp_na && m.addComponent(cmp_na);
  const cmp_na_arrivedStatus = new PortBase("arrivedStatus", 'in');
  cmp_na_arrivedStatus.ownerComponent = "na";
  cmp_na.addPort(cmp_na_arrivedStatus);
  const cmp_na_loaded_unloaded = new PortBase("loaded_unloaded", 'in');
  cmp_na_loaded_unloaded.ownerComponent = "na";
  cmp_na.addPort(cmp_na_loaded_unloaded);
  const cmp_vt = new ComponentBase("vt");
  cmp_vt && m.addComponent(cmp_vt);
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
  const conn_nS = new ConnectorBase("nS");
  m.addConnector(conn_nS);
  const conn__implicit = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit);
  const conn_sVD = new ConnectorBase("sVD");
  m.addConnector(conn_sVD);
  const conn_dataExchange = new ConnectorBase("dataExchange");
  m.addConnector(conn_dataExchange);
  const conn_updateStatus = new ConnectorBase("updateStatus");
  m.addConnector(conn_updateStatus);
  const conn_arrived = new ConnectorBase("arrived");
  m.addConnector(conn_arrived);
  const conn_ackArm = new ConnectorBase("ackArm");
  m.addConnector(conn_ackArm);
  const conn_cmdArm = new ConnectorBase("cmdArm");
  m.addConnector(conn_cmdArm);
  const conn_ackMotor = new ConnectorBase("ackMotor");
  m.addConnector(conn_ackMotor);
  const conn_cmdMotor = new ConnectorBase("cmdMotor");
  m.addConnector(conn_cmdMotor);
  const conn_destinationStation2 = new ConnectorBase("destinationStation2");
  m.addConnector(conn_destinationStation2);
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
  // register activity StartMovingAC

  m.registerActivity("StartMovingAC", { component: "sm", inputPorts: [], actions: [{"name":"SendCommandAN","executable":"SendCommandEX","params":[]},{"name":"SendDestinationAN","executable":"SendDestinationEX","params":[]},{"name":"SendStartMotorAN","executable":"SendStartMotorEX","params":[]}] });
  // register activity NotifierMotorAC

  m.registerActivity("NotifierMotorAC", { component: "nm", inputPorts: [], actions: [{"name":"NotifyAGVFromMotorAN","executable":"NotifyAGVFromMotorEX","params":[]},{"name":"NotifySupervisoryFromMotorAN","executable":"NotifySupervisoryFromMotorEX","params":[]}] });
  // register activity CheckStationAC

  m.registerActivity("CheckStationAC", { component: "cs", inputPorts: [], actions: [{"name":"CompareStationsAN","executable":"CompareStationsEX","params":[]},{"name":"SendCurrentLocationAN","executable":"SendCurrentLocationEX","params":[]},{"name":"StopMotorAN","executable":"StopMotorEX","params":[]},{"name":"PassedMotorAN","executable":"PassedMotorEX","params":[]}] });
  // register activity ControlArmAC

  m.registerActivity("ControlArmAC", { component: "ca", inputPorts: [], actions: [{"name":"ControlArmAN","executable":"ControlArmEX","params":[]}] });
  // register activity NotifierArmAC

  m.registerActivity("NotifierArmAC", { component: "na", inputPorts: [], actions: [{"name":"NotifierArmAN","executable":"NotifierArmEX","params":[]}] });
  // register activity VehicleTimerAC

  m.registerActivity("VehicleTimerAC", { component: "vt", inputPorts: [], actions: [{"name":"VehicleTimerAN","executable":"VehicleTimerEX","params":[]}] });
  // inferred binding ss.in_outDataS -> in_outDataAgv.in_outDataS
  if (cmp_ss && cmp_ss.ports && cmp_ss.ports["in_outDataS"]) {
    cmp_ss.ports["in_outDataS"].bindTo({ receive: function(v, model){ if (cmp_in_outDataAgv && cmp_in_outDataAgv.ports && cmp_in_outDataAgv.ports["in_outDataS"]) { cmp_in_outDataAgv.ports["in_outDataS"].receive(v, model);
    } } });
  }
  // inferred binding agvs.sendStatus -> receiveStatus.sendStatus
  if (cmp_agvs && cmp_agvs.ports && cmp_agvs.ports["sendStatus"]) {
    cmp_agvs.ports["sendStatus"].bindTo({ receive: function(v, model){ if (cmp_receiveStatus && cmp_receiveStatus.ports && cmp_receiveStatus.ports["sendStatus"]) { cmp_receiveStatus.ports["sendStatus"].receive(v, model);
    } } });
  }
  // inferred binding vc.sendStatus -> receiveStatus.sendStatus
  if (cmp_vc && cmp_vc.ports && cmp_vc.ports["sendStatus"]) {
    cmp_vc.ports["sendStatus"].bindTo({ receive: function(v, model){ if (cmp_receiveStatus && cmp_receiveStatus.ports && cmp_receiveStatus.ports["sendStatus"]) { cmp_receiveStatus.ports["sendStatus"].receive(v, model);
    } } });
  }
  // inferred binding as.arrivalDetected_out -> arrivalDetected_in.arrivalDetected_out
  if (cmp_as && cmp_as.ports && cmp_as.ports["arrivalDetected_out"]) {
    cmp_as.ports["arrivalDetected_out"].bindTo({ receive: function(v, model){ if (cmp_arrivalDetected_in && cmp_arrivalDetected_in.ports && cmp_arrivalDetected_in.ports["arrivalDetected_out"]) { cmp_arrivalDetected_in.ports["arrivalDetected_out"].receive(v, model);
    } } });
  }
  // inferred binding ra.started -> startedArm.started
  if (cmp_ra && cmp_ra.ports && cmp_ra.ports["started"]) {
    cmp_ra.ports["started"].bindTo({ receive: function(v, model){ if (cmp_startedArm && cmp_startedArm.ports && cmp_startedArm.ports["started"]) { cmp_startedArm.ports["started"].receive(v, model);
    } } });
  }
  // inferred binding vc.startArm -> start.startArm
  if (cmp_vc && cmp_vc.ports && cmp_vc.ports["startArm"]) {
    cmp_vc.ports["startArm"].bindTo({ receive: function(v, model){ if (cmp_start && cmp_start.ports && cmp_start.ports["startArm"]) { cmp_start.ports["startArm"].receive(v, model);
    } } });
  }
  // inferred binding ca.startArm -> start.startArm
  if (cmp_ca && cmp_ca.ports && cmp_ca.ports["startArm"]) {
    cmp_ca.ports["startArm"].bindTo({ receive: function(v, model){ if (cmp_start && cmp_start.ports && cmp_start.ports["startArm"]) { cmp_start.ports["startArm"].receive(v, model);
    } } });
  }
  // inferred binding m.started_stopped_out -> started_stopped_in.started_stopped_out
  if (cmp_m && cmp_m.ports && cmp_m.ports["started_stopped_out"]) {
    cmp_m.ports["started_stopped_out"].bindTo({ receive: function(v, model){ if (cmp_started_stopped_in && cmp_started_stopped_in.ports && cmp_started_stopped_in.ports["started_stopped_out"]) { cmp_started_stopped_in.ports["started_stopped_out"].receive(v, model);
    } } });
  }
  // inferred binding vc.start_stop_out -> start_stop_in.start_stop_out
  if (cmp_vc && cmp_vc.ports && cmp_vc.ports["start_stop_out"]) {
    cmp_vc.ports["start_stop_out"].bindTo({ receive: function(v, model){ if (cmp_start_stop_in && cmp_start_stop_in.ports && cmp_start_stop_in.ports["start_stop_out"]) { cmp_start_stop_in.ports["start_stop_out"].receive(v, model);
    } } });
  }
  // inferred binding sm.destination -> destination_vt.destination
  if (cmp_sm && cmp_sm.ports && cmp_sm.ports["destination"]) {
    cmp_sm.ports["destination"].bindTo({ receive: function(v, model){ if (cmp_destination_vt && cmp_destination_vt.ports && cmp_destination_vt.ports["destination"]) { cmp_destination_vt.ports["destination"].receive(v, model);
    } } });
  }
  // inferred binding sm.destination -> destination_cs.destination
  if (cmp_sm && cmp_sm.ports && cmp_sm.ports["destination"]) {
    cmp_sm.ports["destination"].bindTo({ receive: function(v, model){ if (cmp_destination_cs && cmp_destination_cs.ports && cmp_destination_cs.ports["destination"]) { cmp_destination_cs.ports["destination"].receive(v, model);
    } } });
  }
  // inferred binding sm.cmd_sm -> cmd.cmd_sm
  if (cmp_sm && cmp_sm.ports && cmp_sm.ports["cmd_sm"]) {
    cmp_sm.ports["cmd_sm"].bindTo({ receive: function(v, model){ if (cmp_cmd && cmp_cmd.ports && cmp_cmd.ports["cmd_sm"]) { cmp_cmd.ports["cmd_sm"].receive(v, model);
    } } });
  }
  // inferred binding sm.cmd_sm -> cmd_ca.cmd_sm
  if (cmp_sm && cmp_sm.ports && cmp_sm.ports["cmd_sm"]) {
    cmp_sm.ports["cmd_sm"].bindTo({ receive: function(v, model){ if (cmp_cmd_ca && cmp_cmd_ca.ports && cmp_cmd_ca.ports["cmd_sm"]) { cmp_cmd_ca.ports["cmd_sm"].receive(v, model);
    } } });
  }
  // inferred binding cs.location_cs -> location_vt.location_cs
  if (cmp_cs && cmp_cs.ports && cmp_cs.ports["location_cs"]) {
    cmp_cs.ports["location_cs"].bindTo({ receive: function(v, model){ if (cmp_location_vt && cmp_location_vt.ports && cmp_location_vt.ports["location_cs"]) { cmp_location_vt.ports["location_cs"].receive(v, model);
    } } });
  }
  // inferred binding nm.outAck -> ack_ca.outAck
  if (cmp_nm && cmp_nm.ports && cmp_nm.ports["outAck"]) {
    cmp_nm.ports["outAck"].bindTo({ receive: function(v, model){ if (cmp_ack_ca && cmp_ack_ca.ports && cmp_ack_ca.ports["outAck"]) { cmp_ack_ca.ports["outAck"].receive(v, model);
    } } });
  }
  // inferred binding nm.outAck -> ack_cs.outAck
  if (cmp_nm && cmp_nm.ports && cmp_nm.ports["outAck"]) {
    cmp_nm.ports["outAck"].bindTo({ receive: function(v, model){ if (cmp_ack_cs && cmp_ack_cs.ports && cmp_ack_cs.ports["outAck"]) { cmp_ack_cs.ports["outAck"].receive(v, model);
    } } });
  }
  // executable SendStartMotorEX
  m.addExecutable('SendStartMotorEX', createExecutableFromExpression("\"CommandToMotor::start\"", ['move']));
  // executable SendCommandEX
  m.addExecutable('SendCommandEX', createExecutableFromExpression("(move && move[\"command\"])", ['move']));
  // executable SendDestinationEX
  m.addExecutable('SendDestinationEX', createExecutableFromExpression("(move && move[\"destination\"])", ['move']));
  // executable NotifyAGVFromMotorEX
  m.addExecutable('NotifyAGVFromMotorEX', createExecutableFromExpression("statusMotor", ['statusMotor']));
  // executable NotifySupervisoryFromMotorEX
  m.addExecutable('NotifySupervisoryFromMotorEX', createExecutableFromExpression("\"NotificationToSupervisory::departed\"", ['statusMotor']));
  // executable CompareStationsEX
  m.addExecutable('CompareStationsEX', createExecutableFromExpression("true", ['destination', 'location', 'statusMotor']));
  // executable StopMotorEX
  m.addExecutable('StopMotorEX', createExecutableFromExpression("\"CommandToMotor::stop\"", ['comparisonResult']));
  // executable PassedMotorEX
  m.addExecutable('PassedMotorEX', createExecutableFromExpression("\"NotificationToSupervisory::passed\"", ['comparisonResult']));
  // executable SendCurrentLocationEX
  m.addExecutable('SendCurrentLocationEX', createExecutableFromExpression("location", ['location']));
  // executable ControlArmEX
  m.addExecutable('ControlArmEX', createExecutableFromExpression("cmd", ['statusMotor', 'cmd']));
  // executable NotifierArmEX
  m.addExecutable('NotifierArmEX', createExecutableFromExpression("\"NotificationToSupervisory::arrived\"", ['statusArm']));
  // executable VehicleTimerEX
  m.addExecutable('VehicleTimerEX', createExecutableFromExpression("s", ['location', 'cmd', 'destination']));
  return m;
}
module.exports = { createModel };
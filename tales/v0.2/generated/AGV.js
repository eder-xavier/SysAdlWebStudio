const { ModelBase, ComponentBase, PortBase, ConnectorBase, createExecutableFromExpression, ActivityBase, ActionBase } = require('../sysadl-runtime.js');
function createModel() {
  const m = new ModelBase("SysADLArchitecture");
  // instantiate component uses
  const cmp_ss = new ComponentBase("ss", { sysadlDefinition: "SupervisorySystem" });
  cmp_ss && m.addComponent(cmp_ss);
  const cmp_agvs = new ComponentBase("agvs", { sysadlDefinition: "AGVSystem" });
  cmp_agvs && m.addComponent(cmp_agvs);
  const cmp_agvs_m = new ComponentBase("agvs.m", { sysadlDefinition: "Motor" });
  cmp_agvs_m && m.addComponent(cmp_agvs_m);
  const cmp_agvs_as = new ComponentBase("agvs.as", { sysadlDefinition: "ArrivalSensor" });
  cmp_agvs_as && m.addComponent(cmp_agvs_as);
  const cmp_agvs_ra = new ComponentBase("agvs.ra", { sysadlDefinition: "RobotArm" });
  cmp_agvs_ra && m.addComponent(cmp_agvs_ra);
  const cmp_agvs_vc = new ComponentBase("agvs.vc", { sysadlDefinition: "VehicleControl" });
  cmp_agvs_vc && m.addComponent(cmp_agvs_vc);
  const cmp_agvs_vc_cs = new ComponentBase("agvs.vc.cs", { sysadlDefinition: "CheckStation" });
  cmp_agvs_vc_cs && m.addComponent(cmp_agvs_vc_cs);
  const cmp_agvs_vc_ca = new ComponentBase("agvs.vc.ca", { sysadlDefinition: "ControlArm" });
  cmp_agvs_vc_ca && m.addComponent(cmp_agvs_vc_ca);
  const cmp_agvs_vc_nm = new ComponentBase("agvs.vc.nm", { sysadlDefinition: "NotifierMotor" });
  cmp_agvs_vc_nm && m.addComponent(cmp_agvs_vc_nm);
  const cmp_agvs_vc_sm = new ComponentBase("agvs.vc.sm", { sysadlDefinition: "StartMoving" });
  cmp_agvs_vc_sm && m.addComponent(cmp_agvs_vc_sm);
  const cmp_agvs_vc_na = new ComponentBase("agvs.vc.na", { sysadlDefinition: "NotifierArm" });
  cmp_agvs_vc_na && m.addComponent(cmp_agvs_vc_na);
  const cmp_agvs_vc_vt = new ComponentBase("agvs.vc.vt", { sysadlDefinition: "VehicleTimer" });
  cmp_agvs_vc_vt && m.addComponent(cmp_agvs_vc_vt);
  const cmp_ds = new ComponentBase("ds", { sysadlDefinition: "DisplaySystem" });
  cmp_ds && m.addComponent(cmp_ds);
  const __portVars = {};
  const cmp_ss_in_outDataS = new PortBase("in_outDataS", 'in');
  cmp_ss_in_outDataS.ownerComponent = "ss";
  cmp_ss.addPort(cmp_ss_in_outDataS);
  __portVars["ss"] = __portVars["ss"] || {};
  __portVars["ss"]["in_outDataS"] = cmp_ss_in_outDataS;
  const cmp_agvs_sendStatus = new PortBase("sendStatus", 'in');
  cmp_agvs_sendStatus.ownerComponent = "agvs";
  cmp_agvs.addPort(cmp_agvs_sendStatus);
  __portVars["agvs"] = __portVars["agvs"] || {};
  __portVars["agvs"]["sendStatus"] = cmp_agvs_sendStatus;
  const cmp_agvs_in_outDataAgv = new PortBase("in_outDataAgv", 'in');
  cmp_agvs_in_outDataAgv.ownerComponent = "agvs";
  cmp_agvs.addPort(cmp_agvs_in_outDataAgv);
  __portVars["agvs"] = __portVars["agvs"] || {};
  __portVars["agvs"]["in_outDataAgv"] = cmp_agvs_in_outDataAgv;
  const cmp_ds_receiveStatus = new PortBase("receiveStatus", 'in');
  cmp_ds_receiveStatus.ownerComponent = "ds";
  cmp_ds.addPort(cmp_ds_receiveStatus);
  __portVars["ds"] = __portVars["ds"] || {};
  __portVars["ds"]["receiveStatus"] = cmp_ds_receiveStatus;
  const cmp_agvs_vc_sm_move = new PortBase("move", 'in');
  cmp_agvs_vc_sm_move.ownerComponent = "agvs.vc.sm";
  cmp_agvs_vc_sm.addPort(cmp_agvs_vc_sm_move);
  __portVars["agvs.vc.sm"] = __portVars["agvs.vc.sm"] || {};
  __portVars["agvs.vc.sm"]["move"] = cmp_agvs_vc_sm_move;
  const cmp_agvs_vc_nm_inStatusMotor = new PortBase("inStatusMotor", 'in');
  cmp_agvs_vc_nm_inStatusMotor.ownerComponent = "agvs.vc.nm";
  cmp_agvs_vc_nm.addPort(cmp_agvs_vc_nm_inStatusMotor);
  __portVars["agvs.vc.nm"] = __portVars["agvs.vc.nm"] || {};
  __portVars["agvs.vc.nm"]["inStatusMotor"] = cmp_agvs_vc_nm_inStatusMotor;
  const cmp_agvs_vc_cs_statusMotor = new PortBase("statusMotor", 'in');
  cmp_agvs_vc_cs_statusMotor.ownerComponent = "agvs.vc.cs";
  cmp_agvs_vc_cs.addPort(cmp_agvs_vc_cs_statusMotor);
  __portVars["agvs.vc.cs"] = __portVars["agvs.vc.cs"] || {};
  __portVars["agvs.vc.cs"]["statusMotor"] = cmp_agvs_vc_cs_statusMotor;
  const cmp_agvs_vc_cs_destination = new PortBase("destination", 'in');
  cmp_agvs_vc_cs_destination.ownerComponent = "agvs.vc.cs";
  cmp_agvs_vc_cs.addPort(cmp_agvs_vc_cs_destination);
  __portVars["agvs.vc.cs"] = __portVars["agvs.vc.cs"] || {};
  __portVars["agvs.vc.cs"]["destination"] = cmp_agvs_vc_cs_destination;
  const cmp_agvs_vc_ca_cmd = new PortBase("cmd", 'in');
  cmp_agvs_vc_ca_cmd.ownerComponent = "agvs.vc.ca";
  cmp_agvs_vc_ca.addPort(cmp_agvs_vc_ca_cmd);
  __portVars["agvs.vc.ca"] = __portVars["agvs.vc.ca"] || {};
  __portVars["agvs.vc.ca"]["cmd"] = cmp_agvs_vc_ca_cmd;
  const cmp_agvs_vc_ca_statusMotor = new PortBase("statusMotor", 'in');
  cmp_agvs_vc_ca_statusMotor.ownerComponent = "agvs.vc.ca";
  cmp_agvs_vc_ca.addPort(cmp_agvs_vc_ca_statusMotor);
  __portVars["agvs.vc.ca"] = __portVars["agvs.vc.ca"] || {};
  __portVars["agvs.vc.ca"]["statusMotor"] = cmp_agvs_vc_ca_statusMotor;
  const cmp_agvs_vc_na_statusArm = new PortBase("statusArm", 'in');
  cmp_agvs_vc_na_statusArm.ownerComponent = "agvs.vc.na";
  cmp_agvs_vc_na.addPort(cmp_agvs_vc_na_statusArm);
  __portVars["agvs.vc.na"] = __portVars["agvs.vc.na"] || {};
  __portVars["agvs.vc.na"]["statusArm"] = cmp_agvs_vc_na_statusArm;
  const cmp_agvs_vc_vt_destination = new PortBase("destination", 'in');
  cmp_agvs_vc_vt_destination.ownerComponent = "agvs.vc.vt";
  cmp_agvs_vc_vt.addPort(cmp_agvs_vc_vt_destination);
  __portVars["agvs.vc.vt"] = __portVars["agvs.vc.vt"] || {};
  __portVars["agvs.vc.vt"]["destination"] = cmp_agvs_vc_vt_destination;
  const cmp_agvs_vc_vt_location = new PortBase("location", 'in');
  cmp_agvs_vc_vt_location.ownerComponent = "agvs.vc.vt";
  cmp_agvs_vc_vt.addPort(cmp_agvs_vc_vt_location);
  __portVars["agvs.vc.vt"] = __portVars["agvs.vc.vt"] || {};
  __portVars["agvs.vc.vt"]["location"] = cmp_agvs_vc_vt_location;
  // connectors declared in agvs.vc
  const conn_destinationStation2 = new ConnectorBase("destinationStation2");
  m.addConnector(conn_destinationStation2);
  // connector participants for destinationStation2
  const __parts_conn_destinationStation2 = [];
  (function(){
    const parts = __parts_conn_destinationStation2.filter(Boolean);
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
  const conn_destinationStation = new ConnectorBase("destinationStation");
  m.addConnector(conn_destinationStation);
  // connector participants for destinationStation
  const __parts_conn_destinationStation = [];
  (function(){
    const parts = __parts_conn_destinationStation.filter(Boolean);
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
  const conn__implicit_3 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_3);
  // connector participants for _implicit
  const __parts_conn__implicit_3 = [];
  (function(){
    const parts = __parts_conn__implicit_3.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn_command = new ConnectorBase("command");
  m.addConnector(conn_command);
  // connector participants for command
  const __parts_conn_command = [];
  (function(){
    const parts = __parts_conn_command.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_4 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_4);
  // connector participants for _implicit
  const __parts_conn__implicit_4 = [];
  (function(){
    const parts = __parts_conn__implicit_4.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_5 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_5);
  // connector participants for _implicit
  const __parts_conn__implicit_5 = [];
  (function(){
    const parts = __parts_conn__implicit_5.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn_command2 = new ConnectorBase("command2");
  m.addConnector(conn_command2);
  // connector participants for command2
  const __parts_conn_command2 = [];
  (function(){
    const parts = __parts_conn_command2.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_6 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_6);
  // connector participants for _implicit
  const __parts_conn__implicit_6 = [];
  (function(){
    const parts = __parts_conn__implicit_6.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_7 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_7);
  // connector participants for _implicit
  const __parts_conn__implicit_7 = [];
  (function(){
    const parts = __parts_conn__implicit_7.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn_currentLocation = new ConnectorBase("currentLocation");
  m.addConnector(conn_currentLocation);
  // connector participants for currentLocation
  const __parts_conn_currentLocation = [];
  (function(){
    const parts = __parts_conn_currentLocation.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_8 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_8);
  // connector participants for _implicit
  const __parts_conn__implicit_8 = [];
  (function(){
    const parts = __parts_conn__implicit_8.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_9 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_9);
  // connector participants for _implicit
  const __parts_conn__implicit_9 = [];
  (function(){
    const parts = __parts_conn__implicit_9.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn_sendNotificationMotor = new ConnectorBase("sendNotificationMotor");
  m.addConnector(conn_sendNotificationMotor);
  // connector participants for sendNotificationMotor
  const __parts_conn_sendNotificationMotor = [];
  (function(){
    const parts = __parts_conn_sendNotificationMotor.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_10 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_10);
  // connector participants for _implicit
  const __parts_conn__implicit_10 = [];
  (function(){
    const parts = __parts_conn__implicit_10.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_11 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_11);
  // connector participants for _implicit
  const __parts_conn__implicit_11 = [];
  (function(){
    const parts = __parts_conn__implicit_11.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn_sendNotificationMotor2 = new ConnectorBase("sendNotificationMotor2");
  m.addConnector(conn_sendNotificationMotor2);
  // connector participants for sendNotificationMotor2
  const __parts_conn_sendNotificationMotor2 = [];
  (function(){
    const parts = __parts_conn_sendNotificationMotor2.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_12 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_12);
  // connector participants for _implicit
  const __parts_conn__implicit_12 = [];
  (function(){
    const parts = __parts_conn__implicit_12.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_13 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_13);
  // connector participants for _implicit
  const __parts_conn__implicit_13 = [];
  (function(){
    const parts = __parts_conn__implicit_13.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  // connectors declared in agvs
  const conn_arrived = new ConnectorBase("arrived");
  m.addConnector(conn_arrived);
  // connector participants for arrived
  const __parts_conn_arrived = [];
  (function(){
    const parts = __parts_conn_arrived.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_14 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_14);
  // connector participants for _implicit
  const __parts_conn__implicit_14 = [];
  (function(){
    const parts = __parts_conn__implicit_14.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_15 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_15);
  // connector participants for _implicit
  const __parts_conn__implicit_15 = [];
  (function(){
    const parts = __parts_conn__implicit_15.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn_ackArm = new ConnectorBase("ackArm");
  m.addConnector(conn_ackArm);
  // connector participants for ackArm
  const __parts_conn_ackArm = [];
  (function(){
    const parts = __parts_conn_ackArm.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_16 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_16);
  // connector participants for _implicit
  const __parts_conn__implicit_16 = [];
  (function(){
    const parts = __parts_conn__implicit_16.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_17 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_17);
  // connector participants for _implicit
  const __parts_conn__implicit_17 = [];
  (function(){
    const parts = __parts_conn__implicit_17.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn_cmdArm = new ConnectorBase("cmdArm");
  m.addConnector(conn_cmdArm);
  // connector participants for cmdArm
  const __parts_conn_cmdArm = [];
  (function(){
    const parts = __parts_conn_cmdArm.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_18 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_18);
  // connector participants for _implicit
  const __parts_conn__implicit_18 = [];
  (function(){
    const parts = __parts_conn__implicit_18.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_19 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_19);
  // connector participants for _implicit
  const __parts_conn__implicit_19 = [];
  (function(){
    const parts = __parts_conn__implicit_19.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn_ackMotor = new ConnectorBase("ackMotor");
  m.addConnector(conn_ackMotor);
  // connector participants for ackMotor
  const __parts_conn_ackMotor = [];
  (function(){
    const parts = __parts_conn_ackMotor.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_20 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_20);
  // connector participants for _implicit
  const __parts_conn__implicit_20 = [];
  (function(){
    const parts = __parts_conn__implicit_20.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_21 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_21);
  // connector participants for _implicit
  const __parts_conn__implicit_21 = [];
  (function(){
    const parts = __parts_conn__implicit_21.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn_cmdMotor = new ConnectorBase("cmdMotor");
  m.addConnector(conn_cmdMotor);
  // connector participants for cmdMotor
  const __parts_conn_cmdMotor = [];
  (function(){
    const parts = __parts_conn_cmdMotor.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_22 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_22);
  // connector participants for _implicit
  const __parts_conn__implicit_22 = [];
  (function(){
    const parts = __parts_conn__implicit_22.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_23 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_23);
  // connector participants for _implicit
  const __parts_conn__implicit_23 = [];
  (function(){
    const parts = __parts_conn__implicit_23.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  // connectors declared in <root>
  const conn_dataExchange = new ConnectorBase("dataExchange");
  m.addConnector(conn_dataExchange);
  // connector participants for dataExchange
  const __parts_conn_dataExchange = [];
  (function(){
    const parts = __parts_conn_dataExchange.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_24 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_24);
  // connector participants for _implicit
  const __parts_conn__implicit_24 = [];
  (function(){
    const parts = __parts_conn__implicit_24.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn_updateStatus = new ConnectorBase("updateStatus");
  m.addConnector(conn_updateStatus);
  // connector participants for updateStatus
  const __parts_conn_updateStatus = [];
  (function(){
    const parts = __parts_conn_updateStatus.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  const conn__implicit_25 = new ConnectorBase("_implicit");
  m.addConnector(conn__implicit_25);
  // connector participants for _implicit
  const __parts_conn__implicit_25 = [];
  (function(){
    const parts = __parts_conn__implicit_25.filter(Boolean);
    for (let i=0;i<parts.length;i++){
      (function(p){
        p.bindTo({ receive: function(v, model){
          for (const q of parts){ if (q !== p) q.receive(v, model);
}
        } });
      })(parts[i]);
    }
  })();
  // propagation binding parent->child agvs -> agvs.m
  if (__portVars["agvs"]) {
    Object.keys(__portVars["agvs"] || {}).forEach(function(pp){
      const parentPort = __portVars["agvs"][pp];
      // find matching child port by exact name, then by suffix
      const childCandidates = __portVars["agvs.m"] || {};
      let target = childCandidates[pp];
      if (!target) {
        const keys = Object.keys(childCandidates);
        for (const k of keys) { if (String(k).toLowerCase().endsWith(String(pp).toLowerCase())) { target = childCandidates[k];
break;
} }
      }
      if (target) { parentPort.bindTo({ receive: function(v, model){ target.receive(v, model);
} });
}
    });
  }
  // propagation binding parent->child agvs -> agvs.as
  if (__portVars["agvs"]) {
    Object.keys(__portVars["agvs"] || {}).forEach(function(pp){
      const parentPort = __portVars["agvs"][pp];
      // find matching child port by exact name, then by suffix
      const childCandidates = __portVars["agvs.as"] || {};
      let target = childCandidates[pp];
      if (!target) {
        const keys = Object.keys(childCandidates);
        for (const k of keys) { if (String(k).toLowerCase().endsWith(String(pp).toLowerCase())) { target = childCandidates[k];
break;
} }
      }
      if (target) { parentPort.bindTo({ receive: function(v, model){ target.receive(v, model);
} });
}
    });
  }
  // propagation binding parent->child agvs -> agvs.ra
  if (__portVars["agvs"]) {
    Object.keys(__portVars["agvs"] || {}).forEach(function(pp){
      const parentPort = __portVars["agvs"][pp];
      // find matching child port by exact name, then by suffix
      const childCandidates = __portVars["agvs.ra"] || {};
      let target = childCandidates[pp];
      if (!target) {
        const keys = Object.keys(childCandidates);
        for (const k of keys) { if (String(k).toLowerCase().endsWith(String(pp).toLowerCase())) { target = childCandidates[k];
break;
} }
      }
      if (target) { parentPort.bindTo({ receive: function(v, model){ target.receive(v, model);
} });
}
    });
  }
  // propagation binding parent->child agvs -> agvs.vc
  if (__portVars["agvs"]) {
    Object.keys(__portVars["agvs"] || {}).forEach(function(pp){
      const parentPort = __portVars["agvs"][pp];
      // find matching child port by exact name, then by suffix
      const childCandidates = __portVars["agvs.vc"] || {};
      let target = childCandidates[pp];
      if (!target) {
        const keys = Object.keys(childCandidates);
        for (const k of keys) { if (String(k).toLowerCase().endsWith(String(pp).toLowerCase())) { target = childCandidates[k];
break;
} }
      }
      if (target) { parentPort.bindTo({ receive: function(v, model){ target.receive(v, model);
} });
}
    });
  }
  // propagation binding parent->child agvs -> agvs.vc.cs
  if (__portVars["agvs"]) {
    Object.keys(__portVars["agvs"] || {}).forEach(function(pp){
      const parentPort = __portVars["agvs"][pp];
      // find matching child port by exact name, then by suffix
      const childCandidates = __portVars["agvs.vc.cs"] || {};
      let target = childCandidates[pp];
      if (!target) {
        const keys = Object.keys(childCandidates);
        for (const k of keys) { if (String(k).toLowerCase().endsWith(String(pp).toLowerCase())) { target = childCandidates[k];
break;
} }
      }
      if (target) { parentPort.bindTo({ receive: function(v, model){ target.receive(v, model);
} });
}
    });
  }
  // propagation binding parent->child agvs -> agvs.vc.ca
  if (__portVars["agvs"]) {
    Object.keys(__portVars["agvs"] || {}).forEach(function(pp){
      const parentPort = __portVars["agvs"][pp];
      // find matching child port by exact name, then by suffix
      const childCandidates = __portVars["agvs.vc.ca"] || {};
      let target = childCandidates[pp];
      if (!target) {
        const keys = Object.keys(childCandidates);
        for (const k of keys) { if (String(k).toLowerCase().endsWith(String(pp).toLowerCase())) { target = childCandidates[k];
break;
} }
      }
      if (target) { parentPort.bindTo({ receive: function(v, model){ target.receive(v, model);
} });
}
    });
  }
  // propagation binding parent->child agvs -> agvs.vc.nm
  if (__portVars["agvs"]) {
    Object.keys(__portVars["agvs"] || {}).forEach(function(pp){
      const parentPort = __portVars["agvs"][pp];
      // find matching child port by exact name, then by suffix
      const childCandidates = __portVars["agvs.vc.nm"] || {};
      let target = childCandidates[pp];
      if (!target) {
        const keys = Object.keys(childCandidates);
        for (const k of keys) { if (String(k).toLowerCase().endsWith(String(pp).toLowerCase())) { target = childCandidates[k];
break;
} }
      }
      if (target) { parentPort.bindTo({ receive: function(v, model){ target.receive(v, model);
} });
}
    });
  }
  // propagation binding parent->child agvs -> agvs.vc.sm
  if (__portVars["agvs"]) {
    Object.keys(__portVars["agvs"] || {}).forEach(function(pp){
      const parentPort = __portVars["agvs"][pp];
      // find matching child port by exact name, then by suffix
      const childCandidates = __portVars["agvs.vc.sm"] || {};
      let target = childCandidates[pp];
      if (!target) {
        const keys = Object.keys(childCandidates);
        for (const k of keys) { if (String(k).toLowerCase().endsWith(String(pp).toLowerCase())) { target = childCandidates[k];
break;
} }
      }
      if (target) { parentPort.bindTo({ receive: function(v, model){ target.receive(v, model);
} });
}
    });
  }
  // propagation binding parent->child agvs -> agvs.vc.na
  if (__portVars["agvs"]) {
    Object.keys(__portVars["agvs"] || {}).forEach(function(pp){
      const parentPort = __portVars["agvs"][pp];
      // find matching child port by exact name, then by suffix
      const childCandidates = __portVars["agvs.vc.na"] || {};
      let target = childCandidates[pp];
      if (!target) {
        const keys = Object.keys(childCandidates);
        for (const k of keys) { if (String(k).toLowerCase().endsWith(String(pp).toLowerCase())) { target = childCandidates[k];
break;
} }
      }
      if (target) { parentPort.bindTo({ receive: function(v, model){ target.receive(v, model);
} });
}
    });
  }
  // propagation binding parent->child agvs -> agvs.vc.vt
  if (__portVars["agvs"]) {
    Object.keys(__portVars["agvs"] || {}).forEach(function(pp){
      const parentPort = __portVars["agvs"][pp];
      // find matching child port by exact name, then by suffix
      const childCandidates = __portVars["agvs.vc.vt"] || {};
      let target = childCandidates[pp];
      if (!target) {
        const keys = Object.keys(childCandidates);
        for (const k of keys) { if (String(k).toLowerCase().endsWith(String(pp).toLowerCase())) { target = childCandidates[k];
break;
} }
      }
      if (target) { parentPort.bindTo({ receive: function(v, model){ target.receive(v, model);
} });
}
    });
  }
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
    const __act_StartMovingAC_agvs_vc_sm = new ActivityBase("StartMovingAC", { component: "agvs.vc.sm", inputPorts: ["move"] });
    __act_StartMovingAC_agvs_vc_sm.addAction(new ActionBase("SendStartMotorAN", [], "SysADLArchitecture.SendStartMotorEX", "constraint : post-condition SendStartMotorEQ\n\t\tdelegate SendStartMotorAN to cmd"));
    __act_StartMovingAC_agvs_vc_sm.addAction(new ActionBase("SendCommandAN", [], "SysADLArchitecture.SendCommandEX", "constraint : post-condition SendCommandEQ\n\tdelegate SendCommandAN to cmd delegate move to move"));
    __act_StartMovingAC_agvs_vc_sm.addAction(new ActionBase("SendDestinationAN", [], "SysADLArchitecture.SendDestinationEX", "constraint : post-condition SendDestinationEQ\n\tdelegate SendDestinationAN to destination delegate move to move"));
    m.registerActivity("StartMovingAC::agvs.vc.sm", __act_StartMovingAC_agvs_vc_sm);
  } catch (e) { /* ignore */ }
  try {
    const __act_NotifierMotorAC_agvs_vc_nm = new ActivityBase("NotifierMotorAC", { component: "agvs.vc.nm", inputPorts: ["inStatusMotor"] });
    __act_NotifierMotorAC_agvs_vc_nm.addAction(new ActionBase("NotifyAGVFromMotorAN", [], "SysADLArchitecture.NotifyAGVFromMotorEX", "constraint : post-condition NotifyAGVFromMotorEQ\n\tdelegate NotifyAGVFromMotorAN to outStatusMotor delegate\n\t\tstatusMotor to inStatusMotor"));
    __act_NotifierMotorAC_agvs_vc_nm.addAction(new ActionBase("NotifySupervisoryFromMotorAN", [], "SysADLArchitecture.NotifySupervisoryFromMotorEX", "constraint : post-condition NotifySupervisoryFromMotorEQ\n\tdelegate NotifySupervisoryFromMotorAN to ack\n\t\tdelegate statusMotor to statusMotor"));
    m.registerActivity("NotifierMotorAC::agvs.vc.nm", __act_NotifierMotorAC_agvs_vc_nm);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckStationAC_agvs_vc_cs = new ActivityBase("CheckStationAC", { component: "agvs.vc.cs", inputPorts: ["statusMotor","destination"] });
    __act_CheckStationAC_agvs_vc_cs.addAction(new ActionBase("CompareStationsAN", [], "SysADLArchitecture.CompareStationsEX", "constraint : post-condition CompareStationsEQ pre-condition NotificationMotorIsStartedEQ\n\tdelegate CompareStationsAN to result delegate location to\n\t\tloc delegate destination to dest\n\t\tdelegate statusMotor to statusMotor"));
    __act_CheckStationAC_agvs_vc_cs.addAction(new ActionBase("StopMotorAN", [], "SysADLArchitecture.StopMotorEX", "constraint : post-condition StopMotorEQ\n\tdelegate comparisonResult to result delegate StopMotorAN to cmd"));
    __act_CheckStationAC_agvs_vc_cs.addAction(new ActionBase("PassedMotorAN", [], "SysADLArchitecture.PassedMotorEX", "constraint : post-condition PassedMotorEQ\n\tdelegate PassedMotorAN to ack delegate comparisonResult to result"));
    __act_CheckStationAC_agvs_vc_cs.addAction(new ActionBase("SendCurrentLocationAN", [], "SysADLArchitecture.SendCurrentLocationEX", "constraint : post-condition SendCurrentLocationEQ\n\tdelegate location to inLocation delegate\n\t\tSendCurrentLocationAN to outLocation"));
    m.registerActivity("CheckStationAC::agvs.vc.cs", __act_CheckStationAC_agvs_vc_cs);
  } catch (e) { /* ignore */ }
  try {
    const __act_ControlArmAC_agvs_vc_ca = new ActivityBase("ControlArmAC", { component: "agvs.vc.ca", inputPorts: ["cmd","statusMotor"] });
    __act_ControlArmAC_agvs_vc_ca.addAction(new ActionBase("ControlArmAN", [], "SysADLArchitecture.ControlArmEX", "constraint : post-condition ControlArmEQ\n\tdelegate ControlArmAN to startArm delegate statusMotor to\n\t\tstatusMotor delegate cmd to cmd"));
    m.registerActivity("ControlArmAC::agvs.vc.ca", __act_ControlArmAC_agvs_vc_ca);
  } catch (e) { /* ignore */ }
  try {
    const __act_NotifierArmAC_agvs_vc_na = new ActivityBase("NotifierArmAC", { component: "agvs.vc.na", inputPorts: ["statusArm"] });
    __act_NotifierArmAC_agvs_vc_na.addAction(new ActionBase("NotifierArmAN", [], "SysADLArchitecture.NotifierArmEX", "constraint : post-condition NotifierArmEQ\n\tdelegate NotifierArmAN to ack"));
    m.registerActivity("NotifierArmAC::agvs.vc.na", __act_NotifierArmAC_agvs_vc_na);
  } catch (e) { /* ignore */ }
  try {
    const __act_VehicleTimerAC_agvs_vc_vt = new ActivityBase("VehicleTimerAC", { component: "agvs.vc.vt", inputPorts: ["destination","location"] });
    __act_VehicleTimerAC_agvs_vc_vt.addAction(new ActionBase("VehicleTimerAN", [], "SysADLArchitecture.VehicleTimerEX", "constraint : post-condition VehicleTimerEQ\n\tdelegate VehicleTimerAN to s delegate location to\n\t\tloc delegate destination to dest delegate cmd\n\t\tto cmd"));
    m.registerActivity("VehicleTimerAC::agvs.vc.vt", __act_VehicleTimerAC_agvs_vc_vt);
  } catch (e) { /* ignore */ }
  try {
    const __act_StartMovingAC = new ActivityBase("StartMovingAC", { component: "agvs.vc.sm", inputPorts: ["move"] });
    __act_StartMovingAC.addAction(new ActionBase("SendStartMotorAN", [], "SysADLArchitecture.SendStartMotorEX", "constraint : post-condition SendStartMotorEQ\n\t\tdelegate SendStartMotorAN to cmd"));
    __act_StartMovingAC.addAction(new ActionBase("SendCommandAN", [], "SysADLArchitecture.SendCommandEX", "constraint : post-condition SendCommandEQ\n\tdelegate SendCommandAN to cmd delegate move to move"));
    __act_StartMovingAC.addAction(new ActionBase("SendDestinationAN", [], "SysADLArchitecture.SendDestinationEX", "constraint : post-condition SendDestinationEQ\n\tdelegate SendDestinationAN to destination delegate move to move"));
    m.registerActivity("StartMovingAC", __act_StartMovingAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_NotifierMotorAC = new ActivityBase("NotifierMotorAC", { component: "agvs.vc.nm", inputPorts: ["inStatusMotor"] });
    __act_NotifierMotorAC.addAction(new ActionBase("NotifyAGVFromMotorAN", [], "SysADLArchitecture.NotifyAGVFromMotorEX", "constraint : post-condition NotifyAGVFromMotorEQ\n\tdelegate NotifyAGVFromMotorAN to outStatusMotor delegate\n\t\tstatusMotor to inStatusMotor"));
    __act_NotifierMotorAC.addAction(new ActionBase("NotifySupervisoryFromMotorAN", [], "SysADLArchitecture.NotifySupervisoryFromMotorEX", "constraint : post-condition NotifySupervisoryFromMotorEQ\n\tdelegate NotifySupervisoryFromMotorAN to ack\n\t\tdelegate statusMotor to statusMotor"));
    m.registerActivity("NotifierMotorAC", __act_NotifierMotorAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckStationAC = new ActivityBase("CheckStationAC", { component: "agvs.vc.cs", inputPorts: ["statusMotor","destination"] });
    __act_CheckStationAC.addAction(new ActionBase("CompareStationsAN", [], "SysADLArchitecture.CompareStationsEX", "constraint : post-condition CompareStationsEQ pre-condition NotificationMotorIsStartedEQ\n\tdelegate CompareStationsAN to result delegate location to\n\t\tloc delegate destination to dest\n\t\tdelegate statusMotor to statusMotor"));
    __act_CheckStationAC.addAction(new ActionBase("StopMotorAN", [], "SysADLArchitecture.StopMotorEX", "constraint : post-condition StopMotorEQ\n\tdelegate comparisonResult to result delegate StopMotorAN to cmd"));
    __act_CheckStationAC.addAction(new ActionBase("PassedMotorAN", [], "SysADLArchitecture.PassedMotorEX", "constraint : post-condition PassedMotorEQ\n\tdelegate PassedMotorAN to ack delegate comparisonResult to result"));
    __act_CheckStationAC.addAction(new ActionBase("SendCurrentLocationAN", [], "SysADLArchitecture.SendCurrentLocationEX", "constraint : post-condition SendCurrentLocationEQ\n\tdelegate location to inLocation delegate\n\t\tSendCurrentLocationAN to outLocation"));
    m.registerActivity("CheckStationAC", __act_CheckStationAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_ControlArmAC = new ActivityBase("ControlArmAC", { component: "agvs.vc.ca", inputPorts: ["cmd","statusMotor"] });
    __act_ControlArmAC.addAction(new ActionBase("ControlArmAN", [], "SysADLArchitecture.ControlArmEX", "constraint : post-condition ControlArmEQ\n\tdelegate ControlArmAN to startArm delegate statusMotor to\n\t\tstatusMotor delegate cmd to cmd"));
    m.registerActivity("ControlArmAC", __act_ControlArmAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_NotifierArmAC = new ActivityBase("NotifierArmAC", { component: "agvs.vc.na", inputPorts: ["statusArm"] });
    __act_NotifierArmAC.addAction(new ActionBase("NotifierArmAN", [], "SysADLArchitecture.NotifierArmEX", "constraint : post-condition NotifierArmEQ\n\tdelegate NotifierArmAN to ack"));
    m.registerActivity("NotifierArmAC", __act_NotifierArmAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_VehicleTimerAC = new ActivityBase("VehicleTimerAC", { component: "agvs.vc.vt", inputPorts: ["destination","location"] });
    __act_VehicleTimerAC.addAction(new ActionBase("VehicleTimerAN", [], "SysADLArchitecture.VehicleTimerEX", "constraint : post-condition VehicleTimerEQ\n\tdelegate VehicleTimerAN to s delegate location to\n\t\tloc delegate destination to dest delegate cmd\n\t\tto cmd"));
    m.registerActivity("VehicleTimerAC", __act_VehicleTimerAC);
  } catch (e) { /* ignore */ }
  return m;
}
module.exports = { createModel };
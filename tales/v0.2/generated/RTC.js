const { ModelBase, ComponentBase, PortBase, ConnectorBase, createExecutableFromExpression, ActivityBase, ActionBase } = require('../sysadl-runtime.js');
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
  const cmp_rtc_sm = new ComponentBase("rtc.sm", { sysadlDefinition: "SensorsMonitorCP" });
  cmp_rtc_sm && m.addComponent(cmp_rtc_sm);
  const cmp_rtc_cm = new ComponentBase("rtc.cm", { sysadlDefinition: "CommanderCP" });
  cmp_rtc_cm && m.addComponent(cmp_rtc_cm);
  const cmp_rtc_pc = new ComponentBase("rtc.pc", { sysadlDefinition: "PresenceCheckerCP" });
  cmp_rtc_pc && m.addComponent(cmp_rtc_pc);
  const __portVars = {};
  const cmp_s1_current1 = new PortBase("current1", 'in');
  cmp_s1_current1.ownerComponent = "s1";
  cmp_s1.addPort(cmp_s1_current1);
  __portVars["s1"] = __portVars["s1"] || {};
  __portVars["s1"]["current1"] = cmp_s1_current1;
  const cmp_s2_current2 = new PortBase("current2", 'in');
  cmp_s2_current2.ownerComponent = "s2";
  cmp_s2.addPort(cmp_s2_current2);
  __portVars["s2"] = __portVars["s2"] || {};
  __portVars["s2"]["current2"] = cmp_s2_current2;
  const cmp_s3_detectedS = new PortBase("detectedS", 'in');
  cmp_s3_detectedS.ownerComponent = "s3";
  cmp_s3.addPort(cmp_s3_detectedS);
  __portVars["s3"] = __portVars["s3"] || {};
  __portVars["s3"]["detectedS"] = cmp_s3_detectedS;
  const cmp_ui_desired = new PortBase("desired", 'in');
  cmp_ui_desired.ownerComponent = "ui";
  cmp_ui.addPort(cmp_ui_desired);
  __portVars["ui"] = __portVars["ui"] || {};
  __portVars["ui"]["desired"] = cmp_ui_desired;
  const cmp_a2_controllerC = new PortBase("controllerC", 'in');
  cmp_a2_controllerC.ownerComponent = "a2";
  cmp_a2.addPort(cmp_a2_controllerC);
  __portVars["a2"] = __portVars["a2"] || {};
  __portVars["a2"]["controllerC"] = cmp_a2_controllerC;
  const cmp_a1_controllerH = new PortBase("controllerH", 'in');
  cmp_a1_controllerH.ownerComponent = "a1";
  cmp_a1.addPort(cmp_a1_controllerH);
  __portVars["a1"] = __portVars["a1"] || {};
  __portVars["a1"]["controllerH"] = cmp_a1_controllerH;
  const cmp_rtc_detected = new PortBase("detected", 'in');
  cmp_rtc_detected.ownerComponent = "rtc";
  cmp_rtc.addPort(cmp_rtc_detected);
  __portVars["rtc"] = __portVars["rtc"] || {};
  __portVars["rtc"]["detected"] = cmp_rtc_detected;
  const cmp_rtc_localtemp1 = new PortBase("localtemp1", 'in');
  cmp_rtc_localtemp1.ownerComponent = "rtc";
  cmp_rtc.addPort(cmp_rtc_localtemp1);
  __portVars["rtc"] = __portVars["rtc"] || {};
  __portVars["rtc"]["localtemp1"] = cmp_rtc_localtemp1;
  const cmp_rtc_localTemp2 = new PortBase("localTemp2", 'in');
  cmp_rtc_localTemp2.ownerComponent = "rtc";
  cmp_rtc.addPort(cmp_rtc_localTemp2);
  __portVars["rtc"] = __portVars["rtc"] || {};
  __portVars["rtc"]["localTemp2"] = cmp_rtc_localTemp2;
  const cmp_rtc_userTemp = new PortBase("userTemp", 'in');
  cmp_rtc_userTemp.ownerComponent = "rtc";
  cmp_rtc.addPort(cmp_rtc_userTemp);
  __portVars["rtc"] = __portVars["rtc"] || {};
  __portVars["rtc"]["userTemp"] = cmp_rtc_userTemp;
  const cmp_rtc_heating = new PortBase("heating", 'in');
  cmp_rtc_heating.ownerComponent = "rtc";
  cmp_rtc.addPort(cmp_rtc_heating);
  __portVars["rtc"] = __portVars["rtc"] || {};
  __portVars["rtc"]["heating"] = cmp_rtc_heating;
  const cmp_rtc_cooling = new PortBase("cooling", 'in');
  cmp_rtc_cooling.ownerComponent = "rtc";
  cmp_rtc.addPort(cmp_rtc_cooling);
  __portVars["rtc"] = __portVars["rtc"] || {};
  __portVars["rtc"]["cooling"] = cmp_rtc_cooling;
  const cmp_rtc_sm_s1 = new PortBase("s1", 'in');
  cmp_rtc_sm_s1.ownerComponent = "rtc.sm";
  cmp_rtc_sm.addPort(cmp_rtc_sm_s1);
  __portVars["rtc.sm"] = __portVars["rtc.sm"] || {};
  __portVars["rtc.sm"]["s1"] = cmp_rtc_sm_s1;
  const cmp_rtc_sm_s2 = new PortBase("s2", 'in');
  cmp_rtc_sm_s2.ownerComponent = "rtc.sm";
  cmp_rtc_sm.addPort(cmp_rtc_sm_s2);
  __portVars["rtc.sm"] = __portVars["rtc.sm"] || {};
  __portVars["rtc.sm"]["s2"] = cmp_rtc_sm_s2;
  const cmp_rtc_sm_detected = new PortBase("detected", 'in');
  cmp_rtc_sm_detected.ownerComponent = "rtc.sm";
  cmp_rtc_sm.addPort(cmp_rtc_sm_detected);
  __portVars["rtc.sm"] = __portVars["rtc.sm"] || {};
  __portVars["rtc.sm"]["detected"] = cmp_rtc_sm_detected;
  const cmp_rtc_sm_userTemp = new PortBase("userTemp", 'in');
  cmp_rtc_sm_userTemp.ownerComponent = "rtc.sm";
  cmp_rtc_sm.addPort(cmp_rtc_sm_userTemp);
  __portVars["rtc.sm"] = __portVars["rtc.sm"] || {};
  __portVars["rtc.sm"]["userTemp"] = cmp_rtc_sm_userTemp;
  const cmp_rtc_sm_average2 = new PortBase("average2", 'in');
  cmp_rtc_sm_average2.ownerComponent = "rtc.sm";
  cmp_rtc_sm.addPort(cmp_rtc_sm_average2);
  __portVars["rtc.sm"] = __portVars["rtc.sm"] || {};
  __portVars["rtc.sm"]["average2"] = cmp_rtc_sm_average2;
  const cmp_rtc_sm_target2 = new PortBase("target2", 'in');
  cmp_rtc_sm_target2.ownerComponent = "rtc.sm";
  cmp_rtc_sm.addPort(cmp_rtc_sm_target2);
  __portVars["rtc.sm"] = __portVars["rtc.sm"] || {};
  __portVars["rtc.sm"]["target2"] = cmp_rtc_sm_target2;
  const cmp_rtc_sm_current1 = new PortBase("current1", 'in');
  cmp_rtc_sm_current1.ownerComponent = "rtc.sm";
  cmp_rtc_sm.addPort(cmp_rtc_sm_current1);
  __portVars["rtc.sm"] = __portVars["rtc.sm"] || {};
  __portVars["rtc.sm"]["current1"] = cmp_rtc_sm_current1;
  const cmp_rtc_cm_s1 = new PortBase("s1", 'in');
  cmp_rtc_cm_s1.ownerComponent = "rtc.cm";
  cmp_rtc_cm.addPort(cmp_rtc_cm_s1);
  __portVars["rtc.cm"] = __portVars["rtc.cm"] || {};
  __portVars["rtc.cm"]["s1"] = cmp_rtc_cm_s1;
  const cmp_rtc_cm_s2 = new PortBase("s2", 'in');
  cmp_rtc_cm_s2.ownerComponent = "rtc.cm";
  cmp_rtc_cm.addPort(cmp_rtc_cm_s2);
  __portVars["rtc.cm"] = __portVars["rtc.cm"] || {};
  __portVars["rtc.cm"]["s2"] = cmp_rtc_cm_s2;
  const cmp_rtc_cm_detected = new PortBase("detected", 'in');
  cmp_rtc_cm_detected.ownerComponent = "rtc.cm";
  cmp_rtc_cm.addPort(cmp_rtc_cm_detected);
  __portVars["rtc.cm"] = __portVars["rtc.cm"] || {};
  __portVars["rtc.cm"]["detected"] = cmp_rtc_cm_detected;
  const cmp_rtc_cm_userTemp = new PortBase("userTemp", 'in');
  cmp_rtc_cm_userTemp.ownerComponent = "rtc.cm";
  cmp_rtc_cm.addPort(cmp_rtc_cm_userTemp);
  __portVars["rtc.cm"] = __portVars["rtc.cm"] || {};
  __portVars["rtc.cm"]["userTemp"] = cmp_rtc_cm_userTemp;
  const cmp_rtc_cm_average2 = new PortBase("average2", 'in');
  cmp_rtc_cm_average2.ownerComponent = "rtc.cm";
  cmp_rtc_cm.addPort(cmp_rtc_cm_average2);
  __portVars["rtc.cm"] = __portVars["rtc.cm"] || {};
  __portVars["rtc.cm"]["average2"] = cmp_rtc_cm_average2;
  const cmp_rtc_cm_target2 = new PortBase("target2", 'in');
  cmp_rtc_cm_target2.ownerComponent = "rtc.cm";
  cmp_rtc_cm.addPort(cmp_rtc_cm_target2);
  __portVars["rtc.cm"] = __portVars["rtc.cm"] || {};
  __portVars["rtc.cm"]["target2"] = cmp_rtc_cm_target2;
  const cmp_rtc_cm_current1 = new PortBase("current1", 'in');
  cmp_rtc_cm_current1.ownerComponent = "rtc.cm";
  cmp_rtc_cm.addPort(cmp_rtc_cm_current1);
  __portVars["rtc.cm"] = __portVars["rtc.cm"] || {};
  __portVars["rtc.cm"]["current1"] = cmp_rtc_cm_current1;
  const cmp_rtc_pc_s1 = new PortBase("s1", 'in');
  cmp_rtc_pc_s1.ownerComponent = "rtc.pc";
  cmp_rtc_pc.addPort(cmp_rtc_pc_s1);
  __portVars["rtc.pc"] = __portVars["rtc.pc"] || {};
  __portVars["rtc.pc"]["s1"] = cmp_rtc_pc_s1;
  const cmp_rtc_pc_s2 = new PortBase("s2", 'in');
  cmp_rtc_pc_s2.ownerComponent = "rtc.pc";
  cmp_rtc_pc.addPort(cmp_rtc_pc_s2);
  __portVars["rtc.pc"] = __portVars["rtc.pc"] || {};
  __portVars["rtc.pc"]["s2"] = cmp_rtc_pc_s2;
  const cmp_rtc_pc_detected = new PortBase("detected", 'in');
  cmp_rtc_pc_detected.ownerComponent = "rtc.pc";
  cmp_rtc_pc.addPort(cmp_rtc_pc_detected);
  __portVars["rtc.pc"] = __portVars["rtc.pc"] || {};
  __portVars["rtc.pc"]["detected"] = cmp_rtc_pc_detected;
  const cmp_rtc_pc_userTemp = new PortBase("userTemp", 'in');
  cmp_rtc_pc_userTemp.ownerComponent = "rtc.pc";
  cmp_rtc_pc.addPort(cmp_rtc_pc_userTemp);
  __portVars["rtc.pc"] = __portVars["rtc.pc"] || {};
  __portVars["rtc.pc"]["userTemp"] = cmp_rtc_pc_userTemp;
  const cmp_rtc_pc_average2 = new PortBase("average2", 'in');
  cmp_rtc_pc_average2.ownerComponent = "rtc.pc";
  cmp_rtc_pc.addPort(cmp_rtc_pc_average2);
  __portVars["rtc.pc"] = __portVars["rtc.pc"] || {};
  __portVars["rtc.pc"]["average2"] = cmp_rtc_pc_average2;
  const cmp_rtc_pc_target2 = new PortBase("target2", 'in');
  cmp_rtc_pc_target2.ownerComponent = "rtc.pc";
  cmp_rtc_pc.addPort(cmp_rtc_pc_target2);
  __portVars["rtc.pc"] = __portVars["rtc.pc"] || {};
  __portVars["rtc.pc"]["target2"] = cmp_rtc_pc_target2;
  const cmp_rtc_pc_current1 = new PortBase("current1", 'in');
  cmp_rtc_pc_current1.ownerComponent = "rtc.pc";
  cmp_rtc_pc.addPort(cmp_rtc_pc_current1);
  __portVars["rtc.pc"] = __portVars["rtc.pc"] || {};
  __portVars["rtc.pc"]["current1"] = cmp_rtc_pc_current1;
  // connectors declared in rtc
  const conn_target = new ConnectorBase("target");
  m.addConnector(conn_target);
  // connector participants for target
  const __parts_conn_target = [];
  (function(){
    const parts = __parts_conn_target.filter(Boolean);
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
  const conn_average = new ConnectorBase("average");
  m.addConnector(conn_average);
  // connector participants for average
  const __parts_conn_average = [];
  (function(){
    const parts = __parts_conn_average.filter(Boolean);
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
  const conn_uc = new ConnectorBase("uc");
  m.addConnector(conn_uc);
  // connector participants for uc
  const __parts_conn_uc = [];
  (function(){
    const parts = __parts_conn_uc.filter(Boolean);
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
  const conn_cc2 = new ConnectorBase("cc2");
  m.addConnector(conn_cc2);
  // connector participants for cc2
  const __parts_conn_cc2 = [];
  (function(){
    const parts = __parts_conn_cc2.filter(Boolean);
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
  const conn_pc = new ConnectorBase("pc");
  m.addConnector(conn_pc);
  // connector participants for pc
  const __parts_conn_pc = [];
  (function(){
    const parts = __parts_conn_pc.filter(Boolean);
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
  const conn_cc1 = new ConnectorBase("cc1");
  m.addConnector(conn_cc1);
  // connector participants for cc1
  const __parts_conn_cc1 = [];
  (function(){
    const parts = __parts_conn_cc1.filter(Boolean);
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
  // propagation binding parent->child rtc -> rtc.sm
  if (__portVars["rtc"]) {
    Object.keys(__portVars["rtc"] || {}).forEach(function(pp){
      const parentPort = __portVars["rtc"][pp];
      // find matching child port by exact name, then by suffix
      const childCandidates = __portVars["rtc.sm"] || {};
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
  // propagation binding parent->child rtc -> rtc.cm
  if (__portVars["rtc"]) {
    Object.keys(__portVars["rtc"] || {}).forEach(function(pp){
      const parentPort = __portVars["rtc"][pp];
      // find matching child port by exact name, then by suffix
      const childCandidates = __portVars["rtc.cm"] || {};
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
  // propagation binding parent->child rtc -> rtc.pc
  if (__portVars["rtc"]) {
    Object.keys(__portVars["rtc"] || {}).forEach(function(pp){
      const parentPort = __portVars["rtc"][pp];
      // find matching child port by exact name, then by suffix
      const childCandidates = __portVars["rtc.pc"] || {};
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
    const __act_CalculateAverageTemperatureAC_s1 = new ActivityBase("CalculateAverageTemperatureAC", { component: "s1", inputPorts: ["current1"] });
    __act_CalculateAverageTemperatureAC_s1.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC::s1", __act_CalculateAverageTemperatureAC_s1);
  } catch (e) { /* ignore */ }
  try {
    const __act_CalculateAverageTemperatureAC_s2 = new ActivityBase("CalculateAverageTemperatureAC", { component: "s2", inputPorts: ["current2"] });
    __act_CalculateAverageTemperatureAC_s2.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC::s2", __act_CalculateAverageTemperatureAC_s2);
  } catch (e) { /* ignore */ }
  try {
    const __act_CalculateAverageTemperatureAC_s3 = new ActivityBase("CalculateAverageTemperatureAC", { component: "s3", inputPorts: ["detectedS"] });
    __act_CalculateAverageTemperatureAC_s3.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC::s3", __act_CalculateAverageTemperatureAC_s3);
  } catch (e) { /* ignore */ }
  try {
    const __act_CalculateAverageTemperatureAC_ui = new ActivityBase("CalculateAverageTemperatureAC", { component: "ui", inputPorts: ["desired"] });
    __act_CalculateAverageTemperatureAC_ui.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC::ui", __act_CalculateAverageTemperatureAC_ui);
  } catch (e) { /* ignore */ }
  try {
    const __act_CalculateAverageTemperatureAC_a2 = new ActivityBase("CalculateAverageTemperatureAC", { component: "a2", inputPorts: ["controllerC"] });
    __act_CalculateAverageTemperatureAC_a2.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC::a2", __act_CalculateAverageTemperatureAC_a2);
  } catch (e) { /* ignore */ }
  try {
    const __act_CalculateAverageTemperatureAC_a1 = new ActivityBase("CalculateAverageTemperatureAC", { component: "a1", inputPorts: ["controllerH"] });
    __act_CalculateAverageTemperatureAC_a1.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC::a1", __act_CalculateAverageTemperatureAC_a1);
  } catch (e) { /* ignore */ }
  try {
    const __act_CalculateAverageTemperatureAC_rtc = new ActivityBase("CalculateAverageTemperatureAC", { component: "rtc", inputPorts: ["detected"] });
    __act_CalculateAverageTemperatureAC_rtc.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC::rtc", __act_CalculateAverageTemperatureAC_rtc);
  } catch (e) { /* ignore */ }
  try {
    const __act_CalculateAverageTemperatureAC_rtc_sm = new ActivityBase("CalculateAverageTemperatureAC", { component: "rtc.sm", inputPorts: ["s1","s2"] });
    __act_CalculateAverageTemperatureAC_rtc_sm.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC::rtc.sm", __act_CalculateAverageTemperatureAC_rtc_sm);
  } catch (e) { /* ignore */ }
  try {
    const __act_CalculateAverageTemperatureAC_rtc_cm = new ActivityBase("CalculateAverageTemperatureAC", { component: "rtc.cm", inputPorts: ["s1","s2"] });
    __act_CalculateAverageTemperatureAC_rtc_cm.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC::rtc.cm", __act_CalculateAverageTemperatureAC_rtc_cm);
  } catch (e) { /* ignore */ }
  try {
    const __act_CalculateAverageTemperatureAC_rtc_pc = new ActivityBase("CalculateAverageTemperatureAC", { component: "rtc.pc", inputPorts: ["s1","s2"] });
    __act_CalculateAverageTemperatureAC_rtc_pc.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC::rtc.pc", __act_CalculateAverageTemperatureAC_rtc_pc);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC_s1 = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "s1", inputPorts: ["current1"] });
    __act_CheckPresenceToSetTemperatureAC_s1.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC::s1", __act_CheckPresenceToSetTemperatureAC_s1);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC_s2 = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "s2", inputPorts: ["current2"] });
    __act_CheckPresenceToSetTemperatureAC_s2.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC::s2", __act_CheckPresenceToSetTemperatureAC_s2);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC_s3 = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "s3", inputPorts: ["detectedS"] });
    __act_CheckPresenceToSetTemperatureAC_s3.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC::s3", __act_CheckPresenceToSetTemperatureAC_s3);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC_ui = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "ui", inputPorts: ["desired"] });
    __act_CheckPresenceToSetTemperatureAC_ui.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC::ui", __act_CheckPresenceToSetTemperatureAC_ui);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC_a2 = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "a2", inputPorts: ["controllerC"] });
    __act_CheckPresenceToSetTemperatureAC_a2.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC::a2", __act_CheckPresenceToSetTemperatureAC_a2);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC_a1 = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "a1", inputPorts: ["controllerH"] });
    __act_CheckPresenceToSetTemperatureAC_a1.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC::a1", __act_CheckPresenceToSetTemperatureAC_a1);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC_rtc = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "rtc", inputPorts: ["detected","userTemp"] });
    __act_CheckPresenceToSetTemperatureAC_rtc.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC::rtc", __act_CheckPresenceToSetTemperatureAC_rtc);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC_rtc_sm = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "rtc.sm", inputPorts: ["detected","userTemp"] });
    __act_CheckPresenceToSetTemperatureAC_rtc_sm.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC::rtc.sm", __act_CheckPresenceToSetTemperatureAC_rtc_sm);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC_rtc_cm = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "rtc.cm", inputPorts: ["detected","userTemp"] });
    __act_CheckPresenceToSetTemperatureAC_rtc_cm.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC::rtc.cm", __act_CheckPresenceToSetTemperatureAC_rtc_cm);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC_rtc_pc = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "rtc.pc", inputPorts: ["detected","userTemp"] });
    __act_CheckPresenceToSetTemperatureAC_rtc_pc.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC::rtc.pc", __act_CheckPresenceToSetTemperatureAC_rtc_pc);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC_s1 = new ActivityBase("DecideCommandAC", { component: "s1", inputPorts: ["current1"] });
    __act_DecideCommandAC_s1.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC_s1.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC_s1.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC::s1", __act_DecideCommandAC_s1);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC_s2 = new ActivityBase("DecideCommandAC", { component: "s2", inputPorts: ["current2"] });
    __act_DecideCommandAC_s2.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC_s2.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC_s2.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC::s2", __act_DecideCommandAC_s2);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC_s3 = new ActivityBase("DecideCommandAC", { component: "s3", inputPorts: ["detectedS"] });
    __act_DecideCommandAC_s3.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC_s3.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC_s3.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC::s3", __act_DecideCommandAC_s3);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC_ui = new ActivityBase("DecideCommandAC", { component: "ui", inputPorts: ["desired"] });
    __act_DecideCommandAC_ui.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC_ui.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC_ui.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC::ui", __act_DecideCommandAC_ui);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC_a2 = new ActivityBase("DecideCommandAC", { component: "a2", inputPorts: ["controllerC"] });
    __act_DecideCommandAC_a2.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC_a2.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC_a2.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC::a2", __act_DecideCommandAC_a2);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC_a1 = new ActivityBase("DecideCommandAC", { component: "a1", inputPorts: ["controllerH"] });
    __act_DecideCommandAC_a1.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC_a1.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC_a1.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC::a1", __act_DecideCommandAC_a1);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC_rtc = new ActivityBase("DecideCommandAC", { component: "rtc", inputPorts: ["detected"] });
    __act_DecideCommandAC_rtc.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC_rtc.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC_rtc.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC::rtc", __act_DecideCommandAC_rtc);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC_rtc_sm = new ActivityBase("DecideCommandAC", { component: "rtc.sm", inputPorts: ["average2","target2"] });
    __act_DecideCommandAC_rtc_sm.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC_rtc_sm.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC_rtc_sm.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC::rtc.sm", __act_DecideCommandAC_rtc_sm);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC_rtc_cm = new ActivityBase("DecideCommandAC", { component: "rtc.cm", inputPorts: ["average2","target2"] });
    __act_DecideCommandAC_rtc_cm.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC_rtc_cm.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC_rtc_cm.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC::rtc.cm", __act_DecideCommandAC_rtc_cm);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC_rtc_pc = new ActivityBase("DecideCommandAC", { component: "rtc.pc", inputPorts: ["average2","target2"] });
    __act_DecideCommandAC_rtc_pc.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC_rtc_pc.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC_rtc_pc.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC::rtc.pc", __act_DecideCommandAC_rtc_pc);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC_s1 = new ActivityBase("FahrenheitToCelsiusAC", { component: "s1", inputPorts: ["current1"] });
    __act_FahrenheitToCelsiusAC_s1.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC::s1", __act_FahrenheitToCelsiusAC_s1);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC_s2 = new ActivityBase("FahrenheitToCelsiusAC", { component: "s2", inputPorts: ["current2"] });
    __act_FahrenheitToCelsiusAC_s2.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC::s2", __act_FahrenheitToCelsiusAC_s2);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC_s3 = new ActivityBase("FahrenheitToCelsiusAC", { component: "s3", inputPorts: ["detectedS"] });
    __act_FahrenheitToCelsiusAC_s3.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC::s3", __act_FahrenheitToCelsiusAC_s3);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC_ui = new ActivityBase("FahrenheitToCelsiusAC", { component: "ui", inputPorts: ["desired"] });
    __act_FahrenheitToCelsiusAC_ui.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC::ui", __act_FahrenheitToCelsiusAC_ui);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC_a2 = new ActivityBase("FahrenheitToCelsiusAC", { component: "a2", inputPorts: ["controllerC"] });
    __act_FahrenheitToCelsiusAC_a2.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC::a2", __act_FahrenheitToCelsiusAC_a2);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC_a1 = new ActivityBase("FahrenheitToCelsiusAC", { component: "a1", inputPorts: ["controllerH"] });
    __act_FahrenheitToCelsiusAC_a1.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC::a1", __act_FahrenheitToCelsiusAC_a1);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC_rtc = new ActivityBase("FahrenheitToCelsiusAC", { component: "rtc", inputPorts: ["detected"] });
    __act_FahrenheitToCelsiusAC_rtc.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC::rtc", __act_FahrenheitToCelsiusAC_rtc);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC_rtc_sm = new ActivityBase("FahrenheitToCelsiusAC", { component: "rtc.sm", inputPorts: ["current1"] });
    __act_FahrenheitToCelsiusAC_rtc_sm.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC::rtc.sm", __act_FahrenheitToCelsiusAC_rtc_sm);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC_rtc_cm = new ActivityBase("FahrenheitToCelsiusAC", { component: "rtc.cm", inputPorts: ["current1"] });
    __act_FahrenheitToCelsiusAC_rtc_cm.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC::rtc.cm", __act_FahrenheitToCelsiusAC_rtc_cm);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC_rtc_pc = new ActivityBase("FahrenheitToCelsiusAC", { component: "rtc.pc", inputPorts: ["current1"] });
    __act_FahrenheitToCelsiusAC_rtc_pc.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC::rtc.pc", __act_FahrenheitToCelsiusAC_rtc_pc);
  } catch (e) { /* ignore */ }
  try {
    const __act_CalculateAverageTemperatureAC = new ActivityBase("CalculateAverageTemperatureAC", { component: "s1", inputPorts: ["current1"] });
    __act_CalculateAverageTemperatureAC.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC", __act_CalculateAverageTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CalculateAverageTemperatureAC = new ActivityBase("CalculateAverageTemperatureAC", { component: "s2", inputPorts: ["current2"] });
    __act_CalculateAverageTemperatureAC.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC", __act_CalculateAverageTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CalculateAverageTemperatureAC = new ActivityBase("CalculateAverageTemperatureAC", { component: "s3", inputPorts: ["detectedS"] });
    __act_CalculateAverageTemperatureAC.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC", __act_CalculateAverageTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CalculateAverageTemperatureAC = new ActivityBase("CalculateAverageTemperatureAC", { component: "ui", inputPorts: ["desired"] });
    __act_CalculateAverageTemperatureAC.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC", __act_CalculateAverageTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CalculateAverageTemperatureAC = new ActivityBase("CalculateAverageTemperatureAC", { component: "a2", inputPorts: ["controllerC"] });
    __act_CalculateAverageTemperatureAC.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC", __act_CalculateAverageTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CalculateAverageTemperatureAC = new ActivityBase("CalculateAverageTemperatureAC", { component: "a1", inputPorts: ["controllerH"] });
    __act_CalculateAverageTemperatureAC.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC", __act_CalculateAverageTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CalculateAverageTemperatureAC = new ActivityBase("CalculateAverageTemperatureAC", { component: "rtc", inputPorts: ["detected"] });
    __act_CalculateAverageTemperatureAC.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC", __act_CalculateAverageTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CalculateAverageTemperatureAC = new ActivityBase("CalculateAverageTemperatureAC", { component: "rtc.sm", inputPorts: ["s1","s2"] });
    __act_CalculateAverageTemperatureAC.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC", __act_CalculateAverageTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CalculateAverageTemperatureAC = new ActivityBase("CalculateAverageTemperatureAC", { component: "rtc.cm", inputPorts: ["s1","s2"] });
    __act_CalculateAverageTemperatureAC.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC", __act_CalculateAverageTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CalculateAverageTemperatureAC = new ActivityBase("CalculateAverageTemperatureAC", { component: "rtc.pc", inputPorts: ["s1","s2"] });
    __act_CalculateAverageTemperatureAC.addAction(new ActionBase("CalculateAverageTemperatureAN", [], "SysADLModel.CalculateAverageTemperatureEx", "constraint : post-condition CalculateAverageTemperatureEQ"));
    m.registerActivity("CalculateAverageTemperatureAC", __act_CalculateAverageTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "s1", inputPorts: ["current1"] });
    __act_CheckPresenceToSetTemperatureAC.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC", __act_CheckPresenceToSetTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "s2", inputPorts: ["current2"] });
    __act_CheckPresenceToSetTemperatureAC.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC", __act_CheckPresenceToSetTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "s3", inputPorts: ["detectedS"] });
    __act_CheckPresenceToSetTemperatureAC.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC", __act_CheckPresenceToSetTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "ui", inputPorts: ["desired"] });
    __act_CheckPresenceToSetTemperatureAC.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC", __act_CheckPresenceToSetTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "a2", inputPorts: ["controllerC"] });
    __act_CheckPresenceToSetTemperatureAC.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC", __act_CheckPresenceToSetTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "a1", inputPorts: ["controllerH"] });
    __act_CheckPresenceToSetTemperatureAC.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC", __act_CheckPresenceToSetTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "rtc", inputPorts: ["detected","userTemp"] });
    __act_CheckPresenceToSetTemperatureAC.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC", __act_CheckPresenceToSetTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "rtc.sm", inputPorts: ["detected","userTemp"] });
    __act_CheckPresenceToSetTemperatureAC.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC", __act_CheckPresenceToSetTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "rtc.cm", inputPorts: ["detected","userTemp"] });
    __act_CheckPresenceToSetTemperatureAC.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC", __act_CheckPresenceToSetTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_CheckPresenceToSetTemperatureAC = new ActivityBase("CheckPresenceToSetTemperatureAC", { component: "rtc.pc", inputPorts: ["detected","userTemp"] });
    __act_CheckPresenceToSetTemperatureAC.addAction(new ActionBase("CheckPeresenceToSetTemperatureAN", [], "SysADLModel.CheckPresenceToSetTemperature", "constraint : post-condition CheckPresenceToSetTemperatureEQ"));
    m.registerActivity("CheckPresenceToSetTemperatureAC", __act_CheckPresenceToSetTemperatureAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC = new ActivityBase("DecideCommandAC", { component: "s1", inputPorts: ["current1"] });
    __act_DecideCommandAC.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC", __act_DecideCommandAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC = new ActivityBase("DecideCommandAC", { component: "s2", inputPorts: ["current2"] });
    __act_DecideCommandAC.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC", __act_DecideCommandAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC = new ActivityBase("DecideCommandAC", { component: "s3", inputPorts: ["detectedS"] });
    __act_DecideCommandAC.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC", __act_DecideCommandAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC = new ActivityBase("DecideCommandAC", { component: "ui", inputPorts: ["desired"] });
    __act_DecideCommandAC.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC", __act_DecideCommandAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC = new ActivityBase("DecideCommandAC", { component: "a2", inputPorts: ["controllerC"] });
    __act_DecideCommandAC.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC", __act_DecideCommandAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC = new ActivityBase("DecideCommandAC", { component: "a1", inputPorts: ["controllerH"] });
    __act_DecideCommandAC.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC", __act_DecideCommandAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC = new ActivityBase("DecideCommandAC", { component: "rtc", inputPorts: ["detected"] });
    __act_DecideCommandAC.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC", __act_DecideCommandAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC = new ActivityBase("DecideCommandAC", { component: "rtc.sm", inputPorts: ["average2","target2"] });
    __act_DecideCommandAC.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC", __act_DecideCommandAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC = new ActivityBase("DecideCommandAC", { component: "rtc.cm", inputPorts: ["average2","target2"] });
    __act_DecideCommandAC.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC", __act_DecideCommandAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_DecideCommandAC = new ActivityBase("DecideCommandAC", { component: "rtc.pc", inputPorts: ["average2","target2"] });
    __act_DecideCommandAC.addAction(new ActionBase("CommandCoolerAN", [], "SysADLModel.CommandCoolerEx", "constraint : post-condition CommandCoolerEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CommandHeaterAN", [], "SysADLModel.CommandHeaterEx", "constraint : post-condition CommandHeaterEQ"));
    __act_DecideCommandAC.addAction(new ActionBase("CompareTemperatureAN", [], "SysADLModel.CompareTemperatureEx", "constraint : post-condition CompareTemperatureEQ"));
    m.registerActivity("DecideCommandAC", __act_DecideCommandAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC = new ActivityBase("FahrenheitToCelsiusAC", { component: "s1", inputPorts: ["current1"] });
    __act_FahrenheitToCelsiusAC.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC", __act_FahrenheitToCelsiusAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC = new ActivityBase("FahrenheitToCelsiusAC", { component: "s2", inputPorts: ["current2"] });
    __act_FahrenheitToCelsiusAC.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC", __act_FahrenheitToCelsiusAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC = new ActivityBase("FahrenheitToCelsiusAC", { component: "s3", inputPorts: ["detectedS"] });
    __act_FahrenheitToCelsiusAC.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC", __act_FahrenheitToCelsiusAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC = new ActivityBase("FahrenheitToCelsiusAC", { component: "ui", inputPorts: ["desired"] });
    __act_FahrenheitToCelsiusAC.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC", __act_FahrenheitToCelsiusAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC = new ActivityBase("FahrenheitToCelsiusAC", { component: "a2", inputPorts: ["controllerC"] });
    __act_FahrenheitToCelsiusAC.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC", __act_FahrenheitToCelsiusAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC = new ActivityBase("FahrenheitToCelsiusAC", { component: "a1", inputPorts: ["controllerH"] });
    __act_FahrenheitToCelsiusAC.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC", __act_FahrenheitToCelsiusAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC = new ActivityBase("FahrenheitToCelsiusAC", { component: "rtc", inputPorts: ["detected"] });
    __act_FahrenheitToCelsiusAC.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC", __act_FahrenheitToCelsiusAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC = new ActivityBase("FahrenheitToCelsiusAC", { component: "rtc.sm", inputPorts: ["current1"] });
    __act_FahrenheitToCelsiusAC.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC", __act_FahrenheitToCelsiusAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC = new ActivityBase("FahrenheitToCelsiusAC", { component: "rtc.cm", inputPorts: ["current1"] });
    __act_FahrenheitToCelsiusAC.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC", __act_FahrenheitToCelsiusAC);
  } catch (e) { /* ignore */ }
  try {
    const __act_FahrenheitToCelsiusAC = new ActivityBase("FahrenheitToCelsiusAC", { component: "rtc.pc", inputPorts: ["current1"] });
    __act_FahrenheitToCelsiusAC.addAction(new ActionBase("FahrenheitToCelsiusAN", [], "SysADLModel.FahrenheitToCelsiusEx", "constraint : post-condition FahrenheitToCelsiusEQ"));
    m.registerActivity("FahrenheitToCelsiusAC", __act_FahrenheitToCelsiusAC);
  } catch (e) { /* ignore */ }
  return m;
}
module.exports = { createModel };
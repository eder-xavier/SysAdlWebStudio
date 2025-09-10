const { Model, Component, Port, Connector, Activity, Action, createExecutableFromExpression } = require('../SysADLBase');
class SupervisorySystem extends Component { constructor(name){ super(name); } }
class AGVSystem extends Component { constructor(name){ super(name); } }
class DisplaySystem extends Component { constructor(name){ super(name); } }
class Motor extends Component { constructor(name){ super(name); } }
class ArrivalSensor extends Component { constructor(name){ super(name); } }
class RobotArm extends Component { constructor(name){ super(name); } }
class VehicleControl extends Component { constructor(name){ super(name); } }
class CheckStation extends Component { constructor(name){ super(name); } }
class ControlArm extends Component { constructor(name){ super(name); } }
class NotifierMotor extends Component { constructor(name){ super(name); } }
class StartMoving extends Component { constructor(name){ super(name); } }
class NotifierArm extends Component { constructor(name){ super(name); } }
class VehicleTimer extends Component { constructor(name){ super(name); } }
class FactoryAutomationSystem extends Component { constructor(name){ super(name); } }

class SysADLArchitecture extends Model {
  constructor(){
    super("SysADLArchitecture");
    // instantiate components and expose as properties for direct navigation
    this.FactoryAutomationSystem = new FactoryAutomationSystem("FactoryAutomationSystem");
    this.addComponent(this.FactoryAutomationSystem);
    this.FactoryAutomationSystem.agvs = new AGVSystem("agvs");
    this.FactoryAutomationSystem.addComponent(this.FactoryAutomationSystem.agvs);
    this.FactoryAutomationSystem.ds = new DisplaySystem("ds");
    this.FactoryAutomationSystem.addComponent(this.FactoryAutomationSystem.ds);
    this.FactoryAutomationSystem.ss = new SupervisorySystem("ss");
    this.FactoryAutomationSystem.addComponent(this.FactoryAutomationSystem.ss);
    this.FactoryAutomationSystem.agvs.as = new ArrivalSensor("as");
    this.FactoryAutomationSystem.agvs.addComponent(this.FactoryAutomationSystem.agvs.as);
    this.FactoryAutomationSystem.agvs.m = new Motor("m");
    this.FactoryAutomationSystem.agvs.addComponent(this.FactoryAutomationSystem.agvs.m);
    this.FactoryAutomationSystem.agvs.ra = new RobotArm("ra");
    this.FactoryAutomationSystem.agvs.addComponent(this.FactoryAutomationSystem.agvs.ra);
    this.FactoryAutomationSystem.agvs.vc = new VehicleControl("vc");
    this.FactoryAutomationSystem.agvs.addComponent(this.FactoryAutomationSystem.agvs.vc);
    this.FactoryAutomationSystem.agvs.vc.ca = new ControlArm("ca");
    this.FactoryAutomationSystem.agvs.vc.addComponent(this.FactoryAutomationSystem.agvs.vc.ca);
    this.FactoryAutomationSystem.agvs.vc.cs = new CheckStation("cs");
    this.FactoryAutomationSystem.agvs.vc.addComponent(this.FactoryAutomationSystem.agvs.vc.cs);
    this.FactoryAutomationSystem.agvs.vc.na = new NotifierArm("na");
    this.FactoryAutomationSystem.agvs.vc.addComponent(this.FactoryAutomationSystem.agvs.vc.na);
    this.FactoryAutomationSystem.agvs.vc.nm = new NotifierMotor("nm");
    this.FactoryAutomationSystem.agvs.vc.addComponent(this.FactoryAutomationSystem.agvs.vc.nm);
    this.FactoryAutomationSystem.agvs.vc.sm = new StartMoving("sm");
    this.FactoryAutomationSystem.agvs.vc.addComponent(this.FactoryAutomationSystem.agvs.vc.sm);
    this.FactoryAutomationSystem.agvs.vc.vt = new VehicleTimer("vt");
    this.FactoryAutomationSystem.agvs.vc.addComponent(this.FactoryAutomationSystem.agvs.vc.vt);

    // helper to add executable safely
    const __addExec = (ename, body, params) => { try { this.addExecutable(ename, createExecutableFromExpression(String(body||""), params||[])); } catch(e) { /* ignore */ } };
    // helper to attach connector endpoint (model, componentExprOrName, portName)
    const __attachEndpoint = (conn, compOrName, portName) => { try { let comp = compOrName; if (typeof compOrName === "string") { comp = this.components && this.components[compOrName] ? this.components[compOrName] : Object.values(this.components||{}).find(c=>c && (c.sysadlName === compOrName || c.name === compOrName)); } if (comp && comp.ports && comp.ports[portName]) conn.addEndpoint(this, comp.ports[portName]); } catch(e){} };
    const __findPortComponent = (portName) => { try { const seen = new Set(); const rec = (c) => { if (!c || seen.has(c)) return null; seen.add(c); if (c.ports && c.ports[portName]) return c; if (c.components) { for (const k of Object.keys(c.components||{})) { const child = c.components[k]; const f = rec(child); if (f) return f; } } return null; }; for (const top of Object.values(this.components||{})) { const f = rec(top); if (f) return f; } return null; } catch(e){ return null; } };
    const _norm = (s) => { try { return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,""); } catch(e){ return String(s||""); } };
    const __findPortComponentByNormalized = (portName) => { try { const np = _norm(portName); const seen = new Set(); const rec = (c) => { if (!c || seen.has(c)) return null; seen.add(c); if (c.ports) { for (const pk of Object.keys(c.ports||{})) { if (_norm(pk) === np || _norm(pk).indexOf(np) !== -1 || np.indexOf(_norm(pk)) !== -1) return c; } } if (c.components) { for (const k of Object.keys(c.components||{})) { const child = c.components[k]; const f = rec(child); if (f) return f; } } return null; }; for (const top of Object.values(this.components||{})) { const f = rec(top); if (f) return f; } return null; } catch(e){ return null; } };
    // port in_outData on ss (expr: this.FactoryAutomationSystem.ss)
    if (!this.FactoryAutomationSystem.ss.ports) this.FactoryAutomationSystem.ss.ports = {};
    if (!this.FactoryAutomationSystem.ss.ports["in_outData"]) { const __p = new Port("in_outData", 'in', { owner: "ss" }); this.FactoryAutomationSystem.ss.addPort(__p); }
    // port sendStatus on agvs (expr: this.FactoryAutomationSystem.agvs)
    if (!this.FactoryAutomationSystem.agvs.ports) this.FactoryAutomationSystem.agvs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.ports["sendStatus"]) { const __p = new Port("sendStatus", 'in', { owner: "agvs" }); this.FactoryAutomationSystem.agvs.addPort(__p); }
    // port in_outData on agvs (expr: this.FactoryAutomationSystem.agvs)
    if (!this.FactoryAutomationSystem.agvs.ports) this.FactoryAutomationSystem.agvs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.ports["in_outData"]) { const __p = new Port("in_outData", 'in', { owner: "agvs" }); this.FactoryAutomationSystem.agvs.addPort(__p); }
    // port start_stop_in on agvs (expr: this.FactoryAutomationSystem.agvs)
    if (!this.FactoryAutomationSystem.agvs.ports) this.FactoryAutomationSystem.agvs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.ports["start_stop_in"]) { const __p = new Port("start_stop_in", 'in', { owner: "agvs" }); this.FactoryAutomationSystem.agvs.addPort(__p); }
    // port started_stopped_out on agvs (expr: this.FactoryAutomationSystem.agvs)
    if (!this.FactoryAutomationSystem.agvs.ports) this.FactoryAutomationSystem.agvs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.ports["started_stopped_out"]) { const __p = new Port("started_stopped_out", 'in', { owner: "agvs" }); this.FactoryAutomationSystem.agvs.addPort(__p); }
    // port arrivalDetected_out on agvs (expr: this.FactoryAutomationSystem.agvs)
    if (!this.FactoryAutomationSystem.agvs.ports) this.FactoryAutomationSystem.agvs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.ports["arrivalDetected_out"]) { const __p = new Port("arrivalDetected_out", 'in', { owner: "agvs" }); this.FactoryAutomationSystem.agvs.addPort(__p); }
    // port start on agvs (expr: this.FactoryAutomationSystem.agvs)
    if (!this.FactoryAutomationSystem.agvs.ports) this.FactoryAutomationSystem.agvs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.ports["start"]) { const __p = new Port("start", 'in', { owner: "agvs" }); this.FactoryAutomationSystem.agvs.addPort(__p); }
    // port started on agvs (expr: this.FactoryAutomationSystem.agvs)
    if (!this.FactoryAutomationSystem.agvs.ports) this.FactoryAutomationSystem.agvs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.ports["started"]) { const __p = new Port("started", 'in', { owner: "agvs" }); this.FactoryAutomationSystem.agvs.addPort(__p); }
    // port sendStatus on agvs (expr: this.FactoryAutomationSystem.agvs)
    if (!this.FactoryAutomationSystem.agvs.ports) this.FactoryAutomationSystem.agvs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.ports["sendStatus"]) { const __p = new Port("sendStatus", 'in', { owner: "agvs" }); this.FactoryAutomationSystem.agvs.addPort(__p); }
    // port arrivalDetected_in on agvs (expr: this.FactoryAutomationSystem.agvs)
    if (!this.FactoryAutomationSystem.agvs.ports) this.FactoryAutomationSystem.agvs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.ports["arrivalDetected_in"]) { const __p = new Port("arrivalDetected_in", 'in', { owner: "agvs" }); this.FactoryAutomationSystem.agvs.addPort(__p); }
    // port startArm on agvs (expr: this.FactoryAutomationSystem.agvs)
    if (!this.FactoryAutomationSystem.agvs.ports) this.FactoryAutomationSystem.agvs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.ports["startArm"]) { const __p = new Port("startArm", 'in', { owner: "agvs" }); this.FactoryAutomationSystem.agvs.addPort(__p); }
    // port startedArm on agvs (expr: this.FactoryAutomationSystem.agvs)
    if (!this.FactoryAutomationSystem.agvs.ports) this.FactoryAutomationSystem.agvs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.ports["startedArm"]) { const __p = new Port("startedArm", 'in', { owner: "agvs" }); this.FactoryAutomationSystem.agvs.addPort(__p); }
    // port started_stopped_in on agvs (expr: this.FactoryAutomationSystem.agvs)
    if (!this.FactoryAutomationSystem.agvs.ports) this.FactoryAutomationSystem.agvs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.ports["started_stopped_in"]) { const __p = new Port("started_stopped_in", 'in', { owner: "agvs" }); this.FactoryAutomationSystem.agvs.addPort(__p); }
    // port start_stop_out on agvs (expr: this.FactoryAutomationSystem.agvs)
    if (!this.FactoryAutomationSystem.agvs.ports) this.FactoryAutomationSystem.agvs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.ports["start_stop_out"]) { const __p = new Port("start_stop_out", 'in', { owner: "agvs" }); this.FactoryAutomationSystem.agvs.addPort(__p); }
    // port in_outData on agvs (expr: this.FactoryAutomationSystem.agvs)
    if (!this.FactoryAutomationSystem.agvs.ports) this.FactoryAutomationSystem.agvs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.ports["in_outData"]) { const __p = new Port("in_outData", 'in', { owner: "agvs" }); this.FactoryAutomationSystem.agvs.addPort(__p); }
    // port receiveStatus on ds (expr: this.FactoryAutomationSystem.ds)
    if (!this.FactoryAutomationSystem.ds.ports) this.FactoryAutomationSystem.ds.ports = {};
    if (!this.FactoryAutomationSystem.ds.ports["receiveStatus"]) { const __p = new Port("receiveStatus", 'in', { owner: "ds" }); this.FactoryAutomationSystem.ds.addPort(__p); }
    // port start_stop on m (expr: this.FactoryAutomationSystem.agvs.m)
    if (!this.FactoryAutomationSystem.agvs.m.ports) this.FactoryAutomationSystem.agvs.m.ports = {};
    if (!this.FactoryAutomationSystem.agvs.m.ports["start_stop"]) { const __p = new Port("start_stop", 'in', { owner: "m" }); this.FactoryAutomationSystem.agvs.m.addPort(__p); }
    // port started_stopped on m (expr: this.FactoryAutomationSystem.agvs.m)
    if (!this.FactoryAutomationSystem.agvs.m.ports) this.FactoryAutomationSystem.agvs.m.ports = {};
    if (!this.FactoryAutomationSystem.agvs.m.ports["started_stopped"]) { const __p = new Port("started_stopped", 'in', { owner: "m" }); this.FactoryAutomationSystem.agvs.m.addPort(__p); }
    // port arrivalDetected on as (expr: this.FactoryAutomationSystem.agvs.as)
    if (!this.FactoryAutomationSystem.agvs.as.ports) this.FactoryAutomationSystem.agvs.as.ports = {};
    if (!this.FactoryAutomationSystem.agvs.as.ports["arrivalDetected"]) { const __p = new Port("arrivalDetected", 'in', { owner: "as" }); this.FactoryAutomationSystem.agvs.as.addPort(__p); }
    // port start on ra (expr: this.FactoryAutomationSystem.agvs.ra)
    if (!this.FactoryAutomationSystem.agvs.ra.ports) this.FactoryAutomationSystem.agvs.ra.ports = {};
    if (!this.FactoryAutomationSystem.agvs.ra.ports["start"]) { const __p = new Port("start", 'in', { owner: "ra" }); this.FactoryAutomationSystem.agvs.ra.addPort(__p); }
    // port started on ra (expr: this.FactoryAutomationSystem.agvs.ra)
    if (!this.FactoryAutomationSystem.agvs.ra.ports) this.FactoryAutomationSystem.agvs.ra.ports = {};
    if (!this.FactoryAutomationSystem.agvs.ra.ports["started"]) { const __p = new Port("started", 'in', { owner: "ra" }); this.FactoryAutomationSystem.agvs.ra.addPort(__p); }
    // port sendStatus on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["sendStatus"]) { const __p = new Port("sendStatus", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port arrivalDetected on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["arrivalDetected"]) { const __p = new Port("arrivalDetected", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port startArm on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["startArm"]) { const __p = new Port("startArm", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port startedArm on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["startedArm"]) { const __p = new Port("startedArm", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port started_stopped on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["started_stopped"]) { const __p = new Port("started_stopped", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port start_stop on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["start_stop"]) { const __p = new Port("start_stop", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port in_outData on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["in_outData"]) { const __p = new Port("in_outData", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port ack_cs on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["ack_cs"]) { const __p = new Port("ack_cs", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port location_cs on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["location_cs"]) { const __p = new Port("location_cs", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port destination_cs on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["destination_cs"]) { const __p = new Port("destination_cs", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port stop on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["stop"]) { const __p = new Port("stop", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port arrivalDetected on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["arrivalDetected"]) { const __p = new Port("arrivalDetected", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port passed on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["passed"]) { const __p = new Port("passed", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port cmd_ca on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["cmd_ca"]) { const __p = new Port("cmd_ca", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port ack_ca on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["ack_ca"]) { const __p = new Port("ack_ca", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port startArm on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["startArm"]) { const __p = new Port("startArm", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port inAck on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["inAck"]) { const __p = new Port("inAck", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port ack on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["ack"]) { const __p = new Port("ack", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port outAck on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["outAck"]) { const __p = new Port("outAck", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port move on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["move"]) { const __p = new Port("move", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port cmd_sm on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["cmd_sm"]) { const __p = new Port("cmd_sm", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port destination on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["destination"]) { const __p = new Port("destination", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port start on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["start"]) { const __p = new Port("start", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port arrivedStatus on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["arrivedStatus"]) { const __p = new Port("arrivedStatus", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port loaded_unloaded on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["loaded_unloaded"]) { const __p = new Port("loaded_unloaded", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port AGVStatus on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["AGVStatus"]) { const __p = new Port("AGVStatus", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port location_vt on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["location_vt"]) { const __p = new Port("location_vt", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port destination_vt on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["destination_vt"]) { const __p = new Port("destination_vt", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port cmd on vc (expr: this.FactoryAutomationSystem.agvs.vc)
    if (!this.FactoryAutomationSystem.agvs.vc.ports) this.FactoryAutomationSystem.agvs.vc.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ports["cmd"]) { const __p = new Port("cmd", 'in', { owner: "vc" }); this.FactoryAutomationSystem.agvs.vc.addPort(__p); }
    // port ack on cs (expr: this.FactoryAutomationSystem.agvs.vc.cs)
    if (!this.FactoryAutomationSystem.agvs.vc.cs.ports) this.FactoryAutomationSystem.agvs.vc.cs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.cs.ports["ack"]) { const __p = new Port("ack", 'in', { owner: "cs" }); this.FactoryAutomationSystem.agvs.vc.cs.addPort(__p); }
    // port location on cs (expr: this.FactoryAutomationSystem.agvs.vc.cs)
    if (!this.FactoryAutomationSystem.agvs.vc.cs.ports) this.FactoryAutomationSystem.agvs.vc.cs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.cs.ports["location"]) { const __p = new Port("location", 'in', { owner: "cs" }); this.FactoryAutomationSystem.agvs.vc.cs.addPort(__p); }
    // port destination on cs (expr: this.FactoryAutomationSystem.agvs.vc.cs)
    if (!this.FactoryAutomationSystem.agvs.vc.cs.ports) this.FactoryAutomationSystem.agvs.vc.cs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.cs.ports["destination"]) { const __p = new Port("destination", 'in', { owner: "cs" }); this.FactoryAutomationSystem.agvs.vc.cs.addPort(__p); }
    // port stop on cs (expr: this.FactoryAutomationSystem.agvs.vc.cs)
    if (!this.FactoryAutomationSystem.agvs.vc.cs.ports) this.FactoryAutomationSystem.agvs.vc.cs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.cs.ports["stop"]) { const __p = new Port("stop", 'in', { owner: "cs" }); this.FactoryAutomationSystem.agvs.vc.cs.addPort(__p); }
    // port arrivalDetected on cs (expr: this.FactoryAutomationSystem.agvs.vc.cs)
    if (!this.FactoryAutomationSystem.agvs.vc.cs.ports) this.FactoryAutomationSystem.agvs.vc.cs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.cs.ports["arrivalDetected"]) { const __p = new Port("arrivalDetected", 'in', { owner: "cs" }); this.FactoryAutomationSystem.agvs.vc.cs.addPort(__p); }
    // port passed on cs (expr: this.FactoryAutomationSystem.agvs.vc.cs)
    if (!this.FactoryAutomationSystem.agvs.vc.cs.ports) this.FactoryAutomationSystem.agvs.vc.cs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.cs.ports["passed"]) { const __p = new Port("passed", 'in', { owner: "cs" }); this.FactoryAutomationSystem.agvs.vc.cs.addPort(__p); }
    // port cmd on ca (expr: this.FactoryAutomationSystem.agvs.vc.ca)
    if (!this.FactoryAutomationSystem.agvs.vc.ca.ports) this.FactoryAutomationSystem.agvs.vc.ca.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ca.ports["cmd"]) { const __p = new Port("cmd", 'in', { owner: "ca" }); this.FactoryAutomationSystem.agvs.vc.ca.addPort(__p); }
    // port ack on ca (expr: this.FactoryAutomationSystem.agvs.vc.ca)
    if (!this.FactoryAutomationSystem.agvs.vc.ca.ports) this.FactoryAutomationSystem.agvs.vc.ca.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ca.ports["ack"]) { const __p = new Port("ack", 'in', { owner: "ca" }); this.FactoryAutomationSystem.agvs.vc.ca.addPort(__p); }
    // port startArm on ca (expr: this.FactoryAutomationSystem.agvs.vc.ca)
    if (!this.FactoryAutomationSystem.agvs.vc.ca.ports) this.FactoryAutomationSystem.agvs.vc.ca.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ca.ports["startArm"]) { const __p = new Port("startArm", 'in', { owner: "ca" }); this.FactoryAutomationSystem.agvs.vc.ca.addPort(__p); }
    // port inAck on nm (expr: this.FactoryAutomationSystem.agvs.vc.nm)
    if (!this.FactoryAutomationSystem.agvs.vc.nm.ports) this.FactoryAutomationSystem.agvs.vc.nm.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.nm.ports["inAck"]) { const __p = new Port("inAck", 'in', { owner: "nm" }); this.FactoryAutomationSystem.agvs.vc.nm.addPort(__p); }
    // port ack on nm (expr: this.FactoryAutomationSystem.agvs.vc.nm)
    if (!this.FactoryAutomationSystem.agvs.vc.nm.ports) this.FactoryAutomationSystem.agvs.vc.nm.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.nm.ports["ack"]) { const __p = new Port("ack", 'in', { owner: "nm" }); this.FactoryAutomationSystem.agvs.vc.nm.addPort(__p); }
    // port outAck on nm (expr: this.FactoryAutomationSystem.agvs.vc.nm)
    if (!this.FactoryAutomationSystem.agvs.vc.nm.ports) this.FactoryAutomationSystem.agvs.vc.nm.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.nm.ports["outAck"]) { const __p = new Port("outAck", 'in', { owner: "nm" }); this.FactoryAutomationSystem.agvs.vc.nm.addPort(__p); }
    // port move on sm (expr: this.FactoryAutomationSystem.agvs.vc.sm)
    if (!this.FactoryAutomationSystem.agvs.vc.sm.ports) this.FactoryAutomationSystem.agvs.vc.sm.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.sm.ports["move"]) { const __p = new Port("move", 'in', { owner: "sm" }); this.FactoryAutomationSystem.agvs.vc.sm.addPort(__p); }
    // port cmd on sm (expr: this.FactoryAutomationSystem.agvs.vc.sm)
    if (!this.FactoryAutomationSystem.agvs.vc.sm.ports) this.FactoryAutomationSystem.agvs.vc.sm.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.sm.ports["cmd"]) { const __p = new Port("cmd", 'in', { owner: "sm" }); this.FactoryAutomationSystem.agvs.vc.sm.addPort(__p); }
    // port destination on sm (expr: this.FactoryAutomationSystem.agvs.vc.sm)
    if (!this.FactoryAutomationSystem.agvs.vc.sm.ports) this.FactoryAutomationSystem.agvs.vc.sm.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.sm.ports["destination"]) { const __p = new Port("destination", 'in', { owner: "sm" }); this.FactoryAutomationSystem.agvs.vc.sm.addPort(__p); }
    // port start on sm (expr: this.FactoryAutomationSystem.agvs.vc.sm)
    if (!this.FactoryAutomationSystem.agvs.vc.sm.ports) this.FactoryAutomationSystem.agvs.vc.sm.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.sm.ports["start"]) { const __p = new Port("start", 'in', { owner: "sm" }); this.FactoryAutomationSystem.agvs.vc.sm.addPort(__p); }
    // port arrivedStatus on na (expr: this.FactoryAutomationSystem.agvs.vc.na)
    if (!this.FactoryAutomationSystem.agvs.vc.na.ports) this.FactoryAutomationSystem.agvs.vc.na.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.na.ports["arrivedStatus"]) { const __p = new Port("arrivedStatus", 'in', { owner: "na" }); this.FactoryAutomationSystem.agvs.vc.na.addPort(__p); }
    // port loaded_unloaded on na (expr: this.FactoryAutomationSystem.agvs.vc.na)
    if (!this.FactoryAutomationSystem.agvs.vc.na.ports) this.FactoryAutomationSystem.agvs.vc.na.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.na.ports["loaded_unloaded"]) { const __p = new Port("loaded_unloaded", 'in', { owner: "na" }); this.FactoryAutomationSystem.agvs.vc.na.addPort(__p); }
    // port AGVStatus on vt (expr: this.FactoryAutomationSystem.agvs.vc.vt)
    if (!this.FactoryAutomationSystem.agvs.vc.vt.ports) this.FactoryAutomationSystem.agvs.vc.vt.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.vt.ports["AGVStatus"]) { const __p = new Port("AGVStatus", 'in', { owner: "vt" }); this.FactoryAutomationSystem.agvs.vc.vt.addPort(__p); }
    // port location on vt (expr: this.FactoryAutomationSystem.agvs.vc.vt)
    if (!this.FactoryAutomationSystem.agvs.vc.vt.ports) this.FactoryAutomationSystem.agvs.vc.vt.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.vt.ports["location"]) { const __p = new Port("location", 'in', { owner: "vt" }); this.FactoryAutomationSystem.agvs.vc.vt.addPort(__p); }
    // port destination on vt (expr: this.FactoryAutomationSystem.agvs.vc.vt)
    if (!this.FactoryAutomationSystem.agvs.vc.vt.ports) this.FactoryAutomationSystem.agvs.vc.vt.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.vt.ports["destination"]) { const __p = new Port("destination", 'in', { owner: "vt" }); this.FactoryAutomationSystem.agvs.vc.vt.addPort(__p); }
    // port cmd on vt (expr: this.FactoryAutomationSystem.agvs.vc.vt)
    if (!this.FactoryAutomationSystem.agvs.vc.vt.ports) this.FactoryAutomationSystem.agvs.vc.vt.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.vt.ports["cmd"]) { const __p = new Port("cmd", 'in', { owner: "vt" }); this.FactoryAutomationSystem.agvs.vc.vt.addPort(__p); }
    // ensure activity ports for sm (expr: this.FactoryAutomationSystem.agvs.vc.sm)
    if (!this.FactoryAutomationSystem.agvs.vc.sm.ports) this.FactoryAutomationSystem.agvs.vc.sm.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.sm.ports["move"]) { const __p = new Port("move", 'in', { owner: "sm" }); this.FactoryAutomationSystem.agvs.vc.sm.addPort(__p); }
    // ensure activity ports for nm (expr: this.FactoryAutomationSystem.agvs.vc.nm)
    if (!this.FactoryAutomationSystem.agvs.vc.nm.ports) this.FactoryAutomationSystem.agvs.vc.nm.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.nm.ports["inAck"]) { const __p = new Port("inAck", 'in', { owner: "nm" }); this.FactoryAutomationSystem.agvs.vc.nm.addPort(__p); }
    // ensure activity ports for cs (expr: this.FactoryAutomationSystem.agvs.vc.cs)
    if (!this.FactoryAutomationSystem.agvs.vc.cs.ports) this.FactoryAutomationSystem.agvs.vc.cs.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.cs.ports["ack"]) { const __p = new Port("ack", 'in', { owner: "cs" }); this.FactoryAutomationSystem.agvs.vc.cs.addPort(__p); }
    // ensure activity ports for ca (expr: this.FactoryAutomationSystem.agvs.vc.ca)
    if (!this.FactoryAutomationSystem.agvs.vc.ca.ports) this.FactoryAutomationSystem.agvs.vc.ca.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.ca.ports["cmd"]) { const __p = new Port("cmd", 'in', { owner: "ca" }); this.FactoryAutomationSystem.agvs.vc.ca.addPort(__p); }
    // ensure activity ports for na (expr: this.FactoryAutomationSystem.agvs.vc.na)
    if (!this.FactoryAutomationSystem.agvs.vc.na.ports) this.FactoryAutomationSystem.agvs.vc.na.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.na.ports["arrivedStatus"]) { const __p = new Port("arrivedStatus", 'in', { owner: "na" }); this.FactoryAutomationSystem.agvs.vc.na.addPort(__p); }
    // ensure activity ports for vt (expr: this.FactoryAutomationSystem.agvs.vc.vt)
    if (!this.FactoryAutomationSystem.agvs.vc.vt.ports) this.FactoryAutomationSystem.agvs.vc.vt.ports = {};
    if (!this.FactoryAutomationSystem.agvs.vc.vt.ports["destination"]) { const __p = new Port("destination", 'in', { owner: "vt" }); this.FactoryAutomationSystem.agvs.vc.vt.addPort(__p); }
    __addExec("SysADLArchitecture.SendStartMotorEX", "executable def SendStartMotorEX ( in move : VehicleData) : out CommandToMotor {\n\t\treturn CommandToMotor::start;\n\t}", []);
    __addExec("SysADLArchitecture.SendCommandEX", "executable def SendCommandEX ( in move : VehicleData) : out CommandToArm {\n\t\treturn move->command;\n\t}", []);
    __addExec("SysADLArchitecture.SendDestinationEX", "executable def SendDestinationEX ( in move : VehicleData) : out Location {\n\t\treturn move->destination;\n\t}", []);
    __addExec("SysADLArchitecture.NotifyAGVFromMotorEX", "executable def NotifyAGVFromMotorEX ( in statusMotor : NotificationFromMotor) : \n\tout NotificationFromMotor{\n\t\treturn statusMotor;\n\t}", []);
    __addExec("SysADLArchitecture.NotifySupervisoryFromMotorEX", "executable def NotifySupervisoryFromMotorEX ( in statusMotor : NotificationFromMotor) : \n\t\tout\tNotificationToSupervisory {\n\t\tif (statusMotor == NotificationFromMotor::started) \n\t\t\treturn NotificationToSupervisory::departed;\n\t\telse\n\t\t\treturn NotificationToSupervisory::traveling;\n\t}", []);
    __addExec("SysADLArchitecture.CompareStationsEX", "executable def CompareStationsEX ( in destination : Location, in location : Location, \n\t\tin statusMotor : NotificationFromMotor) : \tout Boolean {\n\t\tif(statusMotor == NotificationFromMotor::started && destination == location)\n\t\t\treturn true;\n\t\telse\n\t\t\treturn false;\n\t}", []);
    __addExec("SysADLArchitecture.StopMotorEX", "executable def StopMotorEX ( in comparisonResult : Boolean) :\n\tout CommandToMotor {\n\t\tif(comparisonResult == true)\n\t\t\treturn CommandToMotor::stop;\n\t\telse\n\t\t\treturn null;\n\t}", []);
    __addExec("SysADLArchitecture.PassedMotorEX", "executable def PassedMotorEX ( in comparisonResult : Boolean) :\n\tout NotificationToSupervisory {\n\t\tif(comparisonResult == false)\n\t\t\treturn NotificationToSupervisory::passed;\n\t\telse\n\t\t\treturn null;\n\t}", []);
    __addExec("SysADLArchitecture.SendCurrentLocationEX", "executable def SendCurrentLocationEX ( in location : Location)\n\t: out Location {\n\t\treturn location;\n\t}", []);
    __addExec("SysADLArchitecture.ControlArmEX", "executable def ControlArmEX ( in statusMotor : NotificationFromMotor, in cmd : CommandToArm) : out CommandToArm {\n\t\tif(statusMotor == NotificationFromMotor::stopped)\n\t\t\treturn cmd;\n\t\telse\n\t\t\treturn CommandToArm::idle;\n\t}", []);
    __addExec("SysADLArchitecture.NotifierArmEX", "executable def NotifierArmEX ( in statusArm : NotificationFromArm) : \n\tout\tNotificationToSupervisory {\n\t\treturn NotificationToSupervisory::arrived;\n\t}", []);
    __addExec("SysADLArchitecture.VehicleTimerEX", "executable def VehicleTimerEX ( in location : Location, in cmd : CommandToArm, \n\t\tin destination : Location) : out Status {\n\t\t\n\t\tlet s : Status;\n\t\ts->destination = destination;\n\t\ts->location = location;\n\t\ts->command = cmd;\n\t\t\n\t\treturn s;\n\t}", []);
    __addExec("SysADLArchitecture.k13n", "executable CompareStationsEX to CompareStationsAN", []);
    __addExec("SysADLArchitecture.vud4", "executable ControlArmEX to ControlArmAN", []);
    __addExec("SysADLArchitecture.jkrp", "executable NotifierArmEX to NotifierArmAN", []);
    __addExec("SysADLArchitecture.q8o1", "executable NotifyAGVFromMotorEX to NotifyAGVFromMotorAN", []);
    __addExec("SysADLArchitecture.wulh", "executable NotifySupervisoryFromMotorEX to NotifySupervisoryFromMotorAN", []);
    __addExec("SysADLArchitecture.1d63", "executable PassedMotorEX to PassedMotorAN", []);
    __addExec("SysADLArchitecture.e89o", "executable SendCommandEX to SendCommandAN", []);
    __addExec("SysADLArchitecture.1sjf", "executable SendCurrentLocationEX to SendCurrentLocationAN", []);
    __addExec("SysADLArchitecture.jwgs", "executable SendDestinationEX to SendDestinationAN", []);
    __addExec("SysADLArchitecture.1jat", "executable SendStartMotorEX to SendStartMotorAN", []);
    __addExec("SysADLArchitecture.ovb2", "executable StopMotorEX to StopMotorAN", []);
    __addExec("SysADLArchitecture.ep45", "executable VehicleTimerEX to VehicleTimerAN", []);
    const act_StartMovingAC_sm = new Activity("StartMovingAC", { component: "sm", inputPorts: ["move"] });
    act_StartMovingAC_sm.addAction(new Action("SendStartMotorAN", [], "SendStartMotorEX"));
    act_StartMovingAC_sm.addAction(new Action("SendCommandAN", [], "SendCommandEX"));
    act_StartMovingAC_sm.addAction(new Action("SendDestinationAN", [], "SendDestinationEX"));
    this.registerActivity("StartMovingAC::sm", act_StartMovingAC_sm);
    const act_NotifierMotorAC_nm = new Activity("NotifierMotorAC", { component: "nm", inputPorts: ["inAck"] });
    act_NotifierMotorAC_nm.addAction(new Action("NotifyAGVFromMotorAN", [], "NotifyAGVFromMotorEX"));
    act_NotifierMotorAC_nm.addAction(new Action("NotifySupervisoryFromMotorAN", [], "NotifySupervisoryFromMotorEX"));
    this.registerActivity("NotifierMotorAC::nm", act_NotifierMotorAC_nm);
    const act_CheckStationAC_cs = new Activity("CheckStationAC", { component: "cs", inputPorts: ["ack"] });
    act_CheckStationAC_cs.addAction(new Action("CompareStationsAN", [], "CompareStationsEX"));
    act_CheckStationAC_cs.addAction(new Action("StopMotorAN", [], "StopMotorEX"));
    act_CheckStationAC_cs.addAction(new Action("PassedMotorAN", [], "PassedMotorEX"));
    act_CheckStationAC_cs.addAction(new Action("SendCurrentLocationAN", [], "SendCurrentLocationEX"));
    this.registerActivity("CheckStationAC::cs", act_CheckStationAC_cs);
    const act_ControlArmAC_ca = new Activity("ControlArmAC", { component: "ca", inputPorts: ["cmd"] });
    act_ControlArmAC_ca.addAction(new Action("ControlArmAN", [], "ControlArmEX"));
    this.registerActivity("ControlArmAC::ca", act_ControlArmAC_ca);
    const act_NotifierArmAC_na = new Activity("NotifierArmAC", { component: "na", inputPorts: ["arrivedStatus"] });
    act_NotifierArmAC_na.addAction(new Action("NotifierArmAN", [], "NotifierArmEX"));
    this.registerActivity("NotifierArmAC::na", act_NotifierArmAC_na);
    const act_VehicleTimerAC_vt = new Activity("VehicleTimerAC", { component: "vt", inputPorts: ["destination"] });
    act_VehicleTimerAC_vt.addAction(new Action("VehicleTimerAN", [], "VehicleTimerEX"));
    this.registerActivity("VehicleTimerAC::vt", act_VehicleTimerAC_vt);
    // connector nS
    const conn_nS_1 = new Connector("nS");
    this.addConnector(conn_nS_1);
    // connector outNotifications.outNotifications__inNotifications.inNotifications
    const conn_outNotifications_outNotifications__inNotifications_inNotifications_2 = new Connector("outNotifications.outNotifications__inNotifications.inNotifications");
    try { let __p = __findPortComponent("outNotifications"); if(!__p) __p = __findPortComponentByNormalized("outNotifications"); if(__p) __attachEndpoint(conn_outNotifications_outNotifications__inNotifications_inNotifications_2, __p, "outNotifications"); } catch(e) {}
    try { let __p = __findPortComponent("inNotifications"); if(!__p) __p = __findPortComponentByNormalized("inNotifications"); if(__p) __attachEndpoint(conn_outNotifications_outNotifications__inNotifications_inNotifications_2, __p, "inNotifications"); } catch(e) {}
    this.addConnector(conn_outNotifications_outNotifications__inNotifications_inNotifications_2);
    // connector outNotifications.outNotifications__inNotifications.inNotifications
    const conn_outNotifications_outNotifications__inNotifications_inNotifications_3 = new Connector("outNotifications.outNotifications__inNotifications.inNotifications");
    try { let __p = __findPortComponent("outNotifications"); if(!__p) __p = __findPortComponentByNormalized("outNotifications"); if(__p) __attachEndpoint(conn_outNotifications_outNotifications__inNotifications_inNotifications_3, __p, "outNotifications"); } catch(e) {}
    try { let __p = __findPortComponent("inNotifications"); if(!__p) __p = __findPortComponentByNormalized("inNotifications"); if(__p) __attachEndpoint(conn_outNotifications_outNotifications__inNotifications_inNotifications_3, __p, "inNotifications"); } catch(e) {}
    this.addConnector(conn_outNotifications_outNotifications__inNotifications_inNotifications_3);
    // connector sVD
    const conn_sVD_4 = new Connector("sVD");
    this.addConnector(conn_sVD_4);
    // connector outMoveToStation.outMoveToStation__inMoveToStation.inMoveToStation
    const conn_outMoveToStation_outMoveToStation__inMoveToStation_inMoveToStation_5 = new Connector("outMoveToStation.outMoveToStation__inMoveToStation.inMoveToStation");
    try { let __p = __findPortComponent("outMoveToStation"); if(!__p) __p = __findPortComponentByNormalized("outMoveToStation"); if(__p) __attachEndpoint(conn_outMoveToStation_outMoveToStation__inMoveToStation_inMoveToStation_5, __p, "outMoveToStation"); } catch(e) {}
    try { let __p = __findPortComponent("inMoveToStation"); if(!__p) __p = __findPortComponentByNormalized("inMoveToStation"); if(__p) __attachEndpoint(conn_outMoveToStation_outMoveToStation__inMoveToStation_inMoveToStation_5, __p, "inMoveToStation"); } catch(e) {}
    this.addConnector(conn_outMoveToStation_outMoveToStation__inMoveToStation_inMoveToStation_5);
    // connector outMoveToStation.outMoveToStation__inMoveToStation.inMoveToStation
    const conn_outMoveToStation_outMoveToStation__inMoveToStation_inMoveToStation_6 = new Connector("outMoveToStation.outMoveToStation__inMoveToStation.inMoveToStation");
    try { let __p = __findPortComponent("outMoveToStation"); if(!__p) __p = __findPortComponentByNormalized("outMoveToStation"); if(__p) __attachEndpoint(conn_outMoveToStation_outMoveToStation__inMoveToStation_inMoveToStation_6, __p, "outMoveToStation"); } catch(e) {}
    try { let __p = __findPortComponent("inMoveToStation"); if(!__p) __p = __findPortComponentByNormalized("inMoveToStation"); if(__p) __attachEndpoint(conn_outMoveToStation_outMoveToStation__inMoveToStation_inMoveToStation_6, __p, "inMoveToStation"); } catch(e) {}
    this.addConnector(conn_outMoveToStation_outMoveToStation__inMoveToStation_inMoveToStation_6);
    // connector dataExchange
    const conn_dataExchange_7 = new Connector("dataExchange");
    this.addConnector(conn_dataExchange_7);
    // connector in_outDataS.in_outDataS__in_outDataAgv.in_outDataAgv
    const conn_in_outDataS_in_outDataS__in_outDataAgv_in_outDataAgv_8 = new Connector("in_outDataS.in_outDataS__in_outDataAgv.in_outDataAgv");
    try { let __p = __findPortComponent("in_outDataS"); if(!__p) __p = __findPortComponentByNormalized("in_outDataS"); if(__p) __attachEndpoint(conn_in_outDataS_in_outDataS__in_outDataAgv_in_outDataAgv_8, __p, "in_outDataS"); } catch(e) {}
    try { let __p = __findPortComponent("in_outDataAgv"); if(!__p) __p = __findPortComponentByNormalized("in_outDataAgv"); if(__p) __attachEndpoint(conn_in_outDataS_in_outDataS__in_outDataAgv_in_outDataAgv_8, __p, "in_outDataAgv"); } catch(e) {}
    this.addConnector(conn_in_outDataS_in_outDataS__in_outDataAgv_in_outDataAgv_8);
    // connector in_outDataS.in_outDataS__in_outDataAgv.in_outDataAgv
    const conn_in_outDataS_in_outDataS__in_outDataAgv_in_outDataAgv_9 = new Connector("in_outDataS.in_outDataS__in_outDataAgv.in_outDataAgv");
    try { let __p = __findPortComponent("in_outDataS"); if(!__p) __p = __findPortComponentByNormalized("in_outDataS"); if(__p) __attachEndpoint(conn_in_outDataS_in_outDataS__in_outDataAgv_in_outDataAgv_9, __p, "in_outDataS"); } catch(e) {}
    try { let __p = __findPortComponent("in_outDataAgv"); if(!__p) __p = __findPortComponentByNormalized("in_outDataAgv"); if(__p) __attachEndpoint(conn_in_outDataS_in_outDataS__in_outDataAgv_in_outDataAgv_9, __p, "in_outDataAgv"); } catch(e) {}
    this.addConnector(conn_in_outDataS_in_outDataS__in_outDataAgv_in_outDataAgv_9);
    // connector updateStatus
    const conn_updateStatus_10 = new Connector("updateStatus");
    this.addConnector(conn_updateStatus_10);
    // connector sendStatus.sendStatus__receiveStatus.receiveStatus
    const conn_sendStatus_sendStatus__receiveStatus_receiveStatus_11 = new Connector("sendStatus.sendStatus__receiveStatus.receiveStatus");
    try { let __p = __findPortComponent("sendStatus"); if(!__p) __p = __findPortComponentByNormalized("sendStatus"); if(__p) __attachEndpoint(conn_sendStatus_sendStatus__receiveStatus_receiveStatus_11, __p, "sendStatus"); } catch(e) {}
    try { let __p = __findPortComponent("receiveStatus"); if(!__p) __p = __findPortComponentByNormalized("receiveStatus"); if(__p) __attachEndpoint(conn_sendStatus_sendStatus__receiveStatus_receiveStatus_11, __p, "receiveStatus"); } catch(e) {}
    this.addConnector(conn_sendStatus_sendStatus__receiveStatus_receiveStatus_11);
    // connector sendStatus.sendStatus__receiveStatus.receiveStatus
    const conn_sendStatus_sendStatus__receiveStatus_receiveStatus_12 = new Connector("sendStatus.sendStatus__receiveStatus.receiveStatus");
    try { let __p = __findPortComponent("sendStatus"); if(!__p) __p = __findPortComponentByNormalized("sendStatus"); if(__p) __attachEndpoint(conn_sendStatus_sendStatus__receiveStatus_receiveStatus_12, __p, "sendStatus"); } catch(e) {}
    try { let __p = __findPortComponent("receiveStatus"); if(!__p) __p = __findPortComponentByNormalized("receiveStatus"); if(__p) __attachEndpoint(conn_sendStatus_sendStatus__receiveStatus_receiveStatus_12, __p, "receiveStatus"); } catch(e) {}
    this.addConnector(conn_sendStatus_sendStatus__receiveStatus_receiveStatus_12);
    // connector arrived
    const conn_arrived_13 = new Connector("arrived");
    this.addConnector(conn_arrived_13);
    // connector arrivalDetected_out.arrivalDetected_out__arrivalDetected_in.arrivalDetected_in
    const conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_14 = new Connector("arrivalDetected_out.arrivalDetected_out__arrivalDetected_in.arrivalDetected_in");
    try { let __p = __findPortComponent("arrivalDetected_out"); if(!__p) __p = __findPortComponentByNormalized("arrivalDetected_out"); if(__p) __attachEndpoint(conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_14, __p, "arrivalDetected_out"); } catch(e) {}
    try { let __p = __findPortComponent("arrivalDetected_in"); if(!__p) __p = __findPortComponentByNormalized("arrivalDetected_in"); if(__p) __attachEndpoint(conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_14, __p, "arrivalDetected_in"); } catch(e) {}
    this.addConnector(conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_14);
    // connector arrivalDetected_out.arrivalDetected_out__arrivalDetected_in.arrivalDetected_in
    const conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_15 = new Connector("arrivalDetected_out.arrivalDetected_out__arrivalDetected_in.arrivalDetected_in");
    try { let __p = __findPortComponent("arrivalDetected_out"); if(!__p) __p = __findPortComponentByNormalized("arrivalDetected_out"); if(__p) __attachEndpoint(conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_15, __p, "arrivalDetected_out"); } catch(e) {}
    try { let __p = __findPortComponent("arrivalDetected_in"); if(!__p) __p = __findPortComponentByNormalized("arrivalDetected_in"); if(__p) __attachEndpoint(conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_15, __p, "arrivalDetected_in"); } catch(e) {}
    this.addConnector(conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_15);
    // connector ackArm
    const conn_ackArm_16 = new Connector("ackArm");
    this.addConnector(conn_ackArm_16);
    // connector started.started__startedArm.startedArm
    const conn_started_started__startedArm_startedArm_17 = new Connector("started.started__startedArm.startedArm");
    try { let __p = __findPortComponent("started"); if(!__p) __p = __findPortComponentByNormalized("started"); if(__p) __attachEndpoint(conn_started_started__startedArm_startedArm_17, __p, "started"); } catch(e) {}
    try { let __p = __findPortComponent("startedArm"); if(!__p) __p = __findPortComponentByNormalized("startedArm"); if(__p) __attachEndpoint(conn_started_started__startedArm_startedArm_17, __p, "startedArm"); } catch(e) {}
    this.addConnector(conn_started_started__startedArm_startedArm_17);
    // connector started.started__startedArm.startedArm
    const conn_started_started__startedArm_startedArm_18 = new Connector("started.started__startedArm.startedArm");
    try { let __p = __findPortComponent("started"); if(!__p) __p = __findPortComponentByNormalized("started"); if(__p) __attachEndpoint(conn_started_started__startedArm_startedArm_18, __p, "started"); } catch(e) {}
    try { let __p = __findPortComponent("startedArm"); if(!__p) __p = __findPortComponentByNormalized("startedArm"); if(__p) __attachEndpoint(conn_started_started__startedArm_startedArm_18, __p, "startedArm"); } catch(e) {}
    this.addConnector(conn_started_started__startedArm_startedArm_18);
    // connector cmdArm
    const conn_cmdArm_19 = new Connector("cmdArm");
    this.addConnector(conn_cmdArm_19);
    // connector startArm.startArm__start.start
    const conn_startArm_startArm__start_start_20 = new Connector("startArm.startArm__start.start");
    try { let __p = __findPortComponent("startArm"); if(!__p) __p = __findPortComponentByNormalized("startArm"); if(__p) __attachEndpoint(conn_startArm_startArm__start_start_20, __p, "startArm"); } catch(e) {}
    try { let __p = __findPortComponent("start"); if(!__p) __p = __findPortComponentByNormalized("start"); if(__p) __attachEndpoint(conn_startArm_startArm__start_start_20, __p, "start"); } catch(e) {}
    this.addConnector(conn_startArm_startArm__start_start_20);
    // connector startArm.startArm__start.start
    const conn_startArm_startArm__start_start_21 = new Connector("startArm.startArm__start.start");
    try { let __p = __findPortComponent("startArm"); if(!__p) __p = __findPortComponentByNormalized("startArm"); if(__p) __attachEndpoint(conn_startArm_startArm__start_start_21, __p, "startArm"); } catch(e) {}
    try { let __p = __findPortComponent("start"); if(!__p) __p = __findPortComponentByNormalized("start"); if(__p) __attachEndpoint(conn_startArm_startArm__start_start_21, __p, "start"); } catch(e) {}
    this.addConnector(conn_startArm_startArm__start_start_21);
    // connector ackMotor
    const conn_ackMotor_22 = new Connector("ackMotor");
    this.addConnector(conn_ackMotor_22);
    // connector started_stopped_out.started_stopped_out__started_stopped_in.started_stopped_in
    const conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_23 = new Connector("started_stopped_out.started_stopped_out__started_stopped_in.started_stopped_in");
    try { let __p = __findPortComponent("started_stopped_out"); if(!__p) __p = __findPortComponentByNormalized("started_stopped_out"); if(__p) __attachEndpoint(conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_23, __p, "started_stopped_out"); } catch(e) {}
    try { let __p = __findPortComponent("started_stopped_in"); if(!__p) __p = __findPortComponentByNormalized("started_stopped_in"); if(__p) __attachEndpoint(conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_23, __p, "started_stopped_in"); } catch(e) {}
    this.addConnector(conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_23);
    // connector started_stopped_out.started_stopped_out__started_stopped_in.started_stopped_in
    const conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_24 = new Connector("started_stopped_out.started_stopped_out__started_stopped_in.started_stopped_in");
    try { let __p = __findPortComponent("started_stopped_out"); if(!__p) __p = __findPortComponentByNormalized("started_stopped_out"); if(__p) __attachEndpoint(conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_24, __p, "started_stopped_out"); } catch(e) {}
    try { let __p = __findPortComponent("started_stopped_in"); if(!__p) __p = __findPortComponentByNormalized("started_stopped_in"); if(__p) __attachEndpoint(conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_24, __p, "started_stopped_in"); } catch(e) {}
    this.addConnector(conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_24);
    // connector cmdMotor
    const conn_cmdMotor_25 = new Connector("cmdMotor");
    this.addConnector(conn_cmdMotor_25);
    // connector start_stop_out.start_stop_out__start_stop_in.start_stop_in
    const conn_start_stop_out_start_stop_out__start_stop_in_start_stop_in_26 = new Connector("start_stop_out.start_stop_out__start_stop_in.start_stop_in");
    try { let __p = __findPortComponent("start_stop_out"); if(!__p) __p = __findPortComponentByNormalized("start_stop_out"); if(__p) __attachEndpoint(conn_start_stop_out_start_stop_out__start_stop_in_start_stop_in_26, __p, "start_stop_out"); } catch(e) {}
    try { let __p = __findPortComponent("start_stop_in"); if(!__p) __p = __findPortComponentByNormalized("start_stop_in"); if(__p) __attachEndpoint(conn_start_stop_out_start_stop_out__start_stop_in_start_stop_in_26, __p, "start_stop_in"); } catch(e) {}
    this.addConnector(conn_start_stop_out_start_stop_out__start_stop_in_start_stop_in_26);
    // connector start_stop_out.start_stop_out__start_stop_in.start_stop_in
    const conn_start_stop_out_start_stop_out__start_stop_in_start_stop_in_27 = new Connector("start_stop_out.start_stop_out__start_stop_in.start_stop_in");
    try { let __p = __findPortComponent("start_stop_out"); if(!__p) __p = __findPortComponentByNormalized("start_stop_out"); if(__p) __attachEndpoint(conn_start_stop_out_start_stop_out__start_stop_in_start_stop_in_27, __p, "start_stop_out"); } catch(e) {}
    try { let __p = __findPortComponent("start_stop_in"); if(!__p) __p = __findPortComponentByNormalized("start_stop_in"); if(__p) __attachEndpoint(conn_start_stop_out_start_stop_out__start_stop_in_start_stop_in_27, __p, "start_stop_in"); } catch(e) {}
    this.addConnector(conn_start_stop_out_start_stop_out__start_stop_in_start_stop_in_27);
    // connector destinationStation2
    const conn_destinationStation2_28 = new Connector("destinationStation2");
    this.addConnector(conn_destinationStation2_28);
    // connector destination.destination__destination_vt.destination_vt
    const conn_destination_destination__destination_vt_destination_vt_29 = new Connector("destination.destination__destination_vt.destination_vt");
    try { let __p = __findPortComponent("destination"); if(!__p) __p = __findPortComponentByNormalized("destination"); if(__p) __attachEndpoint(conn_destination_destination__destination_vt_destination_vt_29, __p, "destination"); } catch(e) {}
    try { let __p = __findPortComponent("destination_vt"); if(!__p) __p = __findPortComponentByNormalized("destination_vt"); if(__p) __attachEndpoint(conn_destination_destination__destination_vt_destination_vt_29, __p, "destination_vt"); } catch(e) {}
    this.addConnector(conn_destination_destination__destination_vt_destination_vt_29);
    // connector destination.destination__destination_vt.destination_vt
    const conn_destination_destination__destination_vt_destination_vt_30 = new Connector("destination.destination__destination_vt.destination_vt");
    try { let __p = __findPortComponent("destination"); if(!__p) __p = __findPortComponentByNormalized("destination"); if(__p) __attachEndpoint(conn_destination_destination__destination_vt_destination_vt_30, __p, "destination"); } catch(e) {}
    try { let __p = __findPortComponent("destination_vt"); if(!__p) __p = __findPortComponentByNormalized("destination_vt"); if(__p) __attachEndpoint(conn_destination_destination__destination_vt_destination_vt_30, __p, "destination_vt"); } catch(e) {}
    this.addConnector(conn_destination_destination__destination_vt_destination_vt_30);
    // connector destinationStation
    const conn_destinationStation_31 = new Connector("destinationStation");
    this.addConnector(conn_destinationStation_31);
    // connector destination.destination__destination_cs.destination_cs
    const conn_destination_destination__destination_cs_destination_cs_32 = new Connector("destination.destination__destination_cs.destination_cs");
    try { let __p = __findPortComponent("destination"); if(!__p) __p = __findPortComponentByNormalized("destination"); if(__p) __attachEndpoint(conn_destination_destination__destination_cs_destination_cs_32, __p, "destination"); } catch(e) {}
    try { let __p = __findPortComponent("destination_cs"); if(!__p) __p = __findPortComponentByNormalized("destination_cs"); if(__p) __attachEndpoint(conn_destination_destination__destination_cs_destination_cs_32, __p, "destination_cs"); } catch(e) {}
    this.addConnector(conn_destination_destination__destination_cs_destination_cs_32);
    // connector destination.destination__destination_cs.destination_cs
    const conn_destination_destination__destination_cs_destination_cs_33 = new Connector("destination.destination__destination_cs.destination_cs");
    try { let __p = __findPortComponent("destination"); if(!__p) __p = __findPortComponentByNormalized("destination"); if(__p) __attachEndpoint(conn_destination_destination__destination_cs_destination_cs_33, __p, "destination"); } catch(e) {}
    try { let __p = __findPortComponent("destination_cs"); if(!__p) __p = __findPortComponentByNormalized("destination_cs"); if(__p) __attachEndpoint(conn_destination_destination__destination_cs_destination_cs_33, __p, "destination_cs"); } catch(e) {}
    this.addConnector(conn_destination_destination__destination_cs_destination_cs_33);
    // connector command
    const conn_command_34 = new Connector("command");
    this.addConnector(conn_command_34);
    // connector cmd_sm.cmd_sm__cmd.cmd
    const conn_cmd_sm_cmd_sm__cmd_cmd_35 = new Connector("cmd_sm.cmd_sm__cmd.cmd");
    try { let __p = __findPortComponent("cmd_sm"); if(!__p) __p = __findPortComponentByNormalized("cmd_sm"); if(__p) __attachEndpoint(conn_cmd_sm_cmd_sm__cmd_cmd_35, __p, "cmd_sm"); } catch(e) {}
    try { let __p = __findPortComponent("cmd"); if(!__p) __p = __findPortComponentByNormalized("cmd"); if(__p) __attachEndpoint(conn_cmd_sm_cmd_sm__cmd_cmd_35, __p, "cmd"); } catch(e) {}
    this.addConnector(conn_cmd_sm_cmd_sm__cmd_cmd_35);
    // connector cmd_sm.cmd_sm__cmd.cmd
    const conn_cmd_sm_cmd_sm__cmd_cmd_36 = new Connector("cmd_sm.cmd_sm__cmd.cmd");
    try { let __p = __findPortComponent("cmd_sm"); if(!__p) __p = __findPortComponentByNormalized("cmd_sm"); if(__p) __attachEndpoint(conn_cmd_sm_cmd_sm__cmd_cmd_36, __p, "cmd_sm"); } catch(e) {}
    try { let __p = __findPortComponent("cmd"); if(!__p) __p = __findPortComponentByNormalized("cmd"); if(__p) __attachEndpoint(conn_cmd_sm_cmd_sm__cmd_cmd_36, __p, "cmd"); } catch(e) {}
    this.addConnector(conn_cmd_sm_cmd_sm__cmd_cmd_36);
    // connector command2
    const conn_command2_37 = new Connector("command2");
    this.addConnector(conn_command2_37);
    // connector cmd_sm.cmd_sm__cmd_ca.cmd_ca
    const conn_cmd_sm_cmd_sm__cmd_ca_cmd_ca_38 = new Connector("cmd_sm.cmd_sm__cmd_ca.cmd_ca");
    try { let __p = __findPortComponent("cmd_sm"); if(!__p) __p = __findPortComponentByNormalized("cmd_sm"); if(__p) __attachEndpoint(conn_cmd_sm_cmd_sm__cmd_ca_cmd_ca_38, __p, "cmd_sm"); } catch(e) {}
    try { let __p = __findPortComponent("cmd_ca"); if(!__p) __p = __findPortComponentByNormalized("cmd_ca"); if(__p) __attachEndpoint(conn_cmd_sm_cmd_sm__cmd_ca_cmd_ca_38, __p, "cmd_ca"); } catch(e) {}
    this.addConnector(conn_cmd_sm_cmd_sm__cmd_ca_cmd_ca_38);
    // connector cmd_sm.cmd_sm__cmd_ca.cmd_ca
    const conn_cmd_sm_cmd_sm__cmd_ca_cmd_ca_39 = new Connector("cmd_sm.cmd_sm__cmd_ca.cmd_ca");
    try { let __p = __findPortComponent("cmd_sm"); if(!__p) __p = __findPortComponentByNormalized("cmd_sm"); if(__p) __attachEndpoint(conn_cmd_sm_cmd_sm__cmd_ca_cmd_ca_39, __p, "cmd_sm"); } catch(e) {}
    try { let __p = __findPortComponent("cmd_ca"); if(!__p) __p = __findPortComponentByNormalized("cmd_ca"); if(__p) __attachEndpoint(conn_cmd_sm_cmd_sm__cmd_ca_cmd_ca_39, __p, "cmd_ca"); } catch(e) {}
    this.addConnector(conn_cmd_sm_cmd_sm__cmd_ca_cmd_ca_39);
    // connector currentLocation
    const conn_currentLocation_40 = new Connector("currentLocation");
    this.addConnector(conn_currentLocation_40);
    // connector location_cs.location_cs__location_vt.location_vt
    const conn_location_cs_location_cs__location_vt_location_vt_41 = new Connector("location_cs.location_cs__location_vt.location_vt");
    try { let __p = __findPortComponent("location_cs"); if(!__p) __p = __findPortComponentByNormalized("location_cs"); if(__p) __attachEndpoint(conn_location_cs_location_cs__location_vt_location_vt_41, __p, "location_cs"); } catch(e) {}
    try { let __p = __findPortComponent("location_vt"); if(!__p) __p = __findPortComponentByNormalized("location_vt"); if(__p) __attachEndpoint(conn_location_cs_location_cs__location_vt_location_vt_41, __p, "location_vt"); } catch(e) {}
    this.addConnector(conn_location_cs_location_cs__location_vt_location_vt_41);
    // connector location_cs.location_cs__location_vt.location_vt
    const conn_location_cs_location_cs__location_vt_location_vt_42 = new Connector("location_cs.location_cs__location_vt.location_vt");
    try { let __p = __findPortComponent("location_cs"); if(!__p) __p = __findPortComponentByNormalized("location_cs"); if(__p) __attachEndpoint(conn_location_cs_location_cs__location_vt_location_vt_42, __p, "location_cs"); } catch(e) {}
    try { let __p = __findPortComponent("location_vt"); if(!__p) __p = __findPortComponentByNormalized("location_vt"); if(__p) __attachEndpoint(conn_location_cs_location_cs__location_vt_location_vt_42, __p, "location_vt"); } catch(e) {}
    this.addConnector(conn_location_cs_location_cs__location_vt_location_vt_42);
    // connector sendNotificationMotor
    const conn_sendNotificationMotor_43 = new Connector("sendNotificationMotor");
    this.addConnector(conn_sendNotificationMotor_43);
    // connector outAck.outAck__ack_ca.ack_ca
    const conn_outAck_outAck__ack_ca_ack_ca_44 = new Connector("outAck.outAck__ack_ca.ack_ca");
    try { let __p = __findPortComponent("outAck"); if(!__p) __p = __findPortComponentByNormalized("outAck"); if(__p) __attachEndpoint(conn_outAck_outAck__ack_ca_ack_ca_44, __p, "outAck"); } catch(e) {}
    try { let __p = __findPortComponent("ack_ca"); if(!__p) __p = __findPortComponentByNormalized("ack_ca"); if(__p) __attachEndpoint(conn_outAck_outAck__ack_ca_ack_ca_44, __p, "ack_ca"); } catch(e) {}
    this.addConnector(conn_outAck_outAck__ack_ca_ack_ca_44);
    // connector outAck.outAck__ack_ca.ack_ca
    const conn_outAck_outAck__ack_ca_ack_ca_45 = new Connector("outAck.outAck__ack_ca.ack_ca");
    try { let __p = __findPortComponent("outAck"); if(!__p) __p = __findPortComponentByNormalized("outAck"); if(__p) __attachEndpoint(conn_outAck_outAck__ack_ca_ack_ca_45, __p, "outAck"); } catch(e) {}
    try { let __p = __findPortComponent("ack_ca"); if(!__p) __p = __findPortComponentByNormalized("ack_ca"); if(__p) __attachEndpoint(conn_outAck_outAck__ack_ca_ack_ca_45, __p, "ack_ca"); } catch(e) {}
    this.addConnector(conn_outAck_outAck__ack_ca_ack_ca_45);
    // connector sendNotificationMotor2
    const conn_sendNotificationMotor2_46 = new Connector("sendNotificationMotor2");
    this.addConnector(conn_sendNotificationMotor2_46);
    // connector outAck.outAck__ack_cs.ack_cs
    const conn_outAck_outAck__ack_cs_ack_cs_47 = new Connector("outAck.outAck__ack_cs.ack_cs");
    try { let __p = __findPortComponent("outAck"); if(!__p) __p = __findPortComponentByNormalized("outAck"); if(__p) __attachEndpoint(conn_outAck_outAck__ack_cs_ack_cs_47, __p, "outAck"); } catch(e) {}
    try { let __p = __findPortComponent("ack_cs"); if(!__p) __p = __findPortComponentByNormalized("ack_cs"); if(__p) __attachEndpoint(conn_outAck_outAck__ack_cs_ack_cs_47, __p, "ack_cs"); } catch(e) {}
    this.addConnector(conn_outAck_outAck__ack_cs_ack_cs_47);
    // connector outAck.outAck__ack_cs.ack_cs
    const conn_outAck_outAck__ack_cs_ack_cs_48 = new Connector("outAck.outAck__ack_cs.ack_cs");
    try { let __p = __findPortComponent("outAck"); if(!__p) __p = __findPortComponentByNormalized("outAck"); if(__p) __attachEndpoint(conn_outAck_outAck__ack_cs_ack_cs_48, __p, "outAck"); } catch(e) {}
    try { let __p = __findPortComponent("ack_cs"); if(!__p) __p = __findPortComponentByNormalized("ack_cs"); if(__p) __attachEndpoint(conn_outAck_outAck__ack_cs_ack_cs_48, __p, "ack_cs"); } catch(e) {}
    this.addConnector(conn_outAck_outAck__ack_cs_ack_cs_48);
  }
}

function createModel(){ return new SysADLArchitecture(); }
module.exports = { createModel, SysADLArchitecture };
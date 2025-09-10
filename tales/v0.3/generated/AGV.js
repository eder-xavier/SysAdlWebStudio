const { Model, Component, Port, CompositePort, Connector, Activity, Action, createExecutableFromExpression } = require('../SysADLBase');
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
    // helper to attach connector endpoint: expects a concrete component object or expression (no runtime lookup)
    const __attachEndpoint = (conn, compObj, portName) => { try { if (!compObj || !portName) return; if (compObj && compObj.ports && compObj.ports[portName]) conn.addEndpoint(this, compObj.ports[portName]); } catch(e){} };
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
    __addExec("SysADLArchitecture.cndc", "executable CompareStationsEX to CompareStationsAN", []);
    __addExec("SysADLArchitecture.bo3b", "executable ControlArmEX to ControlArmAN", []);
    __addExec("SysADLArchitecture.etqa", "executable NotifierArmEX to NotifierArmAN", []);
    __addExec("SysADLArchitecture.jpxf", "executable NotifyAGVFromMotorEX to NotifyAGVFromMotorAN", []);
    __addExec("SysADLArchitecture.kgp1", "executable NotifySupervisoryFromMotorEX to NotifySupervisoryFromMotorAN", []);
    __addExec("SysADLArchitecture.a3d8", "executable PassedMotorEX to PassedMotorAN", []);
    __addExec("SysADLArchitecture.4ny8", "executable SendCommandEX to SendCommandAN", []);
    __addExec("SysADLArchitecture.rmlh", "executable SendCurrentLocationEX to SendCurrentLocationAN", []);
    __addExec("SysADLArchitecture.9v9i", "executable SendDestinationEX to SendDestinationAN", []);
    __addExec("SysADLArchitecture.jf5j", "executable SendStartMotorEX to SendStartMotorAN", []);
    __addExec("SysADLArchitecture.xffe", "executable StopMotorEX to StopMotorAN", []);
    __addExec("SysADLArchitecture.igsm", "executable VehicleTimerEX to VehicleTimerAN", []);
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
    // connector dataExchange
    const conn_dataExchange_1 = new Connector("dataExchange");
    __attachEndpoint(conn_dataExchange_1, this.FactoryAutomationSystem.ss, "in_outData");
    __attachEndpoint(conn_dataExchange_1, this.FactoryAutomationSystem.ss, "in_outData");
    this.addConnector(conn_dataExchange_1);
    // connector ss.in_outData__x.x_ss.in_outData__x.x
    const conn_ss_in_outData__x_x_ss_in_outData__x_x_2 = new Connector("ss.in_outData__x.x_ss.in_outData__x.x");
    __attachEndpoint(conn_ss_in_outData__x_x_ss_in_outData__x_x_2, this.FactoryAutomationSystem.ss, "in_outData");
    __attachEndpoint(conn_ss_in_outData__x_x_ss_in_outData__x_x_2, this.FactoryAutomationSystem.ss, "in_outData");
    __attachEndpoint(conn_ss_in_outData__x_x_ss_in_outData__x_x_2, this.FactoryAutomationSystem.ss, "in_outData");
    this.addConnector(conn_ss_in_outData__x_x_ss_in_outData__x_x_2);
    // connector ss.in_outData__x.x_ss.in_outData__x.x
    const conn_ss_in_outData__x_x_ss_in_outData__x_x_3 = new Connector("ss.in_outData__x.x_ss.in_outData__x.x");
    __attachEndpoint(conn_ss_in_outData__x_x_ss_in_outData__x_x_3, this.FactoryAutomationSystem.ss, "in_outData");
    __attachEndpoint(conn_ss_in_outData__x_x_ss_in_outData__x_x_3, this.FactoryAutomationSystem.ss, "in_outData");
    __attachEndpoint(conn_ss_in_outData__x_x_ss_in_outData__x_x_3, this.FactoryAutomationSystem.ss, "in_outData");
    this.addConnector(conn_ss_in_outData__x_x_ss_in_outData__x_x_3);
    // connector updateStatus
    const conn_updateStatus_4 = new Connector("updateStatus");
    __attachEndpoint(conn_updateStatus_4, this.FactoryAutomationSystem.ds, "receiveStatus");
    __attachEndpoint(conn_updateStatus_4, this.FactoryAutomationSystem.ds, "receiveStatus");
    this.addConnector(conn_updateStatus_4);
    // connector x.x__ds.receiveStatus_x.x__ds.receiveStatus
    const conn_x_x__ds_receiveStatus_x_x__ds_receiveStatus_5 = new Connector("x.x__ds.receiveStatus_x.x__ds.receiveStatus");
    __attachEndpoint(conn_x_x__ds_receiveStatus_x_x__ds_receiveStatus_5, this.FactoryAutomationSystem.ds, "receiveStatus");
    __attachEndpoint(conn_x_x__ds_receiveStatus_x_x__ds_receiveStatus_5, this.FactoryAutomationSystem.ds, "receiveStatus");
    __attachEndpoint(conn_x_x__ds_receiveStatus_x_x__ds_receiveStatus_5, this.FactoryAutomationSystem.ds, "receiveStatus");
    this.addConnector(conn_x_x__ds_receiveStatus_x_x__ds_receiveStatus_5);
    // connector x.x__ds.receiveStatus_x.x__ds.receiveStatus
    const conn_x_x__ds_receiveStatus_x_x__ds_receiveStatus_6 = new Connector("x.x__ds.receiveStatus_x.x__ds.receiveStatus");
    __attachEndpoint(conn_x_x__ds_receiveStatus_x_x__ds_receiveStatus_6, this.FactoryAutomationSystem.ds, "receiveStatus");
    __attachEndpoint(conn_x_x__ds_receiveStatus_x_x__ds_receiveStatus_6, this.FactoryAutomationSystem.ds, "receiveStatus");
    __attachEndpoint(conn_x_x__ds_receiveStatus_x_x__ds_receiveStatus_6, this.FactoryAutomationSystem.ds, "receiveStatus");
    this.addConnector(conn_x_x__ds_receiveStatus_x_x__ds_receiveStatus_6);
    // connector arrived
    const conn_arrived_7 = new Connector("arrived");
    __attachEndpoint(conn_arrived_7, this.FactoryAutomationSystem.agvs, "arrivalDetected_out");
    __attachEndpoint(conn_arrived_7, this.FactoryAutomationSystem.agvs, "arrivalDetected_in");
    this.addConnector(conn_arrived_7);
    // connector arrivalDetected_out.arrivalDetected_out__arrivalDetected_in.arrivalDetected_in_arrivalDetected_out.arrivalDetected_out__arrivalDetected_in.arrivalDetected_in
    const conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_8 = new Connector("arrivalDetected_out.arrivalDetected_out__arrivalDetected_in.arrivalDetected_in_arrivalDetected_out.arrivalDetected_out__arrivalDetected_in.arrivalDetected_in");
    __attachEndpoint(conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_8, this.FactoryAutomationSystem.agvs, "arrivalDetected_out");
    __attachEndpoint(conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_8, this.FactoryAutomationSystem.agvs, "arrivalDetected_in");
    __attachEndpoint(conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_8, this.FactoryAutomationSystem.agvs, "arrivalDetected_out");
    __attachEndpoint(conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_8, this.FactoryAutomationSystem.agvs, "arrivalDetected_in");
    this.addConnector(conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_8);
    // connector arrivalDetected_out.arrivalDetected_out__arrivalDetected_in.arrivalDetected_in_arrivalDetected_out.arrivalDetected_out__arrivalDetected_in.arrivalDetected_in
    const conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_9 = new Connector("arrivalDetected_out.arrivalDetected_out__arrivalDetected_in.arrivalDetected_in_arrivalDetected_out.arrivalDetected_out__arrivalDetected_in.arrivalDetected_in");
    __attachEndpoint(conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_9, this.FactoryAutomationSystem.agvs, "arrivalDetected_out");
    __attachEndpoint(conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_9, this.FactoryAutomationSystem.agvs, "arrivalDetected_in");
    __attachEndpoint(conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_9, this.FactoryAutomationSystem.agvs, "arrivalDetected_out");
    __attachEndpoint(conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_9, this.FactoryAutomationSystem.agvs, "arrivalDetected_in");
    this.addConnector(conn_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_arrivalDetected_out_arrivalDetected_out__arrivalDetected_in_arrivalDetected_in_9);
    // connector ackArm
    const conn_ackArm_10 = new Connector("ackArm");
    __attachEndpoint(conn_ackArm_10, this.FactoryAutomationSystem.agvs.ra, "started");
    __attachEndpoint(conn_ackArm_10, this.FactoryAutomationSystem.agvs.vc, "startedArm");
    this.addConnector(conn_ackArm_10);
    // connector started.started__startedArm.startedArm_started.started__startedArm.startedArm
    const conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_11 = new Connector("started.started__startedArm.startedArm_started.started__startedArm.startedArm");
    __attachEndpoint(conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_11, this.FactoryAutomationSystem.agvs.ra, "started");
    __attachEndpoint(conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_11, this.FactoryAutomationSystem.agvs.vc, "startedArm");
    __attachEndpoint(conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_11, this.FactoryAutomationSystem.agvs.ra, "started");
    __attachEndpoint(conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_11, this.FactoryAutomationSystem.agvs.vc, "startedArm");
    this.addConnector(conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_11);
    // connector started.started__startedArm.startedArm_started.started__startedArm.startedArm
    const conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_12 = new Connector("started.started__startedArm.startedArm_started.started__startedArm.startedArm");
    __attachEndpoint(conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_12, this.FactoryAutomationSystem.agvs.ra, "started");
    __attachEndpoint(conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_12, this.FactoryAutomationSystem.agvs.vc, "startedArm");
    __attachEndpoint(conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_12, this.FactoryAutomationSystem.agvs.ra, "started");
    __attachEndpoint(conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_12, this.FactoryAutomationSystem.agvs.vc, "startedArm");
    this.addConnector(conn_started_started__startedArm_startedArm_started_started__startedArm_startedArm_12);
    // connector cmdArm
    const conn_cmdArm_13 = new Connector("cmdArm");
    __attachEndpoint(conn_cmdArm_13, this.FactoryAutomationSystem.agvs.ra, "start");
    __attachEndpoint(conn_cmdArm_13, this.FactoryAutomationSystem.agvs.ra, "start");
    this.addConnector(conn_cmdArm_13);
    // connector x.x__ra.start_x.x__ra.start
    const conn_x_x__ra_start_x_x__ra_start_14 = new Connector("x.x__ra.start_x.x__ra.start");
    __attachEndpoint(conn_x_x__ra_start_x_x__ra_start_14, this.FactoryAutomationSystem.agvs.ra, "start");
    __attachEndpoint(conn_x_x__ra_start_x_x__ra_start_14, this.FactoryAutomationSystem.agvs.ra, "start");
    __attachEndpoint(conn_x_x__ra_start_x_x__ra_start_14, this.FactoryAutomationSystem.agvs.ra, "start");
    this.addConnector(conn_x_x__ra_start_x_x__ra_start_14);
    // connector x.x__ra.start_x.x__ra.start
    const conn_x_x__ra_start_x_x__ra_start_15 = new Connector("x.x__ra.start_x.x__ra.start");
    __attachEndpoint(conn_x_x__ra_start_x_x__ra_start_15, this.FactoryAutomationSystem.agvs.ra, "start");
    __attachEndpoint(conn_x_x__ra_start_x_x__ra_start_15, this.FactoryAutomationSystem.agvs.ra, "start");
    __attachEndpoint(conn_x_x__ra_start_x_x__ra_start_15, this.FactoryAutomationSystem.agvs.ra, "start");
    this.addConnector(conn_x_x__ra_start_x_x__ra_start_15);
    // connector ackMotor
    const conn_ackMotor_16 = new Connector("ackMotor");
    __attachEndpoint(conn_ackMotor_16, this.FactoryAutomationSystem.agvs, "started_stopped_out");
    __attachEndpoint(conn_ackMotor_16, this.FactoryAutomationSystem.agvs, "started_stopped_in");
    this.addConnector(conn_ackMotor_16);
    // connector started_stopped_out.started_stopped_out__started_stopped_in.started_stopped_in_started_stopped_out.started_stopped_out__started_stopped_in.started_stopped_in
    const conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_17 = new Connector("started_stopped_out.started_stopped_out__started_stopped_in.started_stopped_in_started_stopped_out.started_stopped_out__started_stopped_in.started_stopped_in");
    __attachEndpoint(conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_17, this.FactoryAutomationSystem.agvs, "started_stopped_out");
    __attachEndpoint(conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_17, this.FactoryAutomationSystem.agvs, "started_stopped_in");
    __attachEndpoint(conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_17, this.FactoryAutomationSystem.agvs, "started_stopped_out");
    __attachEndpoint(conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_17, this.FactoryAutomationSystem.agvs, "started_stopped_in");
    this.addConnector(conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_17);
    // connector started_stopped_out.started_stopped_out__started_stopped_in.started_stopped_in_started_stopped_out.started_stopped_out__started_stopped_in.started_stopped_in
    const conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_18 = new Connector("started_stopped_out.started_stopped_out__started_stopped_in.started_stopped_in_started_stopped_out.started_stopped_out__started_stopped_in.started_stopped_in");
    __attachEndpoint(conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_18, this.FactoryAutomationSystem.agvs, "started_stopped_out");
    __attachEndpoint(conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_18, this.FactoryAutomationSystem.agvs, "started_stopped_in");
    __attachEndpoint(conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_18, this.FactoryAutomationSystem.agvs, "started_stopped_out");
    __attachEndpoint(conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_18, this.FactoryAutomationSystem.agvs, "started_stopped_in");
    this.addConnector(conn_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_started_stopped_out_started_stopped_out__started_stopped_in_started_stopped_in_18);
    // connector cmdMotor
    const conn_cmdMotor_19 = new Connector("cmdMotor");
    __attachEndpoint(conn_cmdMotor_19, this.FactoryAutomationSystem.agvs.m, "start_stop_in");
    __attachEndpoint(conn_cmdMotor_19, this.FactoryAutomationSystem.agvs.m, "start_stop_in");
    this.addConnector(conn_cmdMotor_19);
    // connector x.x__m.start_stop_in_x.x__m.start_stop_in
    const conn_x_x__m_start_stop_in_x_x__m_start_stop_in_20 = new Connector("x.x__m.start_stop_in_x.x__m.start_stop_in");
    __attachEndpoint(conn_x_x__m_start_stop_in_x_x__m_start_stop_in_20, this.FactoryAutomationSystem.agvs.m, "start_stop_in");
    __attachEndpoint(conn_x_x__m_start_stop_in_x_x__m_start_stop_in_20, this.FactoryAutomationSystem.agvs.m, "start_stop_in");
    __attachEndpoint(conn_x_x__m_start_stop_in_x_x__m_start_stop_in_20, this.FactoryAutomationSystem.agvs.m, "start_stop_in");
    this.addConnector(conn_x_x__m_start_stop_in_x_x__m_start_stop_in_20);
    // connector x.x__m.start_stop_in_x.x__m.start_stop_in
    const conn_x_x__m_start_stop_in_x_x__m_start_stop_in_21 = new Connector("x.x__m.start_stop_in_x.x__m.start_stop_in");
    __attachEndpoint(conn_x_x__m_start_stop_in_x_x__m_start_stop_in_21, this.FactoryAutomationSystem.agvs.m, "start_stop_in");
    __attachEndpoint(conn_x_x__m_start_stop_in_x_x__m_start_stop_in_21, this.FactoryAutomationSystem.agvs.m, "start_stop_in");
    __attachEndpoint(conn_x_x__m_start_stop_in_x_x__m_start_stop_in_21, this.FactoryAutomationSystem.agvs.m, "start_stop_in");
    this.addConnector(conn_x_x__m_start_stop_in_x_x__m_start_stop_in_21);
    // connector destinationStation2
    const conn_destinationStation2_22 = new Connector("destinationStation2");
    __attachEndpoint(conn_destinationStation2_22, this.FactoryAutomationSystem.agvs.vc.cs, "destination");
    __attachEndpoint(conn_destinationStation2_22, this.FactoryAutomationSystem.agvs.vc, "destination_vt");
    this.addConnector(conn_destinationStation2_22);
    // connector destination.destination__destination_vt.destination_vt_destination.destination__destination_vt.destination_vt
    const conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_23 = new Connector("destination.destination__destination_vt.destination_vt_destination.destination__destination_vt.destination_vt");
    __attachEndpoint(conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_23, this.FactoryAutomationSystem.agvs.vc.cs, "destination");
    __attachEndpoint(conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_23, this.FactoryAutomationSystem.agvs.vc, "destination_vt");
    __attachEndpoint(conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_23, this.FactoryAutomationSystem.agvs.vc.cs, "destination");
    __attachEndpoint(conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_23, this.FactoryAutomationSystem.agvs.vc, "destination_vt");
    this.addConnector(conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_23);
    // connector destination.destination__destination_vt.destination_vt_destination.destination__destination_vt.destination_vt
    const conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_24 = new Connector("destination.destination__destination_vt.destination_vt_destination.destination__destination_vt.destination_vt");
    __attachEndpoint(conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_24, this.FactoryAutomationSystem.agvs.vc.cs, "destination");
    __attachEndpoint(conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_24, this.FactoryAutomationSystem.agvs.vc, "destination_vt");
    __attachEndpoint(conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_24, this.FactoryAutomationSystem.agvs.vc.cs, "destination");
    __attachEndpoint(conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_24, this.FactoryAutomationSystem.agvs.vc, "destination_vt");
    this.addConnector(conn_destination_destination__destination_vt_destination_vt_destination_destination__destination_vt_destination_vt_24);
    // connector destinationStation
    const conn_destinationStation_25 = new Connector("destinationStation");
    __attachEndpoint(conn_destinationStation_25, this.FactoryAutomationSystem.agvs.vc.cs, "destination");
    __attachEndpoint(conn_destinationStation_25, this.FactoryAutomationSystem.agvs.vc, "destination_cs");
    this.addConnector(conn_destinationStation_25);
    // connector destination.destination__destination_cs.destination_cs_destination.destination__destination_cs.destination_cs
    const conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_26 = new Connector("destination.destination__destination_cs.destination_cs_destination.destination__destination_cs.destination_cs");
    __attachEndpoint(conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_26, this.FactoryAutomationSystem.agvs.vc.cs, "destination");
    __attachEndpoint(conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_26, this.FactoryAutomationSystem.agvs.vc, "destination_cs");
    __attachEndpoint(conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_26, this.FactoryAutomationSystem.agvs.vc.cs, "destination");
    __attachEndpoint(conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_26, this.FactoryAutomationSystem.agvs.vc, "destination_cs");
    this.addConnector(conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_26);
    // connector destination.destination__destination_cs.destination_cs_destination.destination__destination_cs.destination_cs
    const conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_27 = new Connector("destination.destination__destination_cs.destination_cs_destination.destination__destination_cs.destination_cs");
    __attachEndpoint(conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_27, this.FactoryAutomationSystem.agvs.vc.cs, "destination");
    __attachEndpoint(conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_27, this.FactoryAutomationSystem.agvs.vc, "destination_cs");
    __attachEndpoint(conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_27, this.FactoryAutomationSystem.agvs.vc.cs, "destination");
    __attachEndpoint(conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_27, this.FactoryAutomationSystem.agvs.vc, "destination_cs");
    this.addConnector(conn_destination_destination__destination_cs_destination_cs_destination_destination__destination_cs_destination_cs_27);
    // connector command
    const conn_command_28 = new Connector("command");
    __attachEndpoint(conn_command_28, this.FactoryAutomationSystem.agvs.vc, "cmd_sm");
    __attachEndpoint(conn_command_28, this.FactoryAutomationSystem.agvs.vc.ca, "cmd");
    this.addConnector(conn_command_28);
    // connector cmd_sm.cmd_sm__cmd.cmd_cmd_sm.cmd_sm__cmd.cmd
    const conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_29 = new Connector("cmd_sm.cmd_sm__cmd.cmd_cmd_sm.cmd_sm__cmd.cmd");
    __attachEndpoint(conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_29, this.FactoryAutomationSystem.agvs.vc, "cmd_sm");
    __attachEndpoint(conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_29, this.FactoryAutomationSystem.agvs.vc.ca, "cmd");
    __attachEndpoint(conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_29, this.FactoryAutomationSystem.agvs.vc, "cmd_sm");
    __attachEndpoint(conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_29, this.FactoryAutomationSystem.agvs.vc.ca, "cmd");
    this.addConnector(conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_29);
    // connector cmd_sm.cmd_sm__cmd.cmd_cmd_sm.cmd_sm__cmd.cmd
    const conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_30 = new Connector("cmd_sm.cmd_sm__cmd.cmd_cmd_sm.cmd_sm__cmd.cmd");
    __attachEndpoint(conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_30, this.FactoryAutomationSystem.agvs.vc, "cmd_sm");
    __attachEndpoint(conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_30, this.FactoryAutomationSystem.agvs.vc.ca, "cmd");
    __attachEndpoint(conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_30, this.FactoryAutomationSystem.agvs.vc, "cmd_sm");
    __attachEndpoint(conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_30, this.FactoryAutomationSystem.agvs.vc.ca, "cmd");
    this.addConnector(conn_cmd_sm_cmd_sm__cmd_cmd_cmd_sm_cmd_sm__cmd_cmd_30);
    // connector command2
    const conn_command2_31 = new Connector("command2");
    __attachEndpoint(conn_command2_31, this.FactoryAutomationSystem.agvs.vc.ca, "cmd_ca");
    __attachEndpoint(conn_command2_31, this.FactoryAutomationSystem.agvs.vc.ca, "cmd_ca");
    this.addConnector(conn_command2_31);
    // connector x.x__ca.cmd_ca_x.x__ca.cmd_ca
    const conn_x_x__ca_cmd_ca_x_x__ca_cmd_ca_32 = new Connector("x.x__ca.cmd_ca_x.x__ca.cmd_ca");
    __attachEndpoint(conn_x_x__ca_cmd_ca_x_x__ca_cmd_ca_32, this.FactoryAutomationSystem.agvs.vc.ca, "cmd_ca");
    __attachEndpoint(conn_x_x__ca_cmd_ca_x_x__ca_cmd_ca_32, this.FactoryAutomationSystem.agvs.vc.ca, "cmd_ca");
    __attachEndpoint(conn_x_x__ca_cmd_ca_x_x__ca_cmd_ca_32, this.FactoryAutomationSystem.agvs.vc.ca, "cmd_ca");
    this.addConnector(conn_x_x__ca_cmd_ca_x_x__ca_cmd_ca_32);
    // connector x.x__ca.cmd_ca_x.x__ca.cmd_ca
    const conn_x_x__ca_cmd_ca_x_x__ca_cmd_ca_33 = new Connector("x.x__ca.cmd_ca_x.x__ca.cmd_ca");
    __attachEndpoint(conn_x_x__ca_cmd_ca_x_x__ca_cmd_ca_33, this.FactoryAutomationSystem.agvs.vc.ca, "cmd_ca");
    __attachEndpoint(conn_x_x__ca_cmd_ca_x_x__ca_cmd_ca_33, this.FactoryAutomationSystem.agvs.vc.ca, "cmd_ca");
    __attachEndpoint(conn_x_x__ca_cmd_ca_x_x__ca_cmd_ca_33, this.FactoryAutomationSystem.agvs.vc.ca, "cmd_ca");
    this.addConnector(conn_x_x__ca_cmd_ca_x_x__ca_cmd_ca_33);
    // connector currentLocation
    const conn_currentLocation_34 = new Connector("currentLocation");
    __attachEndpoint(conn_currentLocation_34, this.FactoryAutomationSystem.agvs.vc, "location_cs");
    __attachEndpoint(conn_currentLocation_34, this.FactoryAutomationSystem.agvs.vc, "location_vt");
    this.addConnector(conn_currentLocation_34);
    // connector location_cs.location_cs__location_vt.location_vt_location_cs.location_cs__location_vt.location_vt
    const conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_35 = new Connector("location_cs.location_cs__location_vt.location_vt_location_cs.location_cs__location_vt.location_vt");
    __attachEndpoint(conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_35, this.FactoryAutomationSystem.agvs.vc, "location_cs");
    __attachEndpoint(conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_35, this.FactoryAutomationSystem.agvs.vc, "location_vt");
    __attachEndpoint(conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_35, this.FactoryAutomationSystem.agvs.vc, "location_cs");
    __attachEndpoint(conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_35, this.FactoryAutomationSystem.agvs.vc, "location_vt");
    this.addConnector(conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_35);
    // connector location_cs.location_cs__location_vt.location_vt_location_cs.location_cs__location_vt.location_vt
    const conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_36 = new Connector("location_cs.location_cs__location_vt.location_vt_location_cs.location_cs__location_vt.location_vt");
    __attachEndpoint(conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_36, this.FactoryAutomationSystem.agvs.vc, "location_cs");
    __attachEndpoint(conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_36, this.FactoryAutomationSystem.agvs.vc, "location_vt");
    __attachEndpoint(conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_36, this.FactoryAutomationSystem.agvs.vc, "location_cs");
    __attachEndpoint(conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_36, this.FactoryAutomationSystem.agvs.vc, "location_vt");
    this.addConnector(conn_location_cs_location_cs__location_vt_location_vt_location_cs_location_cs__location_vt_location_vt_36);
    // connector sendNotificationMotor
    const conn_sendNotificationMotor_37 = new Connector("sendNotificationMotor");
    __attachEndpoint(conn_sendNotificationMotor_37, this.FactoryAutomationSystem.agvs.vc.nm, "outAck");
    __attachEndpoint(conn_sendNotificationMotor_37, this.FactoryAutomationSystem.agvs.vc, "ack_ca");
    this.addConnector(conn_sendNotificationMotor_37);
    // connector outAck.outAck__ack_ca.ack_ca_outAck.outAck__ack_ca.ack_ca
    const conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_38 = new Connector("outAck.outAck__ack_ca.ack_ca_outAck.outAck__ack_ca.ack_ca");
    __attachEndpoint(conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_38, this.FactoryAutomationSystem.agvs.vc.nm, "outAck");
    __attachEndpoint(conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_38, this.FactoryAutomationSystem.agvs.vc, "ack_ca");
    __attachEndpoint(conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_38, this.FactoryAutomationSystem.agvs.vc.nm, "outAck");
    __attachEndpoint(conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_38, this.FactoryAutomationSystem.agvs.vc, "ack_ca");
    this.addConnector(conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_38);
    // connector outAck.outAck__ack_ca.ack_ca_outAck.outAck__ack_ca.ack_ca
    const conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_39 = new Connector("outAck.outAck__ack_ca.ack_ca_outAck.outAck__ack_ca.ack_ca");
    __attachEndpoint(conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_39, this.FactoryAutomationSystem.agvs.vc.nm, "outAck");
    __attachEndpoint(conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_39, this.FactoryAutomationSystem.agvs.vc, "ack_ca");
    __attachEndpoint(conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_39, this.FactoryAutomationSystem.agvs.vc.nm, "outAck");
    __attachEndpoint(conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_39, this.FactoryAutomationSystem.agvs.vc, "ack_ca");
    this.addConnector(conn_outAck_outAck__ack_ca_ack_ca_outAck_outAck__ack_ca_ack_ca_39);
    // connector sendNotificationMotor2
    const conn_sendNotificationMotor2_40 = new Connector("sendNotificationMotor2");
    __attachEndpoint(conn_sendNotificationMotor2_40, this.FactoryAutomationSystem.agvs.vc.cs, "ack_cs");
    __attachEndpoint(conn_sendNotificationMotor2_40, this.FactoryAutomationSystem.agvs.vc.cs, "ack_cs");
    this.addConnector(conn_sendNotificationMotor2_40);
    // connector x.x__cs.ack_cs_x.x__cs.ack_cs
    const conn_x_x__cs_ack_cs_x_x__cs_ack_cs_41 = new Connector("x.x__cs.ack_cs_x.x__cs.ack_cs");
    __attachEndpoint(conn_x_x__cs_ack_cs_x_x__cs_ack_cs_41, this.FactoryAutomationSystem.agvs.vc.cs, "ack_cs");
    __attachEndpoint(conn_x_x__cs_ack_cs_x_x__cs_ack_cs_41, this.FactoryAutomationSystem.agvs.vc.cs, "ack_cs");
    __attachEndpoint(conn_x_x__cs_ack_cs_x_x__cs_ack_cs_41, this.FactoryAutomationSystem.agvs.vc.cs, "ack_cs");
    this.addConnector(conn_x_x__cs_ack_cs_x_x__cs_ack_cs_41);
    // connector x.x__cs.ack_cs_x.x__cs.ack_cs
    const conn_x_x__cs_ack_cs_x_x__cs_ack_cs_42 = new Connector("x.x__cs.ack_cs_x.x__cs.ack_cs");
    __attachEndpoint(conn_x_x__cs_ack_cs_x_x__cs_ack_cs_42, this.FactoryAutomationSystem.agvs.vc.cs, "ack_cs");
    __attachEndpoint(conn_x_x__cs_ack_cs_x_x__cs_ack_cs_42, this.FactoryAutomationSystem.agvs.vc.cs, "ack_cs");
    __attachEndpoint(conn_x_x__cs_ack_cs_x_x__cs_ack_cs_42, this.FactoryAutomationSystem.agvs.vc.cs, "ack_cs");
    this.addConnector(conn_x_x__cs_ack_cs_x_x__cs_ack_cs_42);
  }
}

function createModel(){ return new SysADLArchitecture(); }
module.exports = { createModel, SysADLArchitecture };
const { Model, Component, Port, CompositePort, Connector, Activity, Action, createExecutableFromExpression } = require('../SysADLBase');
class SmartPlaceWeb extends Component { constructor(name){ super(name); } }
class RoomReservationSystem extends Component { constructor(name){ super(name); } }
class OrionContextBroker extends Component { constructor(name){ super(name); } }
class TemperatureAndHumiditySensor extends Component { constructor(name){ super(name); } }
class PresenceSensor extends Component { constructor(name){ super(name); } }
class DB_PostgreSQL extends Component { constructor(name){ super(name); } }
class AirConditioner extends Component { constructor(name){ super(name); } }
class Led extends Component { constructor(name){ super(name); } }
class Raspberry extends Component { constructor(name){ super(name); } }
class Camera extends Component { constructor(name){ super(name); } }
class CamMonitor extends Component { constructor(name){ super(name); } }
class TemperatureController extends Component { constructor(name){ super(name); } }
class DB_SQLite extends Component { constructor(name){ super(name); } }
class Fotosensor extends Component { constructor(name){ super(name); } }
class AirConditionerController extends Component { constructor(name){ super(name); } }
class RegistrationController extends Component { constructor(name){ super(name); } }
class ReportGenerator extends Component { constructor(name){ super(name); } }
class GraphicsGenerator extends Component { constructor(name){ super(name); } }
class HistoricController extends Component { constructor(name){ super(name); } }

class SysADLArchitecture extends Model {
  constructor(){
    super("SysADLArchitecture");
    // instantiate components and expose as properties for direct navigation
    this.ac = new AirConditioner("ac");
    this.addComponent(this.ac);
    this.Camera = new Camera("Camera");
    this.addComponent(this.Camera);
    this.Led = new Led("Led");
    this.addComponent(this.Led);
    this.ocb = new OrionContextBroker("ocb");
    this.addComponent(this.ocb);
    this.ps = new PresenceSensor("ps");
    this.addComponent(this.ps);
    this.psql = new DB_PostgreSQL("psql");
    this.addComponent(this.psql);
    this.Raspberry = new Raspberry("Raspberry");
    this.addComponent(this.Raspberry);
    this.rrs = new RoomReservationSystem("rrs");
    this.addComponent(this.rrs);
    this.spw = new SmartPlaceWeb("spw");
    this.addComponent(this.spw);
    this.ths = new TemperatureAndHumiditySensor("ths");
    this.addComponent(this.ths);
    this.ac.acc = new AirConditionerController("acc");
    this.ac.addComponent(this.ac.acc);
    this.Raspberry.cm = new CamMonitor("cm");
    this.Raspberry.addComponent(this.Raspberry.cm);
    this.ac.f = new Fotosensor("f");
    this.ac.addComponent(this.ac.f);
    this.spw.gg = new GraphicsGenerator("gg");
    this.spw.addComponent(this.spw.gg);
    this.spw.hc = new HistoricController("hc");
    this.spw.addComponent(this.spw.hc);
    this.spw.rc = new RegistrationController("rc");
    this.spw.addComponent(this.spw.rc);
    this.spw.rg = new ReportGenerator("rg");
    this.spw.addComponent(this.spw.rg);
    this.Raspberry.sqlite = new DB_SQLite("sqlite");
    this.Raspberry.addComponent(this.Raspberry.sqlite);
    this.Raspberry.tc = new TemperatureController("tc");
    this.Raspberry.addComponent(this.Raspberry.tc);

    // helper to add executable safely
    const __addExec = (ename, body, params) => { try { this.addExecutable(ename, createExecutableFromExpression(String(body||""), params||[])); } catch(e) { /* ignore */ } };
    // helper to attach connector endpoint: expects a concrete component object or expression (no runtime lookup)
    const __attachEndpoint = (conn, compObj, portName) => { try { if (!compObj || !portName) return; if (compObj && compObj.ports && compObj.ports[portName]) conn.addEndpoint(this, compObj.ports[portName]); } catch(e){} };
    // port co on spw (expr: this.spw)
    if (!this.spw.ports) this.spw.ports = {};
    if (!this.spw.ports["co"]) { const __p = new Port("co", 'in', { owner: "spw" }); this.spw.addPort(__p); }
    // port rr on spw (expr: this.spw)
    if (!this.spw.ports) this.spw.ports = {};
    if (!this.spw.ports["rr"]) { const __p = new Port("rr", 'in', { owner: "spw" }); this.spw.addPort(__p); }
    // port db on spw (expr: this.spw)
    if (!this.spw.ports) this.spw.ports = {};
    if (!this.spw.ports["db"]) { const __p = new Port("db", 'in', { owner: "spw" }); this.spw.addPort(__p); }
    // port u on spw (expr: this.spw)
    if (!this.spw.ports) this.spw.ports = {};
    if (!this.spw.ports["u"]) { const __p = new Port("u", 'in', { owner: "spw" }); this.spw.addPort(__p); }
    // port ctx on spw (expr: this.spw)
    if (!this.spw.ports) this.spw.ports = {};
    if (!this.spw.ports["ctx"]) { const __p = new Port("ctx", 'in', { owner: "spw" }); this.spw.addPort(__p); }
    // port ciRc on spw (expr: this.spw)
    if (!this.spw.ports) this.spw.ports = {};
    if (!this.spw.ports["ciRc"]) { const __p = new Port("ciRc", 'in', { owner: "spw" }); this.spw.addPort(__p); }
    // port regUi on spw (expr: this.spw)
    if (!this.spw.ports) this.spw.ports = {};
    if (!this.spw.ports["regUi"]) { const __p = new Port("regUi", 'in', { owner: "spw" }); this.spw.addPort(__p); }
    // port a on spw (expr: this.spw)
    if (!this.spw.ports) this.spw.ports = {};
    if (!this.spw.ports["a"]) { const __p = new Port("a", 'in', { owner: "spw" }); this.spw.addPort(__p); }
    // port dbGg on spw (expr: this.spw)
    if (!this.spw.ports) this.spw.ports = {};
    if (!this.spw.ports["dbGg"]) { const __p = new Port("dbGg", 'in', { owner: "spw" }); this.spw.addPort(__p); }
    // port ctxGg on spw (expr: this.spw)
    if (!this.spw.ports) this.spw.ports = {};
    if (!this.spw.ports["ctxGg"]) { const __p = new Port("ctxGg", 'in', { owner: "spw" }); this.spw.addPort(__p); }
    // port rrHc on spw (expr: this.spw)
    if (!this.spw.ports) this.spw.ports = {};
    if (!this.spw.ports["rrHc"]) { const __p = new Port("rrHc", 'in', { owner: "spw" }); this.spw.addPort(__p); }
    // port uHc on spw (expr: this.spw)
    if (!this.spw.ports) this.spw.ports = {};
    if (!this.spw.ports["uHc"]) { const __p = new Port("uHc", 'in', { owner: "spw" }); this.spw.addPort(__p); }
    // port ctxHc on spw (expr: this.spw)
    if (!this.spw.ports) this.spw.ports = {};
    if (!this.spw.ports["ctxHc"]) { const __p = new Port("ctxHc", 'in', { owner: "spw" }); this.spw.addPort(__p); }
    // port ri on rrs (expr: this.rrs)
    if (!this.rrs.ports) this.rrs.ports = {};
    if (!this.rrs.ports["ri"]) { const __p = new Port("ri", 'in', { owner: "rrs" }); this.rrs.addPort(__p); }
    // port ci on ocb (expr: this.ocb)
    if (!this.ocb.ports) this.ocb.ports = {};
    if (!this.ocb.ports["ci"]) { const __p = new Port("ci", 'in', { owner: "ocb" }); this.ocb.addPort(__p); }
    // port ctx on ocb (expr: this.ocb)
    if (!this.ocb.ports) this.ocb.ports = {};
    if (!this.ocb.ports["ctx"]) { const __p = new Port("ctx", 'in', { owner: "ocb" }); this.ocb.addPort(__p); }
    // port temperature on ths (expr: this.ths)
    if (!this.ths.ports) this.ths.ports = {};
    if (!this.ths.ports["temperature"]) { const __p = new Port("temperature", 'in', { owner: "ths" }); this.ths.addPort(__p); }
    // port presence on ps (expr: this.ps)
    if (!this.ps.ports) this.ps.ports = {};
    if (!this.ps.ports["presence"]) { const __p = new Port("presence", 'in', { owner: "ps" }); this.ps.addPort(__p); }
    // port db on psql (expr: this.psql)
    if (!this.psql.ports) this.psql.ports = {};
    if (!this.psql.ports["db"]) { const __p = new Port("db", 'in', { owner: "psql" }); this.psql.addPort(__p); }
    // port u on psql (expr: this.psql)
    if (!this.psql.ports) this.psql.ports = {};
    if (!this.psql.ports["u"]) { const __p = new Port("u", 'in', { owner: "psql" }); this.psql.addPort(__p); }
    // port is on ac (expr: this.ac)
    if (!this.ac.ports) this.ac.ports = {};
    if (!this.ac.ports["is"]) { const __p = new Port("is", 'in', { owner: "ac" }); this.ac.addPort(__p); }
    // port uF on ac (expr: this.ac)
    if (!this.ac.ports) this.ac.ports = {};
    if (!this.ac.ports["uF"]) { const __p = new Port("uF", 'in', { owner: "ac" }); this.ac.addPort(__p); }
    // port isF on ac (expr: this.ac)
    if (!this.ac.ports) this.ac.ports = {};
    if (!this.ac.ports["isF"]) { const __p = new Port("isF", 'in', { owner: "ac" }); this.ac.addPort(__p); }
    // port uAcc on ac (expr: this.ac)
    if (!this.ac.ports) this.ac.ports = {};
    if (!this.ac.ports["uAcc"]) { const __p = new Port("uAcc", 'in', { owner: "ac" }); this.ac.addPort(__p); }
    // port c on Led (expr: this.Led)
    if (!this.Led.ports) this.Led.ports = {};
    if (!this.Led.ports["c"]) { const __p = new Port("c", 'in', { owner: "Led" }); this.Led.addPort(__p); }
    // port is on Led (expr: this.Led)
    if (!this.Led.ports) this.Led.ports = {};
    if (!this.Led.ports["is"]) { const __p = new Port("is", 'in', { owner: "Led" }); this.Led.addPort(__p); }
    // port c on Raspberry (expr: this.Raspberry)
    if (!this.Raspberry.ports) this.Raspberry.ports = {};
    if (!this.Raspberry.ports["c"]) { const __p = new Port("c", 'in', { owner: "Raspberry" }); this.Raspberry.addPort(__p); }
    // port ri on Raspberry (expr: this.Raspberry)
    if (!this.Raspberry.ports) this.Raspberry.ports = {};
    if (!this.Raspberry.ports["ri"]) { const __p = new Port("ri", 'in', { owner: "Raspberry" }); this.Raspberry.addPort(__p); }
    // port f on Raspberry (expr: this.Raspberry)
    if (!this.Raspberry.ports) this.Raspberry.ports = {};
    if (!this.Raspberry.ports["f"]) { const __p = new Port("f", 'in', { owner: "Raspberry" }); this.Raspberry.addPort(__p); }
    // port temperature on Raspberry (expr: this.Raspberry)
    if (!this.Raspberry.ports) this.Raspberry.ports = {};
    if (!this.Raspberry.ports["temperature"]) { const __p = new Port("temperature", 'in', { owner: "Raspberry" }); this.Raspberry.addPort(__p); }
    // port presence on Raspberry (expr: this.Raspberry)
    if (!this.Raspberry.ports) this.Raspberry.ports = {};
    if (!this.Raspberry.ports["presence"]) { const __p = new Port("presence", 'in', { owner: "Raspberry" }); this.Raspberry.addPort(__p); }
    // port rr on Raspberry (expr: this.Raspberry)
    if (!this.Raspberry.ports) this.Raspberry.ports = {};
    if (!this.Raspberry.ports["rr"]) { const __p = new Port("rr", 'in', { owner: "Raspberry" }); this.Raspberry.addPort(__p); }
    // port fCm on Raspberry (expr: this.Raspberry)
    if (!this.Raspberry.ports) this.Raspberry.ports = {};
    if (!this.Raspberry.ports["fCm"]) { const __p = new Port("fCm", 'in', { owner: "Raspberry" }); this.Raspberry.addPort(__p); }
    // port numPeopleCm on Raspberry (expr: this.Raspberry)
    if (!this.Raspberry.ports) this.Raspberry.ports = {};
    if (!this.Raspberry.ports["numPeopleCm"]) { const __p = new Port("numPeopleCm", 'in', { owner: "Raspberry" }); this.Raspberry.addPort(__p); }
    // port presenceTc on Raspberry (expr: this.Raspberry)
    if (!this.Raspberry.ports) this.Raspberry.ports = {};
    if (!this.Raspberry.ports["presenceTc"]) { const __p = new Port("presenceTc", 'in', { owner: "Raspberry" }); this.Raspberry.addPort(__p); }
    // port rraspTc on Raspberry (expr: this.Raspberry)
    if (!this.Raspberry.ports) this.Raspberry.ports = {};
    if (!this.Raspberry.ports["rraspTc"]) { const __p = new Port("rraspTc", 'in', { owner: "Raspberry" }); this.Raspberry.addPort(__p); }
    // port riTc on Raspberry (expr: this.Raspberry)
    if (!this.Raspberry.ports) this.Raspberry.ports = {};
    if (!this.Raspberry.ports["riTc"]) { const __p = new Port("riTc", 'in', { owner: "Raspberry" }); this.Raspberry.addPort(__p); }
    // port temperatureTc on Raspberry (expr: this.Raspberry)
    if (!this.Raspberry.ports) this.Raspberry.ports = {};
    if (!this.Raspberry.ports["temperatureTc"]) { const __p = new Port("temperatureTc", 'in', { owner: "Raspberry" }); this.Raspberry.addPort(__p); }
    // port numPeopleTc on Raspberry (expr: this.Raspberry)
    if (!this.Raspberry.ports) this.Raspberry.ports = {};
    if (!this.Raspberry.ports["numPeopleTc"]) { const __p = new Port("numPeopleTc", 'in', { owner: "Raspberry" }); this.Raspberry.addPort(__p); }
    // port cTc on Raspberry (expr: this.Raspberry)
    if (!this.Raspberry.ports) this.Raspberry.ports = {};
    if (!this.Raspberry.ports["cTc"]) { const __p = new Port("cTc", 'in', { owner: "Raspberry" }); this.Raspberry.addPort(__p); }
    // port ri on Raspberry (expr: this.Raspberry)
    if (!this.Raspberry.ports) this.Raspberry.ports = {};
    if (!this.Raspberry.ports["ri"]) { const __p = new Port("ri", 'in', { owner: "Raspberry" }); this.Raspberry.addPort(__p); }
    // port rresp on Raspberry (expr: this.Raspberry)
    if (!this.Raspberry.ports) this.Raspberry.ports = {};
    if (!this.Raspberry.ports["rresp"]) { const __p = new Port("rresp", 'in', { owner: "Raspberry" }); this.Raspberry.addPort(__p); }
    // port f on Camera (expr: this.Camera)
    if (!this.Camera.ports) this.Camera.ports = {};
    if (!this.Camera.ports["f"]) { const __p = new Port("f", 'in', { owner: "Camera" }); this.Camera.addPort(__p); }
    // port f on cm (expr: this.Raspberry.cm)
    if (!this.Raspberry.cm.ports) this.Raspberry.cm.ports = {};
    if (!this.Raspberry.cm.ports["f"]) { const __p = new Port("f", 'in', { owner: "cm" }); this.Raspberry.cm.addPort(__p); }
    // port numPeople on cm (expr: this.Raspberry.cm)
    if (!this.Raspberry.cm.ports) this.Raspberry.cm.ports = {};
    if (!this.Raspberry.cm.ports["numPeople"]) { const __p = new Port("numPeople", 'in', { owner: "cm" }); this.Raspberry.cm.addPort(__p); }
    // port presence on tc (expr: this.Raspberry.tc)
    if (!this.Raspberry.tc.ports) this.Raspberry.tc.ports = {};
    if (!this.Raspberry.tc.ports["presence"]) { const __p = new Port("presence", 'in', { owner: "tc" }); this.Raspberry.tc.addPort(__p); }
    // port rrasp on tc (expr: this.Raspberry.tc)
    if (!this.Raspberry.tc.ports) this.Raspberry.tc.ports = {};
    if (!this.Raspberry.tc.ports["rrasp"]) { const __p = new Port("rrasp", 'in', { owner: "tc" }); this.Raspberry.tc.addPort(__p); }
    // port ri on tc (expr: this.Raspberry.tc)
    if (!this.Raspberry.tc.ports) this.Raspberry.tc.ports = {};
    if (!this.Raspberry.tc.ports["ri"]) { const __p = new Port("ri", 'in', { owner: "tc" }); this.Raspberry.tc.addPort(__p); }
    // port temperature on tc (expr: this.Raspberry.tc)
    if (!this.Raspberry.tc.ports) this.Raspberry.tc.ports = {};
    if (!this.Raspberry.tc.ports["temperature"]) { const __p = new Port("temperature", 'in', { owner: "tc" }); this.Raspberry.tc.addPort(__p); }
    // port numPeople on tc (expr: this.Raspberry.tc)
    if (!this.Raspberry.tc.ports) this.Raspberry.tc.ports = {};
    if (!this.Raspberry.tc.ports["numPeople"]) { const __p = new Port("numPeople", 'in', { owner: "tc" }); this.Raspberry.tc.addPort(__p); }
    // port c on tc (expr: this.Raspberry.tc)
    if (!this.Raspberry.tc.ports) this.Raspberry.tc.ports = {};
    if (!this.Raspberry.tc.ports["c"]) { const __p = new Port("c", 'in', { owner: "tc" }); this.Raspberry.tc.addPort(__p); }
    // port ri on sqlite (expr: this.Raspberry.sqlite)
    if (!this.Raspberry.sqlite.ports) this.Raspberry.sqlite.ports = {};
    if (!this.Raspberry.sqlite.ports["ri"]) { const __p = new Port("ri", 'in', { owner: "sqlite" }); this.Raspberry.sqlite.addPort(__p); }
    // port rresp on sqlite (expr: this.Raspberry.sqlite)
    if (!this.Raspberry.sqlite.ports) this.Raspberry.sqlite.ports = {};
    if (!this.Raspberry.sqlite.ports["rresp"]) { const __p = new Port("rresp", 'in', { owner: "sqlite" }); this.Raspberry.sqlite.addPort(__p); }
    // port u on f (expr: this.ac.f)
    if (!this.ac.f.ports) this.ac.f.ports = {};
    if (!this.ac.f.ports["u"]) { const __p = new Port("u", 'in', { owner: "f" }); this.ac.f.addPort(__p); }
    // port is on f (expr: this.ac.f)
    if (!this.ac.f.ports) this.ac.f.ports = {};
    if (!this.ac.f.ports["is"]) { const __p = new Port("is", 'in', { owner: "f" }); this.ac.f.addPort(__p); }
    // port u on acc (expr: this.ac.acc)
    if (!this.ac.acc.ports) this.ac.acc.ports = {};
    if (!this.ac.acc.ports["u"]) { const __p = new Port("u", 'in', { owner: "acc" }); this.ac.acc.addPort(__p); }
    // port ci on rc (expr: this.spw.rc)
    if (!this.spw.rc.ports) this.spw.rc.ports = {};
    if (!this.spw.rc.ports["ci"]) { const __p = new Port("ci", 'in', { owner: "rc" }); this.spw.rc.addPort(__p); }
    // port regUi on rc (expr: this.spw.rc)
    if (!this.spw.rc.ports) this.spw.rc.ports = {};
    if (!this.spw.rc.ports["regUi"]) { const __p = new Port("regUi", 'in', { owner: "rc" }); this.spw.rc.addPort(__p); }
    // port a on rg (expr: this.spw.rg)
    if (!this.spw.rg.ports) this.spw.rg.ports = {};
    if (!this.spw.rg.ports["a"]) { const __p = new Port("a", 'in', { owner: "rg" }); this.spw.rg.addPort(__p); }
    // port db on gg (expr: this.spw.gg)
    if (!this.spw.gg.ports) this.spw.gg.ports = {};
    if (!this.spw.gg.ports["db"]) { const __p = new Port("db", 'in', { owner: "gg" }); this.spw.gg.addPort(__p); }
    // port ctx on gg (expr: this.spw.gg)
    if (!this.spw.gg.ports) this.spw.gg.ports = {};
    if (!this.spw.gg.ports["ctx"]) { const __p = new Port("ctx", 'in', { owner: "gg" }); this.spw.gg.addPort(__p); }
    // port rr on hc (expr: this.spw.hc)
    if (!this.spw.hc.ports) this.spw.hc.ports = {};
    if (!this.spw.hc.ports["rr"]) { const __p = new Port("rr", 'in', { owner: "hc" }); this.spw.hc.addPort(__p); }
    // port u on hc (expr: this.spw.hc)
    if (!this.spw.hc.ports) this.spw.hc.ports = {};
    if (!this.spw.hc.ports["u"]) { const __p = new Port("u", 'in', { owner: "hc" }); this.spw.hc.addPort(__p); }
    // port ctx on hc (expr: this.spw.hc)
    if (!this.spw.hc.ports) this.spw.hc.ports = {};
    if (!this.spw.hc.ports["ctx"]) { const __p = new Port("ctx", 'in', { owner: "hc" }); this.spw.hc.addPort(__p); }
    // ensure activity ports for spw (expr: this.spw)
    if (!this.spw.ports) this.spw.ports = {};
    if (!this.spw.ports["u"]) { const __p = new Port("u", 'in', { owner: "spw" }); this.spw.addPort(__p); }
    // ensure activity ports for rrs (expr: this.rrs)
    if (!this.rrs.ports) this.rrs.ports = {};
    if (!this.rrs.ports["ri"]) { const __p = new Port("ri", 'in', { owner: "rrs" }); this.rrs.addPort(__p); }
    // ensure activity ports for ocb (expr: this.ocb)
    if (!this.ocb.ports) this.ocb.ports = {};
    if (!this.ocb.ports["ci"]) { const __p = new Port("ci", 'in', { owner: "ocb" }); this.ocb.addPort(__p); }
    // ensure activity ports for ths (expr: this.ths)
    if (!this.ths.ports) this.ths.ports = {};
    if (!this.ths.ports["temperature"]) { const __p = new Port("temperature", 'in', { owner: "ths" }); this.ths.addPort(__p); }
    // ensure activity ports for ps (expr: this.ps)
    if (!this.ps.ports) this.ps.ports = {};
    if (!this.ps.ports["presence"]) { const __p = new Port("presence", 'in', { owner: "ps" }); this.ps.addPort(__p); }
    // ensure activity ports for psql (expr: this.psql)
    if (!this.psql.ports) this.psql.ports = {};
    if (!this.psql.ports["u"]) { const __p = new Port("u", 'in', { owner: "psql" }); this.psql.addPort(__p); }
    // ensure activity ports for ac (expr: this.ac)
    if (!this.ac.ports) this.ac.ports = {};
    if (!this.ac.ports["is"]) { const __p = new Port("is", 'in', { owner: "ac" }); this.ac.addPort(__p); }
    // ensure activity ports for Led (expr: this.Led)
    if (!this.Led.ports) this.Led.ports = {};
    if (!this.Led.ports["c"]) { const __p = new Port("c", 'in', { owner: "Led" }); this.Led.addPort(__p); }
    // ensure activity ports for Raspberry (expr: this.Raspberry)
    if (!this.Raspberry.ports) this.Raspberry.ports = {};
    if (!this.Raspberry.ports["f"]) { const __p = new Port("f", 'in', { owner: "Raspberry" }); this.Raspberry.addPort(__p); }
    // ensure activity ports for Camera (expr: this.Camera)
    if (!this.Camera.ports) this.Camera.ports = {};
    if (!this.Camera.ports["f"]) { const __p = new Port("f", 'in', { owner: "Camera" }); this.Camera.addPort(__p); }
    // ensure activity ports for cm (expr: this.Raspberry.cm)
    if (!this.Raspberry.cm.ports) this.Raspberry.cm.ports = {};
    if (!this.Raspberry.cm.ports["f"]) { const __p = new Port("f", 'in', { owner: "cm" }); this.Raspberry.cm.addPort(__p); }
    // ensure activity ports for tc (expr: this.Raspberry.tc)
    if (!this.Raspberry.tc.ports) this.Raspberry.tc.ports = {};
    if (!this.Raspberry.tc.ports["presence"]) { const __p = new Port("presence", 'in', { owner: "tc" }); this.Raspberry.tc.addPort(__p); }
    // ensure activity ports for sqlite (expr: this.Raspberry.sqlite)
    if (!this.Raspberry.sqlite.ports) this.Raspberry.sqlite.ports = {};
    if (!this.Raspberry.sqlite.ports["ri"]) { const __p = new Port("ri", 'in', { owner: "sqlite" }); this.Raspberry.sqlite.addPort(__p); }
    // ensure activity ports for f (expr: this.ac.f)
    if (!this.ac.f.ports) this.ac.f.ports = {};
    if (!this.ac.f.ports["u"]) { const __p = new Port("u", 'in', { owner: "f" }); this.ac.f.addPort(__p); }
    // ensure activity ports for acc (expr: this.ac.acc)
    if (!this.ac.acc.ports) this.ac.acc.ports = {};
    if (!this.ac.acc.ports["u"]) { const __p = new Port("u", 'in', { owner: "acc" }); this.ac.acc.addPort(__p); }
    // ensure activity ports for rc (expr: this.spw.rc)
    if (!this.spw.rc.ports) this.spw.rc.ports = {};
    if (!this.spw.rc.ports["ci"]) { const __p = new Port("ci", 'in', { owner: "rc" }); this.spw.rc.addPort(__p); }
    // ensure activity ports for rg (expr: this.spw.rg)
    if (!this.spw.rg.ports) this.spw.rg.ports = {};
    if (!this.spw.rg.ports["a"]) { const __p = new Port("a", 'in', { owner: "rg" }); this.spw.rg.addPort(__p); }
    // ensure activity ports for gg (expr: this.spw.gg)
    if (!this.spw.gg.ports) this.spw.gg.ports = {};
    if (!this.spw.gg.ports["db"]) { const __p = new Port("db", 'in', { owner: "gg" }); this.spw.gg.addPort(__p); }
    // ensure activity ports for hc (expr: this.spw.hc)
    if (!this.spw.hc.ports) this.spw.hc.ports = {};
    if (!this.spw.hc.ports["u"]) { const __p = new Port("u", 'in', { owner: "hc" }); this.spw.hc.addPort(__p); }
    // ensure activity ports for tc (expr: this.Raspberry.tc)
    if (!this.Raspberry.tc.ports) this.Raspberry.tc.ports = {};
    if (!this.Raspberry.tc.ports["presence"]) { const __p = new Port("presence", 'in', { owner: "tc" }); this.Raspberry.tc.addPort(__p); }
    // ensure activity ports for spw (expr: this.spw)
    if (!this.spw.ports) this.spw.ports = {};
    if (!this.spw.ports["a"]) { const __p = new Port("a", 'in', { owner: "spw" }); this.spw.addPort(__p); }
    if (!this.spw.ports["rr"]) { const __p = new Port("rr", 'in', { owner: "spw" }); this.spw.addPort(__p); }
    // ensure activity ports for rrs (expr: this.rrs)
    if (!this.rrs.ports) this.rrs.ports = {};
    if (!this.rrs.ports["ri"]) { const __p = new Port("ri", 'in', { owner: "rrs" }); this.rrs.addPort(__p); }
    // ensure activity ports for ocb (expr: this.ocb)
    if (!this.ocb.ports) this.ocb.ports = {};
    if (!this.ocb.ports["ci"]) { const __p = new Port("ci", 'in', { owner: "ocb" }); this.ocb.addPort(__p); }
    // ensure activity ports for ths (expr: this.ths)
    if (!this.ths.ports) this.ths.ports = {};
    if (!this.ths.ports["temperature"]) { const __p = new Port("temperature", 'in', { owner: "ths" }); this.ths.addPort(__p); }
    // ensure activity ports for ps (expr: this.ps)
    if (!this.ps.ports) this.ps.ports = {};
    if (!this.ps.ports["presence"]) { const __p = new Port("presence", 'in', { owner: "ps" }); this.ps.addPort(__p); }
    // ensure activity ports for psql (expr: this.psql)
    if (!this.psql.ports) this.psql.ports = {};
    if (!this.psql.ports["db"]) { const __p = new Port("db", 'in', { owner: "psql" }); this.psql.addPort(__p); }
    // ensure activity ports for ac (expr: this.ac)
    if (!this.ac.ports) this.ac.ports = {};
    if (!this.ac.ports["is"]) { const __p = new Port("is", 'in', { owner: "ac" }); this.ac.addPort(__p); }
    // ensure activity ports for Led (expr: this.Led)
    if (!this.Led.ports) this.Led.ports = {};
    if (!this.Led.ports["c"]) { const __p = new Port("c", 'in', { owner: "Led" }); this.Led.addPort(__p); }
    // ensure activity ports for Raspberry (expr: this.Raspberry)
    if (!this.Raspberry.ports) this.Raspberry.ports = {};
    if (!this.Raspberry.ports["c"]) { const __p = new Port("c", 'in', { owner: "Raspberry" }); this.Raspberry.addPort(__p); }
    // ensure activity ports for Camera (expr: this.Camera)
    if (!this.Camera.ports) this.Camera.ports = {};
    if (!this.Camera.ports["f"]) { const __p = new Port("f", 'in', { owner: "Camera" }); this.Camera.addPort(__p); }
    // ensure activity ports for cm (expr: this.Raspberry.cm)
    if (!this.Raspberry.cm.ports) this.Raspberry.cm.ports = {};
    if (!this.Raspberry.cm.ports["f"]) { const __p = new Port("f", 'in', { owner: "cm" }); this.Raspberry.cm.addPort(__p); }
    // ensure activity ports for tc (expr: this.Raspberry.tc)
    if (!this.Raspberry.tc.ports) this.Raspberry.tc.ports = {};
    if (!this.Raspberry.tc.ports["presence"]) { const __p = new Port("presence", 'in', { owner: "tc" }); this.Raspberry.tc.addPort(__p); }
    // ensure activity ports for sqlite (expr: this.Raspberry.sqlite)
    if (!this.Raspberry.sqlite.ports) this.Raspberry.sqlite.ports = {};
    if (!this.Raspberry.sqlite.ports["ri"]) { const __p = new Port("ri", 'in', { owner: "sqlite" }); this.Raspberry.sqlite.addPort(__p); }
    // ensure activity ports for f (expr: this.ac.f)
    if (!this.ac.f.ports) this.ac.f.ports = {};
    if (!this.ac.f.ports["u"]) { const __p = new Port("u", 'in', { owner: "f" }); this.ac.f.addPort(__p); }
    // ensure activity ports for acc (expr: this.ac.acc)
    if (!this.ac.acc.ports) this.ac.acc.ports = {};
    if (!this.ac.acc.ports["u"]) { const __p = new Port("u", 'in', { owner: "acc" }); this.ac.acc.addPort(__p); }
    // ensure activity ports for rc (expr: this.spw.rc)
    if (!this.spw.rc.ports) this.spw.rc.ports = {};
    if (!this.spw.rc.ports["ci"]) { const __p = new Port("ci", 'in', { owner: "rc" }); this.spw.rc.addPort(__p); }
    // ensure activity ports for rg (expr: this.spw.rg)
    if (!this.spw.rg.ports) this.spw.rg.ports = {};
    if (!this.spw.rg.ports["a"]) { const __p = new Port("a", 'in', { owner: "rg" }); this.spw.rg.addPort(__p); }
    // ensure activity ports for gg (expr: this.spw.gg)
    if (!this.spw.gg.ports) this.spw.gg.ports = {};
    if (!this.spw.gg.ports["db"]) { const __p = new Port("db", 'in', { owner: "gg" }); this.spw.gg.addPort(__p); }
    // ensure activity ports for hc (expr: this.spw.hc)
    if (!this.spw.hc.ports) this.spw.hc.ports = {};
    if (!this.spw.hc.ports["rr"]) { const __p = new Port("rr", 'in', { owner: "hc" }); this.spw.hc.addPort(__p); }
    const act_RaspberryControllerAC_spw = new Activity("RaspberryControllerAC", { component: "spw", inputPorts: ["u"] });
    this.registerActivity("RaspberryControllerAC::spw", act_RaspberryControllerAC_spw);
    const act_RaspberryControllerAC_rrs = new Activity("RaspberryControllerAC", { component: "rrs", inputPorts: ["ri"] });
    this.registerActivity("RaspberryControllerAC::rrs", act_RaspberryControllerAC_rrs);
    const act_RaspberryControllerAC_ocb = new Activity("RaspberryControllerAC", { component: "ocb", inputPorts: ["ci"] });
    this.registerActivity("RaspberryControllerAC::ocb", act_RaspberryControllerAC_ocb);
    const act_RaspberryControllerAC_ths = new Activity("RaspberryControllerAC", { component: "ths", inputPorts: ["temperature"] });
    this.registerActivity("RaspberryControllerAC::ths", act_RaspberryControllerAC_ths);
    const act_RaspberryControllerAC_ps = new Activity("RaspberryControllerAC", { component: "ps", inputPorts: ["presence"] });
    this.registerActivity("RaspberryControllerAC::ps", act_RaspberryControllerAC_ps);
    const act_RaspberryControllerAC_psql = new Activity("RaspberryControllerAC", { component: "psql", inputPorts: ["u"] });
    this.registerActivity("RaspberryControllerAC::psql", act_RaspberryControllerAC_psql);
    const act_RaspberryControllerAC_ac = new Activity("RaspberryControllerAC", { component: "ac", inputPorts: ["is"] });
    this.registerActivity("RaspberryControllerAC::ac", act_RaspberryControllerAC_ac);
    const act_RaspberryControllerAC_Led = new Activity("RaspberryControllerAC", { component: "Led", inputPorts: ["c"] });
    this.registerActivity("RaspberryControllerAC::Led", act_RaspberryControllerAC_Led);
    const act_RaspberryControllerAC_Raspberry = new Activity("RaspberryControllerAC", { component: "Raspberry", inputPorts: ["f"] });
    this.registerActivity("RaspberryControllerAC::Raspberry", act_RaspberryControllerAC_Raspberry);
    const act_RaspberryControllerAC_Camera = new Activity("RaspberryControllerAC", { component: "Camera", inputPorts: ["f"] });
    this.registerActivity("RaspberryControllerAC::Camera", act_RaspberryControllerAC_Camera);
    const act_RaspberryControllerAC_cm = new Activity("RaspberryControllerAC", { component: "cm", inputPorts: ["f"] });
    this.registerActivity("RaspberryControllerAC::cm", act_RaspberryControllerAC_cm);
    const act_RaspberryControllerAC_tc = new Activity("RaspberryControllerAC", { component: "tc", inputPorts: ["presence"] });
    this.registerActivity("RaspberryControllerAC::tc", act_RaspberryControllerAC_tc);
    const act_RaspberryControllerAC_sqlite = new Activity("RaspberryControllerAC", { component: "sqlite", inputPorts: ["ri"] });
    this.registerActivity("RaspberryControllerAC::sqlite", act_RaspberryControllerAC_sqlite);
    const act_RaspberryControllerAC_f = new Activity("RaspberryControllerAC", { component: "f", inputPorts: ["u"] });
    this.registerActivity("RaspberryControllerAC::f", act_RaspberryControllerAC_f);
    const act_RaspberryControllerAC_acc = new Activity("RaspberryControllerAC", { component: "acc", inputPorts: ["u"] });
    this.registerActivity("RaspberryControllerAC::acc", act_RaspberryControllerAC_acc);
    const act_RaspberryControllerAC_rc = new Activity("RaspberryControllerAC", { component: "rc", inputPorts: ["ci"] });
    this.registerActivity("RaspberryControllerAC::rc", act_RaspberryControllerAC_rc);
    const act_RaspberryControllerAC_rg = new Activity("RaspberryControllerAC", { component: "rg", inputPorts: ["a"] });
    this.registerActivity("RaspberryControllerAC::rg", act_RaspberryControllerAC_rg);
    const act_RaspberryControllerAC_gg = new Activity("RaspberryControllerAC", { component: "gg", inputPorts: ["db"] });
    this.registerActivity("RaspberryControllerAC::gg", act_RaspberryControllerAC_gg);
    const act_RaspberryControllerAC_hc = new Activity("RaspberryControllerAC", { component: "hc", inputPorts: ["u"] });
    this.registerActivity("RaspberryControllerAC::hc", act_RaspberryControllerAC_hc);
    const act_TemperatureControllerAC_tc = new Activity("TemperatureControllerAC", { component: "tc", inputPorts: ["presence"] });
    this.registerActivity("TemperatureControllerAC::tc", act_TemperatureControllerAC_tc);
    const act_UpdateContextSensorsAC_spw = new Activity("UpdateContextSensorsAC", { component: "spw", inputPorts: ["a","rr"] });
    this.registerActivity("UpdateContextSensorsAC::spw", act_UpdateContextSensorsAC_spw);
    const act_UpdateContextSensorsAC_rrs = new Activity("UpdateContextSensorsAC", { component: "rrs", inputPorts: ["ri"] });
    this.registerActivity("UpdateContextSensorsAC::rrs", act_UpdateContextSensorsAC_rrs);
    const act_UpdateContextSensorsAC_ocb = new Activity("UpdateContextSensorsAC", { component: "ocb", inputPorts: ["ci"] });
    this.registerActivity("UpdateContextSensorsAC::ocb", act_UpdateContextSensorsAC_ocb);
    const act_UpdateContextSensorsAC_ths = new Activity("UpdateContextSensorsAC", { component: "ths", inputPorts: ["temperature"] });
    this.registerActivity("UpdateContextSensorsAC::ths", act_UpdateContextSensorsAC_ths);
    const act_UpdateContextSensorsAC_ps = new Activity("UpdateContextSensorsAC", { component: "ps", inputPorts: ["presence"] });
    this.registerActivity("UpdateContextSensorsAC::ps", act_UpdateContextSensorsAC_ps);
    const act_UpdateContextSensorsAC_psql = new Activity("UpdateContextSensorsAC", { component: "psql", inputPorts: ["db"] });
    this.registerActivity("UpdateContextSensorsAC::psql", act_UpdateContextSensorsAC_psql);
    const act_UpdateContextSensorsAC_ac = new Activity("UpdateContextSensorsAC", { component: "ac", inputPorts: ["is"] });
    this.registerActivity("UpdateContextSensorsAC::ac", act_UpdateContextSensorsAC_ac);
    const act_UpdateContextSensorsAC_Led = new Activity("UpdateContextSensorsAC", { component: "Led", inputPorts: ["c"] });
    this.registerActivity("UpdateContextSensorsAC::Led", act_UpdateContextSensorsAC_Led);
    const act_UpdateContextSensorsAC_Raspberry = new Activity("UpdateContextSensorsAC", { component: "Raspberry", inputPorts: ["c"] });
    this.registerActivity("UpdateContextSensorsAC::Raspberry", act_UpdateContextSensorsAC_Raspberry);
    const act_UpdateContextSensorsAC_Camera = new Activity("UpdateContextSensorsAC", { component: "Camera", inputPorts: ["f"] });
    this.registerActivity("UpdateContextSensorsAC::Camera", act_UpdateContextSensorsAC_Camera);
    const act_UpdateContextSensorsAC_cm = new Activity("UpdateContextSensorsAC", { component: "cm", inputPorts: ["f"] });
    this.registerActivity("UpdateContextSensorsAC::cm", act_UpdateContextSensorsAC_cm);
    const act_UpdateContextSensorsAC_tc = new Activity("UpdateContextSensorsAC", { component: "tc", inputPorts: ["presence"] });
    this.registerActivity("UpdateContextSensorsAC::tc", act_UpdateContextSensorsAC_tc);
    const act_UpdateContextSensorsAC_sqlite = new Activity("UpdateContextSensorsAC", { component: "sqlite", inputPorts: ["ri"] });
    this.registerActivity("UpdateContextSensorsAC::sqlite", act_UpdateContextSensorsAC_sqlite);
    const act_UpdateContextSensorsAC_f = new Activity("UpdateContextSensorsAC", { component: "f", inputPorts: ["u"] });
    this.registerActivity("UpdateContextSensorsAC::f", act_UpdateContextSensorsAC_f);
    const act_UpdateContextSensorsAC_acc = new Activity("UpdateContextSensorsAC", { component: "acc", inputPorts: ["u"] });
    this.registerActivity("UpdateContextSensorsAC::acc", act_UpdateContextSensorsAC_acc);
    const act_UpdateContextSensorsAC_rc = new Activity("UpdateContextSensorsAC", { component: "rc", inputPorts: ["ci"] });
    this.registerActivity("UpdateContextSensorsAC::rc", act_UpdateContextSensorsAC_rc);
    const act_UpdateContextSensorsAC_rg = new Activity("UpdateContextSensorsAC", { component: "rg", inputPorts: ["a"] });
    this.registerActivity("UpdateContextSensorsAC::rg", act_UpdateContextSensorsAC_rg);
    const act_UpdateContextSensorsAC_gg = new Activity("UpdateContextSensorsAC", { component: "gg", inputPorts: ["db"] });
    this.registerActivity("UpdateContextSensorsAC::gg", act_UpdateContextSensorsAC_gg);
    const act_UpdateContextSensorsAC_hc = new Activity("UpdateContextSensorsAC", { component: "hc", inputPorts: ["rr"] });
    this.registerActivity("UpdateContextSensorsAC::hc", act_UpdateContextSensorsAC_hc);
    // connector qdb
    const conn_qdb_1 = new Connector("qdb");
    __attachEndpoint(conn_qdb_1, this.psql, "db");
    __attachEndpoint(conn_qdb_1, this.psql, "db");
    this.addConnector(conn_qdb_1);
    // connector x.x__psql.db_x.x__psql.db
    const conn_x_x__psql_db_x_x__psql_db_2 = new Connector("x.x__psql.db_x.x__psql.db");
    __attachEndpoint(conn_x_x__psql_db_x_x__psql_db_2, this.psql, "db");
    __attachEndpoint(conn_x_x__psql_db_x_x__psql_db_2, this.psql, "db");
    __attachEndpoint(conn_x_x__psql_db_x_x__psql_db_2, this.psql, "db");
    this.addConnector(conn_x_x__psql_db_x_x__psql_db_2);
    // connector x.x__psql.db_x.x__psql.db
    const conn_x_x__psql_db_x_x__psql_db_3 = new Connector("x.x__psql.db_x.x__psql.db");
    __attachEndpoint(conn_x_x__psql_db_x_x__psql_db_3, this.psql, "db");
    __attachEndpoint(conn_x_x__psql_db_x_x__psql_db_3, this.psql, "db");
    __attachEndpoint(conn_x_x__psql_db_x_x__psql_db_3, this.psql, "db");
    this.addConnector(conn_x_x__psql_db_x_x__psql_db_3);
    // connector spsqli
    const conn_spsqli_4 = new Connector("spsqli");
    __attachEndpoint(conn_spsqli_4, this.spw, "u");
    this.addConnector(conn_spsqli_4);
    // connector uSpw.uSpw__u.u_uSpw.uSpw__u.u
    const conn_uSpw_uSpw__u_u_uSpw_uSpw__u_u_5 = new Connector("uSpw.uSpw__u.u_uSpw.uSpw__u.u");
    __attachEndpoint(conn_uSpw_uSpw__u_u_uSpw_uSpw__u_u_5, this.spw, "u");
    __attachEndpoint(conn_uSpw_uSpw__u_u_uSpw_uSpw__u_u_5, this.spw, "u");
    this.addConnector(conn_uSpw_uSpw__u_u_uSpw_uSpw__u_u_5);
    // connector uSpw.uSpw__u.u_uSpw.uSpw__u.u
    const conn_uSpw_uSpw__u_u_uSpw_uSpw__u_u_6 = new Connector("uSpw.uSpw__u.u_uSpw.uSpw__u.u");
    __attachEndpoint(conn_uSpw_uSpw__u_u_uSpw_uSpw__u_u_6, this.spw, "u");
    __attachEndpoint(conn_uSpw_uSpw__u_u_uSpw_uSpw__u_u_6, this.spw, "u");
    this.addConnector(conn_uSpw_uSpw__u_u_uSpw_uSpw__u_u_6);
    // connector ci1
    const conn_ci1_7 = new Connector("ci1");
    __attachEndpoint(conn_ci1_7, this.spw, "coSpw");
    __attachEndpoint(conn_ci1_7, this.ocb, "ci");
    __attachEndpoint(conn_ci1_7, this.spw, "coSpw");
    __attachEndpoint(conn_ci1_7, this.ocb, "ci");
    this.addConnector(conn_ci1_7);
    // connector spw.coSpw__ocb.ci_spw.coSpw__ocb.ci
    const conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_8 = new Connector("spw.coSpw__ocb.ci_spw.coSpw__ocb.ci");
    __attachEndpoint(conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_8, this.spw, "coSpw");
    __attachEndpoint(conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_8, this.ocb, "ci");
    __attachEndpoint(conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_8, this.spw, "coSpw");
    __attachEndpoint(conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_8, this.ocb, "ci");
    __attachEndpoint(conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_8, this.spw, "coSpw");
    __attachEndpoint(conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_8, this.ocb, "ci");
    this.addConnector(conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_8);
    // connector spw.coSpw__ocb.ci_spw.coSpw__ocb.ci
    const conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_9 = new Connector("spw.coSpw__ocb.ci_spw.coSpw__ocb.ci");
    __attachEndpoint(conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_9, this.spw, "coSpw");
    __attachEndpoint(conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_9, this.ocb, "ci");
    __attachEndpoint(conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_9, this.spw, "coSpw");
    __attachEndpoint(conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_9, this.ocb, "ci");
    __attachEndpoint(conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_9, this.spw, "coSpw");
    __attachEndpoint(conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_9, this.ocb, "ci");
    this.addConnector(conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_9);
    // connector c
    const conn_c_10 = new Connector("c");
    __attachEndpoint(conn_c_10, this.spw, "ctx");
    this.addConnector(conn_c_10);
    // connector ctx.ctx__ctxSpw.ctxSpw_ctx.ctx__ctxSpw.ctxSpw
    const conn_ctx_ctx__ctxSpw_ctxSpw_ctx_ctx__ctxSpw_ctxSpw_11 = new Connector("ctx.ctx__ctxSpw.ctxSpw_ctx.ctx__ctxSpw.ctxSpw");
    __attachEndpoint(conn_ctx_ctx__ctxSpw_ctxSpw_ctx_ctx__ctxSpw_ctxSpw_11, this.spw, "ctx");
    __attachEndpoint(conn_ctx_ctx__ctxSpw_ctxSpw_ctx_ctx__ctxSpw_ctxSpw_11, this.spw, "ctx");
    this.addConnector(conn_ctx_ctx__ctxSpw_ctxSpw_ctx_ctx__ctxSpw_ctxSpw_11);
    // connector ctx.ctx__ctxSpw.ctxSpw_ctx.ctx__ctxSpw.ctxSpw
    const conn_ctx_ctx__ctxSpw_ctxSpw_ctx_ctx__ctxSpw_ctxSpw_12 = new Connector("ctx.ctx__ctxSpw.ctxSpw_ctx.ctx__ctxSpw.ctxSpw");
    __attachEndpoint(conn_ctx_ctx__ctxSpw_ctxSpw_ctx_ctx__ctxSpw_ctxSpw_12, this.spw, "ctx");
    __attachEndpoint(conn_ctx_ctx__ctxSpw_ctxSpw_ctx_ctx__ctxSpw_ctxSpw_12, this.spw, "ctx");
    this.addConnector(conn_ctx_ctx__ctxSpw_ctxSpw_ctx_ctx__ctxSpw_ctxSpw_12);
    // connector cr
    const conn_cr_13 = new Connector("cr");
    __attachEndpoint(conn_cr_13, this.spw, "rr");
    this.addConnector(conn_cr_13);
    // connector rr.rr__rrSpw.rrSpw_rr.rr__rrSpw.rrSpw
    const conn_rr_rr__rrSpw_rrSpw_rr_rr__rrSpw_rrSpw_14 = new Connector("rr.rr__rrSpw.rrSpw_rr.rr__rrSpw.rrSpw");
    __attachEndpoint(conn_rr_rr__rrSpw_rrSpw_rr_rr__rrSpw_rrSpw_14, this.spw, "rr");
    __attachEndpoint(conn_rr_rr__rrSpw_rrSpw_rr_rr__rrSpw_rrSpw_14, this.spw, "rr");
    this.addConnector(conn_rr_rr__rrSpw_rrSpw_rr_rr__rrSpw_rrSpw_14);
    // connector rr.rr__rrSpw.rrSpw_rr.rr__rrSpw.rrSpw
    const conn_rr_rr__rrSpw_rrSpw_rr_rr__rrSpw_rrSpw_15 = new Connector("rr.rr__rrSpw.rrSpw_rr.rr__rrSpw.rrSpw");
    __attachEndpoint(conn_rr_rr__rrSpw_rrSpw_rr_rr__rrSpw_rrSpw_15, this.spw, "rr");
    __attachEndpoint(conn_rr_rr__rrSpw_rrSpw_rr_rr__rrSpw_rrSpw_15, this.spw, "rr");
    this.addConnector(conn_rr_rr__rrSpw_rrSpw_rr_rr__rrSpw_rrSpw_15);
    // connector sendPresence
    const conn_sendPresence_16 = new Connector("sendPresence");
    __attachEndpoint(conn_sendPresence_16, this.ps, "presence");
    __attachEndpoint(conn_sendPresence_16, this.ps, "presence");
    this.addConnector(conn_sendPresence_16);
    // connector ps.presence__x.x_ps.presence__x.x
    const conn_ps_presence__x_x_ps_presence__x_x_17 = new Connector("ps.presence__x.x_ps.presence__x.x");
    __attachEndpoint(conn_ps_presence__x_x_ps_presence__x_x_17, this.ps, "presence");
    __attachEndpoint(conn_ps_presence__x_x_ps_presence__x_x_17, this.ps, "presence");
    __attachEndpoint(conn_ps_presence__x_x_ps_presence__x_x_17, this.ps, "presence");
    this.addConnector(conn_ps_presence__x_x_ps_presence__x_x_17);
    // connector ps.presence__x.x_ps.presence__x.x
    const conn_ps_presence__x_x_ps_presence__x_x_18 = new Connector("ps.presence__x.x_ps.presence__x.x");
    __attachEndpoint(conn_ps_presence__x_x_ps_presence__x_x_18, this.ps, "presence");
    __attachEndpoint(conn_ps_presence__x_x_ps_presence__x_x_18, this.ps, "presence");
    __attachEndpoint(conn_ps_presence__x_x_ps_presence__x_x_18, this.ps, "presence");
    this.addConnector(conn_ps_presence__x_x_ps_presence__x_x_18);
    // connector fl
    const conn_fl_19 = new Connector("fl");
    __attachEndpoint(conn_fl_19, this.Camera, "f");
    __attachEndpoint(conn_fl_19, this.Camera, "f");
    this.addConnector(conn_fl_19);
    // connector Camera.f__x.x_Camera.f__x.x
    const conn_Camera_f__x_x_Camera_f__x_x_20 = new Connector("Camera.f__x.x_Camera.f__x.x");
    __attachEndpoint(conn_Camera_f__x_x_Camera_f__x_x_20, this.Camera, "f");
    __attachEndpoint(conn_Camera_f__x_x_Camera_f__x_x_20, this.Camera, "f");
    __attachEndpoint(conn_Camera_f__x_x_Camera_f__x_x_20, this.Camera, "f");
    this.addConnector(conn_Camera_f__x_x_Camera_f__x_x_20);
    // connector Camera.f__x.x_Camera.f__x.x
    const conn_Camera_f__x_x_Camera_f__x_x_21 = new Connector("Camera.f__x.x_Camera.f__x.x");
    __attachEndpoint(conn_Camera_f__x_x_Camera_f__x_x_21, this.Camera, "f");
    __attachEndpoint(conn_Camera_f__x_x_Camera_f__x_x_21, this.Camera, "f");
    __attachEndpoint(conn_Camera_f__x_x_Camera_f__x_x_21, this.Camera, "f");
    this.addConnector(conn_Camera_f__x_x_Camera_f__x_x_21);
    // connector sendTempHumi
    const conn_sendTempHumi_22 = new Connector("sendTempHumi");
    __attachEndpoint(conn_sendTempHumi_22, this.ths, "temperature");
    __attachEndpoint(conn_sendTempHumi_22, this.ths, "temperature");
    this.addConnector(conn_sendTempHumi_22);
    // connector ths.temperature__x.x_ths.temperature__x.x
    const conn_ths_temperature__x_x_ths_temperature__x_x_23 = new Connector("ths.temperature__x.x_ths.temperature__x.x");
    __attachEndpoint(conn_ths_temperature__x_x_ths_temperature__x_x_23, this.ths, "temperature");
    __attachEndpoint(conn_ths_temperature__x_x_ths_temperature__x_x_23, this.ths, "temperature");
    __attachEndpoint(conn_ths_temperature__x_x_ths_temperature__x_x_23, this.ths, "temperature");
    this.addConnector(conn_ths_temperature__x_x_ths_temperature__x_x_23);
    // connector ths.temperature__x.x_ths.temperature__x.x
    const conn_ths_temperature__x_x_ths_temperature__x_x_24 = new Connector("ths.temperature__x.x_ths.temperature__x.x");
    __attachEndpoint(conn_ths_temperature__x_x_ths_temperature__x_x_24, this.ths, "temperature");
    __attachEndpoint(conn_ths_temperature__x_x_ths_temperature__x_x_24, this.ths, "temperature");
    __attachEndpoint(conn_ths_temperature__x_x_ths_temperature__x_x_24, this.ths, "temperature");
    this.addConnector(conn_ths_temperature__x_x_ths_temperature__x_x_24);
    // connector rn
    const conn_rn_25 = new Connector("rn");
    __attachEndpoint(conn_rn_25, this.Raspberry.sqlite, "ri");
    __attachEndpoint(conn_rn_25, this.rrs, "ri");
    __attachEndpoint(conn_rn_25, this.Raspberry.sqlite, "ri");
    __attachEndpoint(conn_rn_25, this.rrs, "ri");
    this.addConnector(conn_rn_25);
    // connector sqlite.ri__rrs.ri_sqlite.ri__rrs.ri
    const conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_26 = new Connector("sqlite.ri__rrs.ri_sqlite.ri__rrs.ri");
    __attachEndpoint(conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_26, this.Raspberry.sqlite, "ri");
    __attachEndpoint(conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_26, this.rrs, "ri");
    __attachEndpoint(conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_26, this.Raspberry.sqlite, "ri");
    __attachEndpoint(conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_26, this.rrs, "ri");
    __attachEndpoint(conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_26, this.Raspberry.sqlite, "ri");
    __attachEndpoint(conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_26, this.rrs, "ri");
    this.addConnector(conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_26);
    // connector sqlite.ri__rrs.ri_sqlite.ri__rrs.ri
    const conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_27 = new Connector("sqlite.ri__rrs.ri_sqlite.ri__rrs.ri");
    __attachEndpoint(conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_27, this.Raspberry.sqlite, "ri");
    __attachEndpoint(conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_27, this.rrs, "ri");
    __attachEndpoint(conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_27, this.Raspberry.sqlite, "ri");
    __attachEndpoint(conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_27, this.rrs, "ri");
    __attachEndpoint(conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_27, this.Raspberry.sqlite, "ri");
    __attachEndpoint(conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_27, this.rrs, "ri");
    this.addConnector(conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_27);
    // connector ic
    const conn_ic_28 = new Connector("ic");
    __attachEndpoint(conn_ic_28, this.Raspberry, "c");
    __attachEndpoint(conn_ic_28, this.Led, "cLed");
    __attachEndpoint(conn_ic_28, this.Raspberry, "c");
    __attachEndpoint(conn_ic_28, this.Led, "cLed");
    this.addConnector(conn_ic_28);
    // connector Raspberry.c__Led.cLed_Raspberry.c__Led.cLed
    const conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_29 = new Connector("Raspberry.c__Led.cLed_Raspberry.c__Led.cLed");
    __attachEndpoint(conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_29, this.Raspberry, "c");
    __attachEndpoint(conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_29, this.Led, "cLed");
    __attachEndpoint(conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_29, this.Raspberry, "c");
    __attachEndpoint(conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_29, this.Led, "cLed");
    __attachEndpoint(conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_29, this.Raspberry, "c");
    __attachEndpoint(conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_29, this.Led, "cLed");
    this.addConnector(conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_29);
    // connector Raspberry.c__Led.cLed_Raspberry.c__Led.cLed
    const conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_30 = new Connector("Raspberry.c__Led.cLed_Raspberry.c__Led.cLed");
    __attachEndpoint(conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_30, this.Raspberry, "c");
    __attachEndpoint(conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_30, this.Led, "cLed");
    __attachEndpoint(conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_30, this.Raspberry, "c");
    __attachEndpoint(conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_30, this.Led, "cLed");
    __attachEndpoint(conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_30, this.Raspberry, "c");
    __attachEndpoint(conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_30, this.Led, "cLed");
    this.addConnector(conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_30);
    // connector is
    const conn_is_31 = new Connector("is");
    __attachEndpoint(conn_is_31, this.ac, "is");
    __attachEndpoint(conn_is_31, this.ac, "is");
    this.addConnector(conn_is_31);
    // connector x.x__ac.is_x.x__ac.is
    const conn_x_x__ac_is_x_x__ac_is_32 = new Connector("x.x__ac.is_x.x__ac.is");
    __attachEndpoint(conn_x_x__ac_is_x_x__ac_is_32, this.ac, "is");
    __attachEndpoint(conn_x_x__ac_is_x_x__ac_is_32, this.ac, "is");
    __attachEndpoint(conn_x_x__ac_is_x_x__ac_is_32, this.ac, "is");
    this.addConnector(conn_x_x__ac_is_x_x__ac_is_32);
    // connector x.x__ac.is_x.x__ac.is
    const conn_x_x__ac_is_x_x__ac_is_33 = new Connector("x.x__ac.is_x.x__ac.is");
    __attachEndpoint(conn_x_x__ac_is_x_x__ac_is_33, this.ac, "is");
    __attachEndpoint(conn_x_x__ac_is_x_x__ac_is_33, this.ac, "is");
    __attachEndpoint(conn_x_x__ac_is_x_x__ac_is_33, this.ac, "is");
    this.addConnector(conn_x_x__ac_is_x_x__ac_is_33);
    // connector countPeople
    const conn_countPeople_34 = new Connector("countPeople");
    __attachEndpoint(conn_countPeople_34, this.Raspberry, "numPeopleCm");
    __attachEndpoint(conn_countPeople_34, this.Raspberry, "numPeopleTc");
    this.addConnector(conn_countPeople_34);
    // connector numPeopleCm.numPeopleCm__numPeopleTc.numPeopleTc_numPeopleCm.numPeopleCm__numPeopleTc.numPeopleTc
    const conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_35 = new Connector("numPeopleCm.numPeopleCm__numPeopleTc.numPeopleTc_numPeopleCm.numPeopleCm__numPeopleTc.numPeopleTc");
    __attachEndpoint(conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_35, this.Raspberry, "numPeopleCm");
    __attachEndpoint(conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_35, this.Raspberry, "numPeopleTc");
    __attachEndpoint(conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_35, this.Raspberry, "numPeopleCm");
    __attachEndpoint(conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_35, this.Raspberry, "numPeopleTc");
    this.addConnector(conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_35);
    // connector numPeopleCm.numPeopleCm__numPeopleTc.numPeopleTc_numPeopleCm.numPeopleCm__numPeopleTc.numPeopleTc
    const conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_36 = new Connector("numPeopleCm.numPeopleCm__numPeopleTc.numPeopleTc_numPeopleCm.numPeopleCm__numPeopleTc.numPeopleTc");
    __attachEndpoint(conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_36, this.Raspberry, "numPeopleCm");
    __attachEndpoint(conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_36, this.Raspberry, "numPeopleTc");
    __attachEndpoint(conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_36, this.Raspberry, "numPeopleCm");
    __attachEndpoint(conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_36, this.Raspberry, "numPeopleTc");
    this.addConnector(conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_36);
    // connector rn
    const conn_rn_37 = new Connector("rn");
    __attachEndpoint(conn_rn_37, this.Raspberry.sqlite, "ri");
    __attachEndpoint(conn_rn_37, this.Raspberry.sqlite, "ri");
    this.addConnector(conn_rn_37);
    // connector x.x__sqlite.ri_x.x__sqlite.ri
    const conn_x_x__sqlite_ri_x_x__sqlite_ri_38 = new Connector("x.x__sqlite.ri_x.x__sqlite.ri");
    __attachEndpoint(conn_x_x__sqlite_ri_x_x__sqlite_ri_38, this.Raspberry.sqlite, "ri");
    __attachEndpoint(conn_x_x__sqlite_ri_x_x__sqlite_ri_38, this.Raspberry.sqlite, "ri");
    __attachEndpoint(conn_x_x__sqlite_ri_x_x__sqlite_ri_38, this.Raspberry.sqlite, "ri");
    this.addConnector(conn_x_x__sqlite_ri_x_x__sqlite_ri_38);
    // connector x.x__sqlite.ri_x.x__sqlite.ri
    const conn_x_x__sqlite_ri_x_x__sqlite_ri_39 = new Connector("x.x__sqlite.ri_x.x__sqlite.ri");
    __attachEndpoint(conn_x_x__sqlite_ri_x_x__sqlite_ri_39, this.Raspberry.sqlite, "ri");
    __attachEndpoint(conn_x_x__sqlite_ri_x_x__sqlite_ri_39, this.Raspberry.sqlite, "ri");
    __attachEndpoint(conn_x_x__sqlite_ri_x_x__sqlite_ri_39, this.Raspberry.sqlite, "ri");
    this.addConnector(conn_x_x__sqlite_ri_x_x__sqlite_ri_39);
    // connector u
    const conn_u_40 = new Connector("u");
    __attachEndpoint(conn_u_40, this.ac.acc, "u");
    __attachEndpoint(conn_u_40, this.ac.acc, "u");
    this.addConnector(conn_u_40);
    // connector x.x__acc.u_x.x__acc.u
    const conn_x_x__acc_u_x_x__acc_u_41 = new Connector("x.x__acc.u_x.x__acc.u");
    __attachEndpoint(conn_x_x__acc_u_x_x__acc_u_41, this.ac.acc, "u");
    __attachEndpoint(conn_x_x__acc_u_x_x__acc_u_41, this.ac.acc, "u");
    __attachEndpoint(conn_x_x__acc_u_x_x__acc_u_41, this.ac.acc, "u");
    this.addConnector(conn_x_x__acc_u_x_x__acc_u_41);
    // connector x.x__acc.u_x.x__acc.u
    const conn_x_x__acc_u_x_x__acc_u_42 = new Connector("x.x__acc.u_x.x__acc.u");
    __attachEndpoint(conn_x_x__acc_u_x_x__acc_u_42, this.ac.acc, "u");
    __attachEndpoint(conn_x_x__acc_u_x_x__acc_u_42, this.ac.acc, "u");
    __attachEndpoint(conn_x_x__acc_u_x_x__acc_u_42, this.ac.acc, "u");
    this.addConnector(conn_x_x__acc_u_x_x__acc_u_42);
  }
}

function createModel(){ return new SysADLArchitecture(); }
module.exports = { createModel, SysADLArchitecture };
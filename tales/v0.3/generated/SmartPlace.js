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
class SmartPlace extends Component { constructor(name){ super(name); } }

class SysADLArchitecture extends Model {
  constructor(){
    super("SysADLArchitecture");
    // instantiate components and expose as properties for direct navigation
    this.SmartPlace = new SmartPlace("SmartPlace");
    this.addComponent(this.SmartPlace);
    this.SmartPlace.ac = new AirConditioner("ac");
    this.SmartPlace.addComponent(this.SmartPlace.ac);
    this.SmartPlace.Camera = new Camera("Camera");
    this.SmartPlace.addComponent(this.SmartPlace.Camera);
    this.SmartPlace.Led = new Led("Led");
    this.SmartPlace.addComponent(this.SmartPlace.Led);
    this.SmartPlace.ocb = new OrionContextBroker("ocb");
    this.SmartPlace.addComponent(this.SmartPlace.ocb);
    this.SmartPlace.ps = new PresenceSensor("ps");
    this.SmartPlace.addComponent(this.SmartPlace.ps);
    this.SmartPlace.psql = new DB_PostgreSQL("psql");
    this.SmartPlace.addComponent(this.SmartPlace.psql);
    this.SmartPlace.Raspberry = new Raspberry("Raspberry");
    this.SmartPlace.addComponent(this.SmartPlace.Raspberry);
    this.SmartPlace.rrs = new RoomReservationSystem("rrs");
    this.SmartPlace.addComponent(this.SmartPlace.rrs);
    this.SmartPlace.spw = new SmartPlaceWeb("spw");
    this.SmartPlace.addComponent(this.SmartPlace.spw);
    this.SmartPlace.ths = new TemperatureAndHumiditySensor("ths");
    this.SmartPlace.addComponent(this.SmartPlace.ths);
    this.SmartPlace.ac.acc = new AirConditionerController("acc");
    this.SmartPlace.ac.addComponent(this.SmartPlace.ac.acc);
    this.SmartPlace.Raspberry.cm = new CamMonitor("cm");
    this.SmartPlace.Raspberry.addComponent(this.SmartPlace.Raspberry.cm);
    this.SmartPlace.ac.f = new Fotosensor("f");
    this.SmartPlace.ac.addComponent(this.SmartPlace.ac.f);
    this.SmartPlace.spw.gg = new GraphicsGenerator("gg");
    this.SmartPlace.spw.addComponent(this.SmartPlace.spw.gg);
    this.SmartPlace.spw.hc = new HistoricController("hc");
    this.SmartPlace.spw.addComponent(this.SmartPlace.spw.hc);
    this.SmartPlace.spw.rc = new RegistrationController("rc");
    this.SmartPlace.spw.addComponent(this.SmartPlace.spw.rc);
    this.SmartPlace.spw.rg = new ReportGenerator("rg");
    this.SmartPlace.spw.addComponent(this.SmartPlace.spw.rg);
    this.SmartPlace.Raspberry.sqlite = new DB_SQLite("sqlite");
    this.SmartPlace.Raspberry.addComponent(this.SmartPlace.Raspberry.sqlite);
    this.SmartPlace.Raspberry.tc = new TemperatureController("tc");
    this.SmartPlace.Raspberry.addComponent(this.SmartPlace.Raspberry.tc);

    // Note: uses runtime helpers addExecutableSafe and attachEndpointSafe provided by SysADLBase
    // port co on spw (expr: this.SmartPlace.spw)
    if (!this.SmartPlace.spw.ports["co"]) { const __p = new Port("co", 'in', { owner: "spw" }); this.SmartPlace.spw.addPort(__p); }
    // port rr on spw (expr: this.SmartPlace.spw)
    if (!this.SmartPlace.spw.ports["rr"]) { const __p = new Port("rr", 'in', { owner: "spw" }); this.SmartPlace.spw.addPort(__p); }
    // port db on spw (expr: this.SmartPlace.spw)
    if (!this.SmartPlace.spw.ports["db"]) { const __p = new Port("db", 'in', { owner: "spw" }); this.SmartPlace.spw.addPort(__p); }
    // port u on spw (expr: this.SmartPlace.spw)
    if (!this.SmartPlace.spw.ports["u"]) { const __p = new Port("u", 'in', { owner: "spw" }); this.SmartPlace.spw.addPort(__p); }
    // port ctx on spw (expr: this.SmartPlace.spw)
    if (!this.SmartPlace.spw.ports["ctx"]) { const __p = new Port("ctx", 'in', { owner: "spw" }); this.SmartPlace.spw.addPort(__p); }
    // port ciRc on spw (expr: this.SmartPlace.spw)
    if (!this.SmartPlace.spw.ports["ciRc"]) { const __p = new Port("ciRc", 'in', { owner: "spw" }); this.SmartPlace.spw.addPort(__p); }
    // port regUi on spw (expr: this.SmartPlace.spw)
    if (!this.SmartPlace.spw.ports["regUi"]) { const __p = new Port("regUi", 'in', { owner: "spw" }); this.SmartPlace.spw.addPort(__p); }
    // port a on spw (expr: this.SmartPlace.spw)
    if (!this.SmartPlace.spw.ports["a"]) { const __p = new Port("a", 'in', { owner: "spw" }); this.SmartPlace.spw.addPort(__p); }
    // port dbGg on spw (expr: this.SmartPlace.spw)
    if (!this.SmartPlace.spw.ports["dbGg"]) { const __p = new Port("dbGg", 'in', { owner: "spw" }); this.SmartPlace.spw.addPort(__p); }
    // port ctxGg on spw (expr: this.SmartPlace.spw)
    if (!this.SmartPlace.spw.ports["ctxGg"]) { const __p = new Port("ctxGg", 'in', { owner: "spw" }); this.SmartPlace.spw.addPort(__p); }
    // port rrHc on spw (expr: this.SmartPlace.spw)
    if (!this.SmartPlace.spw.ports["rrHc"]) { const __p = new Port("rrHc", 'in', { owner: "spw" }); this.SmartPlace.spw.addPort(__p); }
    // port uHc on spw (expr: this.SmartPlace.spw)
    if (!this.SmartPlace.spw.ports["uHc"]) { const __p = new Port("uHc", 'in', { owner: "spw" }); this.SmartPlace.spw.addPort(__p); }
    // port ctxHc on spw (expr: this.SmartPlace.spw)
    if (!this.SmartPlace.spw.ports["ctxHc"]) { const __p = new Port("ctxHc", 'in', { owner: "spw" }); this.SmartPlace.spw.addPort(__p); }
    // port ri on rrs (expr: this.SmartPlace.rrs)
    if (!this.SmartPlace.rrs.ports["ri"]) { const __p = new Port("ri", 'in', { owner: "rrs" }); this.SmartPlace.rrs.addPort(__p); }
    // port ci on ocb (expr: this.SmartPlace.ocb)
    if (!this.SmartPlace.ocb.ports["ci"]) { const __p = new Port("ci", 'in', { owner: "ocb" }); this.SmartPlace.ocb.addPort(__p); }
    // port ctx on ocb (expr: this.SmartPlace.ocb)
    if (!this.SmartPlace.ocb.ports["ctx"]) { const __p = new Port("ctx", 'in', { owner: "ocb" }); this.SmartPlace.ocb.addPort(__p); }
    // port temperature on ths (expr: this.SmartPlace.ths)
    if (!this.SmartPlace.ths.ports["temperature"]) { const __p = new Port("temperature", 'in', { owner: "ths" }); this.SmartPlace.ths.addPort(__p); }
    // port presence on ps (expr: this.SmartPlace.ps)
    if (!this.SmartPlace.ps.ports["presence"]) { const __p = new Port("presence", 'in', { owner: "ps" }); this.SmartPlace.ps.addPort(__p); }
    // port db on psql (expr: this.SmartPlace.psql)
    if (!this.SmartPlace.psql.ports["db"]) { const __p = new Port("db", 'in', { owner: "psql" }); this.SmartPlace.psql.addPort(__p); }
    // port u on psql (expr: this.SmartPlace.psql)
    if (!this.SmartPlace.psql.ports["u"]) { const __p = new Port("u", 'in', { owner: "psql" }); this.SmartPlace.psql.addPort(__p); }
    // port is on ac (expr: this.SmartPlace.ac)
    if (!this.SmartPlace.ac.ports["is"]) { const __p = new Port("is", 'in', { owner: "ac" }); this.SmartPlace.ac.addPort(__p); }
    // port uF on ac (expr: this.SmartPlace.ac)
    if (!this.SmartPlace.ac.ports["uF"]) { const __p = new Port("uF", 'in', { owner: "ac" }); this.SmartPlace.ac.addPort(__p); }
    // port isF on ac (expr: this.SmartPlace.ac)
    if (!this.SmartPlace.ac.ports["isF"]) { const __p = new Port("isF", 'in', { owner: "ac" }); this.SmartPlace.ac.addPort(__p); }
    // port uAcc on ac (expr: this.SmartPlace.ac)
    if (!this.SmartPlace.ac.ports["uAcc"]) { const __p = new Port("uAcc", 'in', { owner: "ac" }); this.SmartPlace.ac.addPort(__p); }
    // port c on Led (expr: this.SmartPlace.Led)
    if (!this.SmartPlace.Led.ports["c"]) { const __p = new Port("c", 'in', { owner: "Led" }); this.SmartPlace.Led.addPort(__p); }
    // port is on Led (expr: this.SmartPlace.Led)
    if (!this.SmartPlace.Led.ports["is"]) { const __p = new Port("is", 'in', { owner: "Led" }); this.SmartPlace.Led.addPort(__p); }
    // port c on Raspberry (expr: this.SmartPlace.Raspberry)
    if (!this.SmartPlace.Raspberry.ports["c"]) { const __p = new Port("c", 'in', { owner: "Raspberry" }); this.SmartPlace.Raspberry.addPort(__p); }
    // port ri on Raspberry (expr: this.SmartPlace.Raspberry)
    if (!this.SmartPlace.Raspberry.ports["ri"]) { const __p = new Port("ri", 'in', { owner: "Raspberry" }); this.SmartPlace.Raspberry.addPort(__p); }
    // port f on Raspberry (expr: this.SmartPlace.Raspberry)
    if (!this.SmartPlace.Raspberry.ports["f"]) { const __p = new Port("f", 'in', { owner: "Raspberry" }); this.SmartPlace.Raspberry.addPort(__p); }
    // port temperature on Raspberry (expr: this.SmartPlace.Raspberry)
    if (!this.SmartPlace.Raspberry.ports["temperature"]) { const __p = new Port("temperature", 'in', { owner: "Raspberry" }); this.SmartPlace.Raspberry.addPort(__p); }
    // port presence on Raspberry (expr: this.SmartPlace.Raspberry)
    if (!this.SmartPlace.Raspberry.ports["presence"]) { const __p = new Port("presence", 'in', { owner: "Raspberry" }); this.SmartPlace.Raspberry.addPort(__p); }
    // port rr on Raspberry (expr: this.SmartPlace.Raspberry)
    if (!this.SmartPlace.Raspberry.ports["rr"]) { const __p = new Port("rr", 'in', { owner: "Raspberry" }); this.SmartPlace.Raspberry.addPort(__p); }
    // port fCm on Raspberry (expr: this.SmartPlace.Raspberry)
    if (!this.SmartPlace.Raspberry.ports["fCm"]) { const __p = new Port("fCm", 'in', { owner: "Raspberry" }); this.SmartPlace.Raspberry.addPort(__p); }
    // port numPeopleCm on Raspberry (expr: this.SmartPlace.Raspberry)
    if (!this.SmartPlace.Raspberry.ports["numPeopleCm"]) { const __p = new Port("numPeopleCm", 'in', { owner: "Raspberry" }); this.SmartPlace.Raspberry.addPort(__p); }
    // port presenceTc on Raspberry (expr: this.SmartPlace.Raspberry)
    if (!this.SmartPlace.Raspberry.ports["presenceTc"]) { const __p = new Port("presenceTc", 'in', { owner: "Raspberry" }); this.SmartPlace.Raspberry.addPort(__p); }
    // port rraspTc on Raspberry (expr: this.SmartPlace.Raspberry)
    if (!this.SmartPlace.Raspberry.ports["rraspTc"]) { const __p = new Port("rraspTc", 'in', { owner: "Raspberry" }); this.SmartPlace.Raspberry.addPort(__p); }
    // port riTc on Raspberry (expr: this.SmartPlace.Raspberry)
    if (!this.SmartPlace.Raspberry.ports["riTc"]) { const __p = new Port("riTc", 'in', { owner: "Raspberry" }); this.SmartPlace.Raspberry.addPort(__p); }
    // port temperatureTc on Raspberry (expr: this.SmartPlace.Raspberry)
    if (!this.SmartPlace.Raspberry.ports["temperatureTc"]) { const __p = new Port("temperatureTc", 'in', { owner: "Raspberry" }); this.SmartPlace.Raspberry.addPort(__p); }
    // port numPeopleTc on Raspberry (expr: this.SmartPlace.Raspberry)
    if (!this.SmartPlace.Raspberry.ports["numPeopleTc"]) { const __p = new Port("numPeopleTc", 'in', { owner: "Raspberry" }); this.SmartPlace.Raspberry.addPort(__p); }
    // port cTc on Raspberry (expr: this.SmartPlace.Raspberry)
    if (!this.SmartPlace.Raspberry.ports["cTc"]) { const __p = new Port("cTc", 'in', { owner: "Raspberry" }); this.SmartPlace.Raspberry.addPort(__p); }
    // port rresp on Raspberry (expr: this.SmartPlace.Raspberry)
    if (!this.SmartPlace.Raspberry.ports["rresp"]) { const __p = new Port("rresp", 'in', { owner: "Raspberry" }); this.SmartPlace.Raspberry.addPort(__p); }
    // port f on Camera (expr: this.SmartPlace.Camera)
    if (!this.SmartPlace.Camera.ports["f"]) { const __p = new Port("f", 'in', { owner: "Camera" }); this.SmartPlace.Camera.addPort(__p); }
    // port f on cm (expr: this.SmartPlace.Raspberry.cm)
    if (!this.SmartPlace.Raspberry.cm.ports["f"]) { const __p = new Port("f", 'in', { owner: "cm" }); this.SmartPlace.Raspberry.cm.addPort(__p); }
    // port numPeople on cm (expr: this.SmartPlace.Raspberry.cm)
    if (!this.SmartPlace.Raspberry.cm.ports["numPeople"]) { const __p = new Port("numPeople", 'in', { owner: "cm" }); this.SmartPlace.Raspberry.cm.addPort(__p); }
    // port presence on tc (expr: this.SmartPlace.Raspberry.tc)
    if (!this.SmartPlace.Raspberry.tc.ports["presence"]) { const __p = new Port("presence", 'in', { owner: "tc" }); this.SmartPlace.Raspberry.tc.addPort(__p); }
    // port rrasp on tc (expr: this.SmartPlace.Raspberry.tc)
    if (!this.SmartPlace.Raspberry.tc.ports["rrasp"]) { const __p = new Port("rrasp", 'in', { owner: "tc" }); this.SmartPlace.Raspberry.tc.addPort(__p); }
    // port ri on tc (expr: this.SmartPlace.Raspberry.tc)
    if (!this.SmartPlace.Raspberry.tc.ports["ri"]) { const __p = new Port("ri", 'in', { owner: "tc" }); this.SmartPlace.Raspberry.tc.addPort(__p); }
    // port temperature on tc (expr: this.SmartPlace.Raspberry.tc)
    if (!this.SmartPlace.Raspberry.tc.ports["temperature"]) { const __p = new Port("temperature", 'in', { owner: "tc" }); this.SmartPlace.Raspberry.tc.addPort(__p); }
    // port numPeople on tc (expr: this.SmartPlace.Raspberry.tc)
    if (!this.SmartPlace.Raspberry.tc.ports["numPeople"]) { const __p = new Port("numPeople", 'in', { owner: "tc" }); this.SmartPlace.Raspberry.tc.addPort(__p); }
    // port c on tc (expr: this.SmartPlace.Raspberry.tc)
    if (!this.SmartPlace.Raspberry.tc.ports["c"]) { const __p = new Port("c", 'in', { owner: "tc" }); this.SmartPlace.Raspberry.tc.addPort(__p); }
    // port ri on sqlite (expr: this.SmartPlace.Raspberry.sqlite)
    if (!this.SmartPlace.Raspberry.sqlite.ports["ri"]) { const __p = new Port("ri", 'in', { owner: "sqlite" }); this.SmartPlace.Raspberry.sqlite.addPort(__p); }
    // port rresp on sqlite (expr: this.SmartPlace.Raspberry.sqlite)
    if (!this.SmartPlace.Raspberry.sqlite.ports["rresp"]) { const __p = new Port("rresp", 'in', { owner: "sqlite" }); this.SmartPlace.Raspberry.sqlite.addPort(__p); }
    // port u on f (expr: this.SmartPlace.ac.f)
    if (!this.SmartPlace.ac.f.ports["u"]) { const __p = new Port("u", 'in', { owner: "f" }); this.SmartPlace.ac.f.addPort(__p); }
    // port is on f (expr: this.SmartPlace.ac.f)
    if (!this.SmartPlace.ac.f.ports["is"]) { const __p = new Port("is", 'in', { owner: "f" }); this.SmartPlace.ac.f.addPort(__p); }
    // port u on acc (expr: this.SmartPlace.ac.acc)
    if (!this.SmartPlace.ac.acc.ports["u"]) { const __p = new Port("u", 'in', { owner: "acc" }); this.SmartPlace.ac.acc.addPort(__p); }
    // port ci on rc (expr: this.SmartPlace.spw.rc)
    if (!this.SmartPlace.spw.rc.ports["ci"]) { const __p = new Port("ci", 'in', { owner: "rc" }); this.SmartPlace.spw.rc.addPort(__p); }
    // port regUi on rc (expr: this.SmartPlace.spw.rc)
    if (!this.SmartPlace.spw.rc.ports["regUi"]) { const __p = new Port("regUi", 'in', { owner: "rc" }); this.SmartPlace.spw.rc.addPort(__p); }
    // port a on rg (expr: this.SmartPlace.spw.rg)
    if (!this.SmartPlace.spw.rg.ports["a"]) { const __p = new Port("a", 'in', { owner: "rg" }); this.SmartPlace.spw.rg.addPort(__p); }
    // port db on gg (expr: this.SmartPlace.spw.gg)
    if (!this.SmartPlace.spw.gg.ports["db"]) { const __p = new Port("db", 'in', { owner: "gg" }); this.SmartPlace.spw.gg.addPort(__p); }
    // port ctx on gg (expr: this.SmartPlace.spw.gg)
    if (!this.SmartPlace.spw.gg.ports["ctx"]) { const __p = new Port("ctx", 'in', { owner: "gg" }); this.SmartPlace.spw.gg.addPort(__p); }
    // port rr on hc (expr: this.SmartPlace.spw.hc)
    if (!this.SmartPlace.spw.hc.ports["rr"]) { const __p = new Port("rr", 'in', { owner: "hc" }); this.SmartPlace.spw.hc.addPort(__p); }
    // port u on hc (expr: this.SmartPlace.spw.hc)
    if (!this.SmartPlace.spw.hc.ports["u"]) { const __p = new Port("u", 'in', { owner: "hc" }); this.SmartPlace.spw.hc.addPort(__p); }
    // port ctx on hc (expr: this.SmartPlace.spw.hc)
    if (!this.SmartPlace.spw.hc.ports["ctx"]) { const __p = new Port("ctx", 'in', { owner: "hc" }); this.SmartPlace.spw.hc.addPort(__p); }
    // ensure activity ports for spw (expr: this.SmartPlace.spw)
    // ensure activity ports for rrs (expr: this.SmartPlace.rrs)
    // ensure activity ports for ocb (expr: this.SmartPlace.ocb)
    // ensure activity ports for ths (expr: this.SmartPlace.ths)
    // ensure activity ports for ps (expr: this.SmartPlace.ps)
    // ensure activity ports for psql (expr: this.SmartPlace.psql)
    // ensure activity ports for ac (expr: this.SmartPlace.ac)
    // ensure activity ports for Led (expr: this.SmartPlace.Led)
    // ensure activity ports for Raspberry (expr: this.SmartPlace.Raspberry)
    // ensure activity ports for Camera (expr: this.SmartPlace.Camera)
    // ensure activity ports for cm (expr: this.SmartPlace.Raspberry.cm)
    // ensure activity ports for tc (expr: this.SmartPlace.Raspberry.tc)
    // ensure activity ports for sqlite (expr: this.SmartPlace.Raspberry.sqlite)
    // ensure activity ports for f (expr: this.SmartPlace.ac.f)
    // ensure activity ports for acc (expr: this.SmartPlace.ac.acc)
    // ensure activity ports for rc (expr: this.SmartPlace.spw.rc)
    // ensure activity ports for rg (expr: this.SmartPlace.spw.rg)
    // ensure activity ports for gg (expr: this.SmartPlace.spw.gg)
    // ensure activity ports for hc (expr: this.SmartPlace.spw.hc)
    // ensure activity ports for tc (expr: this.SmartPlace.Raspberry.tc)
    // ensure activity ports for spw (expr: this.SmartPlace.spw)
    // ensure activity ports for rrs (expr: this.SmartPlace.rrs)
    // ensure activity ports for ocb (expr: this.SmartPlace.ocb)
    // ensure activity ports for ths (expr: this.SmartPlace.ths)
    // ensure activity ports for ps (expr: this.SmartPlace.ps)
    // ensure activity ports for psql (expr: this.SmartPlace.psql)
    // ensure activity ports for ac (expr: this.SmartPlace.ac)
    // ensure activity ports for Led (expr: this.SmartPlace.Led)
    // ensure activity ports for Raspberry (expr: this.SmartPlace.Raspberry)
    // ensure activity ports for Camera (expr: this.SmartPlace.Camera)
    // ensure activity ports for cm (expr: this.SmartPlace.Raspberry.cm)
    // ensure activity ports for tc (expr: this.SmartPlace.Raspberry.tc)
    // ensure activity ports for sqlite (expr: this.SmartPlace.Raspberry.sqlite)
    // ensure activity ports for f (expr: this.SmartPlace.ac.f)
    // ensure activity ports for acc (expr: this.SmartPlace.ac.acc)
    // ensure activity ports for rc (expr: this.SmartPlace.spw.rc)
    // ensure activity ports for rg (expr: this.SmartPlace.spw.rg)
    // ensure activity ports for gg (expr: this.SmartPlace.spw.gg)
    // ensure activity ports for hc (expr: this.SmartPlace.spw.hc)
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
    const conn_qdb_1__seen = new Set();
    if(!conn_qdb_1__seen.has("psql::db")) { this.attachEndpointSafe(conn_qdb_1, this.SmartPlace.psql, "db"); conn_qdb_1__seen.add("psql::db"); }
    this.addConnector(conn_qdb_1);
    // connector x.x__psql.db_x.x__psql.db
    const conn_x_x__psql_db_x_x__psql_db_2 = new Connector("x.x__psql.db_x.x__psql.db");
    const conn_x_x__psql_db_x_x__psql_db_2__seen = new Set();
    if(!conn_x_x__psql_db_x_x__psql_db_2__seen.has("psql::db")) { this.attachEndpointSafe(conn_x_x__psql_db_x_x__psql_db_2, this.SmartPlace.psql, "db"); conn_x_x__psql_db_x_x__psql_db_2__seen.add("psql::db"); }
    this.addConnector(conn_x_x__psql_db_x_x__psql_db_2);
    // connector spsqli
    const conn_spsqli_4 = new Connector("spsqli");
    const conn_spsqli_4__seen = new Set();
    if(!conn_spsqli_4__seen.has("spw::u")) { this.attachEndpointSafe(conn_spsqli_4, this.SmartPlace.spw, "u"); conn_spsqli_4__seen.add("spw::u"); }
    this.addConnector(conn_spsqli_4);
    // connector uSpw.uSpw__u.u_uSpw.uSpw__u.u
    const conn_uSpw_uSpw__u_u_uSpw_uSpw__u_u_5 = new Connector("uSpw.uSpw__u.u_uSpw.uSpw__u.u");
    const conn_uSpw_uSpw__u_u_uSpw_uSpw__u_u_5__seen = new Set();
    if(!conn_uSpw_uSpw__u_u_uSpw_uSpw__u_u_5__seen.has("spw::u")) { this.attachEndpointSafe(conn_uSpw_uSpw__u_u_uSpw_uSpw__u_u_5, this.SmartPlace.spw, "u"); conn_uSpw_uSpw__u_u_uSpw_uSpw__u_u_5__seen.add("spw::u"); }
    this.addConnector(conn_uSpw_uSpw__u_u_uSpw_uSpw__u_u_5);
    // connector ci1
    const conn_ci1_7 = new Connector("ci1");
    const conn_ci1_7__seen = new Set();
    if(!conn_ci1_7__seen.has("spw::coSpw")) { this.attachEndpointSafe(conn_ci1_7, this.SmartPlace.spw, "coSpw"); conn_ci1_7__seen.add("spw::coSpw"); }
    if(!conn_ci1_7__seen.has("ocb::ci")) { this.attachEndpointSafe(conn_ci1_7, this.SmartPlace.ocb, "ci"); conn_ci1_7__seen.add("ocb::ci"); }
    this.addConnector(conn_ci1_7);
    // connector spw.coSpw__ocb.ci_spw.coSpw__ocb.ci
    const conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_8 = new Connector("spw.coSpw__ocb.ci_spw.coSpw__ocb.ci");
    const conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_8__seen = new Set();
    if(!conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_8__seen.has("spw::coSpw")) { this.attachEndpointSafe(conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_8, this.SmartPlace.spw, "coSpw"); conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_8__seen.add("spw::coSpw"); }
    if(!conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_8__seen.has("ocb::ci")) { this.attachEndpointSafe(conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_8, this.SmartPlace.ocb, "ci"); conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_8__seen.add("ocb::ci"); }
    this.addConnector(conn_spw_coSpw__ocb_ci_spw_coSpw__ocb_ci_8);
    // connector c
    const conn_c_10 = new Connector("c");
    const conn_c_10__seen = new Set();
    if(!conn_c_10__seen.has("spw::ctx")) { this.attachEndpointSafe(conn_c_10, this.SmartPlace.spw, "ctx"); conn_c_10__seen.add("spw::ctx"); }
    this.addConnector(conn_c_10);
    // connector ctx.ctx__ctxSpw.ctxSpw_ctx.ctx__ctxSpw.ctxSpw
    const conn_ctx_ctx__ctxSpw_ctxSpw_ctx_ctx__ctxSpw_ctxSpw_11 = new Connector("ctx.ctx__ctxSpw.ctxSpw_ctx.ctx__ctxSpw.ctxSpw");
    const conn_ctx_ctx__ctxSpw_ctxSpw_ctx_ctx__ctxSpw_ctxSpw_11__seen = new Set();
    if(!conn_ctx_ctx__ctxSpw_ctxSpw_ctx_ctx__ctxSpw_ctxSpw_11__seen.has("spw::ctx")) { this.attachEndpointSafe(conn_ctx_ctx__ctxSpw_ctxSpw_ctx_ctx__ctxSpw_ctxSpw_11, this.SmartPlace.spw, "ctx"); conn_ctx_ctx__ctxSpw_ctxSpw_ctx_ctx__ctxSpw_ctxSpw_11__seen.add("spw::ctx"); }
    this.addConnector(conn_ctx_ctx__ctxSpw_ctxSpw_ctx_ctx__ctxSpw_ctxSpw_11);
    // connector cr
    const conn_cr_13 = new Connector("cr");
    const conn_cr_13__seen = new Set();
    if(!conn_cr_13__seen.has("spw::rr")) { this.attachEndpointSafe(conn_cr_13, this.SmartPlace.spw, "rr"); conn_cr_13__seen.add("spw::rr"); }
    this.addConnector(conn_cr_13);
    // connector rr.rr__rrSpw.rrSpw_rr.rr__rrSpw.rrSpw
    const conn_rr_rr__rrSpw_rrSpw_rr_rr__rrSpw_rrSpw_14 = new Connector("rr.rr__rrSpw.rrSpw_rr.rr__rrSpw.rrSpw");
    const conn_rr_rr__rrSpw_rrSpw_rr_rr__rrSpw_rrSpw_14__seen = new Set();
    if(!conn_rr_rr__rrSpw_rrSpw_rr_rr__rrSpw_rrSpw_14__seen.has("spw::rr")) { this.attachEndpointSafe(conn_rr_rr__rrSpw_rrSpw_rr_rr__rrSpw_rrSpw_14, this.SmartPlace.spw, "rr"); conn_rr_rr__rrSpw_rrSpw_rr_rr__rrSpw_rrSpw_14__seen.add("spw::rr"); }
    this.addConnector(conn_rr_rr__rrSpw_rrSpw_rr_rr__rrSpw_rrSpw_14);
    // connector sendPresence
    const conn_sendPresence_16 = new Connector("sendPresence");
    const conn_sendPresence_16__seen = new Set();
    if(!conn_sendPresence_16__seen.has("ps::presence")) { this.attachEndpointSafe(conn_sendPresence_16, this.SmartPlace.ps, "presence"); conn_sendPresence_16__seen.add("ps::presence"); }
    this.addConnector(conn_sendPresence_16);
    // connector ps.presence__x.x_ps.presence__x.x
    const conn_ps_presence__x_x_ps_presence__x_x_17 = new Connector("ps.presence__x.x_ps.presence__x.x");
    const conn_ps_presence__x_x_ps_presence__x_x_17__seen = new Set();
    if(!conn_ps_presence__x_x_ps_presence__x_x_17__seen.has("ps::presence")) { this.attachEndpointSafe(conn_ps_presence__x_x_ps_presence__x_x_17, this.SmartPlace.ps, "presence"); conn_ps_presence__x_x_ps_presence__x_x_17__seen.add("ps::presence"); }
    this.addConnector(conn_ps_presence__x_x_ps_presence__x_x_17);
    // connector fl
    const conn_fl_19 = new Connector("fl");
    const conn_fl_19__seen = new Set();
    if(!conn_fl_19__seen.has("Camera::f")) { this.attachEndpointSafe(conn_fl_19, this.SmartPlace.Camera, "f"); conn_fl_19__seen.add("Camera::f"); }
    this.addConnector(conn_fl_19);
    // connector Camera.f__x.x_Camera.f__x.x
    const conn_Camera_f__x_x_Camera_f__x_x_20 = new Connector("Camera.f__x.x_Camera.f__x.x");
    const conn_Camera_f__x_x_Camera_f__x_x_20__seen = new Set();
    if(!conn_Camera_f__x_x_Camera_f__x_x_20__seen.has("Camera::f")) { this.attachEndpointSafe(conn_Camera_f__x_x_Camera_f__x_x_20, this.SmartPlace.Camera, "f"); conn_Camera_f__x_x_Camera_f__x_x_20__seen.add("Camera::f"); }
    this.addConnector(conn_Camera_f__x_x_Camera_f__x_x_20);
    // connector sendTempHumi
    const conn_sendTempHumi_22 = new Connector("sendTempHumi");
    const conn_sendTempHumi_22__seen = new Set();
    if(!conn_sendTempHumi_22__seen.has("ths::temperature")) { this.attachEndpointSafe(conn_sendTempHumi_22, this.SmartPlace.ths, "temperature"); conn_sendTempHumi_22__seen.add("ths::temperature"); }
    this.addConnector(conn_sendTempHumi_22);
    // connector ths.temperature__x.x_ths.temperature__x.x
    const conn_ths_temperature__x_x_ths_temperature__x_x_23 = new Connector("ths.temperature__x.x_ths.temperature__x.x");
    const conn_ths_temperature__x_x_ths_temperature__x_x_23__seen = new Set();
    if(!conn_ths_temperature__x_x_ths_temperature__x_x_23__seen.has("ths::temperature")) { this.attachEndpointSafe(conn_ths_temperature__x_x_ths_temperature__x_x_23, this.SmartPlace.ths, "temperature"); conn_ths_temperature__x_x_ths_temperature__x_x_23__seen.add("ths::temperature"); }
    this.addConnector(conn_ths_temperature__x_x_ths_temperature__x_x_23);
    // connector rn
    const conn_rn_25 = new Connector("rn");
    const conn_rn_25__seen = new Set();
    if(!conn_rn_25__seen.has("sqlite::ri")) { this.attachEndpointSafe(conn_rn_25, this.SmartPlace.Raspberry.sqlite, "ri"); conn_rn_25__seen.add("sqlite::ri"); }
    if(!conn_rn_25__seen.has("rrs::ri")) { this.attachEndpointSafe(conn_rn_25, this.SmartPlace.rrs, "ri"); conn_rn_25__seen.add("rrs::ri"); }
    this.addConnector(conn_rn_25);
    // connector sqlite.ri__rrs.ri_sqlite.ri__rrs.ri
    const conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_26 = new Connector("sqlite.ri__rrs.ri_sqlite.ri__rrs.ri");
    const conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_26__seen = new Set();
    if(!conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_26__seen.has("sqlite::ri")) { this.attachEndpointSafe(conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_26, this.SmartPlace.Raspberry.sqlite, "ri"); conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_26__seen.add("sqlite::ri"); }
    if(!conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_26__seen.has("rrs::ri")) { this.attachEndpointSafe(conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_26, this.SmartPlace.rrs, "ri"); conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_26__seen.add("rrs::ri"); }
    this.addConnector(conn_sqlite_ri__rrs_ri_sqlite_ri__rrs_ri_26);
    // connector ic
    const conn_ic_28 = new Connector("ic");
    const conn_ic_28__seen = new Set();
    if(!conn_ic_28__seen.has("Raspberry::c")) { this.attachEndpointSafe(conn_ic_28, this.SmartPlace.Raspberry, "c"); conn_ic_28__seen.add("Raspberry::c"); }
    if(!conn_ic_28__seen.has("Led::cLed")) { this.attachEndpointSafe(conn_ic_28, this.SmartPlace.Led, "cLed"); conn_ic_28__seen.add("Led::cLed"); }
    this.addConnector(conn_ic_28);
    // connector Raspberry.c__Led.cLed_Raspberry.c__Led.cLed
    const conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_29 = new Connector("Raspberry.c__Led.cLed_Raspberry.c__Led.cLed");
    const conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_29__seen = new Set();
    if(!conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_29__seen.has("Raspberry::c")) { this.attachEndpointSafe(conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_29, this.SmartPlace.Raspberry, "c"); conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_29__seen.add("Raspberry::c"); }
    if(!conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_29__seen.has("Led::cLed")) { this.attachEndpointSafe(conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_29, this.SmartPlace.Led, "cLed"); conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_29__seen.add("Led::cLed"); }
    this.addConnector(conn_Raspberry_c__Led_cLed_Raspberry_c__Led_cLed_29);
    // connector is
    const conn_is_31 = new Connector("is");
    const conn_is_31__seen = new Set();
    if(!conn_is_31__seen.has("ac::is")) { this.attachEndpointSafe(conn_is_31, this.SmartPlace.ac, "is"); conn_is_31__seen.add("ac::is"); }
    this.addConnector(conn_is_31);
    // connector x.x__ac.is_x.x__ac.is
    const conn_x_x__ac_is_x_x__ac_is_32 = new Connector("x.x__ac.is_x.x__ac.is");
    const conn_x_x__ac_is_x_x__ac_is_32__seen = new Set();
    if(!conn_x_x__ac_is_x_x__ac_is_32__seen.has("ac::is")) { this.attachEndpointSafe(conn_x_x__ac_is_x_x__ac_is_32, this.SmartPlace.ac, "is"); conn_x_x__ac_is_x_x__ac_is_32__seen.add("ac::is"); }
    this.addConnector(conn_x_x__ac_is_x_x__ac_is_32);
    // connector countPeople
    const conn_countPeople_34 = new Connector("countPeople");
    const conn_countPeople_34__seen = new Set();
    if(!conn_countPeople_34__seen.has("Raspberry::numPeopleCm")) { this.attachEndpointSafe(conn_countPeople_34, this.SmartPlace.Raspberry, "numPeopleCm"); conn_countPeople_34__seen.add("Raspberry::numPeopleCm"); }
    if(!conn_countPeople_34__seen.has("Raspberry::numPeopleTc")) { this.attachEndpointSafe(conn_countPeople_34, this.SmartPlace.Raspberry, "numPeopleTc"); conn_countPeople_34__seen.add("Raspberry::numPeopleTc"); }
    this.addConnector(conn_countPeople_34);
    // connector numPeopleCm.numPeopleCm__numPeopleTc.numPeopleTc_numPeopleCm.numPeopleCm__numPeopleTc.numPeopleTc
    const conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_35 = new Connector("numPeopleCm.numPeopleCm__numPeopleTc.numPeopleTc_numPeopleCm.numPeopleCm__numPeopleTc.numPeopleTc");
    const conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_35__seen = new Set();
    if(!conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_35__seen.has("Raspberry::numPeopleCm")) { this.attachEndpointSafe(conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_35, this.SmartPlace.Raspberry, "numPeopleCm"); conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_35__seen.add("Raspberry::numPeopleCm"); }
    if(!conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_35__seen.has("Raspberry::numPeopleTc")) { this.attachEndpointSafe(conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_35, this.SmartPlace.Raspberry, "numPeopleTc"); conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_35__seen.add("Raspberry::numPeopleTc"); }
    this.addConnector(conn_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_numPeopleCm_numPeopleCm__numPeopleTc_numPeopleTc_35);
    // connector rn
    const conn_rn_37 = new Connector("rn");
    const conn_rn_37__seen = new Set();
    if(!conn_rn_37__seen.has("sqlite::ri")) { this.attachEndpointSafe(conn_rn_37, this.SmartPlace.Raspberry.sqlite, "ri"); conn_rn_37__seen.add("sqlite::ri"); }
    this.addConnector(conn_rn_37);
    // connector x.x__sqlite.ri_x.x__sqlite.ri
    const conn_x_x__sqlite_ri_x_x__sqlite_ri_38 = new Connector("x.x__sqlite.ri_x.x__sqlite.ri");
    const conn_x_x__sqlite_ri_x_x__sqlite_ri_38__seen = new Set();
    if(!conn_x_x__sqlite_ri_x_x__sqlite_ri_38__seen.has("sqlite::ri")) { this.attachEndpointSafe(conn_x_x__sqlite_ri_x_x__sqlite_ri_38, this.SmartPlace.Raspberry.sqlite, "ri"); conn_x_x__sqlite_ri_x_x__sqlite_ri_38__seen.add("sqlite::ri"); }
    this.addConnector(conn_x_x__sqlite_ri_x_x__sqlite_ri_38);
    // connector u
    const conn_u_40 = new Connector("u");
    const conn_u_40__seen = new Set();
    if(!conn_u_40__seen.has("acc::u")) { this.attachEndpointSafe(conn_u_40, this.SmartPlace.ac.acc, "u"); conn_u_40__seen.add("acc::u"); }
    this.addConnector(conn_u_40);
    // connector x.x__acc.u_x.x__acc.u
    const conn_x_x__acc_u_x_x__acc_u_41 = new Connector("x.x__acc.u_x.x__acc.u");
    const conn_x_x__acc_u_x_x__acc_u_41__seen = new Set();
    if(!conn_x_x__acc_u_x_x__acc_u_41__seen.has("acc::u")) { this.attachEndpointSafe(conn_x_x__acc_u_x_x__acc_u_41, this.SmartPlace.ac.acc, "u"); conn_x_x__acc_u_x_x__acc_u_41__seen.add("acc::u"); }
    this.addConnector(conn_x_x__acc_u_x_x__acc_u_41);
  }
}

const __portAliases = {};
function createModel(){ return new SysADLArchitecture(); }
module.exports = { createModel, SysADLArchitecture, __portAliases };
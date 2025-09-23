class SysADLComponent {
  constructor(name, type = null) {
    this.name = name;
    this.type = type;
    this.ports = [];
    this.activities = [];
  }
  addPort(port) {
    this.ports.push(port);
  }
  addActivity(activity) {
    this.activities.push(activity);
  }
}

class SysADLPort {
  constructor(name, direction, component) {
    this.name = name;
    this.direction = direction;
    this.component = component;
  }
}

class SysADLConnector {
  constructor(name, ports) {
    this.name = name;
    this.ports = ports;
  }
}

class SysADLFlow {
  constructor(source, target) {
    this.source = source;
    this.target = target;
  }
}

class SysADLActivity {
  constructor(name) {
    this.name = name;
  }
}

function interpretSysADL() {
  const input = document.getElementById("input").value;
  const logEl = document.getElementById("log");
  logEl.innerText = "";

  const components = {};
  const ports = {};
  const connectors = {};
  const flows = [];

  try {
    const lines = input.split("\n");
    let currentComponent = null;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//")) return;

      if (trimmed.startsWith("abstract component def")) {
        const name = trimmed.split(" ")[3];
        currentComponent = new SysADLComponent(name);
        components[name] = currentComponent;
        logEl.innerText += `Component defined: ${name}\n`;

      } else if (trimmed.startsWith("component")) {
        const [, name, , type] = trimmed.split(" ");
        const instance = new SysADLComponent(name, type);
        components[name] = instance;
        logEl.innerText += `Component instance: ${name} of type ${type}\n`;

      } else if (trimmed.startsWith("ports:")) {
        const portDefs = trimmed.replace("ports:", "").trim().split(",");
        portDefs.forEach(p => {
          const [pname, direction] = p.trim().split(":");
          if (!pname || !direction) throw new Error(`Invalid port definition: '${p}'`);
          const port = new SysADLPort(pname.trim(), direction.trim(), currentComponent.name);
          currentComponent.addPort(port);
          ports[`${currentComponent.name}.${port.name}`] = port;
          logEl.innerText += `  Port ${port.name} (${port.direction}) added to ${currentComponent.name}\n`;
        });

      } else if (trimmed.startsWith("flow")) {
        const [, src, , tgt] = trimmed.split(" ");
        if (!ports[src] || !ports[tgt]) throw new Error(`Flow ports not found: ${src}, ${tgt}`);
        if (ports[src].direction !== "out" || ports[tgt].direction !== "in") {
          throw new Error(`Invalid flow direction from ${src} to ${tgt}`);
        }
        const flow = new SysADLFlow(src, tgt);
        flows.push(flow);
        logEl.innerText += `Flow defined: ${src} -> ${tgt}\n`;

      } else if (trimmed.startsWith("connector")) {
        const [_, name, ...portList] = trimmed.split(/\s+/);
        if (portList.length < 2) throw new Error(`Connector '${name}' must connect at least 2 ports.`);
        portList.forEach(p => {
          if (!ports[p]) throw new Error(`Connector port '${p}' not found.`);
        });
        connectors[name] = new SysADLConnector(name, portList);
        logEl.innerText += `Connector ${name} connects ports: ${portList.join(", ")}\n`;

      } else if (trimmed.startsWith("activity")) {
        const [, name] = trimmed.split(" ");
        if (!currentComponent) throw new Error("Activity defined without a component context.");
        const activity = new SysADLActivity(name);
        currentComponent.addActivity(activity);
        logEl.innerText += `Activity defined: ${name} in ${currentComponent.name}\n`;
      }
    });

    logEl.innerText += "\n--- Simulation Start ---\n";
    flows.forEach(f => {
      const from = ports[f.source];
      const to = ports[f.target];
      logEl.innerText += `Message sent from ${from.component}.${from.name} to ${to.component}.${to.name}\n`;
    });

    Object.values(components).forEach(comp => {
      comp.activities.forEach(act => {
        logEl.innerText += `Executing activity '${act.name}' in ${comp.name}\n`;
      });
    });

    logEl.innerText += "--- Simulation End ---\n";
  } catch (e) {
    logEl.innerText += "Error: " + e.message + "\n";
  }
}

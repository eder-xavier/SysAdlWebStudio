const mod = require('./generated/Simple.js');
const model = mod.createModel();
model.assignActivityReferences();

function findInputPorts(model){
  const inputPorts = [];

  const findPortsRecursive = (root, path = '') => {
    if (!root || typeof root !== 'object') return;

    if (root.ports) {
      for (const [pname, port] of Object.entries(root.ports)) {
        if (!port.direction || port.direction === 'in') {
          inputPorts.push({
            component: path || (root.name || 'root'),
            port: pname,
            portObj: port,
            fullPath: path ? `${path}.${pname}` : pname
          });
        }
      }
    }

    if (root.components) {
      for (const [cname, comp] of Object.entries(root.components)) {
        const newPath = path ? `${path}.${cname}` : cname;
        findPortsRecursive(comp, newPath);
      }
    }
  };

  if (model.components && Object.keys(model.components).length > 0) {
    for (const [compName, comp] of Object.entries(model.components)) {
      findPortsRecursive(comp, compName);
    }
  } else {
    findPortsRecursive(model);
  }

  return inputPorts;
}

const inputPorts = findInputPorts(model);
console.log('Found input ports:');
inputPorts.forEach(p => console.log(`  ${p.fullPath} (direction: ${p.portObj.direction})`));

console.log('\nComponent details:');
console.log('s1 ports:', Object.keys(model.SystemCP.s1.ports || {}));
console.log('s1 port current direction:', model.SystemCP.s1.ports?.current?.direction);
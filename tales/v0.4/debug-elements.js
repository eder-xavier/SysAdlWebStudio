const fs = require('fs');
const parser = require('./sysadl-parser.js');

const source = fs.readFileSync('AGV-completo.sysadl', 'utf8');
const ast = parser.parse(source);

function traverse(node, callback, path = []) {
  if (!node || typeof node !== 'object') return;
  callback(node, path);
  for (const key in node) {
    if (node[key] && typeof node[key] === 'object') {
      if (Array.isArray(node[key])) {
        node[key].forEach((item, index) => {
          traverse(item, callback, [...path, key, index]);
        });
      } else {
        traverse(node[key], callback, [...path, key]);
      }
    }
  }
}

const found = {};
const envElements = ['EnvironmentDefinition', 'EnvironmentConfiguration', 'EventsDefinitions', 'SceneDefinitions', 'ScenarioDefinitions', 'ScenarioExecution'];

traverse(ast, (node) => {
  if (node.type && envElements.includes(node.type)) {
    if (!found[node.type]) found[node.type] = [];
    found[node.type].push({
      name: node.name || node.id || 'unnamed',
      defs: node.defs,
      target: node.target
    });
  }
});

console.log('Found environment elements:');
console.log(JSON.stringify(found, null, 2));
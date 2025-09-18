const fs = require('fs');

// Simular o parse para analisar estrutura
async function analyzeAst() {
  try {
    const parse = await import('../sysadl-parser.js');
    const content = fs.readFileSync('RTC.sysadl', 'utf8');
    const ast = parse.parse(content);

    function findConnectorDefs(node) {
      if (!node || typeof node !== 'object') return [];
      let results = [];
      
      if (node.type === 'ConnectorDef') {
        results.push(node);
      }
      
      for (const key in node) {
        if (Array.isArray(node[key])) {
          for (const item of node[key]) {
            results = results.concat(findConnectorDefs(item));
          }
        } else if (typeof node[key] === 'object') {
          results = results.concat(findConnectorDefs(node[key]));
        }
      }
      
      return results;
    }

    const connectorDefs = findConnectorDefs(ast);
    console.log('ConnectorDefs found:', connectorDefs.length);
    if (connectorDefs.length > 0) {
      console.log('First ConnectorDef structure:');
      console.log(JSON.stringify(connectorDefs[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeAst();
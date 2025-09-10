const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const tmpDir = path.resolve(__dirname, 'tmp_test');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
const sysadlFile = path.join(tmpDir, 'minimal.sysadl');
const outDir = path.join(tmpDir, 'out');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Minimal SysADL content with fully qualified component instance names and ports
const src = `Model Minimal;
component def C1 { ports { port def p { flow out Int } } }
component def C2 { ports { port def q { flow in Int } } }
configuration MinimalCfg {
  C1 c1;
  C2 c2;
  connector def c { bindings { c1.p -> c2.q } }
}
`;
fs.writeFileSync(sysadlFile, src, 'utf8');

const transformer = path.resolve(__dirname, '..', 'transformer.js');
const res = spawnSync('node', [transformer, sysadlFile, outDir], { encoding: 'utf8' });
console.log('transformer status', res.status);
if (res.status !== 0) {
  console.error('Transformer failed unexpectedly:', res.stderr || res.stdout);
  process.exit(2);
}
const generated = path.join(outDir, 'minimal.js');
if (!fs.existsSync(generated)) {
  console.error('Expected generated file not found:', generated);
  process.exit(3);
}
const content = fs.readFileSync(generated, 'utf8');
if (content.indexOf('__findPortComponent') !== -1 || content.indexOf('__findPortComponentByNormalized') !== -1) {
  console.error('Test failed: runtime lookup helpers found in generated file');
  process.exit(4);
}
console.log('Test passed: no runtime lookup helpers in generated output');
process.exit(0);

const { spawnSync } = require('child_process');
const path = require('path');

function run() {
  const transformer = path.resolve(__dirname, '..', 'transformer.js');
  const input = path.resolve(process.cwd(), 'AGV.sysadl');
  const outdir = path.resolve(__dirname, '..', 'generated_test');
  const res = spawnSync('node', [transformer, input, outdir], { encoding: 'utf8' });
  return res;
}

const r = run();
console.log('status:', r.status);
console.log('stderr snippet:', (r.stderr||'').slice(0,2000));
if (r.status === 0) {
  console.error('Test failed: transformer succeeded but expected failure under strict policy');
  process.exit(2);
}
if (!r.stderr || !r.stderr.includes('Generation failed: unresolved connector bindings found')) {
  console.error('Test failed: expected unresolved-binding error. stderr:\n', r.stderr);
  process.exit(3);
}
console.log('Test passed: transformer failed with unresolved-binding report as expected');
process.exit(0);

const assert = require('assert');
const { createExecutableFromExpression } = require('../sysadl-runtime.js');

function run() {
  // simple arithmetic
  const f1 = createExecutableFromExpression('1+2', []);
  assert.strictEqual(f1(), 3, '1+2 == 3');

  // boolean literals
  const f2 = createExecutableFromExpression('True', []);
  assert.strictEqual(f2(), true, 'True -> true');

  // local declaration with := and expression
  const f3 = createExecutableFromExpression('x := 2; x+3', []);
  assert.strictEqual(f3(), 5, 'x := 2; x+3 == 5');

  // simple if-then-else pattern
  const f4 = createExecutableFromExpression('if (1==1) then 10 else 0', []);
  assert.strictEqual(f4(), 10, 'if then else basic');

  // multi-line block with inferred return
  const src5 = 'let a := 2\na := a + 3\na * 2';
  const f5 = createExecutableFromExpression(src5, []);
  // debug: if fails, show the transformed function behavior
  const v5 = f5();
  assert.strictEqual(v5, 10, 'multi-line infer return (was: ' + String(v5) + ')');

  console.log('[ir_translate] All tests passed');
}

module.exports.run = run;

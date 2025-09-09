const ir = require('./ir_translate.test');
const smoke = require('./smoke_all');

async function runAll() {
  try {
    ir.run();
  } catch (e) {
    console.error('[ir_translate] FAILED', e && e.message);
    process.exit(2);
  }
  try {
    await smoke.run();
  } catch (e) {
    console.error('[smoke_all] FAILED', e && e.message);
    process.exit(2);
  }
  console.log('ALL TESTS PASSED');
}

runAll();

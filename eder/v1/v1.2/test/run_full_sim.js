const { createModel } = require('../generated/RTC');
const SimulationLogger = require('../sysadl-framework/SimulationLogger');

async function run() {
  const model = createModel();
  const logger = new SimulationLogger();
  logger.enable();
  model.attachSimulationLogger(logger);

  // Diagnostic: print connector binding summary for cc1/cc2
  try {
    const cc1 = model.RTCSystemCFD.connectors && model.RTCSystemCFD.connectors['cc1'];
    const cc2 = model.RTCSystemCFD.connectors && model.RTCSystemCFD.connectors['cc2'];
    console.log('\n--- Connector binding summary ---');
    [cc1, cc2].forEach((cc) => {
      if (!cc) return;
      console.log(`Connector: ${cc.name}`);
      console.log('  boundParticipants:', cc.boundParticipants);
      console.log('  internalParticipants keys:', Object.keys(cc.internalParticipants || {}));
      Object.entries(cc.internalParticipants || {}).forEach(([pname, p]) => {
        try {
          console.log(`    internal participant ${pname}: bindingType=${p.binding && p.binding.constructor ? p.binding.constructor.name : typeof p.binding}, hasReceive=${p.binding && typeof p.binding.receive === 'function'}`);
        } catch (e) { console.log('    <error reading internal participant binding>', e && e.message); }
      });
    });
    console.log('--- end connector summary ---\n');
  } catch (e) { console.warn('Failed to print connector summary:', e && e.message); }

  // helper to pretty-print PORT_SEND/RECEIVE events for heating/cooling
  function findPortEvents() {
    return logger.events.filter(e => {
      if (!e.data) return false;
      const p = e.data.portPath || e.data.port || e.data.path;
      if (!p) return false;
      return /heating|cooling/.test(String(p));
    });
  }

  // Send inputs (values from your run)
  console.log('Sending s1.current1=80, s2.current2=50, ui.desired=20');
  model.RTCSystemCFD.s1.getPort('current1').send(80, model);
  model.RTCSystemCFD.s2.getPort('current2').send(50, model);
  // Also send presence reading so presence-checker can compute target2
  console.log('Sending s3.detectedS=true (presence)');
  model.RTCSystemCFD.s3.getPort('detectedS').send(true, model);
  model.RTCSystemCFD.ui.getPort('desired').send(20, model);

  // Wait a bit for async flows (if any)
  await new Promise(r => setTimeout(r, 200));

  // Print summary + any heating/cooling events
  logger.printSummary();
  const events = findPortEvents();
  console.log('\n=== heating/cooling related PORT events ===');
  events.forEach(e => console.log(e.timestamp, e.type, JSON.stringify(e.data)));

  // Cleanup model/runtime background tasks so Node can exit cleanly
  if (typeof model.cleanup === 'function') {
    try {
      model.cleanup();
    } catch (err) {
      console.warn('Model cleanup failed:', err && err.message);
    }
  }

  // Give any cleanup a moment, then exit
  setTimeout(() => process.exit(0), 50);
}

run().catch(err => { console.error(err); process.exit(1); });

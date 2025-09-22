const { createEnvironmentModel } = require('../generated/AGV-completo-env-scen');

console.log('Instantiating model...');
const model = createEnvironmentModel();

console.log('Model instantiated. Setting global context variables from model.eventContext...');
// Expose context entities as globals so the generated JS blocks can access them by name
if (model.eventContext && typeof model.eventContext === 'object') {
  for (const [k, v] of Object.entries(model.eventContext)) {
    global[k] = v;
  }
}

console.log('Available tasks:', model.events['MyEvents'].getAllTasks());

console.log('\nTriggering event AGV1NotifTravelA...');
model.events['MyEvents'].triggerEvent('AGV1NotifTravelA');

// Wait briefly to let async logs appear
setTimeout(() => {
  console.log('After trigger, agv1.outNotification.notification =', (global.agv1 && global.agv1.outNotification) ? global.agv1.outNotification.notification : undefined);
  process.exit(0);
}, 200);

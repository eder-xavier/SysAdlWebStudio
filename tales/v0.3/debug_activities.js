const { createModel } = require('./generated/Simple.js');

const model = createModel();

console.log('=== Activities Analysis ===');
console.log('Model activities:', Object.keys(model._activities));

Object.entries(model._activities).forEach(([name, activity]) => {
  console.log(`Activity ${name}:`);
  console.log(`  componentName: "${activity.componentName}"`);
  console.log(`  name: "${activity.name}"`);
});

console.log('\n=== Component Analysis ===');
console.log('tempMon activityName:', model.SystemCP.tempMon.activityName);
console.log('tempMon component name:', model.SystemCP.tempMon.name);

console.log('\n=== Activity Lookup Test ===');
const activity = model.findActivityByPortOwner('tempMon');
console.log('Found activity for tempMon:', !!activity);
if (activity) {
  console.log('Activity name:', activity.name);
  console.log('Activity componentName:', activity.componentName);
}
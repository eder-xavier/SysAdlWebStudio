const { MyEvents } = require('../generated/AGV-completo-env-scen');
const { eventSystemManager } = require('../sysadl-framework/SysADLBase');

console.log('Creating minimal event system...');
const emitter = eventSystemManager.createEventSystem();
eventSystemManager.setupAutoStop(emitter);

// Minimal context objects
const agv1 = { name: 'agv1', outNotification: { notification: null } };
const agv2 = { name: 'agv2', outNotification: { notification: null } };
const supervisor = { name: 'supervisor', outCommand: { destination: null, armCommand: null } };
const stationA = { name: 'stationA', signal: 'stationA.signal' };
const stationC = { name: 'stationC', signal: 'stationC.signal' };
const part = { name: 'part' };

// Connections with simple execute implementations
const connections = {
  Notify: { execute: (from, to, data) => console.log('[Conn Notify] from', from?.name || from, 'to', to?.name || to) },
  Command: { execute: (from, to, data) => console.log('[Conn Command] from', from?.name || from, 'to', to?.name || to) },
  Atach: { execute: (from, to, data) => console.log('[Conn Atach] from', from?.name || from, 'to', to?.name || to) },
  Detach: { execute: (from, to, data) => console.log('[Conn Detach] from', from?.name || from, 'to', to?.name || to) }
};

const context = { agv1, agv2, supervisor, stationA, stationC, part, connections };

// Instantiate events and initialize
const events = new MyEvents();
events.initialize(context, emitter);

console.log('Registered tasks:', events.getAllTasks());

console.log('\nTriggering AGV1NotifTravelA...');
events.triggerEvent('AGV1NotifTravelA');

setTimeout(() => {
  console.log('agv1.outNotification.notification =', agv1.outNotification.notification);
  console.log('supervisor.outCommand =', supervisor.outCommand);
  process.exit(0);
}, 200);

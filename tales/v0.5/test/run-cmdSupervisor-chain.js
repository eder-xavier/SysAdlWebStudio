const { MyEvents } = require('../generated/AGV-completo-env-scen');
const { eventSystemManager } = require('../sysadl-framework/SysADLBase');

const emitter = eventSystemManager.createEventSystem();
eventSystemManager.setupAutoStop(emitter);

// Traces
const eventsTrace = [];
const tasksTrace = [];
const connectionsTrace = [];

// Wrap emitter.emit to trace emissions
const originalEmit = emitter.emit.bind(emitter);
// Guard to avoid re-emitting the same event while it's being processed (prevents infinite loops)
const _processingEvents = new Set();
emitter.emit = function(event, ...args) {
  // trace the attempted emission
  eventsTrace.push({ event, args });

  // prevent recursive re-emission of the same event
  if (_processingEvents.has(event)) {
    // skip nested emit of same event
    return false;
  }

  try {
    _processingEvents.add(event);
    return originalEmit(event, ...args);
  } finally {
    _processingEvents.delete(event);
  }
};

// Minimal context
const stationA = { name: 'stationA', signal: 'stationA.signal', ID: 'StationA' };
const stationC = { name: 'stationC', signal: 'stationC.signal', ID: 'StationC' };
const agv1 = { name: 'agv1', outNotification: { notification: null }, location: null };
const agv2 = { name: 'agv2', outNotification: { notification: null }, location: null };
const supervisor = { name: 'supervisor', outCommand: { destination: null, armCommand: null } };
const part = { name: 'part', location: null };

// Connections that also emit task events based on message
const connections = {
  Command: {
    execute: (from, to, data) => {
      const dest = from.outCommand && (from.outCommand.destination && (from.outCommand.destination.name || from.outCommand.destination.ID || from.outCommand.destination));
      connectionsTrace.push({ name: 'Command', from: from.name, to: to.name, dest });
      console.log(`[Conn Command] ${from.name} -> ${to.name} dest=${dest}`);
      // Don't re-emit cmd events here - let the system handle trigger flow naturally
    }
  },
  Notify: {
    execute: (from, to, data) => {
      connectionsTrace.push({ name: 'Notify', from: from.name, to: to.name, data });
      console.log(`[Conn Notify] ${from.name} -> ${to.name} notification=${from.outNotification && from.outNotification.notification}`);
      // Deliver notification to supervisor (simulate)
      if (to === supervisor || to.name === 'supervisor') {
        // Could update supervisor state or emit supervisor-level events
        // For tracing, emit a connection-level event
        emitter.emit('notifyDelivered', { from: from.name, to: to.name, notification: from.outNotification && from.outNotification.notification });
      }
    }
  },
  Atach: { execute: (from, to) => { connectionsTrace.push({ name: 'Atach', from: from.name, to: to.name }); console.log('[Conn Atach]'); } },
  Detach: { execute: (from, to) => { connectionsTrace.push({ name: 'Detach', from: from.name, to: to.name }); console.log('[Conn Detach]'); } }
};

const context = { agv1, agv2, supervisor, stationA, stationC, part, connections };

// Instantiate events and initialize
const events = new MyEvents();

// Capture task execution by registering listeners for all task names before initialization
// We'll add capture listeners after initialization because registerTask in initialize adds the executor listener.

events.initialize(context, emitter);

// After initialize, register capturing listeners for all known tasks
for (const t of events.getAllTasks()) {
  emitter.on(t, () => {
    tasksTrace.push(t);
  });
}

console.log('--- Triggering cmdSupervisor ---');
events.triggerEvent('cmdSupervisor');

// Wait for async propagation
setTimeout(() => {
  console.log('\n--- Events emitted (trace) ---');
  eventsTrace.forEach((e, i) => console.log(i + 1, e.event, JSON.stringify(e.args)));

  console.log('\n--- Tasks executed (trace) ---');
  tasksTrace.forEach((t, i) => console.log(i + 1, t));

  console.log('\n--- Connections invoked (trace) ---');
  connectionsTrace.forEach((c, i) => console.log(i + 1, c));

  console.log('\n--- Final entity states ---');
  console.log('supervisor.outCommand =', supervisor.outCommand);
  console.log('agv1.outNotification =', agv1.outNotification);
  console.log('agv2.outNotification =', agv2.outNotification);

  process.exit(0);
}, 500);

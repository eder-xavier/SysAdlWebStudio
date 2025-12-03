#!/usr/bin/env node
/**
 * Test script to verify trace logging is working correctly
 */

const { ExecutionLogger } = require('./sysadl-framework/ExecutionLogger');

console.log('🧪 Testing Trace Logging...\n');

// Create logger instance
const logger = new ExecutionLogger('TraceTest', {
  enableFileLogging: false,
  enableConsoleLogging: true
});

// Test 1: Scenario with explicit trace field
console.log('\n✅ Test 1: Scenario with explicit trace field');
logger.logExecution({
  type: 'scenario.started',
  name: 'TestScenario',
  context: {
    scenesCount: 3,
    eventsCount: 2
  },
  trace: {
    preConditions: 'passed',
    initialScene: 'Scene1',
    parentExecution: 'MainExecution'
  }
});

// Test 2: Scene with explicit trace field
console.log('\n✅ Test 2: Scene with explicit trace field');
logger.logExecution({
  type: 'scene.execution.started',
  name: 'TestScene',
  context: {
    scenario: 'TestScenario'
  },
  trace: {
    scenario: 'TestScenario',
    sceneName: 'TestScene',
    causedBy: 'EventTrigger'
  }
});

// Test 3: Event without trace (should have empty trace)
console.log('\n✅ Test 3: Event without trace (should have empty or no trace)');
logger.logExecution({
  type: 'event.fired',
  name: 'TestEvent',
  context: {
    triggerType: 'manual'
  }
});

// Test 4: Scenario with root-level trace fields (old style)
console.log('\n✅ Test 4: Scenario with root-level trace fields (backward compatibility)');
logger.logExecution({
  type: 'scenario.completed',
  name: 'TestScenario2',
  context: {
    result: 'success'
  },
  parent: 'ParentScenario',
  scenario: 'TestScenario2',
  causedBy: 'UserAction'
});

// Test 5: Validation event with trace
console.log('\n✅ Test 5: Validation event with trace');
logger.logExecution({
  type: 'preconditions.validated',
  name: 'SceneValidation',
  context: {
    result: 'passed',
    checks: ['constraint1', 'constraint2']
  },
  trace: {
    scene: 'TestScene',
    validationType: 'preconditions'
  }
});

console.log('\n✅ All tests completed!');
console.log('\n📊 Check if trace fields are populated correctly in the output above.');

// Get execution log to verify
const logs = logger.executionLog;
console.log('\n📝 Execution Log Summary:');
logs.forEach((log, index) => {
  console.log(`\n${index + 1}. ${log.what} - ${log.who}`);
  console.log(`   Summary: ${log.summary}`);
  console.log(`   Trace:`, JSON.stringify(log.trace || {}, null, 2));
});

logger.cleanup();

#!/usr/bin/env node

/**
 * Test Generic Domain Architecture
 * Demonstrates how the generic approach automatically detects and configures
 * domain characteristics without requiring specific adapters
 */

const { Model } = require('../sysadl-framework/SysADLBase');

console.log('🚀 Testing Generic Domain Architecture\n');

// Test 1: Load existing AGV model and auto-detect domain
console.log('=== Test 1: Auto-detect AGV Domain ===');
try {
  const { createModel } = require('../generated/AGV-completo');
  const agvModel = createModel();
  
  console.log(`Model: ${agvModel.name}`);
  console.log('Initializing domain interface...');
  
  // Initialize domain interface
  agvModel.initializeDomainInterface();
  
  // Get domain analysis
  const analysis = agvModel.getDomainAnalysis();
  if (analysis) {
    console.log(`\n📊 Domain Analysis Results:`);
    console.log(`Domain Type: ${analysis.domain}`);
    console.log(`Entities Found: ${analysis.entities.length}`);
    
    console.log('\n🏗️ Detected Entities:');
    for (const entity of analysis.entities.slice(0, 5)) { // Show first 5
      console.log(`  - ${entity.name} (${entity.type})`);
      console.log(`    Properties: ${entity.properties.map(p => p.name).join(', ')}`);
      console.log(`    Capabilities: ${entity.capabilities.join(', ')}`);
    }
    
    console.log(`\n🔍 Reactive Conditions Generated: ${analysis.reactive_conditions.length}`);
    for (const condition of analysis.reactive_conditions.slice(0, 3)) { // Show first 3
      console.log(`  - ${condition.name}: "${condition.expression}"`);
    }
  }
  
} catch (error) {
  console.error('Error loading AGV model:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 2: Create a simple generic model
console.log('=== Test 2: Generic Model Creation ===');

const genericModel = new Model('TestGenericModel');

// Add some components to simulate a simple system
genericModel.components = {
  sensor1: {
    name: 'sensor1',
    ports: {
      temperatureOut: { direction: 'out', type: 'temperature' },
      dataOut: { direction: 'out', type: 'data' }
    }
  },
  controller: {
    name: 'controller',
    ports: {
      commandOut: { direction: 'out', type: 'command' },
      dataIn: { direction: 'in', type: 'data' }
    },
    activities: {
      processData: {
        parameters: ['input', 'output']
      }
    }
  },
  actuator: {
    name: 'actuator',
    ports: {
      commandIn: { direction: 'in', type: 'command' },
      statusOut: { direction: 'out', type: 'status' }
    }
  }
};

console.log('Analyzing generic model...');
genericModel.initializeDomainInterface();

const genericAnalysis = genericModel.getDomainAnalysis();
if (genericAnalysis) {
  console.log(`\n📊 Generic Model Analysis:`);
  console.log(`Domain Type: ${genericAnalysis.domain}`);
  console.log(`Entities: ${genericAnalysis.entities.length}`);
  
  console.log('\n🏗️ Auto-detected Entities:');
  for (const entity of genericAnalysis.entities) {
    console.log(`  - ${entity.name} (${entity.type})`);
    console.log(`    Reactive Properties: ${entity.properties.filter(p => p.reactive).map(p => p.name).join(', ') || 'none'}`);
  }
  
  console.log(`\n🔧 Physics Behaviors: ${genericAnalysis.physics.length}`);
  for (const physics of genericAnalysis.physics) {
    console.log(`  - ${physics.type}: ${physics.properties.join(', ')}`);
  }
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 3: Test state management
console.log('=== Test 3: Generic State Management ===');

if (genericModel.domainInterface) {
  console.log('Testing state operations...');
  
  // Set some states
  genericModel.setDomainState('sensor1', 'temperature', 25.5);
  genericModel.setDomainState('controller', 'status', 'active');
  genericModel.setDomainState('actuator', 'position', 'home');
  
  // Get states
  console.log(`Sensor temperature: ${genericModel.getDomainState('sensor1', 'temperature')}`);
  console.log(`Controller status: ${genericModel.getDomainState('controller', 'status')}`);
  console.log(`Actuator position: ${genericModel.getDomainState('actuator', 'position')}`);
  
  // Subscribe to changes
  console.log('\nSubscribing to temperature changes...');
  const unsubscribe = genericModel.subscribeToDomainStateChange('sensor1', 'temperature', (change) => {
    console.log(`🔥 Temperature changed: ${change.oldValue} → ${change.newValue}`);
  });
  
  // Trigger change
  genericModel.setDomainState('sensor1', 'temperature', 28.3);
  
  // Cleanup
  unsubscribe();
}

console.log('\n🎯 Generic Domain Architecture Test Complete!');
console.log('\n✅ Key Benefits Demonstrated:');
console.log('  - 🔍 Automatic domain detection');
console.log('  - 🏗️ Generic entity type inference');
console.log('  - 📊 Property categorization');
console.log('  - 🔄 Reactive condition generation');
console.log('  - ⚙️ Physics behavior detection');
console.log('  - 🔧 Universal state management');
console.log('\n🚀 No domain-specific adapters required!');
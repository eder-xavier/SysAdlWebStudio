#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Import reactive system for enhanced monitoring
const { ReactiveConditionWatcher } = require('./sysadl-framework/ReactiveConditionWatcher');

// Function to resolve model path
function resolveModelPath(arg) {
  if (!arg) {
    const genDir = path.join(__dirname, 'generated');
    const files = fs.existsSync(genDir) ? fs.readdirSync(genDir).filter(f => f.endsWith('.js')) : [];
    if (files.length === 0) throw new Error('No generated models in ' + genDir);
    return path.join(genDir, files[0]);
  }
  const resolved = path.isAbsolute(arg) ? arg : path.join(process.cwd(), arg);
  if (!fs.existsSync(resolved)) throw new Error('Path not found: ' + resolved);
  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) {
    const files = fs.readdirSync(resolved).filter(f => f.endsWith('.js'));
    if (files.length === 0) throw new Error('No .js in ' + resolved);
    return path.join(resolved, files[0]);
  }
  return resolved;
}

// Function to detect model type and load appropriately
function loadModel(modelPath) {
  const mod = require(modelPath);
  
  // Check if it's an environment/scenario model
  if (mod.createEnvironmentModel && typeof mod.createEnvironmentModel === 'function') {
    return {
      type: 'environment',
      mod,
      model: mod.createEnvironmentModel(),
      factoryFunction: 'createEnvironmentModel'
    };
  }
  
  // Check if it's a traditional model
  if (mod.createModel && typeof mod.createModel === 'function') {
    return {
      type: 'traditional',
      mod,
      model: mod.createModel(),
      factoryFunction: 'createModel'
    };
  }
  
  throw new Error('Model does not export createModel or createEnvironmentModel function');
}

// Function to find input ports recursively
function findInputPorts(model) {
  const inputPorts = [];

  const findPortsRecursive = (root, path = '') => {
    if (!root || typeof root !== 'object') return;

    // If has ports, process them
    if (root.ports) {
      for (const [pname, port] of Object.entries(root.ports)) {
        if (!port.direction || port.direction === 'in') {
          inputPorts.push({
            component: path || (root.name || 'root'),
            port: pname,
            portObj: port,
            fullPath: path ? `${path}.${pname}` : pname
          });
        }
      }
    }

    // Search recursively in subcomponents
    if (root.components) {
      for (const [cname, comp] of Object.entries(root.components)) {
        if (comp && typeof comp === 'object') {
          const newPath = path ? `${path}.${cname}` : cname;
          findPortsRecursive(comp, newPath);
        }
      }
    }
  };

  findPortsRecursive(model);
  return inputPorts;
}

// Function to list available scenarios and environments
function listEnvironmentElements(model) {
  console.log('\n=== Environment and Scenario Elements ===');
  
  if (model.environments && Object.keys(model.environments).length > 0) {
    console.log('\nEnvironments:');
    for (const [name, env] of Object.entries(model.environments)) {
      console.log(`  - ${name} (${env.constructor.name})`);
      if (env.entities && Object.keys(env.entities).length > 0) {
        console.log(`    Entities: ${Object.keys(env.entities).join(', ')}`);
      }
      if (env.events && Object.keys(env.events).length > 0) {
        console.log(`    Events: ${Object.keys(env.events).join(', ')}`);
      }
    }
  }
  
  if (model.scenarioExecutions && Object.keys(model.scenarioExecutions).length > 0) {
    console.log('\nScenario Executions:');
    for (const [name, execution] of Object.entries(model.scenarioExecutions)) {
      console.log(`  - ${name} (${execution.constructor.name})`);
      console.log(`    Status: ${execution.status}`);
      console.log(`    Mode: ${execution.executionMode}`);
      if (execution.scenarios && execution.scenarios.length > 0) {
        console.log(`    Scenarios: ${execution.scenarios.length}`);
      }
    }
  }
  
  if (model.scenarios && Object.keys(model.scenarios).length > 0) {
    console.log('\nScenarios:');
    for (const [name, scenario] of Object.entries(model.scenarios)) {
      console.log(`  - ${name} (${scenario.constructor.name})`);
    }
  }
}

// Enhanced event logging for environment models
function setupEnvironmentLogging(model) {
  if (typeof model.logEvent === 'function') {
    const originalLogEvent = model.logEvent.bind(model);
    model.logEvent = function(event) {
      // Enhanced formatting for environment/scenario events
      if (event.elementType) {
        switch (event.elementType) {
          case 'scenario_execution_start':
            console.log(`[SCENARIO] Started execution: ${event.execution}`);
            break;
          case 'scenario_execution_complete':
            console.log(`[SCENARIO] Completed execution: ${event.execution}`);
            break;
          case 'scenario_execution_stopped':
            console.log(`[SCENARIO] Stopped execution: ${event.execution}`);
            break;
          case 'entity_property_change':
            console.log(`[ENTITY] ${event.entity}.${event.property} = ${event.value}`);
            break;
          case 'event_triggered':
            console.log(`[EVENT] Triggered: ${event.event}`);
            break;
          case 'scene_activated':
            console.log(`[SCENE] Activated: ${event.scene}`);
            break;
          case 'action_property_change':
            console.log(`[BINDING] ${event.action}.${event.property} = ${event.value}`);
            break;
          default:
            console.log(`[EVENT] ${event.elementType}:`, event);
        }
      } else {
        console.log('[EVENT]', event);
      }
      
      return originalLogEvent(event);
    };
  }
}

// Function to setup reactive monitoring system
function setupReactiveMonitoring(model, options) {
  try {
    console.log('\n🚀 Initializing Reactive Monitoring System...');
    
    // Initialize reactive system if model supports it
    if (model.conditionWatcher) {
      console.log('✓ Model already has ReactiveConditionWatcher - enhanced monitoring active');
      
      // Setup automatic state change detection
      if (model.state && typeof model.state === 'object') {
        console.log('✓ State monitoring enabled - tracking property changes');
        
        // Monitor key state changes and log them
        const originalState = JSON.stringify(model.state, null, 2);
        console.log('📊 Initial state snapshot:');
        console.log(originalState);
        
        // Set up periodic state monitoring if streaming
        if (options.stream) {
          let lastStateString = originalState;
          const stateMonitor = setInterval(() => {
            const currentStateString = JSON.stringify(model.state, null, 2);
            if (currentStateString !== lastStateString) {
              console.log('\n🔄 State Change Detected:');
              console.log(currentStateString);
              lastStateString = currentStateString;
            }
          }, 100); // Check every 100ms
          
          // Store monitor for cleanup
          model._stateMonitor = stateMonitor;
        }
      }
      
      // Display registered conditions if available
      if (model.conditionWatcher.conditions && model.conditionWatcher.conditions.size > 0) {
        console.log(`✓ ${model.conditionWatcher.conditions.size} reactive conditions registered:`);
        for (const [id, condition] of model.conditionWatcher.conditions) {
          console.log(`  - ${id}: "${condition.expression}"`);
        }
      }
    } else {
      console.log('ℹ️  Model does not have ReactiveConditionWatcher - basic monitoring only');
    }
    
    console.log('🎯 Reactive monitoring setup complete!\n');
  } catch (error) {
    console.warn('⚠️  Error setting up reactive monitoring:', error.message);
  }
}

async function runSimulation() {
  const args = process.argv.slice(2);
  let modelPath = args[0];
  const options = {
    stream: args.includes('--stream'),
    loop: args.includes('--loop'),
    interactive: args.includes('--interactive'),
    scenario: args.find(arg => arg.startsWith('--scenario=')),
    environment: args.find(arg => arg.startsWith('--environment=')),
    help: args.includes('--help') || args.includes('-h')
  };

  if (options.help) {
    console.log('Environment-aware SysADL Simulator');
    console.log('Usage: node environment-simulator.js [model.js] [options]');
    console.log('');
    console.log('Options:');
    console.log('  --stream          Stream events to console');
    console.log('  --loop            Run in continuous loop mode');
    console.log('  --interactive     Interactive mode with CLI');
    console.log('  --scenario=NAME   Start specific scenario execution');
    console.log('  --environment=NAME Use specific environment');
    console.log('  --help, -h        Show this help');
    console.log('');
    console.log('If no model is specified, uses first .js file in ./generated/');
    return;
  }

  try {
    // Resolve and load model
    const resolvedPath = resolveModelPath(modelPath);
    console.log(`Loading model from: ${resolvedPath}`);
    
    const { type, mod, model, factoryFunction } = loadModel(resolvedPath);
    console.log(`Model type: ${type}`);
    console.log(`Factory function: ${factoryFunction}`);
    console.log(`Model name: ${model.name || 'unnamed'}`);

    // Setup enhanced logging for environment models
    if (type === 'environment') {
      setupEnvironmentLogging(model);
      listEnvironmentElements(model);
      
      // Initialize reactive monitoring system
      setupReactiveMonitoring(model, options);
    }

    // Enable tracing if requested
    if (options.stream && model.enableTrace) {
      model.enableTrace();
    }

    // Find input ports
    const inputPorts = findInputPorts(model);
    console.log(`\nFound ${inputPorts.length} input ports:`);
    inputPorts.forEach(p => console.log(`  ${p.component}.${p.port}`));

    // If environment model, offer scenario execution options
    if (type === 'environment' && model.scenarioExecutions) {
      const executions = Object.keys(model.scenarioExecutions);
      if (executions.length > 0) {
        console.log('\n=== Scenario Execution Options ===');
        
        // Check for specific scenario request
        if (options.scenario) {
          const scenarioName = options.scenario.split('=')[1];
          if (model.scenarioExecutions[scenarioName]) {
            console.log(`Starting scenario execution: ${scenarioName}`);
            try {
              const success = model.startScenarioExecution(scenarioName);
              if (success) {
                console.log(`✓ Scenario execution '${scenarioName}' started successfully`);
              } else {
                console.log(`✗ Failed to start scenario execution '${scenarioName}'`);
              }
            } catch (error) {
              console.error(`Error starting scenario execution: ${error.message}`);
            }
          } else {
            console.log(`Scenario execution '${scenarioName}' not found`);
            console.log(`Available executions: ${executions.join(', ')}`);
          }
        } else {
          console.log('Available scenario executions:');
          executions.forEach(name => console.log(`  - ${name}`));
          console.log('');
          console.log('To start a scenario execution, use: --scenario=NAME');
        }
      }
    }

    // Test executables if any
    if (model.executables && typeof model.executables === 'object') {
      const execNames = Object.keys(model.executables);
      if (execNames.length > 0) {
        console.log(`\n=== Testing ${execNames.length} executable(s) ===`);
        for (const name of execNames) {
          const fn = model.executables[name];
          if (typeof fn === 'function') {
            const arity = fn.length;
            const args = Array(arity).fill(0);
            try {
              const result = fn(...args);
              console.log(`${name}(${args.join(',')}) -> ${result}`);
            } catch (error) {
              console.error(`Error in ${name}: ${error.message}`);
            }
          }
        }
      }
    }

    // Interactive mode
    if (options.interactive) {
      console.log('\n=== Interactive Mode ===');
      console.log('Available commands:');
      console.log('  ports                  - List input ports');
      console.log('  send <comp>.<port> <value> - Send value to port');
      console.log('  scenario <name>        - Start scenario execution');
      console.log('  stop                   - Stop active scenario');
      console.log('  status                 - Show current status');
      console.log('  log                    - Show event log');
      console.log('  trace on/off          - Enable/disable tracing');
      console.log('  help                   - Show this help');
      console.log('  exit                   - Exit simulator');
      console.log('');

      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: 'simulator> '
      });

      rl.prompt();
      rl.on('line', (line) => {
        const cmd = line.trim().toLowerCase();
        const parts = line.trim().split(' ');

        try {
          if (cmd === 'exit' || cmd === 'quit') {
            rl.close();
            return;
          } else if (cmd === 'ports') {
            inputPorts.forEach(p => console.log(`  ${p.component}.${p.port}`));
          } else if (cmd === 'help') {
            console.log('Available commands: ports, send, scenario, stop, status, log, trace, exit');
          } else if (cmd === 'status') {
            console.log(`Model: ${model.name || 'unnamed'} (${type})`);
            if (model.isScenarioExecutionMode && model.isScenarioExecutionMode()) {
              console.log(`Active scenario: ${model.activeScenarioExecution?.name || 'none'}`);
            }
          } else if (cmd === 'log' && model.getEventLog) {
            const events = model.getEventLog();
            console.log(`Event log (${events.length} entries):`);
            events.slice(-10).forEach(e => console.log(`  ${e.iso_time}: ${e.elementType || 'event'}`));
          } else if (parts[0] === 'trace') {
            if (parts[1] === 'on' && model.enableTrace) {
              model.enableTrace();
              console.log('Tracing enabled');
            } else if (parts[1] === 'off' && model.disableTrace) {
              model.disableTrace();
              console.log('Tracing disabled');
            }
          } else if (parts[0] === 'scenario' && parts[1]) {
            if (type === 'environment' && model.startScenarioExecution) {
              const success = model.startScenarioExecution(parts[1]);
              console.log(success ? `Started ${parts[1]}` : `Failed to start ${parts[1]}`);
            } else {
              console.log('Scenario execution not available for this model type');
            }
          } else if (cmd === 'stop') {
            if (model.stopScenarioExecution) {
              model.stopScenarioExecution();
              console.log('Stopped scenario execution');
            }
          } else if (parts[0] === 'send' && parts[1] && parts[2]) {
            const [comp, port] = parts[1].split('.');
            const value = parts[2];
            console.log(`Sending ${value} to ${comp}.${port}`);
            // Implement port sending logic here
          } else {
            console.log('Unknown command. Type "help" for available commands.');
          }
        } catch (error) {
          console.error(`Error: ${error.message}`);
        }

        rl.prompt();
      });

      rl.on('close', () => {
        console.log('\nSimulation ended.');
        process.exit(0);
      });
    }

    // If not interactive, run once and dump logs
    if (!options.interactive && !options.loop) {
      if (model.dumpLog && typeof model.dumpLog === 'function') {
        console.log('\n=== Model Log ===');
        model.dumpLog();
      } else if (model.getEventLog && typeof model.getEventLog === 'function') {
        const events = model.getEventLog();
        if (events.length > 0) {
          console.log('\n=== Event Log ===');
          events.forEach(e => console.log(JSON.stringify(e)));
        }
      }
      
      // Clean up timers and exit automatically for non-interactive mode
      setTimeout(() => {
        console.log('\n🔄 Cleaning up and exiting...');
        
        // Clear state monitoring interval if exists
        if (model._stateMonitor) {
          clearInterval(model._stateMonitor);
          console.log('✓ State monitor cleaned up');
        }
        
        // Clear ExecutionLogger flush interval if exists
        if (model.executionLogger && model.executionLogger.flushInterval) {
          clearInterval(model.executionLogger.flushInterval);
          console.log('✓ ExecutionLogger flush timer cleaned up');
        }
        
        // Final flush of any pending logs
        if (model.executionLogger && model.executionLogger.flush) {
          try {
            model.executionLogger.flush();
          } catch (e) {
            // Silent fail on flush
          }
        }
        
        console.log('✓ Simulation completed - exiting gracefully');
        process.exit(0);
      }, 1000); // Wait 1 second for any final operations
    }

  } catch (error) {
    console.error('Simulation error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runSimulation().catch(console.error);
}

module.exports = { runSimulation, loadModel, findInputPorts };
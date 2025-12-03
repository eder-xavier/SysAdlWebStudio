/**
 * Teste do ExecutionController.js
 * Valida orquestração completa de ScenarioExecution com controles de simulação
 */

const { ExecutionController } = require('../sysadl-framework/ExecutionController');
const SysADLBase = require('../sysadl-framework/SysADLBase');

async function testExecutionController() {
  console.log('🎮 TESTE DO EXECUTION CONTROLLER');
  console.log('🔧 Testando orquestração completa de ScenarioExecution\n');

  try {
    // Create model
    const model = new SysADLBase.Model('ExecutionControllerTestModel');
    
    // Create ExecutionController
    const executionController = new ExecutionController(model, {
      enableParallelExecution: true,
      enableSimulationControls: true,
      enableVisualization: true,
      enableAnalytics: true,
      debugMode: false
    });

    console.log('✅ ExecutionController created successfully');

    // Test 1: Sequential execution
    console.log('📋 Test 1: Sequential Execution');
    
    const sequentialScenarioExecution = {
      name: 'SequentialTest',
      executionMode: 'sequential',
      scenarios: [
        {
          name: 'Setup',
          body: [
            {
              type: 'VariableAssignment',
              variable: 'phase',
              value: '"setup"'
            },
            {
              type: 'Sleep',
              duration: 50
            }
          ]
        },
        {
          name: 'Execute',
          body: [
            {
              type: 'VariableAssignment',
              variable: 'phase',
              value: '"execute"'
            },
            {
              type: 'Sleep',
              duration: 50
            }
          ]
        },
        {
          name: 'Cleanup',
          body: [
            {
              type: 'VariableAssignment',
              variable: 'phase',
              value: '"cleanup"'
            },
            {
              type: 'Sleep',
              duration: 50
            }
          ]
        }
      ]
    };
    
    const result1 = await executionController.executeScenarioExecution(sequentialScenarioExecution, {
      continueOnError: true
    });
    
    console.log('✅ Test 1 Result:', {
      success: result1.success,
      duration: result1.duration,
      completedScenarios: result1.result.completedScenarios,
      totalScenarios: result1.result.totalScenarios
    });
    console.log('');

    // Test 2: Parallel execution
    console.log('🚀 Test 2: Parallel Execution');
    
    const parallelScenarioExecution = {
      name: 'ParallelTest',
      executionMode: 'parallel',
      scenarios: [
        {
          name: 'Task1',
          body: [
            {
              type: 'VariableAssignment',
              variable: 'task1',
              value: '"completed"'
            },
            {
              type: 'Sleep',
              duration: 100
            }
          ]
        },
        {
          name: 'Task2',
          body: [
            {
              type: 'VariableAssignment',
              variable: 'task2',
              value: '"completed"'
            },
            {
              type: 'Sleep',
              duration: 80
            }
          ]
        },
        {
          name: 'Task3',
          body: [
            {
              type: 'VariableAssignment',
              variable: 'task3',
              value: '"completed"'
            },
            {
              type: 'Sleep',
              duration: 90
            }
          ]
        }
      ]
    };
    
    const result2 = await executionController.executeScenarioExecution(parallelScenarioExecution);
    
    console.log('✅ Test 2 Result:', {
      success: result2.success,
      duration: result2.duration,
      completedScenarios: result2.result.completedScenarios,
      totalScenarios: result2.result.totalScenarios,
      maxConcurrency: result2.result.maxConcurrency
    });
    console.log('');

    // Test 3: Simulation controls
    console.log('🎮 Test 3: Simulation Controls');
    
    console.log('⏸️ Testing pause/resume...');
    executionController.pause();
    console.log('Simulation state:', executionController.getSimulationState().status);
    
    executionController.play();
    console.log('Simulation state:', executionController.getSimulationState().status);
    
    console.log('⚡ Testing speed control...');
    executionController.setSpeed(2.0);
    console.log('Simulation speed:', executionController.getSimulationState().speed);
    
    executionController.setSpeed(0.5);
    console.log('Simulation speed:', executionController.getSimulationState().speed);
    
    executionController.stop();
    console.log('Simulation state:', executionController.getSimulationState().status);
    console.log('');

    // Test 4: Conditional execution
    console.log('🤔 Test 4: Conditional Execution');
    
    const conditionalScenarioExecution = {
      name: 'ConditionalTest',
      executionMode: 'conditional',
      scenarios: [
        {
          name: 'AlwaysRun',
          body: [
            {
              type: 'VariableAssignment',
              variable: 'condition_test',
              value: '"always_executed"'
            }
          ]
        },
        {
          name: 'ConditionalRun',
          preConditions: ['false'], // This should be skipped
          body: [
            {
              type: 'VariableAssignment',
              variable: 'conditional_test',
              value: '"should_not_execute"'
            }
          ]
        }
      ]
    };
    
    const result4 = await executionController.executeScenarioExecution(conditionalScenarioExecution);
    
    console.log('✅ Test 4 Result:', {
      success: result4.success,
      duration: result4.duration,
      completedScenarios: result4.result.completedScenarios,
      totalScenarios: result4.result.totalScenarios
    });
    console.log('');

    // Show comprehensive statistics
    console.log('📊 ExecutionController Statistics:');
    const stats = executionController.getStatistics();
    console.log({
      executions: {
        total: stats.executions.totalExecutions,
        successful: stats.executions.successfulExecutions,
        failed: stats.executions.failedExecutions,
        averageTime: Math.round(stats.executions.averageExecutionTime)
      },
      active: stats.active,
      simulation: {
        status: stats.simulation.status,
        speed: stats.simulation.speed,
        progress: stats.simulation.progress
      }
    });
    console.log('');

    console.log('🎉 Todos os testes do ExecutionController foram executados com sucesso!');
    return true;

  } catch (error) {
    console.error('❌ Erro no teste do ExecutionController:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Execute the test
testExecutionController()
  .then(success => {
    if (success) {
      console.log('\n✅ Todos os testes do ExecutionController passaram!');
      process.exit(0);
    } else {
      console.log('\n❌ Alguns testes falharam!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });
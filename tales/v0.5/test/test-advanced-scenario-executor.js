/**
 * Teste avançado do ScenarioExecutor.js
 * Valida estruturas de programação (loops, condicionais)
 */

const { ScenarioExecutor } = require('../sysadl-framework/ScenarioExecutor');
const SysADLBase = require('../sysadl-framework/SysADLBase');

async function testAdvancedScenarioExecutor() {
  console.log('🧪 TESTE AVANÇADO DO SCENARIO EXECUTOR');
  console.log('🔧 Testando estruturas de programação\n');

  try {
    // Create model
    const model = new SysADLBase.Model('AdvancedTestModel');
    
    // Create ScenarioExecutor with all features enabled
    const scenarioExecutor = new ScenarioExecutor(model, {
      enableParallelExecution: true,
      enableVariables: true,
      enableLoops: true,
      enableConditionals: true,
      debugMode: false,
      enableReactiveIntegration: true
    });

    console.log('✅ Advanced ScenarioExecutor created successfully');

    // Test 1: Conditional execution
    console.log('🤔 Test 1: Conditional Execution');
    
    const conditionalScenario = {
      name: 'ConditionalTest',
      type: 'test',
      body: [
        {
          type: 'VariableAssignment',
          variable: 'temperature',
          value: '25'
        },
        {
          type: 'IfStatement',
          condition: 'temperature > 20',
          thenBody: [
            {
              type: 'VariableAssignment',
              variable: 'status',
              value: '"hot"'
            }
          ],
          elseBody: [
            {
              type: 'VariableAssignment',
              variable: 'status',
              value: '"cold"'
            }
          ]
        }
      ]
    };
    
    const result1 = await scenarioExecutor.executeScenario(conditionalScenario);
    console.log('✅ Test 1 Result:', {
      success: result1.success,
      variables: result1.variables,
      duration: result1.duration
    });
    console.log('');

    // Test 2: For loop
    console.log('🔢 Test 2: For Loop');
    
    const forLoopScenario = {
      name: 'ForLoopTest',
      type: 'test',
      body: [
        {
          type: 'VariableAssignment',
          variable: 'sum',
          value: '0'
        },
        {
          type: 'ForLoop',
          variable: 'i',
          start: '1',
          end: '5',
          step: '1',
          body: [
            {
              type: 'VariableAssignment',
              variable: 'sum',
              value: 'sum + i'
            }
          ]
        }
      ]
    };
    
    const result2 = await scenarioExecutor.executeScenario(forLoopScenario);
    console.log('✅ Test 2 Result:', {
      success: result2.success,
      variables: result2.variables,
      duration: result2.duration
    });
    console.log('');

    // Test 3: While loop with break
    console.log('🔄 Test 3: While Loop with Break');
    
    const whileLoopScenario = {
      name: 'WhileLoopTest',
      type: 'test',
      body: [
        {
          type: 'VariableAssignment',
          variable: 'count',
          value: '0'
        },
        {
          type: 'WhileLoop',
          condition: 'count < 10',
          body: [
            {
              type: 'VariableAssignment',
              variable: 'count',
              value: 'count + 1'
            },
            {
              type: 'IfStatement',
              condition: 'count >= 3',
              thenBody: [
                { type: 'Break' }
              ]
            }
          ]
        }
      ]
    };
    
    const result3 = await scenarioExecutor.executeScenario(whileLoopScenario);
    console.log('✅ Test 3 Result:', {
      success: result3.success,
      variables: result3.variables,
      duration: result3.duration
    });
    console.log('');

    // Test 4: Nested structures
    console.log('🏗️ Test 4: Nested Structures');
    
    const nestedScenario = {
      name: 'NestedStructuresTest',
      type: 'test',
      body: [
        {
          type: 'VariableAssignment',
          variable: 'total',
          value: '0'
        },
        {
          type: 'ForLoop',
          variable: 'i',
          start: '1',
          end: '3',
          body: [
            {
              type: 'IfStatement',
              condition: 'i % 2 === 1', // odd numbers
              thenBody: [
                {
                  type: 'VariableAssignment',
                  variable: 'total',
                  value: 'total + i * 2'
                }
              ]
            }
          ]
        }
      ]
    };
    
    const result4 = await scenarioExecutor.executeScenario(nestedScenario);
    console.log('✅ Test 4 Result:', {
      success: result4.success,
      variables: result4.variables,
      duration: result4.duration
    });
    console.log('');

    // Test 5: Built-in functions
    console.log('⚙️ Test 5: Built-in Functions');
    
    const functionsScenario = {
      name: 'BuiltinFunctionsTest',
      type: 'test',
      body: [
        {
          type: 'VariableAssignment',
          variable: 'timestamp',
          value: 'now()'
        },
        {
          type: 'VariableAssignment',
          variable: 'randomValue',
          value: 'Math.floor(random() * 100)'
        },
        {
          type: 'VariableAssignment',
          variable: 'squared',
          value: 'Math.pow(5, 2)'
        }
      ]
    };
    
    const result5 = await scenarioExecutor.executeScenario(functionsScenario);
    console.log('✅ Test 5 Result:', {
      success: result5.success,
      variables: result5.variables,
      duration: result5.duration
    });
    console.log('');

    // Show execution statistics
    console.log('📊 Execution Statistics:');
    const stats = scenarioExecutor.getStatistics();
    console.log({
      totalExecutions: stats.totalExecutions,
      completedExecutions: stats.completedExecutions,
      failedExecutions: stats.failedExecutions,
      averageExecutionTime: stats.averageExecutionTime,
      variableAssignments: stats.variableAssignments,
      loopIterations: stats.loopIterations,
      conditionEvaluations: stats.conditionEvaluations
    });

    console.log('\n🎉 Todos os testes avançados do ScenarioExecutor foram executados com sucesso!');
    return true;

  } catch (error) {
    console.error('❌ Erro no teste avançado:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Execute the test
testAdvancedScenarioExecutor()
  .then(success => {
    if (success) {
      console.log('\n✅ Todos os testes avançados passaram!');
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
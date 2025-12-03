/**
 * Teste do ScenarioExecutor.js
 * Valida execução de cenários com estruturas de programação e integração reativa
 */

const { ScenarioExecutor } = require('../sysadl-framework/ScenarioExecutor');
const SysADLBase = require('../sysadl-framework/SysADLBase');

async function testScenarioExecutor() {
  console.log('🧪 TESTE DO SCENARIO EXECUTOR');
  console.log('🔧 Testando execução de cenários com estruturas de programação\n');

  // Create model with ScenarioExecutor
  const model = new SysADLBase.Model('TestModel');
  
  // Create ScenarioExecutor
  const scenarioExecutor = new ScenarioExecutor(model, {
    enableParallelExecution: true,
    enableVariables: true,
    enableLoops: true,
    enableConditionals: true,
    debugMode: true
  });

  try {
    // Test 1: Simple variable assignment and conditional
    console.log('📝 Test 1: Variable Assignment and Conditional');
    
    const simpleScenario = {
      name: 'SimpleVariableTest',
      type: 'test',
      body: [
        {
          type: 'VariableAssignment',
          variable: 'counter',
          value: '5'
        },
        {
          type: 'VariableAssignment',
          variable: 'message',
          value: '"Hello World"'
        },
        {
          type: 'IfStatement',
          condition: 'counter > 3',
          thenBody: [
            {
              type: 'VariableAssignment',
              variable: 'result',
              value: '"Counter is greater than 3"'
            }
          ],
          elseBody: [
            {
              type: 'VariableAssignment',
              variable: 'result',
              value: '"Counter is not greater than 3"'
            }
          ]
        }
      ]
    };
    
    const result1 = await scenarioExecutor.executeScenario(simpleScenario, {
      variables: { initial: 'test' }
    });
    
    console.log('✅ Test 1 Result:', {
      success: result1.success,
      variables: result1.variables,
      duration: result1.duration
    });
    console.log('');

    // Test 2: For loop with state updates
    console.log('🔢 Test 2: For Loop with State Updates');
    
    const loopScenario = {
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
            },
            {
              type: 'StateUpdate',
              path: 'test.iteration',
              value: 'i'
            }
          ]
        }
      ]
    };
    
    const result2 = await scenarioExecutor.executeScenario(loopScenario);
    
    console.log('✅ Test 2 Result:', {
      success: result2.success,
      variables: result2.variables,
      duration: result2.duration
    });
    console.log('');

    // Test 3: While loop with condition
    console.log('🔄 Test 3: While Loop with Break Condition');
    
    const whileScenario = {
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
          condition: 'count < 3',
          body: [
            {
              type: 'VariableAssignment',
              variable: 'count',
              value: 'count + 1'
            },
            {
              type: 'StateUpdate',
              path: 'test.whileCount',
              value: 'count'
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
    
    const result3 = await scenarioExecutor.executeScenario(whileScenario);
    
    console.log('✅ Test 3 Result:', {
      success: result3.success,
      variables: result3.variables,
      duration: result3.duration
    });
    console.log('');

    // Test 4: Event injection
    console.log('⚡ Test 4: Event Injection');
    
    const eventScenario = {
      name: 'EventInjectionTest',
      type: 'test',
      body: [
        {
          type: 'VariableAssignment',
          variable: 'eventData',
          value: '"test message"'
        },
        {
          type: 'EventInjection',
          eventName: 'TestEvent',
          parameters: {
            message: 'eventData',
            timestamp: 'now()'
          }
        },
        {
          type: 'Sleep',
          duration: '100'
        }
      ]
    };
    
    const result4 = await scenarioExecutor.executeScenario(eventScenario);
    
    console.log('✅ Test 4 Result:', {
      success: result4.success,
      variables: result4.variables,
      duration: result4.duration
    });
    console.log('');

    // Test 5: Complex scenario with nested structures
    console.log('🏗️ Test 5: Complex Nested Structures');
    
    const complexScenario = {
      name: 'ComplexScenarioTest',
      type: 'test',
      body: [
        {
          type: 'VariableAssignment',
          variable: 'numbers',
          value: '[]'
        },
        {
          type: 'ForLoop',
          variable: 'i',
          start: '1',
          end: '3',
          body: [
            {
              type: 'IfStatement',
              condition: 'i % 2 === 1',
              thenBody: [
                {
                  type: 'VariableAssignment',
                  variable: 'temp',
                  value: 'i * 2'
                },
                {
                  type: 'StateUpdate',
                  path: 'test.oddNumber',
                  value: 'temp'
                }
              ]
            }
          ]
        }
      ]
    };
    
    const result5 = await scenarioExecutor.executeScenario(complexScenario);
    
    console.log('✅ Test 5 Result:', {
      success: result5.success,
      variables: result5.variables,
      duration: result5.duration
    });
    console.log('');

    // Show statistics
    console.log('📊 ScenarioExecutor Statistics:');
    const stats = scenarioExecutor.getStatistics();
    console.log(JSON.stringify(stats, null, 2));
    console.log('');

    console.log('🎉 Todos os testes do ScenarioExecutor foram executados com sucesso!');

  } catch (error) {
    console.error('❌ Erro no teste do ScenarioExecutor:', error);
    throw error;
  }
}

// Execute the test
testScenarioExecutor();
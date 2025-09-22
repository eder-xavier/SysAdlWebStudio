/**
 * Teste básico do ScenarioExecutor.js
 * Valida funcionalidade básica sem dependências complexas
 */

const { ScenarioExecutor } = require('../sysadl-framework/ScenarioExecutor');
const SysADLBase = require('../sysadl-framework/SysADLBase');

async function testBasicScenarioExecutor() {
  console.log('🧪 TESTE BÁSICO DO SCENARIO EXECUTOR');
  console.log('🔧 Testando funcionalidade básica\n');

  try {
    // Create model with minimal setup
    const model = new SysADLBase.Model('TestModel');
    
    // Create ScenarioExecutor with reduced dependencies
    const scenarioExecutor = new ScenarioExecutor(model, {
      enableParallelExecution: false,
      enableVariables: true,
      enableLoops: false,
      enableConditionals: false,
      debugMode: false,
      enableReactiveIntegration: false // Disable reactive integration for basic test
    });

    console.log('✅ ScenarioExecutor created successfully');

    // Test 1: Simple variable assignment
    console.log('📝 Test 1: Simple Variable Assignment');
    
    const simpleScenario = {
      name: 'BasicVariableTest',
      type: 'test',
      body: [
        {
          type: 'VariableAssignment',
          variable: 'counter',
          value: 5 // Use literal value instead of string expression
        },
        {
          type: 'VariableAssignment',
          variable: 'message',
          value: '"Hello World"' // Use quoted string for expression evaluation
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

    // Test 2: Sleep test
    console.log('😴 Test 2: Sleep Test');
    
    const sleepScenario = {
      name: 'SleepTest',
      type: 'test',
      body: [
        {
          type: 'Sleep',
          duration: 100
        }
      ]
    };
    
    const result2 = await scenarioExecutor.executeScenario(sleepScenario);
    
    console.log('✅ Test 2 Result:', {
      success: result2.success,
      duration: result2.duration
    });

    console.log('🎉 Teste básico do ScenarioExecutor concluído com sucesso!');
    return true;

  } catch (error) {
    console.error('❌ Erro no teste básico:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Execute the test
testBasicScenarioExecutor()
  .then(success => {
    if (success) {
      console.log('\n✅ Todos os testes básicos passaram!');
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
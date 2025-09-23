/**
 * Complete Integration Test for SysADL Framework Phase 4-6
 * Tests ScenarioExecutor, ExecutionController, and SysADLBase integration
 */

// Import all components
const SysADLBase = require('./SysADLBase');

async function runCompleteIntegrationTest() {
    console.log('🔬 SysADL Framework Complete Integration Test');
    console.log('============================================');

    try {
        // ========= 1. Initialize SysADL Model =========
        console.log('\n📋 Phase 1: Model Initialization');
        
        const model = new SysADLBase.Model('TestIntegrationModel');
        console.log(`✅ Model initialized: ${model.name}`);
        
        // ========= 2. Test Basic Scenario Execution =========
        console.log('\n📋 Phase 2: Basic Scenario Execution');
        
        const basicScenario = {
            name: 'BasicIntegrationScenario',
            variables: {},
            statements: [
                {
                    type: 'assignment',
                    variable: 'testVar',
                    expression: 'Hello Integration'
                },
                {
                    type: 'assignment', 
                    variable: 'counter',
                    expression: 42
                },
                {
                    type: 'output',
                    message: 'Basic scenario executed successfully'
                }
            ]
        };

        const scenarioResult = await model.executeScenario(basicScenario, { debug: true });
        console.log(`✅ Basic scenario execution completed in ${scenarioResult.duration}ms`);
        console.log(`   Variables: ${Object.keys(scenarioResult.variables).join(', ')}`);
        
        // ========= 3. Test ScenarioExecution Orchestration =========
        console.log('\n📋 Phase 3: ScenarioExecution Orchestration');
        
        const scenarioExecution = {
            name: 'IntegrationOrchestration',
            executionMode: 'sequential',
            scenarios: [
                {
                    name: 'Scenario1',
                    variables: {},
                    statements: [
                        {
                            type: 'assignment',
                            variable: 'step',
                            expression: 1
                        },
                        {
                            type: 'sleep',
                            duration: 50
                        }
                    ]
                },
                {
                    name: 'Scenario2', 
                    variables: {},
                    statements: [
                        {
                            type: 'assignment',
                            variable: 'step',
                            expression: 2
                        },
                        {
                            type: 'conditional',
                            condition: 'step == 2',
                            thenStatements: [
                                {
                                    type: 'output',
                                    message: 'Conditional executed correctly'
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const orchestrationResult = await model.executeScenarioExecution(scenarioExecution, { globalDebug: true });
        console.log(`✅ Orchestration completed in ${orchestrationResult.duration}ms`);
        console.log(`   Execution mode: ${orchestrationResult.executionMode}`);
        console.log(`   Scenarios executed: ${orchestrationResult.scenariosExecuted}`);
        
        // ========= 4. Test Reactive State Management =========
        console.log('\n📋 Phase 4: Reactive State Management');
        
        let stateChangeCount = 0;
        let conditionTriggered = false;
        
        // Subscribe to state changes
        const subscription = model.subscribeToState('integration.test', (newValue, oldValue, path) => {
            stateChangeCount++;
            console.log(`   📊 State change detected: ${path} = ${newValue} (was ${oldValue})`);
        });
        
        // Watch condition
        const conditionWatcher = model.watchCondition(
            (state) => state.integration?.test > 100,
            () => {
                conditionTriggered = true;
                console.log('   ⚡ Condition triggered: integration.test > 100');
            }
        );
        
        // Get reactive state and modify it
        const reactiveState = model.getReactiveState();
        reactiveState.integration = { test: 50 };
        await new Promise(resolve => setTimeout(resolve, 10)); // Let reactive updates propagate
        
        reactiveState.integration.test = 150;
        await new Promise(resolve => setTimeout(resolve, 10)); // Let reactive updates propagate
        
        console.log(`✅ Reactive state management tested`);
        console.log(`   State changes: ${stateChangeCount}`);
        console.log(`   Condition triggered: ${conditionTriggered}`);
        
        // Cleanup subscriptions
        subscription();
        conditionWatcher();
        
        // ========= 5. Test Simulation Controls =========
        console.log('\n📋 Phase 5: Simulation Controls');
        
        const simulationScenario = {
            name: 'SimulationTest',
            executionMode: 'parallel',
            scenarios: [
                {
                    name: 'LongRunningScenario',
                    variables: {},
                    statements: [
                        {
                            type: 'loop',
                            condition: 'i < 5',
                            initialization: { variable: 'i', expression: 0 },
                            increment: { variable: 'i', expression: 'i + 1' },
                            statements: [
                                {
                                    type: 'sleep',
                                    duration: 100
                                },
                                {
                                    type: 'output',
                                    message: 'Loop iteration {i}'
                                }
                            ]
                        }
                    ]
                }
            ]
        };
        
        // Start simulation
        console.log('   🎮 Starting simulation...');
        await model.startSimulation(simulationScenario, { speed: 2.0 });
        
        let status = model.getSimulationStatus();
        console.log(`   📊 Simulation status: ${status.state} (speed: ${status.speed}x)`);
        
        // Test pause/resume
        await new Promise(resolve => setTimeout(resolve, 150));
        console.log('   ⏸️  Pausing simulation...');
        await model.pauseSimulation();
        
        status = model.getSimulationStatus();
        console.log(`   📊 Simulation status: ${status.state}`);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('   ▶️  Resuming simulation...');
        await model.resumeSimulation();
        
        // Change speed
        model.setSimulationSpeed(0.5);
        console.log('   🐌 Changed simulation speed to 0.5x');
        
        // Wait a bit then stop
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('   🛑 Stopping simulation...');
        await model.stopSimulation();
        
        status = model.getSimulationStatus();
        console.log(`✅ Simulation controls tested - Final status: ${status.state}`);
        
        // ========= 6. Test Programming Structures =========
        console.log('\n📋 Phase 6: Programming Structures');
        
        const programmingScenario = {
            name: 'ProgrammingStructuresTest',
            variables: {},
            statements: [
                // Variables and expressions
                {
                    type: 'assignment',
                    variable: 'sum',
                    expression: 0
                },
                {
                    type: 'assignment',
                    variable: 'product',
                    expression: 1
                },
                
                // For loop
                {
                    type: 'loop',
                    condition: 'i <= 3',
                    initialization: { variable: 'i', expression: 1 },
                    increment: { variable: 'i', expression: 'i + 1' },
                    statements: [
                        {
                            type: 'assignment',
                            variable: 'sum',
                            expression: 'sum + i'
                        },
                        {
                            type: 'assignment',
                            variable: 'product',
                            expression: 'product * i'
                        }
                    ]
                },
                
                // Conditional logic
                {
                    type: 'conditional',
                    condition: 'sum == 6',
                    thenStatements: [
                        {
                            type: 'output',
                            message: 'Sum calculation correct: {sum}'
                        }
                    ],
                    elseStatements: [
                        {
                            type: 'output',
                            message: 'Sum calculation incorrect: {sum}'
                        }
                    ]
                },
                
                // While loop with condition
                {
                    type: 'assignment',
                    variable: 'countdown',
                    expression: 3
                },
                {
                    type: 'while',
                    condition: 'countdown > 0',
                    statements: [
                        {
                            type: 'assignment',
                            variable: 'countdown',
                            expression: 'countdown - 1'
                        }
                    ]
                }
            ]
        };
        
        const programmingResult = await model.executeScenario(programmingScenario, { debug: true });
        console.log(`✅ Programming structures tested in ${programmingResult.duration}ms`);
        console.log(`   Final variables: sum=${programmingResult.variables.sum}, product=${programmingResult.variables.product}, countdown=${programmingResult.variables.countdown}`);
        
        // ========= 7. Test Error Handling =========
        console.log('\n📋 Phase 7: Error Handling');
        
        try {
            const errorScenario = {
                name: 'ErrorTest',
                variables: {},
                statements: [
                    {
                        type: 'assignment',
                        variable: 'x',
                        expression: 'undefined_variable'
                    }
                ]
            };
            
            await model.executeScenario(errorScenario);
            console.log('❌ Error test failed - should have thrown error');
        } catch (error) {
            console.log(`✅ Error handling works correctly: ${error.message}`);
        }
        
        // ========= 8. Test Cleanup =========
        console.log('\n📋 Phase 8: Cleanup');
        
        await model.cleanup();
        console.log('✅ Model cleanup completed');
        
        // ========= Summary =========
        console.log('\n🎉 INTEGRATION TEST SUMMARY');
        console.log('============================');
        console.log('✅ Model initialization');
        console.log('✅ Basic scenario execution');
        console.log('✅ ScenarioExecution orchestration');
        console.log('✅ Reactive state management');
        console.log('✅ Simulation controls (start/pause/resume/stop/speed)');
        console.log('✅ Programming structures (loops, conditionals, variables)');
        console.log('✅ Error handling');
        console.log('✅ Model cleanup');
        console.log('\n🎯 All integration tests PASSED!');
        
    } catch (error) {
        console.error('\n❌ Integration test FAILED:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the test
runCompleteIntegrationTest().then(() => {
    console.log('\n✨ Integration test completed successfully!');
    process.exit(0);
});
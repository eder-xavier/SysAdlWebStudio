// @ts-nocheck
// Generated Simulation Code for SysADLModel

import * as architecture from './sysadlmodel.js';

async function main() {
    console.log('Starting simulation of SysADLModel...');
    const system = new architecture.SystemCP();
    await system.start();
    console.log('System initialized successfully');

    // Helper function to simulate data sending to a sub-component's port
    async function simulate(componentName, portName, value) {
        if (!system) {
            console.error('System not initialized');
            return;
        }
        const component = system.subComponents.get(componentName);
        if (!component) {
            console.error(`Component '${componentName}' not found`);
            return;
        }
        const port = component.ports.find(p => p.name === portName);
        if (!port) {
            console.error(`Port '${portName}' not found in '${componentName}'`);
            return;
        }
        console.log(`Simulating: Sending ${value} to ${componentName}.${portName}`);
        await port.send(value);
    }

    // Simulation scenario
    await simulate('s1', 'current', 0);
    await simulate('s2', 'current', 0);
    await simulate('tempMon', 's1', 0);
    await simulate('stdOut', 'c3', 0);

    console.log('Simulation completed');
}

main().catch(err => console.error(`Simulation error: ${err.message}`));
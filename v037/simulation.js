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

    // Example simulation scenario (modify as needed)
    // Boundary components with output ports:
    // - s1.temp1
    // - s2.temp2

    //await simulate('s1', 'temp1', 77.0);
    //await simulate('s2', 'temp2', 86.0);

    console.log('Simulation completed');
}

main().catch(err => console.error(`Simulation error: ${err.message}`));
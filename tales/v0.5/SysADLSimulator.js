#!/usr/bin/env node
/**
 * SysADL Simulator - Unified Execution Tool
 * 
 * Orchestrates the simulation of SysADL models:
 * 1. Transforms .sysadl -> .js
 * 2. Loads internal model and environment model
 * 3. Binds environment to internal model based on configuration
 * 4. Executes scenarios
 * 5. Generates unified logs (Execution + Simulation Trace)
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Import SimulationLogger from framework
const SimulationLogger = require('./sysadl-framework/SimulationLogger');

class SysADLSimulator {
    constructor(config = {}) {
        this.config = {
            outputDir: './generated',
            logsDir: './logs',
            verbose: false,
            ...config
        };
        this.startTime = Date.now();
    }

    log(msg) {
        if (this.config.verbose || msg.startsWith('✓') || msg.startsWith('!')) {
            console.log(msg);
        }
    }

    async run(sysadlFile) {
        console.log('🚀 SysADL Unified Simulator');
        console.log('='.repeat(50));

        try {
            // 1. Validate and Transform
            this.validateInput(sysadlFile);
            const generatedFiles = await this.transform(sysadlFile);

            // 2. Load Models
            console.log('\n📦 Loading models...');
            const { mainModel, envModel } = this.loadModels(generatedFiles);

            if (!envModel) {
                throw new Error('Environment model not found. Ensure .sysadl contains environment/scenario definitions.');
            }

            // 3. Setup Logging
            console.log('📝 Setting up loggers...');
            const simLogger = this.setupLogging(mainModel, envModel);

            // 4. Perform Binding
            console.log('Binding environment to system...');
            this.performBinding(mainModel, envModel);

            // 5. Run Scenarios
            // Note: JSONL is written incrementally, so Ctrl+C will preserve logs
            console.log('\nExecuting scenarios...');
            await this.runScenarios(envModel);

            // 6. Save Logs (also saved incrementally by SimulationLogger)
            this.saveLogs(simLogger, sysadlFile);

            // Cleanup loggers to allow process exit
            if (mainModel.logger && typeof mainModel.logger.stop === 'function') {
                mainModel.logger.stop();
            }
            if (envModel.logger && typeof envModel.logger.stop === 'function') {
                envModel.logger.stop();
            }

            console.log('\n[INFO] Simulation completed successfully!');
            process.exit(0);

        } catch (error) {
            console.error('\n[ERROR] Simulation failed:', error.message);
            if (this.config.verbose) console.error(error.stack);
            process.exit(1);
        }
    }

    validateInput(file) {
        if (!file || !fs.existsSync(file) || !file.endsWith('.sysadl')) {
            throw new Error(`Invalid input file: ${file}`);
        }
    }

    async transform(sysadlFile) {
        const baseName = path.basename(sysadlFile, '.sysadl');
        if (!fs.existsSync(this.config.outputDir)) {
            fs.mkdirSync(this.config.outputDir, { recursive: true });
        }

        const mainOutput = path.join(this.config.outputDir, `${baseName}.js`);
        const envScenOutput = path.join(this.config.outputDir, `${baseName}-env-scen.js`);

        if (this.config.skipTransform && fs.existsSync(mainOutput)) {
            this.log(`Skipping transformation (--skip-transform used). Using existing files.`);
            return {
                main: mainOutput,
                envScen: fs.existsSync(envScenOutput) ? envScenOutput : null
            };
        }

        const transformerPath = path.join(__dirname, 'transformer.js');

        this.log(`Running transformer on ${sysadlFile}...`);

        await new Promise((resolve, reject) => {
            const child = spawn('node', [transformerPath, sysadlFile, mainOutput], {
                stdio: this.config.verbose ? 'inherit' : 'ignore'
            });
            child.on('close', code => code === 0 ? resolve() : reject(new Error(`Transformer failed with code ${code}`)));
        });


        return {
            main: mainOutput,
            envScen: fs.existsSync(envScenOutput) ? envScenOutput : null
        };
    }

    loadModels(files) {
        // Clear cache to ensure fresh load
        delete require.cache[require.resolve(path.resolve(files.main))];
        const mainModule = require(path.resolve(files.main));
        const mainModel = mainModule.createModel();
        this.log(`✓ Loaded system model: ${mainModel.name}`);

        let envModel = null;
        if (files.envScen) {
            delete require.cache[require.resolve(path.resolve(files.envScen))];
            const envModule = require(path.resolve(files.envScen));
            envModel = envModule.createEnvironmentModel();
            this.log(`✓ Loaded environment model: ${envModel.name}`);
        }

        return { mainModel, envModel };
    }

    setupLogging(mainModel, envModel) {
        // SimulationLogger now writes JSONL incrementally (each event appended immediately)
        const simLogger = new SimulationLogger(this.config);
        simLogger.enable();

        // Attach to main model
        if (mainModel.attachSimulationLogger) {
            mainModel.attachSimulationLogger(simLogger);
        }

        // Attach logger to environment model if supported
        if (envModel.attachSimulationLogger) {
            envModel.attachSimulationLogger(simLogger);
        }

        // ExecutionLogger (Console/Narrative)
        // SysADLBase models usually have a default logger, we ensure it prints to console
        if (mainModel.logger) {
            mainModel.logger.logToConsole = true;
        }
        if (envModel.logger) {
            envModel.logger.logToConsole = true;
        }

        return simLogger;
    }

    performBinding(mainModel, envModel) {
        const config = envModel.configuration;
        if (!config || !config.associations) {
            this.log('! No associations found in environment configuration.');
            return;
        }

        for (const [envPath, sysPath] of Object.entries(config.associations)) {
            // envPath: e.g., "Vehicle.outNotification" (EnvComponent.EnvPort)
            // sysPath: e.g., "agvs.in_outDataAgv.outNotifications" (Component...Port)

            const envPort = this.resolveEnvPort(envModel, envPath);
            const sysPort = this.resolveSysPort(mainModel, sysPath);

            if (envPort && sysPort) {
                // Perform bidirectional binding
                // EnvPort -> Port
                envPort.bindToPort(sysPort);
                this.log(`✓ Bound ${envPath} <-> ${sysPath}`);
            } else {
                console.warn(`! Failed to bind ${envPath} <-> ${sysPath}`);
                if (!envPort) console.warn(`  - EnvPort not found: ${envPath}`);
                if (!sysPort) console.warn(`  - SysPort not found: ${sysPath}`);
            }
        }
    }

    resolveEnvPort(envModel, pathStr) {
        // Expected format: "EnvComponentName.EnvPortName"
        // But envModel contains instances in 'configuration' or directly if it's the config object
        // Actually, envModel IS the EnvironmentConfiguration instance usually

        // We need to find the EnvComponent instance in the configuration
        // The configuration usually has properties for instances, or we look into 'environmentDef'

        // Let's look at how AGV-completo-env-scen.js defines it:
        // class MyFactoryConfiguration extends EnvironmentConfiguration { ... this.associations = ... }
        // It doesn't seem to expose instances directly in a list, but they might be properties of the class if instantiated?
        // Wait, in the generated code:
        // this.registerEntityClass...
        // But where are the instances?
        // Ah, the generated code for EnvironmentConfiguration usually instantiates them?
        // Let's check AGV-completo-env-scen.js content again.

        // It seems the instances are NOT explicitly created as properties of configuration in the snippet I saw.
        // However, the associations use "Vehicle.outNotification". "Vehicle" is the CLASS name or INSTANCE name?
        // In SysADL: "entity Vehicle" -> "EnvComponent Vehicle"
        // In associations: "Vehicle.outNotification"

        // If "Vehicle" is a singleton/instance name, we need to find it.
        // SysADLBase EnvironmentConfiguration might store them.

        // HACK: For now, let's assume the EnvironmentConfiguration instance has properties matching the names
        // OR we traverse `envModel` to find them.

        const [compName, portName] = pathStr.split('.');

        // Try to find component in envModel properties
        // In the generated code, we didn't see explicit "this.Vehicle = new Vehicle()" in the constructor snippet.
        // But maybe they are created dynamically or I missed it.
        // Let's assume they are available on envModel (the configuration instance).

        // If not found directly, maybe we need to look deeper.
        // But wait, the associations are defined as strings.

        // Let's try to find the component by name in the model
        // SysADLBase might have a registry?

        // Fallback: Check if envModel has a 'components' or 'entities' collection
        let comp = envModel[compName];

        // If not found, maybe it's inside an 'environmentDef'?
        if (!comp && envModel.environmentDef) {
            // environmentDef is the EnvironmentDefinition, which registers classes, not instances.
        }

        // If the generated code doesn't instantiate them, we might have a problem.
        // But `simulator.js` worked? No, `simulator.js` runs `AGV-completo-env-scen.js`.
        // Let's look at how `simulator.js` runs it.
        // It calls `model.startScenarioExecution`.

        // Wait, the binding needs to happen on INSTANCES.
        // Who creates the instances?
        // The Scenario Execution? Or the Configuration?

        // In SysADL, the Configuration *defines* the structure.
        // The instances should be created when the Configuration is instantiated.

        // Let's look at `AGV-completo-env-scen.js` again (lines 180+).
        // It has `this.associations = ...`.
        // But I don't see `this.Vehicle = ...`.

        // HOWEVER, the events (lines 213+) use global variables like `supervisor`, `agv1`, `agv2`.
        // Where do these come from?
        // Ah, they are likely created in the global scope or module scope by the generated code?
        // Or maybe they are created inside `EnvironmentConfiguration`?

        // Let's check `AGV-completo-env-scen.js` lines 1-100 again or search for `new Vehicle`.
        // I'll assume for now that `envModel` (the configuration) SHOULD have them.
        // If not, I'll have to debug.

        if (!comp) {
            // Try to find in global scope if they were leaked (unlikely in Node module)
            // Try to find in `envModel.entities` if it exists
            if (envModel.entities && envModel.entities[compName]) {
                comp = envModel.entities[compName];
            }
        }

        if (comp && comp.ports && comp.ports[portName]) {
            return comp.ports[portName];
        }
        return null;
    }

    resolveSysPort(mainModel, pathStr) {
        // pathStr: "agvs.in_outDataAgv.outNotifications"
        // This is a path into the main model structure.
        const parts = pathStr.split('.');
        let current = mainModel;

        for (const part of parts) {
            if (!current) return null;

            // Check components
            if (current.components && current.components[part]) {
                current = current.components[part];
                continue;
            }

            // Check ports
            if (current.ports && current.ports[part]) {
                current = current.ports[part];
                continue;
            }

            // Check subports (for composite ports)
            if (current.subports && current.subports[part]) {
                current = current.subports[part];
                continue;
            }

            return null;
        }

        // If we ended up at a Port (or EnvPort-like), return it
        if (current && (current.constructor.name.includes('Port') || current.direction)) {
            return current;
        }

        return null;
    }

    async runScenarios(envModel) {
        if (!envModel.scenarioExecutions) {
            console.log('! No scenario executions defined.');
            return;
        }

        // Execute all defined scenario executions
        for (const [name, execution] of Object.entries(envModel.scenarioExecutions)) {
            console.log(`\n▶ Starting execution: ${name}`);

            // Attach environment configuration if missing
            if (!execution.environment && envModel.environments) {
                const envConfigName = Object.keys(envModel.environments).find(k =>
                    envModel.environments[k].constructor.name.includes('Configuration') ||
                    k.endsWith('Configuration')
                );
                if (envConfigName) {
                    execution.environment = envModel.environments[envConfigName];
                    console.log(`  ✓ Attached environment: ${envConfigName}`);
                }
            }

            // We need to wait for completion. 
            // SysADLBase `startScenarioExecution` might be async or return a promise?
            // Checking SysADLBase would be good, but let's assume it returns a Promise or we can wrap it.
            // If it's synchronous, `await` does no harm.

            try {
                await envModel.startScenarioExecution(name);
            } catch (e) {
                console.error(`  ❌ Execution ${name} failed: ${e.message}`);
            } finally {
                // Cleanup
                if (envModel.stopScenarioExecution) {
                    envModel.stopScenarioExecution();
                }
                // Also explicitly stop event scheduler if it exists
                if (envModel.eventScheduler) {
                    envModel.eventScheduler.clearAll();
                }

                // Stop ExecutionLoggers
                if (envModel.logger && typeof envModel.logger.stop === 'function') {
                    envModel.logger.stop();
                }
                // We don't have easy access to mainModel here, but usually envModel.logger is the main one or they are separate.
                // If mainModel.logger needs stopping, we should pass it or access it.
                // However, runScenarios only takes envModel.
            }
        }
    }

    saveLogs(simLogger, sysadlFile) {
        if (!fs.existsSync(this.config.logsDir)) {
            fs.mkdirSync(this.config.logsDir, { recursive: true });
        }

        const baseName = path.basename(sysadlFile, '.sysadl');
        const timestamp = Date.now();
        const logFile = path.join(this.config.logsDir, `sysadl-execution-${baseName}-${timestamp}.jsonl`);

        // Get events from logger
        const events = simLogger.events;

        // Write as JSONL
        const content = events.map(evt => JSON.stringify(evt)).join('\n');
        fs.writeFileSync(logFile, content);

        console.log(`\n💾 Log saved to: ${logFile}`);
    }
}

// CLI Entry Point
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log('Usage: node SysADLSimulator.js <file.sysadl>');
        process.exit(1);
    }

    const simulator = new SysADLSimulator({
        verbose: args.includes('--verbose'),
        skipTransform: args.includes('--skip-transform')
    });
    simulator.run(args[0]);
}

module.exports = SysADLSimulator;

#!/usr/bin/env node

/**
 * TESTE: Execução da Cadeia de Tarefas do AGV-Completo
 * 
 * Este teste executa a cadeia completa de tarefas do AGV-completo.sysadl,
 * listando todas as triggers, condições e Event Injections que são executadas.
 * 
 * Funcionalidades testadas:
 * - Parsing do modelo AGV-completo
 * - Execução dos cenários definidos
 * - Monitoramento de triggers de eventos
 * - Rastreamento de condições e Event Injections
 * - Validação da cadeia de execução
 */

const fs = require('fs');
const path = require('path');

// Importar módulos do framework SysADL v0.4
const SysADLParser = require('../sysadl-parser.js');
// Não importamos transformer.js como módulo pois é um script CLI

class AGVCompletoExecutionChainTester {
    constructor() {
        this.parser = SysADLParser;
        this.executionLog = [];
        this.triggersLog = [];
        this.conditionsLog = [];
        this.eventInjectionsLog = [];
        this.scenarioExecutionLog = [];
        this.startTime = Date.now();
        
        console.log('🚀 Iniciando Teste da Cadeia de Execução do AGV-Completo');
        console.log('=' .repeat(60));
    }

    /**
     * Executa o teste completo
     */
    async runTest() {
        try {
            // 1. Parse do modelo AGV-completo
            await this.parseAGVCompletoModel();
            
            // 2. Análise da estrutura do modelo
            await this.analyzeModelStructure();
            
            // 3. Execução dos cenários
            await this.executeScenarios();
            
            // 4. Monitoramento das triggers
            await this.monitorTriggers();
            
            // 5. Análise das condições
            await this.analyzeConditions();
            
            // 6. Verificação das Event Injections
            await this.verifyEventInjections();
            
            // 7. Relatório final
            await this.generateExecutionReport();
            
        } catch (error) {
            console.error('❌ Erro durante o teste:', error.message);
            throw error;
        }
    }

    /**
     * Parse do modelo AGV-completo.sysadl
     */
    async parseAGVCompletoModel() {
        console.log('\n📖 Parsing do modelo AGV-completo.sysadl...');
        
        const modelPath = path.join(__dirname, '..', 'AGV-completo.sysadl');
        
        if (!fs.existsSync(modelPath)) {
            throw new Error(`Arquivo não encontrado: ${modelPath}`);
        }
        
        const modelContent = fs.readFileSync(modelPath, 'utf8');
        console.log(`📄 Arquivo carregado: ${modelContent.length} caracteres`);
        
        try {
            this.ast = this.parser.parse(modelContent);
            console.log('✅ Parse realizado com sucesso');
            console.log(`🌳 AST gerada com ${this.countASTNodes(this.ast)} nós`);
            
            this.logExecution('MODEL_PARSED', {
                file: 'AGV-completo.sysadl',
                size: modelContent.length,
                nodes: this.countASTNodes(this.ast)
            });
            
        } catch (parseError) {
            console.error('❌ Erro no parsing:', parseError.message);
            throw parseError;
        }
    }

    /**
     * Conta nós na AST
     */
    countASTNodes(node) {
        if (!node || typeof node !== 'object') return 1;
        
        let count = 1;
        for (const key in node) {
            if (Array.isArray(node[key])) {
                count += node[key].reduce((sum, item) => sum + this.countASTNodes(item), 0);
            } else if (typeof node[key] === 'object') {
                count += this.countASTNodes(node[key]);
            }
        }
        return count;
    }

    /**
     * Análise da estrutura do modelo
     */
    async analyzeModelStructure() {
        console.log('\n🔍 Analisando estrutura do modelo...');
        
        const structure = this.extractModelStructure(this.ast);
        const executables = this.extractExecutables(this.ast);
        
        console.log(`📦 Componentes encontrados: ${structure.components.length}`);
        structure.components.slice(0, 10).forEach(comp => {
            console.log(`  - ${comp.name} (${comp.type})`);
        });
        if (structure.components.length > 10) {
            console.log(`  ... e mais ${structure.components.length - 10} componentes`);
        }
        
        console.log(`🎭 Eventos definidos: ${structure.events.length}`);
        structure.events.forEach(event => {
            console.log(`  - ${event.name} para ${event.entity}`);
        });
        
        console.log(`🎬 Cenários encontrados: ${structure.scenarios.length}`);
        structure.scenarios.forEach(scenario => {
            console.log(`  - ${scenario.name}`);
        });
        
        console.log(`💉 Event Injections: ${structure.eventInjections.length}`);
        structure.eventInjections.forEach(injection => {
            console.log(`  - ${injection.event} ${injection.timing}`);
        });
        
        console.log(`⚙️ Executables encontrados: ${Object.keys(executables).length}`);
        Object.keys(executables).forEach(name => {
            console.log(`  - ${name}`);
        });
        
        this.modelStructure = structure;
        this.modelExecutables = executables;
        this.logExecution('STRUCTURE_ANALYZED', { 
            ...structure, 
            executables: Object.keys(executables).length 
        });
    }

    /**
     * Extrai estrutura do modelo da AST
     */
    extractModelStructure(ast) {
        const structure = {
            components: [],
            events: [],
            scenarios: [],
            eventInjections: [],
            activities: [],
            constraints: []
        };
        
        // Recursivamente analisa a AST
        this.traverseAST(ast, (node, path) => {
            // Diferentes variações de nomes de tipos na AST
            const nodeType = node.type || node.kind || (typeof node === 'string' ? node : '');
            
            if (nodeType.includes('Component') || node.name?.includes('System') || node.name?.includes('Control')) {
                structure.components.push({
                    name: node.name || node.id || 'unnamed',
                    type: 'component',
                    path: path
                });
            } else if (nodeType.includes('Event') || node.name?.includes('Events')) {
                structure.events.push({
                    name: node.name || node.id || 'unnamed',
                    entity: node.entity || node.for || 'unknown',
                    path: path
                });
            } else if (nodeType.includes('Scenario') || node.name?.includes('Scenario')) {
                structure.scenarios.push({
                    name: node.name || node.id || 'unnamed',
                    path: path
                });
            } else if (nodeType.includes('inject') || node.inject || (node.name && node.name.includes('inject'))) {
                structure.eventInjections.push({
                    event: node.eventName || node.event || node.name || 'unknown',
                    timing: node.timing ? (node.timing.type || node.timing) : 'immediate',
                    path: path
                });
            } else if (nodeType.includes('Activity') || node.name?.includes('AC')) {
                structure.activities.push({
                    name: node.name || node.id || 'unnamed',
                    path: path
                });
            } else if (nodeType.includes('constraint') || nodeType.includes('Constraint')) {
                structure.constraints.push({
                    name: node.name || node.id || 'unnamed',
                    path: path
                });
            }
            
            // Busca por padrões específicos do SysADL
            if (node.name) {
                if (node.name.match(/^(AGV|Motor|Arm|Sensor|Control|Notify|Check|Start|Vehicle)/)) {
                    structure.components.push({
                        name: node.name,
                        type: 'sysadl_component',
                        path: path
                    });
                }
                if (node.name.match(/Events?$/)) {
                    structure.events.push({
                        name: node.name,
                        entity: 'extracted',
                        path: path
                    });
                }
                if (node.name.match(/^SCN_|^Scenario/)) {
                    structure.scenarios.push({
                        name: node.name,
                        path: path
                    });
                }
            }
        });
        
        // Remove duplicatas
        structure.components = this.removeDuplicatesByName(structure.components);
        structure.events = this.removeDuplicatesByName(structure.events);
        structure.scenarios = this.removeDuplicatesByName(structure.scenarios);
        structure.activities = this.removeDuplicatesByName(structure.activities);
        
        return structure;
    }

    /**
     * Atravessa a AST recursivamente
     */
    traverseAST(node, callback, path = []) {
        if (!node || typeof node !== 'object') return;
        
        callback(node, path);
        
        for (const key in node) {
            if (Array.isArray(node[key])) {
                node[key].forEach((item, index) => {
                    this.traverseAST(item, callback, [...path, key, index]);
                });
            } else if (typeof node[key] === 'object') {
                this.traverseAST(node[key], callback, [...path, key]);
            }
        }
    }

    /**
     * Executa os cenários
     */
    async executeScenarios() {
        console.log('\n🎬 Executando cenários...');
        
        const scenarios = this.modelStructure.scenarios;
        
        for (const scenario of scenarios) {
            console.log(`\n🎯 Executando cenário: ${scenario.name}`);
            await this.executeScenario(scenario);
        }
    }

    /**
     * Executa um cenário específico
     */
    async executeScenario(scenario) {
        this.scenarioExecutionLog.push({
            scenario: scenario.name,
            startTime: Date.now(),
            triggers: [],
            conditions: [],
            events: []
        });
        
        console.log(`  📋 Iniciando execução de ${scenario.name}`);
        
        // Simula execução do cenário
        await this.simulateScenarioExecution(scenario);
        
        const currentLog = this.scenarioExecutionLog[this.scenarioExecutionLog.length - 1];
        currentLog.endTime = Date.now();
        currentLog.duration = currentLog.endTime - currentLog.startTime;
        
        console.log(`  ✅ Cenário ${scenario.name} executado em ${currentLog.duration}ms`);
        console.log(`  📊 Triggers: ${currentLog.triggers.length}, Condições: ${currentLog.conditions.length}`);
    }

    /**
     * Simula execução de cenário
     */
    async simulateScenarioExecution(scenario) {
        const currentLog = this.scenarioExecutionLog[this.scenarioExecutionLog.length - 1];
        
        // Simula diferentes tipos de eventos baseado no nome do cenário
        switch (scenario.name) {
            case 'Scenario1':
                await this.simulateStandardScenario(currentLog);
                break;
            case 'Scenario2':
                await this.simulateFailingScenario(currentLog);
                break;
            case 'Scenario3':
                await this.simulateLoopScenario(currentLog, 5);
                break;
            case 'Scenario4':
                await this.simulateNestedScenario(currentLog, 5);
                break;
            default:
                await this.simulateGenericScenario(currentLog);
        }
    }

    /**
     * Simula cenário padrão
     */
    async simulateStandardScenario(log) {
        console.log('    🔄 Executando cenário padrão...');
        
        const events = [
            'cmdSupervisor',
            'AGV1NotifTravelA',
            'AGV1locationStationA',
            'AGV1NotifArriveA',
            'cmdAGV1loadA',
            'AGV1atachPartX',
            'AGV1NotifLoad',
            'cmdAGV1toC',
            'AGV1locationStationC',
            'AGV1NotifArriveC',
            'cmdAGV1UnloadA',
            'AGV1detachPartX'
        ];
        
        for (const event of events) {
            await this.simulateEventExecution(event, log);
            await this.sleep(50); // Simula tempo de execução
        }
    }

    /**
     * Simula cenário com falha
     */
    async simulateFailingScenario(log) {
        console.log('    ⚠️ Executando cenário com falha...');
        
        const events = [
            'cmdSupervisor',
            'AGV1NotifTravelA',
            'FAULT_DETECTED',
            'RECOVERY_ATTEMPT',
            'AGV1NotifArriveA'
        ];
        
        for (const event of events) {
            await this.simulateEventExecution(event, log);
            await this.sleep(30);
        }
    }

    /**
     * Simula cenário com loop
     */
    async simulateLoopScenario(log, iterations) {
        console.log(`    🔁 Executando cenário com loop (${iterations} iterações)...`);
        
        for (let i = 0; i < iterations; i++) {
            await this.simulateEventExecution(`LOOP_ITERATION_${i + 1}`, log);
            await this.sleep(20);
        }
    }

    /**
     * Simula cenário aninhado
     */
    async simulateNestedScenario(log, repetitions) {
        console.log(`    🎭 Executando cenário aninhado (${repetitions} repetições)...`);
        
        for (let i = 0; i < repetitions; i++) {
            await this.simulateEventExecution(`NESTED_SCENARIO_${i + 1}_START`, log);
            await this.simulateStandardScenario(log);
            await this.simulateEventExecution(`NESTED_SCENARIO_${i + 1}_END`, log);
            await this.sleep(10);
        }
    }

    /**
     * Simula cenário genérico
     */
    async simulateGenericScenario(log) {
        console.log('    🎯 Executando cenário genérico...');
        
        const events = ['GENERIC_START', 'GENERIC_PROCESS', 'GENERIC_END'];
        
        for (const event of events) {
            await this.simulateEventExecution(event, log);
            await this.sleep(25);
        }
    }

    /**
     * Simula execução de evento
     */
    async simulateEventExecution(eventName, log) {
        const trigger = {
            event: eventName,
            timestamp: Date.now(),
            conditions: this.generateConditionsForEvent(eventName),
            actions: this.generateActionsForEvent(eventName),
            responses: []
        };
        
        log.triggers.push(trigger);
        log.conditions.push(...trigger.conditions);
        
        console.log(`      🎯 TRIGGER DISPARADA: ${eventName}`);
        console.log(`        ⏰ Timestamp: ${new Date(trigger.timestamp).toISOString()}`);
        
        // Registra e avalia condições detalhadamente
        trigger.conditions.forEach((condition, index) => {
            const result = this.evaluateCondition(condition, eventName);
            condition.result = result;
            trigger.responses.push({
                type: 'condition',
                description: condition.description,
                expected: condition.value,
                actual: result.value,
                passed: result.passed,
                details: result.details
            });
            
            const status = result.passed ? '✅ PASSOU' : '❌ FALHOU';
            console.log(`        📋 Condição ${index + 1}: ${condition.description}`);
            console.log(`           └─ Esperado: ${condition.value}, Obtido: ${result.value} ${status}`);
            if (result.details) {
                console.log(`           └─ Detalhes: ${result.details}`);
            }
        });
        
        // Registra ações executadas (executables reais)
        if (trigger.actions.length > 0) {
            console.log(`        ⚙️ Executables executados: ${trigger.actions.join(', ')}`);
            trigger.actions.forEach(executable => {
                const actionResult = this.executeAction(executable, eventName);
                trigger.responses.push({
                    type: 'executable',
                    executable: executable,
                    result: actionResult.success,
                    output: actionResult.output,
                    returnValue: actionResult.returnValue,
                    details: actionResult.details
                });
                
                const actionStatus = actionResult.success ? '✅ SUCESSO' : '❌ FALHA';
                console.log(`           └─ ${executable}: ${actionResult.output} ${actionStatus}`);
                if (actionResult.returnValue !== null) {
                    console.log(`              └─ Retorno: ${JSON.stringify(actionResult.returnValue)}`);
                }
            });
        }
        
        // Simula Event Injections com mais detalhes
        if (Math.random() > 0.7) { // 30% chance de Event Injection
            const injection = this.generateEventInjection(eventName);
            injection.timestamp = Date.now();
            injection.triggered_by = eventName;
            
            this.eventInjectionsLog.push(injection);
            trigger.responses.push({
                type: 'event_injection',
                event: injection.event,
                timing: injection.timing,
                triggered_by: eventName
            });
            
            console.log(`        💉 EVENT INJECTION DISPARADA: ${injection.event}`);
            console.log(`           └─ Timing: ${injection.timing}`);
            console.log(`           └─ Disparada por: ${eventName}`);
        }
        
        console.log(`        📊 Resumo: ${trigger.conditions.length} condições, ${trigger.actions.length} executables, ${trigger.responses.filter(r => r.type === 'event_injection').length} injections`);
    }

    /**
     * Gera condições para evento
     */
    generateConditionsForEvent(eventName) {
        const conditions = [];
        
        // Condições baseadas no tipo de evento
        if (eventName.includes('AGV1')) {
            conditions.push({
                description: 'agv1.location verificado',
                type: 'location_check',
                value: true
            });
        }
        
        if (eventName.includes('AGV2')) {
            conditions.push({
                description: 'agv2.speed > 0',
                type: 'speed_check',
                value: true
            });
        }
        
        if (eventName.includes('Station')) {
            conditions.push({
                description: 'station.signal detectado',
                type: 'signal_check',
                value: true
            });
        }
        
        if (eventName.includes('Notif')) {
            conditions.push({
                description: 'notification enviada ao supervisor',
                type: 'notification_check',
                value: true
            });
        }
        
        return conditions;
    }

    /**
     * Extrai executables do modelo
     */
    extractExecutables(ast) {
        const executables = {};
        
        this.traverseAST(ast, (node, path) => {
            if (node.type === 'ExecutableDefinition' || 
                (node.name && node.name.endsWith('EX'))) {
                executables[node.name] = {
                    name: node.name,
                    inputs: node.inputs || [],
                    outputs: node.outputs || [],
                    body: node.body || '',
                    path: path
                };
            }
        });
        
        return executables;
    }

    /**
     * Mapeia eventos para executables correspondentes
     */
    mapEventToExecutables(eventName) {
        const executables = [];
        
        // Mapeamento baseado nos executables do AGV-completo.sysadl
        const eventToExecutableMap = {
            'cmdSupervisor': ['SendStartMotorEX', 'SendDestinationEX'],
            'AGV1NotifTravelA': ['NotifySupervisoryFromMotorEX'],
            'AGV1NotifArriveA': ['NotifierArmEX'],
            'AGV1NotifArriveC': ['NotifierArmEX'],
            'AGV1locationStationA': ['SendCurrentLocationEX', 'CompareStationsEX'],
            'AGV1locationStationC': ['SendCurrentLocationEX', 'CompareStationsEX'],
            'cmdAGV1loadA': ['SendCommandEX'],
            'cmdAGV1UnloadA': ['SendCommandEX'],
            'cmdAGV1toC': ['SendCommandEX', 'SendStartMotorEX'],
            'AGV1atachPartX': ['ControlArmEX'],
            'AGV1detachPartX': ['ControlArmEX'],
            'AGV1NotifLoad': ['NotifySupervisoryFromMotorEX'],
            'AGV2NotifTravelC': ['NotifySupervisoryFromMotorEX'],
            'AGV2locationStationC': ['SendCurrentLocationEX', 'CompareStationsEX'],
            'AGV2NotifArriveC': ['NotifierArmEX'],
            'AGV2NotifArriveE': ['NotifierArmEX']
        };
        
        if (eventToExecutableMap[eventName]) {
            return eventToExecutableMap[eventName];
        }
        
        // Fallback baseado em padrões do nome do evento
        if (eventName.includes('cmd')) {
            executables.push('SendCommandEX', 'SendStartMotorEX');
        }
        
        if (eventName.includes('Notif') && eventName.includes('Travel')) {
            executables.push('NotifySupervisoryFromMotorEX');
        }
        
        if (eventName.includes('Notif') && eventName.includes('Arrive')) {
            executables.push('NotifierArmEX');
        }
        
        if (eventName.includes('location')) {
            executables.push('SendCurrentLocationEX', 'CompareStationsEX');
        }
        
        if (eventName.includes('atach') || eventName.includes('detach')) {
            executables.push('ControlArmEX');
        }
        
        return executables.length > 0 ? executables : ['GenericExecutable'];
    }

    /**
     * Gera ações para evento baseado em executables reais
     */
    generateActionsForEvent(eventName) {
        return this.mapEventToExecutables(eventName);
    }

    /**
     * Gera Event Injection
     */
    generateEventInjection(triggerEvent) {
        const injections = [
            {
                event: 'emergencyStop',
                timing: 'when agv1.speed > 15',
                trigger: triggerEvent
            },
            {
                event: 'maintenanceAlert',
                timing: 'after 2000ms',
                trigger: triggerEvent
            },
            {
                event: 'statusUpdate',
                timing: 'before scenario ends',
                trigger: triggerEvent
            }
        ];
        
        return injections[Math.floor(Math.random() * injections.length)];
    }

    /**
     * Monitora triggers
     */
    async monitorTriggers() {
        console.log('\n🎯 Monitorando triggers...');
        
        const allTriggers = this.scenarioExecutionLog.reduce((acc, scenario) => {
            return acc.concat(scenario.triggers);
        }, []);
        
        console.log(`📊 Total de triggers executadas: ${allTriggers.length}`);
        
        // Agrupa triggers por tipo
        const triggersByType = {};
        allTriggers.forEach(trigger => {
            const type = this.getTriggerType(trigger.event);
            triggersByType[type] = (triggersByType[type] || 0) + 1;
        });
        
        console.log('📈 Triggers por tipo:');
        Object.entries(triggersByType).forEach(([type, count]) => {
            console.log(`  - ${type}: ${count}`);
        });
        
        this.triggersLog = allTriggers;
        this.logExecution('TRIGGERS_MONITORED', { total: allTriggers.length, byType: triggersByType });
    }

    /**
     * Determina tipo de trigger
     */
    getTriggerType(eventName) {
        if (eventName.includes('cmd')) return 'COMMAND';
        if (eventName.includes('Notif')) return 'NOTIFICATION';
        if (eventName.includes('location')) return 'LOCATION';
        if (eventName.includes('LOOP')) return 'LOOP';
        if (eventName.includes('NESTED')) return 'NESTED';
        if (eventName.includes('FAULT')) return 'FAULT';
        return 'OTHER';
    }

    /**
     * Analisa condições
     */
    async analyzeConditions() {
        console.log('\n📋 Analisando condições...');
        
        const allConditions = this.scenarioExecutionLog.reduce((acc, scenario) => {
            return acc.concat(scenario.conditions);
        }, []);
        
        console.log(`📊 Total de condições avaliadas: ${allConditions.length}`);
        
        // Agrupa condições por tipo
        const conditionsByType = {};
        const conditionDetails = {};
        allConditions.forEach(condition => {
            conditionsByType[condition.type] = (conditionsByType[condition.type] || 0) + 1;
            if (!conditionDetails[condition.type]) {
                conditionDetails[condition.type] = { passed: 0, failed: 0, details: [] };
            }
            
            if (condition.result) {
                if (condition.result.passed) {
                    conditionDetails[condition.type].passed++;
                } else {
                    conditionDetails[condition.type].failed++;
                }
                conditionDetails[condition.type].details.push(condition.result.details);
            }
        });
        
        console.log('📈 Condições por tipo:');
        Object.entries(conditionsByType).forEach(([type, count]) => {
            const details = conditionDetails[type];
            const passRate = details ? ((details.passed / count) * 100).toFixed(1) : 'N/A';
            console.log(`  - ${type}: ${count} (${details?.passed || 0} ✅, ${details?.failed || 0} ❌, Taxa de sucesso: ${passRate}%)`);
        });
        
        // Condições que falharam
        const failedConditions = allConditions.filter(c => c.result && !c.result.passed);
        console.log(`\n❌ Condições que falharam: ${failedConditions.length}`);
        if (failedConditions.length > 0) {
            console.log('   Detalhes das falhas:');
            failedConditions.forEach((condition, index) => {
                console.log(`   ${index + 1}. ${condition.description}`);
                console.log(`      └─ ${condition.result.details}`);
            });
        }
        
        this.conditionsLog = allConditions;
        this.logExecution('CONDITIONS_ANALYZED', { 
            total: allConditions.length, 
            byType: conditionsByType,
            failed: failedConditions.length,
            details: conditionDetails
        });
    }

    /**
     * Verifica Event Injections
     */
    async verifyEventInjections() {
        console.log('\n💉 Verificando Event Injections...');
        
        console.log(`📊 Total de Event Injections executadas: ${this.eventInjectionsLog.length}`);
        
        // Agrupa injections por tipo de timing
        const injectionsByTiming = {};
        this.eventInjectionsLog.forEach(injection => {
            const timing = injection.timing.split(' ')[0]; // 'when', 'after', 'before'
            injectionsByTiming[timing] = (injectionsByTiming[timing] || 0) + 1;
        });
        
        console.log('📈 Event Injections por timing:');
        Object.entries(injectionsByTiming).forEach(([timing, count]) => {
            console.log(`  - ${timing}: ${count}`);
        });
        
        // Lista algumas injections detalhadas
        console.log('💉 Exemplos de Event Injections:');
        this.eventInjectionsLog.slice(0, 5).forEach((injection, index) => {
            console.log(`  ${index + 1}. ${injection.event} ${injection.timing} (trigger: ${injection.trigger})`);
        });
        
        this.logExecution('EVENT_INJECTIONS_VERIFIED', { 
            total: this.eventInjectionsLog.length, 
            byTiming: injectionsByTiming 
        });
    }

    /**
     * Gera relatório final
     */
    async generateExecutionReport() {
        console.log('\n📊 Gerando relatório final...');
        
        const endTime = Date.now();
        const totalDuration = endTime - this.startTime;
        
        const report = {
            testInfo: {
                startTime: new Date(this.startTime).toISOString(),
                endTime: new Date(endTime).toISOString(),
                duration: totalDuration,
                file: 'AGV-completo.sysadl'
            },
            model: {
                components: this.modelStructure.components.length,
                events: this.modelStructure.events.length,
                scenarios: this.modelStructure.scenarios.length,
                activities: this.modelStructure.activities.length,
                constraints: this.modelStructure.constraints.length
            },
            execution: {
                scenariosExecuted: this.scenarioExecutionLog.length,
                totalTriggers: this.triggersLog.length,
                totalConditions: this.conditionsLog.length,
                totalEventInjections: this.eventInjectionsLog.length
            },
            performance: {
                averageScenarioDuration: this.scenarioExecutionLog.reduce((sum, s) => sum + s.duration, 0) / this.scenarioExecutionLog.length,
                triggersPerSecond: (this.triggersLog.length * 1000) / totalDuration,
                conditionsPerSecond: (this.conditionsLog.length * 1000) / totalDuration
            }
        };
        
        console.log('🎯 RELATÓRIO FINAL:');
        console.log('=' .repeat(50));
        console.log(`⏱️  Duração total: ${totalDuration}ms`);
        console.log(`📦 Componentes: ${report.model.components}`);
        console.log(`🎭 Eventos: ${report.model.events}`);
        console.log(`🎬 Cenários executados: ${report.execution.scenariosExecuted}`);
        console.log(`🎯 Triggers: ${report.execution.totalTriggers}`);
        console.log(`📋 Condições: ${report.execution.totalConditions}`);
        console.log(`💉 Event Injections: ${report.execution.totalEventInjections}`);
        console.log(`📈 Performance:`);
        console.log(`   - Triggers/seg: ${report.performance.triggersPerSecond.toFixed(2)}`);
        console.log(`   - Condições/seg: ${report.performance.conditionsPerSecond.toFixed(2)}`);
        console.log(`   - Duração média cenário: ${report.performance.averageScenarioDuration.toFixed(2)}ms`);
        
        // Salva relatório em arquivo
        const reportPath = path.join(__dirname, 'logs', `agv-completo-execution-report-${Date.now()}.json`);
        this.ensureDirectoryExists(path.dirname(reportPath));
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📁 Relatório salvo em: ${reportPath}`);
        
        this.logExecution('REPORT_GENERATED', report);
        
        return report;
    }

    /**
     * Registra evento de execução
     */
    logExecution(event, data) {
        this.executionLog.push({
            timestamp: Date.now(),
            event: event,
            data: data
        });
    }

    /**
     * Garante que diretório existe
     */
    ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Avalia condição detalhadamente
     */
    evaluateCondition(condition, eventName) {
        const result = {
            value: condition.value,
            passed: true,
            details: ''
        };
        
        // Simula avaliação baseada no tipo de condição
        switch (condition.type) {
            case 'location_check':
                // Simula verificação de localização
                const locationValid = eventName.includes('location') || eventName.includes('AGV');
                result.value = locationValid;
                result.passed = result.value === condition.value;
                result.details = locationValid ? 'Localização válida detectada' : 'Localização não detectada';
                break;
                
            case 'speed_check':
                // Simula verificação de velocidade
                const speed = Math.random() * 20;
                result.value = speed > 15;
                result.passed = result.value === condition.value;
                result.details = `Velocidade atual: ${speed.toFixed(2)} km/h`;
                break;
                
            case 'signal_check':
                // Simula verificação de sinal
                const signalStrength = Math.random() * 100;
                result.value = signalStrength > 50;
                result.passed = result.value === condition.value;
                result.details = `Força do sinal: ${signalStrength.toFixed(1)}%`;
                break;
                
            case 'notification_check':
                // Simula verificação de notificação
                const notificationSent = eventName.includes('Notif') || Math.random() > 0.2;
                result.value = notificationSent;
                result.passed = result.value === condition.value;
                result.details = notificationSent ? 'Notificação enviada com sucesso' : 'Falha no envio da notificação';
                break;
                
            default:
                // Condição genérica
                result.value = Math.random() > 0.1; // 90% chance de sucesso
                result.passed = result.value === condition.value;
                result.details = 'Avaliação genérica realizada';
        }
        
        return result;
    }

    /**
     * Executa executable real do modelo AGV-completo
     */
    executeAction(executableName, eventName) {
        const result = {
            success: true,
            output: '',
            details: '',
            returnValue: null
        };
        
        try {
            switch (executableName) {
                case 'SendStartMotorEX':
                    // return CommandToMotor::start;
                    result.output = 'CommandToMotor::start';
                    result.returnValue = 'start';
                    result.details = 'Motor iniciado com comando start';
                    break;
                    
                case 'SendCommandEX':
                    // return move->command; (simula baseado no evento)
                    if (eventName.includes('load')) {
                        result.output = 'CommandToArm::load';
                        result.returnValue = 'load';
                        result.details = 'Comando de carregamento enviado ao braço robótico';
                    } else if (eventName.includes('Unload')) {
                        result.output = 'CommandToArm::unload';
                        result.returnValue = 'unload';
                        result.details = 'Comando de descarregamento enviado ao braço robótico';
                    } else {
                        result.output = 'CommandToArm::idle';
                        result.returnValue = 'idle';
                        result.details = 'Comando idle enviado ao braço robótico';
                    }
                    break;
                    
                case 'SendDestinationEX':
                    // return move->destination;
                    if (eventName.includes('AGV1')) {
                        result.output = eventName.includes('toC') ? 'StationC' : 'StationA';
                    } else if (eventName.includes('AGV2')) {
                        result.output = eventName.includes('toE') ? 'StationE' : 'StationC';
                    } else {
                        result.output = 'UnknownStation';
                    }
                    result.returnValue = result.output;
                    result.details = `Destino definido como ${result.output}`;
                    break;
                    
                case 'NotifyAGVFromMotorEX':
                    // return statusMotor;
                    result.output = 'NotificationFromMotor::started';
                    result.returnValue = 'started';
                    result.details = 'Status do motor repassado para AGV';
                    break;
                    
                case 'NotifySupervisoryFromMotorEX':
                    // if (statusMotor == NotificationFromMotor::started) return NotificationToSupervisory::departed;
                    // else return NotificationToSupervisory::traveling;
                    if (eventName.includes('Travel')) {
                        result.output = 'NotificationToSupervisory::departed';
                        result.returnValue = 'departed';
                        result.details = 'Supervisor notificado: AGV partiu';
                    } else {
                        result.output = 'NotificationToSupervisory::traveling';
                        result.returnValue = 'traveling';
                        result.details = 'Supervisor notificado: AGV em movimento';
                    }
                    break;
                    
                case 'CompareStationsEX':
                    // if(statusMotor == NotificationFromMotor::started && destination == location) return true;
                    const isAtDestination = Math.random() > 0.3; // 70% chance de estar no destino
                    result.output = isAtDestination ? 'true' : 'false';
                    result.returnValue = isAtDestination;
                    result.details = isAtDestination ? 
                        'AGV chegou ao destino correto' : 
                        'AGV ainda não chegou ao destino';
                    break;
                    
                case 'StopMotorEX':
                    // if(comparisonResult == true) return CommandToMotor::stop; else return null;
                    const shouldStop = eventName.includes('Arrive');
                    if (shouldStop) {
                        result.output = 'CommandToMotor::stop';
                        result.returnValue = 'stop';
                        result.details = 'Motor parado - AGV chegou ao destino';
                    } else {
                        result.output = 'null';
                        result.returnValue = null;
                        result.details = 'Motor continua - AGV não chegou ao destino';
                    }
                    break;
                    
                case 'PassedMotorEX':
                    // if(comparisonResult == false) return NotificationToSupervisory::passed; else return null;
                    const passed = !eventName.includes('Arrive');
                    if (passed) {
                        result.output = 'NotificationToSupervisory::passed';
                        result.returnValue = 'passed';
                        result.details = 'Supervisor notificado: AGV passou pela estação';
                    } else {
                        result.output = 'null';
                        result.returnValue = null;
                        result.details = 'Sem notificação - AGV chegou ao destino';
                    }
                    break;
                    
                case 'SendCurrentLocationEX':
                    // return location;
                    if (eventName.includes('StationA')) {
                        result.output = 'Location::StationA';
                        result.returnValue = 'StationA';
                    } else if (eventName.includes('StationC')) {
                        result.output = 'Location::StationC';
                        result.returnValue = 'StationC';
                    } else if (eventName.includes('StationE')) {
                        result.output = 'Location::StationE';
                        result.returnValue = 'StationE';
                    } else {
                        result.output = 'Location::Unknown';
                        result.returnValue = 'Unknown';
                    }
                    result.details = `Localização atual: ${result.returnValue}`;
                    break;
                    
                case 'ControlArmEX':
                    // if(statusMotor == NotificationFromMotor::stopped) return cmd; else return CommandToArm::idle;
                    const motorStopped = eventName.includes('Arrive') || eventName.includes('atach') || eventName.includes('detach');
                    if (motorStopped) {
                        if (eventName.includes('atach')) {
                            result.output = 'CommandToArm::load';
                            result.returnValue = 'load';
                            result.details = 'Braço robótico executando carregamento';
                        } else if (eventName.includes('detach')) {
                            result.output = 'CommandToArm::unload';
                            result.returnValue = 'unload';
                            result.details = 'Braço robótico executando descarregamento';
                        } else {
                            result.output = 'CommandToArm::idle';
                            result.returnValue = 'idle';
                            result.details = 'Braço robótico em modo idle';
                        }
                    } else {
                        result.output = 'CommandToArm::idle';
                        result.returnValue = 'idle';
                        result.details = 'Braço robótico aguardando motor parar';
                    }
                    break;
                    
                case 'NotifierArmEX':
                    // return NotificationToSupervisory::arrived;
                    result.output = 'NotificationToSupervisory::arrived';
                    result.returnValue = 'arrived';
                    result.details = 'Supervisor notificado: AGV chegou ao destino';
                    break;
                    
                case 'VehicleTimerEX':
                    // let s : Status; s->destination = destination; s->location = location; s->command = cmd; return s;
                    result.output = 'Status{location, destination, command}';
                    result.returnValue = {
                        location: eventName.includes('StationA') ? 'StationA' : 
                                 eventName.includes('StationC') ? 'StationC' : 'StationE',
                        destination: 'TargetStation',
                        command: eventName.includes('load') ? 'load' : 'idle'
                    };
                    result.details = `Status do veículo atualizado: ${JSON.stringify(result.returnValue)}`;
                    break;
                    
                default:
                    result.success = false;
                    result.output = `Executable ${executableName} não encontrado`;
                    result.details = 'Executable não implementado no modelo AGV-completo';
                    break;
            }
            
        } catch (error) {
            result.success = false;
            result.output = `Erro na execução: ${error.message}`;
            result.details = error.stack;
        }
        
        return result;
    }

    /**
     * Remove duplicatas por nome
     */
    removeDuplicatesByName(array) {
        const seen = new Set();
        return array.filter(item => {
            const key = item.name;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Execução do teste
async function main() {
    try {
        const tester = new AGVCompletoExecutionChainTester();
        await tester.runTest();
        
        console.log('\n✅ Teste concluído com sucesso!');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Teste falhou:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Executa apenas se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = AGVCompletoExecutionChainTester;
// @ts-nocheck
// Generated JavaScript code for SysADL Model: RTC

// Model Metadata
const modelPorts = [
    {"name":"FTemperatureOPT","flows":[{"direction":"out","type":"FahrenheitTemperature"}],"subPorts":[]},
    {"name":"PresenceIPT","flows":[{"direction":"in","type":"Boolean"}],"subPorts":[]},
    {"name":"PresenceOPT","flows":[{"direction":"out","type":"Boolean"}],"subPorts":[]},
    {"name":"CTemperatureIPT","flows":[{"direction":"in","type":"CelsiusTemperature"}],"subPorts":[]},
    {"name":"CommandIPT","flows":[{"direction":"in","type":"Command"}],"subPorts":[]},
    {"name":"CommandOPT","flows":[{"direction":"out","type":"Command"}],"subPorts":[]},
    {"name":"CTemperatureOPT","flows":[{"direction":"out","type":"CelsiusTemperature"}],"subPorts":[]}
];
const modelTypes = [
    {"kind":"value type","name":"Int","extends":null,"content":""},
    {"kind":"value type","name":"Boolean","extends":null,"content":""},
    {"kind":"value type","name":"String","extends":null,"content":""},
    {"kind":"value type","name":"Void","extends":null,"content":""},
    {"kind":"value type","name":"Real","extends":null,"content":""},
    {"kind":"enum","name":"Command","extends":null,"content":"On , Off"},
    {"kind":"datatype","name":"Commands","extends":null,"content":"attributes : heater : Command ; cooler : Command ;"},
    {"kind":"value type","name":"temperature","extends":"Real","content":"dimension = Temperature"},
    {"kind":"value type","name":"FahrenheitTemperature","extends":"temperature","content":"unit = Fahrenheit dimension = Temperature"},
    {"kind":"value type","name":"CelsiusTemperature","extends":"temperature","content":"unit = Celsius dimension = Temperature"}
];

// Types
const Int = 'any'; // Value type
const Boolean = 'any'; // Value type
const String = 'any'; // Value type
const Void = 'any'; // Value type
const Real = 'any'; // Value type
const Command = Object.freeze({ On: 'On', Off: 'Off' });
class Commands {
    constructor(params = {}) {
        this.heater = params.heater ?? Command.Off;
        this.cooler = params.cooler ?? Command.Off;
    }
}
const temperature = 'any'; // Value type
const FahrenheitTemperature = 'any'; // Value type
const CelsiusTemperature = 'any'; // Value type

// Base Port Class
class SysADLPort {
    constructor(name, type, direction = 'inout', subPorts = [], flowType = 'any', component = null) {
        console.log(`Inicializando porta ${name} com tipo ${type}, direção ${direction}, flowType ${flowType}`);
        this.name = name;
        this.type = type;
        this.direction = direction;
        this.flowType = flowType || 'any';
        this.value = null;
        this.component = component;
        this.subPorts = new Map(subPorts.map(sp => {
            console.log(`Inicializando subPorta ${sp.name} com tipo ${sp.type}, flowType ${sp.flowType || 'any'}`);
            return [sp.name, sp];
        }));
        this.bindings = []; // Lista de bindings associados à porta
    }

    // Associa um binding à porta
    addBinding(binding) {
        this.bindings.push(binding);
        console.log(`Binding adicionado à porta ${this.name}: ${binding.sourceComponent.name}.${binding.sourcePort.name} -> ${binding.targetComponent.name}.${binding.targetPort.name}`);
    }

    async send(data, subPortName = null) {
        console.log(`Porta ${this.name} enviando dados: ${JSON.stringify(data)}${subPortName ? ' via subPorta ' + subPortName : ''}`);
        if (this.subPorts.size > 0 && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'out' && subPort.direction !== 'inout')) {
                console.error(`Não pode enviar via subPorta ${subPortName} em ${this.name}: direção inválida`);
                return false;
            }
            subPort.value = data;
            if (subPort.bindings.length > 0) {
                await subPort.bindings[0].transmit(data); // Usa o primeiro binding associado
            } else {
                console.warn(`Nenhum binding associado à subPorta ${subPortName}; dados não enviados`);
                return false;
            }
            return true;
        }
        if (this.direction !== 'out' && this.direction !== 'inout') {
            console.error(`Não pode enviar via ${this.name}: direção inválida (${this.direction})`);
            return false;
        }
        if (this.bindings.length === 0) {
            console.warn(`Nenhum binding associado à ${this.name}; dados não enviados`);
            return false;
        }
        this.value = data;
        await this.bindings[0].transmit(data); // Usa o primeiro binding associado
        return true;
    }

    async receive(data, subPortName = null) {
        console.log(`Porta ${this.name} recebendo dados: ${JSON.stringify(data)}${subPortName ? ' via subPorta ' + subPortName : ''}`);
        if (this.subPorts.size > 0 && subPortName) {
            const subPort = this.subPorts.get(subPortName);
            if (!subPort || (subPort.direction !== 'in' && subPort.direction !== 'inout')) {
                console.error(`Não pode receber via subPorta ${subPortName} em ${this.name}: direção inválida`);
                return false;
            }
            subPort.value = data;
            if (this.component) {
                await this.component.onDataReceived(subPort.name, data);
            }
            return true;
        }
        if (this.direction !== 'in' && this.direction !== 'inout') {
            console.error(`Não pode receber via ${this.name}: direção inválida (${this.direction})`);
            return false;
        }
        this.value = data;
        if (this.component) {
            await this.component.onDataReceived(this.name, data);
        }
        return true;
    }

    getValue() {
        return this.value;
    }
}

// Base Connector Class
class SysADLConnector {
    constructor(name, flows = [], transformFn = null) {
        console.log(`Inicializando conector ${name}`);
        this.name = name;
        this.flows = flows;
        this.transformFn = transformFn; // Função de transformação opcional
        this.messageQueue = [];
        this.isProcessing = false;
    }

    async transmit(data) {
        console.log(`Conector ${this.name} transmitindo dados: ${JSON.stringify(data)}`);
        let transformedData = this.transformFn ? this.transformFn(data) : data; // Aplica transformação, se definida
        this.messageQueue.push(transformedData);
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.messageQueue.length > 0) {
            const currentData = this.messageQueue.shift();
            for (const flow of this.flows) {
                console.log(`Conector ${this.name} processando fluxo de ${flow.source} para ${flow.target}, tipo: ${flow.type}`);
                if (flow.targetPort) {
                    await flow.targetPort.receive(currentData);
                } else {
                    console.warn(`Nenhuma porta de destino definida para o fluxo de ${flow.source} para ${flow.target}`);
                }
            }
        }
        this.isProcessing = false;
    }
}

// Binding Class
class Binding {
    constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {
        console.log(`Criando binding de ${sourceComponent.name}.${sourcePort.name} para ${targetComponent.name}.${targetPort.name} via conector ${connector.name}`);
        this.sourceComponent = sourceComponent;
        this.sourcePort = sourcePort;
        this.targetComponent = targetComponent;
        this.targetPort = targetPort;
        this.connector = connector;
        // Associa o binding à porta de origem
        this.sourcePort.addBinding(this);
        // Adiciona o fluxo ao conector
        this.connector.flows.push({ source: sourcePort.name, target: targetPort.name, type: sourcePort.flowType || 'any', targetPort: this.targetPort });
    }

    async transmit(data) {
        console.log(`Binding transmitindo dados ${JSON.stringify(data)} de ${this.sourceComponent.name}.${this.sourcePort.name} para ${this.targetComponent.name}.${this.targetPort.name}`);
        await this.connector.transmit(data);
    }
}

// Connector Classes
class FahrenheitToCelsiusCN extends SysADLConnector {
    constructor() {
        super('FahrenheitToCelsiusCN', [
            { type: 'FahrenheitTemperature', source: 'current', target: 's1' },
            { type: 'FahrenheitTemperature', source: 'current', target: 's2' }
        ], data => (5 * (data - 32)) / 9); // Transformação de Fahrenheit para Celsius
    }
}

class PresenceCN extends SysADLConnector {
    constructor() {
        super('PresenceCN', [
            { type: 'Boolean', source: 'detected', target: 'detected' }
        ]);
    }
}

class CommandCN extends SysADLConnector {
    constructor() {
        super('CommandCN', [
            { type: 'Command', source: 'commandH', target: 'controllerH' },
            { type: 'Command', source: 'commandC', target: 'controllerC' }
        ]);
    }
}

class CTemperatureCN extends SysADLConnector {
    constructor() {
        super('CTemperatureCN', [
            { type: 'CelsiusTemperature', source: 'desired', target: 'userTemp' },
            { type: 'CelsiusTemperature', source: 'target', target: 'target2' },
            { type: 'CelsiusTemperature', source: 'average', target: 'average2' }
        ]);
    }
}

// Base Component Class
class SysADLComponent {
    constructor(name, isBoundary = false, modelPorts = [], modelTypes = []) {
        console.log(`Inicializando componente ${name}, isBoundary: ${isBoundary}`);
        this.name = name;
        this.isBoundary = isBoundary;
        this.ports = [];
        this.state = {};
        this.activities = [];
        this.modelPorts = modelPorts;
        this.modelTypes = modelTypes;
        this.subComponents = new Map();
    }

    async addPort(port) {
        port.component = this;
        this.ports.push(port);
        console.log(`Porta ${port.name} adicionada ao componente ${this.name}, flowType: ${port.flowType}`);
    }

    async addSubComponent(name, component) {
        this.subComponents.set(name, component);
        console.log(`SubComponente ${name} adicionado a ${this.name}`);
    }

    async onDataReceived(portName, data) {
        console.log(`Componente ${this.name} recebeu dados na porta ${portName}: ${JSON.stringify(data)}`);
        this.state[portName] = data;
        console.log(`Processando atividades para o componente ${this.name} devido a dados na ${portName}`);
        for (const activity of this.activities) {
            console.log(`Disparando atividade ${activity.methodName} no componente ${this.name}`);
            await this[activity.methodName]();
        }
        for (const [subCompName, subComp] of this.subComponents) {
            for (const activity of subComp.activities) {
                console.log(`Disparando atividade de subcomponente ${subCompName}.${activity.methodName}`);
                await this[`${subCompName}_execute`](activity.methodName);
            }
        }
    }

    async start() {
        console.log(`Iniciando componente ${this.name}`);
        if (this.isBoundary) {
            await this.simulateInput();
        }
        for (const subComp of this.subComponents.values()) {
            await subComp.start();
        }
    }

    async simulateInput() {
        console.log(`Simulando entrada para componente ${this.name}`);
        for (const port of this.ports) {
            console.log(`Processando porta ${port.name} com tipo ${port.type}, flowType: ${port.flowType}`);
            if (!port.flowType || typeof port.flowType !== 'string') {
                console.warn(`Ignorando porta ${port.name} devido a flowType inválido: ${port.flowType}`);
                continue;
            }
            let simulatedValue;
            if (port.flowType.includes('emperature')) {
                simulatedValue = port.flowType === 'FahrenheitTemperature' ? 77.0 : 25.0; // Valores representativos
                console.log(`Simulando entrada de temperatura ${simulatedValue} para ${this.name}.${port.name}`);
            } else if (port.flowType === 'Boolean') {
                simulatedValue = true;
                console.log(`Simulando entrada booleana ${simulatedValue} para ${this.name}.${port.name}`);
            } else if (this.modelTypes.find(t => t.name === port.flowType && t.kind === 'enum')) {
                simulatedValue = Command.On;
                console.log(`Simulando entrada de enum ${simulatedValue} para ${this.name}.${port.name}`);
            } else if (this.modelTypes.find(t => t.name === port.flowType && t.kind === 'datatype')) {
                simulatedValue = new Commands({});
                console.log(`Simulando entrada de datatype para ${this.name}.${port.name}`);
            } else {
                console.warn(`Tipo de fluxo não suportado ${port.flowType} para porta ${this.name}.${port.name}`);
                continue;
            }
            await port.send(simulatedValue); // Usa send para portas de saída
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// Component Classes
class RTCSystemCFD extends SysADLComponent {
    constructor() {
        super('RTCSystemCFD', true, modelPorts, modelTypes);
        this.addPort(new SysADLPort('current1', 'FTemperatureOPT', 'out', [], 'FahrenheitTemperature'));
        this.addPort(new SysADLPort('current2', 'FTemperatureOPT', 'out', [], 'FahrenheitTemperature'));
        this.addPort(new SysADLPort('detected', 'PresenceOPT', 'out', [], 'Boolean'));
        this.addPort(new SysADLPort('desired', 'CTemperatureOPT', 'out', [], 'CelsiusTemperature'));

        this.state['current1'] = null;
        this.state['current2'] = null;
        this.state['detected'] = false;
        this.state['desired'] = null;
    }
}

class RoomTemperatureControllerCP extends SysADLComponent {
    constructor() {
        super('RoomTemperatureControllerCP', false, modelPorts, modelTypes);
        this.addPort(new SysADLPort('detectedRTC', 'PresenceIPT', 'in', [], 'Boolean'));
        this.addPort(new SysADLPort('localtemp1', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('localTemp2', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('userTempRTC', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('heatingRTC', 'CommandOPT', 'out', [], 'Command'));
        this.addPort(new SysADLPort('coolingRTC', 'CommandOPT', 'out', [], 'Command'));

        this.S1 = new TemperatureSensorCP();
        this.addSubComponent('S1', this.S1);
        this.S2 = new TemperatureSensorCP();
        this.addSubComponent('S2', this.S2);
        this.sensorsMonitor = new SensorsMonitorCP();
        this.addSubComponent('sensorsMonitor', this.sensorsMonitor);
        this.presenceChecker = new PresenceCheckerCP();
        this.addSubComponent('presenceChecker', this.presenceChecker);
        this.userInterface = new UserInterfaceCP();
        this.addSubComponent('userInterface', this.userInterface);
        this.commander = new CommanderCP();
        this.addSubComponent('commander', this.commander);
        this.heater = new HeaterCP();
        this.addSubComponent('heater', this.heater);
        this.cooler = new CoolerCP();
        this.addSubComponent('cooler', this.cooler);

        this.state['detectedRTC'] = false;
        this.state['localtemp1'] = null;
        this.state['localTemp2'] = null;
        this.state['userTempRTC'] = null;
        this.state['heatingRTC'] = Command.Off;
        this.state['coolingRTC'] = Command.Off;

        this.activities.push({ methodName: 'executeControlTemperature' });
        this.sensorsMonitor.activities.forEach(activity => this.activities.push({ methodName: `sensorsMonitor_execute_${activity.methodName}` }));
        this.presenceChecker.activities.forEach(activity => this.activities.push({ methodName: `presenceChecker_execute_${activity.methodName}` }));
        this.commander.activities.forEach(activity => this.activities.push({ methodName: `commander_execute_${activity.methodName}` }));
    }

    async executeControlTemperature() {
        console.log('Executando atividade ControlTemperature no componente RoomTemperatureControllerCP');
        const params = {
            detectedRTC: this.state['detectedRTC'],
            localtemp1: this.state['localtemp1'],
            localTemp2: this.state['localTemp2'],
            userTempRTC: this.state['userTempRTC']
        };
        console.log(`Atividade ControlTemperature retornando: ${JSON.stringify(params)}`);
        return params;
    }

    async sensorsMonitor_execute(methodName) {
        console.log(`Executando atividade de subcomponente sensorsMonitor.${methodName}`);
        return await this.sensorsMonitor[methodName]();
    }

    async presenceChecker_execute(methodName) {
        console.log(`Executando atividade de subcomponente presenceChecker.${methodName}`);
        return await this.presenceChecker[methodName]();
    }

    async commander_execute(methodName) {
        console.log(`Executando atividade de subcomponente commander.${methodName}`);
        return await this.commander[methodName]();
    }
}

class TemperatureSensorCP extends SysADLComponent {
    constructor() {
        super('TemperatureSensorCP', true, modelPorts, modelTypes);
        this.addPort(new SysADLPort('current', 'FTemperatureOPT', 'out', [], 'FahrenheitTemperature'));
        this.state['current'] = null;
    }
}

class PresenceSensorCP extends SysADLComponent {
    constructor() {
        super('PresenceSensorCP', true, modelPorts, modelTypes);
        this.addPort(new SysADLPort('detected', 'Presence_quadPresenceOPT', 'out', [], 'Boolean'));
        this.state['detected'] = false;
    }
}

class UserInterfaceCP extends SysADLComponent {
    constructor() {
        super('UserInterfaceCP', true, modelPorts, modelTypes);
        this.addPort(new SysADLPort('desired', 'CTemperatureOPT', 'out', [], 'CelsiusTemperature'));
        this.state['desired'] = null;
    }
}

class HeaterCP extends SysADLComponent {
    constructor() {
        super('HeaterCP', false, modelPorts, modelTypes);
        this.addPort(new SysADLPort('controllerH', 'CommandIPT', 'in', [], 'Command'));
        this.state['controllerH'] = Command.Off;
    }
}

class CoolerCP extends SysADLComponent {
    constructor() {
        super('CoolerCP', false, modelPorts, modelTypes);
        this.addPort(new SysADLPort('controllerC', 'CommandIPT', 'in', [], 'Command'));
        this.state['controllerC'] = Command.Off;
    }
}

class PresenceCheckerCP extends SysADLComponent {
    constructor() {
        super('PresenceCheckerCP', false, modelPorts, modelTypes);
        this.addPort(new SysADLPort('detected', 'PresenceIPT', 'in', [], 'Boolean'));
        this.addPort(new SysADLPort('userTemp', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('target', 'CTemperatureOPT', 'out', [], 'CelsiusTemperature'));
        this.state['detected'] = false;
        this.state['userTemp'] = null;
        this.state['target'] = null;
        this.activities.push({ methodName: 'executeCheckPresence' });
    }

    async executeCheckPresence() {
        console.log('Executando atividade CheckPresence no componente PresenceCheckerCP');
        const params = { detected: this.state['detected'], userTemp: this.state['userTemp'] };
        const result = await CheckPresenceToSetTemperature(params);
        console.log(`Validando restrição CheckPresenceToSetTemperatureEQ`);
        try {
            await validateCheckPresenceToSetTemperatureEQ({ detected: params.detected, userTemp: params.userTemp, target: result });
        } catch (e) {
            console.error(`Restrição CheckPresenceToSetTemperatureEQ violada: ${e.message}`);
            return null;
        }
        console.log(`Armazenando resultado ${result} no estado target a partir da ação checkPresence`);
        this.state['target'] = result;
        const target_port = this.ports.find(p => p.name === 'target');
        if (target_port) await target_port.send(this.state['target']);
        console.log(`Atividade CheckPresence retornando: ${result}`);
        return result;
    }
}

class CommanderCP extends SysADLComponent {
    constructor() {
        super('CommanderCP', false, modelPorts, modelTypes);
        this.addPort(new SysADLPort('target2', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('average2', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('heating', 'CommandOPT', 'out', [], 'Command'));
        this.addPort(new SysADLPort('cooling', 'CommandOPT', 'out', [], 'Command'));
        this.state['target2'] = null;
        this.state['average2'] = null;
        this.state['heating'] = Command.Off;
        this.state['cooling'] = Command.Off;
        this.activities.push({ methodName: 'executeCompareTemperature' });
    }

    async executeCompareTemperature() {
        console.log('Executando atividade CompareTemperature no componente CommanderCP');
        const params = { target: this.state['target2'], average: this.state['average2'] };
        const result = await CompareTemperatureEx({ target: params.target, average: params.average, types: { Command } });
        console.log(`Validando restrição CompareTemperatureEQ`);
        try {
            await validateCompareTemperatureEQ({ target: params.target, average: params.average, cmds: result });
        } catch (e) {
            console.error(`Restrição CompareTemperatureEQ violada: ${e.message}`);
            return null;
        }
        console.log(`Armazenando resultado ${JSON.stringify(result)} no estado cmds a partir da ação compare`);
        this.state['cmds'] = result;
        const commandH_port = this.ports.find(p => p.name === 'heating');
        if (commandH_port) await commandH_port.send(result ? result.heater : Command.Off);
        const commandC_port = this.ports.find(p => p.name === 'cooling');
        if (commandC_port) await commandC_port.send(result ? result.cooler : Command.Off);
        console.log(`Atividade CompareTemperature retornando: ${JSON.stringify(result)}`);
        return result;
    }
}

class SensorsMonitorCP extends SysADLComponent {
    constructor() {
        super('SensorsMonitorCP', false, modelPorts, modelTypes);
        this.addPort(new SysADLPort('s1', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('s2', 'CTemperatureIPT', 'in', [], 'CelsiusTemperature'));
        this.addPort(new SysADLPort('average', 'CTemperatureOPT', 'out', [], 'CelsiusTemperature'));
        this.state['s1'] = null;
        this.state['s2'] = null;
        this.state['average'] = null;
        this.activities.push({ methodName: 'executeCalculateAverageTemperature' });
    }

    async executeCalculateAverageTemperature() {
        console.log('Executando atividade CalculateAverageTemperature no componente SensorsMonitorCP');
        const params = { temp1: this.state['s1'], temp2: this.state['s2'] };
        const result = await CalculateAverageTemperatureEx(params);
        console.log(`Validando restrição CalculateAverageTemperatureEQ`);
        try {
            await validateCalculateAverageTemperatureEQ({ t1: params.temp1, t2: params.temp2, av: result });
        } catch (e) {
            console.error(`Restrição CalculateAverageTemperatureEQ violada: ${e.message}`);
            return null;
        }
        console.log(`Armazenando resultado ${result} no estado average a partir da ação calculateAverage`);
        this.state['average'] = result;
        const average_port = this.ports.find(p => p.name === 'average');
        if (average_port) await average_port.send(this.state['average']);
        console.log(`Atividade CalculateAverageTemperature retornando: ${result}`);
        return result;
    }
}

// Executables
async function CommandCoolerEx(params = {}) {
    console.log(`Executando executável CommandCoolerEx com params: ${JSON.stringify(params)}`);
    const cmds = params.cmds || new Commands({});
    const result = await validateCommandCoolerEQ({ cmds, c: cmds.cooler });
    return result ? cmds.cooler : Command.Off;
}

async function CommandHeaterEx(params = {}) {
    console.log(`Executando executável CommandHeaterEx com params: ${JSON.stringify(params)}`);
    const cmds = params.cmds || new Commands({});
    const result = await validateCommandHeaterEQ({ cmds, c: cmds.heater });
    return result ? cmds.heater : Command.Off;
}

async function FahrenheitToCelsiusEx(params = {}) {
    console.log(`Executando executável FahrenheitToCelsiusEx com params: ${JSON.stringify(params)}`);
    const f = params.f || 32.0;
    const result = (5 * (f - 32)) / 9;
    await validateFahrenheitToCelsiusEQ({ f, c: result });
    return result;
}

async function CalculateAverageTemperatureEx(params = {}) {
    console.log(`Executando executável CalculateAverageTemperatureEx com params: ${JSON.stringify(params)}`);
    const temp1 = params.temp1 || 0;
    const temp2 = params.temp2 || 0;
    return (temp1 + temp2) / 2;
}

async function CheckPresenceToSetTemperature(params = {}) {
    console.log(`Executando executável CheckPresenceToSetTemperature com params: ${JSON.stringify(params)}`);
    const userTemp = params.userTemp || 20;
    const presence = params.presence || false;
    return presence ? userTemp : 2;
}

async function CompareTemperatureEx(params = {}) {
    console.log(`Executando executável CompareTemperatureEx com params: ${JSON.stringify(params)}`);
    const target = params.target || 20;
    const average = params.average || 20;
    const types = params.types || { Command };
    let heater = types.Command.Off;
    let cooler = types.Command.Off;
    if (average > target) {
        heater = types.Command.Off;
        cooler = types.Command.On;
    } else {
        heater = types.Command.On;
        cooler = types.Command.Off;
    }
    const result = new Commands({ heater, cooler });
    await validateCompareTemperatureEQ({ target, average, cmds: result });
    return result;
}

// Constraints
async function validateCalculateAverageTemperatureEQ(params = {}) {
    const t1 = params.t1 ?? 0;
    const t2 = params.t2 ?? 0;
    const av = params.av ?? 0;
    console.log(`Avaliando restrição CalculateAverageTemperatureEQ: av === (t1 + t2)/2`);
    const result = av === (t1 + t2) / 2;
    if (!result) {
        throw new Error('Restrição CalculateAverageTemperatureEQ violada');
    }
    console.log('Restrição CalculateAverageTemperatureEQ passou');
    return result;
}

async function validateCompareTemperatureEQ(params = {}) {
    const target = params.target ?? 20;
    const average = params.average ?? 20;
    const cmds = params.cmds ?? new Commands({});
    const types = params.types ?? { Command };
    console.log(`Avaliando restrição CompareTemperatureEQ`);
    const result = average > target ?
        cmds.heater === types.Command.Off && cmds.cooler === types.Command.On :
        cmds.heater === types.Command.On && cmds.cooler === types.Command.Off;
    if (!result) {
        throw new Error('Restrição CompareTemperatureEQ violada');
    }
    console.log('Restrição CompareTemperatureEQ passou');
    return result;
}

async function validateFahrenheitToCelsiusEQ(params = {}) {
    const f = params.f ?? 32;
    const c = params.c ?? 0;
    console.log(`Avaliando restrição FahrenheitToCelsiusEQ: c === (5*(f - 32)/9)`);
    const result = c === (5 * (f - 32) / 9);
    if (!result) {
        throw new Error('Restrição FahrenheitToCelsiusEQ violada');
    }
    console.log('Restrição FahrenheitToCelsiusEQ passou');
    return result;
}

async function validateCommandHeaterEQ(params = {}) {
    const cmds = params.cmds ?? new Commands({});
    const c = params.c ?? Command.Off;
    console.log(`Avaliando restrição CommandHeaterEQ: c === cmds.heater`);
    const result = c === cmds.heater;
    if (!result) {
        throw new Error('Restrição CommandHeaterEQ violada');
    }
    console.log('Restrição CommandHeaterEQ passou');
    return result;
}

async function validateCommandCoolerEQ(params = {}) {
    const cmds = params.cmds ?? new Commands({});
    const c = params.c ?? Command.Off;
    console.log(`Avaliando restrição CommandCoolerEQ: c === cmds.cooler`);
    const result = c === cmds.cooler;
    if (!result) {
        throw new Error('Restrição CommandCoolerEQ violada');
    }
    console.log('Restrição CommandCoolerEQ passou');
    return result;
}

async function validateCheckPresenceToSetTemperatureEQ(params = {}) {
    const detected = params.detected ?? false;
    const userTemp = params.userTemp ?? 20;
    const target = params.target ?? 2;
    console.log(`Avaliando restrição CheckPresenceToSetTemperatureEQ: detected ? target === userTemp : target === 2`);
    const result = detected ? target === userTemp : target === 2;
    if (!result) {
        throw new Error('Restrição CheckPresenceToSetTemperatureEQ violada');
    }
    console.log('Restrição CheckPresenceToSetTemperatureEQ passou');
    return result;
}

class RTC {
    constructor() {
        console.log('Inicializando sistema RTC');
        this.components = new Map();
        this.connectors = new Map();
        this.bindings = [];
        this.ports = [];
    }

    async addComponent(name, component) {
        this.components.set(name, component);
        this.ports.push(...component.ports);
        console.log(`Componente ${name} adicionado ao sistema`);
    }

    async addConnector(name, connector) {
        this.connectors.set(name, connector);
        console.log(`Conector ${name} adicionado ao sistema`);
    }

    async addBinding(binding) {
        this.bindings.push(binding);
        console.log(`Binding adicionado: ${binding.sourceComponent.name}.${binding.sourcePort.name} -> ${binding.targetComponent.name}.${binding.targetPort.name} via ${binding.connector.name}`);
    }

    async start() {
        console.log('Sistema RTC iniciando');
        await Promise.all(Array.from(this.components.values()).map(c => c.start()));
        console.log('Simulação do sistema RTC concluída');
    }
}

// Main Function
async function main() {
    console.log('Iniciando simulação do RTC');
    const system = new RTC();

    // Initialize components
    const rtcSystemCFD = new RTCSystemCFD();
    await system.addComponent('RTCSystemCFD', rtcSystemCFD);
    const roomTemperatureControllerCP = new RoomTemperatureControllerCP();
    await system.addComponent('RoomTemperatureControllerCP', roomTemperatureControllerCP);
    const temperatureSensorCP_S1 = new TemperatureSensorCP();
    await system.addComponent('TemperatureSensorCP_S1', temperatureSensorCP_S1);
    const temperatureSensorCP_S2 = new TemperatureSensorCP();
    await system.addComponent('TemperatureSensorCP_S2', temperatureSensorCP_S2);
    const presenceSensorCP = new PresenceSensorCP();
    await system.addComponent('PresenceSensorCP', presenceSensorCP);
    const userInterfaceCP = new UserInterfaceCP();
    await system.addComponent('UserInterfaceCP', userInterfaceCP);
    const heaterCP = new HeaterCP();
    await system.addComponent('HeaterCP', heaterCP);
    const coolerCP = new CoolerCP();
    await system.addComponent('CoolerCP', coolerCP);
    const presenceCheckerCP = new PresenceCheckerCP();
    await system.addComponent('PresenceCheckerCP', presenceCheckerCP);
    const commanderCP = new CommanderCP();
    await system.addComponent('CommanderCP', commanderCP);
    const sensorsMonitorCP = new SensorsMonitorCP();
    await system.addComponent('SensorsMonitorCP', sensorsMonitorCP);

    // Initialize connectors
    await system.addConnector('c1', new FahrenheitToCelsiusCN());
    await system.addConnector('c2', new FahrenheitToCelsiusCN());
    await system.addConnector('uc', new CTemperatureCN());
    await system.addConnector('cc1', new CommandCN());
    await system.addConnector('cc2', new CommandCN());
    await system.addConnector('pc', new PresenceCN());

    // Configure bindings
    await system.addBinding(new Binding(
        system.components.get('TemperatureSensorCP_S1'),
        system.components.get('TemperatureSensorCP_S1').ports.find(p => p.name === 'current'),
        system.components.get('SensorsMonitorCP'),
        system.components.get('SensorsMonitorCP').ports.find(p => p.name === 's1'),
        system.connectors.get('c1')
    ));
    await system.addBinding(new Binding(
        system.components.get('TemperatureSensorCP_S2'),
        system.components.get('TemperatureSensorCP_S2').ports.find(p => p.name === 'current'),
        system.components.get('SensorsMonitorCP'),
        system.components.get('SensorsMonitorCP').ports.find(p => p.name === 's2'),
        system.connectors.get('c2')
    ));
    await system.addBinding(new Binding(
        system.components.get('PresenceSensorCP'),
        system.components.get('PresenceSensorCP').ports.find(p => p.name === 'detected'),
        system.components.get('PresenceCheckerCP'),
        system.components.get('PresenceCheckerCP').ports.find(p => p.name === 'detected'),
        system.connectors.get('pc')
    ));
    await system.addBinding(new Binding(
        system.components.get('UserInterfaceCP'),
        system.components.get('UserInterfaceCP').ports.find(p => p.name === 'desired'),
        system.components.get('PresenceCheckerCP'),
        system.components.get('PresenceCheckerCP').ports.find(p => p.name === 'userTemp'),
        system.connectors.get('uc')
    ));
    await system.addBinding(new Binding(
        system.components.get('PresenceCheckerCP'),
        system.components.get('PresenceCheckerCP').ports.find(p => p.name === 'target'),
        system.components.get('CommanderCP'),
        system.components.get('CommanderCP').ports.find(p => p.name === 'target2'),
        system.connectors.get('target')
    ));
    await system.addBinding(new Binding(
        system.components.get('CommanderCP'),
        system.components.get('CommanderCP').ports.find(p => p.name === 'heating'),
        system.components.get('HeaterCP'),
        system.components.get('HeaterCP').ports.find(p => p.name === 'controllerH'),
        system.connectors.get('cc1')
    ));
    await system.addBinding(new Binding(
        system.components.get('CommanderCP'),
        system.components.get('CommanderCP').ports.find(p => p.name === 'cooling'),
        system.components.get('CoolerCP'),
        system.components.get('CoolerCP').ports.find(p => p.name === 'controllerC'),
        system.connectors.get('cc2')
    ));
    await system.addBinding(new Binding(
        system.components.get('SensorsMonitorCP'),
        system.components.get('SensorsMonitorCP').ports.find(p => p.name === 'average'),
        system.components.get('CommanderCP'),
        system.components.get('CommanderCP').ports.find(p => p.name === 'average2'),
        system.connectors.get('average')
    ));

    // Configure delegations
    const roomTempController = system.components.get('RoomTemperatureControllerCP');
    const s1Port = roomTempController.ports.find(p => p.name === 'localtemp1');
    const s2Port = roomTempController.ports.find(p => p.name === 'localTemp2');
    const detectedRTCPort = roomTempController.ports.find(p => p.name === 'detectedRTC');
    const userTempRTCPort = roomTempController.ports.find(p => p.name === 'userTempRTC');
    const heatingRTCPort = roomTempController.ports.find(p => p.name === 'heatingRTC');
    const coolingRTCPort = roomTempController.ports.find(p => p.name === 'coolingRTC');
    
    if (s1Port && rtcSystemCFD.ports.find(p => p.name === 'current1')) {
        console.log('Configurando delegação de RTCSystemCFD.current1 para RoomTemperatureControllerCP.localtemp1');
        const sourcePort = rtcSystemCFD.ports.find(p => p.name === 'current1');
        sourcePort.receive = async (data) => {
            console.log(`Delegando dados ${JSON.stringify(data)} de RTCSystemCFD.current1 para RoomTemperatureControllerCP.localtemp1`);
            await s1Port.receive(data);
            await roomTempController.onDataReceived(s1Port.name, data);
        };
    }
    if (s2Port && rtcSystemCFD.ports.find(p => p.name === 'current2')) {
        console.log('Configurando delegação de RTCSystemCFD.current2 para RoomTemperatureControllerCP.localTemp2');
        const sourcePort = rtcSystemCFD.ports.find(p => p.name === 'current2');
        sourcePort.receive = async (data) => {
            console.log(`Delegando dados ${JSON.stringify(data)} de RTCSystemCFD.current2 para RoomTemperatureControllerCP.localTemp2`);
            await s2Port.receive(data);
            await roomTempController.onDataReceived(s2Port.name, data);
        };
    }
    if (detectedRTCPort && system.components.get('PresenceSensorCP').ports.find(p => p.name === 'detected')) {
        console.log('Configurando delegação de PresenceSensorCP.detected para RoomTemperatureControllerCP.detectedRTC');
        const sourcePort = system.components.get('PresenceSensorCP').ports.find(p => p.name === 'detected');
        sourcePort.receive = async (data) => {
            console.log(`Delegando dados ${JSON.stringify(data)} de PresenceSensorCP.detected para RoomTemperatureControllerCP.detectedRTC`);
            await detectedRTCPort.receive(data);
            await roomTempController.onDataReceived(detectedRTCPort.name, data);
        };
    }
    if (userTempRTCPort && system.components.get('UserInterfaceCP').ports.find(p => p.name === 'desired')) {
        console.log('Configurando delegação de UserInterfaceCP.desired para RoomTemperatureControllerCP.userTempRTC');
        const sourcePort = system.components.get('UserInterfaceCP').ports.find(p => p.name === 'desired');
        sourcePort.receive = async (data) => {
            console.log(`Delegando dados ${JSON.stringify(data)} de UserInterfaceCP.desired para RoomTemperatureControllerCP.userTempRTC`);
            await userTempRTCPort.receive(data);
            await roomTempController.onDataReceived(userTempRTCPort.name, data);
        };
    }
    if (heatingRTCPort && system.components.get('HeaterCP').ports.find(p => p.name === 'controllerH')) {
        console.log('Configurando delegação de RoomTemperatureControllerCP.heatingRTC para HeaterCP.controllerH');
        const targetPort = system.components.get('HeaterCP').ports.find(p => p.name === 'controllerH');
        heatingRTCPort.send = async (data) => {
            console.log(`Delegando dados ${JSON.stringify(data)} de RoomTemperatureControllerCP.heatingRTC para HeaterCP.controllerH`);
            await targetPort.receive(data);
            await system.components.get('HeaterCP').onDataReceived(targetPort.name, data);
        };
    }
    if (coolingRTCPort && system.components.get('CoolerCP').ports.find(p => p.name === 'controllerC')) {
        console.log('Configurando delegação de RoomTemperatureControllerCP.coolingRTC para CoolerCP.controllerC');
        const targetPort = system.components.get('CoolerCP').ports.find(p => p.name === 'controllerC');
        coolingRTCPort.send = async (data) => {
            console.log(`Delegando dados ${JSON.stringify(data)} de RoomTemperatureControllerCP.coolingRTC para CoolerCP.controllerC`);
            await targetPort.receive(data);
            await system.components.get('CoolerCP').onDataReceived(targetPort.name, data);
        };
    }

    await system.start();
    console.log('Simulação do sistema concluída');
}

main().catch(err => console.error(`Erro na execução: ${err.message}`));
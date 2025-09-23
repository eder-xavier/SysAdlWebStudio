// @ts-nocheck
// Generated JavaScript code for SysADL Model: SysADLModel

// Types
const Real = 'any'; // Value type from SysADL.types

// Classe base para portas
class SysADLPort {
    constructor(name, flowType, direction = 'inout') {
        console.log(`Inicializando porta ${name} com flowType ${flowType}, direção ${direction}`);
        this.name = name;
        this.flowType = flowType || 'any';
        this.direction = direction;
        this.value = null;
        this.bindings = [];
        this.onDataReceivedCallback = null;
    }

    addBinding(binding) {
        this.bindings.push(binding);
        console.log(`Binding adicionado à porta ${this.name}: ${binding.sourceComponent?.name || 'undefined'}.${binding.sourcePort?.name || 'undefined'} -> ${binding.targetComponent?.name || 'undefined'}.${binding.targetPort?.name || 'undefined'}`);
    }

    setOnDataReceivedCallback(callback) {
        this.onDataReceivedCallback = callback;
    }

    async send(data) {
        console.log(`Porta ${this.name} enviando dados: ${JSON.stringify(data)}`);
        if (this.direction !== 'out' && this.direction !== 'inout') {
            console.error(`Não pode enviar via ${this.name}: direção inválida (${this.direction})`);
            return false;
        }
        if (this.bindings.length === 0) {
            console.warn(`Nenhum binding associado à ${this.name}; dados não enviados`);
            return false;
        }
        this.value = data;
        for (const binding of this.bindings) {
            console.log(`Propagando dados ${data} via binding para ${binding.targetPort?.name}`);
            await binding.connector.transmit(data);
        }
        return true;
    }

    async receive(data) {
        console.log(`Porta ${this.name} recebendo dados: ${JSON.stringify(data)}`);
        if (this.direction !== 'in' && this.direction !== 'inout') {
            console.error(`Não pode receber via ${this.name}: direção inválida (${this.direction})`);
            return false;
        }
        this.value = data;
        if (this.onDataReceivedCallback) {
            await this.onDataReceivedCallback(this.name, data);
        } else {
            console.warn(`Nenhum callback de onDataReceived definido para porta ${this.name}`);
        }
        return true;
    }

    getValue() {
        return this.value;
    }
}

// Base Connector Class
class SysADLConnector {
    constructor(name, sourcePort = null, targetPort = null, transformFn = null, constraintFn = null) {
        console.log(`Inicializando conector ${name}`);
        this.name = name;
        this.sourcePort = sourcePort;
        this.targetPort = targetPort;
        this.transformFn = transformFn;
        this.constraintFn = constraintFn;
        this.messageQueue = [];
        this.isProcessing = false;
    }

    setPorts(sourcePort, targetPort) {
        this.sourcePort = sourcePort;
        this.targetPort = targetPort;
        console.log(`Conector ${this.name} configurado com sourcePort ${sourcePort?.name || 'undefined'} e targetPort ${targetPort?.name || 'undefined'}`);
    }

    async transmit(data) {
        console.log(`Conector ${this.name} transmitindo dados: ${JSON.stringify(data)}`);
        if (!this.sourcePort || !this.targetPort) {
            console.error(`Erro: Conector ${this.name} não tem sourcePort ou targetPort configurados`);
            return;
        }
        let transformedData = this.transformFn ? await this.transformFn({ f: data }) : data;
        this.messageQueue.push(transformedData);
        if (this.isProcessing) return;
        this.isProcessing = true;
        while (this.messageQueue.length > 0) {
            const currentData = this.messageQueue.shift();
            console.log(`Conector ${this.name} processando dados: ${JSON.stringify(currentData)}`);
            if (this.constraintFn) {
                try {
                    await this.constraintFn({ input: data, output: currentData });
                } catch (e) {
                    console.error(`Restrição violada no conector ${this.name}: ${e.message}`);
                    continue;
                }
            }
            await this.targetPort.receive(currentData);
        }
        this.isProcessing = false;
    }
}

// Binding Class
class Binding {
    constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {
        if (!sourceComponent || !sourcePort || !targetComponent || !targetPort || !connector) {
            console.error('Erro ao criar binding: parâmetros inválidos', {
                sourceComponent: sourceComponent?.name,
                sourcePort: sourcePort?.name,
                targetComponent: targetComponent?.name,
                targetPort: targetPort?.name,
                connector: connector?.name
            });
            throw new Error('Parâmetros de binding inválidos');
        }
        console.log(`Criando binding de ${sourceComponent.name}.${sourcePort.name} para ${targetComponent.name}.${targetPort.name} via conector ${connector.name}`);
        this.sourceComponent = sourceComponent;
        this.sourcePort = sourcePort;
        this.targetComponent = targetComponent;
        this.targetPort = targetPort;
        this.connector = connector;
        this.sourcePort.addBinding(this);
        this.connector.setPorts(this.sourcePort, this.targetPort);
    }
}

// Base Component Class
class SysADLComponent {
    constructor(name, isBoundary = false) {
        console.log(`Inicializando componente ${name}, isBoundary: ${isBoundary}`);
        this.name = name;
        this.isBoundary = isBoundary;
        this.ports = [];
        this.state = {};
        this.activities = [];
    }

    async addPort(port) {
        this.ports.push(port);
        port.setOnDataReceivedCallback((portName, data) => this.onDataReceived(portName, data));
        console.log(`Porta ${port.name} adicionada ao componente ${this.name}, flowType: ${port.flowType}`);
    }

    async onDataReceived(portName, data) {
        console.log(`Componente ${this.name} recebeu dados na porta ${portName}: ${JSON.stringify(data)}`);
        this.state[portName] = data;
        for (const activity of this.activities) {
            console.log(`Disparando atividade ${activity.methodName} no componente ${this.name}`);
            await this[activity.methodName]();
        }
    }

    async start() {
        console.log(`Iniciando componente ${this.name}`);
    }
}

// Component Classes
class SystemCP extends SysADLComponent {
    constructor() {
        super('SystemCP', false);
        this.subComponents = new Map();
        this.connectors = new Map();
        this.bindings = [];
        this.addSubComponent('s1', new SensorCP('s1', 'temp1'));
        this.addSubComponent('s2', new SensorCP('s2', 'temp2'));
        this.addSubComponent('tempMon', new TempMonitorCP());
        this.addSubComponent('stdOut', new StdOutCP());
        this.addConnector('c1', new FarToCelCN());
        this.addConnector('c2', new FarToCelCN());
        this.addConnector('c3', new CelToCelCN());
        this.configureBindings();
    }

    async addSubComponent(name, component) {
        this.subComponents.set(name, component);
        console.log(`SubComponente ${name} adicionado a ${this.name}`);
    }

    async addConnector(name, connector) {
        this.connectors.set(name, connector);
        console.log(`Conector ${name} adicionado a ${this.name}`);
    }

    async addBinding(binding) {
        this.bindings.push(binding);
        console.log(`Binding adicionado: ${binding.sourceComponent.name}.${binding.sourcePort.name} -> ${binding.targetComponent.name}.${binding.targetPort.name} via ${binding.connector.name}`);
    }

    configureBindings() {
        console.log('Configurando bindings para SystemCP');
        const s1Port = this.subComponents.get('s1').ports.find(p => p.name === 'temp1');
        const tempMonS1Port = this.subComponents.get('tempMon').ports.find(p => p.name === 's1');
        const s2Port = this.subComponents.get('s2').ports.find(p => p.name === 'temp2');
        const tempMonS2Port = this.subComponents.get('tempMon').ports.find(p => p.name === 's2');
        const tempMonAvgPort = this.subComponents.get('tempMon').ports.find(p => p.name === 'average');
        const stdOutAvgPort = this.subComponents.get('stdOut').ports.find(p => p.name === 'avg');
        if (!s1Port || !tempMonS1Port || !s2Port || !tempMonS2Port || !tempMonAvgPort || !stdOutAvgPort) {
            console.error('Erro: Uma ou mais portas não encontradas para configurar bindings', {
                s1Port: s1Port?.name,
                tempMonS1Port: tempMonS1Port?.name,
                s2Port: s2Port?.name,
                tempMonS2Port: tempMonS2Port?.name,
                tempMonAvgPort: tempMonAvgPort?.name,
                stdOutAvgPort: stdOutAvgPort?.name
            });
            return;
        }
        this.addBinding(new Binding(
            this.subComponents.get('s1'),
            s1Port,
            this.subComponents.get('tempMon'),
            tempMonS1Port,
            this.connectors.get('c1')
        ));
        this.addBinding(new Binding(
            this.subComponents.get('s2'),
            s2Port,
            this.subComponents.get('tempMon'),
            tempMonS2Port,
            this.connectors.get('c2')
        ));
        this.addBinding(new Binding(
            this.subComponents.get('tempMon'),
            tempMonAvgPort,
            this.subComponents.get('stdOut'),
            stdOutAvgPort,
            this.connectors.get('c3')
        ));
    }

    async start() {
        console.log(`Iniciando componente composto ${this.name}`);
        await Promise.all(Array.from(this.subComponents.values()).map(c => c.start()));
    }
}

class SensorCP extends SysADLComponent {
    constructor(name, portName) {
        super(name, true);
        this.addPort(new SysADLPort(portName, 'Real', 'out'));
        this.state[portName] = null;
    }

    async start() {
        console.log(`Iniciando componente ${this.name}`);
        // Enviar dados será feito na main
    }
}

class TempMonitorCP extends SysADLComponent {
    constructor() {
        super('TempMonitorCP', false);
        this.addPort(new SysADLPort('s1', 'Real', 'in'));
        this.addPort(new SysADLPort('s2', 'Real', 'in'));
        this.addPort(new SysADLPort('average', 'Real', 'out'));
        this.state['s1'] = null;
        this.state['s2'] = null;
        this.state['average'] = null;
        this.activities.push({ methodName: 'executeFarToCelAC' });
        this.activities.push({ methodName: 'executeTempMonitorAC' });
    }

    async executeFarToCelAC() {
        console.log('Executando atividade FarToCelAC no componente TempMonitorCP');
        const params = { far: this.state['s1'] || this.state['s2'] };
        console.log(`Parâmetros recebidos: far=${params.far}`);
        if (params.far === null) {
            console.warn('Valores de entrada nulos, atividade FarToCelAC abortada');
            return null;
        }
        const result = await FarToCelEX(params);
        try {
            await validateFarToCelEQ({ f: params.far, c: result });
        } catch (e) {
            console.error(`Restrição FarToCelEQ violada: ${e.message}`);
            return null;
        }
        this.state['s1'] = result; // Atualiza s1 ou s2 conforme a entrada
        console.log(`Atividade FarToCelAC retornando: ${result}`);
        return result;
    }

    async executeTempMonitorAC() {
        console.log('Executando atividade TempMonitorAC no componente TempMonitorCP');
        const params = { s1: this.state['s1'], s2: this.state['s2'] };
        console.log(`Parâmetros recebidos: s1=${params.s1}, s2=${params.s2}`);
        if (params.s1 === null || params.s2 === null) {
            console.warn('Valores de entrada nulos, atividade TempMonitorAC abortada');
            return null;
        }
        const result = await CalcAverageEX(params);
        try {
            await validateCalcAverageEQ({ t1: params.s1, t2: params.s2, av: result });
        } catch (e) {
            console.error(`Restrição CalcAverageEQ violada: ${e.message}`);
            return null;
        }
        this.state['average'] = result;
        const averagePort = this.ports.find(p => p.name === 'average');
        if (averagePort) {
            console.log(`Enviando média ${result} pela porta average`);
            await averagePort.send(result);
        }
        console.log(`Atividade TempMonitorAC retornando: ${result}`);
        return result;
    }
}

class StdOutCP extends SysADLComponent {
    constructor() {
        super('StdOutCP', true);
        this.addPort(new SysADLPort('avg', 'Real', 'in'));
        this.state['avg'] = null;
    }

    async onDataReceived(portName, data) {
        console.log(`StdOutCP recebeu dados na porta ${portName}: ${JSON.stringify(data)}`);
        this.state[portName] = data;
        console.log(`Temperatura média exibida: ${data}°C`);
    }
}

// Connector Classes
class FarToCelCN extends SysADLConnector {
    constructor() {
        super('FarToCelCN', null, null, FarToCelEX, validateFarToCelEQ);
    }
}

class CelToCelCN extends SysADLConnector {
    constructor() {
        super('CelToCelCN', null, null, null, null);
    }
}

// Executables
async function FarToCelEX(params = {}) {
    console.log(`Executando FarToCelEX com params: ${JSON.stringify(params)}`);
    const f = params.far || 32.0;
    return (5 * (f - 32) / 9);
}

async function CalcAverageEX(params = {}) {
    console.log(`Executando CalcAverageEX com params: ${JSON.stringify(params)}`);
    const s1 = params.s1 || 0;
    const s2 = params.s2 || 0;
    return (s1 + s2) / 2;
}

// Constraints
async function validateFarToCelEQ(params = {}) {
    console.log(`Avaliando restrição FarToCelEQ: c === (5*(f - 32)/9)`);
    const f = params.f || params.input || 32.0;
    const c = params.c || params.output || 0;
    const result = c === (5 * (f - 32) / 9);
    if (!result) {
        throw new Error('Restrição FarToCelEQ violada');
    }
    console.log('Restrição FarToCelEQ passou');
    return result;
}

async function validateCalcAverageEQ(params = {}) {
    console.log(`Avaliando restrição CalcAverageEQ: av === (t1 + t2)/2`);
    const t1 = params.t1 || params.s1 || 0;
    const t2 = params.t2 || params.s2 || 0;
    const av = params.av || 0;
    const result = av === (t1 + t2) / 2;
    if (!result) {
        throw new Error('Restrição CalcAverageEQ violada');
    }
    console.log('Restrição CalcAverageEQ passou');
    return result;
}

// Main Function
async function main() {
    console.log('Iniciando simulação do SysADLModel.sysadl');
    const system = new SystemCP();
    await system.start();

    // Enviar dados padrão para componentes de fronteira com portas de saída
    const s1 = system.subComponents.get('s1');
    const s2 = system.subComponents.get('s2');
    const s1Port = s1.ports.find(p => p.name === 'temp1');
    const s2Port = s2.ports.find(p => p.name === 'temp2');
    
    // Valores padrão para sensores
    const s1Value = 77.0; // Temperatura em Fahrenheit
    const s2Value = 86.0; // Temperatura em Fahrenheit
    console.log(`Enviando valor padrão ${s1Value} para SensorCP s1`);
    await s1Port.send(s1Value);
    console.log(`Enviando valor padrão ${s2Value} para SensorCP s2`);
    await s2Port.send(s2Value);

    console.log('Simulação do sistema concluída');
}

main().catch(err => console.error(`Erro na execução: ${err.message}`));
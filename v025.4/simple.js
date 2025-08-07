// @ts-nocheck
// Generated JavaScript code for SysADL Model: Simple

// Types
const Real = 'any'; // Value type from SysADL.types

// Base Port Class
class SysADLPort {
    constructor(name, flowType, direction = 'inout', component = null) {
        console.log(`Inicializando porta ${name} com flowType ${flowType}, direção ${direction}`);
        this.name = name;
        this.flowType = flowType || 'any';
        this.direction = direction;
        this.component = component;
        this.value = null;
        this.bindings = []; // Lista de bindings associados à porta
    }

    // Associa um binding à porta
    addBinding(binding) {
        this.bindings.push(binding);
        console.log(`Binding adicionado à porta ${this.name}: ${binding.sourceComponent?.name || 'undefined'}.${binding.sourcePort?.name || 'undefined'} -> ${binding.targetComponent?.name || 'undefined'}.${binding.targetPort?.name || 'undefined'}`);
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
        // Usa o conector associado ao primeiro binding
        await this.bindings[0].connector.transmit(data);
        return true;
    }

    async receive(data) {
        console.log(`Porta ${this.name} recebendo dados: ${JSON.stringify(data)}`);
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
    constructor(name, sourcePort = null, targetPort = null, transformFn = null, constraintFn = null) {
        console.log(`Inicializando conector ${name}`);
        this.name = name;
        this.sourcePort = sourcePort; // Porta de origem (participante f ou c1)
        this.targetPort = targetPort; // Porta de destino (participante c ou c2)
        this.transformFn = transformFn; // Função de transformação (e.g., FarToCelEX)
        this.constraintFn = constraintFn; // Função de restrição (e.g., FarToCelEQ)
        this.messageQueue = [];
        this.isProcessing = false;
    }

    // Associa portas ao conector via binding
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
            // Valida a restrição, se definida
            if (this.constraintFn) {
                try {
                    await this.constraintFn({ input: data, output: currentData });
                } catch (e) {
                    console.error(`Restrição violada no conector ${this.name}: ${e.message}`);
                    continue;
                }
            }
            // Transmite para a porta de destino
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
        // Associa o binding à porta de origem
        this.sourcePort.addBinding(this);
        // Configura as portas no conector
        this.connector.setPorts(this.sourcePort, this.targetPort);
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
        super('CelToCelCN', null, null, null, null); // Sem transformação ou restrição
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
        port.component = this;
        this.ports.push(port);
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
        if (this.isBoundary) {
            await this.simulateInput();
        }
    }

    async simulateInput() {
        console.log(`Simulando entrada para componente ${this.name}`);
        for (const port of this.ports) {
            if (port.direction === 'out' || port.direction === 'inout') {
                let simulatedValue = port.flowType === 'Real' ? 77.0 : null; // Valor representativo (77°F ~ 25°C)
                console.log(`Simulando envio de ${simulatedValue} pela porta ${this.name}.${port.name}`);
                await port.send(simulatedValue);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
}

// Component Classes
class SystemCP extends SysADLComponent {
    constructor() {
        super('SystemCP', true);
        this.subComponents = new Map();
        this.connectors = new Map();
        this.bindings = [];

        // Inicializa subcomponentes
        this.s1 = new SensorCP('s1', 'temp1');
        this.addSubComponent('s1', this.s1);
        this.s2 = new SensorCP('s2', 'temp2');
        this.addSubComponent('s2', this.s2);
        this.tempMon = new TempMonitorCP();
        this.addSubComponent('tempMon', this.tempMon);
        this.stdOut = new StdOutCP();
        this.addSubComponent('stdOut', this.stdOut);

        // Inicializa conectores
        this.addConnector('c1', new FarToCelCN());
        this.addConnector('c2', new FarToCelCN());
        this.addConnector('c3', new CelToCelCN());

        // Configura bindings (conforme SystemCP.configuration.bindings)
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
        const s2Port = this.subComponents.get('s2').ports.find(p => p.name === 'temp2');
        const tempMonS1Port = this.subComponents.get('tempMon').ports.find(p => p.name === 's1');
        const tempMonAvgPort = this.subComponents.get('tempMon').ports.find(p => p.name === 'average');
        const stdOutAvgPort = this.subComponents.get('stdOut').ports.find(p => p.name === 'avg');

        if (!s1Port || !s2Port || !tempMonS1Port || !tempMonAvgPort || !stdOutAvgPort) {
            console.error('Erro: Uma ou mais portas não encontradas para configurar bindings', {
                s1Port: s1Port?.name,
                s2Port: s2Port?.name,
                tempMonS1Port: tempMonS1Port?.name,
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
            this.subComponents.get('tempMon').ports.find(p => p.name === 's2'),
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
        this.addPort(new SysADLPort(portName, 'Real', 'out')); // FTempOPT
        this.state[portName] = null;
    }
}

class TempMonitorCP extends SysADLComponent {
    constructor() {
        super('TempMonitorCP', false);
        this.addPort(new SysADLPort('s1', 'Real', 'in')); // CTempIPT
        this.addPort(new SysADLPort('s2', 'Real', 'in')); // CTempIPT
        this.addPort(new SysADLPort('average', 'Real', 'out')); // CTempOPT
        this.state['s1'] = null;
        this.state['s2'] = null;
        this.state['average'] = null;
        this.activities.push({ methodName: 'executeTempMonitorAC' });
    }

    async executeTempMonitorAC() {
        console.log('Executando atividade TempMonitorAC no componente TempMonitorCP');
        const params = { s1: this.state['s1'], s2: this.state['s2'] };
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
            await averagePort.send(result);
        }
        console.log(`Atividade TempMonitorAC retornando: ${result}`);
        return result;
    }
}

class StdOutCP extends SysADLComponent {
    constructor() {
        super('StdOutCP', false);
        this.addPort(new SysADLPort('avg', 'Real', 'in')); // CTempIPT
        this.state['avg'] = null;
    }

    async onDataReceived(portName, data) {
        console.log(`StdOutCP recebeu dados na porta ${portName}: ${JSON.stringify(data)}`);
        this.state[portName] = data;
        console.log(`Temperatura média recebida: ${data}°C`);
    }
}

// Executables
async function FarToCelEX(params = {}) {
    console.log(`Executando FarToCelEX com params: ${JSON.stringify(params)}`);
    const f = params.f || 32.0;
    return (5 * (f - 32)) / 9;
}

async function CalcAverageEX(params = {}) {
    console.log(`Executando CalcAverageEX com params: ${JSON.stringify(params)}`);
    const temp1 = params.s1 || 0;
    const temp2 = params.s2 || 0;
    return (temp1 + temp2) / 2;
}

// Constraints
async function validateFarToCelEQ(params = {}) {
    const f = params.input || 32.0;
    const c = params.output || 0;
    console.log(`Avaliando restrição FarToCelEQ: c === (5*(f - 32)/9)`);
    const result = c === (5 * (f - 32) / 9);
    if (!result) {
        throw new Error('Restrição FarToCelEQ violada');
    }
    console.log('Restrição FarToCelEQ passou');
    return result;
}

async function validateCalcAverageEQ(params = {}) {
    const t1 = params.t1 || 0;
    const t2 = params.t2 || 0;
    const av = params.av || 0;
    console.log(`Avaliando restrição CalcAverageEQ: av === (t1 + t2)/2`);
    const result = av === (t1 + t2) / 2;
    if (!result) {
        throw new Error('Restrição CalcAverageEQ violada');
    }
    console.log('Restrição CalcAverageEQ passou');
    return result;
}

// Main Function
async function main() {
    console.log('Iniciando simulação do Simple.sysadl');
    const system = new SystemCP();
    await system.start();
    console.log('Simulação do sistema concluída');
}

main().catch(err => console.error(`Erro na execução: ${err.message}`));
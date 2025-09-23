// @ts-nocheck;
// Generated JavaScript code for SysADL Model: Simple;

// Types
const Real = 'any'; // Value type from SysADL.types;

// Classe base para portas
class SysADLPort {
    constructor(name, flowType, direction = 'inout') {
        console.log(`Inicializando porta ${name} com flowType ${flowType}, direção ${direction}`);;
        this.name = name;
        this.flowType = flowType || 'any';
        this.direction = direction;
        this.value = null;
        this.bindings = [];
        this.onDataReceivedCallback = null;
    }

    addBinding(binding) {
        this.bindings.push(binding);
        console.log(`Binding adicionado à porta ${this.name}: ${binding.sourceComponent?.name || 'undefined'}.${binding.sourcePort?.name || 'undefined'} -> ${binding.targetComponent?.name || 'undefined'}.${binding.targetPort?.name || 'undefined'}`);;
    }

    setOnDataReceivedCallback(callback) {
        this.onDataReceivedCallback = callback;
    }

    send(data) {
        console.log(`Porta ${this.name} enviando dados: ${JSON.stringify(data)}`);;
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
            console.log(`Propagando dados ${data} via binding para ${binding.targetPort?.name}`);;
            binding.connector.transmit(data);
        }
        return true;
    }

    receive(data) {
        console.log(`Porta ${this.name} recebendo dados: ${JSON.stringify(data)}`);;
        if (this.direction !== 'in' && this.direction !== 'inout') {
            console.error(`Não pode receber via ${this.name}: direção inválida (${this.direction})`);
            return false;
        }
        this.value = data;
        if (this.onDataReceivedCallback) {
            this.onDataReceivedCallback(this.name, data);
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
        console.log(`Inicializando conector ${name}`);;
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
        console.log(`Conector ${this.name} configurado com sourcePort ${sourcePort?.name || 'undefined'} e targetPort ${targetPort?.name || 'undefined'}`);;
    }

    transmit(data) {
        console.log(`Conector ${this.name} transmitindo dados: ${JSON.stringify(data)}`);;
        if (!this.sourcePort || !this.targetPort) {
            console.error(`Erro: Conector ${this.name} não tem sourcePort ou targetPort configurados`);
            return;
        }
        let transformedData = this.transformFn ? this.transformFn({ f: data }) : data;
        this.messageQueue.push(transformedData);
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.messageQueue.length > 0) {
            const currentData = this.messageQueue.shift();
            console.log(`Conector ${this.name} processando dados: ${JSON.stringify(currentData)}`);;
            if (this.constraintFn) {
                try {
                    this.constraintFn({ input: data, output: currentData });
                } catch (e) {
                    console.error(`Restrição violada no conector ${this.name}: ${e.message}`);
                    continue;
                }
            }
            this.targetPort.receive(currentData);
        }
        this.isProcessing = false;
    }
}

// Connector Classes
class FahrenheitToCelsiusCN extends SysADLConnector {
    constructor() {
        super('FahrenheitToCelsiusCN', null, null, FahrenheitToCelsiusEX, null);
    }
}

class PresenceCN extends SysADLConnector {
    constructor() {
        super('PresenceCN', null, null, null, null);
    }
}

class CommandCN extends SysADLConnector {
    constructor() {
        super('CommandCN', null, null, null, null);
    }
}

class CTemperatureCN extends SysADLConnector {
    constructor() {
        super('CTemperatureCN', null, null, null, null);
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
        console.log(`Criando binding de ${sourceComponent.name}.${sourcePort.name} para ${targetComponent.name}.${targetPort.name} via conector ${connector.name}`);;
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
        console.log(`Inicializando componente ${name}, isBoundary: ${isBoundary}`);;
        this.name = name;
        this.isBoundary = isBoundary;
        this.ports = [];
        this.state = {};
        this.activities = [];
    }

    addPort(port) {
        this.ports.push(port);
        port.setOnDataReceivedCallback((portName, data) => this.onDataReceived(portName, data));
        console.log(`Porta ${port.name} adicionada ao componente ${this.name}, flowType: ${port.flowType}`);;
    }

    onDataReceived(portName, data) {
        console.log(`Componente ${this.name} recebeu dados na porta ${portName}: ${JSON.stringify(data)}`);;
        this.state[portName] = data;
        for (const activity of this.activities) {
            console.log(`Disparando atividade ${activity.methodName} no componente ${this.name}`);;
            this[activity.methodName]();
        }
    }

    async start() {
        console.log(`Iniciando componente ${this.name}`);;
        if (this.isBoundary) {
            await this.simulateInput();
        }
    }
}

class RTCSystemCFD extends SysADLComponent {
    constructor() {
        super("RTCSystemCFD", false);
    }

class RoomTemperatureControllerCP extends SysADLComponent {
    constructor() {
        super("RoomTemperatureControllerCP", false);
    }

class TemperatureSensorCP extends SysADLComponent {
    constructor() {
        super("TemperatureSensorCP", true);
    }

class PresenceSensorCP extends SysADLComponent {
    constructor() {
        super("PresenceSensorCP", true);
    }

class UserInterfaceCP extends SysADLComponent {
    constructor() {
        super("UserInterfaceCP", true);
    }

class HeaterCP extends SysADLComponent {
    constructor() {
        super("HeaterCP", true);
    }

class CoolerCP extends SysADLComponent {
    constructor() {
        super("CoolerCP", true);
    }

class PresenceCheckerCP extends SysADLComponent {
    constructor() {
        super("PresenceCheckerCP", false);
    }

class CommanderCP extends SysADLComponent {
    constructor() {
        super("CommanderCP", false);
    }

class SensorsMonitorCP extends SysADLComponent {
    constructor() {
        super("SensorsMonitorCP", false);
    }

// Executables
function CommandCoolerEx(params = {}) {
    console.log(`Executando CommandCoolerEx com params: ${JSON.stringify(params)}`);;
    const cmds = params.cmds || 0;
    return cmds -> cooler;
}

function CommandHeaterEx(params = {}) {
    console.log(`Executando CommandHeaterEx com params: ${JSON.stringify(params)}`);;
    const cmds = params.cmds || 0;
    return cmds -> heater;
}

function FahrenheitToCelsiusEx(params = {}) {
    console.log(`Executando FahrenheitToCelsiusEx com params: ${JSON.stringify(params)}`);;
    const f = params.f || 0;
    return 5 * (f - 32) / 9;
}

function CalculateAverageTemperatureEx(params = {}) {
    console.log(`Executando CalculateAverageTemperatureEx com params: ${JSON.stringify(params)}`);;
    const temp1 = params.temp1 || 0;
    const temp2 = params.temp2 || 0;
    return (temp1 + temp2) / 2;
}

function CheckPresenceToSetTemperature(params = {}) {
    console.log(`Executando CheckPresenceToSetTemperature com params: ${JSON.stringify(params)}`);;
    const presence = params.presence || 0;
    const userTemp = params.userTemp || 0;
    if (presence == true) return userTemp; else return 2;
}

function CompareTemperatureEx(params = {}) {
    console.log(`Executando CompareTemperatureEx com params: ${JSON.stringify(params)}`);;
    const target = params.target || 0;
    const average = params.average || 0;
    let heater: Command = types.Command:: Off; let cooler: Command = types.Command:: Off; if (average > target) {
        heater = types.Command:: Off; cooler = types.Command:: On;
    }

    // Constraints
    function validateCalculateAverageTemperatureEQ(params = {}) {
        const t1 = params.t1 || 0;
        const t2 = params.t2 || 0;
        const av = params.av || 0;
        console.log(`Avaliando restrição CalculateAverageTemperatureEQ: av === (t1 + t2)/2`);;
        const result = av === (t1 + t2) / 2;
        if (!result) {
            throw new Error('Restrição CalculateAverageTemperatureEQ violada');
        }
        console.log('Restrição CalculateAverageTemperatureEQ passou');
        return result;
    }

    function validateCompareTemperatureEQ(params = {}) {
        const target = params.target || 0;
        const average = params.average || 0;
        const cmds = params.cmds || 0;
        console.log(`Avaliando restrição CompareTemperatureEQ: average > target ? cmds === types.Commands.heater->Off && types.Commands.cooler->On : types.Commands.heater->On && cmds === types.Commands.cooler->Off`);;
        const result = average > target ? cmds === types.Commands.heater -> Off && types.Commands.cooler -> On : types.Commands.heater -> On && cmds === types.Commands.cooler -> Off;
        if (!result) {
            throw new Error('Restrição CompareTemperatureEQ violada');
        }
        console.log('Restrição CompareTemperatureEQ passou');
        return result;
    }

    function validateFahrenheitToCelsiusEQ(params = {}) {
        const f = params.f || 0;
        const c = params.c || 0;
        console.log(`Avaliando restrição FahrenheitToCelsiusEQ: c === (5*(f - 32)/9)`);;
        const result = c === (5 * (f - 32) / 9);
        if (!result) {
            throw new Error('Restrição FahrenheitToCelsiusEQ violada');
        }
        console.log('Restrição FahrenheitToCelsiusEQ passou');
        return result;
    }

    function validateCommandHeaterEQ(params = {}) {
        const cmds = params.cmds || 0;
        const c = params.c || 0;
        console.log(`Avaliando restrição CommandHeaterEQ: c === cmds->heater`);;
        const result = c === cmds -> heater;
        if (!result) {
            throw new Error('Restrição CommandHeaterEQ violada');
        }
        console.log('Restrição CommandHeaterEQ passou');
        return result;
    }

    function validateCommandCoolerEQ(params = {}) {
        const cmds = params.cmds || 0;
        const c = params.c || 0;
        console.log(`Avaliando restrição CommandCoolerEQ: c === cmds->cooler`);;
        const result = c === cmds -> cooler;
        if (!result) {
            throw new Error('Restrição CommandCoolerEQ violada');
        }
        console.log('Restrição CommandCoolerEQ passou');
        return result;
    }

    function validateCheckPresenceToSetTemperatureEQ(params = {}) {
        const detected = params.detected || 0;
        const userTemp = params.userTemp || 0;
        const target = params.target || 0;
        console.log(`Avaliando restrição CheckPresenceToSetTemperatureEQ: detected === true ? target === userTemp : target === 2`);;
        const result = detected === true ? target === userTemp : target === 2;
        if (!result) {
            throw new Error('Restrição CheckPresenceToSetTemperatureEQ violada');
        }
        console.log('Restrição CheckPresenceToSetTemperatureEQ passou');
        return result;
    }

    // Main Function
    function main() {
        console.log('Iniciando simulação do Simple.sysadl');
        const system = new SystemCP();
        system.start();
        console.log('Simulação do sistema concluída');
    }

    main();
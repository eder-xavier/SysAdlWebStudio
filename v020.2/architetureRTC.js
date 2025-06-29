const readline = require('readline');

// Classe base para portas
class Port {
  constructor(name) {
    this.name = name; // Nome da porta, conforme SysADL
  }

  async send(data) {
    throw new Error("Método send deve ser implementado");
  }

  async receive(data) {
    throw new Error("Método receive deve ser implementado");
  }
}

// Porta de saída 
class OutputPort extends Port {
  constructor(name, connector) {
    super(name);
    this.connector = connector; // Conector associado
  }

  async send(data) {
    console.log(`Porta de saída ${this.name} enviando temperatura: ${data}°C`);
    if (!this.connector) {
      console.error(`Erro: Nenhum conector associado à porta ${this.name}`);
      return;
    }
    await this.connector.transmit(data); // Transmite assincronamente
  }
}

// Porta de entrada
class InputPort extends Port {
  constructor(name, component) {
    super(name);
    this.component = component; // Referência ao componente para notificar recebimento
  }

  async receive(data) {
    return new Promise(resolve => {
      setTimeout(() => {
        console.log(`Porta de entrada ${this.name} recebeu temperatura: ${data}°C`);
        if (this.component) {
          this.component.onDataReceived(this.name, data); // Notifica o componente
        }
        resolve();
      }, 500); // Atraso de 500ms para processamento
    });
  }
}

// Conector para transmitir dados entre portas
class Connector {
  constructor(name, sourcePort, targetPort) {
    this.name = name; 
    this.sourcePort = sourcePort;
    this.targetPort = targetPort;
    this.messageQueue = []; // Fila para mensagens
    this.isProcessing = false; // Controle de processamento
  }

  async transmit(data) {
    this.messageQueue.push(data); // Adiciona à fila
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const currentData = this.messageQueue.shift();
      console.log(`Conector ${this.name} transmitindo temperatura: ${currentData}°C`);
      if (!this.targetPort) {
        console.error(`Erro: Nenhuma porta de destino no conector ${this.name}`);
        continue;
      }
      await this.targetPort.receive(currentData);
    }

    this.isProcessing = false;
  }
}

// Classe base para componentes
class Component {
  constructor(name, isBoundary = false) {
    this.name = name; // Nome do componente
    this.isBoundary = isBoundary; // Indica se é fronteira
    this.ports = []; // Lista de portas
  }

  addPort(port) {
    this.ports.push(port);
    console.log(`Porta ${port.name} adicionada ao componente ${this.name}`);
  }

  async start() {
    console.log(`Componente ${this.name} iniciado`);
  }
}

// Componente de fronteira 
class BoundaryComponent extends Component {
  constructor(name) {
    super(name, true);
  }

  async start() {
    console.log(`Componente de fronteira ${this.name} iniciado`);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    while (true) {
      const data = await new Promise(resolve => {
        rl.question(`Digite temperatura para ${this.name} (ou 'sair' para encerrar): `, resolve);
      });

      if (data.toLowerCase() === 'sair') {
        console.log(`Encerrando componente ${this.name}`);
        rl.close();
        break;
      }

      const temp = parseFloat(data); // Converte para número
      if (isNaN(temp)) {
        console.error(`Erro: Temperatura inválida em ${this.name}. Digite um número.`);
        continue;
      }

      const outputPort = this.ports.find(port => port instanceof OutputPort);
      if (outputPort) {
        await outputPort.send(temp); // Envia temperatura
      } else {
        console.error(`Erro: Nenhuma porta de saída em ${this.name}`);
      }
    }
  }
}

// Componente controlador que calcula a média das temperaturas
class ControllerComponent extends Component {
  constructor(name) {
    super(name, false);
    this.temperatures = { TempInHeater: null, TempInCooler: null }; // Armazena temperaturas
  }

  // Recebe dados das portas de entrada
  async onDataReceived(portName, data) {
    this.temperatures[portName] = data; // Atualiza temperatura
    console.log(`Componente ${this.name} atualizou ${portName} com ${data}°C`);

    // Verifica se ambas as temperaturas estão disponíveis
    if (this.temperatures.TempInHeater !== null && this.temperatures.TempInCooler !== null) {
      const avg = (this.temperatures.TempInHeater + this.temperatures.TempInCooler) / 2;
      console.log(`Componente ${this.name} calculou média: ${avg.toFixed(2)}°C`);
    }
  }

  async start() {
    console.log(`Componente controlador ${this.name} iniciado, aguardando temperaturas...`);
  }
}

// Função principal para configurar a arquitetura
async function main() {
  // Cria componentes
  const heater = new BoundaryComponent("Heater");
  const cooler = new BoundaryComponent("Cooler");
  const controller = new ControllerComponent("Controller");

  // Cria portas
  const heaterOut = new OutputPort("HeaterOut", null);
  const coolerOut = new OutputPort("CoolerOut", null);
  const tempInHeater = new InputPort("TempInHeater", controller);
  const tempInCooler = new InputPort("TempInCooler", controller);

  // Cria conectores
  const heaterToController = new Connector("HeaterToController", heaterOut, tempInHeater);
  const coolerToController = new Connector("CoolerToController", coolerOut, tempInCooler);

  // Associa conectores às portas de saída
  heaterOut.connector = heaterToController;
  coolerOut.connector = coolerToController;

  // Adiciona portas aos componentes
  heater.addPort(heaterOut);
  cooler.addPort(coolerOut);
  controller.addPort(tempInHeater);
  controller.addPort(tempInCooler);

  // Inicia componentes em paralelo
  await Promise.all([
    heater.start(),
    cooler.start(),
    controller.start()
  ]);
}

// Executa a arquitetura
main().catch(err => console.error(`Erro na execução: ${err.message}`));
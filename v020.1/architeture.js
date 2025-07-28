// Classe base para portas, garantindo consistência na interface
class Port {
  constructor(name) {
    this.name = name; // Nome da porta
  }

  send(data) {
    throw new Error("Método send deve ser implementado"); // Método abstrato para envio
  }

  receive(data) {
    throw new Error("Método receive deve ser implementado"); // Método abstrato para recebimento
  }
}

// Classe para portas de saída
class OutputPort extends Port {
  constructor(name, connector = null) {
    super(name);
    this.connector = connector; // Conector associado à porta
  }

  // Envia dados para o conector de forma assíncrona
  async send(data) {
    console.log(`Porta de saída ${this.name} enviando dados: ${data}`);
    if (!this.connector) {
      console.error(`Erro: Nenhum conector associado à porta ${this.name}`);
      return false;
    }
    await this.connector.transmit(data); // Chama o conector de forma assíncrona
    return true;
  }
}

// Classe para portas de entrada
class InputPort extends Port {
  constructor(name) {
    super(name);
  }

  // Recebe dados com um pequeno atraso para simular processamento assíncrono
  async receive(data) {
    return new Promise(resolve => {
      setTimeout(() => {
        console.log(`Porta de entrada ${this.name} recebeu dados: ${data}`);
        resolve();
      }, 500); // Atraso de 500ms para simular processamento
    });
  }
}

// Classe para conectores que transmitem dados entre portas
class Connector {
  constructor(name, flows = []) {
    this.name = name; // Nome do conector
    this.flows = flows; // Lista de fluxos { source, target, type, targetPort }
    this.messageQueue = []; // Fila para armazenar mensagens
    this.isProcessing = false; // Flag para controle de processamento
  }

  // Transmite dados para as portas de destino, gerenciando a fila
  async transmit(data) {
    this.messageQueue.push(data); // Adiciona dados à fila
    if (this.isProcessing) return; // Evita processamento concorrente
    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const currentData = this.messageQueue.shift(); // Remove o primeiro item da fila
      console.log(`Conector ${this.name} transmitindo dados: ${currentData}`);
      for (const flow of this.flows) {
        console.log(`Conector ${this.name} processando fluxo de ${flow.source} para ${flow.target}`);
        if (flow.targetPort) {
          await flow.targetPort.receive(currentData); // Envia para a porta de destino
        } else {
          console.error(`Erro: Nenhuma porta de destino associada ao fluxo ${flow.target} no conector ${this.name}`);
        }
      }
    }

    this.isProcessing = false; // Libera para processar próximas mensagens
  }
}

// Classe Binding para vincular portas de origem e destino
class Binding {
  constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {
    console.log(`Criando binding de ${sourceComponent.name}.${sourcePort.name} para ${targetComponent.name}.${targetPort.name} via conector ${connector.name}`);
    this.sourceComponent = sourceComponent;
    this.sourcePort = sourcePort;
    this.targetComponent = targetComponent;
    this.targetPort = targetPort;
    this.connector = connector;
    // Associa o conector à porta de origem
    this.sourcePort.connector = connector;
    // Adiciona o fluxo ao conector
    this.connector.flows.push({
      source: sourcePort.name,
      target: targetPort.name,
      type: 'any', // Tipo genérico, pode ser especificado em modelos SysADL
      targetPort: this.targetPort
    });
  }

  // Transmite dados pelo binding
  async transmit(data) {
    console.log(`Binding transmitindo dados ${data} de ${this.sourceComponent.name}.${this.sourcePort.name} para ${this.targetComponent.name}.${this.targetPort.name}`);
    await this.connector.transmit(data);
  }
}

// Classe base para componentes
class Component {
  constructor(name, isBoundary = false) {
    this.name = name; // Nome do componente
    this.isBoundary = isBoundary; // Indica se é um componente de fronteira
    this.ports = []; // Lista de portas associadas
  }

  // Adiciona uma porta ao componente
  addPort(port) {
    this.ports.push(port);
    console.log(`Porta ${port.name} adicionada ao componente ${this.name}`);
  }

  // Inicia o componente
  async start() {
    console.log(`Componente ${this.name} iniciado`);
    if (this.isBoundary) {
      await this.simulateInput();
    }
  }

  // Simula entrada de dados para componentes de fronteira
  async simulateInput() {
    console.log(`Simulando entrada para componente ${this.name}`);
    const outputPort = this.ports.find(port => port instanceof OutputPort);
    if (!outputPort) {
      console.error(`Erro: Nenhuma porta de saída encontrada em ${this.name}`);
      return;
    }
    // Simula envio de dados
    const simulatedData = "DadosSimulados"; // Pode ser ajustado conforme o modelo
    console.log(`Simulando envio de ${simulatedData} pela porta ${outputPort.name}`);
    await outputPort.send(simulatedData);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Atraso para simulação
  }
}

// Componente de fronteira
class BoundaryComponent extends Component {
  constructor(name) {
    super(name, true);
  }
}

// Componente receptor
class ReceiverComponent extends Component {
  constructor(name) {
    super(name, false);
  }
}

// Função principal para configurar e executar a arquitetura
async function main() {
  console.log("Iniciando simulação da arquitetura");

  // Cria os componentes
  const boundaryComp = new BoundaryComponent("ComponenteFronteira");
  const receiverComp = new ReceiverComponent("ComponenteReceptor");

  // Cria as portas
  const outputPort = new OutputPort("PortaSaida");
  const inputPort = new InputPort("PortaEntrada");

  // Cria o conector
  const connector = new Connector("ConectorDados", []);

  // Adiciona portas aos componentes
  boundaryComp.addPort(outputPort);
  receiverComp.addPort(inputPort);

  // Cria o binding
  const binding = new Binding(boundaryComp, outputPort, receiverComp, inputPort, connector);

  // Inicia os componentes em paralelo
  await Promise.all([
    boundaryComp.start(),
    receiverComp.start()
  ]);

  console.log("Simulação da arquitetura concluída");
}

// Executa a função principal e trata erros
main().catch(err => console.error(`Erro na execução: ${err.message}`));
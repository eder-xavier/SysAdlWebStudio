const readline = require('readline');

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
  constructor(name, connector) {
    super(name);
    this.connector = connector; // Conector associado à porta
  }

  // Envia dados para o conector de forma assíncrona
  async send(data) {
    console.log(`Porta de saída ${this.name} enviando dados: ${data}`);
    if (!this.connector) {
      console.error(`Erro: Nenhum conector associado à porta ${this.name}`);
      return;
    }
    await this.connector.transmit(data); // Chama o conector de forma assíncrona
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
  constructor(name, sourcePort, targetPort) {
    this.name = name; // Nome do conector
    this.sourcePort = sourcePort; // Porta de origem
    this.targetPort = targetPort; // Porta de destino
    this.messageQueue = []; // Fila para armazenar mensagens
    this.isProcessing = false; // Flag para controle de processamento
  }

  // Transmite dados para a porta de destino, gerenciando a fila
  async transmit(data) {
    this.messageQueue.push(data); // Adiciona dados à fila
    if (this.isProcessing) return; // Evita processamento concorrente
    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const currentData = this.messageQueue.shift(); // Remove o primeiro item da fila
      console.log(`Conector ${this.name} transmitindo dados: ${currentData}`);
      if (!this.targetPort) {
        console.error(`Erro: Nenhuma porta de destino associada ao conector ${this.name}`);
        continue;
      }
      await this.targetPort.receive(currentData); // Envia para a porta de destino
    }

    this.isProcessing = false; // Libera para processar próximas mensagens
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
  }
}

// Componente de fronteira que aceita entrada do usuário
class BoundaryComponent extends Component {
  constructor(name) {
    super(name, true);
  }

  // Inicia o componente e captura entrada do usuário
  async start() {
    console.log(`Componente de fronteira ${this.name} iniciado`);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Loop assíncrono para capturar entrada do usuário
    while (true) {
      const data = await new Promise(resolve => {
        rl.question(`Digite dados para enviar de ${this.name} (ou 'sair' para encerrar): `, resolve);
      });

      if (data.toLowerCase() === 'sair') {
        console.log(`Encerrando componente ${this.name}`);
        rl.close();
        break;
      }

      // Envia dados pela porta de saída
      const outputPort = this.ports.find(port => port instanceof OutputPort);
      if (outputPort) {
        await outputPort.send(data); // Envio assíncrono
      } else {
        console.error(`Erro: Nenhuma porta de saída encontrada em ${this.name}`);
      }
    }
  }
}

// Componente receptor que aguarda dados
class ReceiverComponent extends Component {
  constructor(name) {
    super(name, false);
  }

  // Inicia o componente receptor
  async start() {
    console.log(`Componente receptor ${this.name} iniciado, aguardando dados...`);
  }
}

// Função principal para configurar e executar a arquitetura
async function main() {
  // Cria os componentes
  const boundaryComp = new BoundaryComponent("ComponenteFronteira");
  const receiverComp = new ReceiverComponent("ComponenteReceptor");

  // Cria as portas
  const outputPort = new OutputPort("PortaSaida", null);
  const inputPort = new InputPort("PortaEntrada");

  // Cria o conector
  const connector = new Connector("ConectorDados", outputPort, inputPort);

  // Associa o conector à porta de saída
  outputPort.connector = connector;

  // Adiciona portas aos componentes
  boundaryComp.addPort(outputPort);
  receiverComp.addPort(inputPort);

  // Inicia os componentes em paralelo
  await Promise.all([
    boundaryComp.start(),
    receiverComp.start()
  ]);
}

// Executa a função principal e trata erros
main().catch(err => console.error(`Erro na execução: ${err.message}`));
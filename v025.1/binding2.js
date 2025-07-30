// Classe base para portas, garantindo consistência na interface
class Port {
  constructor(name, component = null) {
    this.name = name; // Nome da porta
    this.component = component; // Componente associado à porta
  }

  send(data) { // comportamental
    throw new Error("Método send d"); // Método abstrato para envio
  }

  receive(data) {
    throw new Error("Método receive "); // Método abstrato para recebimento
  }
}

// Classe para portas de saída
class OutputPort extends Port {
  constructor(name, component = null, connector = null) {
    super(name, component);
    this.connector = connector; // Conector associado à porta
  }

  // Envia dados para o conector de forma assíncrona
  async send(data) {
    console.log(`Porta de saída ${this.name} enviando dados: ${JSON.stringify(data)}`);
    if (!this.connector) {
      console.error(`Erro: Nenhum conector associado à porta ${this.name}`);
      return false;
    }
    await this.connector.transmit(data); 
    return true;
  }
}

// Classe para portas de entrada
class InputPort extends Port {
  constructor(name, component = null) {
    super(name, component);
  }

  // Recebe dados com um pequeno atraso e notifica o componente
  async receive(data) {
    return new Promise(resolve => {
      setTimeout(() => {
        console.log(`Porta de entrada ${this.name} recebeu dados: ${JSON.stringify(data)}`);
        if (this.component) {
          this.component.onDataReceived(this.name, data); 
        }
        resolve();
      }, 1000);
    });
  }
}

// Classe para conectores que transmitem dados entre portas
class Connector {
  constructor(name, flows = [], transformFn = null) {
    this.name = name; // Nome do conector
    this.flows = flows; // Lista de fluxos { source, target, type, targetPort, condition }
    this.transformFn = transformFn; // Função de transformação opcional
    this.messageQueue = []; // Fila para armazenar mensagens
    this.isProcessing = false; // Flag para controle de processamento
  }

  // Transmite dados para as portas de destino, gerenciando a fila
  async transmit(data) {
    let transformedData = this.transformFn ? this.transformFn(data) : data; // Aplica transformação
    this.messageQueue.push(transformedData); // Adiciona dados transformados à fila
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const currentData = this.messageQueue.shift(); // Remove o primeiro item da fila
      console.log(`Conector ${this.name} transmitindo dados: ${JSON.stringify(currentData)}`);
      for (const flow of this.flows) {
        // Verifica condição de roteamento, se definida
        if (flow.condition && !flow.condition(currentData)) {
          console.log(`Fluxo de ${flow.source} para ${flow.target} ignorado: condição não atendida`);
          continue;
        }
        console.log(`Conector ${this.name} processando fluxo de ${flow.source} para ${flow.target}`);
        if (flow.targetPort) {
          await flow.targetPort.receive(currentData); // Envia para a porta de destino
        } else {
          console.error(`Erro: Nenhuma porta de destino associada ao fluxo ${flow.target} no conector ${this.name}`);
        }
      }
    }

    this.isProcessing = false; 
  }
}

// Classe Binding para vincular portas de origem e destino
class Binding {
  constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector, condition = null) {
    console.log(`Criando binding de ${sourceComponent.name}.${sourcePort.name} para ${targetComponent.name}.${targetPort.name} via conector ${connector.name}`);
    this.sourceComponent = sourceComponent;
    this.sourcePort = sourcePort;
    this.targetComponent = targetComponent;
    this.targetPort = targetPort;
    this.connector = connector;

    this.sourcePort.connector = connector;
    // Adiciona o fluxo ao conector com condição opcional
    this.connector.flows.push({
      source: sourcePort.name,
      target: targetPort.name,
      type: 'any', // Tipo genérico, pode ser especificado em modelos SysADL
      targetPort: this.targetPort,
      condition // Função de condição para roteamento
    });
  }

  // Transmite dados pelo binding
  async transmit(data) {
    console.log(`Binding transmitindo dados ${JSON.stringify(data)} de ${this.sourceComponent.name}.${this.sourcePort.name} para ${this.targetComponent.name}.${this.targetPort.name}`);
    await this.connector.transmit(data);
  }
}

// Classe base para componentes
class Component {
  constructor(name, isBoundary = false) {
    this.name = name; // Nome do componente
    this.isBoundary = isBoundary; // Indica se é um componente de fronteira
    this.ports = []; // Lista de portas associadas
    this.state = {}; // Estado para armazenar dados recebidos
  }

  // Adiciona uma porta ao componente
  addPort(port) {
    port.component = this; 
    this.ports.push(port);
    console.log(`Porta ${port.name} adicionada ao componente ${this.name}`);
  }

  // Processa dados recebidos por uma porta
  async onDataReceived(portName, data) {
    console.log(`Componente ${this.name} recebeu dados ${JSON.stringify(data)} na porta ${portName}`);
    this.state[portName] = data; // Armazena os dados no estado
  }

  // Inicia o componente
  async start() {
    console.log(`Componente ${this.name} iniciado`);
    if (this.isBoundary) {
      await this.simulateInput();
    }
  }


  async simulateInput() {
    console.log(`Simulando entrada para componente ${this.name}`);
    const outputPort = this.ports.find(port => port instanceof OutputPort);
    if (!outputPort) {
      console.error(`Erro: Nenhuma porta de saída encontrada em ${this.name}`);
      return;
    }
    // Simula envio de dados com diferentes tipos 
    const simulatedData = [
      { type: 'temperature', value: 25 },
      { type: 'status', value: 'ON' },
      { type: 'temperature', value: 15 }
    ];
    for (const data of simulatedData) {
      console.log(`Simulando envio de ${JSON.stringify(data)} pela porta ${outputPort.name}`);
      await outputPort.send(data);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Componente de fronteira
class BoundaryComponent extends Component {
  constructor(name) {
    super(name, true);
  }
}

// Primeiro componente receptor
class ReceiverComponent extends Component {
  constructor(name) {
    super(name, false);
  }

  // Sobrescreve onDataReceived para processamento específico
  async onDataReceived(portName, data) {
    console.log(`Componente receptor ${this.name} processando dados ${JSON.stringify(data)} recebidos na porta ${portName}`);
    this.state[portName] = data; // Armazena no estado
    console.log(`Estado de ${this.name} atualizado: ${JSON.stringify(this.state)}`);
  }
}

// Segundo componente receptor
class SecondReceiverComponent extends Component {
  constructor(name) {
    super(name, false);
  }

  // Sobrescreve onDataReceived para processamento específico
  async onDataReceived(portName, data) {
    console.log(`Componente receptor ${this.name} processando dados ${JSON.stringify(data)} recebidos na porta ${portName}`);
    this.state[portName] = data; // Armazena no estado
    console.log(`Estado de ${this.name} atualizado: ${JSON.stringify(this.state)}`);
  }
}

// Função principal para configurar e executar a arquitetura
async function main() {
  console.log("Iniciando simulação da arquitetura");

  // Função de transformação para o conector (exemplo: converte temperatura para Fahrenheit)
  const transformFn = (data) => {
    if (data.type === 'temperature') {
      return { ...data, value: (data.value * 9 / 5) + 32, unit: 'Fahrenheit' };
    }
    return data; // Retorna dados inalterados se não for temperatura
  };

  // Cria os componentes
  const boundaryComp = new BoundaryComponent("ComponenteFronteira");
  const receiverComp = new ReceiverComponent("ComponenteReceptor1");
  const secondReceiverComp = new SecondReceiverComponent("ComponenteReceptor2");

  // Cria as portas
  const outputPort = new OutputPort("PortaSaida");
  const inputPort1 = new InputPort("PortaEntrada1");
  const inputPort2 = new InputPort("PortaEntrada2");

  // Cria o conector com a função de transformação
  const connector = new Connector("ConectorDados", [], transformFn);

  // Adiciona portas aos componentes
  boundaryComp.addPort(outputPort);
  receiverComp.addPort(inputPort1);
  secondReceiverComp.addPort(inputPort2);

  // Configurações de bindings com condições de roteamento
  const bindingConfigs = [
    {
      sourceComponent: boundaryComp,
      sourcePort: outputPort,
      targetComponent: receiverComp,
      targetPort: inputPort1,
      connector: connector,
      condition: (data) => data.type === 'temperature' // Apenas temperaturas para Receptor1
    },
    {
      sourceComponent: boundaryComp,
      sourcePort: outputPort,
      targetComponent: secondReceiverComp,
      targetPort: inputPort2,
      connector: connector,
      condition: (data) => data.type === 'status' // Apenas status para Receptor2
    }
  ];

  // Cria os bindings
  console.log("Configurando bindings...");
  const bindings = bindingConfigs.map(config => {
    console.log(`Criando binding entre ${config.sourceComponent.name}.${config.sourcePort.name} e ${config.targetComponent.name}.${config.targetPort.name}`);
    return new Binding(
      config.sourceComponent,
      config.sourcePort,
      config.targetComponent,
      config.targetPort,
      config.connector,
      config.condition
    );
  });

  // Inicia os componentes em paralelo
  console.log("Iniciando componentes...");
  await Promise.all([
    boundaryComp.start(),
    receiverComp.start(),
    secondReceiverComp.start()
  ]);

  console.log("Simulação da arquitetura concluída");
}

// Executa a função principal e trata erros
main().catch(err => console.error(`Erro na execução: ${err.message}`));
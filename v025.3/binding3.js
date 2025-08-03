// @ts-nocheck

//types
const FahrenheitTemperature = 'any'; 
const CelsiusTemperature = 'any'; 
const BooleanType = 'any'; 
const Command = Object.freeze({ On: 'On', Off: 'Off' }); // Enum para comandos

// Classe base para portas
class Port {
  constructor(name, flowType = 'any', component = null) {
    this.name = name; 
    this.flowType = flowType; 
    this.component = component; 
    this.bindings = []; // Lista de bindings associados à porta
  }

  // Método para associar um binding à porta
  addBinding(binding) {
    this.bindings.push(binding);
    console.log(`Binding adicionado à porta ${this.name}: ${binding.sourceComponent.name}.${binding.sourcePort.name} -> ${binding.targetComponent.name}.${binding.targetPort.name}`);
  }

  send(data) {
    throw new Error("Método send não implementado");
  }

  receive(data) {
    throw new Error("Método receive não implementado");
  }
}

// Classe para portas de saída
class OutputPort extends Port {
  constructor(name, flowType = 'any', component = null) {
    super(name, flowType, component);
  }

  async send(data) {
    console.log(`Porta de saída ${this.name} enviando dados: ${JSON.stringify(data)}`);
    if (this.bindings.length === 0) {
      console.error(`Erro: Nenhum binding associado à porta ${this.name}`);
      return false;
    }
    // Usa o conector associado ao primeiro binding para transmitir os dados
    await this.bindings[0].connector.transmit(data);
    return true;
  }
}

// Classe para portas de entrada
class InputPort extends Port {
  constructor(name, flowType = 'any', component = null) {
    super(name, flowType, component);
  }

  async receive(data) {
    console.log(`Porta de entrada ${this.name} recebeu dados: ${JSON.stringify(data)}`);
    if (this.component) {
      await this.component.onDataReceived(this.name, data);
    }
    return true;
  }
}

// Classe para conectores
class Connector {
  constructor(name, flows = [], transformFn = null) {
    this.name = name; 
    this.flows = flows; // Lista de fluxos 
    this.transformFn = transformFn; // Função de transformação opcional
    this.messageQueue = []; // Fila para mensagens
    this.isProcessing = false; // Controle de processamento
  }

  async transmit(data) {
    let transformedData = this.transformFn ? await this.transformFn(data) : data; // Aplica transformação
    this.messageQueue.push(transformedData);
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const currentData = this.messageQueue.shift();
      console.log(`Conector ${this.name} transmitindo dados: ${JSON.stringify(currentData)}`);
      for (const flow of this.flows) {
        if (flow.condition && !flow.condition(currentData)) {
          console.log(`Fluxo de ${flow.source} para ${flow.target} ignorado: condição não atendida`);
          continue;
        }
        console.log(`Conector ${this.name} processando fluxo de ${flow.source} para ${flow.target}`);
        if (flow.targetPort) {
          await flow.targetPort.receive(currentData);
        } else {
          console.error(`Erro: Nenhuma porta de destino associada ao fluxo ${flow.target} no conector ${this.name}`);
        }
      }
    }
    this.isProcessing = false;
  }
}

// Classe Binding
class Binding {
  constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector, condition = null) {
    console.log(`Criando binding de ${sourceComponent.name}.${sourcePort.name} para ${targetComponent.name}.${targetPort.name} via conector ${connector.name}`);
    this.sourceComponent = sourceComponent;
    this.sourcePort = sourcePort;
    this.targetComponent = targetComponent;
    this.targetPort = targetPort;
    this.connector = connector;
    this.condition = condition;
    // Associa o binding à porta de origem
    this.sourcePort.addBinding(this);
    // Adiciona o fluxo ao conector
    this.connector.flows.push({
      source: sourcePort.name,
      target: targetPort.name,
      type: sourcePort.flowType || 'any',
      targetPort: this.targetPort,
      condition: this.condition
    });
  }
}

// Classe base para componentes
class Component {
  constructor(name, isBoundary = false) {
    this.name = name;
    this.isBoundary = isBoundary;
    this.ports = [];
    this.state = {};
  }

  addPort(port) {
    port.component = this;
    this.ports.push(port);
    console.log(`Porta ${port.name} adicionada ao componente ${this.name}`);
  }

  async onDataReceived(portName, data) {
    console.log(`Componente ${this.name} recebeu dados ${JSON.stringify(data)} na porta ${portName}`);
    this.state[portName] = data;
  }

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
    // Dados simulados compatíveis com RTC.sysadl
    const simulatedData = [
      { type: 'FahrenheitTemperature', value: 77.0 }, // ~25°C
      { type: 'Boolean', value: true },
      { type: 'Command', value: Command.On }
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

  async onDataReceived(portName, data) {
    console.log(`Componente receptor ${this.name} processando dados ${JSON.stringify(data)} recebidos na porta ${portName}`);
    this.state[portName] = data;
    console.log(`Estado de ${this.name} atualizado: ${JSON.stringify(this.state)}`);
  }
}

// Segundo componente receptor
class SecondReceiverComponent extends Component {
  constructor(name) {
    super(name, false);
  }

  async onDataReceived(portName, data) {
    console.log(`Componente receptor ${this.name} processando dados ${JSON.stringify(data)} recebidos na porta ${portName}`);
    this.state[portName] = data;
    console.log(`Estado de ${this.name} atualizado: ${JSON.stringify(this.state)}`);
  }
}

// Função principal
async function main() {
  console.log("Iniciando simulação da arquitetura");

  // Função de transformação para o conector (baseada em FahrenheitToCelsiusEx do RTC)
  const transformFn = async (data) => {
    if (data.type === 'FahrenheitTemperature') {
      const celsius = (5 * (data.value - 32)) / 9;
      return { type: 'CelsiusTemperature', value: celsius, unit: 'Celsius' };
    }
    return data; // Retorna dados inalterados se não for temperatura
  };

  // Cria os componentes
  const boundaryComp = new BoundaryComponent("ComponenteFronteira");
  const receiverComp = new ReceiverComponent("ComponenteReceptor1");
  const secondReceiverComp = new SecondReceiverComponent("ComponenteReceptor2");

  // Cria as portas com tipos de fluxo
  const outputPort = new OutputPort("PortaSaida", 'any');
  const inputPort1 = new InputPort("PortaEntrada1", 'CelsiusTemperature');
  const inputPort2 = new InputPort("PortaEntrada2", 'Boolean');

  // Cria dois conectores
  const tempConnector = new Connector("ConectorTemperatura", [], transformFn);
  const statusConnector = new Connector("ConectorStatus", []);

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
      connector: tempConnector,
      condition: (data) => data.type === 'FahrenheitTemperature' // Apenas temperaturas
    },
    {
      sourceComponent: boundaryComp,
      sourcePort: outputPort,
      targetComponent: secondReceiverComp,
      targetPort: inputPort2,
      connector: statusConnector,
      condition: (data) => data.type === 'Boolean' // Apenas booleanos
    }
  ];

  // Cria os bindings
  console.log("Configurando bindings...");
  const bindings = bindingConfigs.map(config => {
    return new Binding(
      config.sourceComponent,
      config.sourcePort,
      config.targetComponent,
      config.targetPort,
      config.connector,
      config.condition
    );
  });

  // Inicia os componentes
  console.log("Iniciando componentes...");
  await Promise.all([
    boundaryComp.start(),
    receiverComp.start(),
    secondReceiverComp.start()
  ]);

  console.log("Simulação da arquitetura concluída");
}

// Executa a função principal
main().catch(err => console.error(`Erro na execução: ${err.message}`));
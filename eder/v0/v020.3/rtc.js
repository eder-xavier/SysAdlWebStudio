// Função para adicionar mensagens ao log
function addToLog(message) {
  const logDiv = document.getElementById('log');
  const timestamp = new Date().toLocaleTimeString('pt-BR');
  logDiv.innerHTML += `[${timestamp}] ${message}<br>`;
  logDiv.scrollTop = logDiv.scrollHeight; // Rolagem automática
  console.log(message); // Também loga no console
}

// Classe base para portas
class Port {
  constructor(name, x, y) {
    this.name = name; // Nome da porta (SysADL)
    this.x = x; // Posição X no canvas
    this.y = y; // Posição Y no canvas
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
  constructor(name, x, y, connector) {
    super(name, x, y);
    this.connector = connector; // Conector associado
  }

  async send(data) {
    addToLog(`Porta ${this.name} enviando: ${data}°C`);
    drawMessage(this.x, this.y, `Enviando ${data}°C`, 'blue');
    if (!this.connector) {
      addToLog(`Erro: Nenhum conector em ${this.name}`);
      return;
    }
    await this.connector.transmit(data);
  }
}

// Porta de entrada
class InputPort extends Port {
  constructor(name, x, y, component) {
    super(name, x, y);
    this.component = component; // Componente associado
  }

  async receive(data) {
    return new Promise(resolve => {
      setTimeout(() => {
        addToLog(`Porta ${this.name} recebeu: ${data}°C`);
        drawMessage(this.x, this.y, `Recebido ${data}°C`, 'green');
        if (this.component) {
          this.component.onDataReceived(this.name, data);
        }
        resolve();
      }, 1000); // Atraso de 1s para simular processamento
    });
  }
}

// Conector entre portas
class Connector {
  constructor(name, sourcePort, targetPort) {
    this.name = name; // Nome do conector (SysADL)
    this.sourcePort = sourcePort;
    this.targetPort = targetPort;
    this.messageQueue = []; // Fila de mensagens
    this.isProcessing = false;
  }

  async transmit(data) {
    this.messageQueue.push(data);
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const currentData = this.messageQueue.shift();
      addToLog(`Conector ${this.name} transmitindo: ${currentData}°C`);
      animateDataFlow(this.sourcePort, this.targetPort, currentData);
      if (this.targetPort) {
        await this.targetPort.receive(currentData);
      }
    }

    this.isProcessing = false;
  }
}

// Classe base para componentes
class Component {
  constructor(name, isBoundary, x, y, width, height) {
    this.name = name; // Nome do componente (SysADL)
    this.isBoundary = isBoundary;
    this.ports = [];
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  addPort(port) {
    this.ports.push(port);
    addToLog(`Porta ${port.name} adicionada a ${this.name}`);
  }

  draw(ctx) {
    ctx.fillStyle = this.isBoundary ? '#ffcccc' : '#ccffcc';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    ctx.fillStyle = 'black';
    ctx.font = '16px Arial';
    ctx.fillText(this.name, this.x + 10, this.y + 20);
    this.ports.forEach(port => {
      ctx.fillStyle = port instanceof OutputPort ? 'blue' : 'green';
      ctx.fillRect(port.x - 5, port.y - 5, 10, 10);
      ctx.fillText(port.name, port.x + 10, port.y + 5);
    });
  }
}

// Componente de fronteira (Heater ou Cooler)
class BoundaryComponent extends Component {
  constructor(name, x, y) {
    super(name, true, x, y, 150, 100);
    this.currentTemp = null; // Temperatura atual
    this.intervalId = null; // ID do intervalo para envio contínuo
  }

  // Inicia envio contínuo
  async startSending(temp) {
    if (isNaN(temp)) {
      alert(`Por favor, insira uma temperatura válida para ${this.name}.`);
      return;
    }
    this.currentTemp = temp;
    addToLog(`Componente ${this.name} iniciou envio contínuo: ${temp}°C`);
    if (this.intervalId) clearInterval(this.intervalId); // Para intervalo anterior
    this.intervalId = setInterval(async () => {
      const outputPort = this.ports.find(port => port instanceof OutputPort);
      if (outputPort) {
        await outputPort.send(this.currentTemp);
      }
    }, 3000); // Envia a cada 3s
  }

  // Pausa envio contínuo
  pauseSending() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      addToLog(`Componente ${this.name} pausou envio contínuo`);
    }
  }
}

// Componente controlador
class ControllerComponent extends Component {
  constructor(name, x, y) {
    super(name, false, x, y, 150, 150);
    this.temperatures = { TempInHeater: null, TempInCooler: null };
  }

  async onDataReceived(portName, data) {
    this.temperatures[portName] = data;
    addToLog(`Componente ${this.name} atualizou ${portName}: ${data}°C`);
    drawMessage(this.x + this.width / 2, this.y + this.height - 20, `Atualizado ${portName}: ${data}°C`, 'purple');

    if (this.temperatures.TempInHeater !== null && this.temperatures.TempInCooler !== null) {
      const avg = (this.temperatures.TempInHeater + this.temperatures.TempInCooler) / 2;
      addToLog(`Componente ${this.name} calculou média: ${avg.toFixed(2)}°C`);
      document.getElementById('output').textContent = `Média: ${avg.toFixed(2)}°C`;
      drawMessage(this.x + this.width / 2, this.y + this.height + 20, `Média: ${avg.toFixed(2)}°C`, 'red');
    }
  }
}

// Configuração do canvas
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Criação dos componentes
const heater = new BoundaryComponent('Heater', 50, 50);
const cooler = new BoundaryComponent('Cooler', 50, 250);
const controller = new ControllerComponent('Controller', 600, 100);

// Criação das portas
const heaterOut = new OutputPort('HeaterOut', 200, 100, null);
const coolerOut = new OutputPort('CoolerOut', 200, 300, null);
const tempInHeater = new InputPort('TempInHeater', 600, 150, controller);
const tempInCooler = new InputPort('TempInCooler', 600, 250, controller);

// Criação dos conectores
const heaterToController = new Connector('HeaterToController', heaterOut, tempInHeater);
const coolerToController = new Connector('CoolerToController', coolerOut, tempInCooler);

// Associação de conectores às portas
heaterOut.connector = heaterToController;
coolerOut.connector = coolerToController;

// Adição de portas aos componentes
heater.addPort(heaterOut);
cooler.addPort(coolerOut);
controller.addPort(tempInHeater);
controller.addPort(tempInCooler);

// Função para desenhar a arquitetura
function drawArchitecture() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  heater.draw(ctx);
  cooler.draw(ctx);
  controller.draw(ctx);

  // Desenha conectores
  ctx.beginPath();
  ctx.moveTo(heaterOut.x, heaterOut.y);
  ctx.lineTo(tempInHeater.x, tempInHeater.y);
  ctx.strokeStyle = 'black';
  ctx.stroke();
  ctx.fillText('HeaterToController', (heaterOut.x + tempInHeater.x) / 2, (heaterOut.y + tempInHeater.y) / 2);

  ctx.beginPath();
  ctx.moveTo(coolerOut.x, coolerOut.y);
  ctx.lineTo(tempInCooler.x, tempInCooler.y);
  ctx.stroke();
  ctx.fillText('CoolerToController', (coolerOut.x + tempInCooler.x) / 2, (coolerOut.y + tempInCooler.y) / 2);
}

// Função para animar o fluxo de dados
function animateDataFlow(sourcePort, targetPort, data) {
  let progress = 0;
  const dx = targetPort.x - sourcePort.x;
  const dy = targetPort.y - sourcePort.y;

  function animate() {
    drawArchitecture();
    const x = sourcePort.x + dx * progress;
    const y = sourcePort.y + dy * progress;
    ctx.fillStyle = 'orange';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillText(`${data}°C`, x + 10, y);
    progress += 0.02;
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  requestAnimationFrame(animate);
}

// Função para exibir mensagens temporárias
function drawMessage(x, y, text, color) {
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  setTimeout(() => {
    drawArchitecture();
  }, 2000);
}

// Funções para controle de envio
function startHeater() {
  const temp = parseFloat(document.getElementById('heaterTemp').value);
  heater.startSending(temp);
}

function pauseHeater() {
  heater.pauseSending();
}

function startCooler() {
  const temp = parseFloat(document.getElementById('coolerTemp').value);
  cooler.startSending(temp);
}

function pauseCooler() {
  cooler.pauseSending();
}

// Inicializa a visualização
drawArchitecture();
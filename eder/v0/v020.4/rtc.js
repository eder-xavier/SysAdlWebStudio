// Função para adicionar mensagens ao log
function addToLog(message) {
  const logDiv = document.getElementById('log');
  const timestamp = new Date().toLocaleTimeString('pt-BR');
  logDiv.innerHTML += `[${timestamp}] ${message}<br>`;
  logDiv.scrollTop = logDiv.scrollHeight; // Rolagem automática
  console.log(message);
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
    addToLog(`Porta ${this.name} enviando: ${data}`);
    drawMessage(this.x, this.y, `Enviando ${data}`, 'blue');
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
        addToLog(`Porta ${this.name} recebeu: ${data}`);
        drawMessage(this.x, this.y, `Recebido ${data}`, 'green');
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
      addToLog(`Conector ${this.name} transmitindo: ${currentData}`);
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

// Componente de fronteira (TempSensor1, TempSensor2, Interface)
class BoundaryComponent extends Component {
  constructor(name, x, y) {
    super(name, true, x, y, 150, 100);
    this.currentData = null; // Temperatura ou comando atual
    this.intervalId = null; // ID do intervalo para envio contínuo (sensores)
  }

  // Inicia envio contínuo (para sensores)
  async startSending(data) {
    if (isNaN(data)) {
      alert(`Por favor, insira um valor válido para ${this.name}.`);
      return;
    }
    this.currentData = data;
    addToLog(`Componente ${this.name} iniciou envio contínuo: ${data}°C`);
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(async () => {
      const outputPort = this.ports.find(port => port instanceof OutputPort);
      if (outputPort) {
        await outputPort.send(this.currentData);
      }
    }, 3000); // Envia a cada 3s
  }

  // Pausa envio contínuo (para sensores)
  pauseSending() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      addToLog(`Componente ${this.name} pausou envio contínuo`);
    }
  }

  // Envio único (para Interface)
  async sendData(data) {
    if (isNaN(data)) {
      alert(`Por favor, insira uma temperatura válida para ${this.name}.`);
      return;
    }
    const outputPort = this.ports.find(port => port instanceof OutputPort);
    if (outputPort) {
      addToLog(`Componente ${this.name} enviou: ${data}°C`);
      await outputPort.send(data);
    }
  }
}

// Componente controlador
class ControllerComponent extends Component {
  constructor(name, x, y) {
    super(name, false, x, y, 150, 150);
    this.temperatures = { Sensor1In: null, Sensor2In: null };
    this.desiredTemp = null;
  }

  async onDataReceived(portName, data) {
    if (portName === 'DesiredTempIn') {
      this.desiredTemp = data;
      addToLog(`Componente ${this.name} atualizou temperatura desejada: ${data}°C`);
      drawMessage(this.x + this.width / 2, this.y + this.height - 40, `Desejada: ${data}°C`, 'purple');
    } else {
      this.temperatures[portName] = data;
      addToLog(`Componente ${this.name} atualizou ${portName}: ${data}°C`);
      drawMessage(this.x + this.width / 2, this.y + this.height - 20, `Atualizado ${portName}: ${data}°C`, 'purple');
    }

    if (this.temperatures.Sensor1In !== null && this.temperatures.Sensor2In !== null && this.desiredTemp !== null) {
      const avg = (this.temperatures.Sensor1In + this.temperatures.Sensor2In) / 2;
      addToLog(`Componente ${this.name} calculou média: ${avg.toFixed(2)}°C`);
      document.getElementById('output').textContent = `Média: ${avg.toFixed(2)}°C | Desejada: ${this.desiredTemp}°C`;
      drawMessage(this.x + this.width / 2, this.y + this.height + 20, `Média: ${avg.toFixed(2)}°C`, 'red');

      const tolerance = 0.1;
      if (Math.abs(avg - this.desiredTemp) > tolerance) {
        const outputPort = avg < this.desiredTemp ? 
          this.ports.find(port => port.name === 'HeaterOut') :
          this.ports.find(port => port.name === 'CoolerOut');
        const action = avg < this.desiredTemp ? 'Ligar Heater' : 'Ligar Cooler';
        if (outputPort) {
          addToLog(`Componente ${this.name} acionando: ${action}`);
          await outputPort.send(action);
        }
      } else {
        addToLog(`Componente ${this.name}: Média (${avg.toFixed(2)}°C) dentro da tolerância de ${this.desiredTemp}°C`);
      }
    }
  }
}

// Componente atuador (Heater ou Cooler)
class ActuatorComponent extends Component {
  constructor(name, x, y) {
    super(name, false, x, y, 150, 100);
  }

  async onDataReceived(portName, data) {
    addToLog(`Componente ${this.name} recebeu comando: ${data}`);
    drawMessage(this.x + this.width / 2, this.y + this.height - 20, `Comando: ${data}`, 'orange');
  }
}

// Configuração do canvas
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Criação dos componentes
const tempSensor1 = new BoundaryComponent('TempSensor1', 50, 50);
const tempSensor2 = new BoundaryComponent('TempSensor2', 50, 250);
const interfaceComp = new BoundaryComponent('Interface', 50, 450);
const controller = new ControllerComponent('Controller', 600, 200);
const heater = new ActuatorComponent('Heater', 300, 50);
const cooler = new ActuatorComponent('Cooler', 300, 450);

// Criação das portas
const sensor1Out = new OutputPort('Sensor1Out', 200, 100, null);
const sensor2Out = new OutputPort('Sensor2Out', 200, 300, null);
const desiredTempOut = new OutputPort('DesiredTempOut', 200, 500, null);
const sensor1In = new InputPort('Sensor1In', 600, 200, controller);
const sensor2In = new InputPort('Sensor2In', 600, 250, controller);
const desiredTempIn = new InputPort('DesiredTempIn', 600, 300, controller);
const heaterOut = new OutputPort('HeaterOut', 750, 150, null);
const coolerOut = new OutputPort('CoolerOut', 750, 350, null);
const heaterIn = new InputPort('HeaterIn', 300, 100, heater);
const coolerIn = new InputPort('CoolerIn', 300, 500, cooler);

// Criação dos conectores
const sensor1ToController = new Connector('Sensor1ToController', sensor1Out, sensor1In);
const sensor2ToController = new Connector('Sensor2ToController', sensor2Out, sensor2In);
const interfaceToController = new Connector('InterfaceToController', desiredTempOut, desiredTempIn);
const controllerToHeater = new Connector('ControllerToHeater', heaterOut, heaterIn);
const controllerToCooler = new Connector('ControllerToCooler', coolerOut, coolerIn);

// Associação de conectores às portas
sensor1Out.connector = sensor1ToController;
sensor2Out.connector = sensor2ToController;
desiredTempOut.connector = interfaceToController;
heaterOut.connector = controllerToHeater;
coolerOut.connector = controllerToCooler;

// Adição de portas aos componentes
tempSensor1.addPort(sensor1Out);
tempSensor2.addPort(sensor2Out);
interfaceComp.addPort(desiredTempOut);
controller.addPort(sensor1In);
controller.addPort(sensor2In);
controller.addPort(desiredTempIn);
controller.addPort(heaterOut);
controller.addPort(coolerOut);
heater.addPort(heaterIn);
cooler.addPort(coolerIn);

// Função para desenhar a arquitetura
function drawArchitecture() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  tempSensor1.draw(ctx);
  tempSensor2.draw(ctx);
  interfaceComp.draw(ctx);
  controller.draw(ctx);
  heater.draw(ctx);
  cooler.draw(ctx);

  // Desenha conectores
  ctx.beginPath();
  ctx.moveTo(sensor1Out.x, sensor1Out.y);
  ctx.lineTo(sensor1In.x, sensor1In.y);
  ctx.strokeStyle = 'black';
  ctx.stroke();
  ctx.fillText('Sensor1ToController', (sensor1Out.x + sensor1In.x) / 2, (sensor1Out.y + sensor1In.y) / 2);

  ctx.beginPath();
  ctx.moveTo(sensor2Out.x, sensor2Out.y);
  ctx.lineTo(sensor2In.x, sensor2In.y);
  ctx.stroke();
  ctx.fillText('Sensor2ToController', (sensor2Out.x + sensor2In.x) / 2, (sensor2Out.y + sensor2In.y) / 2);

  ctx.beginPath();
  ctx.moveTo(desiredTempOut.x, desiredTempOut.y);
  ctx.lineTo(desiredTempIn.x, desiredTempIn.y);
  ctx.stroke();
  ctx.fillText('InterfaceToController', (desiredTempOut.x + desiredTempIn.x) / 2, (desiredTempOut.y + desiredTempIn.y) / 2);

  ctx.beginPath();
  ctx.moveTo(heaterOut.x, heaterOut.y);
  ctx.lineTo(heaterIn.x, heaterIn.y);
  ctx.stroke();
  ctx.fillText('ControllerToHeater', (heaterOut.x + heaterIn.x) / 2, (heaterOut.y + heaterIn.y) / 2);

  ctx.beginPath();
  ctx.moveTo(coolerOut.x, coolerOut.y);
  ctx.lineTo(coolerIn.x, coolerIn.y);
  ctx.stroke();
  ctx.fillText('ControllerToCooler', (coolerOut.x + coolerIn.x) / 2, (coolerOut.y + coolerIn.y) / 2);
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
    ctx.fillText(`${data}`, x + 10, y);
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
function startSensor1() {
  const temp = parseFloat(document.getElementById('sensor1Temp').value);
  tempSensor1.startSending(temp);
}

function pauseSensor1() {
  tempSensor1.pauseSending();
}

function startSensor2() {
  const temp = parseFloat(document.getElementById('sensor2Temp').value);
  tempSensor2.startSending(temp);
}

function pauseSensor2() {
  tempSensor2.pauseSending();
}

function sendDesiredTemp() {
  const temp = parseFloat(document.getElementById('desiredTemp').value);
  interfaceComp.sendData(temp);
}

// Inicializa a visualização
drawArchitecture();
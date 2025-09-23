// Visualização interativa para Simple.sysadl usando p5.js

let system;
let flowAnimation = [];
let outputDiv;
const componentPositions = {
    's1': { x: 50, y: 50 },
    's2': { x: 50, y: 250 },
    'TempMonitorCP': { x: 350, y: 100 },
    'StdOutCP': { x: 650, y: 150 }
};

// Função para iniciar a simulação com valores dos inputs
async function simulate() {
    const temp1 = parseFloat(document.getElementById('temp1').value) || 77.0;
    const temp2 = parseFloat(document.getElementById('temp2').value) || 77.0;
    outputDiv.innerHTML = 'Simulando...';

    const s1Port = system.subComponents.get('s1').ports.find(p => p.name === 'temp1');
    const s2Port = system.subComponents.get('s2').ports.find(p => p.name === 'temp2');

    if (!s1Port || !s2Port) {
        console.error('Erro: Portas s1.temp1 ou s2.temp2 não encontradas');
        outputDiv.innerHTML = 'Erro: Portas dos sensores não encontradas';
        return;
    }

    system.subComponents.get('s1').simulateInput = async function() {
        console.log(`Simulando entrada para s1.temp1: ${temp1}`);
        await s1Port.send(temp1);
    };
    system.subComponents.get('s2').simulateInput = async function() {
        console.log(`Simulando entrada para s2.temp2: ${temp2}`);
        await s2Port.send(temp2);
    };

    const stdOut = system.subComponents.get('stdOut');
    const originalOnDataReceived = stdOut.onDataReceived;
    stdOut.onDataReceived = async function(portName, data) {
        await originalOnDataReceived.call(this, portName, data);
        outputDiv.innerHTML = `Temperatura Média: ${data.toFixed(2)}°C`;
    };

    await system.start();
}

// Configuração do p5.js
function setup() {
    createCanvas(900, 700);
    textFont('Arial');
    textSize(14);
    outputDiv = document.getElementById('output');

    system = new SystemCP();
    system.configureBindings();

    for (const [name, connector] of system.connectors) {
        const originalTransmit = connector.transmit;
        connector.transmit = async function(data) {
            if (!this.sourcePort || !this.targetPort) {
                console.error(`Erro: Conector ${this.name} não tem sourcePort ou targetPort configurados`);
                return;
            }
            const start = getPortPosition(this.sourcePort);
            const end = getPortPosition(this.targetPort);
            if (start.x === 0 && start.y === 0 || end.x === 0 && end.y === 0) {
                console.warn(`Coordenadas inválidas para conector ${this.name}: start=${JSON.stringify(start)}, end=${JSON.stringify(end)}`);
                return;
            }
            flowAnimation.push({ startX: start.x, startY: start.y, endX: end.x, endY: end.y, progress: 0, data });
            await originalTransmit.call(this, data);
        };
    }
}

function draw() {
    background(245, 245, 245);

    drawComponent(system.subComponents.get('s1'), 50, 50, 'SensorCP (s1)');
    drawComponent(system.subComponents.get('s2'), 50, 250, 'SensorCP (s2)');
    drawComponent(system.subComponents.get('tempMon'), 350, 100, 'TempMonitorCP');
    drawComponent(system.subComponents.get('stdOut'), 650, 150, 'StdOutCP');

    // Desenha conectores
    for (const [name, connector] of system.connectors) {
        if (connector.sourcePort && connector.targetPort) {
            const start = getPortPosition(connector.sourcePort);
            const end = getPortPosition(connector.targetPort);
            if (start.x === 0 && start.y === 0 || end.x === 0 && end.y === 0) {
                console.warn(`Ignorando conector ${name}: start=${JSON.stringify(start)}, end=${JSON.stringify(end)}`);
                continue;
            }
            stroke(100, 100, 100);
            strokeWeight(5);
            line(start.x, start.y, end.x, end.y);
            fill(100, 100, 100);
            rect(start.x - 5, start.y - 5, 10, 10, 2);
            rect(end.x - 5, end.y - 5, 10, 10, 2);
            noStroke();
            fill(0);
            textSize(14);
            textAlign(CENTER);
            text(name, (start.x + end.x) / 2, (start.y + end.y) / 2 - 15);
        }
    }

    // Desenha bindings
    for (const binding of system.bindings) {
        if (binding.sourcePort && binding.targetPort) {
            const start = getPortPosition(binding.sourcePort);
            const end = getPortPosition(binding.targetPort);
            if (start.x === 0 && start.y === 0 || end.x === 0 && end.y === 0) {
                console.warn(`Ignorando binding: start=${JSON.stringify(start)}, end=${JSON.stringify(end)}`);
                continue;
            }
            drawingContext.setLineDash([5, 5]);
            stroke(0, 120, 255);
            strokeWeight(3);
            line(start.x, start.y, end.x, end.y);
            drawingContext.setLineDash([]);
        }
    }

    // Desenha animação de fluxo
    for (let i = flowAnimation.length - 1; i >= 0; i--) {
        const anim = flowAnimation[i];
        anim.progress += 0.008;
        if (anim.progress >= 1) {
            flowAnimation.splice(i, 1);
            continue;
        }
        const x = lerp(anim.startX, anim.endX, anim.progress);
        const y = lerp(anim.startY, anim.endY, anim.progress);
        drawingContext.setLineDash([3, 3]);
        stroke(0, 150, 255, 100);
        strokeWeight(2);
        line(anim.startX, anim.startY, anim.endX, anim.endY);
        drawingContext.setLineDash([]);
        noStroke();
        fill(0, 150, 255, 220);
        ellipse(x, y, 10, 10);
        fill(255);
        const textContent = `${anim.data.toFixed(2)}`;
        rect(x + 8, y - 10, textWidth(textContent) + 4, 16, 2);
        fill(0);
        textSize(12);
        textAlign(LEFT);
        text(textContent, x + 10, y + 5);
    }

    drawLegend();
}

// Função para desenhar um componente
function drawComponent(component, x, y, label) {
    if (!component) return;

    drawingContext.shadowOffsetX = 4;
    drawingContext.shadowOffsetY = 4;
    drawingContext.shadowBlur = 8;
    drawingContext.shadowColor = 'rgba(0, 0, 0, 0.3)';
    fill(180, 200, 255);
    stroke(0);
    strokeWeight(1);
    rect(x, y, 150, 120, 10);
    drawingContext.shadowOffsetX = 0;
    drawingContext.shadowOffsetY = 0;
    drawingContext.shadowBlur = 0;

    noStroke();
    fill(0);
    textSize(16);
    textAlign(CENTER);
    text(label, x + 75, y + 25);

    for (const port of component.ports) {
        const pos = getPortPosition(port);
        fill(port.direction === 'out' ? 'green' : port.direction === 'in' ? 'blue' : 'purple');
        stroke(0);
        strokeWeight(1);
        ellipse(pos.x, pos.y, 12, 12);
        noStroke();
        fill(255);
        const textContent = `${port.name} (${port.value !== null ? port.value.toFixed(2) : 'null'})`;
        rect(pos.x + 8, pos.y - 10, textWidth(textContent) + 4, 16, 2);
        fill(0);
        textSize(14);
        textAlign(LEFT);
        text(textContent, pos.x + 10, pos.y + 5);
    }
}

// Função para obter a posição de uma porta
function getPortPosition(port) {
    if (!port || !port.component) {
        console.warn(`Porta inválida ou sem componente: ${port?.name}`);
        return { x: 0, y: 0 };
    }

    const componentName = port.component.name;
    const pos = componentPositions[componentName] || { x: 0, y: 0 };
    console.log(`Calculando posição para porta ${port.name} no componente ${componentName} com baseX=${pos.x}, baseY=${pos.y}`);

    if (componentName === 's1') {
        if (port.name === 'temp1') {
            console.log(`Coordenadas para ${port.name} em ${componentName}: x=${pos.x + 150}, y=${pos.y + 60}`);
            return { x: pos.x + 150, y: pos.y + 60 }; // Saída à direita
        }
    } else if (componentName === 's2') {
        if (port.name === 'temp2') {
            console.log(`Coordenadas para ${port.name} em ${componentName}: x=${pos.x + 150}, y=${pos.y + 60}`);
            return { x: pos.x + 150, y: pos.y + 60 }; // Saída à direita
        }
    } else if (componentName === 'TempMonitorCP') {
        if (port.name === 's1') {
            console.log(`Coordenadas para ${port.name} em ${componentName}: x=${pos.x}, y=${pos.y + 40}`);
            return { x: pos.x, y: pos.y + 40 }; // Entrada à esquerda
        } else if (port.name === 's2') {
            console.log(`Coordenadas para ${port.name} em ${componentName}: x=${pos.x}, y=${pos.y + 80}`);
            return { x: pos.x, y: pos.y + 80 }; // Entrada à esquerda
        } else if (port.name === 'average') {
            console.log(`Coordenadas para ${port.name} em ${componentName}: x=${pos.x + 150}, y=${pos.y + 60}`);
            return { x: pos.x + 150, y: pos.y + 60 }; // Saída à direita
        }
    } else if (componentName === 'StdOutCP') {
        if (port.name === 'avg') {
            console.log(`Coordenadas para ${port.name} em ${componentName}: x=${pos.x}, y=${pos.y + 60}`);
            return { x: pos.x, y: pos.y + 60 }; // Entrada à esquerda
        }
    }

    console.warn(`Coordenadas não encontradas para porta ${port.name} no componente ${componentName}`);
    return { x: pos.x, y: pos.y };
}

// Função para desenhar uma legenda
function drawLegend() {
    const legendX = 20;
    const legendY = 600;
    fill(255);
    stroke(0);
    strokeWeight(1);
    rect(legendX, legendY, 250, 100, 10);
    noStroke();
    fill(0);
    textSize(14);
    textAlign(LEFT);
    text('Legenda:', legendX + 10, legendY + 20);
    fill('green');
    ellipse(legendX + 10, legendY + 40, 10, 10);
    fill(0);
    text('Porta de Saída', legendX + 25, legendY + 45);
    fill('blue');
    ellipse(legendX + 10, legendY + 60, 10, 10);
    fill(0);
    text('Porta de Entrada', legendX + 25, legendY + 65);
    fill('purple');
    ellipse(legendX + 10, legendY + 80, 10, 10);
    fill(0);
    text('Porta Inout', legendX + 25, legendY + 85);
}
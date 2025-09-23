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

    const s1 = system.subComponents.get('s1');
    const s2 = system.subComponents.get('s2');
    const s1Port = s1.ports.find(p => p.name === 'temp1');
    const s2Port = s2.ports.find(p => p.name === 'temp2');

    if (!s1Port || !s2Port) {
        console.error('Erro: Portas s1.temp1 ou s2.temp2 não encontradas');
        outputDiv.innerHTML = 'Erro: Portas dos sensores não encontradas';
        return;
    }

    console.log(`Iniciando simulação com temp1=${temp1}, temp2=${temp2}`);
    await s1.simulateInput(temp1); // Chama o método existente
    await s2.simulateInput(temp2); // Chama o método existente

    const stdOut = system.subComponents.get('stdOut');
    const originalOnDataReceived = stdOut.onDataReceived;
    stdOut.onDataReceived = async function(portName, data) {
        console.log(`StdOutCP atualizando saída com ${data}`);
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
            console.log(`Conector ${this.name} transmitindo dados: ${data}`);
            if (!this.sourcePort || !this.targetPort) {
                console.error(`Erro: Conector ${this.name} não tem sourcePort ou targetPort configurados`);
                return;
            }
            const sourceComponent = system.subComponents.get(this.sourcePort.component?.name) || system.subComponents.get(this.sourcePort.name.split('.')[0]);
            const targetComponent = system.subComponents.get(this.targetPort.component?.name) || system.subComponents.get(this.targetPort.name.split('.')[0]);
            const start = getPortPosition(this.sourcePort, sourceComponent);
            const end = getPortPosition(this.targetPort, targetComponent);
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
    background(245, 245, 245); // Fundo cinza claro

    drawComponent(system.subComponents.get('s1'), 's1', 'SensorCP (s1)');
    drawComponent(system.subComponents.get('s2'), 's2', 'SensorCP (s2)');
    drawComponent(system.subComponents.get('tempMon'), 'TempMonitorCP', 'TempMonitorCP');
    drawComponent(system.subComponents.get('stdOut'), 'StdOutCP', 'StdOutCP');

    // Desenha conectores
    for (const [name, connector] of system.connectors) {
        if (connector.sourcePort && connector.targetPort) {
            const sourceComponent = system.subComponents.get(connector.sourcePort.component?.name) || system.subComponents.get(connector.sourcePort.name.split('.')[0]);
            const targetComponent = system.subComponents.get(connector.targetPort.component?.name) || system.subComponents.get(connector.targetPort.name.split('.')[0]);
            const start = getPortPosition(connector.sourcePort, sourceComponent);
            const end = getPortPosition(connector.targetPort, targetComponent);
            if (start.x === 0 && start.y === 0 || end.x === 0 && end.y === 0) {
                console.warn(`Ignorando conector ${name}: start=${JSON.stringify(start)}, end=${JSON.stringify(end)}`);
                continue;
            }
            stroke(70, 70, 70); // Cinza mais escuro
            strokeWeight(4);
            line(start.x, start.y, end.x, end.y);
            fill(70, 70, 70);
            rect(start.x - 6, start.y - 6, 12, 12, 3); // Extremidades "macho" maiores
            rect(end.x - 6, end.y - 6, 12, 12, 3);
            noStroke();
            fill(255);
            textSize(14);
            textAlign(CENTER);
            text(name, (start.x + end.x) / 2, (start.y + end.y) / 2 - 20);
        }
    }

    // Desenha bindings com estilo distinto
    for (const binding of system.bindings) {
        if (binding.sourcePort && binding.targetPort) {
            const start = getPortPosition(binding.sourcePort, binding.sourceComponent);
            const end = getPortPosition(binding.targetPort, binding.targetComponent);
            if (start.x === 0 && start.y === 0 || end.x === 0 && end.y === 0) {
                console.warn(`Ignorando binding: start=${JSON.stringify(start)}, end=${JSON.stringify(end)}`);
                continue;
            }
            drawingContext.setLineDash([4, 4]); // Pontilhado
            stroke(255, 165, 0); // Laranja
            strokeWeight(2);
            line(start.x, start.y, end.x, end.y);
            drawingContext.setLineDash([]);
            noStroke();
            fill(255, 165, 0, 150);
            ellipse(start.x, start.y, 8, 8);
            ellipse(end.x, end.y, 8, 8);
        }
    }

    // Desenha animação de fluxo
    for (let i = flowAnimation.length - 1; i >= 0; i--) {
        const anim = flowAnimation[i];
        anim.progress += 0.01; // Animação mais rápida
        if (anim.progress >= 1) {
            flowAnimation.splice(i, 1);
            continue;
        }
        const x = lerp(anim.startX, anim.endX, anim.progress);
        const y = lerp(anim.startY, anim.endY, anim.progress);
        drawingContext.setLineDash([4, 4]);
        stroke(0, 120, 240, 120); // Azul vibrante com transparência
        strokeWeight(2);
        line(anim.startX, anim.startY, anim.endX, anim.endY);
        drawingContext.setLineDash([]);
        noStroke();
        fill(0, 120, 240, 200);
        ellipse(x, y, 12, 12); // Partícula maior
        fill(255);
        const textContent = `${anim.data.toFixed(2)}`;
        rect(x + 10, y - 12, textWidth(textContent) + 6, 18, 3);
        fill(0);
        textSize(12);
        textAlign(LEFT);
        text(textContent, x + 12, y + 4);
    }

    drawLegend();
}

// Função para desenhar um componente
function drawComponent(component, componentName, label) {
    if (!component) return;

    // Gradiente para o componente
    for (let i = 0; i < 150; i += 10) {
        let alpha = map(i, 0, 150, 200, 100);
        fill(180 + i / 3, 200 + i / 3, 255, alpha);
        noStroke();
        rect(componentPositions[componentName].x, componentPositions[componentName].y + i, 150, 10, 10);
    }
    stroke(0);
    strokeWeight(1);
    fill(180, 200, 255, 200);
    rect(componentPositions[componentName].x, componentPositions[componentName].y, 150, 120, 10);

    noStroke();
    fill(50); // Texto mais escuro para contraste
    textSize(16);
    textAlign(CENTER);
    text(label, componentPositions[componentName].x + 75, componentPositions[componentName].y + 25);

    for (const port of component.ports) {
        const pos = getPortPosition(port, component);
        let portColor;
        if (port.direction === 'out') {
            portColor = color(0, 180, 0); // Verde vibrante
            drawingContext.shadowColor = 'rgba(0, 180, 0, 0.5)';
        } else if (port.direction === 'in') {
            portColor = color(0, 0, 180); // Azul vibrante
            drawingContext.shadowColor = 'rgba(0, 0, 180, 0.5)';
        } else {
            portColor = color(150, 0, 150); // Roxo rico
            drawingContext.shadowColor = 'rgba(150, 0, 150, 0.5)';
        }
        drawingContext.shadowBlur = 5;
        drawingContext.shadowOffsetX = 2;
        drawingContext.shadowOffsetY = 2;
        fill(portColor);
        stroke(255);
        strokeWeight(2);
        ellipse(pos.x, pos.y, 15, 15); // Porta maior com borda branca
        drawingContext.shadowBlur = 0;
        drawingContext.shadowOffsetX = 0;
        drawingContext.shadowOffsetY = 0;

        noStroke();
        fill(255);
        const textContent = `${port.name} (${port.value !== null ? port.value.toFixed(2) : 'null'})`;
        rect(pos.x + 10, pos.y - 12, textWidth(textContent) + 6, 18, 3);
        fill(50);
        textSize(12);
        textAlign(LEFT);
        text(textContent, pos.x + 12, pos.y + 4);
    }
}

// Função para obter a posição de uma porta
function getPortPosition(port, component) {
    if (!port || !component) {
        console.warn(`Porta ou componente inválido: ${port?.name}, component=${component?.name}`);
        return { x: 0, y: 0 };
    }

    const componentName = component.name;
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
    rect(legendX, legendY, 280, 120, 10);
    noStroke();
    fill(50);
    textSize(14);
    textAlign(LEFT);
    text('Legenda:', legendX + 10, legendY + 20);
    fill(0, 180, 0);
    ellipse(legendX + 10, legendY + 40, 12, 12);
    fill(50);
    text('Porta de Saída', legendX + 25, legendY + 45);
    fill(0, 0, 180);
    ellipse(legendX + 10, legendY + 60, 12, 12);
    fill(50);
    text('Porta de Entrada', legendX + 25, legendY + 65);
    fill(150, 0, 150);
    ellipse(legendX + 10, legendY + 80, 12, 12);
    fill(50);
    text('Porta Inout', legendX + 25, legendY + 85);
    drawingContext.setLineDash([4, 4]);
    stroke(255, 165, 0);
    strokeWeight(2);
    line(legendX + 10, legendY + 100, legendX + 20, legendY + 100);
    drawingContext.setLineDash([]);
    noStroke();
    fill(255, 165, 0, 150);
    ellipse(legendX + 10, legendY + 100, 8, 8);
    ellipse(legendX + 20, legendY + 100, 8, 8);
    fill(50);
    text('Binding', legendX + 35, legendY + 105);
}
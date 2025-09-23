/* visualizer.js
   - Gera e renderiza diagramas usando D3.js
   - Suporta Simple.sysadl, RTC.sysadl, AGV.sysadl
   - Suporta animação destacando portas ativas
*/

// @ts-nocheck

function generateD3Diagram(model, activePort = null) {
    const width = 1000;
    const height = 600;

    // Limpar diagrama anterior
    const diagram = document.getElementById('diagram');
    diagram.innerHTML = '';

    // Criar SVG
    const svg = d3.select('#diagram')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .style('border', '1px solid #ccc');

    // Definir dados para nós e arestas
    const nodes = [];
    const links = [];

    // Adicionar componente composto principal
    const compositeComp = model.components.find(c => c.configuration);
    if (compositeComp) {
        nodes.push({ id: compositeComp.name, label: `${compositeComp.name} (Composite)`, type: 'component' });
    }

    // Adicionar subcomponentes e portas
    if (compositeComp?.configuration?.components) {
        compositeComp.configuration.components.forEach(sub => {
            const compDef = model.components.find(c => c.name === sub.type);
            nodes.push({ id: sub.name, label: `${sub.name} : ${sub.type}${compDef?.isBoundary ? ' (Boundary)' : ''}`, type: 'subcomponent', parent: compositeComp.name });
            sub.portAliases.forEach(p => {
                const direction = model.ports.find(mp => mp.name === p.type)?.flows[0]?.direction || 'inout';
                nodes.push({ id: `${sub.name}_${p.alias}`, label: `${p.alias} (${direction})`, type: 'port', parent: sub.name, direction });
            });
        });
    }

    // Adicionar conexões via bindings
    if (compositeComp?.configuration?.bindings) {
        compositeComp.configuration.bindings.forEach(b => {
            const sourceParts = b.source.split('.');
            const targetParts = b.target.split('.');
            const sourceId = sourceParts.length === 2 ? `${sourceParts[0]}_${sourceParts[1]}` : `${compositeComp.name}_${b.source}`;
            const targetId = targetParts.length === 2 ? `${targetParts[0]}_${targetParts[1]}` : `${compositeComp.name}_${b.target}`;
            links.push({ source: sourceId, target: targetId, label: b.connector });
        });
    }

    // Configurar simulação de força
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(150))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(60));

    // Desenhar arestas
    const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', '#999')
        .attr('stroke-width', 2);

    // Adicionar rótulos nas arestas
    const linkLabel = svg.append('g')
        .selectAll('text')
        .data(links)
        .enter()
        .append('text')
        .text(d => d.label)
        .attr('font-size', '10px')
        .attr('fill', '#f8f8f2');

    // Desenhar nós
    const node = svg.append('g')
        .selectAll('g')
        .data(nodes)
        .enter()
        .append('g');

    // Adicionar formas e cores
    node.append('rect')
        .attr('width', d => d.type === 'port' ? 80 : 120)
        .attr('height', 30)
        .attr('rx', 5)
        .attr('ry', 5)
        .attr('fill', d => {
            if (d.type === 'port') {
                if (activePort && d.id === `${activePort.component}_${activePort.port}`) return '#ffff00';
                return d.direction === 'in' ? '#00ff00' : d.direction === 'out' ? '#ff0000' : '#cccccc';
            }
            return d.type === 'component' ? '#add8e6' : '#90ee90';
        })
        .attr('stroke', '#333')
        .attr('stroke-width', 2);

    // Adicionar rótulos nos nós
    node.append('text')
        .attr('dy', 20)
        .attr('dx', d => d.type === 'port' ? 40 : 60)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#f8f8f2')
        .text(d => d.label);

    // Atualizar posições na simulação
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        linkLabel
            .attr('x', d => (d.source.x + d.target.x) / 2)
            .attr('y', d => (d.source.y + d.target.y) / 2);

        node
            .attr('transform', d => `translate(${d.x - (d.type === 'port' ? 40 : 60)}, ${d.y - 15})`);
    });

    console.log('Diagrama D3 gerado:', { nodes, links });
}

function visualizeDiagram(model) {
    if (!model) {
        document.getElementById('diagram').innerHTML = '<p>Nenhum modelo para visualizar.</p>';
        document.getElementById('simulationStatus').innerHTML = 'Nenhum modelo carregado.';
        return;
    }

    if (!model.components || !model.components.length) {
        document.getElementById('diagram').innerHTML = '<p>Nenhum componente para visualizar.</p>';
        document.getElementById('simulationStatus').innerHTML = 'Nenhum componente encontrado.';
        return;
    }

    try {
        generateD3Diagram(model);
        document.getElementById('simulationStatus').innerHTML = 'Diagrama renderizado com sucesso.';
    } catch (err) {
        console.error('Erro ao renderizar diagrama:', err);
        document.getElementById('diagram').innerHTML = `<p>Erro ao renderizar diagrama: ${err.message}</p>`;
        document.getElementById('simulationStatus').innerHTML = `Erro ao renderizar diagrama: ${err.message}`;
    }
}

function updateDiagramForSimulation(model, activePort) {
    if (!model || !activePort) return;
    try {
        generateD3Diagram(model, activePort);
        document.getElementById('simulationStatus').innerHTML = `Porta ativa: ${activePort.component}.${activePort.port}`;
    } catch (err) {
        console.error('Erro ao atualizar diagrama:', err);
        document.getElementById('diagram').innerHTML = `<p>Erro ao atualizar diagrama: ${err.message}</p>`;
        document.getElementById('simulationStatus').innerHTML = `Erro ao atualizar diagrama: ${err.message}`;
    }
}

if (typeof window !== 'undefined') {
    window.visualizeDiagram = visualizeDiagram;
    window.updateDiagramForSimulation = updateDiagramForSimulation;
}
class SysADLVisualizer {
    constructor(model, diagramElementId = "diagram") {
        this.model = model;
        this.diagramElementId = diagramElementId;
        this.activeFlows = new Set();
        this.activePorts = new Map();
        this.eventEmitter = { listeners: {} };
        this.initializeEventListeners();
    }

    on(event, callback) {
        if (!this.eventEmitter.listeners[event]) {
            this.eventEmitter.listeners[event] = [];
        }
        this.eventEmitter.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.eventEmitter.listeners[event]) {
            this.eventEmitter.listeners[event].forEach(callback => callback(data));
        }
    }

    initializeEventListeners() {
        this.on("flowPropagated", ({ source, target, data }) => {
            this.activeFlows.add(`${source}-->${target}`);
            this.activePorts.set(source, data);
            this.activePorts.set(target, data);
            setTimeout(() => this.renderDiagram(), 500); // Delay para animação
        });

        this.on("portUpdated", ({ port, value }) => {
            this.activePorts.set(port, value);
            setTimeout(() => this.renderDiagram(), 500);
        });

        this.on("simulationStart", () => {
            this.activeFlows.clear();
            this.activePorts.clear();
            this.renderDiagram();
        });

        this.on("simulationEnd", () => {
            this.renderDiagram();
        });
    }

    generateMermaidCode() {
        let mermaidCode = "graph TD\n";
        const styles = [];
        const configComponents = new Set(this.model.configurations.flatMap(c => c.components.map(comp => comp.name)));

        // Adicionar apenas componentes instanciados na configuração
        Object.values(this.model.components).forEach(comp => {
            if (configComponents.has(comp.qualifiedName)) {
                mermaidCode += `    ${comp.qualifiedName}[${comp.qualifiedName}];\n`;
                comp.ports.forEach(port => {
                    const portId = `${comp.qualifiedName}.${port.name}`;
                    mermaidCode += `    ${portId}((${port.name} : ${port.type})) --> ${comp.qualifiedName};\n`;
                    if (this.activePorts.has(portId)) {
                        styles.push(`style ${portId} fill:#87CEEB,stroke:#000;`);
                    }
                });
            }
        });

        // Adicionar apenas conectores (sem fluxos diretos)
        Object.values(this.model.connectors).forEach(conn => {
            if (conn.ports.length === 2) {
                const [source, target] = conn.ports;
                const flowId = `${source}-->${target}`;
                mermaidCode += `    ${source} -->|${conn.qualifiedName}| ${target};\n`;
                if (this.activeFlows.has(flowId)) {
                    styles.push(`style ${source} stroke:#32CD32,stroke-width:2px;`);
                    styles.push(`style ${target} stroke:#32CD32,stroke-width:2px;`);
                }
            }
        });

        mermaidCode += styles.join("\n") + "\n";
        return mermaidCode;
    }

    async renderDiagram() {
        const diagramDiv = document.getElementById(this.diagramElementId);
        if (!diagramDiv) {
            console.error(`Diagram element with ID ${this.diagramElementId} not found`);
            return;
        }
        const mermaidCode = this.generateMermaidCode();
        try {
            const { svg } = await mermaid.render('mermaid-diagram', mermaidCode);
            diagramDiv.innerHTML = svg;
        } catch (e) {
            console.error("Mermaid rendering error:", e);
            diagramDiv.innerText = "Error rendering diagram: " + e.message;
        }
    }

    initialize() {
        this.renderDiagram();
        this.emit("simulationStart", {});
    }
}

const visualizer = new SysADLVisualizer(sysadlModel, "diagram");
visualizer.initialize();
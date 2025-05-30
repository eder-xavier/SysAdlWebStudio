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
            this.renderDiagram();
        });

        this.on("portUpdated", ({ port, value }) => {
            this.activePorts.set(port, value);
            this.renderDiagram();
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

        // Adicionar componentes e portas
        Object.values(this.model.components).forEach(comp => {
            mermaidCode += `    ${comp.qualifiedName}[${comp.qualifiedName}];\n`;
            comp.ports.forEach(port => {
                const portId = `${comp.qualifiedName}.${port.name}`;
                mermaidCode += `    ${portId}((${port.name} : ${port.type})) --> ${comp.qualifiedName};\n`;
                if (this.activePorts.has(portId)) {
                    styles.push(`style ${portId} fill:#87CEEB,stroke:#000;`);
                }
            });
        });

        // Adicionar conectores e fluxos
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

        // Adicionar fluxos diretos
        this.model.flows.forEach(flow => {
            const flowId = `${flow.source}-->${flow.target}`;
            mermaidCode += `    ${flow.source} --> ${flow.target};\n`;
            if (this.activeFlows.has(flowId)) {
                styles.push(`style ${flow.source} stroke:#32CD32,stroke-width:2px;`);
                styles.push(`style ${flow.target} stroke:#32CD32,stroke-width:2px;`);
            }
        });

        // Adicionar estilos
        mermaidCode += styles.join("\n") + "\n";

        return mermaidCode;
    }

    renderDiagram() {
        const diagramDiv = document.getElementById(this.diagramElementId);
        if (!diagramDiv) {
            console.error(`Diagram element with ID ${this.diagramElementId} not found`);
            return;
        }
        const mermaidCode = this.generateMermaidCode();
        diagramDiv.innerHTML = `<div class="mermaid">${mermaidCode}</div>`;
        mermaid.init(undefined, diagramDiv);
    }

    initialize() {
        this.renderDiagram();
        this.emit("simulationStart", {});
    }
}

const visualizer = new SysADLVisualizer(sysadlModel, "diagram");
visualizer.initialize();
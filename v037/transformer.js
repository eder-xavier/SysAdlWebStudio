// transformer_fixed.js
// @ts-nocheck
// Transformer: gera JS no estilo do "simple.js ideal" de forma genérica.
// Expondo window.transformToJavaScript() que usa window.parseSysADL()

(function(){
function sanitize(name){ if(!name) return '_'; return String(name).replace(/[^a-zA-Z0-9_$]/g,'_').replace(/^[0-9]/,m=>'_'+m); }
function indent(n){ return '    '.repeat(n); }

function transformToJavaScript(){
    try{
        const content = (typeof sysadlEditor !== 'undefined') ? sysadlEditor.getValue() : (typeof window !== 'undefined' && window._lastSysadlText) || '';
        const model = (typeof parseSysADL === 'function') ? parseSysADL(content) : { name:'SysADLModel', components:[] };
        const arch = generateArchitectureCode(model);
        const sim = generateSimulationCode(model);
        if(typeof archEditor !== 'undefined') archEditor.setValue(arch);
        if(typeof simEditor !== 'undefined') simEditor.setValue(sim);
        const name = (model.name||'model').toLowerCase();
        window.currentArchitectureCode = { code: arch, filename: `${name}.js` };
        window.currentSimulationCode   = { code: sim, filename: `simulate_${name}.js` };
        if(document && document.getElementById){
            const a = document.getElementById('downloadArchBtn'); if(a) a.disabled = false;
            const b = document.getElementById('downloadSimBtn'); if(b) b.disabled = false;
        }
    } catch(e){
        console.error('transform error', e);
        if(typeof archEditor !== 'undefined') archEditor.setValue(`// Error: ${e.message}\n${e.stack}`);
    }
}

function generateArchitectureCode(model){
    const out = [];
    out.push('// @ts-nocheck');
    out.push(`// Generated JavaScript code for SysADL Model: ${model.name || 'SysADLModel'}`);
    out.push('');
    out.push('let system = null;');
    out.push('');
    // Types header - include common core types
    out.push('// Types');
    const common = ['Real','Int','Boolean','String','Void'];
    const present = (model.types||[]).map(t=>t.name);
    common.forEach(t=>{ if(!present.includes(t)) out.push(`const ${t} = 'any';`); });
    (model.types||[]).forEach(t=> out.push(`const ${sanitize(t.name)} = 'any';`));
    out.push('');

    // Base classes (detailed, with logs)
    out.push(getBaseClasses());
    out.push('');

    // Component classes: generate each component type class
    out.push('// Component Classes');
    (model.components||[]).forEach(comp=>{
        out.push(generateComponentClass(comp, model));
        out.push('');
    });

    // Connector classes
    out.push('// Connector Classes');
    (model.connectors||[]).forEach(conn=>{
        out.push(generateConnectorClass(conn, model));
    });
    out.push('');

    // Executables
    out.push('// Executables');
    (model.executables||[]).forEach(exec=>{
        out.push(generateExecutableFunction(exec));
        out.push('');
    });

    // Constraints
    out.push('// Constraints');
    (model.constraints||[]).forEach(cons=>{
        out.push(generateConstraintFunction(cons));
        out.push('');
    });

    // System builder: prefer component with "system" in name (case-insensitive)
    out.push('// System Builder');
    out.push(generateSystemBuilder(model));
    out.push('');

    return out.join('\n');
}

function getBaseClasses(){
    return `class SysADLPort {
    constructor(name, flowType, direction = 'inout') {
        console.log(\`Initializing port \${name} with flowType \${flowType}, direction \${direction}\`);
        this.name = name;
        this.flowType = flowType || 'any';
        this.direction = direction;
        this.value = null;
        this.bindings = [];
        this.onDataReceivedCallback = null;
    }
    addBinding(binding) {
        this.bindings.push(binding);
        console.log(\`Binding added to port \${this.name}: \${binding.sourceComponent?.name || 'undefined'}.\${binding.sourcePort?.name || 'undefined'} -> \${binding.targetComponent?.name || 'undefined'}.\${binding.targetPort?.name || 'undefined'}\`);
    }
    setOnDataReceivedCallback(cb) { this.onDataReceivedCallback = cb; }
    async send(data) {
        console.log(\`Port \${this.name} sending data: \${JSON.stringify(data)}\`);
        if(this.direction !== 'out' && this.direction !== 'inout') {
            console.error(\`Cannot send via \${this.name}: invalid direction (\${this.direction})\`);
            return false;
        }
        if(this.bindings.length === 0) {
            console.warn(\`No bindings associated with \${this.name}; data not sent\`);
            return false;
        }
        this.value = data;
        for(const b of this.bindings) {
            console.log(\`Propagating data \${JSON.stringify(data)} via binding to \${b.targetPort?.name}\`);
            await b.connector.transmit(data);
        }
        return true;
    }
    async receive(data) {
        console.log(\`Port \${this.name} receiving data: \${JSON.stringify(data)}\`);
        if(this.direction !== 'in' && this.direction !== 'inout') {
            console.error(\`Cannot receive via \${this.name}: invalid direction (\${this.direction})\`);
            return false;
        }
        this.value = data;
        if(this.onDataReceivedCallback) {
            await this.onDataReceivedCallback(this.name, data);
        } else {
            console.warn(\`No onDataReceived callback defined for port \${this.name}\`);
        }
        return true;
    }
    getValue(){ return this.value; }
}

class SysADLConnector {
    constructor(name, sourcePort = null, targetPort = null, transformFn = null, constraintFn = null) {
        console.log(\`Initializing connector \${name}\`);
        this.name = name;
        this.sourcePort = sourcePort;
        this.targetPort = targetPort;
        this.transformFn = transformFn;
        this.constraintFn = constraintFn;
        this.messageQueue = [];
        this.isProcessing = false;
    }
    setPorts(sourcePort, targetPort) {
        this.sourcePort = sourcePort;
        this.targetPort = targetPort;
        console.log(\`Connector \${this.name} configured with sourcePort \${sourcePort?.name || 'undefined'} and targetPort \${targetPort?.name || 'undefined'}\`);
    }
    async transmit(data) {
        console.log(\`Connector \${this.name} transmitting data: \${JSON.stringify(data)}\`);
        if(!this.sourcePort || !this.targetPort) {
            console.error(\`Error: Connector \${this.name} does not have sourcePort or targetPort configured\`);
            return;
        }
        let transformed = this.transformFn ? await this.transformFn({ f: data }) : data;
        this.messageQueue.push(transformed);
        if(this.isProcessing) return;
        this.isProcessing = true;
        while(this.messageQueue.length > 0) {
            const cur = this.messageQueue.shift();
            console.log(\`Connector \${this.name} processing data: \${JSON.stringify(cur)}\`);
            if(this.constraintFn) {
                try {
                    await this.constraintFn({ input: data, output: cur });
                } catch(e) {
                    console.error(\`Constraint violated in connector \${this.name}: \${e.message}\`);
                    continue;
                }
            }
            await this.targetPort.receive(cur);
        }
        this.isProcessing = false;
    }
}

class Binding {
    constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {
        if(!sourceComponent || !sourcePort || !targetComponent || !targetPort || !connector) {
            console.error('Error creating binding: invalid parameters', {
                sourceComponent: sourceComponent?.name,
                sourcePort: sourcePort?.name,
                targetComponent: targetComponent?.name,
                targetPort: targetPort?.name,
                connector: connector?.name
            });
            throw new Error('Invalid binding parameters');
        }
        console.log(\`Creating binding from \${sourceComponent.name}.\${sourcePort.name} to \${targetComponent.name}.\${targetPort.name} via \${connector.name}\`);
        this.sourceComponent = sourceComponent;
        this.sourcePort = sourcePort;
        this.targetComponent = targetComponent;
        this.targetPort = targetPort;
        this.connector = connector;
        this.sourcePort.addBinding(this);
        this.connector.setPorts(this.sourcePort, this.targetPort);
    }
}

class SysADLComponent {
    constructor(name, isBoundary=false) {
        console.log(\`Initializing component \${name}, isBoundary: \${isBoundary}\`);
        this.name = name;
        this.isBoundary = !!isBoundary;
        this.ports = [];
        this.state = {};
        this.activities = [];
    }
    async addPort(port) {
        this.ports.push(port);
        port.setOnDataReceivedCallback((pname, data) => this.onDataReceived(pname, data));
        console.log(\`Port \${port.name} added to component \${this.name}, flowType: \${port.flowType}\`);
        this.state[port.name] = null;
    }
    async onDataReceived(portName, data) {
        console.log(\`Component \${this.name} received data on port \${portName}: \${JSON.stringify(data)}\`);
        this.state[portName] = data;
        for(const act of this.activities) {
            console.log(\`Triggering activity \${act.methodName} in component \${this.name}\`);
            if(typeof this[act.methodName] === 'function') await this[act.methodName]();
        }
    }
    async start() {
        console.log(\`Starting component \${this.name}\`);
    }
}
`;
}

function generateComponentClass(comp, model){
    const lines = [];
    const className = sanitize(comp.name);
    const isBoundary = comp.isBoundary ? 'true' : 'false';
    const hasConfig = !!comp.configuration;
    lines.push(`class ${className} extends SysADLComponent {`);
    // constructor signature: sensors get (name, portName)
    const ctorSig = /sensor/i.test(comp.name) ? `(name, portName)` : `()`;
    lines.push(`${indent(1)}constructor${ctorSig} {`);
    // super
    if(/sensor/i.test(comp.name)){
        lines.push(`${indent(2)}super(name, ${isBoundary});`);
    } else {
        lines.push(`${indent(2)}super(${JSON.stringify(comp.name)}, ${isBoundary});`);
    }
    if(hasConfig){
        lines.push(`${indent(2)}this.subComponents = new Map();`);
        lines.push(`${indent(2)}this.connectors = new Map();`);
        lines.push(`${indent(2)}this.bindings = [];`);
    } else {
        // add ports declared in component
        (comp.ports||[]).forEach(p=>{
            const portNameLiteral = /sensor/i.test(comp.name) ? 'portName' : JSON.stringify(p.name);
            const flowDef = (model.ports||[]).find(pp => pp.name === p.type);
            const dir = flowDef && flowDef.flows && flowDef.flows[0] ? flowDef.flows[0].direction : 'inout';
            lines.push(`${indent(2)}this.addPort(new SysADLPort(${portNameLiteral}, ${JSON.stringify(p.type)}, '${dir}'));`);
            lines.push(`${indent(2)}this.state[${portNameLiteral}] = null;`);
        });
    }

    // push activities allocated to this component type (allocations map activity -> component type)
    const allocatedActivityNames = (model.allocations||[]).filter(a=>a.type.toLowerCase()==='activity' && a.target === comp.name).map(a=>a.source);
    allocatedActivityNames.forEach(actName=>{
        const methodName = `execute_${sanitize(actName)}`;
        lines.push(`${indent(2)}this.activities.push({ methodName: '${methodName}' });`);
    });

    lines.push(`${indent(1)}}`); // end ctor

    // generate activity methods for activities that belong to this component type
    (model.activities||[]).filter(act => allocatedActivityNames.includes(act.name)).forEach(act=>{
        const methodName = `execute_${sanitize(act.name)}`;
        lines.push('');
        lines.push(`${indent(1)}async ${methodName}() {`);
        lines.push(`${indent(2)}console.log('Executing activity ${act.name} in component ${comp.name}');`);
        // build params from inParameters mapped to this.state
        const paramsList = (act.inParameters||[]).map(p => `${p.name}: this.state['${p.name}']`).join(', ');
        lines.push(`${indent(2)}const params = { ${paramsList} };`);
        // null checks
        if((act.inParameters||[]).length > 0){
            lines.push(`${indent(2)}console.log(\`Parameters received: \${JSON.stringify(params)}\`);`);
            const checks = (act.inParameters||[]).map(p=>`params.${p.name} === null`).join(' || ');
            lines.push(`${indent(2)}if(${checks}) {`);
            lines.push(`${indent(3)}console.warn('Input values are null, activity ${act.name} aborted');`);
            lines.push(`${indent(3)}return null;`);
            lines.push(`${indent(2)}}`);
        }
        // find action used by this activity (first action)
        const actionEntry = (act.actions && act.actions[0]) || null;
        if(actionEntry){
            // find executable allocated to this action (allocations: executable X to ActionName)
            const execAlloc = (model.allocations||[]).find(al => al.type.toLowerCase() === 'executable' && al.target === actionEntry.name);
            if(execAlloc){
                const execName = execAlloc.source;
                lines.push(`${indent(2)}const result = await ${execName}(params);`);
                // if action has constraint specified in top-level action definition, find it
                const actionDef = (model.actions||[]).find(a=>a.name === actionEntry.name);
                if(actionDef && actionDef.constraint){
                    lines.push(`${indent(2)}try {`);
                    lines.push(`${indent(3)}await validate${actionDef.constraint}({ ${ (act.inParameters||[]).map(p=>`${p.name}: params.${p.name}`).join(', ') }, ${ (act.outParameters && act.outParameters[0]) ? (act.outParameters[0].name + ': result') : 'output: result' } });`);
                    lines.push(`${indent(2)}} catch (e) {`);
                    lines.push(`${indent(3)}console.error(\`Constraint ${actionDef.constraint} violated: \${e.message}\`);`);
                    lines.push(`${indent(3)}return null;`);
                    lines.push(`${indent(2)}}`);
                }
                // write back to outParameter if present
                if(act.outParameters && act.outParameters[0]){
                    const outName = act.outParameters[0].name;
                    lines.push(`${indent(2)}this.state['${outName}'] = result;`);
                    lines.push(`${indent(2)}const ${outName}Port = this.ports.find(p => p.name === '${outName}');`);
                    lines.push(`${indent(2)}if(${outName}Port) {`);
                    lines.push(`${indent(3)}console.log(\`Sending ${outName} \${result} via port ${outName}\`);`);
                    lines.push(`${indent(3)}await ${outName}Port.send(result);`);
                    lines.push(`${indent(2)}}`);
                }
                lines.push(`${indent(2)}console.log(\`Activity ${act.name} returning: \${result}\`);`);
                lines.push(`${indent(2)}return result;`);
            } else {
                lines.push(`${indent(2)}// No executable allocated to action ${actionEntry.name}`);
                lines.push(`${indent(2)}return null;`);
            }
        } else {
            lines.push(`${indent(2)}// No action defined for activity ${act.name}`);
            lines.push(`${indent(2)}return null;`);
        }
        lines.push(`${indent(1)}}`);
    });

    // special override for StdOut-like components
    if(/stdout/i.test(comp.name) || /stdout/i.test(comp.name) || comp.name.toLowerCase().includes('stdout')){
        lines.push('');
        lines.push(`${indent(1)}async onDataReceived(portName, data) {`);
        lines.push(`${indent(2)}console.log(\`StdOutCP received data on port \${portName}: \${JSON.stringify(data)}\`);`);
        lines.push(`${indent(2)}this.state[portName] = data;`);
        lines.push(`${indent(2)}console.log(\`Average temperature displayed: \${data}\\u00B0C\`);`);
        lines.push(`${indent(1)}}`);
    }

    lines.push('}');
    return lines.join('\n');
}

function generateConnectorClass(conn, model){
    const name = conn.name || conn.type || 'Connector';
    // try to map transform/constraint by heuristics: find executable or constraint with similar name
    let transformFn = 'null', constraintFn = 'null';
    const execCandidate = (model.executables||[]).find(e => e.name && e.name.toLowerCase().includes((name||'').toLowerCase()));
    if(execCandidate) transformFn = execCandidate.name;
    const consCandidate = (model.constraints||[]).find(c => c.name && c.name.toLowerCase().includes((name||'').toLowerCase()));
    if(consCandidate) constraintFn = `validate${consCandidate.name}`;
    return `class ${sanitize(name)} extends SysADLConnector { constructor() { super(${JSON.stringify(name)}, null, null, ${transformFn}, ${constraintFn}); } }`;
}

function generateExecutableFunction(exec){
    if(!exec || !exec.name) return '';
    const name = exec.name;
    const params = (exec.inParameters||[]).map(p=>p.name);
    const lines = [];
    lines.push(`async function ${name}(params = {}) {`);
    lines.push(`${indent(1)}console.log(\`Executing ${name} with params: \${JSON.stringify(params)}\`);`);
    params.forEach(p => lines.push(`${indent(1)}const ${p} = params.${p} || 0.0;`));
    let body = exec.body || '';
    body = body.trim();
    if(!body) body = 'return null;';
    // ensure semicolon termination
    if(!/;\s*$/.test(body)) body = body + ';';
    // insert body lines with indentation
    body.split('\n').forEach(line => {
        lines.push(`${indent(1)}${line.trim()}`);
    });
    lines.push('}');
    return lines.join('\n');
}

function generateConstraintFunction(cons){
    if(!cons || !cons.name) return '';
    const name = cons.name;
    const inputs = (cons.inParameters||[]).map(p=>p.name);
    const out = (cons.outParameters && cons.outParameters[0]) ? cons.outParameters[0].name : 'output';
    const lines = [];
    lines.push(`async function validate${name}(params = {}) {`);
    lines.push(`${indent(1)}console.log(\`Evaluating constraint ${name}: ${cons.equation || ''}\`);`);
    inputs.forEach(p => lines.push(`${indent(1)}const ${p} = params.${p} || params.input || 0.0;`));
    lines.push(`${indent(1)}const ${out} = params.${out} || params.output || 0.0;`);
    const eq = (cons.equation||'true').replace(/==/g,'===');
    lines.push(`${indent(1)}const result = ${eq};`);
    lines.push(`${indent(1)}if(!result) { throw new Error('Constraint ${name} violated'); }`);
    lines.push(`${indent(1)}console.log('Constraint ${name} passed');`);
    lines.push(`${indent(1)}return result;`);
    lines.push('}');
    return lines.join('\n');
}

function generateSystemBuilder(model){
    // find a component whose name contains "system" or "SystemCP"
    const sysComp = (model.components||[]).find(c => /system/i.test(c.name)) || null;
    if(sysComp && sysComp.configuration){
        const className = sanitize(sysComp.name);
        const cfg = sysComp.configuration;
        const lines = [];
        lines.push(`class ${className} extends SysADLComponent {`);
        lines.push(`${indent(1)}constructor() {`);
        lines.push(`${indent(2)}super(${JSON.stringify(sysComp.name)}, false);`);
        lines.push(`${indent(2)}this.subComponents = new Map();`);
        lines.push(`${indent(2)}this.connectors = new Map();`);
        lines.push(`${indent(2)}this.bindings = [];`);
        // instantiate subcomponents
        (cfg.subComponents||[]).forEach(sub=>{
            const subClass = sanitize(sub.type);
            const needsPort = /sensor|sensorcp/i.test(sub.type);
            const alias = (sub.portAliases && sub.portAliases[0] && sub.portAliases[0].alias) ? sub.portAliases[0].alias : sub.name;
            if(needsPort){
                lines.push(`${indent(2)}this.addSubComponent('${sub.name}', new ${subClass}('${sub.name}', '${alias}'));`);
            } else {
                lines.push(`${indent(2)}this.addSubComponent('${sub.name}', new ${subClass}());`);
            }
        });
        // instantiate connectors
        (cfg.connectors||[]).forEach(conn=>{
            const connClass = sanitize(conn.type);
            lines.push(`${indent(2)}this.addConnector('${conn.name}', new ${connClass}());`);
        });
        // call configureBindings (we will generate it)
        lines.push(`${indent(2)}this.configureBindings();`);
        lines.push(`${indent(1)}}`); // end constructor

        // add helper methods
        lines.push('');
        lines.push(`${indent(1)}async addSubComponent(name, component) {`);
        lines.push(`${indent(2)}this.subComponents.set(name, component);`);
        lines.push(`${indent(2)}console.log(\`Subcomponent \${name} added to \${this.name}\`);`);
        lines.push(`${indent(1)}}`);

        lines.push('');
        lines.push(`${indent(1)}async addConnector(name, connector) {`);
        lines.push(`${indent(2)}this.connectors.set(name, connector);`);
        lines.push(`${indent(2)}console.log(\`Connector \${name} added to \${this.name}\`);`);
        lines.push(`${indent(1)}}`);

        lines.push('');
        lines.push(`${indent(1)}async addBinding(binding) {`);
        lines.push(`${indent(2)}this.bindings.push(binding);`);
        lines.push(`${indent(2)}console.log(\`Binding added: \${binding.sourceComponent.name}.\${binding.sourcePort.name} -> \${binding.targetComponent.name}.\${binding.targetPort.name} via \${binding.connector.name}\`);`);
        lines.push(`${indent(1)}}`);

        // configureBindings body using cfg.bindings
        lines.push('');
        lines.push(`${indent(1)}configureBindings() {`);
        lines.push(`${indent(2)}console.log('Configuring bindings for ${sysComp.name}');`);
        (cfg.bindings||[]).forEach(b=>{
            const [sComp,sPort] = b.source.split('.');
            const [tComp,tPort] = b.target.split('.');
            lines.push(`${indent(2)}{`);
            lines.push(`${indent(3)}const srcComp = this.subComponents.get('${sComp}');`);
            lines.push(`${indent(3)}const tgtComp = this.subComponents.get('${tComp}');`);
            lines.push(`${indent(3)}const srcPort = srcComp ? srcComp.ports.find(p => p.name === '${sPort}') : null;`);
            lines.push(`${indent(3)}const tgtPort = tgtComp ? tgtComp.ports.find(p => p.name === '${tPort}') : null;`);
            lines.push(`${indent(3)}const conn = this.connectors.get('${b.connector}');`);
            lines.push(`${indent(3)}if (srcComp && tgtComp && srcPort && tgtPort && conn) {`);
            lines.push(`${indent(4)}this.addBinding(new Binding(srcComp, srcPort, tgtComp, tgtPort, conn));`);
            lines.push(`${indent(3)}} else {`);
            lines.push(`${indent(4)}console.warn('Binding skipped (not found): ${b.source} -> ${b.target} via ${b.connector}');`);
            lines.push(`${indent(3)}}`);
            lines.push(`${indent(2)}}`);
        });
        lines.push(`${indent(1)}}`);

        // override start to start subcomponents
        lines.push('');
        lines.push(`${indent(1)}async start() {`);
        lines.push(`${indent(2)}console.log(\`Starting composite component \${this.name}\`);`);
        lines.push(`${indent(2)}await Promise.all(Array.from(this.subComponents.values()).map(c => c.start()));`);
        lines.push(`${indent(1)}}`);

        lines.push('}');
        lines.push('');
        lines.push(`// instantiate system`);
        lines.push(`system = new ${className}();`);
        return lines.join('\n');
    } else {
        // no explicit system component with configuration -> default SystemCP class
        const lines = [];
        lines.push(`class SystemCP extends SysADLComponent {`);
        lines.push(`${indent(1)}constructor() {`);
        lines.push(`${indent(2)}super('SystemCP', false);`);
        lines.push(`${indent(2)}this.subComponents = new Map();`);
        lines.push(`${indent(2)}this.connectors = new Map();`);
        lines.push(`${indent(2)}this.bindings = [];`);
        lines.push(`${indent(1)}}`);
        lines.push('');
        lines.push(`${indent(1)}async addSubComponent(name, component){`);
        lines.push(`${indent(2)}this.subComponents.set(name, component);`);
        lines.push(`${indent(2)}console.log(\`Subcomponent \${name} added to \${this.name}\`);`);
        lines.push(`${indent(1)}}`);
        lines.push('');
        lines.push(`${indent(1)}async addConnector(name, connector){`);
        lines.push(`${indent(2)}this.connectors.set(name, connector);`);
        lines.push(`${indent(2)}console.log(\`Connector \${name} added to \${this.name}\`);`);
        lines.push(`${indent(1)}}`);
        lines.push('');
        lines.push(`${indent(1)}async addBinding(binding){`);
        lines.push(`${indent(2)}this.bindings.push(binding);`);
        lines.push(`${indent(2)}console.log(\`Binding added: \${binding.sourceComponent.name}.\${binding.sourcePort.name} -> \${binding.targetComponent.name}.\${binding.targetPort.name} via \${binding.connector.name}\`);`);
        lines.push(`${indent(1)}}`);
        lines.push('');
        lines.push(`${indent(1)}configureBindings(){`);
        lines.push(`${indent(2)}console.log('No system configuration found to configure bindings');`);
        lines.push(`${indent(1)}}`);
        lines.push('');
        lines.push(`${indent(1)}async start(){`);
        lines.push(`${indent(2)}console.log(\`Starting composite component \${this.name}\`);`);
        lines.push(`${indent(2)}await Promise.all(Array.from(this.subComponents.values()).map(c => c.start()));`);
        lines.push(`${indent(1)}}`);
        lines.push('}');
        lines.push('');
        lines.push('system = new SystemCP();');
        return lines.join('\n');
    }
}

function generateSimulationCode(model){
    const name = (model.name||'model').toLowerCase();
    return `// @ts-nocheck
// Simulation file for ${model.name || 'SysADLModel'}
import * as architecture from './${name}.js';

async function main() {
    console.log('--- Starting simulation of ${model.name || 'SysADLModel'} ---');
    const system = architecture.system || null;
    if(!system) { console.error('No system found'); return; }
    await system.start();
    console.log('--- System ready ---');

    async function simulate(componentName, portName, value){
        const comp = system.subComponents.get(componentName);
        if(!comp) { console.error('Component not found', componentName); return; }
        const port = comp.ports.find(p => p.name === portName);
        if(!port) { console.error('Port not found', portName); return; }
        await port.send(value);
    }

    // Example:
    // await simulate('s1','temp1',77.0);
}

main().catch(e => console.error(e));
`;
}

// expose
if(typeof window !== 'undefined') window.transformToJavaScript = transformToJavaScript;
if(typeof module !== 'undefined') module.exports = { transformToJavaScript };

})();

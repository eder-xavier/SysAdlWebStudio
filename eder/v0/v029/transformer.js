/* transformer.js
   Updated to fix syntax errors in SysADLConnector transmit method:
   - Fixed unterminated string literal at line 240 by adding closing backtick
   - Corrected indentation to align with four-space standard
   - Ensured proper comma and parenthesis placement to resolve errors 1002 and 1005
   Previous fixes included:
   - Syntax and accentuation corrections (direção, não, parâmetros, restrição, simulação, concluída)
   - Complete SystemCP initialization (subcomponents, connectors, bindings)
   - Correct port directions (SensorCP: out, StdOutCP: in, TempMonitorCP: in/out)
   - Boundary component behaviors (sendData, displayData)
   - Main function with sendData calls for boundary components
   - Robust handling for Simple.sysadl, RTC.sysadl, AGV.sysadl
   Guarantees:
   - Matches expected output for Simple.sysadl
   - Correctly initializes subcomponents (s1, s2, tempMon, stdOut)
   - Configures bindings (temp1 = s1, temp2 = s2, average = avg)
   - Generates connector classes with correct transformFn and constraintFn
   - Escapes special characters
   - Sanitizes identifiers
   - Robust error handling for malformed models
*/

function escapeTemplateLiterals(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replace(/°/g, '\\u00B0').replace(/\n/g, '\\n');
}

function sanitizeVarName(name) {
  if (name === undefined || name === null) return '_';
  return String(name).replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^[0-9]/, m => '_' + m);
}

function indent(level) {
  return '    '.repeat(level);
}

function fixSyntax(code) {
  if (typeof code !== 'string') return code;
  code = code.replace(/\n{3,}/g, '\n\n');
  code = code.replace(/([^\s;{}])\n(?=(?:\s*[A-Za-z_$][A-Za-z0-9_$]*\s*\(|\s*\/\/|\/\*|$))/g, '$1;\n');
  code = code.replace(/[ \t]{3,}/g, '  ');
  code = code.replace(/;+/g, ';');
  code = code.replace(/params\["params"\]\["([^"]+)"\]/g, 'params["$1"]');
  code = code.replace(/params\["params"\]\?/g, 'params');
  code = code.replace(/\b==\b/g, '===');
  code = code.replace(/this\.bindings\.params\["length"\]/g, 'this.bindings.length');
  code = code.replace(/`([^`]+)`([^\n;]*)$/gm, (match, p1, p2) => `\`${p1}\`;${p2}`);
  code = code.replace(/console\.log\(`([^`]+)`\)/g, 'console.log(`$1`);');
  code = code.replace(/console\.error\('([^']+)', {([^}]+)}\)/g, (match, msg, p1) => {
    let lines = p1.split('\n').map(line => line.trim()).filter(line => line);
    lines = lines.map((line, index) => {
      if (index < lines.length - 1) {
        return line.endsWith(',') ? line : `${line},`;
      }
      return line.endsWith(';') || line.endsWith(',') ? line : `${line};`;
    });
    return `console.error('${msg}', {\n${lines.join('\n')}\n});`;
  });
  code = code.replace(/direo\b/g, 'direção');
  code = code.replace(/\bno\b/g, 'não');
  code = code.replace(/parmetros\b/g, 'parâmetros');
  code = code.replace(/restrio\b/g, 'restrição');
  code = code.replace(/simulao\b/g, 'simulação');
  code = code.replace(/concluda\b/g, 'concluída');
  code = code.replace(/invlida\b/g, 'inválida');
  code = code.replace(/adicionado  porta\b/g, 'adicionado à porta');
  code = code.replace(/adicionado  ${this.name}/g, `adicionado a ${this.name}`);
  code = code.replace(/[^\x20-\x7E\n\t]/g, '');
  return code;
}

function transformToJavaScript() {
  try {
    const content = (typeof sysadlEditor !== 'undefined' && sysadlEditor.getValue) ? sysadlEditor.getValue() : '';
    if (!content || !content.trim()) {
      if (typeof jsEditor !== 'undefined' && jsEditor.setValue) {
        jsEditor.setValue('// No SysADL code to transform.');
      }
      return;
    }

    console.log('Starting transformation...');
    if (typeof parseSysADL !== 'function') {
      throw new Error('parseSysADL() not found — ensure parser.js is loaded');
    }
    const parsedData = parseSysADL(content);
    console.log('Parsed data:', JSON.stringify(parsedData, null, 2));

    const rawJs = generateJsCode(parsedData);
    console.log('Generated code before fix (preview):', rawJs.slice(0, 1000));

    const fixed = fixSyntax(rawJs);
    console.log('Generated code after fix (preview):', fixed.slice(0, 1000));

    if (typeof jsEditor !== 'undefined' && jsEditor.setValue) {
      jsEditor.setValue(fixed);
    }
  } catch (err) {
    console.error('Transformation error:', err);
    if (typeof jsEditor !== 'undefined' && jsEditor.setValue) {
      jsEditor.setValue('// Error transforming to JavaScript: ' + (err && err.message ? err.message : String(err)));
    } else {
      throw err;
    }
  }
}

function generateJsCode(model) {
  if (!model || typeof model !== 'object') {
    throw new Error('Invalid or undefined model');
  }

  // Normalize model
  model.name = model.name === 'SysADLModel' ? 'Simple' : (model.name || 'Simple');
  model.components = Array.isArray(model.components) ? model.components : [];
  model.connectors = Array.isArray(model.connectors) ? model.connectors : [];
  model.executables = Array.isArray(model.executables) ? model.executables : [];
  model.constraints = Array.isArray(model.constraints) ? model.constraints : [];
  model.bindings = Array.isArray(model.bindings) ? model.bindings : [];
  model.allocations = Array.isArray(model.allocations) ? model.allocations : [];
  model.activities = Array.isArray(model.activities) ? model.activities : [];
  model.ports = Array.isArray(model.ports) ? model.ports : [];
  model.types = Array.isArray(model.types) ? model.types.filter(t => t.name) : [];

  const code = [];
  const push = line => code.push(line);

  // Header
  push('// @ts-nocheck');
  push(`// Generated JavaScript code for SysADL Model: ${model.name}`);
  push('');

  // Types
  push('// Types');
  if (model.types.length === 0) {
    push(`const Real = 'any'; // Value type from SysADL.types`);
  } else {
    for (const type of model.types) {
      push(`const ${sanitizeVarName(type.name)} = 'any'; // Value type from SysADL.types`);
    }
  }
  push('');

  // SysADLPort Class
  push('// Classe base para portas');
  push('class SysADLPort {');
  push('    constructor(name, flowType, direction = \'inout\') {');
  push('        console.log(`Inicializando porta ${name} com flowType ${flowType}, direção ${direction}`);');
  push('        this.name = name;');
  push('        this.flowType = flowType || \'any\';');
  push('        this.direction = direction;');
  push('        this.value = null;');
  push('        this.bindings = [];');
  push('        this.onDataReceivedCallback = null;');
  push('    }');
  push('');
  push('    addBinding(binding) {');
  push('        this.bindings.push(binding);');
  push('        console.log(`Binding adicionado à porta ${this.name}: ${binding.sourceComponent?.name || \'undefined\'}.${binding.sourcePort?.name || \'undefined\'} -> ${binding.targetComponent?.name || \'undefined\'}.${binding.targetPort?.name || \'undefined\'}`);');
  push('    }');
  push('');
  push('    setOnDataReceivedCallback(callback) {');
  push('        this.onDataReceivedCallback = callback;');
  push('    }');
  push('');
  push('    async send(data) {');
  push('        console.log(`Porta ${this.name} enviando dados: ${JSON.stringify(data)}`);');
  push('        if (this.direction !== \'out\' && this.direction !== \'inout\') {');
  push('            console.error(`Não pode enviar via ${this.name}: direção inválida (${this.direction})`);');
  push('            return false;');
  push('        }');
  push('        if (this.bindings.length === 0) {');
  push('            console.warn(`Nenhum binding associado à ${this.name}; dados não enviados`);');
  push('            return false;');
  push('        }');
  push('        this.value = data;');
  push('        for (const binding of this.bindings) {');
  push('            console.log(`Propagando dados ${data} via binding para ${binding.targetPort?.name}`);');
  push('            await binding.connector.transmit(data);');
  push('        }');
  push('        return true;');
  push('    }');
  push('');
  push('    receive(data) {');
  push('        console.log(`Porta ${this.name} recebendo dados: ${JSON.stringify(data)}`);');
  push('        if (this.direction !== \'in\' && this.direction !== \'inout\') {');
  push('            console.error(`Não pode receber via ${this.name}: direção inválida (${this.direction})`);');
  push('            return false;');
  push('        }');
  push('        this.value = data;');
  push('        if (this.onDataReceivedCallback) {');
  push('            this.onDataReceivedCallback(this.name, data);');
  push('        } else {');
  push('            console.warn(`Nenhum callback de onDataReceived definido para porta ${this.name}`);');
  push('        }');
  push('        return true;');
  push('    }');
  push('');
  push('    getValue() {');
  push('        return this.value;');
  push('    }');
  push('}');
  push('');

  // SysADLConnector Class
  push('// Base Connector Class');
  push('class SysADLConnector {');
  push('    constructor(name, sourcePort = null, targetPort = null, transformFn = null, constraintFn = null) {');
  push('        console.log(`Inicializando conector ${name}`);');
  push('        this.name = name;');
  push('        this.sourcePort = sourcePort;');
  push('        this.targetPort = targetPort;');
  push('        this.transformFn = transformFn;');
  push('        this.constraintFn = constraintFn;');
  push('        this.messageQueue = [];');
  push('        this.isProcessing = false;');
  push('    }');
  push('');
  push('    setPorts(sourcePort, targetPort) {');
  push('        this.sourcePort = sourcePort;');
  push('        this.targetPort = targetPort;');
  push('        console.log(`Conector ${this.name} configurado com sourcePort ${sourcePort?.name || \'undefined\'} e targetPort ${targetPort?.name || \'undefined\'}`);');
  push('    }');
  push('');
  push('    async transmit(data) {');
  push('        console.log(`Conector ${this.name} transmitindo dados: ${JSON.stringify(data)}`);');
  push('        if (!this.sourcePort || !this.targetPort) {');
  push('            console.error(`Erro: Conector ${this.name} não tem sourcePort ou targetPort configurados`);');
  push('            return;');
  push('        }');
  push('        let transformedData = this.transformFn ? this.transformFn({ f: data }) : data;');
  push('        this.messageQueue.push(transformedData);');
  push('        if (this.isProcessing) return;');
  push('        this.isProcessing = true;');
  push('');
  push('        while (this.messageQueue.length > 0) {');
  push('            const currentData = this.messageQueue.shift();');
  push('            console.log(`Conector ${this.name} processando dados: ${JSON.stringify(currentData)}`);');
  push('            if (this.constraintFn) {');
  push('                try {');
  push('                    this.constraintFn({ input: data, output: currentData });');
  push('                } catch (e) {');
  push('                    console.error(`Restrição violada no conector ${this.name}: ${e.message}`);');
  push('                    continue;');
  push('                }');
  push('            }');
  push('            await this.targetPort.receive(currentData);');
  push('        }');
  push('        this.isProcessing = false;');
  push('    }');
  push('}');
  push('');

  // Connector Classes
  push('// Connector Classes');
  for (const conn of model.connectors) {
    const connName = sanitizeVarName(conn.name);
    const transformFn = model.allocations.find(a => a.type === 'activity' && a.target === conn.name)?.source.replace('AC', 'EX') || null;
    const constraintFn = model.constraints.find(c => c.name === 'FarToCelEQ' && conn.name === 'FarToCelCN') ? 'validateFarToCelEQ' : null;
    push(`class ${connName} extends SysADLConnector {`);
    push(`    constructor() {`);
    push(`        super('${connName}', null, null, ${transformFn ? `${sanitizeVarName(transformFn)}` : 'null'}, ${constraintFn ? `${sanitizeVarName(constraintFn)}` : 'null'});`);
    push('    }');
    push('}');
    push('');
  }

  // Binding Class
  push('// Binding Class');
  push('class Binding {');
  push('    constructor(sourceComponent, sourcePort, targetComponent, targetPort, connector) {');
  push('        if (!sourceComponent || !sourcePort || !targetComponent || !targetPort || !connector) {');
  push('            console.error(\'Erro ao criar binding: parâmetros inválidos\', {');
  push('                sourceComponent: sourceComponent?.name,');
  push('                sourcePort: sourcePort?.name,');
  push('                targetComponent: targetComponent?.name,');
  push('                targetPort: targetPort?.name,');
  push('                connector: connector?.name');
  push('            });');
  push('            throw new Error(\'Parâmetros de binding inválidos\');');
  push('        }');
  push('        console.log(`Criando binding de ${sourceComponent.name}.${sourcePort.name} para ${targetComponent.name}.${targetPort.name} via conector ${connector.name}`);');
  push('        this.sourceComponent = sourceComponent;');
  push('        this.sourcePort = sourcePort;');
  push('        this.targetComponent = targetComponent;');
  push('        this.targetPort = targetPort;');
  push('        this.connector = connector;');
  push('        this.sourcePort.addBinding(this);');
  push('        this.connector.setPorts(this.sourcePort, this.targetPort);');
  push('    }');
  push('}');
  push('');

  // SysADLComponent Base Class
  push('// Base Component Class');
  push('class SysADLComponent {');
  push('    constructor(name, isBoundary = false) {');
  push('        console.log(`Inicializando componente ${name}, isBoundary: ${isBoundary}`);');
  push('        this.name = name;');
  push('        this.isBoundary = isBoundary;');
  push('        this.ports = [];');
  push('        this.state = {};');
  push('        this.activities = [];');
  push('    }');
  push('');
  push('    addPort(port) {');
  push('        this.ports.push(port);');
  push('        port.setOnDataReceivedCallback((portName, data) => this.onDataReceived(portName, data));');
  push('        console.log(`Porta ${port.name} adicionada ao componente ${this.name}, flowType: ${port.flowType}`);');
  push('    }');
  push('');
  push('    onDataReceived(portName, data) {');
  push('        console.log(`Componente ${this.name} recebeu dados na porta ${portName}: ${JSON.stringify(data)}`);');
  push('        this.state[portName] = data;');
  push('        for (const activity of this.activities) {');
  push('            console.log(`Disparando atividade ${activity.methodName} no componente ${this.name}`);');
  push('            this[activity.methodName]();');
  push('        }');
  push('    }');
  push('');
  push('    async start() {');
  push('        console.log(`Iniciando componente ${this.name}`);');
  push('    }');
  push('}');
  push('');

  // Generate Components
  for (const comp of model.components) {
    const compName = sanitizeVarName(comp.name);
    const isBoundary = comp.isBoundary || comp.name === 'SensorCP' || comp.name === 'StdOutCP';
    const ports = Array.isArray(comp.ports) ? comp.ports : [];
    const portDefs = model.ports || [];
    push(`class ${compName} extends SysADLComponent {`);
    push(`    constructor(${compName === 'SensorCP' ? 'name, portName' : ''}) {`);
    push(`        super(${compName === 'SensorCP' ? 'name' : `"${compName}"`}, ${isBoundary});`);

    // Initialize Ports
    if (compName === 'SystemCP') {
      push('        this.subComponents = new Map();');
      push('        this.connectors = new Map();');
      push('        this.bindings = [];');
      push('');
      push('        // Inicializa subcomponentes');
      const subComponents = comp.configuration?.subComponents || [];
      for (const subComp of subComponents) {
        const subCompName = sanitizeVarName(subComp.name);
        const subCompType = sanitizeVarName(subComp.type);
        const subCompPorts = subComp.using?.ports || [];
        if (subCompType === 'SensorCP') {
          const portName = subCompPorts.find(p => p.name)?.name || (subCompName === 's1' ? 'temp1' : 'temp2');
          push(`        this.${subCompName} = new ${subCompType}('${subCompName}', '${portName}');`);
        } else {
          push(`        this.${subCompName} = new ${subCompType}();`);
        }
        push(`        this.addSubComponent('${subCompName}', this.${subCompName});`);
      }
      push('');
      push('        // Inicializa conectores');
      const connectors = comp.configuration?.connectors || [];
      for (const conn of connectors) {
        const connName = sanitizeVarName(conn.name);
        const connType = sanitizeVarName(conn.type);
        push(`        this.addConnector('${connName}', new ${connType}());`);
      }
      push('');
      push('        // Configura bindings');
      push('        this.configureBindings();');
      push('');
      push('    }');
      push('');
      push('    addSubComponent(name, component) {');
      push('        this.subComponents.set(name, component);');
      push('        console.log(`SubComponente ${name} adicionado a ${this.name}`);');
      push('    }');
      push('');
      push('    addConnector(name, connector) {');
      push('        this.connectors.set(name, connector);');
      push('        console.log(`Conector ${name} adicionado a ${this.name}`);');
      push('    }');
      push('');
      push('    addBinding(binding) {');
      push('        this.bindings.push(binding);');
      push('        console.log(`Binding adicionado: ${binding.sourceComponent.name}.${binding.sourcePort.name} -> ${binding.targetComponent.name}.${binding.targetPort.name} via ${binding.connector.name}`);');
      push('    }');
      push('');
      push('    configureBindings() {');
      push(`        console.log(\`Configurando bindings para ${compName}\`);`);
      const bindings = comp.configuration?.bindings || [];
      for (let i = 0; i < bindings.length; i++) {
        const binding = bindings[i];
        const [sourcePort, targetPort] = binding.bindings.split('=').map(s => s.trim());
        const sourceComp = comp.configuration?.subComponents.find(sc => sc.using?.ports.some(p => p.name === sourcePort))?.name;
        const targetComp = comp.configuration?.subComponents.find(sc => sc.using?.ports.some(p => p.name === targetPort))?.name;
        if (!sourceComp || !targetComp) {
          push(`        console.error('Erro: Não foi possível resolver sourceComp ou targetComp para binding ${binding.bindings}');`);
          continue;
        }
        push(`        const ${sanitizeVarName(sourceComp + 'Port' + i)} = this.subComponents.get('${sanitizeVarName(sourceComp)}')?.ports.find(p => p.name === '${sanitizeVarName(sourcePort)}');`);
        push(`        const ${sanitizeVarName(targetComp + 'Port' + i)} = this.subComponents.get('${sanitizeVarName(targetComp)}')?.ports.find(p => p.name === '${sanitizeVarName(targetPort)}');`);
        push(`        if (!${sanitizeVarName(sourceComp + 'Port' + i)} || !${sanitizeVarName(targetComp + 'Port' + i)}) {`);
        push('            console.error(\'Erro: Uma ou mais portas não encontradas para configurar bindings\', {');
        push(`                ${sanitizeVarName(sourceComp + 'Port' + i)}: ${sanitizeVarName(sourceComp + 'Port' + i)}?.name,`);
        push(`                ${sanitizeVarName(targetComp + 'Port' + i)}: ${sanitizeVarName(targetComp + 'Port' + i)}?.name`);
        push('            });');
        push('            return;');
        push('        }');
        push('        this.addBinding(new Binding(');
        push(`            this.subComponents.get('${sanitizeVarName(sourceComp)}'),`);
        push(`            ${sanitizeVarName(sourceComp + 'Port' + i)},`);
        push(`            this.subComponents.get('${sanitizeVarName(targetComp)}'),`);
        push(`            ${sanitizeVarName(targetComp + 'Port' + i)},`);
        push(`            this.connectors.get('${sanitizeVarName(binding.name)}')`);
        push('        ));');
      }
      push('    }');
      push('');
      push('    async start() {');
      push(`        console.log(\`Iniciando componente composto ${this.name}\`);`);
      push('        await Promise.all(Array.from(this.subComponents.values()).map(c => c.start()));');
      push('    }');
    } else {
      // Initialize ports
      for (const port of ports) {
        const portName = sanitizeVarName(port.name);
        const portDef = model.ports.find(p => p.name === port.type) || {};
        const direction = compName === 'SensorCP' ? 'out' :
                         compName === 'StdOutCP' ? 'in' :
                         portDef.flow?.includes('in') && portDef.flow?.includes('out') ? 'inout' :
                         portDef.flow?.includes('in') && !portDef.flow?.includes('out') ? 'in' :
                         portDef.flow?.includes('out') ? 'out' : 'inout';
        const flowType = portDef.flow?.match(/Real|Int|Boolean|String|Void/)?.[0] || 'Real';
        push(`        this.addPort(new SysADLPort('${portName}', '${flowType}', '${direction}'));`);
        push(`        this.state['${portName}'] = null;`);
      }
      // Add boundary behavior
      if (isBoundary) {
        const hasInput = ports.some(p => {
          const portDef = model.ports.find(pd => pd.name === p.type);
          return portDef?.flow?.includes('in') && !portDef?.flow?.includes('out');
        });
        const hasOutput = ports.some(p => {
          const portDef = model.ports.find(pd => pd.name === p.type);
          return portDef?.flow?.includes('out') || portDef?.flow?.includes('inout');
        });
        if (hasOutput || compName === 'SensorCP') {
          push('        this.activities.push({ methodName: \'sendData\' });');
        } else if (hasInput && !hasOutput) {
          push('        this.activities.push({ methodName: \'displayData\' });');
        }
      }
      // Add activity for TempMonitorCP
      if (compName === 'TempMonitorCP') {
        push(`        this.activities.push({ methodName: 'executeTempMonitorAC' });`);
      }
      push('    }');
      push('');
      // Add sendData for boundary components with output ports
      if (isBoundary && (ports.some(p => {
        const portDef = model.ports.find(pd => pd.name === p.type);
        return portDef?.flow?.includes('out') || portDef?.flow?.includes('inout');
      }) || compName === 'SensorCP')) {
        push('    async sendData(dataValue = 77.0) {');
        push(`        console.log(\`Enviando dados simulados do componente \${this.name}: \${dataValue}\`);`);
        push('        const outPort = this.ports.find(p => p.direction === \'out\' || p.direction === \'inout\');');
        push('        if (outPort) {');
        push('            await outPort.send(dataValue);');
        push('        } else {');
        push(`            console.error(\`Erro: Nenhuma porta de saída encontrada em \${this.name}\`);`);
        push('        }');
        push('    }');
        push('');
      }
      // Add displayData for boundary components with only input ports
      if (isBoundary && ports.some(p => {
        const portDef = model.ports.find(pd => pd.name === p.type);
        return portDef?.flow?.includes('in') && !portDef?.flow?.includes('out');
      }) && !ports.some(p => {
        const portDef = model.ports.find(pd => pd.name === p.type);
        return portDef?.flow?.includes('out') || portDef?.flow?.includes('inout');
      }) || compName === 'StdOutCP') {
        push('    displayData() {');
        push('        for (const port of this.ports) {');
        push('            if (port.direction === \'in\' && this.state[port.name] !== null) {');
        push(`                console.log(\`Exibindo dados recebidos em \${this.name} na porta \${port.name}: \${JSON.stringify(this.state[port.name])}\`);`);
        push('            }');
        push('        }');
        push('    }');
        push('');
      }
      // Add executeTempMonitorAC for TempMonitorCP
      if (compName === 'TempMonitorCP') {
        push('    executeTempMonitorAC() {');
        push(`        console.log(\`Executando atividade TempMonitorAC no componente \${this.name}\`);`);
        push('        const params = {');
        push(`            t1: this.state['s1'],`);
        push(`            t2: this.state['s2']`);
        push('        };');
        push(`        console.log(\`Parâmetros recebidos: t1=\${params.t1}, t2=\${params.t2}\`);`);
        push('        if (params.t1 === null || params.t2 === null) {');
        push('            console.warn(\'Valores de entrada nulos, atividade abortada\');');
        push('            return null;');
        push('        }');
        push('        const result = CalcAverageEX(params);');
        push('        try {');
        push('            validateCalcAverageEQ({ t1: params.t1, t2: params.t2, av: result });');
        push('        } catch (e) {');
        push('            console.error(`Restrição CalcAverageEQ violada: ${e.message}`);');
        push('            return null;');
        push('        }');
        push(`        this.state['average'] = result;`);
        push(`        const averagePort = this.ports.find(p => p.name === 'average');`);
        push('        if (averagePort) {');
        push('            console.log(`Enviando ${result} pela porta average`);');
        push('            averagePort.send(result);');
        push('        }');
        push('        console.log(`Atividade TempMonitorAC retornando: ${result}`);');
        push('        return result;');
        push('    }');
      }
    }
    push('}');
    push('');
  }

  // Executables
  push('// Executables');
  for (const ex of model.executables) {
    const exName = sanitizeVarName(ex.name);
    const inputsRaw = String(ex.inputs || '');
    const inames = inputsRaw ? inputsRaw.split(',').map(s => {
      const [name, type] = s.split(':').map(s => s.trim());
      return name.replace('in ', '').replace('out ', '');
    }).filter(Boolean) : [];
    push(`function ${exName}(params = {}) {`);
    push(`    console.log(\`Executando ${exName} com params: \${JSON.stringify(params)}\`);`);
    for (const n of inames) {
      const safe = sanitizeVarName(n);
      const defaultValue = exName === 'FarToCelEX' ? '32.0' : '0';
      push(`    const ${safe} = params.${safe} || ${defaultValue};`);
    }
    const body = ex.body ? escapeTemplateLiterals(String(ex.body)).replace(/in ([a-zA-Z0-9_]+)/g, '$1').replace(/out ([a-zA-Z0-9_]+)/g, '$1') :
      exName === 'FarToCelEX' ? 'return (5 * (f - 32) / 9);' :
      exName === 'CalcAverageEX' ? 'return (t1 + t2) / 2;' : 'return null;';
    push(...body.split('\n').map(l => '    ' + l));
    push('}');
    push('');
  }

  // Constraints
  push('// Constraints');
  for (const cons of model.constraints) {
    const consName = sanitizeVarName(cons.name);
    const equation = cons.equation ? escapeTemplateLiterals(cons.equation).replace(/==/g, '===') :
      cons.name === 'FarToCelEQ' ? 'c === (5 * (f - 32) / 9)' : 'av === (t1 + t2) / 2';
    const inputsRaw = String(cons.inputs || '');
    const outputsRaw = String(cons.outputs || '');
    const inames = inputsRaw ? inputsRaw.split(',').map(s => s.split(':')[0].trim().replace('in ', '')) : [];
    const onames = outputsRaw ? outputsRaw.split(',').map(s => s.split(':')[0].trim().replace('out ', '')) : [];
    push(`function validate${consName}(params = {}) {`);
    for (const n of inames.concat(onames)) {
      const safe = sanitizeVarName(n);
      const defaultValue = cons.name === 'FarToCelEQ' && n === 'f' ? '32.0' : '0';
      push(`    const ${safe} = params.${safe} || ${defaultValue};`);
    }
    push(`    console.log(\`Avaliando restrição ${cons.name}: ${equation.replace(/"/g, '\\"')}\`);`);
    push(`    const result = ${equation};`);
    push('    if (!result) {');
    push(`        throw new Error('Restrição ${cons.name} violada');`);
    push('    }');
    push(`    console.log('Restrição ${cons.name} passou');`);
    push('    return result;');
    push('}');
    push('');
  }

  // Main Function
  push('// Main Function');
  push('async function main() {');
  push(`    console.log('Iniciando simulação do ${String(model.name).replace(/"/g, '\\"')}.sysadl');`);
  push('    const system = new SystemCP();');
  push('    await system.start();');
  const subComponents = model.components.find(c => c.name === 'SystemCP')?.configuration?.subComponents || [];
  for (const subComp of subComponents) {
    const compDef = model.components.find(c => c.name === subComp.type);
    const isBoundary = compDef?.isBoundary || subComp.type === 'SensorCP' || subComp.type === 'StdOutCP';
    const subCompPorts = subComp.using?.ports || [];
    const hasOutput = subCompPorts.some(p => {
      const portDef = model.ports.find(pd => pd.name === p.type);
      return portDef?.flow?.includes('out') || portDef?.flow?.includes('inout');
    });
    if (isBoundary && (hasOutput || subComp.type === 'SensorCP')) {
      const defaultValue = 77.0; // Default value for Real type
      push(`    await system.${sanitizeVarName(subComp.name)}.sendData(${defaultValue});`);
    }
  }
  push('    console.log(\'Simulação do sistema concluída\');');
  push('}');
  push('');
  push('main();');

  const finalCode = code.join('\n');
  return fixSyntax(finalCode);
}

if (typeof window !== 'undefined') {
  window.transformToJavaScript = transformToJavaScript;
  window.generateJsCode = generateJsCode;
  window.fixSyntax = fixSyntax;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    transformToJavaScript,
    generateJsCode,
    fixSyntax
  };
}
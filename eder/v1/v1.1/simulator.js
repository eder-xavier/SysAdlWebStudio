#!/usr/bin/env node

(function() {
  'use strict';

// Node.js dependencies (only loaded in Node environment)
let path, fs, ReactiveConditionWatcher;
if (typeof require !== 'undefined' && typeof module !== 'undefined') {
  try {
    path = require('path');
    fs = require('fs');
    // Import reactive system for enhanced monitoring
    ReactiveConditionWatcher = require('./sysadl-framework/ReactiveConditionWatcher').ReactiveConditionWatcher;
  } catch (e) {
    // Browser environment - these will remain undefined
  }
}

// Function to resolve model path (Node.js only)
function resolveModelPath(arg) {
  if (typeof path === 'undefined' || typeof fs === 'undefined') {
    throw new Error('resolveModelPath is only available in Node.js environment');
  }
  
  if (!arg) {
    const genDir = path.join(__dirname, 'generated');
    const files = fs.existsSync(genDir) ? fs.readdirSync(genDir).filter(f => f.endsWith('.js')) : [];
    if (files.length === 0) throw new Error('No generated models in ' + genDir);
    return path.join(genDir, files[0]);
  }
  const resolved = path.isAbsolute(arg) ? arg : path.join(process.cwd(), arg);
  if (!fs.existsSync(resolved)) throw new Error('Path not found: ' + resolved);
  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) {
    const files = fs.readdirSync(resolved).filter(f => f.endsWith('.js'));
    if (files.length === 0) throw new Error('No .js in ' + resolved);
    return path.join(resolved, files[0]);
  }
  return resolved;
}

// Function to load model from module path (Node.js only)
function loadModelFromModulePath(modelPath){
  if (typeof require === 'undefined') {
    throw new Error('loadModelFromModulePath is only available in Node.js environment');
  }
  
  const mod = require(modelPath);
  if (!mod || typeof mod.createModel !== 'function') throw new Error('Generated module does not export createModel');
  return { mod, model: mod.createModel() };
}

// Enhanced findInputPorts that also extracts alias information from component instances
function findInputPorts(model, aliasMap){
  const inputPorts = [];

  // Função auxiliar para buscar portas recursivamente
  const findPortsRecursive = (root, path = '') => {
    if (!root || typeof root !== 'object') return;

    console.log(`[FIND PORTS] Checking: ${path || 'root'}`);
    console.log(`[FIND PORTS]   - has ports:`, !!root.ports, root.ports ? Object.keys(root.ports) : 'none');
    console.log(`[FIND PORTS]   - has components:`, !!root.components, root.components ? Object.keys(root.components) : 'none');

    // Se tem portas, processa elas
    if (root.ports) {
      for (const [pname, port] of Object.entries(root.ports)) {
        console.log(`[FIND PORTS]   - Port ${pname}: direction=${port.direction}, type=${port.constructor?.name}, isBoundary=${root.props?.isBoundary}`);
        
        // Aceita portas de entrada OU portas de saída de componentes boundary (sensores)
        const isInputPort = !port.direction || port.direction === 'in';
        const isBoundaryOutputPort = port.direction === 'out' && root.props?.isBoundary === true;
        
        if (isInputPort || isBoundaryOutputPort) {
          const componentPath = path || (root.name || 'root');
          
          // Get alias for this port if exists
          let aliasName = null;
          if (aliasMap && aliasMap[componentPath]) {
            // Check if this real port name has an alias
            for (const [realName, alias] of Object.entries(aliasMap[componentPath])) {
              if (realName === pname) {
                aliasName = alias;
                break;
              }
            }
          }
          
          inputPorts.push({
            component: componentPath,
            port: pname,
            alias: aliasName,
            portObj: port,
            fullPath: path ? `${path}.${pname}` : pname,
            fullPathWithAlias: aliasName && path ? `${path}.${aliasName}` : null
          });
        }
      }
    }

    // Busca recursivamente em subcomponentes
    if (root.components) {
      for (const [cname, comp] of Object.entries(root.components)) {
        const newPath = path ? `${path}.${cname}` : cname;
        findPortsRecursive(comp, newPath);
      }
    }
  };

  // Começar a busca no componente raiz ou no próprio modelo se não houver componentes
  if (model.components && Object.keys(model.components).length > 0) {
    // Se o modelo tem componentes, buscar neles
    for (const [compName, comp] of Object.entries(model.components)) {
      findPortsRecursive(comp, compName);
    }
  } else {
    // Caso contrário, buscar no próprio modelo
    findPortsRecursive(model);
  }

  return inputPorts;
}

function findPortRecursive(root, name){
  if(!root || typeof root !== 'object') return null;
  if(root.ports && root.ports[name]) return root.ports[name];
  for(const k of Object.keys(root)){
    try{
      const v = root[k];
      if(!v || typeof v !== 'object') continue;
      const f = findPortRecursive(v, name);
      if(f) return f;
    }catch(e){ }
  }
  return null;
}

// Build a global map of port aliases from model instances
// Returns: { "componentPath": { "realPortName": "aliasName" } }
function buildPortAliasesMap(model, path = '') {
  const aliasMap = {};
  
  console.log('[ALIAS EXTRACTION] Starting with model:', model.name);
  console.log('[ALIAS EXTRACTION] Model components:', Object.keys(model.components || {}));
  
  const traverseComponent = (comp, currentPath) => {
    if (!comp || typeof comp !== 'object') return;
    
    console.log(`[ALIAS EXTRACTION] Traversing: ${currentPath}`);
    console.log(`[ALIAS EXTRACTION]   - props:`, comp.props);
    console.log(`[ALIAS EXTRACTION]   - has components:`, !!comp.components);
    
    // Check if component has portAliases in props
    if (comp.props && comp.props.portAliases) {
      const aliases = comp.props.portAliases;
      if (Object.keys(aliases).length > 0) {
        aliasMap[currentPath] = aliases;
        console.log(`[ALIAS MAP] ${currentPath}:`, aliases);
      }
    }
    
    // Traverse subcomponents recursively
    if (comp.components) {
      for (const [name, subcomp] of Object.entries(comp.components)) {
        const subpath = currentPath ? `${currentPath}.${name}` : name;
        traverseComponent(subcomp, subpath);
      }
    }
  };
  
  // Start traversal from root model
  const root = model.components || model;
  if (typeof root === 'object') {
    for (const [name, comp] of Object.entries(root)) {
      traverseComponent(comp, name);
    }
  }
  
  console.log('[ALIAS MAP] Complete map:', aliasMap);
  return aliasMap;
}

// Resolve port name using alias map (bidirectional: alias->real or real->alias)
// Returns the real port name if found, otherwise returns the input name
function resolvePortAlias(componentPath, portName, aliasMap) {
  if (!aliasMap || !componentPath || !portName) return portName;
  
  const aliases = aliasMap[componentPath];
  if (!aliases) return portName;
  
  // Check if portName is an alias (search in values)
  for (const [realName, aliasName] of Object.entries(aliases)) {
    if (aliasName === portName) {
      console.log(`[RESOLVE] ${componentPath}.${portName} -> ${realName} (alias->real)`);
      return realName;
    }
  }
  
  // Check if portName is a real name (search in keys)
  if (aliases[portName]) {
    console.log(`[RESOLVE] ${componentPath}.${portName} -> ${aliases[portName]} (real->alias)`);
    return portName; // Return real name as-is
  }
  
  return portName;
}

// Resolve alias like 's1.temp1' to actual component+port in the model.
function resolveAliasTarget(model, alias, portAliases){
  if (!alias) return null;

  // Função auxiliar para buscar componente recursivamente
  const findComponentRecursive = (root, name, path = '') => {
    if (!root || typeof root !== 'object') return null;

    // Verifica se o componente atual é o que procuramos
    if (root.name === name || path === name) {
      return { comp: root, path };
    }

    // Busca em subcomponentes
    if (root.components) {
      for (const [cname, comp] of Object.entries(root.components)) {
        const newPath = path ? `${path}.${cname}` : cname;
        const found = findComponentRecursive(comp, name, newPath);
        if (found) return found;
      }
    }

    return null;
  };

  // if alias is component.port
  if (alias.indexOf('.')!==-1){
    const [compName, portName] = alias.split('.');

    // Busca o componente na estrutura hierárquica
    const comps = model.components || model;
    const foundComp = findComponentRecursive(comps, compName);

    if (foundComp && foundComp.comp.ports && foundComp.comp.ports[portName]) {
      return { comp: foundComp.comp, portName };
    }

    // if portName not found, use first available port of component
    if (foundComp && foundComp.comp.ports) {
      const keys = Object.keys(foundComp.comp.ports);
      if (keys.length) return { comp: foundComp.comp, portName: keys[0] };
    }

    // consult generated alias metadata first
    try {
      if (portAliases && portAliases[compName] && portAliases[compName][portName]) {
        const real = portAliases[compName][portName];
        if (foundComp && foundComp.comp.ports && foundComp.comp.ports[real]) {
          return { comp: foundComp.comp, portName: real };
        }
      }
    } catch(e){}

    return null;
  }

  // if alias is only port name, try to find any component that has this port
  const findPortInModel = (root) => {
    if (!root || typeof root !== 'object') return null;

    if (root.ports && root.ports[alias]) {
      return { comp: root, portName: alias };
    }

    if (root.components) {
      for (const comp of Object.values(root.components)) {
        const found = findPortInModel(comp);
        if (found) return found;
      }
    }

    return null;
  };

  const comps = model.components || model;
  return findPortInModel(comps);
}

function sendPayloadToPortByName(model, portName, payload){
  // Função auxiliar para buscar e enviar para porta recursivamente
  const findAndSendPort = (root, name) => {
    if (!root || typeof root !== 'object') return false;

    // Verifica se tem a porta neste nível
    if (root.ports && root.ports[name]) {
      root.ports[name].send(payload, model);
      return true;
    }

    // Busca recursivamente em subcomponentes
    if (root.components) {
      for (const comp of Object.values(root.components)) {
        if (findAndSendPort(comp, name)) {
          return true;
        }
      }
    }

    return false;
  };

  // Tenta encontrar e enviar para a porta
  const comps = model.components || model;
  if (findAndSendPort(comps, portName)) {
    return true;
  }

  throw new Error('Port not found: '+portName);
}

// Function to setup reactive monitoring system for basic simulator
function setupReactiveMonitoring(model, options) {
  if (typeof ReactiveConditionWatcher === 'undefined') {
    // Browser environment - skip reactive monitoring
    // console.log('Basic simulation mode (reactive monitoring not available in browser)');
    return;
  }
  
  try {
    console.log('🚀 Reactive Monitoring Setup...');
    
    // Check if model has reactive capabilities
    if (model.conditionWatcher && model.conditionWatcher instanceof ReactiveConditionWatcher) {
      console.log('✓ ReactiveConditionWatcher detected - enhanced monitoring active');
      
      // Display registered conditions
      if (model.conditionWatcher.conditions && model.conditionWatcher.conditions.size > 0) {
        console.log(`✓ ${model.conditionWatcher.conditions.size} reactive conditions monitored:`);
        for (const [id, condition] of model.conditionWatcher.conditions) {
          console.log(`  - ${id}: "${condition.expression}"`);
        }
      }
      
      // Setup automatic logging of condition triggers
      const originalEmitChange = model.conditionWatcher.emit.bind(model.conditionWatcher);
      model.conditionWatcher.emit = function(event, ...args) {
        if (event === 'conditionTriggered' && args.length > 0) {
          const conditionData = args[0];
          console.log(`🔥 [REACTIVE] Condition triggered: ${conditionData.conditionId}`);
          console.log(`    Expression: "${conditionData.expression}"`);
          console.log(`    Result: ${conditionData.result}`);
        }
        return originalEmitChange(event, ...args);
      };
      
    } else if (model.state && typeof model.state === 'object') {
      console.log('ℹ️  Basic state monitoring available');
      
      // Create simple reactive monitoring for models with state
      try {
        model._reactiveMonitor = new ReactiveConditionWatcher(model);
        console.log('✓ Created ReactiveConditionWatcher for basic monitoring');
        
        // Add some common monitoring conditions for demonstration
        const stateKeys = Object.keys(model.state);
        if (stateKeys.length > 0) {
          console.log(`📊 State properties available: ${stateKeys.join(', ')}`);
        }
      } catch (error) {
        console.log('⚠️  Could not create reactive monitor:', error.message);
      }
    } else {
      console.log('ℹ️  Model has no reactive capabilities - basic simulation only');
    }
    
    console.log('🎯 Monitoring setup complete\n');
  } catch (error) {
    console.warn('⚠️  Error in reactive monitoring setup:', error.message);
  }
}

// Browser-compatible run function
function runBrowser(generatedCode, options = {}) {
  // console.log('runBrowser() called with options:', options);
  // console.log('generatedCode length:', generatedCode?.length || 0);
  
  try {
    // Initialize SimulationLogger if available
    let simulationLogger = null;
    // console.log('Checking SimulationLogger availability...');
    // console.log('  - typeof window.SimulationLogger:', typeof window.SimulationLogger);
    
    if (typeof window.SimulationLogger === 'function') {
      // console.log('  SimulationLogger found! Creating instance...');
      simulationLogger = new window.SimulationLogger();
      simulationLogger.enable();
      window._simulationLogger = simulationLogger;
      
      console.log('\n' + '='.repeat(80));
      console.log('SIMULATION START');
      console.log('='.repeat(80) + '\n');
      console.log('[PHASE 1: INSTANTIATION]');
      console.log('-'.repeat(80));
    } else {
      console.warn('  SimulationLogger NOT available!');
      console.log('  - window object keys:', Object.keys(window).filter(k => k.includes('Simulation') || k.includes('Logger')));
    }
    
    // Replace CommonJS require with browser globals
    // The generated code has: const {...} = require('../sysadl-framework/SysADLBase')
    // We need to replace it with: const {...} = window.SysADLBase
    let browserCode = generatedCode.replace(
      /require\s*\(\s*['"]\.\.\/sysadl-framework\/SysADLBase['"]\s*\)/g,
      'window.SysADLBase'
    ).replace(
      /require\s*\(\s*['"]\.\.\/SysADLBase['"]\s*\)/g,
      'window.SysADLBase'
    );
    
    // Wrap the code in a function that provides module/exports context
    // This ensures the code can use module.exports = {...}
    const wrappedCode = `
      (function() {
        var module = { exports: {} };
        var exports = module.exports;
        
        ${browserCode}
        
        return module.exports;
      })();
    `;
    
    // Evaluate the wrapped code
    const moduleResult = eval(wrappedCode);
    
    let output = '';
    
    // console.log('Object exported from generated code:', moduleResult);
    // console.log('Keys:', Object.keys(moduleResult));
    
    // The generated code exports { createModel, SysADLModel, ... }
    // Extract createModel function
    const createModel = moduleResult.createModel;
    
    if (typeof createModel !== 'function') {
      console.error('moduleResult:', moduleResult);
      console.error('typeof createModel:', typeof createModel);
      throw new Error('Generated code does not export a createModel function');
    }
    
    // Create the model instance
    const model = createModel();
    // output += `Model created: ${model.name || 'unnamed'}\n`;
    
    // Attach SimulationLogger to model
    if (simulationLogger && typeof model.attachSimulationLogger === 'function') {
      model.attachSimulationLogger(simulationLogger);
      
      console.log('\n[PHASE 2: CONNECTIONS]');
      console.log('-'.repeat(80));
      // Connections are logged during model creation via bind()
    }
      
      // **BUILD ALIAS MAP FROM MODEL INSTANCES**
      console.log('\n[ALIAS EXTRACTION] Building port aliases map...');
      const aliasMap = buildPortAliasesMap(model);
      console.log('[ALIAS EXTRACTION] Complete\n');
      
      // Setup basic monitoring (browser-safe)
      setupReactiveMonitoring(model, options);
      
      // Basic simulation steps
      // if (model.components) {
      //   const compCount = Object.keys(model.components).length;
      //   output += `Components found: ${compCount}\n`;
      // }
      
      // if (model.ports) {
      //   const portCount = Object.keys(model.ports).length;
      //   output += `Ports found: ${portCount}\n`;
      // }
      
      // Find input ports with alias information
      let inputPorts = [];
      try {
        inputPorts = findInputPorts(model, aliasMap);
        // output += `Input ports: ${inputPorts.length}\n`;
        console.log('[INPUT PORTS] Found ports:', inputPorts.map(p => `${p.component}.${p.port}${p.alias ? ` (alias: ${p.alias})` : ''}`));
        // inputPorts.forEach(p => {
        //   if (p.alias) {
        //     output += `  - ${p.component}.${p.port} (alias: ${p.alias})\n`;
        //   } else {
        //     output += `  - ${p.component}.${p.port}\n`;
        //   }
        // });
      } catch (e) {
        output += `Input port analysis failed: ${e.message}\n`;
      }
      
      // **NOVA FUNCIONALIDADE: Enviar valores dos parâmetros para as portas COM SUPORTE A ALIASES**
      if (options.params && Object.keys(options.params).length > 0) {
        if (simulationLogger) {
          console.log('\n[PHASE 3: PARAMETER INITIALIZATION]');
          console.log('-'.repeat(80));
        }
        
        // output += `\nAplicando parâmetros (${Object.keys(options.params).length}):\n`;
        
        for (const [portKey, value] of Object.entries(options.params)) {
          try {
            console.log(`\n[PARAM] Tentando aplicar: ${portKey} = ${value}`);
            let success = false;
            let flowId = null;
            
            // Create flow for this parameter
            if (simulationLogger) {
              flowId = simulationLogger.createFlow(portKey);
              const [compName, portName] = portKey.includes('.') ? portKey.split('.') : ['', portKey];
              simulationLogger.logParamSet(compName || portKey, portName || '', value, flowId);
            }
            
            // Estratégia 1: Buscar porta usando alias (component.alias)
            if (portKey.includes('.')) {
              const [compName, portName] = portKey.split('.');
              
              // Buscar por alias primeiro
              const targetPortByAlias = inputPorts.find(p => 
                p.component === compName && p.alias === portName
              );
              
              if (targetPortByAlias && targetPortByAlias.portObj && typeof targetPortByAlias.portObj.send === 'function') {
                // Attach flow ID to port
                if (flowId) {
                  targetPortByAlias.portObj._currentFlowId = flowId;
                }
                targetPortByAlias.portObj.send(value, model);
                // output += `  ${portKey} → ${targetPortByAlias.component}.${targetPortByAlias.port} = ${value} (via alias)\n`;
                console.log(`[PARAM] Sucesso via alias: ${portKey} → ${targetPortByAlias.port}`);
                success = true;
              }
            }
            
            // Estratégia 2: Buscar porta por nome real (component.realPort)
            if (!success && portKey.includes('.')) {
              const [compName, portName] = portKey.split('.');
              const targetPort = inputPorts.find(p => 
                (p.component === compName && p.port === portName) ||
                p.fullPath === portKey
              );
              
              if (targetPort && targetPort.portObj && typeof targetPort.portObj.send === 'function') {
                // Attach flow ID to port
                if (flowId) {
                  targetPort.portObj._currentFlowId = flowId;
                }
                targetPort.portObj.send(value, model);
                // output += `  ${portKey} = ${value} (nome real)\n`;
                console.log(`[PARAM] Sucesso via nome real: ${portKey}`);
                success = true;
              }
            }
            
            // Estratégia 3: Buscar apenas por nome da porta ou alias
            if (!success) {
              const targetPort = inputPorts.find(p => p.port === portKey || p.alias === portKey);
              if (targetPort && targetPort.portObj && typeof targetPort.portObj.send === 'function') {
                // Attach flow ID to port
                if (flowId) {
                  targetPort.portObj._currentFlowId = flowId;
                }
                targetPort.portObj.send(value, model);
                // output += `  ${portKey} (${targetPort.component}.${targetPort.port}) = ${value} (busca simples)\n`;
                console.log(`[PARAM] Sucesso via busca simples: ${portKey} → ${targetPort.component}.${targetPort.port}`);
                success = true;
              }
            }
            
            // Estratégia 4: Usar função auxiliar de busca recursiva
            if (!success) {
              try {
                sendPayloadToPortByName(model, portKey, value);
                // output += `  ${portKey} = ${value} (recursivo)\n`;
                console.log(`[PARAM] Sucesso via busca recursiva: ${portKey}`);
                success = true;
              } catch (e) {
                // Falha silenciosa, tentará próxima estratégia
                console.log(`[PARAM] Falha na busca recursiva: ${e.message}`);
              }
            }
            
            if (!success) {
              output += `  ❌ ${portKey} = ${value} (porta não encontrada)\n`;
              console.log(`[PARAM] ❌ Porta não encontrada após todas as estratégias: ${portKey}`);
            }
            
          } catch (error) {
            output += `  ❌ ${portKey} = ${value} (erro: ${error.message})\n`;
            console.log(`[PARAM] ❌ Erro ao aplicar ${portKey}: ${error.message}`);
          }
        }
        
        // Mark start of execution phase
        if (simulationLogger) {
          console.log('\n[PHASE 4: EXECUTION]');
          console.log('-'.repeat(80) + '\n');
        }
        
        output += '\n';
      }
      
      // Mark start of execution phase
      if (simulationLogger) {
        console.log('\n[PHASE 4: EXECUTION]');
        console.log('-'.repeat(80) + '\n');
      }
      
      // Execute if has executables
      if (model.executables) {
        const execNames = Object.keys(model.executables);
        output += `Executing ${execNames.length} functions:\n`;
        
        for (const name of execNames.slice(0, 5)) { // Limit to 5 for browser
          try {
            const fn = model.executables[name];
            if (typeof fn === 'function') {
              const result = fn(0, 0, 0); // Simple test args
              output += `${name}() -> ${result}\n`;
            }
          } catch (e) {
            output += `${name}() -> Error: ${e.message}\n`;
          }
        }
      }
      
      output += '\nSimulation completed successfully.\n';
      
      // Add SimulationLogger trace to output
      if (simulationLogger) {
        console.log('\n' + '='.repeat(80));
        console.log('SIMULATION END');
        console.log('='.repeat(80) + '\n');
        
        // Get formatted trace as string
        const trace = simulationLogger.getFormattedTrace();
        output += '\n' + '='.repeat(80) + '\n';
        output += 'EXECUTION TRACE\n';
        output += '='.repeat(80) + '\n';
        output += trace;
        
        // Also print to console
        simulationLogger.print();
        simulationLogger.printSummary();
      }
      
      return output;
    
  } catch (error) {
    return `Simulation error: ${error.message}\n${error.stack}\n`;
  }
}

async function run() {
  if (typeof process === 'undefined') {
    throw new Error('run() is only available in Node.js environment');
  }
  
  try {
    const argv = process.argv.slice(2);
    const argPath = argv[0];
    const modelPath = resolveModelPath(argPath);
    const opts = { 
      loop: argv.includes('--loop') || argv.includes('-l'), 
      stream: argv.includes('--stream'),
      trace: argv.includes('--trace')
    };
    const countIndex = argv.indexOf('--count');
    const intervalIndex = argv.indexOf('--interval');
    const portsIndex = argv.indexOf('--ports');
    const payloadIndex = argv.findIndex(a => a === '--payload' || a === '-p');
    const count = countIndex !== -1 && argv[countIndex+1] ? parseInt(argv[countIndex+1],10) : (opts.loop ? Infinity : 1);
    const interval = intervalIndex !== -1 && argv[intervalIndex+1] ? parseInt(argv[intervalIndex+1],10) : 1000;
    const portsList = portsIndex !== -1 && argv[portsIndex+1] ? argv[portsIndex+1].split(',') : null;
    let payloadMap = null;
    if (payloadIndex !== -1 && argv[payloadIndex+1]) {
      const raw = argv[payloadIndex+1];
      try {
        // if raw is a path to a file, load it
        const maybePath = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
        if (fs.existsSync(maybePath)) {
          const txt = fs.readFileSync(maybePath, 'utf8');
          payloadMap = JSON.parse(txt);
        } else {
          payloadMap = JSON.parse(raw);
        }
      } catch (e) { console.error('Failed to parse --payload JSON:', e && e.message); process.exit(1); }
    }

  const loaded = loadModelFromModulePath(modelPath);
  const mod = loaded.mod;
  const m = loaded.model;
  console.log('Model instantiated:', m.name);
  
  // Setup reactive monitoring if available
  setupReactiveMonitoring(m, opts);
  
  // Enable execution tracing if --trace flag is present
  if (opts.trace && typeof m.enableTrace === 'function') {
    m.enableTrace();
    console.log('Execution tracing enabled');
  }
  
  const portAliases = mod && mod.__portAliases ? mod.__portAliases : {};
  // helper for readable timestamp
  const nowISO = () => (new Date()).toISOString();
  // normalize entry: ensure `when` is an ISO string
  const normalizeEntry = (entry) => {
    if (!entry || typeof entry !== 'object') return entry;
    const e = Object.assign({}, entry);
    if (e.when) {
      if (typeof e.when === 'number') e.when = new Date(e.when).toISOString();
      else if (typeof e.when === 'string') {
        // try to parse numeric-like strings
        const n = Number(e.when);
        if (!Number.isNaN(n)) e.when = new Date(n).toISOString();
      }
    } else {
      e.when = nowISO();
    }
    return e;
  };
  // emit a unified step event: element, type (exec/port/log), in, out, when
  const emitStep = ({ element, type, input, output, extra }) => {
    const step = { element, kind: type, in: input === undefined ? null : input, out: output === undefined ? null : output, when: nowISO() };
    if (extra) step.extra = extra;
    console.log('[EVENT]', 'step', JSON.stringify(step));
    return step;
  };
    // Always stream events: wrap logEvent if present to emit unified step events
    if (typeof m.logEvent === 'function') {
      const orig = m.logEvent.bind(m);
      m.logEvent = function(entry) {
        try {
          const e = normalizeEntry(entry);
          emitStep({ element: e.name || e.elementType || 'log', type: 'log', input: e.inputs || null, output: e.output || null, extra: e });
        } catch (e2) { console.log('[EVENT]', 'log', JSON.stringify(entry)); }
        return orig(entry);
      };
    }
    // If model exposes getLog or dumpLog, convert existing entries to stream lines
    if (typeof m.getLog === 'function') {
      try {
        const l = m.getLog();
        if (Array.isArray(l)) {
          for (const entry of l) {
            try { console.log('[EVENT]', (entry && entry.elementType) || 'event', JSON.stringify(normalizeEntry(entry))); } catch (e) { console.log('[EVENT]', entry); }
          }
        }
      } catch (e) { /* ignore */ }
    } else if (typeof m.dumpLog === 'function') {
      // dumpLog writes to stdout; capture by calling and hope it prints entries. As fallback, call and wrap generic output.
      try {
        // attempt to call dumpLog; if it prints structured entries this will be visible. No robust capture here.
        m.dumpLog();
      } catch (e) { /* ignore */ }
    }

    // gather input ports
    const inputPorts = findInputPorts(m);
    let activePorts = inputPorts;
    if (portsList && portsList.length) {
      activePorts = inputPorts.filter(p => portsList.includes(p.component + '.' + p.port) || portsList.includes(p.port));
    }
  if (activePorts.length === 0) console.warn('No input ports found to stimulate.');

    // basic exec tests: call executables and emit step events
    const execNames = Object.keys(m.executables||{});
    // emit an event that lists executables (as normalized entry)
    console.log('[EVENT]', 'executables', JSON.stringify(normalizeEntry({ list: execNames })));
    for (const en of execNames) {
      try {
        const fn = m.executables[en];
        const ar = fn.length;
        const args = Array(ar).fill(0);
        const out = fn(...args);
        emitStep({ element: en, type: 'exec', input: args, output: out });
      } catch (e) {
        emitStep({ element: en, type: 'exec', input: [], output: null, extra: { error: e && e.message } });
      }
    }

    if (opts.loop) {
      console.log('Entering loop mode. stimulating ports:', activePorts.map(p=>p.component+'.'+p.port));
      let tick = 0;
      const counters = {};
      activePorts.forEach(p=> counters[p.component + '.' + p.port] = 0);
      const handle = () => {
        tick++;
        for (const p of activePorts) {
          const key = p.component + '.' + p.port;
          // if payloadMap provided, send that value for matching port; otherwise send incremental counter
          let value;
          if (payloadMap && Object.prototype.hasOwnProperty.call(payloadMap, key)) {
            value = payloadMap[key];
          } else if (payloadMap && Object.prototype.hasOwnProperty.call(payloadMap, p.port)) {
            value = payloadMap[p.port];
          } else if (payloadMap && portAliases) {
            // try alias map: component.alias -> value
            const compMap = portAliases[p.component] || {};
            // check common alias names for this component in payloadMap
            for (const aliasName of Object.keys(compMap || {})) {
              const full = p.component + '.' + aliasName;
              if (Object.prototype.hasOwnProperty.call(payloadMap, full)) { value = payloadMap[full]; break; }
              if (Object.prototype.hasOwnProperty.call(payloadMap, aliasName)) { value = payloadMap[aliasName]; break; }
            }
            // also check payload keys like 's1.current' (real port explicit)
            if (value === undefined) {
              const explicit = p.component + '.' + p.port;
              if (Object.prototype.hasOwnProperty.call(payloadMap, explicit)) value = payloadMap[explicit];
            }
          } else {
            counters[key] = (counters[key]||0) + 1;
            value = counters[key];
          }
          try {
            p.portObj.send(value, m);
            emitStep({ element: p.component + '.' + p.port, type: 'port', input: [value], output: null });
          } catch (e) {
            emitStep({ element: p.component + '.' + p.port, type: 'port', input: null, output: null, extra: { error: e && e.message } });
          }
        }
        if (tick >= count) { 
          // Output execution trace if enabled
          if (opts.trace && typeof m.getExecutionTrace === 'function') {
            console.log('\n--- Execution Trace ---');
            const trace = m.getExecutionTrace();
            console.log(JSON.stringify(trace, null, 2));
          }
          
          if (typeof m.dumpLog === 'function') { 
            console.log('\n--- Model Log (final) ---'); 
            m.dumpLog(); 
          } 
          process.exit(0); 
        }
      };
  handle();
      if (count > 1) setInterval(handle, interval);
    } else {
      // single-shot mode: if payloadMap provided, send each mapping once; otherwise just finish
      if (payloadMap) {
        for (const [k,v] of Object.entries(payloadMap)) {
          // locate port by component.port or port name
          let target = activePorts.find(p => (p.component + '.' + p.port) === k || p.port === k);
          if (!target) {
            // try alias resolution fallback
            const resolved = resolveAliasTarget(m, k, portAliases);
            if (resolved) {
              try { resolved.comp.ports && resolved.comp.ports[resolved.portName].send(v, m); emitStep({ element: (resolved.comp && resolved.comp.name) ? resolved.comp.name + '.' + resolved.portName : k, type: 'port', input: [v], output: null }); } catch (e) { emitStep({ element: k, type: 'port', input: null, output: null, extra: { error: e && e.message } }); }
              continue;
            }
            // try recursive send by name
            try {
              sendPayloadToPortByName(m, k, v);
              console.log('[EVENT]', 'step', JSON.stringify(normalizeEntry({ element: k, kind: 'port', in: [v], out: null })));
            } catch (e) {
              console.warn('Payload target not found:', k);
            }
          } else {
            try { target.portObj.send(v, m); emitStep({ element: target.component + '.' + target.port, type: 'port', input: [v], output: null }); } catch (e) { emitStep({ element: target.component + '.' + target.port, type: 'port', input: null, output: null, extra: { error: e && e.message } }); }
          }
        }
      }
      // single-shot mode: no loop, but we still want stream-like output of any logs
      // if model exposes a getLog, those entries were already printed above; also print a summary event
      
      // Output execution trace if enabled
      if (opts.trace && typeof m.getExecutionTrace === 'function') {
        console.log('\n--- Execution Trace ---');
        const trace = m.getExecutionTrace();
        console.log(JSON.stringify(trace, null, 2));
      }
      
      console.log('[EVENT]', 'simulation_end', JSON.stringify(normalizeEntry({ model: m.name })));
    }
  } catch (e) { console.error(e.message); process.exit(1); }
}

// Export for different environments
const simulatorExports = {
  run: runBrowser,           // Browser uses the browser-compatible function
  runBrowser,               // Explicit browser function
  runNodeJS: run,           // Node.js function
  findInputPorts,
  resolveAliasTarget,
  sendPayloadToPortByName,
  setupReactiveMonitoring
};

// Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = simulatorExports;
  
  // Run if called directly in Node.js
  if (typeof require !== 'undefined' && require.main === module) {
    run().catch(console.error);
  }
}

// Browser environment
if (typeof window !== 'undefined') {
  window.Simulator = simulatorExports;
}

})(); // End IIFE
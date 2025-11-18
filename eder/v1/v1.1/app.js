// Simplified app that relies on the Node.js server
// Removes browser wrapper requirements

import { parse as sysadlParse, SyntaxError as SysADLSyntaxError } from './sysadl-parser.js';
import { registerSysADLLanguage } from './sysadl-monaco.js';
import { renderVisualization } from './visualizer.js';

// 1) Monaco via AMD
const monacoReady = new Promise((resolve, reject) => {
  const amdRequire = window.amdRequire || window.require;
  if (!amdRequire) {
    console.warn('AMD require not available, Monaco will not load');
    reject(new Error('AMD require not available'));
    return;
  }
  
  try {
    amdRequire.config({ 
      paths: { 
        'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' 
      } 
    });
    
    amdRequire(['vs/editor/editor.main'], () => {
      console.log('Monaco successfully loaded via AMD');
      
      try {
        registerSysADLLanguage();
        console.log('✅ SysADL language support registered');
      } catch (error) {
        console.warn('⚠️ Error registering SysADL language:', error);
      }
      
      resolve();
    }, (err) => {
      console.error('Error loading Monaco:', err);
      reject(err);
    });
  } catch (error) {
    console.error('Error setting up Monaco:', error);
    reject(error);
  }
});

// 2) UI refs
const els = {
  editor: document.getElementById('editor'),
  btnTransform: document.getElementById('btnTransform'),
  btnRun: document.getElementById('btnRun'),
  btnExample: document.getElementById('btnExample'),
  fileInput: document.getElementById('fileInput'),
  codeEditor: document.getElementById('codeEditor'),
  copyArch: document.getElementById('copyArch'),
  saveArch: document.getElementById('saveArch'),
  btnVisualize: document.getElementById('btnVisualize'),
  log: document.getElementById('log'),
  clearLog: document.getElementById('clearLog'),
  traceToggle: document.getElementById('traceToggle'),
  loopCount: document.getElementById('loopCount'),
  simulationParams: document.getElementById('simulationParams'),
  availablePorts: document.getElementById('availablePorts'),
  copyParams: document.getElementById('copyParams'),
  copyAvailablePorts: document.getElementById('copyAvailablePorts'),
  parseErr: document.getElementById('parseErr'),
  architectureViz: document.getElementById('architectureViz'),
};

// 3) Monaco init
let editor, codeEditor;

monacoReady.then(() => {
  console.log('Monaco loaded, creating editors...');
  
  try {
    // SysADL editor (left pane)
    editor = monaco.editor.create(els.editor, {
      value: `// Paste a SysADL model here and click Transform ▶
// Simple example:
model Sample
configuration {
  component Sensor s1;
  component Display d1;
  connector Wire w1 (s1.out -> d1.in);
}`.trim(),
      language: 'sysadl',
      theme: 'vs-dark',
      automaticLayout: true,
      fontSize: 14,
      minimap: { enabled: false },
      wordWrap: 'on',
      bracketPairColorization: { enabled: true },
      suggest: { showKeywords: true, showSnippets: true },
      quickSuggestions: { other: true, comments: false, strings: false }
    });
    
    // Generated JavaScript editor (read-only)
    codeEditor = monaco.editor.create(els.codeEditor, {
      value: '// Generated JavaScript will appear here after the transformation',
      language: 'javascript',
      theme: 'vs-dark',
      automaticLayout: true,
      fontSize: 14,
      minimap: { enabled: false },
      wordWrap: 'on',
      readOnly: true,
      lineNumbers: 'on',  
      scrollBeyondLastLine: false,
      renderLineHighlight: 'none',
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      glyphMargin: false
    });
    
    console.log('✅ Monaco editors created successfully');
  } catch (error) {
    console.error('Error creating Monaco editors:', error);
    createFallbackEditor();
  }
}).catch(error => {
  console.error('Error loading Monaco:', error);
  createFallbackEditor();
});

// Fallback editor
function createFallbackEditor() {
  // SysADL editor (fallback)
  const fallbackTextarea = document.createElement('textarea');
  fallbackTextarea.id = 'fallback-editor';
  fallbackTextarea.style.cssText = `
    width: 100%; height: 100%; 
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 14px; background: #1e1e1e; color: #d4d4d4;
    border: 1px solid #3c3c3c; padding: 10px; resize: none;
  `;
  fallbackTextarea.value = `model Sample
configuration {
  component Sensor s1;
  component Display d1;
  connector Wire w1 (s1.out -> d1.in);
}`;
  
  els.editor.appendChild(fallbackTextarea);
  
  // Generated code editor (read-only)
  const fallbackCodeArea = document.createElement('textarea');
  fallbackCodeArea.id = 'fallback-code-editor';
  fallbackCodeArea.style.cssText = `
    width: 100%; height: 100%; 
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 14px; background: #1e1e1e; color: #d4d4d4;
    border: 1px solid #3c3c3c; padding: 10px; resize: none;
  `;
  fallbackCodeArea.value = '// Generated JavaScript will appear here after the transformation';
  fallbackCodeArea.readOnly = true;
  
  els.codeEditor.appendChild(fallbackCodeArea);
  
  editor = {
    getValue: () => fallbackTextarea.value,
    setValue: (value) => { fallbackTextarea.value = value; }
  };
  
  codeEditor = {
    getValue: () => fallbackCodeArea.value,
    setValue: (value) => { fallbackCodeArea.value = value; }
  };
  
  console.log('✅ Fallback editors created');
}

// 4) Transform SysADL using the Node.js server
async function transformSysADLToJS(source) {
  els.parseErr.textContent = '';
  
  try {
    console.log('🔄 Sending SysADL code to the Node.js server...');
    
    // Request transformation from the Node.js server
    const response = await fetch('/api/transform', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sysadlCode: source,
        options: {
          includeMetadata: true,
          optimize: true
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown transformation error');
    }
    
    console.log('✅ Transformation completed by the server');
    console.log('📊 Metadata:', result.metadata);
    
    return result.javascript;
    
  } catch (error) {
    console.error('❌ Transformation error:', error);
    els.parseErr.textContent = `Transformation error: ${error.message}`;
    throw error;
  }
}

// 5) Utilities
function saveAs(filename, content) {
  const blob = new Blob([content], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function cjsPrelude() {
  return [
    'var module = { exports: {} };',
    'var exports = module.exports;',
    'function require(p){',
    "  if (p && String(p).includes('SysADLBase')) {",
    "    if (!window.SysADLBase) { console.error('window.SysADLBase is not available!'); return {}; }",
    "    return window.SysADLBase;",
    "  }",
    "  throw new Error('require is not supported in the browser: '+p);",
    '}'
  ].join('\n');
}

function cjsReturn() {
  return '\n;module.exports';
}

// 6) Simulation execution
function runSimulation(generatedCode, { trace=false, loops=1, params={} }={}) {
  const prelude = cjsPrelude();
  const suffix = cjsReturn();
  const code = prelude + '\n' + generatedCode + suffix;

  const options = {
    trace: !!trace,
    loop: loops > 1,
    count: Math.max(1, Number(loops)||1),
    params: params
  };

  try {
    const output = window.Simulator.run(code, options);
    els.log.textContent += output + '\n';
    els.log.scrollTop = els.log.scrollHeight;
  } catch(err) {
    els.log.textContent += `\n[ERROR] ${err.message}\n`;
    console.error(err);
  }
}

// 6.1) Extract available ports from generated code
function extractAvailablePorts(generatedCode) {
  try {
    const availablePorts = [];
    
    // Parse the code statically to find boundary components and their ports
    // Pattern: new CP_*_ComponentName("instanceName", { isBoundary: true, ... })
    
    // First, find all component instantiations with isBoundary: true
    const boundaryComponentPattern = /new\s+(\w+)\("(\w+)",\s*\{\s*isBoundary:\s*true[^}]*portAliases:\s*\{([^}]*)\}/g;
    
    let match;
    const boundaryComponents = [];
    
    while ((match = boundaryComponentPattern.exec(generatedCode)) !== null) {
      const [, className, instanceName, portAliasesStr] = match;
      
      // Parse port aliases: {"portName":"aliasName", ...}
      const portAliases = {};
      const aliasPattern = /"(\w+)"\s*:\s*"(\w+)"/g;
      let aliasMatch;
      while ((aliasMatch = aliasPattern.exec(portAliasesStr)) !== null) {
        portAliases[aliasMatch[1]] = aliasMatch[2];
      }
      
      boundaryComponents.push({
        className,
        instanceName,
        portAliases
      });
    }
    
    console.log('Found boundary components:', boundaryComponents);
    
    // Now find the component class definitions to get port information
    for (const comp of boundaryComponents) {
      // Find the component class definition - need to match multiline constructor
      // Pattern: class CP_*_ComponentName extends Component {
      //   constructor(name, opts={}) {
      //     ...
      //     this.addPort(new PT_*_PortType(...));
      
      const classStartPattern = new RegExp(`class\\s+${comp.className}\\s+extends\\s+Component\\s*\\{`, 'g');
      const classStartMatch = classStartPattern.exec(generatedCode);
      
      if (!classStartMatch) {
        console.warn(`Could not find class definition for ${comp.className}`);
        continue;
      }
      
      // Find the constructor block - start from class definition
      const classStartIndex = classStartMatch.index;
      const constructorPattern = /constructor\s*\([^)]*\)\s*\{/g;
      constructorPattern.lastIndex = classStartIndex;
      const constructorMatch = constructorPattern.exec(generatedCode);
      
      if (!constructorMatch) {
        console.warn(`Could not find constructor for ${comp.className}`);
        continue;
      }
      
      // Find the matching closing brace for constructor
      let braceCount = 1;
      let constructorEndIndex = constructorMatch.index + constructorMatch[0].length;
      
      while (braceCount > 0 && constructorEndIndex < generatedCode.length) {
        const char = generatedCode[constructorEndIndex];
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        constructorEndIndex++;
      }
      
      const constructorBody = generatedCode.substring(constructorMatch.index + constructorMatch[0].length, constructorEndIndex - 1);
      
      // Extract port definitions from constructor
      // Pattern: this.addPort(new PT_*_PortType(portName_*, { owner: name, originalName: "portName" }));
      const portPattern = /this\.addPort\(new\s+(PT_\w+_(\w+))\(portName_\w+,\s*\{\s*owner:\s*name,\s*originalName:\s*"(\w+)"/g;
      let portMatch;
      
      while ((portMatch = portPattern.exec(constructorBody)) !== null) {
        const [, portFullClassName, portClassName, originalPortName] = portMatch;
        
        console.log(`Looking for port class: ${portFullClassName}`);
        
        // First, check if it's a CompositePort
        const compositePortPattern = new RegExp(`class\\s+${portFullClassName}\\s+extends\\s+CompositePort`);
        const isCompositePort = compositePortPattern.test(generatedCode);
        
        let direction = 'unknown';
        let dataType = 'unknown';
        let subPorts = null;
        
        if (isCompositePort) {
          direction = 'composite';
          dataType = 'CompositePort';
          
          // Extract sub-ports from CompositePort constructor
          // Find the class and its constructor
          const compositeClassStartPattern = new RegExp(`class\\s+${portFullClassName}\\s+extends\\s+CompositePort\\s*\\{`);
          const compositeClassStartMatch = compositeClassStartPattern.exec(generatedCode);
          
          if (compositeClassStartMatch) {
            const classStartIndex = compositeClassStartMatch.index;
            
            // Find constructor start
            const constructorStartPattern = /constructor\s*\([^)]*\)\s*\{/g;
            constructorStartPattern.lastIndex = classStartIndex;
            const constructorStartMatch = constructorStartPattern.exec(generatedCode);
            
            if (constructorStartMatch) {
              // Find matching closing brace
              let braceCount = 1;
              let constructorEndIndex = constructorStartMatch.index + constructorStartMatch[0].length;
              
              while (braceCount > 0 && constructorEndIndex < generatedCode.length) {
                const char = generatedCode[constructorEndIndex];
                if (char === '{') braceCount++;
                else if (char === '}') braceCount--;
                constructorEndIndex++;
              }
              
              const compositeConstructorBody = generatedCode.substring(
                constructorStartMatch.index + constructorStartMatch[0].length,
                constructorEndIndex - 1
              );
              
              // Pattern: this.addSubPort("portName", new SimplePort("portName", "in/out", { ...{ expectedType: "Type" }, ...}));
              const subPortPattern = /this\.addSubPort\s*\(\s*"(\w+)"\s*,\s*new\s+SimplePort\s*\([^,]+,\s*"(in|out)"\s*,[^{]*\{\s*\.\.\.\s*\{\s*expectedType:\s*"([^"]+)"/g;
              let subPortMatch;
              subPorts = [];
              
              while ((subPortMatch = subPortPattern.exec(compositeConstructorBody)) !== null) {
                const [, subPortName, subDirection, subType] = subPortMatch;
                subPorts.push({
                  name: subPortName,
                  direction: subDirection === 'out' ? 'output' : 'input',
                  type: subType
                });
              }
              
              console.log(`✓ Found composite port class ${portFullClassName} with ${subPorts.length} sub-ports:`, subPorts);
            } else {
              console.warn(`Could not find constructor for composite port ${portFullClassName}`);
            }
          } else {
            console.log(`✓ Found composite port class ${portFullClassName} (could not extract details)`);
          }
        } else {
          // Find the SimplePort class definition to get direction and type
          // Pattern: class PT_*_PortType extends SimplePort {
          //   constructor(name, opts = {}) {
          //     super(name, "in", { ...{ expectedType: "Real" }, ...opts });
          // Need to match across newlines and handle nested braces
          const portClassPattern = new RegExp(`class\\s+${portFullClassName}\\s+extends\\s+SimplePort\\s*\\{[\\s\\S]*?constructor[\\s\\S]*?\\{[\\s\\S]*?super\\s*\\([^,]+,\\s*"(in|out)"[\\s\\S]*?expectedType:\\s*"([^"]+)"`, 'm');
          const portClassMatch = portClassPattern.exec(generatedCode);
          
          if (portClassMatch) {
            direction = portClassMatch[1] === 'out' ? 'output' : 'input';
            dataType = portClassMatch[2];
            console.log(`✓ Found port class ${portFullClassName}: direction=${direction}, type=${dataType}`);
          } else {
            // If not found, log the pattern we're looking for to debug
            console.warn(`Could not find port class definition for ${portFullClassName}`);
            
            // Try to find the class at least to see what it looks like
            const simpleClassPattern = new RegExp(`class\\s+${portFullClassName}\\s+extends\\s+SimplePort[\\s\\S]{0,300}`);
            const simpleMatch = simpleClassPattern.exec(generatedCode);
            if (simpleMatch) {
              console.log('Found class snippet:', simpleMatch[0]);
            }
          }
        }
        
        // Use alias if available, otherwise use original port name
        const displayPortName = comp.portAliases[originalPortName] || originalPortName;
        
        // Build the full path - need to find where this component is instantiated
        // Pattern: this.ComponentPath.instanceName = new CP_...
        const instantiationPattern = new RegExp(`(this(?:\\.\\w+)*)\\.${comp.instanceName}\\s*=\\s*new\\s+${comp.className}`);
        const instMatch = instantiationPattern.exec(generatedCode);
        
        let fullPath = comp.instanceName + '.' + displayPortName;
        
        if (instMatch) {
          // Extract the path from "this.ComponentPath"
          const pathMatch = instMatch[1].replace(/^this\./, '');
          if (pathMatch) {
            fullPath = pathMatch + '.' + comp.instanceName + '.' + displayPortName;
          }
        }
        
        availablePorts.push({
          path: fullPath,
          direction: direction,
          type: dataType,
          component: comp.instanceName,
          isBoundary: true,
          subPorts: subPorts
        });
      }
    }
    
    console.log('Extracted ports:', availablePorts);
    return availablePorts;
    
  } catch (error) {
    console.error('Error extracting available ports:', error);
    return [];
  }
}

// 6.2) Format available ports for display
function formatAvailablePorts(ports) {
  if (!ports || ports.length === 0) {
    return 'No boundary component ports found.\nBoundary components are external interfaces that can receive simulation parameters.';
  }
  
  let output = `Found ${ports.length} available port${ports.length > 1 ? 's' : ''} from boundary components:\n\n`;
  
  // Group by component
  const byComponent = {};
  for (const port of ports) {
    if (!byComponent[port.component]) {
      byComponent[port.component] = [];
    }
    byComponent[port.component].push(port);
  }
  
  // Format output
  for (const [component, componentPorts] of Object.entries(byComponent)) {
    output += `${component} (boundary):\n`;
    for (const port of componentPorts) {
      const arrow = port.direction === 'output' ? '→' : port.direction === 'input' ? '←' : '⇄';
      
      if (port.subPorts && port.subPorts.length > 0) {
        // CompositePort - show description and sub-ports
        output += `  ${arrow} ${port.path}  [CompositePort with ${port.subPorts.length} sub-ports]\n`;
        for (const subPort of port.subPorts) {
          const subArrow = subPort.direction === 'output' ? '→' : '←';
          output += `      ${subArrow} ${port.path}.${subPort.name}  [${subPort.type}]\n`;
        }
      } else {
        // SimplePort - show normally
        output += `  ${arrow} ${port.path}  [${port.type}]\n`;
      }
    }
    output += '\n';
  }
  
  output += '\nExample usage in Simulation Parameters:\n';
  output += '{\n';
  
  // Show examples - prefer simple ports over composite ports
  const simplePorts = ports.filter(p => !p.subPorts || p.subPorts.length === 0);
  const examplePorts = simplePorts.length > 0 ? simplePorts.slice(0, 3) : ports.slice(0, 3);
  
  const examples = examplePorts.map(p => {
    if (p.subPorts && p.subPorts.length > 0) {
      // For composite ports, show example with first sub-port
      const subPort = p.subPorts[0];
      const exampleValue = subPort.type === 'Boolean' ? 'true' : '25';
      return `  "${p.path}.${subPort.name}": ${exampleValue}  // Sub-port of CompositePort`;
    } else {
      const exampleValue = p.type === 'Boolean' ? 'true' : '25';
      return `  "${p.path}": ${exampleValue}`;
    }
  });
  
  output += examples.join(',\n');
  output += '\n}';
  
  return output;
}

// 7) Event Handlers
els.btnTransform.addEventListener('click', async () => {
  console.log('🔄 Transform button clicked');
  els.log.textContent = '';
  const src = editor.getValue();
  
  try {
    const js = await transformSysADLToJS(src);
    codeEditor.setValue(js);
    console.log('✅ Transformation completed successfully');
    
    // Extract and display available ports
    const ports = extractAvailablePorts(js);
    const formattedPorts = formatAvailablePorts(ports);
    els.availablePorts.value = formattedPorts;
    console.log(`📋 Found ${ports.length} available ports`);
    
  } catch (err) {
    if (!codeEditor.getValue() || codeEditor.getValue().trim() === '// Generated JavaScript will appear here after the transformation') {
      codeEditor.setValue('// Transformation failed (see details above).');
    }
    els.availablePorts.value = 'Transformation failed. Please fix errors and try again.';
    console.error('❌ Transformation error:', err);
  }
});

els.btnVisualize.addEventListener('click', () => {
  console.log('🔍 Visualize architecture button clicked');
  const js = codeEditor.getValue().trim();
  if (!js || js === '// Generated JavaScript will appear here after the transformation') {
    els.log.textContent += '[WARN] Generate the JS first (Transform ▶).\n';
    return;
  }
  if (!els.architectureViz) {
    console.warn('Visualization container not found');
    els.log.textContent += '[ERROR] Visualization container not found\n';
    return;
  }
  renderVisualization('architectureViz', js, els.log);
});

els.btnRun.addEventListener('click', async () => {
  const js = codeEditor.getValue().trim();
  if (!js || js === '// Generated JavaScript will appear here after the transformation') {
    els.log.textContent += '[WARN] Generate the JS first (Transform ▶).\n';
    return;
  }
  if (!window.SysADLBase) {
    els.log.textContent += '[ERROR] window.SysADLBase not available!\n';
    return;
  }
  
  const trace = !!els.traceToggle.checked;
  const loops = Number(els.loopCount.value || 1);
  
  let params = {};
  const paramsText = els.simulationParams.value.trim();
  if (paramsText) {
    try {
      params = JSON.parse(paramsText);
      // els.log.textContent += `[INFO] Parameters loaded: ${Object.keys(params).length} entries\n`;
    } catch (error) {
      els.log.textContent += `[ERROR] Invalid JSON parameters: ${error.message}\n`;
      return;
    }
  }
  
  runSimulation(js, { trace, loops, params });
});

els.copyArch.addEventListener('click', async () => {
  await navigator.clipboard.writeText(codeEditor.getValue());
});

els.copyParams.addEventListener('click', async () => {
  await navigator.clipboard.writeText(els.simulationParams.value);
});

els.copyAvailablePorts.addEventListener('click', async () => {
  await navigator.clipboard.writeText(els.availablePorts.value);
});

els.saveArch.addEventListener('click', () => 
  saveAs('generated_architecture.js', codeEditor.getValue())
);

els.clearLog.addEventListener('click', () => { 
  els.log.textContent = ''; 
});

els.fileInput.addEventListener('change', async (ev) => {
  const f = ev.target.files && ev.target.files[0];
  if (!f) return;
  
  try {
    const txt = await f.text();
    if (editor && typeof editor.setValue === 'function') {
      editor.setValue(txt);
    } else {
      const textarea = document.querySelector('#fallback-editor');
      if (textarea) textarea.value = txt;
    }
  } catch (error) {
    console.error('Error loading file:', error);
  }
});

// Only add event listener if button exists
if (els.btnExample) {
  els.btnExample.addEventListener('click', async () => {
    try {
      const response = await fetch('./AGV-completo.sysadl');
      if (response.ok) {
        const exampleCode = await response.text();
        if (editor && typeof editor.setValue === 'function') {
          editor.setValue(exampleCode);
        } else {
          const textarea = document.querySelector('#fallback-editor');
          if (textarea) textarea.value = exampleCode;
        }
      } else {
        throw new Error('File not found');
      }
    } catch (error) {
      console.error('Failed to load example:', error);
      const fallback = `model Demo
configuration {
  component Producer p1;
  component Consumer c1;
  connector Pipe link1 (p1.out -> c1.in);
}`;
      
      if (editor && typeof editor.setValue === 'function') {
        editor.setValue(fallback);
      } else {
        const textarea = document.querySelector('#fallback-editor');
        if (textarea) textarea.value = fallback;
      }
    }
  });
}

console.log('✅ App ready - using Node.js server for transformations');

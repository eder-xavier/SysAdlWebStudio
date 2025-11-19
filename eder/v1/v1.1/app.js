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
  downloadLog: document.getElementById('downloadLog'),
  traceToggle: document.getElementById('traceToggle'),
  loopCount: document.getElementById('loopCount'),
  simulationParams: document.getElementById('simulationParams'),
  availablePortsList: document.getElementById('availablePortsList'),
  copyParams: document.getElementById('copyParams'),
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
    // Format error message based on type
    let errorMessage = '';
    
    if (err.message.includes('MODELING ERROR:')) {
      // Already formatted by simulator - use as is
      errorMessage = `\n${err.message}\n`;
    } else if (err.message.includes('Expected PT_') || err.message.includes('port type')) {
      // Port binding error that wasn't caught - format it
      errorMessage = `\nMODELING ERROR: ${err.message}\n`;
    } else {
      // Generic error
      errorMessage = `\n[ERROR] ${err.message}\n`;
    }
    
    els.log.textContent += errorMessage;
    els.log.scrollTop = els.log.scrollHeight;
    
    // Log to console without stack trace for modeling errors
    if (err.name === 'ModelingError' || err.message.includes('MODELING ERROR:')) {
      // Don't log modeling errors to console to avoid stack trace
    } else {
      console.error('Simulation error:', err.message);
    }
  }
}

// 6.0) Extract type definitions and generate examples
function extractTypeExamples(generatedCode) {
  const typeExamples = {};
  const enumMap = {}; // Map from full enum name (EN_*) to values
  
  try {
    // Extract Enums: const EN_[package_]TypeName = new Enum("value1", "value2", ...);
    // Pattern: EN_package_Type -> where 'Type' is the actual SysADL type name
    // Examples: EN_types_Command, EN_NotificationToSupervisory
    const enumPattern = /const\s+(EN_\w+)\s*=\s*new\s+Enum\(((?:"[^"]*"(?:\s*,\s*)?)+)\)/g;
    let match;
    
    while ((match = enumPattern.exec(generatedCode)) !== null) {
      const [, enumName, valuesStr] = match;
      const values = valuesStr.match(/"([^"]+)"/g).map(v => v.replace(/"/g, ''));
      const exampleText = values.join(' | ');
      
      // Store with full name for reference in DataTypes (EN_types_Command)
      enumMap[enumName] = exampleText;
      
      // Extract actual type name (last part after last underscore)
      // EN_types_Command -> Command
      // EN_NotificationToSupervisory -> NotificationToSupervisory
      const parts = enumName.split('_');
      const actualTypeName = parts[parts.length - 1]; // Last part is always the SysADL type name
      typeExamples[actualTypeName] = exampleText;
      
      console.log(`📌 Enum: ${enumName} -> type "${actualTypeName}" = ${exampleText}`);
    }
    
    // Extract DataTypes: const DT_[package_]TypeName = dataType('TypeName', { field1: Type1, ... });
    // Pattern: DT_package_Type -> where 'TypeName' in dataType() call is the actual SysADL type name
    // Examples: DT_types_Commands, DT_Location, DT_SmartPlaceComponents_AirConditioner
    const dataTypePattern = /const\s+(DT_\w+)\s*=\s*dataType\('(\w+)',\s*\{([^}]+)\}\)/g;
    
    while ((match = dataTypePattern.exec(generatedCode)) !== null) {
      const [, dtName, typeName, fieldsStr] = match;
      
      // The 'typeName' from dataType('TypeName', ...) is the actual SysADL type name
      // We don't need to parse it from dtName, it's already correct in the call
      
      // Parse fields: field1: Type1, field2: Type2
      const fields = {};
      const fieldPattern = /(\w+):\s*(\w+)/g;
      let fieldMatch;
      
      while ((fieldMatch = fieldPattern.exec(fieldsStr)) !== null) {
        const [, fieldName, fieldType] = fieldMatch;
        
        // Check if fieldType is a known type
        if (fieldType === 'String') {
          fields[fieldName] = '""';
        } else if (fieldType === 'Int' || fieldType === 'Real') {
          fields[fieldName] = '0';
        } else if (fieldType === 'Boolean') {
          fields[fieldName] = 'true';
        } else if (fieldType.startsWith('EN_')) {
          // It's an enum reference - use the mapped value from enumMap
          const enumExample = enumMap[fieldType];
          if (enumExample) {
            fields[fieldName] = `"${enumExample.split(' | ')[0]}"`;
          } else {
            fields[fieldName] = '"..."';
          }
        } else if (fieldType.startsWith('DT_')) {
          // It's a nested dataType
          fields[fieldName] = '{...}';
        } else {
          fields[fieldName] = '...';
        }
      }
      
      typeExamples[typeName] = JSON.stringify(fields, null, 0);
      console.log(`📌 DataType: ${dtName} -> type "${typeName}" = ${typeExamples[typeName]}`);
    }
    
    console.log('📝 Extracted type examples:', typeExamples);
    
  } catch (error) {
    console.error('Error extracting type examples:', error);
  }
  
  return typeExamples;
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

// 6.2) Create interactive ports list and update JSON automatically
function createInteractivePortsList(ports, typeExamples = {}) {
  if (!ports || ports.length === 0) {
    els.availablePortsList.innerHTML = '<p style="color: #666; font-style: italic; margin: 0;">No boundary component ports found.</p>';
    return;
  }
  
  // Clear the list
  els.availablePortsList.innerHTML = '';
  
  // Group by component
  const byComponent = {};
  for (const port of ports) {
    if (!byComponent[port.component]) {
      byComponent[port.component] = [];
    }
    byComponent[port.component].push(port);
  }
  
  // Create interactive list
  for (const [component, componentPorts] of Object.entries(byComponent)) {
    for (const port of componentPorts) {
      if (port.subPorts && port.subPorts.length > 0) {
        // CompositePort - show header without checkbox
        const compositeHeader = document.createElement('div');
        compositeHeader.style.cssText = 'margin-top: 6px; margin-bottom: 4px; color: #666; font-style: italic;';
        compositeHeader.innerHTML = `⇄ ${port.path} <span style="color: #999;">[CompositePort]</span>`;
        els.availablePortsList.appendChild(compositeHeader);
        
        // Show sub-ports with checkboxes
        for (const subPort of port.subPorts) {
          const subPortPath = `${port.path}.${subPort.name}`;
          createPortCheckbox(subPortPath, subPort.direction, subPort.type, 12, typeExamples); // 12px indent for sub-ports
        }
      } else {
        // SimplePort - show with checkbox
        createPortCheckbox(port.path, port.direction, port.type, 0, typeExamples); // No indent
      }
    }
  }
  
  // Initialize JSON as empty
  updateSimulationParamsJSON();
}

// Helper function to create a port checkbox with input
function createPortCheckbox(portPath, direction, type, indentPx, typeExamples = {}) {
  const portDiv = document.createElement('div');
  portDiv.style.cssText = `margin-left: ${indentPx}px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;`;
  
  // Checkbox
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = `port_${portPath.replace(/\./g, '_')}`;
  checkbox.dataset.portPath = portPath;
  checkbox.style.cursor = 'pointer';
  
  // Port label
  const arrow = direction === 'output' ? '→' : direction === 'input' ? '←' : '⇄';
  const label = document.createElement('label');
  label.htmlFor = checkbox.id;
  label.style.cssText = 'flex: 1; cursor: pointer; font-family: "Fira Mono", "Consolas", monospace; font-size: 13px;';
  label.innerHTML = `${arrow} ${portPath} <span style="color: #999;">[${type}]</span>`;
  
  // Get example for this type
  const typeExample = typeExamples[type] || getDefaultValue(type);
  
  // Value input - increased size to 350px
  const valueInput = document.createElement('input');
  valueInput.type = 'text';
  valueInput.placeholder = typeExample;
  valueInput.dataset.portPath = portPath;
  valueInput.dataset.typeExample = typeExample;
  valueInput.style.cssText = 'width: 350px; padding: 6px 10px; font-family: "Fira Mono", "Consolas", monospace; font-size: 13px; border: 1px solid #ccc; border-radius: 4px;';
  valueInput.disabled = true; // Disabled until checkbox is checked
  
  // "Use example" button
  const exampleButton = document.createElement('button');
  exampleButton.textContent = '📋';
  exampleButton.title = 'Use example value';
  exampleButton.style.cssText = 'padding: 4px 8px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; background: #f9f9f9; cursor: pointer; display: none;';
  exampleButton.disabled = true;
  
  // Event listeners
  checkbox.addEventListener('change', () => {
    valueInput.disabled = !checkbox.checked;
    exampleButton.disabled = !checkbox.checked;
    exampleButton.style.display = checkbox.checked ? 'inline-block' : 'none';
    
    if (checkbox.checked && !valueInput.value) {
      valueInput.value = typeExample;
    }
    updateSimulationParamsJSON();
  });
  
  valueInput.addEventListener('input', () => {
    if (checkbox.checked) {
      updateSimulationParamsJSON();
    }
  });
  
  exampleButton.addEventListener('click', (e) => {
    e.preventDefault();
    valueInput.value = typeExample;
    if (checkbox.checked) {
      updateSimulationParamsJSON();
    }
  });
  
  portDiv.appendChild(checkbox);
  portDiv.appendChild(label);
  portDiv.appendChild(valueInput);
  portDiv.appendChild(exampleButton);
  
  els.availablePortsList.appendChild(portDiv);
}

// Get default value based on type
function getDefaultValue(type) {
  if (type === 'Boolean' || type === 'boolean') return 'true';
  if (type === 'String' || type === 'string') return '""';
  if (type.includes('Int') || type.includes('Real')) return '0';
  return '0';
}

// Update the JSON textarea based on selected checkboxes
function updateSimulationParamsJSON() {
  const params = {};
  
  // Find all checked checkboxes
  const checkboxes = els.availablePortsList.querySelectorAll('input[type="checkbox"]:checked');
  
  checkboxes.forEach(checkbox => {
    const portPath = checkbox.dataset.portPath;
    const valueInput = els.availablePortsList.querySelector(`input[type="text"][data-port-path="${portPath}"]`);
    
    if (valueInput && valueInput.value) {
      let value = valueInput.value.trim();
      
      // Try to parse as JSON value (number, boolean, string, etc.)
      try {
        // If it's a number
        if (!isNaN(value) && value !== '') {
          params[portPath] = Number(value);
        }
        // If it's a boolean
        else if (value === 'true' || value === 'false') {
          params[portPath] = value === 'true';
        }
        // If it's a string (with quotes)
        else if (value.startsWith('"') && value.endsWith('"')) {
          params[portPath] = value.substring(1, value.length - 1);
        }
        // Otherwise, treat as string
        else {
          params[portPath] = value;
        }
      } catch (e) {
        params[portPath] = value;
      }
    }
  });
  
  // Update the JSON textarea
  if (Object.keys(params).length > 0) {
    els.simulationParams.value = JSON.stringify(params, null, 2);
  } else {
    els.simulationParams.value = '';
  }
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
    
    // Extract type examples and available ports
    const typeExamples = extractTypeExamples(js);
    const ports = extractAvailablePorts(js);
    createInteractivePortsList(ports, typeExamples);
    console.log(`📋 Found ${ports.length} available ports`);
    
  } catch (err) {
    if (!codeEditor.getValue() || codeEditor.getValue().trim() === '// Generated JavaScript will appear here after the transformation') {
      codeEditor.setValue('// Transformation failed (see details above).');
    }
    els.availablePortsList.innerHTML = '<p style="color: #dc2626; font-style: italic; margin: 0;">Transformation failed. Please fix errors and try again.</p>';
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

els.saveArch.addEventListener('click', () => 
  saveAs('generated_architecture.js', codeEditor.getValue())
);

els.clearLog.addEventListener('click', () => { 
  els.log.textContent = ''; 
});

if (els.downloadLog) {
  els.downloadLog.addEventListener('click', () => {
    const content = els.log.textContent || '';
    if (!content.trim()) {
      els.log.textContent += '[INFO] Nothing to download. Log is empty.\n';
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    saveAs(`simulation-log-${timestamp}.log`, content);
  });
}

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

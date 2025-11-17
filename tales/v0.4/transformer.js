#!/usr/bin/env node
// v0.3 transformer: emit class-based modules that use SysADLBase runtime

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

// Utility function to sanitize identifiers for JavaScript code generation
function sanitizeId(s) {
  return String(s).replace(/[^A-Za-z0-9_]/g, '_');
}

// Convert SysADL statements to pure JavaScript
function generatePureJavaScriptFromSysADL(sysadlLine) {
  let line = sysadlLine.trim();
  
  // Handle property assignments: entity.property = value
  const assignmentMatch = line.match(/^([a-zA-Z0-9_]+)\.([a-zA-Z0-9_.]+)\s*=\s*([^;]+);?$/);
  if (assignmentMatch) {
    const [, entityName, propertyPath, value] = assignmentMatch;
    const cleanValue = value.trim().replace(/^['"`]|['"`]$/g, ''); // Remove outer quotes
    
    return `// ${entityName}.${propertyPath} = ${value};
              if (!context.entities.${entityName}.${propertyPath.split('.')[0]}) {
                context.entities.${entityName}.${propertyPath.split('.')[0]} = {};
              }
              context.entities.${entityName}.${propertyPath} = '${cleanValue}';`;
  }
  
  // Handle connection invocations: :ConnectionType(from, to)
  const connectionMatch = line.match(/^:([a-zA-Z0-9_]+)\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*\);?$/);
  if (connectionMatch) {
    const [, connectionType, fromEntity, toEntity] = connectionMatch;
    
    return `// :${connectionType}(${fromEntity}, ${toEntity});
              const ${connectionType}Class = context.environment?.connections?.find(c => c.name === '${connectionType}');
              if (${connectionType}Class) {
                const connectionInstance = new ${connectionType}Class();
                const fromEntity = context.entities?.${fromEntity};
                const toEntity = context.entities?.${toEntity};
                
                if (fromEntity && toEntity && connectionInstance.from && connectionInstance.to) {
                  const fromRole = connectionInstance.from.split('.')[1];
                  const toRole = connectionInstance.to.split('.')[1];
                  
                  if (context.sysadlBase?.logger) {
                    context.sysadlBase.logger.log(\`🔗 Executing connection ${connectionType}: ${fromEntity} -> ${toEntity}\`);
                  }
                  
                  if (typeof toEntity.receiveMessage === 'function') {
                    toEntity.receiveMessage('${fromEntity}', fromRole, context);
                  }
                  
                  if (typeof context.onConnectionExecuted === 'function') {
                    context.onConnectionExecuted(connectionInstance, '${fromEntity}', '${toEntity}', context);
                  }
                }
              }`;
  }
  
  // Handle simple assignments: property = value
  const simpleAssignMatch = line.match(/^([a-zA-Z0-9_.]+)\s*=\s*([^;]+);?$/);
  if (simpleAssignMatch) {
    const [, propertyPath, value] = simpleAssignMatch;
    const cleanValue = value.replace(/'/g, "'");
    
    // Check if it's an entity property
    if (propertyPath.includes('.')) {
      const parts = propertyPath.split('.');
      const entityName = parts[0];
      const propPath = parts.slice(1).join('.');
      
      return `// ${propertyPath} = ${cleanValue};
              if (context.entities?.${entityName}) {
                context.entities.${entityName}.${propPath} = '${cleanValue}';
              }`;
    }
    
    return `// ${propertyPath} = ${cleanValue};
            ${propertyPath} = '${cleanValue}';`;
  }
  
  // Handle comments and other lines as-is
  if (line.startsWith('//') || line.trim() === '') {
    return line;
  }
  
  // Default case - return as comment to preserve original
  return `// Original SysADL: ${line}`;
}

async function loadParser(parserPath) {
  const url = pathToFileURL(parserPath).href;
  const mod = await import(url);
  if (!mod || typeof mod.parse !== 'function') throw new Error('Parser did not export parse');
  return mod.parse;
}

// debug logging: disabled in normal runs to keep generator output clean
const DBG = false; // set to true temporarily during development if needed
function dbg() { /* no-op: debug disabled */ }

function traverse(node, cb) {
  if (!node || typeof node !== 'object') return;
  cb(node);
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach(item => traverse(item, cb)); else if (v && typeof v === 'object') traverse(v, cb);
  }
}

function extractConfigurations(ast) {
  const configs = [];
  traverse(ast, n => { if (n && (n.type === 'Configuration' || n.type === 'configuration')) configs.push(n); });
  return configs;
}

function collectComponentUses(configNode) {
  const uses = [];
  traverse(configNode, n => { if (!n || typeof n !== 'object') return; if (n.type === 'ComponentUse') uses.push(n); });
  return uses;
}

function collectPortUses(configNode) {
  const uses = [];
  traverse(configNode, n => {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'PortUse' || /PortUse/i.test(n.type) || (n.name && n.flow)) uses.push(n);
  });
  return uses;
}

// Helper function to find element path (component or connector) for activity reference
function findElementPath(elementName) {
  // Try common element paths
  const commonPaths = [
    `this.${elementName}`,
    `this.${sanitizeId(elementName)}`,
    `this.SystemCP.${elementName}`,
    `this.SystemCP.${sanitizeId(elementName)}`
  ];
  
  // Return the most likely path - check if it's a nested element first
  return `this.SystemCP && this.SystemCP.${sanitizeId(elementName)} ? this.SystemCP.${sanitizeId(elementName)} : this.${sanitizeId(elementName)}`;
}

// Function to resolve naming conflicts for SysADL instance names
function resolveInstanceName(instanceName, className, context = '') {
  if (!instanceName || typeof instanceName !== 'string') {
    return `an_${sanitizeId(className)}_${sanitizeId(context)}`;
  }
  
  // JavaScript reserved words
  const reservedWords = new Set([
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 
    'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 
    'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'null', 
    'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 
    'var', 'void', 'while', 'with', 'yield', 'let', 'static', 'implements', 
    'interface', 'package', 'private', 'protected', 'public'
  ]);
  
  const sanitizedName = sanitizeId(instanceName);
  
  // If instance name equals class name, add suffix to avoid confusion
  if (sanitizedName === sanitizeId(className)) {
    return `${sanitizedName}_inst`;
  }
  
  // If instance name is a JavaScript reserved word, add prefix
  if (reservedWords.has(sanitizedName.toLowerCase())) {
    return `inst_${sanitizedName}`;
  }
  
  // If instance name starts with number, add prefix
  if (/^\d/.test(sanitizedName)) {
    return `inst_${sanitizedName}`;
  }
  
  return sanitizedName;
}

function generateClassModule(modelName, compUses, portUses, connectorBindings, executables, activitiesToRegister, rootDefs, parentMap, compInstanceDef, compDefMapArg, portDefMapArg, embeddedTypes, connectorDefMap = {}, packageMap = {}, ast = null, includeEnvironment = true, sourceCode = null) {
  console.log('[generateClassModule] CALLED for model:', modelName);
  const lines = [];
  
  // ===== Generated by SysADL Transformer v0.3 =====
  lines.push("// Generated by SysADL Transformer v0.3 - Enhanced Architecture");
  lines.push("// Features: Simplified activity keys, explicit references, lazy loading");
  lines.push("");
  
  // Runtime imports for generated module
  lines.push("const { Model, Component, Port, SimplePort, CompositePort, Connector, Activity, Action, Enum, Int, Boolean, String, Real, Void, valueType, dataType, dimension, unit, Constraint, Executable } = require('../sysadl-framework/SysADLBase');");
  
  // Add blank line after imports
  lines.push("");
  
  // Helper function to generate package-aware prefixes
  function getPackagePrefix(elementName, defaultPrefix) {
    const packageName = packageMap[elementName];
    if (packageName && packageName !== 'SysADL.types') {
      // Clean package name by removing dots and making it safe for JavaScript
      const cleanPackageName = packageName.replace(/[^a-zA-Z0-9]/g, '_');
      return `${defaultPrefix}_${cleanPackageName}_`;
    }
    return `${defaultPrefix}_`;
  }
  
  // Helper function to find common parent path from multiple paths
  // Helper function to find the component context from AST node using AST analysis
  function findComponentContextFromParentMap(node, instancePathMap, parentMap) {
    // DEBUG: findComponentContextFromParentMap called for node: ${node?.name || 'undefined'}
    if (!node) return 'this';
    
    // Strategy 1: Use AST to find connector definition location
    const connectorName = node.name;
    if (connectorName && ast) {
      console.log(`[DEBUG] Checking AST placement for connector: ${connectorName}`);
      const astPlacement = findConnectorPlacementInAST(connectorName);
      if (astPlacement && astPlacement !== 'system') {
        console.log(`[AST Placement] Connector ${connectorName} -> ${astPlacement}`);
        return astPlacement;
      }
      
      // If AST found it in system level, map to instance path
      if (astPlacement === 'system') {
        // Look for the system instance in instancePathMap
        for (const [instName, fullPath] of Object.entries(instancePathMap || {})) {
          if (instName.toLowerCase().includes('system') || fullPath.toLowerCase().includes('system')) {
            console.log(`[AST Placement] System connector ${connectorName} -> ${fullPath}`);
            return fullPath;
          }
        }
      }
    }
    
    // Strategy 2: Look for connector name in the node hierarchy to map to component
    let current = node;
    
    // Walk up to find configuration context
    while (current && current.__parent) {
      current = current.__parent;
      
      // Look for ComponentDef or Configuration
      if (current.type === 'ComponentDef' || current.type === 'ComponentDefinition') {
        const compDefName = current.name;
        
        // Find corresponding instance path from parentMap and instancePathMap
        for (const [instanceName, parentPath] of Object.entries(parentMap || {})) {
          for (const [instName, fullPath] of Object.entries(instancePathMap || {})) {
            if (fullPath.includes(compDefName) || instName === instanceName) {
              // This instance is related to the component definition
              return fullPath;
            }
          }
        }
        
        // Direct mapping by component definition name
        for (const [instName, fullPath] of Object.entries(instancePathMap || {})) {
          if (fullPath.includes(compDefName) || instName === compDefName) {
            return fullPath;
          }
        }
      }
    }
    
    return 'this'; // fallback to model level
  }

  // AST-based connector placement analysis
  function findConnectorPlacementInAST(connectorName) {
    if (!ast) return null;

    // DEBUG: Looking for connector '${connectorName}' in AST...

    try {
      // The issue is that we're looking at ComponentDef (definitions) but connectors 
      // are in component instances. Let's look at the AST structure to find instances.
      
      if (ast.involvedElements && Array.isArray(ast.involvedElements)) {
        console.log(`[DEBUG] AST.involvedElements has ${ast.involvedElements.length} elements`);
        
        for (const element of ast.involvedElements) {
          console.log(`[DEBUG] InvolvedElement: type=${element.type}, name=${element.name}`);
          
          // Look for component instances
          if (element.type === 'Component' && element.configuration) {
            console.log(`[DEBUG] Found component instance: ${element.name}`);
            console.log(`[DEBUG] Configuration keys:`, Object.keys(element.configuration));
            
            if (element.configuration.connectors) {
              console.log(`[DEBUG] Component instance ${element.name} has ${element.configuration.connectors.length} connectors`);
              
              for (const connector of element.configuration.connectors) {
                console.log(`[DEBUG] Connector: ${connector.name}`);
                if (connector.name === connectorName) {
                  // DEBUG: Found connector '${connectorName}' in instance ${element.name}!
                  return element.name; // Return the instance name where connector is defined
                }
              }
            }
            
            // Check nested components in the configuration
            if (element.configuration.components) {
              console.log(`[DEBUG] Component instance ${element.name} has ${element.configuration.components.length} nested components`);
              
              for (const nestedComp of element.configuration.components) {
                console.log(`[DEBUG] Nested component: ${nestedComp.name}`);
                const result = searchComponentInstanceForConnector(nestedComp, connectorName, [element.name, nestedComp.name]);
                if (result) {
                  console.log(`[DEBUG] Found connector '${connectorName}' at path: ${result.join('.')}`);
                  return result.join('.');
                }
              }
            }
          }
        }
      }

      console.log(`[DEBUG] No involvedElements or component instances found, falling back to definitions...`);
      
      // Fallback: search in component definitions (previous approach)
      if (ast.members && Array.isArray(ast.members)) {
        for (const member of ast.members) {
          if (member.type === 'Package' && member.definitions) {
            for (const definition of member.definitions) {
              if (definition.type === 'ComponentDef' && definition.composite) {
                const result = searchComponentForConnector(definition, connectorName, [definition.name]);
                if (result) {
                  return result;
                }
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('Error in AST connector placement analysis:', error);
    }

    console.log(`[DEBUG] Connector '${connectorName}' not found in AST`);
    return null;
  }

  // Helper function to search for connectors in a component instance
  function searchComponentInstanceForConnector(component, connectorName, path) {
    if (!component) return null;
    
    console.log(`[DEBUG] Searching in component instance ${component.name}, path: ${path.join('.')}`);
    
    // Check if this component instance has connectors
    if (component.connectors) {
      console.log(`[DEBUG] Component instance ${component.name} has ${component.connectors.length} connectors`);
      
      for (const connector of component.connectors) {
        console.log(`[DEBUG] Connector: ${connector.name}`);
        if (connector.name === connectorName) {
          console.log(`[DEBUG] Found connector '${connectorName}' in instance ${component.name}!`);
          return path; // Return the path where connector is defined
        }
      }
    }
    
    // Recursively search in nested component instances
    if (component.components) {
      console.log(`[DEBUG] Component instance ${component.name} has ${component.components.length} nested components`);
      
      for (const nestedComp of component.components) {
        console.log(`[DEBUG] Nested component: ${nestedComp.name}`);
        const result = searchComponentInstanceForConnector(nestedComp, connectorName, [...path, nestedComp.name]);
        if (result) return result;
      }
    }
    
    return null;
  }

  // Helper function to search for connectors in a component
  function searchComponentForConnector(component, connectorName, path) {
    if (!component) return null;
    
    console.log(`[DEBUG] Searching in component ${component.name}, path: ${path.join('.')}`);
    console.log(`[DEBUG] Component keys:`, Object.keys(component));
    
    // Check if this component has members (component's internal structure)
    if (component.members) {
      console.log(`[DEBUG] Component ${component.name} has ${component.members.length} members`);
      
      for (const member of component.members) {
        console.log(`[DEBUG] Member in ${component.name}: type=${member.type}, name=${member.name}`);
        
        // Check if this member is a connector
        if (member.type === 'Connector' && member.name === connectorName) {
          console.log(`[DEBUG] Found connector ${connectorName} in component ${component.name}!`);
          return path; // Return the path where connector is defined
        }
        
        // Recursively search in nested components
        if (member.type === 'ComponentDef' && member.composite) {
          console.log(`[DEBUG] Searching nested component: ${member.name}`);
          const result = searchComponentForConnector(member, connectorName, [...path, member.name]);
          if (result) return result;
        }
      }
    }
    
    // Also check if this component has a configuration with connectors (alternative structure)
    if (component.configuration) {
      console.log(`[DEBUG] Component ${component.name} has configuration, keys:`, Object.keys(component.configuration));
      
      if (component.configuration.connectors) {
        console.log(`[DEBUG] Component ${component.name} has ${component.configuration.connectors.length} connectors in configuration`);
        
        for (const connector of component.configuration.connectors) {
          console.log(`[DEBUG] Connector in ${component.name}: ${connector.name}`);
          if (connector.name === connectorName) {
            console.log(`[DEBUG] Found connector ${connectorName} in component ${component.name}!`);
            return path; // Return the path where connector is defined
          }
        }
      }
      
      // Recursively search in nested components
      if (component.configuration.components) {
        console.log(`[DEBUG] Component ${component.name} has ${component.configuration.components.length} nested components`);
        
        for (const nestedComp of component.configuration.components) {
          console.log(`[DEBUG] Nested component: ${nestedComp.name}`);
          const result = searchComponentForConnector(nestedComp, connectorName, [...path, nestedComp.name]);
          if (result) return result;
        }
      }
    }
    
    return null;
  }

  function findComponentDefinition(componentName) {
    if (!ast || !ast.packages) return null;

    try {
      for (const pkg of ast.packages) {
        if (pkg.definitions) {
          for (const definition of pkg.definitions) {
            if (definition.type === 'ComponentDef' && definition.name === componentName) {
              return definition;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error finding component definition:', error);
    }

    return null;
  }

  function searchComponentConfiguration(componentDef, connectorName, currentPath) {
    console.log(`[DEBUG] Searching in component '${componentDef.name}' with path: [${currentPath.join(', ')}]`);
    
    // First, recursively search in nested components
    if (componentDef.composite && componentDef.composite.components) {
      console.log(`[DEBUG] Component '${componentDef.name}' has nested components`);
      const componentsSection = componentDef.composite.components;
      for (const item of componentsSection) {
        if (Array.isArray(item)) {
          for (const subItem of item) {
            if (subItem?.type === 'ComponentUse') {
              console.log(`[DEBUG] Found nested component use: ${subItem.name} (type: ${subItem.definition})`);
              // Find the component definition for this component use
              const nestedComponentDef = findComponentDefinition(subItem.definition);
              if (nestedComponentDef) {
                const nestedPath = [...currentPath, subItem.name];
                console.log(`[DEBUG] Recursing into ${subItem.name} with path: [${nestedPath.join(', ')}]`);
                const result = searchComponentConfiguration(nestedComponentDef, connectorName, nestedPath);
                if (result) {
                  return result;
                }
              } else {
                console.log(`[DEBUG] Could not find definition for component ${subItem.definition}`);
              }
            }
          }
        }
      }
    } else {
      console.log(`[DEBUG] Component '${componentDef.name}' has no nested components`);
    }

    // Then check if this component's configuration defines our connector
    if (componentDef.composite && componentDef.composite.connectors) {
      console.log(`[DEBUG] Checking connectors in component '${componentDef.name}'`);
      const connectorsSection = componentDef.composite.connectors;
      if (configurationDefinesConnector(connectorsSection, connectorName)) {
        console.log(`[DEBUG] Found connector '${connectorName}' in component '${componentDef.name}'`);
        return formatConnectorPath(currentPath);
      }
    } else {
      console.log(`[DEBUG] Component '${componentDef.name}' has no connectors section`);
    }

    return null;
  }

  function configurationDefinesConnector(connectorsSection, connectorName) {
    if (!connectorsSection || !Array.isArray(connectorsSection)) return false;

    // Handle the mixed array structure from PEG parser
    for (const item of connectorsSection) {
      if (Array.isArray(item)) {
        for (const subItem of item) {
          if (subItem?.type === 'ConnectorUse' && subItem.name === connectorName) {
            return true;
          }
        }
      } else if (item?.type === 'ConnectorUse' && item.name === connectorName) {
        return true;
      }
    }

    return false;
  }

  function formatConnectorPath(componentPath) {
    // Convert component definition path to instance path format
    
    // Handle Simple model: ['SystemCP'] -> 'system'
    if (componentPath.length === 1 && componentPath[0] === 'SystemCP') {
      return 'system';
    }
    
    // Handle RTC model specific mappings
    if (componentPath.length === 1 && componentPath[0] === 'RTCSystemCFD') {
      return 'RTCSystemCFD';
    }
    
    if (componentPath.length === 2 && componentPath[0] === 'RTCSystemCFD' && componentPath[1] === 'rtc') {
      return 'RTCSystemCFD.rtc';
    }
    
    // Handle AGV model: ['SmartwatchSystemCFD'] -> 'SmartwatchSystemCFD'
    if (componentPath.length === 1 && componentPath[0] === 'SmartwatchSystemCFD') {
      return 'SmartwatchSystemCFD';
    }
    
    // Handle SmartPlace model: ['SmartPlaceCFD'] -> 'SmartPlaceCFD'  
    if (componentPath.length === 1 && componentPath[0] === 'SmartPlaceCFD') {
      return 'SmartPlaceCFD';
    }
    
    // For other hierarchies, map component definitions to their instance paths
    // This covers the general case where component path mirrors instance hierarchy
    return componentPath.join('.');
  }

  function findCommonParentPath(paths) {
    if (!paths || paths.length === 0) return null;
    if (paths.length === 1) {
      const parts = paths[0].split('.');
      return parts.length > 1 ? parts.slice(0, -1).join('.') : null;
    }
    
    // Split all paths into parts
    const pathParts = paths.map(path => path.split('.'));
    
    // Find shortest path length
    const minLength = Math.min(...pathParts.map(parts => parts.length));
    
    // Find common prefix - but we need to find the deepest common container
    let commonParts = [];
    for (let i = 0; i < minLength; i++) {
      const part = pathParts[0][i];
      if (pathParts.every(parts => parts[i] === part)) {
        commonParts.push(part);
      } else {
        break;
      }
    }
    
    // For connector ownership, we want the deepest common parent that can contain connectors
    // If all paths share a common root component, then that component should own the connectors
    const result = commonParts.length >= 2 ? commonParts.join('.') : null;
    return result;
  }
  
  // Helper function to determine the port class to use (PT_ class if available, otherwise Port)
  function getPortClass(portName, isComposite = false, portUse = null) {
    if (isComposite) {
      return 'CompositePort'; // CompositePort doesn't have PT_ variants for now
    }
    
    // Try to find port type from portUse context
    if (portUse) {
      try {
        // Check if the portUse has type information
        const portType = portUse.type || portUse.portType || 
                        (portUse.definition && portUse.definition.name) ||
                        portUse._portDefName || null;
        
        if (portType && embeddedTypes && embeddedTypes.ports && embeddedTypes.ports[portType]) {
          return getPackagePrefix(portType, 'PT') + portType;
        }
        
        // Check if portUse has a _portDefNode reference
        if (portUse._portDefNode && portUse._portDefNode.name) {
          const defName = portUse._portDefNode.name;
          if (embeddedTypes && embeddedTypes.ports && embeddedTypes.ports[defName]) {
            return getPackagePrefix(defName, 'PT') + defName;
          }
        }
      } catch(e) { /* ignore */ }
    }
    
    // Check if there's a port definition that matches this port name directly
    if (embeddedTypes && embeddedTypes.ports && embeddedTypes.ports[portName]) {
      return getPackagePrefix(portName, 'PT') + portName;
    }
    
    // Check if we can find a port definition by scanning portDefMap
    try {
      if (typeof portDefMapArg !== 'undefined' && portDefMapArg && portDefMapArg[portName]) {
        return getPackagePrefix(portName, 'PT') + portName;
      }
    } catch(e) { /* ignore */ }
    
    // Default to standard Port class
    return 'Port';
  }
  
  // Generate type classes using the new auto-registration system
  function generateTypeClasses(embeddedTypes, connectorDefMap) {
    const classLines = [];
    const t = embeddedTypes && typeof embeddedTypes === 'object' ? embeddedTypes : { datatypes: {}, valueTypes: {}, enumerations: {}, dimensions: {}, units: {}, pins: {}, constraints: {}, databuffers: {}, requirements: {}, ports: {} };

    // Define primitive types that are already imported from SysADLBase
    const primitiveTypes = new Set(['Int', 'Boolean', 'String', 'Real', 'Void']);

    // Check if we have any types to generate
    const hasTypes = Object.keys(t.dimensions || {}).length > 0 || 
                    Object.keys(t.units || {}).length > 0 ||
                    Object.keys(t.valueTypes || {}).length > 0 ||
                    Object.keys(t.enumerations || {}).length > 0 ||
                    Object.keys(t.datatypes || {}).length > 0;

    if (hasTypes) {
      classLines.push('// Types');
    }

    // Generate dimensions first (they may be referenced by units and value types)
    for (const [name, info] of Object.entries(t.dimensions || {})) {
      if (!name) continue;
      const prefixedName = getPackagePrefix(name, 'DM') + name;
      classLines.push(`const ${prefixedName} = dimension('${name}');`);
    }

    // Generate units (may reference dimensions)
    for (const [name, info] of Object.entries(t.units || {})) {
      if (!name) continue;
      const prefixedName = getPackagePrefix(name, 'UN') + name;
      const dimensionRef = info.dimension || null;
      const prefixedDimensionRef = dimensionRef ? (getPackagePrefix(dimensionRef, 'DM') + dimensionRef) : null;
      if (prefixedDimensionRef) {
        classLines.push(`const ${prefixedName} = unit('${name}', { dimension: ${prefixedDimensionRef} });`);
      } else {
        classLines.push(`const ${prefixedName} = unit('${name}');`);
      }
    }

    // Generate value types using new factory function (skip primitives)
    for (const [name, info] of Object.entries(t.valueTypes || {})) {
      if (!name) continue;
      
      // Skip primitive types - they are already imported from SysADLBase
      if (primitiveTypes.has(name)) {
        continue;
      }
      
      const prefixedName = getPackagePrefix(name, 'VT') + name;
      const superType = info.extends || null;
      const unitRef = info.unit || null;
      const dimensionRef = info.dimension || null;

      // Build config object with prefixed references
      const configParts = [];
      
      if (superType) {
        const prefixedSuperType = primitiveTypes.has(superType) ? superType : (getPackagePrefix(superType, 'VT') + superType);
        configParts.push(`extends: ${prefixedSuperType}`);
      }
      
      if (unitRef) {
        configParts.push(`unit: ${getPackagePrefix(unitRef, 'UN') + unitRef}`);
      }
      
      if (dimensionRef) {
        configParts.push(`dimension: ${getPackagePrefix(dimensionRef, 'DM') + dimensionRef}`);
      }

      const config = configParts.length > 0 ? `{ ${configParts.join(', ')} }` : '{}';
      classLines.push(`const ${prefixedName} = valueType('${name}', ${config});`);
    }

    // Generate enumerations
    for (const [name, literals] of Object.entries(t.enumerations || {})) {
      if (!name || !Array.isArray(literals)) continue;
      const prefixedName = getPackagePrefix(name, 'EN') + name;
      const enumCode = `const ${prefixedName} = new Enum(${literals.map(lit => `"${lit}"`).join(', ')});`;
      classLines.push(enumCode);
    }

    // Generate datatypes using new factory function with dependency ordering
    const datatypeNames = Object.keys(t.datatypes || {});
    const orderedDatatypes = orderDatatypesByDependencies(t.datatypes, datatypeNames);
    
    for (const name of orderedDatatypes) {
      if (!name) continue;
      const info = t.datatypes[name];
      const prefixedName = getPackagePrefix(name, 'DT') + name;
      const attributes = info.attributes || [];

      // Build attributes object with prefixed type references
      const attrParts = [];
      for (const attr of attributes) {
        if (!attr || !attr.name) continue;
        const attrName = attr.name;
        const attrType = attr.type;
        if (attrType) {
          // Apply appropriate prefix based on type, keep primitives unchanged
          let prefixedAttrType = attrType;
          if (!primitiveTypes.has(attrType)) {
            // Try to determine prefix based on context or use DT_ as default
            if (t.enumerations && t.enumerations[attrType]) {
              prefixedAttrType = getPackagePrefix(attrType, 'EN') + attrType;
            } else if (t.valueTypes && t.valueTypes[attrType]) {
              prefixedAttrType = getPackagePrefix(attrType, 'VT') + attrType;
            } else if (t.dimensions && t.dimensions[attrType]) {
              prefixedAttrType = getPackagePrefix(attrType, 'DM') + attrType;
            } else if (t.units && t.units[attrType]) {
              prefixedAttrType = getPackagePrefix(attrType, 'UN') + attrType;
            } else {
              // Default to datatype prefix
              prefixedAttrType = getPackagePrefix(attrType, 'DT') + attrType;
            }
          }
          attrParts.push(`${attrName}: ${prefixedAttrType}`);
        } else {
          attrParts.push(`${attrName}: null`);
        }
      }

      const attributesObj = attrParts.length > 0 ? `{ ${attrParts.join(', ')} }` : '{}';
      classLines.push(`const ${prefixedName} = dataType('${name}', ${attributesObj});`);
    }

    // Generate pins (not implemented in current version)
    for (const [name, info] of Object.entries(t.pins || {})) {
      if (!name) continue;
      const prefixedName = getPackagePrefix(name, 'PI') + name;
      classLines.push(`const ${prefixedName} = /* Pin implementation not available */ null;`);
    }

    // Generate constraints (handled by Constraint class)
    for (const [name, info] of Object.entries(t.constraints || {})) {
      if (!name) continue;
      const prefixedName = getPackagePrefix(name, 'CT') + name;
      classLines.push(`const ${prefixedName} = /* Constraint implementation via Constraint class */ null;`);
    }

    // Generate databuffers (not implemented in current version)
    for (const [name, info] of Object.entries(t.databuffers || {})) {
      if (!name) continue;
      const prefixedName = getPackagePrefix(name, 'DB') + name;
      classLines.push(`const ${prefixedName} = /* DataBuffer implementation not available */ null;`);
    }

    // Generate requirements (not implemented in current version)
    for (const [name, info] of Object.entries(t.requirements || {})) {
      if (!name) continue;
      const prefixedName = getPackagePrefix(name, 'RQ') + name;
      classLines.push(`const ${prefixedName} = /* Requirement implementation not available */ null;`);
    }

    // Add blank line between type declarations and port classes
    if (Object.keys(t.ports || {}).length > 0) {
      classLines.push('');
      classLines.push('// Ports');
    }

    // Generate port classes
    for (const [name, info] of Object.entries(t.ports || {})) {
      if (!name) continue;
      const prefixedName = getPackagePrefix(name, 'PT') + name;
      
      // Determine if this is a composite port based on structure, not naming patterns
      const isComposite = info.isComposite || 
                         (info.subports && Array.isArray(info.subports) && info.subports.length > 0);
      
      // Choose the base class based on port type
      const baseClass = isComposite ? 'CompositePort' : 'SimplePort';
      
      classLines.push(`class ${prefixedName} extends ${baseClass} {`);
      classLines.push(`  constructor(name, opts = {}) {`);
      
      if (isComposite) {
        // For composite ports, don't specify direction or expectedType - these are defined by subports
        classLines.push(`    super(name, 'composite', opts);`);
        
        // If this is a composite port with sub-ports, add them
        if (info.subports) {
          classLines.push(`    // Add sub-ports`);
          for (const [subportName, subportInfo] of Object.entries(info.subports)) {
            const subDirection = subportInfo.direction || 'in';
            const subExpectedType = subportInfo.expectedType || null;
            
            // Build sub-port config
            const subConfigParts = [];
            if (subExpectedType) {
              subConfigParts.push(`expectedType: ${JSON.stringify(subExpectedType)}`);
            }
            const subConfig = subConfigParts.length > 0 ? `{ ${subConfigParts.join(', ')} }` : '{}';
            
            classLines.push(`    this.addSubPort(${JSON.stringify(subportName)}, new SimplePort(${JSON.stringify(subportName)}, ${JSON.stringify(subDirection)}, { ...${subConfig}, owner: this.owner }));`);
          }
        }
      } else {
        // For simple ports, use direction and expectedType as before
        const direction = info.direction || 'in';
        const expectedType = info.expectedType || null;
        
        // Build config object for port
        const configParts = [];
        if (expectedType) {
          // Use string literal for expected type to avoid undefined reference issues
          configParts.push(`expectedType: ${JSON.stringify(expectedType)}`);
        }
        
        const config = configParts.length > 0 ? `{ ${configParts.join(', ')} }` : '{}';
        classLines.push(`    super(name, ${JSON.stringify(direction)}, { ...${config}, ...opts });`);
      }
      
      classLines.push(`  }`);
      classLines.push(`}`);
    }

    // Add blank line before connector classes
    if (connectorDefMap && Object.keys(connectorDefMap).length > 0) {
      classLines.push('');
      classLines.push('// Connectors');
      
      // Generate connector classes based on connector definitions
      for (const [name, connDef] of Object.entries(connectorDefMap)) {
        if (!name) continue;
        const prefixedName = getPackagePrefix(name, 'CN') + name;
        
        // Check if this is a composite connector (has configuration with connectors)
        const configuration = connDef.composite && connDef.composite[1] && connDef.composite[1].type === 'Configuration' 
                            ? connDef.composite[1] 
                            : null;
        // Extract actual connectors from the parser structure
        const connectorsArray = configuration && 
                               configuration.connectors && 
                               Array.isArray(configuration.connectors) && 
                               configuration.connectors.length >= 6 && 
                               Array.isArray(configuration.connectors[5])
                               ? configuration.connectors[5]
                               : [];
        const isComposite = connectorsArray.length > 0;
        
        classLines.push(`class ${prefixedName} extends Connector {`);
        
        if (isComposite) {
          // Extract participants from connector definition to determine port parameters
          const participants = connDef.ports || connDef.participants || [];
          const portParams = participants.length > 0 ? participants.map((p, index) => `port${index + 1}`).join(', ') : '';
          const portNames = participants.length > 0 ? participants.map((p, index) => `port${index + 1}`) : [];
          
          // Composite connector constructor with generic port parameters
          const constructorParams = portParams ? `name, ${portParams}, opts = {}` : 'name, opts = {}';
          classLines.push(`  constructor(${constructorParams}) {`);
          classLines.push(`    super(name, opts);`);
          classLines.push(`    // Composite connector with internal connectors`);
          
          // Store port references for binding
          portNames.forEach((portName, index) => {
            classLines.push(`    this.${portName} = ${portName};`);
          });
          
          for (const subConn of connectorsArray) {
            const subName = subConn.name;
            const subDef = subConn.definition;
            if (subName && subDef) {
              const subPrefixedName = getPackagePrefix(subDef, 'CN') + subDef;
              classLines.push(`    this.${subName} = new ${subPrefixedName}("${subName}");`);
            }
          }
          
          // Add binding logic for composite connectors
          classLines.push(`    `);
          classLines.push(`    // Extract sub-ports and bind to internal connectors`);
          
          // Always try to generate bindings, regardless of portNames availability
          // Use constructor parameters when available, otherwise detect dynamically
          const hasPortParams = portNames.length >= 2;
          
          if (hasPortParams) {
            classLines.push(`    if (${portNames.join(' && ')}) {`);
          } else {
            // Dynamic detection: assume constructor gets port parameters
            classLines.push(`    if (arguments.length > 1) {`);
            classLines.push(`      const portArgs = Array.from(arguments).slice(1, -1); // exclude name and opts`);
          }
          
          // Generic binding based on connector definition flows
          for (const subConn of connectorsArray) {
            const subName = subConn.name;
            const subDef = subConn.definition;
            
            if (subName && subDef && connectorDefMap && connectorDefMap[subDef]) {
              const subConnDef = connectorDefMap[subDef];
              
              // Try to extract flow information from the sub-connector definition
              if (subConnDef.flows && Array.isArray(subConnDef.flows)) {
                for (const flow of subConnDef.flows) {
                  if (flow.source && flow.destination) {
                    classLines.push(`      // ${subDef}: ${flow.source} -> ${flow.destination}`);
                    classLines.push(`      this.${subName}.bind(`);
                    
                    if (hasPortParams) {
                      // Use named port parameters
                      const sourcePortVar = portNames[0] || 'port1';
                      const destPortVar = portNames[1] || 'port2';
                      classLines.push(`        this.${sourcePortVar}.getSubPort('${flow.source}'),`);
                      classLines.push(`        this.${destPortVar}.getSubPort('${flow.destination}')`);
                    } else {
                      // Use dynamic port detection
                      classLines.push(`        portArgs[0] && portArgs[0].getSubPort('${flow.source}'),`);
                      classLines.push(`        portArgs[1] && portArgs[1].getSubPort('${flow.destination}')`);
                    }
                    classLines.push(`      );`);
                    break; // Use first flow for simplicity
                  }
                }
              } else {
                // Fallback: try to infer from participants
                if (subConnDef.participants && Array.isArray(subConnDef.participants)) {
                  const subParticipants = subConnDef.participants;
                  if (subParticipants.length >= 2) {
                    const part1 = subParticipants[0];
                    const part2 = subParticipants[1];
                    const port1Name = part1.name || part1.id || 'port1';
                    const port2Name = part2.name || part2.id || 'port2';
                    
                    classLines.push(`      // ${subDef}: ${port1Name} <-> ${port2Name}`);
                    classLines.push(`      this.${subName}.bind(`);
                    
                    if (hasPortParams) {
                      classLines.push(`        this.${portNames[0]}.getSubPort('${port1Name}'),`);
                      classLines.push(`        this.${portNames[1]}.getSubPort('${port2Name}')`);
                    } else {
                      classLines.push(`        portArgs[0] && portArgs[0].getSubPort('${port1Name}'),`);
                      classLines.push(`        portArgs[1] && portArgs[1].getSubPort('${port2Name}')`);
                    }
                    classLines.push(`      );`);
                  }
                }
              }
            }
          }
          classLines.push(`    }`);
          classLines.push(`    `);
          
          for (const subConn of connectorsArray) {
            const subName = subConn.name;
            classLines.push(`    this.connectors = this.connectors || {};`);
            classLines.push(`    this.connectors["${subName}"] = this.${subName};`);
          }
        } else {
          // Simple connector with schema-based initialization
          classLines.push(`  constructor(name, opts = {}) {`);
          
          // Check if this connector has an associated activity
          const activityName = getActivityForComponent(String(name));
          
          classLines.push(`    super(name, {`);
          classLines.push(`      ...opts,`);
          
          // Add activityName if the connector has an associated activity
          if (activityName) {
            classLines.push(`      activityName: "${activityName}",`);
          }
          
          // Generate participantSchema
          if ((connDef.ports || connDef.participants) && Array.isArray(connDef.ports || connDef.participants) && (connDef.ports || connDef.participants).length >= 2) {
            classLines.push(`      participantSchema: {`);
            
            (connDef.ports || connDef.participants).forEach((participant, index) => {
              const participantName = participant.name || participant.id || `participant${index}`;
              const portClass = getPackagePrefix(participant.definition || participant.type || participant.portType, 'PT') + (participant.definition || participant.type || participant.portType);
              
              // Determine direction based on participant role (isReverse means ~ in SysADL)
              const direction = participant.isReverse ? 'out' : 'in'; // reverse means ~ in SysADL
              const role = index === 0 ? 'source' : 'target';
              
              // Extract data type from flows or infer from port definition
              let dataType = 'any';
              if (connDef.flows && Array.isArray(connDef.flows) && connDef.flows.length > 0) {
                dataType = connDef.flows[0].flowType || connDef.flows[0].type || 'any';
              }
              
              classLines.push(`        ${participantName}: {`);
              classLines.push(`          portClass: '${portClass}',`);
              classLines.push(`          direction: '${direction}',`);
              classLines.push(`          dataType: '${dataType}',`);
              classLines.push(`          role: '${role}'`);
              classLines.push(`        }${index < (connDef.ports || connDef.participants).length - 1 ? ',' : ''}`);
            });
            
            classLines.push(`      },`);
          }
          
          // Generate flowSchema
          if (connDef.flows && Array.isArray(connDef.flows) && connDef.flows.length > 0) {
            classLines.push(`      flowSchema: [`);
            
            connDef.flows.forEach((flow, index) => {
              const fromParticipant = flow.source || ((connDef.ports || connDef.participants) && (connDef.ports || connDef.participants)[0] && ((connDef.ports || connDef.participants)[0].name || (connDef.ports || connDef.participants)[0].id)) || 'from';
              const toParticipant = flow.destination || ((connDef.ports || connDef.participants) && (connDef.ports || connDef.participants)[1] && ((connDef.ports || connDef.participants)[1].name || (connDef.ports || connDef.participants)[1].id)) || 'to';
              const dataType = flow.flowType || flow.type || 'any';
              
              classLines.push(`        {`);
              classLines.push(`          from: '${fromParticipant}',`);
              classLines.push(`          to: '${toParticipant}',`);
              classLines.push(`          dataType: '${dataType}'`);
              classLines.push(`        }${index < connDef.flows.length - 1 ? ',' : ''}`);
            });
            
            classLines.push(`      ]`);
          }
          
          classLines.push(`    });`);
        }
        
        classLines.push(`  }`);
        classLines.push(`}`);
      }
    }

    return classLines.join('\n');
  }
  
  // Generate type classes
  try {
    // Pass the actual connectorDefMap passed as parameter
    const typeClasses = generateTypeClasses(embeddedTypes, connectorDefMap);
    if (typeClasses.trim()) {
      lines.push(typeClasses);
    }
  } catch(e) {
    console.warn('Failed to generate type classes:', e.message);
  }
  // connectorDescriptors: normalized bindings may be provided in outer scope; if not, derive from parameter
  const connectorDescriptors = (typeof connectorBindings !== 'undefined' && connectorBindings) ? connectorBindings : [];
  const typeNames = new Set();
  try { if (typeof compDefMap !== 'undefined' && compDefMap) for (const k of Object.keys(compDefMap)) typeNames.add(k); } catch(e){}
  try {
    if (Array.isArray(compUses)) for (const cu of compUses) { if (cu && cu.definition) typeNames.add(String(cu.definition)); }
  } catch(e) {}
  // ensure any rootDefs types are emitted as classes as well
  try { if (Array.isArray(rootDefs)) for (const rd of rootDefs) if (rd) typeNames.add(String(rd)); } catch(e){}
  try { if (DBG) dbg('[DBG] typeNames:', JSON.stringify(Array.from(typeNames).slice(0,50))); } catch(e){}

  // Add blank line before component classes if there were any type classes
  const hasTypeClasses = Object.keys(embeddedTypes.ports || {}).length > 0 || 
                        Object.keys(embeddedTypes.datatypes || {}).length > 0 ||
                        Object.keys(embeddedTypes.enumerations || {}).length > 0 ||
                        Object.keys(embeddedTypes.valueTypes || {}).length > 0;
  if (hasTypeClasses && typeNames.size > 0) {
    lines.push("");
    lines.push("// Components");
  }
  
  // Build usingAliasMap from AST to resolve port aliases
  // This map stores: componentUseName -> { aliasPortName -> realPortName }
  const usingAliasMap = {};
  
  // Helper function to build the alias map by parsing component uses from source code
  function buildUsingAliasMap() {
    if (!sourceCode || !ast) return {};
    
    const src = sourceCode;
    const componentPortAliases = {}; // NEW: Map instance -> {originalPort -> alias}
    
    // Use existing component definition map (compDefMapArg) instead of building a new one
    // This is important because boundary components may be defined elsewhere
    const compDefMap = compDefMapArg || {};
    
    // Process each component use
    for (const cu of compUses) {
      const cuName = cu && (cu.name || cu.id || (cu.id && cu.id.name));
      if (!cuName) continue;
      
      usingAliasMap[cuName] = usingAliasMap[cuName] || {};
      componentPortAliases[cuName] = componentPortAliases[cuName] || {}; // NEW
      
      // Extract component block from source using brace counting
      const startRe = new RegExp(cuName + '\\s*:\\s*\\w+\\s*\\{', 'm');
      const startMatch = startRe.exec(src);
      if (!startMatch) continue;
      
      const startPos = startMatch.index + startMatch[0].length;
      let braceCount = 1;
      let endPos = startPos;
      
      while (endPos < src.length && braceCount > 0) {
        if (src[endPos] === '{') braceCount++;
        if (src[endPos] === '}') braceCount--;
        endPos++;
      }
      
      const componentBlock = src.substring(startPos, endPos - 1);
      
      // NEW: Extract port aliases from "using ports" block using brace counting
      // This improved version captures ALL ports even in multi-port blocks
      const parts = [];
      
      const usingPortsStart = /using\s+ports\s*:/i;
      const usingMatch = usingPortsStart.exec(componentBlock);
      
      if (usingMatch) {
        let scanPos = usingMatch.index + usingMatch[0].length;
        let portBraceDepth = 0;
        let portBlockEnd = scanPos;
        let lastPortEnd = scanPos;
        
        // Scan until we hit connectors/delegations at depth 0
        while (portBlockEnd < componentBlock.length) {
          const char = componentBlock[portBlockEnd];
          
          if (char === '{') {
            portBraceDepth++;
          } else if (char === '}') {
            portBraceDepth--;
          }
          
          // At depth 0, check if next non-whitespace is a keyword or another port
          if (portBraceDepth === 0) {
            const remaining = componentBlock.substring(portBlockEnd + 1);
            const trimmed = remaining.trimStart();
            
            // Check for structural keywords
            if (/^(connectors|delegations)\s*:/i.test(trimmed)) {
              portBlockEnd++;
              break;
            }
            
            // Check if we've hit the end of the component block (closing brace with nothing after)
            if (trimmed.length === 0 || trimmed[0] === '}') {
              portBlockEnd++;
              break;
            }
            
            // Otherwise, there might be another port, continue
            lastPortEnd = portBlockEnd + 1;
          }
          
          portBlockEnd++;
        }
        
        const portsList = componentBlock.substring(scanPos, portBlockEnd);
        
        // Extract each "alias : Type" pattern, ignoring everything else
        // This regex now only captures the port name and type, not the braces
        const portAliasRe = /([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_\.]+)/g;
        let portMatch;
        
        while ((portMatch = portAliasRe.exec(portsList)) !== null) {
          const portName = portMatch[1];
          const portType = portMatch[2];
          
          // Check if this is actually a port (not connectors: or delegations:)
          if (!/(connectors|delegations)/i.test(portName)) {
            parts.push(`${portName} : ${portType}`);
          }
        }
      }
      
      
      // Map each alias to actual port name from component definition
      const defName = cu.definition || cu.def || null;
      const defNode = defName ? (compDefMap[defName] || compDefMap[String(defName)]) : null;
      
      if (!defNode) {
        continue;
      }
      

      
      for (const p of parts) {
        const mm = p.match(/([A-Za-z0-9_\.]+)\s*:\s*([A-Za-z0-9_\.]+)/);
        if (!mm) continue;
        
        const alias = mm[1];
        const typeName = mm[2];
        
        let mappedPort = null;
        
        // Collect candidate ports from defNode
        const defPorts = [];
        if (Array.isArray(defNode.ports)) defPorts.push(...defNode.ports);
        if (Array.isArray(defNode.members)) defPorts.push(...defNode.members);
        
        const candidates = [];
        for (const dp of defPorts) {
          const dpName = dp && (dp.name || (dp.id && dp.id.name) || dp.id);
          if (!dpName) continue;
          
          // Try to get the port type - for PortUse, check dp.definition first
          const dpType = dp && (
            dp.definition ||  // For PortUse, this is the type name string
            dp.portType || 
            (dp.definition && dp.definition.name) || 
            dp.type || 
            dp.value || 
            dp.valueType || 
            dp.typeName
          );
          if (dpType) {
            const tstr = String(dpType).split('.').pop();
            const q = String(typeName).split('.').pop();
            if (String(dpType) === String(typeName) || tstr === q || q === tstr) {
              candidates.push(dpName);
            }
          }
        }
        
        if (candidates.length === 1) {
          mappedPort = candidates[0];
        } else if (!candidates.length && defPorts.length === 1) {
          const only = defPorts[0];
          const onlyName = only && (only.name || (only.id && only.id.name) || only.id);
          if (onlyName) mappedPort = onlyName;
        }
        
        if (cuName === 'as') {
        }
        
        usingAliasMap[cuName][alias] = mappedPort || null;
        
        // NEW: Store reverse mapping (originalPort -> alias) for port renaming
        if (mappedPort) {
          componentPortAliases[cuName][mappedPort] = alias;
        }
        
        if (cuName === 'as') {
        }
      }
    }
    
    return componentPortAliases; // NEW: Return the mapping
  }
  
  // NEW: Build port aliases map before generating component classes
  const componentPortAliases = buildUsingAliasMap();
  
  // NEW: Collect component delegations for automatic binding generation
  console.log('[DEBUG] Starting delegation collection...');
  console.log('[DEBUG] compDefMapArg keys:', Object.keys(compDefMapArg || {}).length);
  const componentDelegations = [];
  try {
    for (const defName of Object.keys(compDefMapArg || {})) {
      const defNode = compDefMapArg[defName];
      console.log(`[DEBUG] Processing component definition: ${defName}`);
      
      // Extract configurations for this component definition
      const cfgs = extractConfigurations(defNode) || [];
      console.log(`[DEBUG]   - Found ${cfgs.length} configurations`);
      if (cfgs.length === 0) continue;
      
      const cfgNode = cfgs[0]; // Use first configuration
      
      // Get all instances of this component definition
      const instances = compUses.filter(cu => cu.definition === defName);
      
      // Traverse configuration to find delegations
      console.log(`[DEBUG]   - Processing configuration for ${defName}, found ${instances.length} instances`);
      
      // Helper to recursively find delegation strings in nested structures
      const findDelegationStrings = (obj, depth = 0) => {
        const results = [];
        if (depth > 10) return results;  // Prevent infinite recursion
        
        if (typeof obj === 'string') {
          // Only match short strings that look like delegations (not entire file content)
          if (obj.length < 100 && !obj.includes('\n')) {
            const match = obj.match(/^([\w\.]+)\s+to\s+([\w\.]+)$/);
            if (match) {
              console.log(`[DEBUG]       - Matched delegation string: "${obj}" -> ${match[1]} to ${match[2]}`);
              results.push({ from: match[1], to: match[2] });
            }
          }
        } else if (Array.isArray(obj)) {
          for (const item of obj) {
            results.push(...findDelegationStrings(item, depth + 1));
          }
        } else if (obj && typeof obj === 'object') {
          // Check if this object IS a delegation (has type: 'delegation' or similar)
          if (obj.type === 'delegation' || obj.kind === 'delegation') {
            console.log(`[DEBUG]       - Found delegation object:`, JSON.stringify(obj));
            const from = obj.from || obj.left || obj.source || obj.fromPort;
            const to = obj.to || obj.right || obj.target || obj.toPort;
            if (from && to) {
              results.push({ from, to });
            }
          }
          
          for (const value of Object.values(obj)) {
            results.push(...findDelegationStrings(value, depth + 1));
          }
        }
        return results;
      };
      
      traverse(cfgNode, n => {
        if (Array.isArray(n.delegations) && n.delegations.length > 0) {
          console.log(`[DEBUG]   - Found delegations array in ${defName} with ${n.delegations.length} elements`);
          
          // Try to extract delegations from source text if available
          let foundDelegations = [];
          
          if (n.location && n.location.source && n.location.source.text) {
            const sourceText = n.location.source.text;
            
            // Find the configuration section with delegations for this specific component
            const componentPattern = new RegExp(
              `component\\s+def\\s+${defName}\\s*\\{[\\s\\S]*?configuration\\s*\\{[\\s\\S]*?delegations:\\s*([\\s\\S]*?)\\n\\s*\\}`,
              'm'
            );
            const match = componentPattern.exec(sourceText);
            
            if (match && match[1]) {
              const delegationsSection = match[1];
              console.log(`[DEBUG]   - Extracted delegations section from source (first 200 chars):`, delegationsSection.substring(0, 200));
              
              // Extract all "X to Y" patterns from this section
              const delegationPattern = /([\w\.]+)\s+to\s+([\w\.]+)/g;
              let delegMatch;
              
              while ((delegMatch = delegationPattern.exec(delegationsSection)) !== null) {
                foundDelegations.push({
                  from: delegMatch[1],
                  to: delegMatch[2]
                });
              }
              
              console.log(`[DEBUG]   - Extracted ${foundDelegations.length} delegations from source text`);
            }
          }
          
          // Fallback: try recursive search if source text extraction failed
          if (foundDelegations.length === 0) {
            foundDelegations = findDelegationStrings(n.delegations);
            console.log(`[DEBUG]   - Recursively found ${foundDelegations.length} delegations from AST`);
          }
          
          for (const del of foundDelegations) {
            console.log(`[DEBUG]     - Delegation: ${del.from} to ${del.to}`);
            
            // Record delegation for each instance of this component
            for (const inst of instances) {
              componentDelegations.push({
                componentDef: defName,
                owner: inst.name,
                from: del.from,
                to: del.to
              });
              console.log(`[DEBUG]     - Added delegation for instance ${inst.name}: ${del.from} -> ${del.to}`);
            }
          }
        }
      });
    }
    
    if (componentDelegations.length > 0) {
      console.log(`[Delegations] Found ${componentDelegations.length} component delegations to process`);
      for (const d of componentDelegations) {
        console.log(`  - ${d.owner}.${d.from} -> ${d.owner}.${d.to} (from ${d.componentDef})`);
      }
    }
  } catch (err) {
    console.warn('[Delegations] Error collecting component delegations:', err.message);
  }
  
  // Helper function to extract ports from ComponentDef
  function extractComponentDefPorts(compDefNode) {
    const ports = [];
    if (!compDefNode) return ports;
    
    // Look for ports in different possible locations
    const portSources = [
      compDefNode.ports,
      compDefNode.members,
      compDefNode.portDeclarations,
      compDefNode.portList
    ];
    
    for (const portSource of portSources) {
      if (Array.isArray(portSource)) {
        for (const port of portSource) {
          if (port && port.name) {
            const portName = port.name || (port.id && port.id.name) || port.id;
            const portType = port.definition || port.type || null;
            const portTypeStr = portType ? (portType.name || portType.id || String(portType)) : null;
            
            // Try to extract direction from port definition
            let direction = null;
            if (port.direction) {
              direction = port.direction;
            } else if (portType && portDefMapArg) {
              // Look up direction from port definition
              const portDef = portDefMapArg[String(portTypeStr)];
              if (portDef && (portDef.flow || portDef.flowProperties)) {
                const flow = String(portDef.flow || portDef.flowProperties).toLowerCase();
                if (flow.includes('inout')) direction = 'inout';
                else if (flow.includes('out')) direction = 'out';
                else if (flow.includes('in')) direction = 'in';
              }
            }
            
            if (portName && portTypeStr) {
              // Create a generic name mapping based on the port type
              let actualPortName = portName;
              
              // Generic algorithm: use first part of type + direction suffix if it matches a pattern
              if (portTypeStr.startsWith('I') && portTypeStr.includes('System')) {
                // For interface types ending in 'System', create a standard naming convention
                const baseName = portTypeStr.replace(/^I/, '').replace(/System$/, '');
                actualPortName = `in_outData${baseName.charAt(0).toUpperCase() + baseName.slice(1).substring(0, Math.min(baseName.length-1, 2))}`;
              }
              
              ports.push({
                name: actualPortName,
                type: portTypeStr,
                direction: direction
              });
            }
          }
        }
      }
    }
    
    return ports;
  }
  
  // Helper function to find activity for a component type
  function getActivityForComponent(componentType) {
    for (const a of activitiesToRegister) {
      const comp = a.descriptor && a.descriptor.component;
      if (comp === componentType) {
        return a.activityName;
      }
    }
    return null;
  }

  // create simple class per definition (if none, skip)
  for (const t of Array.from(typeNames)) {
    // if the component definition indicates boundary, propagate via opts to runtime
    const isBoundaryFlag = (typeof compDefMapArg !== 'undefined' && compDefMapArg && compDefMapArg[String(t)] && !!compDefMapArg[String(t)].isBoundary);
    
    // Get component definition to extract ports
    const compDefNode = (typeof compDefMapArg !== 'undefined' && compDefMapArg) ? compDefMapArg[String(t)] : null;
    const compPorts = extractComponentDefPorts(compDefNode);
    
    // Check if this component has an associated activity
    const activityName = getActivityForComponent(String(t));
    
    const prefixedClassName = getPackagePrefix(t, 'CP') + sanitizeId(String(t));
    
    // Always generate constructor if we have ports, boundary flag, or activity
    if (compPorts.length > 0 || isBoundaryFlag || activityName) {
      let ctorLines = [];
      ctorLines.push('constructor(name, opts={}) {');
      
      // Build the super() call with appropriate options
      let superOpts = [];
      if (isBoundaryFlag) superOpts.push('isBoundary: true');
      if (activityName) superOpts.push(`activityName: "${activityName}"`);
      
      if (superOpts.length > 0) {
        ctorLines.push(`    super(name, { ...opts, ${superOpts.join(', ')} });`);
      } else {
        ctorLines.push('    super(name, opts);');
      }
      
      if (compPorts.length > 0) {
        ctorLines.push('    // Add ports from component definition');
        ctorLines.push('    const portAliases = opts.portAliases || {};'); // NEW: Get aliases from options
        for (const port of compPorts) {
          const portTypeClass = getPackagePrefix(port.type, 'PT') + port.type;
          // NEW: Use alias name if provided, otherwise use original name
          ctorLines.push(`    const portName_${port.name} = portAliases["${port.name}"] || "${port.name}";`);
          ctorLines.push(`    this.addPort(new ${portTypeClass}(portName_${port.name}, { owner: name, originalName: "${port.name}" }));`);
        }
      }
      
      ctorLines.push('  }');
      const ctor = ctorLines.join('\n  ');
      
      lines.push(`class ${prefixedClassName} extends Component {`);
      lines.push(`  ${ctor}`);
      lines.push(`}`);
    } else {
      // No ports and not boundary - use simple class
      lines.push(`class ${prefixedClassName} extends Component { }`);
    }
  }
  lines.push('');

  // Generate behavioral classes after components
  lines.push('// ===== Behavioral Element Classes =====');
  lines.push(...generateBehavioralClasses());
  lines.push('// ===== End Behavioral Element Classes =====');
  lines.push('');

  // emit model class
  lines.push(`class ${sanitizeId(modelName)} extends Model {`);
  lines.push('  constructor(){');
  lines.push(`    super(${JSON.stringify(modelName)});`);
  

  // Instantiate components respecting hierarchical parents (rootDefs holds top-level composite types)
  // rootDefs: array of type names to create at model root (e.g. main component definitions)
  // parentMap: map instanceName -> parentPath (e.g. { childInstance: 'this.ParentComponent' })
  const compMap = {};
  // create root composite instances
  if (Array.isArray(rootDefs)) {
    for (const rdef of rootDefs) {
      if (!rdef) continue;
      const prop = sanitizeId(String(rdef));
  // determine opts for root def if available
  const rootIsBoundary = (compDefMapArg && compDefMapArg[String(rdef)] && !!compDefMapArg[String(rdef)].isBoundary);
  const rootOpts = rootIsBoundary ? `{ isBoundary: true, sysadlDefinition: ${JSON.stringify(String(rdef))} }` : `{ sysadlDefinition: ${JSON.stringify(String(rdef))} }`;
  lines.push(`    this.${prop} = new ${getPackagePrefix(rdef, 'CP') + sanitizeId(String(rdef))}(${JSON.stringify(String(rdef))}, ${rootOpts});`);
  lines.push(`    this.addComponent(this.${prop});`);
    }
  }

  // create all other instances and attach to parents when possible
  // emit instances in top-down order (parents before children) to avoid assigning
  // properties on undefined intermediate objects
  const instances = [];
  for (const cu of compUses) {
    const iname = cu && (cu.name || cu.id || (cu.id && cu.id.name)) ? (cu.name || (cu.id && cu.id.name) || cu.id) : null;
    if (!iname) continue;
    // skip if this instance name collides with a root def property we already created
    if (Array.isArray(rootDefs) && rootDefs.includes(String(iname))) continue;
    const defType = cu.definition || (compInstanceDef && compInstanceDef[iname]) || null;
    const typeCls = defType ? sanitizeId(String(defType)) : 'Component';
    const parentPath = parentMap && parentMap[iname] ? parentMap[iname] : null;
    instances.push({ name: iname, typeCls, parentPath });
  }

  // compute a shallow depth for each instance based on parentPath (fewer segments -> closer to root)
  function depthFor(item) {
    if (!item.parentPath) return 0;
    // count '.' separators to approximate nesting depth (this.<A>.<B> -> depth 2)
    return (item.parentPath.match(/\./g) || []).length;
  }

  instances.sort((a,b) => {
    const da = depthFor(a); const db = depthFor(b);
    if (da !== db) return da - db;
    return String(a.name).localeCompare(String(b.name));
  });

  for (const it of instances) {
    const iname = it.name; const typeCls = it.typeCls; const parentPath = it.parentPath;
    if (parentPath) {
      // attach under parentPath, e.g. this.ParentComponent.childInstance
  const instDef = (compInstanceDef && compInstanceDef[iname]) ? compInstanceDef[iname] : null;
  const instIsBoundary = (instDef && compDefMapArg && compDefMapArg[String(instDef)] && !!compDefMapArg[String(instDef)].isBoundary);
  // NEW: Add portAliases to options if this instance has any
  const portAliasesForInst = componentPortAliases[iname] || null;
  const portAliasesOpt = portAliasesForInst ? `, portAliases: ${JSON.stringify(portAliasesForInst)}` : '';
  const instOpts = instIsBoundary 
    ? `{ isBoundary: true, sysadlDefinition: ${JSON.stringify(String(instDef))}${portAliasesOpt} }` 
    : `{ sysadlDefinition: ${instDef ? JSON.stringify(String(instDef)) : 'null'}${portAliasesOpt} }`;
  lines.push(`    ${parentPath}.${iname} = new ${getPackagePrefix(typeCls, 'CP') + typeCls}(${JSON.stringify(String(iname))}, ${instOpts});`);
  lines.push(`    ${parentPath}.addComponent(${parentPath}.${iname});`);
    } else {
      // fallback to previous behavior: top-level instance
  const instDef = (compInstanceDef && compInstanceDef[iname]) ? compInstanceDef[iname] : null;
  const instIsBoundary = (instDef && compDefMapArg && compDefMapArg[String(instDef)] && !!compDefMapArg[String(instDef)].isBoundary);
  // NEW: Add portAliases to options if this instance has any
  const portAliasesForInst = componentPortAliases[iname] || null;
  const portAliasesOpt = portAliasesForInst ? `, portAliases: ${JSON.stringify(portAliasesForInst)}` : '';
  const instOpts = instIsBoundary 
    ? `{ isBoundary: true, sysadlDefinition: ${JSON.stringify(String(instDef))}${portAliasesOpt} }` 
    : `{ sysadlDefinition: ${instDef ? JSON.stringify(String(instDef)) : 'null'}${portAliasesOpt} }`;
  lines.push(`    this.${iname} = new ${getPackagePrefix(typeCls, 'CP') + typeCls}(${JSON.stringify(String(iname))}, ${instOpts});`);
  lines.push(`    this.addComponent(this.${iname});`);
    }
  }

  // generated code uses runtime-safe helpers exposed by SysADLBase
  lines.push('');

  // build instance path map (instanceName -> expression to reference it in generated code)
  const instancePathMap = {};
  // rootDefs created as this.<TypeName> (prop name is sanitized type)
  if (Array.isArray(rootDefs)) for (const r of rootDefs) if (r) instancePathMap[r] = `this.${sanitizeId(String(r))}`;
  // for declared instances in compUses, prefer parentMap mapping
  for (const cu of compUses) {
    const iname = cu && (cu.name || cu.id || (cu.id && cu.id.name)) ? (cu.name || (cu.id && cu.id.name) || cu.id) : null;
    if (!iname) continue;
    if (parentMap && parentMap[iname]) instancePathMap[iname] = parentMap[iname] + `.${iname}`;
    else instancePathMap[iname] = `this.${iname}`;
  }

  // emit connectors early (right after components are added)
  if (Array.isArray(connectorDescriptors) && connectorDescriptors.length) {
    // Filter to include only connectors defined in the SysADL (exclude auto-generated ones)
    const filteredConnectors = connectorDescriptors.filter(cb => {
      // Include only connectors with explicit names from SysADL
      return cb.name && cb.name.length > 0;
    });
    
    if (filteredConnectors.length > 0) {
      // Avoid duplicate connectors with same name + class, prioritizing those with explicit owners
      const connectorMap = new Map();
      
      // Sort connectors to process those with specific owners first
      const sortedConnectors = filteredConnectors.sort((a, b) => {
        const aHasOwner = a.owner && a.owner.length > 0;
        const bHasOwner = b.owner && b.owner.length > 0;
        
        // Process connectors with owners first
        if (aHasOwner && !bHasOwner) return -1;
        if (!aHasOwner && bHasOwner) return 1;
        return 0;
      });
      
      // First pass: collect all connectors with deduplication that prevents incorrect promotion
      for (const cb of sortedConnectors) {
        const cname = cb.name; // cb.name is guaranteed to exist due to filtering
        const connectorDef = cb.definition || null;
        const connectorClass = connectorDef ? (getPackagePrefix(connectorDef, 'CN') + connectorDef) : 'Connector';
        
        // Create a more specific key that prevents conflicts between specific and generic connectors
        const ownerKey = cb.owner || 'main';
        const fullKey = `${connectorClass}::${cname}::${ownerKey}`;
        const hasOwner = cb.owner && cb.owner.length > 0;
        
        // DEBUG for AGV problematic connectors
        // if (cname === 'arrived' || cname === 'ackArm') {
        //   console.log(`DEBUG ${cname}: owner="${cb.owner}", definition=${connectorDef}, fullKey=${fullKey}`);
        // }
        
        // DEBUG for SmartPlace rn connector
        // if (cname === 'rn') {
        //   console.log(`DEBUG rn: found - owner="${cb.owner || 'main'}", definition=${connectorDef}`);
        //   console.log(`DEBUG rn: cb.bindings=`, cb.bindings);
        //   console.log(`DEBUG rn: raw cb=`, JSON.stringify(cb, null, 2));
        // }
        
        // Also check for conflicts with same connector name but different owners
        const nameKey = `${connectorClass}::${cname}`;
        const existingWithSameName = Array.from(connectorMap.values()).find(existing => 
          existing.name === cname && existing.definition === connectorDef
        );
        
        if (existingWithSameName) {
          // If we have an existing connector with the same name and definition,
          // we need intelligent conflict resolution
          
          // if (cname === 'rn') {
          //   console.log(`DEBUG rn: conflict detected - existing owner="${existingWithSameName.owner || 'main'}", current owner="${cb.owner || 'main'}"`);
          // }
          
          const existingHasOwner = existingWithSameName.owner && existingWithSameName.owner.length > 0;
          const currentHasOwner = hasOwner;
          
          // Check if these are EXACTLY the same connector (same bindings/definition)
          const sameDefinition = existingWithSameName.definition === cb.definition;
          
          // Compare actual bindings from _node structure
          const existingBindingsStr = JSON.stringify(existingWithSameName._node?.bindings || []);
          const currentBindingsStr = JSON.stringify(cb._node?.bindings || []);
          const sameBindings = existingBindingsStr === currentBindingsStr;
          
          const exactDuplicate = sameDefinition && sameBindings;
          
          // if (cname === 'rn') {
          //   console.log(`DEBUG rn: exactDuplicate=${exactDuplicate}, sameDefinition=${sameDefinition}, sameBindings=${sameBindings}`);
          //   console.log(`DEBUG rn: existing bindings (length=${existingBindingsStr.length}):`, existingBindingsStr.substring(0, 200));
          //   console.log(`DEBUG rn: current bindings (length=${currentBindingsStr.length}):`, currentBindingsStr.substring(0, 200));
          // }
          
          // Strategy: If we have exact duplicates with different owners,
          // prefer specific owner over empty owner
          if (exactDuplicate && existingHasOwner && !currentHasOwner) {
            // Skip the generic one since we have a specific one (AGV case)
            // if (cname === 'arrived' || cname === 'ackArm' || cname === 'rn') {
            //   console.log(`DEBUG ${cname}: skipping generic (empty owner), keeping specific owner ${existingWithSameName.owner}`);
            // }
            continue;
          } else if (exactDuplicate && !existingHasOwner && currentHasOwner) {
            // Replace the generic one with the specific one (AGV case)
            const existingKey = `${connectorClass}::${cname}::${existingWithSameName.owner || 'main'}`;
            connectorMap.delete(existingKey);
            connectorMap.set(fullKey, cb);
            // if (cname === 'arrived' || cname === 'ackArm' || cname === 'rn') {
            //   console.log(`DEBUG ${cname}: replaced generic with specific owner ${cb.owner}`);
            // }
          } else {
            // Different bindings/definitions or both have owners - legitimate different connectors (SmartPlace case)
            const existing = connectorMap.get(fullKey);
            if (existing) {
              // if (cname === 'rn') {
              //   console.log(`DEBUG ${cname}: skipping exact duplicate with same key`);
              // }
              continue; // Skip exact duplicate
            }
            connectorMap.set(fullKey, cb);
            // if (cname === 'rn') {
            //   console.log(`DEBUG ${cname}: added different component connector - owner=${cb.owner || 'main'}, bindings=${JSON.stringify(cb.bindings)}`);
            // }
          }
        } else {
          // No conflict with same name, just add it
          const existing = connectorMap.get(fullKey);
          if (existing) {
            continue; // Skip duplicate
          }
          connectorMap.set(fullKey, cb);
          // if (cname === 'rn') {
          //   console.log(`DEBUG ${cname}: added new connector - owner=${cb.owner || 'main'}`);
          // }
        }
      }
      
      // Track JavaScript variable names to avoid conflicts with sequential numbering
      const jsVariableNames = new Map(); // name -> count
      
      // Second pass: process the final selected connectors
      for (const cb of connectorMap.values()) {
        const cname = cb.name; // cb.name is guaranteed to exist due to filtering
        
        // Generate unique JavaScript variable name with sequential numbering for duplicates
        let jsVarName = cname;
        if (jsVariableNames.has(cname)) {
          const count = jsVariableNames.get(cname) + 1;
          jsVariableNames.set(cname, count);
          jsVarName = `${cname}_${count}`;
        } else {
          jsVariableNames.set(cname, 1);
        }
        
        // Determine the connector class to use based on definition
        const connectorDef = cb.definition || null;
        const connectorClass = connectorDef ? (getPackagePrefix(connectorDef, 'CN') + connectorDef) : 'Connector';
        
        // Determine which component should own this connector
        // Use the original owner information from where the connector was defined
        let connectorOwner = null;
        
        // Priority 1: Use the explicit owner information from the connectorBinding
        if (cb.owner && cb.owner.length > 0) {
          // The connector was defined inside a specific component
          if (instancePathMap[cb.owner]) {
            connectorOwner = instancePathMap[cb.owner];
          }
        }
        
        // Priority 2: Fallback logic - only for connectors that truly have no explicit owner
        // Skip fallback if the connector seems to belong to a specific nested component
        if (!connectorOwner && instancePathMap) {
          // Only apply fallback if the connector doesn't have contextual information suggesting a specific owner
          // This prevents promoting sub-component connectors to the main component
          const componentPaths = Object.values(instancePathMap);
          
          if (componentPaths.length > 0) {
            // Only use main component fallback for top-level connectors without any owner hints
            // This is more restrictive to avoid incorrect promotion
            const mainComponents = componentPaths.filter(path => path.split('.').length === 2);
            if (mainComponents.length > 0) {
              // Additional check: only use fallback if this seems like a genuine top-level connector
              // based on the fact that it has no owner information at all
              if (!cb.owner || cb.owner.length === 0) {
                connectorOwner = mainComponents[0];
              }
            }
          }
        }
        
        // Skip this connector if no valid component owner was found
        if (!connectorOwner) {
          continue;
        }
        
        // Validate that the connectorOwner path exists in instancePathMap
        const ownerExists = Object.values(instancePathMap).includes(connectorOwner);
        if (!ownerExists) {
          // Try to find a valid component instead
          const componentPaths = Object.values(instancePathMap);
          if (componentPaths.length > 0) {
            // Use the first available component instead
            connectorOwner = componentPaths[0];
          } else {
            // Skip this connector if no components available
            continue;
          }
        }
        
        // Generate connector instantiation with appropriate parameters
        let connectorInstantiation = '';
        
        // Extract bindings from the correct location
        let actualBindings = cb.bindings || [];
        if ((!actualBindings || actualBindings.length === 0) && cb._node && cb._node.bindings) {
          // Try to extract from _node.bindings structure
          const nodeBindings = cb._node.bindings;
          if (Array.isArray(nodeBindings) && nodeBindings.length > 2 && nodeBindings[2] && nodeBindings[2].items) {
            actualBindings = nodeBindings[2].items.map(item => ({
              source: item.source,
              destination: item.destination,
              left: item.source,
              right: item.destination
            }));
          }
        }
        
        // Check if this is a composite or simple connector
        if (cb.definition && connectorDefMap && connectorDefMap[cb.definition]) {
          const connDef = connectorDefMap[cb.definition];
          const isComposite = connDef.connectors && Array.isArray(connDef.connectors) && connDef.connectors.length > 0;
          
          if (isComposite) {
            // For composite connectors, we need to pass the bound ports
            // Look for the bindings to determine which ports to use
            if (actualBindings && actualBindings.length > 0) {
              // Collect all unique port references from bindings
              const portAccesses = [];
              const seenPorts = new Set();
              
              for (const binding of actualBindings) {
                // Extract port information from binding
                const sources = [];
                const destinations = [];
                
                // Check various binding formats
                if (binding.from) {
                  const owner = binding.from.owner || 'this';
                  const port = binding.from.interface || binding.source || binding.left;
                  if (port) sources.push({owner, port});
                }
                if (binding.to) {
                  const owner = binding.to.owner || 'this';
                  const port = binding.to.interface || binding.destination || binding.right;
                  if (port) destinations.push({owner, port});
                }
                
                // Fallback: direct source/destination
                if (binding.source && !sources.length) {
                  sources.push({owner: 'this', port: binding.source});
                }
                if (binding.destination && !destinations.length) {
                  destinations.push({owner: 'this', port: binding.destination});
                }
                
                // Add unique port accesses
                [...sources, ...destinations].forEach(({owner, port}) => {
                  const portKey = `${owner}.${port}`;
                  if (!seenPorts.has(portKey)) {
                    seenPorts.add(portKey);
                    // Fix the port access to use the correct context
                    // If owner is 'this' but we're inside a component context, use the actual component owner
                    let portAccess;
                    if (owner === 'this') {
                      // Use the connector owner context instead of 'this'
                      portAccess = `${connectorOwner}.getPort("${port}")`;
                    } else {
                      portAccess = `${owner}.getPort("${port}")`;
                    }
                    portAccesses.push(portAccess);
                  }
                });
              }
              
              // Use all collected port accesses as constructor parameters
              const portParams = portAccesses.join(', ');
              connectorInstantiation = `new ${connectorClass}(${JSON.stringify(cname)}, ${portParams})`;
            } else {
              // Fallback for composite without clear bindings
              connectorInstantiation = `new ${connectorClass}(${JSON.stringify(cname)})`;
            }
          } else {
            // For simple connectors, try to extract from/to ports
            if (actualBindings && actualBindings.length > 0) {
              const binding = actualBindings[0];
              
              // For simple connectors, the binding contains source and destination
              if (binding.source && binding.destination) {
                const fromPort = binding.source;
                const toPort = binding.destination;
                
                // Build port access expressions generically
                let fromAccess, toAccess;
                
                // Generic mapping function that uses available context information
                // IMPROVED 3-STEP ALGORITHM:
                // Step 1: Check if portName is an ALIAS in componentPortAliases
                // Step 2: Check if portName is an ORIGINAL NAME in component definitions
                // Step 3: Fallback to current level
                const findComponentForPort = (portName, isSource = true) => {
                  
                  // STEP 1: Search componentPortAliases for instances that have this ALIAS
                  if (componentPortAliases && Object.keys(componentPortAliases).length > 0) {
                    for (const [instanceName, aliasMap] of Object.entries(componentPortAliases)) {
                      // aliasMap is { originalPort -> alias }
                      // We need to check if any alias matches our portName
                      for (const [originalPort, alias] of Object.entries(aliasMap)) {
                        if (alias === portName) {
                          // Found! portName is an alias for originalPort in instanceName
                          const instancePath = instancePathMap[instanceName];
                          if (instancePath) {
                            // Port was created with alias name (Solution 2), so use alias
                            return `${instancePath}.getPort("${alias}")`;
                          }
                        }
                      }
                    }
                  }
                  
                  // STEP 2: Search component definitions for instances that have this ORIGINAL PORT NAME
                  if (instancePathMap && compUses) {
                    for (const compUse of compUses) {
                      const instanceName = compUse.name || compUse.id || (compUse.id && compUse.id.name);
                      if (!instanceName) continue;
                      
                      const instancePath = instancePathMap[instanceName];
                      if (!instancePath) continue;
                      
                      // Get component definition
                      const compDefName = compUse.definition || compUse.type;
                      if (!compDefName || !compDefMapArg || !compDefMapArg[compDefName]) continue;
                      
                      const compDef = compDefMapArg[compDefName];
                      if (!compDef.ports) continue;
                      
                      // Check if this component definition has a port with original name = portName
                      for (const defPort of compDef.ports) {
                        const defPortName = defPort.name || defPort.id || (defPort.id && defPort.id.name);
                        if (defPortName === portName) {
                          // Found! portName is an original port name in this component
                          // Check if this instance has an alias for this port
                          if (componentPortAliases[instanceName] && componentPortAliases[instanceName][portName]) {
                            // Instance has alias, use it (ports created with alias names)
                            const alias = componentPortAliases[instanceName][portName];
                            return `${instancePath}.getPort("${alias}")`;
                          } else {
                            // Instance has no alias, use original name
                            return `${instancePath}.getPort("${portName}")`;
                          }
                        }
                      }
                    }
                  }
                  
                  // STEP 3: Fallback - assume it's a port at the connector owner level
                  const ownerBase = connectorOwner.split('.').slice(0, -1).join('.') || 'this';
                  return `${ownerBase}.getPort("${portName}")`;
                };
                
                fromAccess = findComponentForPort(fromPort, true);
                toAccess = findComponentForPort(toPort, false);
                
                connectorInstantiation = `new ${connectorClass}(${JSON.stringify(cname)})`;
                
                // Add binding after connector creation
                if (fromAccess && toAccess) {
                  lines.push(`    ${connectorOwner}.addConnector(${connectorInstantiation});`);
                  lines.push(`    const ${jsVarName} = ${connectorOwner}.connectors[${JSON.stringify(cname)}];`);
                  lines.push(`    ${jsVarName}.bind(${fromAccess}, ${toAccess});`);
                  continue; // Skip the normal addConnector call
                }
              } else {
                // Fallback for simple without clear from/to
                connectorInstantiation = `new ${connectorClass}(${JSON.stringify(cname)})`;
              }
            } else {
              // No bindings available
              connectorInstantiation = `new ${connectorClass}(${JSON.stringify(cname)})`;
            }
          }
        } else {
          // No definition found, use basic constructor
          connectorInstantiation = `new ${connectorClass}(${JSON.stringify(cname)})`;
        }
        
        // Add connector to the appropriate component
        lines.push(`    ${connectorOwner}.addConnector(${connectorInstantiation});`);
      }
      
      lines.push('');
    }
  }

  // NEW: Generate delegation bindings for component delegations
  // These create implicit connectors that forward ports from inner components to outer components
  console.log('[Delegation Generation] lines.length BEFORE:', lines.length);
  console.log('[Delegation Generation] Processing', componentDelegations.length, 'delegations...');
  if (Array.isArray(componentDelegations) && componentDelegations.length > 0) {
    try {
      for (const delegation of componentDelegations) {
        console.log('[Delegation Generation] Processing delegation:', delegation);
        try {
          const { owner, from, to } = delegation;
          console.log('[Delegation Generation]   owner:', owner, 'from:', from, 'to:', to);
          if (!owner || !from || !to) {
            console.log('[Delegation Generation]   SKIP: Missing owner/from/to');
            continue;
          }
          
          console.log('[Delegation Generation]   About to find ownerPath...');
          // Find the full path to the owning component instance
          let ownerPath = null;
          try {
            const paths = Object.entries(instancePathMap || {});
            console.log('[Delegation Generation]   instancePathMap has', paths.length, 'entries');
            for (const [instanceName, fullPath] of paths) {
              if (instanceName === owner || fullPath.endsWith('.' + owner)) {
                ownerPath = fullPath;
                console.log('[Delegation Generation]   FOUND ownerPath:', ownerPath);
                break;
              }
            }
            if (!ownerPath) {
              ownerPath = owner;
              console.log('[Delegation Generation]   NO MATCH - using owner as is:', ownerPath);
            }
          } catch(e) {
            console.log('[Delegation Generation]   ERROR finding ownerPath:', e.message);
            ownerPath = owner;
          }
          console.log('[Delegation Generation]   ownerPath resolved:', ownerPath);
          
          // Determine which component in the path has the 'from' port
          // The 'from' port is in a sub-component of 'owner'
          // We need to find which sub-component has this port
          let fromComponentPath = null;
          let fromPortName = from;
          
          console.log('[Delegation Generation]   Looking for from port:', from);
          // Check if 'from' contains a dot (e.g., "na.arrivedStatus")
          if (from.includes('.')) {
            const parts = from.split('.');
            fromComponentPath = `${ownerPath}.${parts[0]}`;
            fromPortName = parts.slice(1).join('.');
            console.log('[Delegation Generation]   From has dot - fromComponentPath:', fromComponentPath, 'fromPortName:', fromPortName);
          } else {
            console.log('[Delegation Generation]   From has NO dot - searching in sub-components...');
            // Search for sub-component that has this port
            const ownerDefName = compInstanceDef[owner];
            console.log('[Delegation Generation]   owner:', owner, 'ownerDefName:', ownerDefName);
            if (ownerDefName) {
              const ownerDef = compDefMapArg ? compDefMapArg[String(ownerDefName)] : null;
              console.log('[Delegation Generation]   ownerDef found:', !!ownerDef);
              if (ownerDef) {
                const cfgs = extractConfigurations(ownerDef) || [];
                console.log('[Delegation Generation]   configurations count:', cfgs.length);
                if (cfgs.length > 0) {
                  const cfgNode = cfgs[0];
                  // Find component uses in configuration
                  traverse(cfgNode, n => {
                    if (n && n.type === 'ComponentUse') {
                      const subCompName = n.name || (n.id && n.id.name) || n.id;
                      if (subCompName) {
                        // Check if this sub-component has the 'from' port in portAliases
                        const aliasMap = componentPortAliases[subCompName] || {};
                        for (const [originalPort, alias] of Object.entries(aliasMap)) {
                          if (alias === from || originalPort === from) {
                            fromComponentPath = `${ownerPath}.${subCompName}`;
                            fromPortName = alias; // Use the alias
                            return;
                          }
                        }
                      }
                    }
                  });
                }
              }
            }
          }
          
          // If we still don't have fromComponentPath, skip this delegation
          if (!fromComponentPath) {
            console.log('[Delegation Generation]   SKIP: Could not find component with port "' + from + '" for delegation in "' + owner + '"');
            try { if (DBG) dbg(`[WARN] Could not find component with port "${from}" for delegation in "${owner}"`); } catch(e){}
            continue;
          }
          
          console.log('[Delegation Generation]   fromComponentPath:', fromComponentPath, 'fromPortName:', fromPortName);
          
          // The 'to' port is on the owner component itself
          const toComponentPath = ownerPath;
          const toPortName = to;
          
          // Infer connector type from port types
          // We need to find the port definition to determine the connector type
          let connectorType = 'Connector'; // Default generic connector
          
          // Try to infer from port definitions
          try {
            // Look for the 'from' port type in component definition
            const fromCompDef = compInstanceDef[fromComponentPath.split('.').pop()];
            if (fromCompDef) {
              const fromDefNode = compDefMap[fromCompDef];
              if (fromDefNode && fromDefNode.ports) {
                const fromPort = fromDefNode.ports.find(p => {
                  const pn = p && (p.name || (p.id && p.id.name) || p.id);
                  return pn === fromPortName || pn === from;
                });
                if (fromPort) {
                  const portTypeName = fromPort.definition || fromPort.type || fromPort.portType;
                  if (portTypeName) {
                    // Map port type to connector type (heuristic)
                    // For example: outNotificationToSupervisory -> notifySupervisory connector
                    const typeStr = String(portTypeName);
                    // Try to find a matching connector definition
                    for (const connDefName of Object.keys(connectorDefMap || {})) {
                      // Simple heuristic: connector name contains similar words
                      if (typeStr.toLowerCase().includes(connDefName.toLowerCase()) ||
                          connDefName.toLowerCase().includes(typeStr.toLowerCase().replace(/^(in|out)/, ''))) {
                        connectorType = getPackagePrefix(connDefName, 'CN') + connDefName;
                        break;
                      }
                    }
                  }
                }
              }
            }
          } catch(e) {
            // If we can't infer, use generic connector
          }
          
          // Generate unique delegation connector name
          const delegationName = `delegation_${from.replace(/\./g, '_')}_to_${to.replace(/\./g, '_')}`;
          
          console.log('[Delegation Generation] Creating connector:', delegationName);
          console.log('[Delegation Generation]   From:', fromComponentPath, '.getPort("' + fromPortName + '")');
          console.log('[Delegation Generation]   To:', toComponentPath, '.getPort("' + toPortName + '")');
          
          // Generate connector instantiation and binding
          lines.push(`    // Delegation: ${from} to ${to} in ${owner}`);
          lines.push(`    ${toComponentPath}.addConnector(new ${connectorType}("${delegationName}"));`);
          lines.push(`    const ${delegationName} = ${toComponentPath}.connectors["${delegationName}"];`);
          lines.push(`    ${delegationName}.bind(${fromComponentPath}.getPort("${fromPortName}"), ${toComponentPath}.getPort("${toPortName}"));`);
          console.log('[Delegation Generation] ✓ Generated binding for', delegationName);
          console.log('[Delegation Generation] ✓ PUSHED 4 LINES TO OUTPUT');
        } catch(e) {
          try { if (DBG) dbg('[WARN] Error processing delegation:', e.message); } catch(e2){};
        }
      }
      lines.push('');
    } catch(e) {
      try { if (DBG) dbg('[WARN] Error generating delegation bindings:', e.message); } catch(e2){}
    }
  }
  console.log('[Delegation Generation] lines.length AFTER:', lines.length);

  // emit ports (attach to component instances)
  // track emitted ports to avoid duplicate lines when portUses and activity ensures overlap
  const __emittedPorts = new Set();
  
  // Helper: check if component already has ports defined in constructor through ComponentDef
  function componentHasDefinedPorts(ownerName) {
    try {
      const defName = compInstanceDef[ownerName];
      if (!defName) return false;
      const compDefNode = compDefMapArg ? compDefMapArg[String(defName)] : null;
      if (!compDefNode) return false;
      const ports = extractComponentDefPorts(compDefNode);
      return ports.length > 0;
    } catch(e) {
      return false;
    }
  }
  
  try { if (DBG) { dbg('[DBG] sample portDefMap keys:', Object.keys(portDefMap).slice(0,20)); dbg('[DBG] sample portDef entry for CTempIPT:', portDefMap['CTempIPT']); } } catch(e){}
  // helper: resolve port direction from PortDef.flow by following instance -> componentDef -> portDef
  function resolvePortDirectionFor(ownerName, portName) {
    try {
      // try deterministic annotation first: check if we have a PortUse annotated with a linked PortDef
      try {
        // when ownerName is qualified (component.composite), allow matching PortUse annotated with the base component name
        const ownerBase = (typeof ownerName === 'string' && ownerName.indexOf('.') !== -1) ? String(ownerName).split('.')[0] : ownerName;
        const annotated = (portUses || []).find(pu => {
          if (!pu) return false;
          const puOwner = pu._ownerComponent || pu.owner;
          const ownerMatch = (puOwner === ownerName) || (puOwner === ownerBase) || (ownerBase === puOwner);
          return ownerMatch && (pu.name === portName) && (pu._portDefNode || pu._portDefName);
        });
        if (annotated) {
          const pdefNode = annotated._portDefNode || (annotated._portDefName && portDefMap && (portDefMap[annotated._portDefName] || portDefMap[String(annotated._portDefName)]));
              if (pdefNode) {
            try {
              // robust extraction: prefer explicit flowProperties (string/object) over flowType
              let ff = null;
              if (pdefNode.flow) ff = pdefNode.flow;
              else if (pdefNode.flowProperties) {
                if (typeof pdefNode.flowProperties === 'string') ff = pdefNode.flowProperties;
                else if (pdefNode.flowProperties.flow) ff = pdefNode.flowProperties.flow;
                else if (pdefNode.flowProperties.direction) ff = pdefNode.flowProperties.direction;
                else if (pdefNode.flowProperties.name) ff = pdefNode.flowProperties.name;
              } else if (pdefNode.flowType) ff = pdefNode.flowType;
              else if (pdefNode.direction) ff = pdefNode.direction;
              if (ff) {
                const f = String(ff).toLowerCase();
                if (f.indexOf('inout') !== -1) return 'inout';
                if (f.indexOf('out') !== -1) return 'out';
                if (f.indexOf('in') !== -1) return 'in';
              }
            } catch(e){}
          }
        }
      } catch(e){}

      // try to get the component definition name for this instance
      const defName = (compInstanceDef && compInstanceDef[ownerName]) ? compInstanceDef[ownerName] : null;
      try { dbg('[DBG] resolvePortDirectionFor owner=', ownerName, 'port=', portName, 'defName=', defName); } catch(e){}
      if (defName) {
  const defNode = (compDefMapArg) ? (compDefMapArg[defName] || compDefMapArg[String(defName)]) : null;
  try { dbg('[DBG] compDefMap keys sample:', (compDefMapArg) ? Object.keys(compDefMapArg).slice(0,40) : null); } catch(e){}
  try { dbg('[DBG] defNode keys:', defNode ? Object.keys(defNode).slice(0,20) : null); } catch(e){}
        if (defNode) {
          // try to find a port declaration inside the component definition
          const portsList = (defNode.ports && Array.isArray(defNode.ports)) ? defNode.ports : (defNode.configuration && defNode.configuration.ports && Array.isArray(defNode.configuration.ports) ? defNode.configuration.ports : null);
          try { dbg('[DBG] portsList length:', portsList ? portsList.length : 0); } catch(e){}
          if (Array.isArray(portsList)) {
            for (const pd of portsList) {
              const pn = pd && (pd.name || (pd.id && pd.id.name) || pd.id) ? (pd.name || (pd.id && pd.id.name) || pd.id) : null;
              try { dbg('[DBG] checking pd for pn=', pn, 'pd keys=', pd?Object.keys(pd):null); } catch(e){}
              if (!pn) continue;
              if (String(pn) === String(portName)) {
                // port definition node may reference a PortDef by type, or include flow directly
                const extractFlow = (node) => {
                  try {
                    if (!node) return null;
                    if (typeof node === 'string') return node;
                    if (node.flow && typeof node.flow === 'string') return node.flow;
                    if (node.flow && node.flow.name) return node.flow.name;
                    if (node.flowType && typeof node.flowType === 'string') return node.flowType;
                    if (node.flowType && node.flowType.name) return node.flowType.name;
                    if (node.direction && typeof node.direction === 'string') return node.direction;
                    if (node.flowProperties) {
                      const fp = node.flowProperties;
                      if (typeof fp === 'string') return fp;
                      if (fp && typeof fp === 'object') {
                        if (fp.flow && typeof fp.flow === 'string') return fp.flow;
                        if (fp.direction && typeof fp.direction === 'string') return fp.direction;
                        if (fp.name && typeof fp.name === 'string') return fp.name;
                      }
                    }
                    if (node.value && typeof node.value === 'string') return node.value;
                    // sometimes parser wraps info under a nested object 'flow' with properties
                    if (node.value && typeof node.value === 'object') {
                      if (node.value.flow && typeof node.value.flow === 'string') return node.value.flow;
                    }
                    return null;
                  } catch (e) { return null; }
                };
                const tryNorm = (s) => { if (!s) return null; const f = String(s).toLowerCase(); if (f.indexOf('inout') !== -1) return 'inout'; if (f.indexOf('out') !== -1) return 'out'; if (f.indexOf('in') !== -1) return 'in'; return null; };
                const pdFlow = extractFlow(pd);
                const pdNorm = tryNorm(pdFlow);
                if (pdNorm) return pdNorm;
                // check if port declares a type that is a PortDef reference
                let tname = null;
                try {
                  if (pd && pd.definition) {
                    if (typeof pd.definition === 'string') tname = pd.definition;
                    else if (pd.definition.name) tname = pd.definition.name;
                    else if (pd.definition.id && pd.definition.id.name) tname = pd.definition.id.name;
                  }
                } catch(e){}
                if (!tname) tname = pd.type || pd.portType || (pd._type && pd._type.name) || null;
                try { dbg('[DBG] pd.definition:', pd && pd.definition, 'tname=', tname); } catch(e){}
                if (tname && portDefMapArg && (portDefMapArg[tname] || portDefMapArg[String(tname)])) {
                  const pdef = portDefMapArg[tname] || portDefMapArg[String(tname)];
                  try { dbg('[DBG] found portDef for', tname, 'keys=', pdef?Object.keys(pdef):null); } catch(e){}
                  if (pdef) {
                    const pdefFlow = (function(){ try { if (!pdef) return null; if (pdef.flow) return pdef.flow; if (pdef.flowType) return pdef.flowType; if (pdef.flowProperties) return pdef.flowProperties; if (pdef.direction) return pdef.direction; return null; } catch(e){ return null;} })();
                    const pdefNorm = tryNorm(pdefFlow);
                    if (pdefNorm) return pdefNorm;
                    // deeper extraction for structured flowProperties
                    try {
                      if (pdef.flowProperties && typeof pdef.flowProperties === 'object') {
                        const fh = pdef.flowProperties.flow || pdef.flowProperties.direction || pdef.flowProperties.name || null;
                        const fhNorm = tryNorm(fh);
                        if (fhNorm) return fhNorm;
                      }
                    } catch(e){}
                  }
                }
              }
            }
          }
        }
      }
      // as a last attempt, if compPortsMap_main maps ownerName to a set and we can find port's PortDef by matching known portDefs
      if (typeof portDefMap !== 'undefined' && portDefMap) {
        // scan portDefMap to find a PortDef whose name matches ownerName.portName? skip - not permitted by rule
        // fallback: try to find a PortUse annotated with a portType that maps to a PortDef
      }
    } catch (e) { /* ignore */ }
    // fallback default to 'in' to keep behavior stable when not resolvable
    return 'in';
  }
  for (const pu of portUses) {
    const pname = pu && (pu.name || pu.id || (pu.id && pu.id.name)) ? (pu.name || (pu.id && pu.id.name) || pu.id) : null;
    const owner = pu && pu._ownerComponent ? pu._ownerComponent : (pu.owner || null);
    if (!pname || !owner) continue;
    
    // Skip port generation if component already has ports defined in constructor
    if (componentHasDefinedPorts(owner)) {
      continue;
    }
    
  const ownerExpr = instancePathMap[owner] || `this.${owner}`;
  // detect composite port declarations: pu may have children in pu.ports or pu.members
  const hasChildren = Array.isArray(pu.ports) && pu.ports.length || Array.isArray(pu.members) && pu.members.length;
  const portKey = `${owner}::${pname}`;
    if (!hasChildren) {
    if (!__emittedPorts.has(portKey)) {
      // runtime initializes .ports on components; emit direct addPort call without redundant guard
      const __dir = resolvePortDirectionFor(owner, pname);
      const portClass = getPortClass(pname, false, pu);
              try { if (DBG) dbg('[DBG] emitting port for', owner, pname, 'resolvedDirection=', __dir, 'portClass=', portClass); } catch(e){}
      lines.push(`    ${ownerExpr}.addPort(new ${portClass}(${JSON.stringify(pname)}, ${JSON.stringify(__dir)}, { owner: ${JSON.stringify(owner)} }));`);
      __emittedPorts.add(portKey);
    }
  } else {
    // emit CompositePort and its sub-ports
    const children = Array.isArray(pu.ports) ? pu.ports : pu.members;
    const compKey = `${owner}::${pname}`;
    if (!__emittedPorts.has(compKey)) {
      const __dir = resolvePortDirectionFor(owner, pname);
      const portClass = getPortClass(pname, true, pu);
      lines.push(`    ${ownerExpr}.addPort(new ${portClass}(${JSON.stringify(pname)}, ${JSON.stringify(__dir)}, { owner: ${JSON.stringify(owner)} }));`);
      __emittedPorts.add(compKey);
    }
    for (const sub of (children || [])) {
      const subName = sub && (sub.name || (sub.id && sub.id.name) || sub.id) || null;
      if (!subName) continue;
      const subKey = `${owner}::${pname}::${subName}`;
      if (!__emittedPorts.has(subKey)) {
        const __sdir = resolvePortDirectionFor(owner + '.' + pname, subName);
        const subPortClass = getPortClass(subName, false, sub);
        lines.push(`    if (!${ownerExpr}.ports[${JSON.stringify(pname)}].getSubPort(${JSON.stringify(subName)})) { const __sp = new ${subPortClass}(${JSON.stringify(subName)}, ${JSON.stringify(__sdir)}, { owner: ${JSON.stringify(owner + '.' + pname)} }); ${ownerExpr}.ports[${JSON.stringify(pname)}].addSubPort(${JSON.stringify(subName)}, __sp); }`);
        __emittedPorts.add(subKey);
      }
    }
  }
  }

  // ensure ports for activity inputPorts exist on their components
  try {
    if (Array.isArray(activitiesToRegister)) {
      for (const a of activitiesToRegister) {
        const comp = a && a.descriptor && a.descriptor.component;
        const inputPorts = (a && a.descriptor && Array.isArray(a.descriptor.inputPorts)) ? a.descriptor.inputPorts : [];
        if (!comp || !inputPorts.length) continue;
        
        // Skip port generation if component already has ports defined in constructor
        if (componentHasDefinedPorts(comp)) {
          continue;
        }
        
  const ownerExpr = instancePathMap[comp] || `this.${comp}`;
          for (const ip of inputPorts) {
                  const ipKey = `${comp}::${ip}`;
                  if (!__emittedPorts.has(ipKey)) {
                    // runtime ensures components initialize `.ports` in their constructor; emit direct addPort without redundant owner.ports initializer
                    const __dir = resolvePortDirectionFor(comp, ip);
                    const portClass = getPortClass(ip, false, null);
                    lines.push(`${ownerExpr}.addPort(new ${portClass}(${JSON.stringify(ip)}, ${JSON.stringify(__dir)}, { owner: ${JSON.stringify(comp)} }));`);
                    __emittedPorts.add(ipKey);
                  }
                }
      }
    }
  } catch(e) { /* ignore */ }

  // Convert AST expression node to JavaScript string
  function astExpressionToString(node) {
    if (!node) return '';
    
    switch (node.type) {
      case 'BinaryExpression':
        const left = astExpressionToString(node.left);
        const right = astExpressionToString(node.right);
        const op = node.operator;
        return `(${left} ${op} ${right})`;
        
      case 'NameExpression':
        return node.name || '';
        
      case 'NaturalLiteral':
        return String(node.value || 0);
        
      case 'RealLiteral':
        return String(node.value || 0.0);
        
      case 'StringLiteral':
        return `"${node.value || ''}"`;
        
      case 'ParenthesizedExpression':
        return `(${astExpressionToString(node.expression)})`;
        
      case 'UnaryExpression':
        const operand = astExpressionToString(node.operand);
        return `${node.operator}${operand}`;
        
      case 'ConditionalExpression':
        console.log('DEBUG: Processing ConditionalExpression');
        const condition = node.condition;
        const thenExpr = node.then;
        const elseExpr = node.alternate;
        
        if (!condition) {
          console.warn('ConditionalExpression missing condition:', node);
          return '/* Missing condition */ ? ' + 
                 (thenExpr ? astExpressionToString(thenExpr) : 'then') + ' : ' + 
                 (elseExpr ? astExpressionToString(elseExpr) : 'else');
        }
        
        return '(' + astExpressionToString(condition) + ' ? ' + 
               astExpressionToString(thenExpr) + ' : ' + 
               astExpressionToString(elseExpr) + ')';
        
      case 'EnumValueLiteral':
        // Transform enum values like types.Command::On to types.Command.On
        return `${node.enumName}.${node.value}`;
        
      case 'DataTypeAccessExpression':
        // Transform datatype.attr->value to datatype.attr.value
        const datatype = node.datatype || '';
        const attr = node.attr || '';
        return `${datatype}.${attr}`;
        
      case 'PropertyAccessExpression':
      case 'MemberAccessExpression':
        // Handle expressions like obj->property or obj.property
        const object = node.object ? astExpressionToString(node.object) : '';
        const property = node.property || node.member || '';
        return `${object}.${property}`;
        
      case 'NameExpression':
        // Check if this is actually a property access with ->
        if (node.name && node.name.includes('->')) {
          const parts = node.name.split('->');
          return parts.join('.');
        }
        return node.name || '';
      case 'ComparisonExpression':
      case 'LogicalExpression':
        // These are all binary expressions with different semantic types
        const leftExpr = astExpressionToString(node.left);
        const rightExpr = astExpressionToString(node.right);
        const operator = node.operator;
        return `(${leftExpr} ${operator} ${rightExpr})`;
        
      default:
        // For unknown types, try to handle them gracefully
        console.warn(`Unknown AST node type: ${node.type}`);
        
        // If it has value property, return that
        if (node.value !== undefined) {
          return String(node.value);
        }
        
        // If it has name property, return that
        if (node.name) {
          return node.name;
        }
        
        // If it's a binary-like structure, try to handle it
        if (node.left && node.right && node.operator) {
          const leftFallback = astExpressionToString(node.left);
          const rightFallback = astExpressionToString(node.right);
          return `(${leftFallback} ${node.operator} ${rightFallback})`;
        }
        
        // Last resort: return a comment indicating the problem
        return `/* Unsupported expression type: ${node.type} */`;
    }
  }
  
  // Helper function to clean SysADL syntax and convert to JavaScript
  function cleanSysADLToJS(text) {
    if (typeof text !== 'string') return text;
    
    let result = text;
    
    // Replace -> with . for property access
    result = result.replace(/->/g, '.');
    
    // Convert SysADL variable declarations like "let varName:Type = value" to "let varName = value"
    result = result.replace(/let\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*[a-zA-Z_][a-zA-Z0-9_]*\s*=/g, 'let $1 =');
    
    // Convert SysADL variable declarations without assignment like "let varName : Type;" to "let varName;"
    result = result.replace(/let\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*[a-zA-Z_][a-zA-Z0-9_]*\s*;/g, 'let $1;');
    
    // Convert SysADL type scope access like "types.Command::Off" to "types.Command.Off"
    result = result.replace(/::/g, '.');
    
    // Fix if/else structures without braces
    result = result.replace(/if\s*\([^)]+\)\s*\n\s*return\s+[^;]+;\s*\n\s*else\s*\n\s*return\s+[^;]+;/g, (match) => {
      const lines = match.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length >= 3) {
        const ifLine = lines[0];
        const returnLine1 = lines[1];
        const elseLine = lines[2];
        const returnLine2 = lines[3] || '';
        
        return `${ifLine} {
          ${returnLine1}
        } ${elseLine} {
          ${returnLine2}
        }`;
      }
      return match;
    });
    
    return result;
  }

  // Convert ALF expressions to executable JavaScript functions
  function compileALFExpression(alfExpression, inParams = [], outParams = []) {
    if (!alfExpression || typeof alfExpression !== 'string') {
      return null;
    }
    
    try {
      // Extract parameter names and types for function signature
      const inParamNames = inParams.map(p => (typeof p === 'object' ? p.name : p)).filter(n => n);
      const inParamTypes = inParams.map(p => (typeof p === 'object' ? p.type || 'Real' : 'Real'));
      const outParamNames = outParams.map(p => (typeof p === 'object' ? p.name : p)).filter(n => n);
      
      // Generate type validation functions
      function generateTypeValidation(paramNames, paramTypes) {
        if (paramNames.length === 0) return '';
        
        const validations = paramNames.map((name, idx) => {
          const type = paramTypes[idx] || 'Real';
          switch (type) {
            case 'Real':
              return `if (typeof ${name} !== 'number') throw new Error('Parameter ${name} must be a Real (number)');`;
            case 'Int':
              return `if (!Number.isInteger(${name})) throw new Error('Parameter ${name} must be an Int (integer)');`;
            case 'Boolean':
              return `if (typeof ${name} !== 'boolean') throw new Error('Parameter ${name} must be a Boolean');`;
            case 'String':
              return `if (typeof ${name} !== 'string') throw new Error('Parameter ${name} must be a String');`;
            default:
              return `// Type validation for ${name}: ${type} (no validation implemented)`;
          }
        }).join('\n          ');
        
        return `
          // Type validation
          ${validations}`;
      }
      
      // Handle constraint equations (format: "output == expression" or conditional expressions)
      if (alfExpression.includes('==') && alfExpression.split('==').length === 2 && !alfExpression.includes('?')) {
        // Traditional constraint equation with == as main divider
        let cleanExpression = alfExpression.replace(/^\((.*)\)$/, '$1');
        const [leftSide, rightSide] = cleanExpression.split('==').map(s => s.trim());
        
        // Remove parentheses from sides
        const cleanLeftSide = leftSide.replace(/^\((.*)\)$/, '$1');
        const cleanRightSide = rightSide.replace(/^\((.*)\)$/, '$1');
        
        // Extract variable names from the equation intelligently
        function extractVariablesFromExpression(expr) {
          // Skip type references, enum values, and common reserved words
          const skipPatterns = [
            /^types\./,           // types.CommandsType, etc.
            /\b(types|true|false|null|undefined)\b/,  // reserved words
            /\b[A-Z][a-zA-Z]*::/,  // enum values like Command::On
            /\.\w+$/             // property access endings
          ];
          
          const variablePattern = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
          const allWords = expr.match(variablePattern) || [];
          
          return allWords.filter(word => {
            // Skip if word matches any skip pattern
            return !skipPatterns.some(pattern => pattern.test(word));
          });
        }
        
        const leftVars = [...new Set(extractVariablesFromExpression(cleanLeftSide))];
        const rightVars = [...new Set(extractVariablesFromExpression(cleanRightSide))];
        
        // Input parameters are variables that appear in the right side but not in left side
        const inputVars = rightVars.filter(v => !leftVars.includes(v));
        const outputVars = leftVars;
        
        // Use extracted variables or fallback to provided parameters, but ensure no duplicates
        let paramNames = inputVars.length > 0 ? [...new Set(inputVars)] : 
                        (inParamNames.length > 0 ? [...new Set(inParamNames)] : [...new Set(outputVars)]);
        
        // Remove any remaining type-related words
        paramNames = paramNames.filter(name => 
          !['types', 'Commands', 'Command', 'On', 'Off', 'true', 'false', 'null'].includes(name)
        );
        
        const paramTypes = paramNames.map((_, idx) => inParamTypes[idx] || 'Real');
        
        // Generate type validation
        const typeValidation = generateTypeValidation(paramNames, paramTypes);
        
        // Determine the type of constraint based on expression structure
        let functionBody;
        if (alfExpression.includes('==') && !alfExpression.includes('?')) {
          // Simple equality constraint - return boolean result directly
          functionBody = `// Constraint equation: ${alfExpression}
          const { ${paramNames.join(', ')} } = params;
          ${typeValidation.replace(/typeof (\w+)/g, 'typeof $1')}
          return ${alfExpression.replace(/^\((.*)\)$/, '$1')};
        `;
        } else {
          // Numeric comparison constraint - use tolerance for floating point
          functionBody = `// Constraint equation: ${alfExpression}
          const { ${paramNames.join(', ')} } = params;
          ${typeValidation.replace(/typeof (\w+)/g, 'typeof $1')}
          const expectedValue = ${cleanRightSide};
          const actualValue = ${cleanLeftSide};
          return Math.abs(expectedValue - actualValue) < 1e-10; // tolerance for floating point comparison
        `;
        }

        return {
          type: 'constraint',
          javascript: `function(params) {${functionBody}}`,
          equation: alfExpression,
          parameters: paramNames.map((name, idx) => ({ name, type: paramTypes[idx] }))
        };
      }
      
      // Handle conditional constraint expressions (like "condition ? result1 : result2")
      else if (alfExpression.includes('?') && alfExpression.includes(':')) {
        // This is a conditional expression, treat it as a boolean constraint
        let cleanExpression = alfExpression.replace(/^\((.*)\)$/, '$1');
        
        // Extract variables from the conditional expression
        function extractVariablesFromExpression(expr) {
          const skipPatterns = [
            /^types\./,           
            /\b(types|true|false|null|undefined|return|else|if|for|while|function|var|let|const)\b/,  
            /\b[A-Z][a-zA-Z]*::/,  
            /\.\w+$/             
          ];
          
          const variablePattern = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
          const allWords = expr.match(variablePattern) || [];
          
          return allWords.filter(word => {
            return !skipPatterns.some(pattern => pattern.test(word));
          });
        }
        
        const allVars = [...new Set(extractVariablesFromExpression(cleanExpression))];
        
        // Filter out type-related words and JavaScript reserved words
        const paramNames = allVars.filter(name => 
          !['types', 'Commands', 'Command', 'On', 'Off', 'true', 'false', 'null', 'return', 'else', 'if', 'for', 'while', 'function', 'var', 'let', 'const'].includes(name)
        );
        
        const paramTypes = paramNames.map(() => 'Real'); // Default to Real for conditional expressions
        
        // Generate type validation
        const typeValidation = generateTypeValidation(paramNames, paramTypes);
        
        // Create constraint validation function - conditional expressions return boolean directly
        const functionBody = `// Conditional constraint: ${alfExpression}
          const { ${paramNames.join(', ')} } = params;
          ${typeValidation.replace(/typeof (\w+)/g, 'typeof $1')}
          return ${cleanExpression};
        `;
        
        return {
          type: 'constraint', 
          javascript: `function(params) {${functionBody}}`,
          equation: alfExpression,
          parameters: paramNames.map((name, idx) => ({ name, type: paramTypes[idx] }))
        };
      }
      
      // Handle executable expressions (parse full executable definition)
      else {
        let expression = alfExpression;
        
        // Extract return expression from executable body
        if (expression.includes('return')) {
          const returnMatch = expression.match(/return\s+([^;}]+)/);
          if (returnMatch) {
            expression = returnMatch[1].trim();
          }
        }
        
        // Extract parameter names and types from executable definition if present
        let extractedParams = inParamNames;
        let extractedTypes = inParamTypes;
        if (alfExpression.includes('(in ') && alfExpression.includes(':')) {
          // Match multiple parameters: (in param1:Type,in param2:Type)
          const fullParamMatch = alfExpression.match(/\(([^)]+)\)/);
          if (fullParamMatch) {
            const paramSection = fullParamMatch[1];
            const paramMatches = paramSection.match(/in\s+([^:,]+):([^,)]+)/g);
            if (paramMatches) {
              extractedParams = [];
              extractedTypes = [];
              paramMatches.forEach(p => {
                const [, name, type] = p.match(/in\s+([^:]+):(.+)/);
                extractedParams.push(name.trim());
                extractedTypes.push(type.trim());
              });
            }
          }
        }
        
        // Generate type validation
        const typeValidation = generateTypeValidation(extractedParams, extractedTypes);
        
        // Clean the expression to convert SysADL syntax to JavaScript
        const cleanExpression = expression.replace(/->/g, '.');
        
        const functionBody = `// Executable expression: ${cleanExpression}
          const { ${extractedParams.join(', ')} } = params;
          ${typeValidation.replace(/typeof (\w+)/g, 'typeof $1')}
          return ${cleanExpression};
        `;
        
        return {
          type: 'executable',
          javascript: `function(params) {${functionBody}}`,
          expression: expression,
          parameters: extractedParams.map((name, idx) => ({ name, type: extractedTypes[idx] }))
        };
      }
    } catch (e) {
      console.warn('Failed to compile ALF expression:', alfExpression, e.message);
      return null;
    }
  }

  // Compile executable body to JavaScript function
  function compileExecutableToJS(executableBody, parameters = []) {
    try {
      // Extract parameter definitions directly from executable signature
      let paramNames = [];
      const paramMatch = executableBody.match(/\(([^)]+)\)/);
      if (paramMatch) {
        const paramSection = paramMatch[1];
        const paramMatches = paramSection.match(/in\s+([^:,]+):/g);
        if (paramMatches) {
          paramNames = paramMatches.map(p => p.replace(/in\s+/, '').replace(':', '').trim());
        }
      }
      
      // If no parameters found from signature, use provided parameters
      if (paramNames.length === 0 && parameters.length > 0) {
        paramNames = parameters.map(p => p.name || p);
      }
      
      // Extract the function body from executable definition - handle nested braces
      let functionBody = '';
      const startIdx = executableBody.indexOf('{');
      if (startIdx === -1) return null;
      
      let braceCount = 0;
      let endIdx = startIdx;
      for (let i = startIdx; i < executableBody.length; i++) {
        if (executableBody[i] === '{') braceCount++;
        if (executableBody[i] === '}') braceCount--;
        if (braceCount === 0) {
          endIdx = i;
          break;
        }
      }
      
      functionBody = executableBody.substring(startIdx + 1, endIdx).trim();
      
      // Clean SysADL syntax to JavaScript
      functionBody = cleanSysADLToJS(functionBody);
      
      console.log(`DEBUG: Executable function - params: ${JSON.stringify(paramNames)}, body: ${functionBody}`);
      
      // Handle different executable patterns
      if (functionBody.includes('if(') && functionBody.includes('return')) {
        // Conditional executable with if/else
        return `function(params) {
          // Type validation
          ${paramNames.map(name => `// Type validation for ${name}: (auto-detected from usage)`).join('\n          ')}
          const { ${paramNames.join(', ')} } = params;
          ${functionBody}
        }`;
      } else if (functionBody.startsWith('return ')) {
        // Simple return expression
        const returnExpr = functionBody.replace(/^return\s+/, '').replace(/\s*;\s*$/, '');
        return `function(params) {
          // Type validation
          ${paramNames.map(name => `// Type validation for ${name}: (auto-detected from usage)`).join('\n          ')}
          const { ${paramNames.join(', ')} } = params;
          return ${returnExpr};
        }`;
      } else {
        // Complex executable body  
        return `function(params) {
          // Type validation
          ${paramNames.map(name => `// Type validation for ${name}: (auto-detected from usage)`).join('\n          ')}
          const { ${paramNames.join(', ')} } = params;
          ${functionBody}
        }`;
      }
    } catch (e) {
      console.warn('Failed to compile executable:', executableBody, e.message);
      return null;
    }
  }

  // Generate explicit behavioral element classes with prefixes
  function generateBehavioralClasses() {
    const behavioralLines = [];
    
    // Get the actionDelegations from the outer scope that was already built
    const { activityDelegations: actDels, actionDelegations: actDels2 } = buildDelegationMappings();
    const constraintToActionMap = buildConstraintToActionMapping();
    
    // Create reverse mapping: action -> constraints
    const actionToConstraintsMap = {};
    for (const [constraintName, actionName] of Object.entries(constraintToActionMap)) {
      if (!actionToConstraintsMap[actionName]) {
        actionToConstraintsMap[actionName] = [];
      }
      actionToConstraintsMap[actionName].push(constraintName);
    }
    
    // Build executable to action mapping from allocations
    const executableToActionMap = {};
    if (ast && ast.allocation && Array.isArray(ast.allocation.allocations)) {
      for (const allocation of ast.allocation.allocations) {
        if (allocation && allocation.type === 'ExecutableAllocation' && allocation.source && allocation.target) {
          executableToActionMap[allocation.source] = allocation.target;
        }
      }
    }
    
    // Create reverse mapping: action -> executable
    const actionToExecutableMap = {};
    for (const [executableName, actionName] of Object.entries(executableToActionMap)) {
      actionToExecutableMap[actionName] = executableName;
    }
    
    // Collect ActivityDef nodes with their pins
    const activityDefs = [];
    traverse(ast, n => {
      if (n && (n.type === 'ActivityDef' || /ActivityDef/i.test(n.type))) {
        const name = n.name || n.id || null;
        if (!name) return;
        
        const inPins = [];
        const outPins = [];
        
        // Extract pins from the activity
        traverse(n, child => {
          if (child && child.type === 'Pin') {
            const pinName = child.name || child.id || null;
            const pinType = child.type || child.typeName || 'String';
            const direction = child.direction || 'in';
            
            const pinData = { name: pinName, type: pinType, direction };
            if (direction === 'out') {
              outPins.push(pinData);
            } else {
              inPins.push(pinData);
            }
          }
        });
        
        activityDefs.push({ name, inPins, outPins, node: n });
      }
    });
    
    // Collect ActionDef nodes with their pins
    const actionDefs = [];
    traverse(ast, n => {
      if (n && (n.type === 'ActionDef' || /ActionDef/i.test(n.type))) {
        const name = n.name || n.id || null;
        if (!name) return;
        
        const inPins = [];
        const outPins = [];
        let body = null;
        
        // Extract pins and body
        traverse(n, child => {
          if (child && child.type === 'Pin') {
            const pinName = child.name || child.id || null;
            const pinType = child.type || child.typeName || 'String';
            const direction = child.direction || 'in';
            
            const pinData = { name: pinName, type: pinType, direction };
            if (direction === 'out') {
              outPins.push(pinData);
            } else {
              inPins.push(pinData);
            }
          }
        });
        
        // Extract body from location if available
        if (n.location && n.location.start && typeof n.location.start.offset === 'number') {
          try {
            const s = n.location.start.offset;
            const e = n.location.end.offset;
            const snippet = src.slice(s, e);
            const m = snippet.match(/\{([\s\S]*)\}$/m);
            if (m && m[1]) body = m[1].trim();
          } catch (e) {}
        }
        
        actionDefs.push({ name, inPins, outPins, body, node: n });
      }
    });
    
    // Collect ConstraintDef nodes
    const constraintDefs = [];
    traverse(ast, n => {
      if (n && (n.type === 'ConstraintDef' || /ConstraintDef/i.test(n.type))) {
        const name = n.name || n.id || null;
        if (!name) return;
        
        const inPins = [];
        const outPins = [];
        let equation = null;
        
        // Extract input parameters from constraint definition
        if (n.parameters && Array.isArray(n.parameters)) {
          for (const param of n.parameters) {
            const paramName = param.name || param.id || null;
            const paramType = param.type || param.typeName || 'Real';
            if (paramName) {
              inPins.push({ name: paramName, type: paramType, direction: 'in' });
            }
          }
        }
        
        // Extract output parameters from constraint definition  
        if (n.returnParameters && Array.isArray(n.returnParameters)) {
          for (const param of n.returnParameters) {
            const paramName = param.name || param.id || null;
            const paramType = param.type || param.typeName || 'Real';
            if (paramName) {
              outPins.push({ name: paramName, type: paramType, direction: 'out' });
            }
          }
        }
        
        // Extract equation directly from AST structure
        if (n.equation && Array.isArray(n.equation) && n.equation.length >= 5) {
          // AST structure: ['equation', ' ', '=', ' ', {expression}]
          const expressionNode = n.equation[4];
          if (expressionNode && expressionNode.type) {
            console.log(`DEBUG: Processing equation for ${name}, expression type: ${expressionNode.type}`);
            equation = astExpressionToString(expressionNode);
            console.log(`DEBUG: Transformed equation: ${equation}`);
          }
        }
        
        constraintDefs.push({ name, inPins, outPins, equation, node: n });
      }
    });
    
    // Generate Activity classes
    for (const actDef of activityDefs) {
      const className = getPackagePrefix(actDef.name, 'AC') + actDef.name;
      behavioralLines.push(`// Activity class: ${actDef.name}`);
      behavioralLines.push(`class ${className} extends Activity {`);
      behavioralLines.push(`  constructor(name, component = null, inputPorts = [], delegates = [], opts = {}) {`);
      behavioralLines.push(`    super(name, component, inputPorts, delegates, {`);
      behavioralLines.push(`      ...opts,`);
      behavioralLines.push(`      inParameters: ${JSON.stringify(actDef.inPins)},`);
      behavioralLines.push(`      outParameters: ${JSON.stringify(actDef.outPins)}`);
      behavioralLines.push(`    });`);
      behavioralLines.push(`  }`);
      behavioralLines.push(`}`);
      behavioralLines.push('');
    }
    
    // Generate Action classes
    for (const actDef of actionDefs) {
      const className = getPackagePrefix(actDef.name, 'AN') + actDef.name;
      const actionDels = actDels2[actDef.name] || [];
      const actionConstraints = actionToConstraintsMap[actDef.name] || [];
      const actionExecutable = actionToExecutableMap[actDef.name];
      
      behavioralLines.push(`// Action class: ${actDef.name}`);
      behavioralLines.push(`class ${className} extends Action {`);
      behavioralLines.push(`  constructor(name, opts = {}) {`);
      behavioralLines.push(`    super(name, {`);
      behavioralLines.push(`      ...opts,`);
      behavioralLines.push(`      inParameters: ${JSON.stringify(actDef.inPins)},`);
      behavioralLines.push(`      outParameters: ${JSON.stringify(actDef.outPins)},`);
      if (actionDels.length > 0) {
        behavioralLines.push(`      delegates: ${JSON.stringify(actionDels)},`);
      }
      if (actionConstraints.length > 0) {
        behavioralLines.push(`      constraints: ${JSON.stringify(actionConstraints)},`);
      }
      if (actionExecutable) {
        behavioralLines.push(`      executableName: ${JSON.stringify(actionExecutable)},`);
      }
      if (actDef.body) {
        behavioralLines.push(`      rawBody: ${JSON.stringify(actDef.body)}`);
      }
      behavioralLines.push(`    });`);
      behavioralLines.push(`  }`);
      behavioralLines.push(`}`);
      behavioralLines.push('');
    }
    
    // Generate Constraint classes
    for (const conDef of constraintDefs) {
      const className = getPackagePrefix(conDef.name, 'CT') + conDef.name;
      behavioralLines.push(`// Constraint class: ${conDef.name}`);
      behavioralLines.push(`class ${className} extends Constraint {`);
      behavioralLines.push(`  constructor(name, opts = {}) {`);
      behavioralLines.push(`    super(name, {`);
      behavioralLines.push(`      ...opts,`);
      behavioralLines.push(`      inParameters: ${JSON.stringify(conDef.inPins)},`);
      behavioralLines.push(`      outParameters: ${JSON.stringify(conDef.outPins || [])},`);
      if (conDef.equation) {
        behavioralLines.push(`      equation: ${JSON.stringify(conDef.equation)},`);
        
        // Compile ALF equation to JavaScript function
        const compiledALF = compileALFExpression(conDef.equation, conDef.inPins, conDef.outPins);
        if (compiledALF && compiledALF.javascript) {
          behavioralLines.push(`      constraintFunction: ${compiledALF.javascript}`);
        }
      }
      behavioralLines.push(`    });`);
      behavioralLines.push(`  }`);
      behavioralLines.push(`}`);
      behavioralLines.push('');
    }
    
    // Generate Executable classes for each executable
    for (const ex of executables) {
      if (!ex.name) continue;
      const className = getPackagePrefix(ex.name, 'EX') + ex.name;
      const params = Array.isArray(ex.params) ? ex.params : (ex.params || []);
      const inPins = params.map(p => ({ name: p, type: 'String', direction: 'in' }));
      
      behavioralLines.push(`// Executable class: ${ex.name}`);
      behavioralLines.push(`class ${className} extends Executable {`);
      behavioralLines.push(`  constructor(name, opts = {}) {`);
      behavioralLines.push(`    super(name, {`);
      behavioralLines.push(`      ...opts,`);
      behavioralLines.push(`      inParameters: ${JSON.stringify(inPins)},`);
      if (ex.body) {
        behavioralLines.push(`      body: ${JSON.stringify(ex.body)},`);
        
        // Compile ALF body to JavaScript function for executables
        const executableFunc = compileExecutableToJS(ex.body, inPins);
        if (executableFunc) {
          behavioralLines.push(`      executableFunction: ${executableFunc}`);
        }
      }
      behavioralLines.push(`    });`);
      behavioralLines.push(`  }`);
      behavioralLines.push(`}`);
      behavioralLines.push('');
    }
    
    return behavioralLines;
  }
  
  // Build constraint to action mapping from AST
  function buildConstraintToActionMapping() {
    const constraintToAction = {};
    
    traverse(ast, n => {
      if (n && (n.type === 'ActionDef' || /ActionDef/i.test(n.type))) {
        const actionName = n.name || n.id || null;
        if (!actionName) return;
        
        // Look for constraints array within this action
        if (n.constraints && Array.isArray(n.constraints)) {
          for (const constraint of n.constraints) {
            if (constraint && constraint.type === 'ConstraintUse' && constraint.definition) {
              constraintToAction[constraint.definition] = actionName;
            }
          }
        }
        
        // Also look for constraint references within this action (fallback)
        traverse(n, child => {
          // Look for post-condition constraint references
          if (child && child.type === 'ConstraintRef' || 
              (child && typeof child === 'object' && child.constraint)) {
            const constraintName = child.constraint || child.name || child.id || null;
            if (constraintName) {
              constraintToAction[constraintName] = actionName;
            }
          }
          
          // Also check for "post-condition" patterns in text
          if (child && child.type === 'PostCondition' || 
              (child && typeof child === 'string' && child.includes('post-condition'))) {
            // Extract constraint name from post-condition text
            const text = typeof child === 'string' ? child : (child.value || '');
            const match = text.match(/post-condition\s+(\w+)/);
            if (match && match[1]) {
              constraintToAction[match[1]] = actionName;
            }
          }
        });
      }
    });
    
    return constraintToAction;
  }
  
  // Build delegation mappings from AST
  function buildDelegationMappings() {
    const activityDelegations = {};
    const actionDelegations = {};
    
    traverse(ast, n => {
      // Extract delegations from ActivityDef (check both delegations and relations)
      if (n && (n.type === 'ActivityDef' || /ActivityDef/i.test(n.type))) {
        const activityName = n.name || n.id || null;
        if (!activityName) return;
        
        const delegations = [];
        
        // Check delegations array
        if (n.delegations && Array.isArray(n.delegations)) {
          delegations.push(...n.delegations.map(d => ({
            from: d.source,
            to: d.target
          })));
        }
        
        // Check relations array (often used in activity body)
        if (n.body && n.body.relations && Array.isArray(n.body.relations)) {
          delegations.push(...n.body.relations
            .filter(r => r.type === 'ActivityDelegation')
            .map(d => ({
              from: d.source,
              to: d.target
            })));
        }
        
        if (delegations.length > 0) {
          activityDelegations[activityName] = delegations;
        }
      }
      
      // Extract delegations from ActionDef
      if (n && (n.type === 'ActionDef' || /ActionDef/i.test(n.type))) {
        const actionName = n.name || n.id || null;
        if (!actionName) return;
        
        const delegations = [];
        
        // Check delegations array
        if (n.delegations && Array.isArray(n.delegations)) {
          delegations.push(...n.delegations.map(d => ({
            from: d.source,
            to: d.target
          })));
        }
        
        if (delegations.length > 0) {
          actionDelegations[actionName] = delegations;
        }
      }
    });
    
    return { activityDelegations, actionDelegations };
  }
  
  const constraintToActionMap = buildConstraintToActionMapping();
  const { activityDelegations, actionDelegations } = buildDelegationMappings();
  
// Helper function to extract parameters from executable definition
function extractExecutableParams(body) {
  if (!body || typeof body !== 'string') return [];
  
  // Match executable definition pattern: executable def name (in param1:Type, in param2:Type): out Type
  const match = body.match(/executable\s+def\s+\w+\s*\(([^)]*)\)/i);
  if (!match) return [];
  
  const paramStr = match[1].trim();
  if (!paramStr) return [];
  
  // Split parameters and extract names (remove 'in'/'out' and type annotations)
  return paramStr.split(',')
    .map(p => p.trim())
    .filter(p => p)
    .map(p => {
      // Remove 'in'/'out' prefix and type annotation
      const parts = p.split(':');
      const nameWithDirection = parts[0].trim();
      // Remove 'in' or 'out' prefix
      return nameWithDirection.replace(/^(in|out)\s+/, '').trim();
    })
    .filter(name => name);
}

  // Executable registration is handled through class instantiation and action.registerExecutable()
  // No need for addExecutableSafe since executable classes already contain the compiled functions

  // register activities using explicit classes
  // track used activity variable names to avoid collisions — append counter when duplicates occur
  const usedActivityVars = {};
  // additionally track the final variable names already emitted to be robust
  const usedActivityVarNames = new Set();
  if (Array.isArray(activitiesToRegister) && activitiesToRegister.length) {
    for (const a of activitiesToRegister) {
      const comp = a.descriptor && a.descriptor.component;
      const inputPorts = a.descriptor && a.descriptor.inputPorts ? a.descriptor.inputPorts : [];
      const actions = a.descriptor && a.descriptor.actions ? a.descriptor.actions : [];
      // Choose a stable instance name for the activity variable using the
      // same resolution logic we apply to actions. Prefer an explicit
      // descriptor.instanceName when available, otherwise use the
      // component/connector instance name (comp) or the activity name.
      const activityInstanceRaw = (a.descriptor && a.descriptor.instanceName) || comp || a.activityName;
      const resolvedActivityInstance = resolveInstanceName(activityInstanceRaw, a.activityName, `${a.activityName}_${comp}`);
  // Prefer using the SysADL instance token as the base activity variable name.
  // This yields names like `ac_spw` or `ac_ftoc`. If the same instance token
  // appears multiple times in the same generated module, append a numeric
  // suffix to guarantee uniqueness (e.g. `ac_spw_2`).
  const baseActVar = 'ac_' + sanitizeId(resolvedActivityInstance);
      // ensure uniqueness: maintain a count per base and also a global set of used names
      if (!usedActivityVars[baseActVar]) usedActivityVars[baseActVar] = 1;
      else usedActivityVars[baseActVar]++;
      let actVar = (usedActivityVars[baseActVar] > 1) ? `${baseActVar}_${usedActivityVars[baseActVar]}` : baseActVar;
      // If the candidate name is already taken (for any reason), increment until we find a free one
      let loopGuard = 0;
      while (usedActivityVarNames.has(actVar) && loopGuard < 1000) {
        usedActivityVars[baseActVar] = (usedActivityVars[baseActVar] || 1) + 1;
        actVar = `${baseActVar}_${usedActivityVars[baseActVar]}`;
        loopGuard++;
      }
      usedActivityVarNames.add(actVar);
  // uniqueness logging removed for production runs
      
      // Use explicit Activity class with prefix and include delegations
      const activityClassName = getPackagePrefix(a.activityName, 'AC') + a.activityName;
      const activityDels = activityDelegations[a.activityName] || [];
      lines.push(`    const ${actVar} = new ${activityClassName}(`);
      lines.push(`      ${JSON.stringify(a.activityName)},`);
      lines.push(`      ${JSON.stringify(comp)},`);
      lines.push(`      ${JSON.stringify(inputPorts)},`);
      lines.push(`      ${JSON.stringify(activityDels)}`);
      lines.push(`    );`);
      // emit-lines debug removed
      
      // Register actions within this activity using explicit classes
      for (const act of actions) {
        const actionName = act.name || act.executable || null;
        if (actionName) {
          const actionClassName = getPackagePrefix(actionName, 'AN') + actionName;
          const exec = act.executable || null;

          // Prefer SysADL instance name when provided in the descriptor
          const instanceNameRaw = act.instanceName || act.instance || act.name || act.executable || actionName;
          const resolvedInstance = resolveInstanceName(instanceNameRaw, actionName, `${a.activityName}_${comp}`);
          const actionVarName = sanitizeId(resolvedInstance);

          if (exec) {
            // Create explicit action class instance using the resolved instance name
            lines.push(`    const ${actionVarName} = new ${actionClassName}(${JSON.stringify(instanceNameRaw)});`);
            lines.push(`    ${actVar}.registerAction(${actionVarName});`);
          } else {
            // Fallback to legacy Action creation but use instance name as the Action name
            lines.push(`    ${actVar}.addAction(new Action(${JSON.stringify(instanceNameRaw)}, ${JSON.stringify(act.params || [])}, null));`);
          }
        }
      }
      
      lines.push(`    this.registerActivity(${JSON.stringify(a.activityName)}, ${actVar});`);
    }
  }
  const unresolvedBindings = [];
  // connectors are now emitted earlier (right after components)

  // if we collected unresolved bindings, fail with a consolidated report

  // if we collected unresolved bindings, fail with a consolidated report
  if (unresolvedBindings.length) {
    try {
      // build candidate suggestions using compPortsMap_main
      const suggest = (portName) => {
        if (!portName) return [];
        try {
          if (typeof compPortsMap_main !== 'undefined' && compPortsMap_main) {
            return Object.keys(compPortsMap_main).filter(cn => { try { return Array.from(compPortsMap_main[cn]||[]).some(p=>String(p) === String(portName)); } catch(e){ return false; } });
          }
        } catch(e){}

      // Additionally, extract any ports declared locally inside this ConnectorUse (connection-level scope)
      try {
        const connLocal = {};
        traverse(node, n => {
          if (!n || typeof n !== 'object') return;
          // port containers like 'ports' or 'members' with a parent name
          if ((Array.isArray(n.ports) && n.name) || (Array.isArray(n.members) && n.name)) {
            const pName = n.name || (n.id && n.id.name) || null;
            if (!pName) return;
            if (!connLocal[pName]) connLocal[pName] = new Set();
            const children = Array.isArray(n.ports) ? n.ports : n.members;
            for (const sub of children) { const subN = sub && (sub.name || (sub.id && sub.id.name) || sub.id) || null; if (subN) connLocal[pName].add(String(subN)); }
          }
          // inline participants that may declare inner ports
          if (n.participants && Array.isArray(n.participants)) {
            for (const p of n.participants) {
              const pname = p && (p.name || (p.id && p.id.name) || p.id) ? (p.name || (p.id && p.id.name) || p.id) : null;
              if (!pname) continue;
              if (!connLocal[pname]) connLocal[pname] = new Set();
              if (p.ports && Array.isArray(p.ports)) for (const pp of p.ports) { const pn2 = pp && (pp.name || (pp.id && pp.id.name) || pp.id) || null; if (pn2) connLocal[pname].add(String(pn2)); }
            }
          }
        });
        if (Object.keys(connLocal).length) {
          localScopeMap = localScopeMap || {};
          for (const k of Object.keys(connLocal)) localScopeMap[k] = Array.from(connLocal[k]);
        }
        // best-effort: parse textual bindings block and register tokens as local ports under '__local'
        try {
          if (node && node.location && node.location.start && typeof node.location.start.offset === 'number' && node.location.end && typeof node.location.end.offset === 'number') {
            const snippet = src.slice(node.location.start.offset, node.location.end.offset);
            const m = snippet.match(/bindings[^{]*\{([\s\S]*?)\}/i);
            const block = m ? m[1] : snippet;
            const tokens = (block.match(/[A-Za-z0-9_\.]+/g) || []).filter(Boolean);
            if (tokens.length) {
              localScopeMap = localScopeMap || {};
              localScopeMap['__local'] = localScopeMap['__local'] || [];
              for (const tok of tokens) if (localScopeMap['__local'].indexOf(tok) === -1) localScopeMap['__local'].push(tok);
            }
          }
        } catch(e){}
      } catch(e){}
        // fallback: scan portUses for owners exposing this port
        try {
          const owners = new Set();
          for (const pu of (portUses || [])) {
            const pname = pu && (pu.name || pu.id || (pu.id && pu.id.name)) ? (pu.name || (pu.id && pu.id.name) || pu.id) : null;
            const owner = pu && pu._ownerComponent ? pu._ownerComponent : (pu.owner || null);
            if (!pname || !owner) continue;
            if (String(pname) === String(portName)) owners.add(owner);
          }
          return Array.from(owners);
        } catch(e) { return []; }
      };
      const linesReport = [];
      for (let i=0;i<unresolvedBindings.length;i++){
        const u = unresolvedBindings[i];
        let entryDesc = JSON.stringify(u.entry||u.binding||u.port||{});
        let suggestion = '';
        if (u.port) {
          const cands = suggest(u.port);
          if (cands && cands.length) suggestion = ` candidates=${JSON.stringify(cands.slice(0,10))}`;
        } else if (u.entry && u.entry.left && typeof u.entry.left === 'string') {
          const cands = suggest(u.entry.left);
          if (cands && cands.length) suggestion = ` candidatesForLeft=${JSON.stringify(cands.slice(0,10))}`;
        } else if (u.entry && u.entry.right && typeof u.entry.right === 'string') {
          const cands = suggest(u.entry.right);
          if (cands && cands.length) suggestion = ` candidatesForRight=${JSON.stringify(cands.slice(0,10))}`;
        }
        linesReport.push(`${i+1}) connector=${u.connector} reason=${u.reason} entry=${entryDesc}${suggestion}`);
      }
      const report = linesReport.join('\n');
  throw new Error('Generation failed: unresolved connector bindings found:\n' + report + '\n\nHint: este gerador exige resolução em tempo de geração. Qualifique portas nas ligações usando nomes de instância de componente (ex: "vc.sendStatus -> ss.receiveStatus") ou corrija o .sysadl no editor para desambiguar.');
    } catch(e) { throw e; }
  }

  lines.push('  }'); // Close constructor
  lines.push('');

  lines.push('}'); // Close class
  lines.push('');
  lines.push(`function createModel(){ `);
  lines.push(`  const model = new ${sanitizeId(modelName)}();`);
  lines.push(`  `);
  // Define primitive types that are already available in SysADLBase
  const primitiveTypes = new Set(['Int', 'Boolean', 'String', 'Real', 'Void']);
  
  lines.push(`  model.typeRegistry = {`);
  // Generate type mappings based on actual types found
  Object.keys(embeddedTypes.valueTypes || {}).forEach(typeName => {
    if (!primitiveTypes.has(typeName)) {
      const prefixedName = getPackagePrefix(typeName, 'VT') + typeName;
      lines.push(`    '${typeName}': '${prefixedName}',`);
    }
  });
  Object.keys(embeddedTypes.enumerations || {}).forEach(enumName => {
    const prefixedName = getPackagePrefix(enumName, 'EN') + enumName;
    lines.push(`    '${enumName}': '${prefixedName}',`);
  });
  lines.push(`  };`);
  lines.push(`  `);
  lines.push(`  // Module context for class resolution`);
  lines.push(`  model._moduleContext = {`);
  
  // Add port classes to module context
  Object.keys(embeddedTypes.ports || {}).forEach(portName => {
    const prefixedName = getPackagePrefix(portName, 'PT') + portName;
    lines.push(`    ${prefixedName},`);
  });
  
  // Add connector classes to module context  
  if (connectorDefMap && Object.keys(connectorDefMap).length > 0) {
    Object.keys(connectorDefMap).forEach(connName => {
      const prefixedName = getPackagePrefix(connName, 'CN') + connName;
      lines.push(`    ${prefixedName},`);
    });
  }
  
  lines.push(`  };`);
  lines.push(`  `);
  lines.push(`  return model;`);
  lines.push(`}`);
  lines.push('');
  
  // Create arrays of prefixed names for exports
  const filteredValueTypes = Object.keys(embeddedTypes.valueTypes || {})
    .filter(name => !primitiveTypes.has(name))
    .map(name => getPackagePrefix(name, 'VT') + name);
    
  const prefixedEnumerations = Object.keys(embeddedTypes.enumerations || {})
    .map(name => getPackagePrefix(name, 'EN') + name);
    
  const prefixedDatatypes = Object.keys(embeddedTypes.datatypes || {})
    .map(name => getPackagePrefix(name, 'DT') + name);
    
  const prefixedDimensions = Object.keys(embeddedTypes.dimensions || {})
    .map(name => getPackagePrefix(name, 'DM') + name);
    
  const prefixedUnits = Object.keys(embeddedTypes.units || {})
    .map(name => getPackagePrefix(name, 'UN') + name);
    
  const prefixedPins = Object.keys(embeddedTypes.pins || {})
    .map(name => getPackagePrefix(name, 'PI') + name);
    
  const prefixedConstraints = Object.keys(embeddedTypes.constraints || {})
    .map(name => getPackagePrefix(name, 'CT') + name);
    
  const prefixedDatabuffers = Object.keys(embeddedTypes.databuffers || {})
    .map(name => getPackagePrefix(name, 'DB') + name);
    
  const prefixedRequirements = Object.keys(embeddedTypes.requirements || {})
    .map(name => getPackagePrefix(name, 'RQ') + name);
    
  const prefixedPorts = Object.keys(embeddedTypes.ports || {})
    .map(name => getPackagePrefix(name, 'PT') + name);
  
  const allExportedTypes = filteredValueTypes
    .concat(prefixedEnumerations)
    .concat(prefixedDatatypes)
    .concat(prefixedDimensions)
    .concat(prefixedUnits)
    .concat(prefixedPins)
    .concat(prefixedConstraints)
    .concat(prefixedDatabuffers)
    .concat(prefixedRequirements)
    .concat(prefixedPorts);
  
  lines.push('module.exports = { createModel, ' + sanitizeId(modelName) + (allExportedTypes.length > 0 ? ', ' + allExportedTypes.map(sanitizeId).join(', ') : '') + ' };');
  // Sanity check: fail-fast if any emitted line attempts to initialize an owner-level
  // `.ports` object like: if (!this.X.ports) this.X.ports = {};
  // This enforces the invariant that component constructors in the runtime
  // (SysADLBase) are the canonical initializer for `.ports` and prevents
  // older generator code-paths from reintroducing the literal.
  const forbidden = /^\s*if\s*\(\s*![^)]+\.ports\s*\)\s*[^;\n]*\.ports\s*=\s*\{\s*\}\s*;?\s*$/i;
  const bad = lines.filter(l => forbidden.test(l));
  if (bad.length) {
    const msg = 'Generator invariant violated: owner-level `.ports` initializer emission detected.\n' + bad.slice(0,10).map((s,i)=>`${i+1}) ${s}`).join('\n');
    if (process.env.SYSADL_STRICT === '1') {
      throw new Error(msg);
    } else {
      console.warn('[WARN] ' + msg + '\nSet SYSADL_STRICT=1 to treat this as an error.');
    }
  }

  return lines.join('\n');
}

// Generate environment/scenario module
function generateEnvironmentModule(modelName, environmentElements, traditionalElements, ast, embeddedTypes, packageMap, inputFileName = null) {
  const lines = [];
  
  // Use filename-based model name if provided
  const actualModelName = inputFileName ? path.basename(inputFileName, path.extname(inputFileName)) : modelName;
  
  // Import SysADL base classes and traditional model
  lines.push(`// Environment and Scenario Module for ${actualModelName}`);
  lines.push(`// Auto-generated by SysADL Transformer - Hybrid Implementation`);
  lines.push(`const { EnvironmentDefinition, EnvironmentConfiguration, Entity, Event, Scene, Scenario, ScenarioExecution, EventsDefinitions, SceneDefinitions, ScenarioDefinitions, Connection } = require('../sysadl-framework/SysADLBase');`);
  lines.push(`const { TaskExecutor } = require('../sysadl-framework/TaskExecutor');`);
  lines.push(`const { createModel } = require('./${actualModelName}');`);
  lines.push('');
  
  // Generate environment/scenario specific classes
  const environmentDefinitions = [];
  const environmentConfigurations = [];
  const eventDefinitions = [];
  const sceneDefinitions = [];
  const scenarioDefinitions = [];
  const scenarioExecutions = [];
  
  // Collect all elements first
  traverse(ast, node => {
    if (node && node.type) {
      if (node.type === 'EnvironmentDefinition') {
        const className = sanitizeId(node.name) || 'UnnamedEnvironment';
        environmentDefinitions.push({ element: node, className });
      } else if (node.type === 'EnvironmentConfiguration') {
        const className = sanitizeId(node.name) || 'UnnamedConfiguration';
        environmentConfigurations.push({ element: node, className });
      } else if (node.type === 'EventsDefinitions') {
        const className = sanitizeId(node.name) || 'UnnamedEvents';
        eventDefinitions.push({ element: node, className });
      } else if (node.type === 'SceneDefinitions') {
        const className = sanitizeId(node.name) || 'UnnamedScenes';
        sceneDefinitions.push({ element: node, className });
      } else if (node.type === 'ScenarioDefinitions') {
        const className = sanitizeId(node.name) || 'UnnamedScenarios';
        scenarioDefinitions.push({ element: node, className });
      } else if (node.type === 'ScenarioExecution') {
        const className = sanitizeId(`${node.defs || 'Unnamed'}Execution`) || 'UnnamedExecution';
        scenarioExecutions.push({ element: node, className });
      }
    }
  });
  
  // Generate Entity classes from environment definitions (FIRST)
  for (const { element } of environmentDefinitions) {
    const entityTypes = extractEntityTypes(element);
    for (const [typeName, typeDef] of Object.entries(entityTypes)) {
      const entityClassName = sanitizeId(typeName);
      lines.push(`// Entity: ${typeName}`);
      lines.push(`class ${entityClassName} extends Entity {`);
      lines.push(`  constructor(name, opts = {}) {`);
      
      // Initialize default properties structure (defined in EnvironmentDefinition)
      if (typeDef.properties && Object.keys(typeDef.properties).length > 0) {
        lines.push(`    // Initialize default properties structure`);
        lines.push(`    const defaultProperties = {};`);
        for (const [propName, propType] of Object.entries(typeDef.properties)) {
          lines.push(`    defaultProperties.${propName} = null; // Type: ${propType}`);
        }
        lines.push(`    `);
        lines.push(`    // Merge with provided properties (EnvironmentConfiguration values)`);
        lines.push(`    const mergedProperties = { ...defaultProperties, ...(opts.properties || {}) };`);
        lines.push(`    `);
      } else {
        lines.push(`    const mergedProperties = opts.properties || {};`);
        lines.push(`    `);
      }
      
      lines.push(`    super(name, {`);
      lines.push(`      ...opts,`);
      lines.push(`      entityType: '${typeName}',`);
      lines.push(`      properties: mergedProperties,`);
      lines.push(`      roles: ${JSON.stringify(typeDef.roles || [])}`);
      lines.push(`    });`);
      lines.push(`    `);
      
      // Add composition structure for entities like Lane
      if (typeDef.entities) {
        lines.push(`    // Composition structure`);
        lines.push(`    this.entities = {};`);
        for (const [compName, compType] of Object.entries(typeDef.entities)) {
          if (compType.endsWith('[]')) {
            // Array composition
            const elementType = compType.slice(0, -2);
            lines.push(`    this.entities.${compName} = []; // Array of ${elementType}`);
          } else {
            // Single composition
            lines.push(`    this.entities.${compName} = null; // ${compType}`);
          }
        }
        lines.push(`    `);
      }
      
      lines.push(`  }`);
      lines.push(`}`);
      lines.push('');
    }
  }
  
  // Generate Connection classes from environment definitions (SECOND)
  for (const { element } of environmentDefinitions) {
    const connections = extractConnections(element);
    for (const [connectionName, connectionDef] of Object.entries(connections)) {
      const connectionClassName = sanitizeId(connectionName);
      lines.push(`// Connection: ${connectionName}`);
      lines.push(`class ${connectionClassName} extends Connection {`);
      lines.push(`  constructor(name = '${connectionName}', opts = {}) {`);
      lines.push(`    super(name, {`);
      lines.push(`      ...opts,`);
      lines.push(`      connectionType: '${connectionDef.type}',`);
      lines.push(`      from: '${connectionDef.from}',`);
      lines.push(`      to: '${connectionDef.to}'`);
      lines.push(`    });`);
      lines.push(`  }`);
      lines.push(`}`);
      lines.push('');
    }
  }
  

  
  // Generate EnvironmentDefinition classes (New Class-Oriented Architecture)
  for (const { element, className } of environmentDefinitions) {
    const entityTypes = extractEntityTypes(element);
    const connections = extractConnections(element);
    
    lines.push(`// Environment Definition: ${element.name}`);
    lines.push(`class ${className} extends EnvironmentDefinition {`);
    lines.push(`  constructor() {`);
    lines.push(`    super('${element.name}');`);
    lines.push(`    `);
    
    // Register entity classes automatically
    lines.push(`    // Register entity classes for factory usage`);
    for (const typeName of Object.keys(entityTypes)) {
      const entityClassName = sanitizeId(typeName);
      lines.push(`    this.registerEntityClass('${typeName}', ${entityClassName});`);
    }
    lines.push(`    `);
    
    
    // Generate connection class registrations
    const connectionClassNames = Object.keys(connections).map(name => sanitizeId(name));
    lines.push(`    // Register connection classes for factory usage`);
    connectionClassNames.forEach(className => {
      lines.push(`    this.registerConnectionClass('${className}', ${className});`);
    });
    lines.push(`  }`);
    lines.push(`}`);
    lines.push('');
  }
  
  // Generate EnvironmentConfiguration classes (New Class-Oriented Architecture)
  for (const { element, className } of environmentConfigurations) {
    const configName = element.name || element.id || 'UnnamedConfiguration';
    const targetName = element.definition || element.target || element.to || 'UnnamedEnvironment';
    
    lines.push(`// Environment Configuration: ${configName}`);
    lines.push(`class ${className} extends EnvironmentConfiguration {`);
    lines.push(`  constructor() {`);
    lines.push(`    const environmentDefinition = new ${targetName}();`);
    lines.push(`    super('${configName}', { environmentDef: environmentDefinition });`);
    lines.push(`    `);
    
    // Extract associations from bindings 
    const associations = extractAssociations(element);
    lines.push(`    // Associations (role bindings)`);
    lines.push(`    this.associations = ${JSON.stringify(associations, null, 2).replace(/\n/g, '\n    ')};`);
    lines.push(`    `);
    
    // Generate entity instances
    const instances = extractInstances(element);
    const compositions = extractCompositions(element);
    
    lines.push(`    // Entity instances`);
    for (const [instName, instInfo] of Object.entries(instances)) {
      const entityType = instInfo.type || instInfo.definition;
      if (entityType && !instName.includes(':') && instName !== 'Vehicle' && instName !== 'Supervisory') {
        // Check if this instance has property assignments
        const properties = instInfo.properties || {};
        const propertiesStr = Object.keys(properties).length > 0 ? 
          `, { properties: ${JSON.stringify(properties)} }` : '';
        
        lines.push(`    this.${instName} = this.createEntity('${entityType}'${propertiesStr});`);
      }
    }
    
    lines.push(`    `);
    
    // Generate compositions
    lines.push(`    // Compositions`);
    for (const [compPath, compValue] of Object.entries(compositions)) {
      lines.push(`    ${compPath} = ${compValue};`);
    }
    
    lines.push(`  }`);
    lines.push(`}`);
    lines.push('');
  }
  
  // 5. Event classes removed - functionality moved to EventsDefinitions only
  // This eliminates code duplication and reduces file size significantly
  
  // 6. Generate EventsDefinitions classes
  for (const { element, className } of eventDefinitions) {
    const eventsName = element.name || element.id || 'UnnamedEvents';
    const targetName = element.config || element.target || element.to || 'UnnamedConfiguration';
    const { events, eventClasses } = extractEvents(element);
    
    lines.push(`// Events Definitions: ${eventsName}`);
    lines.push(`class ${className} extends EventsDefinitions {`);
    lines.push(`  constructor(name = '${eventsName}', opts = {}) {`);
    lines.push(`    super(name, {`);
    lines.push(`      ...opts,`);
    lines.push(`      targetConfiguration: '${targetName}'`);
    lines.push(`    });`);
    lines.push('');
    lines.push(`    // Initialize TaskExecutor for hybrid execution`);
    lines.push(`    this.taskExecutor = new TaskExecutor({});`);
    lines.push('');
    
    // Generate individual event properties and methods
    for (const eventClass of eventClasses) {
      lines.push(`    // ${eventClass.name} Event Definition`);
      lines.push(`    this.${eventClass.name} = {`);
      lines.push(`      name: '${eventClass.name}',`);
      lines.push(`      type: '${eventClass.type}',`);
      lines.push(`      target: '${eventClass.target}',`);
      lines.push(`      rules: [`);
      
      for (const rule of eventClass.rules) {
        lines.push(`        {`);
        lines.push(`          trigger: '${rule.trigger}',`);
        lines.push(`          tasks: {`);
        
        // Generate tasks as pure JavaScript functions
        for (const action of rule.actions) {
          lines.push(`            ${action.name}: (context) => {`);
          
          // Generate pure JavaScript from action body
          if (action.body && action.body.length > 0) {
            for (const bodyLine of action.body) {
              // bodyLine already comes as JavaScript from convertStatementsToJS
              lines.push(`              ${bodyLine}`);
            }
          }
          
          lines.push(`              return true;`);
          lines.push(`            },`);
        }
        
        lines.push(`          },`);
        lines.push(`          execute: (context) => {`);
        lines.push(`            if (context.sysadlBase && context.sysadlBase.logger) context.sysadlBase.logger.log('⚡ Executing ${eventClass.name}: ${rule.trigger} -> ${rule.actions.map(a => a.name).join(', ')}');`);
        lines.push(`            const results = [];`);
        lines.push(`            const currentRule = this.${eventClass.name}.rules.find(r => r.trigger === '${rule.trigger}');`);
        
        for (const action of rule.actions) {
          lines.push(`            results.push(currentRule.tasks.${action.name}(context));`);
        }
        
        lines.push(`            return results;`);
        lines.push(`          }`);
        lines.push(`        },`);
      }
      
      lines.push(`      ],`);
      lines.push(`      hasRule: (triggerName) => {`);
      lines.push(`        return this.${eventClass.name}.rules.some(rule => rule.trigger === triggerName);`);
      lines.push(`      },`);
      lines.push(`      executeRule: (triggerName, context) => {`);
      lines.push(`        const rule = this.${eventClass.name}.rules.find(r => r.trigger === triggerName);`);
      lines.push(`        return rule ? rule.execute(context) : null;`);
      lines.push(`      }`);
      lines.push(`    };`);
      lines.push('');
    }
    
    // Close constructor
    lines.push(`  }`);
    lines.push('');
    
    // Generate action methods
    const actionMap = new Map();
    for (const eventClass of eventClasses) {
      for (const rule of eventClass.rules) {
        for (const action of rule.actions) {
          if (!actionMap.has(action.name)) {
            actionMap.set(action.name, action);
          }
        }
      }
    }
    
    // executeEvent method now inherited from EventsDefinitions base class
    lines.push(`}`);
    lines.push('');
  }

  // 7. Generate Enhanced Scene classes with JavaScript-native conditions
  for (const { element } of sceneDefinitions) {
    const scenes = extractScenesEnhanced(element);
    for (const [sceneName, sceneDef] of Object.entries(scenes)) {
      const sceneClassName = sanitizeId(sceneName);
      lines.push(`// Enhanced Scene: ${sceneName}`);
      lines.push(`class ${sceneClassName} extends Scene {`);
      lines.push(`  constructor(name = '${sceneName}', opts = {}) {`);
      lines.push(`    super(name, {`);
      lines.push(`      ...opts,`);
      lines.push(`      sceneType: 'scene',`);
      lines.push(`      startEvent: '${sceneDef.startEvent || ''}',`);
      lines.push(`      finishEvent: '${sceneDef.finishEvent || ''}',`);
      lines.push(`      entities: [],`);
      lines.push(`      initialStates: ${JSON.stringify(sceneDef.initialStates || {})}`);
      lines.push(`    });`);
      lines.push(`  }`);
      lines.push(``);
      
      // Generate JavaScript-native pre-condition method
      lines.push(`  /**`);
      lines.push(`   * Evaluates pre-conditions using JavaScript functions instead of JSON`);
      lines.push(`   * @param {Object} context - Execution context with entities and state`);
      lines.push(`   * @returns {boolean} - True if all pre-conditions are satisfied`);
      lines.push(`   */`);
      lines.push(`  validatePreConditions(context) {`);
      lines.push(generateJavaScriptConditions(sceneDef.preConditions, 'pre'));
      lines.push(`  }`);
      lines.push(``);
      
      // Generate JavaScript-native post-condition method
      lines.push(`  /**`);
      lines.push(`   * Evaluates post-conditions using JavaScript functions instead of JSON`);
      lines.push(`   * @param {Object} context - Execution context with entities and state`);
      lines.push(`   * @returns {boolean} - True if all post-conditions are satisfied`);
      lines.push(`   */`);
      lines.push(`  validatePostConditions(context) {`);
      lines.push(generateJavaScriptConditions(sceneDef.postConditions, 'post'));
      lines.push(`  }`);
      lines.push(`}`);
      lines.push('');
    }
  }

  // 8. Generate SceneDefinitions classes
  for (const { element, className } of sceneDefinitions) {
    const scenesName = element.name || element.id || 'UnnamedScenes';
    const targetName = element.events || element.target || element.to || 'UnnamedEvents';
    lines.push(`// Scene Definitions: ${scenesName}`);
    lines.push(`class ${className} extends SceneDefinitions {`);
    lines.push(`  constructor(name = '${scenesName}', opts = {}) {`);
    lines.push(`    super(name, {`);
    lines.push(`      ...opts,`);
    lines.push(`      targetEvents: '${targetName}',`);
    lines.push(`      scenes: ${JSON.stringify(extractScenes(element))}`);
    lines.push(`    });`);
    lines.push(`  }`);
    lines.push(`}`);
    lines.push('');
  }

  // 9. Generate Scenario classes (individual scenarios before ScenarioDefinitions)
  for (const { element } of scenarioDefinitions) {
    const scenarios = extractScenariosEnhanced(element);
    for (const [scenarioName, scenarioDef] of Object.entries(scenarios)) {
      const scenarioClassName = sanitizeId(scenarioName);
      lines.push(`class ${scenarioClassName} extends Scenario {`);
      lines.push(`  constructor(name = '${scenarioName}', opts = {}) {`);
      lines.push(`    super(name, {`);
      lines.push(`      ...opts,`);
      lines.push(`      scenarioType: 'scenario'`);
      lines.push(`    });`);
      lines.push(`  }`);
      lines.push(``);
      
      // Generate JavaScript execution method with explicit programming structures
      lines.push(`  async execute(context) {`);
      lines.push(generateJavaScriptScenarioExecution(scenarioDef.programmingStructures));
      lines.push(`  }`);
      lines.push(`}`);
      lines.push('');
    }
  }

  // 10. Generate ScenarioDefinitions classes
  for (const { element, className } of scenarioDefinitions) {
    const scenariosName = element.name || element.id || 'UnnamedScenarios';
    const targetName = element.scenes || element.target || element.to || 'UnnamedScenes';
    const scenarios = extractScenariosEnhanced(element);
    
    lines.push(`class ${className} extends ScenarioDefinitions {`);
    lines.push(`  constructor(name = '${scenariosName}', opts = {}) {`);
    lines.push(`    super(name, {`);
    lines.push(`      ...opts,`);
    lines.push(`      targetScenes: '${targetName}',`);
    lines.push(`      scenarios: ${JSON.stringify(extractScenarios(element))}`);
    lines.push(`    });`);
    lines.push(``);
    
    // Add scenario registry
    for (const [scenarioName] of Object.entries(scenarios)) {
      const scenarioClassName = sanitizeId(scenarioName);
      lines.push(`    this.addScenario('${scenarioName}', ${scenarioClassName});`);
    }
    
    lines.push(`  }`);
    lines.push(`}`);
    lines.push('');
  }

  // 11. Event classes removed - Enhanced Scene/Scenario functionality integrated
  // All Scene classes are now generated in section 7 with JavaScript-native conditions
  // All Scenario classes are generated in section 9 
  // All functionality consolidated to eliminate duplication
  
  // Generate ScenarioExecution classes with explicit programming
  for (const { element, className } of scenarioExecutions) {
    const targetName = element.defs || element.target || element.to || element.scenarios || 'UnnamedScenarios';
    const executionName = `${targetName}Execution`;
    const executionData = extractScenarioExecutionEnhanced(element);
    
    lines.push(`// Scenario Execution with Explicit Programming: ${executionName}`);
    lines.push(`class ${className} extends ScenarioExecution {`);
    lines.push(`  constructor(name = '${executionName}', opts = {}) {`);
    lines.push(`    super(name, {`);
    lines.push(`      ...opts,`);
    lines.push(`      targetScenarios: '${targetName}'`);
    lines.push(`    });`);
    lines.push(`  }`);
    lines.push(``);
    
    // Generate explicit JavaScript start() method that overrides base class
    lines.push(`  start() {`);
    lines.push(`    // Build execution context`);
    lines.push(`    const context = this.buildExecutionContext();`);
    lines.push(``);
    lines.push(`    // Execute scenario logic asynchronously`);
    lines.push(`    this.executeAsync(context).catch(error => {`);
    lines.push(`      if (this.model?.logger) {`);
    lines.push(`        this.model.logger.logExecution({`);
    lines.push(`          type: 'scenario.execution.failed',`);
    lines.push(`          name: this.name,`);
    lines.push(`          context: { error: error.message, stack: error.stack }`);
    lines.push(`        });`);
    lines.push(`      }`);
    lines.push(`      console.error('[ERROR] Scenario execution failed:', error);`);
    lines.push(`    });`);
    lines.push(``);
    lines.push(`    // Return true immediately to indicate execution started`);
    lines.push(`    return true;`);
    lines.push(`  }`);
    lines.push(``);
    lines.push(`  async executeAsync(context) {`);
    lines.push(`    try {`);
    lines.push(generateExplicitScenarioExecution(executionData));
    lines.push(`    } catch (error) {`);
    lines.push(`      throw error;`);
    lines.push(`    }`);
    lines.push(`  }`);
    lines.push(`}`);
    lines.push('');
  }
  
  // Generate factory function to create integrated model
  lines.push(`function createEnvironmentModel() {`);
  lines.push(`  const model = createModel(); // Get traditional model`);
  lines.push(`  `);
  lines.push(`  // Initialize scenario execution capabilities`);
  lines.push(`  model.initializeScenarioExecution();`);
  lines.push(`  `);
  lines.push(`  // Add environment/scenario elements to model`);
  lines.push(`  model.environments = {};`);
  lines.push(`  model.events = {};`);
  lines.push(`  model.scenes = {};`);
  lines.push(`  model.scenarios = {};`);
  lines.push(`  model.scenarioExecutions = {};`);
  lines.push(`  `);
  
  // Instantiate environment definitions
  for (const { element, className } of environmentDefinitions) {
    lines.push(`  model.environments['${element.name}'] = new ${className}();`);
  }
  
  // Instantiate environment configurations
  for (const { element, className } of environmentConfigurations) {
    const configName = element.name || element.id || 'UnnamedConfiguration';
    lines.push(`  model.environments['${configName}'] = new ${className}();`);
  }
  
  // Instantiate event definitions with Proxy pattern
  for (const { element, className } of eventDefinitions) {
    const eventsName = element.name || 'UnnamedEvents';
    lines.push(`  model.events['${eventsName}'] = new ${className}();`);
  }
  
  // Instantiate scene definitions
  for (const { element, className } of sceneDefinitions) {
    const scenesName = element.name || 'UnnamedScenes';
    lines.push(`  model.scenes['${scenesName}'] = new ${className}();`);
  }
  
  // Instantiate scenario definitions
  for (const { element, className } of scenarioDefinitions) {
    const scenariosName = element.name || 'UnnamedScenarios';
    lines.push(`  model.scenarios['${scenariosName}'] = new ${className}();`);
  }
  
  // Add individual scene classes to context for execution
  for (const { element } of sceneDefinitions) {
    const scenes = extractScenesEnhanced(element);
    for (const [sceneName] of Object.entries(scenes)) {
      const sceneClassName = sanitizeId(sceneName);
      lines.push(`  model.scenes['${sceneName}'] = ${sceneClassName};`);
    }
  }
  
  // Add individual scenario classes to context for execution
  for (const { element } of scenarioDefinitions) {
    const scenarios = extractScenariosEnhanced(element);
    for (const [scenarioName] of Object.entries(scenarios)) {
      const scenarioClassName = sanitizeId(scenarioName);
      lines.push(`  model.scenarios['${scenarioName}'] = ${scenarioClassName};`);
    }
  }
  
  // Instantiate scenario executions
  for (const { element, className } of scenarioExecutions) {
    const targetName = element.defs || element.target || element.to || element.scenarios || 'UnnamedScenarios';
    const executionName = `${targetName}Execution`;
    lines.push(`  model.scenarioExecutions['${executionName}'] = new ${className}();`);
    lines.push(`  model.registerScenarioExecution(model.scenarioExecutions['${executionName}']);`);
  }
  
  lines.push(`  `);
  lines.push(`  // Setup environment bindings if needed`);
  lines.push(`  // TODO: Implement automatic binding setup based on model analysis`);
  lines.push(`  `);
  lines.push(`  return model;`);
  lines.push(`}`);
  lines.push('');
  
  // Export classes and factory - including individual Scene and Scenario classes
  const sceneClassNames = [];
  const scenarioClassNames = [];
  
  // Extract individual Scene class names
  for (const { element } of sceneDefinitions) {
    const scenes = extractScenesEnhanced(element);
    for (const sceneName of Object.keys(scenes)) {
      sceneClassNames.push(sanitizeId(sceneName));
    }
  }
  
  // Extract individual Scenario class names  
  for (const { element } of scenarioDefinitions) {
    const scenarios = extractScenariosEnhanced(element);
    for (const scenarioName of Object.keys(scenarios)) {
      scenarioClassNames.push(sanitizeId(scenarioName));
    }
  }
  
  const allClasses = [
    ...environmentDefinitions.map(d => d.className),
    ...environmentConfigurations.map(d => d.className),
    ...eventDefinitions.map(d => d.className),
    ...sceneDefinitions.map(d => d.className),
    ...scenarioDefinitions.map(d => d.className),
    ...scenarioExecutions.map(d => d.className),
    ...sceneClassNames, // Individual Scene classes
    ...scenarioClassNames // Individual Scenario classes
  ];
  
  lines.push(`module.exports = { createEnvironmentModel${allClasses.length > 0 ? ', ' + allClasses.join(', ') : ''} };`);
  
  return lines.join('\n');
}

// Helper functions to extract information from environment elements
function extractEntityTypes(element) {
  const entityTypes = {};
  
  if (!element || !element.entities) return entityTypes;
  
  // Look through entities array directly
  for (const entity of element.entities) {
    if (entity && entity.type === 'EntityDef') {
      const entityName = entity.name || (entity.id && entity.id.name) || entity.id;
      if (entityName) {
        const properties = {};
        const roles = [];  // Array instead of object
        const entities = {}; // For composition structures
        
        // Extract properties from propertyDefs
        if (entity.propertyDefs && Array.isArray(entity.propertyDefs)) {
          for (const prop of entity.propertyDefs) {
            if (prop.type === 'PropertyDef') {
              const propName = prop.name || (prop.id && prop.id.name) || prop.id;
              if (propName) {
                properties[propName] = prop.valueType || 'String';
              }
            }
          }
        }
        
        // Also check deprecated 'properties' field for backward compatibility
        if (entity.properties && Array.isArray(entity.properties)) {
          for (const prop of entity.properties) {
            if (prop.type === 'PropertyDef') {
              const propName = prop.name || (prop.id && prop.id.name) || prop.id;
              if (propName) {
                properties[propName] = prop.valueType || 'String';
              }
            }
          }
        }
        
        // Extract roles
        if (entity.roles && Array.isArray(entity.roles)) {
          for (const role of entity.roles) {
            if (role.type === 'RoleDef') {
              const roleName = role.name || (role.id && role.id.name) || role.id;
              if (roleName) {
                // Since it's in roles{}, just collect the role names
                roles.push(roleName);
              }
            }
          }
        }
        
        // Extract entity compositions (like Lane with entities { stations: Station[], ... })
        if (entity.compositions && entity.compositions.type === 'EntityUseList' && entity.compositions.items) {
          for (const item of entity.compositions.items) {
            // Each item is an array with composition details
            if (Array.isArray(item) && item.length >= 5) {
              const compItem = item[4]; // The actual composition definition
              if (compItem && compItem.name && compItem.type) {
                const compName = compItem.name;
                const compType = compItem.type;
                const isArray = compItem.arrayIndex !== null;
                
                entities[compName] = isArray ? `${compType}[]` : compType;
              }
            }
          }
        }
        
        const entityTypeInfo = {
          properties,
          roles,
          defaultProperties: properties
        };
        
        // Add entities composition if present
        if (Object.keys(entities).length > 0) {
          entityTypeInfo.entities = entities;
        }
        
        entityTypes[entityName] = entityTypeInfo;
      }
    }
  }
  
  return entityTypes;
}

function extractEventTypes(element) {
  const eventTypes = {};
  
  if (!element || !element.body) return eventTypes;
  
  traverse(element, node => {
    if (node && node.type === 'EventDef') {
      const eventName = node.name || (node.id && node.id.name) || node.id;
      if (eventName) {
        eventTypes[eventName] = {
          type: 'complex',
          parameters: [],
          triggers: []
        };
      }
    }
  });
  
  return eventTypes;
}

// Convert action statements to JavaScript code
function convertStatementsToJS(statements) {
  if (!statements || !Array.isArray(statements)) return [];
  
  const codeLines = [];
  
  for (const stmt of statements) {
    switch (stmt.type) {
      case 'Assignment':
        // Handle assignments like supervisor.outCommand.destination=stationC
        const leftSide = stmt.left;
        const rightValue = convertExpressionToJS(stmt.right);
        codeLines.push(`${leftSide} = ${rightValue};`);
        break;
        
      case 'Invocation':
        // Handle connection invocations like :Command(supervisor, agv2) - Using SysADLRuntimeHelpers
        const connection = stmt.connection;
        const args = stmt.args && stmt.args.items ? stmt.args.items.join(', ') : '';
        codeLines.push(`// Connection: ${connection}(${args})`);
        if (args.trim()) {
          const argsList = args.split(',').map(arg => arg.trim());
          if (argsList.length >= 2) {
            codeLines.push(`if (context.sysadlBase && context.sysadlBase.helpers) {`);
            codeLines.push(`  context.sysadlBase.helpers.executeConnection('${connection}', '${argsList[0]}', '${argsList[1]}');`);
            codeLines.push(`}`);
          } else {
            codeLines.push(`// Connection ${connection} with insufficient arguments`);
          }
        } else {
          codeLines.push(`// Connection ${connection} with no arguments`);
        }
        break;
        
      case 'ExpressionStatement':
        // Handle standalone expressions
        const exprCode = convertExpressionToJS(stmt.expression);
        codeLines.push(`${exprCode};`);
        break;
        
      case 'IfStatement':
        // Handle conditional statements
        const condition = convertExpressionToJS(stmt.condition);
        codeLines.push(`if (${condition}) {`);
        if (stmt.then) {
          const thenStatements = convertStatementsToJS(Array.isArray(stmt.then) ? stmt.then : [stmt.then]);
          thenStatements.forEach(line => codeLines.push(`  ${line}`));
        }
        if (stmt.else) {
          codeLines.push(`} else {`);
          const elseStatements = convertStatementsToJS(Array.isArray(stmt.else) ? stmt.else : [stmt.else]);
          elseStatements.forEach(line => codeLines.push(`  ${line}`));
        }
        codeLines.push(`}`);
        break;
        
      case 'WhileStatement':
        // Handle while loops
        const whileCondition = convertExpressionToJS(stmt.condition);
        codeLines.push(`while (${whileCondition}) {`);
        if (stmt.body) {
          const bodyStatements = convertStatementsToJS(Array.isArray(stmt.body) ? stmt.body : [stmt.body]);
          bodyStatements.forEach(line => codeLines.push(`  ${line}`));
        }
        codeLines.push(`}`);
        break;
        
      case 'ForStatement':
        // Handle for loops
        const init = stmt.init ? convertExpressionToJS(stmt.init) : '';
        const test = stmt.test ? convertExpressionToJS(stmt.test) : '';
        const update = stmt.update ? convertExpressionToJS(stmt.update) : '';
        codeLines.push(`for (${init}; ${test}; ${update}) {`);
        if (stmt.body) {
          const forBodyStatements = convertStatementsToJS(Array.isArray(stmt.body) ? stmt.body : [stmt.body]);
          forBodyStatements.forEach(line => codeLines.push(`  ${line}`));
        }
        codeLines.push(`}`);
        break;
        
      case 'BlockStatement':
        // Handle block statements
        if (stmt.statements) {
          const blockStatements = convertStatementsToJS(stmt.statements);
          blockStatements.forEach(line => codeLines.push(line));
        }
        break;
        
      case 'ReturnStatement':
        // Handle return statements
        const returnValue = stmt.value ? convertExpressionToJS(stmt.value) : '';
        codeLines.push(`return ${returnValue};`);
        break;
        
      case 'VariableDeclaration':
        // Handle variable declarations like let x = 5;
        const varName = stmt.name || (stmt.id && stmt.id.name) || 'unknown';
        const varValue = stmt.init ? convertExpressionToJS(stmt.init) : 'undefined';
        const varType = stmt.kind || 'let'; // let, const, var
        codeLines.push(`${varType} ${varName} = ${varValue};`);
        break;
        
      default:
        console.warn(`Warning: Unknown statement type '${stmt.type}' in convertStatementsToJS`);
        codeLines.push(`// Unknown statement type: ${stmt.type}`);
        // Try to extract any useful information
        if (stmt.expression) {
          const fallbackCode = convertExpressionToJS(stmt.expression);
          codeLines.push(`${fallbackCode};`);
        }
        break;
    }
  }
  
  return codeLines;
}

// Convert expression AST to JavaScript code
function convertExpressionToJS(expr) {
  if (!expr) return 'null';
  
  switch (expr.type) {
    case 'NameExpression':
      // Handle enum values and identifiers
      return `'${expr.name}'`;
      
    case 'StringLiteral':
      return `"${expr.value}"`;
      
    case 'NumberLiteral':
    case 'IntLiteral':
    case 'RealLiteral':
      return expr.value;
      
    case 'BooleanLiteral':
      return expr.value;
      
    case 'QualifiedName':
      // Handle qualified names like stationA.ID
      if (expr.parts && Array.isArray(expr.parts)) {
        return `'${expr.parts.join('.')}'`;
      }
      return `'${expr.name || 'unknown'}'`;
      
    case 'PropertyAccess':
      // Handle property access like obj.property
      const objName = convertExpressionToJS(expr.object);
      const propName = expr.property;
      return `${objName.replace(/'/g, '')}.${propName}`;
      
    case 'ArrayExpression':
      // Handle array literals
      if (expr.elements && Array.isArray(expr.elements)) {
        const elements = expr.elements.map(el => convertExpressionToJS(el)).join(', ');
        return `[${elements}]`;
      }
      return '[]';
      
    case 'ObjectExpression':
      // Handle object literals
      if (expr.properties && Array.isArray(expr.properties)) {
        const props = expr.properties.map(prop => {
          const key = prop.key ? convertExpressionToJS(prop.key) : '"unknown"';
          const value = prop.value ? convertExpressionToJS(prop.value) : 'null';
          return `${key}: ${value}`;
        }).join(', ');
        return `{${props}}`;
      }
      return '{}';
      
    case 'BinaryExpression':
      // Handle binary operations like a + b, a == b
      const left = convertExpressionToJS(expr.left);
      const right = convertExpressionToJS(expr.right);
      return `${left} ${expr.operator} ${right}`;
      
    case 'UnaryExpression':
      // Handle unary operations like !expr, -expr
      const operand = convertExpressionToJS(expr.operand);
      return `${expr.operator}${operand}`;
      
    case 'ConditionalExpression':
      // Handle ternary operator: condition ? then : else
      const test = convertExpressionToJS(expr.test);
      const consequent = convertExpressionToJS(expr.consequent);
      const alternate = convertExpressionToJS(expr.alternate);
      return `${test} ? ${consequent} : ${alternate}`;
      
    case 'CallExpression':
      // Handle function calls
      const callee = convertExpressionToJS(expr.callee);
      const args = expr.arguments ? expr.arguments.map(arg => convertExpressionToJS(arg)).join(', ') : '';
      return `${callee}(${args})`;
      
    default:
      console.warn(`Warning: Unknown expression type '${expr.type}' in convertExpressionToJS`);
      // Try to extract a reasonable value
      if (expr.name) return `'${expr.name}'`;
      if (expr.value !== undefined) return JSON.stringify(expr.value);
      if (expr.id) return `'${expr.id}'`;
      return `'${expr.type || 'unknown'}'`;
  }
}

function extractProperties(element) {
  const properties = {};
  
  if (!element || !element.body) return properties;
  
  traverse(element, node => {
    if (node && node.type === 'PropertyDef') {
      const propName = node.name || (node.id && node.id.name) || node.id;
      if (propName) {
        properties[propName] = node.valueType || node.type || 'String';
      }
    }
  });
  
  return properties;
}

function extractEvents(element) {
  const events = {};
  const eventClasses = [];
  
  if (!element || !element.eventDefs) return { events, eventClasses };
  
  // Process EventDef nodes directly from eventDefs array
  for (const eventDef of element.eventDefs) {
    if (eventDef && eventDef.type === 'EventDef') {
      const eventDefName = eventDef.name || (eventDef.id && eventDef.id.name) || eventDef.id;
      if (eventDefName) {
        const eventRules = [];
        
        // Extract ON...THEN rules from triggers
        if (eventDef.triggers && Array.isArray(eventDef.triggers)) {
          for (const trigger of eventDef.triggers) {
            if (trigger.type === 'TriggerBlock') {
              const triggerName = trigger.condition ? trigger.condition.name : 'unknown';
              const actions = [];
              
              // Extract THEN actions
              if (trigger.actions && Array.isArray(trigger.actions)) {
                for (const action of trigger.actions) {
                  if (action.type === 'ActionBlock') {
                    // Convert statements to JavaScript code
                    const bodyCode = convertStatementsToJS(action.statements || []);
                    actions.push({
                      name: action.name,
                      body: bodyCode
                    });
                  }
                }
              }
              
              eventRules.push({
                trigger: triggerName,
                actions: actions,
                conditions: trigger.condition ? [trigger.condition] : []
              });
            }
          }
        }
        
        // Create individual event class structure
        const eventClass = {
          name: eventDefName,
          target: eventDef.target,
          rules: eventRules,
          type: 'rule-based'
        };
        
        eventClasses.push(eventClass);
        
        // Simplified structure for backward compatibility
        events[eventDefName] = {
          type: 'rule-based',
          target: eventDef.target,
          parameters: [],
          rules: eventRules
        };
      }
    }
  }
  
  return { events, eventClasses };
}

function extractScenes(element) {
  const scenes = {};
  
  if (!element || !element.body) return scenes;
  
  // Look for Scene def nodes
  traverse(element, node => {
    if (node && node.type === 'SceneDef') {
      const sceneName = node.name || (node.id && node.id.name) || node.id;
      if (sceneName) {
        const preConditions = [];
        const postConditions = [];
        
        // Extract pre and post conditions
        if (node.preConditions && Array.isArray(node.preConditions)) {
          preConditions.push(...node.preConditions);
        }
        
        if (node.postConditions && Array.isArray(node.postConditions)) {
          postConditions.push(...node.postConditions);
        }
        
        scenes[sceneName] = {
          initialStates: {},
          preConditions,
          postConditions,
          startEvent: node.startEvent || node.start,
          finishEvent: node.finishEvent || node.finish
        };
      }
    }
  });
  
  return scenes;
}

// Enhanced Scene extraction with proper condition handling
function extractScenesEnhanced(element) {
  const scenes = {};
  
  if (!element || !element.scenes) return scenes;
  
  // Process scenes array directly from the SceneDefinitions element
  for (const sceneDef of element.scenes) {
    if (sceneDef && sceneDef.type === 'SceneDef') {
      const sceneName = sceneDef.name || (sceneDef.id && sceneDef.id.name) || sceneDef.id;
      if (sceneName) {
        const preConditions = [];
        const postConditions = [];
        
        // Extract pre-conditions from preconds array
        if (sceneDef.preconds && Array.isArray(sceneDef.preconds)) {
          preConditions.push(...sceneDef.preconds.map(cond => {
            if (cond.type === 'ConditionBlock') {
              return {
                expression: `${cond.name} == ${cond.value}`,
                type: 'condition',
                name: cond.name,
                value: cond.value
              };
            }
            return {
              expression: cond.expression || cond.condition || cond.statement || String(cond),
              type: 'condition'
            };
          }));
        }
        
        // Extract post-conditions from postconds array  
        if (sceneDef.postconds && Array.isArray(sceneDef.postconds)) {
          postConditions.push(...sceneDef.postconds.map(cond => {
            if (cond.type === 'ConditionBlock') {
              return {
                expression: `${cond.name} == ${cond.value}`,
                type: 'condition',
                name: cond.name,
                value: cond.value
              };
            }
            return {
              expression: cond.expression || cond.condition || cond.statement || String(cond),
              type: 'condition'
            };
          }));
        }
        
        scenes[sceneName] = {
          initialStates: {},
          preConditions,
          postConditions,
          startEvent: sceneDef.start || sceneDef.startEvent,
          finishEvent: sceneDef.finish || sceneDef.finishEvent
        };
      }
    }
  }
  
  return scenes;
}

/**
 * Generates JavaScript-native condition functions for Scene classes
 * Converts JSON-based conditions to functional JavaScript code with context validation
 * @param {Array} conditions - Array of condition objects from extractScenesEnhanced
 * @param {string} conditionType - 'pre' or 'post' for condition type
 * @returns {string} - JavaScript function code as string
 */
function generateJavaScriptConditions(conditions, conditionType) {
  if (!conditions || conditions.length === 0) {
    return `    // No ${conditionType}-conditions defined
    return true;`;
  }
  
  const functionBody = [];
  functionBody.push(`    // Enhanced ${conditionType}-condition validation with context support`);
  functionBody.push(`    if (!context) {`);
  functionBody.push(`      throw new Error('Context is required for ${conditionType}-condition evaluation');`);
  functionBody.push(`    }`);
  functionBody.push(``);
  functionBody.push(`    try {`);
  
  // Track declared entities to avoid duplicates
  const declaredEntities = new Set();
  
  // Generate condition checks
  const conditionChecks = [];
  conditions.forEach((condition, index) => {
    const expression = condition.expression || '';
    
    // Parse entity.property == value patterns
    const match = expression.match(/^(\w+)\.(\w+)\s*==\s*(.+)$/);
    if (match) {
      const [, entityName, property, expectedValue] = match;
      
      functionBody.push(`      // Condition ${index + 1}: ${expression}`);
      
      // Declare entity only if not already declared
      if (!declaredEntities.has(entityName)) {
        functionBody.push(`      const ${entityName}Entity = this.getEntity(context, '${entityName}');`);
        functionBody.push(`      if (!${entityName}Entity) {`);
        functionBody.push(`        throw new Error('Entity ${entityName} not found in context');`);
        functionBody.push(`      }`);
        declaredEntities.add(entityName);
      }
      
      const conditionVar = `condition${index + 1}`;
      
      // Handle different value types
      if (expectedValue.includes('.ID')) {
        // Handle stationC.ID references
        const stationMatch = expectedValue.match(/^(\w+)\.ID$/);
        if (stationMatch) {
          const [, stationName] = stationMatch;
          
          // Declare station entity only if not already declared
          if (!declaredEntities.has(stationName)) {
            functionBody.push(`      const ${stationName}Entity = this.getEntity(context, '${stationName}');`);
            functionBody.push(`      if (!${stationName}Entity) {`);
            functionBody.push(`        throw new Error('Entity ${stationName} not found in context');`);
            functionBody.push(`      }`);
            declaredEntities.add(stationName);
          }
          
          functionBody.push(`      const ${conditionVar} = this.compareValues(${entityName}Entity.${property}, ${stationName}Entity.properties.ID);`);
        }
      } else {
        // Handle direct string values
        const cleanValue = expectedValue.replace(/['"]/g, '');
        functionBody.push(`      const ${conditionVar} = this.compareValues(${entityName}Entity.${property}, '${cleanValue}');`);
      }
      
      conditionChecks.push(conditionVar);
    } else {
      // Fallback for complex expressions
      functionBody.push(`      // Complex condition ${index + 1}: ${expression}`);
      const conditionVar = `condition${index + 1}`;
      functionBody.push(`      const ${conditionVar} = true; // TODO: Implement complex expression parsing`);
      conditionChecks.push(conditionVar);
    }
  });
  
  functionBody.push(``);
  if (conditionChecks.length > 1) {
    functionBody.push(`      // All conditions must be satisfied`);
    functionBody.push(`      const allConditionsMet = ${conditionChecks.join(' && ')};`);
    functionBody.push(`      return allConditionsMet;`);
  } else if (conditionChecks.length === 1) {
    functionBody.push(`      return ${conditionChecks[0]};`);
  }
  
  functionBody.push(`    } catch (error) {`);
  functionBody.push(`      console.error(\`Error evaluating ${conditionType}-conditions for \${this.name}:\`, error.message);`);
  functionBody.push(`      return false;`);
  functionBody.push(`    }`);
  
  return functionBody.join('\n');
}

function extractScenarios(element) {
  const scenarios = {};
  
  if (!element || !element.body) return scenarios;
  
  // Look for Scenario def nodes
  traverse(element, node => {
    if (node && node.type === 'ScenarioDef') {
      const scenarioName = node.name || (node.id && node.id.name) || node.id;
      if (scenarioName) {
        const scenes = [];
        const logic = [];
        
        // Extract referenced scenes and execution logic
        if (node.body && Array.isArray(node.body)) {
          for (const item of node.body) {
            if (typeof item === 'string') {
              // Simple scene reference
              scenes.push(item);
            } else if (item.type === 'SceneRef') {
              scenes.push(item.name || item.id);
            } else if (item.type === 'LoopStatement') {
              logic.push({
                type: 'loop',
                condition: item.condition,
                body: item.body
              });
            }
          }
        }
        
        scenarios[scenarioName] = {
          scenes,
          logic,
          preConditions: [],
          postConditions: []
        };
      }
    }
  });
  
  return scenarios;
}

/**
 * Generate JavaScript execution code for scenario programming structures
 * Translates SysADL programming constructs to explicit JavaScript code
 * @param {Array} programmingStructures - Array of programming structure objects
 * @returns {string} - JavaScript function body code
 */
function generateJavaScriptScenarioExecution(programmingStructures) {
  if (!programmingStructures || programmingStructures.length === 0) {
    return `    return { success: true, message: 'Empty scenario executed' };`;
  }
  
  const functionBody = [];
  functionBody.push(`    if (!context || !context.scenes) {`);
  functionBody.push(`      throw new Error('Context with scenes registry is required for scenario execution');`);
  functionBody.push(`    }`);
  functionBody.push(``);
  
  // Track declared variables
  const declaredVariables = new Set();
  
  // Process each programming structure
  for (const structure of programmingStructures) {
    console.log(`DEBUG: Processing structure type ${structure.type}:`, JSON.stringify(structure, null, 2));
    
    switch (structure.type) {
      case 'VarDec':
      case 'VariableDecl':
        // let i: Integer = 1;
        console.log(`DEBUG: Variable declaration structure:`, JSON.stringify(structure, null, 2));
        
        const varName = structure.name || (structure.id && structure.id.name) || structure.id;
        let varValue = '1'; // default
        
        // Try multiple ways to extract the value
        if (structure.value) {
          if (Array.isArray(structure.value) && structure.value.length >= 3) {
            // Format: ["=", [" "], {type: "NumberLiteral", value: 1}]
            const valueObj = structure.value[2];
            if (valueObj && typeof valueObj === 'object') {
              if (valueObj.value !== undefined) {
                varValue = valueObj.value;
              } else if (valueObj.literal !== undefined) {
                varValue = valueObj.literal;
              } else {
                varValue = JSON.stringify(valueObj);
              }
            }
          } else if (typeof structure.value === 'object' && structure.value.value !== undefined) {
            varValue = structure.value.value;
          } else if (typeof structure.value === 'object' && structure.value.literal) {
            varValue = structure.value.literal.value || structure.value.literal;
          } else if (typeof structure.value === 'number' || typeof structure.value === 'string') {
            varValue = structure.value;
          } else {
            console.log(`DEBUG: Cannot extract value from:`, JSON.stringify(structure.value, null, 2));
            varValue = '1'; // fallback
          }
        } else if (structure.init) {
          // Alternative property name for initial value
          if (typeof structure.init === 'object' && structure.init.value !== undefined) {
            varValue = structure.init.value;
          } else if (typeof structure.init === 'object' && structure.init.literal) {
            varValue = structure.init.literal.value || structure.init.literal;
          } else {
            varValue = structure.init;
          }
        }
        
        console.log(`DEBUG: Extracted varName=${varName}, varValue=${varValue}`);
        
        if (varName && !declaredVariables.has(varName)) {
          functionBody.push(`    let ${varName} = ${varValue};`);
          declaredVariables.add(varName);
        }
        break;
        
      case 'While':
      case 'WhileStatement':
        // while (i < 5) { ... }
        let condition = 'true'; // default
        
        if (structure.condition) {
          if (typeof structure.condition === 'string') {
            condition = structure.condition;
          } else if (typeof structure.condition === 'object' && structure.condition.left && (structure.condition.op || structure.condition.operator) && structure.condition.right) {
            // Binary expression like {left: {name: 'i'}, operator: '<', right: {value: 5}}
            const left = structure.condition.left.name || structure.condition.left;
            const op = structure.condition.op || structure.condition.operator;
            const right = structure.condition.right.value !== undefined ? structure.condition.right.value : structure.condition.right;
            condition = `${left} ${op} ${right}`;
          }
        }
        
        functionBody.push(`    while (${condition}) {`);
        
        // Process body statements
        const bodyStatements = structure.body ? 
          (Array.isArray(structure.body) ? structure.body : 
           (structure.body.body && Array.isArray(structure.body.body) ? structure.body.body : [])) : [];
        
        for (const bodyItem of bodyStatements) {
          console.log(`DEBUG: Processing body item type ${bodyItem.type}:`, JSON.stringify(bodyItem, null, 2));
          
          if (bodyItem.type === 'ScenarioRef') {
            // Scene or scenario call within while loop
            const sceneName = bodyItem.name;
            if (sceneName) {
              if (sceneName.includes('SCN_')) {
                const sanitizedSceneName = sanitizeId(sceneName);
                functionBody.push(`      // Execute scene with logging`);
                functionBody.push(`      if (context.model?.logger) {`);
                functionBody.push(`        context.model.logger.logExecution({`);
                functionBody.push(`          type: 'scene.execution.started',`);
                functionBody.push(`          name: '${sceneName}',`);
                functionBody.push(`          context: { withinLoop: true, scenario: this.name },`);
                functionBody.push(`          trace: { withinLoop: true, scenario: this.name, sceneName: '${sceneName}' }`);
                functionBody.push(`        });`);
                functionBody.push(`      }`);
                functionBody.push(`      const sceneStartTime_${sanitizedSceneName} = Date.now();`);
                functionBody.push(`      await this.executeScene('${sceneName}', context);`);
                functionBody.push(`      if (context.model?.logger) {`);
                functionBody.push(`        context.model.logger.logExecution({`);
                functionBody.push(`          type: 'scene.execution.completed',`);
                functionBody.push(`          name: '${sceneName}',`);
                functionBody.push(`          context: { withinLoop: true, scenario: this.name },`);
                functionBody.push(`          trace: { withinLoop: true, scenario: this.name, sceneName: '${sceneName}' },`);
                functionBody.push(`          metrics: { duration: Date.now() - sceneStartTime_${sanitizedSceneName} }`);
                functionBody.push(`        });`);
                functionBody.push(`      }`);
                functionBody.push(`      // Notify EventScheduler about scene completion`);
                functionBody.push(`      if (context.eventScheduler?.notifyScenarioCompleted) {`);
                functionBody.push(`        context.eventScheduler.notifyScenarioCompleted('${sceneName}');`);
                functionBody.push(`      }`);
              } else {
                functionBody.push(`      await this.executeScenario('${sceneName}', context);`);
              }
            }
          } else if (bodyItem.type === 'IncDec') {
            // i++
            const variable = bodyItem.name || 'i';
            const operator = bodyItem.op || '++';
            functionBody.push(`      ${variable}${operator};`);
          }
        }
        
        functionBody.push(`    }`);
        break;
        
      case 'ScenarioRef':
        // Scene or scenario call
        const refName = structure.name;
        if (refName) {
          if (refName.includes('SCN_')) {
            functionBody.push(`    // Execute scene with logging`);
            functionBody.push(`    if (context.model?.logger) {`);
            functionBody.push(`      context.model.logger.logExecution({`);
            functionBody.push(`        type: 'scene.execution.started',`);
            functionBody.push(`        name: '${refName}',`);
            functionBody.push(`        context: { scenario: this.name },`);
            functionBody.push(`        trace: { scenario: this.name, sceneName: '${refName}' }`);
            functionBody.push(`      });`);
            functionBody.push(`    }`);
            functionBody.push(`    const sceneStartTime_${sanitizeId(refName)} = Date.now();`);
            functionBody.push(`    await this.executeScene('${refName}', context);`);
            functionBody.push(`    if (context.model?.logger) {`);
            functionBody.push(`      context.model.logger.logExecution({`);
            functionBody.push(`        type: 'scene.execution.completed',`);
            functionBody.push(`        name: '${refName}',`);
            functionBody.push(`        context: { scenario: this.name },`);
            functionBody.push(`        trace: { scenario: this.name, sceneName: '${refName}' },`);
            functionBody.push(`        metrics: { duration: Date.now() - sceneStartTime_${sanitizeId(refName)} }`);
            functionBody.push(`      });`);
            functionBody.push(`    }`);
            functionBody.push(`    // Notify EventScheduler about scene completion`);
            functionBody.push(`    if (context.eventScheduler?.notifyScenarioCompleted) {`);
            functionBody.push(`      context.eventScheduler.notifyScenarioCompleted('${refName}');`);
            functionBody.push(`    }`);
          } else {
            functionBody.push(`    await this.executeScenario('${refName}', context);`);
          }
        }
        break;
        
      case 'IncDec':
        // i++
        const incVariable = structure.name || 'i';
        const incOperator = structure.op || '++';
        functionBody.push(`    ${incVariable}${incOperator};`);
        break;
        
      default:
        console.log(`DEBUG: Unknown structure type: ${structure.type}`);
        functionBody.push(`    // TODO: Handle ${structure.type}`);
        break;
    }
  }
  
  functionBody.push(``);
  functionBody.push(`    return { success: true, message: 'Scenario completed successfully' };`);
  
  return functionBody.join('\n');
}

// Generate explicit JavaScript execution for ScenarioExecution
// Helper function to generate clean injection syntax
function generateCleanInjectionSyntax(injection) {
  if (!injection || !injection.eventName) return '';
  
  const eventName = injection.eventName;
  
  if (injection.type === 'single') {
    if (injection.timing && injection.timing.type === 'after') {
      if (injection.timing.scenario) {
        // inject EventName after ScenarioName
        return `    // inject ${eventName} after ${injection.timing.scenario};`;
      } else if (injection.timing.delay) {
        // inject EventName after 5s
        return `    // inject ${eventName} after ${injection.timing.delay};`;
      }
    } else if (injection.timing && injection.timing.type === 'condition' && injection.timing.expression) {
      // inject EventName when condition
      return `    // inject ${eventName} when ${injection.timing.expression};`;
    } else {
      // inject EventName (immediate)
      return `    // inject ${eventName};`;
    }
  } else if (injection.type === 'batch') {
    const events = Array.isArray(injection.events) ? injection.events : [eventName];
    const eventList = events.map(e => e).join(', ');
    const mode = injection.mode || 'sequential';
    
    if (injection.timing && injection.timing.delay) {
      // inject_batch [event1, event2] parallel after 2s
      return `    // inject_batch [${eventList}] ${mode} after ${injection.timing.delay};`;
    } else {
      // inject_batch [event1, event2] sequential
      return `    // inject_batch [${eventList}] ${mode};`;
    }
  }
  
  return `    // inject ${eventName};`;
}

function generateExplicitScenarioExecution(executionData) {
  if (!executionData) {
    return `    return { success: true, message: 'Empty scenario execution completed' };`;
  }
  
  const functionBody = [];
  functionBody.push(`    if (!context || !context.scenarios) {`);
  functionBody.push(`      throw new Error('Context with scenarios registry is required for scenario execution');`);
  functionBody.push(`    }`);
  functionBody.push(``);
  
  // Log scenario execution start
  functionBody.push(`    // Log scenario execution start`);
  functionBody.push(`    if (context.model?.logger) {`);
  functionBody.push(`      context.model.logger.logExecution({`);
  functionBody.push(`        type: 'scenario.execution.started',`);
  functionBody.push(`        name: this.name,`);
  functionBody.push(`        context: { executionMode: '${executionData.executionMode || 'sequential'}' }`);
  functionBody.push(`      });`);
  functionBody.push(`    }`);
  functionBody.push(`    const executionStartTime = Date.now();`);
  functionBody.push(``);
  
  // 1. State initialization (explicit JavaScript)
  if (executionData.stateInitializations && executionData.stateInitializations.length > 0) {
    functionBody.push(`    // Initialize environment state`);
    for (const init of executionData.stateInitializations) {
      if (init.type === 'assignment' && init.target && init.value) {
        const pathParts = init.target.split('.');
        if (pathParts.length === 2) {
          // Direct entity property assignment like agv1.location via model
          functionBody.push(`    if (context.model?.environmentConfig) {`);
          functionBody.push(`      context.model.environmentConfig.${init.target} = '${init.value}';`);
          functionBody.push(`    }`);
        }
      }
    }
    functionBody.push(``);
  }
  
  // 2. Event injections (clean natural syntax)
  if (executionData.eventInjections && executionData.eventInjections.length > 0) {
    functionBody.push(`    // Event injections`);
    for (const injection of executionData.eventInjections) {
      const cleanSyntax = generateCleanInjectionSyntax(injection);
      if (cleanSyntax) {
        functionBody.push(cleanSyntax);
        
        // Generate corresponding implementation
        if (injection.type === 'single' && injection.eventName) {
          if (injection.timing && injection.timing.type === 'after' && injection.timing.scenario) {
            functionBody.push(`    if (context.eventScheduler) {`);
            functionBody.push(`      context.eventScheduler.scheduleAfterScenario('${injection.eventName}', '${injection.timing.scenario}');`);
            functionBody.push(`    }`);
          } else if (injection.timing && injection.timing.type === 'condition' && injection.timing.expression) {
            // Transform expression to access environmentConfig properties
            // Example: "agv1.location == stationA.ID" becomes 
            // "context.model?.environmentConfig?.agv1?.location == context.model?.environmentConfig?.stationA?.ID"
            let transformedExpr = injection.timing.expression;
            
            // Match entity property references (e.g., agv1.location, stationA.ID)
            transformedExpr = transformedExpr.replace(/(\w+)\.(\w+)/g, 
              (match, entity, property) => `context.model?.environmentConfig?.${entity}?.${property}`
            );
            
            functionBody.push(`    if (context.eventScheduler) {`);
            functionBody.push(`      context.eventScheduler.scheduleOnCondition('${injection.eventName}', () => ${transformedExpr});`);
            functionBody.push(`    }`);
          } else if (injection.timing && injection.timing.delay) {
            const delay = injection.timing.delay.replace(/s$/, '000'); // Convert 5s to 5000ms
            functionBody.push(`    if (context.model?.eventInjector) {`);
            functionBody.push(`      setTimeout(() => context.model.eventInjector.injectEvent('${injection.eventName}'), ${delay});`);
            functionBody.push(`    }`);
          } else {
            functionBody.push(`    if (context.model?.eventInjector) {`);
            functionBody.push(`      await context.model.eventInjector.injectEvent('${injection.eventName}');`);
            functionBody.push(`    }`);
          }
        }
      }
    }
    functionBody.push(``);
  }
  
  // 3. Scenario executions (explicit JavaScript)
  if (executionData.scenarios && executionData.scenarios.length > 0) {
    functionBody.push(`    // Execute scenarios`);
    for (const scenario of executionData.scenarios) {
      if (scenario.name) {
        functionBody.push(`    await this.executeScenario('${scenario.name}', context);`);
      }
    }
    functionBody.push(``);
  }
  
  // 4. Repeat statements (explicit JavaScript)
  if (executionData.repeatStatements && executionData.repeatStatements.length > 0) {
    functionBody.push(`    // Repeat executions`);
    for (const repeat of executionData.repeatStatements) {
      if (repeat.scenario && repeat.count) {
        functionBody.push(`    for (let i = 0; i < ${repeat.count}; i++) {`);
        functionBody.push(`      await this.executeScenario('${repeat.scenario}', context);`);
        functionBody.push(`    }`);
      }
    }
    functionBody.push(``);
  }
  
  // Log scenario execution completion
  functionBody.push(`    // Log scenario execution completion`);
  functionBody.push(`    if (context.model?.logger) {`);
  functionBody.push(`      context.model.logger.logExecution({`);
  functionBody.push(`        type: 'scenario.execution.completed',`);
  functionBody.push(`        name: this.name,`);
  functionBody.push(`        context: { executionMode: '${executionData.executionMode || 'sequential'}' },`);
  functionBody.push(`        metrics: { duration: Date.now() - executionStartTime }`);
  functionBody.push(`      });`);
  functionBody.push(`    }`);
  functionBody.push(``);
  functionBody.push(`    return { success: true, message: 'Scenario execution completed successfully' };`);
  
  return functionBody.join('\n');
}

// Enhanced Scenario extraction with programming structures support
function extractScenariosEnhanced(element) {
  const scenarios = {};
  
  if (!element || !element.scenarios) return scenarios;
  
  // Process scenarios array directly from the ScenarioDefinitions element
  for (const scenarioDef of element.scenarios) {
    if (scenarioDef && scenarioDef.type === 'ScenarioDef') {
      const scenarioName = scenarioDef.name || (scenarioDef.id && scenarioDef.id.name) || scenarioDef.id;
      if (scenarioName) {
        const scenes = [];
        const programmingStructures = [];
        
        // DEBUG: Log scenario structure
        console.log(`DEBUG: Processing scenario ${scenarioName}, body:`, JSON.stringify(scenarioDef.body, null, 2));
        
        // Extract body items (programming structures and scene references)
        if (scenarioDef.body && Array.isArray(scenarioDef.body)) {
          for (const item of scenarioDef.body) {
            console.log(`DEBUG: Processing item type ${item.type}:`, JSON.stringify(item, null, 2));
            
            if (item.type === 'ScenarioRef') {
              // Scene or Scenario reference
              scenes.push(item.name);
              programmingStructures.push(item);
            } else if (item.type === 'VarDec' || item.type === 'VariableDecl') {
              // Variable declaration (let i: Integer = 1)
              programmingStructures.push(item);
            } else if (item.type === 'While' || item.type === 'WhileStatement') {
              // While loop structure
              programmingStructures.push(item);
              // Extract scenes from within the while loop
              if (item.body && Array.isArray(item.body)) {
                for (const bodyItem of item.body) {
                  if (bodyItem.type === 'ScenarioRef') {
                    scenes.push(bodyItem.name);
                  }
                }
              }
            } else if (item.type === 'IncDec') {
              // Increment/decrement statements
              programmingStructures.push(item);
            } else {
              // Any other programming structure
              programmingStructures.push(item);
            }
          }
        }
        
        scenarios[scenarioName] = {
          scenes,
          programmingStructures,
          preConditions: [],
          postConditions: []
        };
      }
    }
  }
  
  return scenarios;
}

function extractScenarioExecutionEnhanced(element) {
  const execution = {
    scenarios: [],
    stateInitializations: [],
    repeatStatements: [],
    eventInjections: [],
    executionMode: 'sequential'
  };
  
  if (!element || !element.items) return execution;
  
  for (const item of element.items) {
    switch (item.type) {
      case 'Assignment':
        // State initialization like "agv1.location = stationC.ID;"
        execution.stateInitializations.push({
          type: 'assignment',
          target: item.left,
          value: item.right.name || item.right.value || item.right,
          source: item.right
        });
        break;
        
      case 'SceneRef':
        // Scenario execution like "Scenario1;"
        execution.scenarios.push({
          type: 'scenario',
          name: item.ref,
          mode: 'normal'
        });
        break;
        
      case 'ExecutionEntry':
        // Repeat statement like "repeat 5 Scenario1;"
        execution.repeatStatements.push({
          type: 'repeat',
          count: parseInt(item.repeat) || 1,
          scenario: item.scenario
        });
        break;
        
      case 'EventInjection':
        // Event injection like "inject eventName;"
        execution.eventInjections.push(parseEventInjectionStatement(item));
        break;
        
      case 'EventInjectionBatch':
        // Batch event injection like "inject_batch [event1, event2] parallel;"
        execution.eventInjections.push(parseEventInjectionBatchStatement(item));
        break;
        
      default:
        // Handle other types if needed
        break;
    }
  }
  
  return execution;
}

function parseEventInjectionStatement(stmt) {
  // Parse event injection: inject eventName [timing]
  return {
    type: 'single',
    eventName: stmt.eventName || stmt.name,
    timing: parseEventTiming(stmt.timing),
    parameters: stmt.parameters || {},
    options: stmt.options || {}
  };
}

function parseEventInjectionBatchStatement(stmt) {
  // Parse batch event injection: inject_batch [event1, event2] [mode]
  return {
    type: 'batch',
    events: stmt.events || [],
    mode: stmt.mode || 'sequential', // sequential or parallel
    timing: parseEventTiming(stmt.timing),
    options: stmt.options || {}
  };
}

// Helper function to convert AST expression to string
function astExpressionToStringGlobal(node) {
  if (!node) return '';
  
  // If node is already a string, return it
  if (typeof node === 'string') {
    return node;
  }
  
  switch (node.type) {
    case 'BinaryExpression':
    case 'ComparisonExpression':
    case 'LogicalExpression':
      const left = astExpressionToStringGlobal(node.left);
      const right = astExpressionToStringGlobal(node.right);
      const op = node.operator;
      return `${left} ${op} ${right}`;
      
    case 'NameExpression':
      return node.name || '';
      
    case 'NaturalLiteral':
      return String(node.value || 0);
      
    case 'RealLiteral':
      return String(node.value || 0.0);
      
    case 'StringLiteral':
      return `"${node.value || ''}"`;
      
    case 'PropertyAccessExpression':
    case 'MemberAccessExpression':
      const object = node.object ? astExpressionToStringGlobal(node.object) : '';
      const property = node.property || node.member || '';
      return `${object}.${property}`;
      
    default:
      // For unknown types, try to handle them gracefully
      if (node.value !== undefined) {
        return String(node.value);
      }
      
      if (node.name) {
        return node.name;
      }
      
      return '';
  }
}

function parseEventTiming(timing) {
  if (!timing) return { type: 'immediate' };
  
  switch (timing.type) {
    case 'delay':
      return { type: 'delay', value: timing.value || 0 };
    case 'condition':
      // Convert AST expression to JavaScript string
      const expression = timing.expression ? astExpressionToStringGlobal(timing.expression) : 'true';
      return { type: 'condition', expression: expression };
    case 'before':
      return { type: 'before', scenario: timing.scenario };
    case 'after':
      return { type: 'after', scenario: timing.scenario };
    default:
      return { type: 'immediate' };
  }
}

function extractBindings(element) {
  const bindings = {};
  
  if (!element || !element.body) return bindings;
  
  // Extract binding configurations from EnvironmentConfiguration body
  if (Array.isArray(element.body)) {
    for (const item of element.body) {
      if (item.type === 'Binding' && item.left && item.right) {
        bindings[item.left] = item.right;
      }
    }
  }
  
  return bindings;
}

function extractInstances(element) {
  const instances = {};
  
  if (!element || !element.mappings) return instances;
  
  // Extract instance declarations from EnvironmentConfiguration mappings
  for (const mapping of element.mappings) {
    // Instance declaration like "agv1:Vehicle;"
    if (mapping.type === 'Instantiation' && mapping.instance && mapping.entityType) {
      instances[mapping.instance] = {
        type: mapping.entityType,
        properties: {}
      };
    }
    // Property assignment like "stationA.ID = "StationA";"
    else if (mapping.type === 'Assignment' && mapping.left && mapping.right) {
      if (mapping.left.includes('.') && !mapping.left.includes(':') && !mapping.left.includes('.entities.')) {
        const [instanceName, propertyName] = mapping.left.split('.');
        
        // Initialize instance if not exist (could be inferred from property assignment)
        if (!instances[instanceName]) {
          instances[instanceName] = {
            type: null, // Will be inferred or explicitly declared later
            properties: {}
          };
        }
        
        // Add property
        let propertyValue = mapping.right;
        if (mapping.right.type === 'StringLiteral') {
          propertyValue = mapping.right.value;
        }
        instances[instanceName].properties[propertyName] = propertyValue;
      }
    }
  }
  
  return instances;
}

function extractConnections(element) {
  const connections = {};
  
  if (!element || !element.connections) return connections;
  
  // Look through connections array directly
  for (const conn of element.connections) {
    if (conn && conn.type === 'ConnectionDef') {
      const connectionName = conn.name || (conn.id && conn.id.name) || conn.id;
      if (connectionName) {
        // Extract from and to endpoints
        let fromEndpoint = null;
        let toEndpoint = null;
        
        if (conn.from) {
          if (conn.from.entity && conn.from.port) {
            fromEndpoint = `${conn.from.entity}.${conn.from.port}`;
          }
        }
        
        if (conn.to) {
          if (conn.to.entity && conn.to.port) {
            toEndpoint = `${conn.to.entity}.${conn.to.port}`;
          }
        }
        
        connections[connectionName] = {
          type: 'connection',
          from: fromEndpoint,
          to: toEndpoint
        };
      }
    }
  }
  
  return connections;
}

function extractExecutionMode(element) {
  if (!element || !element.mode) return 'sequential';
  
  // Extract execution mode from element
  if (element.mode === 'parallel') return 'parallel';
  if (element.mode === 'conditional') return 'conditional';
  
  return 'sequential';
}

// New helper functions for class-oriented architecture

function extractAssociations(element) {
  const associations = {};
  
  if (!element || !element.mappings) return associations;
  
  // Extract role associations from EnvironmentConfiguration mappings
  for (const mapping of element.mappings) {
    if (mapping.type === 'Association' && mapping.source && mapping.target) {
      associations[mapping.source] = mapping.target;
    }
  }
  
  return associations;
}

function extractCompositions(element) {
  const compositions = {};
  
  if (!element || !element.mappings) return compositions;
  
  // Extract composition assignments like lane1.entities.stations = [stationA, stationB, stationC]
  for (const mapping of element.mappings) {
    if (mapping.type === 'Assignment' && mapping.left && mapping.right) {
      // Check if this is a composition assignment (instanceName.entities.property = [values])
      if (mapping.left.includes('.entities.')) {
        const leftPath = `this.${mapping.left}`;
        // Parse the right side - could be an array literal or single value
        let rightValue;
        if (mapping.right.type === 'ArrayLiteralExpression' && Array.isArray(mapping.right.elements)) {
          // Array of instance references
          rightValue = `[${mapping.right.elements.map(ref => `this.${ref}`).join(', ')}]`;
        } else if (typeof mapping.right === 'string') {
          // Single value
          rightValue = `this.${mapping.right}`;
        } else {
          // Fallback for other types
          rightValue = `this.${mapping.right}`;
        }
        compositions[leftPath] = rightValue;
      }
    }
  }
  
  return compositions;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) { console.error('Usage: transformer.js <input.sysadl> [outdir_or_outfile]'); process.exit(2); }
  const input = path.resolve(argv[0]);
  
  // Check for environment/scenario generation flags
  const forceEnvGeneration = argv.includes('env') || argv.includes('scen');
  
  // Always generate files in the 'generated' directory
  const outDir = path.join(__dirname, 'generated');
  let outFile = null; // Let the system generate appropriate filenames
  
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const parserPath = path.join(__dirname, 'sysadl-parser.js');
  const parse = await loadParser(parserPath);
  const src = fs.readFileSync(input, 'utf8');
  const ast = parse(src, { grammarSource: { source: input, text: src } });

  // Save AST to file for debugging/analysis (will be deleted later)
  try {
    const astDir = path.join(__dirname, 'generated', 'ast');
    const modelName = path.basename(input, path.extname(input));
    const astPath = path.join(astDir, `${modelName}.ast`);
    fs.writeFileSync(astPath, JSON.stringify(ast, null, 2), 'utf8');
  } catch (e) {
    // Silent fail - AST saving is optional
  }

  // annotate AST nodes with __parent to allow finding enclosing configuration scopes
  (function attachParents(root) {
    function rec(node, parent) {
      if (!node || typeof node !== 'object') return;
      try { Object.defineProperty(node, '__parent', { value: parent, enumerable: false, writable: true }); } catch(e){}
      for (const k of Object.keys(node)) {
        if (k === '__parent') continue;
        const v = node[k];
        if (v === parent) continue; // avoid stepping back into parent
        if (Array.isArray(v)) v.forEach(item => rec(item, node)); else if (v && typeof v === 'object') rec(v, node);
      }
    }
    rec(root, null);
  })(ast);

  const compDefMap = {};
  traverse(ast, n => { if (n && (n.type === 'ComponentDef' || /ComponentDef/i.test(n.type))) { const nm = n.name || (n.id && n.id.name) || n.id || null; if (nm) compDefMap[nm] = n; } });

  // collect connector definitions (so we can use participants/flows to qualify bindings)
  const connectorDefMap = {};
  traverse(ast, n => { if (n && (n.type === 'ConnectorDef' || /ConnectorDef/i.test(n.type))) { const nm = n.name || (n.id && n.id.name) || n.id || null; if (nm) connectorDefMap[nm] = n; } });

  // collect port definitions (port def nodes) so we can expand participant port sets for connector definitions
  const portDefMap = {};
  traverse(ast, n => { if (n && (n.type === 'PortDef' || /PortDef/i.test(n.type) || (n.type && /port\s+def/i.test(String(n.type))))) { const nm = n.name || (n.id && n.id.name) || n.id || null; if (nm) portDefMap[nm] = n; } });

  // collect packages and map elements to their packages
  const packageMap = {}; // element name -> package name
  const packageDefMap = {}; // package name -> package node
  
  function collectPackageElements(node, packageName) {
    if (!node || typeof node !== 'object') return;
    
    // Map different types of elements to their package
    if (node.type === 'ComponentDef' || /ComponentDef/i.test(node.type) || node.type === 'Component') {
      const nm = node.name || (node.id && node.id.name) || node.id || null;
      if (nm) packageMap[nm] = packageName;
    }
    if (node.type === 'PortDef' || /PortDef/i.test(node.type) || node.type === 'Port') {
      const nm = node.name || (node.id && node.id.name) || node.id || null;
      if (nm) packageMap[nm] = packageName;
    }
    if (node.type === 'ConnectorDef' || /ConnectorDef/i.test(node.type) || node.type === 'Connector') {
      const nm = node.name || (node.id && node.id.name) || node.id || null;
      if (nm) packageMap[nm] = packageName;
    }
    if (node.type === 'DataTypeDef' || /DataTypeDef/i.test(node.type) || node.type === 'DataType') {
      const nm = node.name || (node.id && node.id.name) || node.id || null;
      if (nm) packageMap[nm] = packageName;
    }
    if (node.type === 'ValueType' || /ValueType/i.test(node.type) || node.type === 'ValueTypeDef') {
      const nm = node.name || (node.id && node.id.name) || node.id || null;
      if (nm) packageMap[nm] = packageName;
    }
    if (node.type === 'Enumeration' || /Enumeration/i.test(node.type) || node.type === 'Enum' || node.type === 'EnumDef') {
      const nm = node.name || (node.id && node.id.name) || node.id || null;
      if (nm) packageMap[nm] = packageName;
    }
    if (node.type === 'Dimension' || /Dimension/i.test(node.type) || node.type === 'DimensionDef') {
      const nm = node.name || (node.id && node.id.name) || node.id || null;
      if (nm) packageMap[nm] = packageName;
    }
    if (node.type === 'Unit' || /Unit/i.test(node.type) || node.type === 'UnitDef') {
      const nm = node.name || (node.id && node.id.name) || node.id || null;
      if (nm) packageMap[nm] = packageName;
    }
    if (node.type === 'Activity' || /Activity/i.test(node.type) || node.type === 'ActivityDef') {
      const nm = node.name || (node.id && node.id.name) || node.id || null;
      if (nm) packageMap[nm] = packageName;
    }
    if (node.type === 'Action' || /Action/i.test(node.type) || node.type === 'ActionDef') {
      const nm = node.name || (node.id && node.id.name) || node.id || null;
      if (nm) packageMap[nm] = packageName;
    }
    if (node.type === 'Executable' || /Executable/i.test(node.type) || node.type === 'ExecutableDef') {
      const nm = node.name || (node.id && node.id.name) || node.id || null;
      if (nm) packageMap[nm] = packageName;
    }
    if (node.type === 'Pin' || /Pin/i.test(node.type) || node.type === 'PinDef') {
      const nm = node.name || (node.id && node.id.name) || node.id || null;
      if (nm) packageMap[nm] = packageName;
    }
    if (node.type === 'Constraint' || /Constraint/i.test(node.type) || node.type === 'ConstraintDef') {
      const nm = node.name || (node.id && node.id.name) || node.id || null;
      if (nm) packageMap[nm] = packageName;
    }
    if (node.type === 'DataBuffer' || /DataBuffer/i.test(node.type) || node.type === 'DataBufferDef') {
      const nm = node.name || (node.id && node.id.name) || node.id || null;
      if (nm) packageMap[nm] = packageName;
    }
    if (node.type === 'Requirement' || /Requirement/i.test(node.type) || node.type === 'RequirementDef') {
      const nm = node.name || (node.id && node.id.name) || node.id || null;
      if (nm) packageMap[nm] = packageName;
    }
    
    // Recursively process children
    for (const key in node) {
      if (Array.isArray(node[key])) {
        node[key].forEach(child => collectPackageElements(child, packageName));
      } else if (node[key] && typeof node[key] === 'object') {
        collectPackageElements(node[key], packageName);
      }
    }
  }

  traverse(ast, n => {
    if (n && (n.type === 'Package' || /Package/i.test(n.type))) {
      const packageName = n.name || (n.id && n.id.name) || n.id || null;
      if (packageName) {
        packageDefMap[packageName] = n;
        // Collect all elements within this package
        collectPackageElements(n, packageName);
      }
    }
  });

  // Function to detect environment/scenario elements in AST
  function hasEnvironmentElements(ast) {
    let hasEnvElements = false;
    traverse(ast, n => {
      if (!n || typeof n !== 'object') return;
      const nodeType = n.type || '';
      
      // Check for ScenarioExecution specifically
      if (n.keyword === 'ScenarioExecution' || (n.name === 'ScenarioExecution')) {
        hasEnvElements = true;
        return;
      }
      
      if (nodeType === 'EnvironmentDefinition' || 
          nodeType === 'EnvironmentConfiguration' ||
          nodeType === 'EventsDefinitions' ||
          nodeType === 'SceneDefinitions' ||
          nodeType === 'ScenarioDefinitions' ||
          nodeType === 'ScenarioExecution' ||
          /Environment/i.test(nodeType) ||
          /Scenario/i.test(nodeType) ||
          /Scene/i.test(nodeType) ||
          /Event.*Definition/i.test(nodeType)) {
        hasEnvElements = true;
      }
    });
    return hasEnvElements;
  }

  // Function to separate traditional and environment/scenario elements
  function separateElements(ast) {
    const traditionalElements = [];
    const environmentElements = [];
    
    traverse(ast, n => {
      if (!n || typeof n !== 'object') return;
      const nodeType = n.type || '';
      
      // Environment/Scenario elements
      if (nodeType === 'EnvironmentDefinition' || 
          nodeType === 'EnvironmentConfiguration' ||
          nodeType === 'EventsDefinitions' ||
          nodeType === 'SceneDefinitions' ||
          nodeType === 'ScenarioDefinitions' ||
          nodeType === 'ScenarioExecution' ||
          /Environment/i.test(nodeType) ||
          /Scenario/i.test(nodeType) ||
          /Scene/i.test(nodeType) ||
          /Event.*Definition/i.test(nodeType)) {
        environmentElements.push(n);
      }
      // Traditional elements
      else if (nodeType === 'ComponentDef' ||
               nodeType === 'ConnectorDef' ||
               nodeType === 'PortDef' ||
               nodeType === 'ActivityDef' ||
               nodeType === 'ActionDef' ||
               nodeType === 'ConstraintDef' ||
               nodeType === 'Executable' ||
               nodeType === 'Configuration' ||
               /ComponentDef/i.test(nodeType) ||
               /ConnectorDef/i.test(nodeType) ||
               /PortDef/i.test(nodeType)) {
        traditionalElements.push(n);
      }
    });
    
    return { traditionalElements, environmentElements };
  }

  // collect SysADL types to embed
  function qnameToString(x){ try{ if(!x) return null; if(typeof x==='string') return x; if (x.name) return x.name; if (x.id && x.id.name) return x.id.name; if (Array.isArray(x.parts)) return x.parts.join('.'); }catch(e){} return null; }
  function attrTypeOf(a){ try{ if(!a) return null; if (a.definition) return qnameToString(a.definition); if (a.type) return qnameToString(a.type); if (a.valueType) return qnameToString(a.valueType); if (a.value) return qnameToString(a.value); }catch(e){} return null; }
  const embeddedTypes = { datatypes: {}, valueTypes: {}, enumerations: {}, dimensions: {}, units: {}, ports: {} };
  
  // Define primitive types that are already available in SysADLBase
  const primitiveTypes = new Set(['Int', 'Boolean', 'String', 'Real', 'Void']);
  
  traverse(ast, n => {
    if (!n || typeof n !== 'object') return;
    try {
      if (n.type === 'DataTypeDef' || /DataTypeDef/i.test(n.type)) {
        const name = n.name || (n.id && n.id.name) || n.id || null; if (!name) return;
        const superType = qnameToString(n.superType || n.extends || n.super || null);
        const attrs = [];
        const attrsRaw = n.attributes || n.attrs || n.properties || [];
        if (Array.isArray(attrsRaw)) for (const it of attrsRaw) { try { const an = it && (it.name || (it.id && it.id.name) || it.id) || null; if (!an) continue; const at = attrTypeOf(it); attrs.push({ name: String(an), type: at || null }); } catch(e){} }
        embeddedTypes.datatypes[String(name)] = { extends: superType || null, attributes: attrs };
      } else if (n.type === 'ValueType' || /ValueType/i.test(n.type)) {
        const name = n.name || (n.id && n.id.name) || n.id || null; if (!name) return;
        
        // Skip primitive types - they are already available in SysADLBase
        if (primitiveTypes.has(name)) {
          return;
        }
        
        const superType = qnameToString(n.superType || n.extends || null);
        const unit = qnameToString(n.unit || null);
        const dimension = qnameToString(n.dimension || null);
        embeddedTypes.valueTypes[String(name)] = { extends: superType || null, unit: unit || null, dimension: dimension || null };
      } else if (n.type === 'Enumeration' || /Enumeration/i.test(n.type) || n.type === 'EnumDef' || /Enum/i.test(n.type)) {
        const name = n.name || (n.id && n.id.name) || n.id || null; if (!name) return;
        let literals = [];
        if (Array.isArray(n.literals)) literals = n.literals.map(x => x && (x.name || (x.id && x.id.name) || x)).filter(Boolean).map(String);
        else if (Array.isArray(n.values)) literals = n.values.map(v => String(v)).filter(Boolean);
        else if (typeof n.content === 'string') literals = n.content.split(/[\,\s]+/).map(s=>s.trim()).filter(Boolean);
        else if (n.enumLiteralValueList && Array.isArray(n.enumLiteralValueList)) literals = n.enumLiteralValueList.map(x => x && (x.name || (x.id && x.id.name) || x)).filter(Boolean).map(String);
        if (literals.length > 0) {
          embeddedTypes.enumerations[String(name)] = literals;
        }
      } else if (n.type === 'Dimension' || /Dimension/i.test(n.type)) {
        const name = n.name || (n.id && n.id.name) || n.id || null; if (!name) return;
        embeddedTypes.dimensions[String(name)] = {};
      } else if (n.type === 'Unit' || /Unit/i.test(n.type)) {
        const name = n.name || (n.id && n.id.name) || n.id || null; if (!name) return;
        const dimension = qnameToString(n.dimension || null);
        embeddedTypes.units[String(name)] = { dimension: dimension || null };
      } else if (n.type === 'PortDef' || /PortDef/i.test(n.type) || n.type === 'CompositePortDef' || /CompositePortDef/i.test(n.type)) {
        const name = n.name || (n.id && n.id.name) || n.id || null; if (!name) return;
        // Extract direction and type from flow properties
        let direction = 'in'; // default
        let expectedType = null;
        let isComposite = n.type === 'CompositePortDef' || /CompositePortDef/i.test(n.type);
        let subports = {};
        
        // Check if this port has a 'ports' section (composite port)
        if (n.ports || n.subports || (Array.isArray(n.elements) && n.elements.some(e => e && e.type === 'PortDef'))) {
          isComposite = true;
          
          // Extract sub-ports from the ports section
          const portsSection = n.ports || n.subports || n.elements || [];
          if (Array.isArray(portsSection)) {
            for (const subportNode of portsSection) {
              try {
                // Handle PortUse in composite port definitions
                if (subportNode && (subportNode.type === 'PortUse' || /PortUse/i.test(subportNode.type))) {
                  const subportName = subportNode.name || (subportNode.id && subportNode.id.name) || subportNode.id || null;
                  const subportDefinition = subportNode.definition || subportNode.def || null;
                  
                  if (subportName && subportDefinition) {
                    // Determine direction and type from the definition name
                    let subDirection = 'in';
                    let subExpectedType = String(subportDefinition);
                    
                    // Parse direction from definition name patterns
                    const defStr = String(subportDefinition).toLowerCase();
                    if (defStr.startsWith('out') || defStr.includes('out')) {
                      subDirection = 'out';
                    } else if (defStr.startsWith('in') || defStr.includes('in')) {
                      subDirection = 'in';
                    }
                    
                    // Extract the type part from definition (remove in/out prefix)
                    subExpectedType = String(subportDefinition)
                      .replace(/^(in|out)/, '')
                      .replace(/^(In|Out)/, '');
                    
                    subports[subportName] = { direction: subDirection, expectedType: subExpectedType };
                  }
                }
                // Handle regular PortDef in composite ports  
                else if (subportNode && (subportNode.type === 'PortDef' || /PortDef/i.test(subportNode.type))) {
                  const subportName = subportNode.name || (subportNode.id && subportNode.id.name) || subportNode.id || null;
                  if (subportName) {
                    let subDirection = 'in';
                    let subExpectedType = null;
                    
                    // Extract sub-port direction and type
                    if (subportNode.flowProperties) {
                      const flowProp = String(subportNode.flowProperties).toLowerCase();
                      if (flowProp.includes('out')) subDirection = 'out';
                      else if (flowProp.includes('inout')) subDirection = 'inout';
                    }
                    
                    if (subportNode.flowType) {
                      subExpectedType = String(subportNode.flowType);
                    } else if (subportNode.flow) {
                      const flowStr = String(subportNode.flow).toLowerCase();
                      if (flowStr.includes('out')) subDirection = 'out';
                      else if (flowStr.includes('inout')) subDirection = 'inout';
                      
                      const flowParts = String(subportNode.flow).split(/\s+/).filter(Boolean);
                      if (flowParts.length >= 2) {
                        subExpectedType = flowParts[flowParts.length - 1];
                      }
                    }
                    
                    subports[subportName] = { direction: subDirection, expectedType: subExpectedType };
                  }
                }
              } catch(e) { /* ignore sub-port parsing errors */ }
            }
          } else if (portsSection && typeof portsSection === 'object') {
            // Handle object structure for ports
            for (const [subportName, subportDef] of Object.entries(portsSection)) {
              try {
                if (subportDef && subportName) {
                  let subDirection = 'in';
                  let subExpectedType = null;
                  
                  if (subportDef.direction) subDirection = String(subportDef.direction);
                  if (subportDef.type || subportDef.expectedType) subExpectedType = String(subportDef.type || subportDef.expectedType);
                  
                  subports[subportName] = { direction: subDirection, expectedType: subExpectedType };
                }
              } catch(e) { /* ignore sub-port parsing errors */ }
            }
          }
        }
        
        try {
          // Extract direction from flowProperties
          if (n.flowProperties) {
            const flowProp = String(n.flowProperties).toLowerCase();
            if (flowProp.includes('out')) direction = 'out';
            else if (flowProp.includes('inout')) direction = 'inout';
          }
          
          // Extract type from flowType
          if (n.flowType) {
            expectedType = String(n.flowType);
          }
          
          // Fallback: try older logic for different AST structures
          if (!expectedType) {
            if (n.flow) {
              const flowStr = String(n.flow).toLowerCase();
              if (flowStr.includes('out')) direction = 'out';
              else if (flowStr.includes('inout')) direction = 'inout';
              
              const flowParts = String(n.flow).split(/\s+/).filter(Boolean);
              if (flowParts.length >= 2) {
                expectedType = flowParts[flowParts.length - 1];
              }
            } else if (n.direction) {
              direction = String(n.direction).toLowerCase();
            }
          }
          
          // Final fallback: try to get type from other common fields
          if (!expectedType) {
            expectedType = qnameToString(n.type || n.dataType || n.valueType || n.flowType || null);
          }
          
          // For composite ports, set the default expected type if none found
          if (isComposite && !expectedType) {
            expectedType = 'CompositePortDef';
          }
        } catch(e) { /* ignore parsing errors */ }
        
        embeddedTypes.ports[String(name)] = { 
          direction, 
          expectedType: expectedType || null, 
          isComposite,
          subports: Object.keys(subports).length > 0 ? subports : null
        };
      }
    } catch(e){}
  });

  const configs = extractConfigurations(ast);
  let cfg = configs[0] || ast;
  if (configs && configs.length > 1) {
    let best = cfg; let bestCount = -1;
    for (const c of configs) {
      try { const count = collectComponentUses(c).length; if (count > bestCount) { best = c; bestCount = count; } } catch(e){}
    }
    cfg = best || cfg;
  }

  // collect component uses and ports across the whole AST (to include nested configs)
  const allUses = collectComponentUses(ast) || [];
  const portUses = collectPortUses(ast) || [];
  try { dbg('[DBG] portUses sample:', (portUses||[]).slice(0,50).map(p => ({ owner: p._ownerComponent || p.owner, name: p.name || p.id || (p.id && p.id.name) }))); } catch(e){}
  const compUses = allUses.map(u => ({ type: 'ComponentUse', name: u.name || (u.id && u.id.name) || u.id, definition: u.definition || u.def || null }));

  // map instanceName -> AST node for scope analysis
  const compUseNodeMap = {};
  traverse(ast, n => { if (n && (n.type === 'ComponentUse' || /ComponentUse/i.test(n.type))) { const nm = n.name || (n.id && n.id.name) || n.id || null; if (nm) compUseNodeMap[nm] = n; } });

  // quick map: instanceName -> definitionName (used when we need to inspect component def ports)
  const compInstanceToDef = {};
  for (const cu of compUses) { try { const iname = cu && (cu.name || (cu.id && cu.id.name) || cu.id) || null; if (iname) compInstanceToDef[iname] = cu.definition || null; } catch(e){} }

  // collect connector bindings declared anywhere in the AST
  // but exclude bindings that are part of ConnectorDef nodes (these are definition internals)
  const connectorBindings = [];
  traverse(ast, n => {
    if (!n || typeof n !== 'object') return;
    if (!(n.type === 'ConnectorBinding' || /ConnectorBinding/i.test(n.type) || n.bindings || n.bindingList || n.connects)) return;
    // skip when an ancestor is a ConnectorDef (these are definition internals)
    let p = n.__parent;
    let insideConnectorDef = false;
    while (p) { 
      if (p.type && /ConnectorDef/i.test(p.type)) { insideConnectorDef = true; break; }
      p = p.__parent; 
    }
    if (insideConnectorDef) return;
    connectorBindings.push({ owner: '', node: n });
  });
  try {
    dbg('[DBG] raw connectorBindings sample keys:', connectorBindings.slice(0,6).map(b=>({type:b.node.type, name:b.node.name, keys:Object.keys(b.node).slice(0,8)})));
    for (let i=0;i<Math.min(3, connectorBindings.length); ++i) {
      try { dbg('[DBG] connectorBindings['+i+']:', JSON.stringify(connectorBindings[i].node, null, 2).slice(0,2000)); } catch(e){}
    }
  } catch(e){}

  // Helper to resolve binding sides (temp1, s1) to actual component.port references
  function resolveBindingSide(side, connectorDef, compDefMap) {
    try {
      if (!side) return null;
      
      // Extract binding target name
      let targetName = null;
      if (typeof side === 'string') {
        targetName = side;
      } else if (side.name) {
        targetName = side.name;
      } else if (side.id) {
        targetName = side.id.name || side.id;
      }
      
      if (!targetName) return null;
      
      // Check if this is a participant role in the connector definition
      if (connectorDef && Array.isArray(connectorDef.participants)) {
        for (const participant of connectorDef.participants) {
          const roleName = participant.name || participant.id || null;
          const roleType = participant.type || participant.portType || participant.definition || null;
          
          if (roleName === targetName && roleType) {
            // This is a participant role, map to default port based on type
            const portTypeName = typeof roleType === 'string' ? roleType : roleType.name || roleType;
            
            // Map port types to default port names dynamically
            // This is a generic algorithm that infers port names from type patterns
            let defaultPort = 'current'; // Generic fallback
            
            // Extract meaningful name from port type
            if (portTypeName) {
              const typeName = String(portTypeName);
              // Generic semantic name extraction from port type
              let semanticName = typeName
                .replace(/^[A-Z]+/, '') // Remove prefix like 'FTemp', 'CTemp'
                .replace(/(IPT|OPT)$/, '') // Remove direction suffixes
                .toLowerCase();
              
              // Enhanced semantic analysis for better port name inference
              if (semanticName.length > 0 && semanticName !== 'temp') {
                defaultPort = semanticName;
              } else {
                // Generic fallback based on direction and context
                if (typeName.includes('IPT')) {
                  // For input ports, use generic input naming
                  defaultPort = 'input';
                } else if (typeName.includes('OPT')) {
                  // For output ports, use generic output naming  
                  defaultPort = 'output';
                } else {
                  // Ultimate fallback
                  defaultPort = 'data';
                }
              }
            }
            
            // Return as participant role for later resolution
            return { 
              type: 'participant',
              role: targetName, 
              portType: portTypeName,
              defaultPort: defaultPort
            };
          }
        }
      }
      
      // Not a participant role, assume it's a component instance
      return { 
        type: 'component',
        component: targetName, 
        port: 'current' // default port
      };
    } catch(e) {
      console.warn('Error resolving binding side:', side, e.message);
      return null;
    }
  }

  // LEGACY: Keep existing connector processing as fallback for complex cases
  let legacyConnectorCounter = 1000; // Use different counter to avoid conflicts
  try {
    // build a lightweight comp->set(port) map (local) from collected compUses and portUses
    const localCompPorts = {};
  // map of componentUseName -> alias map (aliasPortName -> instanceName)
  const usingAliasMap = {};
    try {
      for (const cu of compUses) {
        const cname = cu && cu.name ? String(cu.name) : null;
        if (!cname) continue;
        if (!localCompPorts[cname]) localCompPorts[cname] = new Set();
    // initialize alias map for this component use
    usingAliasMap[cname] = usingAliasMap[cname] || {};
      }
      for (const pu of portUses) {
        const owner = pu && (pu._ownerComponent || pu.owner) ? (pu._ownerComponent || pu.owner) : null;
        const pname = pu && (pu.name || pu.id || (pu.id && pu.id.name)) ? (pu.name || (pu.id && pu.id.name) || pu.id) : null;
        if (!owner || !pname) continue;
        if (!localCompPorts[owner]) localCompPorts[owner] = new Set();
        localCompPorts[owner].add(String(pname));
      }
    } catch(e) { /* ignore map build */ }
  try { dbg('[DBG] localCompPorts keys:', Object.keys(localCompPorts).slice(0,20).map(k=>({k,ports:Array.from(localCompPorts[k]||[])}))); } catch(e){}
    function findComponentByNameOrSuffix(name) {
      if (!name) return null;
      if (localCompPorts[name]) return name;
      // try exact sysadlName match
      var bySysadl = Object.keys(localCompPorts).find(function (c) { return c.split('.').pop() === name });
      if (bySysadl) return bySysadl;
      // try contains as suffix
      var bySuffix = Object.keys(localCompPorts).find(function (c) { return c.endsWith('.' + name) || c === name });
      if (bySuffix) return bySuffix;
      return null;
    }

  // Build alias maps by scanning component-use definitions text for 'using ports' clauses
    try {
      for (const cu of compUses) {
        try {
          const cuName = cu && (cu.name || (cu.id && cu.id.name) || cu.id) ? (cu.name || (cu.id && cu.id.name) || cu.id) : null;
          if (!cuName) continue;
          
          if (cuName === 'as') {
          }
          
          // Find the component use block and extract ALL port aliases
          // Structure: cuName : Type { using ports: alias1 : Type1 { } alias2 : Type2 { } ... }
          
          // Find the start of the component use block
          const startRe = new RegExp(cuName + '\\s*:\\s*\\w+\\s*\\{', 'm');
          const startMatch = startRe.exec(src);
          
          if (startMatch) {
            const startPos = startMatch.index + startMatch[0].length;
            // Find the matching closing brace by counting
            let braceCount = 1;
            let endPos = startPos;
            while (endPos < src.length && braceCount > 0) {
              if (src[endPos] === '{') braceCount++;
              if (src[endPos] === '}') braceCount--;
              endPos++;
            }
            
            const componentBlock = src.substring(startPos, endPos - 1);
            
            // Extract all 'alias : Type {' patterns from the entire component block
            const aliasRe = /([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_\.]+)\s*\{/g;
            const parts = [];
            let match;
            while ((match = aliasRe.exec(componentBlock)) !== null) {
              parts.push(`${match[1]} : ${match[2]}`);
            }
            
            if (cuName === 'as') {
            }
            
            // attempt to map alias -> actual port name on the component definition when unambiguous
            const defName = cu.definition || cu.def || null;
            const defNode = defName ? (compDefMap[defName] || compDefMap[String(defName)]) : null;
            
            if (cuName === 'as') {
            }
            
            for (const p of parts) {
              const mm = p.match(/([A-Za-z0-9_\.]+)\s*:\s*([A-Za-z0-9_\.]+)/);
              if (mm) {
                const alias = mm[1];
                const typeName = mm[2];
                
                if (cuName === 'as') {
                }
                
                usingAliasMap[cuName] = usingAliasMap[cuName] || {};
                // default mapping: alias -> instance name (we'll store actual port name when found)
                let mappedPort = null;
                try {
                  if (defNode) {
                    // collect candidate ports from defNode (ports and members)
                    const defPorts = [];
                    if (Array.isArray(defNode.ports)) defPorts.push(...defNode.ports);
                    if (Array.isArray(defNode.members)) defPorts.push(...defNode.members);
                    // if none found, try traversing defNode for participant/port-like nodes
                    if (!defPorts.length) {
                      traverse(defNode, pn => { if (pn && (Array.isArray(pn.ports) || Array.isArray(pn.members) || pn.participants)) { if (Array.isArray(pn.ports)) defPorts.push(...pn.ports); if (Array.isArray(pn.members)) defPorts.push(...pn.members); if (Array.isArray(pn.participants)) defPorts.push(...pn.participants); } });
                    }
                    const candidates = [];
                    for (const dp of defPorts) {
                      try {
                        const dpName = dp && (dp.name || (dp.id && dp.id.name) || dp.id) ? (dp.name || (dp.id && dp.id.name) || dp.id) : null;
                        if (!dpName) continue;
                        // find type descriptor in common fields
                        const dpType = dp && (dp.type || dp.portType || (dp.definition && dp.definition.name) || dp.value || dp.valueType || dp.typeName) ? (dp.type || dp.portType || (dp.definition && dp.definition.name) || dp.value || dp.valueType || dp.typeName) : null;
                        if (dpType) {
                          const tstr = String(dpType).split('.').pop(); const q = String(typeName).split('.').pop();
                          if (String(dpType) === String(typeName) || tstr === q || q === tstr) candidates.push(dpName);
                        } else {
                          // if no type info, still consider it as candidate
                          candidates.push(dpName);
                        }
                      } catch(e){}
                    }
                    // if exactly one candidate, use it
                    if (candidates.length === 1) mappedPort = candidates[0];
                    else if (!candidates.length && defPorts.length === 1) {
                      // fallback: single port defined -> map alias to that port
                      const only = defPorts[0]; const onlyName = only && (only.name || (only.id && only.id.name) || only.id) ? (only.name || (only.id && only.id.name) || only.id) : null; if (onlyName) mappedPort = onlyName;
                    }
                  }
                } catch(e){}
                
                // DEBUG: Before assignment
                if (cuName === 'as') {
                }
                
                // set alias mapping: prefer actual port name if found, else store null to indicate alias exists
                usingAliasMap[cuName][alias] = mappedPort || null;
                
                // DEBUG: After assignment
                if (cuName === 'as') {
                }
              }
            }
          }
        } catch(e){
          if (cuName === 'as') {
          }
        }
      }
    } catch(e){}


  try { dbg('[DBG] usingAliasMap:', JSON.stringify(usingAliasMap, null, 2)); } catch(e){}
  

  function resolveSide(side, ownerHint, contextNode, localScopeMap) {
      // side can be string like "agvs.sendStatus" or just "sendStatus" or nested qualified
      if (!side) return null;
      if (typeof side !== 'string') return null;
      // if contextNode provided, prefer aliases/ports declared in the same configuration
      try {
    if (contextNode) {
          const findCfg = (n) => { while(n){ if (n.type && /Configuration/i.test(n.type)) return n; n = n.__parent; } return null; };
          const cfgOfConnector = findCfg(contextNode);
          if (cfgOfConnector) {
            // DEBUG: Log resolver input for specific sides
            const debugSides = ['arrivalDetected_out', 'arrivalDetected_in', 'started_stopped_out', 'start_stop_out'];
            if (debugSides.includes(side)) {
            }
            
            // prefer alias declared in same configuration
            const aliasOwnersInCfg = Object.keys(usingAliasMap || {}).filter(k => {
              const hasAlias = usingAliasMap[k] && Object.prototype.hasOwnProperty.call(usingAliasMap[k], side);
              const hasNode = compUseNodeMap[k];
              const sameCfg = hasNode && findCfg(compUseNodeMap[k]) === cfgOfConnector;
              if (debugSides.includes(side) && k === 'as') {
              }
              try { return hasAlias && hasNode && sameCfg; } catch(e){ return false; }
            });
            if (aliasOwnersInCfg.length === 1) {
              const ao = aliasOwnersInCfg[0]; const mapped = usingAliasMap[ao] && usingAliasMap[ao][side]; return { owner: ao, port: mapped || side };
            }
            if (aliasOwnersInCfg.length > 1) {
              // prefer owner that declares a mapping to a concrete port name (non-null)
              const mappedOwners = aliasOwnersInCfg.filter(k => usingAliasMap[k] && usingAliasMap[k][side]);
              if (mappedOwners.length === 1) {
                const ao = mappedOwners[0]; const mapped = usingAliasMap[ao] && usingAliasMap[ao][side]; return { owner: ao, port: mapped || side };
              }
              // deterministic fallback: pick first owner in sorted order
              aliasOwnersInCfg.sort(); const ao = aliasOwnersInCfg[0]; const mapped = usingAliasMap[ao] && usingAliasMap[ao][side]; return { owner: ao, port: mapped || side };
            }
            // prefer components in same cfg that expose this port name
            const ownersInCfg = Object.keys(compPortsMap_main || {}).filter(cn => {
              try { return compPortsMap_main[cn] && compPortsMap_main[cn].has(side) && compUseNodeMap[cn] && findCfg(compUseNodeMap[cn]) === cfgOfConnector; } catch(e) { return false; }
            });
            if (ownersInCfg.length >= 1) {
              // aggressive: prefer the first matching owner in this configuration (deterministic)
              return { owner: ownersInCfg[0], port: side };
            }
            // if a localScopeMap is provided (e.g. connector-def participants), prefer those owners
            try {
              if (localScopeMap && typeof localScopeMap === 'object') {
                const locOwners = Object.keys(localScopeMap).filter(k => { try { return (localScopeMap[k] && Array.from(localScopeMap[k]||[]).indexOf(side) !== -1); } catch(e){ return false; } });
                if (locOwners.length === 1) return { owner: locOwners[0], port: side };
                if (locOwners.length > 1) return { owner: locOwners[0], port: side };
              }
            } catch(e){}
          }
        }
      } catch(e){}
      var parts = side.split('.');
      if (parts.length > 1) {
        // try progressively longer prefixes as component qnames
        for (var i = parts.length - 1; i >= 1; --i) {
          var ownerCandidate = parts.slice(0, i).join('.');
          var portCandidate = parts.slice(i).join('.');
          if (localCompPorts[ownerCandidate] && localCompPorts[ownerCandidate].has(portCandidate)) {
            return { owner: ownerCandidate, port: portCandidate }
          }
        }
        // fallback: if final segment matches a known component name, treat previous as comp path
        var maybeComp = parts.slice(0, parts.length - 1).join('.');
        var maybePort = parts[parts.length - 1];
        var f = findComponentByNameOrSuffix(maybeComp);
        if (f && localCompPorts[f].has(maybePort)) return { owner: f, port: maybePort };
      }
      // unqualified: find components exposing this port
      var matches = Object.keys(localCompPorts).filter(function (c) { return localCompPorts[c].has(side); });
      // check alias maps: if ownerHint has an alias mapping for this name, prefer it
      try {
        if (ownerHint && usingAliasMap && usingAliasMap[ownerHint] && Object.prototype.hasOwnProperty.call(usingAliasMap[ownerHint], side)) {
          const mapped = usingAliasMap[ownerHint][side];
          // if mapped is non-null, it's the actual port name; otherwise alias exists but maps to itself
          const realPort = mapped || side;
          return { owner: ownerHint, port: realPort };
        }
        // if any component use defines an alias with this name, prefer that instance only if unique
        const aliasOwners = Object.keys(usingAliasMap || {}).filter(k => usingAliasMap[k] && Object.prototype.hasOwnProperty.call(usingAliasMap[k], side));
        if (aliasOwners.length === 1) {
          const ao = aliasOwners[0];
          const mapped = usingAliasMap[ao] && usingAliasMap[ao][side];
          return { owner: ao, port: mapped || side };
        }
      } catch(e){}
  if (matches.length === 1) return { owner: matches[0], port: side };
      if (matches.length > 1) {
        // try to disambiguate: prefer ownerHint, alias declarations, exact instance name, or component exposing the port
        try {
          if (ownerHint && matches.indexOf(ownerHint) !== -1) return { owner: ownerHint, port: side };
          // alias owners: components that declared this alias
          const aliasOwners = Object.keys(usingAliasMap || {}).filter(k => usingAliasMap[k] && Object.prototype.hasOwnProperty.call(usingAliasMap[k], side));
          if (aliasOwners.length === 1 && matches.indexOf(aliasOwners[0]) !== -1) {
            const mapped = usingAliasMap[aliasOwners[0]] && usingAliasMap[aliasOwners[0]][side];
            return { owner: aliasOwners[0], port: mapped || side };
          }
          // exact instance name match
          if (matches.indexOf(side) !== -1) return { owner: side, port: side };
          // try to find a single match where compPortsMap_main contains the port (should be true for all matches)
          const filtered = matches.filter(m => compPortsMap_main && compPortsMap_main[m] && compPortsMap_main[m].has(side));
          if (filtered.length === 1) return { owner: filtered[0], port: side };
        } catch(e){}
        // otherwise do not attempt fuzzy resolution here; caller will report unresolved
        return null;
      }
      return null;
    }

    for (const cb of connectorBindings) {
      const node = cb.node || {};
      const nameHint = node.name || (node.definition && node.definition.name) || null;
      const bindings = [];
      const explicitParts = [];
      
      // Extract the connector definition name first
      const defName = node.definition && (node.definition.name || node.definition) ? (node.definition.name || node.definition) : null;
      
        // If this connector use references a connector definition, capture its participants/flows
          let referencedConnectorDef = null;
          let localScopeMap = null;
        try {
          if (defName && connectorDefMap[defName]) referencedConnectorDef = connectorDefMap[defName];
        } catch(e){}

        // Process connector using legacy system

        // build a local scope map from referenced connector def participants: role -> Set(portNames)
        try {
          if (referencedConnectorDef && Array.isArray(referencedConnectorDef.participants)) {
            localScopeMap = {};
            for (const pn of referencedConnectorDef.participants) {
              try {
                const roleName = pn && (pn.name || (pn.id && pn.id.name) || pn.id) ? (pn.name || (pn.id && pn.id.name) || pn.id) : null;
                const partType = pn && (pn.type || pn.portType || pn.definition || pn.value || pn.valueType) ? (pn.type || pn.portType || pn.definition || pn.value || pn.valueType) : null;
                if (!roleName) continue;
                const portSet = new Set();
                // try to resolve type to a PortDef node
                let tname = null;
                if (partType) {
                  tname = String(partType).split('.').pop();
                }
                let pdef = null;
                if (tname && portDefMap && portDefMap[tname]) pdef = portDefMap[tname];
                if (!pdef && tname && compDefMap && compDefMap[tname]) pdef = compDefMap[tname];
                if (pdef) {
                  // collect ports/members
                  if (Array.isArray(pdef.ports)) for (const pp of pdef.ports) { const pn2 = pp && (pp.name || (pp.id && pp.id.name) || pp.id) || null; if (pn2) portSet.add(String(pn2)); }
                  if (Array.isArray(pdef.members)) for (const pp of pdef.members) { const pn2 = pp && (pp.name || (pp.id && pp.id.name) || pp.id) || null; if (pn2) portSet.add(String(pn2)); }
                  // also traverse node for nested port-like entries
                  traverse(pdef, x => { if (!x || typeof x !== 'object') return; const nm = x && (x.name || (x.id && x.id.name) || x.id) ? (x.name || (x.id && x.id.name) || x.id) : null; if (!nm) return; if (x.flow || x.direction || x.type || x.ports || x.members) portSet.add(String(nm)); });
                }
                localScopeMap[roleName] = Array.from(portSet);
              } catch(e){}
            }
          }
        } catch(e){}

            // Additionally, extract 'using ports' aliases declared in the enclosing configuration
            try {
              // find enclosing configuration for this connector use
              const findCfg = (n) => { while(n){ if (n.type && /Configuration/i.test(n.type)) return n; n = n.__parent; } return null; };
              const cfgNode = node && node.__parent ? findCfg(node) : null;
              if (cfgNode) {
                // traverse component uses declared in this configuration and extract their 'using ports' aliases
                traverse(cfgNode, cuNode => {
                  try {
                    if (!cuNode || typeof cuNode !== 'object') return;
                    if (!(cuNode.type && /ComponentUse/i.test(cuNode.type))) return;
                    const cuName = cuNode.name || (cuNode.id && cuNode.id.name) || cuNode.id || null;
                    if (!cuName) return;
                    // initialize array
                    localScopeMap = localScopeMap || {};
                    localScopeMap[cuName] = localScopeMap[cuName] || [];
                    // attempt to get the source snippet for this component use and find 'using ports' content
                    let snippet = null;
                    try {
                      if (cuNode.location && cuNode.location.start && typeof cuNode.location.start.offset === 'number' && cuNode.location.end && typeof cuNode.location.end.offset === 'number') snippet = src.slice(cuNode.location.start.offset, cuNode.location.end.offset);
                    } catch(e){}
                    if (!snippet) return;
                    const m = snippet.match(/using\s+ports\s*:\s*(\{[\s\S]*?\}|[^;\n]+)/mi);
                    if (!m || !m[1]) return;
                    const block = m[1].replace(/[\{\}]/g, ' ');
                    // find alias names before ':' in the block
                    const aliasRe = /([A-Za-z0-9_]+)\s*:\s*[A-Za-z0-9_\.]+/g;
                    let mm;
                    while ((mm = aliasRe.exec(block)) !== null) {
                      try { const alias = mm[1]; if (alias && localScopeMap[cuName].indexOf(alias) === -1) localScopeMap[cuName].push(alias); } catch(e){}
                    }
                  } catch(e){}
                });
              }
            } catch(e){}

      // If parser tokenization left simple 'a = b' patterns in the source snippet, extract them directly
      try {
        let snippetText = null;
        if (node && node.location && node.location.start && typeof node.location.start.offset === 'number' && node.location.end && typeof node.location.end.offset === 'number') {
          snippetText = src.slice(node.location.start.offset, node.location.end.offset);
        } else if (node && node.location && node.location.source && node.location.source.text) {
          snippetText = node.location.source.text;
        }
        if (snippetText) {
          const simpleRe = /([A-Za-z0-9_\.]+)\s*=\s*([A-Za-z0-9_\.]+)/g;
          let mm;
          while ((mm = simpleRe.exec(snippetText)) !== null) {
            try { pushBinding(mm[1], mm[2]); } catch(e){}
          }
        }
      } catch(e){}

      // helper: try to push pair if left/right present as strings or objects
      function pushBinding(left, right) {
        if (!left || !right) return;
        // if a single string contains an arrow, split it
        try {
          if (typeof left === 'string' && left.indexOf('->') !== -1) {
            const parts = left.split('->').map(s=>s.trim()).filter(Boolean);
            if (parts.length >= 2) { pushBinding(parts[0], parts[1]); return; }
          }
          if (typeof right === 'string' && right.indexOf('->') !== -1) {
            const parts = right.split('->').map(s=>s.trim()).filter(Boolean);
            if (parts.length >= 2) { pushBinding(parts[0], parts[1]); return; }
          }
          if (typeof left === 'string' && typeof right === 'string') {
            bindings.push({ left: String(left), right: String(right) });
            return;
          }
        } catch(e) { /* continue */ }
        // left/right may be objects with owner/component and port/name
        const lobj = (typeof left === 'object') ? left : null;
        const robj = (typeof right === 'object') ? right : null;
        if (lobj && robj) {
          const ls = lobj.owner || lobj.component || null; const lp = lobj.port || lobj.name || null;
          const rs = robj.owner || robj.component || null; const rp = robj.port || robj.name || null;
          if (ls && lp && rs && rp) {
            explicitParts.push({ owner: ls, port: lp });
            explicitParts.push({ owner: rs, port: rp });
            return;
          }
        }
      }

      // ConnectorUse nodes often have .bindings array; these may be tokenized arrays from the parser.
      function flattenToString(x) {
        if (x == null) return null;
        // strings: strip block comments and normalize tokens
        if (typeof x === 'string') {
          try {
            let s = x.replace(/\/\*[\s\S]*?\*\//g, ''); // remove /* .. */
            // keep word chars, dots, arrows and underscores; replace others with space
            s = s.replace(/[^\w\.\->]+/g, ' ');
            s = s.replace(/\s+/g, ' ').trim();
            return s || null;
          } catch(e) { return x; }
        }
        // arrays: flatten and join with space
        if (Array.isArray(x)) {
          try {
            const parts = x.map(item => flattenToString(item)).filter(Boolean);
            if (!parts.length) return null;
            return parts.join(' ');
          } catch(e) { return null; }
        }
        if (typeof x === 'object') {
          if (x.text && typeof x.text === 'string') return flattenToString(x.text);
          if (x.name && typeof x.name === 'string') return flattenToString(x.name);
          for (const k of Object.keys(x)) {
            const v = x[k]; if (Array.isArray(v) && v.length) { const f = flattenToString(v); if (f) return f; }
          }
          return null;
        }
        return String(x);
      }

      if (Array.isArray(node.bindings) && node.bindings.length) {
  for (const b of node.bindings) {
          // b may be a complex token array like ["bindings", [ <tokens> ]]
          if (Array.isArray(b) && b.length === 2 && Array.isArray(b[1])) {
            const inner = b[1];
            // inner may contain pairs or sequences; attempt to find subsequences of two string-like tokens
            const flat = flattenToString(inner);
            if (flat && flat.indexOf('->') !== -1) {
              const parts = flat.split('->').map(s=>s.trim()).filter(Boolean);
              if (parts.length >= 2) pushBinding(parts[0], parts[1]);
            }
            // fallback: try to scan inner for patterns like [ [null, 'left'], [null, ' '], [null, 'right'] ]
            let acc = '';
            const tokens = [];
            for (const it of inner) { const s = flattenToString(it); if (s) { acc += s; tokens.push(s); } }
            if (tokens.length >= 3) {
              // heuristically split on whitespace into two halves
              const joined = tokens.join('');
              const m = joined.match(/([A-Za-z0-9_\.]+)\s+([A-Za-z0-9_\.]+)/);
              if (m) pushBinding(m[1], m[2]);
            }
            continue;
          }
          // accept parser shapes that use left/right, from/to, or source/destination
          const left = b && (b.left || b.from || b.source) ? (b.left || b.from || b.source) : null;
          const right = b && (b.right || b.to || b.destination) ? (b.right || b.to || b.destination) : null;
          // try flattening if non-string
          const Ls = flattenToString(left);
          const Rs = flattenToString(right);
          pushBinding(Ls || left, Rs || right);
        }
      }

      // ConnectorBinding nodes may use source/destination
      if (node.source && node.destination) {
        pushBinding(node.source, node.destination);
      }

      // ConnectorBindingList may have items containing source/destination
      // Check both node.items (when node is ConnectorBindingList) 
      // AND items from bindings array elements (when bindings[i] is ConnectorBindingList)
      const itemsToCheck = [];
      if (Array.isArray(node.items)) {
        itemsToCheck.push(...node.items);
      }
      // Also check if any element in node.bindings is a ConnectorBindingList object
      if (Array.isArray(node.bindings)) {
        for (const b of node.bindings) {
          if (b && typeof b === 'object' && b.type === 'ConnectorBindingList' && Array.isArray(b.items)) {
            itemsToCheck.push(...b.items);
          }
        }
      }
      
      if (itemsToCheck.length > 0) {
        for (const it of itemsToCheck) {
          if (!it) continue;
          if (it.source && it.destination) pushBinding(it.source, it.destination);
          else if (it.bindings && Array.isArray(it.bindings)) for (const b of it.bindings) pushBinding(b.left||b.from, b.right||b.to);
        }
      }

      // also accept participants/connects arrays as explicit endpoints
      if (Array.isArray(node.participants) && node.participants.length) {
        for (const p of node.participants) {
          if (!p) continue;
          if (typeof p === 'string') {
            const parts = String(p).split('.'); if (parts.length>1) explicitParts.push({ owner: parts.slice(0,parts.length-1).join('.'), port: parts.slice(-1)[0] });
          } else if (p && (p.owner || p.component) && (p.port || p.name)) {
            explicitParts.push({ owner: p.owner || p.component, port: p.port || p.name });
          }
        }
      }

      if (Array.isArray(node.connects) && node.connects.length) {
        for (const c of node.connects) {
          if (!c) continue;
          if (typeof c === 'string') {
            const parts = String(c).split('.'); if (parts.length>1) explicitParts.push({ owner: parts.slice(0,parts.length-1).join('.'), port: parts.slice(-1)[0] });
          } else if (c && c.owner && c.port) explicitParts.push({ owner: c.owner, port: c.port });
        }
      }

      // resolve simple bindings into owner/port pairs using compPortsMap_main
      const resolved = [];
          for (const b of bindings) {
          let L = resolveSide(b.left, cb && cb.owner ? cb.owner : null, node, localScopeMap);
          let R = resolveSide(b.right, cb && cb.owner ? cb.owner : null, node, localScopeMap);
          // if one side resolved and the other didn't, try to re-resolve using the counterpart as ownerHint
          try {
            if ((!L || !L.owner) && (R && R.owner)) {
              L = resolveSide(b.left, R.owner, node, localScopeMap) || L;
            }
            if ((!R || !R.owner) && (L && L.owner)) {
              R = resolveSide(b.right, L.owner, node, localScopeMap) || R;
            }
            // fallback: if still unresolved, see if alias maps uniquely identify an owner
            if ((!L || !L.owner) && typeof b.left === 'string') {
              const aliasOwners = Object.keys(usingAliasMap || {}).filter(k => usingAliasMap[k] && Object.prototype.hasOwnProperty.call(usingAliasMap[k], b.left));
              if (aliasOwners.length === 1) {
                const ao = aliasOwners[0]; const mapped = usingAliasMap[ao] && usingAliasMap[ao][b.left]; L = { owner: ao, port: mapped || b.left };
              }
            }
            if ((!R || !R.owner) && typeof b.right === 'string') {
              const aliasOwners = Object.keys(usingAliasMap || {}).filter(k => usingAliasMap[k] && Object.prototype.hasOwnProperty.call(usingAliasMap[k], b.right));
              if (aliasOwners.length === 1) {
                const ao = aliasOwners[0]; const mapped = usingAliasMap[ao] && usingAliasMap[ao][b.right]; R = { owner: ao, port: mapped || b.right };
              }
            }
          } catch(e) {}

          // if we couldn't resolve owner for both sides, keep original flattened strings
          if ((!L || !L.owner) && (!R || !R.owner)) {
            const Ls = flattenToString(b.left) || (typeof b.left === 'string' ? b.left : null);
            const Rs = flattenToString(b.right) || (typeof b.right === 'string' ? b.right : null);
            if (Ls || Rs) resolved.push({ left: Ls, right: Rs });
            else {
              if (L || R) resolved.push({ left: L, right: R });
            }
          } else {
            resolved.push({ left: L, right: R });
          }
        }

      // If this connector use references a connector definition, try to qualify unresolved sides
      try {
        if (referencedConnectorDef && Array.isArray(resolved) && resolved.length) {
          // build participant role -> expected portType map from def
          const partMap = {};
          const pnodes = referencedConnectorDef.participants || referencedConnectorDef.participantsList || [];
          if (Array.isArray(pnodes)) {
            for (const pn of pnodes) {
              if (!pn) continue;
              const rname = pn && (pn.name || (pn.id && pn.id.name) || pn.id) ? (pn.name || (pn.id && pn.id.name) || pn.id) : null;
              const ptype = pn && (pn.type || pn.portType || pn.definition || pn.value || pn.valueType) ? (pn.type || pn.portType || pn.definition || pn.value || pn.valueType) : null;
              if (rname) partMap[rname] = String(ptype || '');
            }
          }
          // find first flow (if present) to infer left->right role mapping
          let flowFromRole = null, flowToRole = null;
          const flowNodes = referencedConnectorDef.flows || referencedConnectorDef.flow || [];
          if (Array.isArray(flowNodes) && flowNodes.length) {
            const fn = flowNodes[0];
            try { flowFromRole = fn && (fn.from || (fn.participants && fn.participants[0]) || null) ? (fn.from || (fn.participants && fn.participants[0]) || null) : null; } catch(e){}
            try { flowToRole = fn && (fn.to || (fn.participants && fn.participants[1]) || null) ? (fn.to || (fn.participants && fn.participants[1]) || null) : null; } catch(e){}
          }

          for (let i = 0; i < resolved.length; ++i) {
            const r = resolved[i];
            // if left side is unresolved (string or missing owner), try to find owner among components exposing that port
            try {
              if (r && r.left && (!r.left.owner || typeof r.left === 'string')) {
                const portName = (typeof r.left === 'string') ? r.left : (r.left.port || null);
                if (portName) {
                  // candidate owners exposing this port
                  const candidatesAll = Object.keys(compPortsMap_main || {}).filter(cn => compPortsMap_main[cn] && compPortsMap_main[cn].has(portName));
                  let candidates = candidatesAll.slice();
                  // prefer candidates in same configuration scope as the ConnectorUse
                  try {
                    const cfgOfConnector = (node && node.__parent) ? (function findCfg(n){ while(n){ if (n.type && /Configuration/i.test(n.type)) return n; n = n.__parent; } return null; })(node) : null;
                    if (cfgOfConnector) {
                      const scopedByCfg = candidatesAll.filter(cn => {
                        try {
                          const compNode = compUseNodeMap[cn];
                          if (!compNode) return false;
                          const cfgOfComp = (function findCfg(n){ while(n){ if (n.type && /Configuration/i.test(n.type)) return n; n = n.__parent; } return null; })(compNode);
                          return cfgOfComp === cfgOfConnector;
                        } catch(e){ return false; }
                      });
                      if (scopedByCfg.length) candidates = scopedByCfg;
                    }
                  } catch(e){}
                  // allow alias-driven owner resolution (if an instance declared an alias for this token)
                  try {
                    const aliasOwners = Object.keys(usingAliasMap || {}).filter(k => usingAliasMap[k] && Object.prototype.hasOwnProperty.call(usingAliasMap[k], portName));
                    if (aliasOwners.length) {
                      const aliasScoped = candidatesAll.filter(cn => aliasOwners.indexOf(cn) !== -1);
                      if (aliasScoped.length) candidates = aliasScoped;
                    }
                  } catch(e){}
                  // if flowFromRole provided, filter candidates by matching the component's declared port type
                  if (flowFromRole && partMap && partMap[flowFromRole] && candidates.length) {
                    const wantType = String(partMap[flowFromRole]).split('.').pop();
                    const filtered = candidates.filter(cand => {
                      try {
                        const defName = compInstanceToDef && compInstanceToDef[cand];
                        if (!defName) return false;
                        const defNode = compDefMap[defName] || compDefMap[String(defName)];
                        if (!defNode) return false;
                        // find port in defNode with name portName and inspect its type
                        let foundType = null;
                        traverse(defNode, pn => {
                          if (!pn || typeof pn !== 'object') return;
                          const nm = pn && (pn.name || (pn.id && pn.id.name) || pn.id) ? (pn.name || (pn.id && pn.id.name) || pn.id) : null;
                          if (nm === portName) {
                            foundType = pn && (pn.type || pn.portType || (pn.definition && pn.definition.name) || pn.value || pn.valueType) ? (pn.type || pn.portType || (pn.definition && pn.definition.name) || pn.value || pn.valueType) : null;
                          }
                        });
                        if (!foundType) return false;
                        const f = String(foundType).split('.').pop();
                        return f === wantType || normalizeForMatch(f) === normalizeForMatch(wantType);
                      } catch(e){ return false; }
                    });
                    if (filtered.length === 1) { resolved[i].left = { owner: filtered[0], port: portName }; continue; }
                    if (filtered.length > 1) { resolved[i].left = { owner: filtered[0], port: portName }; continue; }
                  }
                  // fallback: if a single candidate exists, pick it
                  if (candidates.length === 1) { resolved[i].left = { owner: candidates[0], port: portName }; continue; }
                }
              }
              // similar for right side
              if (r && r.right && (!r.right.owner || typeof r.right === 'string')) {
                const portName = (typeof r.right === 'string') ? r.right : (r.right.port || null);
                if (portName) {
                  const candidatesAll = Object.keys(compPortsMap_main || {}).filter(cn => compPortsMap_main[cn] && compPortsMap_main[cn].has(portName));
                    let candidates = candidatesAll.slice();
                    const scopePrefR = (ownerHint && String(ownerHint)) || (cb && cb.owner) || null;
                    if (scopePrefR) {
                      const scopedR = candidatesAll.filter(cn => {
                        try { if (cn === scopePrefR) return true; if (cn.indexOf(scopePrefR + '.') === 0) return true; const short = String(cn).split('.').pop(); if (short === scopePrefR) return true; } catch(e){}
                        return false;
                      });
                      if (scopedR.length) candidates = scopedR;
                    }
                    try {
                      const aliasOwnersR = Object.keys(usingAliasMap || {}).filter(k => usingAliasMap[k] && Object.prototype.hasOwnProperty.call(usingAliasMap[k], portName));
                      if (aliasOwnersR.length) {
                        const aliasScopedR = candidatesAll.filter(cn => aliasOwnersR.indexOf(cn) !== -1);
                        if (aliasScopedR.length) candidates = aliasScopedR;
                      }
                    } catch(e){}
                    if (flowToRole && partMap && partMap[flowToRole] && candidates.length) {
                    const wantType = String(partMap[flowToRole]).split('.').pop();
                    const filtered = candidates.filter(cand => {
                      try {
                        const defName = compInstanceToDef && compInstanceToDef[cand];
                        if (!defName) return false;
                        const defNode = compDefMap[defName] || compDefMap[String(defName)];
                        if (!defNode) return false;
                        let foundType = null;
                        traverse(defNode, pn => {
                          if (!pn || typeof pn !== 'object') return;
                          const nm = pn && (pn.name || (pn.id && pn.id.name) || pn.id) ? (pn.name || (pn.id && pn.id.name) || pn.id) : null;
                          if (nm === portName) {
                            foundType = pn && (pn.type || pn.portType || (pn.definition && pn.definition.name) || pn.value || pn.valueType) ? (pn.type || pn.portType || (pn.definition && pn.definition.name) || pn.value || pn.valueType) : null;
                          }
                        });
                        if (!foundType) return false;
                        const f = String(foundType).split('.').pop();
                        return f === wantType || normalizeForMatch(f) === normalizeForMatch(wantType);
                      } catch(e){ return false; }
                    });
                    if (filtered.length === 1) { resolved[i].right = { owner: filtered[0], port: portName }; continue; }
                    if (filtered.length > 1) { resolved[i].right = { owner: filtered[0], port: portName }; continue; }
                  }
                  if (candidates.length === 1) { resolved[i].right = { owner: candidates[0], port: portName }; continue; }
                }
              }
            } catch(e) {}
          }
        }
      } catch(e) {}

      // deterministic role->instance mapping: if connectorDef present, try to map roles to concrete endpoints
      try {
        if (referencedConnectorDef) {
          // build list of participant roles with expected types
          const roles = [];
          const pnodes = referencedConnectorDef.participants || referencedConnectorDef.participantsList || [];
          if (Array.isArray(pnodes)) {
            for (const pn of pnodes) {
              if (!pn) continue;
              const rname = pn && (pn.name || (pn.id && pn.id.name) || pn.id) ? (pn.name || (pn.id && pn.id.name) || pn.id) : null;
              const rtype = pn && (pn.type || pn.portType || pn.definition || pn.value || pn.valueType) ? (pn.type || pn.portType || pn.definition || pn.value || pn.valueType) : null;
              if (rname) roles.push({ role: rname, type: String(rtype || '') });
            }
          }
          // for each role, try to find a unique instance that exposes a port with matching type
          const roleAssignments = {};
          for (const r of roles) {
            const want = r.type.split('.').pop();
            // candidates: instances that expose any port matching want (by type) or port name exact
            const candidates = [];
            for (const inst of Object.keys(compInstanceToDef || {})) {
              try {
                const ddef = compInstanceToDef[inst]; if (!ddef) continue;
                const defNode = compDefMap[ddef] || compDefMap[String(ddef)]; if (!defNode) continue;
                // find any port in defNode whose type matches want
                let found = null;
                traverse(defNode, pn => {
                  if (!pn || typeof pn !== 'object') return;
                  const nm = pn && (pn.name || (pn.id && pn.id.name) || pn.id) ? (pn.name || (pn.id && pn.id.name) || pn.id) : null;
                  if (!nm) return;
                  const ptype = pn && (pn.type || pn.portType || (pn.definition && pn.definition.name) || pn.value || pn.valueType) ? (pn.type || pn.portType || (pn.definition && pn.definition.name) || pn.value || pn.valueType) : null;
                  if (!ptype) return;
                  const t = String(ptype).split('.').pop();
                  if (t === want || normalizeForMatch(t) === normalizeForMatch(want)) found = nm;
                });
                if (found) candidates.push({ inst, port: found });
              } catch(e){}
            }
            // prefer candidates in same configuration as connector use
            try {
              const cfgOfConnector = (node && node.__parent) ? (function findCfg(n){ while(n){ if (n.type && /Configuration/i.test(n.type)) return n; n = n.__parent; } return null; })(node) : null;
              if (cfgOfConnector) {
                const scoped = candidates.filter(c => {
                  try { const cn = compUseNodeMap[c.inst]; if (!cn) return false; const cfgOfComp = (function findCfg(n){ while(n){ if (n.type && /Configuration/i.test(n.type)) return n; n = n.__parent; } return null; })(cn); return cfgOfComp === cfgOfConnector; } catch(e){ return false; }
                });
                if (scoped.length) {
                  if (scoped.length === 1) roleAssignments[r.role] = scoped[0]; else roleAssignments[r.role] = scoped[0];
                  continue;
                }
              }
            } catch(e){}
            if (candidates.length === 1) roleAssignments[r.role] = candidates[0];
          }
          // if we have roleAssignments and resolved had unqualified sides, assign them when unique
          if (Object.keys(roleAssignments).length) {
            for (const rid of Object.keys(roleAssignments)) {
              const asg = roleAssignments[rid];
              if (!asg) continue;
              // try to find any resolved entry where either left/right matches role name or port name
              for (let i=0;i<resolved.length;i++) {
                const rr = resolved[i];
                try {
                  // left
                  if (rr.left && (!rr.left.owner || typeof rr.left === 'string') && (String(rr.left) === rid || (typeof rr.left === 'string' && String(rr.left) === String(asg.port)))) rr.left = { owner: asg.inst, port: asg.port };
                  if (rr.right && (!rr.right.owner || typeof rr.right === 'string') && (String(rr.right) === rid || (typeof rr.right === 'string' && String(rr.right) === String(asg.port)))) rr.right = { owner: asg.inst, port: asg.port };
                } catch(e){}
              }
            }
          }
        }
      } catch(e) {}

      // build descriptor name: prefer hint, else create deterministic name from bindings
      let cname = nameHint || null;
      if (!cname) {
        if (resolved.length) {
          try {
            cname = resolved.map(r => {
              const lown = (r.left && (r.left.owner || r.left)) ? (r.left.owner || r.left) : 'x';
              const lprt = (r.left && (r.left.port || (typeof r.left === 'string' ? r.left : null))) ? (r.left.port || r.left) : 'x';
              const rown = (r.right && (r.right.owner || r.right)) ? (r.right.owner || r.right) : 'x';
              const rprt = (r.right && (r.right.port || (typeof r.right === 'string' ? r.right : null))) ? (r.right.port || r.right) : 'x';
              return `${lown}.${lprt}__${rown}.${rprt}`;
            }).join('_');
          } catch(e) { cname = null; }
        }
        if (!cname) cname = 'connector_' + (++connectorCounter).toString(36);
      }

      const parts = [];
      const seen = new Set();
      // include explicitParts first
      for (const p of explicitParts) {
        if (!p || !p.owner || !p.port) continue;
        const key = p.owner + '.' + p.port; if (!seen.has(key)) { parts.push({ owner: p.owner, port: p.port }); seen.add(key); }
      }
      for (const r of resolved) {
        if (r.left && r.left.owner) { const key = r.left.owner + '.' + r.left.port; if (!seen.has(key)) { parts.push({ owner: r.left.owner, port: r.left.port }); seen.add(key); } }
        if (r.right && r.right.owner) { const key = r.right.owner + '.' + r.right.port; if (!seen.has(key)) { parts.push({ owner: r.right.owner, port: r.right.port }); seen.add(key); } }
      }
      // If parts still empty, try to qualify unqualified sides by searching compPortsMap_main
      if (!parts.length && Array.isArray(resolved) && resolved.length) {
        for (const r of resolved) {
          // left
          if (r.left && r.left.port && !r.left.owner) {
            // try ownerHint first
            if (ownerHint && compPortsMap_main[ownerHint] && compPortsMap_main[ownerHint].has(r.left.port)) {
              const key = ownerHint + '.' + r.left.port; if (!seen.has(key)) { parts.push({ owner: ownerHint, port: r.left.port }); seen.add(key); }
            } else {
              // find any component that exposes this port
              const cand = Object.keys(compPortsMap_main).find(c => compPortsMap_main[c] && compPortsMap_main[c].has(r.left.port));
              if (cand) { const key = cand + '.' + r.left.port; if (!seen.has(key)) { parts.push({ owner: cand, port: r.left.port }); seen.add(key); } }
            }
          }
          // right
          if (r.right && r.right.port && !r.right.owner) {
            if (ownerHint && compPortsMap_main[ownerHint] && compPortsMap_main[ownerHint].has(r.right.port)) {
              const key = ownerHint + '.' + r.right.port; if (!seen.has(key)) { parts.push({ owner: ownerHint, port: r.right.port }); seen.add(key); }
            } else {
              const cand = Object.keys(compPortsMap_main).find(c => compPortsMap_main[c] && compPortsMap_main[c].has(r.right.port));
              if (cand) { const key = cand + '.' + r.right.port; if (!seen.has(key)) { parts.push({ owner: cand, port: r.right.port }); seen.add(key); } }
            }
          }
        }
      }
      // If still empty, attempt to extract textual bindings from node.location in the source
      if (!parts.length) {
        try {
          if (node && node.location && node.location.start && typeof node.location.start.offset === 'number' && typeof node.location.end.offset === 'number') {
            const s = node.location.start.offset; const e = node.location.end.offset;
            try {
              const snippet = src.slice(s,e);
              // First, try to extract a bounded 'bindings' or 'connects' block using brace matching
              const lowered = snippet.toLowerCase();
              let foundBlock = null;
              const tryFindBlock = (kw) => {
                const idx = lowered.indexOf(kw);
                if (idx === -1) return null;
                // search for first brace after keyword
                const rest = snippet.slice(idx);
                const braceIdx = rest.indexOf('{');
                if (braceIdx === -1) return null;
                let pos = idx + braceIdx + 1; // position inside snippet after '{'
                let depth = 1; let end = pos;
                while (pos < snippet.length) {
                  const ch = snippet[pos];
                  if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) { end = pos; break; } }
                  pos++;
                }
                if (end > idx) return snippet.slice(idx + braceIdx + 1, end);
                return null;
              };
              foundBlock = tryFindBlock('bindings') || tryFindBlock('connects') || tryFindBlock('participants');
              let candidates = [];
              if (foundBlock) {
                // split block by commas, semicolons or newlines
                candidates = foundBlock.split(/,|;|\n/).map(x=>x.trim()).filter(Boolean);
              } else {
                candidates = snippet.split(/;|\n/).map(x=>x.trim()).filter(Boolean);
              }
              for (const c of candidates) {
                if (!c) continue;
                // ignore comment-only lines
                if (/^\/\*/.test(c) || /^\/\//.test(c)) continue;
                // try arrow patterns A.B.port -> C.D.port or A -> B
                const m = c.match(/([\w\.]+)\s*[-=]*>\s*([\w\.]+)/);
                if (m) {
                  const L = m[1]; const R = m[2];
                  const lparts = L.split('.'); const rparts = R.split('.');
                  const lowner = lparts.length>1? lparts.slice(0,-1).join('.') : null; const lport = lparts.length>1? lparts.slice(-1)[0] : lparts[0];
                  const rowner = rparts.length>1? rparts.slice(0,-1).join('.') : null; const rport = rparts.length>1? rparts.slice(-1)[0] : rparts[0];
                  if (lport) {
                    const owner = lowner || ownerHint || Object.keys(compPortsMap_main).find(cn=> compPortsMap_main[cn] && compPortsMap_main[cn].has(lport)) || null;
                    if (owner) { const key = owner + '.' + lport; if (!seen.has(key)) { parts.push({ owner, port: lport }); seen.add(key); } }
                  }
                  if (rport) {
                    const owner = rowner || ownerHint || Object.keys(compPortsMap_main).find(cn=> compPortsMap_main[cn] && compPortsMap_main[cn].has(rport)) || null;
                    if (owner) { const key = owner + '.' + rport; if (!seen.has(key)) { parts.push({ owner, port: rport }); seen.add(key); } }
                  }
                  continue;
                }
                // fallback: tokens like 'outNotifications' or 'inNotifications'
                const m2 = c.match(/([\w\.]+)/);
                if (m2) {
                  const tok = m2[1];
                  const partsTok = tok.split('.');
                  const port = partsTok.length>1? partsTok.slice(-1)[0] : tok;
                  const owner = partsTok.length>1? partsTok.slice(0,-1).join('.') : ownerHint || Object.keys(compPortsMap_main).find(cn=> compPortsMap_main[cn] && compPortsMap_main[cn].has(port));
                  if (port && owner) { const key = owner + '.' + port; if (!seen.has(key)) { parts.push({ owner, port }); seen.add(key); } }
                }
              }
            } catch(e) {}
          }
        } catch(e) {}
      }

      // if referencedConnectorDef is present, attempt to populate expected participant roles and types
      if (referencedConnectorDef) {
        try {
          const partsFromDef = [];
          // collect participants declared in def (node.participants array or participants field)
          const pnodes = referencedConnectorDef.participants || referencedConnectorDef.participantsList || [];
          if (Array.isArray(pnodes) && pnodes.length) {
            for (const pn of pnodes) {
              if (!pn) continue;
              const pname = pn && (pn.name || (pn.id && pn.id.name) || pn.id) ? (pn.name || (pn.id && pn.id.name) || pn.id) : null;
              const pport = pn && (pn.type || pn.portType || pn.definition || pn.value || pn.valueType) ? (pn.type || pn.portType || pn.definition || pn.value || pn.valueType) : null;
              if (pname) partsFromDef.push({ role: pname, portType: pport });
            }
          }
          // flows: try to collect flows to determine direction (fromRole,toRole)
          const flowNodes = referencedConnectorDef.flows || referencedConnectorDef.flow || [];
          const flows = [];
          if (Array.isArray(flowNodes) && flowNodes.length) {
            for (const fn of flowNodes) {
              try {
                const ftype = fn && (fn.type || fn.flowType || fn.value) ? (fn.type || fn.flowType || fn.value) : null;
                const fromRole = fn && (fn.from || (fn.participants && fn.participants[0]) || null) ? (fn.from || (fn.participants && fn.participants[0]) || null) : null;
                const toRole = fn && (fn.to || (fn.participants && fn.participants[1]) || null) ? (fn.to || (fn.participants && fn.participants[1]) || null) : null;
                if (fromRole || toRole) flows.push({ type: ftype, from: fromRole, to: toRole });
              } catch(e){}
            }
          }
          // attach to descriptor
          if (partsFromDef.length) parts.push.apply(parts, partsFromDef.map(p=>({ owner: null, port: p.role, _portType: p.portType })));
          // store flows under a meta field for later qualification
          if (flows.length) explicitParts.push({ __flows: flows });
        } catch(e){}
      }

  const descObj = { name: cname, participants: parts, bindings: resolved, _uid: ++legacyConnectorCounter, _node: node, definition: defName };
  connectorDescriptors.push(descObj);
    }
  } catch(e) { /* ignore */ }

  // extract ports and connectors from component definitions and attribute them to instances
  try {
    for (const cu of compUses) {
      const defName = cu.definition || null;
      if (!defName) continue;
      const defNode = compDefMap[defName] || compDefMap[String(defName)];
      if (!defNode) continue;
      const innerCfgs = extractConfigurations(defNode) || [];
      // also, if the ComponentDef node has a top-level 'ports' or 'members' array, register them
      if (Array.isArray(defNode.ports) && defNode.ports.length) {
        for (const p of defNode.ports) {
          const pname = p && (p.name || (p.id && p.id.name) || p.id) || null;
          if (!pname) continue;
          portUses.push(Object.assign({}, p, { _ownerComponent: cu.name, name: pname }));
        }
      }
      if (Array.isArray(defNode.members) && defNode.members.length) {
        for (const p of defNode.members) {
          const pname = p && (p.name || (p.id && p.id.name) || p.id) || null;
          if (!pname) continue;
          portUses.push(Object.assign({}, p, { _ownerComponent: cu.name, name: pname }));
        }
      }
      if (!innerCfgs.length) continue;
      const inner = innerCfgs[0];
      // traverse inner configuration to find port-like nodes and connector bindings
      // helper: find nearest enclosing ComponentUse node name for correct owner attribution
      function findNearestComponentUseName(node) {
        let cur = node;
        while (cur) {
          try {
            if (cur.type && /ComponentUse/i.test(cur.type)) return cur.name || (cur.id && cur.id.name) || cur.id || null;
          } catch (e) {}
          cur = cur.__parent;
        }
        return null;
      }
      traverse(inner, n => {
        if (!n || typeof n !== 'object') return;
        // connector binding inside definition -> attribute to this instance
        if (n.type === 'ConnectorBinding' || /ConnectorBinding/i.test(n.type) || n.bindings || n.bindingList || n.connects) {
          connectorBindings.push({ owner: cu.name, node: n });
          return;
        }

  // composed ports container (has ports array) or explicit 'members' that hold ports
        if ((Array.isArray(n.ports) && n.name) || (Array.isArray(n.members) && n.name)) {
          // register parent port-like node
          const inferredOwner = findNearestComponentUseName(n) || cu.name;
          portUses.push(Object.assign({}, n, { _ownerComponent: inferredOwner, name: n.name }));
          const children = Array.isArray(n.ports) ? n.ports : n.members;
          for (const sub of children) {
            const subName = sub && (sub.name || (sub.id && sub.id.name) || sub.id) || null;
            if (!subName) continue;
            const copy = Object.assign({}, sub, { _ownerComponent: inferredOwner, name: subName });
            portUses.push(copy);
          }
          return;
        }

        // participants / ports declared under participant-like containers
        if (n.participants && Array.isArray(n.participants)) {
          for (const p of n.participants) {
            const pname = p && (p.name || (p.id && p.id.name) || p.id) || null;
            if (!pname) continue;
            const copy = Object.assign({}, p, { _ownerComponent: cu.name, name: pname });
            portUses.push(copy);
          }
          return;
        }

        // simple port nodes (permissive: has flow, direction, type, or name inside ports section)
        const looksLikePort = (n.type && /Port/i.test(n.type)) || n.flow || n.direction || n.type === 'PortDef' || (n.name && (n.flow || n.direction || n._ownerComponent));
        if (looksLikePort) {
          const pname = n && (n.name || (n.id && n.id.name) || n.id) || null;
          if (!pname) return;
          const copy = Object.assign({}, n, { _ownerComponent: cu.name, name: pname });
          portUses.push(copy);
        }
      });
    }
  } catch (e) { /* ignore extraction errors */ }

  // extract executables (simple): look for Executable nodes
  const executables = [];
  traverse(ast, n => { 
    if (n && (n.type === 'Executable' || /Executable/i.test(n.type))) { 
      const name = n.name || (n.id && n.id.name) || n.id || null; 
      let params = []; 
      if (Array.isArray(n.parameters)) params = n.parameters.map(p => p.name || p.id || String(p)); 
      let body = ''; 
      if (n.location && n.location.start && typeof n.location.start.offset === 'number') { 
        try { 
          const s = n.location.start.offset; 
          const e = n.location.end.offset; 
          body = src.slice(s,e); 
        } catch(e){} 
      } 
      
      // Only add executables that have actual function bodies (definitions)
      // Skip executable allocations (executable X to Y) which are just mappings
      if (body && body.includes('{') && body.includes('}')) {
        executables.push({ name, params, body }); 
      }
    } 
  });

  // activities: ported heuristics from v0.2 to map actions->executables and pick input ports
  const activitiesToRegister = [];

  // helpers ported from v0.2
  function normalizeForMatch(s) { if (!s) return ''; return String(s).toLowerCase().replace(/[^a-z0-9]+/g, ''); }
  function tryFindBySuffix(target, candidates) {
    if (!target || !candidates || candidates.length === 0) return null;
    const t = String(target);
    for (const c of candidates) if (String(c) === t) return c;
    for (const c of candidates) if (t.endsWith(String(c))) return c;
    for (const c of candidates) if (String(c).endsWith(t)) return c;
    const tn = normalizeForMatch(t);
    for (const c of candidates) if (normalizeForMatch(c) === tn) return c;
    for (const c of candidates) if (tn.indexOf(normalizeForMatch(c)) !== -1) return c;
    for (const c of candidates) if (normalizeForMatch(c).indexOf(tn) !== -1) return c;
    return null;
  }

  function scorePortsByTokenOverlap(param, ports) {
    const tokens = String(param).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const scores = ports.map(p => {
      const ptoks = String(p).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      let score = 0; for (const t of tokens) if (ptoks.includes(t)) score++; return { port: p, score };
    }).sort((a,b) => b.score - a.score);
    return scores.filter(s => s.score > 0).map(s => s.port);
  }

  // build actionDefMap (params/body) from AST
  const actionDefMap = {};
  traverse(ast, n => {
    if (n && (n.type === 'ActionDef' || /ActionDef/i.test(n.type))) {
      const an = n.name || n.id || null;
      if (!an) return;
      let params = [];
      if (Array.isArray(n.parameters)) params = n.parameters.map(p => p.name || p.id || String(p));
      else if (Array.isArray(n.params)) params = n.params.map(p => p.name || p.id || String(p));
      let body = null;
      if (n.location && n.location.start && typeof n.location.start.offset === 'number') {
        try { const s = n.location.start.offset; const e = n.location.end.offset; const snippet = src.slice(s,e); const m = snippet.match(/\{([\s\S]*)\}$/m); if (m && m[1]) body = m[1].trim(); } catch (e) {}
      }
      actionDefMap[an] = { name: an, params, body };
    }
  });

  // map action name -> activity name by scanning ActivityDef nodes
  const actionToActivity = {};
  // NEW: map to store action instance names: actionClassName -> { instanceName, activityName }
  const actionInstanceMap = {};
  traverse(ast, n => {
    if (n && (n.type === 'ActivityDef' || /ActivityDef/i.test(n.type))) {
      const activityName = n.name || n.id || null; if (!activityName) return;
      traverse(n, x => { 
        if (x && x.type && /Action/.test(x.type)) { 
          const an = x.definition || x.name || x.id || null; 
          if (an) {
            actionToActivity[an] = activityName;
            // Extract instance name from action instances
            // Prefer the explicit ActionUse name token (e.g. 'ftoc') when present
            // SysADL format: "actions : instanceName : ClassName"
            // x.name holds the instance identifier; fall back to other fields or class name
            const instanceName = (typeof x.name === 'string' && x.name) || x.instanceName || x.instance || x.label || an;
            actionInstanceMap[an] = { instanceName, activityName };
          }
        }
      });
    }
  });

  // build executableToAction from allocation info if present
  const executableToAction = {};
  const activityToComponent = {};
  
  if (ast && ast.allocation && Array.isArray(ast.allocation.allocations)) {
    for (const a of ast.allocation.allocations) {
      if (!a || !a.type) continue;
      if (a.type === 'ExecutableAllocation' && a.source && a.target) {
        executableToAction[a.source] = a.target;
      }
      // Add generic ActivityAllocation processing
      if (a.type === 'ActivityAllocation' && a.source && a.target) {
        activityToComponent[a.source] = a.target;
      }
    }
  }

  // map executables -> activities via action mapping heuristics
  const execNames = executables.map(e => e.name).filter(Boolean);
  try {
    const actionNames = Object.keys(actionDefMap || {});
    for (const exName of execNames) {
      if (executableToAction[exName]) continue;
      const candidate = tryFindBySuffix(exName, actionNames);
      if (candidate) executableToAction[exName] = candidate;
    }
  } catch (e) { /* ignore */ }

  // build activityActionsMap: activityName -> [{ executable, name }]
  const activityActionsMap = {};
  for (const ex of executables) {
    if (!ex || !ex.name) continue;
    const actionName = executableToAction[ex.name];
    if (!actionName) continue;
    const activityName = actionToActivity[actionName];
    if (!activityName) continue;
    activityActionsMap[activityName] = activityActionsMap[activityName] || [];
    activityActionsMap[activityName].push({ executable: ex.name, name: actionName });
  }

  // dedupe actions within each activity
  for (const k of Object.keys(activityActionsMap)) {
    const seen = new Set(); const uniq = [];
    for (const it of activityActionsMap[k]) { const key = it.executable || it.name || JSON.stringify(it); if (seen.has(key)) continue; seen.add(key); uniq.push(it); }
    activityActionsMap[k] = uniq;
  }

  // build component -> ports map from compUses / portUses
  const compPortsMap_main = {};
  const compNames = (Array.isArray(compUses) ? compUses.map(cu => cu && (cu.name || (cu.id && cu.id.name) || cu.id) ).filter(Boolean) : []);
  for (const key of compNames) { compPortsMap_main[key] = new Set(); const parts = String(key).split('.'); const short = parts.length ? parts[parts.length-1] : key; if (short && !compPortsMap_main[short]) compPortsMap_main[short] = compPortsMap_main[key]; }
  for (const pu of (portUses || [])) {
    const owner = pu && pu._ownerComponent ? pu._ownerComponent : null;
    const pname = pu && (pu.name || (pu.id && pu.id.name) || pu.id) || null;
    if (owner && pname && Object.prototype.hasOwnProperty.call(compPortsMap_main, owner)) compPortsMap_main[owner].add(String(pname));
    if (owner && pname) { const parts = String(owner).split('.'); const short = parts.length ? parts[parts.length-1] : null; if (short && Object.prototype.hasOwnProperty.call(compPortsMap_main, short)) compPortsMap_main[short].add(String(pname)); }
  }
  // Process delegations: make delegated ports visible in the owning component's port map
  // Delegations connect inner instance ports to the component's declared ports. We must
  // expose the delegated (component-level) port names as available on the component
  // so resolution within the same configuration picks them preferentially.
  try {
    // find all ComponentDef nodes and their top-level port names
    for (const defName of Object.keys(compDefMap || {})) {
      try {
        const defNode = compDefMap[defName];
        if (!defNode) continue;
        const cfgs = extractConfigurations(defNode) || [];
        if (!cfgs.length) continue;
        const cfgNode = cfgs[0];
        // collect top-level declared ports on the component (the ones listed before configuration)
        const declaredPorts = new Set();
        if (Array.isArray(defNode.ports)) for (const p of defNode.ports) { const pn = p && (p.name || (p.id && p.id.name) || p.id) || null; if (pn) declaredPorts.add(String(pn)); }
        if (Array.isArray(defNode.members)) for (const p of defNode.members) { const pn = p && (p.name || (p.id && p.id.name) || p.id) || null; if (pn) declaredPorts.add(String(pn)); }
        // find delegations within the configuration: pattern 'X to Y' -> (source instance port X) delegated to component port Y
        traverse(cfgNode, n => {
          if (!n || typeof n !== 'object') return;
          // detect delegation lists: nodes that have 'delegations' or 'delegationsList'
          if (Array.isArray(n.delegations)) {
            for (const d of n.delegations) {
              try {
                // d may be string like 'ack to outNotifications' or object { from, to }
                if (typeof d === 'string') {
                  const m = d.match(/([\w\.]+)\s+to\s+([\w\.]+)/);
                  if (m) {
                    const from = m[1]; const to = m[2];
                    // `to` is the component-level port name; expose it on the component use(s)
                    // find component uses of this def and add 'to' to their compPortsMap_main sets
                    for (const cu of compUses) {
                      try {
                        const iname = cu && (cu.name || (cu.id && cu.id.name) || cu.id) || null;
                        const ddef = cu && (cu.definition || cu.def || null) || null;
                        if (!iname || !ddef) continue;
                        if (String(ddef) !== String(defName)) continue;
                        if (!compPortsMap_main[iname]) compPortsMap_main[iname] = new Set();
                        compPortsMap_main[iname].add(String(to));
                      } catch(e){}
                    }
                  }
                } else if (d && d.from && d.to) {
                  const to = (d.to && (d.to.port || d.to.name || d.to)) ? (d.to.port || d.to.name || d.to) : null;
                  if (to) {
                    for (const cu of compUses) {
                      try {
                        const iname = cu && (cu.name || (cu.id && cu.id.name) || cu.id) || null;
                        const ddef = cu && (cu.definition || cu.def || null) || null;
                        if (!iname || !ddef) continue;
                        if (String(ddef) !== String(defName)) continue;
                        if (!compPortsMap_main[iname]) compPortsMap_main[iname] = new Set();
                        compPortsMap_main[iname].add(String(to));
                      } catch(e){}
                    }
                  }
                }
              } catch(e){}
            }
          }
        });
      } catch(e){}
    }
  } catch(e){}
  try { dbg('[DBG] compPortsMap_main keys:', Object.keys(compPortsMap_main).slice(0,40).map(k=>({k,ports:Array.from(compPortsMap_main[k]||[])}))); } catch(e){}
  
  // Normalize connectorBindings into connectorDescriptors for processing
  const connectorDescriptors = [];
  let connectorCounter = 0;
  try {
    for (const cb of connectorBindings) {
      try {
        const node = cb.node || {};
        // Use node.name if available, otherwise skip (will be filtered out later)
        const cname = node.name || null;
        // Extract connector definition
        const defName = node.definition && (node.definition.name || node.definition) ? (node.definition.name || node.definition) : null;
        connectorDescriptors.push({
          name: cname,
          _node: node,
          bindings: [],
          participants: [],
          _uid: ++connectorCounter,
          definition: defName,
          owner: cb.owner || ''  // Add owner information from connectorBinding
        });
      } catch(e) {}
    }
  } catch(e) {}
  
  // second-pass: re-process connectorBindings using compPortsMap_main to qualify unqualified ports
  try {
    // AGGRESSIVE PASS: for any connectorDescriptor binding side still unresolved, prefer
    // components that expose the port in the same Configuration as the connector use.
    // If multiple candidates exist, choose the first deterministically.
    try {
      const findCfg = (n) => { while(n){ if (n.type && /Configuration/i.test(n.type)) return n; n = n.__parent; } return null; };
      for (const desc of connectorDescriptors) {
        if (!desc || !Array.isArray(desc.bindings)) continue;
        const nodeRef = desc._node || null;
        const cfgOfDesc = nodeRef ? findCfg(nodeRef) : null;
        for (const b of desc.bindings) {
          if (!b) continue;
          for (const side of ['left','right']) {
            try {
              const val = b[side];
              if (!val) continue;
              // already qualified
              if (typeof val === 'object' && val.owner) continue;
              const portName = (typeof val === 'string') ? val : (val && val.port ? val.port : null);
              if (!portName) continue;
              // find all candidates that expose this port
              let candidates = Object.keys(compPortsMap_main || {}).filter(cn => compPortsMap_main[cn] && compPortsMap_main[cn].has(portName));
              if (!candidates.length) continue;
              // prefer those in same configuration
              if (cfgOfDesc) {
                const scoped = candidates.filter(cn => { try { const n = compUseNodeMap[cn]; return !!n && findCfg(n) === cfgOfDesc; } catch(e){ return false; } });
                if (scoped.length) candidates = scoped;
              }
              // deterministic: pick first candidate
              if (candidates.length) {
                b[side] = { owner: candidates[0], port: portName };
              }
            } catch(e) { /* ignore per-side */ }
          }
        }
      }
    } catch(e) { /* non-fatal */ }
    for (const cbEntry of connectorBindings) {
      try {
        const node = cbEntry.node || {};
        const nameHint = node.name || (node.definition && node.definition.name) || null;
        const ownerHint = cbEntry && cbEntry.owner ? cbEntry.owner : null;
        const desc = connectorDescriptors.find(d => d.name === nameHint) || null;
  if (!desc) continue;
  // do not auto-qualify participants here; only attempt to suggest owners when ownerHint present
  if (Array.isArray(desc.participants) && desc.participants.length) continue; // already have participants
          // try normalized matching from existing desc.bindings first (fuzzy match port names)
          try {
            if ((!Array.isArray(parts) || parts.length === 0) && Array.isArray(desc.bindings) && desc.bindings.length) {
              const seen = new Set();
              for (const r of desc.bindings) {
                try {
                  const L = r.left; const R = r.right;
                  if (L && L.port && !L.owner) {
                    const target = String(L.port);
                    const cand = Object.keys(compPortsMap_main).find(cn => {
                      try { return Array.from(compPortsMap_main[cn]||[]).some(p => normalizeForMatch(p) === normalizeForMatch(target) || normalizeForMatch(p).indexOf(normalizeForMatch(target)) !== -1 || normalizeForMatch(target).indexOf(normalizeForMatch(p)) !== -1); } catch(e){ return false; }
                    });
                    if (cand) { /* suggestion only; do not auto-assign */ }
                  }
                  if (R && R.port && !R.owner) {
                    const target = String(R.port);
                    const cand = Object.keys(compPortsMap_main).find(cn => {
                      try { return Array.from(compPortsMap_main[cn]||[]).some(p => normalizeForMatch(p) === normalizeForMatch(target) || normalizeForMatch(p).indexOf(normalizeForMatch(target)) !== -1 || normalizeForMatch(target).indexOf(normalizeForMatch(p)) !== -1); } catch(e){ return false; }
                    });
                    if (cand) { /* suggestion only; do not auto-assign */ }
                  }
                } catch(e) {}
              }
              if (parts.length) { /* suggestion only; do not mutate desc.participants */ }
            }
          } catch(e) {}
          // try to extract snippet
        if (node && node.location && node.location.start && typeof node.location.start.offset === 'number' && typeof node.location.end.offset === 'number') {
          const s = node.location.start.offset; const e = node.location.end.offset;
          const snippet = src.slice(s,e);
          const lowered = snippet.toLowerCase();
          const tryFindBlock = (kw) => {
            const idx = lowered.indexOf(kw);
            if (idx === -1) return null;
            const rest = snippet.slice(idx);
            const braceIdx = rest.indexOf('{');
            if (braceIdx === -1) return null;
            let pos = idx + braceIdx + 1; let depth = 1; let end = pos;
            while (pos < snippet.length) { const ch = snippet[pos]; if (ch === '{') depth++; else if (ch === '}') { depth--; if (depth === 0) { end = pos; break; } } pos++; }
            if (end > idx) return snippet.slice(idx + braceIdx + 1, end);
            return null;
          };
          const foundBlock = tryFindBlock('bindings') || tryFindBlock('connects') || tryFindBlock('participants');
          const candidates = (foundBlock ? foundBlock.split(/,|;|\n/) : snippet.split(/;|\n/)).map(x=>x.trim()).filter(Boolean);
          const parts = []; const seen = new Set();
          for (const c of candidates) {
            if (!c) continue; if (/^\/\*/.test(c) || /^\/\//.test(c)) continue;
            const m = c.match(/([\w\.]+)\s*[-=]*>\s*([\w\.]+)/);
            if (m) {
              const L = m[1]; const R = m[2];
              const lparts = L.split('.'); const rparts = R.split('.');
              const lport = lparts.length>1? lparts.slice(-1)[0] : lparts[0];
              const rport = rparts.length>1? rparts.slice(-1)[0] : rparts[0];
              const lowner = lparts.length>1? lparts.slice(0,-1).join('.') : null; const rowner = rparts.length>1? rparts.slice(0,-1).join('.') : null;
              const lownerResolved = lowner || ownerHint || Object.keys(compPortsMap_main).find(cn=> compPortsMap_main[cn] && compPortsMap_main[cn].has(lport)) || null;
              const rownerResolved = rowner || ownerHint || Object.keys(compPortsMap_main).find(cn=> compPortsMap_main[cn] && compPortsMap_main[cn].has(rport)) || null;
              if (lownerResolved && lport) { const key = lownerResolved + '.' + lport; if (!seen.has(key)) { parts.push({ owner: lownerResolved, port: lport }); seen.add(key); } }
              if (rownerResolved && rport) { const key = rownerResolved + '.' + rport; if (!seen.has(key)) { parts.push({ owner: rownerResolved, port: rport }); seen.add(key); } }
            }
          }
          if (parts.length) { /* suggestion only; do not mutate desc.participants */ }
        }
      } catch(e) {}
    }
  } catch(e) {}

  function collectPortsForQualifiedComponent(qname) {
    const result = new Set(); if (!qname) return result;
    if (compPortsMap_main[qname]) for (const p of compPortsMap_main[qname]) result.add(p);
    for (const k of Object.keys(compPortsMap_main)) { if (k === qname) continue; if (String(k).indexOf(qname + '.') === 0) for (const p of compPortsMap_main[k]) result.add(p); }
    const short = String(qname).split('.').pop(); if (short && compPortsMap_main[short]) for (const p of compPortsMap_main[short]) result.add(p);
    return result;
  }

  function findMatchingPortsForParams(params, portsSet) {
    const ports = Array.from(portsSet || []); const matched = [];
    for (const p of params) {
      const pn = String(p);
      const exact = ports.find(x => x === pn); if (exact) { matched.push(exact); continue; }
      const cand = tryFindBySuffix(pn, ports);
      if (cand) { matched.push(cand); continue; }
      const sub = ports.find(x => String(x).toLowerCase().indexOf(pn.toLowerCase()) !== -1);
      if (sub) { matched.push(sub); continue; }
      const scored = scorePortsByTokenOverlap(pn, ports);
      if (scored && scored.length) { matched.push(scored[0]); continue; }
      return null;
    }
    return matched;
  }

  // permissive registration: for each activityDef in source, register it to instances
  const activityDefs = {};
  const activityRe = /activity\s+def\s+(\w+)\s*\(([^)]*)\)/gmi;
  let mm;
  while ((mm = activityRe.exec(src)) !== null) {
    const name = mm[1]; const p1 = mm[2] || ''; const gather = s => s.split(',').map(x => x.trim()).filter(Boolean).map(x => { const p = x.split(':')[0].trim(); return p; });
    const params = [].concat(gather(p1)).filter(Boolean);
    activityDefs[name] = { name, params };
  }

  const compInstanceDef = {};
  for (const cu of (compUses || [])) { const iname = cu && (cu.name || (cu.id && cu.id.name) || cu.id) || null; const ddef = cu && (cu.definition || cu.def || (cu.sysadlType && cu.sysadlType.name)) || null; if (iname) compInstanceDef[iname] = ddef; }

  // ANOTAÇÃO DETERMINÍSTICA: para cada PortUse coletado, tente ligar diretamente ao PortDef
  try {
    for (const pu of (portUses || [])) {
      try {
        if (!pu || !pu.name) continue;
        const owner = pu._ownerComponent || pu.owner || null;
        if (!owner) continue;
        // 1) se a PortUse já tem campo 'definition' que aponta para um PortDef name -> usar
        let tname = null;
        if (pu.definition) {
          if (typeof pu.definition === 'string') tname = pu.definition;
          else if (pu.definition.name) tname = pu.definition.name;
          else if (pu.definition.id && pu.definition.id.name) tname = pu.definition.id.name;
        }
        // 2) tentar inferir a partir de pd.type/portType/value etc
        if (!tname) tname = pu.type || pu.portType || (pu._type && pu._type.name) || pu.value || null;
        // 3) se owner tem a definição do componente, buscar na sua ComponentDef a port com mesmo nome e inspecionar seu 'definition' campo
        if (!tname) {
          const defName = compInstanceDef[owner] || null;
          if (defName && compDefMap[defName]) {
            const defNode = compDefMap[defName];
            const portsList = (defNode.ports && Array.isArray(defNode.ports)) ? defNode.ports : (defNode.configuration && defNode.configuration.ports && Array.isArray(defNode.configuration.ports) ? defNode.configuration.ports : defNode.members && Array.isArray(defNode.members) ? defNode.members : []);
            for (const pd of (portsList || [])) {
              const pn = pd && (pd.name || (pd.id && pd.id.name) || pd.id) ? (pd.name || (pd.id && pd.id.name) || pd.id) : null;
              if (!pn) continue;
              if (String(pn) === String(pu.name)) {
                if (pd.definition) {
                  if (typeof pd.definition === 'string') tname = pd.definition;
                  else if (pd.definition.name) tname = pd.definition.name;
                }
                if (!tname) tname = pd.type || pd.portType || null;
                break;
              }
            }
          }
        }
        // 4) normalize and attach annotation if found
        if (tname && portDefMap && (portDefMap[tname] || portDefMap[String(tname)])) {
          const resolved = portDefMap[tname] || portDefMap[String(tname)];
          try { pu._portDefName = String(tname); pu._portDefNode = resolved; } catch(e){}
        }
      } catch(e) { /* continue */ }
    }
  } catch(e) { /* ignore annotation errors */ }

  for (const [an, def] of Object.entries(activityDefs)) {
    const params = def.params || [];
    
    // First, check if there's an explicit ActivityAllocation
    let candidates = [];
    if (activityToComponent[an]) {
      // Use explicit allocation from allocation table
      candidates.push(activityToComponent[an]);
    } else {
      // Fall back to heuristic matching - check both components and connectors
      const root = String(an).replace(/AC$/i, '').replace(/Activity$/i, '').trim();
      
      // Check components first
      for (const instName of Object.keys(compInstanceDef)) {
        const ddef = compInstanceDef[instName];
        if (ddef && normalizeForMatch(String(ddef)) === normalizeForMatch(root)) { candidates.push(instName); continue; }
        const short = String(instName).split('.').pop(); if (short && normalizeForMatch(short) === normalizeForMatch(root)) { candidates.push(instName); continue; }
        if (normalizeForMatch(instName) === normalizeForMatch(root)) { candidates.push(instName); continue; }
      }
      
      // Also check connectors for activity allocation
      if (candidates.length === 0) {
        for (const desc of connectorDescriptors) {
          if (!desc || !desc.name) continue;
          const connName = desc.name;
          if (normalizeForMatch(connName) === normalizeForMatch(root)) {
            candidates.push(connName);
            continue;
          }
          const connRoot = String(connName).replace(/CN$/i, '').replace(/Connector$/i, '').trim();
          if (normalizeForMatch(connRoot) === normalizeForMatch(root)) {
            candidates.push(connName);
            continue;
          }
        }
      }
      
      if (candidates.length === 0) {
        for (const instName of Object.keys(compInstanceDef)) {
          const ddef = compInstanceDef[instName] || '';
          if (normalizeForMatch(String(ddef)).indexOf(normalizeForMatch(root)) !== -1) { candidates.push(instName); }
        }
      }
      if (candidates.length === 0) candidates.push(...Object.keys(compInstanceDef));
    }

    for (const cand of candidates) {
      const portsSet = collectPortsForQualifiedComponent(cand) || new Set();
      let matched = [];
      if (params && params.length) matched = findMatchingPortsForParams(params, portsSet) || [];
      if ((!matched || matched.length === 0) && portsSet && portsSet.size) matched = [Array.from(portsSet)[0]];
      const basicActions = activityActionsMap[an] || [];
      const enriched = basicActions.map(a => { 
        const ddef = actionDefMap[a.name] || {};
        const instanceInfo = actionInstanceMap[a.name] || {};
        return { 
          name: a.name, 
          executable: a.executable, 
          params: ddef.params || [], 
          body: ddef.body || null,
          instanceName: instanceInfo.instanceName || a.name  // Use SysADL instance name or fallback to class name
        }; 
      });
      // if no matched inputPorts but action params exist, use them
      let finalInputs = matched || [];
      if ((!finalInputs || finalInputs.length === 0) && enriched && enriched.length) {
        for (const ea of enriched) { if (ea.params && ea.params.length) { finalInputs = ea.params.slice(); break; } }
      }
      activitiesToRegister.push({ activityName: an, descriptor: { component: cand, inputPorts: finalInputs || [], actions: enriched } });
    }
  }

  // prefer using the Model name declared in the SysADL file (if present)
  let declaredModelName = null;
  traverse(ast, n => {
    if (!n || typeof n !== 'object') return;
    if ((n.type === 'Model' || /Model/i.test(n.type)) && (n.name || (n.id && n.id.name))) {
      declaredModelName = n.name || (n.id && n.id.name) || declaredModelName;
    }
  });
  const outModelName = declaredModelName || path.basename(input, path.extname(input));
  // debug: show normalized connector descriptors
  try { dbg('[DBG] connectorDescriptors:', Array.isArray(connectorDescriptors)?connectorDescriptors.length:0, JSON.stringify((connectorDescriptors||[]).slice(0,5).map(d=>({name:d.name, participants:(d.participants||[]).length})))) } catch(e){}
  try { if (process.env.SYSADL_DEBUG_FULL) dbg('[DBG-FULL] connectorDescriptors full:', JSON.stringify(connectorDescriptors, null, 2)); } catch(e){}
  // PASS: try to recover missing sides by re-parsing textual bindings from source snippet
  try {
    for (const desc of connectorDescriptors) {
      if (!desc || !desc._node) continue;
      const node = desc._node;
      // only interested if some binding entries have null sides
      if (!Array.isArray(desc.bindings) || !desc.bindings.length) continue;
      const needRepair = desc.bindings.some(b => b && (!b.left || !b.right));
      if (!needRepair) continue;
      // obtain snippet text
      let snippet = null;
      try {
        if (node.location && node.location.source && node.location.source.text) snippet = node.location.source.text;
        else if (node.location && node.location.start && typeof node.location.start.offset === 'number' && node.location.end && typeof node.location.end.offset === 'number') snippet = src.slice(node.location.start.offset, node.location.end.offset);
      } catch(e){}
      if (!snippet) continue;
      const pairs = [];
      const re = /([A-Za-z0-9_\.]+)\s*=\s*([A-Za-z0-9_\.]+)/g;
      let m;
      while ((m = re.exec(snippet)) !== null) pairs.push([m[1], m[2]]);
      if (!pairs.length) continue;
      // map pairs to desc.bindings in order
      for (let i=0;i<Math.min(pairs.length, desc.bindings.length); ++i) {
        const b = desc.bindings[i]; if (!b) continue;
        const [ls, rs] = pairs[i];
        try {
          if ((!b.left || !b.left.owner) && ls) {
            const resolvedL = resolveSide(ls, null, node);
            if (resolvedL && resolvedL.owner) b.left = resolvedL; else if (ls) b.left = ls;
          }
          if ((!b.right || !b.right.owner) && rs) {
            const resolvedR = resolveSide(rs, null, node);
            if (resolvedR && resolvedR.owner) b.right = resolvedR; else if (rs) b.right = rs;
          }
        } catch(e){}
      }
    }
  } catch(e) { /* non-fatal */ }
  // Final exact-match qualification pass: try to assign unqualified sides when there is an unambiguous exact owner
  try {
    for (const desc of connectorDescriptors) {
      if (!desc) continue;
      // ensure participants array exists
      desc.participants = desc.participants || [];
      // collect ports already assigned
      const assigned = new Set((desc.participants||[]).map(p=> (p && p.owner && p.port) ? (p.owner + '.' + p.port) : null).filter(Boolean));
      // try to inspect desc.bindings to find unqualified strings and qualify them
      if (Array.isArray(desc.bindings)) {
        for (const b of desc.bindings) {
          if (!b) continue;
          const sides = ['left','right'];
          for (const side of sides) {
            const token = b[side];
            if (!token) continue;
            // if token already object with owner, skip
            if (typeof token === 'object' && token.owner) continue;
            const portName = (typeof token === 'string') ? String(token) : (token && token.port ? String(token.port) : null);
            if (!portName) continue;
            // first: alias maps exact match
            try {
              const aliasOwners = Object.keys(usingAliasMap || {}).filter(k => usingAliasMap[k] && Object.prototype.hasOwnProperty.call(usingAliasMap[k], portName));
              if (aliasOwners.length === 1) {
                const ao = aliasOwners[0]; const mapped = usingAliasMap[ao] && usingAliasMap[ao][portName];
                const realPort = mapped || portName;
                const key = ao + '.' + realPort;
                if (!assigned.has(key)) { desc.participants.push({ owner: ao, port: realPort }); assigned.add(key); }
                continue;
              }
            } catch(e){}
            // second: exact owner candidate where compPortsMap_main[owner] has portName
            try {
              const exactOwners = Object.keys(compPortsMap_main || {}).filter(cn => compPortsMap_main[cn] && compPortsMap_main[cn].has(portName));
              if (exactOwners.length === 1) {
                const o = exactOwners[0]; const key = o + '.' + portName; if (!assigned.has(key)) { desc.participants.push({ owner: o, port: portName }); assigned.add(key); }
                continue;
              }
            } catch(e){}
            // third: try short-name mapping (instance short name equals token)
            try {
              if (compPortsMap_main && compPortsMap_main[portName]) {
                const o = portName; const key = o + '.' + portName; if (!assigned.has(key)) { desc.participants.push({ owner: o, port: portName }); assigned.add(key); }
                continue;
              }
            } catch(e){}
          }
        }
      }
      // If after qualification we have participants but some are still owner:null, try to fill them with unique candidates
      if (Array.isArray(desc.participants) && desc.participants.length) {
        for (let i=0;i<desc.participants.length;i++) {
          const p = desc.participants[i]; if (!p) continue;
          if (p.owner) continue;
          const portName = p.port || null; if (!portName) continue;
          try {
            const owners = Object.keys(compPortsMap_main || {}).filter(cn => compPortsMap_main[cn] && compPortsMap_main[cn].has(portName));
            if (owners.length === 1) { desc.participants[i].owner = owners[0]; }
          } catch(e){}
        }
      }
    }
  } catch(e) { /* non-fatal */ }

  // Post-process: for any binding entries missing an owner, prefer components declared in the same configuration
  try {
    const findCfg = (n) => { while(n){ if (n.type && /Configuration/i.test(n.type)) return n; n = n.__parent; } return null; };
    for (const desc of connectorDescriptors) {
      if (!desc || !Array.isArray(desc.bindings)) continue;
      const nodeRef = desc._node || null;
      const cfgOfDesc = nodeRef ? findCfg(nodeRef) : null;
      for (const b of desc.bindings) {
        if (!b) continue;
        for (const side of ['left','right']) {
          const val = b[side];
          if (!val) continue;
          if (typeof val === 'object' && val.owner) continue; // already qualified
          const portName = (typeof val === 'string') ? val : (val && val.port ? val.port : null);
          if (!portName) continue;
          // candidates that expose this port
          const candidatesAll = Object.keys(compPortsMap_main || {}).filter(cn => compPortsMap_main[cn] && compPortsMap_main[cn].has(portName));
          if (!candidatesAll.length) continue;
          // prefer components in same configuration
          let candidates = candidatesAll.slice();
          if (cfgOfDesc) {
            const scoped = candidatesAll.filter(cn => { try { const n = compUseNodeMap[cn]; return !!n && findCfg(n) === cfgOfDesc; } catch(e){ return false; } });
            if (scoped.length) candidates = scoped;
          }
          if (candidates.length === 1) {
            b[side] = { owner: candidates[0], port: portName };
          }
        }
      }
    }
  } catch(e) { /* non-fatal */ }
  // determine hierarchical parents using transitive reachability among ComponentDefs with configurations
  // algorithm: build directed graph A -> B when ComponentDef A's configuration instantiates ComponentDef B.
  // collapse SCCs; if some SCC reaches all others, choose its members as root(s); otherwise choose all source SCCs as roots.
  const parentMap = {}; // instanceName -> parent expression (e.g. 'this.ParentComponent')
  const rootDefs = [];
  try {
    // build set of ComponentDefs that are 'composed' (have a configuration)
    const composedDefs = Object.keys(compDefMap || {}).filter(defName => {
      try { const defNode = compDefMap[defName]; return Array.isArray(extractConfigurations(defNode)) && extractConfigurations(defNode).length > 0; } catch(e) { return false; }
    });
    // If no composed components, abort as per rule
    if (!composedDefs.length) throw new Error('Generation failed: nenhum ComponentDef composto (com Configuration) encontrado no arquivo.');

    // abort if any ComponentUse references a ComponentDef not present in compDefMap
    for (const cu of compUses) {
      try {
        const ddef = cu.definition || null;
        if (!ddef) continue;
        if (!compDefMap[ddef]) throw new Error('Generation failed: ComponentUse "' + (cu.name||String(ddef)) + '" referencia definição ausente: ' + String(ddef));
      } catch(e) { throw e; }
    }

    // build adjacency among composed defs
    const adj = {};
    for (const d of composedDefs) adj[d] = new Set();
    for (const d of composedDefs) {
      try {
        const defNode = compDefMap[d];
        const cfgs = extractConfigurations(defNode) || [];
        if (!cfgs.length) continue;
        traverse(cfgs[0], n => {
          try {
            if (!n || typeof n !== 'object') return;
            if (n.type === 'ComponentUse' || /ComponentUse/i.test(n.type)) {
              const childDef = n.definition || n.def || null;
              if (childDef && adj.hasOwnProperty(childDef)) adj[d].add(childDef);
            }
          } catch(e){}
        });
      } catch(e){}
    }

    // Tarjan SCC to collapse cycles
    const indexMap = {}; let index = 0; const stack = []; const onStack = new Set(); const sccs = []; const nodeList = Object.keys(adj);
    function strongconnect(v) {
      indexMap[v] = { idx: index, low: index }; index++;
      stack.push(v); onStack.add(v);
      for (const w of adj[v]) {
        if (indexMap[w] === undefined) { strongconnect(w); indexMap[v].low = Math.min(indexMap[v].low, indexMap[w].low); }
        else if (onStack.has(w)) { indexMap[v].low = Math.min(indexMap[v].low, indexMap[w].idx); }
      }
      if (indexMap[v].low === indexMap[v].idx) {
        const comp = [];
        while (true) {
          const w = stack.pop(); onStack.delete(w); comp.push(w);
          if (w === v) break;
        }
        sccs.push(comp);
      }
    }
    for (const v of nodeList) if (indexMap[v] === undefined) try { strongconnect(v); } catch(e){}

    // build condensed graph of SCCs
    const sccId = {}; for (let i=0;i<sccs.length;i++) for (const m of sccs[i]) sccId[m] = i;
    const condensedAdj = {}; for (let i=0;i<sccs.length;i++) condensedAdj[i] = new Set();
    for (const u of Object.keys(adj)) for (const v of adj[u]) if (sccId[u] !== undefined && sccId[v] !== undefined && sccId[u] !== sccId[v]) condensedAdj[sccId[u]].add(sccId[v]);

    const totalScc = sccs.length;
    function reachesAll(sid) {
      const seen = new Set(); const st = [sid]; while(st.length) { const x = st.pop(); if (seen.has(x)) continue; seen.add(x); for (const y of (condensedAdj[x]||[])) if (!seen.has(y)) st.push(y); }
      return seen.size === totalScc;
    }

    // find SCCs that reach all others
    const reachingSCCs = [];
    for (let i=0;i<totalScc;i++) try { if (reachesAll(i)) reachingSCCs.push(i); } catch(e){}
    if (reachingSCCs.length) {
      // pick all members of the reaching SCCs as roots
      for (const sid of reachingSCCs) for (const member of sccs[sid]) if (rootDefs.indexOf(member) === -1) rootDefs.push(member);
    } else {
      // no single SCC reaches all: emit all source SCCs (indegree 0) as roots (option A)
      const indeg = {}; for (let i=0;i<totalScc;i++) indeg[i] = 0;
      for (const u of Object.keys(condensedAdj)) for (const v of condensedAdj[u]) indeg[v] = (indeg[v]||0) + 1;
      const sources = Object.keys(indeg).filter(k => indeg[k] === 0).map(k=>parseInt(k,10));
      for (const sid of sources) for (const member of sccs[sid]) if (rootDefs.indexOf(member) === -1) rootDefs.push(member);
    }

    // populate parentMap for direct children of each rootDef by traversing its configuration
    for (const rd of rootDefs) {
      try {
        const defNode = compDefMap[rd]; if (!defNode) continue;
        const inner = extractConfigurations(defNode) || [];
        if (!inner.length) continue;
        traverse(inner[0], n => {
          if (!n || typeof n !== 'object') return;
          if (n.type === 'ComponentUse' || /ComponentUse/i.test(n.type)) {
            const child = n.name || (n.id && n.id.name) || null;
            if (child) parentMap[child] = `this.${sanitizeId(String(rd))}`;
          }
        });
      } catch(e){}
    }
  } catch(e) { throw e; }

    // Build parentLocal map: childInstanceName -> parentInstanceName, only from explicit ComponentUse nodes
    const parentLocal = {};
    for (const cu of compUses) {
      const instName = cu && (cu.name || (cu.id && cu.id.name) || cu.id) ? (cu.name || (cu.id && cu.id.name) || cu.id) : null;
      const def = cu.definition || null;
      if (!instName || !def) continue;
      const defNode = compDefMap[def] || compDefMap[String(def)];
      if (!defNode) continue;
      const innerCfgs = extractConfigurations(defNode) || [];
      if (!innerCfgs.length) continue;
      const cfgNode = innerCfgs[0];
      // look for explicit ComponentUse nodes inside the configuration
      traverse(cfgNode, n => {
        if (!n || typeof n !== 'object') return;
        if (n.type === 'ComponentUse' || /ComponentUse/i.test(n.type)) {
          const childName = n.name || (n.id && n.id.name) || null;
          if (!childName) return;
          parentLocal[childName] = instName;
        }
      });
    }

    // compute full parent path mapping: instanceName -> 'this.<ancestor>.<parent>' or 'this.<parent>' if top-level
    function getFullParentPath(inst) {
      const visited = new Set();
      function rec(name) {
        if (!name) return null;
        if (visited.has(name)) return `this.${name}`;
        visited.add(name);
        const p = parentLocal[name];
        if (!p) return `this.${name}`;
        const parentPath = rec(p) || `this.${p}`;
        return `${parentPath}.${name}`;
      }
      return rec(inst);
    }

    // merge any existing parentMap entries (from discovered roots) into parentLocal
    for (const k of Object.keys(parentMap)) {
      try {
        const v = parentMap[k];
        if (typeof v === 'string' && v.indexOf('this.') === 0) {
          const last = v.split('.').pop(); if (last) parentLocal[k] = last;
        }
      } catch(e){}
    }

    for (const child of Object.keys(parentLocal)) {
      const full = getFullParentPath(parentLocal[child]) || `this.${parentLocal[child]}`;
      parentMap[child] = full;
    }

  try { dbg('[DBG] rootDefs:', JSON.stringify(rootDefs || [])); } catch(e){}
  try { dbg('[DBG] parentMap:', JSON.stringify(parentMap || {})); } catch(e){}

  // Check if we have environment/scenario elements or forced generation
  const hasEnvElements = hasEnvironmentElements(ast) || forceEnvGeneration;
  const { traditionalElements, environmentElements } = separateElements(ast);

  if (hasEnvElements) {
    // Generate two separate files
    console.log(`${forceEnvGeneration ? 'Forced' : 'Detected'} environment/scenario elements. Generating two files...`);
    
    // 1. Generate traditional model file
    let traditionalCode = generateClassModule(outModelName, compUses, portUses, connectorDescriptors, executables, activitiesToRegister, rootDefs, parentMap, compInstanceDef, compDefMap, portDefMap, embeddedTypes, connectorDefMap, packageMap, ast, false, src);
    
    // 2. Generate environment/scenario file  
    let environmentCode = generateEnvironmentModule(outModelName, environmentElements, traditionalElements, ast, embeddedTypes, packageMap, input);
    
    // Remove JS comments from both files
    try {
      traditionalCode = traditionalCode.replace(/\/\*[\s\S]*?\*\//g, '');
      environmentCode = environmentCode.replace(/\/\*[\s\S]*?\*\//g, '');
    } catch(e) { /* ignore */ }
    
    // Determine output file paths
    const baseName = path.basename(input, path.extname(input));
    const traditionalFile = outFile || path.join(outDir, `${baseName}.js`);
    const environmentFile = path.join(outDir, `${baseName}-env-scen.js`);
    
    // Write traditional model file
    try {
      const parent = path.dirname(traditionalFile);
      if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
      fs.writeFileSync(traditionalFile, traditionalCode, 'utf8');
      console.log('Generated traditional model:', traditionalFile);
    } catch (e) {
      console.error('Failed to write traditional model file', traditionalFile, e && e.stack ? e.stack : e);
      process.exitCode = 1;
    }
    
    // Write environment/scenario file
    try {
      const parent = path.dirname(environmentFile);
      if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
      fs.writeFileSync(environmentFile, environmentCode, 'utf8');
      console.log('Generated environment/scenario model:', environmentFile);
    } catch (e) {
      console.error('Failed to write environment file', environmentFile, e && e.stack ? e.stack : e);
      process.exitCode = 1;
    }
  } else {
    // Generate single traditional file (backward compatibility)
    let moduleCode = generateClassModule(outModelName, compUses, portUses, connectorDescriptors, executables, activitiesToRegister, rootDefs, parentMap, compInstanceDef, compDefMap, portDefMap, embeddedTypes, connectorDefMap, packageMap, ast, false, src);
    
    // remove JS comments to ensure generator does not emit comments
    try {
      moduleCode = moduleCode.replace(/\/\*[\s\S]*?\*\//g, '');
    } catch(e) { /* ignore */ }
    
    // Use the predefined outFile if available, otherwise construct it
    if (!outFile) {
      outFile = path.join(outDir, path.basename(input, path.extname(input)) + '.js');
    }
    
    // Ensure parent directory exists and write the generated moduleCode
    try {
      const parent = path.dirname(outFile);
      if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
      fs.writeFileSync(outFile, moduleCode, 'utf8');
      console.log('Generated', outFile);
    } catch (e) {
      console.error('Failed to write output file', outFile, e && e.stack ? e.stack : e);
      process.exitCode = 1;
    }
  }
}

// Helper function to order datatypes by dependencies using topological sort
function orderDatatypesByDependencies(datatypes, names) {
  if (!datatypes || !names) return [];
  
  // Build dependency graph
  const dependencies = {};
  const dependents = {};
  
  for (const name of names) {
    dependencies[name] = new Set();
    dependents[name] = new Set();
  }
  
  // Analyze dependencies
  for (const name of names) {
    const info = datatypes[name];
    if (info && info.attributes) {
      for (const attr of info.attributes) {
        if (attr && attr.type && names.includes(attr.type)) {
          // name depends on attr.type
          dependencies[name].add(attr.type);
          dependents[attr.type].add(name);
        }
      }
    }
  }
  
  // Topological sort using Kahn's algorithm
  const result = [];
  const queue = [];
  const inDegree = {};
  
  // Initialize in-degree count
  for (const name of names) {
    inDegree[name] = dependencies[name].size;
    if (inDegree[name] === 0) {
      queue.push(name);
    }
  }
  
  // Process queue
  while (queue.length > 0) {
    const current = queue.shift();
    result.push(current);
    
    // Update dependent nodes
    for (const dependent of dependents[current]) {
      inDegree[dependent]--;
      if (inDegree[dependent] === 0) {
        queue.push(dependent);
      }
    }
  }
  
  // Check for circular dependencies
  if (result.length !== names.length) {
    console.warn('Circular dependencies detected in datatypes, using original order');
    return names;
  }
  
  return result;
}

// Export functions for testing
module.exports = {
  generatePureJavaScriptFromSysADL,
  sanitizeId
};

// Only run main if this is the main module
if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}

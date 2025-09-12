#!/usr/bin/env node
// v0.3 transformer: emit class-based modules that use SysADLBase runtime

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { sanitizeId } = require('../v0.2/utils');

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

function generateClassModule(modelName, compUses, portUses, connectorBindings, executables, activitiesToRegister, rootDefs, parentMap, compInstanceDef, portAliasMap, compDefMapArg, portDefMapArg, embeddedTypes) {
  const lines = [];
  // runtime imports for generated module
  lines.push("const { Model, Component, Port, CompositePort, Connector, Activity, Action, createExecutableFromExpression, createTypedClass, registerCustomEnum, Enum } = require('../SysADLBase');");
  // Generate type classes using the new auto-registration system
  function generateTypeClasses(embeddedTypes) {
    const classLines = [];
    const t = embeddedTypes && typeof embeddedTypes === 'object' ? embeddedTypes : { datatypes: {}, valueTypes: {}, enumerations: {} };

    // Generate value types as classes with auto-registration
    for (const [name, info] of Object.entries(t.valueTypes || {})) {
      if (!name) continue;
      const superType = info.extends || null;
      const unit = info.unit || null;
      const dimension = info.dimension || null;

      let classCode = `const ${name} = createTypedClass('${name}', () => class`;
      if (superType) {
        classCode += ` extends ${superType}`;
      }
      classCode += ` {\n`;

      // Constructor with parse logic
      classCode += `  constructor(value) {\n`;
      if (superType) {
        classCode += `    super(value);\n`;
      }
      classCode += `    if (value !== undefined) {\n`;
      // Add parsing based on type
      if (name === 'Int') {
        classCode += `      this.value = parseInt(value, 10);\n`;
        classCode += `      if (isNaN(this.value)) throw new Error(\`Invalid Int value: \${value}\`);\n`;
      } else if (name === 'Real') {
        classCode += `      this.value = parseFloat(value);\n`;
        classCode += `      if (isNaN(this.value)) throw new Error(\`Invalid Real value: \${value}\`);\n`;
      } else if (name === 'Boolean') {
        classCode += `      this.value = value;\n`;
      } else if (name === 'String') {
        classCode += `      this.value = value;\n`;
      } else {
        classCode += `      this.value = value;\n`;
      }
      classCode += `    }\n`;
      classCode += `  }\n`;

      // Add unit and dimension as static properties if present
      if (unit) {
        classCode += `  static unit = '${unit}';\n`;
      }
      if (dimension) {
        classCode += `  static dimension = '${dimension}';\n`;
      }

      classCode += `});\n`;
      classLines.push(classCode);
    }

    // Generate enumerations with auto-registration
    for (const [name, literals] of Object.entries(t.enumerations || {})) {
      if (!name || !Array.isArray(literals)) continue;
      const enumCode = `const ${name} = new Enum(${literals.map(lit => `"${lit}"`).join(', ')});`;
      classLines.push(enumCode);
    }

    // Generate datatypes as classes with auto-registration
    for (const [name, info] of Object.entries(t.datatypes || {})) {
      if (!name) continue;
      const superType = info.extends || null;
      const attributes = info.attributes || [];

      let classCode = `const ${name} = createTypedClass('${name}', () => class`;
      if (superType) {
        classCode += ` extends ${superType}`;
      }
      classCode += ` {\n`;

      // Constructor with attribute validation
      classCode += `  constructor(obj = {}) {\n`;
      if (superType) {
        classCode += `    super(obj);\n`;
      }
      classCode += `    if (typeof obj !== 'object' || obj === null) {\n`;
      classCode += `      throw new Error(\`Invalid object for ${name}: expected object\`);\n`;
      classCode += `    }\n`;

      // Validate required attributes
      for (const attr of attributes) {
        if (!attr || !attr.name) continue;
        const attrName = attr.name;
        const attrType = attr.type;
        classCode += `    if ('${attrName}' in obj) {\n`;
        if (attrType) {
          // Add type validation if type is known
          classCode += `      // Validate ${attrName} as ${attrType}\n`;
          classCode += `      this.${attrName} = obj.${attrName};\n`;
        } else {
          classCode += `      this.${attrName} = obj.${attrName};\n`;
        }
        classCode += `    }\n`;
      }

      classCode += `  }\n`;
      classCode += `});\n`;
      classLines.push(classCode);
    }

    return classLines.join('\n');
  }
  
  // Generate type classes
  try {
    const typeClasses = generateTypeClasses(embeddedTypes);
    lines.push(typeClasses);
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
  // create simple class per definition (if none, skip)
  for (const t of Array.from(typeNames)) {
  // if the component definition indicates boundary, propagate via opts to runtime
  const isBoundaryFlag = (typeof compDefMapArg !== 'undefined' && compDefMapArg && compDefMapArg[String(t)] && !!compDefMapArg[String(t)].isBoundary);
  // Only emit an explicit constructor when we need to modify opts (e.g. inject isBoundary).
  // If the constructor would be a no-op that only calls super(name, opts), omit it and let
  // JavaScript inheritance provide the default behavior.
  let cls;
  if (isBoundaryFlag) {
    const ctor = 'constructor(name, opts={}){ super(name, { ...opts, isBoundary: true }); }';
    cls = 'class ' + sanitizeId(String(t)) + ' extends Component { ' + ctor + ' }';
  } else {
    cls = 'class ' + sanitizeId(String(t)) + ' extends Component { }';
  }
    lines.push(cls);
  }
  lines.push('');

  // emit model class
  lines.push(`class ${sanitizeId(modelName)} extends Model {`);
  lines.push('  constructor(){');
  lines.push(`    super(${JSON.stringify(modelName)});`);
  

  // Instantiate components respecting hierarchical parents (rootDefs holds top-level composite types)
  // rootDefs: array of type names to create at model root (e.g. ['FactoryAutomationSystem'])
  // parentMap: map instanceName -> parentPath (e.g. { agvs: 'this.FactoryAutomationSystem' })
  const compMap = {};
  // create root composite instances
  if (Array.isArray(rootDefs)) {
    for (const rdef of rootDefs) {
      if (!rdef) continue;
      const prop = sanitizeId(String(rdef));
  // determine opts for root def if available
  const rootIsBoundary = (compDefMapArg && compDefMapArg[String(rdef)] && !!compDefMapArg[String(rdef)].isBoundary);
  const rootOpts = rootIsBoundary ? `{ isBoundary: true, sysadlDefinition: ${JSON.stringify(String(rdef))} }` : `{ sysadlDefinition: ${JSON.stringify(String(rdef))} }`;
  lines.push(`    this.${prop} = new ${sanitizeId(String(rdef))}(${JSON.stringify(String(rdef))}, ${rootOpts});`);
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
      // attach under parentPath, e.g. this.FactoryAutomationSystem.agvs
  const instDef = (compInstanceDef && compInstanceDef[iname]) ? compInstanceDef[iname] : null;
  const instIsBoundary = (instDef && compDefMapArg && compDefMapArg[String(instDef)] && !!compDefMapArg[String(instDef)].isBoundary);
  const instOpts = instIsBoundary ? `{ isBoundary: true, sysadlDefinition: ${JSON.stringify(String(instDef))} }` : `{ sysadlDefinition: ${instDef ? JSON.stringify(String(instDef)) : 'null'} }`;
  lines.push(`    ${parentPath}.${iname} = new ${typeCls}(${JSON.stringify(String(iname))}, ${instOpts});`);
  lines.push(`    ${parentPath}.addComponent(${parentPath}.${iname});`);
    } else {
      // fallback to previous behavior: top-level instance
  const instDef = (compInstanceDef && compInstanceDef[iname]) ? compInstanceDef[iname] : null;
  const instIsBoundary = (instDef && compDefMapArg && compDefMapArg[String(instDef)] && !!compDefMapArg[String(instDef)].isBoundary);
  const instOpts = instIsBoundary ? `{ isBoundary: true, sysadlDefinition: ${JSON.stringify(String(instDef))} }` : `{ sysadlDefinition: ${instDef ? JSON.stringify(String(instDef)) : 'null'} }`;
  lines.push(`    this.${iname} = new ${typeCls}(${JSON.stringify(String(iname))}, ${instOpts});`);
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

  // emit ports (attach to component instances)
  // track emitted ports to avoid duplicate lines when portUses and activity ensures overlap
  const __emittedPorts = new Set();
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
  const ownerExpr = instancePathMap[owner] || `this.${owner}`;
  // detect composite port declarations: pu may have children in pu.ports or pu.members
  const hasChildren = Array.isArray(pu.ports) && pu.ports.length || Array.isArray(pu.members) && pu.members.length;
  const portKey = `${owner}::${pname}`;
    if (!hasChildren) {
    if (!__emittedPorts.has(portKey)) {
      // runtime initializes .ports on components; emit direct addPort call without redundant guard
      const __dir = resolvePortDirectionFor(owner, pname);
              try { if (DBG) dbg('[DBG] emitting port for', owner, pname, 'resolvedDirection=', __dir); } catch(e){}
      lines.push(`    ${ownerExpr}.addPort(new Port(${JSON.stringify(pname)}, ${JSON.stringify(__dir)}, { owner: ${JSON.stringify(owner)} }));`);
      __emittedPorts.add(portKey);
    }
  } else {
    // emit CompositePort and its sub-ports
    const children = Array.isArray(pu.ports) ? pu.ports : pu.members;
    const compKey = `${owner}::${pname}`;
    if (!__emittedPorts.has(compKey)) {
      const __dir = resolvePortDirectionFor(owner, pname);
      lines.push(`    ${ownerExpr}.addPort(new CompositePort(${JSON.stringify(pname)}, ${JSON.stringify(__dir)}, { owner: ${JSON.stringify(owner)} }));`);
      __emittedPorts.add(compKey);
    }
    for (const sub of (children || [])) {
      const subName = sub && (sub.name || (sub.id && sub.id.name) || sub.id) || null;
      if (!subName) continue;
      const subKey = `${owner}::${pname}::${subName}`;
      if (!__emittedPorts.has(subKey)) {
        const __sdir = resolvePortDirectionFor(owner + '.' + pname, subName);
        lines.push(`    if (!${ownerExpr}.ports[${JSON.stringify(pname)}].getSubPort(${JSON.stringify(subName)})) { const __sp = new Port(${JSON.stringify(subName)}, ${JSON.stringify(__sdir)}, { owner: ${JSON.stringify(owner + '.' + pname)} }); ${ownerExpr}.ports[${JSON.stringify(pname)}].addSubPort(${JSON.stringify(subName)}, __sp); }`);
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
  const ownerExpr = instancePathMap[comp] || `this.${comp}`;
          for (const ip of inputPorts) {
                  const ipKey = `${comp}::${ip}`;
                  if (!__emittedPorts.has(ipKey)) {
                    // runtime ensures components initialize `.ports` in their constructor; emit direct addPort without redundant owner.ports initializer
                    const __dir = resolvePortDirectionFor(comp, ip);
                    lines.push(`${ownerExpr}.addPort(new Port(${JSON.stringify(ip)}, ${JSON.stringify(__dir)}, { owner: ${JSON.stringify(comp)} }));`);
                    __emittedPorts.add(ipKey);
                  }
                }
      }
    }
  } catch(e) { /* ignore */ }

  // add executables (use helper to keep code concise)
  if (Array.isArray(executables) && executables.length) {
    for (const ex of executables) {
      const params = Array.isArray(ex.params) ? ex.params : (ex.params || []);
      const body = (ex.body || ex.expression || '') || '';
      if (!String(body).trim()) continue;
      let en = ex.name || null;
      if (!en) en = `${modelName}.${Math.random().toString(36).slice(2,6)}`;
      else if (!en.includes('.')) en = `${modelName}.${en}`;
  lines.push(`    this.addExecutableSafe(${JSON.stringify(en)}, ${JSON.stringify(String(body))}, ${JSON.stringify(params)});`);
    }
  }

  // register activities
  if (Array.isArray(activitiesToRegister) && activitiesToRegister.length) {
    for (const a of activitiesToRegister) {
      const comp = a.descriptor && a.descriptor.component;
      const inputPorts = a.descriptor && a.descriptor.inputPorts ? a.descriptor.inputPorts : [];
      const actions = a.descriptor && a.descriptor.actions ? a.descriptor.actions : [];
      const actVar = 'act_' + sanitizeId(a.activityName + '_' + String(comp));
      lines.push(`    const ${actVar} = new Activity(${JSON.stringify(a.activityName)}, { component: ${JSON.stringify(comp)}, inputPorts: ${JSON.stringify(inputPorts)} });`);
      for (const act of actions) {
        const exec = act.executable || null;
        if (exec) {
          lines.push(`    ${actVar}.addAction(new Action(${JSON.stringify(act.name || exec)}, ${JSON.stringify(act.params || [])}, ${JSON.stringify(exec)}));`);
        } else {
          lines.push(`    ${actVar}.addAction(new Action(${JSON.stringify(act.name || null)}, ${JSON.stringify(act.params || [])}, null));`);
        }
      }
      lines.push(`    this.registerActivity(${JSON.stringify(a.activityName + '::' + comp)}, ${actVar});`);
    }
  }
  const unresolvedBindings = [];
  // emit connectors (use normalized connectorDescriptors so we have participants/bindings resolved)
  if (Array.isArray(connectorDescriptors) && connectorDescriptors.length) {
    // avoid emitting multiple connectors that resolve to the same concrete endpoint set
    const __connectorSigsEmitted = new Set();
    for (const cb of connectorDescriptors) {
      const cname = cb.name || ('connector_' + Math.random().toString(36).slice(2,6));
      const uid = cb && cb._uid ? '_' + String(cb._uid) : '';
      const varName = 'conn_' + sanitizeId(String(cname)) + uid;
  // build a simple signature from participants/bindings to detect duplicate connectors (owner::port sorted)
  try {
    const __partsForSig = [];
    if (Array.isArray(cb.participants) && cb.participants.length) {
      for (const p of cb.participants) {
        if (p && p.owner && p.port) __partsForSig.push(`${p.owner}::${p.port}`);
      }
    }
    if (Array.isArray(cb.bindings) && cb.bindings.length) {
      for (const b of cb.bindings) {
        try {
          if (b && b.left && b.left.owner && b.left.port) __partsForSig.push(`${b.left.owner}::${b.left.port}`);
          if (b && b.right && b.right.owner && b.right.port) __partsForSig.push(`${b.right.owner}::${b.right.port}`);
        } catch(e){}
      }
    }
    const __sig = (__partsForSig.length ? __partsForSig.sort().join('|') : null);
    if (__sig && __connectorSigsEmitted.has(__sig)) continue;
    if (__sig) __connectorSigsEmitted.add(__sig);
  } catch(e){}
  lines.push(`    const ${varName} = new Connector(${JSON.stringify(cname)});`);
  // track endpoints already emitted for this connector to avoid duplicate __attachEndpoint calls
  lines.push(`    const ${varName}__seen = new Set();`);
  // generator-time dedupe: avoid emitting identical attach lines multiple times
  const emittedConnEndpointsLocal = new Set();
      // attach participants if present (resolved earlier)
          if (Array.isArray(cb.participants) && cb.participants.length) {
        for (const p of cb.participants) {
          if (!p || !p.owner || !p.port) { unresolvedBindings.push({ connector: cname, reason: 'missing owner/port', entry: p }); continue; }
          // owner may be qualified like 'a.b' -> prefer instancePathMap lookup to get full expression
          const ownerExpr = (instancePathMap && instancePathMap[p.owner]) ? instancePathMap[p.owner] : `this.${p.owner}`;
          // compute a stable key for dedupe
          const epKey = `${p.owner}::${p.port}`;
          if (emittedConnEndpointsLocal.has(epKey)) continue;
          emittedConnEndpointsLocal.add(epKey);
          // emit attach only if not seen for this connector
          if (String(p.port).indexOf('.') !== -1) {
            const parts = String(p.port).split('.');
            const sub = parts.slice(1).join('.');
            const main = parts[0];
            lines.push(`    { const __owner = ${ownerExpr}; const __compPort = (__owner && __owner.ports && __owner.ports[${JSON.stringify(main)}]) ? __owner.ports[${JSON.stringify(main)}] : null; if(!__compPort) throw new Error('Missing composite port '+${JSON.stringify(main)}+' on '+${JSON.stringify(p.owner)}); const __sp = __compPort.getSubPort(${JSON.stringify(sub)}); if(!__sp) throw new Error('Missing sub-port '+${JSON.stringify(sub)}+' on '+${JSON.stringify(p.owner)}+'.'+${JSON.stringify(main)}); if(!${varName}__seen.has(${JSON.stringify(epKey)})) { this.attachEndpointSafe(${varName}, __sp); ${varName}__seen.add(${JSON.stringify(epKey)}); } }`);
          } else {
            lines.push(`    if(!${varName}__seen.has(${JSON.stringify(epKey)})) { this.attachEndpointSafe(${varName}, ${ownerExpr}, ${JSON.stringify(p.port)}); ${varName}__seen.add(${JSON.stringify(epKey)}); }`);
          }
        }
      }
      // also handle bindings array (may contain strings or resolved objects)
  if (Array.isArray(cb.bindings) && cb.bindings.length) {
        for (const b of cb.bindings) {
          const left = b && (b.left || b.from) ? b.left : null;
          const right = b && (b.right || b.to) ? b.right : null;
          if (!left || !right) { unresolvedBindings.push({ connector: cname, reason: 'binding pair missing', entry: b }); continue; }
          // string form: attempt to attach using previous heuristics
      if (typeof left === 'string' && typeof right === 'string') {
            const lparts = String(left).split('.'); const rparts = String(right).split('.');
            const lowner = lparts.length>1? lparts[0] : null; const lport = lparts.length>1? lparts.slice(1).join('.') : lparts[0];
            const rowner = rparts.length>1? rparts[0] : null; const rport = rparts.length>1? rparts.slice(1).join('.') : rparts[0];
                      if (lowner) {
                        const ownerExpr = (instancePathMap && instancePathMap[lowner]) ? instancePathMap[lowner] : `this.${lowner}`;
            const epKeyL = `${lowner}::${lport}`;
            if (!emittedConnEndpointsLocal.has(epKeyL)) { emittedConnEndpointsLocal.add(epKeyL); lines.push(`    if(!${varName}__seen.has(${JSON.stringify(epKeyL)})) { this.attachEndpointSafe(${varName}, ${ownerExpr}, ${JSON.stringify(lport)}); ${varName}__seen.add(${JSON.stringify(epKeyL)}); }`); }
            } else {
        unresolvedBindings.push({ connector: cname, reason: 'unqualified port left', port: lport, binding: b });
            }
            if (rowner) {
              const ownerExpr = (instancePathMap && instancePathMap[rowner]) ? instancePathMap[rowner] : `this.${rowner}`;
  const epKeyR = `${rowner}::${rport}`;
  if (!emittedConnEndpointsLocal.has(epKeyR)) { emittedConnEndpointsLocal.add(epKeyR); lines.push(`    if(!${varName}__seen.has(${JSON.stringify(epKeyR)})) { this.attachEndpointSafe(${varName}, ${ownerExpr}, ${JSON.stringify(rport)}); ${varName}__seen.add(${JSON.stringify(epKeyR)}); }`); }
            } else {
        unresolvedBindings.push({ connector: cname, reason: 'unqualified port right', port: rport, binding: b });
            }
            continue;
          }
          // object form: { left: { owner, port }, right: { owner, port } }
          const lobj = (typeof left === 'object' && left) ? left : null;
          const robj = (typeof right === 'object' && right) ? right : null;
          if (lobj && lobj.owner && lobj.port) {
            const ownerExpr = instancePathMap[lobj.owner] || `this.${lobj.owner}`;
            const epKeyL = `${lobj.owner}::${lobj.port}`;
            if (!emittedConnEndpointsLocal.has(epKeyL)) { emittedConnEndpointsLocal.add(epKeyL); lines.push(`    if(!${varName}__seen.has(${JSON.stringify(epKeyL)})) { this.attachEndpointSafe(${varName}, ${ownerExpr}, ${JSON.stringify(lobj.port)}); ${varName}__seen.add(${JSON.stringify(epKeyL)}); }`); }
          } else if (lobj && (!lobj.owner || !lobj.port)) unresolvedBindings.push({ connector: cname, reason: 'unresolved object left', entry: lobj });
          if (robj && robj.owner && robj.port) {
            const ownerExpr = instancePathMap[robj.owner] || `this.${robj.owner}`;
            const epKeyR = `${robj.owner}::${robj.port}`;
            if (!emittedConnEndpointsLocal.has(epKeyR)) { emittedConnEndpointsLocal.add(epKeyR); lines.push(`    if(!${varName}__seen.has(${JSON.stringify(epKeyR)})) { this.attachEndpointSafe(${varName}, ${ownerExpr}, ${JSON.stringify(robj.port)}); ${varName}__seen.add(${JSON.stringify(epKeyR)}); }`); }
          } else if (robj && (!robj.owner || !robj.port)) unresolvedBindings.push({ connector: cname, reason: 'unresolved object right', entry: robj });
        }
      }
      lines.push(`    this.addConnector(${varName});`);
    }
  }

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

  lines.push('  }');
  lines.push('}');
  lines.push('');
  // embed port alias metadata so consumers (simulator/tools) can map SysADL alias names
  try {
    const pa = portAliasMap || {};
    // deterministic stringify: sort keys
    const keys = Object.keys(pa).sort();
    const ordered = {};
    for (const k of keys) ordered[k] = pa[k];
    lines.push('const __portAliases = ' + JSON.stringify(ordered, null, 2) + ';');
  } catch(e) {
    lines.push('const __portAliases = {};');
  }
  lines.push(`function createModel(){ return new ${sanitizeId(modelName)}(); }`);
  lines.push('module.exports = { createModel, ' + sanitizeId(modelName) + ', __portAliases' + ((embeddedTypes.valueTypes && Object.keys(embeddedTypes.valueTypes).length) || (embeddedTypes.enumerations && Object.keys(embeddedTypes.enumerations).length) || (embeddedTypes.datatypes && Object.keys(embeddedTypes.datatypes).length) ? ', ' + Object.keys(embeddedTypes.valueTypes || {}).concat(Object.keys(embeddedTypes.enumerations || {})).concat(Object.keys(embeddedTypes.datatypes || {})).map(sanitizeId).join(', ') : '') + ' };');
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

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) { console.error('Usage: transformer.js <input.sysadl> [outdir]'); process.exit(2); }
  const input = path.resolve(argv[0]);
  const outDir = path.resolve(argv[1] || path.join(__dirname, 'generated'));
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const parserPath = path.join(__dirname, '..', 'sysadl-parser.js');
  const parse = await loadParser(parserPath);
  const src = fs.readFileSync(input, 'utf8');
  const ast = parse(src, { grammarSource: { source: input, text: src } });

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

  // collect SysADL types to embed
  function qnameToString(x){ try{ if(!x) return null; if(typeof x==='string') return x; if (x.name) return x.name; if (x.id && x.id.name) return x.id.name; if (Array.isArray(x.parts)) return x.parts.join('.'); }catch(e){} return null; }
  function attrTypeOf(a){ try{ if(!a) return null; if (a.definition) return qnameToString(a.definition); if (a.type) return qnameToString(a.type); if (a.valueType) return qnameToString(a.valueType); if (a.value) return qnameToString(a.value); }catch(e){} return null; }
  const embeddedTypes = { datatypes: {}, valueTypes: {}, enumerations: {} };
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
    while (p) { if (p.type && /ConnectorDef/i.test(p.type)) { insideConnectorDef = true; break; } p = p.__parent; }
    if (insideConnectorDef) return;
    connectorBindings.push({ owner: '', node: n });
  });
  try {
    dbg('[DBG] raw connectorBindings sample keys:', connectorBindings.slice(0,6).map(b=>({type:b.node.type, name:b.node.name, keys:Object.keys(b.node).slice(0,8)})));
    for (let i=0;i<Math.min(3, connectorBindings.length); ++i) {
      try { dbg('[DBG] connectorBindings['+i+']:', JSON.stringify(connectorBindings[i].node, null, 2).slice(0,2000)); } catch(e){}
    }
  } catch(e){}

  // Normalize connectorBindings into descriptors we can emit
  // NOTE: we perform normalization here after compPortsMap_main is available so we can
  // resolve unqualified port names to component instances and produce concrete participants.
  const connectorDescriptors = [];
  let connectorCounter = 0;
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
          // attempt to find the component-use node in the AST to get its location
          // fallback: scan whole source for pattern 'CUName\s*:\s*Type { ... using ports : ... }'
          const re = new RegExp(cuName + '\\\s*:\\\s*[^\\{]+\\{([\\s\\S]*?)\\}', 'm');
          // simpler: find occurrences like 'cuName : Type { ... using ports : (body) }'
          const fullRe = new RegExp(cuName + '\\s*:\\s*\\w+[\\s\\S]*?using\\s+ports\\s*:\\s*\\{?\\s*([^;\}]+)', 'mi');
          let m = fullRe.exec(src);
          if (!m) {
            // try alternate non-braced form: using ports : a : T ;
            const alt = new RegExp(cuName + '\\s*:\\s*\\w+[\\s\\S]*?using\\s+ports\\s*:\\s*([^;\n]+)', 'mi');
            m = alt.exec(src);
          }
          if (m && m[1]) {
            const block = m[1];
            // find alias: type pairs like 'alias : Type' possibly separated by commas or semicolons
            const parts = block.split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean);
            // attempt to map alias -> actual port name on the component definition when unambiguous
            const defName = cu.definition || cu.def || null;
            const defNode = defName ? (compDefMap[defName] || compDefMap[String(defName)]) : null;
            for (const p of parts) {
              const mm = p.match(/([A-Za-z0-9_\.]+)\s*:\s*([A-Za-z0-9_\.]+)/);
              if (mm) {
                const alias = mm[1];
                const typeName = mm[2];
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
                // set alias mapping: prefer actual port name if found, else store null to indicate alias exists
                usingAliasMap[cuName][alias] = mappedPort || null;
              }
            }
          }
        } catch(e){}
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
            // prefer alias declared in same configuration
            const aliasOwnersInCfg = Object.keys(usingAliasMap || {}).filter(k => {
              try { return usingAliasMap[k] && Object.prototype.hasOwnProperty.call(usingAliasMap[k], side) && compUseNodeMap[k] && findCfg(compUseNodeMap[k]) === cfgOfConnector; } catch(e){ return false; }
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
        // If this connector use references a connector definition, capture its participants/flows
          let referencedConnectorDef = null;
          let localScopeMap = null;
        try {
          const defName = node.definition && (node.definition.name || node.definition) ? (node.definition.name || node.definition) : null;
          if (defName && connectorDefMap[defName]) referencedConnectorDef = connectorDefMap[defName];
        } catch(e){}

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
      if (Array.isArray(node.items) && node.items.length) {
        for (const it of node.items) {
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

  const descObj = { name: cname, participants: parts, bindings: resolved, _uid: ++connectorCounter, _node: node };
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
  traverse(ast, n => { if (n && (n.type === 'Executable' || /Executable/i.test(n.type))) { const name = n.name || (n.id && n.id.name) || n.id || null; let params = []; if (Array.isArray(n.parameters)) params = n.parameters.map(p => p.name || p.id || String(p)); let body = ''; if (n.location && n.location.start && typeof n.location.start.offset === 'number') { try { const s = n.location.start.offset; const e = n.location.end.offset; body = src.slice(s,e); } catch(e){} } executables.push({ name, params, body }); } });

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
  traverse(ast, n => {
    if (n && (n.type === 'ActivityDef' || /ActivityDef/i.test(n.type))) {
      const activityName = n.name || n.id || null; if (!activityName) return;
      traverse(n, x => { if (x && x.type && /Action/.test(x.type)) { const an = x.definition || x.name || x.id || null; if (an) actionToActivity[an] = activityName; } });
    }
  });

  // build executableToAction from allocation info if present
  const executableToAction = {};
  if (ast && ast.allocation && Array.isArray(ast.allocation.allocations)) {
    for (const a of ast.allocation.allocations) {
      if (!a || !a.type) continue;
      if (a.type === 'ExecutableAllocation' && a.source && a.target) executableToAction[a.source] = a.target;
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
    const root = String(an).replace(/AC$/i, '').replace(/Activity$/i, '').trim();
    const candidates = [];
    for (const instName of Object.keys(compInstanceDef)) {
      const ddef = compInstanceDef[instName];
      if (ddef && normalizeForMatch(String(ddef)) === normalizeForMatch(root)) { candidates.push(instName); continue; }
      const short = String(instName).split('.').pop(); if (short && normalizeForMatch(short) === normalizeForMatch(root)) { candidates.push(instName); continue; }
      if (normalizeForMatch(instName) === normalizeForMatch(root)) { candidates.push(instName); continue; }
    }
    if (candidates.length === 0) {
      for (const instName of Object.keys(compInstanceDef)) {
        const ddef = compInstanceDef[instName] || '';
        if (normalizeForMatch(String(ddef)).indexOf(normalizeForMatch(root)) !== -1) { candidates.push(instName); }
      }
    }
    if (candidates.length === 0) candidates.push(...Object.keys(compInstanceDef));

    for (const cand of candidates) {
      const portsSet = collectPortsForQualifiedComponent(cand) || new Set();
      let matched = [];
      if (params && params.length) matched = findMatchingPortsForParams(params, portsSet) || [];
      if ((!matched || matched.length === 0) && portsSet && portsSet.size) matched = [Array.from(portsSet)[0]];
      const basicActions = activityActionsMap[an] || [];
      const enriched = basicActions.map(a => { const ddef = actionDefMap[a.name] || {}; return { name: a.name, executable: a.executable, params: ddef.params || [], body: ddef.body || null }; });
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
  const parentMap = {}; // instanceName -> parent expression (e.g. 'this.FactoryAutomationSystem')
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
  // build portAliasMap: instanceName -> { aliasName: realPortName | null }
  const portAliasMap = {};
  try {
    // usingAliasMap was built earlier: ownerInstance -> { alias: mappedPort | null }
    for (const inst of Object.keys(usingAliasMap || {})) {
      try {
        const amap = usingAliasMap[inst] || {};
        portAliasMap[inst] = portAliasMap[inst] || {};
        for (const alias of Object.keys(amap)) {
          const mapped = amap[alias];
          if (mapped) {
            // if mapped is a real port name known in compPortsMap_main, keep it
            if (compPortsMap_main && compPortsMap_main[inst] && compPortsMap_main[inst].has(mapped)) portAliasMap[inst][alias] = mapped;
            else portAliasMap[inst][alias] = mapped;
          } else {
            // null indicates alias exists but mapping unknown; keep null so tools can attempt heuristic
            portAliasMap[inst][alias] = null;
          }
        }
      } catch(e){}
    }
    // also, if a component has exactly one port, consider mapping common alias names to it (helpful default)
    for (const inst of Object.keys(compPortsMap_main || {})) {
      try {
        const ports = Array.from(compPortsMap_main[inst]||[]);
        if (ports.length === 1) {
          const only = ports[0];
          portAliasMap[inst] = portAliasMap[inst] || {};
          // add common alias tokens mapping to the sole port (only if not already present)
          const candidates = ['temp1','temp2','current','c3','in','out','value'];
          for (const tok of candidates) if (!Object.prototype.hasOwnProperty.call(portAliasMap[inst], tok)) portAliasMap[inst][tok] = only;
        }
      } catch(e){}
    }
  } catch(e) {}

  let moduleCode = generateClassModule(outModelName, compUses, portUses, connectorDescriptors, executables, activitiesToRegister, rootDefs, parentMap, compInstanceDef, portAliasMap, compDefMap, portDefMap, embeddedTypes);
  // remove JS comments (block and line) to ensure generator does not emit comments
  try {
    moduleCode = moduleCode.replace(/\/\*[\s\S]*?\*\//g, ''); // remove /* ... */
    moduleCode = moduleCode.replace(/(^|[^\\:])\/\/.*$/gm, '$1'); // remove //... line comments (avoid chopping http://)
  } catch(e) { /* ignore */ }
  const outFile = path.join(outDir, path.basename(input, path.extname(input)) + '.js');
  fs.writeFileSync(outFile, moduleCode, 'utf8');
  console.log('Generated', outFile);
}

main().catch(e => { console.error(e); process.exit(1); });

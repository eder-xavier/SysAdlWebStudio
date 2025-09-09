#!/usr/bin/env node
// v0.2 transformer: focus on Configuration (ComponentUse/PortUse/ConnectorBinding) and generate JS model

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { sanitizeId, qualify } = require('./utils');

async function loadParser(parserPath) {
  const url = pathToFileURL(parserPath).href;
  const mod = await import(url);
  if (!mod || typeof mod.parse !== 'function') throw new Error('Parser did not export parse');
  return mod.parse;
}

function traverse(node, cb) {
  if (!node || typeof node !== 'object') return;
  cb(node);
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach(item => traverse(item, cb)); else if (v && typeof v === 'object') traverse(v, cb);
  }
}

function traverseWithParents(node, cb, parents = []) {
  if (!node || typeof node !== 'object') return;
  cb(node, parents);
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach(item => traverseWithParents(item, cb, parents.concat([node])));
    else if (v && typeof v === 'object') traverseWithParents(v, cb, parents.concat([node]));
  }
}

function normalizeForMatch(s) {
  if (!s) return '';
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function tryFindBySuffix(target, candidates) {
  if (!target || !candidates || candidates.length === 0) return null;
  const t = String(target);
  // exact
  for (const c of candidates) if (String(c) === t) return c;
  // suffix match
  for (const c of candidates) if (t.endsWith(String(c))) return c;
  for (const c of candidates) if (String(c).endsWith(t)) return c;
  // normalized match
  const tn = normalizeForMatch(t);
  for (const c of candidates) if (normalizeForMatch(c) === tn) return c;
  // partial normalized containment
  for (const c of candidates) if (tn.indexOf(normalizeForMatch(c)) !== -1) return c;
  for (const c of candidates) if (normalizeForMatch(c).indexOf(tn) !== -1) return c;
  return null;
}

function extractConfigurations(ast) {
  const configs = [];
  traverse(ast, n => { if (n && (n.type === 'Configuration' || n.type === 'configuration')) configs.push(n); });
  return configs;
}

function collectComponentUses(configNode) {
  const uses = [];
  traverse(configNode, n => { if (n && n.type === 'ComponentUse') uses.push(n); });
  return uses;
}

function collectPortUses(configNode) {
  // attach ownerComponent by walking with parents
  const uses = [];
  traverseWithParents(configNode, (n, parents) => {
    if (n && n.type === 'PortUse') {
      let owner = null;
      for (let i = parents.length - 1; i >= 0; i--) {
        const p = parents[i];
        if (p && p.type === 'ComponentUse') {
          owner = p.name || (p.id && p.id.name) || p.id || null;
          break;
        }
      }
      const obj = Object.assign({}, n, { _ownerComponent: owner });
      uses.push(obj);
    }
  });
  return uses;
}

function collectConnectorBindings(configNode) {
  const binds = [];
  traverse(configNode, n => { if (n && (n.type === 'ConnectorBinding' || n.type === 'ConnectorUse')) binds.push(n); });
  return binds;
}

function generateModuleCode(modelName, componentUses, portUses, connectorBindings, executables, activitiesToRegister) {
  const lines = [];
  lines.push("const { ModelBase, ComponentBase, PortBase, ConnectorBase, createExecutableFromExpression } = require('../sysadl-runtime.js');");
  lines.push('function createModel() {');
  lines.push(`  const m = new ModelBase(${JSON.stringify(modelName)});`);
  lines.push('  // instantiate component uses');
  // simple mapping: ComponentUse has .name and .definition
  for (const cu of componentUses) {
    const name = cu.name || (cu.id && cu.id.name) || cu.id || 'unknown';
    const def = cu.definition || cu.def || null;
    const varName = 'cmp_' + sanitizeId(name);
  lines.push(`  const ${varName} = new ComponentBase(${JSON.stringify(name)}, { sysadlDefinition: ${JSON.stringify(def)} });`);
  lines.push(`  ${varName} && m.addComponent(${varName});`);
  }

  // collect PortUse nodes per ComponentUse by scanning each component's subtree
  const compPortsMap = {};
  for (const cu of componentUses) {
    const cname = cu.name || (cu.id && cu.id.name) || cu.id || 'unknown';
    compPortsMap[cname] = new Set();
    traverse(cu, n => {
      if (n && n.type === 'PortUse') {
        const pname = n.name || (n.id && n.id.name) || n.id || null;
        if (pname) compPortsMap[cname].add(String(pname));
      }
    });
  }
  // emit ports for each component
  for (const cname of Object.keys(compPortsMap)) {
    const compVar = 'cmp_' + sanitizeId(cname);
    const ports = Array.from(compPortsMap[cname] || []);
    for (const p of ports) {
      const pVar = sanitizeId(p);
  lines.push(`  const ${compVar}_${pVar} = new PortBase(${JSON.stringify(p)}, 'in');`);
  lines.push(`  ${compVar}_${pVar}.ownerComponent = ${JSON.stringify(cname)};`);
  lines.push(`  ${compVar}.addPort(${compVar}_${pVar});`);
    }
  }

  // connectors
  const seenConns = new Set();
  for (const cb of connectorBindings) {
    const cname = (cb.name || (cb.id && cb.id.name) || cb.id) || '_implicit';
    if (seenConns.has(cname)) continue;
    seenConns.add(cname);
    const connVar = 'conn_' + sanitizeId(cname);
  lines.push(`  const ${connVar} = new ConnectorBase(${JSON.stringify(cname)});`);
  lines.push(`  m.addConnector(${connVar});`);
    // if cb has bindings list
    const bl = cb.bindingList || cb.bindings || cb.connects || [];
    if (Array.isArray(bl) && bl.length) {
      for (const b of bl) {
        const src = (b.source && (b.source.name || b.source.id || b.source)) || b.src || b.from || null;
        const dst = (b.destination && (b.destination.name || b.destination.id || b.destination)) || b.dst || b.to || null;
        if (src && dst) {
          // produce forwarding binding: srcComp.srcPort -> dstComp.dstPort if dotted
          const sParts = String(src).split('.');
          const dParts = String(dst).split('.');
          if (sParts.length === 2 && dParts.length === 2) {
            const [sc, sp] = sParts;
            const [dc, dp] = dParts;
            const srcVar = 'cmp_' + sanitizeId(sc);
            const dstVar = 'cmp_' + sanitizeId(dc);
            lines.push(`  // binding ${src} -> ${dst}`);
            lines.push(`  if (${srcVar} && ${srcVar}.ports && ${srcVar}.ports[${JSON.stringify(sp)}]) {`);
            lines.push(`    ${srcVar}.ports[${JSON.stringify(sp)}].bindTo({ receive: function(v, model){`);
            lines.push(`      if (${dstVar} && ${dstVar}.ports && ${dstVar}.ports[${JSON.stringify(dp)}]) {`);
            lines.push(`        ${dstVar}.ports[${JSON.stringify(dp)}].receive(v, model);`);
            lines.push('      }');
            lines.push('    } });');
            lines.push('  }');
          }
        }
      }
    }
  }

  // register executables extracted from definitions
  if (Array.isArray(executables) && executables.length) {
    lines.push('  // executables extracted from definitions');
    for (const ex of executables) {
      const params = Array.isArray(ex.params) ? ex.params : (ex.params || []);
      const body = (ex.body || ex.expression || '').trim();
      if (!body) continue; // skip empty executables
      // qualify name with model context if not already
      let ename = ex.name || null;
      if (!ename) {
        ename = `exe.${modelName}.${Math.random().toString(36).slice(2,8)}`;
      } else if (!ename.includes('.')) {
        ename = `${modelName}.${ename}`;
      }
      // use runtime helper to create executable from expression/body
  // format body into a template literal with indentation
  const bodyLines = String(body).split(/;|\n/).map(l => l.trim()).filter(Boolean);
  const formatted = bodyLines.map(l => '    ' + l + ';').join('\n');
  lines.push('  try {');
  lines.push(`    m.addExecutable(${JSON.stringify(ename)}, createExecutableFromExpression(` + '`' + `\n${formatted}\n` + '`' + `, ${JSON.stringify(params)}));`);
  lines.push('  } catch (e) { /* ignore executable creation error */ }');
    }
  }

  // register activities at instance level
  if (Array.isArray(activitiesToRegister) && activitiesToRegister.length) {
    lines.push('  // activities registered for component instances');
    // first, create per-action executables for actions that have a body but no executable
    for (const a of activitiesToRegister) {
      const actName = a.activityName;
      const desc = a.descriptor || {};
      const actions = Array.isArray(desc.actions) ? desc.actions : [];
      for (const act of actions) {
        if (!act.executable && act.body) {
          const body = String(act.body || '').trim();
          if (!body) continue;
          // create qualified name: model.component.activity.action
          const compPart = desc.component ? sanitizeId(String(desc.component)) : 'comp';
          const actPart = sanitizeId(String(actName || 'activity'));
          const actionPart = sanitizeId(String(act.name || 'action'));
          const base = `${modelName}.${compPart}.${actPart}.${actionPart}`;
          const uniq = base + '_' + Math.random().toString(36).slice(2,6);
          const params = Array.isArray(act.params) ? act.params : [];
          const bodyLines = String(body).split(/;|\n/).map(l => l.trim()).filter(Boolean);
          const formatted = bodyLines.map(l => '    ' + l + ';').join('\n');
          lines.push('  try {');
          lines.push(`    m.addExecutable(${JSON.stringify(uniq)}, createExecutableFromExpression(` + '`' + `\n${formatted}\n` + '`' + `, ${JSON.stringify(params)}));`);
          lines.push('  } catch (e) { /* ignore */ }');
          // reference generated executable in action descriptor
          act.executable = uniq;
        }
      }
    }

    for (const a of activitiesToRegister) {
      const actName = a.activityName;
      const desc = a.descriptor || {};
      const comp = desc.component || null;
      const inputPorts = Array.isArray(desc.inputPorts) ? desc.inputPorts : [];
      const actions = Array.isArray(desc.actions) ? desc.actions : [];
      // emit m.registerActivity(activityName, { component, inputPorts, actions })
  const payload = JSON.stringify({ component: desc.component, inputPorts: inputPorts, actions: actions }, null, 2);
  const payloadIndented = payload.split('\n').map(l => '    ' + l).join('\n');
  lines.push('  try {');
  lines.push('    m.registerActivity(' + JSON.stringify(actName) + ', ' + payloadIndented + ');');
  lines.push('  } catch (e) { /* ignore */ }');
    }
  }

  lines.push('  return m;');
  lines.push('}');
  lines.push('module.exports = { createModel };');
  return lines.join('\n');
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) { console.error('Usage: transformer.js <input.sysadl> [outdir]'); process.exit(2); }
  const input = path.resolve(argv[0]);
  const outDir = path.resolve(argv[1] || path.join(path.dirname(input), 'v0.2', 'generated'));
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const parserPath = path.join(__dirname, '..', 'sysadl-parser.js');
  const parse = await loadParser(parserPath);
  const src = fs.readFileSync(input, 'utf8');
  const ast = parse(src, { grammarSource: { source: input, text: src } });
  const configs = extractConfigurations(ast);
  if (configs.length === 0) console.warn('No configuration sections found in model');
  // for now pick the first configuration
  const cfg = configs[0] || ast;
  const compUses = collectComponentUses(cfg);
  const portUses = collectPortUses(cfg);
  const connBinds = collectConnectorBindings(cfg);
  // extract executables from AST (definitions)
  function extractExecutablesFromAst(astNode, sourceText) {
    const list = [];
    traverseWithParents(astNode, (n) => {
      if (!n || !n.type) return;
      if (n.type === 'Executable' || /Executable/i.test(n.type)) {
        // try to get name and params and body
        const name = n.name || (n.id && n.id.name) || n.id || (n.definition) || null;
        let params = [];
        if (n.parameters && Array.isArray(n.parameters)) {
          params = n.parameters.map(p => (p.name || p.id || String(p)).toString());
        } else if (n.params && Array.isArray(n.params)) {
          params = n.params.map(p => (p.name || p.id || String(p)).toString());
        }
        let body = '';
        if (n.location && n.location.start && typeof n.location.start.offset === 'number') {
          try {
            const start = n.location.start.offset;
            const end = n.location.end.offset;
            const snippet = sourceText.slice(start, end);
            const m = snippet.match(/executable\s+def\s+\w+\s*\([^)]*\)\s*:[^\{]*\{([\s\S]*)\}/m);
            if (m && m[1]) {
              const rr = m[1].match(/return\s+([\s\S]*?)\s*;\s*$/m);
              if (rr) body = rr[1].trim(); else body = m[1].trim();
            }
          } catch (e) { /* ignore */ }
        }
        list.push({ name, params, body });
      }
    });
    return list;
  }
  const executables = extractExecutablesFromAst(ast, src);
  // allocation mappings from ast.allocation if available
  const activityToConnector = {};
  const executableToAction = {};
  if (ast && ast.allocation && Array.isArray(ast.allocation.allocations)) {
    for (const a of ast.allocation.allocations) {
      if (!a || !a.type) continue;
      if (a.type === 'ActivityAllocation' && a.source && a.target) activityToConnector[a.source] = a.target;
      if (a.type === 'ExecutableAllocation' && a.source && a.target) executableToAction[a.source] = a.target;
    }
  }
  // when allocations are missing, try to infer mappings by name similarity
  try {
    // collect action names and executable names
    const actionNames = Object.keys(actionDefMap);
    const execNames = executables.map(e => e.name).filter(Boolean);
    // try to link executables -> actions by suffix/normalized match
    for (const exName of execNames) {
      if (executableToAction[exName]) continue;
      const candidate = tryFindBySuffix(exName, actionNames);
      if (candidate) executableToAction[exName] = candidate;
    }
    // try to link actions -> activities by scanning actionToActivity and using normalized names
    const knownActions = Object.keys(actionToActivity || {});
    for (const aName of actionNames) {
      if (actionToActivity[aName]) continue;
      const cand = tryFindBySuffix(aName, knownActions);
      if (cand) actionToActivity[aName] = actionToActivity[cand];
    }
  } catch (e) { /* ignore heuristics errors */ }
  // build action->activity map by scanning ActivityDef nodes
  const actionToActivity = {};
  traverse(ast, n => {
    if (n && (n.type === 'ActivityDef' || /ActivityDef/i.test(n.type))) {
      const activityName = n.name || n.id || null;
      if (!activityName) return;
      traverse(n, x => {
        if (x && x.type && /Action/.test(x.type)) {
          const an = x.definition || x.name || x.id || null;
          if (an) actionToActivity[an] = activityName;
        }
      });
    }
  });
  const modelName = (ast && ast.name) ? ast.name : path.basename(input, path.extname(input));
  // build connector participants map from connectorBindings
  const connParticipants = {};
  for (const cb of connBinds) {
    const cname = (cb.name || (cb.id && cb.id.name) || cb.id) || '_implicit';
    connParticipants[cname] = connParticipants[cname] || [];
    const bl = cb.bindingList || cb.bindings || cb.connects || [];
    if (Array.isArray(bl)) {
      for (const b of bl) {
        const src = (b.source && (b.source.name || b.source.id || b.source)) || b.src || b.from || null;
        const dst = (b.destination && (b.destination.name || b.destination.id || b.destination)) || b.dst || b.to || null;
        // both sides may be dotted comp.port
        [src, dst].forEach(s => {
          if (!s) return;
          const parts = String(s).split('.');
          if (parts.length === 2) {
            connParticipants[cname].push({ component: parts[0], port: parts[1] });
          }
        });
      }
    }
  }

  // map component definition name -> ComponentDef node
  const compDefMap = {};
  traverse(ast, n => { if (n && (n.type === 'ComponentDef' || /ComponentDef/i.test(n.type))) { const nm = n.name || n.id || null; if (nm) compDefMap[nm] = n; } });

  // map executables -> actions -> activities using allocations
  const activityActionsMap = {}; // activityName -> [{ executable, name }]
  for (const ex of executables) {
    if (!ex || !ex.name) continue;
    const actionName = executableToAction[ex.name];
    if (!actionName) continue;
    const activityName = actionToActivity[actionName];
    if (!activityName) continue;
    activityActionsMap[activityName] = activityActionsMap[activityName] || [];
    activityActionsMap[activityName].push({ executable: ex.name, name: actionName });
  }

  // extract action defs (params/body) from AST
  const actionDefMap = {};
  traverse(ast, n => {
    if (n && (n.type === 'ActionDef' || /ActionDef/i.test(n.type))) {
      const an = n.name || n.id || null;
      if (!an) return;
      // try to extract params and body
      let params = [];
      if (Array.isArray(n.parameters)) params = n.parameters.map(p => p.name || p.id || String(p));
      else if (Array.isArray(n.params)) params = n.params.map(p => p.name || p.id || String(p));
      let body = null;
      if (n.location && n.location.start && typeof n.location.start.offset === 'number') {
        try {
          const s = n.location.start.offset; const e = n.location.end.offset;
          const snippet = src.slice(s, e);
          const m = snippet.match(/\{([\s\S]*)\}$/m);
          if (m && m[1]) body = m[1].trim();
        } catch (e) { /* ignore */ }
      }
      actionDefMap[an] = { name: an, params, body };
    }
  });

  // extract constraints (name -> equation expression) from source text as fallback
  const constraintMap = {};
  try {
    const cre = /constraint\s+(\w+)\s*\([\s\S]*?\)\s*\{[\s\S]*?equation\s*=\s*([^;\n\}]+)[;\n\}]/gmi;
    let m;
    while ((m = cre.exec(src)) !== null) {
      const cname = m[1];
      const expr = (m[2] || '').trim();
      if (cname && expr) constraintMap[cname] = expr;
    }
  } catch (e) { /* ignore */ }
  // extract activity definitions from source as fallback
  function extractActivityDefsFromSource(srcText) {
    const map = {};
    const re = /activity\s+def\s+(\w+)\s*\(([^)]*)\)\s*(?:\(([^)]*)\))?/gmi;
    let m;
    while ((m = re.exec(srcText)) !== null) {
      const name = m[1];
      const p1 = m[2] || '';
      const p2 = m[3] || '';
      const gather = (s) => s.split(',').map(x => x.trim()).filter(Boolean).map(x => { const p = x.split(':')[0].trim(); return p; });
      const params = [].concat(gather(p1), gather(p2)).filter(Boolean);
      map[name] = { name, params };
    }
    return map;
  }
  const activityDefs = extractActivityDefsFromSource(src);

  // compute component -> ports map from componentUses subtree
  const compPortsMap_main = {};
  for (const cu of compUses) {
    const cname = cu.name || (cu.id && cu.id.name) || cu.id || null;
    compPortsMap_main[cname] = new Set();
    traverse(cu, n => { if (n && n.type === 'PortUse') { const pname = n.name || (n.id && n.id.name) || n.id || null; if (pname) compPortsMap_main[cname].add(String(pname)); } });
  }

  const activitiesToRegister = [];
  for (const cu of compUses) {
    const cname = cu.name || (cu.id && cu.id.name) || cu.id || null;
    if (!cname) continue;
    const portsSet = compPortsMap_main[cname] || new Set();
    for (const [an, def] of Object.entries(activityDefs)) {
      const params = def.params || [];
      if (params.length === 0) continue;
      const allMatch = params.every(p => portsSet.has(p));
      if (allMatch) {
        const basicActions = activityActionsMap[an] || [];
        // enrich actions with params/body from actionDefMap
        const enriched = basicActions.map(a => {
          const def = actionDefMap[a.name] || {};
          return { name: a.name, executable: a.executable, params: def.params || [], body: def.body || null };
        });
        activitiesToRegister.push({ activityName: an, descriptor: { component: cname, inputPorts: params, actions: enriched } });
      }
    }
  }

  const moduleCode = generateModuleCode(modelName, compUses, portUses, connBinds, executables, activitiesToRegister);
  // post-process generated code: split occurrences of "; " into ";\n" when safe
  function splitSemicolonsSafely(code) {
    let out = '';
    let inSq = false, inDq = false, inBq = false, esc = false;
    for (let i = 0; i < code.length; i++) {
      const ch = code[i];
      if (esc) { out += ch; esc = false; continue; }
      if (ch === '\\') { out += ch; esc = true; continue; }
      if (ch === '\'') { if (!inDq && !inBq) inSq = !inSq; out += ch; continue; }
      if (ch === '"') { if (!inSq && !inBq) inDq = !inDq; out += ch; continue; }
      if (ch === '`') { if (!inSq && !inDq) inBq = !inBq; out += ch; continue; }
      // when we see semicolon followed by space and not inside any quote/backtick -> split
      if (ch === ';' && !inSq && !inDq && !inBq) {
        const next = code[i+1] || '';
        if (next === ' ' || next === '\t') {
          out += ';\n';
          // skip following single space(s)
          let j = i+1;
          while (j < code.length && (code[j] === ' ' || code[j] === '\t')) j++;
          i = j-1;
          continue;
        }
      }
      out += ch;
    }
    return out;
  }
  const finalCode = splitSemicolonsSafely(moduleCode);
  const outFile = path.join(outDir, path.basename(input, path.extname(input)) + '.js');
  fs.writeFileSync(outFile, finalCode, 'utf8');
  console.log('Generated', outFile);
}

main().catch(e => { console.error(e); process.exit(1); });

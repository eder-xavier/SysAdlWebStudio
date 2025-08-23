/* parser.js (VERSÃO CORRIGIDA PARA SIMPLE.SYSADL)
 * - Cria um modelo de dados limpo a partir da AST do Peggy.
 * - Suporta subcomponentes, portas, bindings, atividades, ações, executáveis e restrições.
 * - Focado em processar corretamente o bloco configuration do SystemCP.
 */
function parseSysADL(content) {
    if (!window.sysadlParser) {
        throw new Error("SysADL Parser (gerado pelo Peggy) não foi encontrado.");
    }
    try {
        const ast = window.sysadlParser.parse(content);
        return flattenAst(ast);
    } catch (e) {
        const errorMsg = `Parser Error: ${e.message}\n\nLocation: Line ${e.location.start.line}, Column ${e.location.start.column}`;
        throw new Error(errorMsg);
    }
}

// Converte a AST em um objeto de modelo de dados simples
function flattenAst(modelNode) {
    const flatModel = {
        name: modelNode.name || 'SysADLModel',
        types: [],
        ports: [],
        components: [],
        connectors: [],
        activities: [],
        actions: [],
        executables: [],
        constraints: [],
        allocations: modelNode.allocations ? modelNode.allocations.allocations : [],
        bindings: []
    };

    function processDefinitions(definitions, packageName = '') {
        if (!definitions) return;
        definitions.forEach(def => {
            switch (def.type) {
                case 'ValueTypeDef':
                    flatModel.types.push({
                        name: def.name,
                        extends: def.extends || null,
                        dimension: def.dimension || null,
                        unit: def.unit || null
                    });
                    break;
                case 'SimplePortDef':
                    flatModel.ports.push({
                        name: def.name,
                        flow: { direction: def.flowProperties || 'inout', type: def.flowType || 'Real' }
                    });
                    break;
                case 'ComponentDef':
                    const cleanComponent = {
                        name: def.name,
                        isBoundary: def.isBoundary || false,
                        ports: (def.ports || []).map(p => ({
                            name: p.name,
                            definition: p.definition
                        })),
                        composite: null
                    };
                    if (def.configuration) {
                        cleanComponent.composite = {
                            components: (def.configuration.components || []).map(sub => ({
                                name: sub.name,
                                definition: sub.definition,
                                ports: (sub.ports || []).map(p => ({
                                    name: p.name,
                                    definition: p.definition
                                }))
                            })),
                            connectors: (def.configuration.connectors || []).map(conn => ({
                                name: conn.name,
                                definition: conn.definition,
                                bindings: (conn.bindings || []).map(b => ({
                                    source: b.source,
                                    target: b.target
                                }))
                            })),
                            bindings: []
                        };
                        // Map bindings to sourceComponent.sourcePort = targetComponent.targetPort
                        cleanComponent.composite.connectors.forEach(conn => {
                            conn.bindings.forEach(b => {
                                const sourceComp = cleanComponent.composite.components.find(c => c.ports.some(p => p.name === b.source));
                                const targetComp = cleanComponent.composite.components.find(c => c.ports.some(p => p.name === b.target));
                                if (sourceComp && targetComp) {
                                    cleanComponent.composite.bindings.push({
                                        source: `${sourceComp.name}.${b.source}`,
                                        target: `${targetComp.name}.${b.target}`,
                                        connector: conn.name
                                    });
                                } else {
                                    console.warn(`Invalid binding in ${conn.name}: source=${b.source}, target=${b.target}`);
                                }
                            });
                        });
                    }
                    flatModel.components.push(cleanComponent);
                    break;
                case 'ConnectorDef':
                    flatModel.connectors.push({
                        name: def.name,
                        participants: (def.participants || []).map(p => ({
                            name: p.name,
                            type: p.type
                        })),
                        flows: (def.flows || []).map(f => ({
                            type: f.type,
                            from: f.from,
                            to: f.to
                        }))
                    });
                    break;
                case 'ActivityDef':
                    flatModel.activities.push({
                        name: def.name,
                        inParameters: (def.inParameters || []).map(p => ({
                            name: p.name,
                            type: p.type
                        })),
                        outParameters: (def.outParameters || []).map(p => ({
                            name: p.name,
                            type: p.type
                        })),
                        body: {
                            actions: (def.body?.actions || []).map(a => ({
                                name: a.name,
                                definition: a.definition,
                                pins: (a.pins || []).map(p => ({
                                    name: p.name,
                                    type: p.type
                                })),
                                constraint: a.constraint ? a.constraint.definition : null
                            })),
                            flows: (def.body?.delegate || []).map(f => ({
                                from: f.from,
                                to: f.to
                            }))
                        }
                    });
                    break;
                case 'ActionDef':
                    flatModel.actions.push({
                        name: def.name,
                        inParameters: (def.inParameters || []).map(p => ({
                            name: p.name,
                            type: p.type
                        })),
                        outParameters: (def.outParameters || []).map(p => ({
                            name: p.name,
                            type: p.type
                        })),
                        constraint: def.constraint ? def.constraint.definition : null,
                        delegate: (def.delegate || []).map(d => ({
                            from: d.from,
                            to: d.to
                        }))
                    });
                    break;
                case 'Executable':
                    const returnStmt = def.body?.find(s => s.type === 'ReturnStatement');
                    flatModel.executables.push({
                        name: def.name,
                        params: (def.params || []).map(p => ({
                            name: p.name,
                            type: p.type
                        })),
                        returnType: def.returnType,
                        body: expressionAstToString(returnStmt?.value)
                    });
                    break;
                case 'ConstraintDef':
                    flatModel.constraints.push({
                        name: def.name,
                        inParameters: (def.inParameters || []).map(p => ({
                            name: p.name,
                            type: p.type
                        })),
                        outParameters: (def.outParameters || []).map(p => ({
                            name: p.name,
                            type: p.type
                        })),
                        equation: expressionAstToString(def.equation)
                    });
                    break;
                case 'Package':
                    processDefinitions(def.definitions, def.name);
                    break;
            }
        });
    }

    processDefinitions(modelNode.members);
    processDefinitions(modelNode.packages?.definitions);
    return flatModel;
}

function expressionAstToString(expr) {
    if (expr === null || typeof expr !== 'object') return String(expr);
    switch (expr.type) {
        case 'BinaryExpression':
            const op = expr.operator === '==' ? '===' : expr.operator;
            return `(${expressionAstToString(expr.left)} ${op} ${expressionAstToString(expr.right)})`;
        case 'BinaryOperation':
            return `(${expressionAstToString(expr.left)} ${expr.operator} ${expressionAstToString(expr.right)})`;
        case 'NaturalLiteral':
        case 'BooleanLiteral':
            return expr.value;
        case 'StringLiteral':
            return `"${expr.value}"`;
        case 'NameExpression':
            return expr.name;
        default:
            console.warn(`Unhandled expression type: ${expr.type}`);
            return "/* unhandled expression */";
    }
}

if (typeof window !== 'undefined') {
    window.parseSysADL = parseSysADL;
}
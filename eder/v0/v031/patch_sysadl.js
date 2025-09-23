function patchSysADL(generatedCode, model) {
    try {
        // Normalize model
        model.name = model.name || 'Simple';
        model.components = Array.isArray(model.components) ? model.components : [];
        model.connectors = Array.isArray(model.connectors) ? model.connectors : [];
        model.activities = Array.isArray(model.activities) ? model.activities.map(act => ({
            ...act,
            actions: Array.isArray(act.actions) ? act.actions : []
        })) : [];
        model.allocations = Array.isArray(model.allocations) ? model.allocations : [];
        model.ports = Array.isArray(model.ports) ? model.ports : [];

        // Split generated code
        const codeLines = generatedCode.split('\n');
        const newCode = [...codeLines];

        // Adicionar correções adicionais, se necessário
        // Por exemplo, garantir que os conectores tenham as funções corretas
        const connectorSectionIndex = newCode.findIndex(line => line.trim().startsWith('// Connector Classes'));
        if (connectorSectionIndex !== -1) {
            newCode.splice(connectorSectionIndex, 0, '// Connector Classes (Patched)');
            for (const conn of model.connectors) {
                const connName = sanitizeVarName(conn.name);
                const activity = model.activities.find(a => model.allocations.some(al => al.type === 'activity' && al.target === conn.name && al.source === a.name));
                const action = activity?.actions?.[0];
                const transformFn = action ? model.allocations.find(al => al.type === 'executable' && al.target === action.name)?.source : null;
                const constraintFn = action?.constraint ? `validate${action.constraint}` : null;
                newCode.push(`export class ${connName} extends SysADLConnector {`);
                newCode.push(`${indent(1)}constructor() {`);
                newCode.push(`${indent(2)}super('${connName}', null, null, ${transformFn || 'null'}, ${constraintFn || 'null'});`);
                newCode.push(`${indent(1)}}`);
                newCode.push('}');
                newCode.push('');
            }
        }

        return newCode.join('\n');
    } catch (err) {
        console.error(`Error patching SysADL code: ${err.message}`);
        return generatedCode + `\n// Error patching code: ${err.message}`;
    }
}

if (typeof window !== 'undefined') {
    window.patchSysADL = patchSysADL;
}
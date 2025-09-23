function patchSysADL(generatedCode, model) {
    try {
        model.name = model.name || 'Simple';
        model.components = Array.isArray(model.components) ? model.components : [];
        model.connectors = Array.isArray(model.connectors) ? model.connectors : [];
        model.activities = Array.isArray(model.activities) ? model.activities.map(act => ({
            ...act,
            actions: Array.isArray(act.actions) ? act.actions : []
        })) : [];
        model.allocations = Array.isArray(model.allocations) ? model.allocations : [];
        model.ports = Array.isArray(model.ports) ? model.ports : [];

        const codeLines = generatedCode.split('\n');
        const newCode = [...codeLines];

        const connectorSectionIndex = newCode.findIndex(line => line.trim().startsWith('// Connector Classes'));
        if (connectorSectionIndex !== -1) {
            newCode.splice(connectorSectionIndex + 1, 0, '// Patched Connector Classes');
            model.connectors.forEach(conn => {
                const connName = sanitizeVarName(conn.name);
                const activityAlloc = model.allocations.find(a => a.type === 'activity' && a.target === conn.name);
                let transformFn = 'null', constraintFn = 'null';
                if (activityAlloc) {
                    const activity = model.activities.find(a => a.name === activityAlloc.source);
                    if (activity && activity.actions.length > 0) {
                        const action = activity.actions[0];
                        const execAlloc = model.allocations.find(a => a.type === 'executable' && a.target === action.name);
                        if (execAlloc) transformFn = execAlloc.source;
                        if (action.constraint) constraintFn = `validate${action.constraint}`;
                    }
                }
                newCode.push(`export class ${connName} extends SysADLConnector {`);
                newCode.push(`${indent(1)}constructor() {`);
                newCode.push(`${indent(2)}super('${connName}', null, null, ${transformFn}, ${constraintFn});`);
                newCode.push(`${indent(1)}}`);
                newCode.push('}');
                newCode.push('');
            });
        }

        return newCode.join('\n');
    } catch (err) {
        console.error(`Error patching SysADL code: ${err.message}`);
        return generatedCode + `\n// Error patching code: ${err.message}`;
    }
}
function fixSyntax(code) {
    let fixedCode = code;

    // Remover duplos pontos-e-vírgulas
    fixedCode = fixedCode.replace(/;+/g, ';');

    // Corrigir acessos redundantes params["params"]
    fixedCode = fixedCode.replace(/params\["params"\]\["([^"]+)"\]/g, 'params["$1"]');
    fixedCode = fixedCode.replace(/params\["params"\]\?/g, 'params');

    // Corrigir == por ===
    fixedCode = fixedCode.replace(/\b==\b/g, '===');

    // Corrigir variáveis soltas
    fixedCode = fixedCode.replace(/\b(\w+)\s*===/g, (match, varName) => {
        if (!['true', 'false', 'null', 'undefined', 'Command', 'On', 'Off'].includes(varName)) {
            return `params["${varName}"] ===`;
        }
        return match;
    });

    return fixedCode;
}
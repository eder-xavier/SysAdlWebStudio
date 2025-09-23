function parseAndGenerate() {
    const sysadlCode = sysadlEditor.getValue();
    try {
        const { log, ast } = parseSysADL(sysadlCode);
        const jsCode = generateJS(ast);
        logEditor.setValue(log);
        jsEditor.setValue(jsCode);
        resultEditor.setValue('');
    } catch (error) {
        logEditor.setValue('Error: ' + error.message);
    }
}

function runSimulation() {
    const jsCode = jsEditor.getValue();
    try {
        const output = simulate(jsCode);
        resultEditor.setValue(output);
    } catch (error) {
        resultEditor.setValue('Error: ' + error.message);
    }
}

function downloadJS() {
    const jsCode = jsEditor.getValue();
    const blob = new Blob([jsCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated.js';
    a.click();
    URL.revokeObjectURL(url);
}
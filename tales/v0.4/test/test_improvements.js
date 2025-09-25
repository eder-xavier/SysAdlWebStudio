// Teste simples das funções de conversão SysADL para JavaScript
const transformer = require('./transformer.js');

console.log("=== Teste 1: Atribuição de propriedade ===");
const assignment = "robot.position = destination_location";
const jsAssignment = transformer.generatePureJavaScriptFromSysADL ? 
    transformer.generatePureJavaScriptFromSysADL(assignment) : 
    "Função não encontrada";
console.log("SysADL:", assignment);
console.log("JavaScript:", jsAssignment);

console.log("\n=== Teste 2: Invocação de conexão ===");
const connection = ":Move(robot, destination_location)";
const jsConnection = transformer.generatePureJavaScriptFromSysADL ? 
    transformer.generatePureJavaScriptFromSysADL(connection) : 
    "Função não encontrada";
console.log("SysADL:", connection);
console.log("JavaScript:", jsConnection);

console.log("\n=== Teste 3: Verificar se SysADLRuntimeHelpers existe ===");
try {
    const SysADLBase = require('./sysadl-framework/SysADLBase');
    console.log("SysADLRuntimeHelpers disponível:", !!SysADLBase.SysADLRuntimeHelpers);
    if (SysADLBase.SysADLRuntimeHelpers) {
        console.log("Métodos disponíveis:", Object.getOwnPropertyNames(SysADLBase.SysADLRuntimeHelpers.prototype));
    }
} catch(e) {
    console.log("Erro ao carregar SysADLBase:", e.message);
}
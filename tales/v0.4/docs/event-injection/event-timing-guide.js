#!/usr/bin/env node
/**
 * 🎯 DISPARAR EVENTO APÓS TASK ESPECÍFICA
 * Como usar timing condicional ao invés de "immediate"
 */

console.log('🎯 DISPARAR EVENTO APÓS TASK ESPECÍFICA');
console.log('=====================================\n');

console.log('## 📋 SUA PERGUNTA');
console.log('Ao invés de: inject AGV2atStationD immediate;');
console.log('Você quer: disparar AGV2atStationD APÓS uma task específica\n');

console.log('## ⚡ MÉTODOS DISPONÍVEIS NO SYSADL\n');

console.log('### MÉTODO 1: After Scene/Scenario (after)');
console.log(`
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // ✅ Disparar APÓS uma scene específica
  inject AGV2atStationD after SCN_MoveAGV1toA;
  
  // ✅ Disparar APÓS um scenario específico  
  inject AGV2atStationD after Scenario1;
  
  Scenario1;
}
`);

console.log('### MÉTODO 2: Condicionalmente (when)');
console.log(`
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // ✅ Disparar QUANDO uma condição for atendida
  inject AGV2atStationD when agv1.location == stationA.ID;
  
  // ✅ Disparar QUANDO múltiplas condições
  inject AGV2atStationD when agv1.location == stationA.ID && part.location == stationA.ID;
  
  Scenario1;
}
`);

console.log('### MÉTODO 3: Com Delay Após Task (after + delay)');
console.log(`
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // ✅ Disparar 5 segundos APÓS SCN_MoveAGV1toA
  inject AGV2atStationD after SCN_MoveAGV1toA after 5s;
  
  // ✅ Disparar 10 segundos APÓS Scenario1 completar
  inject AGV2atStationD after Scenario1 after 10s;
  
  Scenario1;
}
`);

console.log('### MÉTODO 4: Before Task (before)');
console.log(`
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // ✅ Disparar ANTES de uma scene específica
  inject AGV2atStationD before SCN_AGV1movePartToC;
  
  // ✅ Disparar ANTES de Scenario2
  inject AGV2atStationD before Scenario2;
  
  Scenario1;
  Scenario2;
}
`);

console.log('### MÉTODO 5: Dentro de uma Scene');
console.log(`
SceneDefinitions MyScenes to MyEvents {
  Scene def SCN_MoveAGV1toA on { 
    pre-condition {
      agv1.location == stationC.ID;
      part.location == stationA.ID; }
    start cmdSupervisor;
    
    // ✅ Disparar evento DURANTE a execução da scene
    action inject AGV2atStationD after AGV1NotifArriveA;
    
    finish AGV1NotifArriveA;
    post-condition {
      agv1.location == stationA.ID;
      part.location == stationA.ID; }
  }
}
`);

console.log('### MÉTODO 6: Eventos Encadeados');
console.log(`
EventsDefinitions MyEvents to MyFactoryConfiguration {
  Event def AGV1Events for agv1 {
    ON AGV1NotifArriveA
      THEN AGV1AtStationA {
        agv1.outNotification.notification="arrived";
        :Notify(agv1, supervisor); }
      // ✅ Disparar próximo evento APÓS este
      THEN TriggerAGV2atStationD {
        :Event(AGV2atStationD); }
  }
}
`);

console.log('\n## 🎮 EXEMPLOS PRÁTICOS ESPECÍFICOS\n');

console.log('### Exemplo 1: Disparar após AGV1 chegar em StationA');
console.log(`
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // AGV2 detecta stationD SOMENTE após AGV1 chegar em stationA
  inject AGV2atStationD when agv1.location == stationA.ID;
  
  Scenario1;
}
`);

console.log('### Exemplo 2: Disparar após Scene completar');
console.log(`
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // AGV2 detecta stationD APÓS SCN_MoveAGV1toA completar
  inject AGV2atStationD after SCN_MoveAGV1toA;
  
  Scenario1;
}
`);

console.log('### Exemplo 3: Disparar após evento específico');
console.log(`
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // AGV2 detecta stationD APÓS AGV1NotifArriveA ser disparado
  inject AGV2atStationD after AGV1NotifArriveA;
  
  Scenario1;
}
`);

console.log('### Exemplo 4: Disparar com múltiplas condições');
console.log(`
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // AGV2 detecta stationD QUANDO AGV1 chegou E part foi carregada
  inject AGV2atStationD when agv1.location == stationA.ID && agv1.arm == loaded;
  
  Scenario1;
}
`);

console.log('\n## ⚙️ IMPLEMENTAÇÃO NO SEU MODELO ATUAL\n');

console.log('### Opção A: Após Scene SCN_MoveAGV1toA');
console.log(`
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // ✅ AGV2 detecta stationD APÓS AGV1 ir para stationA
  inject AGV2atStationD after SCN_MoveAGV1toA;
  
  Scenario1;
}
`);

console.log('### Opção B: Quando AGV1 chegar em stationA');
console.log(`
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // ✅ AGV2 detecta stationD QUANDO AGV1 estiver em stationA
  inject AGV2atStationD when agv1.location == "StationA";
  
  Scenario1;
}
`);

console.log('### Opção C: Após evento AGV1NotifArriveA');
console.log(`
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // ✅ AGV2 detecta stationD APÓS evento AGV1NotifArriveA
  inject AGV2atStationD after AGV1NotifArriveA;
  
  Scenario1;
}
`);

console.log('\n## 🔄 FLUXO DE EXECUÇÃO RESULTANTE\n');

console.log('Com: inject AGV2atStationD after SCN_MoveAGV1toA;');
console.log('');
console.log('1. 🚀 Inicia execução');
console.log('2. ▶️ Executa SCN_MoveAGV1toA');  
console.log('   - cmdSupervisor');
console.log('   - AGV1 viaja para stationA');
console.log('   - AGV1NotifArriveA');
console.log('3. ✅ SCN_MoveAGV1toA completa');
console.log('4. ⚡ DISPARA AGV2atStationD (automático)');
console.log('5. 🔧 agv2.sensor = stationD');
console.log('6. 🎯 AGV2locationStationD (automático)');
console.log('7. ▶️ Continua execução...');

console.log('\n🎯 **Escolha o método que melhor se adapta ao seu cenário!**');
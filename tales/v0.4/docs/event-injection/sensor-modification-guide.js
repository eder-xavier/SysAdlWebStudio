#!/usr/bin/env node
/**
 * 🎯 GUIA PRÁTICO: Como Modificar Valores de Sensor para Disparar Eventos
 * Baseado no framework SysADL e modelo AGV
 */

console.log('🎯 MODIFICAR VALORES DE SENSOR PARA DISPARAR EVENTOS');
console.log('===================================================\n');

console.log('## 🔍 CONTEXTO: Sua Pergunta\n');
console.log('Você quer: agv2.sensor = stationD');
console.log('Para disparar: ON agv2.sensor == stationD');
console.log('Resultado: AGV2locationStationD será executado\n');

console.log('## 🛠️ MÉTODOS DISPONÍVEIS NO SYSADL\n');

console.log('### MÉTODO 1: Event Injection no ScenarioExecution ⚡\n');
console.log(`
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // 🎯 Modificar sensor e disparar evento
  inject AGV2atStationD immediate;  // Dispara evento diretamente
  inject SetSensorAGV2 after 2s;    // Ou com delay
  
  Scenario1;
}
`);

console.log('### MÉTODO 2: Adição de Eventos Customizados 🔧\n');
console.log(`
EventsDefinitions MyEvents to MyFactoryConfiguration {
  Event def StationDEvents for stationD {
    ON agv2.sensor == stationD	
      THEN AGV2locationStationD {			 
        agv2.location = stationD.signal; }
    
    // ✅ Novo evento para modificar sensor programaticamente
    ON SetAGV2SensorStationD
      THEN UpdateAGV2SensorToD {
        agv2.sensor = stationD; }  // ← Modifica o sensor
  }
}
`);

console.log('### MÉTODO 3: Eventos de Simulação de Movimento 🚛\n');
console.log(`
Event def AGV2Events for agv2 {
  // ... eventos existentes ...
  
  // ✅ Eventos para simular detecção de sensor
  ON AGV2atStationD
    THEN AGV2DetectedStationD {
      agv2.sensor = stationD;  // ← Modifica sensor
    }
    
  ON SimulateAGV2Movement
    THEN AGV2MovingToStations {
      // Simular movimento sequencial
      agv2.sensor = stationC; // Primeiro
      agv2.sensor = stationD; // Depois  
      agv2.sensor = stationE; // Finalmente
    }
}
`);

console.log('### MÉTODO 4: Através do Código JavaScript Gerado 💻\n');
console.log(`
// No código JavaScript gerado, você pode:

class StationDEvents {
  constructor(sysadlBase) {
    this.sysadlBase = sysadlBase;
    this.setupEventHandlers();
  }
  
  // Método para modificar sensor programaticamente
  async setSensorToStationD() {
    // 🎯 Modificar valor do sensor
    this.sysadlBase.environmentConfig.agv2.sensor = this.sysadlBase.environmentConfig.stationD;
    
    // 🎯 Disparar evento automaticamente
    await this.AGV2locationStationD();
  }
  
  async AGV2locationStationD() {
    this.sysadlBase.logger.log('⚡ AGV2 sensor detected stationD');
    // Atualizar localização
    this.sysadlBase.environmentConfig.agv2.location = this.sysadlBase.environmentConfig.stationD.signal;
  }
}
`);

console.log('\n## 🎮 EXEMPLOS PRÁTICOS DE USO\n');

console.log('### Exemplo 1: Teste Imediato de Chegada\n');
console.log(`
// No JavaScript gerado:
async function testAGV2AtStationD() {
  // Forçar AGV2 a "chegar" em stationD
  environmentConfig.agv2.sensor = environmentConfig.stationD;
  
  // Verificar se evento foi disparado
  console.log('AGV2 location:', environmentConfig.agv2.location);
  // Resultado: agv2.location = stationD.signal
}
`);

console.log('### Exemplo 2: Simulação de Movimento Gradual\n');
console.log(`
async function simulateAGV2Journey() {
  console.log('🚛 Iniciando jornada do AGV2...');
  
  // Simular passagem por estações
  setTimeout(() => {
    environmentConfig.agv2.sensor = environmentConfig.stationC;
    console.log('📍 AGV2 passou por stationC');
  }, 1000);
  
  setTimeout(() => {
    environmentConfig.agv2.sensor = environmentConfig.stationD;
    console.log('📍 AGV2 chegou em stationD'); // ← DISPARA EVENTO
  }, 3000);
  
  setTimeout(() => {
    environmentConfig.agv2.sensor = environmentConfig.stationE;
    console.log('📍 AGV2 chegou em stationE');
  }, 5000);
}
`);

console.log('### Exemplo 3: Integração com EventInjector\n');
console.log(`
// Usando o EventInjector do framework
async function injectSensorChange() {
  // Injetar evento que modifica sensor
  await sysadlBase.eventInjector.injectEvent(
    'AGV2atStationD',        // Nome do evento
    { 
      sensor: 'stationD',    // Parâmetros
      location: 'update' 
    },
    0,                       // Delay (imediato)
    { 
      updateSensor: true     // Opções
    }
  );
}
`);

console.log('\n## ⚙️ IMPLEMENTAÇÃO NO SEU MODELO\n');

console.log('### Passo 1: Adicione evento customizado');
console.log(`
Event def AGV2Events for agv2 {
  // ... eventos existentes ...
  
  ON AGV2atStationD
    THEN AGV2DetectedStationD {
      agv2.sensor = stationD; }
}
`);

console.log('### Passo 2: No ScenarioExecution, dispare o evento');
console.log(`
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // Disparar evento que modifica sensor
  inject AGV2atStationD immediate;
  
  Scenario1;
}
`);

console.log('### Passo 3: Verificar no código JavaScript gerado');
console.log(`
// O transformer gerará automaticamente:
async processEventInjections() {
  if (this.executionConfig.eventInjections.includes('AGV2atStationD')) {
    await this.sysadlBase.eventInjector.injectEvent('AGV2atStationD', {}, 0, {});
  }
}
`);

console.log('\n## 🎯 RESUMO FINAL\n');

console.log('✅ **Para modificar agv2.sensor = stationD:**');
console.log('   1. Adicione evento ON AGV2atStationD THEN agv2.sensor = stationD');
console.log('   2. Use inject AGV2atStationD no ScenarioExecution');  
console.log('   3. O framework automaticamente dispara ON agv2.sensor == stationD');
console.log('   4. Resultado: AGV2locationStationD é executado');

console.log('\n✅ **O que acontece automaticamente:**');
console.log('   🔄 agv2.sensor = stationD (modificação)');
console.log('   ⚡ ON agv2.sensor == stationD (condição atendida)');  
console.log('   🎯 AGV2locationStationD (evento disparado)');
console.log('   📍 agv2.location = stationD.signal (resultado)');

console.log('\n🚀 **Framework SysADL gerencia tudo automaticamente!**');
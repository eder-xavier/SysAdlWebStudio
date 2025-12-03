#!/usr/bin/env node
/**
 * 🎯 DEMONSTRAÇÃO PRÁTICA: Modificando Sensor para Disparar Eventos
 * Como usar agv2.sensor = stationD para disparar ON agv2.sensor == stationD
 */

// Importar o modelo gerado
import { 
  EnvironmentConfiguration, 
  EventsManager, 
  SceneExecutor, 
  ScenarioExecutor 
} from './generated/AGV-completo-env-scen.js';

console.log('🎯 DEMONSTRAÇÃO: Modificação de Sensor AGV2');
console.log('===========================================\n');

// Criar instância do modelo
const environmentConfig = new EnvironmentConfiguration();
const eventsManager = new EventsManager(environmentConfig);

console.log('## 📊 Estado Inicial');
console.log(`AGV1 location: ${environmentConfig.agv1.location}`);
console.log(`AGV2 location: ${environmentConfig.agv2.location}`);
console.log(`AGV2 sensor: ${environmentConfig.agv2.sensor || 'null'}`);
console.log(`Part location: ${environmentConfig.part.location}\n`);

console.log('## 🎯 MÉTODO 1: Disparar evento que modifica sensor\n');

async function testSensorModification() {
  try {
    console.log('🔥 Disparando evento AGV2atStationD...');
    
    // Disparar evento que modifica o sensor
    const result = eventsManager.AGV2Events.executeRule('AGV2atStationD', {
      agv2: environmentConfig.agv2,
      stationD: environmentConfig.stationD
    });
    
    console.log('✅ Evento executado:', result);
    console.log(`📍 AGV2 sensor após evento: ${environmentConfig.agv2.sensor}`);
    
    // Verificar se condição ON agv2.sensor == stationD foi atendida
    if (environmentConfig.agv2.sensor === 'stationD') {
      console.log('⚡ Condição atendida! Disparando AGV2locationStationD...');
      
      // Executar evento consequente
      const locationResult = eventsManager.StationDEvents.executeRule('agv2.sensor', {
        agv2: environmentConfig.agv2,
        stationD: environmentConfig.stationD  
      });
      
      console.log('✅ AGV2locationStationD executado:', locationResult);
      console.log(`📍 AGV2 location final: ${environmentConfig.agv2.location}`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

console.log('## 🎯 MÉTODO 2: Modificação direta + verificação automática\n');

async function testDirectSensorModification() {
  try {
    console.log('🔧 Modificando sensor diretamente...');
    
    // Modificar sensor diretamente
    environmentConfig.agv2.sensor = environmentConfig.stationD;
    console.log(`📍 AGV2 sensor modificado para: ${environmentConfig.agv2.sensor}`);
    
    // Verificar se há eventos a serem disparados
    if (eventsManager.StationDEvents.hasRule('agv2.sensor')) {
      console.log('⚡ Regra encontrada! Executando evento...');
      
      const result = eventsManager.StationDEvents.executeRule('agv2.sensor', {
        agv2: environmentConfig.agv2,
        stationD: environmentConfig.stationD
      });
      
      console.log('✅ Resultado:', result);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

console.log('## 🎯 MÉTODO 3: Simulação de jornada completa\n');

async function simulateAGV2Journey() {
  try {
    console.log('🚛 Iniciando simulação de jornada do AGV2...');
    
    const stations = [
      { name: 'stationC', entity: environmentConfig.stationC },
      { name: 'stationD', entity: environmentConfig.stationD },
      { name: 'stationE', entity: environmentConfig.stationE }
    ];
    
    for (let i = 0; i < stations.length; i++) {
      const station = stations[i];
      
      console.log(`\n📍 Passo ${i+1}: AGV2 chegando em ${station.name}...`);
      
      // Modificar sensor para simular chegada
      environmentConfig.agv2.sensor = station.entity;
      console.log(`🔧 Sensor modificado: agv2.sensor = ${station.name}`);
      
      // Verificar e executar eventos automáticos
      const eventManager = getEventManagerForStation(station.name);
      if (eventManager && eventManager.hasRule('agv2.sensor')) {
        console.log(`⚡ Disparando evento para ${station.name}...`);
        
        const result = eventManager.executeRule('agv2.sensor', {
          agv2: environmentConfig.agv2,
          [station.name]: station.entity
        });
        
        console.log(`✅ Evento executado:`, result);
        console.log(`📍 Nova localização: ${environmentConfig.agv2.location}`);
      }
      
      // Delay para simular movimento
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 Jornada completa finalizada!');
    
  } catch (error) {
    console.error('❌ Erro na simulação:', error.message);
  }
}

function getEventManagerForStation(stationName) {
  switch (stationName) {
    case 'stationC': return eventsManager.StationCEvents;
    case 'stationD': return eventsManager.StationDEvents;
    case 'stationE': return eventsManager.StationEEvents;
    default: return null;
  }
}

console.log('## 🎯 MÉTODO 4: Integração com EventInjector\n');

async function testEventInjectorIntegration() {
  try {
    console.log('💉 Testando integração com EventInjector...');
    
    // Simular injeção de evento
    const eventInjection = {
      eventName: 'AGV2atStationD',
      parameters: {
        agv2: environmentConfig.agv2,
        stationD: environmentConfig.stationD
      },
      timing: { type: 'immediate' },
      options: { updateSensor: true }
    };
    
    console.log('📝 Configuração de injeção:', eventInjection);
    
    // Executar injeção (simulação)
    console.log('⚡ Executando injeção de evento...');
    
    const result = eventsManager.AGV2Events.executeRule(
      eventInjection.eventName,
      eventInjection.parameters
    );
    
    console.log('✅ Event injection executado:', result);
    console.log(`📍 Estado final do sensor: ${environmentConfig.agv2.sensor}`);
    
  } catch (error) {
    console.error('❌ Erro na event injection:', error.message);
  }
}

// Executar demonstrações
async function runDemonstrations() {
  console.log('🚀 EXECUTANDO DEMONSTRAÇÕES...\n');
  
  console.log('=== TESTE 1: Evento que modifica sensor ===');
  await testSensorModification();
  
  console.log('\n=== TESTE 2: Modificação direta ===');
  // Reset para estado inicial
  environmentConfig.agv2.sensor = null;
  environmentConfig.agv2.location = environmentConfig.stationD.ID;
  await testDirectSensorModification();
  
  console.log('\n=== TESTE 3: Simulação de jornada ===');
  // Reset para estado inicial
  environmentConfig.agv2.sensor = null;
  environmentConfig.agv2.location = environmentConfig.stationC.ID;
  await simulateAGV2Journey();
  
  console.log('\n=== TESTE 4: Event injection ===');
  // Reset para estado inicial  
  environmentConfig.agv2.sensor = null;
  await testEventInjectorIntegration();
  
  console.log('\n🎉 TODAS AS DEMONSTRAÇÕES CONCLUÍDAS!');
}

// Verificar se está sendo executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemonstrations().catch(console.error);
}

export {
  testSensorModification,
  testDirectSensorModification, 
  simulateAGV2Journey,
  testEventInjectorIntegration
};
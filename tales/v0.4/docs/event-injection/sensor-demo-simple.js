#!/usr/bin/env node
/**
 * 🎯 EXEMPLO PRÁTICO FINAL: Como Modificar Sensor e Disparar Eventos
 * Implementação simplificada baseada no código gerado
 */

console.log('🎯 MODIFICAÇÃO DE SENSOR PARA DISPARAR EVENTOS');
console.log('==============================================\n');

// Simular estrutura do modelo gerado
const environmentConfig = {
  agv1: { 
    location: 'stationC.ID',
    sensor: null 
  },
  agv2: { 
    location: 'stationD.ID', 
    sensor: null 
  },
  stationA: { ID: 'StationA', signal: 'A_SIGNAL' },
  stationB: { ID: 'StationB', signal: 'B_SIGNAL' },
  stationC: { ID: 'StationC', signal: 'C_SIGNAL' },
  stationD: { ID: 'StationD', signal: 'D_SIGNAL' },
  stationE: { ID: 'StationE', signal: 'E_SIGNAL' },
  part: { location: 'stationA.ID' }
};

// Simular eventos baseados no código gerado
const eventSystem = {
  
  // Evento que MODIFICA o sensor (baseado em AGV2atStationD)
  executeAGV2DetectedStationD(context) {
    console.log('🔥 Executando ação: AGV2DetectedStationD');
    
    // ✅ AQUI É ONDE O SENSOR É MODIFICADO
    environmentConfig.agv2.sensor = environmentConfig.stationD;
    
    console.log(`   📍 agv2.sensor = ${environmentConfig.agv2.sensor.ID}`);
    
    // Verificar se condição de evento automático foi atendida
    this.checkSensorConditions();
    
    return { action: 'AGV2DetectedStationD', status: 'executed', context };
  },
  
  // Evento que é DISPARADO pela condição (baseado em agv2.sensor == stationD)
  executeAGV2locationStationD(context) {
    console.log('⚡ Executando ação: AGV2locationStationD');
    
    // ✅ AQUI É O RESULTADO DO EVENTO DISPARADO
    environmentConfig.agv2.location = environmentConfig.stationD.signal;
    
    console.log(`   📍 agv2.location = ${environmentConfig.agv2.location}`);
    
    return { action: 'AGV2locationStationD', status: 'executed', context };
  },
  
  // Verificar condições de sensor automaticamente
  checkSensorConditions() {
    console.log('🔍 Verificando condições de sensor...');
    
    // Condição: ON agv2.sensor == stationD
    if (environmentConfig.agv2.sensor === environmentConfig.stationD) {
      console.log('✅ Condição atendida: agv2.sensor == stationD');
      console.log('⚡ Disparando evento automático: AGV2locationStationD');
      
      // Disparar evento automaticamente
      this.executeAGV2locationStationD({
        agv2: environmentConfig.agv2,
        stationD: environmentConfig.stationD
      });
    } else {
      console.log('❌ Condição não atendida');
    }
  },
  
  // Simular event injection
  injectEvent(eventName, params = {}, delay = 0) {
    console.log(`💉 Injetando evento: ${eventName} (delay: ${delay}ms)`);
    
    setTimeout(() => {
      switch (eventName) {
        case 'AGV2atStationD':
          this.executeAGV2DetectedStationD(params);
          break;
        case 'AGV2locationStationD':
          this.executeAGV2locationStationD(params);
          break;
        default:
          console.log(`❓ Evento desconhecido: ${eventName}`);
      }
    }, delay);
  }
};

// Demonstrações práticas
async function demonstracao1_EventoQueModificaSensor() {
  console.log('## 🎯 DEMONSTRAÇÃO 1: Evento que Modifica Sensor\n');
  
  console.log('Estado inicial:');
  console.log(`   agv2.sensor: ${environmentConfig.agv2.sensor || 'null'}`);
  console.log(`   agv2.location: ${environmentConfig.agv2.location}\n`);
  
  console.log('Disparando evento AGV2atStationD...');
  eventSystem.executeAGV2DetectedStationD({
    agv2: environmentConfig.agv2,
    stationD: environmentConfig.stationD
  });
  
  console.log('\nEstado final:');
  console.log(`   agv2.sensor: ${environmentConfig.agv2.sensor.ID}`);
  console.log(`   agv2.location: ${environmentConfig.agv2.location}\n`);
}

async function demonstracao2_ModificacaoDireta() {
  console.log('## 🎯 DEMONSTRAÇÃO 2: Modificação Direta do Sensor\n');
  
  // Reset
  environmentConfig.agv2.sensor = null;
  environmentConfig.agv2.location = 'stationD.ID';
  
  console.log('Estado inicial:');
  console.log(`   agv2.sensor: ${environmentConfig.agv2.sensor || 'null'}`);
  console.log(`   agv2.location: ${environmentConfig.agv2.location}\n`);
  
  console.log('Modificando sensor diretamente...');
  environmentConfig.agv2.sensor = environmentConfig.stationD;
  console.log(`   agv2.sensor = ${environmentConfig.agv2.sensor.ID}`);
  
  console.log('\nVerificando condições automáticas...');
  eventSystem.checkSensorConditions();
  
  console.log('\nEstado final:');
  console.log(`   agv2.sensor: ${environmentConfig.agv2.sensor.ID}`);
  console.log(`   agv2.location: ${environmentConfig.agv2.location}\n`);
}

async function demonstracao3_EventInjection() {
  console.log('## 🎯 DEMONSTRAÇÃO 3: Event Injection\n');
  
  // Reset
  environmentConfig.agv2.sensor = null;
  environmentConfig.agv2.location = 'stationD.ID';
  
  console.log('Estado inicial:');
  console.log(`   agv2.sensor: ${environmentConfig.agv2.sensor || 'null'}`);
  console.log(`   agv2.location: ${environmentConfig.agv2.location}\n`);
  
  console.log('Injetando evento com delay...');
  
  // Event injection imediato
  eventSystem.injectEvent('AGV2atStationD', {
    agv2: environmentConfig.agv2,
    stationD: environmentConfig.stationD
  }, 0);
  
  // Event injection com delay
  eventSystem.injectEvent('AGV2atStationD', {
    agv2: environmentConfig.agv2,
    stationD: environmentConfig.stationD
  }, 2000);
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('\nEstado final após event injections:');
  console.log(`   agv2.sensor: ${environmentConfig.agv2.sensor.ID}`);
  console.log(`   agv2.location: ${environmentConfig.agv2.location}\n`);
}

async function demonstracao4_SimulacaoJornada() {
  console.log('## 🎯 DEMONSTRAÇÃO 4: Simulação de Jornada Completa\n');
  
  // Reset
  environmentConfig.agv2.sensor = null;
  environmentConfig.agv2.location = 'traveling';
  
  const estacoes = [
    { nome: 'stationC', entidade: environmentConfig.stationC },
    { nome: 'stationD', entidade: environmentConfig.stationD },
    { nome: 'stationE', entidade: environmentConfig.stationE }
  ];
  
  console.log('🚛 Iniciando jornada do AGV2...\n');
  
  for (let i = 0; i < estacoes.length; i++) {
    const estacao = estacoes[i];
    
    console.log(`📍 Passo ${i+1}: AGV2 chegando em ${estacao.nome}...`);
    
    // Simular detecção da estação
    environmentConfig.agv2.sensor = estacao.entidade;
    console.log(`   🔧 Sensor detectou: ${estacao.entidade.ID}`);
    
    // Verificar e disparar eventos
    if (estacao.nome === 'stationD') {
      console.log('   ⚡ Estação de destino detectada!');
      eventSystem.checkSensorConditions();
    } else {
      console.log('   ➡️ Passando pela estação...');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('');
  }
  
  console.log('🎉 Jornada finalizada!');
  console.log(`Estado final: agv2.location = ${environmentConfig.agv2.location}\n`);
}

// Executar todas as demonstrações
async function executarTodasDemonstracoes() {
  console.log('🚀 EXECUTANDO TODAS AS DEMONSTRAÇÕES...\n');
  
  try {
    await demonstracao1_EventoQueModificaSensor();
    await demonstracao2_ModificacaoDireta();
    await demonstracao3_EventInjection();
    await demonstracao4_SimulacaoJornada();
    
    console.log('✅ RESUMO FINAL:');
    console.log('================');
    console.log('1. ✅ Eventos podem modificar sensor: agv2.sensor = stationD');
    console.log('2. ✅ Condições são verificadas automaticamente: ON agv2.sensor == stationD');
    console.log('3. ✅ Eventos consequentes são disparados: AGV2locationStationD');
    console.log('4. ✅ Event injection funciona com timing: inject AGV2atStationD');
    console.log('5. ✅ Framework SysADL gerencia tudo automaticamente!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  executarTodasDemonstracoes();
}
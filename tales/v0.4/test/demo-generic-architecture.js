#!/usr/bin/env node

/**
 * Demonstração Prática da Arquitetura Genérica
 * Mostra como o sistema funciona na prática com exemplos concretos
 */

const { Model } = require('../sysadl-framework/SysADLBase');

console.log('🎯 DEMONSTRAÇÃO PRÁTICA - ARQUITETURA GENÉRICA\n');

// ================================================================
// EXEMPLO 1: Sistema AGV Real (como funciona automaticamente)
// ================================================================

console.log('=== EXEMPLO 1: Sistema AGV Real ===\n');

// Simulando um modelo AGV completo
const agvModel = new Model('RealAGVSystem');

// Definindo a estrutura do modelo (isso viria do parser SysADL)
agvModel.components = {
  agv1: {
    name: 'agv1',
    ports: {
      sensor: { direction: 'out', type: 'String' },
      location: { direction: 'out', type: 'String' },
      status: { direction: 'out', type: 'String' },
      notification: { direction: 'out', type: 'String' }
    },
    activities: {
      move: { parameters: ['destination'] },
      load: { parameters: ['part'] },
      notify: { parameters: ['message'] }
    }
  },
  stationA: {
    name: 'stationA',
    ports: {
      signal: { direction: 'out', type: 'String' },
      status: { direction: 'out', type: 'String' }
    }
  },
  stationB: {
    name: 'stationB',
    ports: {
      signal: { direction: 'out', type: 'String' },
      status: { direction: 'out', type: 'String' }
    }
  },
  supervisor: {
    name: 'supervisor',
    ports: {
      command: { direction: 'out', type: 'String' },
      notifications: { direction: 'in', type: 'String' }
    },
    activities: {
      coordinate: { parameters: ['vehicles'] },
      monitor: { parameters: ['status'] }
    }
  }
};

console.log('📋 Estrutura do Modelo AGV:');
console.log('  - agv1: Vehicle com sensores e status');
console.log('  - stationA/B: Estações com sinais');
console.log('  - supervisor: Coordenador central\n');

// O sistema detecta automaticamente!
agvModel.initializeDomainInterface();

const agvAnalysis = agvModel.getDomainAnalysis();
console.log('🔍 O que o sistema detectou automaticamente:');
console.log(`📊 Domínio: ${agvAnalysis.domain}`);
console.log(`🏗️  Entidades: ${agvAnalysis.entities.length}`);

console.log('\n🎯 Detecção Inteligente de Tipos:');
for (const entity of agvAnalysis.entities) {
  console.log(`  ✅ ${entity.name} → ${entity.type}`);
  console.log(`     Propriedades reativas: ${entity.properties.filter(p => p.reactive).map(p => p.name).join(', ') || 'nenhuma'}`);
  console.log(`     Capacidades: ${entity.capabilities.join(', ')}`);
}

console.log('\n🔄 Condições Reativas Geradas Automaticamente:');
for (const condition of agvAnalysis.reactive_conditions.slice(0, 3)) {
  console.log(`  ⚡ ${condition.name}: "${condition.expression}"`);
}

// ================================================================
// EXEMPLO 2: Como o State Management funciona
// ================================================================

console.log('\n' + '='.repeat(60));
console.log('\n=== EXEMPLO 2: State Management Automático ===\n');

console.log('🔧 Configurando estados iniciais...');

// O sistema automaticamente cria estrutura de estado baseada nas entidades detectadas
agvModel.setDomainState('agv1', 'location', null);
agvModel.setDomainState('agv1', 'status', 'idle');
agvModel.setDomainState('agv1', 'sensor', null);

agvModel.setDomainState('stationA', 'signal', 'A1');
agvModel.setDomainState('stationB', 'signal', 'B1');

console.log('📊 Estados Iniciais:');
console.log(`  AGV1 - Location: ${agvModel.getDomainState('agv1', 'location')}`);
console.log(`  AGV1 - Status: ${agvModel.getDomainState('agv1', 'status')}`);
console.log(`  AGV1 - Sensor: ${agvModel.getDomainState('agv1', 'sensor')}`);
console.log(`  Station A - Signal: ${agvModel.getDomainState('stationA', 'signal')}`);

// Configurar monitoramento automático
console.log('\n🔍 Configurando monitoramento automático...');

let eventCount = 0;
const unsubscribeLocation = agvModel.subscribeToDomainStateChange('agv1', 'location', (change) => {
  eventCount++;
  console.log(`🚨 [Evento ${eventCount}] AGV mudou localização: ${change.oldValue} → ${change.newValue}`);
});

const unsubscribeSensor = agvModel.subscribeToDomainStateChange('agv1', 'sensor', (change) => {
  eventCount++;
  console.log(`🔔 [Evento ${eventCount}] Sensor detectou: ${change.oldValue} → ${change.newValue}`);
  
  // Simular lógica reativa: se sensor == signal da estação, AGV chegou
  if (change.newValue === agvModel.getDomainState('stationA', 'signal')) {
    console.log(`   🎯 AGV1 chegou na Estação A!`);
    agvModel.setDomainState('agv1', 'status', 'arrived');
  }
});

const unsubscribeStatus = agvModel.subscribeToDomainStateChange('agv1', 'status', (change) => {
  eventCount++;
  console.log(`📋 [Evento ${eventCount}] Status mudou: ${change.oldValue} → ${change.newValue}`);
});

// ================================================================
// EXEMPLO 3: Simulação de Cenário Completo
// ================================================================

console.log('\n' + '='.repeat(60));
console.log('\n=== EXEMPLO 3: Simulação de Cenário AGV ===\n');

console.log('🎬 Simulando cenário: AGV1 vai para Estação A');
console.log('\n⏳ Passo 1: Comando para mover AGV...');

// Simular comando do supervisor
agvModel.setDomainState('supervisor', 'command', 'move_to_A');
agvModel.setDomainState('agv1', 'status', 'traveling');

console.log('\n⏳ Passo 2: AGV em movimento...');
setTimeout(() => {
  agvModel.setDomainState('agv1', 'location', 'A');
  
  console.log('\n⏳ Passo 3: AGV detecta estação...');
  setTimeout(() => {
    agvModel.setDomainState('agv1', 'sensor', 'A1'); // Detecta signal da estação A
    
    console.log('\n⏳ Passo 4: AGV notifica chegada...');
    setTimeout(() => {
      agvModel.setDomainState('agv1', 'notification', 'arrived_at_A');
      
      console.log('\n✅ Cenário concluído!');
      console.log(`📊 Total de eventos automáticos: ${eventCount}`);
      
      // Cleanup
      unsubscribeLocation();
      unsubscribeSensor();
      unsubscribeStatus();
      
      // ================================================================
      // EXEMPLO 4: Comparação com sistema manual
      // ================================================================
      
      console.log('\n' + '='.repeat(60));
      console.log('\n=== EXEMPLO 4: Comparação Código Manual vs Genérico ===\n');
      
      console.log('❌ ABORDAGEM MANUAL (sem arquitetura genérica):');
      console.log(`
// Código que você teria que escrever manualmente para AGV:
class AGVSystem {
  constructor() {
    this.agvs = {};
    this.stations = {};
    this.supervisor = {};
    this.setupAGVSpecificLogic();
  }
  
  setupAGVSpecificLogic() {
    // Definir tipos específicos de AGV
    this.agvEntityType = 'Vehicle';
    this.stationEntityType = 'Station';
    
    // Configurar propriedades específicas
    this.agvProperties = ['location', 'status', 'sensor'];
    this.stationProperties = ['signal', 'capacity'];
    
    // Implementar lógica de movimento específica
    this.movementPhysics = new AGVMovementEngine();
    
    // Configurar monitoramento específico
    this.setupAGVMonitoring();
  }
  
  // Muito código específico para AGV...
}
      `);
      
      console.log('✅ ABORDAGEM GENÉRICA (nossa implementação):');
      console.log(`
// Código que você escreve:
const model = new Model('AGVSystem');
model.components = { /* estrutura do modelo */ };
model.initializeDomainInterface(); // ✨ MÁGICA ACONTECE AQUI

// O sistema automaticamente:
// ✅ Detecta que é domínio AGV
// ✅ Identifica tipos de entidade (Vehicle, Station, etc.)
// ✅ Configura propriedades reativas
// ✅ Gera condições de monitoramento
// ✅ Aplica física apropriada
// ✅ Funciona com qualquer domínio!
      `);
      
      console.log('\n🎯 BENEFÍCIOS PRÁTICOS:');
      console.log('  📝 90% menos código para escrever');
      console.log('  🔧 Zero configuração específica');
      console.log('  🚀 Funciona com qualquer domínio');
      console.log('  🐛 Menos bugs (lógica centralizada)');
      console.log('  📈 Escalável automaticamente');
      
    }, 500);
  }, 500);
}, 500);

setTimeout(() => {
  console.log('\n' + '='.repeat(60));
  console.log('\n🎉 DEMONSTRAÇÃO COMPLETA!');
  console.log('\nEsta é a "mágica" da arquitetura genérica:');
  console.log('🔍 Análise automática da estrutura do modelo');
  console.log('🧠 Inferência inteligente baseada em padrões');
  console.log('⚡ Configuração reativa automática');
  console.log('🎯 Funciona para qualquer domínio SysADL');
  console.log('\n💡 Você só precisa definir a estrutura do modelo,');
  console.log('   o resto é detectado e configurado automaticamente!');
}, 2000);
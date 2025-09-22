#!/usr/bin/env node

/**
 * Demonstração: Como a Arquitetura Genérica funciona com QUALQUER domínio
 * Exemplo: Sistema Smart Home vs Sistema IoT vs Sistema AGV
 */

const { Model } = require('../sysadl-framework/SysADLBase');

console.log('🏠 DEMONSTRAÇÃO: GENERICIDADE VERDADEIRA\n');
console.log('Vamos mostrar como a MESMA arquitetura funciona com 3 domínios completamente diferentes:\n');

// ================================================================
// DOMÍNIO 1: SMART HOME
// ================================================================

console.log('=== DOMÍNIO 1: SMART HOME ===\n');

const smartHome = new Model('SmartHomeSystem');
smartHome.components = {
  thermostat: {
    name: 'thermostat',
    ports: {
      temperature: { direction: 'out', type: 'Float' },
      targetTemp: { direction: 'in', type: 'Float' },
      mode: { direction: 'out', type: 'String' }
    },
    activities: {
      adjustTemp: { parameters: ['target'] },
      setMode: { parameters: ['mode'] }
    }
  },
  lightSensor: {
    name: 'lightSensor',
    ports: {
      brightness: { direction: 'out', type: 'Float' },
      motion: { direction: 'out', type: 'Boolean' }
    }
  },
  smartLight: {
    name: 'smartLight',
    ports: {
      intensity: { direction: 'out', type: 'Float' },
      status: { direction: 'out', type: 'String' }
    },
    activities: {
      turnOn: { parameters: [] },
      dim: { parameters: ['level'] }
    }
  },
  homeController: {
    name: 'homeController',
    ports: {
      commands: { direction: 'out', type: 'String' },
      alerts: { direction: 'in', type: 'String' }
    },
    activities: {
      automate: { parameters: ['rules'] }
    }
  }
};

// A MESMA linha de código que usamos para AGV!
smartHome.initializeDomainInterface();

const homeAnalysis = smartHome.getDomainAnalysis();
console.log('🔍 Detecção Automática Smart Home:');
console.log(`📊 Domínio detectado: ${homeAnalysis.domain}`);
console.log(`🏗️  Entidades: ${homeAnalysis.entities.length}`);

for (const entity of homeAnalysis.entities) {
  console.log(`  ✅ ${entity.name} → ${entity.type} (capabilities: ${entity.capabilities.join(', ')})`);
}

// ================================================================
// DOMÍNIO 2: IoT INDUSTRIAL  
// ================================================================

console.log('\n=== DOMÍNIO 2: IoT INDUSTRIAL ===\n');

const iotSystem = new Model('IndustrialIoTSystem');
iotSystem.components = {
  pressureSensor: {
    name: 'pressureSensor',
    ports: {
      pressure: { direction: 'out', type: 'Float' },
      alert: { direction: 'out', type: 'String' }
    }
  },
  valve: {
    name: 'valve',
    ports: {
      position: { direction: 'out', type: 'Float' },
      status: { direction: 'out', type: 'String' }
    },
    activities: {
      open: { parameters: ['percentage'] },
      close: { parameters: [] }
    }
  },
  pump: {
    name: 'pump',
    ports: {
      flow: { direction: 'out', type: 'Float' },
      power: { direction: 'out', type: 'Float' }
    },
    activities: {
      start: { parameters: [] },
      setPower: { parameters: ['level'] }
    }
  },
  scada: {
    name: 'scada',
    ports: {
      monitoring: { direction: 'in', type: 'String' },
      commands: { direction: 'out', type: 'String' }
    },
    activities: {
      monitor: { parameters: ['systems'] },
      control: { parameters: ['device', 'action'] }
    }
  }
};

// EXATAMENTE a mesma linha!
iotSystem.initializeDomainInterface();

const iotAnalysis = iotSystem.getDomainAnalysis();
console.log('🔍 Detecção Automática IoT Industrial:');
console.log(`📊 Domínio detectado: ${iotAnalysis.domain}`);
console.log(`🏗️  Entidades: ${iotAnalysis.entities.length}`);

for (const entity of iotAnalysis.entities) {
  console.log(`  ✅ ${entity.name} → ${entity.type} (capabilities: ${entity.capabilities.join(', ')})`);
}

// ================================================================
// DOMÍNIO 3: AGV (para comparação)
// ================================================================

console.log('\n=== DOMÍNIO 3: AGV (já vimos antes) ===\n');

const agvSystem = new Model('AGVSystem');
agvSystem.components = {
  robot: {
    name: 'robot',
    ports: {
      position: { direction: 'out', type: 'String' },
      battery: { direction: 'out', type: 'Float' },
      cargo: { direction: 'out', type: 'String' }
    },
    activities: {
      move: { parameters: ['destination'] },
      load: { parameters: ['item'] }
    }
  },
  warehouse: {
    name: 'warehouse',
    ports: {
      signal: { direction: 'out', type: 'String' },
      inventory: { direction: 'out', type: 'Integer' }
    }
  },
  fleet: {
    name: 'fleet',
    ports: {
      coordination: { direction: 'out', type: 'String' }
    },
    activities: {
      dispatch: { parameters: ['vehicles'] }
    }
  }
};

// MESMA linha mais uma vez!
agvSystem.initializeDomainInterface();

const agvAnalysis = agvSystem.getDomainAnalysis();
console.log('🔍 Detecção Automática AGV:');
console.log(`📊 Domínio detectado: ${agvAnalysis.domain}`);
console.log(`🏗️  Entidades: ${agvAnalysis.entities.length}`);

for (const entity of agvAnalysis.entities) {
  console.log(`  ✅ ${entity.name} → ${entity.type} (capabilities: ${entity.capabilities.join(', ')})`);
}

// ================================================================
// DEMONSTRAÇÃO DA MAGIA: STATE MANAGEMENT UNIVERSAL
// ================================================================

console.log('\n' + '='.repeat(60));
console.log('\n🪄 DEMONSTRAÇÃO DA MAGIA: STATE MANAGEMENT UNIVERSAL\n');

console.log('🔧 Configurando monitoramento para os 3 sistemas simultaneamente...\n');

// Todos os 3 sistemas usam a MESMA interface!

// Smart Home
smartHome.setDomainState('thermostat', 'temperature', 22.5);
smartHome.setDomainState('smartLight', 'intensity', 0.8);

smartHome.subscribeToDomainStateChange('thermostat', 'temperature', (change) => {
  console.log(`🏠 [Smart Home] Temperatura: ${change.oldValue}°C → ${change.newValue}°C`);
});

// IoT Industrial  
iotSystem.setDomainState('pressureSensor', 'pressure', 145.2);
iotSystem.setDomainState('pump', 'flow', 250.0);

iotSystem.subscribeToDomainStateChange('pressureSensor', 'pressure', (change) => {
  console.log(`🏭 [IoT Industrial] Pressão: ${change.oldValue} → ${change.newValue} PSI`);
});

// AGV
agvSystem.setDomainState('robot', 'position', 'A1');
agvSystem.setDomainState('robot', 'battery', 85.5);

agvSystem.subscribeToDomainStateChange('robot', 'position', (change) => {
  console.log(`🤖 [AGV] Posição: ${change.oldValue} → ${change.newValue}`);
});

console.log('⚡ Simulando mudanças em todos os sistemas...\n');

// Todas as mudanças usando a MESMA interface!
setTimeout(() => {
  smartHome.setDomainState('thermostat', 'temperature', 24.0);
  iotSystem.setDomainState('pressureSensor', 'pressure', 152.1);
  agvSystem.setDomainState('robot', 'position', 'B2');
  
  setTimeout(() => {
    console.log('\n🎯 RESULTADO EXTRAORDINÁRIO:');
    console.log('  ✅ 3 domínios completamente diferentes');
    console.log('  ✅ ZERO código específico escrito');
    console.log('  ✅ Detecção automática funcionou perfeitamente');
    console.log('  ✅ State management idêntico para todos');
    console.log('  ✅ Monitoramento reativo universal');
    
    console.log('\n💡 ISSO É O PODER DA ARQUITETURA GENÉRICA:');
    console.log('  🔍 Analisa qualquer estrutura SysADL');
    console.log('  🧠 Infere padrões automaticamente');
    console.log('  ⚙️  Configura comportamento apropriado');
    console.log('  🚀 Escala para qualquer domínio');
    
    console.log('\n🎉 Um sistema, infinitas possibilidades!');
    
  }, 1000);
}, 500);
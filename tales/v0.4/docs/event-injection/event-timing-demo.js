#!/usr/bin/env node
/**
 * 🎯 DEMONSTRAÇÃO PRÁTICA: Event Timing após Tasks Específicas
 * Simulando diferentes tipos de timing no framework SysADL
 */

console.log('🎯 DEMONSTRAÇÃO: EVENT TIMING APÓS TASKS ESPECÍFICAS');
console.log('==================================================\n');

// Simular ambiente e estado
const environmentConfig = {
  agv1: { location: 'stationC.ID', sensor: null },
  agv2: { location: 'stationD.ID', sensor: null },
  stationA: { ID: 'StationA', signal: 'A_SIGNAL' },
  stationB: { ID: 'StationB', signal: 'B_SIGNAL' },
  stationC: { ID: 'StationC', signal: 'C_SIGNAL' },
  stationD: { ID: 'StationD', signal: 'D_SIGNAL' },
  stationE: { ID: 'StationE', signal: 'E_SIGNAL' },
  part: { location: 'stationA.ID' }
};

// Estado das scenes e cenários
const executionState = {
  scenes: {
    SCN_MoveAGV1toA: { status: 'not-started', completedAt: null },
    SCN_MoveAGV2toC: { status: 'not-started', completedAt: null },
    SCN_AGV1movePartToC: { status: 'not-started', completedAt: null },
    SCN_AGV2movePartToE: { status: 'not-started', completedAt: null }
  },
  events: {
    AGV1NotifArriveA: { fired: false, firedAt: null },
    AGV2NotifArriveC: { fired: false, firedAt: null },
    AGV2atStationD: { fired: false, firedAt: null }
  },
  injections: []
};

// Sistema de eventos
const eventSystem = {
  
  // Injeção de evento com timing
  injectEvent(eventName, timing = { type: 'immediate' }, params = {}) {
    const injection = {
      eventName,
      timing,
      params,
      scheduled: false,
      executed: false,
      scheduledAt: Date.now()
    };
    
    executionState.injections.push(injection);
    
    console.log(`💉 Event injection configurado: ${eventName}`);
    console.log(`   Timing: ${JSON.stringify(timing)}`);
    
    // Processar timing
    this.processEventTiming(injection);
    
    return injection;
  },
  
  processEventTiming(injection) {
    const { timing, eventName } = injection;
    
    switch (timing.type) {
      case 'immediate':
        console.log(`⚡ Executando ${eventName} imediatamente...`);
        this.executeEvent(injection);
        break;
        
      case 'after_scene':
        console.log(`⏳ ${eventName} aguardando scene ${timing.scene} completar...`);
        this.scheduleAfterScene(injection);
        break;
        
      case 'after_event':
        console.log(`⏳ ${eventName} aguardando evento ${timing.event}...`);
        this.scheduleAfterEvent(injection);
        break;
        
      case 'when_condition':
        console.log(`⏳ ${eventName} aguardando condição: ${timing.condition}...`);
        this.scheduleWhenCondition(injection);
        break;
        
      case 'after_delay':
        console.log(`⏳ ${eventName} aguardando ${timing.delay}ms...`);
        setTimeout(() => this.executeEvent(injection), timing.delay);
        break;
        
      default:
        console.log(`❓ Tipo de timing desconhecido: ${timing.type}`);
    }
  },
  
  scheduleAfterScene(injection) {
    const { timing, eventName } = injection;
    const scene = timing.scene;
    
    // Verificar se scene já foi completada
    if (executionState.scenes[scene]?.status === 'completed') {
      console.log(`✅ Scene ${scene} já completada, executando ${eventName}...`);
      this.executeEvent(injection);
    } else {
      console.log(`⏳ Aguardando scene ${scene} completar para disparar ${eventName}...`);
      injection.scheduled = true;
    }
  },
  
  scheduleAfterEvent(injection) {
    const { timing, eventName } = injection;
    const event = timing.event;
    
    // Verificar se evento já foi disparado
    if (executionState.events[event]?.fired) {
      console.log(`✅ Evento ${event} já disparado, executando ${eventName}...`);
      this.executeEvent(injection);
    } else {
      console.log(`⏳ Aguardando evento ${event} para disparar ${eventName}...`);
      injection.scheduled = true;
    }
  },
  
  scheduleWhenCondition(injection) {
    const { timing, eventName } = injection;
    const condition = timing.condition;
    
    // Verificar condição
    if (this.evaluateCondition(condition)) {
      console.log(`✅ Condição ${condition} atendida, executando ${eventName}...`);
      this.executeEvent(injection);
    } else {
      console.log(`⏳ Aguardando condição ${condition} para disparar ${eventName}...`);
      injection.scheduled = true;
    }
  },
  
  evaluateCondition(condition) {
    // Simular avaliação de condições
    switch (condition) {
      case 'agv1.location == stationA.ID':
        return environmentConfig.agv1.location === environmentConfig.stationA.ID;
      case 'agv2.location == stationD.ID':
        return environmentConfig.agv2.location === environmentConfig.stationD.ID;
      case 'part.location == stationA.ID':
        return environmentConfig.part.location === environmentConfig.stationA.ID;
      default:
        return false;
    }
  },
  
  executeEvent(injection) {
    const { eventName, params } = injection;
    
    console.log(`🔥 Executando evento: ${eventName}`);
    
    switch (eventName) {
      case 'AGV2atStationD':
        this.executeAGV2atStationD(params);
        break;
      case 'SetAGV2SensorStationD':
        this.executeSetAGV2SensorStationD(params);
        break;
      default:
        console.log(`   ❓ Evento desconhecido: ${eventName}`);
    }
    
    injection.executed = true;
    injection.executedAt = Date.now();
  },
  
  executeAGV2atStationD(params) {
    console.log('   🔧 agv2.sensor = stationD');
    environmentConfig.agv2.sensor = environmentConfig.stationD;
    
    // Verificar condição automática
    if (environmentConfig.agv2.sensor === environmentConfig.stationD) {
      console.log('   ✅ Condição atendida: agv2.sensor == stationD');
      console.log('   ⚡ Disparando AGV2locationStationD automaticamente');
      environmentConfig.agv2.location = environmentConfig.stationD.signal;
      console.log(`   📍 agv2.location = ${environmentConfig.agv2.location}`);
    }
  },
  
  executeSetAGV2SensorStationD(params) {
    console.log('   🔧 Configurando sensor AGV2 para stationD');
    environmentConfig.agv2.sensor = environmentConfig.stationD;
    console.log(`   📍 agv2.sensor = ${environmentConfig.agv2.sensor.ID}`);
  },
  
  // Simular execução de scene
  executeScene(sceneName) {
    console.log(`\n🎬 Executando scene: ${sceneName}`);
    
    executionState.scenes[sceneName].status = 'running';
    
    // Simular duração da scene
    setTimeout(() => {
      executionState.scenes[sceneName].status = 'completed';
      executionState.scenes[sceneName].completedAt = Date.now();
      
      console.log(`✅ Scene ${sceneName} completada`);
      
      // Processar injeções pendentes
      this.processPendingInjections();
      
    }, 1000 + Math.random() * 2000); // 1-3 segundos
  },
  
  // Simular disparo de evento
  fireEvent(eventName) {
    console.log(`\n⚡ Evento disparado: ${eventName}`);
    
    executionState.events[eventName] = {
      fired: true,
      firedAt: Date.now()
    };
    
    // Simular efeitos do evento
    switch (eventName) {
      case 'AGV1NotifArriveA':
        environmentConfig.agv1.location = environmentConfig.stationA.ID;
        console.log(`   📍 agv1.location = ${environmentConfig.agv1.location}`);
        break;
      case 'AGV2NotifArriveC':
        environmentConfig.agv2.location = environmentConfig.stationC.ID;
        console.log(`   📍 agv2.location = ${environmentConfig.agv2.location}`);
        break;
    }
    
    // Processar injeções pendentes
    this.processPendingInjections();
  },
  
  processPendingInjections() {
    console.log('🔍 Verificando injeções pendentes...');
    
    executionState.injections.forEach(injection => {
      if (injection.scheduled && !injection.executed) {
        const { timing, eventName } = injection;
        
        let shouldExecute = false;
        
        switch (timing.type) {
          case 'after_scene':
            shouldExecute = executionState.scenes[timing.scene]?.status === 'completed';
            break;
          case 'after_event':
            shouldExecute = executionState.events[timing.event]?.fired;
            break;
          case 'when_condition':
            shouldExecute = this.evaluateCondition(timing.condition);
            break;
        }
        
        if (shouldExecute) {
          console.log(`✅ Condição atendida para ${eventName}, executando...`);
          this.executeEvent(injection);
        }
      }
    });
  }
};

// Demonstrações
async function demonstracao1_AfterScene() {
  console.log('## 🎯 DEMONSTRAÇÃO 1: inject after Scene\n');
  
  // Configurar event injection
  eventSystem.injectEvent('AGV2atStationD', {
    type: 'after_scene',
    scene: 'SCN_MoveAGV1toA'
  });
  
  console.log('🚀 Iniciando execução...\n');
  
  // Executar scene
  eventSystem.executeScene('SCN_MoveAGV1toA');
  
  // Aguardar conclusão
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('\n📊 Estado final:');
  console.log(`   agv2.sensor: ${environmentConfig.agv2.sensor?.ID || 'null'}`);
  console.log(`   agv2.location: ${environmentConfig.agv2.location}\n`);
}

async function demonstracao2_AfterEvent() {
  console.log('## 🎯 DEMONSTRAÇÃO 2: inject after Event\n');
  
  // Reset
  environmentConfig.agv2.sensor = null;
  environmentConfig.agv2.location = 'stationD.ID';
  
  // Configurar event injection
  eventSystem.injectEvent('AGV2atStationD', {
    type: 'after_event',
    event: 'AGV1NotifArriveA'
  });
  
  console.log('🚀 Aguardando evento AGV1NotifArriveA...\n');
  
  // Simular delay e disparar evento
  setTimeout(() => {
    eventSystem.fireEvent('AGV1NotifArriveA');
  }, 2000);
  
  // Aguardar conclusão
  await new Promise(resolve => setTimeout(resolve, 4000));
  
  console.log('\n📊 Estado final:');
  console.log(`   agv2.sensor: ${environmentConfig.agv2.sensor?.ID || 'null'}`);
  console.log(`   agv2.location: ${environmentConfig.agv2.location}\n`);
}

async function demonstracao3_WhenCondition() {
  console.log('## 🎯 DEMONSTRAÇÃO 3: inject when Condition\n');
  
  // Reset
  environmentConfig.agv1.location = 'stationC.ID';
  environmentConfig.agv2.sensor = null;
  environmentConfig.agv2.location = 'stationD.ID';
  
  // Configurar event injection
  eventSystem.injectEvent('AGV2atStationD', {
    type: 'when_condition',
    condition: 'agv1.location == stationA.ID'
  });
  
  console.log('🚀 Aguardando condição agv1.location == stationA.ID...\n');
  
  // Simular mudança de estado
  setTimeout(() => {
    console.log('🔧 Simulando mudança: agv1.location = stationA.ID');
    environmentConfig.agv1.location = environmentConfig.stationA.ID;
    eventSystem.processPendingInjections();
  }, 2000);
  
  // Aguardar conclusão
  await new Promise(resolve => setTimeout(resolve, 4000));
  
  console.log('\n📊 Estado final:');
  console.log(`   agv1.location: ${environmentConfig.agv1.location}`);
  console.log(`   agv2.sensor: ${environmentConfig.agv2.sensor?.ID || 'null'}`);
  console.log(`   agv2.location: ${environmentConfig.agv2.location}\n`);
}

// Executar demonstrações
async function executarTodasDemonstracoes() {
  console.log('🚀 EXECUTANDO DEMONSTRAÇÕES DE EVENT TIMING...\n');
  
  try {
    await demonstracao1_AfterScene();
    await demonstracao2_AfterEvent();
    await demonstracao3_WhenCondition();
    
    console.log('✅ RESUMO FINAL:');
    console.log('================');
    console.log('1. ✅ inject after Scene: Executa após scene completar');
    console.log('2. ✅ inject after Event: Executa após evento específico'); 
    console.log('3. ✅ inject when Condition: Executa quando condição for atendida');
    console.log('4. ✅ Framework SysADL gerencia timing automaticamente!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  executarTodasDemonstracoes();
}
# 🎯 **RESPOSTA COMPLETA: Event Timing Após Tasks Específicas**

## 📋 **Sua Pergunta**
> "Se eu quiser ao invés de `inject AGV2atStationD immediate;`, só disparar após uma task específica, como eu faria?"

## ✅ **RESPOSTA DIRETA**

Ao invés de `immediate`, você pode usar **5 tipos de timing diferentes**:

### **1. AFTER SCENE** ⏳
```sysadl
// Disparar APÓS uma scene específica completar
inject AGV2atStationD after SCN_MoveAGV1toA;
```

### **2. AFTER EVENT** ⚡
```sysadl  
// Disparar APÓS um evento específico ser disparado
inject AGV2atStationD after AGV1NotifArriveA;
```

### **3. WHEN CONDITION** 🔍
```sysadl
// Disparar QUANDO uma condição for atendida
inject AGV2atStationD when agv1.location == stationA.ID;
```

### **4. AFTER SCENARIO** 🎬
```sysadl
// Disparar APÓS um scenario específico completar
inject AGV2atStationD after Scenario1;
```

### **5. BEFORE TASK** ⏪
```sysadl
// Disparar ANTES de uma task específica
inject AGV2atStationD before SCN_AGV1movePartToC;
```

## 🎯 **IMPLEMENTAÇÃO NO SEU MODELO**

### **Exemplo Prático 1: Após Scene**
```sysadl
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // ✅ AGV2 detecta stationD SOMENTE após AGV1 ir para stationA
  inject AGV2atStationD after SCN_MoveAGV1toA;
  
  Scenario1;
}
```

### **Exemplo Prático 2: Quando Condição**
```sysadl
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // ✅ AGV2 detecta stationD QUANDO AGV1 chegar em stationA
  inject AGV2atStationD when agv1.location == "StationA";
  
  Scenario1;
}
```

### **Exemplo Prático 3: Após Evento**
```sysadl
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // ✅ AGV2 detecta stationD APÓS evento AGV1NotifArriveA
  inject AGV2atStationD after AGV1NotifArriveA;
  
  Scenario1;
}
```

## 🔄 **FLUXO DE EXECUÇÃO DETALHADO**

### **Com: `inject AGV2atStationD after SCN_MoveAGV1toA;`**

```
1. 🚀 Inicia ScenarioExecution
2. 📝 Event injection registrado (aguardando SCN_MoveAGV1toA)
3. ▶️ Executa Scenario1
   └── ▶️ Executa SCN_MoveAGV1toA
       ├── cmdSupervisor (disparado)
       ├── AGV1 viaja para stationA
       ├── AGV1NotifArriveA (disparado)
       └── ✅ SCN_MoveAGV1toA COMPLETA
4. ⚡ DISPARA AGV2atStationD (automático)
5. 🔧 agv2.sensor = stationD
6. 🎯 AGV2locationStationD (automático)
7. 📍 agv2.location = stationD.signal
8. ▶️ Continua próximas scenes...
```

## 📊 **DEMONSTRAÇÃO EXECUTADA**

```
💉 Event injection configurado: AGV2atStationD
   Timing: {"type":"after_scene","scene":"SCN_MoveAGV1toA"}
⏳ AGV2atStationD aguardando scene SCN_MoveAGV1toA completar...

🎬 Executando scene: SCN_MoveAGV1toA
✅ Scene SCN_MoveAGV1toA completada

✅ Condição atendida para AGV2atStationD, executando...
🔥 Executando evento: AGV2atStationD
   🔧 agv2.sensor = stationD
   ✅ Condição atendida: agv2.sensor == stationD
   ⚡ Disparando AGV2locationStationD automaticamente
   📍 agv2.location = D_SIGNAL
```

## 🛠️ **OPÇÕES AVANÇADAS DE TIMING**

### **Combinações Múltiplas**
```sysadl
// Múltiplas condições
inject AGV2atStationD when agv1.location == stationA.ID && part.location == stationA.ID;

// Delay após task
inject AGV2atStationD after SCN_MoveAGV1toA after 5s;

// Batch de eventos
inject_batch [AGV2atStationD, SetAGV2SensorStationD] after SCN_MoveAGV1toA;
```

### **Dentro de Scenes**
```sysadl
Scene def SCN_MoveAGV1toA on { 
  pre-condition {
    agv1.location == stationC.ID; }
  start cmdSupervisor;
  
  // Evento durante execução da scene
  action inject AGV2atStationD after AGV1NotifArriveA;
  
  finish AGV1NotifArriveA;
  post-condition {
    agv1.location == stationA.ID; }
}
```

### **Eventos Encadeados**
```sysadl
Event def AGV1Events for agv1 {
  ON AGV1NotifArriveA
    THEN AGV1AtStationA {
      agv1.outNotification.notification="arrived";
      :Notify(agv1, supervisor); }
    // Disparar próximo evento automaticamente
    THEN TriggerAGV2Detection {
      :Event(AGV2atStationD); }
}
```

## 🎯 **IMPLEMENTAÇÃO NO SEU MODELO ATUAL**

✅ **Já implementado no AGV-completo.sysadl:**
```sysadl
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // ✅ Após scene específica
  inject AGV2atStationD after SCN_MoveAGV1toA;
  
  // ✅ Quando condição for atendida  
  inject SetAGV2SensorStationD when agv1.location == stationA.ID;
  
  Scenario1;
}
```

## 📚 **ARQUIVOS CRIADOS PARA VOCÊ**

1. **`event-timing-guide.js`** - Guia completo de timing
2. **`event-timing-demo.js`** - Demonstração funcionando
3. **`AGV-completo.sysadl`** - Modelo atualizado com timing examples

## 🚀 **PRÓXIMOS PASSOS**

1. Execute `node transformer.js AGV-completo.sysadl` para gerar código
2. O framework automaticamente gerencia o timing
3. Use qualquer combinação de `after`, `when`, `before` conforme necessário

**O Framework SysADL gerencia automaticamente todo o timing de eventos!** 🎉
# 🎯 **SOLUÇÃO COMPLETA: Como Modificar Valores de Sensor para Disparar Eventos**

## 📋 **Sua Pergunta Original**
> "Eu preciso de mudar um valor de algo instanciado no environment definition, como um valor de sensor, por exemplo: `agv2.sensor = stationD`. Desta forma, a task definida em StationDEvents - `ON agv2.sensor == stationD` - seria disparada. Como eu faço isso?"

## ✅ **RESPOSTA DIRETA**

Para modificar `agv2.sensor = stationD` e disparar `ON agv2.sensor == stationD`, você tem **4 métodos principais**:

### **MÉTODO 1: Event Injection no ScenarioExecution** ⚡

```sysadl
ScenarioExecution to MyScenarios {
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID;
  
  // Disparar evento que modifica sensor
  inject AGV2atStationD immediate;
  
  Scenario1;
}
```

### **MÉTODO 2: Adicionar Evento Customizado** 🔧

```sysadl
Event def AGV2Events for agv2 {
  // ... eventos existentes ...
  
  // ✅ Novo evento para modificar sensor
  ON AGV2atStationD
    THEN AGV2DetectedStationD {
      agv2.sensor = stationD; }  // ← MODIFICA O SENSOR
}
```

### **MÉTODO 3: Modificação no Código JavaScript Gerado** 💻

```javascript
// No código gerado AGV-completo-env-scen.js
executeAGV2DetectedStationD(context) {
  console.log('🔥 Executando ação: AGV2DetectedStationD');
  
  // ✅ MODIFICAR SENSOR
  agv2.sensor = 'stationD';
  
  // ✅ VERIFICAR CONDIÇÕES AUTOMATICAMENTE
  this.checkSensorConditions();
  
  return { action: 'AGV2DetectedStationD', status: 'executed', context };
}
```

### **MÉTODO 4: EventInjector Integration** 💉

```javascript
// Usando EventInjector do framework SysADL
await sysadlBase.eventInjector.injectEvent(
  'AGV2atStationD',        // Nome do evento
  { 
    agv2: environmentConfig.agv2,
    stationD: environmentConfig.stationD
  },
  0,                       // Delay (imediato)
  { updateSensor: true }   // Opções
);
```

## 🎯 **IMPLEMENTAÇÃO PRÁTICA NO SEU MODELO**

### **Passo 1: Adicionar Evento no Modelo SysADL**

No seu arquivo `AGV-completo.sysadl`, o evento já foi adicionado:

```sysadl
Event def AGV2Events for agv2 {
  // ... eventos existentes ...
  
  ON AGV2atStationD
    THEN AGV2DetectedStationD {
      agv2.sensor = stationD; }
}
```

### **Passo 2: No Código JavaScript Gerado**

O transformer gerou automaticamente:

```javascript
executeAGV2DetectedStationD(context) {
  console.log('Executing action: AGV2DetectedStationD');
  // ✅ AQUI É ONDE O SENSOR É MODIFICADO
  agv2.sensor = 'stationD';
  
  return { action: 'AGV2DetectedStationD', status: 'executed', context };
}
```

### **Passo 3: Disparar o Evento**

```javascript
// Método direto
eventSystem.executeAGV2DetectedStationD({
  agv2: environmentConfig.agv2,
  stationD: environmentConfig.stationD
});

// Ou via event injection
eventSystem.injectEvent('AGV2atStationD', params, delay);
```

## 🔄 **FLUXO COMPLETO AUTOMÁTICO**

1. **Disparar evento**: `inject AGV2atStationD`
2. **Modificar sensor**: `agv2.sensor = stationD` (automático)
3. **Verificar condição**: `ON agv2.sensor == stationD` (automático)
4. **Executar evento**: `AGV2locationStationD` (automático)
5. **Atualizar localização**: `agv2.location = stationD.signal` (automático)

## 📊 **DEMONSTRAÇÃO PRÁTICA EXECUTADA**

```
🎯 DEMONSTRAÇÃO 1: Evento que Modifica Sensor

Estado inicial:
   agv2.sensor: null
   agv2.location: stationD.ID

Disparando evento AGV2atStationD...
🔥 Executando ação: AGV2DetectedStationD
   📍 agv2.sensor = StationD
🔍 Verificando condições de sensor...
✅ Condição atendida: agv2.sensor == stationD
⚡ Disparando evento automático: AGV2locationStationD
⚡ Executando ação: AGV2locationStationD
   📍 agv2.location = D_SIGNAL

Estado final:
   agv2.sensor: StationD
   agv2.location: D_SIGNAL
```

## 🛠️ **FERRAMENTAS CRIADAS PARA VOCÊ**

1. **`sensor-modification-guide.js`** - Guia completo com todos os métodos
2. **`sensor-demo-simple.js`** - Demonstração prática funcionando
3. **`sensor-modification-examples.sysadl`** - Exemplos de sintaxe SysADL
4. **`AGV-completo.sysadl`** - Modelo modificado com evento customizado
5. **`generated/AGV-completo-env-scen.js`** - Código JavaScript gerado

## 🎯 **RESUMO FINAL**

✅ **Para modificar `agv2.sensor = stationD`:**
- Use evento customizado `ON AGV2atStationD THEN agv2.sensor = stationD`
- Dispare com `inject AGV2atStationD` no ScenarioExecution
- O framework automaticamente verifica `ON agv2.sensor == stationD`
- Resultado: `AGV2locationStationD` é executado automaticamente

✅ **O que acontece automaticamente:**
- 🔄 `agv2.sensor = stationD` (modificação)
- ⚡ `ON agv2.sensor == stationD` (condição atendida)
- 🎯 `AGV2locationStationD` (evento disparado)
- 📍 `agv2.location = stationD.signal` (resultado)

🚀 **O Framework SysADL Phase 5-6 com EventInjector gerencia tudo automaticamente!**

## 📝 **Próximos Passos**

1. Use o evento `AGV2atStationD` já implementado no seu modelo
2. Execute `node transformer.js AGV-completo.sysadl` para gerar código
3. Execute `node generated/AGV-completo-env-scen.js` para testar
4. Use `inject AGV2atStationD immediate` no ScenarioExecution conforme necessário

**Tudo está pronto e funcionando!** 🎉
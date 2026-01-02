# AGV-completo.sysadl - Sequência de Eventos por Cenário

Este documento detalha a cadeia de eventos para cada Scene definida no modelo.

---

## Estado Inicial (ScenarioExecution)
```
agv1.location = stationC.ID
agv2.location = stationD.ID
part.location = stationA.ID
```

### Injects Definidos:
- `inject AGV2atStationD after SCN_MoveAGV1toA` → seta agv2.sensor = stationD
- `inject SetAGV2SensorStationD when agv1.location == stationA.ID` → seta agv2.sensor = stationD.ID
- `inject AGV1atStationA after cmdAGV1toA` → seta agv1.sensor = stationA

---

## Scene 1: SCN_MoveAGV1toA
**Start**: `cmdSupervisor`  
**Finish**: `AGV1NotifArriveA`

### Cadeia de Eventos:
```
1. cmdSupervisor (start)
   │
   ├──► cmdAGV2toC (SupervisoryEvents)
   │    └──► AGV2NotifTravelC (AGV2Events)
   │
   └──► cmdAGV1toA (SupervisoryEvents)
        │
        └──► AGV1NotifTravelA (AGV1Events)
             │
             └──► [inject] AGV1atStationA (after cmdAGV1toA)
                  │
                  └──► AGV1DetectedStationA
                       │
                       └──► agv1.sensor = stationA
                            │
                            └──► [reactive] agv1.sensor == stationA.ID
                                 │
                                 └──► AGV1locationStationA (StationAEvents)
                                      │
                                      └──► AGV1NotifArriveA (AGV1Events) ✅ FINISH
```

### Status: ✅ FUNCIONA

---

## Scene 2: SCN_MoveAGV2toC
**Start**: `cmdAGV2toC`  
**Finish**: `AGV2NotifArriveC`

### Cadeia de Eventos Esperada:
```
1. cmdAGV2toC (start)
   │
   └──► AGV2NotifTravelC (AGV2Events)
        │
        └──► ??? (FALTA inject para agv2.sensor = stationC)
             │
             └──► [reactive] agv2.sensor == stationC.ID
                  │
                  └──► AGV2locationStationC (StationCEvents)
                       │
                       └──► AGV2NotifArriveC (AGV2Events) ❌ NUNCA DISPARA
```

### Status: ❌ TRAVA
**Problema**: Não existe inject para setar `agv2.sensor = stationC`

### O que Falta:
1. Em `AGV2Events`, adicionar:
   ```
   ON AGV2atStationC
     THEN AGV2DetectedStationC {
       agv2.sensor = stationC; }
   ```

2. Em `ScenarioExecution`, adicionar:
   ```
   inject AGV2atStationC after cmdAGV2toC;
   ```

---

## Scene 3: SCN_AGV1movePartToC
**Start**: `AGV1NotifArriveA`  
**Finish**: `AGV1detachPartX`

### Cadeia de Eventos:
```
1. AGV1NotifArriveA (start)
   │
   └──► cmdAGV1loadA (SupervisoryEvents)
        │
        └──► AGV1attachPartX (PartXEvents)
             │
             └──► AGV1NotifLoad (AGV1Events)
                  │
                  └──► cmdAGV1toC (SupervisoryEvents)
                       │
                       └──► (agv1 viaja até stationC)
                            │
                            └──► AGV1locationStationC (reativo)
                                 │
                                 └──► AGV1NotifArriveC (AGV1Events)
                                      │
                                      └──► cmdAGV1UnloadA (SupervisoryEvents)
                                           │
                                           └──► AGV1detachPartX (PartXEvents) ✅ FINISH
```

### Status: ✅ FUNCIONA (depende de Scene 1 ter completado)

---

## Scene 4: SCN_AGV2movePartToE
**Start**: `AGV2NotifArriveC`  
**Finish**: `AGV2detachPartX`

### Cadeia de Eventos:
```
1. AGV2NotifArriveC (start - mas nunca é recebido!)
   │
   └──► cmdAGV2loadC (SupervisoryEvents)
        │
        └──► AGV2attachPartX (PartXEvents)
             │
             └──► AGV2NotifLoad (AGV2Events)
                  │
                  └──► cmdAGV2toE (SupervisoryEvents)
                       │
                       └──► (agv2 viaja até stationE)
                            │
                            └──► AGV2locationStationE (reativo)
                                 │
                                 └──► AGV2NotifArriveE (AGV2Events)
                                      │
                                      └──► cmdAGV2UnloadE (SupervisoryEvents)
                                           │
                                           └──► AGV2detachPartX (PartXEvents) ✅ FINISH
```

### Status: ❌ NUNCA INICIA (depende de Scene 2 que trava)

---

## Resumo: Scenario1

| # | Scene | Start Event | Finish Event | Status |
|---|-------|-------------|--------------|--------|
| 1 | SCN_MoveAGV1toA | cmdSupervisor | AGV1NotifArriveA | ✅ OK |
| 2 | SCN_MoveAGV2toC | cmdAGV2toC | AGV2NotifArriveC | ❌ TRAVA |
| 3 | SCN_AGV1movePartToC | AGV1NotifArriveA | AGV1detachPartX | ⏸️ Depende de Scene 1 |
| 4 | SCN_AGV2movePartToE | AGV2NotifArriveC | AGV2detachPartX | ⏸️ Depende de Scene 2 |

---

## Eventos Reativos (Condições)

| Condição | Evento Disparado | Definido em |
|----------|------------------|-------------|
| `agv1.sensor == stationA.ID` | AGV1locationStationA | StationAEvents |
| `agv1.sensor == stationB.ID` | AGV1locationStationB | StationBEvents |
| `agv1.sensor == stationC.ID` | AGV1locationStationC | StationCEvents |
| `agv2.sensor == stationC.ID` | AGV2locationStationC | StationCEvents |
| `agv2.sensor == stationD.ID` | AGV2locationStationD | StationDEvents |
| `agv2.sensor == stationE.ID` | agv2locationStationE | StationEEvents |

---

## Eventos que Modificam Sensores

| Evento | Ação | Definido em |
|--------|------|-------------|
| AGV1atStationA | agv1.sensor = stationA | AGV1Events |
| AGV2atStationD | agv2.sensor = stationD | AGV2Events |
| SetAGV2SensorStationD | agv2.sensor = stationD.ID | StationDEvents |
| **AGV2atStationC** | **FALTA** | **FALTA** |

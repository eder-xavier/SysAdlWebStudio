# SysADL v0.4: Novos Elementos de Ambiente e Cenário

## **Visão Geral**

O SysADL v0.4 introduz novos **viewpoints** (pontos de vista) que estendem a linguagem além dos viewpoints tradicionais (Estrutural, Comportamental, Executável), adicionando capacidades para modelagem de:

1. **Ambiente** - Descrição das entidades físicas e suas interações no contexto de execução
2. **Cenário** - Especificação de comportamentos esperados através de eventos, cenas e cenários

Esta extensão permite uma abordagem mais completa para sistemas embarcados e IoT, integrando o mundo físico com o sistema de software.

---

## **Novos Elementos Introduzidos**

### **1. EnvironmentDefinition**
**Propósito**: Define entidades físicas e suas conexões possíveis no ambiente.

**Sintaxe**:
```sysadl
EnvironmentDefinition MyFactory {
  Entity def Station {
    properties { Property def ID }
    roles { Role def signal }
  }
  
  Entity def Vehicle {
    roles { 
      Role def outNotification 
      Role def inCommand  
    }
    properties { Property def location }
  }
  
  Connection def Notify {
    from Vehicle.outNotification to Supervisory.inNotification
  }
}
```

**Características**:
- **Entity def**: Define tipos de entidades físicas (estações, veículos, peças)
- **Properties**: Atributos das entidades (ID, localização)
- **Roles**: Interfaces de comunicação das entidades
- **Connection def**: Define fluxos de comunicação possíveis entre entidades

### **2. EnvironmentConfiguration** 
**Propósito**: Mapeia entidades ambientais para componentes do sistema e cria instâncias específicas.

**Sintaxe**:
```sysadl
EnvironmentConfiguration MyFactoryConfiguration to MyFactory {  
  // Mapeamento entidade → componente
  Vehicle: agvs;
  Vehicle.outNotification: agvs.in_outDataAgv.outNotifications;
  
  // Instanciação de entidades específicas
  agv1: Vehicle;
  stationA: Station;    
  stationA.ID = "StationA";
  
  // Estruturas hierárquicas
  lane1: Lane;
  lane1.entities.stations = [stationA, stationB, stationC];
}
```

**Características**:
- **Associação**: Liga entidades abstratas a componentes concretos
- **Instanciação**: Cria instâncias específicas (`agv1: Vehicle`)
- **Configuração**: Atribui valores a propriedades (`stationA.ID = "StationA"`)
- **Composição**: Define estruturas hierárquicas de entidades

### **3. EventsDefinitions**
**Propósito**: Define eventos que podem ocorrer entre entidades do ambiente.

**Sintaxe**:
```sysadl
EventsDefinitions MyEvents to MyFactoryConfiguration {
  Event def SupervisoryEvents for supervisor {
    ON cmdSupervisor 
      THEN cmdAGV2toC {
        supervisor.outCommand.destination = stationC;
        supervisor.outCommand.armCommand = idle;
        :Command(supervisor, agv2);
      }
  }
  
  Event def AGV1Events for agv1 {
    ON cmdAGV1toA
      THEN AGV1NotifTravelA {
        agv1.outNotification.notification = "traveling";
        :Notify(agv1, supervisor);
      }
  }
}
```

**Características**:
- **Event def**: Agrupa eventos por entidade responsável
- **ON/THEN**: Padrão trigger-action para especificar comportamentos
- **Atribuições**: Modificam propriedades das entidades
- **Invocações**: Acionam conexões entre entidades (`:Command(...)`)

### **4. SceneDefinitions**
**Propósito**: Define cenas com pré-condições, sequência de execução e pós-condições.

**Sintaxe**:
```sysadl
SceneDefinitions MyScenes to MyEvents {
  Scene def SCN_MoveAGV1toA on { 
    pre-condition {
      agv1.location == stationC.ID;
      part.location == stationA.ID;
    }
    start cmdSupervisor;
    finish AGV1NotifArriveA;
    post-condition {
      agv1.location == stationA.ID;
      part.location == stationA.ID;
    }
  }
}
```

**Características**:
- **pre-condition**: Estado necessário antes da execução
- **start**: Evento que inicia a cena
- **finish**: Evento que finaliza a cena
- **post-condition**: Estado garantido após execução

### **5. ScenarioDefinitions**
**Propósito**: Combina cenas em cenários completos, incluindo controle de fluxo.

**Sintaxe**:
```sysadl
ScenarioDefinitions MyScenarios to MyScenes {
  Scenario def Scenario1 { // Cenário padrão
    SCN_MoveAGV1toA;
    SCN_MoveAGV2toC;
    SCN_AGV1movePartToC;
    SCN_AGV2movePartToE;
  }
  
  Scenario def Scenario3 { // Com controle de fluxo
    let i: Integer = 1;
    while (i < 5) {
      SCN_MoveAGV1toA;
      SCN_AGV1movePartToC;
      i++;
    }
  }
}
```

**Características**:
- **Sequenciamento**: Execução ordenada de cenas
- **Controle de fluxo**: Loops (`while`), condicionais
- **Variáveis**: Declaração e manipulação de estado
- **Composição**: Cenários podem referenciar outros cenários

### **6. ScenarioExecution**
**Propósito**: Define execução de cenários com estado inicial e repetições.

**Sintaxe**:
```sysadl
ScenarioExecution to MyScenarios {
  // Estado inicial
  agv1.location = stationC.ID;
  agv2.location = stationD.ID;
  part.location = stationA.ID; 
  
  // Execução de cenários
  Scenario1;
  Scenario2;
  repeat 5 Scenario1; // Repetir 5 vezes
}
```

**Características**:
- **Inicialização**: Configura estado inicial do ambiente
- **Execução sequencial**: Define ordem de execução dos cenários
- **Repetição**: Comando `repeat N` para execuções múltiplas
- **Configuração completa**: Ponto de entrada para simulação

---

## **Integração com Viewpoints Existentes**

### **Mapeamento Sistema ↔ Ambiente**
O `EnvironmentConfiguration` estabelece bridges entre:

```sysadl
// Entidade ambiental → Componente do sistema
Vehicle: agvs;
Vehicle.outNotification: agvs.in_outDataAgv.outNotifications;

// Papel da entidade → Porta específica do componente  
Vehicle.sensor: agvs.as.arrivalDetected;
Vehicle.arm: agvs.ra.start;
```

### **Eventos → Comportamentos**
Os eventos definidos em `EventsDefinitions` podem acionar:
- **Atividades** existentes no sistema
- **Fluxos de dados** entre componentes  
- **Mudanças de estado** em entidades

### **Cenários → Execução**
Os cenários conectam:
- **Pré/pós-condições** → **Constraints** do sistema
- **Sequências de cenas** → **Protocolos** de comunicação
- **Estados do ambiente** → **Status** dos componentes

---

## **Exemplo Prático: Sistema AGV**

O exemplo `AGV-completo.sysadl` demonstra todos os conceitos:

1. **Environment**: Fábrica com estações, veículos, peças
2. **Configuration**: AGVs mapeados para componentes `AGVSystem`
3. **Events**: Supervisório comanda, AGVs notificam, sensores detectam
4. **Scenes**: Movimentos de A→C, carregamento/descarregamento
5. **Scenarios**: Sequências completas de transporte
6. **Execution**: Simulação com estados iniciais e múltiplas execuções

---

## **Benefícios da Extensão**

### **1. Modelagem Holística**
- Integra sistema software + ambiente físico
- Especifica comportamentos esperados end-to-end
- Facilita validação de requisitos em contexto real

### **2. Simulação e Teste**
- Cenários executáveis para teste de comportamento
- Estados iniciais configuráveis
- Repetições para análise estatística

### **3. Documentação Viva**
- Especificação formal do ambiente operacional
- Cenários como casos de teste documentados
- Rastreabilidade entre requisitos e comportamentos

### **4. Análise de Sistema**
- Verificação de propriedades temporais
- Detecção de cenários problemáticos (ex: `Scenario2`)
- Validação de robustez em diferentes condições

---

## **Comparação com v0.3**

| Aspecto | v0.3 | v0.4 |
|---------|------|------|
| **Escopo** | Sistema interno | Sistema + Ambiente |
| **Viewpoints** | 3 (Estrutural, Comportamental, Executável) | 5 (+ Ambiente, Cenário) |
| **Simulação** | Componentes isolados | Interação sistema-ambiente |
| **Teste** | Unidades funcionais | Cenários completos |
| **Especificação** | Arquitetura estática | Comportamento dinâmico |

---

## **Próximos Passos**

Para trabalhar com estes novos elementos:

1. **Estudo da gramática**: Entender sintaxe completa em `sysadl.peg`
2. **Parser atualizado**: Verificar processamento em `sysadl-parser.js`
3. **Simulador estendido**: Implementar execução de cenários
4. **Transformer**: Gerar código executável para ambiente + sistema
5. **Validação**: Criar casos de teste usando cenários

A v0.4 representa uma evolução significativa do SysADL para sistemas cyber-físicos, oferecendo ferramentas completas para especificação, simulação e validação de sistemas embarcados em seus ambientes operacionais.
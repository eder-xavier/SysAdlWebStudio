/**
 * EventScheduler - Agendador de Eventos para Execução de Cenários
 * 
 * Gerencia o agendamento condicional e temporal de eventos durante a execução de cenários.
 * Suporta três tipos principais de agendamento:
 * 1. After Scenario: Dispara evento após conclusão de uma cena específica
 * 2. On Condition: Dispara evento quando uma condição se torna verdadeira
 * 3. After Delay: Dispara evento após um delay temporal
 * 
 * @version 1.0.0
 * @date 2025-11-05
 */

class EventScheduler {
  constructor(model, logger = null) {
    this.model = model;
    this.logger = logger;
    
    // Fila de eventos agendados
    this.scheduledEvents = [];
    
    // Eventos agendados após cenas/cenários
    this.afterScenarioQueue = new Map(); // sceneName -> [eventNames]
    
    // Eventos agendados por condição
    this.conditionalEvents = []; // { eventName, condition, checked }
    
    // Monitoramento ativo
    this.monitoringActive = false;
    this.monitoringInterval = null;
    this.checkIntervalMs = 100; // Verificar condições a cada 100ms
    
    // Contador de eventos disparados
    this.eventsFired = 0;
    
    this.log('EventScheduler initialized', 'info');
  }

  /**
   * Agenda um evento para ser disparado após a conclusão de uma cena/cenário
   * @param {string} eventName - Nome do evento a ser disparado
   * @param {string} scenarioName - Nome da cena/cenário após o qual disparar
   */
  scheduleAfterScenario(eventName, scenarioName) {
    if (!this.afterScenarioQueue.has(scenarioName)) {
      this.afterScenarioQueue.set(scenarioName, []);
    }
    
    this.afterScenarioQueue.get(scenarioName).push(eventName);
    
    this.log(`Scheduled event '${eventName}' to fire after scenario '${scenarioName}'`, 'info');
    
    if (this.logger) {
      this.logger.logExecution({
        type: 'event.scheduled',
        name: eventName,
        context: {
          triggerType: 'after_scenario',
          triggerScenario: scenarioName
        }
      });
    }
  }

  /**
   * Agenda um evento para ser disparado quando uma condição se tornar verdadeira
   * @param {string} eventName - Nome do evento a ser disparado
   * @param {Function} condition - Função que retorna true quando a condição é atendida
   */
  scheduleOnCondition(eventName, condition) {
    if (typeof condition !== 'function') {
      throw new Error(`Condition for event '${eventName}' must be a function`);
    }
    
    this.conditionalEvents.push({
      eventName,
      condition,
      checked: false,
      fired: false
    });
    
    // Iniciar monitoramento se ainda não estiver ativo
    if (!this.monitoringActive) {
      this.startMonitoring();
    }
    
    this.log(`Scheduled event '${eventName}' to fire on condition`, 'info');
    
    if (this.logger) {
      this.logger.logExecution({
        type: 'event.scheduled',
        name: eventName,
        context: {
          triggerType: 'condition',
          conditionFunction: condition.toString()
        }
      });
    }
  }

  /**
   * Agenda um evento para ser disparado após um delay específico
   * @param {string} eventName - Nome do evento a ser disparado
   * @param {number} delayMs - Delay em milissegundos
   */
  scheduleAfterDelay(eventName, delayMs) {
    const timeoutId = setTimeout(() => {
      this.fireEvent(eventName, 'delayed');
    }, delayMs);
    
    this.scheduledEvents.push({
      eventName,
      type: 'delayed',
      delayMs,
      timeoutId
    });
    
    this.log(`Scheduled event '${eventName}' to fire after ${delayMs}ms`, 'info');
    
    if (this.logger) {
      this.logger.logExecution({
        type: 'event.scheduled',
        name: eventName,
        context: {
          triggerType: 'delayed',
          delayMs
        }
      });
    }
  }

  /**
   * Notifica o scheduler que uma cena/cenário foi concluída
   * Dispara eventos agendados para executar após essa cena
   * @param {string} scenarioName - Nome da cena/cenário concluída
   */
  notifyScenarioCompleted(scenarioName) {
    const eventsToFire = this.afterScenarioQueue.get(scenarioName);
    
    if (eventsToFire && eventsToFire.length > 0) {
      this.log(`Scenario '${scenarioName}' completed, firing ${eventsToFire.length} scheduled events`, 'info');
      
      for (const eventName of eventsToFire) {
        this.fireEvent(eventName, 'after_scenario', { scenarioName });
      }
      
      // Limpar eventos já disparados
      this.afterScenarioQueue.delete(scenarioName);
    }
  }

  /**
   * Inicia o monitoramento de condições
   */
  startMonitoring() {
    if (this.monitoringActive) return;
    
    this.monitoringActive = true;
    this.log('Starting conditional event monitoring', 'info');
    
    this.monitoringInterval = setInterval(() => {
      this.checkConditionalEvents();
    }, this.checkIntervalMs);
  }

  /**
   * Para o monitoramento de condições
   */
  stopMonitoring() {
    if (!this.monitoringActive) return;
    
    this.monitoringActive = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.log('Stopped conditional event monitoring', 'info');
  }

  /**
   * Verifica eventos condicionais e dispara os que têm condição verdadeira
   */
  checkConditionalEvents() {
    if (this.conditionalEvents.length === 0) {
      this.stopMonitoring();
      return;
    }
    
    const eventsToRemove = [];
    
    for (let i = 0; i < this.conditionalEvents.length; i++) {
      const event = this.conditionalEvents[i];
      
      if (event.fired) {
        eventsToRemove.push(i);
        continue;
      }
      
      try {
        // Avaliar condição
        const conditionMet = event.condition();
        
        if (conditionMet) {
          this.log(`Condition met for event '${event.eventName}', firing...`, 'info');
          this.fireEvent(event.eventName, 'condition');
          event.fired = true;
          eventsToRemove.push(i);
        }
      } catch (error) {
        this.log(`Error checking condition for event '${event.eventName}': ${error.message}`, 'error');
        event.fired = true; // Marcar como disparado para não tentar novamente
        eventsToRemove.push(i);
      }
    }
    
    // Remover eventos já disparados (em ordem reversa para não afetar índices)
    for (let i = eventsToRemove.length - 1; i >= 0; i--) {
      this.conditionalEvents.splice(eventsToRemove[i], 1);
    }
  }

  /**
   * Dispara um evento imediatamente
   * @param {string} eventName - Nome do evento a disparar
   * @param {string} triggerType - Tipo de trigger ('after_scenario', 'condition', 'delayed', 'manual')
   * @param {Object} metadata - Metadados adicionais
   */
  fireEvent(eventName, triggerType = 'manual', metadata = {}) {
    this.eventsFired++;
    
    this.log(`Firing event '${eventName}' (trigger: ${triggerType})`, 'info');
    
    if (this.logger) {
      this.logger.logExecution({
        type: 'event.fired',
        name: eventName,
        context: {
          triggerType,
          eventNumber: this.eventsFired,
          ...metadata
        }
      });
    }
    
    // Disparar evento no EventInjector do modelo
    if (this.model && this.model.eventInjector) {
      try {
        this.model.eventInjector.injectEvent(eventName);
      } catch (error) {
        this.log(`Error firing event '${eventName}': ${error.message}`, 'error');
        
        if (this.logger) {
          this.logger.logExecution({
            type: 'event.fire.failed',
            name: eventName,
            context: {
              error: error.message,
              triggerType
            }
          });
        }
      }
    } else {
      this.log(`Cannot fire event '${eventName}': EventInjector not available`, 'warn');
    }
  }

  /**
   * Limpa todos os eventos agendados
   */
  clearAll() {
    // Limpar timeouts agendados
    for (const event of this.scheduledEvents) {
      if (event.timeoutId) {
        clearTimeout(event.timeoutId);
      }
    }
    
    this.scheduledEvents = [];
    this.afterScenarioQueue.clear();
    this.conditionalEvents = [];
    this.stopMonitoring();
    
    this.log('Cleared all scheduled events', 'info');
    
    if (this.logger) {
      this.logger.logExecution({
        type: 'event.scheduler.cleared',
        name: 'EventScheduler',
        context: {
          eventsFired: this.eventsFired
        }
      });
    }
  }

  /**
   * Obtém estatísticas do scheduler
   */
  getStats() {
    return {
      eventsFired: this.eventsFired,
      pendingAfterScenario: Array.from(this.afterScenarioQueue.entries()).map(([scenario, events]) => ({
        scenario,
        events
      })),
      pendingConditional: this.conditionalEvents.filter(e => !e.fired).map(e => ({
        eventName: e.eventName,
        condition: e.condition.toString()
      })),
      pendingDelayed: this.scheduledEvents.filter(e => e.type === 'delayed').map(e => ({
        eventName: e.eventName,
        delayMs: e.delayMs
      })),
      monitoringActive: this.monitoringActive
    };
  }

  /**
   * Log interno
   */
  log(message, level = 'info') {
    const prefix = {
      info: '[INFO]',
      warn: '[WARN]',
      error: '[ERROR]'
    }[level] || '[INFO]';
    
    console.log(`${prefix} EventScheduler: ${message}`);
  }

  /**
   * Cleanup ao destruir o scheduler
   */
  destroy() {
    this.clearAll();
    this.log('EventScheduler destroyed', 'info');
  }
}

module.exports = EventScheduler;

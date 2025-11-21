/**
 * Event Injector for SysADL
 * 
 * Generic event injection system that works across any domain (AGV, RTC, IoT, etc.)
 * Provides controlled event injection with timing, validation, and comprehensive logging.
 * 
 * Features:
 * - Domain-agnostic event injection
 * - Event scheduling and timing control
 * - Event validation and parameter checking
 * - Event chain tracking and monitoring
 * - Comprehensive logging integration
 * - Event queuing and batch processing
 * - Conditional event injection
 */

class EventInjector {
  constructor(sysadlBase, options = {}) {
    this.sysadlBase = sysadlBase;
    
    // Configuration
    this.config = {
      enableValidation: options.enableValidation !== false,
      enableLogging: options.enableLogging !== false,
      enableQueuing: options.enableQueuing !== false,
      maxQueueSize: options.maxQueueSize || 1000,
      defaultDelay: options.defaultDelay || 0,
      batchSize: options.batchSize || 10,
      batchInterval: options.batchInterval || 100,
      enableRetries: options.enableRetries !== false,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      debugMode: options.debugMode || false
    };

    // Event management
    this.eventQueue = [];
    this.scheduledEvents = new Map(); // eventId -> timeout
    this.eventHistory = [];
    this.activeEvents = new Map(); // eventId -> event data
    this.eventDefinitions = new Map(); // eventName -> definition
    
    // Statistics
    this.stats = {
      totalEventsInjected: 0,
      successfulEvents: 0,
      failedEvents: 0,
      queuedEvents: 0,
      scheduledEvents: 0,
      averageInjectionTime: 0,
      totalInjectionTime: 0
    };

    // Event system access - always use global eventSystemManager
    this.eventEmitter = this.sysadlBase.eventSystemManager.getGlobalEmitter();
    this.simulationMode = false; // Using real event system

    // Start batch processing if enabled
    if (this.config.enableQueuing) {
      this.startBatchProcessing();
    }

    console.log('⚡ EventInjector initialized - ready for event injection');
  }

  /**
   * Register an event definition for validation and documentation
   */
  registerEventDefinition(eventName, definition) {
    if (!eventName || !definition) {
      throw new Error('Event name and definition are required');
    }

    const eventDef = {
      name: eventName,
      description: definition.description || '',
      parameters: definition.parameters || [],
      required: definition.required || [],
      category: definition.category || 'general',
      schema: definition.schema || null,
      examples: definition.examples || []
    };

    this.eventDefinitions.set(eventName, eventDef);
    return eventDef;
  }

  /**
   * Get event definition
   */
  getEventDefinition(eventName) {
    return this.eventDefinitions.get(eventName) || null;
  }

  /**
   * Inject a single event into the system
   */
  async injectEvent(eventName, parameters = {}, delay = 0, options = {}) {
    const injectionStartTime = Date.now();
    const eventId = this.generateEventId();

    // Create event object
    const event = {
      eventId,
      eventName,
      parameters,
      timestamp: Date.now(),
      options: {
        delay: delay || this.config.defaultDelay,
        queue: options.queue || false,
        priority: options.priority || 'normal',
        retryCount: 0,
        maxRetries: options.maxRetries || this.config.maxRetries,
        metadata: options.metadata || {},
        ...options
      }
    };

    console.log(`⚡ Injecting event: ${eventName} (${eventId})`);

    try {
      // Validate event if validation is enabled
      if (this.config.enableValidation) {
        await this.validateEvent(event);
      }

      // Queue or inject immediately
      if (event.options.queue && event.options.delay > 0) {
        return this.queueEvent(event);
      } else if (event.options.delay > 0) {
        return this.scheduleEvent(event);
      } else {
        return this.executeInjection(event);
      }

    } catch (error) {
      this.logEventInjection({
        eventId,
        eventName,
        duration: Date.now() - injectionStartTime,
        error: error.message
      }, 'validation_failed');
      throw error;
    }
  }

  /**
   * Inject multiple events in batch
   */
  async injectEventBatch(eventSpecs, options = {}) {
    const results = {
      successCount: 0,
      failedCount: 0,
      totalCount: eventSpecs.length,
      events: []
    };

    const parallel = options.parallel || false;

    if (parallel) {
      // Execute all events in parallel
      const promises = eventSpecs.map(async (spec) => {
        try {
          const result = await this.injectEvent(
            spec.eventName, 
            spec.parameters || {}, 
            spec.delay || 0, 
            spec.options || {}
          );
          results.successCount++;
          results.events.push({ success: true, result });
          return result;
        } catch (error) {
          results.failedCount++;
          results.events.push({ success: false, error: error.message });
          throw error;
        }
      });

      await Promise.allSettled(promises);
    } else {
      // Execute events sequentially
      for (const spec of eventSpecs) {
        try {
          const result = await this.injectEvent(
            spec.eventName, 
            spec.parameters || {}, 
            spec.delay || 0, 
            spec.options || {}
          );
          results.successCount++;
          results.events.push({ success: true, result });
        } catch (error) {
          results.failedCount++;
          results.events.push({ success: false, error: error.message });
        }
      }
    }

    return results;
  }

  /**
   * Execute immediate event injection
   */
  async executeInjection(event) {
    const executionStartTime = Date.now();
    
    try {
      // Add to active events
      this.activeEvents.set(event.eventId, event);

      // Emit the event
      const emitResult = await this.emitEvent(event);
      
      // Calculate execution duration
      const duration = Date.now() - executionStartTime;
      event.duration = duration;

      // Update statistics
      this.updateStatistics(duration, true);
      
      // Log successful injection
      this.logEventInjection(event, 'success');

      // Add to history
      this.eventHistory.push({
        ...event,
        result: 'success',
        emitResult,
        duration
      });

      // Remove from active events
      this.activeEvents.delete(event.eventId);

      console.log(`✅ Event injected: ${event.eventName} (${duration}ms)`);

      return {
        success: true,
        eventId: event.eventId,
        duration,
        emitResult
      };

    } catch (error) {
      const duration = Date.now() - executionStartTime;
      
      // Update statistics
      this.updateStatistics(duration, false);
      
      // Log failed injection
      this.logEventInjection({
        ...event,
        duration,
        error: error.message
      }, 'failed');

      // Remove from active events
      this.activeEvents.delete(event.eventId);

      console.error(`❌ Event injection failed: ${event.eventName} - ${error.message}`);

      // Retry if configured
      if (this.config.enableRetries && event.options.retryCount < event.options.maxRetries) {
        return this.retryEventInjection(event);
      }

      throw error;
    }
  }

  /**
   * Emit event to the system
   */
  async emitEvent(event) {
    // Emit to the event system (either real or simulation)
    const eventData = {
      eventId: event.eventId,
      eventName: event.eventName,
      parameters: event.parameters,
      timestamp: event.timestamp,
      source: 'EventInjector',
      metadata: event.options.metadata
    };

    try {
      // Always emit the event
      this.eventEmitter.emit(event.eventName, eventData);
      
      return {
        simulated: this.simulationMode,
        eventName: event.eventName,
        parameters: event.parameters,
        emitted: true
      };
    } catch (error) {
      throw new Error(`Failed to emit event ${event.eventName}: ${error.message}`);
    }
  }

  /**
   * Validate event before injection
   */
  async validateEvent(event) {
    const definition = this.getEventDefinition(event.eventName);
    
    if (!definition) {
      // If no definition exists, allow event but warn
      if (this.config.debugMode) {
        console.warn(`⚠️  No definition found for event: ${event.eventName}`);
      }
      return true;
    }

    // Validate required parameters
    for (const requiredParam of definition.required) {
      if (!(requiredParam in event.parameters)) {
        throw new Error(`Required parameter missing: ${requiredParam}`);
      }
    }

    // Validate parameter types if schema is provided
    if (definition.schema) {
      // Basic schema validation - could be extended with a full JSON schema validator
      for (const [key, value] of Object.entries(event.parameters)) {
        if (definition.schema[key]) {
          const expectedType = definition.schema[key].type;
          const actualType = typeof value;
          
          if (expectedType !== actualType) {
            throw new Error(`Parameter '${key}' expected type '${expectedType}' but got '${actualType}'`);
          }
        }
      }
    }

    return true;
  }

  /**
   * Queue event for batch processing
   */
  queueEvent(event) {
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      throw new Error('Event queue is full');
    }

    this.eventQueue.push(event);
    this.stats.queuedEvents++;
    
    console.log(`📥 Event queued: ${event.eventName} (queue size: ${this.eventQueue.length})`);
    
    return {
      queued: true,
      eventId: event.eventId,
      queuePosition: this.eventQueue.length
    };
  }

  /**
   * Schedule event for delayed execution
   */
  scheduleEvent(event) {
    const timeoutId = setTimeout(async () => {
      try {
        await this.executeInjection(event);
        this.scheduledEvents.delete(event.eventId);
      } catch (error) {
        console.error(`Scheduled event failed: ${event.eventName} - ${error.message}`);
      }
    }, event.options.delay);

    this.scheduledEvents.set(event.eventId, timeoutId);
    this.stats.scheduledEvents++;
    
    console.log(`⏰ Event scheduled: ${event.eventName} (delay: ${event.options.delay}ms)`);
    
    return {
      scheduled: true,
      eventId: event.eventId,
      delay: event.options.delay
    };
  }

  /**
   * Retry event injection
   */
  async retryEventInjection(event) {
    event.options.retryCount++;
    
    console.log(`🔄 Retrying event: ${event.eventName} (attempt ${event.options.retryCount})`);
    
    // Wait before retry
    if (this.config.retryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
    }
    
    return this.executeInjection(event);
  }

  /**
   * Start batch processing of queued events
   */
  startBatchProcessing() {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }

    console.log(`📦 Batch processing started (interval: ${this.config.batchInterval}ms, batch size: ${this.config.batchSize})`);

    this.batchInterval = setInterval(async () => {
      await this.processBatch();
    }, this.config.batchInterval);
  }

  /**
   * Process a batch of queued events
   */
  async processBatch() {
    if (this.eventQueue.length === 0) {
      return;
    }

    const batch = this.eventQueue.splice(0, this.config.batchSize);
    
    console.log(`📦 Processing batch: ${batch.length} events`);

    for (const event of batch) {
      try {
        await this.executeInjection(event);
      } catch (error) {
        console.error(`Batch event failed: ${event.eventName} - ${error.message}`);
      }
    }
  }

  /**
   * Log event injection
   */
  logEventInjection(event, phase) {
    if (!this.config.enableLogging || !this.sysadlBase.logger) {
      return;
    }

    this.sysadlBase.logger.logExecution({
      type: 'event_injection',
      name: event.eventName,
      path: `EventInjector.${event.eventName}`,
      result: phase,
      duration: event.duration || 0,
      metadata: {
        eventId: event.eventId,
        parameters: event.parameters,
        retryCount: event.retryCount,
        source: 'EventInjector'
      },
      errors: event.error ? [event.error] : [],
      eventChain: [event.eventName]
    });
  }

  /**
   * Update statistics
   */
  updateStatistics(duration, success) {
    this.stats.totalEventsInjected++;
    this.stats.totalInjectionTime += duration;
    this.stats.averageInjectionTime = this.stats.totalInjectionTime / this.stats.totalEventsInjected;
    
    if (success) {
      this.stats.successfulEvents++;
    } else {
      this.stats.failedEvents++;
    }
  }

  /**
   * Get injection statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      successRate: this.stats.totalEventsInjected > 0 
        ? (this.stats.successfulEvents / this.stats.totalEventsInjected) * 100 
        : 0,
      queueSize: this.eventQueue.length,
      scheduledEventsCount: this.scheduledEvents.size,
      activeEventsCount: this.activeEvents.size
    };
  }

  /**
   * Get event history
   */
  getEventHistory(limit = 100) {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Cancel a scheduled event
   */
  cancelScheduledEvent(eventId) {
    const timeoutId = this.scheduledEvents.get(eventId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledEvents.delete(eventId);
      console.log(`⏰ Scheduled event cancelled: ${eventId}`);
      return true;
    }
    return false;
  }

  /**
   * Clear event queue
   */
  clearQueue() {
    const queueSize = this.eventQueue.length;
    this.eventQueue = [];
    console.log(`🗑️  Event queue cleared: ${queueSize} events removed`);
    return queueSize;
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `event_${this.eventDefinitions.size > 0 ? [...this.eventDefinitions.keys()][0] : 'generic'}_${timestamp}_${random}`;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Clear batch processing interval
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }

    // Clear all scheduled events
    for (const timeoutId of this.scheduledEvents.values()) {
      clearTimeout(timeoutId);
    }

    // Clear data structures
    this.eventQueue = [];
    this.scheduledEvents.clear();
    this.activeEvents.clear();
    this.eventHistory = [];

    console.log('🧹 EventInjector cleanup completed');
  }
}

module.exports = EventInjector;
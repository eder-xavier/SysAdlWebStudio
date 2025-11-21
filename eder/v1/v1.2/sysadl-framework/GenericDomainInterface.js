/**
 * Generic Domain Interface
 * Simple, universal interface that works with any SysADL model
 * No domain-specific knowledge required - everything is inferred automatically
 */

const { GenericDomainAnalyzer } = require('./GenericDomainAnalyzer');

class GenericDomainInterface {
  constructor(model) {
    this.model = model;
    this.analyzer = new GenericDomainAnalyzer();
    this.analysis = null;
    this.state = new Map();
    this.subscribers = new Map();
    this.physicsEnabled = false;
    
    this.initialize();
  }

  /**
   * Initialize with automatic model analysis
   */
  initialize() {
    console.log('🚀 Initializing Generic Domain Interface...');
    
    // Analyze the model automatically
    this.analysis = this.analyzer.analyzeModel(this.model);
    
    // Setup generic state management
    this.setupGenericState();
    
    // Setup automatic reactive conditions
    this.setupAutomaticReactiveConditions();
    
    console.log('✅ Generic domain interface ready');
  }

  /**
   * Setup generic state management based on detected properties
   */
  setupGenericState() {
    if (!this.analysis.entities) return;
    
    for (const entity of this.analysis.entities) {
      const entityState = {};
      
      for (const property of entity.properties) {
        // Set default values based on property type
        entityState[property.name] = this.getDefaultValue(property.type);
      }
      
      this.state.set(entity.name, entityState);
    }
    
    console.log(`📊 Initialized state for ${this.analysis.entities.length} entities`);
  }

  /**
   * Get default value for property type
   */
  getDefaultValue(propertyType) {
    const defaults = {
      'location': null,
      'status': 'idle',
      'sensor': null,
      'command': null,
      'notification': null,
      'temperature': 20.0,
      'generic': null
    };
    
    return defaults[propertyType] || null;
  }

  /**
   * Setup automatic reactive conditions based on analysis
   */
  setupAutomaticReactiveConditions() {
    const conditions = this.analyzer.generateReactiveConditions(this.analysis);
    
    console.log(`🔍 Generated ${conditions.length} automatic reactive conditions:`);
    for (const condition of conditions) {
      console.log(`  - ${condition.name}: "${condition.expression}"`);
    }
    
    return conditions;
  }

  /**
   * Generic state getter
   */
  getState(entityName, propertyName = null) {
    const entityState = this.state.get(entityName);
    if (!entityState) return null;
    
    if (propertyName) {
      return entityState[propertyName];
    }
    
    return entityState;
  }

  /**
   * Generic state setter with automatic change detection
   */
  setState(entityName, propertyName, value) {
    let entityState = this.state.get(entityName);
    if (!entityState) {
      entityState = {};
      this.state.set(entityName, entityState);
    }
    
    const oldValue = entityState[propertyName];
    entityState[propertyName] = value;
    
    // Notify subscribers of change
    this.notifyStateChange(entityName, propertyName, oldValue, value);
    
    return true;
  }

  /**
   * Subscribe to state changes
   */
  subscribeToStateChange(entityName, propertyName, callback) {
    const key = `${entityName}.${propertyName}`;
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }
    
    this.subscribers.get(key).push(callback);
    
    return () => {
      // Return unsubscribe function
      const callbacks = this.subscribers.get(key);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify subscribers of state changes
   */
  notifyStateChange(entityName, propertyName, oldValue, newValue) {
    const key = `${entityName}.${propertyName}`;
    const callbacks = this.subscribers.get(key);
    
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback({
            entity: entityName,
            property: propertyName,
            oldValue,
            newValue,
            timestamp: Date.now()
          });
        } catch (error) {
          console.error('Error in state change callback:', error);
        }
      }
    }
  }

  /**
   * Get detected domain type
   */
  getDomainType() {
    return this.analysis.domain;
  }

  /**
   * Get detected entities
   */
  getEntities() {
    return this.analysis.entities;
  }

  /**
   * Get detected event patterns
   */
  getEventPatterns() {
    return this.analysis.patterns;
  }

  /**
   * Check if property is reactive (should trigger events)
   */
  isReactiveProperty(entityName, propertyName) {
    const entity = this.analysis.entities.find(e => e.name === entityName);
    if (!entity) return false;
    
    const property = entity.properties.find(p => p.name === propertyName);
    return property ? property.reactive : false;
  }

  /**
   * Get physics behaviors for entity
   */
  getPhysicsBehaviors(entityName) {
    const entity = this.analysis.entities.find(e => e.name === entityName);
    if (!entity) return [];
    
    return this.analysis.physics.filter(physics => 
      physics.properties.some(prop => 
        entity.properties.some(entityProp => entityProp.name === prop)
      )
    );
  }

  /**
   * Enable physics simulation
   */
  enablePhysics() {
    this.physicsEnabled = true;
    console.log('⚙️ Physics simulation enabled');
  }

  /**
   * Disable physics simulation
   */
  disablePhysics() {
    this.physicsEnabled = false;
    console.log('⚙️ Physics simulation disabled');
  }

  /**
   * Simulate physics step (generic)
   */
  simulatePhysics(deltaTime = 100) {
    if (!this.physicsEnabled) return;
    
    // Generic physics simulation based on detected behaviors
    for (const physics of this.analysis.physics) {
      this.applyPhysicsBehavior(physics, deltaTime);
    }
  }

  /**
   * Apply physics behavior generically
   */
  applyPhysicsBehavior(physics, deltaTime) {
    // Simple generic physics rules
    switch (physics.type) {
      case 'movement':
        this.simulateMovement(deltaTime);
        break;
      case 'processing':
        this.simulateProcessing(deltaTime);
        break;
      case 'environmental':
        this.simulateEnvironmental(deltaTime);
        break;
    }
  }

  simulateMovement(deltaTime) {
    // Generic movement simulation
    for (const [entityName, entityState] of this.state) {
      if (entityState.status === 'traveling' && entityState.destination) {
        // Simulate travel progress
        entityState.travelProgress = (entityState.travelProgress || 0) + deltaTime;
        
        if (entityState.travelProgress >= entityState.travelTime) {
          entityState.location = entityState.destination;
          entityState.status = 'arrived';
          entityState.destination = null;
          
          this.notifyStateChange(entityName, 'location', null, entityState.location);
          this.notifyStateChange(entityName, 'status', 'traveling', 'arrived');
        }
      }
    }
  }

  simulateProcessing(deltaTime) {
    // Generic processing simulation
    for (const [entityName, entityState] of this.state) {
      if (entityState.status === 'processing') {
        entityState.processProgress = (entityState.processProgress || 0) + deltaTime;
        
        if (entityState.processProgress >= entityState.processTime) {
          entityState.status = 'completed';
          this.notifyStateChange(entityName, 'status', 'processing', 'completed');
        }
      }
    }
  }

  simulateEnvironmental(deltaTime) {
    // Generic environmental simulation (temperature changes, etc.)
    for (const [entityName, entityState] of this.state) {
      if (entityState.temperature !== undefined) {
        // Simple temperature drift simulation
        const targetTemp = entityState.targetTemperature || 20.0;
        const tempDiff = targetTemp - entityState.temperature;
        const tempChange = tempDiff * 0.1 * (deltaTime / 1000); // Gradual change
        
        if (Math.abs(tempChange) > 0.01) {
          const newTemp = entityState.temperature + tempChange;
          this.setState(entityName, 'temperature', Math.round(newTemp * 10) / 10);
        }
      }
    }
  }

  /**
   * Get summary of domain interface
   */
  getSummary() {
    return {
      domain: this.analysis.domain,
      entities: this.analysis.entities.length,
      properties: this.analysis.entities.reduce((sum, e) => sum + e.properties.length, 0),
      patterns: this.analysis.patterns.length,
      physics: this.analysis.physics.length,
      state_size: this.state.size,
      physics_enabled: this.physicsEnabled
    };
  }

  /**
   * Get detailed analysis report
   */
  getAnalysisReport() {
    return {
      ...this.analysis,
      summary: this.getSummary(),
      reactive_conditions: this.analyzer.generateReactiveConditions(this.analysis)
    };
  }
}

module.exports = { GenericDomainInterface };
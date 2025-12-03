/**
 * Generic Domain Detection and Configuration
 * Automatically detects domain patterns from SysADL models without requiring specific adapters
 * 
 * This approach analyzes the model structure and infers:
 * - Entity types from component definitions
 * - State properties from component attributes  
 * - Event patterns from model connections
 * - Physics behaviors from activity flows
 * 
 * No domain-specific knowledge required - everything is inferred!
 */

class GenericDomainAnalyzer {
  constructor() {
    this.detectedEntities = new Map();
    this.detectedProperties = new Map();
    this.detectedPatterns = new Map();
    this.detectedPhysics = new Map();
  }

  /**
   * Analyze a SysADL model and automatically detect domain characteristics
   */
  analyzeModel(model) {
    console.log('🔍 Analyzing model for generic domain detection...');
    
    const analysis = {
      domain: this.detectDomainType(model),
      entities: this.detectEntityTypes(model),
      properties: this.detectStateProperties(model),
      patterns: this.detectEventPatterns(model),
      physics: this.detectPhysicsBehaviors(model)
    };
    
    console.log(`✅ Domain detected: ${analysis.domain}`);
    console.log(`📊 Found ${analysis.entities.length} entity types`);
    console.log(`🔧 Found ${analysis.properties.length} state properties`);
    
    return analysis;
  }

  /**
   * Automatically detect domain type from model characteristics
   */
  detectDomainType(model) {
    const indicators = {
      AGV: ['vehicle', 'agv', 'station', 'location', 'movement', 'load'],
      RTC: ['temperature', 'control', 'sensor', 'heating', 'cooling'],
      SmartPlace: ['smart', 'home', 'room', 'device', 'automation'],
      IoT: ['sensor', 'device', 'network', 'data', 'monitoring'],
      Manufacturing: ['machine', 'production', 'assembly', 'quality'],
      Generic: [] // Fallback
    };
    
    const modelText = JSON.stringify(model).toLowerCase();
    
    for (const [domain, keywords] of Object.entries(indicators)) {
      if (domain === 'Generic') continue;
      
      const matches = keywords.filter(keyword => modelText.includes(keyword));
      if (matches.length >= 2) { // Need at least 2 keyword matches
        return domain;
      }
    }
    
    return 'Generic'; // Fallback to generic
  }

  /**
   * Automatically detect state properties from model structure
   */
  detectStateProperties(model) {
    const properties = [];
    
    // From detected entities
    const entities = this.detectEntityTypes(model);
    for (const entity of entities) {
      for (const property of entity.properties) {
        properties.push({
          entity: entity.name,
          name: property.name,
          type: property.type,
          reactive: property.reactive,
          source: property.source
        });
      }
    }
    
    return properties;
  }
  detectEntityTypes(model) {
    const entities = [];
    
    // Analyze components to infer entity types
    if (model.components) {
      for (const [name, component] of Object.entries(model.components)) {
        const entityType = this.inferEntityType(name, component);
        entities.push({
          name: name,
          type: entityType,
          properties: this.extractComponentProperties(component),
          capabilities: this.inferCapabilities(component)
        });
      }
    }
    
    // Analyze environment entities if present
    if (model.environments) {
      for (const [envName, env] of Object.entries(model.environments)) {
        if (env.entities) {
          for (const [entityName, entity] of Object.entries(env.entities)) {
            entities.push({
              name: entityName,
              type: this.inferEntityType(entityName, entity),
              properties: this.extractEntityProperties(entity),
              capabilities: this.inferCapabilities(entity)
            });
          }
        }
      }
    }
    
    return entities;
  }

  /**
   * Infer entity type from name and structure
   */
  inferEntityType(name, component) {
    const nameLower = name.toLowerCase();
    
    // Common entity type patterns
    const patterns = {
      'Controller': ['control', 'controller', 'manager', 'supervisor'],
      'Vehicle': ['agv', 'vehicle', 'robot', 'mobile'],
      'Station': ['station', 'dock', 'base', 'checkpoint'],
      'Sensor': ['sensor', 'detector', 'monitor'],
      'Actuator': ['actuator', 'motor', 'valve', 'pump'],
      'Device': ['device', 'equipment', 'machine'],
      'Part': ['part', 'item', 'product', 'component']
    };
    
    for (const [type, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => nameLower.includes(keyword))) {
        return type;
      }
    }
    
    // Infer from component structure
    if (component.ports) {
      const portNames = Object.keys(component.ports).join(' ').toLowerCase();
      if (portNames.includes('command') || portNames.includes('control')) {
        return 'Controller';
      }
      if (portNames.includes('sensor') || portNames.includes('data')) {
        return 'Sensor';
      }
      if (portNames.includes('motor') || portNames.includes('actuator')) {
        return 'Actuator';
      }
    }
    
    return 'Generic'; // Fallback
  }

  /**
   * Extract and categorize component properties
   */
  extractComponentProperties(component) {
    const properties = [];
    
    // From ports
    if (component.ports) {
      for (const [portName, port] of Object.entries(component.ports)) {
        properties.push({
          name: portName,
          type: this.inferPropertyType(portName, port),
          source: 'port',
          reactive: this.isReactiveProperty(portName)
        });
      }
    }
    
    // From activities
    if (component.activities) {
      for (const [actName, activity] of Object.entries(component.activities)) {
        if (activity.parameters) {
          for (const param of activity.parameters) {
            properties.push({
              name: param.name || param,
              type: this.inferPropertyType(param.name || param, param),
              source: 'activity',
              reactive: false
            });
          }
        }
      }
    }
    
    return properties;
  }

  /**
   * Infer property type from name and context
   */
  inferPropertyType(name, context) {
    const nameLower = name.toLowerCase();
    
    // Location/Position properties
    if (['location', 'position', 'place', 'station', 'x', 'y', 'z'].some(k => nameLower.includes(k))) {
      return 'location';
    }
    
    // Status/State properties  
    if (['status', 'state', 'mode', 'condition'].some(k => nameLower.includes(k))) {
      return 'status';
    }
    
    // Sensor readings
    if (['sensor', 'reading', 'value', 'measurement', 'data'].some(k => nameLower.includes(k))) {
      return 'sensor';
    }
    
    // Commands
    if (['command', 'cmd', 'instruction', 'order'].some(k => nameLower.includes(k))) {
      return 'command';
    }
    
    // Notifications
    if (['notification', 'notify', 'alert', 'message'].some(k => nameLower.includes(k))) {
      return 'notification';
    }
    
    // Temperature
    if (['temperature', 'temp', 'celsius', 'fahrenheit'].some(k => nameLower.includes(k))) {
      return 'temperature';
    }
    
    return 'generic';
  }

  /**
   * Determine if a property should be reactive (trigger events)
   */
  isReactiveProperty(propertyName) {
    const reactivePatterhs = [
      'sensor', 'location', 'status', 'state', 'position', 
      'temperature', 'pressure', 'detected', 'arrived'
    ];
    
    const nameLower = propertyName.toLowerCase();
    return reactivePatterhs.some(pattern => nameLower.includes(pattern));
  }

  /**
   * Infer capabilities from component structure
   */
  inferCapabilities(component) {
    const capabilities = [];
    
    if (component.ports) {
      const portNames = Object.keys(component.ports).join(' ').toLowerCase();
      
      if (portNames.includes('command')) capabilities.push('controllable');
      if (portNames.includes('sensor')) capabilities.push('sensing');
      if (portNames.includes('notification')) capabilities.push('notifying');
      if (portNames.includes('motor') || portNames.includes('actuator')) capabilities.push('actuating');
      if (portNames.includes('data')) capabilities.push('data_processing');
    }
    
    if (component.activities) {
      capabilities.push('executable');
    }
    
    return capabilities;
  }

  /**
   * Detect event patterns from model connections and activities
   */
  detectEventPatterns(model) {
    const patterns = [];
    
    // From connectors
    if (model.connectors) {
      for (const [connName, connector] of Object.entries(model.connectors)) {
        patterns.push({
          name: connName,
          type: 'connection',
          pattern: this.inferConnectionPattern(connector),
          reactive: true
        });
      }
    }
    
    // From events definitions
    if (model.events) {
      for (const [eventName, eventDef] of Object.entries(model.events)) {
        if (eventDef.rules) {
          for (const rule of eventDef.rules) {
            patterns.push({
              name: rule.trigger || eventName,
              type: 'event_rule',
              pattern: rule.trigger,
              reactive: true
            });
          }
        }
      }
    }
    
    return patterns;
  }

  /**
   * Infer connection pattern type
   */
  inferConnectionPattern(connector) {
    const name = connector.name || '';
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('notify') || nameLower.includes('notification')) {
      return 'notification';
    }
    if (nameLower.includes('command') || nameLower.includes('control')) {
      return 'command';
    }
    if (nameLower.includes('data') || nameLower.includes('sensor')) {
      return 'data_flow';
    }
    
    return 'generic';
  }

  /**
   * Detect physics behaviors from activities and flows
   */
  detectPhysicsBehaviors(model) {
    const behaviors = [];
    
    // Movement behaviors
    if (this.hasMovementIndicators(model)) {
      behaviors.push({
        type: 'movement',
        properties: ['location', 'position', 'destination'],
        rules: this.generateMovementRules()
      });
    }
    
    // Processing behaviors
    if (this.hasProcessingIndicators(model)) {
      behaviors.push({
        type: 'processing',
        properties: ['status', 'progress', 'completion'],
        rules: this.generateProcessingRules()
      });
    }
    
    // Environmental behaviors (temperature, etc.)
    if (this.hasEnvironmentalIndicators(model)) {
      behaviors.push({
        type: 'environmental',
        properties: ['temperature', 'humidity', 'pressure'],
        rules: this.generateEnvironmentalRules()
      });
    }
    
    return behaviors;
  }

  hasMovementIndicators(model) {
    const text = JSON.stringify(model).toLowerCase();
    return ['location', 'position', 'move', 'travel', 'station'].some(term => text.includes(term));
  }

  hasProcessingIndicators(model) {
    const text = JSON.stringify(model).toLowerCase();
    return ['load', 'unload', 'process', 'assembly', 'production'].some(term => text.includes(term));
  }

  hasEnvironmentalIndicators(model) {
    const text = JSON.stringify(model).toLowerCase();
    return ['temperature', 'sensor', 'environmental', 'climate'].some(term => text.includes(term));
  }

  generateMovementRules() {
    return {
      travel_time: 'distance * speed_factor',
      energy_consumption: 'travel_time * energy_rate',
      path_validation: 'check_valid_path(from, to)'
    };
  }

  generateProcessingRules() {
    return {
      processing_time: 'operation_complexity * time_factor', 
      resource_consumption: 'processing_time * resource_rate',
      success_validation: 'check_operation_constraints()'
    };
  }

  generateEnvironmentalRules() {
    return {
      sensor_accuracy: 'base_accuracy - noise_factor',
      response_time: 'sensor_delay + processing_delay',
      environmental_change: 'apply_physics_model()'
    };
  }

  /**
   * Generate reactive conditions automatically
   */
  generateReactiveConditions(analysis) {
    const conditions = [];
    
    // Generate conditions for reactive properties
    for (const entity of analysis.entities) {
      for (const property of entity.properties) {
        if (property.reactive) {
          conditions.push({
            name: `${entity.name}_${property.name}_change`,
            expression: `${entity.name}.${property.name}`,
            description: `Monitor changes in ${entity.name} ${property.name}`
          });
        }
      }
    }
    
    // Generate cross-entity conditions
    const reactiveEntities = analysis.entities.filter(e => 
      e.properties.some(p => p.reactive && p.type === 'sensor')
    );
    
    const locationEntities = analysis.entities.filter(e =>
      e.properties.some(p => p.type === 'location')
    );
    
    for (const sensorEntity of reactiveEntities) {
      for (const locationEntity of locationEntities) {
        conditions.push({
          name: `${sensorEntity.name}_at_${locationEntity.name}`,
          expression: `${sensorEntity.name}.sensor == ${locationEntity.name}.signal`,
          description: `Detect when ${sensorEntity.name} is at ${locationEntity.name}`
        });
      }
    }
    
    return conditions;
  }
}

module.exports = { GenericDomainAnalyzer };
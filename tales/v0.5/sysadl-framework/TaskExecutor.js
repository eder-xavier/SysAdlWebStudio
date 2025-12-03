// Generic Task Executor for SysADL Framework
// Handles all task execution logic in a reusable way (not SysADL behavioral Actions)

const { ConnectionExecutor } = require('./ConnectionExecutor');

class TaskExecutor {
  constructor(context) {
    this.context = context;
    this.logger = context.sysadlBase?.logger || console;
    this.connectionExecutor = new ConnectionExecutor(context);
  }

  /**
   * Executes a task with generic infrastructure handling
   * @param {string} taskName - Name of the task being executed
   * @param {Function} taskLogic - Function containing the specific task logic
   * @param {Array} connections - Optional connections to execute after task
   * @returns {Object} Standard task result
   */
  executeTask(taskName, taskLogic, connections = []) {
    this.logger.log(`🎬 Executing task: ${taskName}`);
    
    try {
      // Execute the specific task logic
      const taskResult = taskLogic(this.context);
      
      // Execute any connections specified
      const connectionResults = [];
      for (const conn of connections) {
        const result = this.connectionExecutor.executeConnection(
          conn.type, 
          conn.from, 
          conn.to, 
          conn.parameters
        );
        connectionResults.push(result);
      }
      
      return {
        task: taskName,
        status: 'executed',
        context: this.context,
        taskResult,
        connectionResults
      };
    } catch (error) {
      this.logger.error(`❌ Error executing task ${taskName}:`, error);
      return {
        task: taskName,
        status: 'failed',
        error: error.message,
        context: this.context
      };
    }
  }

  /**
   * Executes a property assignment task
   * @param {string} taskName - Name of the task
   * @param {Object} assignments - Object with property assignments {entity.property: value}
   * @param {Array} connections - Optional connections to execute
   */
  executePropertyAssignment(taskName, assignments, connections = []) {
    const taskLogic = (context) => {
      const results = {};
      for (const [propertyPath, value] of Object.entries(assignments)) {
        try {
          // Parse entity.property.subprop format
          const parts = propertyPath.split('.');
          let target = context;
          
          // Navigate to the parent object
          for (let i = 0; i < parts.length - 1; i++) {
            if (!target[parts[i]]) {
              target[parts[i]] = {};
            }
            target = target[parts[i]];
          }
          
          // Set the final property
          const finalProp = parts[parts.length - 1];
          target[finalProp] = value;
          results[propertyPath] = value;
        } catch (error) {
          this.logger.warn(`⚠️ Failed to set ${propertyPath} = ${value}:`, error.message);
          results[propertyPath] = { error: error.message };
        }
      }
      return results;
    };

    return this.executeTask(taskName, taskLogic, connections);
  }

  /**
   * Generic connection-based task execution (replaces model-specific methods)
   * @param {string} taskName - Name of the task
   * @param {string} fromEntity - Source entity
   * @param {string} toEntity - Target entity  
   * @param {Object} properties - Properties to set before connection
   * @param {string} connectionType - Type of connection to execute
   */
  executeConnectionTask(taskName, fromEntity, toEntity, properties, connectionType) {
    const assignments = {};
    
    // Build property assignments dynamically
    for (const [key, value] of Object.entries(properties || {})) {
      assignments[`${fromEntity}.${key}`] = value;
    }
    
    const connections = [{
      type: connectionType,
      from: fromEntity,
      to: toEntity
    }];

    return this.executePropertyAssignment(taskName, assignments, connections);
  }
}

module.exports = { TaskExecutor };
// Generic Connection Executor for SysADL Framework
// Handles all connection execution logic in a reusable way

class ConnectionExecutor {
  constructor(context) {
    this.context = context;
    this.logger = context.sysadlBase?.logger || console;
  }

  /**
   * Executes a connection between two entities
   * @param {string} connectionName - Name of the connection type (e.g., 'Command', 'Notify')
   * @param {string} fromEntity - Source entity name
   * @param {string} toEntity - Target entity name
   * @param {Object} parameters - Optional connection parameters
   */
  executeConnection(connectionName, fromEntity, toEntity, parameters = {}) {
    // Try to find connection definitions in context
    let connectionDef = null;
    
    // First check if connections are provided directly in context
    if (this.context.connections && this.context.connections[connectionName]) {
      connectionDef = this.context.connections[connectionName];
    } 
    // Then check in environment connections
    else if (this.context.environment?.connections) {
      connectionDef = this.context.environment.connections.find(c => c.name === connectionName);
    }
    
    if (!connectionDef) {
      this.logger.warn(`⚠️ Connection ${connectionName} not found - creating generic connection`);
      // Create a generic connection that just logs
      connectionDef = {
        name: connectionName,
        execute: (from, to, context) => {
          this.logger.log(`🔗 Generic connection ${connectionName}: ${from} → ${to}`);
          return { status: 'success', connection: connectionName };
        }
      };
    }

    const fromEntityObj = this.context.entities?.[fromEntity];
    const toEntityObj = this.context.entities?.[toEntity];

    if (!fromEntityObj || !toEntityObj) {
      this.logger.warn(`⚠️ Connection ${connectionName}: entities not found:`, fromEntity, toEntity);
      // Still execute if connection has execute function
      if (typeof connectionDef.execute === 'function') {
        return connectionDef.execute(fromEntity, toEntity, this.context);
      }
      return { success: false, error: 'Entities not found' };
    }

    this.logger.log(`🔗 Executing connection ${connectionName} from ${fromEntityObj.name || fromEntity} to ${toEntityObj.name || toEntity}`);

    // Execute the connection
    if (typeof connectionDef.execute === 'function') {
      const result = connectionDef.execute(fromEntityObj, toEntityObj, this.context);
      return result || { success: true, connection: connectionName };
    }

    // Fallback to message passing
    if (connectionDef.from && connectionDef.to) {
      const fromRole = connectionDef.from.split('.')[1];
      const toRole = connectionDef.to.split('.')[1];
      
      this.logger.log(`📨 Message flow: ${fromEntity}.${fromRole} -> ${toEntity}.${toRole}`);
      
      // Trigger event or callback if available
      if (typeof toEntityObj.receiveMessage === 'function') {
        toEntityObj.receiveMessage(fromEntity, fromRole, this.context);
      }
      if (typeof this.context.onConnectionExecuted === 'function') {
        this.context.onConnectionExecuted(connectionDef, fromEntity, toEntity, this.context);
      }

      return { 
        success: true, 
        connectionName, 
        fromRole, 
        toRole,
        parameters 
      };
    }

    return { success: false, error: 'Invalid connection definition' };
  }

  /**
   * Executes multiple connections in sequence
   */
  executeConnections(connections) {
    const results = [];
    for (const conn of connections) {
      const result = this.executeConnection(conn.name, conn.from, conn.to, conn.parameters);
      results.push(result);
    }
    return results;
  }
}

module.exports = { ConnectionExecutor };
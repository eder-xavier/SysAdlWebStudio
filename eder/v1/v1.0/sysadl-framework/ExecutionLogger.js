/**
 * Execution Logger for SysADL
 * 
 * Automatic comprehensive logging system that tracks every SysADL element execution
 * including events, scenes, scenarios, conditions, and performance metrics.
 * 
 * Features:
 * - Automatic logging of all SysADL elements
 * - Comprehensive execution reports
 * - Performance metrics and analysis
 * - JSON log format for analysis
 * - Real-time monitoring capabilities
 * - Memory and CPU usage tracking
 */

const fs = require('fs').promises;
const path = require('path');

class ExecutionLogger {
  constructor(modelName, options = {}) {
    this.modelName = modelName;
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    
    // Configuration
    this.config = {
      logLevel: options.logLevel || 'detailed', // 'minimal', 'standard', 'detailed', 'verbose'
      enableFileLogging: options.enableFileLogging !== false,
      enableConsoleLogging: options.enableConsoleLogging !== false,
      logDirectory: options.logDirectory || './logs',
      maxLogFileSize: options.maxLogFileSize || 50 * 1024 * 1024, // 50MB
      maxLogFiles: options.maxLogFiles || 10,
      enablePerformanceTracking: options.enablePerformanceTracking !== false,
      enableMemoryTracking: options.enableMemoryTracking !== false,
      flushInterval: options.flushInterval || 5000 // 5 seconds
    };

    // Execution log storage
    this.executionLog = [];
    this.sessionMetrics = {
      totalExecutions: 0,
      executionsByType: {},
      executionsByResult: {},
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      peakMemoryUsage: 0,
      totalMemoryUsage: 0,
      errorCount: 0,
      warningCount: 0
    };

    // Performance tracking
    this.performanceMarkers = new Map();
    this.activeExecutions = new Map();

    // Initialize logging
    this.initializeLogging();

    console.log(`📊 ExecutionLogger initialized for model: ${modelName}`);
    console.log(`   Session ID: ${this.sessionId}`);
    console.log(`   Log level: ${this.config.logLevel}`);
  }

  /**
   * Initialize logging system
   */
  async initializeLogging() {
    try {
      // Create log directory if it doesn't exist
      if (this.config.enableFileLogging) {
        await this.ensureLogDirectory();
      }

      // Start periodic flush
      this.startPeriodicFlush();

      // Log session start
      this.logExecution({
        type: 'session_start',
        name: 'ExecutionLogger',
        path: `Session.${this.sessionId}`,
        result: 'started',
        sessionInfo: {
          modelName: this.modelName,
          sessionId: this.sessionId,
          startTime: this.startTime,
          logLevel: this.config.logLevel
        }
      });

    } catch (error) {
      console.error('Failed to initialize logging:', error);
    }
  }

  /**
   * Log execution of any SysADL element
   */
  logExecution(elementInfo) {
    const timestamp = Date.now();
    const executionTime = timestamp - this.startTime;
    const executionId = this.generateExecutionId();

    // Create comprehensive log entry
    const logEntry = {
      // Basic identification
      executionId,
      sessionId: this.sessionId,
      timestamp,
      executionTime,
      
      // Element information
      elementType: elementInfo.type || 'unknown',
      elementName: elementInfo.name || 'unnamed',
      elementPath: elementInfo.path || '',
      
      // State information
      initialState: elementInfo.initialState || null,
      finalState: elementInfo.finalState || null,
      stateChanges: elementInfo.stateChanges || [],
      
      // Execution context
      triggerEvent: elementInfo.trigger || null,
      executionResult: elementInfo.result || 'unknown',
      executionDuration: elementInfo.duration || 0,
      
      // Conditions and validations
      preConditions: elementInfo.preConditions || [],
      postConditions: elementInfo.postConditions || [],
      conditionResults: elementInfo.conditionResults || [],
      
      // Event chain information
      parentExecution: elementInfo.parent || null,
      childExecutions: elementInfo.children || [],
      eventChain: elementInfo.eventChain || [],
      
      // Error and warning information
      errors: elementInfo.errors || [],
      warnings: elementInfo.warnings || [],
      
      // Performance metrics
      memoryUsage: this.config.enableMemoryTracking ? this.getMemoryUsage() : null,
      cpuUsage: this.config.enablePerformanceTracking ? this.getCpuUsage() : null,
      
      // Additional metadata
      metadata: elementInfo.metadata || {},
      
      // Retry information
      retryCount: elementInfo.retryCount || 0,
      isRetry: elementInfo.isRetry || false
    };

    // Add to execution log
    this.executionLog.push(logEntry);
    
    // Update metrics
    this.updateMetrics(logEntry);
    
    // Write to outputs based on configuration
    this.writeLogEntry(logEntry);
    
    // Console output for real-time monitoring
    if (this.config.enableConsoleLogging) {
      this.writeConsoleLog(logEntry);
    }

    return logEntry;
  }

  /**
   * Start performance marker
   */
  startPerformanceMarker(markerId, description = '') {
    if (!this.config.enablePerformanceTracking) return;

    const marker = {
      markerId,
      description,
      startTime: Date.now(),
      startMemory: this.getMemoryUsage(),
      startCpu: this.getCpuUsage()
    };

    this.performanceMarkers.set(markerId, marker);
    return marker;
  }

  /**
   * End performance marker and get metrics
   */
  endPerformanceMarker(markerId) {
    if (!this.config.enablePerformanceTracking) return null;

    const marker = this.performanceMarkers.get(markerId);
    if (!marker) return null;

    const endTime = Date.now();
    const endMemory = this.getMemoryUsage();
    const endCpu = this.getCpuUsage();

    const metrics = {
      markerId: marker.markerId,
      description: marker.description,
      duration: endTime - marker.startTime,
      memoryDelta: endMemory ? {
        heapUsed: endMemory.heapUsed - marker.startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - marker.startMemory.heapTotal,
        external: endMemory.external - marker.startMemory.external
      } : null,
      cpuDelta: endCpu ? {
        user: endCpu.user - marker.startCpu.user,
        system: endCpu.system - marker.startCpu.system
      } : null
    };

    this.performanceMarkers.delete(markerId);
    
    // Log performance metrics
    this.logExecution({
      type: 'performance_marker',
      name: markerId,
      path: `Performance.${markerId}`,
      result: 'measured',
      metadata: metrics
    });

    return metrics;
  }

  /**
   * Generate detailed execution report
   */
  generateReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;

    return {
      sessionInfo: {
        modelName: this.modelName,
        sessionId: this.sessionId,
        startTime: this.startTime,
        endTime,
        totalDuration,
        totalExecutions: this.executionLog.length
      },
      
      executionSummary: {
        byElementType: this.groupByElementType(),
        byResult: this.groupByResult(),
        performanceMetrics: this.calculatePerformanceMetrics(),
        errorSummary: this.extractErrors(),
        warningSummary: this.extractWarnings(),
        stateChangeSummary: this.extractStateChanges()
      },
      
      detailedLog: this.config.logLevel === 'verbose' ? this.executionLog : this.executionLog.slice(-100),
      
      analysisRecommendations: this.generateRecommendations(),
      
      systemMetrics: {
        peakMemoryUsage: this.sessionMetrics.peakMemoryUsage,
        averageExecutionTime: this.sessionMetrics.averageExecutionTime,
        errorRate: this.sessionMetrics.totalExecutions > 0 
          ? (this.sessionMetrics.errorCount / this.sessionMetrics.totalExecutions * 100).toFixed(2) + '%'
          : '0%',
        successRate: this.sessionMetrics.totalExecutions > 0
          ? ((this.sessionMetrics.totalExecutions - this.sessionMetrics.errorCount) / this.sessionMetrics.totalExecutions * 100).toFixed(2) + '%'
          : '100%'
      }
    };
  }

  /**
   * Group executions by element type
   */
  groupByElementType() {
    const groups = {};
    
    this.executionLog.forEach(entry => {
      const type = entry.elementType;
      if (!groups[type]) {
        groups[type] = {
          count: 0,
          totalDuration: 0,
          averageDuration: 0,
          successCount: 0,
          failureCount: 0
        };
      }
      
      groups[type].count++;
      groups[type].totalDuration += entry.executionDuration;
      
      if (entry.executionResult === 'success') {
        groups[type].successCount++;
      } else if (entry.executionResult === 'failure' || entry.executionResult === 'error') {
        groups[type].failureCount++;
      }
    });

    // Calculate averages
    Object.keys(groups).forEach(type => {
      const group = groups[type];
      group.averageDuration = group.count > 0 ? group.totalDuration / group.count : 0;
      group.successRate = group.count > 0 ? (group.successCount / group.count * 100).toFixed(2) + '%' : '0%';
    });

    return groups;
  }

  /**
   * Group executions by result
   */
  groupByResult() {
    const groups = {};
    
    this.executionLog.forEach(entry => {
      const result = entry.executionResult;
      if (!groups[result]) {
        groups[result] = { count: 0, percentage: 0 };
      }
      groups[result].count++;
    });

    // Calculate percentages
    const total = this.executionLog.length;
    Object.keys(groups).forEach(result => {
      groups[result].percentage = total > 0 ? (groups[result].count / total * 100).toFixed(2) + '%' : '0%';
    });

    return groups;
  }

  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics() {
    if (this.executionLog.length === 0) {
      return { message: 'No executions recorded' };
    }

    const durations = this.executionLog
      .filter(entry => entry.executionDuration > 0)
      .map(entry => entry.executionDuration);

    if (durations.length === 0) {
      return { message: 'No duration data available' };
    }

    durations.sort((a, b) => a - b);

    return {
      totalExecutions: this.executionLog.length,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      medianDuration: durations[Math.floor(durations.length / 2)],
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      p99Duration: durations[Math.floor(durations.length * 0.99)]
    };
  }

  /**
   * Extract errors and group them
   */
  extractErrors() {
    const errors = {};
    
    this.executionLog.forEach(entry => {
      if (entry.errors && entry.errors.length > 0) {
        entry.errors.forEach(error => {
          if (!errors[error]) {
            errors[error] = { count: 0, firstOccurrence: entry.timestamp, lastOccurrence: entry.timestamp };
          }
          errors[error].count++;
          errors[error].lastOccurrence = entry.timestamp;
        });
      }
    });

    return errors;
  }

  /**
   * Extract warnings and group them
   */
  extractWarnings() {
    const warnings = {};
    
    this.executionLog.forEach(entry => {
      if (entry.warnings && entry.warnings.length > 0) {
        entry.warnings.forEach(warning => {
          if (!warnings[warning]) {
            warnings[warning] = { count: 0, firstOccurrence: entry.timestamp, lastOccurrence: entry.timestamp };
          }
          warnings[warning].count++;
          warnings[warning].lastOccurrence = entry.timestamp;
        });
      }
    });

    return warnings;
  }

  /**
   * Extract state changes summary
   */
  extractStateChanges() {
    const stateChanges = {};
    
    this.executionLog.forEach(entry => {
      if (entry.stateChanges && entry.stateChanges.length > 0) {
        entry.stateChanges.forEach(change => {
          const key = `${change.entity}.${change.property}`;
          if (!stateChanges[key]) {
            stateChanges[key] = { count: 0, values: new Set() };
          }
          stateChanges[key].count++;
          stateChanges[key].values.add(change.to);
        });
      }
    });

    // Convert sets to arrays
    Object.keys(stateChanges).forEach(key => {
      stateChanges[key].uniqueValues = Array.from(stateChanges[key].values);
      delete stateChanges[key].values;
    });

    return stateChanges;
  }

  /**
   * Generate analysis recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const metrics = this.calculatePerformanceMetrics();
    const errorSummary = this.extractErrors();

    // Performance recommendations
    if (metrics.averageDuration > 1000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `Average execution time is high (${metrics.averageDuration.toFixed(2)}ms). Consider optimizing slow operations.`
      });
    }

    // Error recommendations
    const errorCount = Object.keys(errorSummary).length;
    if (errorCount > 0) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: `${errorCount} unique error types detected. Review error handling and validation.`
      });
    }

    // Memory recommendations
    if (this.sessionMetrics.peakMemoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        message: `Peak memory usage is high (${(this.sessionMetrics.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB). Monitor for memory leaks.`
      });
    }

    return recommendations;
  }

  /**
   * Update session metrics
   */
  updateMetrics(logEntry) {
    this.sessionMetrics.totalExecutions++;
    
    // Update by type
    const type = logEntry.elementType;
    if (!this.sessionMetrics.executionsByType[type]) {
      this.sessionMetrics.executionsByType[type] = 0;
    }
    this.sessionMetrics.executionsByType[type]++;
    
    // Update by result
    const result = logEntry.executionResult;
    if (!this.sessionMetrics.executionsByResult[result]) {
      this.sessionMetrics.executionsByResult[result] = 0;
    }
    this.sessionMetrics.executionsByResult[result]++;
    
    // Update timing
    if (logEntry.executionDuration > 0) {
      this.sessionMetrics.totalExecutionTime += logEntry.executionDuration;
      this.sessionMetrics.averageExecutionTime = 
        this.sessionMetrics.totalExecutionTime / this.sessionMetrics.totalExecutions;
    }
    
    // Update memory
    if (logEntry.memoryUsage && logEntry.memoryUsage.heapUsed > this.sessionMetrics.peakMemoryUsage) {
      this.sessionMetrics.peakMemoryUsage = logEntry.memoryUsage.heapUsed;
    }
    
    // Update error/warning counts
    if (logEntry.errors && logEntry.errors.length > 0) {
      this.sessionMetrics.errorCount++;
    }
    if (logEntry.warnings && logEntry.warnings.length > 0) {
      this.sessionMetrics.warningCount++;
    }
  }

  /**
   * Write log entry to appropriate outputs
   */
  async writeLogEntry(logEntry) {
    if (this.config.enableFileLogging) {
      try {
        await this.writeToFile(logEntry);
      } catch (error) {
        console.error('Failed to write log to file:', error);
      }
    }
  }

  /**
   * Write console log
   */
  writeConsoleLog(logEntry) {
    const timestamp = this.formatTimestamp(logEntry.timestamp);
    const duration = logEntry.executionDuration > 0 ? ` (${logEntry.executionDuration}ms)` : '';
    const result = this.getResultEmoji(logEntry.executionResult);
    
    console.log(`[${timestamp}] ${result} ${logEntry.elementType}:${logEntry.elementName}${duration}`);
  }

  /**
   * Write to log file
   */
  async writeToFile(logEntry) {
    const logFileName = `sysadl-execution-${this.sessionId}.jsonl`;
    const logFilePath = path.join(this.config.logDirectory, logFileName);
    
    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      await fs.appendFile(logFilePath, logLine);
    } catch (error) {
      // Create directory and try again
      await this.ensureLogDirectory();
      await fs.appendFile(logFilePath, logLine);
    }
  }

  /**
   * Ensure log directory exists
   */
  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.config.logDirectory, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Start periodic flush
   */
  startPeriodicFlush() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Flush any pending operations
   */
  async flush() {
    // Could implement buffered writing here if needed
    // For now, logs are written immediately
  }

  /**
   * Utility functions
   */
  generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${this.modelName}-${timestamp}-${random}`;
  }

  generateExecutionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `exec_${timestamp}_${random}`;
  }

  formatTimestamp(timestamp) {
    return new Date(timestamp).toISOString().substring(11, 23); // HH:mm:ss.SSS
  }

  getResultEmoji(result) {
    const emojis = {
      'success': '✅',
      'failure': '❌',
      'error': '💥',
      'warning': '⚠️',
      'started': '🚀',
      'completed': '🏁',
      'timeout': '⏰',
      'retry': '🔄'
    };
    return emojis[result] || '📝';
  }

  getMemoryUsage() {
    if (!this.config.enableMemoryTracking) return null;
    
    try {
      return process.memoryUsage();
    } catch (error) {
      return null;
    }
  }

  getCpuUsage() {
    if (!this.config.enablePerformanceTracking) return null;
    
    try {
      return process.cpuUsage();
    } catch (error) {
      return null;
    }
  }

  /**
   * Save final report to file
   */
  async saveReport(filePath = null) {
    if (!filePath) {
      filePath = path.join(this.config.logDirectory, `sysadl-report-${this.sessionId}.json`);
    }

    const report = this.generateReport();
    
    try {
      await this.ensureLogDirectory();
      await fs.writeFile(filePath, JSON.stringify(report, null, 2));
      console.log(`📊 Execution report saved: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('Failed to save report:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Log session end
    this.logExecution({
      type: 'session_end',
      name: 'ExecutionLogger',
      path: `Session.${this.sessionId}`,
      result: 'completed',
      duration: Date.now() - this.startTime,
      metadata: this.sessionMetrics
    });
  }
}

module.exports = { ExecutionLogger };
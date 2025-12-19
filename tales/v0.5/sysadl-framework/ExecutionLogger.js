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
const { LOG_PREFIXES, getConsolePrefix, formatConsoleMessage } = require('./LoggingConstants');

class ExecutionLogger {
  constructor(modelName, options = {}) {
    this.modelName = modelName;
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.sequenceCounter = 0;

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

    console.log(`${LOG_PREFIXES.START} ExecutionLogger initialized for model: ${modelName}`);
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
   * Format relative time in mm:ss.SSS format
   */
  formatRelativeTime(timestamp) {
    const elapsed = timestamp - this.startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const ms = elapsed % 1000;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }

  /**
   * Determine detail level for event type
   * Hybrid approach: verbose for structural events, compact for others
   */
  getDetailLevel(elementType) {
    if (!elementType) return 'compact';

    const verboseTypes = [
      'scenario.started', 'scenario.completed', 'scenario.execution',
      'scene.completed',
      'preconditions.validated', 'postconditions.validated',
      'validation', 'error', 'warning'
    ];

    return verboseTypes.some(type => elementType.includes(type)) ? 'verbose' : 'compact';
  }

  /**
   * Generate human-readable summary from event data
   */
  generateSummary(elementType, elementName, context) {
    if (!elementType) return `${elementName || 'Event'}`;

    const templates = {
      'scenario.started': (name) => `Starting scenario: ${name}`,
      'scenario.completed': (name, ctx) => `Scenario ${name} completed ${ctx?.result || 'successfully'}`,
      'scenario.execution.started': (name) => `Starting scenario execution: ${name}`,
      'scenario.execution.completed': (name) => `Scenario execution ${name} completed`,

      'scene.started': (name) => `Executing scene: ${name}`,
      'scene.completed': (name, ctx) => `Scene ${name} completed in ${ctx?.duration || '?'}ms`,
      'scene.preconditions.validated': (name, ctx) => `Scene ${name} pre-conditions ${ctx?.result || 'validated'}`,
      'scene.postconditions.validated': (name, ctx) => `Scene ${name} post-conditions ${ctx?.result || 'validated'}`,

      'entity.property.changed': (name, ctx) =>
        `${name} changed ${ctx?.property || 'property'} to ${ctx?.to !== undefined ? ctx.to : '?'}`,
      'entity.role.updated': (name, ctx) =>
        `${name} updated role ${ctx?.role || 'role'} to ${ctx?.value !== undefined ? ctx.value : '?'}`,

      'event.triggered': (name, ctx) =>
        `Event ${ctx?.event || name} triggered${ctx?.entity ? ` on ${ctx.entity}` : ''}`,
      'event.completed': (name) => `Event ${name} completed`,
      'event.injected': (name, ctx) =>
        ctx?.injectionType === 'when'
          ? `Event ${name} injected by reactive condition`
          : `Event ${name} injected after ${ctx?.afterScene || 'scene'}`,
      'event.injection.registered': (name, ctx) =>
        `Registered event injection: ${name} ${ctx?.injectionType || ''}`,

      'connection.activated': (name, ctx) =>
        `EnvConnector ${name}: ${ctx?.from || '?'} → ${ctx?.to || '?'}`,

      'environment.initialized': (name, ctx) =>
        `Environment ${name} initialized with ${ctx?.entities || 0} entities`
    };

    const template = templates[elementType];
    return template ? template(elementName, context) : `${elementType}: ${elementName}`;
  }

  /**
   * Compact context for non-verbose events
   */
  compactContext(context) {
    if (!context || typeof context !== 'object') return context;

    // Keep only essential fields
    const essential = {};
    const essentialFields = [
      'property', 'from', 'to', 'value',
      'event', 'entity', 'role',
      'result', 'duration',
      'injectionType', 'afterScene', 'condition'
    ];

    for (const field of essentialFields) {
      if (context[field] !== undefined) {
        essential[field] = context[field];
      }
    }

    return Object.keys(essential).length > 0 ? essential : context;
  }

  /**
   * Select metadata fields based on event type
   */
  selectMetadata(elementType, elementInfo) {
    const metadata = {};

    // If trace was passed explicitly in elementInfo, use it directly
    if (elementInfo.trace && typeof elementInfo.trace === 'object' && Object.keys(elementInfo.trace).length > 0) {
      // Debug: log when trace is found
      // console.log('[DEBUG] Trace found:', elementInfo.trace);
      metadata.trace = elementInfo.trace;
    } else {
      // Core trace fields for structural events (build from root-level fields)
      if (elementType && (
        elementType.includes('scenario') ||
        elementType.includes('scene') ||
        elementType.includes('validation')
      )) {
        metadata.trace = {};

        if (elementInfo.parent) metadata.trace.parent = elementInfo.parent;
        if (elementInfo.scenario) metadata.trace.scenario = elementInfo.scenario;
        if (elementInfo.scene) metadata.trace.scene = elementInfo.scene;
        if (elementInfo.causedBy) metadata.trace.causedBy = elementInfo.causedBy;
      }
    }

    // Metrics for completion events
    if (elementType && elementType.includes('completed')) {
      if (elementInfo.duration !== undefined || elementInfo.context?.duration !== undefined) {
        metadata.metrics = {
          duration: elementInfo.duration || elementInfo.context?.duration || 0
        };

        if (elementInfo.context?.eventsProcessed) {
          metadata.metrics.eventsProcessed = elementInfo.context.eventsProcessed;
        }
        if (elementInfo.context?.scenesExecuted) {
          metadata.metrics.scenesExecuted = elementInfo.context.scenesExecuted;
        }
      }
    }

    // Validation details
    if (elementType && elementType.includes('validation')) {
      if (elementInfo.context?.checks || elementInfo.context?.result) {
        metadata.validation = {
          result: elementInfo.context?.result || 'unknown',
          checks: elementInfo.context?.checks || []
        };
      }
    }

    // Error details
    if (elementType && (elementType.includes('error') || elementInfo.errors?.length > 0)) {
      metadata.error = {
        code: elementInfo.error?.code || 'UNKNOWN_ERROR',
        message: elementInfo.errors?.[0] || elementInfo.error?.message || 'An error occurred'
      };
    }

    return metadata;
  }

  /**
   * Log execution of any SysADL element (Narrative Format)
   */
  logExecution(elementInfo) {
    const timestamp = Date.now();
    const elementType = elementInfo.type || 'unknown';
    const elementName = elementInfo.name || 'unnamed';

    // Determine detail level for this event
    const detailLevel = this.getDetailLevel(elementType);

    // Build narrative log entry
    const logEntry = {
      // Core fields (always present)
      seq: ++this.sequenceCounter,
      when: this.formatRelativeTime(timestamp),
      timestamp,
      what: elementType,
      who: elementName,
      summary: this.generateSummary(elementType, elementName, elementInfo.context || {}),

      // Context (full or compact based on detail level)
      context: detailLevel === 'verbose'
        ? (elementInfo.context || {})
        : this.compactContext(elementInfo.context || {}),

      // Selective metadata based on event type
      ...this.selectMetadata(elementType, elementInfo)
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
   * Alias for logExecution to support generated code expecting 'log'
   */
  log(info) {
    return this.logExecution(info);
  }

  /**
   * Alias for logExecution with warning level
   */
  warn(message, context = {}) {
    return this.logExecution({
      type: 'warning',
      name: 'System',
      summary: message,
      context
    });
  }

  /**
   * Alias for logExecution with error level
   */
  error(message, context = {}) {
    return this.logExecution({
      type: 'error',
      name: 'System',
      summary: message,
      context
    });
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
  /**
   * Update session metrics (adapted for narrative format)
   */
  updateMetrics(logEntry) {
    this.sessionMetrics.totalExecutions++;

    // Update by type (using 'what' field)
    const type = logEntry.what;
    if (!this.sessionMetrics.executionsByType[type]) {
      this.sessionMetrics.executionsByType[type] = 0;
    }
    this.sessionMetrics.executionsByType[type]++;

    // Update by result (from context.result or validation.result)
    const result = logEntry.context?.result || logEntry.validation?.result || 'unknown';
    if (!this.sessionMetrics.executionsByResult[result]) {
      this.sessionMetrics.executionsByResult[result] = 0;
    }
    this.sessionMetrics.executionsByResult[result]++;

    // Update timing (from metrics.duration)
    const duration = logEntry.metrics?.duration || 0;
    if (duration > 0) {
      this.sessionMetrics.totalExecutionTime += duration;
      this.sessionMetrics.averageExecutionTime =
        this.sessionMetrics.totalExecutionTime / this.sessionMetrics.totalExecutions;
    }

    // Update memory (not tracked in narrative format by default)
    // Could be added as optional metadata if needed

    // Update error/warning counts (from error field or context)
    if (logEntry.error || logEntry.what.includes('error')) {
      this.sessionMetrics.errorCount++;
    }
    if (logEntry.what.includes('warning') || logEntry.context?.warnings) {
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
  /**
   * Write narrative log to console with text-only prefixes
   */
  writeConsoleLog(logEntry) {
    const message = formatConsoleMessage(
      logEntry.what,       // eventType
      logEntry.when,       // relative time
      logEntry.summary,    // human-readable summary
      logEntry.context     // context object
    );

    console.log(message);
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

  stop() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
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
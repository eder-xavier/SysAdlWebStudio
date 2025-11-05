/**
 * Logging Constants for SysADL
 * 
 * Text-only prefixes and constants (no emoji icons)
 * Ensures compatibility across all terminals, tools, and systems
 */

const LOG_PREFIXES = {
  OK: '[OK]',
  ERROR: '[ERROR]',
  WARN: '[WARN]',
  INFO: '[INFO]',
  START: '[START]',
  DONE: '[DONE]',
  TRIGGER: '[TRIGGER]',
  CHANGE: '[CHANGE]',
  EVENT: '[EVENT]',
  TEST: '[TEST]',
  REPORT: '[REPORT]',
  CONNECT: '[CONNECT]',
  DEBUG: '[DEBUG]'
};

const LOG_LEVELS = {
  error: 'ERROR',
  warning: 'WARN',
  info: 'INFO',
  success: 'OK',
  debug: 'DEBUG'
};

/**
 * Get console prefix for event type
 * Maps event types to appropriate text prefixes
 * 
 * @param {string} eventType - The type of event (e.g., 'scenario.started')
 * @returns {string} - Text prefix for console output
 */
function getConsolePrefix(eventType) {
  if (!eventType) return LOG_PREFIXES.INFO;
  
  const type = eventType.toLowerCase();
  
  // Error states
  if (type.includes('error') || type.includes('failed')) {
    return LOG_PREFIXES.ERROR;
  }
  
  // Warning states
  if (type.includes('warning') || type.includes('timeout')) {
    return LOG_PREFIXES.WARN;
  }
  
  // Start states
  if (type.includes('started') || type.includes('begin') || type.includes('initialized')) {
    return LOG_PREFIXES.START;
  }
  
  // Completion states
  if (type.includes('completed') || type.includes('finished') || type.includes('complete')) {
    return LOG_PREFIXES.DONE;
  }
  
  // Event injection and triggers
  if (type.includes('injected') || type.includes('inject')) {
    return LOG_PREFIXES.TRIGGER;
  }
  
  // State changes
  if (type.includes('changed') || type.includes('updated') || type.includes('modified')) {
    return LOG_PREFIXES.CHANGE;
  }
  
  // Event triggers
  if (type.includes('triggered') || type.includes('fired')) {
    return LOG_PREFIXES.EVENT;
  }
  
  // Connections
  if (type.includes('connection') || type.includes('activated')) {
    return LOG_PREFIXES.CONNECT;
  }
  
  // Default
  return LOG_PREFIXES.INFO;
}

/**
 * Get log level from event type
 * 
 * @param {string} eventType - The type of event
 * @returns {string} - Log level string
 */
function getLogLevel(eventType) {
  if (!eventType) return LOG_LEVELS.info;
  
  const type = eventType.toLowerCase();
  
  if (type.includes('error')) return LOG_LEVELS.error;
  if (type.includes('warning')) return LOG_LEVELS.warning;
  if (type.includes('completed') || type.includes('started')) return LOG_LEVELS.success;
  
  return LOG_LEVELS.info;
}

/**
 * Format console message with prefix
 * 
 * @param {string} eventType - The type of event
 * @param {string} message - The message to format
 * @returns {string} - Formatted console message
 */
function formatConsoleMessage(eventType, message) {
  const prefix = getConsolePrefix(eventType);
  return `${prefix} ${message}`;
}

module.exports = {
  LOG_PREFIXES,
  LOG_LEVELS,
  getConsolePrefix,
  getLogLevel,
  formatConsoleMessage
};

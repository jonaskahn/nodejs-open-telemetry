const telemetry = require('../middleware/telemetry');
const { trace } = require('@opentelemetry/api');
const moment = require('moment');

// In-memory log storage for demo purposes
const logs = [];

/**
 * Log levels
 */
const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

/**
 * Internal logging function
 * @private
 */
function _log(level, message, metadata = {}) {
  const timestamp = new Date();
  const log = {
    level,
    message,
    timestamp,
    metadata,
  };

  // Store log in memory
  logs.push(log);

  // Get current active span if available
  const currentSpan = trace.getActiveSpan();
  if (currentSpan) {
    // Add log as event to the current span
    currentSpan.addEvent('log', {
      'log.level': level,
      'log.message': message,
      'log.timestamp': timestamp.toISOString(),
      ...metadata,
    });
  }

  // Format the log for console output
  console.log(
    `[${timestamp.toISOString()}] [${level}] ${message}`,
    Object.keys(metadata).length ? metadata : ''
  );

  return log;
}

/**
 * Log error message
 */
function _logError(message, metadata = {}) {
  return _log(LOG_LEVELS.ERROR, message, metadata);
}

/**
 * Log warning message
 */
function _logWarning(message, metadata = {}) {
  return _log(LOG_LEVELS.WARN, message, metadata);
}

/**
 * Log info message
 */
function _logInfo(message, metadata = {}) {
  return _log(LOG_LEVELS.INFO, message, metadata);
}

/**
 * Log debug message
 */
function _logDebug(message, metadata = {}) {
  return _log(LOG_LEVELS.DEBUG, message, metadata);
}

/**
 * Get recent logs, optionally filtered by level
 */
function _getLogs(level, limit = 100) {
  let filteredLogs = logs;

  if (level) {
    filteredLogs = logs.filter(log => log.level === level);
  }

  return filteredLogs.slice(-limit);
}

/**
 * Get logs by level
 */
function _getLogsByLevel(level) {
  return logs.filter(log => log.level === level);
}

/**
 * Get logs within a time range
 */
function _getLogsByTimeRange(startTime, endTime) {
  return logs.filter(log => {
    const logTime = moment(log.timestamp, 'YYYY-MM-DD HH:mm:ss.SSS');
    return logTime.isBetween(startTime, endTime, null, '[]');
  });
}

// Wrap functions with OpenTelemetry tracing, using useParentSpan=true
// to ensure logging operations don't create new spans but use existing ones
const logError = telemetry.wrapWithSpan(
  _logError,
  'loggingService.logError',
  { 'log.type': 'error' },
  true
);

const logWarning = telemetry.wrapWithSpan(
  _logWarning,
  'loggingService.logWarning',
  { 'log.type': 'warning' },
  true
);

const logInfo = telemetry.wrapWithSpan(
  _logInfo,
  'loggingService.logInfo',
  { 'log.type': 'info' },
  true
);

const logDebug = telemetry.wrapWithSpan(
  _logDebug,
  'loggingService.logDebug',
  { 'log.type': 'debug' },
  true
);

const getLogs = telemetry.wrapWithSpan(_getLogs, 'loggingService.getLogs', {
  'log.operation': 'getLogs',
});

const getLogsByLevel = telemetry.wrapWithSpan(_getLogsByLevel, 'loggingService.getLogsByLevel', {
  'log.operation': 'getLogsByLevel',
});

const getLogsByTimeRange = telemetry.wrapWithSpan(
  _getLogsByTimeRange,
  'loggingService.getLogsByTimeRange',
  {
    'log.operation': 'getLogsByTimeRange',
  }
);

module.exports = {
  logError,
  logWarning,
  logInfo,
  logDebug,
  getLogs,
  getLogsByLevel,
  getLogsByTimeRange,
  LOG_LEVELS,
};

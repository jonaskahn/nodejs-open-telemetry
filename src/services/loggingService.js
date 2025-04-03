const moment = require('moment');

// In-memory log storage for demo purposes
const logs = [];
const MAX_LOGS = 1000;

/**
 * Log levels
 */
const LOG_LEVELS = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
};

/**
 * Core logging function
 */
function log(level, message, metadata = {}) {
  const timestamp = moment().format('YYYY-MM-DD HH:mm:ss.SSS');
  const logEntry = {
    timestamp,
    level,
    message,
    metadata,
  };

  // Store log
  logs.push(logEntry);

  // For demo purposes, keep only the last MAX_LOGS
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }

  // In a real system, this might write to a file or external logging service
  console.log(`[${timestamp}] [${level}] ${message}`);

  return logEntry;
}

/**
 * Log info level message
 */
function logInfo(message, metadata = {}) {
  return log(LOG_LEVELS.INFO, message, metadata);
}

/**
 * Log warning level message
 */
function logWarning(message, metadata = {}) {
  return log(LOG_LEVELS.WARNING, message, metadata);
}

/**
 * Log error level message
 */
function logError(message, metadata = {}) {
  return log(LOG_LEVELS.ERROR, message, metadata);
}

/**
 * Log debug level message
 */
function logDebug(message, metadata = {}) {
  return log(LOG_LEVELS.DEBUG, message, metadata);
}

/**
 * Get all logs
 */
function getLogs() {
  return [...logs];
}

/**
 * Get logs by level
 */
function getLogsByLevel(level) {
  return logs.filter(log => log.level === level);
}

/**
 * Get logs within a time range
 */
function getLogsByTimeRange(startTime, endTime) {
  return logs.filter(log => {
    const logTime = moment(log.timestamp, 'YYYY-MM-DD HH:mm:ss.SSS');
    return logTime.isBetween(startTime, endTime, null, '[]');
  });
}

module.exports = {
  logInfo,
  logWarning,
  logError,
  logDebug,
  getLogs,
  getLogsByLevel,
  getLogsByTimeRange,
  LOG_LEVELS,
};

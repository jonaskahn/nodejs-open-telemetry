const { v4: uuidv4 } = require('uuid');
const loggingService = require('./loggingService');
const notificationService = require('./notificationService');
const telemetry = require('../middleware/telemetry');

// Mock data storage
const dataStore = {};

/**
 * Store a data item
 */
function _storeData(data, userId) {
  const dataId = uuidv4();
  const timestamp = new Date();

  dataStore[dataId] = {
    id: dataId,
    data,
    userId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  loggingService.logInfo(`Data stored: ${dataId} for user: ${userId}`);
  return dataStore[dataId];
}

/**
 * Retrieve data by ID
 */
function _getDataById(dataId) {
  if (!dataStore[dataId]) {
    loggingService.logError(`Data not found: ${dataId}`);
    return null;
  }

  return dataStore[dataId];
}

/**
 * Update existing data
 */
function _updateData(dataId, newData) {
  if (!dataStore[dataId]) {
    loggingService.logError(`Cannot update, data not found: ${dataId}`);
    return null;
  }

  dataStore[dataId] = {
    ...dataStore[dataId],
    data: newData,
    updatedAt: new Date(),
  };

  // Notify about data update - using useParentSpan=true to maintain the same span
  notificationService.sendNotification(
    dataStore[dataId].userId,
    `Your data ${dataId} was updated successfully`
  );

  loggingService.logInfo(`Data updated: ${dataId}`);
  return dataStore[dataId];
}

/**
 * Get all data for a specific user
 */
function _getUserData(userId) {
  return Object.values(dataStore).filter(item => item.userId === userId);
}

/**
 * Create backup of all data
 */
function _createDataBackup() {
  const backupId = uuidv4();
  const backup = {
    id: backupId,
    data: { ...dataStore },
    timestamp: new Date(),
  };

  loggingService.logInfo(`Data backup created: ${backupId}`);
  return backup;
}

// Wrap all functions with OpenTelemetry tracing
const storeData = telemetry.wrapWithSpan(_storeData, 'dataService.storeData', {
  'data.operation': 'store',
});
const getDataById = telemetry.wrapWithSpan(_getDataById, 'dataService.getDataById', {
  'data.operation': 'retrieve',
});
const updateData = telemetry.wrapWithSpan(_updateData, 'dataService.updateData', {
  'data.operation': 'update',
});
const getUserData = telemetry.wrapWithSpan(_getUserData, 'dataService.getUserData', {
  'data.operation': 'list',
});
const createDataBackup = telemetry.wrapWithSpan(_createDataBackup, 'dataService.createDataBackup', {
  'data.operation': 'backup',
});

module.exports = {
  storeData,
  getDataById,
  updateData,
  getUserData,
  createDataBackup,
};

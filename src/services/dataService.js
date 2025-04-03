const { v4: uuidv4 } = require('uuid');
const loggingService = require('./loggingService');
const notificationService = require('./notificationService');

// Mock data storage
const dataStore = {};

/**
 * Store a data item
 */
function storeData(data, userId) {
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
function getDataById(dataId) {
  if (!dataStore[dataId]) {
    loggingService.logError(`Data not found: ${dataId}`);
    return null;
  }

  return dataStore[dataId];
}

/**
 * Update existing data
 */
function updateData(dataId, newData) {
  if (!dataStore[dataId]) {
    loggingService.logError(`Cannot update, data not found: ${dataId}`);
    return null;
  }

  dataStore[dataId] = {
    ...dataStore[dataId],
    data: newData,
    updatedAt: new Date(),
  };

  // Notify about data update
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
function getUserData(userId) {
  return Object.values(dataStore).filter(item => item.userId === userId);
}

/**
 * Create backup of all data
 */
function createDataBackup() {
  const backupId = uuidv4();
  const backup = {
    id: backupId,
    data: { ...dataStore },
    timestamp: new Date(),
  };

  loggingService.logInfo(`Data backup created: ${backupId}`);
  return backup;
}

module.exports = {
  storeData,
  getDataById,
  updateData,
  getUserData,
  createDataBackup,
};

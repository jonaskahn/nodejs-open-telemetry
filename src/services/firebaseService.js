const { v4: uuidv4 } = require('uuid');
const telemetry = require('../middleware/telemetry');
const loggingService = require('./loggingService');

// Mock firebase config
const FIREBASE_CONFIG = {
  apiKey: 'mock-api-key',
  projectId: 'mock-project-id',
  appId: 'mock-app-id',
};

/**
 * Initialize Firebase connection
 */
function _initializeFirebase() {
  return new Promise(resolve => {
    // Simulate connection delay
    const delay = Math.floor(Math.random() * (1500 - 1000 + 1)) + 1000;
    setTimeout(() => {
      loggingService.logInfo(`Firebase initialized with projectId: ${FIREBASE_CONFIG.projectId}`);
      resolve({
        success: true,
        projectId: FIREBASE_CONFIG.projectId,
        timestamp: new Date(),
      });
    }, delay);
  });
}

/**
 * Send push notification via Firebase
 */
function _sendPushNotification(userId, message, options = {}) {
  return new Promise((resolve, reject) => {
    // Simulate network delay
    const delay = Math.floor(Math.random() * (1500 - 1000 + 1)) + 1000;
    setTimeout(() => {
      try {
        if (!userId || !message) {
          throw new Error('Invalid parameters for push notification');
        }

        const notificationId = uuidv4();
        loggingService.logInfo(
          `Firebase push notification sent to user ${userId}: ${notificationId}`
        );

        resolve({
          success: true,
          notificationId,
          userId,
          platform: options.platform || 'android',
          timestamp: new Date(),
        });
      } catch (error) {
        loggingService.logError(`Failed to send Firebase push notification: ${error.message}`);
        reject(error);
      }
    }, delay);
  });
}

/**
 * Store notification in Firebase database
 */
function _storeNotification(notification) {
  return new Promise((resolve, reject) => {
    // Simulate database operation delay
    const delay = Math.floor(Math.random() * (1500 - 1000 + 1)) + 1000;
    setTimeout(() => {
      try {
        if (!notification || !notification.userId || !notification.message) {
          throw new Error('Invalid notification data');
        }

        const dbRef = `notifications/${notification.userId}/${uuidv4()}`;
        loggingService.logInfo(`Notification stored in Firebase at ref: ${dbRef}`);

        resolve({
          success: true,
          ref: dbRef,
          timestamp: new Date(),
          data: notification,
        });
      } catch (error) {
        loggingService.logError(`Failed to store notification in Firebase: ${error.message}`);
        reject(error);
      }
    }, delay);
  });
}

/**
 * Get user device tokens from Firebase
 */
function _getUserDeviceTokens(userId) {
  return new Promise(resolve => {
    // Simulate database read delay
    const delay = Math.floor(Math.random() * (1500 - 1000 + 1)) + 1000;
    setTimeout(() => {
      // Mock device tokens
      const tokens = [
        `device-token-${userId}-android-${uuidv4().substring(0, 8)}`,
        `device-token-${userId}-ios-${uuidv4().substring(0, 8)}`,
      ];

      loggingService.logInfo(`Retrieved ${tokens.length} device tokens for user ${userId}`);

      resolve({
        success: true,
        userId,
        tokens,
        platforms: ['android', 'ios'],
        timestamp: new Date(),
      });
    }, delay);
  });
}

/**
 * Track notification delivery status in Firebase analytics
 */
function _trackNotificationStatus(notificationId, status) {
  return new Promise(resolve => {
    // Simulate analytics operation delay
    const delay = Math.floor(Math.random() * (1500 - 1000 + 1)) + 1000;
    setTimeout(() => {
      loggingService.logInfo(`Notification ${notificationId} status tracked: ${status}`);

      resolve({
        success: true,
        notificationId,
        status,
        timestamp: new Date(),
      });
    }, delay);
  });
}

// Wrap all functions with OpenTelemetry tracing
const initializeFirebase = telemetry.wrapWithSpan(
  _initializeFirebase,
  'firebaseService.initializeFirebase',
  { 'firebase.operation': 'initialize' }
);

const sendPushNotification = telemetry.wrapWithSpan(
  _sendPushNotification,
  'firebaseService.sendPushNotification',
  { 'firebase.operation': 'pushNotification' }
);

const storeNotification = telemetry.wrapWithSpan(
  _storeNotification,
  'firebaseService.storeNotification',
  { 'firebase.operation': 'storeData' }
);

const getUserDeviceTokens = telemetry.wrapWithSpan(
  _getUserDeviceTokens,
  'firebaseService.getUserDeviceTokens',
  { 'firebase.operation': 'getTokens' }
);

const trackNotificationStatus = telemetry.wrapWithSpan(
  _trackNotificationStatus,
  'firebaseService.trackNotificationStatus',
  { 'firebase.operation': 'trackStatus' }
);

module.exports = {
  initializeFirebase,
  sendPushNotification,
  storeNotification,
  getUserDeviceTokens,
  trackNotificationStatus,
  FIREBASE_CONFIG,
};

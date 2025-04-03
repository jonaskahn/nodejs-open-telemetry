const { v4: uuidv4 } = require('uuid');
const loggingService = require('./loggingService');
const telemetry = require('../middleware/telemetry');
const firebaseService = require('./firebaseService');

// Mock notification storage
const notifications = {};
// Mock user channels (email, sms, etc)
const userChannels = {};

/**
 * Prepare notification content with templates
 * Level 1 of nested calls
 */
function _prepareNotificationContent(userId, message, channel) {
  return new Promise(resolve => {
    // Simulate template processing delay
    const delay = Math.floor(Math.random() * (1500 - 1000 + 1)) + 1000;

    setTimeout(async () => {
      loggingService.logInfo(`Preparing notification content for user ${userId}`);

      // Get user channels to customize the message
      const userChannel = userChannels[userId] || {};

      // Level 2 - Get user preferences to customize notification
      const preferences = await _getUserNotificationPreferences(userId);

      const formattedMessage = preferences.useHtml ? `<div>${message}</div>` : message;

      const content = {
        userId,
        originalMessage: message,
        formattedMessage,
        channel,
        timestamp: new Date(),
        templateId: preferences.templateId,
        includeFooter: preferences.includeFooter,
      };

      resolve(content);
    }, delay);
  });
}

/**
 * Get user notification preferences
 * Level 2 of nested calls
 */
function _getUserNotificationPreferences(userId) {
  return new Promise(resolve => {
    // Simulate database lookup delay
    const delay = Math.floor(Math.random() * (1500 - 1000 + 1)) + 1000;

    setTimeout(async () => {
      loggingService.logInfo(`Retrieving notification preferences for user ${userId}`);

      // Level 3 - Get user device information
      const deviceInfo = await _getUserDeviceInfo(userId);

      resolve({
        userId,
        templateId: `template-${Math.floor(Math.random() * 5) + 1}`,
        useHtml: deviceInfo.supportHtml,
        includeFooter: true,
        deliveryPriority: 'high',
        timestamp: new Date(),
      });
    }, delay);
  });
}

/**
 * Get user device information
 * Level 3 of nested calls
 */
function _getUserDeviceInfo(userId) {
  return new Promise(resolve => {
    // Simulate device lookup delay
    const delay = Math.floor(Math.random() * (1500 - 1000 + 1)) + 1000;

    setTimeout(async () => {
      loggingService.logInfo(`Retrieving device information for user ${userId}`);

      // Level 4 - Get device tokens from Firebase
      const tokensResult = await firebaseService.getUserDeviceTokens(userId);

      resolve({
        userId,
        deviceType: tokensResult.platforms[0],
        supportHtml: tokensResult.platforms.includes('ios'),
        lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000),
        tokens: tokensResult.tokens,
        timestamp: new Date(),
      });
    }, delay);
  });
}

/**
 * Deliver notification to external providers
 * Level 5 of nested calls - called from sendNotification
 */
function _deliverNotification(notification) {
  return new Promise(async (resolve, reject) => {
    try {
      loggingService.logInfo(
        `Delivering notification via ${notification.channel} to user ${notification.userId}`
      );

      const notificationId = notification.id;

      // Initialize Firebase connection
      await firebaseService.initializeFirebase();

      // Store notification in Firebase
      await firebaseService.storeNotification({
        userId: notification.userId,
        message: notification.formattedMessage,
        channel: notification.channel,
        sentAt: notification.timestamp,
      });

      // Send push notification if applicable
      if (notification.channel === 'push' || notification.channel === 'all') {
        await firebaseService.sendPushNotification(
          notification.userId,
          notification.formattedMessage,
          { priority: 'high' }
        );
      }

      // Track delivery status
      await firebaseService.trackNotificationStatus(notificationId, 'delivered');

      resolve({
        success: true,
        notificationId,
        channel: notification.channel,
        timestamp: new Date(),
      });
    } catch (error) {
      loggingService.logError(`Failed to deliver notification: ${error.message}`);
      reject(error);
    }
  });
}

/**
 * Send notification to a specific user
 */
async function _sendNotification(userId, message, channel = 'email') {
  try {
    const notificationId = uuidv4();
    const timestamp = new Date();

    // Level 1 - Prepare notification content
    const content = await _prepareNotificationContent(userId, message, channel);

    // Store notification
    notifications[notificationId] = {
      id: notificationId,
      userId,
      message: content.formattedMessage,
      originalMessage: message,
      channel,
      timestamp,
      status: 'processing',
    };

    loggingService.logInfo(
      `Notification created for user ${userId} via ${channel}: ${notificationId}`
    );

    // Level 5 - Deliver notification to external providers
    const deliveryResult = await _deliverNotification({
      ...notifications[notificationId],
      formattedMessage: content.formattedMessage,
    });

    // Update notification status
    notifications[notificationId].status = 'sent';
    notifications[notificationId].deliveredAt = deliveryResult.timestamp;

    loggingService.logInfo(`Notification sent to user ${userId} via ${channel}: ${notificationId}`);

    return notifications[notificationId];
  } catch (error) {
    loggingService.logError(`Failed to send notification: ${error.message}`);
    throw error;
  }
}

/**
 * Send bulk notifications to multiple users
 */
async function _sendBulkNotifications(userIds, message, channel = 'email') {
  const results = [];
  for (const userId of userIds) {
    try {
      const result = await sendNotification(userId, message, channel);
      results.push(result);
    } catch (error) {
      loggingService.logError(`Failed to send notification to user ${userId}: ${error.message}`);
      results.push({
        userId,
        error: error.message,
        status: 'failed',
      });
    }
  }

  loggingService.logInfo(`Bulk notifications sent to ${userIds.length} users`);
  return results;
}

/**
 * Schedule a notification for future delivery
 */
function _scheduleNotification(userId, message, deliveryTime, channel = 'email') {
  const notificationId = uuidv4();
  const timestamp = new Date();

  // Store scheduled notification
  notifications[notificationId] = {
    id: notificationId,
    userId,
    message,
    channel,
    timestamp,
    deliveryTime,
    status: 'scheduled',
  };

  loggingService.logInfo(`Notification scheduled for user ${userId} at ${deliveryTime}`);

  // In a real system, this would set up the scheduled delivery
  return notifications[notificationId];
}

/**
 * Register user notification channels
 */
function _registerUserChannels(userId, channels) {
  userChannels[userId] = { ...(userChannels[userId] || {}), ...channels };

  loggingService.logInfo(`Updated notification channels for user ${userId}`);
  return userChannels[userId];
}

/**
 * Get notifications for a specific user
 */
function _getUserNotifications(userId) {
  return Object.values(notifications).filter(n => n.userId === userId);
}

// Wrap functions with OpenTelemetry tracing
const prepareNotificationContent = telemetry.wrapWithSpan(
  _prepareNotificationContent,
  'notificationService.prepareContent',
  { 'notification.operation': 'prepareContent' }
);

const getUserNotificationPreferences = telemetry.wrapWithSpan(
  _getUserNotificationPreferences,
  'notificationService.getUserPreferences',
  { 'notification.operation': 'getPreferences' }
);

const getUserDeviceInfo = telemetry.wrapWithSpan(
  _getUserDeviceInfo,
  'notificationService.getUserDeviceInfo',
  { 'notification.operation': 'getDeviceInfo' }
);

const deliverNotification = telemetry.wrapWithSpan(
  _deliverNotification,
  'notificationService.deliverNotification',
  { 'notification.operation': 'deliver' }
);

const sendNotification = telemetry.wrapWithSpan(
  _sendNotification,
  'notificationService.sendNotification',
  { 'notification.operation': 'send' }
);

const sendBulkNotifications = telemetry.wrapWithSpan(
  _sendBulkNotifications,
  'notificationService.sendBulkNotifications',
  { 'notification.operation': 'sendBulk' }
);

const scheduleNotification = telemetry.wrapWithSpan(
  _scheduleNotification,
  'notificationService.scheduleNotification',
  { 'notification.operation': 'schedule' }
);

const registerUserChannels = telemetry.wrapWithSpan(
  _registerUserChannels,
  'notificationService.registerUserChannels',
  { 'notification.operation': 'registerChannels' }
);

const getUserNotifications = telemetry.wrapWithSpan(
  _getUserNotifications,
  'notificationService.getUserNotifications',
  { 'notification.operation': 'getNotifications' }
);

module.exports = {
  sendNotification,
  sendBulkNotifications,
  scheduleNotification,
  registerUserChannels,
  getUserNotifications,
};

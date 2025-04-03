const { v4: uuidv4 } = require('uuid');
const loggingService = require('./loggingService');
const telemetry = require('../middleware/telemetry');
const firebaseService = require('./firebaseService');

const notifications = {};
const userChannels = {};

function _prepareNotificationContent(userId, message, channel) {
  return new Promise(resolve => {
    const delay = Math.floor(Math.random() * (1500 - 1000 + 1)) + 1000;

    setTimeout(async () => {
      loggingService.info(`Preparing notification content for user ${userId}`);
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

function _getUserNotificationPreferences(userId) {
  return new Promise(resolve => {
    const delay = Math.floor(Math.random() * (1500 - 1000 + 1)) + 1000;

    setTimeout(async () => {
      loggingService.info(`Retrieving notification preferences for user ${userId}`);
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

function _getUserDeviceInfo(userId) {
  return new Promise(resolve => {
    const delay = Math.floor(Math.random() * (1500 - 1000 + 1)) + 1000;

    setTimeout(async () => {
      loggingService.info(`Retrieving device information for user ${userId}`);
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

function _deliverNotification(userId, notification, channel) {
  return new Promise((resolve, reject) => {
    loggingService.info(`Delivering notification via ${channel} to user ${userId}`);

    firebaseService
      .storeNotification(userId, notification.id)
      .then(() => {
        if (channel === 'push') {
          return firebaseService.sendPushNotification(userId, notification);
        }
        return Promise.resolve();
      })
      .then(() => firebaseService.trackNotificationStatus(notification.id, 'delivered'))
      .then(() => resolve(notification))
      .catch(error => {
        loggingService.error(`Failed to deliver notification: ${error.message}`);
        reject(error);
      });
  });
}

async function _sendNotification(userId, message, channel = 'email') {
  try {
    const notificationId = uuidv4();
    const timestamp = new Date();
    const content = await _prepareNotificationContent(userId, message, channel);

    notifications[notificationId] = {
      id: notificationId,
      userId,
      message: content.formattedMessage,
      originalMessage: message,
      channel,
      timestamp,
      status: 'processing',
    };

    loggingService.info(
      `Notification created for user ${userId} via ${channel}: ${notificationId}`
    );

    const deliveryResult = await _deliverNotification(
      userId,
      notifications[notificationId],
      channel
    );

    notifications[notificationId].status = 'sent';
    notifications[notificationId].deliveredAt = deliveryResult.timestamp;

    loggingService.info(`Notification sent to user ${userId} via ${channel}: ${notificationId}`);

    return notifications[notificationId];
  } catch (error) {
    loggingService.error(`Failed to send notification: ${error.message}`);
    throw error;
  }
}

async function _sendBulkNotifications(userIds, message, channel = 'email') {
  const results = [];

  for (const userId of userIds) {
    try {
      const result = await sendNotification(userId, message, channel);
      results.push(result);
    } catch (error) {
      loggingService.error(`Failed to send notification to user ${userId}: ${error.message}`);
      results.push({
        userId,
        error: error.message,
        status: 'failed',
      });
    }
  }

  loggingService.info(`Bulk notifications sent to ${userIds.length} users`);
  return results;
}

function _scheduleNotification(userId, message, deliveryTime, channel = 'email') {
  const notificationId = uuidv4();
  const timestamp = new Date();

  notifications[notificationId] = {
    id: notificationId,
    userId,
    message,
    channel,
    timestamp,
    deliveryTime,
    status: 'scheduled',
  };

  loggingService.info(`Notification scheduled for user ${userId} at ${deliveryTime}`);
  return notifications[notificationId];
}

function _registerUserChannels(userId, channels) {
  userChannels[userId] = { ...(userChannels[userId] || {}), ...channels };
  loggingService.info(`Updated notification channels for user ${userId}`);
  return userChannels[userId];
}

function _getUserNotifications(userId) {
  return Object.values(notifications).filter(n => n.userId === userId);
}

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

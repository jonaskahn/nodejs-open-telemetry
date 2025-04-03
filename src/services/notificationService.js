const { v4: uuidv4 } = require('uuid');
const loggingService = require('./loggingService');
const telemetry = require('../middleware/telemetry');

// Mock notification storage
const notifications = {};
// Mock user channels (email, sms, etc)
const userChannels = {};

/**
 * Send notification to a specific user
 */
function _sendNotification(userId, message, channel = 'email') {
  const notificationId = uuidv4();
  const timestamp = new Date();

  // Store notification
  notifications[notificationId] = {
    id: notificationId,
    userId,
    message,
    channel,
    timestamp,
    status: 'sent',
  };

  // Using useParentSpan=true for the logInfo call to maintain the same span
  loggingService.logInfo(`Notification sent to user ${userId} via ${channel}: ${notificationId}`);

  // In a real system, this would send the actual notification
  // For demo purposes, just returning the notification object
  return notifications[notificationId];
}

/**
 * Send bulk notifications to multiple users
 */
function _sendBulkNotifications(userIds, message, channel = 'email') {
  // Here we use the wrapped sendNotification function with useParentSpan=true to keep the same context
  const results = userIds.map(userId => sendNotification(userId, message, channel));

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

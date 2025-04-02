const { v4: uuidv4 } = require("uuid");
const loggingService = require("./loggingService");

// Mock notification storage
const notifications = {};
// Mock user channels (email, sms, etc)
const userChannels = {};

/**
 * Send notification to a specific user
 */
function sendNotification(userId, message, channel = "email") {
  const notificationId = uuidv4();
  const timestamp = new Date();

  // Store notification
  notifications[notificationId] = {
    id: notificationId,
    userId,
    message,
    channel,
    timestamp,
    status: "sent",
  };

  loggingService.logInfo(
    `Notification sent to user ${userId} via ${channel}: ${notificationId}`
  );

  // In a real system, this would send the actual notification
  // For demo purposes, just returning the notification object
  return notifications[notificationId];
}

/**
 * Send bulk notifications to multiple users
 */
function sendBulkNotifications(userIds, message, channel = "email") {
  const results = userIds.map((userId) =>
    sendNotification(userId, message, channel)
  );

  loggingService.logInfo(`Bulk notifications sent to ${userIds.length} users`);
  return results;
}

/**
 * Schedule a notification for future delivery
 */
function scheduleNotification(
  userId,
  message,
  deliveryTime,
  channel = "email"
) {
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
    status: "scheduled",
  };

  loggingService.logInfo(
    `Notification scheduled for user ${userId} at ${deliveryTime}`
  );

  // In a real system, this would set up the scheduled delivery
  return notifications[notificationId];
}

/**
 * Register user notification channels
 */
function registerUserChannels(userId, channels) {
  userChannels[userId] = { ...(userChannels[userId] || {}), ...channels };

  loggingService.logInfo(`Updated notification channels for user ${userId}`);
  return userChannels[userId];
}

/**
 * Get notifications for a specific user
 */
function getUserNotifications(userId) {
  return Object.values(notifications).filter((n) => n.userId === userId);
}

module.exports = {
  sendNotification,
  sendBulkNotifications,
  scheduleNotification,
  registerUserChannels,
  getUserNotifications,
};

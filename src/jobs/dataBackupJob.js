const cron = require('node-cron');
const moment = require('moment');
const dataService = require('../services/dataService');
const loggingService = require('../services/loggingService');
const notificationService = require('../services/notificationService');

/**
 * Job configuration
 */
const CONFIG = {
  // Run every day at 2:00 AM
  schedule: '0 2 * * *',
  // For testing purposes, you can use this instead:
  // schedule: '*/5 * * * * *', // Run every 5 seconds
  enabled: true,
  adminUser: 'admin',
};

/**
 * Perform the data backup
 */
function performBackup() {
  try {
    loggingService.logInfo('Starting scheduled data backup...');

    const startTime = new Date();
    const backup = dataService.createDataBackup();
    const endTime = new Date();

    const duration = (endTime - startTime) / 1000;

    loggingService.logInfo(
      `Backup completed successfully in ${duration} seconds. Backup ID: ${backup.id}`
    );

    // In a real system, this would store the backup somewhere persistent
    // For demo purposes, we just log it

    // Notify admin about backup
    notificationService.sendNotification(
      CONFIG.adminUser,
      `Data backup completed successfully. Backup ID: ${backup.id}`
    );

    return {
      success: true,
      backupId: backup.id,
      timestamp: backup.timestamp,
      duration,
    };
  } catch (error) {
    loggingService.logError(`Backup failed: ${error.message}`, { error });

    // Notify admin about failure
    notificationService.sendNotification(
      CONFIG.adminUser,
      `Data backup failed: ${error.message}`,
      'email'
    );

    return {
      success: false,
      error: error.message,
      timestamp: new Date(),
    };
  }
}

/**
 * Initialize and schedule the backup job
 */
function initBackupJob() {
  if (!CONFIG.enabled) {
    loggingService.logInfo('Data backup job is disabled');
    return false;
  }

  loggingService.logInfo(`Scheduling data backup job with schedule: ${CONFIG.schedule}`);

  // Schedule the cron job
  const job = cron.schedule(CONFIG.schedule, () => {
    performBackup();
  });

  return job;
}

module.exports = {
  initBackupJob,
  performBackup,
  CONFIG,
};

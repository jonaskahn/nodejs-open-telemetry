const cron = require('node-cron');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const userService = require('../services/userService');
const dataService = require('../services/dataService');
const loggingService = require('../services/loggingService');
const notificationService = require('../services/notificationService');

/**
 * Job configuration
 */
const CONFIG = {
  schedule: '*/5 * * * * *',
  enabled: true,
  adminUser: 'admin',
};

/**
 * Generate a usage report
 */
function generateUsageReport() {
  try {
    loggingService.logInfo('Starting scheduled report generation...');

    const startTime = new Date();
    const reportId = uuidv4();

    // Get all users
    const users = userService.getAllUsers();

    // Generate report data
    const report = {
      id: reportId,
      generatedAt: startTime,
      type: 'weekly_usage',
      data: {
        userCount: users.length,
        activeUsers: users.filter(
          user => user.lastLoginAt && moment(user.lastLoginAt).isAfter(moment().subtract(7, 'days')),
        ).length,
        dataSummary: {},
      },
    };

    // Process user data for the report
    users.forEach(user => {
      const userData = dataService.getUserData(user.id);
      if (userData && userData.length) {
        // Add user data metrics to report
        report.data.dataSummary[user.id] = {
          dataCount: userData.length,
          lastUpdated: userData.reduce((latest, item) => {
            return latest > item.updatedAt ? latest : item.updatedAt;
          }, new Date(0)),
        };
      }
    });

    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;

    loggingService.logInfo(
      `Report generation completed in ${duration} seconds. Report ID: ${report.id}`,
    );

    // Notify admin about report
    notificationService.sendNotification(
      CONFIG.adminUser,
      `Weekly usage report generated. Report ID: ${report.id}`,
    );

    return {
      success: true,
      reportId: report.id,
      timestamp: report.generatedAt,
      duration,
      report,
    };
  } catch (error) {
    loggingService.logError(`Report generation failed: ${error.message}`, {
      error,
    });

    // Notify admin about failure
    notificationService.sendNotification(
      CONFIG.adminUser,
      `Report generation failed: ${error.message}`,
      'email',
    );

    return {
      success: false,
      error: error.message,
      timestamp: new Date(),
    };
  }
}

/**
 * Initialize and schedule the report generation job
 */
function initReportJob() {
  if (!CONFIG.enabled) {
    loggingService.logInfo('Report generation job is disabled');
    return false;
  }

  loggingService.logInfo(`Scheduling report generation job with schedule: ${CONFIG.schedule}`);

  // Schedule the cron job
  const job = cron.schedule(CONFIG.schedule, () => {
    generateUsageReport();
  });

  return job;
}

module.exports = {
  initReportJob,
  generateUsageReport,
  CONFIG,
};

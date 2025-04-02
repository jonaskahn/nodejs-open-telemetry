const cron = require("node-cron");
const moment = require("moment");
const dataService = require("../services/dataService");
const loggingService = require("../services/loggingService");
const notificationService = require("../services/notificationService");
const { getTracer, wrapWithSpan } = require("../telemetry");
const { SpanStatusCode } = require("@opentelemetry/api");

// Get tracer for this module
const tracer = getTracer("dataBackupJob");

/**
 * Job configuration
 */
const CONFIG = {
  // Run every day at 2:00 AM
  schedule: "0 2 * * *",
  // For testing purposes, you can use this instead:
  // schedule: '*/5 * * * * *', // Run every 5 seconds
  enabled: true,
  adminUser: "admin",
};

/**
 * Perform the data backup
 */
function _performBackup() {
  try {
    loggingService.logInfo("Starting scheduled data backup...");

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
      "email"
    );

    return {
      success: false,
      error: error.message,
      timestamp: new Date(),
    };
  }
}

// Wrap the original function with OpenTelemetry tracing
const performBackup = wrapWithSpan(_performBackup, "performBackup", {
  "backup.type": "scheduled",
  "backup.job": "dataBackupJob",
});

/**
 * Initialize and schedule the backup job
 */
function _initBackupJob() {
  if (!CONFIG.enabled) {
    loggingService.logInfo("Data backup job is disabled");
    return false;
  }

  loggingService.logInfo(
    `Scheduling data backup job with schedule: ${CONFIG.schedule}`
  );

  // Schedule the cron job with tracing for each execution
  const job = cron.schedule(CONFIG.schedule, () => {
    // Create a new traced span for each job execution
    tracer.startActiveSpan("backupJob.execution", (span) => {
      try {
        span.setAttribute("backup.scheduled_time", new Date().toISOString());
        span.setAttribute("backup.cron_pattern", CONFIG.schedule);

        const result = performBackup();

        span.setAttribute("backup.success", result.success);
        if (result.backupId) {
          span.setAttribute("backup.id", result.backupId);
        }
        if (result.duration) {
          span.setAttribute("backup.duration_seconds", result.duration);
        }

        span.end();
        return result;
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.end();
        throw error;
      }
    });
  });

  return job;
}

// Wrap the initialization function with OpenTelemetry tracing
const initBackupJob = wrapWithSpan(_initBackupJob, "initBackupJob", {
  "job.name": "dataBackupJob",
  "job.type": "cron",
});

module.exports = {
  initBackupJob,
  performBackup,
  CONFIG,
};

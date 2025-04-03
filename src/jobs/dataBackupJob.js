const cron = require('node-cron');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const dataService = require('../services/dataService');
const loggingService = require('../services/loggingService');
const notificationService = require('../services/notificationService');
const telemetry = require('../middleware/telemetry');
const { SpanStatusCode } = require('@opentelemetry/api');

// Base tracer only used for initialization
const baseTracer = telemetry.getTracer('dataBackupJob');

/**
 * Job configuration
 */
const CONFIG = {
  schedule: '*/10 * * * * *',
  enabled: true,
  adminUser: 'admin',
};

/**
 * Perform the data backup
 */
function _performBackup(executionId) {
  // Create a dedicated tracer for this execution
  const executionTracer = telemetry.getTracer(`dataBackupJob.${executionId}`);

  try {
    loggingService.logInfo(`Starting scheduled data backup [execution: ${executionId}]...`);

    const startTime = new Date();
    const backup = dataService.createDataBackup();
    const endTime = new Date();

    const duration = (endTime - startTime) / 1000;

    loggingService.logInfo(
      `Backup completed successfully in ${duration} seconds. Backup ID: ${backup.id}`
    );

    notificationService.sendNotification(
      CONFIG.adminUser,
      `Data backup completed successfully. Backup ID: ${backup.id}`
    );

    return {
      success: true,
      backupId: backup.id,
      timestamp: backup.timestamp,
      duration,
      executionId,
    };
  } catch (error) {
    loggingService.logError(`Backup failed [execution: ${executionId}]: ${error.message}`, {
      error,
    });

    notificationService.sendNotification(
      CONFIG.adminUser,
      `Data backup failed: ${error.message}`,
      'email'
    );

    return {
      success: false,
      error: error.message,
      timestamp: new Date(),
      executionId,
    };
  }
}

// Wrap the original function with OpenTelemetry tracing
// Note: The tracer will be created in the wrapped function for each execution
const performBackup = executionId => {
  const execId = executionId || uuidv4();
  return telemetry.wrapWithSpan(() => _performBackup(execId), `performBackup.${execId}`, {
    'backup.type': 'scheduled',
    'backup.job': 'dataBackupJob',
    'backup.execution_id': execId,
  })();
};

/**
 * Initialize and schedule the backup job
 */
function _initBackupJob() {
  if (!CONFIG.enabled) {
    loggingService.logInfo('Data backup job is disabled');
    return false;
  }

  loggingService.logInfo(`Scheduling data backup job with schedule: ${CONFIG.schedule}`);

  // Schedule the cron job with tracing for each execution
  const job = cron.schedule(CONFIG.schedule, () => {
    // Generate a unique ID for this execution
    const executionId = uuidv4();

    // Get a dedicated tracer for this job execution
    const executionTracer = telemetry.getTracer(`dataBackupJob.${executionId}`);

    // Create a new traced span for each job execution with a standard name
    executionTracer.startActiveSpan('backupJob.execution', span => {
      try {
        span.setAttribute('backup.scheduled_time', new Date().toISOString());
        span.setAttribute('backup.cron_pattern', CONFIG.schedule);
        span.setAttribute('backup.execution_id', executionId);

        const result = performBackup(executionId);

        span.setAttribute('backup.success', result.success);
        if (result.backupId) {
          span.setAttribute('backup.id', result.backupId);
        }
        if (result.duration) {
          span.setAttribute('backup.duration_seconds', result.duration);
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
const initBackupJob = telemetry.wrapWithSpan(_initBackupJob, 'initBackupJob', {
  'job.name': 'dataBackupJob',
  'job.type': 'cron',
});

module.exports = {
  initBackupJob,
  performBackup,
  CONFIG,
};

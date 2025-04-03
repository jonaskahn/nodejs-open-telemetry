const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const dataService = require('../services/dataService');
const loggingService = require('../services/loggingService');
const notificationService = require('../services/notificationService');
const telemetry = require('../middleware/telemetry');
const { SpanStatusCode } = require('@opentelemetry/api');

const baseTracer = telemetry.getTracer('dataBackupJob');

const CONFIG = {
  schedule: '*/10 * * * * *',
  enabled: true,
  adminUser: 'admin',
};

function _performBackup(executionId) {
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

function performBackup(executionId) {
  const execId = executionId || uuidv4();
  return telemetry.wrapWithSpan(() => _performBackup(execId), `performBackup.${execId}`, {
    'backup.type': 'scheduled',
    'backup.job': 'dataBackupJob',
    'backup.execution_id': execId,
  })();
}

function _initBackupJob() {
  if (!CONFIG.enabled) {
    loggingService.logInfo('Data backup job is disabled');
    return false;
  }

  loggingService.logInfo(`Scheduling data backup job with schedule: ${CONFIG.schedule}`);

  return cron.schedule(CONFIG.schedule, () => {
    const executionId = uuidv4();
    const executionTracer = telemetry.getTracer(`dataBackupJob.${executionId}`);

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
}

const initBackupJob = telemetry.wrapWithSpan(_initBackupJob, 'initBackupJob', {
  'job.name': 'dataBackupJob',
  'job.type': 'cron',
});

module.exports = {
  initBackupJob,
  performBackup,
  CONFIG,
};

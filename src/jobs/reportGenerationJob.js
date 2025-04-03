const cron = require('node-cron');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const userService = require('../services/userService');
const dataService = require('../services/dataService');
const loggingService = require('../services/loggingService');
const notificationService = require('../services/notificationService');
const telemetry = require('../middleware/telemetry');
const { SpanStatusCode } = require('@opentelemetry/api');

// Base tracer only used for initialization
const baseTracer = telemetry.getTracer('reportGenerationJob');

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
function _generateUsageReport(executionId) {
  // Create a dedicated tracer for this execution
  const executionTracer = telemetry.getTracer(`reportGenerationJob.${executionId}`);

  try {
    loggingService.logInfo(`Starting scheduled report generation [execution: ${executionId}]...`);

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
          user => user.lastLoginAt && moment(user.lastLoginAt).isAfter(moment().subtract(7, 'days'))
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
      `Report generation completed in ${duration} seconds. Report ID: ${report.id}`
    );

    // Notify admin about report
    notificationService.sendNotification(
      CONFIG.adminUser,
      `Weekly usage report generated. Report ID: ${report.id}`
    );

    return {
      success: true,
      reportId: report.id,
      timestamp: report.generatedAt,
      duration,
      report,
      executionId,
    };
  } catch (error) {
    loggingService.logError(
      `Report generation failed [execution: ${executionId}]: ${error.message}`,
      {
        error,
      }
    );

    // Notify admin about failure
    notificationService.sendNotification(
      CONFIG.adminUser,
      `Report generation failed: ${error.message}`,
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
const generateUsageReport = executionId => {
  const execId = executionId || uuidv4();
  return telemetry.wrapWithSpan(
    () => _generateUsageReport(execId),
    `generateUsageReport.${execId}`,
    {
      'report.type': 'usage',
      'report.job': 'reportGenerationJob',
      'report.execution_id': execId,
    }
  )();
};

/**
 * Initialize and schedule the report generation job
 */
function _initReportJob() {
  if (!CONFIG.enabled) {
    loggingService.logInfo('Report generation job is disabled');
    return false;
  }

  loggingService.logInfo(`Scheduling report generation job with schedule: ${CONFIG.schedule}`);

  // Schedule the cron job
  const job = cron.schedule(CONFIG.schedule, () => {
    // Generate a unique ID for this execution
    const executionId = uuidv4();

    // Get a dedicated tracer for this job execution
    const executionTracer = telemetry.getTracer(`reportGenerationJob.${executionId}`);

    // Create a new traced span for each job execution with a standard name
    executionTracer.startActiveSpan('reportJob.execution', span => {
      try {
        span.setAttribute('report.scheduled_time', new Date().toISOString());
        span.setAttribute('report.cron_pattern', CONFIG.schedule);
        span.setAttribute('report.execution_id', executionId);

        const result = generateUsageReport(executionId);

        span.setAttribute('report.success', result.success);
        if (result.reportId) {
          span.setAttribute('report.id', result.reportId);
        }
        if (result.duration) {
          span.setAttribute('report.duration_seconds', result.duration);
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
const initReportJob = telemetry.wrapWithSpan(_initReportJob, 'initReportJob', {
  'job.name': 'reportGenerationJob',
  'job.type': 'cron',
});

module.exports = {
  initReportJob,
  generateUsageReport,
  CONFIG,
};

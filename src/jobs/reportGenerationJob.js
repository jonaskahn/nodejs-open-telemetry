const cron = require('node-cron');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const userService = require('../services/userService');
const dataService = require('../services/dataService');
const loggingService = require('../services/loggingService');
const notificationService = require('../services/notificationService');
const telemetry = require('../middleware/telemetry');
const { SpanStatusCode } = require('@opentelemetry/api');
const { generateExecutionId } = require('../utils/idGenerator');

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
 * Validate job configuration
 * Level 1 of nested calls
 */
function _validateJobConfig() {
  return new Promise(resolve => {
    // Simulate configuration validation delay
    const delay = Math.floor(Math.random() * (1000 - 500 + 1)) + 500;
    setTimeout(() => {
      loggingService.logInfo(`Validating job configuration for reportGenerationJob`);

      const isValid = CONFIG.enabled && CONFIG.schedule && CONFIG.adminUser;

      if (!isValid) {
        loggingService.logWarning('Report generation job configuration is invalid');
      }

      resolve({
        valid: isValid,
        configErrors: isValid ? [] : ['Missing required configuration parameters'],
        timestamp: new Date(),
      });
    }, delay);
  });
}

/**
 * Setup cron schedule
 * Level 2 of nested calls
 */
function _setupCronSchedule(config) {
  return new Promise(resolve => {
    // Simulate cron setup delay
    const delay = Math.floor(Math.random() * (1000 - 500 + 1)) + 500;

    setTimeout(() => {
      loggingService.logInfo(`Setting up cron schedule: ${config.schedule}`);

      // We need to use Promise chaining instead of async/await in the executor
      _registerJobHandlers()
        .then(handlersResult => {
          resolve({
            schedule: config.schedule,
            registered: true,
            handlers: handlersResult.handlers,
            timestamp: new Date(),
          });
        })
        .catch(error => {
          loggingService.logError(`Error setting up cron schedule: ${error.message}`);
          resolve({
            schedule: config.schedule,
            registered: false,
            handlers: [],
            timestamp: new Date(),
          });
        });
    }, delay);
  });
}

/**
 * Register job handlers
 * Level 3 of nested calls
 */
function _registerJobHandlers() {
  return new Promise(resolve => {
    // Simulate handler registration delay
    const delay = Math.floor(Math.random() * (1000 - 500 + 1)) + 500;

    setTimeout(() => {
      loggingService.logInfo('Registering job execution handlers');

      // We need to use Promise chaining instead of async/await in the executor
      _setupNotificationChannels()
        .then(notificationSetup => {
          resolve({
            handlers: ['onSuccess', 'onFailure', 'onCompletion'],
            notificationChannels: notificationSetup.channels,
            timestamp: new Date(),
          });
        })
        .catch(error => {
          loggingService.logError(`Error registering job handlers: ${error.message}`);
          resolve({
            handlers: ['onSuccess', 'onFailure'],
            notificationChannels: [],
            timestamp: new Date(),
          });
        });
    }, delay);
  });
}

/**
 * Setup notification channels for the job
 * Level 4 of nested calls
 */
function _setupNotificationChannels() {
  return new Promise(resolve => {
    // Simulate notification setup delay
    const delay = Math.floor(Math.random() * (1000 - 500 + 1)) + 500;

    setTimeout(() => {
      loggingService.logInfo('Setting up notification channels for job results');

      // We need to use Promise chaining instead of async/await in the executor
      _setupPersistenceLayer()
        .then(persistenceSetup => {
          resolve({
            channels: ['email', 'console', 'dashboard'],
            persistence: persistenceSetup.enabled,
            timestamp: new Date(),
          });
        })
        .catch(error => {
          loggingService.logError(`Error setting up notification channels: ${error.message}`);
          resolve({
            channels: ['console'],
            persistence: false,
            timestamp: new Date(),
          });
        });
    }, delay);
  });
}

/**
 * Setup persistence layer for job results
 * Level 5 of nested calls
 */
function _setupPersistenceLayer() {
  return new Promise(resolve => {
    // Simulate persistence setup delay
    const delay = Math.floor(Math.random() * (1000 - 500 + 1)) + 500;
    setTimeout(() => {
      loggingService.logInfo('Setting up persistence layer for job results');

      resolve({
        enabled: true,
        storage: 'in-memory',
        timestamp: new Date(),
      });
    }, delay);
  });
}

/**
 * Generate a usage report
 */
function _generateUsageReport(executionId) {
  telemetry.getTracer(`reportGenerationJob.${executionId}`);
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
      { error }
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
  const execId = executionId || generateExecutionId('report');
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
async function _initReportJob() {
  try {
    // Level 1 - Validate job configuration
    const configValidation = await validateJobConfig();

    if (!configValidation.valid) {
      loggingService.logError('Cannot initialize job with invalid configuration');
      return false;
    }

    loggingService.logInfo(`Job configuration validated successfully`);

    // Level 2 - Setup cron schedule
    const cronSetup = await setupCronSchedule(CONFIG);

    loggingService.logInfo(
      `Cron schedule setup completed with ${cronSetup.handlers.length} handlers`
    );

    // Schedule the cron job
    const job = cron.schedule(CONFIG.schedule, () => {
      // Generate a unique ID for this execution
      const executionId = generateExecutionId('report');

      // Get a dedicated tracer for this job execution
      const executionTracer = telemetry.getTracer(`reportGenerationJob.${executionId}`);

      // Create a new traced span for each job execution with a standard name
      executionTracer.startActiveSpan('reportJob.execution', span => {
        try {
          span.setAttribute('report.scheduled_time', new Date().toISOString());
          span.setAttribute('report.cron_pattern', CONFIG.schedule);
          span.setAttribute('report.execution_id', executionId);
          span.setAttribute(
            'report.notification_channels',
            cronSetup.notificationChannels.join(',')
          );

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

    loggingService.logInfo(`Job successfully scheduled with pattern: ${CONFIG.schedule}`);
    return job;
  } catch (error) {
    loggingService.logError(`Failed to initialize report job: ${error.message}`, { error });
    return false;
  }
}

// Wrap functions with OpenTelemetry tracing
const validateJobConfig = telemetry.wrapWithSpan(
  _validateJobConfig,
  'reportGenerationJob.validateJobConfig',
  { 'job.operation': 'validateConfig' }
);

const setupCronSchedule = telemetry.wrapWithSpan(
  _setupCronSchedule,
  'reportGenerationJob.setupCronSchedule',
  { 'job.operation': 'setupSchedule' }
);

const registerJobHandlers = telemetry.wrapWithSpan(
  _registerJobHandlers,
  'reportGenerationJob.registerJobHandlers',
  { 'job.operation': 'registerHandlers' }
);

const setupNotificationChannels = telemetry.wrapWithSpan(
  _setupNotificationChannels,
  'reportGenerationJob.setupNotificationChannels',
  { 'job.operation': 'setupNotifications' }
);

const setupPersistenceLayer = telemetry.wrapWithSpan(
  _setupPersistenceLayer,
  'reportGenerationJob.setupPersistenceLayer',
  { 'job.operation': 'setupPersistence' }
);

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

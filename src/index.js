// Telemetry is automatically initialized when imported
const loggingService = require('./services/loggingService');
const userService = require('./services/userService');
const dataService = require('./services/dataService');
const notificationService = require('./services/notificationService');
const authService = require('./services/authService');
const dataBackupJob = require('./jobs/dataBackupJob');
const reportGenerationJob = require('./jobs/reportGenerationJob');

/**
 * Initialize the application
 */
function init() {
  loggingService.logInfo('Starting application...');
  initJobs();
  createTestData();
  loggingService.logInfo('Application initialized successfully');
}

/**
 * Initialize all cronjobs
 */
function initJobs() {
  loggingService.logInfo('Initializing cronjobs...');

  // Initialize data backup job
  const backupJob = dataBackupJob.initBackupJob();
  if (backupJob) {
    loggingService.logInfo(
      `Data backup job initialized with schedule: ${dataBackupJob.CONFIG.schedule}`
    );
  } else {
    loggingService.logWarning('Data backup job is disabled');
  }

  // Initialize report generation job
  const reportJob = reportGenerationJob.initReportJob();
  if (reportJob) {
    loggingService.logInfo(
      `Report generation job initialized with schedule: ${reportGenerationJob.CONFIG.schedule}`
    );
  } else {
    loggingService.logWarning('Report generation job is disabled');
  }
}

/**
 * Create test data for demo purposes
 */
function createTestData() {
  loggingService.logInfo('Creating test data...');

  // Create test users
  const user1 = userService.createUser({
    username: 'john.doe',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    lastLoginAt: new Date(),
  });

  const user2 = userService.createUser({
    username: 'jane.smith',
    email: 'jane.smith@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    lastLoginAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
  });

  // Create admin user
  const admin = userService.createUser({
    username: 'admin',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    isAdmin: true,
    lastLoginAt: new Date(),
  });

  // Authenticate users
  const session1 = authService.authenticate('john.doe', 'password');
  const session2 = authService.authenticate('jane.smith', 'password');
  const adminSession = authService.authenticate('admin', 'admin');

  // Grant permissions
  authService.grantPermission(user1.id, 'data', 'read');
  authService.grantPermission(user1.id, 'data', 'write');
  authService.grantPermission(user2.id, 'data', 'read');
  authService.grantPermission(admin.id, 'data', 'admin');

  // Create some test data
  const data1 = dataService.storeData({ name: 'Sample 1', value: 42 }, user1.id);
  const data2 = dataService.storeData({ name: 'Sample 2', value: 100 }, user1.id);
  const data3 = dataService.storeData({ name: 'Sample 3', value: 200 }, user2.id);

  // Register notification channels
  notificationService.registerUserChannels(user1.id, {
    email: 'john.doe@example.com',
    sms: '+1234567890',
  });

  notificationService.registerUserChannels(user2.id, {
    email: 'jane.smith@example.com',
  });

  notificationService.registerUserChannels(admin.id, {
    email: 'admin@example.com',
    sms: '+9876543210',
  });

  // Send a notification
  notificationService.sendNotification(user1.id, 'Welcome to the system!', 'email');

  loggingService.logInfo('Test data created successfully');

  // Run jobs once for demo
  setTimeout(() => {
    loggingService.logInfo('Running jobs for demo...');
    dataBackupJob.performBackup();
    reportGenerationJob.generateUsageReport();
  }, 5000);
}

// Start the application
init();

// For demonstration/testing, expose instances that can be used by other modules
module.exports = {
  services: {
    loggingService,
    userService,
    dataService,
    notificationService,
    authService,
  },
  jobs: {
    dataBackupJob,
    reportGenerationJob,
  },
};

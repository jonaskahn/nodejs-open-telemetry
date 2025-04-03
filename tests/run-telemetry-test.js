const dataBackupJob = require('../src/jobs/dataBackupJob');
const loggingService = require('../src/services/loggingService');

// Wait a bit to make sure everything is initialized
setTimeout(() => {
  console.log('Starting telemetry test...');
  loggingService.logInfo('Running manual backup job test with OpenTelemetry tracing');

  try {
    // Manually trigger the backup job to generate telemetry data
    const result = dataBackupJob.performBackup();
    console.log('Backup result:', result);

    // Keep the process alive for a bit to ensure telemetry data is sent
    console.log('Waiting for telemetry data to be sent...');
    setTimeout(() => {
      console.log('Test complete, check Jaeger UI at http://localhost:16686');
      process.exit(0);
    }, 5000);
  } catch (error) {
    console.error('Error running backup job:', error);
    process.exit(1);
  }
}, 1000);

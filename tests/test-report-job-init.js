const { v4: uuidv4 } = require('uuid');
const telemetry = require('../src/middleware/telemetry');
const reportGenerationJob = require('../src/jobs/reportGenerationJob');
const loggingService = require('../src/services/loggingService');
const { generateExecutionId } = require('../src/utils/idGenerator');

// Wait a bit to make sure everything is initialized
setTimeout(async () => {
  try {
    console.log('Starting report job initialization test...');
    loggingService.logInfo('Testing report job initialization with 5 levels of nested calls');

    // Generate a unique test execution ID
    const testExecutionId = generateExecutionId('test-report');
    console.log(`Test execution ID: ${testExecutionId}`);

    // Create a test-specific tracer
    console.log(`Creating dedicated tracer for test: reportJobTest.${testExecutionId}`);
    const testTracer = telemetry.getTracer(`reportJobTest.${testExecutionId}`);

    // Start a span for the test
    testTracer.startActiveSpan('test.report_job_initialization', async span => {
      span.setAttribute('test.execution_id', testExecutionId);
      span.setAttribute('test.type', 'nested_calls');
      span.setAttribute('test.component', 'report_job');

      try {
        span.setAttribute('test.start_time', new Date().toISOString());

        console.log('Initializing report job with 5 levels of nested calls...');

        // Initialize the report generation job which triggers 5 nested calls
        const job = await reportGenerationJob.initReportJob();

        console.log('Job initialization result:', job ? 'Success' : 'Failed');
        span.setAttribute('test.success', !!job);

        // Set span attributes based on result
        span.end();

        // Keep the process alive for a bit to ensure telemetry data is sent
        console.log('Waiting for telemetry data to be sent...');
        setTimeout(() => {
          if (job) {
            // Stop the job so it doesn't continue running
            job.stop();
          }
          console.log('Test complete, check Jaeger UI at http://localhost:16686');
          process.exit(0);
        }, 5000);
      } catch (error) {
        console.error('Error in report job initialization test:', error);
        span.setStatus({ code: 'ERROR' });
        span.recordException(error);
        span.end();
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Error setting up report job test:', error);
    process.exit(1);
  }
}, 2000);

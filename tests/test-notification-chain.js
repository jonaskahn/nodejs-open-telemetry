const { v4: uuidv4 } = require('uuid');
const telemetry = require('../src/middleware/telemetry');
const notificationService = require('../src/services/notificationService');
const loggingService = require('../src/services/loggingService');
const { generateExecutionId } = require('../src/utils/idGenerator');

// Wait a bit to make sure everything is initialized
setTimeout(async () => {
  try {
    console.log('Starting nested notification test...');
    loggingService.logInfo('Testing notification service with 5 nested calls');

    // Generate a unique test execution ID
    const testExecutionId = generateExecutionId('test-notify');
    console.log(`Test execution ID: ${testExecutionId}`);

    // Create a test-specific tracer
    console.log(`Creating dedicated tracer for test: notificationTest.${testExecutionId}`);
    const testTracer = telemetry.getTracer(`notificationTest.${testExecutionId}`);

    // Start a span for the test
    testTracer.startActiveSpan('test.notification_chain', async span => {
      span.setAttribute('test.execution_id', testExecutionId);
      span.setAttribute('test.type', 'nested_calls');
      span.setAttribute('test.component', 'notification_service');

      try {
        span.setAttribute('test.start_time', new Date().toISOString());

        console.log('Sending test notification with 5 nested service calls...');

        // Send a test notification that will trigger 5 nested calls
        const result = await notificationService.sendNotification(
          'test-user-1',
          'This is a test notification with 5 nested service calls',
          'push'
        );

        console.log('Notification result:', JSON.stringify(result, null, 2));
        span.setAttribute('test.success', true);
        span.setAttribute('test.notification_id', result.id);

        // Set span attributes based on result
        span.end();

        // Keep the process alive for a bit to ensure telemetry data is sent
        console.log('Waiting for telemetry data to be sent...');
        setTimeout(() => {
          console.log('Test complete, check Jaeger UI at http://localhost:16686');
          process.exit(0);
        }, 5000);
      } catch (error) {
        console.error('Error in notification test:', error);
        span.setStatus({ code: 'ERROR' });
        span.recordException(error);
        span.end();
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Error setting up notification test:', error);
    process.exit(1);
  }
}, 2000);

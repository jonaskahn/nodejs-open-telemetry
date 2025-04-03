// Load dotenv directly to ensure environment variables are loaded before telemetry
require('dotenv').config();

// Import telemetry after dotenv
const telemetry = require('./src/middleware/telemetry');

// Display current configuration
console.log('========== TELEMETRY CONFIGURATION ==========');
console.log(`TELEMETRY_ENABLED: ${process.env.TELEMETRY_ENABLED === 'false' ? 'false' : 'true'}`);
console.log(`SERVICE_NAME: ${process.env.SERVICE_NAME || 'service-cronjob-demo'}`);
console.log(`SERVICE_VERSION: ${process.env.SERVICE_VERSION || '1.0.0'}`);
console.log(
  `OTEL_EXPORTER_OTLP_ENDPOINT: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'}`
);
console.log('');
console.log('========== TELEMETRY STATUS ==========');
console.log(`Telemetry Enabled: ${telemetry.isEnabled()}`);
console.log(`Telemetry Initialized: ${telemetry.initialized}`);
console.log('');
console.log('To run the application with telemetry disabled:');
console.log('1. Set TELEMETRY_ENABLED=false in your .env file');
console.log('2. Run "npm run start:no-telemetry"');
console.log('3. Or run "node -r dotenv/config src/index.js" after setting the .env file');

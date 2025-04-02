# Service and Cronjob Demo

This project demonstrates a JavaScript application with 5 services and 2 cronjobs using CommonJS modules. The services call each other and the cronjobs utilize these services to perform scheduled tasks. It also includes OpenTelemetry instrumentation for monitoring function calls.

## Project Structure

```
├── src/
│   ├── services/           # Service modules
│   │   ├── userService.js  # User management
│   │   ├── dataService.js  # Data operations
│   │   ├── notificationService.js  # Notifications
│   │   ├── loggingService.js  # Logging
│   │   └── authService.js  # Authentication
│   ├── jobs/               # Cronjob modules
│   │   ├── dataBackupJob.js  # Backup job (with OpenTelemetry)
│   │   └── reportGenerationJob.js  # Report generation job
│   ├── telemetry.js        # OpenTelemetry configuration
│   └── index.js            # Application entry point
├── docker-compose.yml      # Docker configuration for Jaeger
└── package.json
```

## Services

1. **User Service** - Manages user-related operations
2. **Data Service** - Handles data operations and storage
3. **Notification Service** - Sends notifications to users
4. **Logging Service** - Provides logging functionality
5. **Auth Service** - Handles authentication and authorization

## Cronjobs

1. **Data Backup Job** - Runs daily at 2:00 AM to create data backups (Instrumented with OpenTelemetry)
2. **Report Generation Job** - Runs every Monday at 8:00 AM to generate weekly reports

## Getting Started

### Starting Jaeger for Telemetry Visualization

Before running the application, start the Jaeger container:

```bash
docker-compose up -d
```

This will start Jaeger at http://localhost:16686

### Installation

```bash
npm install
```

### Running the Application

```bash
npm start
```

After running the application, you can see the OpenTelemetry traces in the Jaeger UI at http://localhost:16686.

## OpenTelemetry Instrumentation

This project demonstrates OpenTelemetry usage for the following:

1. **Function call tracing** - The Data Backup Job is instrumented to trace all function calls
2. **Span attributes** - Various attributes are added to spans to provide context
3. **Error tracking** - Errors are properly recorded in spans

Only the Data Backup Job has been instrumented with OpenTelemetry. The other cronjob and services are not instrumented.

## How it Works

The services are designed to work together:

- **User Service** uses Auth Service to verify user access and Logging Service to log operations
- **Data Service** uses Notification Service to send updates and Logging Service to log operations
- **Notification Service** uses Logging Service to track notifications
- **Auth Service** uses Logging Service to log authentication events

The cronjobs demonstrate scheduled tasks:

- **Data Backup Job** uses Data Service to create backups and Notification Service to send alerts
- **Report Generation Job** uses User Service and Data Service to gather data, then Notification Service to send the report

## Testing

For testing purposes, you can modify the cronjob schedules in their respective configuration objects:

- In `src/jobs/dataBackupJob.js`, update the `CONFIG.schedule` value to run more frequently
- In `src/jobs/reportGenerationJob.js`, update the `CONFIG.schedule` value to run more frequently

## Design Principles

This project demonstrates:

1. Modular design with CommonJS exports
2. Function-based implementation (no classes)
3. Service dependencies and cross-service calls
4. Scheduled tasks via cronjobs
5. OpenTelemetry instrumentation for observability

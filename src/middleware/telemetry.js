const opentelemetry = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { trace, SpanStatusCode } = require('@opentelemetry/api');

/**
 * Telemetry class for OpenTelemetry implementation
 */
class Telemetry {
  constructor(serviceName, serviceVersion) {
    this.serviceName = serviceName || 'service-cronjob-demo';
    this.serviceVersion = serviceVersion || '1.0.0';
    this.sdk = null;
    this.initialized = false;
  }

  /**
   * Initialize OpenTelemetry
   * @returns {Promise<void>}
   */
  init() {
    if (this.initialized) {
      return Promise.resolve();
    }

    try {
      // Configure resource attributes
      const attributes = {};
      attributes[SemanticResourceAttributes.SERVICE_NAME] = this.serviceName;
      attributes[SemanticResourceAttributes.SERVICE_VERSION] = this.serviceVersion;

      const resource = resourceFromAttributes(attributes);

      // Configure OTLP exporter to send traces to Jaeger
      const traceExporter = new OTLPTraceExporter({
        url: 'http://localhost:4318/v1/traces',
      });

      // Create and start the OpenTelemetry SDK
      this.sdk = new opentelemetry.NodeSDK({
        resource,
        traceExporter,
        instrumentations: [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': {
              enabled: false,
            },
          }),
        ],
      });

      // Register shutdown handler
      this._registerShutdown();

      // Start the SDK
      this.sdk.start();
      console.log('OpenTelemetry initialized');
      this.initialized = true;

      return Promise.resolve();
    } catch (error) {
      console.error('Error initializing OpenTelemetry', error);
      return Promise.reject(error);
    }
  }

  /**
   * Register shutdown handler for graceful shutdown
   * @private
   */
  _registerShutdown() {
    process.on('SIGTERM', () => {
      if (this.sdk) {
        try {
          this.sdk.shutdown();
          console.log('OpenTelemetry terminated');
        } catch (error) {
          console.error('Error terminating OpenTelemetry', error);
        } finally {
          process.exit(0);
        }
      }
    });
  }

  /**
   * Get a tracer for a specific module
   * @param {string} moduleName - Name of the module
   * @returns {Tracer} - OpenTelemetry tracer
   */
  getTracer(moduleName) {
    return trace.getTracer(moduleName);
  }

  /**
   * Wrap a function with OpenTelemetry tracing
   * @param {Function} fn - Function to wrap
   * @param {string} name - Span name
   * @param {Object} attributes - Span attributes
   * @param {boolean} useParentSpan - If true, uses parent span instead of creating a child
   * @returns {Function} - Wrapped function
   */
  wrapWithSpan(fn, name, attributes = {}, useParentSpan = false) {
    return (...args) => {
      const currentSpan = trace.getActiveSpan();

      // If no active span or not using parent span, create a new span
      if (!currentSpan || !useParentSpan) {
        const tracer = this.getTracer(name.split('.')[0] || 'default');
        return tracer.startActiveSpan(name, { attributes }, span => {
          try {
            const result = fn(...args);

            // Handle promises
            if (result && typeof result.then === 'function') {
              return result
                .then(value => {
                  span.end();
                  return value;
                })
                .catch(error => {
                  span.setStatus({ code: SpanStatusCode.ERROR });
                  span.recordException(error);
                  span.end();
                  throw error;
                });
            }

            span.end();
            return result;
          } catch (error) {
            span.setStatus({ code: SpanStatusCode.ERROR });
            span.recordException(error);
            span.end();
            throw error;
          }
        });
      }

      // If there's an active span and useParentSpan is true, use it directly
      try {
        // Add attributes to existing span if provided
        if (attributes && Object.keys(attributes).length > 0) {
          Object.entries(attributes).forEach(([key, value]) => {
            currentSpan.setAttribute(key, value);
          });
        }

        // Add event for function call
        currentSpan.addEvent(`Executing ${name}`);

        const result = fn(...args);

        // Handle promises
        if (result && typeof result.then === 'function') {
          return result
            .then(value => {
              currentSpan.addEvent(`Completed ${name}`);
              return value;
            })
            .catch(error => {
              currentSpan.addEvent(`Failed ${name}: ${error.message}`);
              currentSpan.recordException(error);
              throw error;
            });
        }

        currentSpan.addEvent(`Completed ${name}`);
        return result;
      } catch (error) {
        currentSpan.addEvent(`Failed ${name}: ${error.message}`);
        currentSpan.recordException(error);
        throw error;
      }
    };
  }
}

// Create singleton instance
const telemetry = new Telemetry();

// Initialize telemetry synchronously before export
(async function () {
  try {
    await telemetry.init();
  } catch (err) {
    console.error('Failed to initialize telemetry:', err);
  }
})();

// Export the initialized instance
module.exports = telemetry;

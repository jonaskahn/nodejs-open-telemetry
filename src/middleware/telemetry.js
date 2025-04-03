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
   * @returns {Function} - Wrapped function
   */
  wrapWithSpan(fn, name, attributes = {}) {
    return (...args) => {
      const currentSpan = trace.getActiveSpan();

      // If no active span, create a new one
      if (!currentSpan) {
        const tracer = this.getTracer('default');
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

      // If there's an active span, add a child span
      return trace.getTracer('default').startActiveSpan(name, { attributes }, span => {
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
    };
  }
}

// Create singleton instance
const telemetry = new Telemetry();

// Initialize telemetry synchronously before export
(async function() {
  try {
    await telemetry.init();
  } catch (err) {
    console.error('Failed to initialize telemetry:', err);
  }
})();

// Export the initialized instance
module.exports = telemetry;

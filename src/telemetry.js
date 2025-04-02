const opentelemetry = require("@opentelemetry/sdk-node");
const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-http");
const { Resource } = require("@opentelemetry/resources");
const {
  SemanticResourceAttributes,
} = require("@opentelemetry/semantic-conventions");
const { trace, SpanStatusCode } = require("@opentelemetry/api");

let sdk;

/**
 * Initialize OpenTelemetry
 */
function initTelemetry() {
  // Configure OpenTelemetry service name and version
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "service-cronjob-demo",
    [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
  });

  // Configure OTLP exporter to send traces to Jaeger
  const traceExporter = new OTLPTraceExporter({
    url: "http://localhost:4318/v1/traces",
  });

  // Create and start the OpenTelemetry SDK
  sdk = new opentelemetry.NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable automatic instrumentation for modules we want to instrument manually
        "@opentelemetry/instrumentation-fs": {
          enabled: false,
        },
      }),
    ],
  });

  // Start the SDK - note that this might not return a Promise in all versions
  try {
    const startResult = sdk.start();
    console.log("OpenTelemetry initialized");

    // Return a resolved promise to maintain compatibility
    return Promise.resolve();
  } catch (error) {
    console.error("Error initializing OpenTelemetry", error);
    return Promise.reject(error);
  }

  // Gracefully shut down the SDK on process exit
  process.on("SIGTERM", () => {
    if (sdk) {
      try {
        sdk.shutdown();
        console.log("OpenTelemetry terminated");
      } catch (error) {
        console.error("Error terminating OpenTelemetry", error);
      } finally {
        process.exit(0);
      }
    }
  });
}

/**
 * Get a tracer for a specific module
 */
function getTracer(moduleName) {
  return trace.getTracer(moduleName);
}

/**
 * Wrap a function with OpenTelemetry tracing
 */
function wrapWithSpan(fn, name, attributes = {}) {
  return function wrappedFunction(...args) {
    const currentSpan = trace.getActiveSpan();

    // If no active span, create a new one
    if (!currentSpan) {
      const tracer = getTracer("default");
      return tracer.startActiveSpan(name, { attributes }, (span) => {
        try {
          const result = fn(...args);

          // Handle promises
          if (result && typeof result.then === "function") {
            return result
              .then((value) => {
                span.end();
                return value;
              })
              .catch((error) => {
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
    return trace
      .getTracer("default")
      .startActiveSpan(name, { attributes }, (span) => {
        try {
          const result = fn(...args);

          // Handle promises
          if (result && typeof result.then === "function") {
            return result
              .then((value) => {
                span.end();
                return value;
              })
              .catch((error) => {
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

module.exports = {
  initTelemetry,
  getTracer,
  wrapWithSpan,
};

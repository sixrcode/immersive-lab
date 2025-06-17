const { configureGenkit } = require('@genkit-ai/core');
const { googleAI } = require('@genkit-ai/googleai');

// Configure Genkit with the Google AI plugin
// This assumes GOOGLE_APPLICATION_CREDENTIALS environment variable is set
// or the application is running in a Google Cloud environment.
configureGenkit({
  plugins: [
    googleAI(), // Initialize Google AI plugin
  ],
  logLevel: 'debug', // Optional: set log level for more detailed Genkit logs
  enableTracingAndMetrics: true, // Optional: enable tracing and metrics
});

// Re-export 'ai' from @genkit-ai/ai which should now be configured
const { ai } = require('@genkit-ai/ai');

module.exports = { ai };

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

const { combine, timestamp, json, printf } = winston.format;

// Custom format to add an error ID and ensure consistent structure
const customFormat = printf(({ level, message, timestamp, errorId, userId, route, method, errorCode, stack, requestDetails, ...metadata }) => {
  let logEntry: any = {
    level,
    message,
    timestamp,
    errorId: errorId || uuidv4(), // Ensure errorId is present
    userId,
    route,
    method,
    errorCode,
    ...metadata // Other metadata passed
  };
  if (stack) { // Only include stack for errors
    logEntry.stack = stack;
  }
  if (requestDetails) {
    logEntry.requestDetails = requestDetails;
  }
  return JSON.stringify(logEntry);
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    json() // This will produce JSON output
    // customFormat //  Using winston's json() is simpler and standard
  ),
  defaultMeta: { service: 'collaboration-service' },
  transports: [
    new winston.transports.Console({
      format: combine(
        timestamp(),
        winston.format.colorize(), // Optional: for colorful console output during development
        printf(({ level, message, timestamp, service, stack, errorId, ...metadata }) => {
          let log = `${timestamp} [${service}] ${level}: ${message}`;
          if (errorId) log += ` (ErrorID: ${errorId})`;
          // Add other metadata to the string if needed for console view
          if (stack) log += `
${stack}`;
          return log;
        })
      )
    }),
    // In a production environment, you might add transports for file logging or sending to a log management service
    // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// If running in a Firebase Functions environment, potentially use firebase-functions/logger
// This is a basic example; more sophisticated detection might be needed if the service
// can run in multiple environments. For now, we'll stick to Winston for this service.
// if (process.env.K_SERVICE) { // K_SERVICE is often set in Cloud Run/Functions
//   const { logger: firebaseLogger } = require('firebase-functions');
//   logger.info = (...args) => firebaseLogger.info(...args);
//   logger.warn = (...args) => firebaseLogger.warn(...args);
//   logger.error = (...args) => firebaseLogger.error(...args);
//   logger.debug = (...args) => firebaseLogger.debug(...args);
// }


export default logger;

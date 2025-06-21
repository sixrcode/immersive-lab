const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

const { combine, timestamp, json, printf } = winston.format;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    json() // Produces JSON output
  ),
  defaultMeta: { service: 'portfolio-microservice' },
  transports: [
    new winston.transports.Console({
      format: combine(
        timestamp(),
        winston.format.colorize(), // Optional: for colorful console output
        printf(({ level, message, timestamp, service, stack, errorId, ...metadata }) => {
          let log = `${timestamp} [${service}] ${level}: ${message}`;
          if (errorId) log += ` (ErrorID: ${errorId})`;
          if (stack) log += `
${stack}`;
          return log;
        })
      )
    }),
    // Add file transports if needed for production
    // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'combined.log' }),
  ],
});

module.exports = logger;

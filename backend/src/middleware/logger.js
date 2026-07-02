// =============================================================================
// logger.js — Winston Logger for Express Backend
// =============================================================================
// WHY WINSTON INSTEAD OF console.log?
// - Log levels (debug/info/warn/error) let you filter noise
// - Structured JSON output works with log aggregation tools
// - Timestamps on every line
// - In production, errors go to error.log, everything to combined.log
// =============================================================================

const winston = require('winston');
const path = require('path');

// -----------------------------------------------------------------------------
// Custom format — colorized for development
// -----------------------------------------------------------------------------
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // If there's extra metadata (like error objects), append it
    const metaStr = Object.keys(meta).length
      ? '\n' + JSON.stringify(meta, null, 2)
      : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// -----------------------------------------------------------------------------
// Production format — JSON for log aggregators
// -----------------------------------------------------------------------------
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// -----------------------------------------------------------------------------
// Create logger
// -----------------------------------------------------------------------------
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',

  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,

  transports: [
    // Always log to console
    new winston.transports.Console(),
  ],
});

// In production, also write to files
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }));
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
  }));
}

module.exports = logger;
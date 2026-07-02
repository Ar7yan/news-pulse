// =============================================================================
// errorHandler.js — Global Error Handling Middleware
// =============================================================================
// WHY CENTRALIZED ERROR HANDLING?
// Without this, every route needs its own try/catch and error response.
// With this, routes just throw errors and this middleware catches them all.
//
// HOW IT WORKS:
// Express recognizes a middleware with 4 params (err, req, res, next)
// as an error handler. Any error thrown in a route lands here.
//
// USAGE in routes:
//   router.get('/clusters', async (req, res, next) => {
//     try {
//       const data = await clusterService.getAll();
//       res.json(data);
//     } catch (err) {
//       next(err);  ← passes error to THIS middleware
//     }
//   });
// =============================================================================

const logger = require('./logger');

// -----------------------------------------------------------------------------
// Custom Error Classes
// -----------------------------------------------------------------------------
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Expected error (not a bug)
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500);
  }
}

// -----------------------------------------------------------------------------
// 404 Handler — for routes that don't exist
// Add this BEFORE the error handler in app.js
// -----------------------------------------------------------------------------
function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Route ${req.method} ${req.path}`));
}

// -----------------------------------------------------------------------------
// Global Error Handler — catches ALL errors thrown in routes
// MUST have 4 parameters for Express to recognize it as error middleware
// -----------------------------------------------------------------------------
function errorHandler(err, req, res, next) {
  // Default to 500 if no status code set
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal server error';

  // Handle specific PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        statusCode = 409;
        message    = 'Resource already exists';
        break;
      case '23503': // Foreign key violation
        statusCode = 400;
        message    = 'Referenced resource does not exist';
        break;
      case 'ECONNREFUSED': // DB connection refused
        statusCode = 503;
        message    = 'Database unavailable';
        break;
      default:
        statusCode = 500;
        message    = 'Database error';
    }
  }

  // Log the error
  if (statusCode >= 500) {
    // Server errors — log full stack trace
    logger.error(`${statusCode} ${req.method} ${req.path}`, {
      error  : err.message,
      stack  : err.stack,
      body   : req.body,
    });
  } else {
    // Client errors — just log the message
    logger.warn(`${statusCode} ${req.method} ${req.path}: ${message}`);
  }

  // Send error response
  // Never send stack traces to the client in production
  res.status(statusCode).json({
    success: false,
    error  : message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,    // Only include stack in development
      code : err.code,
    }),
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
  AppError,
  NotFoundError,
  ValidationError,
  DatabaseError,
};
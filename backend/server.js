// =============================================================================
// server.js — HTTP Server Entry Point
// =============================================================================

require('dotenv').config();

const app                = require('./src/app');
const { testConnection } = require('./src/config/database');
const logger             = require('./src/middleware/logger');

const PORT = parseInt(process.env.PORT || '5000', 10);


// =============================================================================
// Start Server
// =============================================================================
async function startServer() {
  logger.info('================================================');
  logger.info('  NEWS PULSE API STARTING');
  logger.info('================================================');

  // Log environment info for debugging
  logger.info(`Node version: ${process.version}`);
  logger.info(`Environment:  ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Port:         ${PORT}`);
  logger.info(`Database URL: ${process.env.DATABASE_URL ? 'SET ✓' : 'NOT SET ✗'}`);

  // Log partial URL for debugging (hide password)
  if (process.env.DATABASE_URL) {
    try {
      const url    = new URL(process.env.DATABASE_URL);
      logger.info(`DB Host:      ${url.hostname}`);
      logger.info(`DB Port:      ${url.port}`);
      logger.info(`DB User:      ${url.username}`);
      logger.info(`DB Name:      ${url.pathname.replace('/', '')}`);
    } catch (e) {
      logger.warn('Could not parse DATABASE_URL for logging');
    }
  }

  // Test database connection
  logger.info('Testing database connection...');
  const dbConnected = await testConnection();

  if (!dbConnected) {
    // Log warning but still start server
    // This way we can see the health endpoint and debug
    logger.error('================================================');
    logger.error('  DATABASE CONNECTION FAILED!');
    logger.error('  Check DATABASE_URL environment variable');
    logger.error('================================================');

    // In production exit — no point running without DB
    if (process.env.NODE_ENV === 'production') {
      logger.error('Exiting in production mode — fix DATABASE_URL');
      process.exit(1);
    }
  } else {
    logger.info('Database connection successful ✓');
  }

  // Start HTTP server
  const server = app.listen(PORT, () => {
    logger.info('================================================');
    logger.info(`Server running on http://localhost:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info('');
    logger.info('Available endpoints:');
    logger.info(`  GET  http://localhost:${PORT}/health`);
    logger.info(`  GET  http://localhost:${PORT}/api/v1/clusters`);
    logger.info(`  GET  http://localhost:${PORT}/api/v1/clusters/:id`);
    logger.info(`  GET  http://localhost:${PORT}/api/v1/timeline`);
    logger.info(`  POST http://localhost:${PORT}/api/v1/ingest/trigger`);
    logger.info(`  GET  http://localhost:${PORT}/api/v1/ingest/status/:jobId`);
    logger.info('================================================');
  });


  // =============================================================================
  // Graceful Shutdown
  // =============================================================================
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received — shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received (Ctrl+C) — shutting down');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection:');
    logger.error(reason);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:');
    logger.error(err.message);
    logger.error(err.stack);
    process.exit(1);
  });
}


// =============================================================================
// Run
// =============================================================================
startServer().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
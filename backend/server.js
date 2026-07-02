// =============================================================================
// server.js — HTTP Server Entry Point
// =============================================================================
// This is the ONLY file that starts the HTTP server.
// It imports the configured Express app from app.js
// and tells it to listen on a port.
//
// Run with:
//   node server.js        (production)
//   npm run dev           (development with nodemon auto-restart)
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

  // Test database connection before accepting traffic
  logger.info('Testing database connection...');
  const dbConnected = await testConnection();

  if (!dbConnected) {
    logger.error('Cannot start server — database connection failed');
    logger.error('Check DATABASE_URL in backend/.env');
    process.exit(1);
  }

  // Start listening
  const server = app.listen(PORT, () => {
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
  // When the process gets SIGTERM (from Docker/Render stopping the container),
  // finish existing requests before shutting down.
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
    logger.error('Unhandled Promise Rejection:', reason);
  });
}


startServer();
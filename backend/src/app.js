// =============================================================================
// app.js — Express Application Setup
// =============================================================================
// This file creates and configures the Express app.
// It does NOT start the HTTP server (that's server.js).
//
// Separation of concerns:
//   app.js    = configure the app (middleware, routes)
//   server.js = start listening on a port
//
// WHY SEPARATE?
// Makes testing easier — you can import app.js in tests
// without actually starting a server.
// =============================================================================

const express      = require('express');
const cors         = require('cors');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
require('dotenv').config();

const logger = require('./middleware/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Route imports
const clusterRoutes  = require('./routes/clusters');
const timelineRoutes = require('./routes/timeline');
const ingestRoutes   = require('./routes/ingest');

// Create Express app
const app = express();


// =============================================================================
// MIDDLEWARE STACK
// Order matters! Middleware runs top to bottom.
// =============================================================================

// 1. CORS — Allow frontend to call this API
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'https://news-pulse-mu-nine.vercel.app',
  'https://news-pulse-ar7yan.vercel.app',
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // allow requests without origin (Postman, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(
      new Error(`CORS blocked for origin: ${origin}`)
    );
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.options('*', cors());

// 2. Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// 3. Parse URL-encoded bodies (form submissions)
app.use(express.urlencoded({ extended: true }));

// 4. HTTP request logging (Morgan)
// 'dev' format: GET /clusters 200 45ms
app.use(morgan('dev', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// 5. Rate limiting — prevent API abuse
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max     : parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  message : {
    success: false,
    error  : 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders  : false,
});
app.use('/api/', limiter);


// =============================================================================
// HEALTH CHECK ENDPOINT
// Simple endpoint to verify the API is running.
// Used by deployment platforms and monitoring tools.
// =============================================================================
app.get('/health', async (req, res) => {
  const { testConnection } = require('./config/database');
  const { getStats }       = require('./models/index');

  try {
    const dbOk  = await testConnection();
    const stats = await getStats();

    res.status(200).json({
      status   : 'ok',
      timestamp: new Date().toISOString(),
      database : dbOk ? 'connected' : 'disconnected',
      stats    : {
        totalArticles: parseInt(stats.total_articles, 10) || 0,
        totalClusters: parseInt(stats.total_clusters, 10) || 0,
        totalRuns    : parseInt(stats.total_runs, 10)     || 0,
        lastScrapedAt: stats.last_scraped_at || null,
      },
    });
  } catch (err) {
    res.status(503).json({
      status : 'error',
      message: err.message,
    });
  }
});


// =============================================================================
// API ROUTES
// All routes are prefixed with /api/v1
// =============================================================================
app.use('/api/v1/clusters', clusterRoutes);
app.use('/api/v1/timeline', timelineRoutes);
app.use('/api/v1/ingest',   ingestRoutes);


// =============================================================================
// ROOT ENDPOINT — helpful for developers
// =============================================================================
app.get('/', (req, res) => {
  res.json({
    name   : 'News Pulse API',
    version: '1.0.0',
    endpoints: {
      health  : 'GET  /health',
      clusters: 'GET  /api/v1/clusters',
      cluster : 'GET  /api/v1/clusters/:id',
      timeline: 'GET  /api/v1/timeline',
      trigger : 'POST /api/v1/ingest/trigger',
      status  : 'GET  /api/v1/ingest/status/:jobId',
    },
  });
});


// =============================================================================
// ERROR HANDLING
// Must be LAST — after all routes
// =============================================================================

// 404 handler — catches requests to unknown routes
app.use(notFoundHandler);

// Global error handler — catches all errors thrown in routes
app.use(errorHandler);


module.exports = app;
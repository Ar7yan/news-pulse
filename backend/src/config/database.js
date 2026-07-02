// =============================================================================
// database.js — PostgreSQL Connection Pool for Express
// =============================================================================
// WHY pg.Pool INSTEAD OF A SINGLE CONNECTION?
// A Pool keeps multiple connections open and reuses them.
// Under load, multiple API requests can be served simultaneously
// without waiting for a single connection to be free.
//
// USAGE in other files:
//   const { query } = require('../config/database');
//   const result = await query('SELECT * FROM clusters');
//   const rows = result.rows;
// =============================================================================

const { Pool } = require('pg');
require('dotenv').config();

const logger = require('../middleware/logger');

// -----------------------------------------------------------------------------
// Create connection pool
// -----------------------------------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // SSL required for Supabase connections
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : { rejectUnauthorized: false }, // Also needed for Supabase in dev

  // Pool settings
  max: 10,                // Maximum connections in pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail fast if can't connect in 5s
});

// -----------------------------------------------------------------------------
// Log when pool connects or errors
// -----------------------------------------------------------------------------
pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err);
});

// -----------------------------------------------------------------------------
// Test connection on startup
// -----------------------------------------------------------------------------
async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as time');
    logger.info(
      `Database connected — server time: ${result.rows[0].time}`
    );
    return true;
  } catch (err) {
    logger.error(`Database connection failed: ${err.message}`);
    logger.error('Check your DATABASE_URL in backend/.env');
    return false;
  }
}

// -----------------------------------------------------------------------------
// Main query function — used by all models/services
// -----------------------------------------------------------------------------
async function query(text, params) {
  const start = Date.now();

  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    // Log slow queries (over 1 second) for performance monitoring
    if (duration > 1000) {
      logger.warn(`Slow query detected (${duration}ms): ${text.slice(0, 100)}`);
    } else {
      logger.debug(`Query executed in ${duration}ms`);
    }

    return result;

  } catch (err) {
    logger.error(`Database query error: ${err.message}`);
    logger.error(`Failed query: ${text.slice(0, 200)}`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// Transaction helper — for multi-step database operations
// -----------------------------------------------------------------------------
async function withTransaction(callback) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;

  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`Transaction rolled back: ${err.message}`);
    throw err;

  } finally {
    client.release();
  }
}

module.exports = {
  query,
  withTransaction,
  testConnection,
  pool,
};
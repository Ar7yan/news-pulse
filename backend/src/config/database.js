const { Pool } = require('pg');
require('dotenv').config();

const logger = require('../middleware/logger');

// -----------------------------------------------------------------------------
// Parse connection string to force IPv4
// Render has issues with IPv6 Supabase connections
// -----------------------------------------------------------------------------
function getPoolConfig() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set!');
  }

  return {
    connectionString,

    // Force SSL — required for Supabase on Render
    ssl: {
      rejectUnauthorized: false,
    },

    // Pool settings — conservative for free tier
    max                    : 5,
    min                    : 0,
    idleTimeoutMillis      : 10000,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle        : true,
  }
}

const pool = new Pool(getPoolConfig());

pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err.message);
});

// -----------------------------------------------------------------------------
// Test connection
// -----------------------------------------------------------------------------
async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as time');
    logger.info(`Database connected — server time: ${result.rows[0].time}`);
    return true;
  } catch (err) {
    logger.error(`Database connection failed: ${err.message}`);
    logger.error('Check your DATABASE_URL environment variable');
    return false;
  } finally {
    if (client) client.release();
  }
}

// -----------------------------------------------------------------------------
// Query function
// -----------------------------------------------------------------------------
async function query(text, params) {
  const start = Date.now();
  let client;

  try {
    client = await pool.connect();
    const result = await client.query(text, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      logger.warn(`Slow query (${duration}ms): ${text.slice(0, 100)}`);
    }

    return result;

  } catch (err) {
    logger.error(`Query error: ${err.message}`);
    throw err;
  } finally {
    if (client) client.release();
  }
}

// -----------------------------------------------------------------------------
// Transaction helper
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
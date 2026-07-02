const { Pool } = require('pg');
require('dotenv').config();

const logger = require('../middleware/logger');

// Parse the connection string and add required options
function buildConnectionConfig() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error('DATABASE_URL is not set!');
  }

  // Log which host we're connecting to (hide password)
  try {
    const parsed = new URL(url);
    logger.info(`Connecting to: ${parsed.hostname}:${parsed.port}`);
    logger.info(`Database: ${parsed.pathname}`);
    logger.info(`Username: ${parsed.username}`);
  } catch(e) {
    logger.info('Connecting to database...');
  }

  return {
    connectionString: url,
    ssl: {
      rejectUnauthorized: false,
    },
    // Smaller pool for free tier
    max                    : 3,
    min                    : 0,
    idleTimeoutMillis      : 10000,
    connectionTimeoutMillis: 15000,
    allowExitOnIdle        : true,
  };
}

let pool;

try {
  pool = new Pool(buildConnectionConfig());
} catch (err) {
  logger.error(`Failed to create pool: ${err.message}`);
  process.exit(1);
}

pool.on('error', (err) => {
  logger.error(`Pool error: ${err.message}`);
});

// -----------------------------------------------------------------------------
// Test connection — uses a single client not pool
// -----------------------------------------------------------------------------
async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as time, version() as version');
    logger.info(`Database connected!`);
    logger.info(`Server time: ${result.rows[0].time}`);
    return true;
  } catch (err) {
    logger.error(`Database connection failed: ${err.message}`);
    logger.error(`Error code: ${err.code}`);
    logger.error(`Full error: ${JSON.stringify(err)}`);
    return false;
  } finally {
    if (client) {
      try { client.release(); } catch(e) {}
    }
  }
}

// -----------------------------------------------------------------------------
// Query function
// -----------------------------------------------------------------------------
async function query(text, params) {
  let client;
  const start = Date.now();

  try {
    client = await pool.connect();
    const result = await client.query(text, params);
    const ms = Date.now() - start;
    if (ms > 1000) logger.warn(`Slow query ${ms}ms: ${text.slice(0,80)}`);
    return result;
  } catch (err) {
    logger.error(`Query error: ${err.message}`);
    throw err;
  } finally {
    if (client) {
      try { client.release(); } catch(e) {}
    }
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
    throw err;
  } finally {
    try { client.release(); } catch(e) {}
  }
}

module.exports = { query, withTransaction, testConnection, pool };
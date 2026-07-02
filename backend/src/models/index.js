// =============================================================================
// models/index.js — All Database Queries for the API
// =============================================================================
// This is the REPOSITORY LAYER.
// It's the only place that talks directly to the database.
// Services call these functions. Services never write raw SQL.
//
// PATTERN:
//   Route → Controller → Service → Model (here) → Database
// =============================================================================

const { query } = require('../config/database');
const logger    = require('../middleware/logger');


// =============================================================================
// CLUSTER QUERIES
// =============================================================================

/**
 * Get all clusters with article counts and sources.
 * Used by GET /clusters
 */
async function getAllClusters({ source = 'all', limit = 20, page = 1 } = {}) {
  const offset = (page - 1) * limit;

  // Base query using our cluster_summary view
  let sql = `
    SELECT
      id,
      label,
      keywords,
      article_count,
      created_at,
      earliest_article_at,
      latest_article_at,
      sources
    FROM cluster_summary
  `;

  const params = [];

  // Filter by source if requested
  if (source && source !== 'all') {
    params.push(source);
    sql += ` WHERE $${params.length} = ANY(sources)`;
  }

  sql += ` ORDER BY article_count DESC`;

  // Pagination
  params.push(limit);
  sql += ` LIMIT $${params.length}`;

  params.push(offset);
  sql += ` OFFSET $${params.length}`;

  const result = await query(sql, params);
  return result.rows;
}


/**
 * Get total cluster count (for pagination).
 */
async function getClusterCount(source = 'all') {
  let sql    = `SELECT COUNT(*) as total FROM cluster_summary`;
  const params = [];

  if (source && source !== 'all') {
    params.push(source);
    sql += ` WHERE $${params.length} = ANY(sources)`;
  }

  const result = await query(sql, params);
  return parseInt(result.rows[0].total, 10);
}


/**
 * Get a single cluster by ID with all its articles.
 * Used by GET /clusters/:id
 */
async function getClusterById(id) {
  // Get cluster details
  const clusterSql = `
    SELECT
      id,
      label,
      keywords,
      article_count,
      created_at,
      earliest_article_at,
      latest_article_at,
      run_id
    FROM clusters
    WHERE id = $1
  `;

  const clusterResult = await query(clusterSql, [id]);

  if (clusterResult.rows.length === 0) {
    return null;
  }

  const cluster = clusterResult.rows[0];

  // Get all articles in this cluster
  const articlesSql = `
    SELECT
      a.id,
      a.title,
      a.url,
      a.source,
      a.description,
      a.author,
      a.published_at,
      ci.similarity_score
    FROM cluster_items ci
    JOIN articles a ON a.id = ci.article_id
    WHERE ci.cluster_id = $1
    ORDER BY ci.similarity_score DESC NULLS LAST
  `;

  const articlesResult = await query(articlesSql, [id]);

  cluster.articles = articlesResult.rows;
  return cluster;
}


// =============================================================================
// TIMELINE QUERIES
// =============================================================================

/**
 * Get clusters formatted for timeline display.
 * Used by GET /timeline
 *
 * Returns clusters with date ranges so vis-timeline
 * can render them as time-range blocks.
 */
async function getTimelineClusters({ source = 'all', days = 7 } = {}) {
  let sql = `
    SELECT
      c.id,
      c.label,
      c.keywords,
      c.article_count,
      c.earliest_article_at  AS start_time,
      c.latest_article_at    AS end_time,
      c.created_at,
      ARRAY_AGG(DISTINCT a.source::TEXT) AS sources,
      COUNT(DISTINCT a.id) AS total_articles
    FROM clusters c
    JOIN cluster_items ci ON ci.cluster_id = c.id
    JOIN articles a ON a.id = ci.article_id
    WHERE
      c.earliest_article_at IS NOT NULL
      AND c.earliest_article_at >= NOW() - ($1 || ' days')::INTERVAL
  `;

  const params = [days];

  // Filter by source
  if (source && source !== 'all') {
    params.push(source);
    sql += ` AND a.source = $${params.length}`;
  }

  sql += `
    GROUP BY c.id
    ORDER BY c.earliest_article_at DESC
  `;

  const result = await query(sql, params);
  return result.rows;
}


// =============================================================================
// INGEST JOB QUERIES
// =============================================================================

/**
 * Get a single ingest job by ID.
 * Used by GET /ingest/status/:jobId
 */
async function getIngestJob(jobId) {
  const sql = `
    SELECT
      id,
      status,
      error_message,
      started_at,
      completed_at,
      articles_scraped,
      articles_skipped,
      clusters_generated,
      sources_processed,
      EXTRACT(EPOCH FROM (
        COALESCE(completed_at, NOW()) - started_at
      ))::INTEGER AS duration_seconds
    FROM ingest_jobs
    WHERE id = $1
  `;

  const result = await query(sql, [jobId]);
  return result.rows[0] || null;
}


/**
 * Get the most recent ingest job.
 * Used by the status endpoint when no jobId provided.
 */
async function getLatestIngestJob() {
  const sql = `
    SELECT
      id,
      status,
      error_message,
      started_at,
      completed_at,
      articles_scraped,
      articles_skipped,
      clusters_generated,
      sources_processed
    FROM ingest_jobs
    ORDER BY started_at DESC
    LIMIT 1
  `;

  const result = await query(sql);
  return result.rows[0] || null;
}


/**
 * Create a new ingest job record.
 * Called when POST /ingest/trigger is hit.
 */
async function createIngestJob() {
  const sql = `
    INSERT INTO ingest_jobs (status, started_at)
    VALUES ('pending', NOW())
    RETURNING id
  `;

  const result = await query(sql);
  return result.rows[0].id;
}


/**
 * Update ingest job status.
 */
async function updateIngestJobStatus(jobId, status, errorMessage = null) {
  const sql = `
    UPDATE ingest_jobs
    SET
      status        = $1,
      error_message = $2,
      completed_at  = CASE WHEN $1 IN ('completed', 'failed')
                      THEN NOW() ELSE completed_at END
    WHERE id = $3
    RETURNING *
  `;

  const result = await query(sql, [status, errorMessage, jobId]);
  return result.rows[0];
}


/**
 * Get database statistics for health check.
 */
async function getStats() {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM articles)      AS total_articles,
      (SELECT COUNT(*) FROM clusters)      AS total_clusters,
      (SELECT COUNT(*) FROM ingest_jobs
       WHERE status = 'completed')         AS total_runs,
      (SELECT MAX(scraped_at)
       FROM articles)                      AS last_scraped_at,
      (SELECT MAX(started_at)
       FROM ingest_jobs)                   AS last_run_at
  `;

  const result = await query(sql);
  return result.rows[0];
}


module.exports = {
  // Clusters
  getAllClusters,
  getClusterCount,
  getClusterById,

  // Timeline
  getTimelineClusters,

  // Ingest Jobs
  getIngestJob,
  getLatestIngestJob,
  createIngestJob,
  updateIngestJobStatus,

  // Stats
  getStats,
};
// =============================================================================
// clusterService.js — Business Logic for Clusters
// =============================================================================
// WHY A SERVICE LAYER?
// Controllers handle HTTP (req/res).
// Models handle database queries.
// Services handle BUSINESS LOGIC in between.
//
// Example of business logic here:
// - Formatting keywords array into a readable string
// - Adding pagination metadata to responses
// - Transforming database rows into API-friendly shapes
// =============================================================================

const db     = require('../models/index');
const logger = require('../middleware/logger');
const { NotFoundError } = require('../middleware/errorHandler');


/**
 * Get all clusters with pagination.
 *
 * @param {object} options - Filter and pagination options
 * @param {string} options.source - Filter by source ('bbc'|'reuters'|'npr'|'all')
 * @param {number} options.limit  - Results per page
 * @param {number} options.page   - Page number
 * @returns {object} Clusters array + pagination metadata
 */
async function getAllClusters({ source = 'all', limit = 20, page = 1 } = {}) {
  logger.info(`Getting clusters — source=${source}, page=${page}, limit=${limit}`);

  // Run count and data queries in parallel (faster than sequential)
  const [clusters, total] = await Promise.all([
    db.getAllClusters({ source, limit, page }),
    db.getClusterCount(source),
  ]);

  // Format each cluster for the API response
  const formatted = clusters.map(formatCluster);

  return {
    success   : true,
    data      : formatted,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext   : page * limit < total,
      hasPrev   : page > 1,
    },
  };
}


/**
 * Get a single cluster by ID with its articles.
 *
 * @param {number} id - Cluster ID
 * @returns {object} Cluster with articles array
 */
async function getClusterById(id) {
  logger.info(`Getting cluster #${id}`);

  const cluster = await db.getClusterById(id);

  if (!cluster) {
    throw new NotFoundError(`Cluster #${id}`);
  }

  // Format the cluster
  const formatted = {
    ...formatCluster(cluster),
    articles: cluster.articles.map(formatArticle),
  };

  return {
    success: true,
    data   : formatted,
  };
}


// =============================================================================
// Formatters — transform DB rows into clean API shapes
// =============================================================================

/**
 * Format a cluster row for API response.
 * Adds computed fields and cleans up data types.
 */
function formatCluster(cluster) {
  return {
    id           : cluster.id,
    label        : cluster.label,

    // keywords is a PostgreSQL array — ensure it's a JS array
    keywords     : Array.isArray(cluster.keywords)
                   ? cluster.keywords
                   : [],

    articleCount : cluster.article_count || 0,

    // sources is aggregated array from the view
    sources      : Array.isArray(cluster.sources)
                   ? cluster.sources.filter(Boolean)
                   : [],

    // Date range of articles in this cluster
    timeRange: {
      start: cluster.earliest_article_at || null,
      end  : cluster.latest_article_at   || null,
    },

    createdAt    : cluster.created_at,
  };
}


/**
 * Format an article row for API response.
 */
function formatArticle(article) {
  return {
    id             : article.id,
    title          : article.title,
    url            : article.url,
    source         : article.source,
    description    : article.description || null,
    author         : article.author      || null,
    publishedAt    : article.published_at || null,
    similarityScore: article.similarity_score
                     ? parseFloat(article.similarity_score.toFixed(3))
                     : null,
  };
}


module.exports = {
  getAllClusters,
  getClusterById,
};
// =============================================================================
// clusterService.js — Business Logic for Clusters
// =============================================================================

const db     = require('../models/index')
const logger = require('../middleware/logger')
const { NotFoundError } = require('../middleware/errorHandler')


async function getAllClusters({ source = 'all', limit = 20, page = 1 } = {}) {
  logger.info(`Getting clusters — source=${source}, page=${page}, limit=${limit}`)

  const [clusters, total] = await Promise.all([
    db.getAllClusters({ source, limit, page }),
    db.getClusterCount(source),
  ])

  const formatted = clusters.map(formatCluster)

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
  }
}


async function getClusterById(id) {
  logger.info(`Getting cluster #${id}`)

  const cluster = await db.getClusterById(id)

  if (!cluster) {
    throw new NotFoundError(`Cluster #${id}`)
  }

  return {
    success: true,
    data   : {
      ...formatCluster(cluster),
      articles: cluster.articles.map(formatArticle),
    },
  }
}


// =============================================================================
// Formatters
// =============================================================================

function formatCluster(cluster) {
  return {
    id          : cluster.id,
    label       : cluster.label,
    keywords    : Array.isArray(cluster.keywords)
                  ? cluster.keywords : [],
    articleCount: cluster.article_count || 0,
    sources     : Array.isArray(cluster.sources)
                  ? cluster.sources.filter(Boolean) : [],
    timeRange: {
      start: cluster.earliest_article_at || null,
      end  : cluster.latest_article_at   || null,
    },
    createdAt : cluster.created_at,
    aiSummary : cluster.ai_summary || null,     // ← AI summary included
  }
}


function formatArticle(article) {
  return {
    id             : article.id,
    title          : article.title,
    url            : article.url,
    source         : article.source,
    description    : article.description    || null,
    author         : article.author         || null,
    publishedAt    : article.published_at   || null,
    similarityScore: article.similarity_score
                     ? parseFloat(article.similarity_score.toFixed(3))
                     : null,
  }
}


module.exports = {
  getAllClusters,
  getClusterById,
}
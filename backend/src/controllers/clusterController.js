// =============================================================================
// clusterController.js — HTTP Handler for Cluster Endpoints
// =============================================================================
// Controllers ONLY handle HTTP concerns:
//   - Read from req (params, query, body)
//   - Call the service
//   - Send res
//   - Call next(err) on failure
//
// Controllers NEVER contain business logic or SQL.
// =============================================================================

const clusterService = require('../services/clusterService');
const logger         = require('../middleware/logger');


/**
 * GET /clusters
 * Returns all topic clusters with pagination.
 *
 * Query params:
 *   source — 'bbc' | 'reuters' | 'npr' | 'all' (default: 'all')
 *   limit  — results per page (default: 20)
 *   page   — page number (default: 1)
 */
async function getAllClusters(req, res, next) {
  try {
    const { source, limit, page } = req.query;

    const result = await clusterService.getAllClusters({
      source,
      limit : parseInt(limit, 10),
      page  : parseInt(page, 10),
    });

    res.status(200).json(result);

  } catch (err) {
    next(err);
  }
}


/**
 * GET /clusters/:id
 * Returns a single cluster with all its articles.
 *
 * URL params:
 *   id — cluster ID (integer)
 */
async function getClusterById(req, res, next) {
  try {
    const { id } = req.params;

    const result = await clusterService.getClusterById(parseInt(id, 10));

    res.status(200).json(result);

  } catch (err) {
    next(err);
  }
}


module.exports = {
  getAllClusters,
  getClusterById,
};
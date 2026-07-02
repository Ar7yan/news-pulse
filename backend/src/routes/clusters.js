// =============================================================================
// routes/clusters.js — Cluster Route Definitions
// =============================================================================
// Routes wire together:
//   URL pattern + HTTP method + validation middleware + controller function
//
// This file is mounted at /clusters in app.js
// So router.get('/') handles GET /clusters
// And router.get('/:id') handles GET /clusters/123
// =============================================================================

const express = require('express');
const router  = express.Router();

const clusterController = require('../controllers/clusterController');
const { validate, schemas } = require('../middleware/validate');


// GET /clusters
// Returns paginated list of all topic clusters
router.get(
  '/',
  validate(schemas.clusterQuery, 'query'),
  clusterController.getAllClusters
);


// GET /clusters/:id
// Returns single cluster with full article list
router.get(
  '/:id',
  validate(schemas.clusterId, 'params'),
  clusterController.getClusterById
);


module.exports = router;
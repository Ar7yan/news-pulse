// =============================================================================
// routes/ingest.js — Ingest Pipeline Route Definitions
// =============================================================================

const express = require('express');
const router  = express.Router();

const ingestController      = require('../controllers/ingestController');
const { validate, schemas } = require('../middleware/validate');


// POST /ingest/trigger
// Starts the scraper pipeline
router.post(
  '/trigger',
  ingestController.triggerIngest
);


// GET /ingest/status
// Returns latest job status (no ID needed)
router.get(
  '/status',
  ingestController.getLatestStatus
);


// GET /ingest/status/:jobId
// Returns status of a specific job
router.get(
  '/status/:jobId',
  validate(schemas.jobId, 'params'),
  ingestController.getIngestStatus
);


module.exports = router;
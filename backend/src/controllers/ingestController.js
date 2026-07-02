// =============================================================================
// ingestController.js — HTTP Handler for Ingest Endpoints
// =============================================================================

const ingestService = require('../services/ingestService');
const logger        = require('../middleware/logger');


/**
 * POST /ingest/trigger
 * Starts the Python scraper pipeline in the background.
 * Returns immediately with a jobId.
 */
async function triggerIngest(req, res, next) {
  try {
    logger.info(`Ingest triggered by ${req.ip}`);

    const result = await ingestService.triggerIngest();

    // 202 Accepted — request accepted but not yet complete
    res.status(202).json(result);

  } catch (err) {
    next(err);
  }
}


/**
 * GET /ingest/status/:jobId
 * Returns the current status of a scraper pipeline run.
 */
async function getIngestStatus(req, res, next) {
  try {
    const { jobId } = req.params;

    const result = await ingestService.getIngestStatus(parseInt(jobId, 10));

    res.status(200).json(result);

  } catch (err) {
    next(err);
  }
}


/**
 * GET /ingest/status
 * Returns the latest ingest job (no jobId needed).
 */
async function getLatestStatus(req, res, next) {
  try {
    const result = await ingestService.getLatestStatus();
    res.status(200).json(result);

  } catch (err) {
    next(err);
  }
}


module.exports = {
  triggerIngest,
  getIngestStatus,
  getLatestStatus,
};
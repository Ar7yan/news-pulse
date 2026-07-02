// =============================================================================
// timelineController.js — HTTP Handler for Timeline Endpoint
// =============================================================================

const timelineService = require('../services/timelineService');
const logger          = require('../middleware/logger');


/**
 * GET /timeline
 * Returns clusters formatted for vis-timeline rendering.
 *
 * Query params:
 *   source — filter by news source
 *   days   — how many days back (default: 7)
 */
async function getTimeline(req, res, next) {
  try {
    const { source, days } = req.query;

    const result = await timelineService.getTimeline({
      source,
      days: parseInt(days, 10),
    });

    res.status(200).json(result);

  } catch (err) {
    next(err);
  }
}


module.exports = { getTimeline };
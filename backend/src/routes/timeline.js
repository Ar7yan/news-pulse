// =============================================================================
// routes/timeline.js — Timeline Route Definitions
// =============================================================================

const express = require('express');
const router  = express.Router();

const timelineController        = require('../controllers/timelineController');
const { validate, schemas }     = require('../middleware/validate');


// GET /timeline
// Returns vis-timeline formatted cluster data
router.get(
  '/',
  validate(schemas.timelineQuery, 'query'),
  timelineController.getTimeline
);


module.exports = router;
// =============================================================================
// ingestService.js — Business Logic for Triggering the Scraper
// =============================================================================
// The POST /ingest/trigger endpoint runs the Python scraper as a child process.
//
// WHY A CHILD PROCESS?
// The Python scraper can take 2-5 minutes to run.
// We don't want the HTTP request to hang for 5 minutes.
// Instead we:
//   1. Start the scraper in the background (non-blocking)
//   2. Return a jobId immediately to the client
//   3. Client polls GET /ingest/status/:jobId to check progress
// =============================================================================

const { spawn }  = require('child_process');
const path       = require('path');
const db         = require('../models/index');
const logger     = require('../middleware/logger');

// Track running jobs in memory
// In production, you'd use Redis for this
const runningJobs = new Map();


/**
 * Trigger the Python scraper pipeline.
 * Runs asynchronously — returns jobId immediately.
 *
 * @returns {object} { jobId, message }
 */
async function triggerIngest() {
  // Check if a job is already running
  const activeJob = [...runningJobs.values()].find(j => j.status === 'running');

  if (activeJob) {
    logger.warn(`Ingest already running — job #${activeJob.jobId}`);
    return {
      success: false,
      message: `Scraper is already running (job #${activeJob.jobId})`,
      jobId  : activeJob.jobId,
    };
  }

  // Create a job record in DB
  const jobId = await db.createIngestJob();
  logger.info(`Triggered ingest job #${jobId}`);

  // Start the scraper in background (don't await)
  runScraperAsync(jobId);

  return {
    success: true,
    message: 'Scraper pipeline started',
    jobId,
    statusUrl: `/ingest/status/${jobId}`,
  };
}


/**
 * Get the status of an ingest job.
 *
 * @param {number} jobId
 * @returns {object} Job status details
 */
async function getIngestStatus(jobId) {
  const job = await db.getIngestJob(jobId);

  if (!job) {
    const { NotFoundError } = require('../middleware/errorHandler');
    throw new NotFoundError(`Ingest job #${jobId}`);
  }

  // Check if job is in our running map
  const memoryJob = runningJobs.get(jobId);

  return {
    success: true,
    data   : {
      jobId          : job.id,
      status         : job.status,
      errorMessage   : job.error_message   || null,
      startedAt      : job.started_at,
      completedAt    : job.completed_at    || null,
      durationSeconds: job.duration_seconds || null,
      stats: {
        articlesScraped  : job.articles_scraped   || 0,
        articlesSkipped  : job.articles_skipped   || 0,
        clustersGenerated: job.clusters_generated || 0,
        sourcesProcessed : job.sources_processed  || [],
      },
    },
  };
}


/**
 * Get the latest ingest job status.
 * Used when frontend wants to know the last run without a jobId.
 */
async function getLatestStatus() {
  const job = await db.getLatestIngestJob();

  if (!job) {
    return {
      success: true,
      data   : null,
      message: 'No ingest jobs found',
    };
  }

  return {
    success: true,
    data   : {
      jobId          : job.id,
      status         : job.status,
      startedAt      : job.started_at,
      completedAt    : job.completed_at || null,
      articlesScraped: job.articles_scraped || 0,
      clustersGenerated: job.clusters_generated || 0,
    },
  };
}


// =============================================================================
// Private: Run the Python scraper as a background child process
// =============================================================================

async function runScraperAsync(jobId) {
  // Track in memory
  runningJobs.set(jobId, { jobId, status: 'running', startedAt: new Date() });

  // Update DB status to 'running'
  await db.updateIngestJobStatus(jobId, 'running');

  // Determine Python executable and script paths
  const pythonPath = process.env.PYTHON_PATH || 'python';
  const scraperPath = process.env.SCRAPER_PATH ||
    path.join(__dirname, '..', '..', '..', 'scraper', 'main.py');

  logger.info(`Starting Python scraper: ${pythonPath} ${scraperPath}`);

  const scraperProcess = spawn(pythonPath, [scraperPath], {
    // Set working directory to scraper folder
    cwd: path.dirname(scraperPath),
    env: {
      ...process.env,
      // Pass database URL to the Python process
      DATABASE_URL: process.env.DATABASE_URL,
    },
  });

  // Stream scraper output to our logger
  scraperProcess.stdout.on('data', (data) => {
    logger.info(`[Scraper] ${data.toString().trim()}`);
  });

  scraperProcess.stderr.on('data', (data) => {
    logger.warn(`[Scraper stderr] ${data.toString().trim()}`);
  });

  // Handle completion
  scraperProcess.on('close', async (exitCode) => {
    const success = exitCode === 0;

    if (success) {
      logger.info(`Scraper job #${jobId} completed successfully`);
      await db.updateIngestJobStatus(jobId, 'completed');
      runningJobs.set(jobId, { jobId, status: 'completed' });
    } else {
      const errorMsg = `Scraper exited with code ${exitCode}`;
      logger.error(`Scraper job #${jobId} failed: ${errorMsg}`);
      await db.updateIngestJobStatus(jobId, 'failed', errorMsg);
      runningJobs.set(jobId, { jobId, status: 'failed' });
    }

    // Clean up memory after 10 minutes
    setTimeout(() => runningJobs.delete(jobId), 600000);
  });

  scraperProcess.on('error', async (err) => {
    logger.error(`Failed to start scraper: ${err.message}`);
    await db.updateIngestJobStatus(jobId, 'failed', err.message);
    runningJobs.set(jobId, { jobId, status: 'failed' });
  });
}


module.exports = {
  triggerIngest,
  getIngestStatus,
  getLatestStatus,
};
// =============================================================================
// timelineService.js — Business Logic for Timeline
// =============================================================================
// Transforms cluster data into the format vis-timeline expects.
//
// vis-timeline needs items in this shape:
// {
//   id      : 1,
//   content : "Climate Change",
//   start   : "2024-01-15",
//   end     : "2024-01-16",   (optional)
//   group   : "bbc",          (optional)
//   className: "bbc-item",    (optional, for CSS styling)
// }
// =============================================================================

const db     = require('../models/index');
const logger = require('../middleware/logger');


/**
 * Get timeline data formatted for vis-timeline.
 *
 * @param {object} options
 * @param {string} options.source - Filter by source
 * @param {number} options.days   - How many days back to include
 * @returns {object} Timeline items and groups
 */
async function getTimeline({ source = 'all', days = 7 } = {}) {
  logger.info(`Getting timeline — source=${source}, days=${days}`);

  const clusters = await db.getTimelineClusters({ source, days });

  if (!clusters.length) {
    return {
      success: true,
      data   : {
        items : [],
        groups: getGroups(),
        meta  : { totalClusters: 0, days },
      },
    };
  }

  // Transform clusters into vis-timeline items
  const items = clusters.map(cluster => formatTimelineItem(cluster));

  return {
    success: true,
    data   : {
      items,
      groups: getGroups(),
      meta  : {
        totalClusters: clusters.length,
        days,
        source,
        dateRange: {
          start: items.reduce(
            (min, i) => i.start < min ? i.start : min,
            items[0]?.start
          ),
          end: items.reduce(
            (max, i) => (i.end || i.start) > max ? (i.end || i.start) : max,
            items[0]?.end || items[0]?.start
          ),
        },
      },
    },
  };
}


// =============================================================================
// Formatters
// =============================================================================

/**
 * Format a cluster into a vis-timeline item.
 */
function formatTimelineItem(cluster) {
  const sources = Array.isArray(cluster.sources)
    ? cluster.sources.filter(Boolean)
    : [];

  // Determine primary source for grouping and styling
  const primarySource = sources[0] || 'unknown';

  // Build a rich content string for the timeline item
  const content = buildTimelineContent(cluster);

  const item = {
    id         : cluster.id,
    content,
    start      : cluster.start_time,
    group      : primarySource,
    className  : `timeline-item ${primarySource}-item`,

    // Extra data for the frontend to use when clicked
    meta: {
      label       : cluster.label,
      keywords    : cluster.keywords || [],
      articleCount: parseInt(cluster.total_articles, 10) || 0,
      sources,
    },
  };

  // Add end time if we have a range (article span > 1 hour)
  if (cluster.end_time && cluster.start_time) {
    const startMs = new Date(cluster.start_time).getTime();
    const endMs   = new Date(cluster.end_time).getTime();

    // Only show as range if articles span more than 1 hour
    if (endMs - startMs > 3600000) {
      item.end = cluster.end_time;
      item.type = 'range';
    } else {
      item.type = 'point';
    }
  } else {
    item.type = 'point';
  }

  return item;
}


/**
 * Build the HTML content string for a timeline item.
 * This is what vis-timeline renders inside each block.
 */
function buildTimelineContent(cluster) {
  const count   = cluster.total_articles || cluster.article_count || 0;
  const sources = Array.isArray(cluster.sources)
    ? cluster.sources.filter(Boolean)
    : [];

  // Source badges
  const badges = sources
    .map(s => `<span class="source-badge ${s}">${s.toUpperCase()}</span>`)
    .join('');

  return `
    <div class="timeline-content">
      <div class="timeline-label">${cluster.label}</div>
      <div class="timeline-meta">
        ${badges}
        <span class="article-count">${count} articles</span>
      </div>
    </div>
  `.trim();
}


/**
 * Define vis-timeline groups (one per news source).
 * Groups create horizontal lanes in the timeline.
 */
function getGroups() {
  return [
    { id: 'bbc',     content: '🇬🇧 BBC',     className: 'group-bbc'     },
    { id: 'reuters', content: '📰 Reuters',  className: 'group-reuters' },
    { id: 'npr',     content: '🎙️ NPR',      className: 'group-npr'     },
    { id: 'unknown', content: '❓ Other',    className: 'group-unknown' },
  ];
}


module.exports = { getTimeline };
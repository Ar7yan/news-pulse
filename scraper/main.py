# =============================================================================
# main.py — News Pulse Scraper Pipeline Orchestrator
# =============================================================================
# THIS IS THE ENTRY POINT. Run with:
#   cd C:\news-pulse\scraper
#   python main.py
#
# WHAT THIS DOES (in order):
#   1.  Initialize logging
#   2.  Connect to PostgreSQL
#   3.  Create an ingest_job record (status = 'running')
#   4.  Fetch RSS feeds → list of Article objects
#   5.  Extract full text for each article
#   6.  Save new articles to database
#   7.  Load recent articles for clustering
#   8.  Preprocess text (clean, tokenize, lemmatize)
#   9.  Build TF-IDF matrix
#   10. Run clustering algorithm
#   11. Save clusters to database
#   12. Update ingest_job (status = 'completed')
#   13. Close database connections
#
# IDEMPOTENT: Safe to run multiple times.
# Duplicates are skipped via URL hash deduplication.
# =============================================================================

import sys
import os
import traceback
from datetime import datetime

# ---------------------------------------------------------------------------
# Add scraper/ to Python path so imports work correctly
# Run from C:\news-pulse\scraper\ directory
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------------------
# Internal imports
# ---------------------------------------------------------------------------
from utils.logger import setup_logging, get_logger
from database.connection import init_pool, close_pool
from database.queries import (
    create_ingest_job,
    complete_ingest_job,
    fail_ingest_job,
    get_recent_articles,
    insert_article,
    get_article_count
)
from scraper.feed_parser import fetch_all_feeds
from scraper.article_extractor import extract_all_articles
from clustering.preprocessor import preprocess_articles
from clustering.vectorizer import build_tfidf_matrix
from clustering.clusterer import cluster_articles
from config.settings import RSS_FEEDS

# Initialize logging FIRST before anything else
setup_logging()
logger = get_logger(__name__)


# =============================================================================
# Pipeline Steps (each is a separate function for clarity)
# =============================================================================

def step_fetch_feeds():
    """
    Step 1: Fetch all RSS feeds.
    Returns list of Article objects (no full text yet).
    """
    logger.info("=" * 60)
    logger.info("STEP 1: Fetching RSS Feeds")
    logger.info("=" * 60)

    articles = fetch_all_feeds()

    logger.info(f"Step 1 complete — {len(articles)} new articles found")
    return articles


def step_extract_text(articles):
    """
    Step 2: Extract full article text from each URL.
    Returns same list with full_text populated.
    """
    logger.info("=" * 60)
    logger.info("STEP 2: Extracting Full Article Text")
    logger.info("=" * 60)

    if not articles:
        logger.info("No new articles to extract — skipping")
        return []

    enriched = extract_all_articles(articles)

    successful = sum(1 for a in enriched if a.extraction_success)
    logger.info(
        f"Step 2 complete — "
        f"{successful}/{len(enriched)} articles extracted successfully"
    )

    return enriched


def step_save_articles(articles):
    """
    Step 3: Save new articles to the database.
    Returns (articles_saved, articles_skipped) counts.
    """
    logger.info("=" * 60)
    logger.info("STEP 3: Saving Articles to Database")
    logger.info("=" * 60)

    if not articles:
        logger.info("No articles to save — skipping")
        return 0, 0

    saved   = 0
    skipped = 0

    for article in articles:
        try:
            article_id = insert_article(article.to_db_dict())

            if article_id is not None:
                saved += 1
            else:
                skipped += 1

        except Exception as e:
            logger.warning(
                f"Failed to save article '{article.title[:50]}': {e}"
            )
            skipped += 1

    total_in_db = get_article_count()
    logger.info(
        f"Step 3 complete — "
        f"{saved} saved, {skipped} skipped | "
        f"{total_in_db} total articles in database"
    )

    return saved, skipped


def step_cluster_articles(run_id):
    """
    Step 4: Load recent articles, run NLP clustering, save clusters.
    Returns number of clusters generated.
    """
    logger.info("=" * 60)
    logger.info("STEP 4: Running Topic Clustering")
    logger.info("=" * 60)

    # Load recent articles that have full text
    articles = get_recent_articles(limit=500)

    if len(articles) < 2:
        logger.warning(
            f"Only {len(articles)} articles with text available. "
            "Need at least 2 to cluster. "
            "Run the scraper again after some articles are saved."
        )
        return 0

    logger.info(f"Loaded {len(articles)} articles for clustering")

    # Preprocess text
    logger.info("Preprocessing article text...")
    preprocessed_texts = preprocess_articles(articles)

    # Build TF-IDF matrix
    logger.info("Building TF-IDF matrix...")
    try:
        tfidf_matrix, vectorizer = build_tfidf_matrix(preprocessed_texts)
    except ValueError as e:
        logger.error(f"Could not build TF-IDF matrix: {e}")
        return 0

    # Run clustering
    num_clusters = cluster_articles(
        articles           = articles,
        preprocessed_texts = preprocessed_texts,
        tfidf_matrix       = tfidf_matrix,
        vectorizer         = vectorizer,
        run_id             = run_id
    )

    logger.info(f"Step 4 complete — {num_clusters} clusters generated")
    return num_clusters


# =============================================================================
# Main Pipeline Runner
# =============================================================================

def run_pipeline():
    """
    Execute the full News Pulse ingestion and clustering pipeline.

    Returns:
        True if pipeline completed successfully, False if it failed
    """

    start_time = datetime.now()

    logger.info("=" * 60)
    logger.info("NEWS PULSE PIPELINE STARTING")
    logger.info(f"Time: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"Sources: {[f['label'] for f in RSS_FEEDS]}")
    logger.info("=" * 60)

    # ------------------------------------------------------------------
    # Initialize database connection pool
    # ------------------------------------------------------------------
    try:
        init_pool()
    except Exception as e:
        logger.error(f"FATAL: Could not connect to database: {e}")
        logger.error("Check your DATABASE_URL in scraper/.env")
        return False

    # ------------------------------------------------------------------
    # Create ingest job record
    # ------------------------------------------------------------------
    try:
        job_id = create_ingest_job()
        logger.info(f"Created ingest job #{job_id}")
    except Exception as e:
        logger.error(f"FATAL: Could not create ingest job: {e}")
        close_pool()
        return False

    # ------------------------------------------------------------------
    # Run pipeline steps
    # ------------------------------------------------------------------
    try:

        # Step 1: Fetch RSS feeds
        raw_articles = step_fetch_feeds()

        # Step 2: Extract full text
        enriched_articles = step_extract_text(raw_articles)

        # Step 3: Save to database
        articles_saved, articles_skipped = step_save_articles(enriched_articles)

        # Step 4: Cluster all recent articles
        clusters_generated = step_cluster_articles(job_id)

        # ------------------------------------------------------------------
        # Mark job as completed
        # ------------------------------------------------------------------
        sources_processed = list(set(f["name"] for f in RSS_FEEDS))

        complete_ingest_job(
            job_id             = job_id,
            articles_scraped   = articles_saved,
            articles_skipped   = articles_skipped,
            clusters_generated = clusters_generated,
            sources_processed  = sources_processed
        )

        # ------------------------------------------------------------------
        # Final summary
        # ------------------------------------------------------------------
        elapsed = (datetime.now() - start_time).seconds

        logger.info("=" * 60)
        logger.info("NEWS PULSE PIPELINE COMPLETE ✓")
        logger.info(f"  Duration:          {elapsed}s")
        logger.info(f"  Articles saved:    {articles_saved}")
        logger.info(f"  Articles skipped:  {articles_skipped}")
        logger.info(f"  Clusters created:  {clusters_generated}")
        logger.info(f"  Sources processed: {sources_processed}")
        logger.info("=" * 60)

        return True

    except Exception as e:
        # ------------------------------------------------------------------
        # Something unexpected failed — mark job as failed
        # ------------------------------------------------------------------
        error_msg = f"{type(e).__name__}: {str(e)}"
        logger.error(f"PIPELINE FAILED: {error_msg}")
        logger.error(traceback.format_exc())

        try:
            fail_ingest_job(job_id, error_msg)
        except Exception as db_err:
            logger.error(f"Could not update job status: {db_err}")

        return False

    finally:
        # Always close the connection pool
        close_pool()


# =============================================================================
# Entry Point
# =============================================================================

if __name__ == "__main__":
    success = run_pipeline()

    # Exit with proper code so cron jobs / CI can detect failures
    sys.exit(0 if success else 1)
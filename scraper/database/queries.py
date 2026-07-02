# =============================================================================
# queries.py — All Database Queries in One Place
# =============================================================================
# WHY THIS PATTERN?
# Keeping ALL SQL in one file means:
# - Easy to audit what queries exist
# - No SQL scattered across 10 different files
# - Easy to optimize later (add indexes, rewrite queries)
# - Controllers/services never write raw SQL
#
# Each function follows the same pattern:
#   1. Log what it's doing
#   2. Execute SQL using the context manager
#   3. Return Python objects (dicts/lists), never raw DB rows
# =============================================================================

from datetime import datetime
from typing import Optional
from utils.logger import get_logger
from database.connection import get_db_cursor

logger = get_logger(__name__)


# =============================================================================
# INGEST JOB QUERIES
# =============================================================================

def create_ingest_job() -> int:
    """
    Insert a new ingest job with 'running' status.
    Returns the new job's ID.
    """
    sql = """
        INSERT INTO ingest_jobs (status, started_at)
        VALUES ('running', NOW())
        RETURNING id
    """
    with get_db_cursor(commit=True) as cur:
        cur.execute(sql)
        row = cur.fetchone()
        job_id = row["id"]
        logger.info(f"Created ingest job #{job_id}")
        return job_id


def complete_ingest_job(
    job_id: int,
    articles_scraped: int,
    articles_skipped: int,
    clusters_generated: int,
    sources_processed: list
) -> None:
    """Mark an ingest job as completed with final stats."""
    sql = """
        UPDATE ingest_jobs SET
            status              = 'completed',
            completed_at        = NOW(),
            articles_scraped    = %s,
            articles_skipped    = %s,
            clusters_generated  = %s,
            sources_processed   = %s
        WHERE id = %s
    """
    with get_db_cursor(commit=True) as cur:
        cur.execute(sql, (
            articles_scraped,
            articles_skipped,
            clusters_generated,
            sources_processed,
            job_id
        ))
        logger.info(f"Completed ingest job #{job_id} — "
                   f"{articles_scraped} scraped, "
                   f"{clusters_generated} clusters")


def fail_ingest_job(job_id: int, error_message: str) -> None:
    """Mark an ingest job as failed with error details."""
    sql = """
        UPDATE ingest_jobs SET
            status        = 'failed',
            completed_at  = NOW(),
            error_message = %s
        WHERE id = %s
    """
    with get_db_cursor(commit=True) as cur:
        cur.execute(sql, (error_message, job_id))
        logger.error(f"Failed ingest job #{job_id}: {error_message}")


def get_ingest_job(job_id: int) -> Optional[dict]:
    """Get a single ingest job by ID."""
    sql = "SELECT * FROM ingest_jobs WHERE id = %s"
    with get_db_cursor() as cur:
        cur.execute(sql, (job_id,))
        row = cur.fetchone()
        return dict(row) if row else None


# =============================================================================
# ARTICLE QUERIES
# =============================================================================

def article_exists(url_hash: str) -> bool:
    """
    Check if an article already exists using its URL hash.
    This is our deduplication check — runs before every insert.

    Uses the unique index on url_hash for O(1) lookup.
    """
    sql = "SELECT 1 FROM articles WHERE url_hash = %s LIMIT 1"
    with get_db_cursor() as cur:
        cur.execute(sql, (url_hash,))
        return cur.fetchone() is not None


def insert_article(article: dict) -> Optional[int]:
    """
    Insert a new article into the database.

    Args:
        article: Dict with keys matching articles table columns

    Returns:
        New article ID, or None if insert failed
    """
    sql = """
        INSERT INTO articles (
            url, url_hash, source, title, description,
            full_text, author, published_at, feed_url
        )
        VALUES (
            %(url)s, %(url_hash)s, %(source)s, %(title)s, %(description)s,
            %(full_text)s, %(author)s, %(published_at)s, %(feed_url)s
        )
        ON CONFLICT (url_hash) DO NOTHING
        RETURNING id
    """
    with get_db_cursor(commit=True) as cur:
        cur.execute(sql, article)
        row = cur.fetchone()
        if row:
            logger.debug(f"Inserted article: {article.get('title', '')[:50]}")
            return row["id"]
        else:
            logger.debug(f"Skipped duplicate: {article.get('url', '')[:60]}")
            return None


def get_recent_articles(limit: int = 500) -> list:
    """
    Fetch recent articles for clustering.
    Only fetches articles that have full_text (needed for NLP).

    Args:
        limit: Maximum number of articles to return

    Returns:
        List of article dicts
    """
    sql = """
        SELECT
            id, title, description, full_text,
            source, url, published_at, scraped_at
        FROM articles
        WHERE
            full_text IS NOT NULL
            AND LENGTH(full_text) >= 200
        ORDER BY scraped_at DESC
        LIMIT %s
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (limit,))
        rows = cur.fetchall()
        logger.info(f"Fetched {len(rows)} articles for clustering")
        return [dict(row) for row in rows]


def get_article_count() -> int:
    """Get total number of articles in the database."""
    with get_db_cursor() as cur:
        cur.execute("SELECT COUNT(*) as count FROM articles")
        row = cur.fetchone()
        return row["count"]


# =============================================================================
# CLUSTER QUERIES
# =============================================================================

def delete_old_clusters() -> None:
    """
    Delete all existing clusters before regenerating.

    WHY? We regenerate clusters on every run (not incremental).
    CASCADE delete automatically removes cluster_items too.
    """
    with get_db_cursor(commit=True) as cur:
        cur.execute("DELETE FROM cluster_items")
        cur.execute("DELETE FROM clusters")
        logger.info("Cleared old clusters")


def insert_cluster(
    label: str,
    keywords: list,
    article_count: int,
    run_id: int,
    earliest_at: Optional[datetime],
    latest_at: Optional[datetime]
) -> int:
    """
    Insert a new cluster and return its ID.

    Args:
        label:         Human-readable topic name
        keywords:      Top TF-IDF terms for this cluster
        article_count: Number of articles in this cluster
        run_id:        ID of the current ingest job
        earliest_at:   Oldest article date in cluster
        latest_at:     Newest article date in cluster

    Returns:
        New cluster ID
    """
    sql = """
        INSERT INTO clusters (
            label, keywords, article_count, run_id,
            earliest_article_at, latest_article_at
        )
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
    """
    with get_db_cursor(commit=True) as cur:
        cur.execute(sql, (
            label,
            keywords,
            article_count,
            run_id,
            earliest_at,
            latest_at
        ))
        row = cur.fetchone()
        cluster_id = row["id"]
        logger.debug(f"Inserted cluster #{cluster_id}: '{label}'")
        return cluster_id


def insert_cluster_items(items: list) -> None:
    """
    Bulk insert article-cluster mappings.

    Args:
        items: List of dicts with keys:
               cluster_id, article_id, similarity_score
    """
    if not items:
        return

    sql = """
        INSERT INTO cluster_items (cluster_id, article_id, similarity_score)
        VALUES (%(cluster_id)s, %(article_id)s, %(similarity_score)s)
        ON CONFLICT (cluster_id, article_id) DO NOTHING
    """
    with get_db_cursor(commit=True) as cur:
        # executemany is more efficient than looping execute()
        cur.executemany(sql, items)
        logger.debug(f"Inserted {len(items)} cluster item mappings")


def get_all_clusters() -> list:
    """
    Get all clusters with their article sources.
    Used by GET /clusters API endpoint.
    """
    sql = """
        SELECT * FROM cluster_summary
        ORDER BY article_count DESC
    """
    with get_db_cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()
        return [dict(row) for row in rows]


def get_cluster_with_articles(cluster_id: int) -> Optional[dict]:
    """
    Get a single cluster with all its articles.
    Used by GET /clusters/:id API endpoint.
    """
    # First get the cluster
    cluster_sql = "SELECT * FROM clusters WHERE id = %s"

    # Then get its articles with similarity scores
    articles_sql = """
        SELECT
            a.id, a.title, a.url, a.source,
            a.description, a.published_at, a.author,
            ci.similarity_score
        FROM cluster_items ci
        JOIN articles a ON a.id = ci.article_id
        WHERE ci.cluster_id = %s
        ORDER BY ci.similarity_score DESC NULLS LAST
    """

    with get_db_cursor() as cur:
        cur.execute(cluster_sql, (cluster_id,))
        cluster_row = cur.fetchone()

        if not cluster_row:
            return None

        cluster = dict(cluster_row)

        cur.execute(articles_sql, (cluster_id,))
        articles = [dict(row) for row in cur.fetchall()]

        cluster["articles"] = articles
        return cluster
# =============================================================================
# feed_parser.py — RSS Feed Ingestion
# =============================================================================
# This file is responsible for:
#   1. Fetching each RSS feed URL
#   2. Parsing the feed entries (feedparser handles format differences)
#   3. Normalizing fields across BBC / Reuters / NPR formats
#   4. Deduplication check against the database
#   5. Returning a list of Article objects ready for text extraction
#
# WHY FEEDPARSER?
# RSS feeds are inconsistent. BBC uses one date format, Reuters another.
# feedparser normalizes all of this into a consistent interface.
# =============================================================================

import feedparser
import time
from typing import List

from config.settings import RSS_FEEDS, MAX_ARTICLES_PER_FEED, REQUEST_TIMEOUT
from database.queries import article_exists
from models.article import Article
from utils.helpers import hash_url, clean_text, parse_date
from utils.logger import get_logger

logger = get_logger(__name__)


# =============================================================================
# Main Entry Point
# =============================================================================

def fetch_all_feeds() -> List[Article]:
    """
    Fetch articles from ALL configured RSS feeds.

    Returns:
        List of Article objects (not yet enriched with full_text)
    """
    all_articles = []
    seen_hashes  = set()   # In-memory dedup within this run

    logger.info(f"Starting RSS ingestion from {len(RSS_FEEDS)} feeds...")

    for feed_config in RSS_FEEDS:
        try:
            articles = fetch_single_feed(
                feed_url   = feed_config["url"],
                source_name= feed_config["name"],
                feed_label = feed_config["label"],
                seen_hashes= seen_hashes
            )
            all_articles.extend(articles)

            # Be polite — don't hammer servers
            time.sleep(1)

        except Exception as e:
            # ONE feed failing should NOT stop the entire pipeline
            logger.error(
                f"Failed to fetch feed '{feed_config['label']}': {e}",
                exc_info=True
            )
            continue

    logger.info(
        f"RSS ingestion complete — "
        f"{len(all_articles)} new articles found across all feeds"
    )
    return all_articles


# =============================================================================
# Single Feed Parser
# =============================================================================

def fetch_single_feed(
    feed_url: str,
    source_name: str,
    feed_label: str,
    seen_hashes: set
) -> List[Article]:
    """
    Fetch and parse a single RSS feed.

    Args:
        feed_url:    The RSS feed URL to fetch
        source_name: Short source identifier ('bbc', 'reuters', 'npr')
        feed_label:  Human readable name for logging
        seen_hashes: Set of url_hashes already seen this run (in-memory dedup)

    Returns:
        List of new Article objects from this feed
    """
    logger.info(f"Fetching {feed_label}...")

    # feedparser handles the HTTP request and XML parsing
    # It's fault-tolerant — won't crash on malformed XML
    feed = feedparser.parse(
        feed_url,
        agent="NewsPulse/1.0 (educational project)",
        request_headers={"Accept": "application/rss+xml, application/xml"}
    )

    # Check if fetch was successful
    if feed.bozo and not feed.entries:
        # bozo=True means the feed had errors, but entries might still exist
        logger.warning(
            f"Feed '{feed_label}' returned errors: "
            f"{getattr(feed, 'bozo_exception', 'unknown error')}"
        )
        return []

    if not feed.entries:
        logger.warning(f"Feed '{feed_label}' returned 0 entries")
        return []

    logger.info(f"  Found {len(feed.entries)} entries in {feed_label}")

    articles = []
    skipped_duplicate = 0
    skipped_invalid   = 0

    # Process up to MAX_ARTICLES_PER_FEED entries
    for entry in feed.entries[:MAX_ARTICLES_PER_FEED]:
        try:
            article = parse_feed_entry(
                entry      = entry,
                source_name= source_name,
                feed_url   = feed_url
            )

            if article is None:
                skipped_invalid += 1
                continue

            # --- Deduplication Check 1: In-memory (fast) ---
            if article.url_hash in seen_hashes:
                skipped_duplicate += 1
                continue

            # --- Deduplication Check 2: Database (accurate) ---
            if article_exists(article.url_hash):
                skipped_duplicate += 1
                seen_hashes.add(article.url_hash)
                continue

            # New article — add to results
            seen_hashes.add(article.url_hash)
            articles.append(article)

        except Exception as e:
            logger.warning(f"  Failed to parse entry: {e}")
            skipped_invalid += 1
            continue

    logger.info(
        f"  {feed_label}: {len(articles)} new | "
        f"{skipped_duplicate} duplicates | "
        f"{skipped_invalid} invalid"
    )

    return articles


# =============================================================================
# Entry Parser — normalizes fields across different feed formats
# =============================================================================

def parse_feed_entry(entry, source_name: str, feed_url: str):
    """
    Extract and normalize fields from a single RSS feed entry.

    Different news sources use different field names:
    - BBC:     entry.title, entry.summary, entry.link
    - Reuters: entry.title, entry.description, entry.link
    - NPR:     entry.title, entry.summary, entry.link, entry.author

    feedparser normalizes most of this, but we add extra safety.

    Args:
        entry:       feedparser entry object
        source_name: 'bbc', 'reuters', or 'npr'
        feed_url:    Original feed URL for metadata

    Returns:
        Article object, or None if entry is invalid
    """

    # --- URL (required) ---
    url = _extract_url(entry)
    if not url:
        logger.debug("Skipping entry with no URL")
        return None

    # --- Title (required) ---
    title = _extract_title(entry)
    if not title:
        logger.debug(f"Skipping entry with no title: {url[:60]}")
        return None

    # --- URL Hash (for deduplication) ---
    url_hash = hash_url(url)

    # --- Optional fields ---
    description = _extract_description(entry)
    author      = _extract_author(entry)
    published_at= _extract_published_at(entry)

    return Article(
        url         = url,
        url_hash    = url_hash,
        source      = source_name,
        title       = title,
        description = description,
        author      = author,
        published_at= published_at,
        feed_url    = feed_url,
    )


# =============================================================================
# Field Extractors — each handles the messiness of real RSS feeds
# =============================================================================

def _extract_url(entry) -> str:
    """Extract URL from feed entry. Try multiple field names."""
    # feedparser normalizes to .link, but check fallbacks
    url = (
        getattr(entry, "link", None) or
        getattr(entry, "id", None) or
        ""
    )
    return url.strip() if url else ""


def _extract_title(entry) -> str:
    """Extract and clean the article title."""
    title = getattr(entry, "title", None) or ""
    return clean_text(title).strip()


def _extract_description(entry) -> str:
    """
    Extract article summary/description.

    RSS feeds use different field names:
    - 'summary'     — most common (BBC, NPR)
    - 'description' — some Reuters feeds
    - 'content'     — full content (rare in RSS)
    """
    # Try each field in order of preference
    description = (
        getattr(entry, "summary", None) or
        getattr(entry, "description", None) or
        ""
    )

    # Clean HTML tags that sometimes appear in descriptions
    cleaned = clean_text(description)

    # Truncate very long descriptions (should be a summary, not full article)
    if len(cleaned) > 500:
        cleaned = cleaned[:500] + "..."

    return cleaned or None


def _extract_author(entry) -> str:
    """Extract author name(s) from feed entry."""
    # feedparser normalizes to .author
    author = getattr(entry, "author", None) or ""

    # Some feeds put "By John Smith" — strip the "By"
    if author.lower().startswith("by "):
        author = author[3:]

    return author.strip() or None


def _extract_published_at(entry):
    """
    Extract publication date.

    feedparser provides published_parsed (time.struct_time in UTC)
    We convert this to a proper datetime object.
    """
    # feedparser normalizes dates to published_parsed
    date_value = (
        getattr(entry, "published_parsed", None) or
        getattr(entry, "updated_parsed", None) or
        None
    )

    return parse_date(date_value)
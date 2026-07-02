# =============================================================================
# article_extractor.py — Full Article Text Extraction
# =============================================================================
# WHAT THIS DOES:
#   Takes an Article object (which only has title + url from RSS)
#   and fetches the actual webpage to extract the full article text.
#
# TWO-LIBRARY STRATEGY:
#   Primary:  trafilatura  — best accuracy, handles most news sites
#   Fallback: newspaper3k  — catches what trafilatura misses
#
# WHY TWO LIBRARIES?
#   No single library works on 100% of sites. News sites have paywalls,
#   JavaScript rendering, anti-scraping measures, etc.
#   Using two libraries in sequence gives us the best coverage.
#
# FAILURE HANDLING:
#   If BOTH libraries fail, we keep the article anyway (with full_text=None)
#   because the title + description alone are still useful for clustering.
# =============================================================================

import time
import requests
import trafilatura
from typing import List, Optional, Tuple
from newspaper import Article as NewspaperArticle
from newspaper import ArticleException

from config.settings import REQUEST_TIMEOUT, MIN_ARTICLE_LENGTH
from models.article import Article
from utils.helpers import clean_text, is_valid_article_text
from utils.logger import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# HTTP Session — reuse TCP connections across requests (much faster)
# ---------------------------------------------------------------------------
_session = requests.Session()
_session.headers.update({
    # Pretend to be a real browser to avoid bot detection
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
})


# =============================================================================
# Main Entry Point
# =============================================================================

def extract_all_articles(articles: List[Article]) -> List[Article]:
    """
    Enrich a list of articles with full text extraction.

    Processes each article one at a time with a small delay
    between requests to avoid overwhelming news servers.

    Args:
        articles: List of Article objects from feed_parser
                  (these only have title + url so far)

    Returns:
        Same list with full_text populated where extraction succeeded
    """
    total   = len(articles)
    success = 0
    failed  = 0

    logger.info(f"Starting full-text extraction for {total} articles...")

    for i, article in enumerate(articles, 1):
        try:
            logger.debug(f"  [{i}/{total}] Extracting: {article.title[:50]}")

            enriched = extract_single_article(article)

            if enriched.extraction_success:
                success += 1
            else:
                failed += 1

            # Replace in list with enriched version
            articles[i - 1] = enriched

        except Exception as e:
            logger.warning(
                f"  [{i}/{total}] Unexpected error extracting "
                f"'{article.url[:60]}': {e}"
            )
            failed += 1

        # Polite delay between requests — 0.5s is enough to avoid rate limits
        # without slowing us down too much
        time.sleep(0.5)

    logger.info(
        f"Extraction complete — "
        f"{success}/{total} succeeded, {failed} failed"
    )

    return articles


# =============================================================================
# Single Article Extractor
# =============================================================================

def extract_single_article(article: Article) -> Article:
    """
    Extract full text for one article, trying two methods.

    Strategy:
        1. Fetch raw HTML (shared between both methods)
        2. Try trafilatura first
        3. If that fails, try newspaper3k
        4. If both fail, keep article with full_text=None

    Args:
        article: Article object with url populated

    Returns:
        Same Article object with full_text and extraction fields set
    """

    # Step 1: Fetch the raw HTML
    html, fetch_error = _fetch_html(article.url)

    if not html:
        logger.debug(
            f"  Could not fetch HTML for '{article.url[:60]}': {fetch_error}"
        )
        # Return article unchanged — full_text stays None
        return article

    # Step 2: Try trafilatura (primary)
    text, method = _try_trafilatura(html, article.url)

    # Step 3: Try newspaper3k (fallback)
    if not text:
        text, method = _try_newspaper(html, article.url)

    # Step 4: Validate and store result
    if text and is_valid_article_text(text, MIN_ARTICLE_LENGTH):
        article.full_text          = clean_text(text)
        article.extraction_success = True
        article.extraction_method  = method
        logger.debug(
            f"  ✓ Extracted {len(article.full_text)} chars "
            f"via {method}"
        )
    else:
        article.extraction_success = False
        article.extraction_method  = "failed"
        logger.debug(
            f"  ✗ Extraction failed or text too short "
            f"for '{article.title[:40]}'"
        )

    return article


# =============================================================================
# HTML Fetcher
# =============================================================================

def _fetch_html(url: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Fetch raw HTML from a URL.

    Returns:
        Tuple of (html_string, error_message)
        On success: (html, None)
        On failure: (None, error_description)
    """
    try:
        response = _session.get(
            url,
            timeout=REQUEST_TIMEOUT,
            allow_redirects=True,
            # Don't download huge files (images, PDFs, etc.)
            stream=True
        )

        # Check content type — we only want HTML
        content_type = response.headers.get("Content-Type", "").lower()
        if "text/html" not in content_type and "text/plain" not in content_type:
            return None, f"Wrong content type: {content_type}"

        # Check response code
        if response.status_code == 200:
            # Read up to 5MB max (most articles are <500KB)
            html = response.text[:5_000_000]
            return html, None

        elif response.status_code == 403:
            return None, "403 Forbidden (paywall or bot detection)"

        elif response.status_code == 404:
            return None, "404 Not Found"

        else:
            return None, f"HTTP {response.status_code}"

    except requests.exceptions.Timeout:
        return None, f"Timeout after {REQUEST_TIMEOUT}s"

    except requests.exceptions.TooManyRedirects:
        return None, "Too many redirects"

    except requests.exceptions.ConnectionError as e:
        return None, f"Connection error: {str(e)[:100]}"

    except Exception as e:
        return None, f"Unexpected error: {str(e)[:100]}"


# =============================================================================
# Extraction Method 1: trafilatura
# =============================================================================

def _try_trafilatura(
    html: str,
    url: str
) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract article text using trafilatura.

    trafilatura is purpose-built for news article extraction.
    It uses readability heuristics to identify the main content
    and strip navigation, ads, and boilerplate.

    Args:
        html: Raw HTML string
        url:  Article URL (used by trafilatura for link resolution)

    Returns:
        Tuple of (extracted_text, method_name) or (None, None) on failure
    """
    try:
        text = trafilatura.extract(
            html,
            url=url,

            # Include author and date metadata in output
            include_comments=False,  # Skip comment sections
            include_tables=False,    # Skip data tables

            # Favor precision over recall
            # (better to get less text than to include nav/ads)
            favor_precision=True,

            # Minimum text length to consider valid
            # (filters out pages that are mostly JavaScript)
            deduplicate=True,        # Remove duplicate paragraphs
        )

        if text and len(text.strip()) > 100:
            return text.strip(), "trafilatura"

        return None, None

    except Exception as e:
        logger.debug(f"trafilatura failed on {url[:60]}: {e}")
        return None, None


# =============================================================================
# Extraction Method 2: newspaper3k (fallback)
# =============================================================================

def _try_newspaper(
    html: str,
    url: str
) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract article text using newspaper3k as fallback.

    newspaper3k uses a different algorithm than trafilatura,
    so it often succeeds where trafilatura fails (and vice versa).

    We pass pre-fetched HTML to avoid a second HTTP request.

    Args:
        html: Raw HTML string (already fetched)
        url:  Article URL

    Returns:
        Tuple of (extracted_text, method_name) or (None, None) on failure
    """
    try:
        # Create Article object with the URL
        news_article = NewspaperArticle(url)

        # Set the HTML directly — skip newspaper's own download
        # This avoids making a second HTTP request to the same URL
        news_article.set_html(html)

        # Parse the HTML
        news_article.parse()

        text = news_article.text

        if text and len(text.strip()) > 100:
            return text.strip(), "newspaper3k"

        return None, None

    except ArticleException as e:
        logger.debug(f"newspaper3k ArticleException on {url[:60]}: {e}")
        return None, None

    except Exception as e:
        logger.debug(f"newspaper3k failed on {url[:60]}: {e}")
        return None, None
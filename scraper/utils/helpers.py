# =============================================================================
# helpers.py — Reusable Utility Functions
# =============================================================================
# Small, pure functions used across the scraper pipeline.
# Each function does ONE thing and is independently testable.
# =============================================================================

import hashlib
import re
import unicodedata
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse, urlunparse

from utils.logger import get_logger

logger = get_logger(__name__)


# -----------------------------------------------------------------------------
# URL Utilities
# -----------------------------------------------------------------------------

def normalize_url(url: str) -> str:
    """
    Normalize a URL to a canonical form for consistent hashing.

    What this does:
    - Lowercases the scheme and host
    - Removes trailing slashes
    - Removes common tracking parameters (utm_source, etc.)
    - Removes URL fragments (#section)

    Example:
        "https://BBC.com/news/article/?utm_source=twitter#comments"
        → "https://bbc.com/news/article"
    """
    if not url:
        return url

    try:
        parsed = urlparse(url.strip())

        # Lowercase scheme and host
        scheme = parsed.scheme.lower()
        netloc = parsed.netloc.lower()

        # Remove trailing slash from path
        path = parsed.path.rstrip("/") or "/"

        # Remove tracking parameters
        TRACKING_PARAMS = {
            "utm_source", "utm_medium", "utm_campaign",
            "utm_term", "utm_content", "ref", "source"
        }

        if parsed.query:
            # Keep only non-tracking params, sorted for consistency
            clean_params = []
            for param in sorted(parsed.query.split("&")):
                key = param.split("=")[0].lower()
                if key not in TRACKING_PARAMS:
                    clean_params.append(param)
            query = "&".join(clean_params)
        else:
            query = ""

        # Rebuild URL without fragment
        normalized = urlunparse((scheme, netloc, path, "", query, ""))
        return normalized

    except Exception as e:
        logger.warning(f"Could not normalize URL '{url}': {e}")
        return url


def hash_url(url: str) -> str:
    """
    Generate a SHA-256 hash of a normalized URL.
    Used as the deduplication key in the database.

    Why SHA-256?
    - Fixed length (64 hex chars) — fits in CHAR(64) column
    - Collision-resistant — two different URLs won't produce the same hash
    - Fast — hashing is O(1) for typical URL lengths

    Args:
        url: Raw URL string

    Returns:
        64-character hex string
    """
    normalized = normalize_url(url)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def extract_domain(url: str) -> str:
    """
    Extract the domain from a URL.

    Example:
        "https://www.bbc.com/news/article" → "bbc.com"
    """
    try:
        netloc = urlparse(url).netloc.lower()
        # Remove www. prefix
        if netloc.startswith("www."):
            netloc = netloc[4:]
        return netloc
    except Exception:
        return ""


# -----------------------------------------------------------------------------
# Text Utilities
# -----------------------------------------------------------------------------

def clean_text(text: str) -> str:
    """
    Clean raw text extracted from HTML/RSS for storage and NLP.

    Steps:
    1. Normalize unicode (fix weird apostrophes, dashes, etc.)
    2. Remove HTML tags if any slipped through
    3. Collapse multiple whitespace into single spaces
    4. Strip leading/trailing whitespace

    Args:
        text: Raw text string

    Returns:
        Cleaned text string
    """
    if not text:
        return ""

    # 1. Normalize unicode characters
    text = unicodedata.normalize("NFKC", text)

    # 2. Remove any remaining HTML tags
    text = re.sub(r"<[^>]+>", " ", text)

    # 3. Remove HTML entities (&amp; &nbsp; etc.)
    text = re.sub(r"&[a-zA-Z]+;", " ", text)
    text = re.sub(r"&#\d+;", " ", text)

    # 4. Collapse whitespace
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def truncate_text(text: str, max_chars: int = 500) -> str:
    """
    Truncate text to a maximum length, ending at a word boundary.

    Used for generating descriptions/previews.
    """
    if not text or len(text) <= max_chars:
        return text

    # Find the last space before the limit
    truncated = text[:max_chars]
    last_space = truncated.rfind(" ")

    if last_space > 0:
        truncated = truncated[:last_space]

    return truncated + "..."


def is_valid_article_text(text: Optional[str], min_length: int = 200) -> bool:
    """
    Check if extracted article text is long enough to be useful.

    Articles with < 200 chars are usually:
    - Extraction failures (got a nav bar or cookie notice)
    - Paywalled content
    - Very short announcements not useful for clustering

    Args:
        text: The extracted article text
        min_length: Minimum character count to be considered valid

    Returns:
        True if text is usable, False otherwise
    """
    if not text:
        return False

    cleaned = clean_text(text)
    return len(cleaned) >= min_length


# -----------------------------------------------------------------------------
# Date Utilities
# -----------------------------------------------------------------------------

def parse_date(date_value) -> Optional[datetime]:
    """
    Parse a date from various formats returned by RSS feeds.

    RSS feeds return dates in many formats:
    - time.struct_time (from feedparser)
    - String like "Mon, 15 Jan 2024 10:30:00 GMT"
    - ISO format "2024-01-15T10:30:00Z"
    - None (date not provided)

    Always returns UTC-aware datetime or None.
    """
    if date_value is None:
        return None

    # feedparser returns time.struct_time
    if hasattr(date_value, "tm_year"):
        try:
            import calendar
            timestamp = calendar.timegm(date_value)
            return datetime.fromtimestamp(timestamp, tz=timezone.utc)
        except Exception as e:
            logger.debug(f"Could not parse struct_time: {e}")
            return None

    # String date
    if isinstance(date_value, str):
        formats = [
            "%a, %d %b %Y %H:%M:%S %z",   # RFC 2822: Mon, 15 Jan 2024 10:30:00 +0000
            "%a, %d %b %Y %H:%M:%S GMT",   # GMT variant
            "%Y-%m-%dT%H:%M:%SZ",          # ISO 8601 UTC
            "%Y-%m-%dT%H:%M:%S%z",         # ISO 8601 with tz
            "%Y-%m-%d %H:%M:%S",           # Simple datetime
            "%Y-%m-%d",                    # Date only
        ]
        for fmt in formats:
            try:
                dt = datetime.strptime(date_value.strip(), fmt)
                # Ensure UTC timezone
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt
            except ValueError:
                continue

        logger.debug(f"Could not parse date string: '{date_value}'")
        return None

    # Already a datetime
    if isinstance(date_value, datetime):
        if date_value.tzinfo is None:
            return date_value.replace(tzinfo=timezone.utc)
        return date_value

    return None


def now_utc() -> datetime:
    """Return current UTC time as timezone-aware datetime."""
    return datetime.now(tz=timezone.utc)
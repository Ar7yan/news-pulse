# =============================================================================
# article.py — Article Data Model
# =============================================================================
# WHY A DATACLASS?
# A dataclass gives us:
# - Type hints on every field (catches bugs early)
# - Auto-generated __repr__ for easy debugging/logging
# - A clean, explicit contract for what an "article" looks like
#   as it flows through the pipeline
#
# PIPELINE FLOW:
#   RSS Feed → RawArticle (just title + url + date)
#       ↓
#   Article Extractor → Article (adds full_text)
#       ↓
#   Database → stored as a row in articles table
# =============================================================================

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Article:
    """
    Represents a single news article moving through the pipeline.

    Fields marked Optional can be None if:
    - The RSS feed didn't provide them
    - Extraction failed gracefully
    """

    # ------------------------------------------------------------------
    # Required fields — must always be present
    # ------------------------------------------------------------------
    url: str                        # Original article URL
    url_hash: str                   # SHA-256 hash of normalized URL
    source: str                     # 'bbc', 'reuters', or 'npr'
    title: str                      # Article headline

    # ------------------------------------------------------------------
    # Optional fields — may be None
    # ------------------------------------------------------------------
    description: Optional[str] = None      # Short summary from RSS feed
    full_text: Optional[str] = None        # Full article body (extracted)
    author: Optional[str] = None           # Author name(s)
    published_at: Optional[datetime] = None # Publication datetime
    feed_url: Optional[str] = None         # Which RSS feed it came from

    # ------------------------------------------------------------------
    # Internal tracking
    # ------------------------------------------------------------------
    extraction_success: bool = False       # Did full_text extraction work?
    extraction_method: Optional[str] = None # 'trafilatura' or 'newspaper'

    def to_db_dict(self) -> dict:
        """
        Convert to a dict ready for database insertion.
        Keys match the articles table column names exactly.
        """
        return {
            "url"         : self.url,
            "url_hash"    : self.url_hash,
            "source"      : self.source,
            "title"       : self.title,
            "description" : self.description,
            "full_text"   : self.full_text,
            "author"      : self.author,
            "published_at": self.published_at,
            "feed_url"    : self.feed_url,
        }

    def get_text_for_clustering(self) -> str:
        """
        Combine title + description + full_text into one string for NLP.

        WHY COMBINE THEM?
        - Title alone is too short for TF-IDF
        - Full text can be very long and slow
        - Combining gives the best signal for topic detection
        - We weight the title by repeating it (it's the most informative)
        """
        parts = []

        # Repeat title 3x — it's the most important signal
        if self.title:
            parts.extend([self.title] * 3)

        # Add description if available
        if self.description:
            parts.append(self.description)

        # Add first 1000 chars of full text (enough for topic signal)
        if self.full_text:
            parts.append(self.full_text[:1000])

        return " ".join(parts)

    def __repr__(self) -> str:
        """Clean string representation for logging."""
        return (
            f"Article("
            f"source={self.source!r}, "
            f"title={self.title[:50]!r}, "
            f"has_text={self.extraction_success}"
            f")"
        )
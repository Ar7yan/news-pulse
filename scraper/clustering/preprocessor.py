# =============================================================================
# preprocessor.py — Text Cleaning & Normalization for NLP
# =============================================================================
# WHAT THIS DOES:
#   Raw article text is messy — it has HTML, punctuation, numbers,
#   common words like "the", "and", "is" that add noise to clustering.
#
#   This file cleans and normalizes text so TF-IDF gets the best signal.
#
# PIPELINE:
#   Raw Text
#     → lowercase
#     → remove punctuation & numbers
#     → tokenize (split into words)
#     → remove stopwords ("the", "and", "is", "was"...)
#     → lemmatize ("running" → "run", "policies" → "policy")
#     → rejoin into clean string
#     → ready for TF-IDF
# =============================================================================

import re
import string
from typing import List

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

from utils.logger import get_logger

logger = get_logger(__name__)


# -----------------------------------------------------------------------------
# Download required NLTK data (runs once, cached locally after)
# -----------------------------------------------------------------------------
def download_nltk_data():
    """
    Download required NLTK datasets.
    Safe to call multiple times — NLTK skips if already downloaded.
    """
    packages = [
        ("tokenizers/punkt",          "punkt"),
        ("tokenizers/punkt_tab",      "punkt_tab"),
        ("corpora/stopwords",         "stopwords"),
        ("corpora/wordnet",           "wordnet"),
        ("corpora/omw-1.4",           "omw-1.4"),
    ]

    for path, package in packages:
        try:
            nltk.data.find(path)
        except LookupError:
            logger.info(f"Downloading NLTK package: {package}")
            nltk.download(package, quiet=True)


# Run downloads when module is imported
download_nltk_data()


# -----------------------------------------------------------------------------
# Initialize NLP tools (created once, reused for all articles)
# -----------------------------------------------------------------------------
_lemmatizer = WordNetLemmatizer()
_stop_words = set(stopwords.words("english"))

# Add news-specific stopwords that don't help with topic detection
_CUSTOM_STOPWORDS = {
    # News boilerplate
    "said", "say", "says", "told", "tell", "report", "reported",
    "according", "year", "years", "week", "month", "day", "time",
    "new", "also", "would", "could", "one", "two", "three",
    "first", "last", "earlier", "later", "today", "yesterday",

    # Common but meaningless in news context
    "people", "percent", "number", "including", "like",
    "make", "made", "know", "take", "come", "get", "go",
    "use", "used", "using", "need", "want",

    # News site boilerplate
    "click", "read", "more", "share", "subscribe", "newsletter",
    "copyright", "rights", "reserved", "advertisement",
}

_stop_words.update(_CUSTOM_STOPWORDS)


# =============================================================================
# Main Preprocessing Function
# =============================================================================

def preprocess_text(text: str) -> str:
    """
    Clean and normalize text for TF-IDF vectorization.

    Args:
        text: Raw article text (title + description + full_text combined)

    Returns:
        Clean, normalized string ready for TF-IDF

    Example:
        Input:  "The President's policies are affecting climate change globally!"
        Output: "president policy affect climate change globally"
    """
    if not text or not text.strip():
        return ""

    # Step 1: Lowercase everything
    text = text.lower()

    # Step 2: Remove URLs (they add noise, not topic signal)
    text = re.sub(r"http\S+|www\.\S+", " ", text)

    # Step 3: Remove email addresses
    text = re.sub(r"\S+@\S+", " ", text)

    # Step 4: Remove numbers (usually not useful for topic clustering)
    text = re.sub(r"\d+", " ", text)

    # Step 5: Remove punctuation
    # Replace with space (not empty string) to avoid joining words
    text = text.translate(
        str.maketrans(string.punctuation, " " * len(string.punctuation))
    )

    # Step 6: Collapse multiple spaces
    text = re.sub(r"\s+", " ", text).strip()

    # Step 7: Tokenize — split into individual words
    try:
        tokens = word_tokenize(text)
    except Exception:
        # Fallback if NLTK tokenizer fails
        tokens = text.split()

    # Step 8: Filter tokens
    filtered_tokens = [
        token for token in tokens
        if (
            len(token) >= 3              # Remove very short words
            and token not in _stop_words # Remove stopwords
            and token.isalpha()          # Keep only alphabetic tokens
        )
    ]

    # Step 9: Lemmatize — reduce words to base form
    lemmatized = [
        _lemmatizer.lemmatize(token)
        for token in filtered_tokens
    ]

    # Step 10: Rejoin into a single string for TF-IDF
    result = " ".join(lemmatized)

    return result


# =============================================================================
# Batch Preprocessing Function
# =============================================================================

def preprocess_articles(articles: List[dict]) -> List[str]:
    """
    Preprocess text for a list of article dicts.

    Args:
        articles: List of article dicts from database
                  with 'title', 'description', 'full_text' keys

    Returns:
        List of preprocessed text strings (same order as input)
    """
    # Guard clause — return empty list if no articles
    if not articles:
        logger.warning("preprocess_articles received empty list")
        return []

    processed = []

    for i, article in enumerate(articles):
        try:
            # Handle both Article objects and plain dicts
            if hasattr(article, "get_text_for_clustering"):
                # Article dataclass object
                raw_text = article.get_text_for_clustering()
            else:
                # Plain dict (from database queries)
                parts = []

                title = article.get("title") or ""
                desc  = article.get("description") or ""
                full  = article.get("full_text") or ""

                # Weight title by repeating it 3x
                # Title is the strongest topic signal
                if title:
                    parts.extend([title] * 3)

                if desc:
                    parts.append(desc)

                # Only use first 1000 chars of full text
                # Enough for topic signal, not too slow
                if full:
                    parts.append(full[:1000])

                raw_text = " ".join(parts)

            # Clean and normalize the text
            cleaned = preprocess_text(raw_text)
            processed.append(cleaned)

        except Exception as e:
            # If one article fails preprocessing,
            # add empty string and keep going
            logger.warning(f"Failed to preprocess article {i}: {e}")
            processed.append("")

    # Count articles with enough text for clustering
    sufficient = sum(1 for t in processed if len(t) > 50)

    logger.info(
        f"Preprocessed {len(processed)} articles — "
        f"{sufficient} with sufficient text"
    )

    # Return the list of preprocessed texts
    return processed
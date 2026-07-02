# =============================================================================
# vectorizer.py — TF-IDF Vectorization
# =============================================================================
# WHAT IS TF-IDF?
#   TF  = Term Frequency    — how often a word appears in THIS article
#   IDF = Inverse Document Frequency — how rare the word is across ALL articles
#
#   TF-IDF score = TF × IDF
#
#   High score = word appears often in THIS article but rarely elsewhere
#   → That word is a strong signal for what THIS article is about
#
# EXAMPLE:
#   "climate" appears in 5 articles out of 100
#   "the" appears in all 100 articles
#
#   "climate" gets HIGH TF-IDF → useful for clustering
#   "the" gets LOW TF-IDF → not useful (that's why we remove stopwords first)
#
# OUTPUT:
#   A matrix where:
#   - Each ROW is one article
#   - Each COLUMN is one word from the vocabulary
#   - Each CELL is the TF-IDF score of that word in that article
#
#   Shape: (num_articles, vocabulary_size)
#   Example: (150, 5000)
# =============================================================================

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from scipy.sparse import csr_matrix
from typing import List, Tuple

from config.settings import (
    TFIDF_MAX_FEATURES,
    TFIDF_NGRAM_RANGE,
    TOP_KEYWORDS_COUNT
)
from utils.logger import get_logger

logger = get_logger(__name__)


# =============================================================================
# Main Vectorization Function
# =============================================================================

def build_tfidf_matrix(
    preprocessed_texts: List[str]
) -> Tuple[csr_matrix, TfidfVectorizer]:
    """
    Convert preprocessed article texts into a TF-IDF matrix.

    Args:
        preprocessed_texts: List of cleaned text strings
                           (output from preprocessor.py)

    Returns:
        Tuple of:
        - tfidf_matrix: sparse matrix of shape (n_articles, n_features)
        - vectorizer:   fitted TfidfVectorizer (needed to extract keywords)

    Raises:
        ValueError: If not enough valid texts to build a matrix
    """

    # Filter out empty texts
    valid_count = sum(1 for t in preprocessed_texts if len(t.strip()) > 20)
    logger.info(
        f"Building TF-IDF matrix — "
        f"{valid_count}/{len(preprocessed_texts)} articles have sufficient text"
    )

    if valid_count < 2:
        raise ValueError(
            f"Need at least 2 articles with text to cluster, "
            f"got {valid_count}. Run the scraper first."
        )

    # Build TF-IDF vectorizer
    vectorizer = TfidfVectorizer(
        # Vocabulary settings
        max_features = TFIDF_MAX_FEATURES,   # Keep top 5000 words
        ngram_range  = TFIDF_NGRAM_RANGE,    # Include bigrams ("climate change")
        min_df       = 2,     # Word must appear in at least 2 articles
                              # (removes typos and very rare terms)
        max_df       = 0.85,  # Ignore words in >85% of articles
                              # (these are too common to be informative)

        # Text processing (we already preprocessed, but double-check)
        lowercase    = True,
        strip_accents = "unicode",

        # Weighting
        sublinear_tf = True,  # Apply log normalization to term frequency
                              # Prevents very long articles from dominating
    )

    # Fit and transform all texts into the matrix
    # fit()      = learn vocabulary from all texts
    # transform()= convert each text to a TF-IDF vector
    tfidf_matrix = vectorizer.fit_transform(preprocessed_texts)

    logger.info(
        f"TF-IDF matrix built — "
        f"shape: {tfidf_matrix.shape} "
        f"({tfidf_matrix.shape[0]} articles × "
        f"{tfidf_matrix.shape[1]} features)"
    )

    return tfidf_matrix, vectorizer


# =============================================================================
# Keyword Extraction
# =============================================================================

def get_cluster_keywords(
    article_indices: List[int],
    tfidf_matrix: csr_matrix,
    vectorizer: TfidfVectorizer,
    top_n: int = None
) -> List[str]:
    """
    Extract the most important keywords for a cluster of articles.

    HOW IT WORKS:
    1. Get the TF-IDF vectors for all articles in this cluster
    2. Sum them (so words that appear in MANY articles in the cluster
       get higher scores)
    3. Sort by score descending
    4. Return the top N words as keywords

    Args:
        article_indices: List of row indices in tfidf_matrix
        tfidf_matrix:    The full TF-IDF matrix
        vectorizer:      Fitted vectorizer (has the vocabulary)
        top_n:           How many keywords to return

    Returns:
        List of keyword strings, e.g. ["climate change", "carbon", "emissions"]
    """
    if top_n is None:
        top_n = TOP_KEYWORDS_COUNT

    if not article_indices:
        return []

    # Get the vocabulary (word → column index mapping)
    feature_names = vectorizer.get_feature_names_out()

    # Extract rows for this cluster's articles
    cluster_matrix = tfidf_matrix[article_indices]

    # Sum TF-IDF scores across all articles in the cluster
    # Shape: (1, n_features) → we squeeze to (n_features,)
    summed_scores = np.asarray(cluster_matrix.sum(axis=0)).flatten()

    # Get indices of top N scores
    top_indices = summed_scores.argsort()[-top_n:][::-1]

    # Convert indices back to words
    keywords = [feature_names[i] for i in top_indices]

    return keywords


def generate_cluster_label(keywords: List[str]) -> str:
    """
    Generate a human-readable cluster label from keywords.
    Removes duplicate words and capitalizes properly.
    """
    if not keywords:
        return "Uncategorized"

    seen   = set()
    unique = []

    for keyword in keywords:
        # Each keyword can be a phrase like "cape verde"
        # Split into words and check for duplicates
        words = keyword.split()
        unique_words = []

        for word in words:
            if word.lower() not in seen:
                seen.add(word.lower())
                unique_words.append(word)

        if unique_words:
            unique.append(" ".join(unique_words))

        # Stop once we have enough unique terms
        if len(unique) >= 4:
            break

    if not unique:
        return keywords[0].title() if keywords else "Uncategorized"

    # Capitalize and join
    label = " ".join(word.title() for phrase in unique
                     for word in phrase.split()
                     if word not in seen or unique.index(phrase) == 0)

    # Final dedup pass — remove consecutive duplicate words
    words      = label.split()
    deduped    = [words[0]] if words else []

    for word in words[1:]:
        if word.lower() != deduped[-1].lower():
            deduped.append(word)

    return " ".join(deduped)
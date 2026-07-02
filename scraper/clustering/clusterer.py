# =============================================================================
# clusterer.py — Article Clustering Using Cosine Similarity
# =============================================================================
# WHAT IS COSINE SIMILARITY?
#   Measures the angle between two TF-IDF vectors.
#   Score of 1.0 = identical topics
#   Score of 0.0 = completely different topics
#
# EXAMPLE:
#   Article A: "climate change carbon emissions policy"
#   Article B: "carbon tax climate policy environment"
#   Article C: "stock market nasdaq dow jones rally"
#
#   similarity(A, B) = 0.72  → same cluster (climate)
#   similarity(A, C) = 0.02  → different clusters
#   similarity(B, C) = 0.01  → different clusters
#
# ALGORITHM: Agglomerative Clustering
#   - Starts with every article as its own cluster
#   - Merges the two most similar clusters repeatedly
#   - Stops when no two clusters have similarity > threshold
#   - We use sklearn's AgglomerativeClustering with cosine distance
# =============================================================================

import numpy as np
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse import csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from typing import List, Dict, Tuple, Optional
from datetime import datetime

from config.settings import (
    SIMILARITY_THRESHOLD,
    MAX_CLUSTERS,
    MIN_CLUSTER_SIZE,
    TOP_KEYWORDS_COUNT
)
from clustering.vectorizer import get_cluster_keywords, generate_cluster_label
from database.queries import (
    delete_old_clusters,
    insert_cluster,
    insert_cluster_items
)
from utils.logger import get_logger

logger = get_logger(__name__)


# =============================================================================
# Main Clustering Function
# =============================================================================

def cluster_articles(
    articles: List[dict],
    preprocessed_texts: List[str],
    tfidf_matrix: csr_matrix,
    vectorizer: TfidfVectorizer,
    run_id: int
) -> int:
    """
    Cluster articles by topic and save results to database.

    Full pipeline:
    1. Compute cosine similarity matrix
    2. Run agglomerative clustering
    3. Filter out tiny clusters (noise)
    4. Generate keywords and labels for each cluster
    5. Save clusters + cluster_items to database

    Args:
        articles:           List of article dicts from database
        preprocessed_texts: Cleaned texts (parallel list to articles)
        tfidf_matrix:       TF-IDF matrix (n_articles × n_features)
        vectorizer:         Fitted TF-IDF vectorizer
        run_id:             Current ingest job ID

    Returns:
        Number of clusters generated
    """
    n_articles = len(articles)
    logger.info(f"Clustering {n_articles} articles...")

    if n_articles < 2:
        logger.warning("Need at least 2 articles to cluster")
        return 0

    # ------------------------------------------------------------------
    # Step 1: Compute cosine similarity matrix
    # ------------------------------------------------------------------
    logger.info("Computing cosine similarity matrix...")

    # Convert sparse matrix to dense for cosine_similarity
    # Shape: (n_articles, n_articles)
    # similarity_matrix[i][j] = how similar article i is to article j
    similarity_matrix = cosine_similarity(tfidf_matrix)

    logger.info(
        f"Similarity matrix computed — "
        f"shape: {similarity_matrix.shape}, "
        f"mean similarity: {similarity_matrix.mean():.3f}"
    )

    # ------------------------------------------------------------------
    # Step 2: Run Agglomerative Clustering
    # ------------------------------------------------------------------

    # Convert similarity to DISTANCE (clustering needs distances, not similarities)
    # distance = 1 - similarity
    # Similar articles (similarity=0.9) → small distance (0.1) → merged
    # Different articles (similarity=0.1) → large distance (0.9) → not merged
    distance_matrix = 1 - similarity_matrix

    # Clip to [0, 1] to fix floating point issues
    distance_matrix = np.clip(distance_matrix, 0, 1)

    # Determine number of clusters
    # We don't know the right number upfront, so we use a distance threshold
    # Articles within SIMILARITY_THRESHOLD of each other get merged
    distance_threshold = 1 - SIMILARITY_THRESHOLD

    # Cap at MAX_CLUSTERS or n_articles (whichever is smaller)
    n_clusters_max = min(MAX_CLUSTERS, n_articles // MIN_CLUSTER_SIZE)
    n_clusters_max = max(n_clusters_max, 1)

    logger.info(
        f"Running AgglomerativeClustering — "
        f"distance_threshold={distance_threshold:.2f}, "
        f"max_clusters={n_clusters_max}"
    )

    try:
        clustering = AgglomerativeClustering(
            n_clusters        = None,           # Don't fix number of clusters
            distance_threshold= distance_threshold,
            metric            = "precomputed",  # We provide our own distance matrix
            linkage           = "average",      # Use average distance between clusters
        )

        # labels[i] = which cluster article i belongs to
        labels = clustering.fit_predict(distance_matrix)

    except Exception as e:
        logger.error(f"Clustering failed: {e}", exc_info=True)
        return 0

    # ------------------------------------------------------------------
    # Step 3: Group articles by cluster label
    # ------------------------------------------------------------------
    cluster_groups: Dict[int, List[int]] = {}

    for article_idx, cluster_label in enumerate(labels):
        cluster_label = int(cluster_label)
        if cluster_label not in cluster_groups:
            cluster_groups[cluster_label] = []
        cluster_groups[cluster_label].append(article_idx)

    logger.info(
        f"Found {len(cluster_groups)} raw clusters "
        f"(before filtering small ones)"
    )

    # ------------------------------------------------------------------
    # Step 4: Filter small clusters (noise)
    # ------------------------------------------------------------------
    valid_clusters = {
        label: indices
        for label, indices in cluster_groups.items()
        if len(indices) >= MIN_CLUSTER_SIZE
    }

    logger.info(
        f"{len(valid_clusters)} clusters remain "
        f"after filtering (min_size={MIN_CLUSTER_SIZE})"
    )

    if not valid_clusters:
        logger.warning(
            "No valid clusters found. Try lowering SIMILARITY_THRESHOLD "
            "or MIN_CLUSTER_SIZE in .env"
        )
        return 0

    # ------------------------------------------------------------------
    # Step 5: Save to database
    # ------------------------------------------------------------------

    # Clear old clusters first
    delete_old_clusters()

    clusters_saved = 0

    # Sort clusters by size (largest first)
    sorted_clusters = sorted(
        valid_clusters.items(),
        key=lambda x: len(x[1]),
        reverse=True
    )

    # Respect MAX_CLUSTERS limit
    sorted_clusters = sorted_clusters[:MAX_CLUSTERS]

    for cluster_label, article_indices in sorted_clusters:
        try:
            clusters_saved += _save_cluster(
                cluster_label    = cluster_label,
                article_indices  = article_indices,
                articles         = articles,
                tfidf_matrix     = tfidf_matrix,
                vectorizer       = vectorizer,
                similarity_matrix= similarity_matrix,
                run_id           = run_id
            )
        except Exception as e:
            logger.error(
                f"Failed to save cluster {cluster_label}: {e}",
                exc_info=True
            )
            continue

    logger.info(f"Clustering complete — {clusters_saved} clusters saved")
    return clusters_saved


# =============================================================================
# Save a Single Cluster
# =============================================================================

def _save_cluster(
    cluster_label: int,
    article_indices: List[int],
    articles: List[dict],
    tfidf_matrix: csr_matrix,
    vectorizer: TfidfVectorizer,
    similarity_matrix: np.ndarray,
    run_id: int
) -> int:
    """
    Generate keywords, label, and save one cluster to the database.

    Returns:
        1 if saved successfully, 0 otherwise
    """

    # --- Generate keywords for this cluster ---
    keywords = get_cluster_keywords(
        article_indices = article_indices,
        tfidf_matrix    = tfidf_matrix,
        vectorizer      = vectorizer,
        top_n           = TOP_KEYWORDS_COUNT
    )

    if not keywords:
        logger.warning(f"No keywords found for cluster {cluster_label}, skipping")
        return 0

    # --- Generate human-readable label ---
    label = generate_cluster_label(keywords)

    # --- Get date range of articles in this cluster ---
    earliest_at, latest_at = _get_date_range(article_indices, articles)

    # --- Compute similarity scores for each article ---
    # Score = average similarity to all other articles in the cluster
    similarity_scores = _compute_similarity_scores(
        article_indices, similarity_matrix
    )

    # --- Insert cluster record ---
    db_cluster_id = insert_cluster(
        label         = label,
        keywords      = keywords,
        article_count = len(article_indices),
        run_id        = run_id,
        earliest_at   = earliest_at,
        latest_at     = latest_at
    )

    # --- Insert cluster_items (article memberships) ---
    cluster_items = [
        {
            "cluster_id"      : db_cluster_id,
            "article_id"      : articles[idx]["id"],
            "similarity_score": similarity_scores.get(idx, None)
        }
        for idx in article_indices
        if idx < len(articles)
    ]

    insert_cluster_items(cluster_items)

    logger.info(
        f"  Saved cluster '{label}' — "
        f"{len(article_indices)} articles, "
        f"keywords: {keywords[:3]}"
    )

    return 1


def _get_date_range(
    article_indices: List[int],
    articles: List[dict]
) -> Tuple[Optional[datetime], Optional[datetime]]:
    """Get earliest and latest published_at dates for a cluster."""
    dates = []

    for idx in article_indices:
        if idx < len(articles):
            pub_date = articles[idx].get("published_at")
            if pub_date:
                dates.append(pub_date)

    if not dates:
        return None, None

    return min(dates), max(dates)


def _compute_similarity_scores(
    article_indices: List[int],
    similarity_matrix: np.ndarray
) -> Dict[int, float]:
    """
    Compute each article's average similarity to others in the cluster.

    Higher score = more representative of the cluster topic.
    This is used to sort articles within a cluster (most relevant first).
    """
    scores = {}

    for idx in article_indices:
        # Get similarities to all other articles in the cluster
        other_indices = [i for i in article_indices if i != idx]

        if not other_indices:
            scores[idx] = 1.0
            continue

        # Average similarity to all cluster members
        cluster_sims = [similarity_matrix[idx][other] for other in other_indices]
        scores[idx] = float(np.mean(cluster_sims))

    return scores
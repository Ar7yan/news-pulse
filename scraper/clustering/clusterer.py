# =============================================================================
# clusterer.py — Article Clustering Using Cosine Similarity
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
    TOP_KEYWORDS_COUNT,
)
from clustering.vectorizer import get_cluster_keywords, generate_cluster_label
from database.queries import (
    delete_old_clusters,
    insert_cluster,
    insert_cluster_items,
    update_cluster_summaries,
)
from utils.logger import get_logger

logger = get_logger(__name__)


# =============================================================================
# Main Clustering Function
# =============================================================================

def cluster_articles(
    articles          : List[dict],
    preprocessed_texts: List[str],
    tfidf_matrix      : csr_matrix,
    vectorizer        : TfidfVectorizer,
    run_id            : int,
) -> int:
    """
    Cluster articles by topic, save to database, generate AI summaries.

    Returns:
        Number of clusters generated
    """
    n_articles = len(articles)
    logger.info(f"Clustering {n_articles} articles...")

    if n_articles < 2:
        logger.warning("Need at least 2 articles to cluster")
        return 0

    # ------------------------------------------------------------------
    # Step 1: Cosine similarity matrix
    # ------------------------------------------------------------------
    logger.info("Computing cosine similarity matrix...")
    similarity_matrix = cosine_similarity(tfidf_matrix)

    logger.info(
        f"Similarity matrix: {similarity_matrix.shape}, "
        f"mean={similarity_matrix.mean():.3f}"
    )

    # ------------------------------------------------------------------
    # Step 2: Agglomerative Clustering
    # ------------------------------------------------------------------
    distance_matrix   = np.clip(1 - similarity_matrix, 0, 1)
    distance_threshold = 1 - SIMILARITY_THRESHOLD

    n_clusters_max = max(min(MAX_CLUSTERS, n_articles // MIN_CLUSTER_SIZE), 1)

    logger.info(
        f"Running AgglomerativeClustering — "
        f"distance_threshold={distance_threshold:.2f}"
    )

    try:
        clustering = AgglomerativeClustering(
            n_clusters         = None,
            distance_threshold = distance_threshold,
            metric             = "precomputed",
            linkage            = "average",
        )
        labels = clustering.fit_predict(distance_matrix)

    except Exception as e:
        logger.error(f"Clustering failed: {e}", exc_info=True)
        return 0

    # ------------------------------------------------------------------
    # Step 3: Group articles by cluster
    # ------------------------------------------------------------------
    cluster_groups: Dict[int, List[int]] = {}
    for idx, label in enumerate(labels):
        label = int(label)
        if label not in cluster_groups:
            cluster_groups[label] = []
        cluster_groups[label].append(idx)

    logger.info(f"Found {len(cluster_groups)} raw clusters")

    # ------------------------------------------------------------------
    # Step 4: Filter small clusters
    # ------------------------------------------------------------------
    valid_clusters = {
        label: indices
        for label, indices in cluster_groups.items()
        if len(indices) >= MIN_CLUSTER_SIZE
    }

    logger.info(
        f"{len(valid_clusters)} clusters after filtering "
        f"(min_size={MIN_CLUSTER_SIZE})"
    )

    if not valid_clusters:
        logger.warning("No valid clusters found")
        return 0

    # ------------------------------------------------------------------
    # Step 5: Delete old clusters + save new ones
    # ------------------------------------------------------------------
    delete_old_clusters()

    clusters_saved = 0
    saved_cluster_ids = []

    sorted_clusters = sorted(
        valid_clusters.items(),
        key=lambda x: len(x[1]),
        reverse=True,
    )[:MAX_CLUSTERS]

    # Track cluster data for AI summarization
    clusters_for_summary = []

    for cluster_label, article_indices in sorted_clusters:
        try:
            result = _save_cluster(
                cluster_label     = cluster_label,
                article_indices   = article_indices,
                articles          = articles,
                tfidf_matrix      = tfidf_matrix,
                vectorizer        = vectorizer,
                similarity_matrix = similarity_matrix,
                run_id            = run_id,
            )

            if result["saved"]:
                clusters_saved += 1
                saved_cluster_ids.append(result["db_id"])
                clusters_for_summary.append({
                    "id"      : result["db_id"],
                    "label"   : result["label"],
                    "keywords": result["keywords"],
                    "articles": [
                        articles[idx] for idx in article_indices
                        if idx < len(articles)
                    ],
                })

        except Exception as e:
            logger.error(f"Failed to save cluster {cluster_label}: {e}")
            continue

    logger.info(f"Saved {clusters_saved} clusters to database")

    # ------------------------------------------------------------------
    # Step 6: Generate AI summaries (non-blocking)
    # ------------------------------------------------------------------
    try:
        from utils.summarizer import summarize_clusters_batch

        summaries = summarize_clusters_batch(clusters_for_summary)

        if summaries:
            update_cluster_summaries(summaries)
            logger.info(f"AI summaries saved for {len(summaries)} clusters")

    except ImportError:
        logger.debug("summarizer module not found — skipping AI summaries")
    except Exception as e:
        logger.warning(f"AI summarization failed (non-critical): {e}")

    logger.info(f"Clustering complete — {clusters_saved} clusters generated")
    return clusters_saved


# =============================================================================
# Save Single Cluster
# =============================================================================

def _save_cluster(
    cluster_label    : int,
    article_indices  : List[int],
    articles         : List[dict],
    tfidf_matrix     : csr_matrix,
    vectorizer       : TfidfVectorizer,
    similarity_matrix: np.ndarray,
    run_id           : int,
) -> dict:
    """
    Generate keywords, label, and save one cluster.

    Returns dict with saved status, db_id, label, keywords.
    """
    keywords = get_cluster_keywords(
        article_indices = article_indices,
        tfidf_matrix    = tfidf_matrix,
        vectorizer      = vectorizer,
        top_n           = TOP_KEYWORDS_COUNT,
    )

    if not keywords:
        logger.warning(f"No keywords for cluster {cluster_label}")
        return {"saved": False}

    label       = generate_cluster_label(keywords)
    earliest_at, latest_at = _get_date_range(article_indices, articles)
    sim_scores  = _compute_similarity_scores(article_indices, similarity_matrix)

    db_cluster_id = insert_cluster(
        label         = label,
        keywords      = keywords,
        article_count = len(article_indices),
        run_id        = run_id,
        earliest_at   = earliest_at,
        latest_at     = latest_at,
        ai_summary    = None,   # filled in after batch summarization
    )

    cluster_items = [
        {
            "cluster_id"      : db_cluster_id,
            "article_id"      : articles[idx]["id"],
            "similarity_score": sim_scores.get(idx, None),
        }
        for idx in article_indices
        if idx < len(articles)
    ]

    insert_cluster_items(cluster_items)

    logger.info(f"  Saved '{label}' — {len(article_indices)} articles")

    return {
        "saved"   : True,
        "db_id"   : db_cluster_id,
        "label"   : label,
        "keywords": keywords,
    }


def _get_date_range(
    article_indices: List[int],
    articles       : List[dict],
) -> Tuple[Optional[datetime], Optional[datetime]]:
    """Get earliest and latest published_at for a cluster."""
    dates = []
    for idx in article_indices:
        if idx < len(articles):
            pub = articles[idx].get("published_at")
            if pub:
                dates.append(pub)
    if not dates:
        return None, None
    return min(dates), max(dates)


def _compute_similarity_scores(
    article_indices  : List[int],
    similarity_matrix: np.ndarray,
) -> Dict[int, float]:
    """
    Compute each article's average similarity to others in the cluster.
    Higher = more representative of the cluster topic.
    """
    scores = {}
    for idx in article_indices:
        others = [i for i in article_indices if i != idx]
        if not others:
            scores[idx] = 1.0
            continue
        sims       = [similarity_matrix[idx][o] for o in others]
        scores[idx] = float(np.mean(sims))
    return scores
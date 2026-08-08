# =============================================================================
# summarizer.py — AI-powered cluster summarization using Groq + LLaMA 3.1
# =============================================================================

import os
import requests
from typing import List, Optional
from utils.logger import get_logger

logger = get_logger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = "llama-3.1-8b-instant"


def summarize_cluster(
    cluster_label       : str,
    keywords            : List[str],
    article_titles      : List[str],
    article_descriptions: List[str],
) -> Optional[str]:
    """
    Generate a 2-sentence plain English summary of a news cluster.
    Uses Groq's LLaMA 3.1 API. Falls back to None if unavailable.
    """
    if not GROQ_API_KEY:
        logger.debug("GROQ_API_KEY not set — skipping AI summarization")
        return None

    articles_context = ""
    for i, (title, desc) in enumerate(
        zip(article_titles[:6], article_descriptions[:6])
    ):
        desc_text = desc[:120] if desc else "No description"
        articles_context += f"{i+1}. {title}\n   {desc_text}\n"

    prompt = f"""You are a professional news editor. Here are {len(article_titles)} related news articles about "{cluster_label}":

{articles_context}
Key topics: {', '.join(keywords[:5])}

Write exactly 2 clear sentences:
- Sentence 1: What is happening (the main event)
- Sentence 2: Why it matters or what the impact is

Rules:
- Be factual and neutral
- Do not start with "This cluster" or "These articles"
- Do not use "In summary" or "Overall"
- Maximum 60 words total
- Write for a general audience"""

    try:
        response = requests.post(
            GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type" : "application/json",
            },
            json={
                "model"      : GROQ_MODEL,
                "messages"   : [
                    {
                        "role"   : "system",
                        "content": "You are a concise news summarizer. Always respond with exactly 2 sentences."
                    },
                    {
                        "role"   : "user",
                        "content": prompt
                    }
                ],
                "max_tokens" : 120,
                "temperature": 0.3,
                "top_p"      : 0.9,
            },
            timeout=10,
        )

        if response.status_code == 200:
            data    = response.json()
            summary = data["choices"][0]["message"]["content"].strip()
            summary = " ".join(summary.split())
            logger.debug(f"Summary for '{cluster_label[:40]}': {summary[:80]}...")
            return summary

        elif response.status_code == 429:
            logger.warning("Groq rate limit hit — skipping summary")
            return None

        else:
            logger.warning(f"Groq API error {response.status_code}: {response.text[:100]}")
            return None

    except requests.exceptions.Timeout:
        logger.warning(f"Groq timeout for '{cluster_label[:40]}'")
        return None
    except Exception as e:
        logger.warning(f"Groq unexpected error: {e}")
        return None


def summarize_clusters_batch(clusters_data: List[dict]) -> dict:
    """
    Generate AI summaries for a list of clusters.
    Returns dict of cluster_id -> summary string.
    """
    if not GROQ_API_KEY:
        logger.info("GROQ_API_KEY not configured — skipping all summaries")
        return {}

    summaries     = {}
    success_count = 0
    skip_count    = 0

    logger.info(
        f"Generating AI summaries for {len(clusters_data)} clusters "
        f"using Groq LLaMA 3.1..."
    )

    for cluster in clusters_data:
        cluster_id   = cluster.get("id")
        label        = cluster.get("label", "Unknown Topic")
        keywords     = cluster.get("keywords", [])
        articles     = cluster.get("articles", [])

        if not articles:
            skip_count += 1
            continue

        titles       = [a.get("title", "")       for a in articles]
        descriptions = [a.get("description", "") for a in articles]

        summary = summarize_cluster(
            cluster_label        = label,
            keywords             = keywords,
            article_titles       = titles,
            article_descriptions = descriptions,
        )

        if summary:
            summaries[cluster_id] = summary
            success_count += 1
            logger.info(f"  ✓ '{label[:40]}' → summarized")
        else:
            skip_count += 1
            logger.debug(f"  ✗ '{label[:40]}' → skipped")

    logger.info(
        f"AI summarization complete — "
        f"{success_count} generated, {skip_count} skipped"
    )

    return summaries
# =============================================================================
# settings.py — Centralized Configuration
# =============================================================================
# ALL config lives here. Other files import from here.
# This means if you want to change a setting, there's ONE place to change it.
# =============================================================================

import os
from dotenv import load_dotenv

# Load .env file into environment variables
load_dotenv()

# -----------------------------------------------------------------------------
# DATABASE
# -----------------------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL is not set!\n"
        "Copy scraper/.env.example to scraper/.env and fill in your database URL."
    )

# -----------------------------------------------------------------------------
# RSS FEED SOURCES
# Each entry has:
#   name   — short identifier stored in the database
#   url    — the RSS feed URL
#   label  — human-readable name for logging
# -----------------------------------------------------------------------------
RSS_FEEDS = [
    # ── BBC ───────────────────────────────────────────────────
    {
        "name" : "bbc",
        "url"  : "http://feeds.bbci.co.uk/news/rss.xml",
        "label": "BBC News"
    },
    {
        "name" : "bbc",
        "url"  : "http://feeds.bbci.co.uk/news/world/rss.xml",
        "label": "BBC World"
    },
    {
        "name" : "bbc",
        "url"  : "http://feeds.bbci.co.uk/news/technology/rss.xml",
        "label": "BBC Technology"
    },
    {
        "name" : "bbc",
        "url"  : "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
        "label": "BBC Science"
    },

    # ── NPR ───────────────────────────────────────────────────
    {
        "name" : "npr",
        "url"  : "https://feeds.npr.org/1001/rss.xml",
        "label": "NPR News"
    },
    {
        "name" : "npr",
        "url"  : "https://feeds.npr.org/1004/rss.xml",
        "label": "NPR World"
    },
    {
        "name" : "npr",
        "url"  : "https://feeds.npr.org/1019/rss.xml",
        "label": "NPR Politics"
    },
    {
        "name" : "npr",
        "url"  : "https://feeds.npr.org/1045/rss.xml",
        "label": "NPR Technology"
    },

    # ── The Guardian ──────────────────────────────────────────
    {
        "name" : "guardian",
        "url"  : "https://www.theguardian.com/world/rss",
        "label": "Guardian World"
    },
    {
        "name" : "guardian",
        "url"  : "https://www.theguardian.com/technology/rss",
        "label": "Guardian Tech"
    },
    {
        "name" : "guardian",
        "url"  : "https://www.theguardian.com/science/rss",
        "label": "Guardian Science"
    },

    # ── Al Jazeera ────────────────────────────────────────────
    {
        "name" : "aljazeera",
        "url"  : "https://www.aljazeera.com/xml/rss/all.xml",
        "label": "Al Jazeera"
    },

    # ── TechCrunch ────────────────────────────────────────────
    {
        "name" : "techcrunch",
        "url"  : "https://techcrunch.com/feed/",
        "label": "TechCrunch"
    },

    # ── Hacker News ───────────────────────────────────────────
    {
        "name" : "hackernews",
        "url"  : "https://hnrss.org/frontpage",
        "label": "Hacker News"
    },

    # ── Associated Press ──────────────────────────────────────
    {
        "name" : "ap",
        "url"  : "https://feeds.apnews.com/rss/apf-topnews",
        "label": "AP Top News"
    },
]
    

# -----------------------------------------------------------------------------
# SCRAPER SETTINGS
# -----------------------------------------------------------------------------
MAX_ARTICLES_PER_FEED = int(os.getenv("MAX_ARTICLES_PER_FEED", "50"))
REQUEST_TIMEOUT       = int(os.getenv("REQUEST_TIMEOUT", "10"))
MIN_ARTICLE_LENGTH    = int(os.getenv("MIN_ARTICLE_LENGTH", "200"))

# -----------------------------------------------------------------------------
# CLUSTERING SETTINGS
# -----------------------------------------------------------------------------
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.25"))
MAX_CLUSTERS         = int(os.getenv("MAX_CLUSTERS", "20"))
MIN_CLUSTER_SIZE     = int(os.getenv("MIN_CLUSTER_SIZE", "2"))

# TF-IDF settings
TFIDF_MAX_FEATURES = 5000       # Vocabulary size limit
TFIDF_NGRAM_RANGE  = (1, 2)     # Unigrams + bigrams ("climate" and "climate change")
TOP_KEYWORDS_COUNT = 5          # How many keywords to use as cluster label

# -----------------------------------------------------------------------------
# LOGGING
# -----------------------------------------------------------------------------
LOG_LEVEL     = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_TO_FILE   = os.getenv("LOG_TO_FILE", "false").lower() == "true"
LOG_FILE_PATH = os.getenv("LOG_FILE_PATH", "logs/scraper.log")
# 📰 News Pulse — AI-Powered News Intelligence Platform

> A production-grade news aggregation platform that automatically clusters articles by topic using NLP, renders them on an interactive timeline, and serves them through a REST API to a modern React dashboard.

![News Pulse Dashboard](https://news-pulse-mu-nine.vercel.app/og-image.png)

## 🌐 Live Demo

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | https://news-pulse-mu-nine.vercel.app | ✅ Live |
| **Backend API** | https://news-pulse-cxaw.onrender.com | ✅ Live |
| **Health Check** | https://news-pulse-cxaw.onrender.com/health | ✅ Live |
| **GitHub** | https://github.com/Ar7yan/news-pulse | ✅ Public |

---

## 🏗️ Architecture Overview

┌─────────────────────────────────────────────────────────────────┐
│                        NEWS PULSE                               │
├─────────────────┬──────────────────────┬────────────────────────┤
│   SCRAPER       │      BACKEND         │      FRONTEND          │
│   (Python)      │   (Node/Express)     │    (Next.js 15)        │
│                 │                      │                        │
│  RSS Feeds ──►  │  PostgreSQL          │  Interactive Timeline  │
│  BBC            │   └─ articles        │  Cluster Cards         │
│  Reuters        │   └─ clusters        │  Source Filters        │
│  NPR            │   └─ cluster_items   │  Confidence Scores     │
│                 │   └─ ingest_jobs     │  Analytics Dashboard   │
│  TF-IDF NLP    │                      │                        │
│  Clustering    │  REST API            │  vis-timeline          │
│                 │  /clusters           │  TailwindCSS           │
│                 │  /timeline           │  TypeScript            │
│                 │  /ingest             │  SWR Data Fetching     │
└─────────────────┴──────────────────────┴────────────────────────┘
│                  │                        │
Render.com         Render.com               Vercel
(Cron Job)        (Web Service)             (Frontend)
│
Neon PostgreSQL
(ap-southeast-1)

---

## 📁 Project Structure
news-pulse/                         # Monorepo root
├── scraper/                        # Python ingestion + NLP pipeline
│   ├── config/
│   │   └── settings.py             # RSS feeds, thresholds, env config
│   ├── models/
│   │   └── article.py              # Article dataclass
│   ├── database/
│   │   ├── connection.py           # psycopg2 connection pool
│   │   └── queries.py              # All SQL queries
│   ├── scraper/
│   │   ├── feed_parser.py          # RSS ingestion + deduplication
│   │   └── article_extractor.py   # Full-text extraction
│   ├── clustering/
│   │   ├── preprocessor.py        # Text cleaning + stopwords
│   │   ├── vectorizer.py          # TF-IDF vectorization
│   │   └── clusterer.py           # Cosine similarity clustering
│   ├── utils/
│   │   ├── logger.py              # Structured logging
│   │   └── helpers.py             # URL hashing, dedup utilities
│   ├── main.py                    # Pipeline entrypoint
│   └── requirements.txt
│
├── backend/                        # Node.js / Express REST API
│   └── src/
│       ├── config/database.js     # pg Pool configuration
│       ├── models/index.js        # All database queries
│       ├── services/              # Business logic layer
│       │   ├── clusterService.js
│       │   ├── timelineService.js
│       │   └── ingestService.js
│       ├── controllers/           # HTTP request handlers
│       ├── routes/                # Express route definitions
│       ├── middleware/            # Logger, error handler, validator
│       └── app.js                 # Express app setup
│
├── frontend/                       # Next.js 15 React app
│   ├── app/
│   │   ├── layout.tsx             # Root layout + nav
│   │   ├── page.tsx               # Main dashboard page
│   │   └── globals.css            # Design system + vis-timeline styles
│   ├── components/
│   │   ├── HeroSection.tsx        # AI platform hero with animated stats
│   │   ├── Timeline.tsx           # vis-timeline interactive component
│   │   ├── ClusterCard.tsx        # Topic card with confidence score
│   │   ├── ClusterModal.tsx       # Article detail modal
│   │   ├── StatsBar.tsx           # Live stats dashboard
│   │   ├── SourceFilter.tsx       # BBC/Reuters/NPR filter
│   │   ├── SearchBar.tsx          # Real-time cluster search
│   │   ├── RefreshButton.tsx      # Scraper trigger with progress steps
│   │   ├── SkeletonLoader.tsx     # Shimmer loading states
│   │   └── ErrorState.tsx         # Retryable error screens
│   ├── hooks/
│   │   ├── useClusters.ts         # SWR cluster data fetching
│   │   └── useTimeline.ts         # SWR timeline data fetching
│   ├── services/api.ts            # Typed API client
│   └── types/index.ts             # Shared TypeScript interfaces
│
├── docs/
│   └── schema.sql                 # PostgreSQL schema
└── README.md

---

## 🧠 Topic Grouping Approach

### Algorithm: TF-IDF + Cosine Similarity + Agglomerative Clustering

News articles are grouped into topics using a three-stage NLP pipeline:

#### Stage 1 — Text Preprocessing
Raw Article Text
│
▼
Lowercase → Remove URLs/emails/numbers/punctuation
│
▼
NLTK Tokenization → Remove Stopwords
(custom news stopwords: "said", "according", "report"...)
│
▼
WordNet Lemmatization
("running" → "run", "policies" → "policy")
│
▼
Clean Token String → Ready for TF-IDF

#### Stage 2 — TF-IDF Vectorization
Each article is converted into a numeric vector:
TF  (Term Frequency)         = how often word appears in THIS article
IDF (Inverse Doc Frequency)  = how rare the word is across ALL articles
TF-IDF Score                 = TF × IDF
Settings:
max_features = 5000    (vocabulary size)
ngram_range  = (1, 2)  (unigrams + bigrams: "climate change")
min_df       = 2       (word must appear in ≥2 articles)
max_df       = 0.85    (ignore words in >85% of articles)
sublinear_tf = True    (log normalization)
Title is weighted 3× by repetition — strongest topic signal

#### Stage 3 — Cosine Similarity + Agglomerative Clustering
TF-IDF Matrix (n_articles × 5000)
│
▼
Cosine Similarity Matrix (n × n)
similarity(A, B) = dot(A, B) / (|A| × |B|)
Range: 0.0 (different) → 1.0 (identical)
│
▼
Distance Matrix = 1 - similarity
│
▼
AgglomerativeClustering
distance_threshold = 0.75  (similarity ≥ 0.25 → same cluster)
linkage = "average"
metric  = "precomputed"
│
▼
Cluster Label Generation
Sum TF-IDF scores across cluster → top 4 unique terms
e.g. ["supreme", "court", "ruling", "birthright"] → "Supreme Court Ruling Birthright"

### ⚠️ Known Limitations

| Limitation | Description | Potential Fix |
|-----------|-------------|---------------|
| **Bag of Words** | TF-IDF ignores word order and context | Use sentence transformers (BERT) |
| **No semantic understanding** | "car" and "automobile" treated as different topics | Word embeddings (Word2Vec, GloVe) |
| **Static threshold** | `SIMILARITY_THRESHOLD=0.25` is fixed — may be too loose or tight depending on news cycle | Dynamic threshold based on corpus size |
| **English only** | NLTK stopwords and lemmatizer only handle English | Multi-language NLP libraries |
| **Cluster labels can repeat words** | "Cape Cape Verde Verde" can appear | Improved deduplication logic |
| **No incremental clustering** | All clusters regenerated every run | Delta clustering for efficiency |
| **Reuters RSS instability** | Reuters frequently changes feed URLs | Fallback scraping strategy |

---

## 📡 News Sources

| Source | Feed Type | Coverage | Articles/Run |
|--------|-----------|----------|-------------|
| **BBC News** | RSS (XML) | UK + World general news | ~30-37 |
| **BBC World** | RSS (XML) | International news | ~25-32 |
| **BBC Technology** | RSS (XML) | Tech news | ~15-20 |
| **NPR News** | RSS (XML) | US general news | ~10 |
| **NPR World** | RSS (XML) | International news | ~10 |
| **NPR Politics** | RSS (XML) | US politics | ~10 |
| **Reuters** | RSS (XML) | Global wire news | ⚠️ Intermittent |

### Deduplication
Articles are deduplicated using **SHA-256 hash of normalized URLs**:
```python
# URL normalization removes:
# - Trailing slashes
# - Tracking parameters (utm_source, ref, etc.)
# - URL fragments (#section)
# - Lowercases scheme and host

url_hash = SHA256(normalize(url))
# Stored as CHAR(64) with UNIQUE constraint in PostgreSQL
```

---

## 🚀 Setup Instructions

### Prerequisites
Python  3.11+
Node.js 20+
PostgreSQL 15+ (or Neon/Supabase free tier)
Git

### 1. Clone the Repository
```bash
git clone https://github.com/Ar7yan/news-pulse.git
cd news-pulse
```

### 2. Database Setup

**Option A — Neon (Recommended, Free)**
1. Create account at https://neon.tech
2. Create project `news-pulse` in `ap-southeast-1`
3. Run schema in SQL Editor:
```bash
# Copy contents of docs/schema.sql into Neon SQL Editor and run
```

**Option B — Local PostgreSQL**
```bash
createdb newspulse
psql newspulse < docs/schema.sql
```

### 3. Python Scraper Setup
```bash
cd scraper

# Create virtual environment
python -m venv venv

# Activate it
source venv/bin/activate          # Mac/Linux
venv\Scripts\activate             # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set DATABASE_URL

# Run the pipeline
python main.py
```

Expected output:
NEWS PULSE PIPELINE STARTING
STEP 1: Fetching RSS Feeds → 76 new articles found
STEP 2: Extracting Full Article Text → 71/76 succeeded
STEP 3: Saving Articles to Database → 71 saved
STEP 4: Running Topic Clustering → 20 clusters generated
NEWS PULSE PIPELINE COMPLETE ✓

### 4. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and set DATABASE_URL (same as scraper)

# Start development server
npm run dev
```

Server starts at `http://localhost:5000`

### 5. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local

# Start development server
npm run dev
```

App opens at `http://localhost:3000`

### 6. Running All Three Together

Open 3 terminals simultaneously:
```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend  
cd frontend && npm run dev

# Terminal 3 — Scraper (run when you want fresh news)
cd scraper && source venv/bin/activate && python main.py
```

---

## 🌐 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server health + database stats |
| `GET` | `/api/v1/clusters` | All topic clusters (paginated) |
| `GET` | `/api/v1/clusters/:id` | Single cluster with articles |
| `GET` | `/api/v1/timeline` | Timeline-formatted cluster data |
| `POST` | `/api/v1/ingest/trigger` | Trigger scraper pipeline |
| `GET` | `/api/v1/ingest/status/:jobId` | Check pipeline job status |

### Query Parameters

**`GET /api/v1/clusters`**
?source=bbc|reuters|npr|all    Filter by news source
?page=1                         Page number
?limit=20                       Results per page

**`GET /api/v1/timeline`**
?source=all                     Filter by source
?days=7                         How many days back (1-30)

### Example Response
```json
GET /api/v1/clusters/1

{
  "success": true,
  "data": {
    "id": 1,
    "label": "Supreme Court Birthright Ruling",
    "keywords": ["supreme", "court", "birthright", "ruling", "citizenship"],
    "articleCount": 4,
    "sources": ["bbc", "npr"],
    "timeRange": {
      "start": "2026-07-03T08:00:00Z",
      "end":   "2026-07-03T14:00:00Z"
    },
    "articles": [
      {
        "id": 42,
        "title": "Supreme Court Rules on Birthright Citizenship",
        "url": "https://bbc.com/news/...",
        "source": "bbc",
        "similarityScore": 0.847,
        "publishedAt": "2026-07-03T09:15:00Z"
      }
    ]
  }
}
```

---

## 🗃️ Database Schema

```sql
articles       — scraped news articles (url_hash deduplication)
clusters       — NLP-generated topic groups
cluster_items  — M:M join (articles ↔ clusters) + similarity_score
ingest_jobs    — pipeline run history + status tracking
cluster_summary — VIEW joining cluster stats with source arrays
```

---

## 🚢 Deployment

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **Neon** | PostgreSQL database | ✅ 0.5 GB |
| **Render** | Express API (web service) | ✅ 750 hrs/mo |
| **Render** | Python scraper (cron job) | ✅ 750 hrs/mo |
| **Vercel** | Next.js frontend | ✅ Unlimited |

### Environment Variables

**Scraper (`scraper/.env`)**
```env
DATABASE_URL=postgresql://...
MAX_ARTICLES_PER_FEED=50
SIMILARITY_THRESHOLD=0.25
MAX_CLUSTERS=20
LOG_LEVEL=INFO
```

**Backend (`backend/.env`)**
```env
DATABASE_URL=postgresql://...
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://news-pulse-mu-nine.vercel.app
```

**Frontend (`frontend/.env.local`)**
```env
NEXT_PUBLIC_API_URL=https://news-pulse-cxaw.onrender.com
```

---

## 🧰 Tech Stack

### Scraper (Python)
| Library | Purpose |
|---------|---------|
| `feedparser` | RSS/Atom feed parsing |
| `trafilatura` | Primary article text extraction |
| `newspaper3k` | Fallback text extraction |
| `scikit-learn` | TF-IDF vectorization + cosine similarity |
| `nltk` | Tokenization, stopwords, lemmatization |
| `psycopg2` | PostgreSQL driver |
| `python-dotenv` | Environment configuration |

### Backend (Node.js)
| Library | Purpose |
|---------|---------|
| `express` | REST API framework |
| `pg` | PostgreSQL client + connection pool |
| `joi` | Request validation |
| `winston` | Structured logging |
| `cors` | Cross-origin resource sharing |
| `morgan` | HTTP request logging |

### Frontend (Next.js)
| Library | Purpose |
|---------|---------|
| `next` 15 | React framework (App Router) |
| `typescript` | Type safety |
| `tailwindcss` | Utility-first styling |
| `vis-timeline` | Interactive timeline rendering |
| `swr` | Data fetching + caching |
| `date-fns` | Date formatting |

---

## 📊 How the Pipeline Works
Every 6 hours (Render Cron):

fetch_all_feeds()
→ Reads 7 RSS feed URLs
→ Parses XML with feedparser
→ Deduplicates via SHA-256 URL hash
→ Returns ~70-100 new Article objects
extract_all_articles()
→ Visits each article URL
→ Tries trafilatura first (better accuracy)
→ Falls back to newspaper3k
→ Returns articles with full_text populated
insert_articles()
→ Bulk inserts with ON CONFLICT DO NOTHING
→ Idempotent — safe to re-run anytime
cluster_articles()
→ Loads last 500 articles from DB
→ Preprocesses text (clean, tokenize, lemmatize)
→ Builds TF-IDF matrix (n_articles × 5000)
→ Computes cosine similarity matrix (n × n)
→ Runs AgglomerativeClustering
→ Generates labels from top TF-IDF terms
→ Saves clusters + cluster_items to DB

Total runtime: ~2-4 minutes

---

## 🔮 Future Improvements
□ Sentence transformers (BERT) for semantic similarity
□ Incremental clustering (don't re-cluster everything)
□ Entity extraction (people, places, organizations)
□ Sentiment analysis per cluster
□ Email digest / push notifications
□ User accounts + saved clusters
□ Multi-language support
□ Twitter/X RSS integration
□ OpenGraph previews for sharing
□ PWA with offline support

---

## 👨‍💻 Author

**Aryan** — [@Ar7yan](https://github.com/Ar7yan)

Built as a production-grade internship assessment project demonstrating:
- Full-stack engineering (Python + Node.js + React)
- Applied NLP and machine learning
- Production deployment and DevOps
- Clean architecture and code quality

---

## 📄 License

MIT — free to use for learning, portfolios, and production.
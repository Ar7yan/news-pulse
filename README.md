 # 📰 News Pulse — AI-Powered Topic Clustered News Timeline

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Python](https://img.shields.io/badge/Python-3.11-blue)
![Express](https://img.shields.io/badge/Express.js-Backend-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue)
![Deployment](https://img.shields.io/badge/Deployment-Vercel%20%7C%20Render-purple)

### AI-powered news aggregation, topic clustering, and interactive timeline visualization platform

🌐 **Live Demo:** https://news-pulse-mu-nine.vercel.app
📡 **Live API:** https://news-pulse-cxaw.onrender.com
💻 **Repository:** https://github.com/Ar7yan/news-pulse

</div>

---

# 📌 Overview

**News Pulse** is a full-stack AI-powered news intelligence platform that automatically:

* Aggregates news articles from multiple public RSS feeds
* Extracts article content
* Groups related articles into topic clusters using Natural Language Processing
* Visualizes topic evolution using an interactive timeline
* Provides filtering, analytics, and real-time refresh capabilities

The project was developed as part of a **Full Stack Developer Internship Technical Assessment**.

---

# ✨ Features

## 🔹 News Aggregation

* Multi-source RSS ingestion
* BBC News
* NPR
* Reuters
* Automatic feed normalization
* Duplicate article detection
* Re-runnable ingestion pipeline

---

## 🔹 AI Topic Clustering

Implemented using:

* TF-IDF vectorization
* Cosine similarity
* Keyword overlap scoring
* Automatic cluster labeling
* Cluster confidence scoring

Example:

```text
BBC:
"Trump announces tariffs"

Reuters:
"US President unveils tariff plan"

↓

Cluster:
"US Tariff Policy"
Confidence: 92%
```

---

## 🔹 Interactive Timeline

* Dark-themed timeline visualization
* Timeline ranges (1D / 3D / 7D / 14D)
* Topic cluster visualization
* Source filtering
* Cluster sizing
* Hover effects
* Animated transitions

---

## 🔹 Analytics Dashboard

* Total articles
* Total clusters
* Active sources
* Coverage period
* Source distribution
* Timeline statistics

---

## 🔹 Refresh Pipeline

Users can:

* Trigger ingestion
* Track progress
* Monitor clustering
* Refresh timeline dynamically

---

# 🏗 Architecture

```text
                RSS Sources
          ┌────────┬────────┬────────┐
          │  BBC   │  NPR   │Reuters │
          └────────┴────────┴────────┘
                      │
                      ▼
            Python Ingestion Pipeline
                      │
          ┌───────────┼───────────┐
          │ RSS Parser            │
          │ Article Extractor     │
          │ Deduplication Engine  │
          └───────────┼───────────┘
                      │
                      ▼
             TF-IDF Topic Clustering
                      │
                      ▼
                 PostgreSQL
                      │
                      ▼
              Express REST API
                      │
                      ▼
               Next.js Frontend
                      │
                      ▼
           Interactive News Timeline
```

---

# 🧠 Topic Clustering Approach

This project uses a hybrid clustering approach:

```text
Similarity Score =
0.7 × Cosine Similarity
+
0.3 × Keyword Overlap
```

## Pipeline

### 1. Text Preprocessing

* Lowercasing
* Stopword removal
* Tokenization
* Normalization

### 2. TF-IDF Vectorization

```python
vectorizer = TfidfVectorizer(
    stop_words='english'
)
```

### 3. Similarity Computation

```python
similarity =
cosine_similarity(vectors)
```

### 4. Cluster Formation

Articles exceeding a similarity threshold are grouped into the same cluster.

### 5. Cluster Label Generation

Cluster labels are generated using:

* Representative article titles
* Highest weighted keywords
* Frequency analysis

---

# 🗄 Database

Database: **PostgreSQL (Neon)**

Main entities:

## Articles

```sql
articles
├── id
├── title
├── content
├── source
├── url
├── published_at
└── cluster_id
```

## Clusters

```sql
clusters
├── id
├── label
├── confidence
├── created_at
```

## Ingestion Jobs

```sql
jobs
├── id
├── status
├── started_at
└── completed_at
```

---

# 🚀 Backend API

Base URL:

```bash
https://news-pulse-cxaw.onrender.com/api/v1
```

## Get Clusters

```http
GET /clusters
```

---

## Get Cluster Details

```http
GET /clusters/:id
```

---

## Get Timeline

```http
GET /timeline
```

---

## Trigger Ingestion

```http
POST /ingest/trigger
```

---

## Get Job Status

```http
GET /ingest/status/:jobId
```

---

# 💻 Tech Stack

## Frontend

* Next.js 15
* React
* TypeScript
* TailwindCSS
* Framer Motion

## Backend

* Node.js
* Express.js
* PostgreSQL

## AI / NLP

* Python
* scikit-learn
* TF-IDF
* Cosine Similarity
* Newspaper3k
* BeautifulSoup

## Deployment

* Vercel
* Render
* Neon PostgreSQL

---

# 📂 Project Structure

```bash
news-pulse/

├── scraper/
│   ├── clustering/
│   ├── scraper/
│   ├── database/
│   └── utils/
│
├── backend/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── middleware/
│   └── config/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── types/
│
├── docs/
└── README.md
```

---

# ⚠ Challenges Faced

### RSS Feed Inconsistency

Different publishers expose different:

* XML structures
* publication date formats
* metadata fields
* article content formats

Solution:

Implemented a normalization layer that converts all feeds into a common internal schema.

---

### Topic Similarity Threshold

Determining when two articles belong to the same topic was challenging.

Solution:

Experimented with multiple thresholds and combined:

* TF-IDF similarity
* keyword overlap scoring

to reduce over-clustering and under-clustering.

---

# 🔮 Future Improvements

Given additional time, I would implement:

* Transformer embeddings
* Sentence Transformers
* Semantic clustering
* Live updates
* Topic heatmaps
* Cross-source event merging
* Advanced analytics dashboard
* User personalization

---

# 📹 Video Walkthrough

Video Demo:

```
<Insert Loom/Drive Link Here>
```

---

# 👨‍💻 Author

### Aryan Pratap

* GitHub: https://github.com/Ar7yan
* LinkedIn: <YOUR_LINKEDIN_URL>

---

# 🙏 Acknowledgements

* BBC RSS
* NPR RSS
* Reuters RSS
* scikit-learn
* Next.js
* Express.js
* PostgreSQL


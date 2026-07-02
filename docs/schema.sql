-- =============================================================================
-- NEWS PULSE — PostgreSQL Database Schema
-- =============================================================================
-- Run this file ONCE to set up your database before running the scraper.
-- Command: psql $DATABASE_URL < docs/schema.sql
--
-- Tables:
--   1. articles       — every scraped news article
--   2. clusters       — NLP-generated topic groups
--   3. cluster_items  — which articles belong to which cluster
--   4. ingest_jobs    — history of every pipeline run
-- =============================================================================


-- -----------------------------------------------------------------------------
-- SAFETY: Drop tables in reverse dependency order if they exist.
-- This makes the script safely re-runnable during development.
-- In production, you'd use migrations instead.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS cluster_items CASCADE;
DROP TABLE IF EXISTS clusters CASCADE;
DROP TABLE IF EXISTS articles CASCADE;
DROP TABLE IF EXISTS ingest_jobs CASCADE;


-- -----------------------------------------------------------------------------
-- TABLE 1: articles
-- -----------------------------------------------------------------------------
CREATE TYPE news_source AS ENUM ('bbc', 'reuters', 'npr', 'unknown');

CREATE TABLE articles (
    id              SERIAL PRIMARY KEY,
    url             TEXT NOT NULL,
    url_hash        CHAR(64) NOT NULL,
    source          news_source NOT NULL DEFAULT 'unknown',
    title           TEXT NOT NULL,
    description     TEXT,
    full_text       TEXT,
    author          TEXT,
    published_at    TIMESTAMPTZ,
    scraped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    feed_url        TEXT,
    language        VARCHAR(10) DEFAULT 'en',
    CONSTRAINT articles_url_hash_unique UNIQUE (url_hash)
);

CREATE INDEX idx_articles_source ON articles (source);
CREATE INDEX idx_articles_published_at ON articles (published_at DESC);
CREATE INDEX idx_articles_scraped_at ON articles (scraped_at DESC);


-- -----------------------------------------------------------------------------
-- TABLE 2: clusters
-- -----------------------------------------------------------------------------
CREATE TABLE clusters (
    id              SERIAL PRIMARY KEY,
    label           TEXT NOT NULL,
    keywords        TEXT[] NOT NULL DEFAULT '{}',
    article_count   INTEGER NOT NULL DEFAULT 0,
    run_id          INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    earliest_article_at  TIMESTAMPTZ,
    latest_article_at    TIMESTAMPTZ
);

CREATE INDEX idx_clusters_created_at ON clusters (created_at DESC);
CREATE INDEX idx_clusters_run_id ON clusters (run_id);


-- -----------------------------------------------------------------------------
-- TABLE 3: cluster_items
-- -----------------------------------------------------------------------------
CREATE TABLE cluster_items (
    id              SERIAL PRIMARY KEY,
    cluster_id      INTEGER NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    article_id      INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    similarity_score FLOAT,
    CONSTRAINT cluster_items_unique UNIQUE (cluster_id, article_id)
);

CREATE INDEX idx_cluster_items_cluster_id ON cluster_items (cluster_id);
CREATE INDEX idx_cluster_items_article_id ON cluster_items (article_id);


-- -----------------------------------------------------------------------------
-- TABLE 4: ingest_jobs
-- -----------------------------------------------------------------------------
CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed');

CREATE TABLE ingest_jobs (
    id                  SERIAL PRIMARY KEY,
    status              job_status NOT NULL DEFAULT 'pending',
    error_message       TEXT,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    articles_scraped    INTEGER DEFAULT 0,
    articles_skipped    INTEGER DEFAULT 0,
    clusters_generated  INTEGER DEFAULT 0,
    sources_processed   TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_ingest_jobs_status ON ingest_jobs (status);
CREATE INDEX idx_ingest_jobs_started_at ON ingest_jobs (started_at DESC);


-- -----------------------------------------------------------------------------
-- FOREIGN KEY
-- -----------------------------------------------------------------------------
ALTER TABLE clusters
    ADD CONSTRAINT clusters_run_id_fkey
    FOREIGN KEY (run_id) REFERENCES ingest_jobs(id) ON DELETE SET NULL;


-- -----------------------------------------------------------------------------
-- VIEW: cluster_summary
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW cluster_summary AS
SELECT
    c.id,
    c.label,
    c.keywords,
    c.article_count,
    c.created_at,
    c.earliest_article_at,
    c.latest_article_at,
    c.run_id,
    ARRAY_AGG(DISTINCT a.source::TEXT) AS sources
FROM clusters c
JOIN cluster_items ci ON ci.cluster_id = c.id
JOIN articles a ON a.id = ci.article_id
GROUP BY c.id;


-- -----------------------------------------------------------------------------
-- SEED DATA
-- -----------------------------------------------------------------------------
INSERT INTO ingest_jobs (status, completed_at, articles_scraped, clusters_generated, sources_processed)
VALUES ('completed', NOW(), 0, 0, '{}');


SELECT 'Schema created successfully' AS result;
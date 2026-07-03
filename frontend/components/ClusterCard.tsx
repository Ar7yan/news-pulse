'use client'

import { useMemo }        from 'react'
import { formatDistanceToNow } from 'date-fns'
import type { Cluster, NewsSource } from '@/types'

// ─────────────────────────────────────────────────────────────
// Source config
// ─────────────────────────────────────────────────────────────
const SOURCE_CONFIG: Record<string, {
  label : string
  color : string
  bg    : string
  border: string
  text  : string
}> = {
  bbc: {
    label : 'BBC',
    color : '#ef4444',
    bg    : 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.25)',
    text  : '#fca5a5',
  },
  reuters: {
    label : 'Reuters',
    color : '#f97316',
    bg    : 'rgba(249,115,22,0.12)',
    border: 'rgba(249,115,22,0.25)',
    text  : '#fdba74',
  },
  npr: {
    label : 'NPR',
    color : '#3b82f6',
    bg    : 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.25)',
    text  : '#93c5fd',
  },
  unknown: {
    label : 'Other',
    color : '#64748b',
    bg    : 'rgba(100,116,139,0.12)',
    border: 'rgba(100,116,139,0.25)',
    text  : '#94a3b8',
  },
}

// ─────────────────────────────────────────────────────────────
// Confidence helpers
// similarity_score isn't on clusters directly —
// we estimate confidence from article count + keyword density
// ─────────────────────────────────────────────────────────────
function getConfidence(articleCount: number, keywordCount: number): {
  label: string
  color: string
  bg   : string
  score: number
} {
  // Heuristic: more articles + more keywords = higher confidence
  const score = Math.min(
    Math.round((articleCount / 10) * 50 + (keywordCount / 5) * 50),
    99
  )

  if (score >= 70) return {
    label: 'High',
    color: '#34d399',
    bg   : 'rgba(16,185,129,0.12)',
    score,
  }
  if (score >= 40) return {
    label: 'Medium',
    color: '#fbbf24',
    bg   : 'rgba(245,158,11,0.12)',
    score,
  }
  return {
    label: 'Low',
    color: '#f87171',
    bg   : 'rgba(239,68,68,0.12)',
    score,
  }
}

// ─────────────────────────────────────────────────────────────
// Source Badge
// ─────────────────────────────────────────────────────────────
function SourceBadge({ source }: { source: string }) {
  const config = SOURCE_CONFIG[source] || SOURCE_CONFIG.unknown

  return (
    <span style={{
      display     : 'inline-flex',
      alignItems  : 'center',
      gap         : '4px',
      fontSize    : '10px',
      fontWeight  : '700',
      padding     : '3px 7px',
      borderRadius: '6px',
      background  : config.bg,
      border      : `1px solid ${config.border}`,
      color       : config.text,
      letterSpacing: '0.3px',
      textTransform: 'uppercase',
    }}>
      <span style={{
        width       : '5px',
        height      : '5px',
        borderRadius: '50%',
        background  : config.color,
        display     : 'inline-block',
        flexShrink  : 0,
      }}/>
      {config.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// Keyword Chip
// ─────────────────────────────────────────────────────────────
function KeywordChip({ word }: { word: string }) {
  return (
    <span style={{
      display     : 'inline-flex',
      alignItems  : 'center',
      fontSize    : '11px',
      fontWeight  : '500',
      padding     : '3px 8px',
      borderRadius: '20px',
      background  : 'rgba(51,65,85,0.5)',
      border      : '1px solid rgba(71,85,105,0.3)',
      color       : '#94a3b8',
      transition  : 'all 0.15s ease',
      cursor      : 'default',
      whiteSpace  : 'nowrap',
    }}>
      {word}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// Source Distribution Bar
// Shows proportion of articles from each source
// ─────────────────────────────────────────────────────────────
function SourceBar({ sources }: { sources: string[] }) {
  if (!sources || sources.length === 0) return null

  const colors: Record<string, string> = {
    bbc    : '#ef4444',
    reuters: '#f97316',
    npr    : '#3b82f6',
    unknown: '#64748b',
  }

  // Each source gets equal width for now
  // (real proportions would need article-per-source counts from API)
  const width = Math.floor(100 / sources.length)

  return (
    <div style={{
      display     : 'flex',
      height      : '3px',
      borderRadius: '2px',
      overflow    : 'hidden',
      gap         : '1px',
      marginTop   : '2px',
    }}>
      {sources.map((source, i) => (
        <div
          key={source}
          style={{
            flex      : 1,
            background: colors[source] || colors.unknown,
            opacity   : 0.7,
            borderRadius: i === 0
              ? '2px 0 0 2px'
              : i === sources.length - 1
                ? '0 2px 2px 0'
                : '0',
          }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main ClusterCard Component
// ─────────────────────────────────────────────────────────────
interface ClusterCardProps {
  cluster: Cluster
  onClick : () => void
}

export default function ClusterCard({ cluster, onClick }: ClusterCardProps) {

  // Compute confidence
  const confidence = useMemo(
    () => getConfidence(cluster.articleCount, cluster.keywords.length),
    [cluster.articleCount, cluster.keywords.length]
  )

  // Primary source (first in array)
  const primarySource   = cluster.sources?.[0] || 'unknown'
  const primaryConfig   = SOURCE_CONFIG[primarySource] || SOURCE_CONFIG.unknown

  // Time ago
  const timeAgo = useMemo(() => {
    if (!cluster.timeRange?.start) return null
    try {
      return formatDistanceToNow(
        new Date(cluster.timeRange.start),
        { addSuffix: true }
      )
    } catch {
      return null
    }
  }, [cluster.timeRange?.start])

  return (
    <button
      onClick={onClick}
      style={{
        display      : 'block',
        width        : '100%',
        textAlign    : 'left',
        background   : '#0f172a',
        border       : '1px solid #1e293b',
        borderLeft   : `3px solid ${primaryConfig.color}`,
        borderRadius : '14px',
        padding      : '18px 18px 16px',
        cursor       : 'pointer',
        transition   : 'all 0.2s ease',
        position     : 'relative',
        overflow     : 'hidden',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.borderColor      = `${primaryConfig.color}60`
        el.style.borderLeftColor  = primaryConfig.color
        el.style.transform        = 'translateY(-3px)'
        el.style.boxShadow        = `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${primaryConfig.color}20`
        el.style.background       = '#111827'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.borderColor      = '#1e293b'
        el.style.borderLeftColor  = primaryConfig.color
        el.style.transform        = 'translateY(0)'
        el.style.boxShadow        = 'none'
        el.style.background       = '#0f172a'
      }}
    >

      {/* Subtle glow in top-left corner */}
      <div style={{
        position      : 'absolute',
        top           : '-20px',
        left          : '-20px',
        width         : '100px',
        height        : '100px',
        background    : `radial-gradient(circle, ${primaryConfig.color}10 0%, transparent 70%)`,
        pointerEvents : 'none',
      }}/>

      {/* ── ROW 1: Sources + Article Count ── */}
      <div style={{
        display       : 'flex',
        alignItems    : 'center',
        justifyContent: 'space-between',
        marginBottom  : '10px',
        gap           : '8px',
      }}>
        {/* Source badges */}
        <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
          {(cluster.sources || []).slice(0, 3).map(source => (
            <SourceBadge key={source} source={source} />
          ))}
        </div>

        {/* Article count pill */}
        <span style={{
          fontSize    : '11px',
          fontWeight  : '600',
          color       : '#64748b',
          background  : '#1e293b',
          padding     : '3px 8px',
          borderRadius: '20px',
          whiteSpace  : 'nowrap',
          flexShrink  : 0,
        }}>
          {cluster.articleCount} articles
        </span>
      </div>

      {/* Source distribution bar */}
      <SourceBar sources={cluster.sources || []} />

      {/* ── ROW 2: Cluster Label ── */}
      <h3 style={{
        fontSize  : '15px',
        fontWeight: '600',
        color     : '#f1f5f9',
        lineHeight: 1.4,
        margin    : '10px 0 10px',
        transition: 'color 0.15s ease',
      }}>
        {cluster.label}
      </h3>

      {/* ── ROW 3: Keywords ── */}
      <div style={{
        display  : 'flex',
        flexWrap : 'wrap',
        gap      : '5px',
        marginBottom: '12px',
      }}>
        {cluster.keywords.slice(0, 5).map(kw => (
          <KeywordChip key={kw} word={kw} />
        ))}
      </div>

      {/* ── ROW 4: Confidence + Time ── */}
      <div style={{
        display       : 'flex',
        alignItems    : 'center',
        justifyContent: 'space-between',
        paddingTop    : '10px',
        borderTop     : '1px solid #1e293b',
      }}>

        {/* Confidence badge */}
        <div style={{
          display    : 'flex',
          alignItems : 'center',
          gap        : '5px',
        }}>
          <span style={{
            fontSize    : '10px',
            fontWeight  : '600',
            padding     : '2px 7px',
            borderRadius: '4px',
            background  : confidence.bg,
            color       : confidence.color,
            border      : `1px solid ${confidence.color}30`,
          }}>
            {confidence.label} confidence
          </span>

          {/* Mini confidence bar */}
          <div style={{
            width       : '32px',
            height      : '3px',
            background  : '#1e293b',
            borderRadius: '2px',
            overflow    : 'hidden',
          }}>
            <div style={{
              width       : `${confidence.score}%`,
              height      : '100%',
              background  : confidence.color,
              borderRadius: '2px',
              transition  : 'width 0.6s ease',
            }}/>
          </div>

          <span style={{
            fontSize: '10px',
            color   : '#334155',
          }}>
            {confidence.score}%
          </span>
        </div>

        {/* Time + arrow */}
        <div style={{
          display   : 'flex',
          alignItems: 'center',
          gap       : '6px',
        }}>
          {timeAgo && (
            <span style={{ fontSize:'11px', color:'#334155' }}>
              {timeAgo}
            </span>
          )}
          <span style={{
            fontSize  : '13px',
            color     : '#334155',
            transition: 'color 0.15s ease, transform 0.15s ease',
            display   : 'inline-block',
          }}>
            →
          </span>
        </div>

      </div>

    </button>
  )
}
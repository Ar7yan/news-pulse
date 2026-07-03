'use client'

import { useEffect }          from 'react'
import { useClusterDetail }   from '@/hooks/useClusters'
import { formatDistanceToNow, format } from 'date-fns'
import type { NewsSource }    from '@/types'
import { ModalSkeleton }      from './SkeletonLoader'

interface ClusterModalProps {
  clusterId: number
  onClose  : () => void
}

const SOURCE_CONFIG: Record<string, { label: string; color: string; bg: string; text: string }> = {
  bbc    : { label: 'BBC',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    text: '#fca5a5' },
  reuters: { label: 'Reuters', color: '#f97316', bg: 'rgba(249,115,22,0.12)',   text: '#fdba74' },
  npr    : { label: 'NPR',     color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',   text: '#93c5fd' },
  unknown: { label: 'Other',   color: '#64748b', bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' },
}

function SourceTag({ source }: { source: string }) {
  const c = SOURCE_CONFIG[source] || SOURCE_CONFIG.unknown
  return (
    <span style={{
      fontSize    : '10px', fontWeight: '700',
      padding     : '2px 7px', borderRadius: '5px',
      background  : c.bg, color: c.text,
      border      : `1px solid ${c.color}30`,
      textTransform: 'uppercase', letterSpacing: '0.3px',
    }}>
      {c.label}
    </span>
  )
}

export default function ClusterModal({ clusterId, onClose }: ClusterModalProps) {
  const { cluster, isLoading, error } = useClusterDetail(clusterId)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Source counts for distribution
  const sourceCounts = cluster?.articles?.reduce((acc, a) => {
    acc[a.source] = (acc[a.source] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const totalArticles = cluster?.articles?.length || 0

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(3,7,18,0.85)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position    : 'relative', zIndex: 10,
        background  : '#0f172a',
        border      : '1px solid #1e293b',
        borderRadius: '20px',
        width       : '100%', maxWidth: '680px',
        maxHeight   : '88vh',
        display     : 'flex', flexDirection: 'column',
        boxShadow   : '0 24px 64px rgba(0,0,0,0.6)',
        animation   : 'scaleIn 0.2s ease-out',
      }}>

        {/* Header */}
        <div style={{
          padding     : '24px 24px 16px',
          borderBottom: '1px solid #1e293b',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ flex:1, paddingRight:'16px' }}>
              {isLoading ? (
                <div style={{ height:'24px', background:'#1e293b', borderRadius:'6px', width:'70%', animation:'shimmer 2s infinite' }}/>
              ) : (
                <h2 style={{
                  fontSize:'20px', fontWeight:'700',
                  color:'#f1f5f9', lineHeight:1.3, margin:0,
                }}>
                  {cluster?.label}
                </h2>
              )}

              {cluster && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginTop:'10px' }}>
                  {cluster.keywords.slice(0, 6).map(kw => (
                    <span key={kw} style={{
                      fontSize:'11px', padding:'3px 8px',
                      borderRadius:'20px',
                      background:'rgba(51,65,85,0.5)',
                      border:'1px solid rgba(71,85,105,0.3)',
                      color:'#94a3b8',
                    }}>
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              style={{
                padding:'8px', borderRadius:'10px',
                background:'transparent', border:'1px solid #1e293b',
                color:'#64748b', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'all 0.15s ease', flexShrink:0,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = '#1e293b'
                ;(e.currentTarget as HTMLElement).style.color = '#f1f5f9'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = '#64748b'
              }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Stats row */}
          {cluster && (
            <div style={{
              display:'flex', gap:'16px', marginTop:'14px',
              flexWrap:'wrap', alignItems:'center',
            }}>
              <span style={{ fontSize:'12px', color:'#64748b' }}>
                📰 <span style={{ color:'#94a3b8', fontWeight:'600' }}>
                  {cluster.articleCount}
                </span> articles
              </span>

              {/* Source distribution */}
              {Object.entries(sourceCounts).map(([source, count]) => {
                const cfg   = SOURCE_CONFIG[source] || SOURCE_CONFIG.unknown
                const pct   = Math.round((count / totalArticles) * 100)
                return (
                  <span key={source} style={{
                    fontSize:'11px', color: cfg.text,
                    display:'flex', alignItems:'center', gap:'4px',
                  }}>
                    <span style={{
                      width:'6px', height:'6px', borderRadius:'50%',
                      background: cfg.color, display:'inline-block',
                    }}/>
                    {cfg.label} {pct}%
                  </span>
                )
              })}

              {cluster.timeRange?.start && (
                <span style={{ fontSize:'11px', color:'#334155', marginLeft:'auto' }}>
                  {formatDistanceToNow(new Date(cluster.timeRange.start), { addSuffix: true })}
                </span>
              )}
            </div>
          )}

          {/* Source distribution bar */}
          {cluster && Object.keys(sourceCounts).length > 0 && (
            <div style={{
              display:'flex', height:'4px', borderRadius:'2px',
              overflow:'hidden', marginTop:'12px', gap:'2px',
            }}>
              {Object.entries(sourceCounts).map(([source, count]) => {
                const cfg = SOURCE_CONFIG[source] || SOURCE_CONFIG.unknown
                const pct = (count / totalArticles) * 100
                return (
                  <div key={source} style={{
                    width:`${pct}%`, background: cfg.color,
                    opacity:0.7, borderRadius:'2px',
                  }}/>
                )
              })}
            </div>
          )}
        </div>

        {/* Article list */}
        <div style={{
          flex:'1', overflowY:'auto', padding:'20px 24px',
          display:'flex', flexDirection:'column', gap:'10px',
        }}>
          {isLoading ? (
            <ModalSkeleton />
          ) : error ? (
            <div style={{ textAlign:'center', padding:'32px', color:'#ef4444' }}>
              Failed to load articles
            </div>
          ) : (
            cluster?.articles.map((article, i) => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display:'block', textDecoration:'none',
                  padding:'14px 16px',
                  background:'#0a0f1a',
                  border:'1px solid #1e293b',
                  borderRadius:'12px',
                  transition:'all 0.15s ease',
                  animationDelay:`${i * 0.04}s`,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget
                  el.style.background   = '#111827'
                  el.style.borderColor  = '#334155'
                  el.style.transform    = 'translateX(3px)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget
                  el.style.background  = '#0a0f1a'
                  el.style.borderColor = '#1e293b'
                  el.style.transform   = 'translateX(0)'
                }}
              >
                {/* Article header */}
                <div style={{
                  display:'flex', justifyContent:'space-between',
                  alignItems:'center', marginBottom:'8px', gap:'8px',
                }}>
                  <SourceTag source={article.source} />
                  <span style={{ fontSize:'11px', color:'#334155', flexShrink:0 }}>
                    {article.publishedAt
                      ? format(new Date(article.publishedAt), 'MMM d, HH:mm')
                      : 'Recently'
                    }
                  </span>
                </div>

                {/* Title */}
                <h4 style={{
                  fontSize:'13px', fontWeight:'600',
                  color:'#e2e8f0', lineHeight:1.5,
                  margin:'0 0 6px 0',
                }}>
                  {article.title}
                </h4>

                {/* Description */}
                {article.description && (
                  <p style={{
                    fontSize:'12px', color:'#475569',
                    lineHeight:1.5, margin:'0 0 8px 0',
                    display:'-webkit-box',
                    WebkitLineClamp:2,
                    WebkitBoxOrient:'vertical',
                    overflow:'hidden',
                  }}>
                    {article.description}
                  </p>
                )}

                {/* Footer */}
                <div style={{
                  display:'flex', justifyContent:'space-between',
                  alignItems:'center', marginTop:'6px',
                }}>
                  {article.author && (
                    <span style={{ fontSize:'11px', color:'#334155' }}>
                      By {article.author}
                    </span>
                  )}
                  <span style={{
                    fontSize:'11px', color:'#3b82f6',
                    marginLeft:'auto', display:'flex', alignItems:'center', gap:'3px',
                  }}>
                    Read article
                    <span style={{ fontSize:'13px' }}>↗</span>
                  </span>
                </div>

                {/* Similarity bar */}
                {article.similarityScore !== null && article.similarityScore !== undefined && (
                  <div style={{
                    marginTop:'8px', paddingTop:'8px',
                    borderTop:'1px solid #1e293b',
                    display:'flex', alignItems:'center', gap:'8px',
                  }}>
                    <span style={{ fontSize:'10px', color:'#334155' }}>Relevance</span>
                    <div style={{
                      flex:1, height:'3px', background:'#1e293b',
                      borderRadius:'2px', overflow:'hidden',
                    }}>
                      <div style={{
                        width:`${Math.round((article.similarityScore || 0) * 100)}%`,
                        height:'100%', background:'#3b82f6',
                        borderRadius:'2px',
                      }}/>
                    </div>
                    <span style={{ fontSize:'10px', color:'#475569', fontVariantNumeric:'tabular-nums' }}>
                      {Math.round((article.similarityScore || 0) * 100)}%
                    </span>
                  </div>
                )}
              </a>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
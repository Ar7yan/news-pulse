'use client'

import { useEffect, useState, useRef } from 'react'
import { fetchHealth } from '@/services/api'

// ─────────────────────────────────────────────────────────────
// Animated counter hook
// ─────────────────────────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1200) {
  const [value,   setValue]   = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (target === 0 || started) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, started])

  useEffect(() => {
    if (!started || target === 0) return

    const steps     = 40
    const increment = target / steps
    let   current   = 0
    let   step      = 0

    const timer = setInterval(() => {
      step++
      current = Math.min(Math.round(increment * step), target)
      setValue(current)
      if (step >= steps) clearInterval(timer)
    }, duration / steps)

    return () => clearInterval(timer)
  }, [started, target, duration])

  return { value, ref }
}

// ─────────────────────────────────────────────────────────────
// Stat item inside hero
// ─────────────────────────────────────────────────────────────
interface StatItemProps {
  label   : string
  value   : number | string
  suffix? : string
  color   : string
  icon    : string
  animated: boolean
}

function StatItem({ label, value, suffix = '', color, icon, animated }: StatItemProps) {
  const numValue = typeof value === 'number' ? value : 0
  const { value: animValue, ref } = useAnimatedCounter(
    animated ? numValue : 0,
    1000
  )

  const displayValue = animated && typeof value === 'number'
    ? animValue.toLocaleString()
    : typeof value === 'string'
      ? value
      : numValue.toLocaleString()

  return (
    <div
      ref={ref}
      style={{
        display       : 'flex',
        flexDirection : 'column',
        alignItems    : 'center',
        gap           : '4px',
        padding       : '16px 24px',
        borderRadius  : '12px',
        background    : 'rgba(255,255,255,0.04)',
        border        : '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(8px)',
        minWidth      : '120px',
        transition    : 'all 0.2s ease',
      }}
    >
      <span style={{ fontSize: '20px', lineHeight: 1 }}>{icon}</span>
      <span style={{
        fontSize  : '28px',
        fontWeight: '700',
        color,
        lineHeight: 1.1,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {displayValue}{suffix}
      </span>
      <span style={{
        fontSize  : '11px',
        color     : 'rgba(148,163,184,0.8)',
        fontWeight: '500',
        textAlign : 'center',
        lineHeight: 1.3,
      }}>
        {label}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Source pill
// ─────────────────────────────────────────────────────────────
function SourcePill({ name, color, active }: {
  name  : string
  color : string
  active: boolean
}) {
  return (
    <span style={{
      display     : 'inline-flex',
      alignItems  : 'center',
      gap         : '5px',
      padding     : '4px 10px',
      borderRadius: '20px',
      fontSize    : '11px',
      fontWeight  : '600',
      background  : active ? `${color}22` : 'rgba(255,255,255,0.04)',
      border      : `1px solid ${active ? color + '44' : 'rgba(255,255,255,0.08)'}`,
      color       : active ? color : 'rgba(148,163,184,0.6)',
      transition  : 'all 0.2s ease',
    }}>
      <span style={{
        width       : '6px',
        height      : '6px',
        borderRadius: '50%',
        background  : active ? color : 'rgba(148,163,184,0.3)',
        display     : 'inline-block',
        boxShadow   : active ? `0 0 6px ${color}` : 'none',
        animation   : active ? 'liveBlink 2s ease-in-out infinite' : 'none',
      }}/>
      {name}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Hero Component
// ─────────────────────────────────────────────────────────────
interface HeroStats {
  totalArticles: number
  totalClusters: number
  totalRuns    : number
  lastScrapedAt: string | null
}

export default function HeroSection() {
  const [stats,     setStats]     = useState<HeroStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('—')

  useEffect(() => {
    async function load() {
      try {
        const health = await fetchHealth()
        setStats(health.stats)
      } catch {
        setStats({
          totalArticles: 0,
          totalClusters: 0,
          totalRuns    : 0,
          lastScrapedAt: null,
        })
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // Live "last updated" clock
  useEffect(() => {
    if (!stats?.lastScrapedAt) return

    function tick() {
      if (!stats?.lastScrapedAt) return
      const diff = Date.now() - new Date(stats.lastScrapedAt).getTime()
      const mins = Math.floor(diff / 60000)
      const hrs  = Math.floor(mins / 60)
      const days = Math.floor(hrs / 24)

      if      (days > 0)  setLastUpdate(`${days}d ago`)
      else if (hrs  > 0)  setLastUpdate(`${hrs}h ago`)
      else if (mins > 0)  setLastUpdate(`${mins}m ago`)
      else                setLastUpdate('Just now')
    }

    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [stats])

  const sources = [
    { name: 'BBC',     color: '#ef4444', active: true  },
    { name: 'Reuters', color: '#f97316', active: true  },
    { name: 'NPR',     color: '#3b82f6', active: true  },
  ]

  return (
    <div style={{
      position      : 'relative',
      borderRadius  : '20px',
      overflow      : 'hidden',
      marginBottom  : '8px',
      background    : 'linear-gradient(135deg, #0f172a 0%, #1a1040 50%, #0f172a 100%)',
      border        : '1px solid rgba(99,102,241,0.15)',
    }}>
      {/* Background glow effects */}
      <div style={{
        position      : 'absolute',
        top           : '-60px',
        left          : '50%',
        transform     : 'translateX(-50%)',
        width         : '600px',
        height        : '300px',
        background    : 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)',
        pointerEvents : 'none',
      }}/>
      <div style={{
        position     : 'absolute',
        bottom       : '-40px',
        left         : '10%',
        width        : '300px',
        height       : '200px',
        background   : 'radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>
      <div style={{
        position     : 'absolute',
        bottom       : '-40px',
        right        : '10%',
        width        : '300px',
        height       : '200px',
        background   : 'radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>

      {/* Bottom border gradient */}
      <div style={{
        position  : 'absolute',
        bottom    : 0,
        left      : 0,
        right     : 0,
        height    : '1px',
        background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)',
      }}/>

      {/* Content */}
      <div style={{
        position      : 'relative',
        zIndex        : 1,
        padding       : '36px 32px 32px',
        display       : 'flex',
        flexDirection : 'column',
        gap           : '24px',
      }}>

        {/* Top row — title + live indicator */}
        <div style={{
          display        : 'flex',
          alignItems     : 'flex-start',
          justifyContent : 'space-between',
          flexWrap       : 'wrap',
          gap            : '16px',
        }}>
          <div>
            {/* Eyebrow */}
            <div style={{
              display    : 'flex',
              alignItems : 'center',
              gap        : '8px',
              marginBottom: '10px',
            }}>
              <span style={{
                fontSize    : '11px',
                fontWeight  : '600',
                color       : 'rgba(139,92,246,0.9)',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}>
                AI-Powered News Intelligence
              </span>
            </div>

            {/* Main title */}
            <h1 style={{
              fontSize  : 'clamp(28px, 4vw, 42px)',
              fontWeight: '800',
              lineHeight: 1.1,
              margin    : 0,
              background: 'linear-gradient(135deg, #f8fafc 0%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor : 'transparent',
              backgroundClip      : 'text',
            }}>
              News Pulse
            </h1>

            {/* Subtitle */}
            <p style={{
              fontSize  : '15px',
              color     : 'rgba(148,163,184,0.7)',
              marginTop : '8px',
              fontWeight: '400',
              lineHeight: 1.5,
            }}>
              Real-time topic clustering from BBC, Reuters & NPR
              <br/>
              using TF-IDF vectorization and cosine similarity
            </p>
          </div>

          {/* Live status badge */}
          <div style={{
            display      : 'flex',
            flexDirection: 'column',
            alignItems   : 'flex-end',
            gap          : '8px',
          }}>
            <div style={{
              display     : 'inline-flex',
              alignItems  : 'center',
              gap         : '7px',
              padding     : '6px 12px',
              borderRadius: '20px',
              background  : 'rgba(16,185,129,0.1)',
              border      : '1px solid rgba(16,185,129,0.25)',
            }}>
              <span style={{
                width       : '7px',
                height      : '7px',
                borderRadius: '50%',
                background  : '#10b981',
                display     : 'inline-block',
                boxShadow   : '0 0 8px rgba(16,185,129,0.6)',
                animation   : 'pulse 2s infinite',
              }}/>
              <span style={{
                fontSize  : '12px',
                fontWeight: '600',
                color     : '#34d399',
              }}>
                LIVE
              </span>
            </div>

            <span style={{
              fontSize: '11px',
              color   : 'rgba(71,85,105,0.8)',
            }}>
              Updated {lastUpdate}
            </span>
          </div>
        </div>

        {/* Source pills */}
        <div style={{
          display   : 'flex',
          alignItems: 'center',
          gap       : '8px',
          flexWrap  : 'wrap',
        }}>
          <span style={{
            fontSize : '11px',
            color    : 'rgba(71,85,105,0.8)',
            marginRight: '4px',
          }}>
            Sources:
          </span>
          {sources.map(s => (
            <SourcePill key={s.name} {...s} />
          ))}
        </div>

        {/* Stats row */}
        {isLoading ? (
          <div style={{
            display : 'flex',
            gap     : '12px',
            flexWrap: 'wrap',
          }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{
                width       : '120px',
                height      : '90px',
                borderRadius: '12px',
                background  : 'rgba(255,255,255,0.04)',
                border      : '1px solid rgba(255,255,255,0.06)',
                animation   : 'pulse 2s infinite',
              }}/>
            ))}
          </div>
        ) : (
          <div style={{
            display : 'flex',
            gap     : '12px',
            flexWrap: 'wrap',
          }}>
            <StatItem
              label   ="Total Articles"
              value   ={stats?.totalArticles || 0}
              icon    ="📰"
              color   ="#60a5fa"
              animated={true}
            />
            <StatItem
              label   ="Topic Clusters"
              value   ={stats?.totalClusters || 0}
              icon    ="🗂️"
              color   ="#a78bfa"
              animated={true}
            />
            <StatItem
              label   ="Pipeline Runs"
              value   ={stats?.totalRuns || 0}
              icon    ="⚡"
              color   ="#34d399"
              animated={true}
            />
            <StatItem
              label   ="Last Updated"
              value   ={lastUpdate}
              icon    ="🕐"
              color   ="#fb923c"
              animated={false}
            />
          </div>
        )}

        {/* Tech stack pills */}
        <div style={{
          display   : 'flex',
          alignItems: 'center',
          gap       : '6px',
          flexWrap  : 'wrap',
          paddingTop: '4px',
          borderTop : '1px solid rgba(255,255,255,0.04)',
        }}>
          <span style={{
            fontSize: '10px',
            color   : 'rgba(71,85,105,0.6)',
          }}>
            Built with:
          </span>
          {[
            'Python',
            'TF-IDF',
            'scikit-learn',
            'Node.js',
            'PostgreSQL',
            'Next.js 15',
            'TypeScript',
          ].map(tech => (
            <span key={tech} style={{
              fontSize    : '10px',
              fontWeight  : '500',
              padding     : '2px 8px',
              borderRadius: '4px',
              background  : 'rgba(255,255,255,0.04)',
              border      : '1px solid rgba(255,255,255,0.06)',
              color       : 'rgba(148,163,184,0.5)',
            }}>
              {tech}
            </span>
          ))}
        </div>

      </div>
    </div>
  )
}
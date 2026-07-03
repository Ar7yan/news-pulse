'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { TimelineItem, TimelineGroup } from '@/types'

interface TimelineProps {
  items      : TimelineItem[]
  groups     : TimelineGroup[]
  onItemClick: (clusterId: number) => void
}

const SOURCE_COLORS: Record<string, {
  bg    : string
  border: string
  accent: string
  text  : string
}> = {
  bbc: {
    bg    : '#3b0a0a',
    border: '#7f1d1d',
    accent: '#ef4444',
    text  : '#fca5a5',
  },
  reuters: {
    bg    : '#3b1a07',
    border: '#7c2d12',
    accent: '#f97316',
    text  : '#fdba74',
  },
  npr: {
    bg    : '#0a1628',
    border: '#1e3a8a',
    accent: '#3b82f6',
    text  : '#93c5fd',
  },
  unknown: {
    bg    : '#0f172a',
    border: '#1e293b',
    accent: '#64748b',
    text  : '#94a3b8',
  },
}

export default function Timeline({ items, groups, onItemClick }: TimelineProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const timelineRef   = useRef<any>(null)
  const onClickRef    = useRef(onItemClick)

  // Keep ref updated without triggering re-render
  useEffect(() => {
    onClickRef.current = onItemClick
  }, [onItemClick])

  const buildContent = useCallback((item: TimelineItem) => {
    const source  = (item.group as string) || 'unknown'
    const colors  = SOURCE_COLORS[source] || SOURCE_COLORS.unknown
    const count   = item.meta?.articleCount || 0
    const label   = item.meta?.label || 'News Story'
    const short   = label.length > 25 ? label.slice(0, 25) + '…' : label

    return `<div style="padding:3px 6px;pointer-events:none;">
      <div style="font-weight:600;font-size:11px;color:#f1f5f9;
                  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                  max-width:160px;line-height:1.4;margin-bottom:2px;">
        ${short}
      </div>
      <div style="display:flex;align-items:center;gap:3px;">
        <span style="background:${colors.accent}33;color:${colors.text};
                     font-size:9px;font-weight:700;padding:1px 4px;
                     border-radius:3px;text-transform:uppercase;">
          ${source}
        </span>
        <span style="color:rgba(248,250,252,0.4);font-size:9px;">
          ${count} art.
        </span>
      </div>
    </div>`
  }, [])

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return
    if (items.length === 0) return

    let mounted = true

    async function initTimeline() {
      try {
        const { Timeline: VisTimeline, DataSet } = await import('vis-timeline/standalone')

        if (!mounted) return

        // Destroy previous instance cleanly
        if (timelineRef.current) {
          try { timelineRef.current.destroy() } catch {}
          timelineRef.current = null
        }

        // Build styled items
        const styledItems = items.map(item => {
          const source = (item.group as string) || 'unknown'
          const colors = SOURCE_COLORS[source] || SOURCE_COLORS.unknown

          return {
            id     : item.id,
            content: buildContent(item),
            start  : item.start,
            end    : item.end,
            type   : item.type || 'point',
            group  : item.group,
            // Inline style forces dark colors — overrides vis-timeline defaults
            style  : [
              `background-color:${colors.bg}`,
              `border:1px solid ${colors.border}`,
              `border-left:3px solid ${colors.accent}`,
              `border-radius:6px`,
              `color:#f8fafc`,
              `cursor:pointer`,
              `box-shadow:0 2px 6px rgba(0,0,0,0.5)`,
              `transition:box-shadow 0.15s ease, border-color 0.15s ease`,
            ].join(';'),
            // Store meta for click handler
            title: `${item.meta?.label} — ${item.meta?.articleCount} articles`,
          }
        })

        const itemsDS  = new DataSet(styledItems as any) as any
        const groupsDS = new DataSet(groups.map(g => ({
          id     : g.id,
          content: `<span style="color:#64748b;font-size:12px;
                                 font-weight:500;padding:0 8px;">
                      ${g.content}
                    </span>`,
        })) as any) as any

        const options: any = {
          // Date window
          start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          end  : new Date(Date.now() + 3  * 24 * 60 * 60 * 1000),

          // Interaction — NO hover flickering
          selectable      : true,
          moveable        : true,
          zoomable        : true,
          zoomMin         : 1000 * 60 * 60 * 6,
          zoomMax         : 1000 * 60 * 60 * 24 * 60,
          zoomKey         : 'ctrlKey',

          // Size
          height   : '300px',
          maxHeight: '380px',

          // Appearance
          orientation    : { axis: 'top' },
          showCurrentTime: true,

          // DISABLE built-in tooltip — causes flicker on hover
          tooltip: { delay: 99999 },

          // Item styles
          timeAxis : { scale: 'day', step: 1 },

          // CRITICAL — prevents flicker on hover
          // vis-timeline changes item styles on hover — we disable that
          snap: null,

          // Margin between items
          margin: {
            item : { horizontal: 4, vertical: 4 },
            axis : 5,
          },
        }

        const tl = new VisTimeline(
          containerRef.current!,
          itemsDS,
          groupsDS,
          options
        )

        // Click handler — fires reliably
        tl.on('click', (props: any) => {
          if (props.item !== null && props.item !== undefined) {
            const id = Number(props.item)
            if (!isNaN(id)) {
              onClickRef.current(id)
            }
          }
        })

        timelineRef.current = tl

      } catch (err) {
        console.error('Timeline init failed:', err)
      }
    }

    initTimeline()

    return () => {
      mounted = false
      if (timelineRef.current) {
        try { timelineRef.current.destroy() } catch {}
        timelineRef.current = null
      }
    }
  // Only re-init when data changes — NOT on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, groups])

  if (items.length === 0) {
    return (
      <div style={{
        border        : '1px solid #1e293b',
        borderRadius  : '12px',
        background    : '#0f172a',
        height        : '200px',
        display       : 'flex',
        alignItems    : 'center',
        justifyContent: 'center',
        flexDirection : 'column',
        gap           : '8px',
      }}>
        <span style={{ fontSize: '32px' }}>📅</span>
        <p style={{ color: '#475569', fontSize: '14px' }}>
          No timeline data available
        </p>
        <p style={{ color: '#334155', fontSize: '12px' }}>
          Articles need dates to appear here
        </p>
      </div>
    )
  }

  return (
    <div style={{
      borderRadius: '12px',
      overflow    : 'hidden',
      border      : '1px solid #1e293b',
      background  : '#0f172a',
    }}>
      <div ref={containerRef} />

      {/* Legend bar */}
      <div style={{
        display    : 'flex',
        alignItems : 'center',
        gap        : '16px',
        padding    : '8px 16px',
        background : '#0a0f1a',
        borderTop  : '1px solid #1e293b',
        flexWrap   : 'wrap',
      }}>
        <span style={{ color:'#334155', fontSize:'12px', fontWeight:500 }}>
          Legend:
        </span>
        {[
          { source:'bbc',     color:'#ef4444', label:'BBC'     },
          { source:'reuters', color:'#f97316', label:'Reuters' },
          { source:'npr',     color:'#3b82f6', label:'NPR'     },
        ].map(({ source, color, label }) => (
          <span key={source} style={{
            display   : 'flex',
            alignItems: 'center',
            gap       : '5px',
            fontSize  : '12px',
            color     : '#475569',
          }}>
            <span style={{
              width       : '10px',
              height      : '10px',
              borderRadius: '2px',
              background  : color,
              display     : 'inline-block',
              flexShrink  : 0,
            }}/>
            {label}
          </span>
        ))}
        <span style={{
          marginLeft: 'auto',
          fontSize  : '11px',
          color     : '#1e293b',
        }}>
          Ctrl+Scroll to zoom • Drag to pan • Click to open
        </span>
      </div>
    </div>
  )
}
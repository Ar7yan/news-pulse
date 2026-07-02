// =============================================================================
// components/Timeline.tsx — vis-timeline Wrapper
// =============================================================================
'use client'

import { useEffect, useRef } from 'react'
import type { TimelineItem, TimelineGroup } from '@/types'

interface TimelineProps {
  items      : TimelineItem[]
  groups     : TimelineGroup[]
  onItemClick: (clusterId: number) => void
}

export default function Timeline({
  items,
  groups,
  onItemClick,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const timelineRef  = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return
    if (items.length === 0) return

    // Dynamically import vis-timeline (client-side only)
    async function initTimeline() {
      const { Timeline: VisTimeline, DataSet } = await import('vis-timeline/standalone')

      // Destroy previous instance
      if (timelineRef.current) {
        timelineRef.current.destroy()
        timelineRef.current = null
      }

      // Create datasets
      const itemsDataset  = new DataSet<TimelineItem>(items)
      const groupsDataset = new DataSet<TimelineGroup>(groups)

      // Timeline options
      const options = {
        // Date range: show last 14 days to now
        start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        end  : new Date(Date.now() + 24 * 60 * 60 * 1000),

        // Interaction
        selectable  : true,
        moveable    : true,
        zoomable    : true,
        zoomMin     : 1000 * 60 * 60,       // Min zoom: 1 hour
        zoomMax     : 1000 * 60 * 60 * 24 * 30, // Max zoom: 30 days

        // Appearance
        height     : '300px',
        maxHeight  : '400px',
        orientation: { axis: 'top' },
        showCurrentTime: true,

        // Item tooltip
        tooltip: {
          followMouse: true,
          overflowMethod: 'cap' as const,
        },

        // Axis labels
        timeAxis: {
          scale    : 'day' as const,
          step     : 1,
        },
      }

      // Create timeline
      const timeline = new VisTimeline(
        containerRef.current!,
        itemsDataset,
        groupsDataset,
        options
      )

      // Click handler — open cluster modal
      timeline.on('click', (props: any) => {
        if (props.item !== null && props.item !== undefined) {
          onItemClick(Number(props.item))
        }
      })

      timelineRef.current = timeline
    }

    initTimeline()

    // Cleanup on unmount
    return () => {
      if (timelineRef.current) {
        timelineRef.current.destroy()
        timelineRef.current = null
      }
    }
  }, [items, groups, onItemClick])

  // Empty state
  if (items.length === 0) {
    return (
      <div className="border border-gray-800 rounded-xl bg-gray-900/50
                      h-48 flex items-center justify-center">
        <div className="text-center text-gray-600">
          <p className="text-2xl mb-2">📅</p>
          <p className="text-sm">No timeline data available</p>
          <p className="text-xs mt-1">
            Articles need dates to appear on the timeline
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-800">
      {/* vis-timeline mounts here */}
      <div ref={containerRef} />

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2
                      bg-gray-900 border-t border-gray-800
                      text-xs text-gray-500">
        <span className="font-medium text-gray-400">Legend:</span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-red-900
                           border border-red-700 inline-block"/>
          BBC
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-orange-900
                           border border-orange-700 inline-block"/>
          Reuters
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-blue-900
                           border border-blue-700 inline-block"/>
          NPR
        </span>
        <span className="ml-auto">
          Scroll to zoom • Drag to pan • Click to explore
        </span>
      </div>
    </div>
  )
}
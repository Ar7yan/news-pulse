'use client'

import { useEffect, useState } from 'react'
import { fetchHealth } from '@/services/api'

interface Stats {
  totalArticles: number
  totalClusters: number
  totalRuns    : number
  lastScrapedAt: string | null
}

export default function StatsBar() {
  const [stats,     setStats]     = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  useEffect(() => {
    async function loadStats() {
      try {
        const health = await fetchHealth()
        setStats(health.stats)
      } catch (err) {
        console.error('Failed to load stats:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()

    // Refresh stats every 60 seconds
    const interval = setInterval(loadStats, 60000)
    return () => clearInterval(interval)
  }, [])

  // Live clock for "last updated"
  useEffect(() => {
    if (!stats?.lastScrapedAt) return

    function updateTime() {
      if (!stats?.lastScrapedAt) return
      const diff = Date.now() - new Date(stats.lastScrapedAt).getTime()
      const mins = Math.floor(diff / 60000)
      const hrs  = Math.floor(mins / 60)
      const days = Math.floor(hrs / 24)

      if (days > 0)       setLastUpdate(`${days}d ago`)
      else if (hrs > 0)   setLastUpdate(`${hrs}h ago`)
      else if (mins > 0)  setLastUpdate(`${mins}m ago`)
      else                setLastUpdate('Just now')
    }

    updateTime()
    const interval = setInterval(updateTime, 30000)
    return () => clearInterval(interval)
  }, [stats])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i}
            className="bg-gray-900 border border-gray-800 rounded-xl
                       p-4 animate-pulse">
            <div className="h-3 bg-gray-800 rounded w-1/2 mb-2" />
            <div className="h-6 bg-gray-800 rounded w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const statItems = [
    {
      label: 'Total Articles',
      value: stats.totalArticles.toLocaleString(),
      icon : '📰',
      color: 'text-blue-400',
    },
    {
      label: 'Topic Clusters',
      value: stats.totalClusters.toLocaleString(),
      icon : '🗂️',
      color: 'text-purple-400',
    },
    {
      label: 'Pipeline Runs',
      value: stats.totalRuns.toLocaleString(),
      icon : '⚡',
      color: 'text-yellow-400',
    },
    {
      label: 'Last Updated',
      value: lastUpdate || 'Never',
      icon : '🕐',
      color: 'text-green-400',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="bg-gray-900 border border-gray-800 rounded-xl
                     p-4 hover:border-gray-600 transition-colors
                     duration-200"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{item.icon}</span>
            <span className="text-xs text-gray-500 font-medium">
              {item.label}
            </span>
          </div>
          <div className={`text-2xl font-bold ${item.color}`}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}
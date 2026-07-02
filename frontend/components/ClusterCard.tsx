// =============================================================================
// components/ClusterCard.tsx — Topic Cluster Card
// =============================================================================

import { formatDistanceToNow } from 'date-fns'
import type { Cluster, NewsSource } from '@/types'

interface ClusterCardProps {
  cluster: Cluster
  onClick : () => void
}

export default function ClusterCard({ cluster, onClick }: ClusterCardProps) {
  const timeAgo = cluster.timeRange.start
    ? formatDistanceToNow(new Date(cluster.timeRange.start),
        { addSuffix: true })
    : null

  return (
    <button
      onClick={onClick}
      className="card p-5 text-left w-full group
                 hover:shadow-lg hover:shadow-black/20
                 hover:-translate-y-0.5 transition-all
                 duration-200 animate-slide-up"
    >

      {/* Header: sources + article count */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {cluster.sources.map(source => (
            <SourceBadge key={source} source={source} />
          ))}
        </div>
        <span className="text-xs text-gray-500 shrink-0 bg-gray-800
                         px-2 py-0.5 rounded-full">
          {cluster.articleCount} articles
        </span>
      </div>

      {/* Cluster label */}
      <h3 className="font-semibold text-white text-base leading-snug
                     group-hover:text-blue-300 transition-colors
                     duration-200 mb-2">
        {cluster.label}
      </h3>

      {/* Keywords */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {cluster.keywords.slice(0, 4).map(keyword => (
          <span
            key={keyword}
            className="text-xs bg-gray-800 text-gray-400
                       px-2 py-0.5 rounded-md border
                       border-gray-700"
          >
            {keyword}
          </span>
        ))}
      </div>

      {/* Footer: time */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">
          {timeAgo || 'Recently'}
        </span>
        <span className="text-xs text-gray-600 group-hover:text-blue-400
                         transition-colors duration-200">
          View articles →
        </span>
      </div>

    </button>
  )
}


// Source badge component
function SourceBadge({ source }: { source: NewsSource }) {
  const styles: Record<string, string> = {
    bbc    : 'badge-bbc',
    reuters: 'badge-reuters',
    npr    : 'badge-npr',
    unknown: 'badge-unknown',
  }

  const labels: Record<string, string> = {
    bbc    : '🇬🇧 BBC',
    reuters: '📰 Reuters',
    npr    : '🎙️ NPR',
    unknown: '❓ Other',
  }

  return (
    <span className={`text-xs px-2 py-0.5 rounded-md
                      font-medium ${styles[source] || styles.unknown}`}>
      {labels[source] || source}
    </span>
  )
}
'use client'

import { useEffect } from 'react'
import { useClusterDetail } from '@/hooks/useClusters'
import { formatDistanceToNow, format } from 'date-fns'
import type { NewsSource } from '@/types'
import LoadingState from './LoadingState'
import ErrorState from './ErrorState'

interface ClusterModalProps {
  clusterId: number
  onClose: () => void
}

function SourceTag({ source }: { source: NewsSource }) {
  const config: Record<string, { label: string; cls: string }> = {
    bbc:     { label: 'BBC',     cls: 'text-red-400'    },
    reuters: { label: 'Reuters', cls: 'text-orange-400' },
    npr:     { label: 'NPR',     cls: 'text-blue-400'   },
    unknown: { label: 'Other',   cls: 'text-gray-400'   },
  }
  const c = config[source] || config.unknown
  return (
    <span className={`text-xs font-medium ${c.cls}`}>
      {c.label}
    </span>
  )
}

export default function ClusterModal({ clusterId, onClose }: ClusterModalProps) {
  const { cluster, isLoading, error } = useClusterDetail(clusterId)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl z-10">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-800">
          <div className="flex-1 pr-4">
            {isLoading ? (
              <div className="h-6 bg-gray-800 rounded animate-pulse w-3/4" />
            ) : (
              <h2 className="text-xl font-bold text-white leading-snug">
                {cluster?.label}
              </h2>
            )}
            {cluster && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {cluster.keywords.slice(0, 5).map((kw) => (
                  <span
                    key={kw}
                    className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-md border border-gray-700"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors duration-200 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats bar */}
        {cluster && (
          <div className="px-6 py-3 bg-gray-800/50 border-b border-gray-800 flex items-center gap-4 text-sm flex-wrap">
            <span className="text-gray-400">
              {cluster.articleCount} articles
            </span>
            {cluster.sources.map((s) => (
              <SourceTag key={s} source={s} />
            ))}
            {cluster.timeRange.start && (
              <span className="text-gray-500 text-xs ml-auto">
                {formatDistanceToNow(new Date(cluster.timeRange.start), { addSuffix: true })}
              </span>
            )}
          </div>
        )}

        {/* Article list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading ? (
            <LoadingState message="Loading articles..." />
          ) : error ? (
            <ErrorState message={error} />
          ) : (
            cluster?.articles.map((article) => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-xl transition-all duration-200 group"
              >
                {/* Source + date */}
                <div className="flex items-center justify-between mb-2 gap-2">
                  <SourceTag source={article.source} />
                  <span className="text-xs text-gray-600">
                    {article.publishedAt
                      ? format(new Date(article.publishedAt), 'MMM d, HH:mm')
                      : 'Recently'}
                  </span>
                </div>

                {/* Title */}
                <h4 className="text-sm font-medium text-gray-200 group-hover:text-white leading-snug transition-colors duration-200 mb-1">
                  {article.title}
                </h4>

                {/* Description */}
                {article.description && (
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                    {article.description}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-2 gap-2">
                  {article.author && (
                    <span className="text-xs text-gray-600">
                      By {article.author}
                    </span>
                  )}
                  {article.similarityScore !== null && (
                    <span className="text-xs text-gray-600 ml-auto">
                      {Math.round((article.similarityScore || 0) * 100)}% relevant
                    </span>
                  )}
                </div>

                <div className="mt-2 text-xs text-blue-500 group-hover:text-blue-400 transition-colors duration-200">
                  Read full article
                </div>
              </a>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
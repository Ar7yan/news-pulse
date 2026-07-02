'use client'

import { useState, useMemo }   from 'react'
import { useClusters }         from '@/hooks/useClusters'
import { useTimeline }         from '@/hooks/useTimeline'
import SourceFilter            from '@/components/SourceFilter'
import RefreshButton           from '@/components/RefreshButton'
import ClusterCard             from '@/components/ClusterCard'
import ClusterModal            from '@/components/ClusterModal'
import Timeline                from '@/components/Timeline'
import LoadingState            from '@/components/LoadingState'
import ErrorState              from '@/components/ErrorState'
import StatsBar                from '@/components/StatsBar'
import SearchBar               from '@/components/SearchBar'
import type {
  SourceFilter as SourceFilterType,
  ModalState
} from '@/types'

export default function HomePage() {
  // --- State ---
  const [source,      setSource]      = useState<SourceFilterType>('all')
  const [days,        setDays]        = useState(7)
  const [searchQuery, setSearchQuery] = useState('')
  const [modal,       setModal]       = useState<ModalState>({
    isOpen   : false,
    clusterId: null,
  })

  // --- Data fetching ---
  const {
    clusters,
    isLoading: clustersLoading,
    error    : clustersError,
    refresh  : refreshClusters,
  } = useClusters(source)

  const {
    items    : timelineItems,
    groups   : timelineGroups,
    isLoading: timelineLoading,
    error    : timelineError,
    refresh  : refreshTimeline,
  } = useTimeline(source, days)

  // --- Filtered clusters by search ---
  const filteredClusters = useMemo(() => {
    if (!searchQuery.trim()) return clusters
    const q = searchQuery.toLowerCase()
    return clusters.filter(cluster =>
      cluster.label.toLowerCase().includes(q) ||
      cluster.keywords.some(k => k.toLowerCase().includes(q))
    )
  }, [clusters, searchQuery])

  // --- Handlers ---
  function handleRefresh() {
    refreshClusters()
    refreshTimeline()
  }

  function handleClusterClick(clusterId: number) {
    setModal({ isOpen: true, clusterId })
  }

  function handleCloseModal() {
    setModal({ isOpen: false, clusterId: null })
  }

  return (
    <div className="space-y-8 animate-fade-in">

      {/* STATS BAR */}
      <StatsBar />

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center
                      justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Today's News Clusters
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Articles grouped by topic using AI • Updated every 5 minutes
          </p>
        </div>
        <RefreshButton onRefresh={handleRefresh} />
      </div>

      {/* FILTERS ROW */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3
                        items-start sm:items-center">
          <SourceFilter
            selected={source}
            onChange={setSource}
          />
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Show:</span>
            {[1, 3, 7, 14].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm
                           font-medium transition-all duration-200
                           ${days === d
                             ? 'bg-blue-600 text-white'
                             : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                           }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <SearchBar onSearch={setSearchQuery} />
      </div>

      {/* TIMELINE */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-white">
            📅 Timeline View
          </h3>
          <span className="text-xs text-gray-500 bg-gray-800
                           px-2 py-0.5 rounded-full">
            Click a cluster to explore
          </span>
        </div>

        {timelineLoading ? (
          <LoadingState message="Loading timeline..." />
        ) : timelineError ? (
          <ErrorState message={timelineError} onRetry={refreshTimeline} />
        ) : (
          <Timeline
            items={timelineItems}
            groups={timelineGroups}
            onItemClick={handleClusterClick}
          />
        )}
      </section>

      {/* CLUSTER CARDS */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            🗂️ Topic Clusters
          </h3>
          {clusters.length > 0 && (
            <span className="text-sm text-gray-400">
              {searchQuery
                ? `${filteredClusters.length} of ${clusters.length} topics`
                : `${clusters.length} topics found`
              }
            </span>
          )}
        </div>

        {clustersLoading ? (
          <LoadingState message="Clustering articles..." />
        ) : clustersError ? (
          <ErrorState message={clustersError} onRetry={refreshClusters} />
        ) : filteredClusters.length === 0 ? (
          <EmptyState source={source} searchQuery={searchQuery} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2
                          lg:grid-cols-3 gap-4">
            {filteredClusters.map(cluster => (
              <ClusterCard
                key={cluster.id}
                cluster={cluster}
                onClick={() => handleClusterClick(cluster.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* MODAL */}
      {modal.isOpen && modal.clusterId && (
        <ClusterModal
          clusterId={modal.clusterId}
          onClose={handleCloseModal}
        />
      )}

    </div>
  )
}

function EmptyState({
  source,
  searchQuery
}: {
  source     : SourceFilterType
  searchQuery: string
}) {
  return (
    <div className="text-center py-16 text-gray-500">
      <div className="text-5xl mb-4">
        {searchQuery ? '🔍' : '📭'}
      </div>
      <p className="text-lg font-medium text-gray-400">
        {searchQuery
          ? `No clusters matching "${searchQuery}"`
          : 'No clusters found'
        }
      </p>
      <p className="text-sm mt-2">
        {searchQuery
          ? 'Try a different search term'
          : source !== 'all'
            ? `No articles from ${source.toUpperCase()} yet`
            : 'Run the scraper to fetch articles'
        }
      </p>
    </div>
  )
}
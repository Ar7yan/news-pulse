// =============================================================================
// hooks/useClusters.ts — SWR Data Fetching for Clusters
// =============================================================================
// WHY SWR?
// SWR (stale-while-revalidate) gives us:
// - Automatic caching
// - Background revalidation
// - Loading and error states
// - Deduplication of requests
// - Auto-retry on failure
//
// USAGE in components:
//   const { clusters, isLoading, error, refresh } = useClusters()
// =============================================================================

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import { fetchClusters, fetchClusterById, triggerIngest } from '@/services/api'
import type { SourceFilter, Cluster, ClusterDetail } from '@/types'


// -----------------------------------------------------------------------------
// Hook: useClusters — fetch all clusters
// -----------------------------------------------------------------------------
export function useClusters(source: SourceFilter = 'all', page = 1) {
  const key = ['clusters', source, page]

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => fetchClusters(source, page),
    {
      // Refresh every 5 minutes automatically
      refreshInterval    : 5 * 60 * 1000,
      // Keep showing old data while fetching new data
      revalidateOnFocus  : false,
      // Retry 3 times on error
      errorRetryCount    : 3,
    }
  )

  return {
    clusters  : data?.data ?? [],
    pagination: data?.pagination ?? null,
    isLoading,
    error     : error?.message ?? null,
    refresh   : mutate,
  }
}


// -----------------------------------------------------------------------------
// Hook: useClusterDetail — fetch single cluster with articles
// -----------------------------------------------------------------------------
export function useClusterDetail(id: number | null) {
  const { data, error, isLoading } = useSWR(
    // Only fetch if id is not null
    id ? ['cluster', id] : null,
    () => fetchClusterById(id!),
    {
      revalidateOnFocus: false,
    }
  )

  return {
    cluster  : data?.data ?? null,
    isLoading,
    error    : error?.message ?? null,
  }
}


// -----------------------------------------------------------------------------
// Hook: useTriggerIngest — trigger scraper with loading state
// -----------------------------------------------------------------------------
export function useTriggerIngest() {
  const { trigger, isMutating, error } = useSWRMutation(
    'ingest-trigger',
    async () => {
      const result = await triggerIngest()
      return result
    }
  )

  return {
    trigger   : trigger,
    isRunning : isMutating,
    error     : error?.message ?? null,
  }
}
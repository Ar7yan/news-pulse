// =============================================================================
// hooks/useTimeline.ts — SWR Data Fetching for Timeline
// =============================================================================

import useSWR from 'swr'
import { fetchTimeline } from '@/services/api'
import type { SourceFilter } from '@/types'


export function useTimeline(source: SourceFilter = 'all', days = 7) {
  const key = ['timeline', source, days]

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () => fetchTimeline(source, days),
    {
      refreshInterval  : 5 * 60 * 1000,
      revalidateOnFocus: false,
      errorRetryCount  : 3,
    }
  )

  return {
    items    : data?.data?.items   ?? [],
    groups   : data?.data?.groups  ?? [],
    meta     : data?.data?.meta    ?? null,
    isLoading,
    error    : error?.message ?? null,
    refresh  : mutate,
  }
}
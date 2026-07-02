// =============================================================================
// services/api.ts — API Client
// =============================================================================
// All API calls go through this file.
// Never use fetch() directly in components — always use these functions.
//
// WHY CENTRALIZE API CALLS?
// - One place to update if the API URL changes
// - Consistent error handling across all requests
// - Easy to add auth headers later
// - TypeScript return types on every function
// =============================================================================

import type {
  ClustersResponse,
  ClusterDetailResponse,
  TimelineResponse,
  IngestStatusResponse,
  HealthResponse,
  SourceFilter,
} from '@/types'

// Base URL — reads from environment variable
// In development: http://localhost:5000
// In production:  https://your-api.onrender.com
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

const API_V1 = `${API_BASE}/api/v1`


// -----------------------------------------------------------------------------
// Base fetch wrapper — handles errors consistently
// -----------------------------------------------------------------------------
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_V1}${endpoint}`

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    // Parse response body
    const data = await response.json()

    // Check for HTTP errors
    if (!response.ok) {
      throw new APIError(
        data.error || `HTTP ${response.status}`,
        response.status
      )
    }

    return data as T

  } catch (err) {
    // Re-throw APIErrors as-is
    if (err instanceof APIError) throw err

    // Wrap network errors
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new APIError(
        'Cannot connect to API. Is the backend running?',
        0
      )
    }

    throw new APIError(
      err instanceof Error ? err.message : 'Unknown error',
      500
    )
  }
}


// -----------------------------------------------------------------------------
// Custom Error Class
// -----------------------------------------------------------------------------
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message)
    this.name = 'APIError'
  }
}


// =============================================================================
// API Functions
// =============================================================================

/**
 * Get all topic clusters.
 */
export async function fetchClusters(
  source: SourceFilter = 'all',
  page  : number       = 1,
  limit : number       = 20
): Promise<ClustersResponse> {
  const params = new URLSearchParams({
    source: source.toString(),
    page  : page.toString(),
    limit : limit.toString(),
  })

  return apiFetch<ClustersResponse>(`/clusters?${params}`)
}


/**
 * Get a single cluster with all its articles.
 */
export async function fetchClusterById(
  id: number
): Promise<ClusterDetailResponse> {
  return apiFetch<ClusterDetailResponse>(`/clusters/${id}`)
}


/**
 * Get timeline data for vis-timeline.
 */
export async function fetchTimeline(
  source: SourceFilter = 'all',
  days  : number       = 7
): Promise<TimelineResponse> {
  const params = new URLSearchParams({
    source: source.toString(),
    days  : days.toString(),
  })

  return apiFetch<TimelineResponse>(`/timeline?${params}`)
}


/**
 * Trigger the scraper pipeline.
 */
export async function triggerIngest(): Promise<{
  success : boolean
  message : string
  jobId   : number
  statusUrl: string
}> {
  return apiFetch('/ingest/trigger', { method: 'POST' })
}


/**
 * Get ingest job status.
 */
export async function fetchIngestStatus(
  jobId: number
): Promise<IngestStatusResponse> {
  return apiFetch<IngestStatusResponse>(`/ingest/status/${jobId}`)
}


/**
 * Get latest ingest job status.
 */
export async function fetchLatestIngestStatus(): Promise<IngestStatusResponse> {
  return apiFetch<IngestStatusResponse>('/ingest/status')
}


/**
 * Health check.
 */
export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`)
  return response.json()
}
// =============================================================================
// types/index.ts — Shared TypeScript Types
// =============================================================================

export interface Article {
  id             : number
  title          : string
  url            : string
  source         : NewsSource
  description    : string | null
  author         : string | null
  publishedAt    : string | null
  similarityScore: number | null
}

export interface Cluster {
  id          : number
  label       : string
  keywords    : string[]
  articleCount: number
  sources     : NewsSource[]
  timeRange   : {
    start: string | null
    end  : string | null
  }
  createdAt   : string
  aiSummary   : string | null    // ← AI summary field
}

export interface ClusterDetail extends Cluster {
  articles: Article[]
}

export interface TimelineItem {
  id       : number
  content  : string
  start    : string
  end?     : string
  type     : 'point' | 'range'
  group    : NewsSource | 'unknown'
  className: string
  meta     : {
    label       : string
    keywords    : string[]
    articleCount: number
    sources     : NewsSource[]
  }
}

export interface TimelineGroup {
  id       : NewsSource | 'unknown'
  content  : string
  className: string
}

export interface PaginationMeta {
  total     : number
  page      : number
  limit     : number
  totalPages: number
  hasNext   : boolean
  hasPrev   : boolean
}

export interface ClustersResponse {
  success   : boolean
  data      : Cluster[]
  pagination: PaginationMeta
}

export interface ClusterDetailResponse {
  success: boolean
  data   : ClusterDetail
}

export interface TimelineResponse {
  success: boolean
  data   : {
    items : TimelineItem[]
    groups: TimelineGroup[]
    meta  : {
      totalClusters: number
      days         : number
      source       : string
      dateRange    : {
        start: string
        end  : string
      }
    }
  }
}

export interface IngestStatusResponse {
  success: boolean
  data   : {
    jobId          : number
    status         : JobStatus
    errorMessage   : string | null
    startedAt      : string
    completedAt    : string | null
    durationSeconds: number | null
    stats: {
      articlesScraped  : number
      articlesSkipped  : number
      clustersGenerated: number
      sourcesProcessed : string[]
    }
  }
}

export interface HealthResponse {
  status   : 'ok' | 'error'
  timestamp: string
  database : 'connected' | 'disconnected'
  stats    : {
    totalArticles: number
    totalClusters: number
    totalRuns    : number
    lastScrapedAt: string | null
  }
}

export type NewsSource =
  | 'bbc'
  | 'reuters'
  | 'npr'
  | 'guardian'
  | 'aljazeera'
  | 'techcrunch'
  | 'hackernews'
  | 'ap'
  | 'unknown'

export type SourceFilter = NewsSource | 'all'
export type JobStatus    = 'pending' | 'running' | 'completed' | 'failed'

export interface FilterState {
  source: SourceFilter
  days  : number
}

export interface ModalState {
  isOpen   : boolean
  clusterId: number | null
}
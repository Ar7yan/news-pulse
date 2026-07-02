// =============================================================================
// components/RefreshButton.tsx
// =============================================================================
'use client'

import { useState } from 'react'
import { triggerIngest } from '@/services/api'

interface RefreshButtonProps {
  onRefresh: () => void
}

export default function RefreshButton({ onRefresh }: RefreshButtonProps) {
  const [isScraping, setIsScraping] = useState(false)
  const [lastStatus, setLastStatus] = useState<string | null>(null)

  async function handleTriggerScraper() {
    try {
      setIsScraping(true)
      setLastStatus(null)

      const result = await triggerIngest()

      if (result.success) {
        setLastStatus(`Job #${result.jobId} started!`)
      } else {
        setLastStatus(result.message)
      }

      // Refresh the UI data after a short delay
      setTimeout(() => {
        onRefresh()
        setLastStatus(null)
      }, 3000)

    } catch (err) {
      setLastStatus('Failed to trigger scraper')
    } finally {
      setIsScraping(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">

        {/* Refresh UI data button */}
        <button
          onClick={onRefresh}
          title="Refresh display"
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700
                     text-gray-400 hover:text-white border border-gray-700
                     transition-all duration-200"
        >
          {/* Refresh icon */}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0
                 004.582 9m0 0H9m11 11v-5h-.581m0
                 0a8.003 8.003 0 01-15.357-2m15.357
                 2H15" />
          </svg>
        </button>

        {/* Trigger scraper button */}
        <button
          onClick={handleTriggerScraper}
          disabled={isScraping}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg
            text-sm font-medium border transition-all duration-200
            ${isScraping
              ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 hover:border-blue-400'
            }
          `}
        >
          {isScraping ? (
            <>
              <span className="w-3 h-3 border border-gray-500
                               border-t-gray-300 rounded-full
                               animate-spin" />
              Scraping...
            </>
          ) : (
            <>
              <span>⚡</span>
              Fetch News
            </>
          )}
        </button>
      </div>

      {/* Status message */}
      {lastStatus && (
        <span className="text-xs text-green-400 animate-fade-in">
          {lastStatus}
        </span>
      )}
    </div>
  )
}
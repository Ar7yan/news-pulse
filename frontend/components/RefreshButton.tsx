'use client'

import { useState } from 'react'
import { triggerIngest } from '@/services/api'

const STEPS = [
  'Fetching RSS feeds...',
  'Extracting articles...',
  'Building TF-IDF vectors...',
  'Clustering topics...',
  'Updating timeline...',
]

interface RefreshButtonProps {
  onRefresh: () => void
}

export default function RefreshButton({ onRefresh }: RefreshButtonProps) {
  const [isScraping,   setIsScraping]   = useState(false)
  const [currentStep,  setCurrentStep]  = useState(0)
  const [status,       setStatus]       = useState<string | null>(null)

  async function handleFetchNews() {
    try {
      setIsScraping(true)
      setCurrentStep(0)
      setStatus(null)

      const result = await triggerIngest()

      // Animate through steps
      for (let i = 0; i < STEPS.length; i++) {
        setCurrentStep(i)
        await new Promise(r => setTimeout(r, 1200))
      }

      setStatus(result.success ? '✓ Done!' : result.message)
      setTimeout(() => {
        onRefresh()
        setStatus(null)
      }, 2000)

    } catch {
      setStatus('Failed to trigger scraper')
    } finally {
      setIsScraping(false)
      setCurrentStep(0)
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'6px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>

        {/* Refresh icon button */}
        <button
          onClick={onRefresh}
          title="Refresh display"
          style={{
            padding:'8px', borderRadius:'10px',
            background:'#0f172a', border:'1px solid #1e293b',
            color:'#64748b', cursor:'pointer',
            display:'flex', alignItems:'center',
            transition:'all 0.15s ease',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = '#1e293b'
            el.style.color      = '#f1f5f9'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = '#0f172a'
            el.style.color      = '#64748b'
          }}
        >
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>

        {/* Fetch News button */}
        <button
          onClick={handleFetchNews}
          disabled={isScraping}
          style={{
            display    : 'flex', alignItems:'center', gap:'7px',
            padding    : '9px 18px', borderRadius:'10px',
            background : isScraping
              ? '#1e293b'
              : 'linear-gradient(135deg, #3b82f6, #6366f1)',
            border     : 'none',
            color      : isScraping ? '#64748b' : 'white',
            fontSize   : '13px', fontWeight:'600',
            cursor     : isScraping ? 'not-allowed' : 'pointer',
            transition : 'all 0.2s ease',
            boxShadow  : isScraping ? 'none' : '0 2px 12px rgba(99,102,241,0.35)',
          }}
        >
          {isScraping ? (
            <>
              <span style={{
                width:'12px', height:'12px', borderRadius:'50%',
                border:'2px solid #334155', borderTop:'2px solid #64748b',
                display:'inline-block', animation:'spin 0.8s linear infinite',
                flexShrink:0,
              }}/>
              {STEPS[currentStep]}
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
      {status && (
        <span style={{
          fontSize:'12px',
          color: status.startsWith('✓') ? '#34d399' : '#f87171',
        }}>
          {status}
        </span>
      )}
    </div>
  )
}
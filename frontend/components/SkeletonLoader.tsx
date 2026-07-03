// =============================================================================
// SkeletonLoader.tsx — Shimmer skeleton screens for all loading states
// =============================================================================

'use client'

// ─────────────────────────────────────────────────────────────
// Base shimmer block — the building block for all skeletons
// ─────────────────────────────────────────────────────────────
interface ShimmerProps {
  width?  : string
  height  : string
  radius? : string
  style?  : React.CSSProperties
}

export function Shimmer({
  width   = '100%',
  height,
  radius  = '6px',
  style   = {},
}: ShimmerProps) {
  return (
    <div style={{
      width,
      height,
      borderRadius: radius,
      background  : 'linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
      backgroundSize    : '1000px 100%',
      animation         : 'shimmer 2s infinite linear',
      flexShrink        : 0,
      ...style,
    }}/>
  )
}

// ─────────────────────────────────────────────────────────────
// Cluster Card Skeleton
// Matches the exact shape of ClusterCard.tsx
// ─────────────────────────────────────────────────────────────
export function ClusterCardSkeleton() {
  return (
    <div style={{
      background   : '#0f172a',
      border       : '1px solid #1e293b',
      borderRadius : '16px',
      padding      : '20px',
      display      : 'flex',
      flexDirection: 'column',
      gap          : '12px',
    }}>
      {/* Header row — source badges + article count */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', gap:'6px' }}>
          <Shimmer width="52px" height="20px" radius="6px" />
          <Shimmer width="44px" height="20px" radius="6px" />
        </div>
        <Shimmer width="64px" height="20px" radius="12px" />
      </div>

      {/* Title */}
      <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
        <Shimmer width="85%" height="18px" />
        <Shimmer width="60%" height="18px" />
      </div>

      {/* Keywords */}
      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
        <Shimmer width="56px"  height="22px" radius="12px" />
        <Shimmer width="72px"  height="22px" radius="12px" />
        <Shimmer width="48px"  height="22px" radius="12px" />
        <Shimmer width="64px"  height="22px" radius="12px" />
      </div>

      {/* Footer */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <Shimmer width="80px" height="12px" />
        <Shimmer width="96px" height="12px" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Cluster Grid Skeleton
// Shows 6 card skeletons in a responsive grid
// ─────────────────────────────────────────────────────────────
interface ClusterGridSkeletonProps {
  count?: number
}

export function ClusterGridSkeleton({ count = 6 }: ClusterGridSkeletonProps) {
  return (
    <div>
      {/* Section header skeleton */}
      <div style={{
        display       : 'flex',
        justifyContent: 'space-between',
        alignItems    : 'center',
        marginBottom  : '16px',
      }}>
        <Shimmer width="160px" height="24px" />
        <Shimmer width="100px" height="16px" />
      </div>

      {/* Cards grid */}
      <div style={{
        display            : 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap                : '16px',
      }}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              opacity  : 1 - i * 0.08,
              animation: `fadeIn 0.3s ease-out ${i * 0.05}s both`,
            }}
          >
            <ClusterCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Timeline Skeleton
// Matches the vis-timeline layout
// ─────────────────────────────────────────────────────────────
export function TimelineSkeleton() {
  return (
    <div style={{
      border      : '1px solid #1e293b',
      borderRadius: '12px',
      overflow    : 'hidden',
      background  : '#0f172a',
    }}>
      {/* Date axis */}
      <div style={{
        display      : 'flex',
        gap          : '0',
        padding      : '12px 16px 8px',
        borderBottom : '1px solid #1e293b',
        overflowX    : 'hidden',
      }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            flex         : 1,
            display      : 'flex',
            flexDirection: 'column',
            alignItems   : 'center',
            gap          : '4px',
          }}>
            <Shimmer width="32px" height="10px" />
          </div>
        ))}
      </div>

      {/* Timeline body */}
      <div style={{ padding: '16px' }}>
        {/* BBC row */}
        <div style={{
          display    : 'flex',
          alignItems : 'center',
          gap        : '12px',
          marginBottom: '12px',
        }}>
          <Shimmer width="60px" height="12px" />
          <div style={{ flex:1, display:'flex', gap:'8px', alignItems:'center' }}>
            <Shimmer width="120px" height="40px" radius="6px"
              style={{ background:'linear-gradient(90deg, #3b0a0a 0%, #7f1d1d 50%, #3b0a0a 100%)' }}
            />
            <Shimmer width="90px"  height="40px" radius="6px"
              style={{ background:'linear-gradient(90deg, #3b0a0a 0%, #7f1d1d 50%, #3b0a0a 100%)' }}
            />
            <Shimmer width="140px" height="40px" radius="6px"
              style={{ background:'linear-gradient(90deg, #3b0a0a 0%, #7f1d1d 50%, #3b0a0a 100%)' }}
            />
          </div>
        </div>

        {/* Reuters row */}
        <div style={{
          display    : 'flex',
          alignItems : 'center',
          gap        : '12px',
          marginBottom: '12px',
        }}>
          <Shimmer width="60px" height="12px" />
          <div style={{ flex:1, display:'flex', gap:'8px', alignItems:'center' }}>
            <Shimmer width="100px" height="40px" radius="6px"
              style={{ background:'linear-gradient(90deg, #3b1a07 0%, #7c2d12 50%, #3b1a07 100%)' }}
            />
            <Shimmer width="80px"  height="40px" radius="6px"
              style={{ background:'linear-gradient(90deg, #3b1a07 0%, #7c2d12 50%, #3b1a07 100%)' }}
            />
          </div>
        </div>

        {/* NPR row */}
        <div style={{
          display   : 'flex',
          alignItems: 'center',
          gap       : '12px',
        }}>
          <Shimmer width="60px" height="12px" />
          <div style={{ flex:1, display:'flex', gap:'8px', alignItems:'center' }}>
            <Shimmer width="110px" height="40px" radius="6px"
              style={{ background:'linear-gradient(90deg, #0a1628 0%, #1e3a8a 50%, #0a1628 100%)' }}
            />
            <Shimmer width="130px" height="40px" radius="6px"
              style={{ background:'linear-gradient(90deg, #0a1628 0%, #1e3a8a 50%, #0a1628 100%)' }}
            />
          </div>
        </div>
      </div>

      {/* Legend bar */}
      <div style={{
        display   : 'flex',
        gap       : '16px',
        padding   : '8px 16px',
        borderTop : '1px solid #1e293b',
        background: '#0a0f1a',
      }}>
        <Shimmer width="40px"  height="12px" />
        <Shimmer width="32px"  height="12px" />
        <Shimmer width="48px"  height="12px" />
        <Shimmer width="36px"  height="12px" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Stats Bar Skeleton
// Matches the 4 stat cards in StatsBar.tsx
// ─────────────────────────────────────────────────────────────
export function StatsBarSkeleton() {
  return (
    <div style={{
      display            : 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap                : '12px',
      marginBottom       : '24px',
    }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{
          background   : '#0f172a',
          border       : '1px solid #1e293b',
          borderRadius : '16px',
          padding      : '20px',
          display      : 'flex',
          flexDirection: 'column',
          gap          : '10px',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <Shimmer width="24px" height="24px" radius="6px" />
            <Shimmer width="80px" height="12px" />
          </div>
          <Shimmer width="60%" height="28px" radius="6px" />
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Modal Skeleton
// Shows while cluster detail is loading
// ─────────────────────────────────────────────────────────────
export function ModalSkeleton() {
  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{
        padding     : '24px',
        borderBottom: '1px solid #1e293b',
        display     : 'flex',
        flexDirection: 'column',
        gap         : '12px',
      }}>
        <Shimmer width="75%" height="24px" />
        <div style={{ display:'flex', gap:'6px' }}>
          <Shimmer width="60px" height="20px" radius="12px" />
          <Shimmer width="80px" height="20px" radius="12px" />
          <Shimmer width="50px" height="20px" radius="12px" />
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        padding    : '12px 24px',
        borderBottom: '1px solid #1e293b',
        display    : 'flex',
        gap        : '16px',
      }}>
        <Shimmer width="80px"  height="14px" />
        <Shimmer width="60px"  height="14px" />
        <Shimmer width="50px"  height="14px" />
      </div>

      {/* Article list */}
      <div style={{
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap    : '12px',
      }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            background   : '#0f172a',
            border       : '1px solid #1e293b',
            borderRadius : '12px',
            padding      : '16px',
            display      : 'flex',
            flexDirection: 'column',
            gap          : '8px',
            opacity      : 1 - i * 0.15,
          }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <Shimmer width="50px" height="14px" radius="4px" />
              <Shimmer width="70px" height="12px" />
            </div>
            <Shimmer width="90%" height="16px" />
            <Shimmer width="70%" height="16px" />
            <Shimmer width="100%" height="12px" />
            <Shimmer width="80%"  height="12px" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Hero Skeleton
// Shows while hero stats are loading
// ─────────────────────────────────────────────────────────────
export function HeroSkeleton() {
  return (
    <div style={{
      borderRadius: '20px',
      background  : 'linear-gradient(135deg, #0f172a, #1a1040, #0f172a)',
      border      : '1px solid rgba(99,102,241,0.1)',
      padding     : '36px 32px 32px',
      display     : 'flex',
      flexDirection: 'column',
      gap         : '24px',
    }}>
      <div>
        <Shimmer width="200px" height="12px" style={{ marginBottom:'12px' }} />
        <Shimmer width="280px" height="44px" radius="8px" style={{ marginBottom:'12px' }} />
        <Shimmer width="400px" height="14px" style={{ marginBottom:'6px' }} />
        <Shimmer width="320px" height="14px" />
      </div>
      <div style={{ display:'flex', gap:'8px' }}>
        <Shimmer width="80px"  height="26px" radius="20px" />
        <Shimmer width="90px"  height="26px" radius="20px" />
        <Shimmer width="70px"  height="26px" radius="20px" />
      </div>
      <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
        {[1,2,3,4].map(i => (
          <Shimmer key={i} width="120px" height="90px" radius="12px" />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Generic page loading state with message
// ─────────────────────────────────────────────────────────────
interface PageLoadingProps {
  message?: string
}

export function PageLoading({ message = 'Loading...' }: PageLoadingProps) {
  return (
    <div style={{
      display       : 'flex',
      flexDirection : 'column',
      alignItems    : 'center',
      justifyContent: 'center',
      padding       : '64px 24px',
      gap           : '16px',
    }}>
      {/* Spinner */}
      <div style={{
        width       : '40px',
        height      : '40px',
        borderRadius: '50%',
        border      : '3px solid #1e293b',
        borderTop   : '3px solid #3b82f6',
        animation   : 'spin 0.8s linear infinite',
      }}/>

      <p style={{
        fontSize  : '14px',
        color     : '#475569',
        fontWeight: '500',
      }}>
        {message}
      </p>
    </div>
  )
}

// Default export — the main loading state used across the app
export default function LoadingState({ message = 'Loading...' }: PageLoadingProps) {
  return <PageLoading message={message} />
}
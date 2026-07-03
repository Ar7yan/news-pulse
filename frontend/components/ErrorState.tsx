interface ErrorStateProps {
  message : string
  onRetry?: () => void
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div style={{
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      padding:'48px 24px', textAlign:'center', gap:'16px',
    }}>
      <div style={{
        width:'56px', height:'56px', borderRadius:'16px',
        background:'rgba(239,68,68,0.1)',
        border:'1px solid rgba(239,68,68,0.2)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:'24px',
      }}>
        ⚠️
      </div>

      <div>
        <h3 style={{ fontSize:'16px', fontWeight:'600', color:'#f87171', margin:'0 0 6px' }}>
          Something went wrong
        </h3>
        <p style={{ fontSize:'13px', color:'#475569', maxWidth:'360px', lineHeight:1.6 }}>
          {message}
        </p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding:'8px 20px', borderRadius:'10px',
            background:'#1e293b', border:'1px solid #334155',
            color:'#94a3b8', cursor:'pointer', fontSize:'13px',
            fontWeight:'500', transition:'all 0.15s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = '#334155'
            ;(e.currentTarget as HTMLElement).style.color = '#f1f5f9'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = '#1e293b'
            ;(e.currentTarget as HTMLElement).style.color = '#94a3b8'
          }}
        >
          Try again
        </button>
      )}

      <p style={{ fontSize:'11px', color:'#1e293b' }}>
        Make sure the backend is running on port 5000
      </p>
    </div>
  )
}
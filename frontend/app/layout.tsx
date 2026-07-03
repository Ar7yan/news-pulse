import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title      : 'News Pulse — AI-Powered News Intelligence',
  description: 'Real-time news aggregation with AI topic clustering using TF-IDF and cosine similarity',
  keywords   : ['news', 'AI', 'clustering', 'BBC', 'Reuters', 'NPR', 'timeline'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className="min-h-screen bg-gray-950 text-gray-100"
        suppressHydrationWarning={true}
      >
        {/* ── TOP NAV ──────────────────────────────────────── */}
        <header style={{
          borderBottom   : '1px solid #1e293b',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          backdropFilter : 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          position       : 'sticky',
          top            : 0,
          zIndex         : 40,
        }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">

              {/* Logo */}
              <div className="flex items-center gap-3">
                <div style={{
                  width          : '34px',
                  height         : '34px',
                  background     : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  borderRadius   : '10px',
                  display        : 'flex',
                  alignItems     : 'center',
                  justifyContent : 'center',
                  color          : 'white',
                  fontWeight     : '800',
                  fontSize       : '13px',
                  boxShadow      : '0 2px 12px rgba(99,102,241,0.4)',
                  flexShrink     : 0,
                }}>
                  NP
                </div>
                <div>
                  <h1 style={{
                    color     : '#f8fafc',
                    fontWeight: '700',
                    fontSize  : '16px',
                    lineHeight: 1,
                    margin    : 0,
                  }}>
                    News Pulse
                  </h1>
                  <p style={{
                    color    : '#475569',
                    fontSize : '11px',
                    margin   : '2px 0 0 0',
                    lineHeight: 1,
                  }}>
                    AI-Powered News Intelligence
                  </p>
                </div>
              </div>

              {/* Right side — source indicators + status */}
              <div className="hidden sm:flex items-center gap-4">

                {/* Source dots */}
                <div style={{
                  display   : 'flex',
                  alignItems: 'center',
                  gap       : '12px',
                }}>
                  {[
                    { label: 'BBC',     color: '#ef4444' },
                    { label: 'Reuters', color: '#f97316' },
                    { label: 'NPR',     color: '#3b82f6' },
                  ].map(({ label, color }) => (
                    <span key={label} style={{
                      display   : 'flex',
                      alignItems: 'center',
                      gap       : '5px',
                      fontSize  : '12px',
                      color     : '#64748b',
                    }}>
                      <span style={{
                        width          : '7px',
                        height         : '7px',
                        borderRadius   : '50%',
                        background     : color,
                        display        : 'inline-block',
                        boxShadow      : `0 0 6px ${color}80`,
                        animation      : 'liveBlink 3s ease-in-out infinite',
                        animationDelay : label === 'Reuters' ? '1s' : label === 'NPR' ? '2s' : '0s',
                      }}/>
                      {label}
                    </span>
                  ))}
                </div>

                {/* Divider */}
                <div style={{
                  width     : '1px',
                  height    : '20px',
                  background: '#1e293b',
                }}/>

                {/* Live badge */}
                <div style={{
                  display     : 'flex',
                  alignItems  : 'center',
                  gap         : '5px',
                  padding     : '4px 10px',
                  borderRadius: '20px',
                  background  : 'rgba(16,185,129,0.08)',
                  border      : '1px solid rgba(16,185,129,0.2)',
                }}>
                  <span style={{
                    width       : '6px',
                    height      : '6px',
                    borderRadius: '50%',
                    background  : '#10b981',
                    display     : 'inline-block',
                    boxShadow   : '0 0 6px rgba(16,185,129,0.6)',
                    animation   : 'liveBlink 2s ease-in-out infinite',
                  }}/>
                  <span style={{
                    fontSize  : '11px',
                    fontWeight: '600',
                    color     : '#34d399',
                  }}>
                    LIVE
                  </span>
                </div>

              </div>
            </div>
          </div>
        </header>

        {/* ── MAIN CONTENT ─────────────────────────────────── */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* ── FOOTER ───────────────────────────────────────── */}
        <footer style={{
          borderTop : '1px solid #1e293b',
          marginTop : '64px',
          padding   : '32px 0',
        }}>
          <div className="max-w-7xl mx-auto px-4">
            <div style={{
              display       : 'flex',
              flexDirection : 'column',
              alignItems    : 'center',
              gap           : '12px',
              textAlign     : 'center',
            }}>

              {/* Logo row */}
              <div style={{
                display   : 'flex',
                alignItems: 'center',
                gap       : '8px',
              }}>
                <div style={{
                  width         : '24px',
                  height        : '24px',
                  background    : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  borderRadius  : '6px',
                  display       : 'flex',
                  alignItems    : 'center',
                  justifyContent: 'center',
                  color         : 'white',
                  fontWeight    : '800',
                  fontSize      : '9px',
                }}>
                  NP
                </div>
                <span style={{
                  color     : '#334155',
                  fontSize  : '13px',
                  fontWeight: '500',
                }}>
                  News Pulse
                </span>
              </div>

              {/* Tech stack */}
              <div style={{
                display  : 'flex',
                gap      : '6px',
                flexWrap : 'wrap',
                justifyContent: 'center',
              }}>
                {[
                  'Python',
                  'scikit-learn',
                  'TF-IDF',
                  'Node.js',
                  'Express',
                  'PostgreSQL',
                  'Next.js 15',
                  'TypeScript',
                  'Vercel',
                  'Render',
                ].map(tech => (
                  <span key={tech} style={{
                    fontSize    : '10px',
                    padding     : '2px 8px',
                    borderRadius: '4px',
                    background  : '#0f172a',
                    border      : '1px solid #1e293b',
                    color       : '#334155',
                  }}>
                    {tech}
                  </span>
                ))}
              </div>

              {/* Copyright */}
              <p style={{
                color   : '#1e293b',
                fontSize: '11px',
              }}>
                Built with ♥ for production · MIT License
              </p>

            </div>
          </div>
        </footer>

      </body>
    </html>
  )
}
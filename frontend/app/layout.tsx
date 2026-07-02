import type { Metadata } from 'next'
// @ts-ignore: allow global CSS import in app layout
import './globals.css'

export const metadata: Metadata = {
  title: 'News Pulse',
  description: 'Topic Clustered News Timeline',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-gray-100">
        <header className="border-b border-gray-800 bg-gray-900 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  NP
                </div>
                <div>
                  <h1 className="text-white font-bold text-lg leading-none">
                    News Pulse
                  </h1>
                  <p className="text-gray-400 text-xs">
                    Topic Clustered News Timeline
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-gray-400">BBC</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-gray-400">Reuters</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-gray-400">NPR</span>
                </span>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-gray-800 mt-16 py-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
            News Pulse — Built with Next.js, Express, Python and PostgreSQL
          </div>
        </footer>
      </body>
    </html>
  )
}
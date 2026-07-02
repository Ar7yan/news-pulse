'use client'

import { useState, useCallback } from 'react'

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
}

export default function SearchBar({
  onSearch,
  placeholder = 'Search topics, keywords...'
}: SearchBarProps) {
  const [query, setQuery] = useState('')

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    onSearch(value)
  }, [onSearch])

  const handleClear = useCallback(() => {
    setQuery('')
    onSearch('')
  }, [onSearch])

  return (
    <div className="relative w-full max-w-md">
      {/* Search icon */}
      <div className="absolute inset-y-0 left-0 pl-3 flex
                      items-center pointer-events-none">
        <svg className="w-4 h-4 text-gray-500" fill="none"
             viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Input */}
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-gray-900 border border-gray-700
                   rounded-xl pl-10 pr-10 py-2.5 text-sm
                   text-gray-200 placeholder-gray-500
                   focus:outline-none focus:border-blue-500
                   focus:ring-1 focus:ring-blue-500
                   transition-colors duration-200"
      />

      {/* Clear button */}
      {query && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex
                     items-center text-gray-500 hover:text-gray-300
                     transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
               stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
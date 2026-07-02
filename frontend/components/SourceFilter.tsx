// =============================================================================
// components/SourceFilter.tsx — News Source Filter Buttons
// =============================================================================

import type { SourceFilter as SourceFilterType } from '@/types'

interface SourceFilterProps {
  selected: SourceFilterType
  onChange: (source: SourceFilterType) => void
}

const SOURCES: {
  value  : SourceFilterType
  label  : string
  emoji  : string
  color  : string
  active : string
}[] = [
  {
    value : 'all',
    label : 'All Sources',
    emoji : '🌐',
    color : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500',
    active: 'bg-gray-700 text-white border-gray-500',
  },
  {
    value : 'bbc',
    label : 'BBC',
    emoji : '🇬🇧',
    color : 'bg-gray-800 text-red-300 border-gray-700 hover:border-red-700',
    active: 'bg-red-950 text-red-200 border-red-700',
  },
  {
    value : 'reuters',
    label : 'Reuters',
    emoji : '📰',
    color : 'bg-gray-800 text-orange-300 border-gray-700 hover:border-orange-700',
    active: 'bg-orange-950 text-orange-200 border-orange-700',
  },
  {
    value : 'npr',
    label : 'NPR',
    emoji : '🎙️',
    color : 'bg-gray-800 text-blue-300 border-gray-700 hover:border-blue-700',
    active: 'bg-blue-950 text-blue-200 border-blue-700',
  },
]

export default function SourceFilter({
  selected,
  onChange,
}: SourceFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-gray-400 text-sm mr-1">Filter:</span>

      {SOURCES.map(source => (
        <button
          key={source.value}
          onClick={() => onChange(source.value)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg
            text-sm font-medium border transition-all duration-200
            ${selected === source.value ? source.active : source.color}
          `}
        >
          <span>{source.emoji}</span>
          <span>{source.label}</span>
        </button>
      ))}
    </div>
  )
}
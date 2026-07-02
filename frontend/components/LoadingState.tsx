// =============================================================================
// components/LoadingState.tsx
// =============================================================================

interface LoadingStateProps {
  message?: string
}

export default function LoadingState({
  message = 'Loading...'
}: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center
                    py-16 text-gray-500">

      {/* Animated spinner */}
      <div className="relative w-12 h-12 mb-4">
        <div className="absolute inset-0 rounded-full border-2
                        border-gray-700" />
        <div className="absolute inset-0 rounded-full border-2
                        border-transparent border-t-blue-500
                        animate-spin" />
      </div>

      <p className="text-sm text-gray-400 animate-pulse-slow">
        {message}
      </p>
    </div>
  )
}
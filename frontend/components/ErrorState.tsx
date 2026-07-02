// =============================================================================
// components/ErrorState.tsx
// =============================================================================

interface ErrorStateProps {
  message : string
  onRetry?: () => void
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center
                    py-16 text-center">

      <div className="text-4xl mb-4">⚠️</div>

      <h3 className="text-lg font-semibold text-red-400 mb-2">
        Something went wrong
      </h3>

      <p className="text-sm text-gray-500 max-w-md mb-6">
        {message}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700
                     text-gray-300 rounded-lg text-sm font-medium
                     transition-colors duration-200 border
                     border-gray-700 hover:border-gray-500"
        >
          Try Again
        </button>
      )}

      <p className="text-xs text-gray-600 mt-4">
        Make sure the backend is running on port 5000
      </p>
    </div>
  )
}
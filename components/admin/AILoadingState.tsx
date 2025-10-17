'use client'

interface AILoadingStateProps {
  message?: string
}

export default function AILoadingState({ message = 'AI is thinking...' }: AILoadingStateProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-purple-600/10 border border-purple-500/30 rounded-lg">
      <div className="relative">
        <div className="animate-spin h-5 w-5 border-2 border-purple-400 border-t-transparent rounded-full" />
        <div className="absolute inset-0 animate-ping h-5 w-5 border-2 border-purple-400 rounded-full opacity-20" />
      </div>
      <div>
        <p className="text-purple-400 font-medium text-sm">{message}</p>
        <p className="text-purple-300/60 text-xs">This may take 10-30 seconds</p>
      </div>
    </div>
  )
}

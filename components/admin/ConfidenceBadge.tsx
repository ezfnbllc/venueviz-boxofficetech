'use client'

interface ConfidenceBadgeProps {
  confidence: number
  showLabel?: boolean
}

export default function ConfidenceBadge({ confidence, showLabel = true }: ConfidenceBadgeProps) {
  const getColor = () => {
    if (confidence >= 90) return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30'
    if (confidence >= 70) return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30'
    if (confidence >= 50) return 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30'
    return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30'
  }

  const getLabel = () => {
    if (confidence >= 90) return 'Verified'
    if (confidence >= 70) return 'Likely'
    if (confidence >= 50) return 'Uncertain'
    return 'Guess'
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getColor()}`}>
      <span className="text-[10px]">🤖</span>
      {showLabel && <span>{getLabel()}</span>}
      <span className="opacity-75">{confidence}%</span>
    </span>
  )
}

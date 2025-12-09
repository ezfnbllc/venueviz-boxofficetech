'use client'
import { useState } from 'react'

interface AIButtonProps {
  onClick: () => Promise<void>
  label?: string
  icon?: string
  disabled?: boolean
  className?: string
  loadingText?: string
}

export default function AIButton({
  onClick,
  label = 'AI Assist',
  icon = '🤖',
  disabled = false,
  className = '',
  loadingText = 'Processing...'
}: AIButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClick = async () => {
    setLoading(true)
    setError('')

    try {
      await onClick()
    } catch (err: any) {
      setError(err.message || 'AI processing failed')
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled || loading}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          transition-all duration-200
          ${loading
            ? 'bg-accent-600/50 cursor-wait'
            : 'bg-accent-600 hover:bg-accent-700 active:scale-95'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          text-white text-sm
          ${className}
        `}
      >
        {loading ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            {loadingText}
          </>
        ) : (
          <>
            <span className="text-base">{icon}</span>
            {label}
          </>
        )}
      </button>

      {error && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-red-100 dark:bg-red-600/20 border border-red-200 dark:border-red-500/30 rounded-lg text-red-700 dark:text-red-400 text-sm whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  )
}

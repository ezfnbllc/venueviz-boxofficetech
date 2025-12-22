/**
 * CountdownTimer Component
 * Based on Barren theme countdown display
 * Shows days, hours, minutes, seconds until event starts
 */

'use client'

import { useState, useEffect } from 'react'

interface CountdownTimerProps {
  targetDate: Date
  className?: string
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeLeft(targetDate: Date): TimeLeft | null {
  const now = new Date()
  const difference = targetDate.getTime() - now.getTime()

  if (difference <= 0) {
    return null
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  }
}

export function CountdownTimer({ targetDate, className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTimeLeft(calculateTimeLeft(targetDate))

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate))
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  // Don't render on server to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className={`grid grid-cols-4 gap-4 ${className || ''}`}>
        {['Days', 'Hours', 'Minutes', 'Seconds'].map((label) => (
          <div key={label} className="text-center">
            <div className="bg-[#1d1d1d] rounded-lg p-4 mb-2">
              <span className="text-3xl md:text-4xl font-bold text-white">--</span>
            </div>
            <span className="text-sm text-[#717171] font-medium">{label}</span>
          </div>
        ))}
      </div>
    )
  }

  if (!timeLeft) {
    return (
      <div className={`text-center py-8 ${className || ''}`}>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#6ac045] text-white rounded-lg">
          <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">Event is Live!</span>
        </div>
      </div>
    )
  }

  const timeBlocks = [
    { value: timeLeft.days, label: 'Days' },
    { value: timeLeft.hours, label: 'Hours' },
    { value: timeLeft.minutes, label: 'Minutes' },
    { value: timeLeft.seconds, label: 'Seconds' },
  ]

  return (
    <div className={`grid grid-cols-4 gap-4 ${className || ''}`}>
      {timeBlocks.map(({ value, label }) => (
        <div key={label} className="text-center">
          <div className="bg-[#1d1d1d] rounded-lg p-4 mb-2">
            <span className="text-3xl md:text-4xl font-bold text-white">
              {value.toString().padStart(2, '0')}
            </span>
          </div>
          <span className="text-sm text-[#717171] font-medium">{label}</span>
        </div>
      ))}
    </div>
  )
}

export default CountdownTimer

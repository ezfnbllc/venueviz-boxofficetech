/**
 * CountdownTimer Component
 * Based on Barren theme .countdown + .countdown-item styles
 *
 * Displays a countdown timer to an event date
 * Client component for real-time updates
 */

'use client'

import { useState, useEffect } from 'react'

interface CountdownTimerProps {
  targetDate: Date | undefined | null
  className?: string
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeLeft(targetDate: Date): TimeLeft {
  const now = new Date().getTime()
  const target = targetDate.getTime()
  const difference = target - now

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((difference % (1000 * 60)) / 1000),
  }
}

export function CountdownTimer({ targetDate, className = '' }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!targetDate || isNaN(targetDate.getTime())) return

    // Initial calculation
    setTimeLeft(calculateTimeLeft(targetDate))

    // Update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate))
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  // Check if event has passed
  const isPast = targetDate && targetDate.getTime() < new Date().getTime()

  if (!targetDate || isNaN(targetDate.getTime())) {
    return (
      <div className={`flex gap-1.5 ${className}`}>
        <CountdownItem value="--" label="Days" />
        <CountdownItem value="--" label="Hours" />
        <CountdownItem value="--" label="Minutes" />
        <CountdownItem value="--" label="Seconds" />
      </div>
    )
  }

  if (isPast) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <p className="text-[#717171] text-sm">This event has ended</p>
      </div>
    )
  }

  // Only render actual values on client to avoid hydration mismatch
  if (!isClient) {
    return (
      <div className={`flex gap-1.5 ${className}`}>
        <CountdownItem value="--" label="Days" />
        <CountdownItem value="--" label="Hours" />
        <CountdownItem value="--" label="Minutes" />
        <CountdownItem value="--" label="Seconds" />
      </div>
    )
  }

  return (
    <div className={`flex gap-1.5 ${className}`}>
      <CountdownItem value={timeLeft.days} label="Days" />
      <CountdownItem value={timeLeft.hours} label="Hours" />
      <CountdownItem value={timeLeft.minutes} label="Minutes" />
      <CountdownItem value={timeLeft.seconds} label="Seconds" />
    </div>
  )
}

interface CountdownItemProps {
  value: number | string
  label: string
}

function CountdownItem({ value, label }: CountdownItemProps) {
  return (
    <div className="flex-1 bg-[#6ac045] text-white text-center py-3 rounded shadow-sm">
      <div className="text-2xl font-normal leading-none mb-1">
        {typeof value === 'number' ? value.toString().padStart(2, '0') : value}
      </div>
      <div className="text-xs font-medium uppercase tracking-wide">
        {label}
      </div>
    </div>
  )
}

export default CountdownTimer

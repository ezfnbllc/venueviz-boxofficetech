'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { dbStatus } from '@/lib/firebase'

export default function DbStatus() {
  const [status, setStatus] = useState('...')
  const pathname = usePathname()

  useEffect(() => {
    setStatus(dbStatus.connected ? '🟢 ' + dbStatus.name : '🔴 Offline')
  }, [])

  // Only show on admin pages, not on public /p/* pages
  if (pathname?.startsWith('/p/')) {
    return null
  }

  // Also hide on custom domains (when pathname is just / or /events etc without /p/)
  if (pathname && !pathname.startsWith('/admin') && !pathname.startsWith('/p/')) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 px-3 py-1 bg-black/60 backdrop-blur text-xs text-green-400 rounded-full">
      {status}
    </div>
  )
}

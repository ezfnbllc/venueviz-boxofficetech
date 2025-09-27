'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFirebaseAuth } from '@/lib/firebase-auth'

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false,
  requirePromoter = false 
}: { 
  children: React.ReactNode
  requireAdmin?: boolean
  requirePromoter?: boolean
}) {
  const router = useRouter()
  const { user, userData, loading, isAdmin, isPromoter } = useFirebaseAuth()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
      } else if (requireAdmin && !isAdmin) {
        alert('Admin access required')
        router.push('/')
      } else if (requirePromoter && !isPromoter) {
        alert('Promoter access required')
        router.push('/')
      }
    }
  }, [user, userData, loading, isAdmin, isPromoter, requireAdmin, requirePromoter, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-red-400">Admin access required</p>
      </div>
    )
  }

  if (requirePromoter && !isPromoter) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-red-400">Promoter access required</p>
      </div>
    )
  }

  return <>{children}</>
}

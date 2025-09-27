'use client'
import { useEffect, useState } from 'react'
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
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        console.log('No user, redirecting to login')
        router.push('/login')
      } else {
        // User exists, check permissions
        let hasAccess = true
        
        if (requireAdmin && !isAdmin) {
          hasAccess = false
          console.log('Admin required but user is not admin')
        } else if (requirePromoter && !isPromoter && !isAdmin) {
          hasAccess = false
          console.log('Promoter required but user is not promoter or admin')
        }
        
        if (hasAccess) {
          console.log('User authorized for this page')
          setAuthorized(true)
        } else {
          console.log('User not authorized, redirecting')
          router.push('/')
        }
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

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
      </div>
    )
  }

  return <>{children}</>
}

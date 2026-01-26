/**
 * Layout Component
 * Base layout wrapper for public pages
 *
 * Includes Header, Footer, and main content area
 * Automatically hooks into auth context for login state
 */

'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Header, HeaderProps } from './Header'
import { Footer, FooterProps } from './Footer'
import { useFirebaseAuth } from '@/lib/firebase-auth'

export interface LayoutProps {
  children: ReactNode
  header?: HeaderProps
  footer?: FooterProps
  showHeader?: boolean
  showFooter?: boolean
  className?: string
  contentClassName?: string
  promoterSlug?: string
  basePath?: string  // Base path for URLs (empty on custom domains)
}

export function Layout({
  children,
  header,
  footer,
  showHeader = true,
  showFooter = true,
  className,
  contentClassName,
  promoterSlug,
  basePath,
}: LayoutProps) {
  const router = useRouter()
  const { user, tenantCustomer, loadTenantCustomer, signOut } = useFirebaseAuth()

  // Load tenant customer when user is logged in but tenantCustomer not loaded
  useEffect(() => {
    if (user && !tenantCustomer && promoterSlug) {
      loadTenantCustomer(promoterSlug)
    }
  }, [user, tenantCustomer, promoterSlug, loadTenantCustomer])

  const isLoggedIn = !!user && !!tenantCustomer
  const userName = tenantCustomer?.firstName || tenantCustomer?.email?.split('@')[0] || 'Account'

  const handleSignOut = async () => {
    await signOut()
    router.push(basePath !== undefined ? basePath : `/p/${promoterSlug}`)
  }

  return (
    <div className={cn('min-h-screen flex flex-col bg-white', className)}>
      {showHeader && (
        <Header
          promoterSlug={promoterSlug}
          basePath={basePath}
          isLoggedIn={isLoggedIn}
          userName={userName}
          onSignOut={handleSignOut}
          {...header}
        />
      )}

      {/* Main content with header offset */}
      <main
        className={cn(
          'flex-1',
          showHeader && 'pt-[70px]', // Header height offset
          contentClassName
        )}
      >
        {children}
      </main>

      {showFooter && (
        <Footer
          promoterSlug={promoterSlug}
          {...footer}
        />
      )}
    </div>
  )
}

export default Layout

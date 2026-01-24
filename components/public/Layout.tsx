/**
 * Layout Component
 * Base layout wrapper for public pages
 *
 * Includes Header, Footer, and main content area
 */

'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Header, HeaderProps } from './Header'
import { Footer, FooterProps } from './Footer'

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
  return (
    <div className={cn('min-h-screen flex flex-col bg-white', className)}>
      {showHeader && (
        <Header
          promoterSlug={promoterSlug}
          basePath={basePath}
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

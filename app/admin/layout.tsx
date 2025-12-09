'use client'

import { useFirebaseAuth } from '@/lib/firebase-auth'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import PromoterFilterDropdown from '@/components/admin/PromoterFilterDropdown'
import { useTheme } from '@/lib/theme-context'

// Theme toggle icons
function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  )
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, userData, loading, isAdmin, signOut } = useFirebaseAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [currentPromoterId, setCurrentPromoterId] = useState<string>()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && !isAdmin && userData?.role === 'promoter') {
      setCurrentPromoterId(userData?.promoterId)
    }
  }, [user, isAdmin, userData])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-accent-500"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/events', label: 'Events', icon: '🎫' },
    { href: '/admin/venues', label: 'Venues', icon: '🏟️' },
    { href: '/admin/orders', label: 'Orders', icon: '🛒' },
    { href: '/admin/customers', label: 'Customers', icon: '👥' },
    { href: '/admin/promotions', label: 'Promotions', icon: '🎁' },
    { href: '/admin/promoters', label: 'Promoters', icon: '🤝' },
  ]

  return (
    <div className="min-h-screen gradient-mesh-light dark:gradient-mesh-dark text-slate-900 dark:text-slate-50 transition-colors duration-200">
      {/* Header */}
      <header className="glass-light dark:glass-dark border-b border-slate-200/50 dark:border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left - Logo & Nav */}
            <div className="flex items-center gap-8">
              <Link href="/admin" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                  <span className="text-2xl">🏢</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    VenueViz
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Admin</p>
                </div>
              </Link>

              {/* Navigation */}
              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map(item => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'glass-btn-accent text-blue-700 dark:text-white shadow-lg shadow-blue-500/25'
                          : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 glass-btn'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Right - Theme Toggle, Filter & User */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="glass-btn p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <SunIcon className="w-5 h-5" />
                ) : (
                  <MoonIcon className="w-5 h-5" />
                )}
              </button>

              {/* Promoter Filter */}
              <PromoterFilterDropdown
                isMasterAdmin={isAdmin}
                currentPromoterId={currentPromoterId}
              />

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-blue-500/30"
                >
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 glass-card-elevated rounded-xl overflow-hidden shadow-lg">
                    <div className="p-4 border-b border-slate-200 dark:border-white/10">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.email}</p>
                      {isAdmin && (
                        <span className="inline-block mt-1 px-2.5 py-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg border border-blue-500/30">
                          Master Admin
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => signOut()}
                      className="w-full px-4 py-3 text-left text-sm text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-colors font-medium"
                    >
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}

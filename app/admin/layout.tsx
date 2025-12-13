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

function ChevronIcon({ className, expanded }: { className?: string; expanded: boolean }) {
  return (
    <svg
      className={`${className} transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  )
}

interface NavItem {
  href: string
  label: string
  icon: string
  badge?: string
  adminOnly?: boolean  // Only visible to master admins
}

interface NavGroup {
  id: string
  label: string
  icon: string
  items: NavItem[]
  adminOnly?: boolean  // Entire group only visible to master admins
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['core'])

  // Build navigation groups - some items/groups are admin-only
  const navGroups: NavGroup[] = [
    {
      id: 'core',
      label: 'Core',
      icon: '🏠',
      items: [
        { href: '/admin', label: 'Dashboard', icon: '📊' },
        { href: '/admin/events', label: 'Events', icon: '🎭' },
        { href: '/admin/venues', label: 'Venues', icon: '🏛️', adminOnly: true },
        { href: '/admin/orders', label: 'Orders', icon: '🎫' },
        { href: '/admin/customers', label: 'Customers', icon: '👥' },
        { href: '/admin/promoters', label: 'Promoters', icon: '🤝', adminOnly: true },
      ]
    },
    {
      id: 'sales',
      label: 'Sales & Revenue',
      icon: '💰',
      items: [
        { href: '/admin/subscriptions', label: 'Subscriptions', icon: '🔄' },
        { href: '/admin/loyalty', label: 'Loyalty Program', icon: '⭐' },
        { href: '/admin/promotions', label: 'Promotions', icon: '🎟️' },
        { href: '/admin/pricing', label: 'Dynamic Pricing', icon: '📈' },
      ]
    },
    {
      id: 'marketing',
      label: 'Marketing',
      icon: '📣',
      items: [
        { href: '/admin/marketing/campaigns', label: 'Campaigns', icon: '📧' },
        { href: '/admin/marketing/social', label: 'Social Commerce', icon: '📱' },
        { href: '/admin/experiments', label: 'A/B Testing', icon: '🧪' },
        { href: '/admin/marketing/influencers', label: 'Influencers', icon: '🌟' },
      ]
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: '⚙️',
      items: [
        { href: '/admin/operations/check-in', label: 'Check-In', icon: '✅' },
        { href: '/admin/operations/queue', label: 'Queue Management', icon: '🚶' },
        { href: '/admin/operations/transfers', label: 'Ticket Transfers', icon: '🔀' },
        { href: '/admin/operations/automation', label: 'Automation', icon: '🤖', adminOnly: true },
      ]
    },
    {
      id: 'support',
      label: 'Support',
      icon: '🎧',
      items: [
        { href: '/admin/support', label: 'Help Desk', icon: '🎫', badge: 'New' },
        { href: '/admin/support/knowledge', label: 'Knowledge Base', icon: '📚' },
        { href: '/admin/support/chat', label: 'Live Chat', icon: '💬' },
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics & BI',
      icon: '📈',
      items: [
        { href: '/admin/analytics', label: 'Analytics', icon: '📊' },
        { href: '/admin/bi', label: 'BI Dashboard', icon: '📉' },
        { href: '/admin/reports', label: 'Reports', icon: '📋' },
        { href: '/admin/fraud', label: 'Fraud Detection', icon: '🛡️', adminOnly: true },
      ]
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      adminOnly: true,  // Entire settings group is admin-only
      items: [
        { href: '/admin/integrations', label: 'Integrations', icon: '🔗' },
        { href: '/admin/webhooks', label: 'Webhooks', icon: '🪝' },
        { href: '/admin/security', label: 'API & Security', icon: '🔐' },
        { href: '/admin/compliance', label: 'Compliance', icon: '📜' },
        { href: '/admin/white-label', label: 'White Label', icon: '🏷️' },
      ]
    },
  ]

  // Filter navigation based on user role
  const filteredNavGroups = navGroups
    .filter(group => !group.adminOnly || isAdmin)
    .map(group => ({
      ...group,
      items: group.items.filter(item => !item.adminOnly || isAdmin)
    }))
    .filter(group => group.items.length > 0)

  // Auto-expand group containing current route
  useEffect(() => {
    for (const group of navGroups) {
      if (group.items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))) {
        if (!expandedGroups.includes(group.id)) {
          setExpandedGroups(prev => [...prev, group.id])
        }
        break
      }
    }
  }, [pathname])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

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

  const isItemActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 transition-colors duration-200">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <Link href="/admin" className="flex items-center gap-3 group">
            <img
              src="https://firebasestorage.googleapis.com/v0/b/venueviz.firebasestorage.app/o/BOLogo.png?alt=media"
              alt="BoxOfficeTech"
              className="w-10 h-10 rounded-xl object-contain group-hover:scale-105 transition-transform"
            />
            <div>
              <h1 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                BoxOfficeTech
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Admin Panel</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-3 overflow-y-auto h-[calc(100vh-80px)]">
          {filteredNavGroups.map(group => {
            const isExpanded = expandedGroups.includes(group.id)
            const hasActiveItem = group.items.some(item => isItemActive(item.href))

            return (
              <div key={group.id} className="mb-1">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    hasActiveItem
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">{group.icon}</span>
                    {group.label}
                  </span>
                  <ChevronIcon className="w-4 h-4" expanded={isExpanded} />
                </button>

                {isExpanded && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {group.items.map(item => {
                      const isActive = isItemActive(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive
                              ? 'bg-blue-500 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <span className="text-base">{item.icon}</span>
                          <span className="flex-1">{item.label}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-green-500 text-white rounded">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </aside>

      {/* Main content area */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700">
          <div className="px-4 lg:px-6 py-3">
            <div className="flex items-center justify-between">
              {/* Left - Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <MenuIcon className="w-6 h-6" />
              </button>

              {/* Center - Search (optional, placeholder) */}
              <div className="hidden md:flex flex-1 max-w-md mx-4">
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full px-4 py-2 pl-10 bg-slate-100 dark:bg-slate-700 border-0 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500"
                  />
                  <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Right - Actions */}
              <div className="flex items-center gap-2">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
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
                    className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center hover:scale-105 transition-transform shadow-sm"
                  >
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {/* User Dropdown */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700">
                      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.email}</p>
                        {isAdmin ? (
                          <span className="inline-block mt-1 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg">
                            Master Admin
                          </span>
                        ) : userData?.role === 'promoter' ? (
                          <span className="inline-block mt-1 px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-medium rounded-lg">
                            Promoter
                          </span>
                        ) : null}
                      </div>
                      <button
                        onClick={() => signOut()}
                        className="w-full px-4 py-3 text-left text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

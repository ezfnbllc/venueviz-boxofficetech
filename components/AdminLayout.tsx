'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

interface NavItem {
  label: string
  href: string
  icon: string
  badge?: string
}

interface NavGroup {
  label: string
  icon: string
  items: NavItem[]
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['core'])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const navGroups: NavGroup[] = [
    {
      label: 'Core',
      icon: '🏠',
      items: [
        { label: 'Dashboard', href: '/admin', icon: '📊' },
        { label: 'Events', href: '/admin/events', icon: '🎭' },
        { label: 'Venues', href: '/admin/venues', icon: '🏛️' },
        { label: 'Orders', href: '/admin/orders', icon: '🎫' },
        { label: 'Customers', href: '/admin/customers', icon: '👥' },
        { label: 'Promoters', href: '/admin/promoters', icon: '🤝' },
      ]
    },
    {
      label: 'Sales & Revenue',
      icon: '💰',
      items: [
        { label: 'Subscriptions', href: '/admin/subscriptions', icon: '🔄' },
        { label: 'Loyalty Program', href: '/admin/loyalty', icon: '⭐' },
        { label: 'Promotions', href: '/admin/promotions', icon: '🎟️' },
        { label: 'Dynamic Pricing', href: '/admin/pricing', icon: '📈' },
      ]
    },
    {
      label: 'Marketing',
      icon: '📣',
      items: [
        { label: 'Campaigns', href: '/admin/marketing/campaigns', icon: '📧' },
        { label: 'Social Commerce', href: '/admin/marketing/social', icon: '📱' },
        { label: 'A/B Testing', href: '/admin/experiments', icon: '🧪' },
        { label: 'Influencers', href: '/admin/marketing/influencers', icon: '🌟' },
      ]
    },
    {
      label: 'Operations',
      icon: '⚙️',
      items: [
        { label: 'Check-In', href: '/admin/operations/check-in', icon: '✅' },
        { label: 'Queue Management', href: '/admin/operations/queue', icon: '🚶' },
        { label: 'Ticket Transfers', href: '/admin/operations/transfers', icon: '🔀' },
        { label: 'Automation', href: '/admin/operations/automation', icon: '🤖' },
      ]
    },
    {
      label: 'Support',
      icon: '🎧',
      items: [
        { label: 'Help Desk', href: '/admin/support', icon: '🎫', badge: 'New' },
        { label: 'Knowledge Base', href: '/admin/support/knowledge', icon: '📚' },
        { label: 'Live Chat', href: '/admin/support/chat', icon: '💬' },
      ]
    },
    {
      label: 'Analytics & BI',
      icon: '📈',
      items: [
        { label: 'Analytics', href: '/admin/analytics', icon: '📊' },
        { label: 'BI Dashboard', href: '/admin/bi', icon: '📉' },
        { label: 'Reports', href: '/admin/reports', icon: '📋' },
        { label: 'Fraud Detection', href: '/admin/fraud', icon: '🛡️' },
      ]
    },
    {
      label: 'Settings',
      icon: '⚙️',
      items: [
        { label: 'Integrations', href: '/admin/integrations', icon: '🔗' },
        { label: 'Webhooks', href: '/admin/webhooks', icon: '🪝' },
        { label: 'Email Queue', href: '/admin/email-queue', icon: '📬' },
        { label: 'API & Security', href: '/admin/security', icon: '🔐' },
        { label: 'Compliance', href: '/admin/compliance', icon: '📜' },
        { label: 'White Label', href: '/admin/white-label', icon: '🏷️' },
      ]
    },
  ]

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
      } else {
        router.push('/login')
      }
    })

    return () => unsubscribe()
  }, [router])

  // Auto-expand group based on current path
  useEffect(() => {
    for (const group of navGroups) {
      if (group.items.some(item => pathname.startsWith(item.href) && item.href !== '/admin')) {
        if (!expandedGroups.includes(group.label.toLowerCase())) {
          setExpandedGroups(prev => [...prev, group.label.toLowerCase()])
        }
        break
      }
    }
  }, [pathname])

  const handleSignOut = async () => {
    await auth.signOut()
    router.push('/login')
  }

  const toggleGroup = (groupLabel: string) => {
    const key = groupLabel.toLowerCase()
    setExpandedGroups(prev =>
      prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key]
    )
  }

  const isActiveRoute = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10 h-14">
        <div className="flex items-center justify-between h-full px-4">
          {/* Logo and Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            >
              {sidebarCollapsed ? '☰' : '✕'}
            </button>
            <img
              src="https://firebasestorage.googleapis.com/v0/b/venueviz.firebasestorage.app/o/BOLogo.png?alt=media"
              alt="BoxOfficeTech"
              className="h-8 w-auto rounded-lg"
            />
            <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent hidden sm:block">
              BoxOfficeTech
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all relative">
              🔔
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
              ❓
            </button>
            <div className="hidden md:flex items-center gap-2 ml-2 pl-2 border-l border-white/10">
              <span className="text-sm text-gray-400">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 text-sm bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-all"
              >
                Sign Out
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed top-14 left-0 bottom-0 z-40 bg-black/40 backdrop-blur-xl border-r border-white/10 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      } hidden md:block overflow-y-auto`}>
        <nav className="p-2 space-y-1">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-2">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.label)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  sidebarCollapsed ? 'justify-center' : 'justify-between'
                } text-gray-400 hover:text-white hover:bg-white/5`}
              >
                <div className="flex items-center gap-2">
                  <span>{group.icon}</span>
                  {!sidebarCollapsed && <span>{group.label}</span>}
                </div>
                {!sidebarCollapsed && (
                  <span className={`transform transition-transform ${
                    expandedGroups.includes(group.label.toLowerCase()) ? 'rotate-180' : ''
                  }`}>
                    ▼
                  </span>
                )}
              </button>

              {/* Group Items */}
              {(expandedGroups.includes(group.label.toLowerCase()) || sidebarCollapsed) && (
                <div className={`mt-1 space-y-1 ${sidebarCollapsed ? '' : 'ml-2'}`}>
                  {group.items.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => router.push(item.href)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                        sidebarCollapsed ? 'justify-center' : ''
                      } ${
                        isActiveRoute(item.href)
                          ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                          : 'text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span>{item.icon}</span>
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-0 left-0 bottom-0 w-72 bg-gray-900 border-r border-white/10 overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-lg font-bold text-white">Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <nav className="p-2 space-y-1">
              {navGroups.map((group) => (
                <div key={group.label} className="mb-2">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <span>{group.icon}</span>
                      <span>{group.label}</span>
                    </div>
                    <span className={`transform transition-transform ${
                      expandedGroups.includes(group.label.toLowerCase()) ? 'rotate-180' : ''
                    }`}>
                      ▼
                    </span>
                  </button>

                  {expandedGroups.includes(group.label.toLowerCase()) && (
                    <div className="mt-1 ml-2 space-y-1">
                      {group.items.map((item) => (
                        <button
                          key={item.href}
                          onClick={() => {
                            router.push(item.href)
                            setMobileMenuOpen(false)
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                            isActiveRoute(item.href)
                              ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                              : 'text-gray-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <span>{item.icon}</span>
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
            <div className="p-4 border-t border-white/10">
              <p className="text-sm text-gray-400 mb-2">{user?.email}</p>
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 text-sm bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`pt-14 transition-all duration-300 ${
        sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
      }`}>
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

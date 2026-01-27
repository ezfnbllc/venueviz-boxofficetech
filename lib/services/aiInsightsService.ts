/**
 * AI Insights Service
 *
 * Generates AI-powered insights for the dashboard based on user scope.
 * Uses pattern analysis to provide actionable recommendations.
 */

export interface AIInsight {
  id: string
  type: 'trend' | 'alert' | 'recommendation' | 'opportunity'
  title: string
  description: string
  metric?: string
  change?: number
  priority: 'low' | 'medium' | 'high'
  actionLabel?: string
  actionHref?: string
  icon: string
}

export interface DashboardMetrics {
  totalEvents: number
  totalOrders: number
  totalRevenue: number
  totalCustomers: number
  recentOrders: any[]
  recentEvents: any[]
}

/**
 * Generate AI-powered insights based on dashboard metrics
 */
export function generateInsights(metrics: DashboardMetrics): AIInsight[] {
  const insights: AIInsight[] = []

  // Revenue analysis
  if (metrics.totalRevenue > 0) {
    const avgOrderValue = metrics.totalOrders > 0 ? metrics.totalRevenue / metrics.totalOrders : 0

    if (avgOrderValue > 100) {
      insights.push({
        id: 'high-aov',
        type: 'trend',
        title: 'Strong Average Order Value',
        description: `Your average order value of $${avgOrderValue.toFixed(2)} is performing well. Consider bundling products to increase it further.`,
        metric: `$${avgOrderValue.toFixed(2)}`,
        priority: 'low',
        icon: '📈',
      })
    } else if (avgOrderValue > 0 && avgOrderValue < 50) {
      insights.push({
        id: 'low-aov',
        type: 'recommendation',
        title: 'Increase Average Order Value',
        description: `Your average order is $${avgOrderValue.toFixed(2)}. Consider offering ticket bundles, VIP upgrades, or merchandise add-ons.`,
        metric: `$${avgOrderValue.toFixed(2)}`,
        priority: 'medium',
        actionLabel: 'View Promotions',
        actionHref: '/admin/promotions',
        icon: '💡',
      })
    }
  }

  // Customer analysis
  if (metrics.totalCustomers > 0 && metrics.totalOrders > 0) {
    const ordersPerCustomer = metrics.totalOrders / metrics.totalCustomers

    if (ordersPerCustomer > 2) {
      insights.push({
        id: 'repeat-customers',
        type: 'trend',
        title: 'Strong Customer Retention',
        description: `Your customers average ${ordersPerCustomer.toFixed(1)} orders each. Great loyalty metrics!`,
        metric: `${ordersPerCustomer.toFixed(1)}x`,
        priority: 'low',
        icon: '🎯',
      })
    } else if (ordersPerCustomer < 1.5) {
      insights.push({
        id: 'low-retention',
        type: 'recommendation',
        title: 'Boost Customer Retention',
        description: 'Most customers buy once. Consider a loyalty program or email marketing to encourage repeat purchases.',
        priority: 'medium',
        actionLabel: 'Setup Loyalty',
        actionHref: '/admin/loyalty',
        icon: '⭐',
      })
    }
  }

  // Events analysis
  if (metrics.totalEvents === 0) {
    insights.push({
      id: 'no-events',
      type: 'alert',
      title: 'No Events Created Yet',
      description: 'Create your first event to start selling tickets and grow your audience.',
      priority: 'high',
      actionLabel: 'Create Event',
      actionHref: '/admin/events/new',
      icon: '🎭',
    })
  } else if (metrics.recentEvents.length > 0) {
    // Check for upcoming events without orders
    const eventsWithNoOrders = metrics.recentEvents.filter(event => {
      // Check if event has any orders
      return true // Simplified - in real implementation, check order count
    })

    if (metrics.totalOrders === 0 && metrics.totalEvents > 0) {
      insights.push({
        id: 'no-sales',
        type: 'alert',
        title: 'Events Need Promotion',
        description: 'Your events have no ticket sales yet. Consider running a marketing campaign or social media promotion.',
        priority: 'high',
        actionLabel: 'Create Campaign',
        actionHref: '/admin/marketing/campaigns',
        icon: '📣',
      })
    }
  }

  // Order activity insights
  if (metrics.recentOrders.length > 0) {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const recentOrdersCount = metrics.recentOrders.filter(order => {
      const orderDate = order.purchaseDate?.toDate?.() || order.createdAt?.toDate?.()
      return orderDate && orderDate > oneDayAgo
    }).length

    if (recentOrdersCount >= 5) {
      insights.push({
        id: 'hot-sales',
        type: 'trend',
        title: 'Sales Are Hot!',
        description: `${recentOrdersCount} orders in the last 24 hours. Your events are gaining momentum!`,
        metric: `${recentOrdersCount} orders`,
        priority: 'low',
        icon: '🔥',
      })
    }
  }

  // Growth opportunity
  if (metrics.totalEvents >= 3 && metrics.totalOrders >= 10) {
    insights.push({
      id: 'analytics-opportunity',
      type: 'opportunity',
      title: 'Unlock Advanced Analytics',
      description: 'You have enough data for deeper insights. Check your analytics dashboard for performance trends.',
      priority: 'low',
      actionLabel: 'View Analytics',
      actionHref: '/admin/analytics',
      icon: '📊',
    })
  }

  // If no specific insights, provide a general tip
  if (insights.length === 0) {
    insights.push({
      id: 'general-tip',
      type: 'recommendation',
      title: 'Getting Started',
      description: 'Welcome to your dashboard! Create events, manage orders, and track your performance all in one place.',
      priority: 'low',
      icon: '👋',
    })
  }

  // Sort by priority (high first)
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  return insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}

/**
 * Generate promoter-specific insights for master admins
 * Note: In this system, promoters = tenants
 */
export function generateTenantInsights(promoters: any[]): AIInsight[] {
  const insights: AIInsight[] = []

  if (promoters.length === 0) {
    insights.push({
      id: 'no-promoters',
      type: 'alert',
      title: 'No Promoters Yet',
      description: 'Onboard your first promoter to start growing your platform.',
      priority: 'high',
      actionLabel: 'Add Promoter',
      actionHref: '/admin/promoters',
      icon: '🏢',
    })
    return insights
  }

  // Promoter health analysis
  const activePromoters = promoters.filter(t => t.active === true).length
  const inactivePromoters = promoters.filter(t => t.active === false).length
  const advancedPromoters = promoters.filter(t => t.brandingType === 'advanced').length
  const basicPromoters = promoters.filter(t => t.brandingType === 'basic').length

  if (inactivePromoters > 0) {
    insights.push({
      id: 'inactive-promoters',
      type: 'alert',
      title: `${inactivePromoters} Inactive Promoter${inactivePromoters > 1 ? 's' : ''}`,
      description: 'Some promoters are inactive. Review their status and re-engage them.',
      priority: 'medium',
      actionLabel: 'View Promoters',
      actionHref: '/admin/promoters',
      icon: '⚠️',
    })
  }

  if (basicPromoters > advancedPromoters && basicPromoters >= 2) {
    insights.push({
      id: 'upgrade-opportunity',
      type: 'opportunity',
      title: 'Upgrade Opportunity',
      description: `${basicPromoters} promoters are on basic branding. Consider upgrading them to advanced for better customization.`,
      priority: 'low',
      actionLabel: 'View Promoters',
      actionHref: '/admin/promoters',
      icon: '💡',
    })
  }

  if (activePromoters >= 3) {
    insights.push({
      id: 'growth',
      type: 'trend',
      title: 'Platform Growing Strong',
      description: `You have ${activePromoters} active promoters! Keep up the great work.`,
      metric: `${activePromoters} active`,
      priority: 'low',
      icon: '🚀',
    })
  }

  return insights
}

/**
 * Quick action suggestions based on context
 */
export interface QuickAction {
  id: string
  label: string
  description: string
  href: string
  icon: string
  color: 'blue' | 'green' | 'purple' | 'orange'
}

export function getQuickActions(scope: 'master' | 'tenant' | 'promoter'): QuickAction[] {
  const baseActions: QuickAction[] = [
    {
      id: 'create-event',
      label: 'Create Event',
      description: 'Add a new event',
      href: '/admin/events/new',
      icon: '🎭',
      color: 'blue',
    },
    {
      id: 'view-orders',
      label: 'View Orders',
      description: 'Check recent orders',
      href: '/admin/orders',
      icon: '🎫',
      color: 'green',
    },
  ]

  if (scope === 'master') {
    return [
      ...baseActions,
      {
        id: 'manage-tenants',
        label: 'Manage Tenants',
        description: 'White-label management',
        href: '/admin/white-label',
        icon: '🏢',
        color: 'purple',
      },
      {
        id: 'view-analytics',
        label: 'Platform Analytics',
        description: 'Cross-tenant metrics',
        href: '/admin/bi',
        icon: '📊',
        color: 'orange',
      },
    ]
  }

  if (scope === 'tenant') {
    return [
      ...baseActions,
      {
        id: 'customize-brand',
        label: 'Customize Brand',
        description: 'Update your branding',
        href: '/admin/white-label/themes',
        icon: '🎨',
        color: 'purple',
      },
      {
        id: 'view-reports',
        label: 'View Reports',
        description: 'Performance metrics',
        href: '/admin/reports',
        icon: '📊',
        color: 'orange',
      },
    ]
  }

  // Promoter actions
  return [
    ...baseActions,
    {
      id: 'run-campaign',
      label: 'Run Campaign',
      description: 'Marketing tools',
      href: '/admin/marketing/campaigns',
      icon: '📣',
      color: 'purple',
    },
    {
      id: 'check-analytics',
      label: 'Analytics',
      description: 'Event performance',
      href: '/admin/analytics',
      icon: '📊',
      color: 'orange',
    },
  ]
}

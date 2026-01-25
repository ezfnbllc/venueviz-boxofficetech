'use client'

import { AIInsight, QuickAction } from '@/lib/services/aiInsightsService'
import Link from 'next/link'

interface AIInsightsWidgetProps {
  insights: AIInsight[]
  loading?: boolean
}

export function AIInsightsWidget({ insights, loading }: AIInsightsWidgetProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🤖</span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Insights</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-100 dark:bg-slate-600 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (insights.length === 0) {
    return null
  }

  const getPriorityColor = (priority: AIInsight['priority']) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50 dark:bg-red-900/20'
      case 'medium': return 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/20'
      case 'low': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
    }
  }

  const getTypeIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'trend': return '📈'
      case 'alert': return '⚠️'
      case 'recommendation': return '💡'
      case 'opportunity': return '🎯'
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🤖</span>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Insights</h2>
        <span className="px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full">
          GPT
        </span>
      </div>

      <div className="space-y-3">
        {insights.slice(0, 4).map(insight => (
          <div
            key={insight.id}
            className={`border-l-4 rounded-lg p-4 ${getPriorityColor(insight.priority)}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{insight.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                    {insight.title}
                  </h3>
                  {insight.metric && (
                    <span className="text-xs font-medium px-2 py-0.5 bg-slate-200 dark:bg-slate-600 rounded text-slate-700 dark:text-slate-300">
                      {insight.metric}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {insight.description}
                </p>
                {insight.actionLabel && insight.actionHref && (
                  <Link
                    href={insight.actionHref}
                    className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    {insight.actionLabel}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface QuickActionsWidgetProps {
  actions: QuickAction[]
}

export function QuickActionsWidget({ actions }: QuickActionsWidgetProps) {
  const getColorClasses = (color: QuickAction['color']) => {
    switch (color) {
      case 'blue': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
      case 'green': return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
      case 'purple': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50'
      case 'orange': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50'
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map(action => (
          <Link
            key={action.id}
            href={action.href}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${getColorClasses(action.color)}`}
          >
            <span className="text-2xl">{action.icon}</span>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{action.label}</p>
              <p className="text-xs opacity-75 truncate">{action.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

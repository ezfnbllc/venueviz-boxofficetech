'use client'

import Link from 'next/link'
import { useState } from 'react'

interface QuickAction {
  id: string
  label: string
  href: string
  icon: React.ReactNode
  color: string
}

interface QuickActionsBarProps {
  scope: 'master' | 'tenant' | 'promoter'
}

export function QuickActionsBar({ scope }: QuickActionsBarProps) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null)

  const actions: QuickAction[] = [
    {
      id: 'create-event',
      label: 'Create Event',
      href: '/admin/events/new',
      icon: <PlusIcon />,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      id: 'view-orders',
      label: 'Orders',
      href: '/admin/orders',
      icon: <TicketIcon />,
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      id: 'customers',
      label: 'Customers',
      href: '/admin/customers',
      icon: <UsersIcon />,
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      href: '/admin/analytics',
      icon: <ChartIcon />,
      color: 'bg-orange-500 hover:bg-orange-600',
    },
    ...(scope === 'master'
      ? [
          {
            id: 'promoters',
            label: 'Promoters',
            href: '/admin/promoters',
            icon: <BuildingIcon />,
            color: 'bg-indigo-500 hover:bg-indigo-600',
          },
          {
            id: 'white-label',
            label: 'White Label',
            href: '/admin/white-label',
            icon: <PaletteIcon />,
            color: 'bg-pink-500 hover:bg-pink-600',
          },
        ]
      : []),
    {
      id: 'reports',
      label: 'Reports',
      href: '/admin/reports',
      icon: <DocumentIcon />,
      color: 'bg-slate-500 hover:bg-slate-600',
    },
  ]

  return (
    <div className="flex items-center gap-2">
      {actions.map((action) => (
        <div key={action.id} className="relative">
          <Link
            href={action.href}
            onMouseEnter={() => setHoveredAction(action.id)}
            onMouseLeave={() => setHoveredAction(null)}
            className={`flex items-center justify-center w-10 h-10 rounded-lg text-white transition-all duration-200 ${action.color} shadow-sm hover:shadow-md hover:scale-105`}
          >
            {action.icon}
          </Link>
          {hoveredAction === action.id && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap z-50 shadow-lg">
              {action.label}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Icon components
function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function TicketIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function BuildingIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

function PaletteIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

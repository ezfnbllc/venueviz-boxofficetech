'use client'

import { useState, useEffect } from 'react'

interface Subscription {
  id: string
  customer: { name: string; email: string }
  plan: string
  status: 'active' | 'paused' | 'cancelled' | 'past_due'
  amount: number
  billingCycle: 'monthly' | 'yearly'
  nextBilling: string
  createdAt: string
}

interface Plan {
  id: string
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  features: string[]
  subscriberCount: number
  popular?: boolean
}

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'subscribers' | 'plans' | 'billing'>('overview')
  const [loading, setLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<string>('all')

  const stats = {
    totalMRR: 45680,
    totalARR: 548160,
    activeSubscribers: 892,
    churnRate: 2.3,
    avgRevenuePerUser: 51.2,
    trialConversion: 68,
    growthRate: 12.5,
    ltv: 614,
  }

  useEffect(() => {
    setTimeout(() => {
      setSubscriptions([
        { id: 'SUB-001', customer: { name: 'Acme Events', email: 'billing@acme.com' }, plan: 'Enterprise', status: 'active', amount: 499, billingCycle: 'monthly', nextBilling: '2024-02-01', createdAt: '2023-06-15' },
        { id: 'SUB-002', customer: { name: 'City Concerts', email: 'admin@cityconcerts.com' }, plan: 'Professional', status: 'active', amount: 199, billingCycle: 'monthly', nextBilling: '2024-01-15', createdAt: '2023-08-20' },
        { id: 'SUB-003', customer: { name: 'Festival Pro', email: 'hello@festivalpro.io' }, plan: 'Enterprise', status: 'active', amount: 4990, billingCycle: 'yearly', nextBilling: '2024-06-01', createdAt: '2023-06-01' },
        { id: 'SUB-004', customer: { name: 'Local Venues LLC', email: 'owner@localvenues.com' }, plan: 'Starter', status: 'past_due', amount: 49, billingCycle: 'monthly', nextBilling: '2024-01-05', createdAt: '2023-10-10' },
        { id: 'SUB-005', customer: { name: 'EventMasters', email: 'team@eventmasters.com' }, plan: 'Professional', status: 'paused', amount: 1990, billingCycle: 'yearly', nextBilling: '2024-03-15', createdAt: '2023-03-15' },
      ])
      setPlans([
        { id: 'plan-1', name: 'Starter', description: 'Perfect for small venues', monthlyPrice: 49, yearlyPrice: 490, features: ['Up to 5 events/month', 'Basic analytics', 'Email support', '2.5% transaction fee'], subscriberCount: 245 },
        { id: 'plan-2', name: 'Professional', description: 'For growing businesses', monthlyPrice: 199, yearlyPrice: 1990, features: ['Unlimited events', 'Advanced analytics', 'Priority support', '1.5% transaction fee', 'Custom branding'], subscriberCount: 456, popular: true },
        { id: 'plan-3', name: 'Enterprise', description: 'Full-featured solution', monthlyPrice: 499, yearlyPrice: 4990, features: ['Everything in Pro', 'Dedicated account manager', 'API access', '1% transaction fee', 'White-label option', 'Custom integrations'], subscriberCount: 191 },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'paused': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'past_due': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sub.customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sub.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPlan = selectedPlan === 'all' || sub.plan === selectedPlan
    return matchesSearch && matchesPlan
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
          <p className="text-gray-400 mt-1">Manage subscription plans and billing</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + New Plan
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-xl rounded-xl p-6 border border-green-500/20">
          <p className="text-green-400 text-sm font-medium">Monthly Recurring Revenue</p>
          <p className="text-3xl font-bold text-white mt-2">${stats.totalMRR.toLocaleString()}</p>
          <p className="text-green-400 text-sm mt-1">+{stats.growthRate}% growth</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-xl rounded-xl p-6 border border-blue-500/20">
          <p className="text-blue-400 text-sm font-medium">Annual Recurring Revenue</p>
          <p className="text-3xl font-bold text-white mt-2">${stats.totalARR.toLocaleString()}</p>
          <p className="text-blue-400 text-sm mt-1">{stats.activeSubscribers} subscribers</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-xl rounded-xl p-6 border border-purple-500/20">
          <p className="text-purple-400 text-sm font-medium">Avg Revenue Per User</p>
          <p className="text-3xl font-bold text-white mt-2">${stats.avgRevenuePerUser}</p>
          <p className="text-purple-400 text-sm mt-1">LTV: ${stats.ltv}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 backdrop-blur-xl rounded-xl p-6 border border-orange-500/20">
          <p className="text-orange-400 text-sm font-medium">Churn Rate</p>
          <p className="text-3xl font-bold text-white mt-2">{stats.churnRate}%</p>
          <p className="text-orange-400 text-sm mt-1">{stats.trialConversion}% trial conversion</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
        {(['overview', 'subscribers', 'plans', 'billing'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* MRR Trend */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">MRR Trend</h3>
            <div className="h-48 flex items-end gap-2">
              {[32500, 35200, 38100, 40500, 42800, 45680].map((mrr, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t"
                    style={{ height: `${(mrr / 50000) * 100}%` }}
                  />
                  <span className="text-gray-500 text-xs mt-2">M{i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plan Distribution */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Plan Distribution</h3>
            <div className="space-y-4">
              {plans.map(plan => (
                <div key={plan.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white">{plan.name}</span>
                    <span className="text-gray-400">{plan.subscriberCount} ({((plan.subscriberCount / stats.activeSubscribers) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        plan.name === 'Starter' ? 'bg-blue-500' :
                        plan.name === 'Professional' ? 'bg-purple-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(plan.subscriberCount / stats.activeSubscribers) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Subscription Activity</h3>
            <div className="space-y-3">
              {[
                { action: 'New subscription', customer: 'TechEvents Inc', plan: 'Professional', amount: 199, time: '2 hours ago', icon: '✨' },
                { action: 'Upgraded', customer: 'City Concerts', plan: 'Starter → Professional', amount: 150, time: '5 hours ago', icon: '⬆️' },
                { action: 'Renewed', customer: 'Festival Pro', plan: 'Enterprise (Yearly)', amount: 4990, time: '1 day ago', icon: '🔄' },
                { action: 'Cancelled', customer: 'Small Venue Co', plan: 'Starter', amount: -49, time: '2 days ago', icon: '❌' },
                { action: 'Payment failed', customer: 'Local Venues LLC', plan: 'Starter', amount: 49, time: '3 days ago', icon: '⚠️' },
              ].map((activity, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{activity.icon}</span>
                    <div>
                      <p className="text-white font-medium">{activity.action}</p>
                      <p className="text-gray-400 text-sm">{activity.customer} - {activity.plan}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${activity.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {activity.amount >= 0 ? '+' : ''}${Math.abs(activity.amount)}/mo
                    </p>
                    <p className="text-gray-500 text-sm">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subscribers Tab */}
      {activeTab === 'subscribers' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search subscribers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Plans</option>
              <option value="Starter">Starter</option>
              <option value="Professional">Professional</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>

          {/* Subscribers Table */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-gray-400 font-medium">Subscriber</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Plan</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Amount</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Next Billing</th>
                  <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4">
                      <div>
                        <p className="text-white font-medium">{sub.customer.name}</p>
                        <p className="text-gray-400 text-sm">{sub.customer.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-white">{sub.plan}</span>
                      <span className="text-gray-500 text-sm ml-2">({sub.billingCycle})</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(sub.status)}`}>
                        {sub.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-white">${sub.amount}/{sub.billingCycle === 'monthly' ? 'mo' : 'yr'}</td>
                    <td className="p-4 text-gray-400">{new Date(sub.nextBilling).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors mr-2">
                        View
                      </button>
                      <button className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className={`bg-white/5 backdrop-blur-xl rounded-xl p-6 border ${plan.popular ? 'border-purple-500' : 'border-white/10'} relative`}>
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-600 text-white text-xs rounded-full">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              <p className="text-gray-400 text-sm mt-1">{plan.description}</p>

              <div className="mt-4">
                <span className="text-3xl font-bold text-white">${plan.monthlyPrice}</span>
                <span className="text-gray-400">/month</span>
              </div>
              <p className="text-gray-500 text-sm">or ${plan.yearlyPrice}/year (save {Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100)}%)</p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-300">
                    <span className="text-green-400">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-400">Subscribers</span>
                  <span className="text-white font-semibold">{plan.subscriberCount}</span>
                </div>
                <button className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                  Edit Plan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Upcoming Invoices</h3>
            <div className="space-y-3">
              {subscriptions.filter(s => s.status === 'active').slice(0, 5).map(sub => (
                <div key={sub.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{sub.customer.name}</p>
                    <p className="text-gray-400 text-sm">{sub.plan} - {sub.billingCycle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">${sub.amount}</p>
                    <p className="text-gray-500 text-sm">{new Date(sub.nextBilling).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Failed Payments</h3>
            <div className="space-y-3">
              {subscriptions.filter(s => s.status === 'past_due').map(sub => (
                <div key={sub.id} className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{sub.customer.name}</p>
                    <p className="text-gray-400 text-sm">Failed on {new Date(sub.nextBilling).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 font-medium">${sub.amount}</span>
                    <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors">
                      Retry
                    </button>
                  </div>
                </div>
              ))}
              {subscriptions.filter(s => s.status === 'past_due').length === 0 && (
                <p className="text-gray-400 text-center py-4">No failed payments</p>
              )}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 lg:col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4">Revenue Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white/5 rounded-lg">
                <p className="text-gray-400 text-sm">Monthly Plans</p>
                <p className="text-2xl font-bold text-white mt-1">$28,450</p>
                <p className="text-green-400 text-sm">62% of MRR</p>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <p className="text-gray-400 text-sm">Yearly Plans</p>
                <p className="text-2xl font-bold text-white mt-1">$17,230</p>
                <p className="text-blue-400 text-sm">38% of MRR</p>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <p className="text-gray-400 text-sm">New This Month</p>
                <p className="text-2xl font-bold text-white mt-1">$4,850</p>
                <p className="text-purple-400 text-sm">24 new subs</p>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <p className="text-gray-400 text-sm">Churned</p>
                <p className="text-2xl font-bold text-white mt-1">$1,050</p>
                <p className="text-red-400 text-sm">8 cancellations</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

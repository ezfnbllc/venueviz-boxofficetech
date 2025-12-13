'use client'

import { useState, useEffect } from 'react'

interface Article {
  id: string
  title: string
  category: string
  status: 'published' | 'draft' | 'archived'
  views: number
  helpful: number
  notHelpful: number
  lastUpdated: string
}

export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<'articles' | 'categories' | 'analytics'>('articles')
  const [loading, setLoading] = useState(true)
  const [articles, setArticles] = useState<Article[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = ['Getting Started', 'Orders & Payments', 'Events', 'Account', 'Technical', 'Policies']

  const stats = {
    totalArticles: 156,
    publishedArticles: 142,
    totalViews: 45800,
    avgHelpfulness: 87,
    searchQueries: 12500,
    deflectionRate: 65,
  }

  useEffect(() => {
    setTimeout(() => {
      setArticles([
        { id: '1', title: 'How to Purchase Tickets', category: 'Getting Started', status: 'published', views: 8520, helpful: 425, notHelpful: 28, lastUpdated: '2024-01-05' },
        { id: '2', title: 'Refund Policy', category: 'Policies', status: 'published', views: 6840, helpful: 312, notHelpful: 45, lastUpdated: '2024-01-03' },
        { id: '3', title: 'Transfer Tickets to Another Person', category: 'Orders & Payments', status: 'published', views: 5620, helpful: 289, notHelpful: 22, lastUpdated: '2024-01-07' },
        { id: '4', title: 'Reset Your Password', category: 'Account', status: 'published', views: 4250, helpful: 198, notHelpful: 15, lastUpdated: '2023-12-28' },
        { id: '5', title: 'Mobile App Download', category: 'Technical', status: 'published', views: 3890, helpful: 256, notHelpful: 12, lastUpdated: '2024-01-02' },
        { id: '6', title: 'VIP Benefits Guide', category: 'Events', status: 'draft', views: 0, helpful: 0, notHelpful: 0, lastUpdated: '2024-01-08' },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500/20 text-green-400'
      case 'draft': return 'bg-yellow-500/20 text-yellow-400'
      case 'archived': return 'bg-gray-500/20 text-gray-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory
    return matchesSearch && matchesCategory
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
          <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
          <p className="text-gray-400 mt-1">Manage help articles and documentation</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + New Article
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            Import
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Total Articles</p>
          <p className="text-2xl font-bold text-white">{stats.totalArticles}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Published</p>
          <p className="text-2xl font-bold text-green-400">{stats.publishedArticles}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Total Views</p>
          <p className="text-2xl font-bold text-white">{(stats.totalViews / 1000).toFixed(1)}K</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Helpfulness</p>
          <p className="text-2xl font-bold text-green-400">{stats.avgHelpfulness}%</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Searches</p>
          <p className="text-2xl font-bold text-white">{(stats.searchQueries / 1000).toFixed(1)}K</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Deflection Rate</p>
          <p className="text-2xl font-bold text-purple-400">{stats.deflectionRate}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
        {(['articles', 'categories', 'analytics'] as const).map((tab) => (
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

      {/* Articles Tab */}
      {activeTab === 'articles' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Articles Table */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-gray-400 font-medium">Article</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Category</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Views</th>
                  <th className="text-left p-4 text-gray-400 font-medium">Helpfulness</th>
                  <th className="text-right p-4 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredArticles.map((article) => (
                  <tr key={article.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4">
                      <p className="text-white font-medium">{article.title}</p>
                      <p className="text-gray-400 text-sm">Updated {article.lastUpdated}</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-white/10 text-gray-400 rounded text-sm">{article.category}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(article.status)}`}>
                        {article.status}
                      </span>
                    </td>
                    <td className="p-4 text-white">{article.views.toLocaleString()}</td>
                    <td className="p-4">
                      {article.helpful + article.notHelpful > 0 ? (
                        <span className={`${
                          (article.helpful / (article.helpful + article.notHelpful)) >= 0.9 ? 'text-green-400' :
                          (article.helpful / (article.helpful + article.notHelpful)) >= 0.7 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {Math.round((article.helpful / (article.helpful + article.notHelpful)) * 100)}%
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors mr-2">
                        Edit
                      </button>
                      <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                        Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">{category}</h3>
                <span className="text-purple-400">{Math.floor(Math.random() * 30) + 10} articles</span>
              </div>
              <p className="text-gray-400 text-sm mb-4">Help articles related to {category.toLowerCase()}</p>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                  Manage
                </button>
                <button className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                  Edit
                </button>
              </div>
            </div>
          ))}
          <button className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border-2 border-dashed border-white/20 hover:border-purple-500 transition-colors flex flex-col items-center justify-center">
            <span className="text-4xl mb-2">+</span>
            <span className="text-gray-400">Add Category</span>
          </button>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Top Viewed Articles</h3>
            <div className="space-y-3">
              {articles.filter(a => a.status === 'published').sort((a, b) => b.views - a.views).slice(0, 5).map((article, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{article.title}</p>
                    <p className="text-gray-400 text-sm">{article.category}</p>
                  </div>
                  <span className="text-purple-400 font-medium">{article.views.toLocaleString()} views</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Popular Searches</h3>
            <div className="space-y-3">
              {[
                { query: 'refund', count: 2450 },
                { query: 'transfer tickets', count: 1820 },
                { query: 'reset password', count: 1540 },
                { query: 'cancel order', count: 1280 },
                { query: 'vip upgrade', count: 980 },
              ].map((search, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-white">"{search.query}"</span>
                  <span className="text-gray-400">{search.count.toLocaleString()} searches</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

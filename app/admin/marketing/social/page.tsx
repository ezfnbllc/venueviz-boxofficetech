'use client'

import { useState, useEffect } from 'react'

interface SocialPost {
  id: string
  platform: 'facebook' | 'instagram' | 'twitter' | 'tiktok'
  content: string
  status: 'draft' | 'scheduled' | 'published'
  scheduledFor?: string
  publishedAt?: string
  engagement: { likes: number; comments: number; shares: number; reach: number }
}

interface Influencer {
  id: string
  name: string
  handle: string
  platform: string
  followers: number
  engagement: number
  campaigns: number
  revenue: number
  status: 'active' | 'pending' | 'inactive'
}

export default function SocialCommercePage() {
  const [activeTab, setActiveTab] = useState<'posts' | 'analytics' | 'ugc' | 'reviews'>('posts')
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<SocialPost[]>([])

  const stats = {
    totalFollowers: 125000,
    totalEngagement: 4.2,
    postsThisMonth: 45,
    ugcSubmissions: 128,
    avgReach: 15000,
    socialRevenue: 28500,
  }

  useEffect(() => {
    setTimeout(() => {
      setPosts([
        { id: '1', platform: 'instagram', content: 'Get ready for the biggest summer festival! Early bird tickets available now 🎉', status: 'published', publishedAt: '2024-01-08T10:00:00', engagement: { likes: 2450, comments: 189, shares: 156, reach: 45000 } },
        { id: '2', platform: 'facebook', content: 'Jazz Night is back! Join us for an unforgettable evening of live music.', status: 'published', publishedAt: '2024-01-07T15:30:00', engagement: { likes: 1820, comments: 95, shares: 234, reach: 32000 } },
        { id: '3', platform: 'twitter', content: 'Flash sale! 24 hours only - 30% off all weekend events. Use code FLASH30', status: 'scheduled', scheduledFor: '2024-01-10T12:00:00', engagement: { likes: 0, comments: 0, shares: 0, reach: 0 } },
        { id: '4', platform: 'tiktok', content: 'Behind the scenes at our latest concert setup! 🎸', status: 'published', publishedAt: '2024-01-06T18:00:00', engagement: { likes: 8500, comments: 423, shares: 1250, reach: 125000 } },
        { id: '5', platform: 'instagram', content: 'New venue announcement coming soon! Stay tuned 👀', status: 'draft', engagement: { likes: 0, comments: 0, shares: 0, reach: 0 } },
      ])
      setLoading(false)
    }, 500)
  }, [])

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return '📘'
      case 'instagram': return '📷'
      case 'twitter': return '🐦'
      case 'tiktok': return '🎵'
      default: return '📱'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500/20 text-green-400'
      case 'scheduled': return 'bg-blue-500/20 text-blue-400'
      case 'draft': return 'bg-gray-500/20 text-gray-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

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
          <h1 className="text-2xl font-bold text-white">Social Commerce</h1>
          <p className="text-gray-400 mt-1">Manage social media presence and user-generated content</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + Create Post
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            Schedule
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Total Followers</p>
          <p className="text-2xl font-bold text-white">{(stats.totalFollowers / 1000).toFixed(0)}K</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Engagement Rate</p>
          <p className="text-2xl font-bold text-green-400">{stats.totalEngagement}%</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Posts This Month</p>
          <p className="text-2xl font-bold text-white">{stats.postsThisMonth}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">UGC Submissions</p>
          <p className="text-2xl font-bold text-blue-400">{stats.ugcSubmissions}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Avg Reach</p>
          <p className="text-2xl font-bold text-white">{(stats.avgReach / 1000).toFixed(0)}K</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Social Revenue</p>
          <p className="text-2xl font-bold text-green-400">${(stats.socialRevenue / 1000).toFixed(1)}K</p>
        </div>
      </div>

      {/* Platform Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { platform: 'Instagram', icon: '📷', followers: 45000, growth: 12.5, color: 'pink' },
          { platform: 'Facebook', icon: '📘', followers: 38000, growth: 5.2, color: 'blue' },
          { platform: 'Twitter', icon: '🐦', followers: 22000, growth: 8.8, color: 'sky' },
          { platform: 'TikTok', icon: '🎵', followers: 20000, growth: 25.3, color: 'purple' },
        ].map((p, i) => (
          <div key={i} className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{p.icon}</span>
              <span className="text-green-400 text-sm">+{p.growth}%</span>
            </div>
            <p className="text-white font-semibold">{p.platform}</p>
            <p className="text-gray-400 text-sm">{(p.followers / 1000).toFixed(0)}K followers</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
        {(['posts', 'analytics', 'ugc', 'reviews'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab === 'ugc' ? 'UGC' : tab}
          </button>
        ))}
      </div>

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{getPlatformIcon(post.platform)}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white font-medium capitalize">{post.platform}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(post.status)}`}>
                        {post.status}
                      </span>
                    </div>
                    <p className="text-gray-300">{post.content}</p>
                    {post.scheduledFor && (
                      <p className="text-gray-500 text-sm mt-2">Scheduled for: {new Date(post.scheduledFor).toLocaleString()}</p>
                    )}
                    {post.publishedAt && (
                      <p className="text-gray-500 text-sm mt-2">Published: {new Date(post.publishedAt).toLocaleString()}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                    Edit
                  </button>
                  {post.status === 'draft' && (
                    <button className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                      Publish
                    </button>
                  )}
                </div>
              </div>

              {post.status === 'published' && (
                <div className="grid grid-cols-4 gap-4 pt-4 border-t border-white/10">
                  <div className="text-center">
                    <p className="text-gray-400 text-xs">Likes</p>
                    <p className="text-white font-semibold">{post.engagement.likes.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-xs">Comments</p>
                    <p className="text-white font-semibold">{post.engagement.comments.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-xs">Shares</p>
                    <p className="text-white font-semibold">{post.engagement.shares.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-xs">Reach</p>
                    <p className="text-white font-semibold">{(post.engagement.reach / 1000).toFixed(0)}K</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Engagement Over Time</h3>
            <div className="h-48 flex items-end gap-2">
              {[3.2, 3.8, 4.1, 3.9, 4.5, 4.2, 4.8].map((rate, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t"
                    style={{ height: `${(rate / 5) * 100}%` }}
                  />
                  <span className="text-gray-500 text-xs mt-2">Day {i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Top Performing Content</h3>
            <div className="space-y-3">
              {[
                { type: 'Video', engagement: 8.5, posts: 12 },
                { type: 'Carousel', engagement: 5.2, posts: 18 },
                { type: 'Stories', engagement: 4.8, posts: 45 },
                { type: 'Single Image', engagement: 3.1, posts: 28 },
              ].map((content, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-white">{content.type}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400 text-sm">{content.posts} posts</span>
                    <span className="text-green-400 font-medium">{content.engagement}% eng</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* UGC Tab */}
      {activeTab === 'ugc' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">User-Generated Content</h3>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors">
                Approve Selected
              </button>
              <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">
                Filters
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { user: '@eventfan123', content: 'Amazing concert last night!', platform: 'instagram', status: 'pending', likes: 245 },
              { user: '@musiclover', content: 'Best festival experience ever', platform: 'twitter', status: 'approved', likes: 189 },
              { user: '@partygoer', content: 'VIP treatment was incredible', platform: 'facebook', status: 'approved', likes: 156 },
              { user: '@concertjunkie', content: 'Can\'t wait for the next one!', platform: 'tiktok', status: 'pending', likes: 892 },
              { user: '@nightowl', content: 'The venue was perfect', platform: 'instagram', status: 'rejected', likes: 78 },
              { user: '@festivalfan', content: 'Making memories!', platform: 'instagram', status: 'approved', likes: 423 },
            ].map((ugc, i) => (
              <div key={i} className={`bg-white/5 backdrop-blur-xl rounded-xl p-4 border ${
                ugc.status === 'pending' ? 'border-yellow-500/30' : 'border-white/10'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getPlatformIcon(ugc.platform)}</span>
                    <span className="text-white font-medium">{ugc.user}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    ugc.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    ugc.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {ugc.status}
                  </span>
                </div>
                <p className="text-gray-300 mb-3">{ugc.content}</p>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">{ugc.likes} likes</span>
                  {ugc.status === 'pending' && (
                    <div className="flex gap-2">
                      <button className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors">
                        Approve
                      </button>
                      <button className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors">
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 text-center">
              <p className="text-4xl font-bold text-white">4.7</p>
              <p className="text-yellow-400">★★★★★</p>
              <p className="text-gray-400 text-sm">1,245 reviews</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map(stars => (
                  <div key={stars} className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm w-4">{stars}</span>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${stars === 5 ? 65 : stars === 4 ? 22 : stars === 3 ? 8 : stars === 2 ? 3 : 2}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 text-center">
              <p className="text-2xl font-bold text-green-400">92%</p>
              <p className="text-gray-400 text-sm">Would recommend</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 text-center">
              <p className="text-2xl font-bold text-white">24</p>
              <p className="text-gray-400 text-sm">Pending responses</p>
            </div>
          </div>

          {[
            { author: 'John D.', rating: 5, content: 'Absolutely fantastic experience! The venue was incredible and the staff were so helpful.', date: '2024-01-07', replied: true },
            { author: 'Sarah M.', rating: 4, content: 'Great event overall, though the queue for drinks was a bit long.', date: '2024-01-06', replied: false },
            { author: 'Mike T.', rating: 5, content: 'Best concert I\'ve been to in years. Will definitely be back!', date: '2024-01-05', replied: true },
            { author: 'Emily R.', rating: 3, content: 'Good show but parking was difficult to find.', date: '2024-01-04', replied: false },
          ].map((review, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{review.author}</span>
                    <span className="text-yellow-400">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                  </div>
                  <span className="text-gray-500 text-sm">{review.date}</span>
                </div>
                {review.replied ? (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">Replied</span>
                ) : (
                  <button className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                    Reply
                  </button>
                )}
              </div>
              <p className="text-gray-300">{review.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

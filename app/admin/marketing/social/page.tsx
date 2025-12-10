'use client'

import { useState, useEffect } from 'react'
import { usePromoterAccess } from '@/lib/hooks/usePromoterAccess'
import {
  SocialCommerceService,
  SocialShare,
  Review,
} from '@/lib/services/socialCommerceService'

interface UGCContent {
  id: string
  promoterId: string
  type: 'photo' | 'video' | 'story' | 'review'
  content: string
  mediaUrl?: string
  customerId: string
  customerName: string
  eventId?: string
  eventName?: string
  platform: string
  status: 'pending' | 'approved' | 'rejected' | 'featured'
  likes?: number
  createdAt: Date
}

export default function SocialCommercePage() {
  const {
    effectivePromoterId,
    showAll,
    loading: accessLoading,
  } = usePromoterAccess()

  const [activeTab, setActiveTab] = useState<'shares' | 'reviews' | 'ugc'>('shares')
  const [loading, setLoading] = useState(true)
  const [socialShares, setSocialShares] = useState<SocialShare[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [error, setError] = useState<string | null>(null)

  // Calculate stats from real data
  const stats = {
    totalShares: socialShares.length,
    totalClicks: socialShares.reduce((sum, s) => sum + s.clicks, 0),
    totalConversions: socialShares.reduce((sum, s) => sum + s.conversions, 0),
    avgRating: reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0,
    totalReviews: reviews.length,
    pendingReviews: reviews.filter(r => r.status === 'pending').length,
  }

  useEffect(() => {
    loadData()
  }, [effectivePromoterId, showAll])

  const loadData = async () => {
    if (accessLoading || !effectivePromoterId) return

    setLoading(true)
    setError(null)

    try {
      if (showAll) {
        // Admin viewing all - show empty with message
        setSocialShares([])
        setReviews([])
      } else {
        const [loadedShares, loadedReviews] = await Promise.all([
          SocialCommerceService.getSocialShares(effectivePromoterId),
          SocialCommerceService.getReviews(effectivePromoterId),
        ])
        setSocialShares(loadedShares)
        setReviews(loadedReviews)
      }
    } catch (err) {
      console.error('Error loading social data:', err)
      setError('Failed to load social commerce data')
    } finally {
      setLoading(false)
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook': return '📘'
      case 'instagram': return '📷'
      case 'twitter': return '🐦'
      case 'tiktok': return '🎵'
      case 'youtube': return '🎬'
      default: return '📱'
    }
  }

  const handleApproveReview = async (reviewId: string) => {
    try {
      await SocialCommerceService.approveReview(reviewId)
      loadData()
    } catch (err) {
      console.error('Error approving review:', err)
    }
  }

  const handleRejectReview = async (reviewId: string) => {
    try {
      await SocialCommerceService.rejectReview(reviewId)
      loadData()
    } catch (err) {
      console.error('Error rejecting review:', err)
    }
  }

  if (loading || accessLoading) {
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
          <p className="text-gray-400 mt-1">Manage social shares, reviews, and user-generated content</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + Create Share Link
          </button>
          <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
            Request Reviews
          </button>
        </div>
      </div>

      {/* Admin All-Promoters Notice */}
      {showAll && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-400">
            Select a specific promoter from the dropdown to view their social commerce data.
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Total Shares</p>
          <p className="text-2xl font-bold text-white">{stats.totalShares}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Total Clicks</p>
          <p className="text-2xl font-bold text-blue-400">{stats.totalClicks}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Conversions</p>
          <p className="text-2xl font-bold text-green-400">{stats.totalConversions}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Avg Rating</p>
          <p className="text-2xl font-bold text-yellow-400">
            {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—'}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Total Reviews</p>
          <p className="text-2xl font-bold text-white">{stats.totalReviews}</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">Pending Reviews</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.pendingReviews}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-lg w-fit">
        {(['shares', 'reviews', 'ugc'] as const).map((tab) => (
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

      {/* Shares Tab */}
      {activeTab === 'shares' && (
        <div className="space-y-4">
          {/* Empty State */}
          {socialShares.length === 0 && !showAll && (
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-white/10 text-center">
              <div className="text-6xl mb-4">📱</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Social Shares Yet</h3>
              <p className="text-gray-400 mb-6">
                Social shares from customers will appear here when they share your events.
              </p>
            </div>
          )}

          {socialShares.length > 0 && (
            <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-gray-400 font-medium">Share</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Event</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Platform</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Clicks</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Conversions</th>
                    <th className="text-left p-4 text-gray-400 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {socialShares.slice(0, 20).map((share) => (
                    <tr key={share.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getPlatformIcon(share.platform)}</span>
                          <div>
                            <p className="text-white font-medium">{share.customerName || 'Unknown'}</p>
                            <p className="text-gray-400 text-sm">{share.shareType.replace('_', ' ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-400">{share.eventName}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-white/10 text-gray-400 rounded text-sm capitalize">
                          {share.platform}
                        </span>
                      </td>
                      <td className="p-4 text-white font-medium">{share.clicks}</td>
                      <td className="p-4 text-green-400 font-medium">{share.conversions}</td>
                      <td className="p-4 text-gray-400 text-sm">
                        {share.createdAt ? new Date(share.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {/* Rating Summary */}
          {reviews.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 text-center">
                <p className="text-4xl font-bold text-white">{stats.avgRating.toFixed(1)}</p>
                <p className="text-yellow-400">{'★'.repeat(Math.round(stats.avgRating))}{'☆'.repeat(5 - Math.round(stats.avgRating))}</p>
                <p className="text-gray-400 text-sm">{reviews.length} reviews</p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map(stars => {
                    const count = reviews.filter(r => r.rating === stars).length
                    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                    return (
                      <div key={stars} className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm w-4">{stars}</span>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="text-gray-400 text-sm w-8">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 text-center">
                <p className="text-2xl font-bold text-green-400">
                  {reviews.length > 0
                    ? Math.round((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100)
                    : 0}%
                </p>
                <p className="text-gray-400 text-sm">Would recommend</p>
              </div>
              <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10 text-center">
                <p className="text-2xl font-bold text-white">{stats.pendingReviews}</p>
                <p className="text-gray-400 text-sm">Pending responses</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {reviews.length === 0 && !showAll && (
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-white/10 text-center">
              <div className="text-6xl mb-4">⭐</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Reviews Yet</h3>
              <p className="text-gray-400 mb-6">
                Customer reviews will appear here. Consider sending review requests after events.
              </p>
              <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                Request Reviews
              </button>
            </div>
          )}

          {/* Reviews List */}
          {reviews.map((review) => (
            <div key={review.id} className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{review.customerName}</span>
                    <span className="text-yellow-400">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                  </div>
                  <span className="text-gray-500 text-sm">
                    {review.eventName} - {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                {review.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveReview(review.id)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectReview(review.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    review.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    review.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    review.status === 'featured' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {review.status}
                  </span>
                )}
              </div>
              {review.title && <h4 className="text-white font-medium mb-2">{review.title}</h4>}
              <p className="text-gray-300">{review.content}</p>
              {review.response && (
                <div className="mt-4 p-3 bg-white/5 rounded-lg border-l-2 border-purple-500">
                  <p className="text-sm text-gray-400 mb-1">Your response:</p>
                  <p className="text-gray-300">{review.response}</p>
                </div>
              )}
              {!review.response && review.status === 'approved' && (
                <button className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
                  Reply
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* UGC Tab */}
      {activeTab === 'ugc' && (
        <div className="space-y-4">
          {/* Empty State */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-white/10 text-center">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold text-white mb-2">User-Generated Content</h3>
            <p className="text-gray-400 mb-6">
              Photos, videos, and content shared by customers will appear here.
              Enable UGC collection in campaign settings to start gathering content.
            </p>
            <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              Create UGC Campaign
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

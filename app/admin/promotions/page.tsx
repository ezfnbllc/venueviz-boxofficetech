'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import {auth} from '@/lib/firebase'
import {onAuthStateChanged} from 'firebase/auth'

export default function PromotionsManagement() {
  const router = useRouter()
  const [promotions, setPromotions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage',
    value: 10,
    minPurchase: 0,
    maxUses: 100,
    expiryDate: ''
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        console.log('Promotions page - User authenticated:', firebaseUser.email)
        loadPromotions()
      } else {
        router.push('/login')
      }
    })
    
    return () => unsubscribe()
  }, [router])

  const loadPromotions = async () => {
    try {
      console.log('Loading promotions...')
      const promoData = await AdminService.getPromotions()
      console.log('Promotions loaded:', promoData.length)
      setPromotions(promoData)
    } catch (error) {
      console.error('Error loading promotions:', error)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await AdminService.createPromotion(formData)
      setShowModal(false)
      loadPromotions()
      alert('Promotion created successfully!')
    } catch (error) {
      alert('Error creating promotion')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Promotions</h1>
            <p className="text-gray-400">Manage discount codes and special offers</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => router.push('/admin')} className="px-4 py-2 bg-gray-600 rounded-lg">
              Back to Dashboard
            </button>
            <button onClick={() => setShowModal(true)} className="px-6 py-2 bg-purple-600 rounded-lg">
              + New Promotion
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
          </div>
        ) : (
          <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            {promotions.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No promotions yet. Create your first promotion!</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {promotions.map(promo => (
                  <div key={promo.id} className="p-4 bg-white/5 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg">{promo.code}</h3>
                      <span className={`px-2 py-1 rounded text-xs ${
                        promo.status === 'active' 
                          ? 'bg-green-600/20 text-green-400' 
                          : 'bg-gray-600/20 text-gray-400'
                      }`}>
                        {promo.status || 'active'}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">
                      {promo.type === 'percentage' ? `${promo.value}% off` : `$${promo.value} off`}
                    </p>
                    <p className="text-gray-400 text-sm">
                      Used: {promo.usageCount || 0} / {promo.maxUses || 100}
                    </p>
                    {promo.expiryDate && (
                      <p className="text-gray-400 text-sm">
                        Expires: {new Date(promo.expiryDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Promotion Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4">Create Promotion</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder="Promo Code (e.g., SAVE20)"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                >
                  <option value="percentage">Percentage Discount</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
                <input
                  type="number"
                  placeholder="Discount Value"
                  required
                  value={formData.value}
                  onChange={(e) => setFormData({...formData, value: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
                <input
                  type="number"
                  placeholder="Max Uses"
                  required
                  value={formData.maxUses}
                  onChange={(e) => setFormData({...formData, maxUses: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
                <input
                  type="date"
                  placeholder="Expiry Date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 rounded-lg"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-gray-700 rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 py-2 bg-purple-600 rounded-lg">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

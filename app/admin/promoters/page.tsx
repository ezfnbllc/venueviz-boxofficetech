'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {AdminService} from '@/lib/admin/adminService'
import {auth} from '@/lib/firebase'
import {onAuthStateChanged} from 'firebase/auth'
import AdminLayout from '@/components/AdminLayout'

export default function PromotersManagement() {
  const router = useRouter()
  const [promoters, setPromoters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        loadPromoters()
      } else {
        router.push('/login')
      }
    })
    return () => unsubscribe()
  }, [router])

  const loadPromoters = async () => {
    try {
      const promotersData = await AdminService.getPromoters()
      setPromoters(promotersData)
    } catch (error) {
      console.error('Error loading promoters:', error)
    }
    setLoading(false)
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Promoters</h1>
          <p className="text-gray-400">Manage event promoters</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {promoters.map(promoter => (
              <div key={promoter.id} className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6">
                <h3 className="text-xl font-bold mb-2">{promoter.name}</h3>
                <p className="text-gray-400 text-sm mb-1">{promoter.email}</p>
                <p className="text-gray-400 text-sm">{promoter.phone}</p>
              </div>
            ))}
            
            {promoters.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">
                No promoters yet
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

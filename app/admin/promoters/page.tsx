'use client'
import {useState, useEffect} from 'react'
import {useRouter} from 'next/navigation'
import {db, auth} from '@/lib/firebase'
import {collection, getDocs, query, where, addDoc, Timestamp} from 'firebase/firestore'
import {onAuthStateChanged} from 'firebase/auth'

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
      // Get promoters
      const promotersSnap = await getDocs(collection(db, 'promoters'))
      const promotersData = await Promise.all(
        promotersSnap.docs.map(async (doc) => {
          const data = doc.data()
          
          // Get event count for this promoter
          const eventsQuery = query(collection(db, 'events'), where('promoterId', '==', doc.id))
          const eventsSnap = await getDocs(eventsQuery)
          
          // Get revenue for this promoter
          const ordersQuery = query(collection(db, 'orders'), where('promoterId', '==', doc.id))
          const ordersSnap = await getDocs(ordersQuery)
          
          let totalRevenue = 0
          ordersSnap.docs.forEach(orderDoc => {
            const orderData = orderDoc.data()
            const tickets = orderData.tickets || []
            tickets.forEach((ticket: any) => {
              totalRevenue += ticket.price || ticket.ticketPrice || 0
            })
          })
          
          return {
            id: doc.id,
            ...data,
            eventCount: eventsSnap.size,
            totalRevenue: totalRevenue
          }
        })
      )
      
      setPromoters(promotersData)
    } catch (error) {
      console.error('Error loading promoters:', error)
    }
    setLoading(false)
  }

  const handleCreate = async () => {
    try {
      await addDoc(collection(db, 'promoters'), {
        name: 'New Promoter',
        email: 'promoter@example.com',
        phone: '',
        createdAt: Timestamp.now()
      })
      loadPromoters()
    } catch (error) {
      console.error('Error creating promoter:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Promoters Management</h1>
            <p className="text-gray-400">Manage event promoters and their access</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => router.push('/admin')} className="px-4 py-2 bg-gray-600 rounded-lg">
              Back to Dashboard
            </button>
            <button onClick={handleCreate} className="px-6 py-2 bg-purple-600 rounded-lg">
              + New Promoter
            </button>
          </div>
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
                <p className="text-gray-400 text-sm mb-1">{promoter.phone}</p>
                <p className="text-gray-400 text-xs mb-4">ID: {promoter.id}</p>
                
                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <div className="bg-white/5 p-2 rounded">
                    <p className="text-gray-400">Events</p>
                    <p className="font-bold text-lg">{promoter.eventCount || 0}</p>
                  </div>
                  <div className="bg-white/5 p-2 rounded">
                    <p className="text-gray-400">Revenue</p>
                    <p className="font-bold text-lg">${promoter.totalRevenue || 0}</p>
                  </div>
                </div>
              </div>
            ))}
            
            {promoters.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">
                No promoters yet. Click "New Promoter" to add one.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

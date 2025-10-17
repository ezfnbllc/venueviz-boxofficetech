import { useState, useEffect } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export function usePromoterFiltering() {
  const [selectedPromoter, setSelectedPromoter] = useState<string>('all')
  const [promoters, setPromoters] = useState<any[]>([])

  useEffect(() => {
    const loadPromoters = async () => {
      try {
        const promotersRef = collection(db, 'promoters')
        const q = query(promotersRef, where('active', '==', true))
        const snapshot = await getDocs(q)
        
        const promotersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        
        setPromoters(promotersList)
      } catch (error) {
        console.error('Error loading promoters:', error)
      }
    }
    
    loadPromoters()
  }, [])

  const filterByPromoter = (items: any[]) => {
    if (selectedPromoter === 'all') return items
    return items.filter(item => item.promoterId === selectedPromoter)
  }

  return {
    selectedPromoter,
    setSelectedPromoter,
    promoters,
    filterByPromoter
  }
}

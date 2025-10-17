import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function getPromoterBySlug(slug: string) {
  try {
    const promotersRef = collection(db, 'promoters')
    const q = query(promotersRef, where('slug', '==', slug))
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) return null
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    }
  } catch (error) {
    console.error('Error fetching promoter:', error)
    return null
  }
}

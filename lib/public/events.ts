import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function getPublicEvents() {
  try {
    const eventsRef = collection(db, 'events')
    const q = query(eventsRef, where('status', '==', 'published'))
    const snapshot = await getDocs(q)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  } catch (error) {
    console.error('Error fetching public events:', error)
    return []
  }
}

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export class PromoterService {
  static async getPromoters() {
    try {
      const promotersRef = collection(db, 'promoters')
      const snapshot = await getDocs(promotersRef)
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching promoters:', error)
      return []
    }
  }

  static async getActivePromoters() {
    try {
      const promotersRef = collection(db, 'promoters')
      const q = query(promotersRef, where('active', '==', true))
      const snapshot = await getDocs(q)
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error('Error fetching active promoters:', error)
      return []
    }
  }

  static async createPromoter(data: any) {
    try {
      const promotersRef = collection(db, 'promoters')
      const docRef = await addDoc(promotersRef, {
        ...data,
        active: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })
      
      return docRef.id
    } catch (error) {
      console.error('Error creating promoter:', error)
      throw error
    }
  }

  static async updatePromoter(id: string, data: any) {
    try {
      const promoterRef = doc(db, 'promoters', id)
      await updateDoc(promoterRef, {
        ...data,
        updatedAt: Timestamp.now()
      })
      
      return true
    } catch (error) {
      console.error('Error updating promoter:', error)
      throw error
    }
  }

  static async deletePromoter(id: string) {
    try {
      const promoterRef = doc(db, 'promoters', id)
      await deleteDoc(promoterRef)
      
      return true
    } catch (error) {
      console.error('Error deleting promoter:', error)
      throw error
    }
  }
}

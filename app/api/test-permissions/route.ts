import { NextResponse } from 'next/server'
import { db, auth } from '@/lib/firebase'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'

export async function GET() {
  const results: any = {
    currentUser: auth.currentUser?.email || 'No user',
    userId: auth.currentUser?.uid || 'No UID',
    timestamp: new Date().toISOString()
  }
  
  // Test user document
  if (auth.currentUser) {
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid))
      results.userDoc = userDoc.exists() ? userDoc.data() : 'User doc not found'
    } catch (e: any) {
      results.userDoc = { error: e.message }
    }
  }
  
  // Test each collection
  const collections = ['orders', 'events', 'venues', 'promotions', 'promoters']
  
  for (const coll of collections) {
    try {
      const snapshot = await getDocs(collection(db, coll))
      results[coll] = {
        success: true,
        count: snapshot.size,
        canRead: true
      }
    } catch (e: any) {
      results[coll] = {
        success: false,
        error: e.message,
        code: e.code,
        canRead: false
      }
    }
  }
  
  return NextResponse.json(results, { status: 200 })
}

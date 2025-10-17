import { NextResponse } from 'next/server'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function GET() {
  try {
    const promotersRef = collection(db, 'promoters')
    const q = query(promotersRef, where('active', '==', true), orderBy('name'))
    const snapshot = await getDocs(q)
    
    const promoters = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    return NextResponse.json({
      success: true,
      data: promoters,
      count: promoters.length
    })
  } catch (error: any) {
    console.error('Error fetching promoters:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

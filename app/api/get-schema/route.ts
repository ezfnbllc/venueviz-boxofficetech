import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, getDocs, limit, query } from 'firebase/firestore'

export async function GET() {
  try {
    const collections = ['events', 'venues', 'orders', 'promoters', 'promotions', 'users', 'seat_status', 'layouts']
    const schema: any = {}
    
    for (const colName of collections) {
      try {
        const q = query(collection(db, colName), limit(5))
        const snapshot = await getDocs(q)
        
        if (!snapshot.empty) {
          // Get all unique fields from first 5 documents
          const fields = new Set<string>()
          const sampleDoc = snapshot.docs[0].data()
          
          snapshot.docs.forEach(doc => {
            Object.keys(doc.data()).forEach(key => fields.add(key))
          })
          
          schema[colName] = {
            documentCount: snapshot.size,
            fields: Array.from(fields).sort(),
            sampleDocument: sampleDoc,
            sampleId: snapshot.docs[0].id
          }
        } else {
          schema[colName] = { documentCount: 0, fields: [], message: 'Collection empty or does not exist' }
        }
      } catch (e: any) {
        schema[colName] = { error: e.message }
      }
    }
    
    return NextResponse.json({
      success: true,
      database: 'venueviz (default)',
      schema,
      timestamp: new Date().toISOString()
    }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

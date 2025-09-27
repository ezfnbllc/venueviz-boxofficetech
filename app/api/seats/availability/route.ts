import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const eventId = searchParams.get('eventId')
    
    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
    }

    // Get seat statuses for this event
    const q = query(collection(db, 'seat_status'), where('eventId', '==', eventId))
    const snapshot = await getDocs(q)
    
    const seats = snapshot.docs.map(doc => ({
      seatId: doc.data().seatId,
      status: doc.data().status,
      sessionId: doc.data().sessionId,
      heldUntil: doc.data().heldUntil
    }))

    return NextResponse.json({ seats })
  } catch (error) {
    console.error('Error fetching seat availability:', error)
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { eventId, seatId, status, sessionId } = await request.json()
    
    // Update seat status in Firebase
    const seatStatusRef = collection(db, 'seat_status')
    const docId = `${eventId}_${seatId}`
    
    await setDoc(doc(seatStatusRef, docId), {
      eventId,
      seatId,
      status,
      sessionId,
      heldUntil: status === 'held' ? new Date(Date.now() + 10 * 60 * 1000) : null,
      updatedAt: new Date()
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating seat status:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}

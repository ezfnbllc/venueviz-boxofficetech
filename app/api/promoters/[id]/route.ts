import { NextRequest, NextResponse } from 'next/server'
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where, Timestamp, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const promoterId = params.id
    const promoterRef = doc(db, 'promoters', promoterId)
    const snapshot = await getDoc(promoterRef)

    if (!snapshot.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Promoter not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: snapshot.id,
        ...snapshot.data()
      }
    })
  } catch (error: any) {
    console.error('Error fetching promoter:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const promoterId = params.id
    const body = await request.json()

    // Verify promoter exists
    const promoterRef = doc(db, 'promoters', promoterId)
    const existing = await getDoc(promoterRef)

    if (!existing.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Promoter not found'
      }, { status: 404 })
    }

    // Check if new slug is unique (if slug is being changed)
    if (body.slug && body.slug !== existing.data()?.slug) {
      const promotersRef = collection(db, 'promoters')
      const slugQuery = query(promotersRef, where('slug', '==', body.slug))
      const existingSlug = await getDocs(slugQuery)

      if (!existingSlug.empty) {
        return NextResponse.json({
          success: false,
          error: 'Slug is already in use'
        }, { status: 400 })
      }
    }

    // Update promoter
    const updateData = {
      ...body,
      updatedAt: Timestamp.now()
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    await updateDoc(promoterRef, updateData)

    const updated = await getDoc(promoterRef)

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        ...updated.data()
      }
    })
  } catch (error: any) {
    console.error('Error updating promoter:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const promoterId = params.id
    const { searchParams } = new URL(request.url)
    const softDelete = searchParams.get('soft') === 'true'
    const reassignTo = searchParams.get('reassignTo')

    // Verify promoter exists
    const promoterRef = doc(db, 'promoters', promoterId)
    const existing = await getDoc(promoterRef)

    if (!existing.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Promoter not found'
      }, { status: 404 })
    }

    // Check for associated events
    const eventsRef = collection(db, 'events')
    const eventsQuery = query(eventsRef, where('promoterId', '==', promoterId))
    const eventsSnap = await getDocs(eventsQuery)

    if (softDelete) {
      // Soft delete - mark as inactive
      await updateDoc(promoterRef, {
        active: false,
        deletedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })

      return NextResponse.json({
        success: true,
        message: 'Promoter deactivated successfully'
      })
    }

    // Hard delete
    if (!eventsSnap.empty) {
      // Reassign events if target promoter specified
      if (reassignTo) {
        const targetRef = doc(db, 'promoters', reassignTo)
        const targetSnap = await getDoc(targetRef)

        if (!targetSnap.exists()) {
          return NextResponse.json({
            success: false,
            error: 'Target promoter for reassignment not found'
          }, { status: 400 })
        }

        const batch = writeBatch(db)
        const targetData = targetSnap.data()

        eventsSnap.docs.forEach(eventDoc => {
          batch.update(doc(db, 'events', eventDoc.id), {
            promoterId: reassignTo,
            promoter: {
              promoterId: reassignTo,
              promoterName: targetData?.name || '',
              commission: targetData?.commission || 10
            },
            updatedAt: Timestamp.now()
          })
        })

        await batch.commit()
      } else {
        return NextResponse.json({
          success: false,
          error: `Promoter has ${eventsSnap.size} events. Specify reassignTo parameter or use soft delete.`
        }, { status: 400 })
      }
    }

    // Delete the promoter
    await deleteDoc(promoterRef)

    // Also delete associated payment gateway
    const gatewaysRef = collection(db, 'payment_gateways')
    const gatewayQuery = query(gatewaysRef, where('promoterId', '==', promoterId))
    const gatewaySnap = await getDocs(gatewayQuery)

    if (!gatewaySnap.empty) {
      const batch = writeBatch(db)
      gatewaySnap.docs.forEach(gw => {
        batch.delete(doc(db, 'payment_gateways', gw.id))
      })
      await batch.commit()
    }

    return NextResponse.json({
      success: true,
      message: 'Promoter deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting promoter:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

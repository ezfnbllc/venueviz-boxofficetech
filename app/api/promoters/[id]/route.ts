import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const promoterId = params.id
    // Use Admin SDK for server-side operations
    const adminDb = getAdminDb()
    const snapshot = await adminDb.collection('promoters').doc(promoterId).get()

    if (!snapshot.exists) {
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
      error: error.message,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

    // Use Admin SDK for server-side operations
    const adminDb = getAdminDb()
    const promoterRef = adminDb.collection('promoters').doc(promoterId)
    const existing = await promoterRef.get()

    if (!existing.exists) {
      return NextResponse.json({
        success: false,
        error: 'Promoter not found'
      }, { status: 404 })
    }

    // Check if new slug is unique (if slug is being changed)
    if (body.slug && body.slug !== existing.data()?.slug) {
      const existingSlug = await adminDb.collection('promoters')
        .where('slug', '==', body.slug)
        .get()

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
      updatedAt: FieldValue.serverTimestamp()
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    await promoterRef.update(updateData)

    const updated = await promoterRef.get()

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

    // Use Admin SDK for server-side operations
    const adminDb = getAdminDb()
    const promoterRef = adminDb.collection('promoters').doc(promoterId)
    const existing = await promoterRef.get()

    if (!existing.exists) {
      return NextResponse.json({
        success: false,
        error: 'Promoter not found'
      }, { status: 404 })
    }

    // Check for associated events
    const eventsSnap = await adminDb.collection('events')
      .where('promoterId', '==', promoterId)
      .get()

    if (softDelete) {
      // Soft delete - mark as inactive
      await promoterRef.update({
        active: false,
        deletedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
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
        const targetRef = adminDb.collection('promoters').doc(reassignTo)
        const targetSnap = await targetRef.get()

        if (!targetSnap.exists) {
          return NextResponse.json({
            success: false,
            error: 'Target promoter for reassignment not found'
          }, { status: 400 })
        }

        const batch = adminDb.batch()
        const targetData = targetSnap.data()

        eventsSnap.docs.forEach(eventDoc => {
          batch.update(adminDb.collection('events').doc(eventDoc.id), {
            promoterId: reassignTo,
            promoter: {
              promoterId: reassignTo,
              promoterName: targetData?.name || '',
              commission: targetData?.commission || 10
            },
            updatedAt: FieldValue.serverTimestamp()
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
    await promoterRef.delete()

    // Also delete associated payment gateway
    const gatewaySnap = await adminDb.collection('payment_gateways')
      .where('promoterId', '==', promoterId)
      .get()

    if (!gatewaySnap.empty) {
      const batch = adminDb.batch()
      gatewaySnap.docs.forEach(gw => {
        batch.delete(adminDb.collection('payment_gateways').doc(gw.id))
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

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'

export async function POST(request: NextRequest) {
  try {
    const { code, eventId, promoterSlug } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 })
    }

    // Get promoter ID from slug if provided
    let promoterId: string | null = null
    if (promoterSlug) {
      const promotersQuery = query(
        collection(db, 'promoters'),
        where('slug', '==', promoterSlug)
      )
      const promotersSnapshot = await getDocs(promotersQuery)
      if (!promotersSnapshot.empty) {
        promoterId = promotersSnapshot.docs[0].id
      }
    }

    // Search for the promotion code
    // First check global promotions
    const globalQuery = query(
      collection(db, 'promotions'),
      where('code', '==', code.toUpperCase()),
      where('active', '==', true)
    )
    const globalSnapshot = await getDocs(globalQuery)

    let promotion: any = null

    if (!globalSnapshot.empty) {
      const promoDoc = globalSnapshot.docs[0]
      promotion = { id: promoDoc.id, ...promoDoc.data() }
    }

    // If no global promotion found and we have an eventId, check event-specific promotions
    if (!promotion && eventId) {
      const eventDoc = await getDoc(doc(db, 'events', eventId))
      if (eventDoc.exists()) {
        const eventData = eventDoc.data()
        const eventPromotions = eventData.promotions?.eventPromotions || []

        const matchingPromo = eventPromotions.find(
          (p: any) => p.code?.toUpperCase() === code.toUpperCase() && p.active !== false
        )

        if (matchingPromo) {
          promotion = matchingPromo
        }
      }
    }

    if (!promotion) {
      return NextResponse.json({ error: 'Invalid or expired coupon code' }, { status: 404 })
    }

    // Check if promotion is for specific promoter only
    if (promotion.promoterId && promoterId && promotion.promoterId !== promoterId) {
      return NextResponse.json({ error: 'This code is not valid for this promoter' }, { status: 400 })
    }

    // Check if promotion is for specific event only
    if (promotion.eventIds?.length > 0 && eventId && !promotion.eventIds.includes(eventId)) {
      return NextResponse.json({ error: 'This code is not valid for this event' }, { status: 400 })
    }

    // Check date validity
    const now = new Date()
    if (promotion.startDate) {
      const startDate = new Date(promotion.startDate)
      if (now < startDate) {
        return NextResponse.json({ error: 'This code is not yet active' }, { status: 400 })
      }
    }
    if (promotion.endDate) {
      const endDate = new Date(promotion.endDate)
      if (now > endDate) {
        return NextResponse.json({ error: 'This code has expired' }, { status: 400 })
      }
    }

    // Check usage limits
    if (promotion.maxUses && promotion.usedCount >= promotion.maxUses) {
      return NextResponse.json({ error: 'This code has reached its usage limit' }, { status: 400 })
    }

    // Return the valid promotion
    return NextResponse.json({
      code: promotion.code,
      type: promotion.type || 'percentage',
      value: promotion.value || promotion.discount || 0,
      description: promotion.description,
    })

  } catch (error) {
    console.error('Error validating promotion:', error)
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 })
  }
}

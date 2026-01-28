/**
 * Inventory Capacity API
 *
 * POST /api/events/[eventId]/inventory/capacity - Adjust tier capacity
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore, FieldValue } from '@/lib/firebase-admin'

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params
    const body = await request.json()
    const { tierId, adjustment, reason } = body

    if (!tierId || adjustment === undefined || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: tierId, adjustment, reason' },
        { status: 400 }
      )
    }

    if (adjustment === 0) {
      return NextResponse.json(
        { error: 'Adjustment cannot be zero' },
        { status: 400 }
      )
    }

    const db = getAdminFirestore()

    // Get event data
    const eventDoc = await db.collection('events').doc(eventId).get()
    if (!eventDoc.exists) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const eventData = eventDoc.data()!
    const ticketTypes = eventData.ticketTypes || []
    const pricingTiers = eventData.pricing?.tiers || []

    // Find the tier and update capacity
    let tierFound = false
    let tierName = tierId
    let previousCapacity = 0
    let newCapacity = 0

    // Check ticketTypes first
    const ticketTypeIndex = ticketTypes.findIndex((tt: any) => tt.id === tierId)
    if (ticketTypeIndex !== -1) {
      tierFound = true
      tierName = ticketTypes[ticketTypeIndex].name || tierId
      previousCapacity = ticketTypes[ticketTypeIndex].capacity || ticketTypes[ticketTypeIndex].quantity || 0
      newCapacity = previousCapacity + adjustment

      if (newCapacity < 0) {
        return NextResponse.json(
          { error: 'New capacity cannot be negative' },
          { status: 400 }
        )
      }

      // Update the ticketType capacity
      ticketTypes[ticketTypeIndex].capacity = newCapacity
      ticketTypes[ticketTypeIndex].quantity = newCapacity
      ticketTypes[ticketTypeIndex].available = newCapacity // Some events use 'available'

      await db.collection('events').doc(eventId).update({
        ticketTypes,
      })
    }

    // Check pricing tiers if not found in ticketTypes
    if (!tierFound) {
      const pricingTierIndex = pricingTiers.findIndex((t: any) => t.id === tierId || `tier-${t.name}` === tierId)
      if (pricingTierIndex !== -1) {
        tierFound = true
        tierName = pricingTiers[pricingTierIndex].name || tierId
        previousCapacity = pricingTiers[pricingTierIndex].capacity || pricingTiers[pricingTierIndex].quantity || 0
        newCapacity = previousCapacity + adjustment

        if (newCapacity < 0) {
          return NextResponse.json(
            { error: 'New capacity cannot be negative' },
            { status: 400 }
          )
        }

        // Update the pricing tier capacity
        pricingTiers[pricingTierIndex].capacity = newCapacity
        pricingTiers[pricingTierIndex].quantity = newCapacity

        await db.collection('events').doc(eventId).update({
          'pricing.tiers': pricingTiers,
        })
      }
    }

    // Handle 'general' tier - update event totalCapacity
    if (!tierFound && tierId === 'general') {
      tierFound = true
      tierName = 'General Admission'
      previousCapacity = eventData.totalCapacity || eventData.ticketsAvailable || 0
      newCapacity = previousCapacity + adjustment

      if (newCapacity < 0) {
        return NextResponse.json(
          { error: 'New capacity cannot be negative' },
          { status: 400 }
        )
      }

      await db.collection('events').doc(eventId).update({
        totalCapacity: newCapacity,
        ticketsAvailable: newCapacity,
      })
    }

    if (!tierFound) {
      return NextResponse.json(
        { error: 'Tier not found' },
        { status: 404 }
      )
    }

    // Log the action
    await db.collection('inventory_logs').add({
      eventId,
      action: adjustment > 0 ? 'add_capacity' : 'remove_capacity',
      type: 'ga',
      tierId,
      tierName,
      quantityChange: adjustment,
      previousValue: previousCapacity,
      newValue: newCapacity,
      reason,
      performedBy: 'admin',
      performedByName: 'Admin User',
      performedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      previousCapacity,
      newCapacity,
      message: `Capacity ${adjustment > 0 ? 'increased' : 'decreased'} from ${previousCapacity} to ${newCapacity}`,
    })

  } catch (error) {
    console.error('Error adjusting capacity:', error)
    return NextResponse.json(
      { error: 'Failed to adjust capacity' },
      { status: 500 }
    )
  }
}

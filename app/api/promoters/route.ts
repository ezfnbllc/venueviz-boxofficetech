import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const db = getAdminFirestore()

    if (slug) {
      // Get specific promoter by slug
      const snapshot = await db.collection('promoters')
        .where('slug', '==', slug)
        .limit(1)
        .get()

      if (snapshot.empty) {
        return NextResponse.json({
          success: false,
          error: 'Promoter not found'
        }, { status: 404 })
      }

      const promoter = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      }

      return NextResponse.json({
        success: true,
        data: promoter
      })
    }

    // Get all promoters
    let query = db.collection('promoters')

    if (!includeInactive) {
      query = query.where('active', '==', true)
    }

    const snapshot = await query.orderBy('name').get()

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.email) {
      return NextResponse.json({
        success: false,
        error: 'Name and email are required'
      }, { status: 400 })
    }

    const db = getAdminFirestore()

    // Check if slug is unique
    if (body.slug) {
      const existingSlug = await db.collection('promoters')
        .where('slug', '==', body.slug)
        .limit(1)
        .get()

      if (!existingSlug.empty) {
        return NextResponse.json({
          success: false,
          error: 'Slug is already in use'
        }, { status: 400 })
      }
    }

    // Generate slug if not provided
    const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    const promoterData = {
      name: body.name,
      email: body.email,
      phone: body.phone || '',
      slug,
      logo: body.logo || '',
      brandingType: body.brandingType || 'basic',
      colorScheme: body.colorScheme || {
        primary: '#9333EA',
        secondary: '#EC4899',
        accent: '#F59E0B',
        background: '#1F2937',
        text: '#F3F4F6'
      },
      commission: body.commission || 10,
      active: body.active !== false,
      users: body.users || [],
      website: body.website || '',
      description: body.description || '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }

    const docRef = await db.collection('promoters').add(promoterData)

    return NextResponse.json({
      success: true,
      data: {
        id: docRef.id,
        ...promoterData
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating promoter:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

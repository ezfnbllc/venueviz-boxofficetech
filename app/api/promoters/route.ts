import { NextRequest, NextResponse } from 'next/server'
import { collection, getDocs, addDoc, query, where, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const promotersRef = collection(db, 'promoters')
    let q

    if (slug) {
      // Get specific promoter by slug
      q = query(promotersRef, where('slug', '==', slug))
      const snapshot = await getDocs(q)

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
    if (includeInactive) {
      q = query(promotersRef, orderBy('name'))
    } else {
      q = query(promotersRef, where('active', '==', true), orderBy('name'))
    }

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

    // Check if slug is unique
    if (body.slug) {
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
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }

    const promotersRef = collection(db, 'promoters')
    const docRef = await addDoc(promotersRef, promoterData)

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

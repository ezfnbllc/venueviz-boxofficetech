/**
 * Tenants Management API (Superadmin Only)
 *
 * GET /api/admin/tenants - List all tenants
 * POST /api/admin/tenants - Create a new tenant
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase-admin'
import { isSuperAdmin, MASTER_TENANT_ID } from '@/lib/services/themeResolutionService'
import { FieldValue } from 'firebase-admin/firestore'

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const auth = getAdminAuth()
    const db = getAdminFirestore()

    // Verify the token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user is superadmin
    const isSuper = await isSuperAdmin(decodedToken.uid)
    if (!isSuper) {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })
    }

    // Fetch all tenants
    const tenantsSnapshot = await db
      .collection('tenants')
      .orderBy('createdAt', 'desc')
      .get()

    const tenants = tenantsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.name,
        slug: data.slug,
        type: data.type,
        status: data.status,
        isMaster: data.isMaster || false,
        defaultThemeId: data.defaultThemeId,
        customThemeId: data.customThemeId,
        owner: data.owner,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      }
    })

    // Get theme count for each tenant
    const tenantsWithThemes = await Promise.all(
      tenants.map(async (tenant) => {
        const themesSnapshot = await db
          .collection('tenantThemes')
          .where('tenantId', '==', tenant.id)
          .count()
          .get()
        return {
          ...tenant,
          themeCount: themesSnapshot.data().count,
        }
      })
    )

    return NextResponse.json({
      tenants: tenantsWithThemes,
      total: tenants.length,
      masterTenantId: MASTER_TENANT_ID,
    })

  } catch (error) {
    console.error('[Admin Tenants] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tenants', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const auth = getAdminAuth()
    const db = getAdminFirestore()

    // Verify the token
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user is superadmin
    const isSuper = await isSuperAdmin(decodedToken.uid)
    if (!isSuper) {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug, type, ownerEmail, ownerName } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    // Check if slug is already taken
    const existingTenant = await db
      .collection('tenants')
      .where('slug', '==', slug)
      .limit(1)
      .get()

    if (!existingTenant.empty) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 400 })
    }

    // Create the tenant
    const tenantRef = db.collection('tenants').doc()
    await tenantRef.set({
      id: tenantRef.id,
      name,
      slug,
      type: type || 'standard',
      status: 'active',
      isMaster: false,
      // New tenants automatically inherit master theme (lazy copy)
      defaultThemeId: null,  // Will use master theme via resolution
      customThemeId: null,
      owner: {
        email: ownerEmail || '',
        name: ownerName || name,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenantRef.id,
        name,
        slug,
        type: type || 'standard',
        status: 'active',
      },
    })

  } catch (error) {
    console.error('[Admin Tenants] Create error:', error)
    return NextResponse.json(
      { error: 'Failed to create tenant', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

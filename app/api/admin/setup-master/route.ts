/**
 * Master Tenant Setup API
 *
 * One-time setup endpoint to:
 * 1. Mark BoxOfficeTech tenant as master
 * 2. Elevate admin user to superadmin
 * 3. Create Barren as the default platform theme
 *
 * POST /api/admin/setup-master
 * Authorization: Bearer token (must be boxofficetechllp@gmail.com)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { MASTER_TENANT_ID, MASTER_ADMIN_EMAIL } from '@/lib/services/themeResolutionService'

// Barren theme configuration extracted from the ThemeForest template
const BARREN_THEME_CONFIG = {
  themeName: 'Barren - Core Platform Theme',
  themeSource: 'core' as const,
  status: 'active' as const,
  version: '1.0.0',
  isDefault: true,
  isMasterTheme: true,

  config: {
    colors: {
      primary: '#6ac045',
      secondary: '#3c52e9',
      accent: '#7ad254',
      background: '#ffffff',
      surface: '#F5F7F9',
      text: '#000000',
      textSecondary: '#717171',
      heading: '#000000',
      link: '#3c52e9',
      linkHover: '#3c52e9',
      border: '#efefef',
      success: '#6ac045',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
    typography: {
      headingFont: 'Roboto, sans-serif',
      bodyFont: 'Roboto, sans-serif',
      monoFont: 'monospace',
      baseFontSize: '16px',
      lineHeight: '1.6',
      scale: 1.25,
    },
    layout: {
      containerWidth: '1200px',
      sidebarWidth: '280px',
      headerHeight: '80px',
      footerHeight: '200px',
      spacing: 'normal' as const,
    },
    components: {
      buttonStyle: 'rounded' as const,
      cardStyle: 'raised' as const,
      inputStyle: 'outlined' as const,
    },
  },

  assets: {
    basePath: `tenants/${MASTER_TENANT_ID}/themes/barren-core/`,
    css: {
      main: ['css/style.css', 'css/responsive.css'],
      vendors: ['vendor/bootstrap/css/bootstrap.min.css'],
      custom: '',
    },
    js: {
      main: ['js/custom.js'],
      vendors: ['vendor/bootstrap/js/bootstrap.bundle.min.js'],
      custom: '',
    },
    images: {
      logo: {
        primary: 'images/logo.svg',
        secondary: 'images/dark-logo.svg',
        favicon: 'images/fav.png',
      },
      backgrounds: [],
      gallery: [],
      placeholders: {},
    },
    fonts: {
      files: [],
      fontFaces: '',
    },
    icons: {
      library: 'fontawesome' as const,
    },
  },

  templates: [
    { id: 'home', name: 'Home', type: 'page' as const, htmlFile: 'index.html', slots: [] },
    { id: 'events', name: 'Explore Events', type: 'page' as const, htmlFile: 'explore_events.html', slots: [] },
    { id: 'event-detail', name: 'Event Detail', type: 'page' as const, htmlFile: 'venue_event_detail_view.html', slots: [] },
    { id: 'checkout', name: 'Checkout', type: 'page' as const, htmlFile: 'checkout.html', slots: [] },
    { id: 'confirmation', name: 'Booking Confirmed', type: 'page' as const, htmlFile: 'booking_confirmed.html', slots: [] },
    { id: 'login', name: 'Sign In', type: 'page' as const, htmlFile: 'sign_in.html', slots: [] },
    { id: 'register', name: 'Sign Up', type: 'page' as const, htmlFile: 'sign_up.html', slots: [] },
    { id: 'forgot-password', name: 'Forgot Password', type: 'page' as const, htmlFile: 'forgot_password.html', slots: [] },
    { id: 'profile', name: 'Profile', type: 'page' as const, htmlFile: 'attendee_profile_view.html', slots: [] },
    { id: 'about', name: 'About Us', type: 'page' as const, htmlFile: 'about_us.html', slots: [] },
    { id: 'contact', name: 'Contact Us', type: 'page' as const, htmlFile: 'contact_us.html', slots: [] },
    { id: 'faq', name: 'FAQ', type: 'page' as const, htmlFile: 'faq.html', slots: [] },
    { id: 'privacy', name: 'Privacy Policy', type: 'page' as const, htmlFile: 'privacy_policy.html', slots: [] },
    { id: 'terms', name: 'Terms & Conditions', type: 'page' as const, htmlFile: 'term_and_conditions.html', slots: [] },
    { id: 'error-404', name: 'Error 404', type: 'page' as const, htmlFile: 'error_404.html', slots: [] },
  ],
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

    // Verify the token and check if it's the master admin
    let decodedToken
    try {
      decodedToken = await auth.verifyIdToken(token)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Only allow the master admin to run this setup
    if (decodedToken.email !== MASTER_ADMIN_EMAIL) {
      return NextResponse.json(
        { error: `Only ${MASTER_ADMIN_EMAIL} can run master setup` },
        { status: 403 }
      )
    }

    const results: Record<string, any> = {}

    // Step 1: Mark BoxOfficeTech tenant as master
    const tenantRef = db.collection('tenants').doc(MASTER_TENANT_ID)
    const tenantDoc = await tenantRef.get()

    if (!tenantDoc.exists) {
      // Create the master tenant if it doesn't exist
      await tenantRef.set({
        id: MASTER_TENANT_ID,
        name: 'BoxOfficeTech',
        slug: 'boxofficetech',
        type: 'enterprise',
        status: 'active',
        isMaster: true,
        owner: {
          userId: decodedToken.uid,
          email: MASTER_ADMIN_EMAIL,
          name: 'BoxOfficeTech Admin',
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      results.tenant = { action: 'created', id: MASTER_TENANT_ID }
    } else {
      // Update existing tenant to mark as master
      await tenantRef.update({
        isMaster: true,
        updatedAt: FieldValue.serverTimestamp(),
      })
      results.tenant = { action: 'updated', id: MASTER_TENANT_ID, isMaster: true }
    }

    // Step 2: Create Barren as the default theme
    const themeId = 'barren-core-theme'
    const themeRef = db.collection('tenantThemes').doc(themeId)
    const themeDoc = await themeRef.get()

    const themeData = {
      ...BARREN_THEME_CONFIG,
      id: themeId,
      tenantId: MASTER_TENANT_ID,
      createdBy: decodedToken.uid,
      updatedBy: decodedToken.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      publishedAt: Timestamp.now(),
    }

    if (!themeDoc.exists) {
      await themeRef.set(themeData)
      results.theme = { action: 'created', id: themeId }
    } else {
      await themeRef.update({
        ...BARREN_THEME_CONFIG,
        updatedBy: decodedToken.uid,
        updatedAt: Timestamp.now(),
      })
      results.theme = { action: 'updated', id: themeId }
    }

    // Step 3: Update tenant with default theme reference
    await tenantRef.update({
      defaultThemeId: themeId,
      updatedAt: FieldValue.serverTimestamp(),
    })
    results.tenant.defaultThemeId = themeId

    // Step 4: Update user to superadmin
    const userRef = db.collection('users').doc(decodedToken.uid)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      // Create user document
      await userRef.set({
        uid: decodedToken.uid,
        email: MASTER_ADMIN_EMAIL,
        role: 'superadmin',
        tenantId: MASTER_TENANT_ID,
        canAccessAllTenants: true,
        canImpersonate: true,
        canManageBilling: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      results.user = { action: 'created', role: 'superadmin' }
    } else {
      // Update existing user
      await userRef.update({
        role: 'superadmin',
        tenantId: MASTER_TENANT_ID,
        canAccessAllTenants: true,
        canImpersonate: true,
        canManageBilling: true,
        updatedAt: FieldValue.serverTimestamp(),
      })
      results.user = { action: 'updated', role: 'superadmin' }
    }

    // Step 5: Ensure TenantUser entry exists
    const tenantUserId = `${MASTER_TENANT_ID}_${decodedToken.uid}`
    const tenantUserRef = db.collection('tenantUsers').doc(tenantUserId)
    const tenantUserDoc = await tenantUserRef.get()

    if (!tenantUserDoc.exists) {
      await tenantUserRef.set({
        id: tenantUserId,
        tenantId: MASTER_TENANT_ID,
        userId: decodedToken.uid,
        email: MASTER_ADMIN_EMAIL,
        name: 'BoxOfficeTech Admin',
        role: 'superadmin',
        permissions: ['*'],
        status: 'active',
        canAccessAllTenants: true,
        canImpersonate: true,
        canManageBilling: true,
        createdAt: FieldValue.serverTimestamp(),
      })
      results.tenantUser = { action: 'created', role: 'superadmin' }
    } else {
      await tenantUserRef.update({
        role: 'superadmin',
        permissions: ['*'],
        canAccessAllTenants: true,
        canImpersonate: true,
        canManageBilling: true,
      })
      results.tenantUser = { action: 'updated', role: 'superadmin' }
    }

    return NextResponse.json({
      success: true,
      message: 'Master tenant setup complete',
      results,
      masterTenantId: MASTER_TENANT_ID,
      defaultThemeId: themeId,
    })

  } catch (error) {
    console.error('[Setup Master] Error:', error)
    return NextResponse.json(
      { error: 'Setup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check current setup status
export async function GET(request: NextRequest) {
  try {
    const db = getAdminFirestore()

    // Check tenant
    const tenantDoc = await db.collection('tenants').doc(MASTER_TENANT_ID).get()
    const tenant = tenantDoc.exists ? tenantDoc.data() : null

    // Check theme
    const themeDoc = await db.collection('tenantThemes').doc('barren-core-theme').get()
    const theme = themeDoc.exists ? { id: themeDoc.id, themeName: themeDoc.data()?.themeName } : null

    // Count total tenants
    const tenantsSnapshot = await db.collection('tenants').count().get()
    const totalTenants = tenantsSnapshot.data().count

    return NextResponse.json({
      status: 'ok',
      masterTenant: {
        id: MASTER_TENANT_ID,
        exists: tenantDoc.exists,
        isMaster: tenant?.isMaster || false,
        defaultThemeId: tenant?.defaultThemeId || null,
        name: tenant?.name || null,
      },
      defaultTheme: theme,
      totalTenants,
      setupRequired: !tenant?.isMaster || !theme,
    })
  } catch (error) {
    console.error('[Setup Master] Status check error:', error)
    return NextResponse.json(
      { error: 'Status check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

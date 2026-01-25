/**
 * Promoter Theme Settings API
 *
 * GET /api/promoters/[id]/theme - Get current theme settings
 * PUT /api/promoters/[id]/theme - Update theme overrides
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { getThemeConfigForPromoter, clearPromoterThemeCache } from '@/lib/services/promoterThemeService'
import { PromoterProfile, PromoterThemeOverrides } from '@/lib/types/promoter'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET - Get current theme settings for a promoter
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: promoterId } = await params
    const db = getAdminFirestore()

    // Get promoter document
    const promoterDoc = await db.collection('promoters').doc(promoterId).get()

    if (!promoterDoc.exists) {
      return NextResponse.json(
        { error: 'Promoter not found' },
        { status: 404 }
      )
    }

    const promoter = { id: promoterDoc.id, ...promoterDoc.data() } as PromoterProfile

    // Get resolved theme config (with inheritance applied)
    const resolvedConfig = await getThemeConfigForPromoter(promoter)

    return NextResponse.json({
      success: true,
      data: {
        // Current overrides (what the tenant has customized)
        themeOverrides: promoter.themeOverrides || null,
        // Legacy colorScheme (for backwards compatibility display)
        colorScheme: promoter.colorScheme,
        // Full resolved config (after inheritance)
        resolvedConfig,
        // Theme info
        themeId: promoter.themeId || null,
        brandingType: promoter.brandingType,
        logo: promoter.logo,
      },
    })
  } catch (error) {
    console.error('Error getting theme settings:', error)
    return NextResponse.json(
      { error: 'Failed to get theme settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Update theme overrides for a promoter
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: promoterId } = await params
    const body = await request.json()
    const db = getAdminFirestore()

    // Get promoter document
    const promoterDoc = await db.collection('promoters').doc(promoterId).get()

    if (!promoterDoc.exists) {
      return NextResponse.json(
        { error: 'Promoter not found' },
        { status: 404 }
      )
    }

    // Validate and sanitize theme overrides
    const themeOverrides: PromoterThemeOverrides = {}

    // Colors
    if (body.colors) {
      themeOverrides.colors = {}
      const validColorKeys = ['primary', 'secondary', 'accent', 'background', 'surface', 'text', 'heading']
      for (const key of validColorKeys) {
        if (body.colors[key] && isValidColor(body.colors[key])) {
          themeOverrides.colors[key as keyof typeof themeOverrides.colors] = body.colors[key]
        }
      }
    }

    // Logo URLs
    if (body.logoUrl && isValidUrl(body.logoUrl)) {
      themeOverrides.logoUrl = body.logoUrl
    }
    if (body.faviconUrl && isValidUrl(body.faviconUrl)) {
      themeOverrides.faviconUrl = body.faviconUrl
    }

    // Typography
    if (body.headingFont && typeof body.headingFont === 'string') {
      themeOverrides.headingFont = body.headingFont
    }
    if (body.bodyFont && typeof body.bodyFont === 'string') {
      themeOverrides.bodyFont = body.bodyFont
    }

    // Update promoter document
    const updateData: Record<string, any> = {
      themeOverrides,
      updatedAt: new Date().toISOString(),
    }

    // Also update legacy colorScheme for backwards compatibility
    if (themeOverrides.colors) {
      const existingColorScheme = promoterDoc.data()?.colorScheme || {}
      updateData.colorScheme = {
        ...existingColorScheme,
        ...(themeOverrides.colors.primary && { primary: themeOverrides.colors.primary }),
        ...(themeOverrides.colors.secondary && { secondary: themeOverrides.colors.secondary }),
        ...(themeOverrides.colors.accent && { accent: themeOverrides.colors.accent }),
        ...(themeOverrides.colors.background && { background: themeOverrides.colors.background }),
        ...(themeOverrides.colors.text && { text: themeOverrides.colors.text }),
      }
    }

    // Update logo if provided
    if (themeOverrides.logoUrl) {
      updateData.logo = themeOverrides.logoUrl
    }

    await promoterDoc.ref.update(updateData)

    // Clear theme cache for this promoter
    clearPromoterThemeCache(promoterId)

    // Get updated resolved config
    const updatedPromoter = { id: promoterDoc.id, ...promoterDoc.data(), ...updateData } as PromoterProfile
    const resolvedConfig = await getThemeConfigForPromoter(updatedPromoter)

    return NextResponse.json({
      success: true,
      data: {
        themeOverrides,
        resolvedConfig,
      },
      message: 'Theme settings updated successfully',
    })
  } catch (error) {
    console.error('Error updating theme settings:', error)
    return NextResponse.json(
      { error: 'Failed to update theme settings' },
      { status: 500 }
    )
  }
}

// Helper functions
function isValidColor(color: string): boolean {
  // Accept hex colors (#fff, #ffffff) and CSS color names
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(color) || /^[a-zA-Z]+$/.test(color)
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

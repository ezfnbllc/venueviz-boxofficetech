/**
 * Debug API - Theme Resolution Diagnostics
 *
 * Tests the theme resolution chain to diagnose issues:
 * 1. Check master tenant configuration
 * 2. Check if Barren theme exists and has correct flags
 * 3. Test promoter theme resolution
 *
 * DELETE THIS FILE IN PRODUCTION
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { getMasterTheme, getThemeForTenant, MASTER_TENANT_ID } from '@/lib/services/themeResolutionService'
import { getPromoterBySlug, getThemeConfigForPromoter, generateThemeCSSBySlug } from '@/lib/services/promoterThemeService'
import { DEFAULT_THEME_CONFIG } from '@/lib/types/cms'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const promoterSlug = searchParams.get('slug') || 'bot'

    const db = getAdminFirestore()
    const diagnostics: Record<string, unknown> = {}

    // 1. Check Master Tenant
    console.log('[Debug] Checking master tenant:', MASTER_TENANT_ID)
    const masterTenantDoc = await db.collection('tenants').doc(MASTER_TENANT_ID).get()

    if (!masterTenantDoc.exists) {
      diagnostics.masterTenant = { error: 'Master tenant NOT FOUND', id: MASTER_TENANT_ID }
    } else {
      const masterTenantData = masterTenantDoc.data()
      diagnostics.masterTenant = {
        id: MASTER_TENANT_ID,
        exists: true,
        name: masterTenantData?.name,
        defaultThemeId: masterTenantData?.defaultThemeId || 'NOT SET',
        customThemeId: masterTenantData?.customThemeId || 'NOT SET',
      }
    }

    // 2. Check all themes for master tenant
    console.log('[Debug] Checking themes for master tenant')
    const themesSnapshot = await db.collection('tenantThemes')
      .where('tenantId', '==', MASTER_TENANT_ID)
      .get()

    diagnostics.themesForMasterTenant = {
      count: themesSnapshot.size,
      themes: themesSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          themeName: data.themeName,
          status: data.status,
          isDefault: data.isDefault || false,
          isMasterTheme: data.isMasterTheme || false,
          tenantId: data.tenantId,
          version: data.version,
          hasConfig: !!data.config,
          configColors: data.config?.colors ? Object.keys(data.config.colors) : [],
        }
      })
    }

    // 3. Check themes marked as default
    console.log('[Debug] Checking themes marked as default')
    const defaultThemesSnapshot = await db.collection('tenantThemes')
      .where('isDefault', '==', true)
      .get()

    diagnostics.themesMarkedAsDefault = {
      count: defaultThemesSnapshot.size,
      themes: defaultThemesSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          themeName: data.themeName,
          status: data.status,
          tenantId: data.tenantId,
        }
      })
    }

    // 4. Test getMasterTheme()
    console.log('[Debug] Testing getMasterTheme()')
    try {
      const masterTheme = await getMasterTheme()
      if (masterTheme) {
        diagnostics.getMasterThemeResult = {
          success: true,
          themeId: masterTheme.id,
          themeName: masterTheme.themeName,
          status: masterTheme.status,
          hasConfig: !!masterTheme.config,
          primaryColor: masterTheme.config?.colors?.primary || 'NOT SET',
        }
      } else {
        diagnostics.getMasterThemeResult = {
          success: false,
          error: 'getMasterTheme() returned null'
        }
      }
    } catch (err) {
      diagnostics.getMasterThemeResult = {
        success: false,
        error: err instanceof Error ? err.message : String(err)
      }
    }

    // 5. Test promoter resolution
    console.log('[Debug] Testing promoter resolution for:', promoterSlug)
    const promoter = await getPromoterBySlug(promoterSlug)

    if (!promoter) {
      diagnostics.promoter = { error: `Promoter with slug '${promoterSlug}' not found` }
    } else {
      diagnostics.promoter = {
        id: promoter.id,
        name: promoter.name,
        slug: promoter.slug,
        brandingType: promoter.brandingType,
        themeId: promoter.themeId || 'NOT SET',
        hasThemeOverrides: !!promoter.themeOverrides,
        hasColorScheme: !!promoter.colorScheme,
        colorScheme: promoter.colorScheme,
      }

      // 6. Test theme config resolution for promoter
      try {
        const themeConfig = await getThemeConfigForPromoter(promoter)
        diagnostics.resolvedThemeConfig = {
          success: true,
          primaryColor: themeConfig.colors.primary,
          secondaryColor: themeConfig.colors.secondary,
          accentColor: themeConfig.colors.accent,
          backgroundColor: themeConfig.colors.background,
          textColor: themeConfig.colors.text,
          headingFont: themeConfig.typography.headingFont,
          bodyFont: themeConfig.typography.bodyFont,
        }

        // Compare with defaults
        diagnostics.isUsingDefaults = {
          primaryMatchesDefault: themeConfig.colors.primary === DEFAULT_THEME_CONFIG.colors.primary,
          secondaryMatchesDefault: themeConfig.colors.secondary === DEFAULT_THEME_CONFIG.colors.secondary,
          defaultPrimary: DEFAULT_THEME_CONFIG.colors.primary,
          defaultSecondary: DEFAULT_THEME_CONFIG.colors.secondary,
        }
      } catch (err) {
        diagnostics.resolvedThemeConfig = {
          success: false,
          error: err instanceof Error ? err.message : String(err)
        }
      }
    }

    // 7. Generate sample CSS
    try {
      const css = await generateThemeCSSBySlug(promoterSlug)
      diagnostics.generatedCSS = {
        success: true,
        length: css.length,
        preview: css.substring(0, 500) + '...',
      }
    } catch (err) {
      diagnostics.generatedCSS = {
        success: false,
        error: err instanceof Error ? err.message : String(err)
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      promoterSlug,
      diagnostics,
    }, { status: 200 })

  } catch (error) {
    console.error('[Debug] Theme resolution error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Diagnostic failed',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}

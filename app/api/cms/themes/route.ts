/**
 * CMS Themes API
 *
 * Endpoints for managing white-label themes:
 * - GET: List themes for a tenant
 * - POST: Create/import theme
 * - PUT: Update theme configuration
 * - DELETE: Archive/delete theme
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getThemeServer,
  getThemesByTenantServer,
  getActiveThemeServer,
  createThemeServer,
  updateThemeConfigServer,
  updateThemeAssetsServer,
  updateThemeTemplatesServer,
  publishThemeServer,
  archiveThemeServer,
  deleteThemeServer,
  generateThemeCSSServer,
} from '@/lib/services/themeAssetServiceServer'
import {
  ThemeVersionService,
  createVersion,
  getVersions,
  rollback,
  compareVersions,
} from '@/lib/services/themeVersionService'
import { parseThemeZip, confirmSlots } from '@/lib/services/templateParserService'
import { TenantTheme, ThemeConfig } from '@/lib/types/cms'

// ============================================================================
// GET - List themes or get specific theme
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const tenantId = searchParams.get('tenantId')
    const themeId = searchParams.get('themeId')

    // Get specific theme
    if (action === 'get' && themeId) {
      const theme = await getThemeServer(themeId)
      if (!theme) {
        return NextResponse.json({ error: 'Theme not found' }, { status: 404 })
      }
      return NextResponse.json({ theme })
    }

    // Get active theme for tenant
    if (action === 'active' && tenantId) {
      const theme = await getActiveThemeServer(tenantId)
      return NextResponse.json({ theme })
    }

    // Get theme CSS
    if (action === 'css' && themeId) {
      const theme = await getThemeServer(themeId)
      if (!theme) {
        return NextResponse.json({ error: 'Theme not found' }, { status: 404 })
      }
      const css = generateThemeCSSServer(theme.config)
      return new NextResponse(css, {
        headers: { 'Content-Type': 'text/css' },
      })
    }

    // Get theme versions
    if (action === 'versions' && themeId) {
      const versions = await getVersions(themeId)
      return NextResponse.json({ versions })
    }

    // List all themes for tenant
    if (tenantId) {
      const themes = await getThemesByTenantServer(tenantId)
      return NextResponse.json({ themes })
    }

    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  } catch (error) {
    console.error('GET /api/cms/themes error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch themes'
    const errorDetails = error instanceof Error ? error.stack : String(error)
    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Create theme, import, publish, or rollback
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, tenantId, themeId, userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    switch (action) {
      // Create new empty theme
      case 'create': {
        const { themeName, themeSource, themeforestId, licenseType } = body
        if (!tenantId || !themeName) {
          return NextResponse.json(
            { error: 'Tenant ID and theme name required' },
            { status: 400 }
          )
        }

        const theme = await createThemeServer(tenantId, themeName, userId, {
          themeSource,
          themeforestId,
          licenseType,
        })

        return NextResponse.json({ theme }, { status: 201 })
      }

      // Publish theme (set as active)
      case 'publish': {
        if (!themeId) {
          return NextResponse.json({ error: 'Theme ID required' }, { status: 400 })
        }

        // Create version before publishing
        const { changelog } = body
        await createVersion(themeId, userId, changelog || 'Published theme')

        // Publish
        await publishThemeServer(themeId, userId)

        const theme = await getThemeServer(themeId)
        return NextResponse.json({ theme, message: 'Theme published successfully' })
      }

      // Archive theme
      case 'archive': {
        if (!themeId) {
          return NextResponse.json({ error: 'Theme ID required' }, { status: 400 })
        }

        await archiveThemeServer(themeId, userId)
        return NextResponse.json({ message: 'Theme archived successfully' })
      }

      // Rollback to previous version
      case 'rollback': {
        const { versionId } = body
        if (!themeId || !versionId) {
          return NextResponse.json(
            { error: 'Theme ID and version ID required' },
            { status: 400 }
          )
        }

        await rollback(themeId, versionId, userId)
        const theme = await getThemeServer(themeId)
        return NextResponse.json({ theme, message: 'Rollback successful' })
      }

      // Compare versions
      case 'compare': {
        const { versionId1, versionId2 } = body
        if (!versionId1 || !versionId2) {
          return NextResponse.json(
            { error: 'Two version IDs required' },
            { status: 400 }
          )
        }

        const diff = await compareVersions(versionId1, versionId2)
        return NextResponse.json({ diff })
      }

      // Create version snapshot
      case 'snapshot': {
        if (!themeId) {
          return NextResponse.json({ error: 'Theme ID required' }, { status: 400 })
        }

        const { changelog } = body
        const version = await createVersion(themeId, userId, changelog)
        return NextResponse.json({ version })
      }

      // Confirm template slots
      case 'confirmSlots': {
        const { detectedSlots, templates } = body
        if (!themeId || !templates) {
          return NextResponse.json(
            { error: 'Theme ID and templates required' },
            { status: 400 }
          )
        }

        await updateThemeTemplatesServer(themeId, templates, userId)
        const theme = await getThemeServer(themeId)
        return NextResponse.json({ theme })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('POST /api/cms/themes error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PUT - Update theme configuration
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { themeId, userId, config, assets, templates } = body

    if (!themeId || !userId) {
      return NextResponse.json(
        { error: 'Theme ID and user ID required' },
        { status: 400 }
      )
    }

    // Update config if provided
    if (config) {
      await updateThemeConfigServer(themeId, config, userId)
    }

    // Update assets if provided
    if (assets) {
      await updateThemeAssetsServer(themeId, assets, userId)
    }

    // Update templates if provided
    if (templates) {
      await updateThemeTemplatesServer(themeId, templates, userId)
    }

    const theme = await getThemeServer(themeId)
    return NextResponse.json({ theme, message: 'Theme updated successfully' })
  } catch (error) {
    console.error('PUT /api/cms/themes error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Delete theme
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const themeId = searchParams.get('themeId')
    const permanent = searchParams.get('permanent') === 'true'

    if (!themeId) {
      return NextResponse.json({ error: 'Theme ID required' }, { status: 400 })
    }

    if (permanent) {
      // Permanently delete theme and all assets
      await deleteThemeServer(themeId)
      return NextResponse.json({ message: 'Theme permanently deleted' })
    } else {
      // Soft delete (archive)
      // Get userId from auth header or body
      const userId = request.headers.get('x-user-id') || 'system'
      await archiveThemeServer(themeId, userId)
      return NextResponse.json({ message: 'Theme archived' })
    }
  } catch (error) {
    console.error('DELETE /api/cms/themes error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    )
  }
}

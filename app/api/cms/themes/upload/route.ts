/**
 * CMS Themes Upload API
 *
 * Handles file uploads for themes:
 * - ZIP file import (full theme)
 * - Individual asset uploads (CSS, JS, images, fonts)
 * - Parse ZIP for template detection
 *
 * Uses Firebase Admin SDK for server-side operations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { importThemeFromZipServer, uploadThemeAssetServer } from '@/lib/services/themeAssetServiceServer'
import { parseThemeZip } from '@/lib/services/templateParserService'
import { MAX_FILE_SIZES } from '@/lib/types/cms'

// ============================================================================
// POST - Upload theme files
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const action = formData.get('action') as string
    const tenantId = formData.get('tenantId') as string
    const themeId = formData.get('themeId') as string
    const userId = formData.get('userId') as string

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    switch (action) {
      // Import theme from ZIP
      case 'importZip': {
        const file = formData.get('file') as File
        const themeName = formData.get('themeName') as string

        if (!file || !tenantId || !themeName) {
          return NextResponse.json(
            { error: 'File, tenant ID, and theme name required' },
            { status: 400 }
          )
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZES.zip) {
          return NextResponse.json(
            { error: `ZIP file too large. Maximum size is ${MAX_FILE_SIZES.zip / 1024 / 1024}MB` },
            { status: 400 }
          )
        }

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.zip')) {
          return NextResponse.json(
            { error: 'Only ZIP files are accepted' },
            { status: 400 }
          )
        }

        // Convert File to ArrayBuffer for server-side processing
        const zipBuffer = await file.arrayBuffer()
        const theme = await importThemeFromZipServer(tenantId, zipBuffer, themeName, userId)
        return NextResponse.json({
          theme,
          message: 'Theme imported successfully',
        })
      }

      // Parse ZIP for preview (without importing)
      case 'parseZip': {
        const file = formData.get('file') as File

        if (!file) {
          return NextResponse.json({ error: 'File required' }, { status: 400 })
        }

        if (file.size > MAX_FILE_SIZES.zip) {
          return NextResponse.json(
            { error: `ZIP file too large. Maximum size is ${MAX_FILE_SIZES.zip / 1024 / 1024}MB` },
            { status: 400 }
          )
        }

        const result = await parseThemeZip(file)
        return NextResponse.json({
          result,
          message: 'Theme parsed successfully',
        })
      }

      // Upload individual asset
      case 'uploadAsset': {
        const file = formData.get('file') as File
        const subPath = formData.get('subPath') as string || 'misc'

        if (!file || !themeId) {
          return NextResponse.json(
            { error: 'File and theme ID required' },
            { status: 400 }
          )
        }

        // Convert File to Buffer for server-side processing
        const arrayBuffer = await file.arrayBuffer()
        const fileBuffer = Buffer.from(arrayBuffer)
        const url = await uploadThemeAssetServer(themeId, fileBuffer, file.name, file.type, subPath)
        return NextResponse.json({
          url,
          filename: file.name,
          message: 'Asset uploaded successfully',
        })
      }

      // Upload multiple assets
      case 'uploadAssets': {
        const files = formData.getAll('files') as File[]
        const subPath = formData.get('subPath') as string || 'misc'

        if (!files.length || !themeId) {
          return NextResponse.json(
            { error: 'Files and theme ID required' },
            { status: 400 }
          )
        }

        const results: { filename: string; url: string; error?: string }[] = []

        for (const file of files) {
          try {
            // Convert File to Buffer for server-side processing
            const arrayBuffer = await file.arrayBuffer()
            const fileBuffer = Buffer.from(arrayBuffer)
            const url = await uploadThemeAssetServer(themeId, fileBuffer, file.name, file.type, subPath)
            results.push({ filename: file.name, url })
          } catch (error) {
            results.push({
              filename: file.name,
              url: '',
              error: error instanceof Error ? error.message : 'Upload failed',
            })
          }
        }

        const successCount = results.filter(r => r.url).length
        return NextResponse.json({
          results,
          message: `${successCount} of ${files.length} files uploaded successfully`,
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('POST /api/cms/themes/upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Upload failed'
    const errorDetails = error instanceof Error ? error.stack : String(error)
    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        code: (error as any)?.code
      },
      { status: 500 }
    )
  }
}

// Route segment config for large file uploads
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds for large file processing

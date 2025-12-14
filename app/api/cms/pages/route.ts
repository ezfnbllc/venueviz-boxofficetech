/**
 * CMS Pages API
 *
 * Endpoints for managing white-label pages:
 * - GET: List pages or get specific page
 * - POST: Create page, add section, manage translations
 * - PUT: Update page, sections, SEO
 * - DELETE: Delete page
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  CMSPageService,
  createPage,
  getPage,
  getPagesByTenant,
  getPublishedPages,
  getPageBySlug,
  updatePage,
  updatePageSEO,
  updatePageSections,
  addSection,
  removeSection,
  updateSection,
  reorderSections,
  publishPage,
  unpublishPage,
  deletePage,
  duplicatePage,
  addLanguage,
  updateTranslation,
  publishTranslation,
  removeLanguage,
} from '@/lib/services/cmsPageService'
import { SectionType } from '@/lib/types/cms'

// ============================================================================
// GET - List pages or get specific page
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const tenantId = searchParams.get('tenantId')
    const pageId = searchParams.get('pageId')
    const slug = searchParams.get('slug')

    // Get specific page
    if (action === 'get' && pageId) {
      const page = await getPage(pageId)
      if (!page) {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 })
      }
      return NextResponse.json({ page })
    }

    // Get page by slug
    if (action === 'getBySlug' && tenantId && slug) {
      const page = await getPageBySlug(tenantId, slug)
      if (!page) {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 })
      }
      return NextResponse.json({ page })
    }

    // Get published pages only
    if (action === 'published' && tenantId) {
      const pages = await getPublishedPages(tenantId)
      return NextResponse.json({ pages })
    }

    // List all pages for tenant
    if (tenantId) {
      const pages = await getPagesByTenant(tenantId)
      return NextResponse.json({ pages })
    }

    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  } catch (error) {
    console.error('GET /api/cms/pages error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch pages' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Create page, add section, manage translations
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, tenantId, themeId, pageId, userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 401 })
    }

    switch (action) {
      // Create new page
      case 'create': {
        const { title, slug, type, systemType, templateId } = body
        if (!tenantId || !themeId || !title || !slug) {
          return NextResponse.json(
            { error: 'Tenant ID, theme ID, title, and slug required' },
            { status: 400 }
          )
        }

        const page = await createPage(tenantId, themeId, {
          title,
          slug,
          type,
          systemType,
          templateId,
        }, userId)

        return NextResponse.json({ page }, { status: 201 })
      }

      // Add section to page
      case 'addSection': {
        const { sectionType, position } = body
        if (!pageId || !sectionType) {
          return NextResponse.json(
            { error: 'Page ID and section type required' },
            { status: 400 }
          )
        }

        const section = await addSection(pageId, sectionType as SectionType, userId, position)
        const page = await getPage(pageId)
        return NextResponse.json({ section, page })
      }

      // Remove section
      case 'removeSection': {
        const { sectionId } = body
        if (!pageId || !sectionId) {
          return NextResponse.json(
            { error: 'Page ID and section ID required' },
            { status: 400 }
          )
        }

        await removeSection(pageId, sectionId, userId)
        const page = await getPage(pageId)
        return NextResponse.json({ page, message: 'Section removed' })
      }

      // Reorder sections
      case 'reorderSections': {
        const { sectionIds } = body
        if (!pageId || !sectionIds || !Array.isArray(sectionIds)) {
          return NextResponse.json(
            { error: 'Page ID and section IDs array required' },
            { status: 400 }
          )
        }

        await reorderSections(pageId, sectionIds, userId)
        const page = await getPage(pageId)
        return NextResponse.json({ page, message: 'Sections reordered' })
      }

      // Publish page
      case 'publish': {
        if (!pageId) {
          return NextResponse.json({ error: 'Page ID required' }, { status: 400 })
        }

        await publishPage(pageId, userId)
        const page = await getPage(pageId)
        return NextResponse.json({ page, message: 'Page published' })
      }

      // Unpublish page
      case 'unpublish': {
        if (!pageId) {
          return NextResponse.json({ error: 'Page ID required' }, { status: 400 })
        }

        await unpublishPage(pageId, userId)
        const page = await getPage(pageId)
        return NextResponse.json({ page, message: 'Page unpublished' })
      }

      // Duplicate page
      case 'duplicate': {
        const { newSlug } = body
        if (!pageId || !newSlug) {
          return NextResponse.json(
            { error: 'Page ID and new slug required' },
            { status: 400 }
          )
        }

        const page = await duplicatePage(pageId, newSlug, userId)
        return NextResponse.json({ page, message: 'Page duplicated' })
      }

      // Add language
      case 'addLanguage': {
        const { langCode, langName } = body
        if (!pageId || !langCode || !langName) {
          return NextResponse.json(
            { error: 'Page ID, language code, and name required' },
            { status: 400 }
          )
        }

        await addLanguage(pageId, langCode, langName, userId)
        const page = await getPage(pageId)
        return NextResponse.json({ page, message: 'Language added' })
      }

      // Publish translation
      case 'publishTranslation': {
        const { langCode } = body
        if (!pageId || !langCode) {
          return NextResponse.json(
            { error: 'Page ID and language code required' },
            { status: 400 }
          )
        }

        await publishTranslation(pageId, langCode, userId)
        const page = await getPage(pageId)
        return NextResponse.json({ page, message: 'Translation published' })
      }

      // Remove language
      case 'removeLanguage': {
        const { langCode } = body
        if (!pageId || !langCode) {
          return NextResponse.json(
            { error: 'Page ID and language code required' },
            { status: 400 }
          )
        }

        await removeLanguage(pageId, langCode, userId)
        const page = await getPage(pageId)
        return NextResponse.json({ page, message: 'Language removed' })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('POST /api/cms/pages error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PUT - Update page, sections, SEO
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { pageId, userId, action } = body

    if (!pageId || !userId) {
      return NextResponse.json(
        { error: 'Page ID and user ID required' },
        { status: 400 }
      )
    }

    switch (action) {
      // Update basic page info
      case 'updateInfo': {
        const { title, slug, description, showInNav, navOrder, navLabel, parentPageId } = body
        await updatePage(pageId, {
          title,
          slug,
          description,
          showInNav,
          navOrder,
          navLabel,
          parentPageId,
        }, userId)
        break
      }

      // Update SEO
      case 'updateSEO': {
        const { seo } = body
        if (!seo) {
          return NextResponse.json({ error: 'SEO data required' }, { status: 400 })
        }
        await updatePageSEO(pageId, seo, userId)
        break
      }

      // Update sections
      case 'updateSections': {
        const { sections } = body
        if (!sections) {
          return NextResponse.json({ error: 'Sections data required' }, { status: 400 })
        }
        await updatePageSections(pageId, sections, userId)
        break
      }

      // Update single section
      case 'updateSection': {
        const { sectionId, updates } = body
        if (!sectionId || !updates) {
          return NextResponse.json(
            { error: 'Section ID and updates required' },
            { status: 400 }
          )
        }
        await updateSection(pageId, sectionId, updates, userId)
        break
      }

      // Update translation
      case 'updateTranslation': {
        const { langCode, translation } = body
        if (!langCode || !translation) {
          return NextResponse.json(
            { error: 'Language code and translation data required' },
            { status: 400 }
          )
        }
        await updateTranslation(pageId, langCode, translation, userId)
        break
      }

      default:
        // Default: update basic page info
        const { title, slug, description, showInNav, navOrder } = body
        await updatePage(pageId, { title, slug, description, showInNav, navOrder }, userId)
    }

    const page = await getPage(pageId)
    return NextResponse.json({ page, message: 'Page updated successfully' })
  } catch (error) {
    console.error('PUT /api/cms/pages error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Delete page
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pageId = searchParams.get('pageId')

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID required' }, { status: 400 })
    }

    await deletePage(pageId)
    return NextResponse.json({ message: 'Page deleted successfully' })
  } catch (error) {
    console.error('DELETE /api/cms/pages error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    )
  }
}

/**
 * Email Queue Processor API
 *
 * POST /api/email/process
 *
 * Processes pending emails from the email_queue collection.
 * Can be called by a cron job or manually triggered.
 *
 * Query params:
 * - limit: Max emails to process (default 50)
 * - type: Filter by email type (optional)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { ResendService } from '@/lib/services/resendService'

const MAX_ATTEMPTS = 3

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const filterType = searchParams.get('type')

    // Optional API key protection for cron jobs
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!ResendService.isConfigured()) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 }
      )
    }

    const db = getAdminFirestore()

    // Query pending emails
    let query = db.collection('email_queue')
      .where('status', '==', 'pending')
      .limit(limit)

    if (filterType) {
      query = db.collection('email_queue')
        .where('status', '==', 'pending')
        .where('type', '==', filterType)
        .limit(limit)
    }

    const snapshot = await query.get()

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No pending emails to process',
      })
    }

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      retrying: 0,
      errors: [] as string[],
    }

    for (const doc of snapshot.docs) {
      const emailData = doc.data()
      results.processed++

      try {
        // Mark as processing
        await doc.ref.update({
          status: 'processing',
          processedAt: new Date(),
        })

        let emailResult = { success: false, error: 'Unknown email type' }

        // Process based on email type
        switch (emailData.type) {
          case 'password_reset_notification':
            emailResult = await processPasswordResetEmail(db, emailData)
            break

          case 'welcome_guest':
            emailResult = await processWelcomeEmail(db, emailData)
            break

          case 'order_confirmation':
            emailResult = await processOrderConfirmationEmail(db, emailData)
            break

          default:
            emailResult = { success: false, error: `Unknown email type: ${emailData.type}` }
        }

        if (emailResult.success) {
          // Mark as sent
          await doc.ref.update({
            status: 'sent',
            sentAt: new Date(),
            error: null,
          })
          results.sent++
        } else {
          // Check if we should retry
          const attempts = (emailData.attempts || 0) + 1
          if (attempts < MAX_ATTEMPTS) {
            await doc.ref.update({
              status: 'pending',
              attempts,
              lastError: emailResult.error,
              nextRetryAt: new Date(Date.now() + attempts * 60 * 1000), // Exponential backoff
            })
            results.retrying++
          } else {
            await doc.ref.update({
              status: 'failed',
              attempts,
              error: emailResult.error,
              failedAt: new Date(),
            })
            results.failed++
          }
          results.errors.push(`${emailData.type} to ${emailData.to}: ${emailResult.error}`)
        }
      } catch (error: any) {
        results.failed++
        results.errors.push(`${emailData.type}: ${error.message}`)

        await doc.ref.update({
          status: 'failed',
          error: error.message,
          failedAt: new Date(),
        })
      }
    }

    console.log(`[EmailQueue] Processed ${results.processed} emails: ${results.sent} sent, ${results.failed} failed, ${results.retrying} retrying`)

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error: any) {
    console.error('[EmailQueue] Error processing queue:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process email queue' },
      { status: 500 }
    )
  }
}

/**
 * Process password reset notification email
 */
async function processPasswordResetEmail(
  db: FirebaseFirestore.Firestore,
  emailData: FirebaseFirestore.DocumentData
): Promise<{ success: boolean; error?: string }> {
  const { to, promoterSlug, templateData } = emailData

  // Get promoter info
  let promoter = {
    name: 'BoxOfficeTech',
    slug: promoterSlug || 'bot',
    logo: undefined as string | undefined,
    primaryColor: '#6ac045',
    supportEmail: undefined as string | undefined,
  }

  if (promoterSlug) {
    const promoterSnapshot = await db.collection('promoters')
      .where('slug', '==', promoterSlug)
      .limit(1)
      .get()

    if (!promoterSnapshot.empty) {
      const promoterData = promoterSnapshot.docs[0].data()
      promoter = {
        name: promoterData.name || promoter.name,
        slug: promoterData.slug || promoter.slug,
        logo: promoterData.logo || promoterData.branding?.logo,
        primaryColor: promoterData.branding?.primaryColor || promoter.primaryColor,
        supportEmail: promoterData.email,
      }
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://boxofficetech.com'

  return ResendService.sendPasswordResetNotification({
    customerName: templateData?.firstName || 'Customer',
    customerEmail: to,
    newPassword: templateData?.newPassword || '',
    loginUrl: templateData?.loginUrl || `${baseUrl}/p/${promoter.slug}/login`,
    promoter,
  })
}

/**
 * Process welcome email for new guest accounts
 */
async function processWelcomeEmail(
  db: FirebaseFirestore.Firestore,
  emailData: FirebaseFirestore.DocumentData
): Promise<{ success: boolean; error?: string }> {
  const { to, promoterSlug, templateData } = emailData

  // Get promoter info
  let promoter = {
    name: 'BoxOfficeTech',
    slug: promoterSlug || 'bot',
    logo: undefined as string | undefined,
    primaryColor: '#6ac045',
    supportEmail: undefined as string | undefined,
  }

  if (promoterSlug) {
    const promoterSnapshot = await db.collection('promoters')
      .where('slug', '==', promoterSlug)
      .limit(1)
      .get()

    if (!promoterSnapshot.empty) {
      const promoterData = promoterSnapshot.docs[0].data()
      promoter = {
        name: promoterData.name || promoter.name,
        slug: promoterData.slug || promoter.slug,
        logo: promoterData.logo || promoterData.branding?.logo,
        primaryColor: promoterData.branding?.primaryColor || promoter.primaryColor,
        supportEmail: promoterData.email,
      }
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://boxofficetech.com'

  return ResendService.sendWelcomeEmail({
    customerName: templateData?.firstName || 'Customer',
    customerEmail: to,
    loginUrl: templateData?.loginUrl || `${baseUrl}/p/${promoter.slug}`,
    promoter,
  })
}

/**
 * Process order confirmation email
 */
async function processOrderConfirmationEmail(
  db: FirebaseFirestore.Firestore,
  emailData: FirebaseFirestore.DocumentData
): Promise<{ success: boolean; error?: string }> {
  const { to, templateData, promoterSlug } = emailData

  // Get promoter info
  let promoter = {
    name: 'BoxOfficeTech',
    slug: promoterSlug || 'bot',
    logo: undefined as string | undefined,
    primaryColor: '#6ac045',
    supportEmail: undefined as string | undefined,
  }

  if (promoterSlug) {
    const promoterSnapshot = await db.collection('promoters')
      .where('slug', '==', promoterSlug)
      .limit(1)
      .get()

    if (!promoterSnapshot.empty) {
      const promoterData = promoterSnapshot.docs[0].data()
      promoter = {
        name: promoterData.name || promoter.name,
        slug: promoterData.slug || promoter.slug,
        logo: promoterData.logo || promoterData.branding?.logo,
        primaryColor: promoterData.branding?.primaryColor || promoter.primaryColor,
        supportEmail: promoterData.email,
      }
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://boxofficetech.com'

  return ResendService.sendOrderConfirmation({
    orderId: templateData?.orderId || '',
    customerName: templateData?.customerName || 'Customer',
    customerEmail: to,
    eventName: templateData?.eventName || 'Event',
    eventDate: templateData?.eventDate || 'Date TBD',
    eventTime: templateData?.eventTime,
    venueName: templateData?.venueName,
    venueAddress: templateData?.venueAddress,
    tickets: templateData?.tickets || [],
    subtotal: templateData?.subtotal || 0,
    serviceFee: templateData?.serviceFee || 0,
    total: templateData?.total || 0,
    currency: templateData?.currency || 'usd',
    qrCodeUrl: templateData?.qrCodeUrl,
    orderUrl: templateData?.orderUrl || `${baseUrl}/p/${promoter.slug}/orders/${templateData?.orderId}`,
    promoter,
  })
}

// Also expose a GET endpoint to check queue status
export async function GET(request: NextRequest) {
  try {
    const db = getAdminFirestore()

    // Get counts by status
    const [pending, processing, sent, failed] = await Promise.all([
      db.collection('email_queue').where('status', '==', 'pending').count().get(),
      db.collection('email_queue').where('status', '==', 'processing').count().get(),
      db.collection('email_queue').where('status', '==', 'sent').count().get(),
      db.collection('email_queue').where('status', '==', 'failed').count().get(),
    ])

    return NextResponse.json({
      success: true,
      stats: {
        pending: pending.data().count,
        processing: processing.data().count,
        sent: sent.data().count,
        failed: failed.data().count,
      },
      configured: ResendService.isConfigured(),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * Email Send API
 *
 * POST /api/email/send
 *
 * Sends queued emails via Resend.
 * Used by the admin email queue management page.
 *
 * Body:
 * - emailId: Single email ID to send
 * - emailIds: Array of email IDs to send (bulk)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFirestore } from '@/lib/firebase-admin'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { emailId, emailIds } = body

    if (!resend) {
      return NextResponse.json(
        { success: false, error: 'Resend not configured - add RESEND_API_KEY' },
        { status: 503 }
      )
    }

    const db = getAdminFirestore()
    const idsToSend = emailIds || (emailId ? [emailId] : [])

    if (idsToSend.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No email IDs provided' },
        { status: 400 }
      )
    }

    const results = {
      total: idsToSend.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const id of idsToSend) {
      try {
        const emailDoc = await db.collection('email_queue').doc(id).get()

        if (!emailDoc.exists) {
          results.failed++
          results.errors.push(`Email ${id} not found`)
          continue
        }

        const emailData = emailDoc.data()!

        // Skip if not pending or failed (can retry failed)
        if (emailData.status !== 'pending' && emailData.status !== 'failed') {
          results.failed++
          results.errors.push(`Email ${id} is ${emailData.status}, not sendable`)
          continue
        }

        // Mark as sending
        await emailDoc.ref.update({
          status: 'approved',
          updatedAt: new Date(),
        })

        // Send via Resend
        const { data, error } = await resend.emails.send({
          from: `${emailData.from.name} <${emailData.from.email}>`,
          to: emailData.toName
            ? `${emailData.toName} <${emailData.to}>`
            : emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        })

        if (error) {
          await emailDoc.ref.update({
            status: 'failed',
            error: error.message,
            attempts: (emailData.attempts || 0) + 1,
            updatedAt: new Date(),
          })
          results.failed++
          results.errors.push(`${emailData.to}: ${error.message}`)
        } else {
          await emailDoc.ref.update({
            status: 'sent',
            sentAt: new Date(),
            messageId: data?.id,
            error: null,
            updatedAt: new Date(),
          })
          results.sent++
          console.log(`[EmailSend] Sent email ${id} to ${emailData.to}`)
        }
      } catch (error: any) {
        results.failed++
        results.errors.push(`${id}: ${error.message}`)

        // Update status to failed
        try {
          await db.collection('email_queue').doc(id).update({
            status: 'failed',
            error: error.message,
            updatedAt: new Date(),
          })
        } catch {}
      }
    }

    return NextResponse.json({
      success: results.failed === 0,
      ...results,
    })
  } catch (error: any) {
    console.error('[EmailSend] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}

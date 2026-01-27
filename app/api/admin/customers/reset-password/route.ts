/**
 * Admin Customer Password Reset API
 *
 * POST /api/admin/customers/reset-password
 *
 * Allows admins to set/reset a customer's password directly.
 * Uses Firebase Admin SDK to update the password.
 * Sends notification email via Resend when sendEmail is true.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin'
import { ResendService } from '@/lib/services/resendService'

export async function POST(request: NextRequest) {
  try {
    const { customerId, firebaseUid, newPassword, sendEmail } = await request.json()

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const auth = getAdminAuth()
    const db = getAdminFirestore()

    // Get customer document to find firebaseUid and promoter info
    let uid = firebaseUid
    let customerEmail = ''
    let customerName = ''
    let promoterSlug = ''
    let promoterId = ''

    // Always fetch customer to get promoter info for email
    const customerDoc = await db.collection('customers').doc(customerId).get()
    if (!customerDoc.exists) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    const customerData = customerDoc.data()
    uid = uid || customerData?.firebaseUid
    customerEmail = customerData?.email || ''
    customerName = customerData?.firstName || customerData?.name || ''
    promoterSlug = customerData?.promoterSlug || ''
    promoterId = customerData?.promoterId || ''

    if (!uid) {
      // No Firebase user exists, need to create one
      if (!customerEmail) {
        return NextResponse.json(
          { error: 'Customer has no email address' },
          { status: 400 }
        )
      }

      try {
        // Try to get existing user by email
        const existingUser = await auth.getUserByEmail(customerEmail)
        uid = existingUser.uid
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          // Create new Firebase user
          const newUser = await auth.createUser({
            email: customerEmail,
            password: newPassword,
            displayName: customerName || customerEmail.split('@')[0],
            emailVerified: false,
          })
          uid = newUser.uid

          // Update customer document with new firebaseUid
          await db.collection('customers').doc(customerId).update({
            firebaseUid: uid,
            isGuest: false,
            needsPasswordReset: false,
            updatedAt: new Date(),
          })

          // Send email notification if requested
          if (sendEmail && customerEmail) {
            await sendPasswordEmail(db, customerEmail, customerName, newPassword, promoterSlug, promoterId)
          }

          return NextResponse.json({
            success: true,
            message: 'Firebase account created and password set',
            userCreated: true,
            emailSent: sendEmail && customerEmail ? true : false,
          })
        }
        throw error
      }
    }

    // Update the password for existing user
    await auth.updateUser(uid, {
      password: newPassword,
    })

    // Update customer document
    await db.collection('customers').doc(customerId).update({
      firebaseUid: uid,
      isGuest: false,
      needsPasswordReset: false,
      updatedAt: new Date(),
    })

    // Send password reset email notification
    let emailSent = false
    if (sendEmail && customerEmail) {
      emailSent = await sendPasswordEmail(db, customerEmail, customerName, newPassword, promoterSlug, promoterId)
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      emailSent,
    })

  } catch (error: any) {
    console.error('Error resetting customer password:', error)

    if (error.code === 'auth/invalid-password') {
      return NextResponse.json(
        { error: 'Password is too weak. Use at least 6 characters.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to reset password' },
      { status: 500 }
    )
  }
}

/**
 * Helper to send password reset email with promoter branding
 */
async function sendPasswordEmail(
  db: FirebaseFirestore.Firestore,
  email: string,
  name: string,
  password: string,
  promoterSlug: string,
  promoterId: string
): Promise<boolean> {
  try {
    // Get promoter info for branding
    let promoter = {
      name: 'BoxOfficeTech',
      slug: promoterSlug || 'bot',
      logo: undefined as string | undefined,
      primaryColor: '#6ac045',
      supportEmail: undefined as string | undefined,
    }

    if (promoterId || promoterSlug) {
      const promoterQuery = promoterId
        ? await db.collection('promoters').doc(promoterId).get()
        : await db.collection('promoters').where('slug', '==', promoterSlug).limit(1).get()

      const promoterDoc = promoterId
        ? promoterQuery
        : (promoterQuery as FirebaseFirestore.QuerySnapshot).docs[0]

      if (promoterDoc?.exists) {
        const data = promoterId
          ? (promoterDoc as FirebaseFirestore.DocumentSnapshot).data()
          : promoterDoc.data()
        promoter = {
          name: data?.name || promoter.name,
          slug: data?.slug || promoter.slug,
          logo: data?.logo || data?.branding?.logo,
          primaryColor: data?.branding?.primaryColor || data?.primaryColor || promoter.primaryColor,
          supportEmail: data?.email || data?.supportEmail,
        }
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://boxofficetech.com'
    const loginUrl = `${baseUrl}/p/${promoter.slug}/login`

    const result = await ResendService.sendPasswordResetNotification({
      customerName: name,
      customerEmail: email,
      newPassword: password,
      loginUrl,
      promoter,
    })

    if (result.success) {
      console.log(`[PasswordReset] Email sent successfully to ${email}`)
    } else {
      console.error(`[PasswordReset] Failed to send email: ${result.error}`)
    }

    return result.success
  } catch (error) {
    console.error('[PasswordReset] Error sending email:', error)
    return false
  }
}

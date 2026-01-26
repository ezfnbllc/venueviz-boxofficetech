/**
 * Admin Customer Password Reset API
 *
 * POST /api/admin/customers/reset-password
 *
 * Allows admins to set/reset a customer's password directly.
 * Uses Firebase Admin SDK to update the password.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin'

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

    // Get customer document to find firebaseUid if not provided
    let uid = firebaseUid
    let customerEmail = ''
    let customerName = ''

    if (!uid) {
      const customerDoc = await db.collection('customers').doc(customerId).get()
      if (!customerDoc.exists) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        )
      }
      const customerData = customerDoc.data()
      uid = customerData?.firebaseUid
      customerEmail = customerData?.email || ''
      customerName = customerData?.firstName || customerData?.name || ''
    }

    if (!uid) {
      // No Firebase user exists, need to create one
      const customerDoc = await db.collection('customers').doc(customerId).get()
      const customerData = customerDoc.data()

      if (!customerData?.email) {
        return NextResponse.json(
          { error: 'Customer has no email address' },
          { status: 400 }
        )
      }

      customerEmail = customerData.email
      customerName = customerData.firstName || customerData.name || ''

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

          return NextResponse.json({
            success: true,
            message: 'Firebase account created and password set',
            userCreated: true,
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

    // Optionally send password reset email notification
    if (sendEmail && customerEmail) {
      // Queue email for sending (you can integrate with your email service)
      await db.collection('email_queue').add({
        type: 'password_reset_notification',
        to: customerEmail,
        templateData: {
          firstName: customerName || 'Customer',
          email: customerEmail,
          newPassword: newPassword, // Only include if you want to send the password
        },
        status: 'pending',
        createdAt: new Date(),
        attempts: 0,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
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

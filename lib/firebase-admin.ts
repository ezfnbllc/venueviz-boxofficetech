/**
 * Firebase Admin SDK
 *
 * Used for server-side operations in API routes.
 * This bypasses Firestore security rules since it uses service account credentials.
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getStorage, Storage } from 'firebase-admin/storage'

let adminApp: App | null = null
let adminDb: Firestore | null = null
let adminStorage: Storage | null = null

function getAdminApp(): App {
  if (adminApp) return adminApp

  const apps = getApps()
  if (apps.length > 0) {
    adminApp = apps[0]
    return adminApp
  }

  // Try to get credentials from environment variables first (for Vercel)
  const projectId = process.env.FIREBASE_PROJECT_ID || 'venueviz'
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (clientEmail && privateKey) {
    // Use environment variables
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: `${projectId}.firebasestorage.app`,
    })
  } else {
    // Fallback to service account file for local development
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const serviceAccount = require('../scripts/serviceAccountKey.json')
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
      })
    } catch {
      // If no service account file, initialize without credentials
      // This will only work if running in a Google Cloud environment
      adminApp = initializeApp({
        projectId,
        storageBucket: `${projectId}.firebasestorage.app`,
      })
    }
  }

  return adminApp
}

export function getAdminDb(): Firestore {
  if (adminDb) return adminDb
  adminDb = getFirestore(getAdminApp())
  return adminDb
}

export function getAdminStorage(): Storage {
  if (adminStorage) return adminStorage
  adminStorage = getStorage(getAdminApp())
  return adminStorage
}

// Export for convenience
export { getAdminApp }

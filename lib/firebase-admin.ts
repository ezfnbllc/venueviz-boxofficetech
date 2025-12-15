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

/**
 * Format the private key properly for different environments
 * Handles both escaped newlines (\n as string) and actual newlines
 */
function formatPrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined

  // If the key contains literal \n (as 2 characters), replace with actual newlines
  // This handles the case when the key is stored in env vars with escaped newlines
  let formattedKey = key

  // Replace escaped newlines (\\n becomes \n)
  if (key.includes('\\n')) {
    formattedKey = key.replace(/\\n/g, '\n')
  }

  // Also handle the case where it might be double-escaped
  if (formattedKey.includes('\\n')) {
    formattedKey = formattedKey.replace(/\\n/g, '\n')
  }

  return formattedKey
}

function getAdminApp(): App {
  if (adminApp) return adminApp

  const apps = getApps()
  if (apps.length > 0) {
    adminApp = apps[0]
    return adminApp
  }

  // Option 1: Use FIREBASE_SERVICE_ACCOUNT_KEY (entire JSON as base64 or plain JSON)
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (serviceAccountKey) {
    try {
      // Try to parse as JSON first (plain JSON string)
      let serviceAccount
      try {
        serviceAccount = JSON.parse(serviceAccountKey)
      } catch {
        // If that fails, try base64 decoding first
        const decoded = Buffer.from(serviceAccountKey, 'base64').toString('utf-8')
        serviceAccount = JSON.parse(decoded)
      }

      adminApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
      })
      return adminApp
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error)
    }
  }

  // Option 2: Use individual environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID || 'venueviz'
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY)

  if (clientEmail && privateKey) {
    try {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket: `${projectId}.firebasestorage.app`,
      })
      return adminApp
    } catch (error) {
      console.error('Failed to initialize Firebase Admin with env vars:', error)
    }
  }

  // Option 3: Fallback to service account file for local development
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require('../scripts/serviceAccountKey.json')
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
    })
  } catch (error) {
    console.error('Failed to initialize Firebase Admin with service account file:', error)
    // Last resort: initialize without credentials (only works in GCP environment)
    adminApp = initializeApp({
      projectId,
      storageBucket: `${projectId}.firebasestorage.app`,
    })
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

/**
 * Firebase Admin SDK
 *
 * Used for server-side operations in API routes.
 * This bypasses Firestore security rules since it uses service account credentials.
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getStorage, Storage } from 'firebase-admin/storage'
import { getAuth, Auth } from 'firebase-admin/auth'

let adminApp: App | null = null
let adminDb: Firestore | null = null
let adminStorage: Storage | null = null
let adminAuth: Auth | null = null
let initializationError: Error | null = null

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
  // If we already have an app, return it
  if (adminApp) return adminApp

  // If we previously failed to initialize, throw the error
  if (initializationError) {
    throw initializationError
  }

  const apps = getApps()
  if (apps.length > 0) {
    adminApp = apps[0]
    return adminApp
  }

  const errors: string[] = []

  // Option 1: Use FIREBASE_SERVICE_ACCOUNT_KEY (entire JSON as base64 or plain JSON)
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (serviceAccountKey) {
    console.log('[Firebase Admin] Attempting initialization with FIREBASE_SERVICE_ACCOUNT_KEY')
    console.log('[Firebase Admin] Key length:', serviceAccountKey.length)
    console.log('[Firebase Admin] Key starts with:', serviceAccountKey.substring(0, 20) + '...')

    try {
      // Try to parse as JSON first (plain JSON string)
      let serviceAccount
      let decodingMethod = 'direct JSON'

      try {
        serviceAccount = JSON.parse(serviceAccountKey)
        console.log('[Firebase Admin] Parsed as direct JSON')
      } catch {
        // If that fails, try base64 decoding first
        decodingMethod = 'base64'
        console.log('[Firebase Admin] Direct JSON parse failed, trying base64 decode')
        const decoded = Buffer.from(serviceAccountKey, 'base64').toString('utf-8')
        console.log('[Firebase Admin] Base64 decoded length:', decoded.length)
        serviceAccount = JSON.parse(decoded)
        console.log('[Firebase Admin] Parsed as base64-encoded JSON')
      }

      console.log('[Firebase Admin] Service account project_id:', serviceAccount.project_id)
      console.log('[Firebase Admin] Service account client_email:', serviceAccount.client_email)
      console.log('[Firebase Admin] Private key length:', serviceAccount.private_key?.length || 0)
      console.log('[Firebase Admin] Private key starts with:', serviceAccount.private_key?.substring(0, 30) || 'N/A')

      // Determine the correct storage bucket format
      // Firebase projects created after Sept 2023 use .firebasestorage.app
      // Older projects use .appspot.com
      const storageBucket = process.env.FIREBASE_STORAGE_BUCKET ||
        `${serviceAccount.project_id}.firebasestorage.app`

      adminApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket,
      })

      console.log('[Firebase Admin] Successfully initialized with', decodingMethod)
      return adminApp
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', errorMsg)
      errors.push(`FIREBASE_SERVICE_ACCOUNT_KEY: ${errorMsg}`)
    }
  } else {
    console.log('[Firebase Admin] FIREBASE_SERVICE_ACCOUNT_KEY not set')
    errors.push('FIREBASE_SERVICE_ACCOUNT_KEY not set')
  }

  // Option 2: Use individual environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID || 'venueviz'
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY)

  if (clientEmail && privateKey) {
    console.log('[Firebase Admin] Attempting initialization with individual env vars')
    try {
      const storageBucket = process.env.FIREBASE_STORAGE_BUCKET ||
        `${projectId}.firebasestorage.app`

      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket,
      })
      console.log('[Firebase Admin] Successfully initialized with env vars')
      return adminApp
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('[Firebase Admin] Failed to initialize with env vars:', errorMsg)
      errors.push(`Individual env vars: ${errorMsg}`)
    }
  } else {
    console.log('[Firebase Admin] Individual env vars not complete (clientEmail:', !!clientEmail, ', privateKey:', !!privateKey, ')')
    errors.push('Individual env vars not complete')
  }

  // Option 3: Fallback to service account file for local development
  console.log('[Firebase Admin] Attempting fallback to service account file')
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require('../scripts/serviceAccountKey.json')
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET ||
      `${serviceAccount.project_id}.firebasestorage.app`

    adminApp = initializeApp({
      credential: cert(serviceAccount),
      storageBucket,
    })
    console.log('[Firebase Admin] Successfully initialized with service account file')
    return adminApp
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[Firebase Admin] Failed to load service account file:', errorMsg)
    errors.push(`Service account file: ${errorMsg}`)
  }

  // All methods failed - throw an error with all attempts
  initializationError = new Error(
    `Failed to initialize Firebase Admin SDK. Attempts:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
  )
  throw initializationError
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

export function getAdminAuth(): Auth {
  if (adminAuth) return adminAuth
  adminAuth = getAuth(getAdminApp())
  return adminAuth
}

// Aliases for compatibility
export const getAdminFirestore = getAdminDb

// Export for convenience
export { getAdminApp }

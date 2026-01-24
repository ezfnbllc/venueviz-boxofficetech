/**
 * Google Wallet Module
 * Provides digital ticket delivery via Google Wallet API
 *
 * Usage:
 *   import { createEventTicketPass, isGoogleWalletConfigured } from '@/lib/google-wallet'
 *
 * Required Environment Variables:
 *   - GOOGLE_WALLET_ISSUER_ID: Your Google Wallet issuer ID
 *   - GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL: Service account email
 *   - GOOGLE_WALLET_PRIVATE_KEY: Service account private key (PEM format)
 *   - GOOGLE_WALLET_ORIGINS: (Optional) Comma-separated list of allowed origins
 */

export {
  createEventTicketPass,
  createPassesForOrder,
  createEventTicketClass,
  createEventTicketObject,
  generateSaveJwt,
  generateSaveUrl,
  isGoogleWalletConfigured,
} from './walletService'

export type {
  EventTicketClass,
  EventTicketObject,
  CreatePassRequest,
  CreatePassResponse,
  GoogleWalletConfig,
  SeatInfo,
  Barcode,
  LocalizedString,
} from './types'

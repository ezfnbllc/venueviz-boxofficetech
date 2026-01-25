/**
 * Wallet Buttons Component
 *
 * Displays "Add to Wallet" buttons for Google Wallet and Apple Wallet.
 * This is a client component that handles API calls for pass generation.
 */

'use client'

import { useState, useEffect } from 'react'

interface WalletButtonsProps {
  orderId: string
  className?: string
}

export function WalletButtons({ orderId, className = '' }: WalletButtonsProps) {
  const [googleWalletUrl, setGoogleWalletUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [googleConfigured, setGoogleConfigured] = useState(false)

  useEffect(() => {
    async function initializeWallets() {
      setLoading(true)

      // Check Google Wallet configuration
      try {
        const configResponse = await fetch('/api/wallet/google')
        const configData = await configResponse.json()
        setGoogleConfigured(configData.configured)

        if (configData.configured) {
          // Generate Google Wallet pass
          const passResponse = await fetch('/api/wallet/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId }),
          })

          if (passResponse.ok) {
            const passData = await passResponse.json()
            // Get the first pass URL or the combined URL
            const url = passData.saveUrl || passData.passes?.[0]?.saveUrl
            if (url) {
              setGoogleWalletUrl(url)
            }
          } else {
            const errorData = await passResponse.json()
            console.error('Failed to generate Google Wallet pass:', errorData)
          }
        }
      } catch (err) {
        console.error('Error initializing wallets:', err)
        setError('Failed to load wallet options')
      } finally {
        setLoading(false)
      }
    }

    initializeWallets()
  }, [orderId])

  // Don't render anything if no wallets are configured
  if (!loading && !googleConfigured) {
    return null
  }

  return (
    <div className={`${className}`}>
      <span className="text-sm text-gray-500 dark:text-gray-400 block mb-3 text-center">
        Save Tickets to Wallet
      </span>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {/* Google Wallet Button */}
        {loading ? (
          <div className="inline-flex items-center justify-center h-12 px-6 bg-black rounded-lg">
            <svg className="animate-spin h-5 w-5 text-white mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-white text-sm">Loading...</span>
          </div>
        ) : googleConfigured && googleWalletUrl ? (
          <a
            href={googleWalletUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center h-12 px-6 bg-black hover:bg-gray-800 rounded-lg transition-colors"
          >
            {/* Google Wallet icon */}
            <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC04"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-white font-medium">Add to Google Wallet</span>
          </a>
        ) : null}

        {/* Apple Wallet Button (placeholder - requires Apple Developer account) */}
        <button
          disabled
          className="inline-flex items-center justify-center h-12 px-6 bg-black/50 rounded-lg cursor-not-allowed opacity-50"
          title="Apple Wallet coming soon"
        >
          <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="white">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          <span className="text-white font-medium">Add to Apple Wallet</span>
        </button>
      </div>

      {error && (
        <p className="text-center text-sm text-red-500 mt-2">{error}</p>
      )}
    </div>
  )
}

export default WalletButtons

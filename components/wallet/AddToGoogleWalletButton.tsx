/**
 * Add to Google Wallet Button
 *
 * Displays the official Google Wallet button that allows users
 * to save their event tickets to Google Wallet.
 *
 * Usage:
 *   <AddToGoogleWalletButton orderId="ORD-123" />
 *   <AddToGoogleWalletButton saveUrl="https://pay.google.com/gp/v/save/..." />
 */

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface AddToGoogleWalletButtonProps {
  orderId?: string
  ticketId?: string
  saveUrl?: string
  size?: 'small' | 'medium' | 'large'
  className?: string
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function AddToGoogleWalletButton({
  orderId,
  ticketId,
  saveUrl: propSaveUrl,
  size = 'medium',
  className = '',
  onSuccess,
  onError,
}: AddToGoogleWalletButtonProps) {
  const [saveUrl, setSaveUrl] = useState<string | null>(propSaveUrl || null)
  const [loading, setLoading] = useState(!propSaveUrl)
  const [error, setError] = useState<string | null>(null)
  const [configured, setConfigured] = useState<boolean | null>(null)

  // Check if Google Wallet is configured
  useEffect(() => {
    async function checkConfiguration() {
      try {
        const response = await fetch('/api/wallet/google')
        const data = await response.json()
        setConfigured(data.configured)

        if (!data.configured) {
          setError('Google Wallet is not configured')
          setLoading(false)
        }
      } catch {
        setConfigured(false)
        setError('Failed to check Google Wallet configuration')
        setLoading(false)
      }
    }

    if (!propSaveUrl) {
      checkConfiguration()
    } else {
      setConfigured(true)
      setLoading(false)
    }
  }, [propSaveUrl])

  // Fetch save URL if not provided
  useEffect(() => {
    async function fetchSaveUrl() {
      if (!orderId || propSaveUrl || configured === false) return

      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/wallet/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId,
            ...(ticketId && { ticketIds: [ticketId] }),
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to generate pass')
        }

        const data = await response.json()
        const url = ticketId
          ? data.passes?.find((p: { ticketId: string }) => p.ticketId === ticketId)?.saveUrl
          : data.saveUrl || data.passes?.[0]?.saveUrl

        if (url) {
          setSaveUrl(url)
          onSuccess?.()
        } else {
          throw new Error('No save URL returned')
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error.message)
        onError?.(error)
      } finally {
        setLoading(false)
      }
    }

    if (configured && orderId && !propSaveUrl) {
      fetchSaveUrl()
    }
  }, [orderId, ticketId, propSaveUrl, configured, onSuccess, onError])

  // Don't render if not configured
  if (configured === false) {
    return null
  }

  // Size variants
  const sizeClasses = {
    small: 'h-[40px]',
    medium: 'h-[48px]',
    large: 'h-[56px]',
  }

  // Loading state
  if (loading) {
    return (
      <div className={`inline-flex items-center justify-center ${sizeClasses[size]} px-4 bg-black rounded-md ${className}`}>
        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="ml-2 text-white text-sm">Loading...</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`inline-flex items-center ${sizeClasses[size]} px-4 text-gray-400 text-sm ${className}`}>
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Google Wallet unavailable
      </div>
    )
  }

  // No URL available
  if (!saveUrl) {
    return null
  }

  // Render the official Google Wallet button
  return (
    <a
      href={saveUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-block ${className}`}
      aria-label="Add to Google Wallet"
    >
      {/* Official Google Wallet button SVG */}
      <svg
        className={sizeClasses[size]}
        viewBox="0 0 302 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="302" height="48" rx="4" fill="black"/>
        <path d="M125.263 27.8364V15.8182H127.736V25.5909H132.941V27.8364H125.263Z" fill="white"/>
        <path d="M137.979 28.0227C137.168 28.0227 136.452 27.8459 135.832 27.4922C135.216 27.1345 134.732 26.6288 134.382 25.975C134.036 25.3173 133.863 24.5398 133.863 23.6427C133.863 22.7417 134.036 21.9602 134.382 21.2983C134.732 20.6325 135.216 20.1227 135.832 19.769C136.452 19.4113 137.168 19.2324 137.979 19.2324C138.79 19.2324 139.504 19.4113 140.12 19.769C140.739 20.1227 141.223 20.6325 141.569 21.2983C141.919 21.9602 142.094 22.7417 142.094 23.6427C142.094 24.5398 141.919 25.3173 141.569 25.975C141.223 26.6288 140.739 27.1345 140.12 27.4922C139.504 27.8459 138.79 28.0227 137.979 28.0227ZM137.99 25.9972C138.347 25.9972 138.648 25.8905 138.894 25.6772C139.14 25.4598 139.328 25.1645 139.457 24.7913C139.59 24.418 139.657 23.9946 139.657 23.521C139.657 23.0435 139.59 22.618 139.457 22.2448C139.328 21.8716 139.14 21.5763 138.894 21.3589C138.648 21.1416 138.347 21.0329 137.99 21.0329C137.625 21.0329 137.317 21.1416 137.067 21.3589C136.821 21.5763 136.631 21.8716 136.498 22.2448C136.369 22.618 136.304 23.0435 136.304 23.521C136.304 23.9946 136.369 24.418 136.498 24.7913C136.631 25.1645 136.821 25.4598 137.067 25.6772C137.317 25.8905 137.625 25.9972 137.99 25.9972Z" fill="white"/>
        <path d="M147.413 28.0227C146.532 28.0227 145.77 27.8378 145.127 27.4681C144.488 27.0944 143.994 26.5706 143.647 25.8968C143.305 25.2189 143.133 24.4274 143.133 23.5222C143.133 22.6289 143.305 21.8435 143.647 21.1658C143.994 20.4841 144.476 19.9544 145.096 19.5768C145.719 19.1952 146.444 19.0044 147.271 19.0044C147.796 19.0044 148.298 19.0847 148.775 19.2454C149.256 19.4021 149.686 19.6495 150.064 19.9878C150.445 20.3261 150.744 20.7614 150.962 21.2936C151.179 21.8219 151.288 22.4571 151.288 23.1992V23.8952H144.227V22.2823H149.089C149.085 21.9531 149.009 21.6609 148.86 21.4056C148.711 21.1463 148.505 20.9425 148.242 20.7942C147.983 20.6459 147.681 20.5717 147.337 20.5717C146.98 20.5717 146.664 20.653 146.389 20.8157C146.118 20.9744 145.905 21.1885 145.752 21.458C145.599 21.7236 145.52 22.0217 145.516 22.3524V24.4403C145.516 24.8511 145.593 25.2052 145.746 25.5027C145.903 25.8003 146.125 26.0285 146.414 26.1871C146.702 26.3458 147.044 26.4251 147.437 26.4251C147.706 26.4251 147.95 26.3878 148.168 26.3134C148.386 26.2389 148.574 26.1273 148.731 25.9785C148.888 25.8298 149.006 25.647 149.085 25.4302L151.342 25.5773C151.235 26.0739 151.015 26.5085 150.68 26.881C150.35 27.2495 149.922 27.538 149.396 27.7464C148.874 27.9506 148.277 28.0527 147.608 28.0527L147.413 28.0227Z" fill="white"/>
        <path d="M158.689 23.5991L156.42 23.7463C156.383 23.5434 156.301 23.3572 156.175 23.188C156.053 23.0147 155.889 22.8758 155.683 22.7711C155.481 22.6624 155.239 22.608 154.957 22.608C154.581 22.608 154.268 22.6944 154.018 22.867C153.772 23.0357 153.649 23.2586 153.649 23.5358C153.649 23.757 153.739 23.9416 153.918 24.0898C154.098 24.2381 154.406 24.3589 154.842 24.4521L156.506 24.7909C157.416 24.9773 158.1 25.2725 158.559 25.6767C159.023 26.081 159.254 26.6165 159.254 27.2834C159.254 27.8842 159.076 28.4093 158.719 28.8586C158.365 29.304 157.88 29.6521 157.264 29.9029C156.652 30.1497 155.951 30.2731 155.161 30.2731C153.98 30.2731 153.031 30.0173 152.315 29.5056C151.602 28.99 151.189 28.2884 151.074 27.4007L153.511 27.2658C153.578 27.6185 153.755 27.8863 154.042 28.0694C154.33 28.2484 154.702 28.338 155.161 28.338C155.582 28.338 155.924 28.2491 156.186 28.0713C156.451 27.8896 156.586 27.6598 156.59 27.3822C156.586 27.1465 156.485 26.9556 156.286 26.8095C156.086 26.6593 155.78 26.5442 155.368 26.4641L153.778 26.1374C152.865 25.9549 152.178 25.6435 151.719 25.2028C151.263 24.7582 151.035 24.1898 151.035 23.4977C151.035 22.9047 151.197 22.3943 151.522 21.9665C151.851 21.5348 152.309 21.2022 152.896 20.9686C153.488 20.7311 154.173 20.6123 154.951 20.6123C156.083 20.6123 156.981 20.8612 157.645 21.3589C158.313 21.8567 158.71 22.5329 158.843 23.388L158.689 23.5991Z" fill="white"/>
        <path d="M160.23 27.8364V19.3636H162.606V21.0217H162.715C162.887 20.4624 163.169 20.0315 163.56 19.729C163.956 19.4226 164.427 19.2694 164.975 19.2694C165.117 19.2694 165.27 19.2789 165.435 19.2979C165.604 19.313 165.748 19.3375 165.866 19.3714V21.5648C165.74 21.5231 165.563 21.4875 165.336 21.458C165.113 21.4286 164.91 21.4138 164.727 21.4138C164.328 21.4138 163.971 21.4996 163.655 21.6712C163.344 21.8389 163.097 22.0733 162.915 22.3745C162.737 22.6757 162.648 23.0239 162.648 23.4193V27.8364H160.23Z" fill="white"/>
        <path d="M170.839 28.0227C169.958 28.0227 169.196 27.8378 168.553 27.4681C167.914 27.0944 167.42 26.5706 167.073 25.8968C166.731 25.2189 166.559 24.4274 166.559 23.5222C166.559 22.6289 166.731 21.8435 167.073 21.1658C167.42 20.4841 167.902 19.9544 168.522 19.5768C169.145 19.1952 169.87 19.0044 170.697 19.0044C171.222 19.0044 171.724 19.0847 172.201 19.2454C172.682 19.4021 173.112 19.6495 173.49 19.9878C173.871 20.3261 174.17 20.7614 174.388 21.2936C174.605 21.8219 174.714 22.4571 174.714 23.1992V23.8952H167.653V22.2823H172.515C172.511 21.9531 172.435 21.6609 172.286 21.4056C172.137 21.1463 171.931 20.9425 171.668 20.7942C171.409 20.6459 171.107 20.5717 170.763 20.5717C170.406 20.5717 170.09 20.653 169.815 20.8157C169.544 20.9744 169.331 21.1885 169.178 21.458C169.025 21.7236 168.946 22.0217 168.942 22.3524V24.4403C168.942 24.8511 169.019 25.2052 169.172 25.5027C169.329 25.8003 169.551 26.0285 169.84 26.1871C170.128 26.3458 170.47 26.4251 170.863 26.4251C171.132 26.4251 171.376 26.3878 171.594 26.3134C171.812 26.2389 172 26.1273 172.157 25.9785C172.314 25.8298 172.432 25.647 172.511 25.4302L174.768 25.5773C174.661 26.0739 174.441 26.5085 174.106 26.881C173.776 27.2495 173.348 27.538 172.822 27.7464C172.3 27.9506 171.703 28.0527 171.034 28.0527L170.839 28.0227Z" fill="white"/>
        {/* Google G logo */}
        <path d="M35.0039 24.48C35.0039 23.68 34.9359 22.88 34.8039 22.11H24.0039V26.6H30.2079C29.9439 28.03 29.1279 29.32 27.9279 30.19V33.19H31.6279C33.8879 31.08 35.0039 27.99 35.0039 24.48Z" fill="#4285F4"/>
        <path d="M24.0039 36C27.1039 36 29.7039 35 31.6279 33.19L27.9279 30.19C26.9039 30.88 25.5679 31.29 24.0039 31.29C21.0079 31.29 18.4719 29.16 17.5759 26.33H13.7559V29.42C15.7159 33.3 19.6039 36 24.0039 36Z" fill="#34A853"/>
        <path d="M17.5759 26.33C17.1159 24.9 17.1159 23.36 17.5759 21.93V18.84H13.7559C12.0839 22.17 12.0839 26.09 13.7559 29.42L17.5759 26.33Z" fill="#FBBC04"/>
        <path d="M24.0039 16.71C25.6559 16.68 27.2519 17.3 28.4519 18.44L31.7039 15.19C29.5959 13.21 26.8519 12.12 24.0039 12.15C19.6039 12.15 15.7159 14.85 13.7559 18.72L17.5759 21.81C18.4719 18.98 21.0079 16.85 24.0039 16.71Z" fill="#EA4335"/>
        {/* "Wallet" text */}
        <path d="M179.5 19.3636H181.866L184.448 25.3818H184.56L187.142 19.3636H189.508V27.8364H187.174V22.4818H187.093L184.659 28.1909H184.349L181.915 22.4614H181.834V27.8364H179.5V19.3636Z" fill="white"/>
        <text x="195" y="25.5" fill="white" fontSize="12" fontFamily="Roboto, sans-serif" fontWeight="500">Add to Google Wallet</text>
      </svg>
    </a>
  )
}

export default AddToGoogleWalletButton

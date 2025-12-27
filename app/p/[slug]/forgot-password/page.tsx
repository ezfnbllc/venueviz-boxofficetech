'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import Layout from '@/components/public/Layout'

export default function ForgotPasswordPage() {
  const params = useParams()
  const slug = params.slug as string

  const { resetPassword } = useFirebaseAuth()

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await resetPassword(email)

    if (result.success) {
      setSuccess(true)
    } else {
      setError(result.error || 'Failed to send reset email')
    }

    setLoading(false)
  }

  if (success) {
    return (
      <Layout promoterSlug={slug}>
        <section className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 bg-[#f9fafb] dark:bg-gray-900">
          <div className="w-full max-w-md px-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
              <div className="w-16 h-16 bg-[#6ac045] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Check Your Email</h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                We&apos;ve sent a password reset link to <strong>{email}</strong>.
                Please check your inbox and follow the instructions.
              </p>
              <Link
                href={`/p/${slug}/login`}
                className="inline-block px-6 py-3 bg-[#6ac045] text-white font-medium rounded-lg hover:bg-[#5aa038] transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        </section>
      </Layout>
    )
  }

  return (
    <Layout promoterSlug={slug}>
      <section className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 bg-[#f9fafb] dark:bg-gray-900">
        <div className="w-full max-w-md px-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="p-8">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Reset Password</h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6ac045] focus:border-transparent"
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#6ac045] text-white font-semibold rounded-lg hover:bg-[#5aa038] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href={`/p/${slug}/login`}
                  className="text-[#6ac045] hover:underline font-medium inline-flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  )
}

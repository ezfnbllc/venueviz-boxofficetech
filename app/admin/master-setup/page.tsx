'use client'

import { useState, useEffect } from 'react'
import { useFirebaseAuth } from '@/lib/firebase-auth'
import { useRouter } from 'next/navigation'

interface SetupStatus {
  status: string
  masterTenant: {
    id: string
    exists: boolean
    isMaster: boolean
    defaultThemeId: string | null
    name: string | null
  }
  defaultTheme: {
    id: string
    themeName: string
  } | null
  totalTenants: number
  setupRequired: boolean
}

interface SetupResult {
  success: boolean
  message: string
  results: Record<string, any>
  masterTenantId: string
  defaultThemeId: string
}

export default function MasterSetupPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const router = useRouter()

  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<SetupResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      checkStatus()
    }
  }, [user, authLoading, router])

  const checkStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/setup-master')
      const data = await response.json()
      setStatus(data)
    } catch (err) {
      setError('Failed to check status')
    } finally {
      setLoading(false)
    }
  }

  const runSetup = async () => {
    if (!user) return

    try {
      setRunning(true)
      setError(null)
      setResult(null)

      const token = await user.getIdToken()
      const response = await fetch('/api/admin/setup-master', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Setup failed')
      }

      setResult(data)
      // Refresh status after setup
      await checkStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
    } finally {
      setRunning(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Master Tenant Setup</h1>
            <p className="mt-1 text-sm text-gray-500">
              Configure BoxOfficeTech as the master tenant with Barren as the default theme
            </p>
          </div>

          {/* Status */}
          <div className="px-6 py-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Current Status</h2>

            {status && (
              <div className="space-y-4">
                {/* Master Tenant Status */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Master Tenant</p>
                    <p className="text-sm text-gray-500">
                      {status.masterTenant.name || status.masterTenant.id}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {status.masterTenant.exists ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Exists
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        Not Found
                      </span>
                    )}
                    {status.masterTenant.isMaster ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        Is Master
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Not Master
                      </span>
                    )}
                  </div>
                </div>

                {/* Default Theme Status */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Default Theme</p>
                    <p className="text-sm text-gray-500">
                      {status.defaultTheme?.themeName || 'Not configured'}
                    </p>
                  </div>
                  {status.defaultTheme ? (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      Configured
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                      Missing
                    </span>
                  )}
                </div>

                {/* Total Tenants */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Total Tenants</p>
                    <p className="text-sm text-gray-500">Registered in the platform</p>
                  </div>
                  <span className="text-2xl font-bold text-gray-900">
                    {status.totalTenants}
                  </span>
                </div>

                {/* Setup Required Warning */}
                {status.setupRequired && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex">
                      <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">Setup Required</h3>
                        <p className="mt-1 text-sm text-yellow-700">
                          Master tenant configuration is incomplete. Run setup to configure.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Logged in as: <span className="font-medium">{user?.email}</span>
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={checkStatus}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Refresh
                </button>
                <button
                  onClick={runSetup}
                  disabled={running || !status?.setupRequired}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {running ? 'Running Setup...' : 'Run Setup'}
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-sm font-medium text-green-800 mb-2">Setup Complete!</h3>
                <pre className="text-xs text-green-700 overflow-auto">
                  {JSON.stringify(result.results, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Setup Details */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900 mb-2">What Setup Does</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ Marks BoxOfficeTech tenant as master (isMaster: true)</li>
              <li>✓ Creates Barren theme as the default platform theme</li>
              <li>✓ Associates the Barren theme with the master tenant</li>
              <li>✓ Elevates your user account to superadmin role</li>
              <li>✓ Enables access to all tenants and billing</li>
            </ul>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-4 text-center">
          <a href="/admin" className="text-sm text-blue-600 hover:text-blue-800">
            ← Back to Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

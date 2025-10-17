'use client'

import { useState, useEffect } from 'react'
import PromoterService from '@/lib/services/promoterService'
import { PaymentGateway } from '@/lib/types/promoter'

interface PaymentGatewaySetupProps {
  promoterId: string
  currentGateway: PaymentGateway | null
  isMaster: boolean
  onUpdate: () => void
}

interface TestResult {
  success: boolean
  message: string
  details?: any
  error?: string
}

export default function PaymentGatewaySetup({ 
  promoterId, 
  currentGateway, 
  isMaster,
  onUpdate 
}: PaymentGatewaySetupProps) {
  const [isEditing, setIsEditing] = useState(!currentGateway)
  const [useBoxOfficeTech, setUseBoxOfficeTech] = useState(false)
  const [formData, setFormData] = useState<Partial<PaymentGateway>>({
    provider: currentGateway?.provider || 'stripe',
    environment: currentGateway?.environment || 'sandbox',
    isActive: true
  })
  const [credentials, setCredentials] = useState({
    apiKey: '',
    secretKey: '',
    webhookSecret: '',
    merchantId: '',
    clientId: ''
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  // Load existing credentials when changing gateway or component mounts
  useEffect(() => {
    if (currentGateway && currentGateway.credentials) {
      console.log('[Gateway Setup] Loading credentials:', currentGateway)
      setFormData({
        provider: currentGateway.provider,
        environment: currentGateway.environment,
        isActive: true
      })
      
      setCredentials({
        apiKey: currentGateway.credentials.apiKey || '',
        secretKey: currentGateway.credentials.secretKey || '',
        webhookSecret: currentGateway.credentials.webhookSecret || '',
        merchantId: currentGateway.credentials.merchantId || '',
        clientId: currentGateway.credentials.clientId || ''
      })
    }
  }, [currentGateway])

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      let endpoint = ''
      let payload: any = {
        environment: formData.environment
      }

      console.log('[Payment Test] Current credentials:', credentials)

      switch (formData.provider) {
        case 'stripe':
          endpoint = '/api/payment/test-stripe'
          payload.apiKey = credentials.secretKey || credentials.apiKey
          break
          
        case 'square':
          endpoint = '/api/payment/test-square'
          payload.apiKey = credentials.apiKey
          payload.merchantId = credentials.merchantId
          break
          
        case 'paypal':
          endpoint = '/api/payment/test-paypal'
          payload.clientId = credentials.clientId
          payload.secretKey = credentials.secretKey
          console.log('[Payment Test] PayPal payload:', payload)
          break
          
        default:
          throw new Error('Invalid provider')
      }

      console.log('[Payment Test] Testing:', formData.provider, 'at', endpoint)
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      console.log('[Payment Test] Result:', result)
      setTestResult(result)
      
    } catch (error: any) {
      console.error('[Payment Test] Error:', error)
      setTestResult({
        success: false,
        message: 'Connection test failed',
        error: error.message || 'Unknown error occurred'
      })
    } finally {
      setTesting(false)
    }
  }

  const testExistingGateway = async () => {
    if (!currentGateway || !currentGateway.credentials) {
      alert('No credentials found for this gateway')
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      let endpoint = ''
      let payload: any = {
        environment: currentGateway.environment
      }

      console.log('[Test Existing] Gateway credentials:', currentGateway.credentials)

      switch (currentGateway.provider) {
        case 'stripe':
          endpoint = '/api/payment/test-stripe'
          payload.apiKey = currentGateway.credentials.secretKey || currentGateway.credentials.apiKey
          break
          
        case 'square':
          endpoint = '/api/payment/test-square'
          payload.apiKey = currentGateway.credentials.apiKey
          payload.merchantId = currentGateway.credentials.merchantId
          break
          
        case 'paypal':
          endpoint = '/api/payment/test-paypal'
          payload.clientId = currentGateway.credentials.clientId
          payload.secretKey = currentGateway.credentials.secretKey
          console.log('[Test Existing] PayPal payload:', payload)
          break
      }

      console.log('[Test Existing] Endpoint:', endpoint, 'Payload:', payload)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      console.log('[Test Existing] Result:', result)
      setTestResult(result)
      
    } catch (error: any) {
      console.error('[Test Existing] Error:', error)
      setTestResult({
        success: false,
        message: 'Connection test failed',
        error: error.message
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!testResult?.success && !useBoxOfficeTech) {
      alert('Please test the connection before saving')
      return
    }

    try {
      const gateway: PaymentGateway = {
        provider: useBoxOfficeTech ? 'boxofficetech' : formData.provider!,
        environment: formData.environment!,
        isActive: true,
        createdAt: currentGateway?.createdAt || new Date(),
        updatedAt: new Date(),
        validatedAt: testResult?.success ? new Date() : undefined,
        credentials: useBoxOfficeTech ? undefined : credentials
      }

      console.log('[Save Gateway] Saving:', gateway)

      await PromoterService.setPaymentGateway(promoterId, gateway)
      setIsEditing(false)
      setTestResult(null)
      onUpdate()
    } catch (error) {
      console.error('Error saving gateway:', error)
      alert('Failed to save payment gateway')
    }
  }

  return (
    <div className="space-y-6">
      {/* Current Gateway Display */}
      {currentGateway && !isEditing && (
        <div className="bg-black/40 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Current Payment Gateway</h2>
            <div className="flex gap-2">
              <button
                onClick={testExistingGateway}
                disabled={testing}
                className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {testing ? 'Testing...' : '🧪 Test Connection'}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                Change Gateway
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-sm text-gray-400">Provider</span>
              <p className="font-medium capitalize">{currentGateway.provider}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Environment</span>
              <p className={`font-medium ${
                currentGateway.environment === 'live' ? 'text-green-400' : 'text-yellow-400'
              }`}>
                {currentGateway.environment === 'live' ? '✅ Live' : '🧪 Sandbox'}
              </p>
            </div>
          </div>

          {testResult && (
            <div className={`p-4 rounded-lg border ${
              testResult.success 
                ? 'bg-green-600/10 border-green-600/50'
                : 'bg-red-600/10 border-red-600/50'
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">
                  {testResult.success ? '✅' : '❌'}
                </span>
                <div className="flex-1">
                  <p className={`font-medium ${
                    testResult.success ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {testResult.message}
                  </p>
                  
                  {testResult.success && testResult.details && (
                    <div className="mt-3 space-y-2 text-sm">
                      {Object.entries(testResult.details).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                          <span className="text-white">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!testResult.success && testResult.error && (
                    <p className="text-sm text-gray-400 mt-2">{testResult.error}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gateway Setup Form */}
      {isEditing && (
        <div className="bg-black/40 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-6">
            {currentGateway ? 'Change Payment Gateway' : 'Setup Payment Gateway'}
          </h2>

          {!isMaster && (
            <div className="mb-6 p-4 bg-purple-600/10 border border-purple-600/50 rounded-lg">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={useBoxOfficeTech}
                  onChange={(e) => setUseBoxOfficeTech(e.target.checked)}
                  className="w-5 h-5"
                />
                <div>
                  <p className="font-medium">Use BoxOfficeTech Payment Gateway</p>
                  <p className="text-sm text-gray-400">
                    Process payments through BoxOfficeTech's gateway
                  </p>
                </div>
              </label>
            </div>
          )}

          {!useBoxOfficeTech && (
            <>
              {/* Provider Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Payment Provider</label>
                <div className="grid grid-cols-3 gap-4">
                  {['stripe', 'square', 'paypal'].map(provider => (
                    <button
                      key={provider}
                      onClick={() => {
                        setFormData({...formData, provider: provider as any})
                        setTestResult(null)
                      }}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.provider === provider
                          ? 'border-purple-600 bg-purple-600/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <p className="font-medium capitalize">{provider}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Environment Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Environment</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setFormData({...formData, environment: 'sandbox'})
                      setTestResult(null)
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.environment === 'sandbox'
                        ? 'border-yellow-600 bg-yellow-600/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <p className="font-medium">🧪 Sandbox</p>
                    <p className="text-sm text-gray-400">For testing</p>
                  </button>
                  <button
                    onClick={() => {
                      setFormData({...formData, environment: 'live'})
                      setTestResult(null)
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.environment === 'live'
                        ? 'border-green-600 bg-green-600/20'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <p className="font-medium">✅ Live</p>
                    <p className="text-sm text-gray-400">For real transactions</p>
                  </button>
                </div>
              </div>

              {/* Credentials */}
              <div className="space-y-4 mb-6">
                {formData.provider === 'stripe' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Secret Key {formData.environment === 'live' && <span className="text-red-400">*</span>}
                      </label>
                      <input
                        type="password"
                        value={credentials.secretKey}
                        onChange={(e) => {
                          setCredentials({...credentials, secretKey: e.target.value})
                          setTestResult(null)
                        }}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg text-white"
                        placeholder={formData.environment === 'live' ? 'sk_live_...' : 'sk_test_...'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Webhook Secret (Optional)</label>
                      <input
                        type="password"
                        value={credentials.webhookSecret}
                        onChange={(e) => setCredentials({...credentials, webhookSecret: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg text-white"
                        placeholder="whsec_..."
                      />
                    </div>
                  </>
                )}

                {formData.provider === 'square' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Access Token {formData.environment === 'live' && <span className="text-red-400">*</span>}
                      </label>
                      <input
                        type="password"
                        value={credentials.apiKey}
                        onChange={(e) => {
                          setCredentials({...credentials, apiKey: e.target.value})
                          setTestResult(null)
                        }}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg text-white"
                        placeholder="EAAA..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Merchant ID (Optional)</label>
                      <input
                        type="text"
                        value={credentials.merchantId}
                        onChange={(e) => setCredentials({...credentials, merchantId: e.target.value})}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg text-white"
                        placeholder="Leave empty to auto-detect"
                      />
                    </div>
                  </>
                )}

                {formData.provider === 'paypal' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Client ID {formData.environment === 'live' && <span className="text-red-400">*</span>}
                      </label>
                      <input
                        type="text"
                        value={credentials.clientId}
                        onChange={(e) => {
                          setCredentials({...credentials, clientId: e.target.value})
                          setTestResult(null)
                        }}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg text-white"
                        placeholder="AV..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Client Secret {formData.environment === 'live' && <span className="text-red-400">*</span>}
                      </label>
                      <input
                        type="password"
                        value={credentials.secretKey}
                        onChange={(e) => {
                          setCredentials({...credentials, secretKey: e.target.value})
                          setTestResult(null)
                        }}
                        className="w-full px-4 py-2 bg-white/10 rounded-lg text-white"
                        placeholder="EK..."
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Test Connection */}
              <div className="mb-6">
                <button
                  onClick={testConnection}
                  disabled={testing || 
                    (formData.provider === 'stripe' && !credentials.secretKey) ||
                    (formData.provider === 'square' && !credentials.apiKey) ||
                    (formData.provider === 'paypal' && (!credentials.clientId || !credentials.secretKey))
                  }
                  className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
                
                {testResult && (
                  <div className={`mt-4 p-4 rounded-lg border ${
                    testResult.success 
                      ? 'bg-green-600/10 border-green-600/50'
                      : 'bg-red-600/10 border-red-600/50'
                  }`}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">
                        {testResult.success ? '✅' : '❌'}
                      </span>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          testResult.success ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {testResult.message}
                        </p>
                        
                        {testResult.success && testResult.details && (
                          <div className="mt-3 space-y-2 text-sm">
                            {Object.entries(testResult.details).map(([key, value]: [string, any]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                <span className="text-white">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {!testResult.success && testResult.error && (
                          <p className="text-sm text-gray-400 mt-2">{testResult.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Save/Cancel Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setTestResult(null)
                  }}
                  className="px-6 py-2 bg-gray-600 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!testResult?.success}
                  className="flex-1 px-6 py-2 bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Save Gateway
                </button>
              </div>
            </>
          )}

          {useBoxOfficeTech && (
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 bg-gray-600 rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-6 py-2 bg-green-600 rounded-lg hover:bg-green-700"
              >
                Use BoxOfficeTech Gateway
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

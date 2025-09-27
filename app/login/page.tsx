'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFirebaseAuth } from '@/lib/firebase-auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { signIn } = useFirebaseAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn(email, password)
    
    if (result.success) {
      router.push('/admin')
    } else {
      setError(result.error)
      setLoading(false)
    }
  }

  const handleDemoLogin = () => {
    setEmail('admin@venueviz.com')
    setPassword('ChangeMeNow!')
    setError('Use these credentials with Firebase Auth configured')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-8 bg-black/40 backdrop-blur rounded-2xl border border-white/10">
        <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          VenueViz Admin Login
        </h1>
        <p className="text-xs text-center text-gray-400 mb-8">
          Secure Firebase Authentication
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white" 
              placeholder="Email" 
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white" 
              placeholder="Password" 
              required
              disabled={loading}
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-6">
          <button 
            onClick={handleDemoLogin}
            className="w-full p-4 bg-purple-600/10 rounded-lg text-purple-400 text-sm hover:bg-purple-600/20"
          >
            Need demo credentials? Click here
          </button>
        </div>
        
        <div className="mt-4 text-center text-xs text-gray-500">
          <p>To create admin account:</p>
          <p>1. Register in Firebase Console</p>
          <p>2. Set user role to 'admin' in Firestore</p>
        </div>
      </div>
    </div>
  )
}

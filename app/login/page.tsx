'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFirebaseAuth } from '@/lib/firebase-auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { signIn, user, loading } = useFirebaseAuth()

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      console.log('User already logged in, redirecting...')
      router.push('/admin')
    }
  }, [user, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      console.log('Submitting login form...')
      const result = await signIn(email, password)
      
      if (result.success) {
        console.log('Login successful, waiting for redirect...')
        // The redirect will happen automatically in the auth provider
      } else {
        console.log('Login failed:', result.error)
        setError(result.error)
        setIsSubmitting(false)
      }
    } catch (err: any) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleDemoLogin = () => {
    setEmail('boxofficetechllp@gmail.com')
    setPassword('')
    setError('Enter your Firebase password')
  }

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/>
      </div>
    )
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
          </div>
          
          {error && (
            <div className="p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold disabled:opacity-50"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-6">
          <button 
            onClick={handleDemoLogin}
            className="w-full p-4 bg-purple-600/10 rounded-lg text-purple-400 text-sm hover:bg-purple-600/20"
          >
            Admin Email: boxofficetechllp@gmail.com
          </button>
        </div>
        
        <div className="mt-4 text-center text-xs text-gray-500">
          <p>Make sure Email/Password auth is enabled in</p>
          <p>Firebase Console → Authentication → Sign-in method</p>
        </div>
      </div>
    </div>
  )
}

'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

const AuthContext = createContext<any>({})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = Cookies.get('auth-token')
    if (token) {
      setUser({ email: 'admin@venueviz.com', role: 'admin' })
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    if (email === 'admin@venueviz.com' && password === 'ChangeMeNow!') {
      Cookies.set('auth-token', 'demo-token', { expires: 7 })
      setUser({ email, role: 'admin' })
      router.push('/admin')
      return { success: true }
    }
    return { success: false, error: 'Invalid credentials' }
  }

  const logout = () => {
    Cookies.remove('auth-token')
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useRouter, usePathname } from 'next/navigation'

interface AuthContextType {
  user: User | null
  userData: any
  loading: boolean
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
  isAdmin: boolean
  isPromoter: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  isAdmin: false,
  isPromoter: false
})

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.email)
      
      if (firebaseUser) {
        setUser(firebaseUser)
        
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          console.log('User doc exists:', userDoc.exists())
          
          if (userDoc.exists()) {
            const data = userDoc.data()
            console.log('User data:', data)
            setUserData(data)
            
            // Auto redirect after successful auth
            if (pathname === '/login') {
              console.log('Redirecting to admin...')
              router.push('/admin')
            }
          } else {
            // Create basic user document if it doesn't exist
            console.log('Creating new user document')
            const newUserData = {
              email: firebaseUser.email,
              role: 'viewer',
              createdAt: new Date().toISOString(),
              isMaster: false
            }
            await setDoc(doc(db, 'users', firebaseUser.uid), newUserData)
            setUserData(newUserData)
            
            if (pathname === '/login') {
              router.push('/admin')
            }
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
          // Still set basic user data even if Firestore fails
          setUserData({
            email: firebaseUser.email,
            role: 'viewer'
          })
        }
      } else {
        setUser(null)
        setUserData(null)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [pathname, router])

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in for:', email)
      const result = await signInWithEmailAndPassword(auth, email, password)
      console.log('Sign in successful:', result.user.email)
      // The redirect will happen in the onAuthStateChanged listener
      return { success: true, user: result.user }
    } catch (error: any) {
      console.error('Login error:', error.code, error.message)
      return { 
        success: false, 
        error: error.message || 'Invalid credentials' 
      }
    }
  }

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const isAdmin = userData?.isMaster === true || userData?.role === 'admin'
  const isPromoter = userData?.role === 'promoter' || isAdmin

  return (
    <AuthContext.Provider value={{
      user,
      userData,
      loading,
      signIn,
      signOut,
      isAdmin,
      isPromoter
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useFirebaseAuth = () => useContext(AuthContext)

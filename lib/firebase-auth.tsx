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
import { useRouter } from 'next/navigation'

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.email)
      
      if (firebaseUser) {
        setUser(firebaseUser)
        
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          
          if (userDoc.exists()) {
            const data = userDoc.data()
            console.log('User data loaded:', data.email, 'role:', data.role)
            setUserData(data)
          } else {
            // Create basic user document
            console.log('Creating new user document for:', firebaseUser.email)
            const newUserData = {
              email: firebaseUser.email,
              role: 'admin', // Default to admin for now
              createdAt: new Date().toISOString(),
              isMaster: true // Allow access
            }
            await setDoc(doc(db, 'users', firebaseUser.uid), newUserData)
            setUserData(newUserData)
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
          // Set basic data even if fetch fails
          setUserData({
            email: firebaseUser.email,
            role: 'admin',
            isMaster: true
          })
        }
      } else {
        setUser(null)
        setUserData(null)
      }
      
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
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

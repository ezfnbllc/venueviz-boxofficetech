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
      if (firebaseUser) {
        setUser(firebaseUser)
        
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (userDoc.exists()) {
          setUserData(userDoc.data())
        } else {
          // Create user document if it doesn't exist
          const newUserData = {
            email: firebaseUser.email,
            role: 'viewer',
            createdAt: new Date(),
            isMaster: false
          }
          await setDoc(doc(db, 'users', firebaseUser.uid), newUserData)
          setUserData(newUserData)
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
      console.error('Login error:', error)
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

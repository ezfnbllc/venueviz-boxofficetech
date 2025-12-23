'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User
} from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

export interface UserData {
  email: string
  role: 'customer' | 'promoter' | 'admin' | 'superadmin'
  firstName?: string
  lastName?: string
  phone?: string
  tenantId?: string
  isMaster?: boolean
  createdAt: string
  updatedAt?: string
}

interface AuthContextType {
  user: User | null
  userData: UserData | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, userData: Partial<UserData>) => Promise<{ success: boolean; error?: string }>
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  isAdmin: boolean
  isPromoter: boolean
  isCustomer: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signInWithGoogle: async () => ({ success: false }),
  signOut: async () => {},
  resetPassword: async () => ({ success: false }),
  isAdmin: false,
  isPromoter: false,
  isCustomer: false,
})

const googleProvider = new GoogleAuthProvider()

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
      return { success: true }
    } catch (error: any) {
      console.error('Login error:', error.code, error.message)
      return {
        success: false,
        error: getAuthErrorMessage(error.code)
      }
    }
  }

  const signUp = async (email: string, password: string, additionalData: Partial<UserData>) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)

      // Create user document with customer role
      const newUserData: UserData = {
        email,
        role: 'customer', // Default role for public signups
        firstName: additionalData.firstName,
        lastName: additionalData.lastName,
        phone: additionalData.phone,
        tenantId: additionalData.tenantId,
        createdAt: new Date().toISOString(),
      }

      await setDoc(doc(db, 'users', result.user.uid), newUserData)

      // Send email verification
      await sendEmailVerification(result.user)

      return { success: true }
    } catch (error: any) {
      console.error('Signup error:', error.code, error.message)
      return {
        success: false,
        error: getAuthErrorMessage(error.code)
      }
    }
  }

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)

      // Check if user document exists
      const userDoc = await getDoc(doc(db, 'users', result.user.uid))

      if (!userDoc.exists()) {
        // Create new user document
        const names = result.user.displayName?.split(' ') || []
        const newUserData: UserData = {
          email: result.user.email || '',
          role: 'customer',
          firstName: names[0],
          lastName: names.slice(1).join(' '),
          createdAt: new Date().toISOString(),
        }
        await setDoc(doc(db, 'users', result.user.uid), newUserData)
      }

      return { success: true }
    } catch (error: any) {
      console.error('Google sign-in error:', error.code, error.message)
      return {
        success: false,
        error: getAuthErrorMessage(error.code)
      }
    }
  }

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email)
      return { success: true }
    } catch (error: any) {
      console.error('Password reset error:', error.code, error.message)
      return {
        success: false,
        error: getAuthErrorMessage(error.code)
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

  const isAdmin = userData?.isMaster === true || userData?.role === 'admin' || userData?.role === 'superadmin'
  const isPromoter = userData?.role === 'promoter' || isAdmin
  const isCustomer = userData?.role === 'customer'

  return (
    <AuthContext.Provider value={{
      user,
      userData,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resetPassword,
      isAdmin,
      isPromoter,
      isCustomer,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// Helper function to convert Firebase error codes to user-friendly messages
function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please sign in instead.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled.'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.'
    case 'auth/user-disabled':
      return 'This account has been disabled.'
    case 'auth/user-not-found':
      return 'No account found with this email.'
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.'
    case 'auth/invalid-credential':
      return 'Invalid email or password.'
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.'
    case 'auth/popup-closed-by-user':
      return 'Sign in was cancelled.'
    case 'auth/popup-blocked':
      return 'Pop-up was blocked. Please allow pop-ups and try again.'
    default:
      return 'An error occurred. Please try again.'
  }
}

export const useFirebaseAuth = () => useContext(AuthContext)

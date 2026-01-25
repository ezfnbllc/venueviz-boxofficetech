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
  User,
  fetchSignInMethodsForEmail,
} from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import {
  createTenantCustomer,
  getTenantCustomer,
  getTenantCustomerByUid,
  updateCustomerLastLogin,
  activateGuestCustomer,
  linkFirebaseUserToCustomer,
  type TenantCustomer,
} from '@/lib/services/tenantCustomerService'

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
  tenantCustomer: TenantCustomer | null
  loading: boolean
  // Legacy global auth methods (for admin/promoter)
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, userData: Partial<UserData>) => Promise<{ success: boolean; error?: string }>
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>
  // Tenant-specific auth methods (for customers)
  signUpForTenant: (email: string, password: string, promoterSlug: string, additionalData?: { firstName?: string; lastName?: string; phone?: string }) => Promise<{ success: boolean; error?: string }>
  signInToTenant: (email: string, password: string, promoterSlug: string) => Promise<{ success: boolean; error?: string }>
  signInWithGoogleToTenant: (promoterSlug: string) => Promise<{ success: boolean; error?: string }>
  // Load tenant customer after login
  loadTenantCustomer: (promoterSlug: string) => Promise<TenantCustomer | null>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  isAdmin: boolean
  isPromoter: boolean
  isCustomer: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  tenantCustomer: null,
  loading: true,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signInWithGoogle: async () => ({ success: false }),
  signUpForTenant: async () => ({ success: false }),
  signInToTenant: async () => ({ success: false }),
  signInWithGoogleToTenant: async () => ({ success: false }),
  loadTenantCustomer: async () => null,
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
  const [tenantCustomer, setTenantCustomer] = useState<TenantCustomer | null>(null)
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

  // ============================================================================
  // TENANT-SPECIFIC AUTH METHODS (for multi-tenant customer isolation)
  // ============================================================================

  /**
   * Sign up a customer for a specific tenant
   * Creates both Firebase auth user and tenant-specific customer record
   */
  const signUpForTenant = async (
    email: string,
    password: string,
    promoterSlug: string,
    additionalData?: { firstName?: string; lastName?: string; phone?: string }
  ) => {
    try {
      // Check if customer already exists for this tenant
      const existingCustomer = await getTenantCustomer(promoterSlug, email)
      if (existingCustomer) {
        return {
          success: false,
          error: 'An account with this email already exists. Please sign in instead.',
        }
      }

      // Check if Firebase user exists (may have account on other tenant)
      let firebaseUser: User
      try {
        // Try to create new Firebase user
        const result = await createUserWithEmailAndPassword(auth, email, password)
        firebaseUser = result.user

        // Send email verification
        await sendEmailVerification(result.user)
      } catch (firebaseError: any) {
        if (firebaseError.code === 'auth/email-already-in-use') {
          // User exists in Firebase but not for this tenant
          // They need to sign in with their existing password
          return {
            success: false,
            error: 'This email is registered on another site. Please use your existing password to sign in, and we\'ll add you to this site.',
          }
        }
        throw firebaseError
      }

      // Create tenant-specific customer record
      const result = await createTenantCustomer({
        promoterSlug,
        email,
        firebaseUid: firebaseUser.uid,
        firstName: additionalData?.firstName,
        lastName: additionalData?.lastName,
        phone: additionalData?.phone,
      })

      if (!result.success) {
        return { success: false, error: result.error }
      }

      setTenantCustomer(result.customer || null)
      return { success: true }
    } catch (error: any) {
      console.error('Tenant signup error:', error.code, error.message)
      return {
        success: false,
        error: getAuthErrorMessage(error.code),
      }
    }
  }

  /**
   * Sign in a customer to a specific tenant
   * Validates that customer exists for this tenant before allowing access
   */
  const signInToTenant = async (
    email: string,
    password: string,
    promoterSlug: string
  ) => {
    try {
      // First check if customer exists for this tenant
      const customer = await getTenantCustomer(promoterSlug, email)

      if (!customer) {
        // Check if they have a Firebase account (registered elsewhere)
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email)
          if (methods.length > 0) {
            return {
              success: false,
              error: 'No account found for this site. Would you like to register?',
            }
          }
        } catch {
          // Ignore errors from fetchSignInMethodsForEmail
        }
        return {
          success: false,
          error: 'No account found with this email. Please register first.',
        }
      }

      // Sign in with Firebase
      const result = await signInWithEmailAndPassword(auth, email, password)

      // If guest customer, activate them (transition from guest to full customer)
      if (customer.isGuest) {
        await activateGuestCustomer(customer.id)
        customer.isGuest = false
        customer.needsPasswordReset = false
      } else {
        // Update last login
        await updateCustomerLastLogin(customer.id)
      }

      setTenantCustomer(customer)

      return { success: true }
    } catch (error: any) {
      console.error('Tenant sign-in error:', error.code, error.message)
      return {
        success: false,
        error: getAuthErrorMessage(error.code),
      }
    }
  }

  /**
   * Sign in with Google to a specific tenant
   * Creates tenant customer record if needed
   */
  const signInWithGoogleToTenant = async (promoterSlug: string) => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const email = result.user.email || ''
      const names = result.user.displayName?.split(' ') || []

      // Check if customer exists for this tenant
      let customer = await getTenantCustomer(promoterSlug, email)

      if (!customer) {
        // Create new tenant customer
        const createResult = await createTenantCustomer({
          promoterSlug,
          email,
          firebaseUid: result.user.uid,
          firstName: names[0],
          lastName: names.slice(1).join(' '),
        })

        if (!createResult.success) {
          return { success: false, error: createResult.error }
        }

        customer = createResult.customer || null
      } else {
        // If guest customer, activate them (transition from guest to full customer)
        if (customer.isGuest) {
          await activateGuestCustomer(customer.id)
          customer.isGuest = false
          customer.needsPasswordReset = false
        } else {
          // Update last login
          await updateCustomerLastLogin(customer.id)
        }
      }

      setTenantCustomer(customer)
      return { success: true }
    } catch (error: any) {
      console.error('Google tenant sign-in error:', error.code, error.message)
      return {
        success: false,
        error: getAuthErrorMessage(error.code),
      }
    }
  }

  /**
   * Load tenant customer for current user (used after page refresh)
   */
  const loadTenantCustomer = async (promoterSlug: string): Promise<TenantCustomer | null> => {
    if (!user) return null

    const customer = await getTenantCustomerByUid(promoterSlug, user.uid)
    setTenantCustomer(customer)
    return customer
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
      setTenantCustomer(null)
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
      tenantCustomer,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      signUpForTenant,
      signInToTenant,
      signInWithGoogleToTenant,
      loadTenantCustomer,
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

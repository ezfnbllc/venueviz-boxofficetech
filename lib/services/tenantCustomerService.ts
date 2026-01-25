/**
 * Tenant Customer Service
 *
 * Handles tenant-specific customer management for multi-tenant isolation.
 * Each customer belongs to a specific tenant (promoter) - the same email
 * can exist as separate customers across different tenants.
 *
 * Data Model:
 * - Collection: 'customers'
 * - Fields: promoterId, promoterSlug, email, firebaseUid, firstName, lastName, phone, createdAt
 * - Unique constraint: (promoterSlug, email) - enforced at application level
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface TenantCustomer {
  id: string
  promoterId: string
  promoterSlug: string
  email: string
  firebaseUid: string
  firstName?: string
  lastName?: string
  phone?: string
  emailVerified?: boolean
  createdAt: Date
  updatedAt?: Date
  lastLoginAt?: Date
  orderCount?: number
  totalSpent?: number
}

export interface CreateCustomerData {
  promoterSlug: string
  email: string
  firebaseUid: string
  firstName?: string
  lastName?: string
  phone?: string
}

/**
 * Get promoter ID from slug
 */
async function getPromoterIdFromSlug(promoterSlug: string): Promise<string | null> {
  try {
    const promotersRef = collection(db, 'promoters')
    const q = query(promotersRef, where('slug', '==', promoterSlug), limit(1))
    const snapshot = await getDocs(q)

    if (snapshot.empty) return null
    return snapshot.docs[0].id
  } catch (error) {
    console.error('Error getting promoter ID:', error)
    return null
  }
}

/**
 * Check if a customer exists for a specific tenant
 */
export async function customerExistsForTenant(
  promoterSlug: string,
  email: string
): Promise<boolean> {
  try {
    const customersRef = collection(db, 'customers')
    const q = query(
      customersRef,
      where('promoterSlug', '==', promoterSlug),
      where('email', '==', email.toLowerCase()),
      limit(1)
    )
    const snapshot = await getDocs(q)
    return !snapshot.empty
  } catch (error) {
    console.error('Error checking customer existence:', error)
    return false
  }
}

/**
 * Get customer for a specific tenant by email
 */
export async function getTenantCustomer(
  promoterSlug: string,
  email: string
): Promise<TenantCustomer | null> {
  try {
    const customersRef = collection(db, 'customers')
    const q = query(
      customersRef,
      where('promoterSlug', '==', promoterSlug),
      where('email', '==', email.toLowerCase()),
      limit(1)
    )
    const snapshot = await getDocs(q)

    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    const data = doc.data()

    return {
      id: doc.id,
      promoterId: data.promoterId,
      promoterSlug: data.promoterSlug,
      email: data.email,
      firebaseUid: data.firebaseUid,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      emailVerified: data.emailVerified,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || (data.updatedAt ? new Date(data.updatedAt) : undefined),
      lastLoginAt: data.lastLoginAt?.toDate?.() || (data.lastLoginAt ? new Date(data.lastLoginAt) : undefined),
      orderCount: data.orderCount,
      totalSpent: data.totalSpent,
    }
  } catch (error) {
    console.error('Error getting tenant customer:', error)
    return null
  }
}

/**
 * Get customer by Firebase UID for a specific tenant
 */
export async function getTenantCustomerByUid(
  promoterSlug: string,
  firebaseUid: string
): Promise<TenantCustomer | null> {
  try {
    const customersRef = collection(db, 'customers')
    const q = query(
      customersRef,
      where('promoterSlug', '==', promoterSlug),
      where('firebaseUid', '==', firebaseUid),
      limit(1)
    )
    const snapshot = await getDocs(q)

    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    const data = doc.data()

    return {
      id: doc.id,
      promoterId: data.promoterId,
      promoterSlug: data.promoterSlug,
      email: data.email,
      firebaseUid: data.firebaseUid,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      emailVerified: data.emailVerified,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || (data.updatedAt ? new Date(data.updatedAt) : undefined),
      lastLoginAt: data.lastLoginAt?.toDate?.() || (data.lastLoginAt ? new Date(data.lastLoginAt) : undefined),
      orderCount: data.orderCount,
      totalSpent: data.totalSpent,
    }
  } catch (error) {
    console.error('Error getting tenant customer by UID:', error)
    return null
  }
}

/**
 * Create a new customer for a tenant
 * Returns the customer if created, null if already exists
 */
export async function createTenantCustomer(
  data: CreateCustomerData
): Promise<{ success: boolean; customer?: TenantCustomer; error?: string }> {
  try {
    // Check if customer already exists for this tenant
    const existing = await getTenantCustomer(data.promoterSlug, data.email)
    if (existing) {
      return {
        success: false,
        error: 'An account with this email already exists for this site.',
      }
    }

    // Get promoter ID
    const promoterId = await getPromoterIdFromSlug(data.promoterSlug)
    if (!promoterId) {
      return {
        success: false,
        error: 'Invalid site. Please contact support.',
      }
    }

    // Create customer document
    const customersRef = collection(db, 'customers')
    const customerDoc = doc(customersRef)
    const now = Timestamp.now()

    const customerData = {
      promoterId,
      promoterSlug: data.promoterSlug,
      email: data.email.toLowerCase(),
      firebaseUid: data.firebaseUid,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      phone: data.phone || null,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
      orderCount: 0,
      totalSpent: 0,
    }

    await setDoc(customerDoc, customerData)

    return {
      success: true,
      customer: {
        id: customerDoc.id,
        ...customerData,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      },
    }
  } catch (error: any) {
    console.error('Error creating tenant customer:', error)
    return {
      success: false,
      error: error.message || 'Failed to create account. Please try again.',
    }
  }
}

/**
 * Update customer last login time
 */
export async function updateCustomerLastLogin(customerId: string): Promise<void> {
  try {
    const customerRef = doc(db, 'customers', customerId)
    await updateDoc(customerRef, {
      lastLoginAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    console.error('Error updating customer last login:', error)
  }
}

/**
 * Update customer profile
 */
export async function updateTenantCustomer(
  customerId: string,
  updates: Partial<Pick<TenantCustomer, 'firstName' | 'lastName' | 'phone' | 'emailVerified'>>
): Promise<boolean> {
  try {
    const customerRef = doc(db, 'customers', customerId)
    await updateDoc(customerRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    })
    return true
  } catch (error) {
    console.error('Error updating tenant customer:', error)
    return false
  }
}

/**
 * Get all customers for a tenant (for admin/promoter dashboard)
 */
export async function getTenantCustomers(
  promoterSlug: string,
  options?: { limit?: number; orderByField?: string }
): Promise<TenantCustomer[]> {
  try {
    const customersRef = collection(db, 'customers')
    let q = query(
      customersRef,
      where('promoterSlug', '==', promoterSlug),
      orderBy(options?.orderByField || 'createdAt', 'desc')
    )

    if (options?.limit) {
      q = query(q, limit(options.limit))
    }

    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        promoterId: data.promoterId,
        promoterSlug: data.promoterSlug,
        email: data.email,
        firebaseUid: data.firebaseUid,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        emailVerified: data.emailVerified,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() || (data.updatedAt ? new Date(data.updatedAt) : undefined),
        lastLoginAt: data.lastLoginAt?.toDate?.() || (data.lastLoginAt ? new Date(data.lastLoginAt) : undefined),
        orderCount: data.orderCount,
        totalSpent: data.totalSpent,
      }
    })
  } catch (error) {
    console.error('Error getting tenant customers:', error)
    return []
  }
}

/**
 * Link a Firebase user to an existing tenant customer
 * Used when a customer signs up via Google after having guest orders
 */
export async function linkFirebaseUserToCustomer(
  promoterSlug: string,
  email: string,
  firebaseUid: string,
  additionalData?: { firstName?: string; lastName?: string }
): Promise<boolean> {
  try {
    const customer = await getTenantCustomer(promoterSlug, email)

    if (!customer) {
      // Create new customer if doesn't exist
      const result = await createTenantCustomer({
        promoterSlug,
        email,
        firebaseUid,
        firstName: additionalData?.firstName,
        lastName: additionalData?.lastName,
      })
      return result.success
    }

    // Update existing customer with Firebase UID
    const customerRef = doc(db, 'customers', customer.id)
    await updateDoc(customerRef, {
      firebaseUid,
      ...(additionalData?.firstName && !customer.firstName ? { firstName: additionalData.firstName } : {}),
      ...(additionalData?.lastName && !customer.lastName ? { lastName: additionalData.lastName } : {}),
      updatedAt: Timestamp.now(),
    })

    return true
  } catch (error) {
    console.error('Error linking Firebase user to customer:', error)
    return false
  }
}

/**
 * Increment customer order statistics (called after successful order)
 */
export async function incrementCustomerOrderStats(
  promoterSlug: string,
  email: string,
  orderTotal: number
): Promise<void> {
  try {
    const customer = await getTenantCustomer(promoterSlug, email)
    if (!customer) return

    const customerRef = doc(db, 'customers', customer.id)
    await updateDoc(customerRef, {
      orderCount: (customer.orderCount || 0) + 1,
      totalSpent: (customer.totalSpent || 0) + orderTotal,
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    console.error('Error incrementing customer order stats:', error)
  }
}

/**
 * Check if customer exists for guest checkout notification
 * Returns basic info without sensitive data
 */
export async function checkGuestCustomerExists(
  promoterSlug: string,
  email: string
): Promise<{ exists: boolean; firstName?: string; orderCount?: number }> {
  try {
    const customer = await getTenantCustomer(promoterSlug, email)
    if (!customer) {
      return { exists: false }
    }
    return {
      exists: true,
      firstName: customer.firstName,
      orderCount: customer.orderCount,
    }
  } catch (error) {
    console.error('Error checking guest customer:', error)
    return { exists: false }
  }
}

/**
 * Create or get guest customer (for guest checkout)
 * Creates a minimal customer record if doesn't exist
 */
export async function getOrCreateGuestCustomer(
  promoterSlug: string,
  email: string,
  customerData?: { firstName?: string; lastName?: string; phone?: string }
): Promise<{ customer: TenantCustomer | null; isNew: boolean; error?: string }> {
  try {
    // Check if customer already exists
    const existing = await getTenantCustomer(promoterSlug, email)
    if (existing) {
      // Update with any new info provided
      if (customerData && (customerData.firstName || customerData.lastName || customerData.phone)) {
        const updates: any = {}
        if (customerData.firstName && !existing.firstName) updates.firstName = customerData.firstName
        if (customerData.lastName && !existing.lastName) updates.lastName = customerData.lastName
        if (customerData.phone && !existing.phone) updates.phone = customerData.phone

        if (Object.keys(updates).length > 0) {
          await updateTenantCustomer(existing.id, updates)
        }
      }
      return { customer: existing, isNew: false }
    }

    // Get promoter ID
    const promotersRef = collection(db, 'promoters')
    const q = query(promotersRef, where('slug', '==', promoterSlug), limit(1))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return { customer: null, isNew: false, error: 'Invalid site' }
    }

    const promoterId = snapshot.docs[0].id
    const customersRef = collection(db, 'customers')
    const customerDoc = doc(customersRef)
    const now = Timestamp.now()

    // Create guest customer (no firebaseUid yet)
    const newCustomerData = {
      promoterId,
      promoterSlug,
      email: email.toLowerCase(),
      firebaseUid: '', // Empty for guest - will be linked if they register later
      firstName: customerData?.firstName || null,
      lastName: customerData?.lastName || null,
      phone: customerData?.phone || null,
      emailVerified: false,
      isGuest: true, // Flag to identify guest customers
      createdAt: now,
      updatedAt: now,
      orderCount: 0,
      totalSpent: 0,
    }

    await setDoc(customerDoc, newCustomerData)

    return {
      customer: {
        id: customerDoc.id,
        ...newCustomerData,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      },
      isNew: true,
    }
  } catch (error: any) {
    console.error('Error getting/creating guest customer:', error)
    return { customer: null, isNew: false, error: error.message }
  }
}

# Firestore Database Schema - VenueViz

## Collections Overview
- events - Event listings and configurations
- venues - Venue information and configurations
- layouts - Seating layouts for venues
- orders - Customer orders and transactions
- customers - Customer profiles and information
- promotions - Discount codes and promotional offers
- promoters - Promoter accounts and configurations
- users - User accounts (admin, promoter staff)

---

## 1. Events Collection (events)

{
  id: string,                    // Auto-generated document ID
  name: string,                   // Event name
  description: string,            // Event description
  type: string,                   // 'concert' | 'theater' | 'sports' | 'comedy' | 'other'
  
  // Venue Information
  venue: string,                  // Venue name (legacy)
  venueName: string,             // Venue name
  venueId: string,               // Reference to venues collection
  layoutId: string,              // Reference to layouts collection
  
  // Schedule
  schedule: {
    date: timestamp,             // Event date
    startTime: string,           // Start time (e.g., "19:00")
    doorsOpen: string,           // Doors open time
    endTime: string,             // End time
    timezone: string             // Timezone (e.g., "America/Chicago")
  },
  date: timestamp,               // Event date (legacy)
  time: string,                  // Event time (legacy)
  
  // Pricing
  pricing: [{
    name: string,                // Tier name (e.g., "VIP", "General")
    price: number,               // Base price
    available: number,           // Available tickets
    sold: number,                // Tickets sold
    fees: [{
      name: string,              // Fee name
      amount: number,            // Fee amount
      type: string               // 'percentage' | 'fixed'
    }],
    serviceFee: number           // Service fee (legacy)
  }],
  
  // Media
  images: [string],              // Array of image URLs
  sourceUrl: string,             // Original event source URL
  
  // Configuration
  capacity: number,              // Total venue capacity
  performers: [string],          // List of performers
  promoterId: string,            // Reference to promoters collection
  
  // Dynamic Pricing
  dynamicPricing: {
    earlyBird: {
      enabled: boolean,
      discount: number,          // Percentage discount
      endDate: string
    },
    lastMinute: {
      enabled: boolean,
      markup: number             // Percentage markup
    },
    groupDiscount: {
      enabled: boolean,
      minSize: number,
      discount: number           // Percentage discount
    }
  },
  
  // SEO
  seo: {
    pageTitle: string,
    pageDescription: string,
    keywords: [string],
    urlSlug: string,
    structuredData: object       // JSON-LD structured data
  },
  
  // Metadata
  status: string,                // 'draft' | 'published' | 'cancelled' | 'soldout'
  createdAt: timestamp,
  updatedAt: timestamp
}

## 2. Venues Collection (venues)

{
  id: string,                    // Auto-generated document ID
  name: string,                  // Venue name
  type: string,                  // 'theater' | 'arena' | 'stadium' | 'club' | 'hall' | 'outdoor'
  
  // Address
  streetAddress1: string,
  streetAddress2: string,
  city: string,
  state: string,
  zipCode: string,
  country: string,               // Default: 'USA'
  
  // Legacy address format
  address: {
    street: string,
    city: string,
    state: string,
    zip: string,
    country: string,
    coordinates: {
      lat: number,
      lng: number
    }
  },
  
  // Location
  latitude: number,
  longitude: number,
  
  // Configuration
  capacity: number,              // Total capacity
  parkingCapacity: number,
  amenities: [string],           // ['Parking', 'WiFi', 'Wheelchair Accessible', etc.]
  
  // Contact
  contactEmail: string,
  contactPhone: string,
  website: string,
  
  // Media
  images: [string],              // Array of image URLs
  logo: string,                  // Venue logo URL
  
  // Layouts
  layouts: [object],             // Array of layout references
  defaultLayoutId: string,       // Default layout to use
  
  // Additional Info
  description: string,
  
  // Metadata
  active: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}

## 3. Layouts Collection (layouts)

{
  id: string,                    // Auto-generated document ID
  name: string,                  // Layout name
  venueId: string,              // Reference to venues collection
  venueName: string,             // Venue name
  
  // Layout Configuration
  sections: [{
    id: string,                  // Section ID
    name: string,                // Section name (e.g., "Orchestra", "Balcony")
    rows: [{
      id: string,                // Row ID
      number: string,            // Row number/letter
      seats: [{
        id: string,              // Seat ID
        number: string,          // Seat number
        status: string,          // 'available' | 'sold' | 'held' | 'blocked'
        price: number,           // Seat price
        type: string            // 'standard' | 'wheelchair' | 'companion'
      }]
    }],
    capacity: number,            // Section capacity
    pricing: {
      base: number,              // Base price for section
      premium: number            // Premium price
    }
  }],
  
  // Configuration
  totalCapacity: number,
  type: string,                  // 'assigned' | 'general'
  
  // Metadata
  createdAt: timestamp,
  updatedAt: timestamp
}

## 4. Orders Collection (orders)

{
  id: string,                    // Auto-generated document ID
  orderNumber: string,           // Human-readable order number
  
  // Event Information
  eventId: string,               // Reference to events collection
  eventName: string,
  venueId: string,               // Reference to venues collection
  venueName: string,
  promoterId: string,            // Reference to promoters collection
  
  // Customer Information
  customerId: string,            // Reference to customers collection
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  
  // Tickets
  tickets: [{
    sectionId: string,
    sectionName: string,
    rowNumber: string,
    seatNumber: string,
    price: number,
    ticketType: string,          // 'adult' | 'child' | 'senior' | 'student'
    barcode: string,             // Ticket barcode
    qrCode: string               // QR code data
  }],
  
  // Pricing
  pricing: {
    subtotal: number,
    serviceFee: number,
    tax: number,
    discountCode: string,
    discountAmount: number,
    total: number
  },
  
  // Legacy pricing fields
  totalAmount: number,
  total: number,
  
  // Payment
  paymentMethod: string,         // 'card' | 'paypal' | 'cash'
  paymentStatus: string,         // 'pending' | 'paid' | 'failed' | 'refunded'
  paymentIntentId: string,       // Stripe payment intent
  
  // Status
  status: string,                // 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded'
  
  // Check-in
  checkInStatus: {
    status: string,              // 'not_checked_in' | 'checked_in'
    checkedInAt: timestamp,
    checkedInBy: string          // User who checked them in
  },
  
  // Refund Information
  refundInfo: {
    refundedAt: timestamp,
    refundedBy: string,
    amount: number,
    reason: string
  },
  
  // Additional
  specialRequests: string,
  notes: string,
  
  // Timestamps
  purchaseDate: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp
}

## 5. Customers Collection (customers)

{
  id: string,                    // Auto-generated document ID
  
  // Personal Information
  name: string,
  email: string,
  phone: string,
  dateOfBirth: timestamp,
  
  // Address
  address: {
    street: string,
    city: string,
    state: string,
    zip: string,
    country: string
  },
  
  // Account
  uid: string,                   // Firebase Auth UID (if registered)
  stripeCustomerId: string,      // Stripe customer ID
  
  // Statistics
  totalOrders: number,
  totalSpent: number,
  lastOrderDate: timestamp,
  
  // Preferences
  preferences: {
    notifications: boolean,
    newsletter: boolean,
    smsAlerts: boolean
  },
  
  // Loyalty
  loyaltyPoints: number,
  membershipTier: string,        // 'bronze' | 'silver' | 'gold' | 'platinum'
  
  // Metadata
  tags: [string],                // Customer tags for segmentation
  notes: string,
  createdAt: timestamp,
  updatedAt: timestamp
}

## 6. Promotions Collection (promotions)

{
  id: string,                    // Auto-generated document ID
  name: string,                  // Promotion name
  code: string,                  // Promo code (uppercase)
  description: string,
  
  // Discount Configuration
  type: string,                  // 'percentage' | 'fixed'
  value: number,                 // Discount value
  
  // Constraints
  minPurchase: number,           // Minimum purchase amount
  maxUses: number,               // Maximum total uses
  usedCount: number,             // Current usage count
  maxUsesPerCustomer: number,    // Max uses per customer
  
  // Validity
  startDate: timestamp,
  endDate: timestamp,
  active: boolean,
  
  // Applicability
  applicableEvents: [string],    // Event IDs this applies to
  applicableVenues: [string],    // Venue IDs this applies to
  
  // Metadata
  createdBy: string,
  createdAt: timestamp,
  updatedAt: timestamp
}

## 7. Promoters Collection (promoters)

{
  id: string,                    // Auto-generated document ID
  name: string,                  // Promoter name
  email: string,
  phone: string,
  
  // Portal Configuration
  slug: string,                  // URL slug for portal (/p/{slug})
  brandingType: string,          // 'basic' | 'advanced'
  
  // Branding
  logo: string,                  // Logo URL
  colorScheme: {
    primary: string,             // Hex color
    secondary: string,           // Hex color
    accent: string,              // Hex color
    background: string,          // Hex color
    text: string                 // Hex color
  },
  
  // Commission
  commission: number,            // Commission percentage
  
  // Users (can manage events)
  users: [{
    id: string,                  // Firebase Auth UID
    email: string,
    name: string,
    phone: string,
    title: string                // Job title/role
  }],
  
  // Additional Info
  website: string,
  description: string,
  company: string,
  
  // Social Media
  socialMedia: {
    facebook: string,
    twitter: string,
    instagram: string
  },
  
  // Status
  active: boolean,
  
  // Metadata
  createdAt: timestamp,
  updatedAt: timestamp
}

## 8. Users Collection (users)

{
  id: string,                    // Document ID (usually Firebase Auth UID)
  uid: string,                   // Firebase Auth UID
  
  // Personal Information
  email: string,
  name: string,
  phone: string,
  title: string,                 // Job title
  
  // Role & Permissions
  role: string,                  // 'admin' | 'promoter' | 'staff' | 'customer'
  permissions: [string],         // Specific permissions
  
  // Associations
  promoterId: string,            // If user belongs to a promoter
  venueIds: [string],           // Venues user can manage
  
  // Profile
  avatar: string,                // Avatar URL
  bio: string,
  
  // Settings
  settings: {
    notifications: boolean,
    twoFactor: boolean,
    theme: string                // 'light' | 'dark'
  },
  
  // Activity
  lastLogin: timestamp,
  loginCount: number,
  
  // Metadata
  createdAt: timestamp,
  updatedAt: timestamp
}

## Indexes

Recommended Firestore composite indexes for optimal query performance:

1. **orders**
   - eventId + createdAt (DESC)
   - customerId + purchaseDate (DESC)
   - status + createdAt (DESC)
   - promoterId + createdAt (DESC)

2. **events**
   - venueId + schedule.date (ASC)
   - promoterId + status + schedule.date (DESC)
   - status + schedule.date (ASC)

3. **customers**
   - email + createdAt (DESC)
   - totalSpent (DESC) + createdAt (DESC)

4. **promotions**
   - active + endDate (DESC)
   - code + active

## Security Rules Structure

// Basic structure for Firestore security rules
match /events/{eventId} {
  allow read: if true;  // Public can view events
  allow write: if request.auth != null && 
    (isAdmin() || isPromoterForEvent(eventId));
}

match /orders/{orderId} {
  allow read: if request.auth != null && 
    (isAdmin() || isOwner(orderId) || isPromoterForOrder(orderId));
  allow create: if request.auth != null;
  allow update: if request.auth != null && isAdmin();
}

match /promoters/{promoterId} {
  allow read: if request.auth != null && 
    (isAdmin() || belongsToPromoter(promoterId));
  allow write: if request.auth != null && isAdmin();
}

## Notes

1. **Timestamps**: All timestamp fields use Firestore's timestamp type
2. **IDs**: Document IDs are auto-generated by Firestore unless specified
3. **Legacy Fields**: Some collections contain legacy fields for backward compatibility
4. **References**: Foreign keys are stored as string IDs referencing other collections
5. **Arrays**: Empty arrays should be initialized as [] not null
6. **Numbers**: Monetary values are stored as numbers (consider using integers for cents)

## Migration Considerations

- When updating schema, ensure backward compatibility
- Use batch operations for bulk updates
- Implement data validation at application level
- Consider using Cloud Functions for complex data operations
- Maintain audit logs for critical operations

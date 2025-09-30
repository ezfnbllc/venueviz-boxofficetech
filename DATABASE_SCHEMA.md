# VenueViz Database Schema - Complete Update

## 1. Events Collection (events)

{
  id: string,
  name: string,
  description: string,
  category: string,
  tags: string[],
  status: string,
  featured: boolean,
  images: {
    cover: string,
    thumbnail: string,
    gallery: string[]
  },
  performers: string[],
  venueId: string,
  venueName: string,
  layoutId: string,
  layoutType: string,
  seatingType: string,
  availableSections: [{
    sectionId: string,
    sectionName: string,
    available: boolean,
    capacity: number,
    standingCapacity: number,
    seatedCapacity: number,
    configurationType: string,
    priceCategories: string,
    minPrice: number,
    maxPrice: number,
    rows: array
  }],
  schedule: {
    performances: [{
      date: string,
      doorsOpen: string,
      startTime: string,
      endTime: string,
      pricingModifier: number,
      capacity: number
    }],
    timezone: string
  },
  pricing: {
    tiers: [{
      id: string,
      name: string,
      basePrice: number,
      sectionId: string,
      capacity: number,
      sold: number,
      priceCategories: string,
      minPrice: number,
      maxPrice: number
    }],
    fees: {
      serviceFee: number,
      serviceFeeType: string,
      serviceFeePer: string,
      processingFee: number,
      processingFeeType: string,
      processingFeePer: string,
      facilityFee: number,
      facilityFeeType: string,
      facilityFeePer: string,
      salesTax: number
    },
    dynamicPricing: {
      earlyBird: {
        enabled: boolean,
        discount: number,
        endDate: string
      },
      lastMinute: {
        enabled: boolean,
        markup: number,
        startDate: string,
        daysBeforeEvent: number
      }
    }
  },
  promoter: {
    promoterId: string,
    promoterName: string,
    commission: number,
    paymentTerms: string,
    responsibilities: string[]
  },
  promotions: {
    linkedPromotions: string[],
    eventPromotions: [{
      id: string,
      code: string,
      type: string,
      value: number,
      maxUses: number,
      validFrom: string,
      validTo: string,
      applicableToTiers: string[]
    }],
    groupDiscount: {
      enabled: boolean,
      minTickets: number,
      discountPercentage: number
    }
  },
  sales: {
    maxTicketsPerOrder: number,
    allowWillCall: boolean,
    refundPolicy: string,
    salesStartDate: string,
    salesEndDate: string
  },
  communications: {
    confirmationEmail: {
      enabled: boolean,
      template: string,
      customMessage: string
    },
    reminderEmail: {
      enabled: boolean,
      daysBefore: number,
      template: string,
      customMessage: string
    },
    seo: {
      metaTitle: string,
      metaDescription: string,
      keywords: string[]
    }
  },
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string,
  updatedBy: string
}

## 2. Venues Collection (venues)

{
  id: string,
  name: string,
  address: {
    street: string,
    city: string,
    state: string,
    zipCode: string,
    country: string
  },
  coordinates: {
    lat: number,
    lng: number
  },
  capacity: number,
  parkingInfo: string,
  amenities: string[],
  layouts: string[],
  defaultLayoutId: string,
  description: string,
  images: string[],
  active: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}

## 3. Layouts Collection (layouts)

{
  id: string,
  name: string,
  venueId: string,
  venueName: string,
  type: string,
  sections: [{
    id: string,
    name: string,
    label: string,
    rows: [{
      id: string,
      label: string,
      y: number,
      seats: [{
        id: string,
        x: number,
        label: string,
        status: string,
        category: string
      }],
      category: string,
      seatCount: number
    }],
    totalSeats: number,
    capacity: number,
    priceCategory: string,
    basePrice: number,
    x: number,
    y: number,
    rotation: number,
    shape: string
  }],
  gaLevels: [{
    id: string,
    name: string,
    capacity: number,
    standingCapacity: number,
    seatedCapacity: number,
    type: string
  }],
  totalCapacity: number,
  stage: {
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    type: string
  },
  aisles: [{
    id: string,
    points: array,
    width: number
  }],
  viewBox: {
    x: number,
    y: number,
    width: number,
    height: number
  },
  priceCategories: [{
    id: string,
    name: string,
    color: string,
    price: number
  }],
  configuration: {
    version: string,
    format: string
  },
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string
}

## 4. Promotions Collection (promotions)

{
  id: string,
  code: string,
  name: string,
  description: string,
  type: string,
  discountType: string,
  value: number,
  discountValue: number,
  discount: number,
  maxUses: number,
  usedCount: number,
  validFrom: timestamp,
  validTo: timestamp,
  applicableCategories: string[],
  minimumPurchase: number,
  active: boolean,
  eventIds: string[],
  createdAt: timestamp,
  updatedAt: timestamp
}

## 5. Promoters Collection (promoters)

{
  id: string,
  name: string,
  company: string,
  email: string,
  phone: string,
  address: {
    street: string,
    city: string,
    state: string,
    zipCode: string
  },
  defaultCommission: number,
  paymentInfo: {
    method: string,
    accountNumber: string,
    routingNumber: string
  },
  events: string[],
  active: boolean,
  rating: number,
  totalEvents: number,
  createdAt: timestamp,
  updatedAt: timestamp
}

## 6. Orders Collection (orders)

{
  id: string,
  eventId: string,
  customerId: string,
  status: string,
  tickets: [{
    tierId: string,
    tierName: string,
    sectionId: string,
    seatId: string,
    price: number,
    fees: {
      serviceFee: number,
      processingFee: number,
      facilityFee: number
    },
    total: number
  }],
  pricing: {
    subtotal: number,
    fees: {
      service: number,
      processing: number,
      facility: number
    },
    tax: number,
    discount: number,
    discountCode: string,
    total: number
  },
  customer: {
    name: string,
    email: string,
    phone: string
  },
  payment: {
    method: string,
    transactionId: string,
    last4: string,
    status: string
  },
  createdAt: timestamp,
  updatedAt: timestamp
}

## 7. Customers Collection (customers)

{
  id: string,
  email: string,
  name: string,
  phone: string,
  dateOfBirth: string,
  address: {
    street: string,
    city: string,
    state: string,
    zipCode: string
  },
  preferences: {
    categories: string[],
    notifications: boolean,
    newsletter: boolean
  },
  orders: string[],
  totalSpent: number,
  createdAt: timestamp,
  updatedAt: timestamp
}

## Database Indexes

Events: venueId, status, schedule.performances.date, featured, createdAt
Orders: eventId, customerId, status, createdAt
Venues: active, capacity
Promotions: code, active, validFrom, validTo

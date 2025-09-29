const getCompleteInitialFormData = () => ({
  basics: {
    name: '',
    description: '',
    category: 'concert',
    tags: [],
    images: {
      cover: '',
      thumbnail: '',
      gallery: []
    },
    status: 'draft',
    featured: false,
    performers: []
  },
  venue: {
    venueId: '',
    layoutId: '',
    seatingType: 'general',
    availableSections: []
  },
  schedule: {
    performances: [],
    timezone: 'America/Chicago'
  },
  pricing: {
    tiers: [],
    dynamicPricing: {
      earlyBird: {
        enabled: false,
        discount: 10,
        endDate: ''
      },
      lastMinute: {
        enabled: false,
        markup: 20,
        startDate: ''
      }
    },
    fees: {
      serviceFee: 0,
      processingFee: 0,
      facilityFee: 0
    }
  },
  promoter: {
    promoterId: '',
    commission: 10,
    paymentTerms: 'net-30',
    responsibilities: []
  },
  promotions: {
    groupDiscount: {
      enabled: false,
      minTickets: 10,
      discountPercentage: 15
    },
    promoCodes: [],
    eventPromotions: []
  },
  sales: {
    maxTicketsPerOrder: 10,
    allowWillCall: true,
    refundPolicy: 'no-refunds',
    salesStartDate: '',
    salesEndDate: ''
  },
  communications: {
    confirmationEmail: {
      enabled: true,
      template: 'default',
      customMessage: ''
    },
    reminderEmail: {
      enabled: true,
      daysBefore: 1,
      template: 'default',
      customMessage: ''
    },
    seo: {
      metaTitle: '',
      metaDescription: '',
      keywords: []
    }
  }
})

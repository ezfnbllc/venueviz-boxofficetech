const getCompleteInitialFormData = () => ({
  basics: {
    name: "",
    description: "",
    category: "concert",
    tags: [],
    images: { cover: "", thumbnail: "", gallery: [] },
    status: "draft",
    featured: false,
    performers: []
  },
  venue: {
    venueId: "",
    layoutId: "",
    seatingType: "general",
    availableSections: []
  },
  schedule: {
    performances: [],
    timezone: "America/Chicago"
  },
  pricing: {
    tiers: [],
    dynamicPricing: {
      earlyBird: { enabled: false, discount: 10, endDate: "" },
      lastMinute: { enabled: false, markup: 20, startDate: "" }
    },
    fees: { serviceFee: 0, processingFee: 0, facilityFee: 0 }
  },
  promoter: {
    promoterId: "",
    commission: 10,
    paymentTerms: "net-30",
    responsibilities: []
  },
  promotions: {
    groupDiscount: { enabled: false, minTickets: 10, discountPercentage: 15 },
    promoCodes: [],
    eventPromotions: []
  },
  sales: {
    maxTicketsPerOrder: 10,
    allowWillCall: true,
    refundPolicy: "no-refunds",
    salesStartDate: "",
    salesEndDate: ""
  },
  communications: {
    confirmationEmail: { enabled: true, template: "default", customMessage: "" },
    reminderEmail: { enabled: true, daysBefore: 1, template: "default", customMessage: "" },
    seo: { metaTitle: "", metaDescription: "", keywords: [] }
  }
})

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface EventWizardState {
  currentStep: number
  eventId: string | null
  isDraft: boolean
  lastSaved: Date | null
  isEditing: boolean
  
  formData: {
    basics: {
      name: string
      description: string
      type: 'concert' | 'theater' | 'sports' | 'comedy' | 'other'
      performers: string[]
      images: {
        cover: string
        gallery: string[]
      }
      status: 'draft' | 'pending_approval' | 'published' | 'cancelled'
      maxTicketsPerCustomer: number
    }
    venue: {
      venueId: string
      layoutId: string
      seatingType: 'reserved' | 'general' | 'mixed'
      availableSections: {
        sectionId: string
        sectionName: string
        available: boolean
        capacity: number
        seatingType: 'reserved' | 'general'
      }[]
    }
    schedule: {
      performances: {
        date: string
        doorsOpen: string
        startTime: string
        endTime: string
        pricingModifier?: number
        capacity?: number
      }[]
      timezone: string
    }
    pricing: {
      tiers: {
        id: string
        name: string
        basePrice: number
        sections: string[]
        inventory: number
        serviceFee: number
      }[]
      dynamicPricing: {
        earlyBird: {
          enabled: boolean
          discount: number
          endDate: string
        }
        lastMinute: {
          enabled: boolean
          markup: number
          daysBeforeEvent: number
        }
        groupDiscount: {
          enabled: boolean
          minSize: number
          discount: number
        }
      }
      fees: {
        processingFee: number
        platformFee: number
        taxRate: number
      }
    }
    promoter: {
      promoterId: string
      commission: number
      approvalRequired: boolean
      portalCustomization: {
        usePromoterBranding: boolean
        customSlug: string
      }
      restrictions: {
        canEditAfterPublish: boolean
        canAccessCustomerData: boolean
        canIssueRefunds: boolean
      }
    }
    promotions: {
      linkedPromotions: string[]
      eventPromotions: {
        code: string
        type: 'percentage' | 'fixed'
        value: number
        maxUses: number
        validFrom: string
        validTo: string
        applicableToTiers: string[]
      }[]
      automaticDiscounts: {
        student: boolean
        senior: boolean
        military: boolean
      }
    }
    sales: {
      salesPeriod: {
        startDate: string
        endDate: string
        autoCloseBeforeEvent: number
      }
      distribution: {
        online: number
        boxOffice: number
      }
      waitlist: {
        enabled: boolean
        autoRelease: boolean
      }
      transferPolicy: 'allowed' | 'restricted' | 'prohibited'
    }
    communications: {
      seo: {
        metaTitle: string
        metaDescription: string
        keywords: string[]
        urlSlug: string
        ogImage: string
      }
      emailAutomation: {
        confirmationEmail: boolean
        reminderEmail: boolean
        reminderDays: number
        postEventSurvey: boolean
      }
      smsNotifications: {
        enabled: boolean
        confirmationSMS: boolean
        reminderSMS: boolean
      }
      calendarSync: {
        googleCalendar: boolean
        appleCalendar: boolean
        outlookCalendar: boolean
      }
    }
  }
  
  validation: {
    [step: number]: {
      isValid: boolean
      errors: string[]
    }
  }
  
  // Actions
  setCurrentStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setEventId: (id: string | null) => void
  updateFormData: (section: string, data: any) => void
  setValidation: (step: number, isValid: boolean, errors: string[]) => void
  resetWizard: () => void
  loadEventData: (eventData: any) => void
  setIsEditing: (isEditing: boolean) => void
}

const initialFormData = getCompleteInitialFormData()

export const useEventWizardStore = create<EventWizardState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      eventId: null,
      isDraft: true,
      lastSaved: null,
      isEditing: false,
      formData: initialFormData,
      validation: {},
      
      setCurrentStep: (step) => set({ currentStep: step }),
      nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 9) })),
      prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
      setEventId: (id) => set({ eventId: id }),
      
      updateFormData: (section, data) => set((state) => ({
        formData: {
          ...state.formData,
          [section]: {
            ...state.formData[section as keyof typeof state.formData],
            ...data
          }
        },
        lastSaved: new Date()
      })),
      
      setValidation: (step, isValid, errors) => set((state) => ({
        validation: {
          ...state.validation,
          [step]: { isValid, errors }
        }
      })),
      
      resetWizard: () => set({
        currentStep: 1,
        eventId: null,
        isDraft: true,
        lastSaved: null,
        isEditing: false,
        formData: initialFormData,
        validation: {}
      }),
      
      loadEventData: (eventData) => {
        const formData = {
          basics: {
            name: eventData.name || '',
            description: eventData.description || '',
            type: eventData.type || 'concert',
            performers: eventData.performers || [],
            images: eventData.images || { cover: '', gallery: [] },
            status: eventData.status || 'draft',
            maxTicketsPerCustomer: eventData.maxTicketsPerCustomer || 10
          },
          venue: {
            venueId: eventData.venueId || '',
            layoutId: eventData.layoutId || '',
            seatingType: eventData.seatingType || 'reserved',
            availableSections: eventData.availableSections || []
          },
          schedule: eventData.schedule || {
            performances: [{
              date: '',
              doorsOpen: '',
              startTime: '',
              endTime: '',
              pricingModifier: 0,
              capacity: 0
            }],
            timezone: 'America/Chicago'
          },
          pricing: eventData.pricing || initialFormData.pricing,
          promoter: eventData.promoter || initialFormData.promoter,
          promotions: eventData.promotions || initialFormData.promotions,
          sales: eventData.sales || initialFormData.sales,
          communications: eventData.communications || initialFormData.communications
        }
        
        set({
          formData,
          eventId: eventData.id,
          isEditing: true,
          isDraft: eventData.status === 'draft'
        })
      },
      
      setIsEditing: (isEditing) => set({ isEditing })
    }),
    {
      name: 'event-wizard-storage',
      partialize: (state) => ({
        formData: state.formData,
        currentStep: state.currentStep,
        eventId: state.eventId
      })
    }
  )
)

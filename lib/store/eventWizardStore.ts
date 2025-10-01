import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const getCompleteInitialData = () => ({
  basics: {
    name: '',
    description: '',
    category: 'concert',
    tags: [],
    images: { cover: '', thumbnail: '', gallery: [] },
    status: 'draft',
    featured: false,
    performers: []
  },
  venue: {
    venueId: '',
    layoutId: '',
    layoutType: '',
    seatingType: 'general',
    availableSections: []
  },
  schedule: {
    performances: [],
    timezone: 'America/Chicago'
  },
  pricing: {
    tiers: [],
    fees: {
      serviceFee: 4,
      serviceFeeType: 'percentage',
      serviceFeePer: 'ticket',
      processingFee: 2.5,
      processingFeeType: 'percentage',
      processingFeePer: 'transaction',
      facilityFee: 0,
      facilityFeeType: 'fixed',
      facilityFeePer: 'ticket',
      salesTax: 8.25
    },
    dynamicPricing: {
      earlyBird: { enabled: false, discount: 10, endDate: '' },
      lastMinute: { enabled: false, markup: 20, startDate: '', daysBeforeEvent: 2 }
    }
  },
  promoter: {
    promoterId: '',
    promoterName: '',
    commission: 10,
    paymentTerms: 'net-30',
    responsibilities: []
  },
  promotions: {
    linkedPromotions: [],
    eventPromotions: [],
    groupDiscount: { enabled: false, minTickets: 10, discountPercentage: 15 }
  },
  sales: {
    maxTicketsPerOrder: 10,
    allowWillCall: true,
    allowMobileTickets: true,
    allowPrintAtHome: false,
    refundPolicy: 'no-refunds',
    customRefundPolicy: '',
    salesStartDate: '',
    salesEndDate: '',
    requireAccountCreation: false,
    enableWaitlist: false,
    showRemainingTickets: true
  },
  communications: {
    confirmationEmail: { enabled: true, template: 'default', customMessage: '' },
    reminderEmail: { enabled: true, daysBefore: 1, template: 'default', customMessage: '' },
    seo: { metaTitle: '', metaDescription: '', keywords: [] }
  }
})

interface EventWizardStore {
  currentStep: number
  formData: ReturnType<typeof getCompleteInitialData>
  validation: Record<number, { isValid: boolean; errors: string[] }>
  eventId: string | null
  isEditing: boolean
  
  setCurrentStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  updateFormData: (section: string, data: any) => void
  setValidation: (step: number, isValid: boolean, errors: string[]) => void
  resetWizard: () => void
  loadEventData: (eventData: any, forceEventId: string) => void
  setEventId: (id: string) => void
  setIsEditing: (editing: boolean) => void
}

export const useEventWizardStore = create<EventWizardStore>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      formData: getCompleteInitialData(),
      validation: {},
      eventId: null,
      isEditing: false,
      
      setCurrentStep: (step) => set({ currentStep: step }),
      
      nextStep: () => set((state) => ({ 
        currentStep: Math.min(state.currentStep + 1, 9) 
      })),
      
      prevStep: () => set((state) => ({ 
        currentStep: Math.max(state.currentStep - 1, 1) 
      })),
      
      updateFormData: (section, data) => {
        console.log(`[UPDATE] Updating ${section} for event ${get().eventId}:`, data)
        
        set((state) => {
          const currentSection = state.formData[section as keyof typeof state.formData] || {}
          
          let mergedData
          if (typeof currentSection === 'object' && !Array.isArray(currentSection) && currentSection !== null) {
            mergedData = { ...currentSection, ...data }
          } else {
            mergedData = data
          }
          
          const newFormData = {
            ...state.formData,
            [section]: mergedData
          }
          
          return { formData: newFormData }
        })
      },
      
      setValidation: (step, isValid, errors) => set((state) => ({
        validation: {
          ...state.validation,
          [step]: { isValid, errors }
        }
      })),
      
      resetWizard: () => {
        console.log('[RESET] Resetting wizard completely')
        set({
          currentStep: 1,
          formData: getCompleteInitialData(),
          validation: {},
          eventId: null,
          isEditing: false
        })
      },
      
      loadEventData: (eventData, forceEventId) => {
        const targetEventId = forceEventId
        console.log(`[LOAD EVENT] Loading event ${targetEventId} with data:`, eventData.name)
        
        // CRITICAL: Always clear and reload for the correct event
        const completeData = getCompleteInitialData()
        
        const mergedData = {
          basics: {
            ...completeData.basics,
            name: eventData.name || '',
            description: eventData.description || '',
            category: eventData.category || 'concert',
            tags: eventData.tags || [],
            images: eventData.images || completeData.basics.images,
            status: eventData.status || 'draft',
            featured: eventData.featured || false,
            performers: eventData.performers || []
          },
          venue: {
            ...completeData.venue,
            venueId: eventData.venueId || '',
            layoutId: eventData.layoutId || '',
            layoutType: eventData.layoutType || '',
            seatingType: eventData.seatingType || 'general',
            availableSections: eventData.availableSections || []
          },
          schedule: { ...completeData.schedule, ...(eventData.schedule || {}) },
          pricing: {
            tiers: eventData.pricing?.tiers || [],
            fees: { ...completeData.pricing.fees, ...(eventData.pricing?.fees || {}) },
            dynamicPricing: { ...completeData.pricing.dynamicPricing, ...(eventData.pricing?.dynamicPricing || {}) }
          },
          promoter: { ...completeData.promoter, ...(eventData.promoter || {}) },
          promotions: {
            ...completeData.promotions,
            linkedPromotions: eventData.promotions?.linkedPromotions || [],
            eventPromotions: eventData.promotions?.eventPromotions || [],
            groupDiscount: { ...completeData.promotions.groupDiscount, ...(eventData.promotions?.groupDiscount || {}) }
          },
          sales: { ...completeData.sales, ...(eventData.sales || {}) },
          communications: { ...completeData.communications, ...(eventData.communications || {}) }
        }
        
        console.log(`[LOAD EVENT] Successfully loaded event ${targetEventId}`)
        set({
          formData: mergedData,
          eventId: targetEventId,
          isEditing: true,
          currentStep: 1
        })
      },
      
      setEventId: (id) => {
        console.log(`[SET EVENT ID] Setting event ID to: ${id}`)
        set({ eventId: id, isEditing: true })
      },
      
      setIsEditing: (editing) => set({ isEditing: editing })
    }),
    {
      name: 'event-wizard-storage',
      // CRITICAL: Only persist form data for drafts, not event state
      partialize: (state) => ({ 
        formData: state.isEditing ? {} : state.formData, // Only persist if not editing existing event
        currentStep: state.isEditing ? 1 : state.currentStep
        // Don't persist eventId or isEditing - these must always come from URL
      })
    }
  )
)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const getCompleteInitialData = () => ({
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
  loadEventData: (eventData: any) => void
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
        console.log(`Updating ${section}:`, data)
        set((state) => {
          const currentSection = state.formData[section as keyof typeof state.formData] || {}
          
          // Deep merge for objects, replace for primitives/arrays
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
          
          console.log(`Updated formData.${section}:`, newFormData[section as keyof typeof newFormData])
          return { formData: newFormData }
        })
      },
      
      setValidation: (step, isValid, errors) => set((state) => ({
        validation: {
          ...state.validation,
          [step]: { isValid, errors }
        }
      })),
      
      resetWizard: () => set({
        currentStep: 1,
        formData: getCompleteInitialData(),
        validation: {},
        eventId: null,
        isEditing: false
      }),
      
      loadEventData: (eventData) => {
        const completeData = getCompleteInitialData()
        
        // Deep merge with defaults to prevent undefined values
        const mergedData = {
          basics: { ...completeData.basics, ...(eventData.basics || eventData) },
          venue: { ...completeData.venue, ...(eventData.venue || {}) },
          schedule: { ...completeData.schedule, ...(eventData.schedule || {}) },
          pricing: {
            tiers: eventData.pricing?.tiers || [],
            fees: { ...completeData.pricing.fees, ...(eventData.pricing?.fees || {}) },
            dynamicPricing: { ...completeData.pricing.dynamicPricing, ...(eventData.pricing?.dynamicPricing || {}) }
          },
          promoter: { ...completeData.promoter, ...(eventData.promoter || {}) },
          promotions: { 
            ...completeData.promotions, 
            ...(eventData.promotions || {}),
            groupDiscount: { ...completeData.promotions.groupDiscount, ...(eventData.promotions?.groupDiscount || {}) }
          },
          sales: { ...completeData.sales, ...(eventData.sales || {}) },
          communications: { ...completeData.communications, ...(eventData.communications || {}) }
        }
        
        set({
          formData: mergedData,
          eventId: eventData.id || null,
          isEditing: true,
          currentStep: 1
        })
      },
      
      setEventId: (id) => set({ eventId: id, isEditing: true }),
      setIsEditing: (editing) => set({ isEditing: editing })
    }),
    {
      name: 'event-wizard-storage',
      partialize: (state) => ({ 
        formData: state.formData,
        eventId: state.eventId,
        isEditing: state.isEditing,
        currentStep: state.currentStep
      })
    }
  )
)

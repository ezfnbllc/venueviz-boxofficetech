import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const getCompleteInitialData = () => ({
  basics: {
    name: '',
    description: '',
    category: 'concert',
    tags: [],
    images: {
      hero: '',
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
      serviceFee: 0,
      processingFee: 0,
      facilityFee: 0,
      salesTax: 8.25
    },
    dynamicPricing: {
      earlyBird: { enabled: false, discount: 10, endDate: '' },
      lastMinute: { enabled: false, markup: 20, startDate: '' }
    }
  },
  promoter: {
    promoterId: '',
    promoterName: '',
    commission: 0,
    paymentTerms: 'net-30',
    responsibilities: []
  },
  promotions: {
    linkedPromotions: [],
    eventPromotions: [],
    groupDiscount: {}
  },
  sales: {
    salesChannels: [],
    presaleSettings: {},
    purchaseLimits: {},
    refundPolicy: 'standard'
  },
  communications: {
    emailTemplates: {},
    socialMedia: {},
    notifications: {}
  }
})

interface EventWizardStore {
  currentStep: number
  formData: ReturnType<typeof getCompleteInitialData>
  validation: any
  eventId: string | null
  isEditing: boolean
  setCurrentStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  updateFormData: (section: string, data: any) => void
  setValidation: (step: number, isValid: boolean, errors?: any) => void
  resetWizard: () => void
  loadEventData: (eventData: any) => void
  setEventId: (id: string | null) => void
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
        set((state) => {
          const currentSection = state.formData[section as keyof typeof state.formData] || {}
          
          let mergedData
          if (typeof currentSection === 'object' && !Array.isArray(currentSection) && currentSection !== null) {
            mergedData = { ...currentSection, ...data }
          } else {
            mergedData = data
          }
          
          return {
            formData: {
              ...state.formData,
              [section]: mergedData
            }
          }
        })
      },
      
      setValidation: (step, isValid, errors) => set((state) => ({
        validation: {
          ...state.validation,
          [step]: { isValid, errors }
        }
      })),
      
      resetWizard: () => {
        console.log('[RESET] Resetting wizard')
        set({
          currentStep: 1,
          formData: getCompleteInitialData(),
          validation: {},
          eventId: null,
          isEditing: false
        })
      },
      
      loadEventData: (eventData) => {
        if (!eventData) {
          console.error('[LOAD EVENT DATA] No event data provided')
          return
        }
        
        const eventIdToUse = eventData.id || get().eventId
        console.log('[LOAD EVENT DATA] Loading event:', eventIdToUse)
        
        const completeData = getCompleteInitialData()
        
        const safeArray = (arr: any) => Array.isArray(arr) ? arr : []
        
        const mergedData = {
          basics: {
            ...completeData.basics,
            name: eventData.name || '',
            description: eventData.description || '',
            category: eventData.category || 'concert',
            tags: safeArray(eventData.tags),
            images: eventData.images || completeData.basics.images,
            status: eventData.status || 'draft',
            featured: eventData.featured || false,
            performers: safeArray(eventData.performers)
          },
          venue: {
            ...completeData.venue,
            venueId: eventData.venueId || '',
            layoutId: eventData.layoutId || '',
            layoutType: eventData.layoutType || '',
            seatingType: eventData.seatingType || 'general',
            availableSections: safeArray(eventData.availableSections)
          },
          schedule: {
            ...completeData.schedule,
            ...(eventData.schedule || {}),
            performances: safeArray(eventData.schedule?.performances)
          },
          pricing: {
            ...completeData.pricing,
            ...(eventData.pricing || {}),
            tiers: safeArray(eventData.pricing?.tiers),
            fees: {
              ...completeData.pricing.fees,
              ...(eventData.pricing?.fees || {})
            },
            dynamicPricing: {
              ...completeData.pricing.dynamicPricing,
              ...(eventData.pricing?.dynamicPricing || {})
            }
          },
          promoter: {
            ...completeData.promoter,
            ...(eventData.promoter || {}),
            responsibilities: safeArray(eventData.promoter?.responsibilities)
          },
          promotions: {
            ...completeData.promotions,
            ...(eventData.promotions || {}),
            linkedPromotions: safeArray(eventData.promotions?.linkedPromotions),
            eventPromotions: safeArray(eventData.promotions?.eventPromotions),
            groupDiscount: eventData.promotions?.groupDiscount || {}
          },
          sales: {
            ...completeData.sales,
            ...(eventData.sales || {})
          },
          communications: {
            ...completeData.communications,
            ...(eventData.communications || {})
          }
        }
        
        set({
          formData: mergedData,
          eventId: eventIdToUse,
          isEditing: true,
          currentStep: 1
        })
      },
      
      setEventId: (id) => {
        console.log('[SET EVENT ID] Setting to:', id)
        set({ eventId: id, isEditing: !!id })
      },
      
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

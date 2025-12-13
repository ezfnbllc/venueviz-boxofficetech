'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'
import { AdminService } from '@/lib/admin/adminService'
import { auth } from '@/lib/firebase'

import Step1Basics from './wizard/Step1Basics'
import Step2Venue from './wizard/Step2Venue'
import Step3Schedule from './wizard/Step3Schedule'
import Step4Pricing from './wizard/Step4Pricing'
import Step5Promoter from './wizard/Step5Promoter'
import Step6Promotions from './wizard/Step6Promotions'
import Step7Sales from './wizard/Step7Sales'
import Step8Communications from './wizard/Step8Communications'
import Step9Review from './wizard/Step9Review'

export default function EventWizard({ onClose, eventId }: { onClose: () => void, eventId?: string }) {
  const router = useRouter()
  const {
    currentStep,
    setCurrentStep,
    nextStep,
    prevStep,
    formData,
    updateFormData,
    validation,
    setValidation,
    resetWizard,
    loadEventData,
    setEventId,
    isEditing
  } = useEventWizardStore()
  
  // Wrapper function for updating form data
  const updateData = (updates: any) => {
    // If updates contain a section key, use it
    const sections = ['basics', 'venue', 'schedule', 'pricing', 'promoter', 'promotions', 'sales', 'communications']
    
    // Try to determine which section to update based on the keys
    let sectionToUpdate = ''
    
    if (updates.name || updates.description || updates.category) sectionToUpdate = 'basics'
    else if (updates.venueId || updates.layoutId) sectionToUpdate = 'venue'
    else if (updates.performances) sectionToUpdate = 'schedule'
    else if (updates.tiers) sectionToUpdate = 'pricing'
    else if (updates.promoterId || updates.promoterName) sectionToUpdate = 'promoter'
    else if (updates.linkedPromotions || updates.eventPromotions) sectionToUpdate = 'promotions'
    else if (updates.salesChannels) sectionToUpdate = 'sales'
    else if (updates.emailTemplates) sectionToUpdate = 'communications'
    
    if (sectionToUpdate) {
      updateFormData(sectionToUpdate, updates)
    }
  }
  
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'admin' | 'promoter'>('admin')
  const loadedEventRef = useRef<string | null>(null)
  
  useEffect(() => {
    const initializeWizard = async () => {
      setLoading(true)

      try {
        const user = auth.currentUser
        if (user) {
          const idTokenResult = await user.getIdTokenResult()
          setUserRole(idTokenResult.claims.role || 'admin')
        }

        if (eventId) {
          if (loadedEventRef.current === eventId) {
            setLoading(false)
            return
          }

          const event = await AdminService.getEvent(eventId)

          if (event) {
            loadedEventRef.current = eventId
            loadEventData({ ...event, id: eventId })
            setEventId(eventId)
          } else {
            alert('Event not found')
            onClose()
          }
        } else {
          loadedEventRef.current = null
          resetWizard()
        }
      } catch (error) {
        console.error('Error loading event:', error)
        alert('Error loading event')
        onClose()
      } finally {
        setLoading(false)
      }
    }

    initializeWizard()
  }, [eventId])
  
  const handleAutoSave = async () => {
    if (!formData.basics?.name) return
    
    setSaving(true)
    try {
      const eventData = prepareEventData()
      
      if (isEditing && eventId) {
        await AdminService.updateEvent(eventId, eventData)
        console.log('Auto-saved existing event')
      } else if (!isEditing) {
        const newEventId = await AdminService.createEvent(eventData)
        setEventId(newEventId)
        loadedEventRef.current = newEventId
        console.log('Created new event:', newEventId)
      }
    } catch (error) {
      console.error('Error auto-saving:', error)
    }
    setSaving(false)
  }
  
  const prepareEventData = () => {
    const safeArray = (arr: any) => Array.isArray(arr) ? arr : []
    
    // Get venue name from venues list if available
    let venueName = formData.venue?.venueName || ''
    if (!venueName && formData.venue?.venueId) {
      const venueMap: Record<string, string> = {
        'FyQXq48Dy5PwbNgt4qBs': 'Grand Theater Plano',
        'xKLtGGAbwrwBZXoJNGjK': 'Euless Convention Center',
      }
      venueName = venueMap[formData.venue.venueId] || ''
    }
    
    return {
      ...formData.basics,
      venueId: formData.venue?.venueId || '',
      venueName: venueName,
      layoutId: formData.venue?.layoutId || '',
      layoutType: formData.venue?.layoutType || '',
      seatingType: formData.venue?.seatingType || 'general',
      availableSections: safeArray(formData.venue?.availableSections),
      // Add date field for backward compatibility
      date: formData.schedule?.performances?.[0]?.date || null,
      schedule: {
        performances: safeArray(formData.schedule?.performances),
        timezone: formData.schedule?.timezone || 'America/Chicago'
      },
      pricing: {
        tiers: safeArray(formData.pricing?.tiers),
        fees: formData.pricing?.fees || {
          serviceFee: 0,
          processingFee: 0,
          facilityFee: 0,
          salesTax: 8.25
        },
        dynamicPricing: formData.pricing?.dynamicPricing || {
          earlyBird: { enabled: false, discount: 10, endDate: '' },
          lastMinute: { enabled: false, markup: 20, startDate: '' }
        }
      },
      promoter: {
        promoterId: formData.promoter?.promoterId || '',
        promoterName: formData.promoter?.promoterName || '',
        commission: formData.promoter?.commission || 0,
        paymentTerms: formData.promoter?.paymentTerms || 'net-30',
        responsibilities: safeArray(formData.promoter?.responsibilities)
      },
      promotions: {
        linkedPromotions: safeArray(formData.promotions?.linkedPromotions),
        eventPromotions: safeArray(formData.promotions?.eventPromotions),
        groupDiscount: formData.promotions?.groupDiscount || {}
      },
      sales: formData.sales || {
        salesChannels: [],
        presaleSettings: {},
        purchaseLimits: {},
        refundPolicy: 'standard'
      },
      communications: formData.communications || {
        emailTemplates: {},
        socialMedia: {},
        notifications: {}
      }
    }
  }
  
  const validateCurrentStep = () => {
    const newValidation: any = {}
    switch(currentStep) {
      case 1:
        if (!formData.basics?.name) newValidation.name = 'Event name is required'
        break
      case 2:
        if (!formData.venue?.venueId) newValidation.venue = 'Please select a venue'
        break
      case 3:
        if (!formData.schedule?.performances?.length) newValidation.schedule = 'Add at least one performance'
        break
    }
    setValidation(newValidation)
    return Object.keys(newValidation).length === 0
  }
  
  const handleNext = () => {
    if (validateCurrentStep()) {
      handleAutoSave()
      nextStep()
    }
  }
  
  const handleSaveAndPublish = async () => {
    setSaving(true)
    try {
      const eventData = { ...prepareEventData(), status: 'active' }
      
      if (isEditing && eventId) {
        await AdminService.updateEvent(eventId, eventData)
      } else {
        const newEventId = await AdminService.createEvent(eventData)
        loadedEventRef.current = newEventId
      }
      
      router.push('/admin/events')
      onClose()
    } catch (error) {
      console.error('Error publishing:', error)
      alert('Error publishing event')
    }
    setSaving(false)
  }
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-100 dark:bg-slate-950 z-50 flex items-center justify-center">
        <div className="card-elevated rounded-2xl p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-3 border-blue-500/50 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-secondary-contrast">Loading event...</p>
          </div>
        </div>
      </div>
    )
  }

  const steps = [
    { number: 1, title: 'Basics', icon: '📝', description: 'Event details' },
    { number: 2, title: 'Venue', icon: '🏛️', description: 'Location setup' },
    { number: 3, title: 'Schedule', icon: '📅', description: 'Dates & times' },
    { number: 4, title: 'Pricing', icon: '💰', description: 'Ticket pricing' },
    { number: 5, title: 'Promoter', icon: '🎭', description: 'Organizer info' },
    { number: 6, title: 'Promotions', icon: '🎁', description: 'Discounts' },
    { number: 7, title: 'Sales', icon: '🎫', description: 'Sales config' },
    { number: 8, title: 'Comms', icon: '📧', description: 'Messaging' },
    { number: 9, title: 'Review', icon: '✅', description: 'Final check' }
  ]
  
  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100
  
  return (
    <>
      {/* Subtle Backdrop */}
      <div className="fixed inset-0 bg-black/40 dark:bg-slate-950/90 backdrop-blur-md z-40" />

      {/* Main Modal */}
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-900">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 dark:from-blue-500/10 via-transparent to-violet-500/5 dark:to-violet-500/10 pointer-events-none"></div>

          <div className="relative px-6 py-4">
            {/* Title and Close Button */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold text-primary-contrast">
                  {isEditing ? 'Edit Event' : 'Create New Event'}
                </h2>
                {isEditing && formData.basics?.name && (
                  <p className="text-secondary-contrast text-sm mt-1">
                    {formData.basics.name}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="btn-secondary p-2 rounded-lg group"
              >
                <svg className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-secondary-contrast mb-1">
                <span>Step {currentStep} of {steps.length}</span>
                <span>{Math.round(progressPercentage)}% Complete</span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-500 dark:to-blue-400 rounded-full transition-all duration-500 ease-out shadow-lg shadow-blue-500/30"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Step Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {steps.map((step) => {
                const isActive = currentStep === step.number
                const isCompleted = currentStep > step.number

                return (
                  <button
                    key={step.number}
                    onClick={() => setCurrentStep(step.number)}
                    className={`
                      relative flex items-center gap-2 px-3 py-2 rounded-xl
                      transition-all duration-200 whitespace-nowrap min-w-fit
                      ${isActive
                        ? 'btn-accent'
                        : isCompleted
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                      }
                    `}
                  >
                    <span className="text-base">{step.icon}</span>
                    <div className="text-left">
                      <div className="text-xs font-semibold">
                        {step.number}. {step.title}
                      </div>
                      <div className={`text-[10px] ${isActive ? 'text-blue-100' : 'text-slate-500 dark:text-slate-500'} hidden sm:block`}>
                        {step.description}
                      </div>
                    </div>
                    {isCompleted && (
                      <svg className="absolute -top-1 -right-1 w-4 h-4 text-emerald-500 dark:text-emerald-400 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-5xl mx-auto">
            <div className="card-elevated rounded-2xl p-6">
              {currentStep === 1 && <Step1Basics />}
              {currentStep === 2 && <Step2Venue />}
              {currentStep === 3 && <Step3Schedule />}
              {currentStep === 4 && <Step4Pricing />}
              {currentStep === 5 && <Step5Promoter />}
              {currentStep === 6 && <Step6Promotions />}
              {currentStep === 7 && <Step7Sales />}
              {currentStep === 8 && <Step8Communications />}
              {currentStep === 9 && <Step9Review />}
              {(currentStep < 1 || currentStep > 9) && (
                <div className="text-red-400 p-4">Invalid step: {currentStep}</div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-4 shadow-lg shadow-slate-900/5 dark:shadow-none">
          <div className="flex justify-between items-center">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`
                px-6 py-2.5 rounded-xl font-medium transition-all
                ${currentStep === 1
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-50'
                  : 'btn-secondary'
                }
              `}
            >
              ← Previous
            </button>

            <div className="flex items-center gap-4">
              {validation && Object.keys(validation).length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl">
                  <svg className="w-4 h-4 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-600 dark:text-red-400 text-sm font-medium">
                    {Object.values(validation)[0] as string}
                  </span>
                </div>
              )}

              {saving && (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                  <div className="w-3 h-3 border-2 border-amber-500 dark:border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              )}
            </div>

            {currentStep < 9 ? (
              <button
                onClick={handleNext}
                className="btn-accent px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/25"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSaveAndPublish}
                disabled={saving}
                className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 px-6 py-2.5 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving ? 'Publishing...' : (isEditing ? 'Update Event' : 'Save & Publish')}
              </button>
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  )
}

'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'
import { AdminService } from '@/lib/admin/adminService'
import { Timestamp } from 'firebase/firestore'
import { auth } from '@/lib/firebase'

// Import step components
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
    validation,
    setValidation,
    resetWizard,
    loadEventData,
    setEventId,
    isEditing
  } = useEventWizardStore()
  
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'promoter'>('admin')
  
  useEffect(() => {
    const checkUserRole = async () => {
      const user = auth.currentUser
      if (user) {
        const idTokenResult = await user.getIdTokenResult()
        setUserRole(idTokenResult.claims.role || 'admin')
      }
    }
    checkUserRole()
    
    if (eventId && !isEditing) {
      loadExistingEvent(eventId)
    }
  }, [eventId])
  
  const loadExistingEvent = async (id: string) => {
    setLoading(true)
    try {
      const event = await AdminService.getEvent(id)
      if (event) {
        loadEventData(event)
        setEventId(id)
      }
    } catch (error) {
      console.error('Error loading event:', error)
    }
    setLoading(false)
  }
  
  const handleAutoSave = async () => {
    if (!formData.basics?.name) return
    
    setSaving(true)
    try {
      const eventData = prepareEventData()
      
      if (isEditing && eventId) {
        await AdminService.updateEvent(eventId, eventData)
      } else {
        const newEventId = await AdminService.createEvent(eventData)
        setEventId(newEventId)
      }
      
      console.log('Auto-saved')
    } catch (error) {
      console.error('Error auto-saving:', error)
    }
    setSaving(false)
  }
  
  const prepareEventData = () => {
    return {
      // Basic Information
      ...formData.basics,
      
      // Venue Configuration
      venueId: formData.venue?.venueId || '',
      layoutId: formData.venue?.layoutId || '',
      layoutType: formData.venue?.layoutType || '',
      seatingType: formData.venue?.seatingType || 'general',
      availableSections: formData.venue?.availableSections || [],
      
      // Schedule
      schedule: formData.schedule || { performances: [], timezone: 'America/Chicago' },
      
      // Pricing - COMPLETE STRUCTURE
      pricing: {
        tiers: formData.pricing?.tiers || [],
        fees: formData.pricing?.fees || {},
        dynamicPricing: formData.pricing?.dynamicPricing || {}
      },
      
      // Promoter - COMPLETE STRUCTURE
      promoter: {
        promoterId: formData.promoter?.promoterId || '',
        promoterName: formData.promoter?.promoterName || '',
        commission: formData.promoter?.commission || 0,
        paymentTerms: formData.promoter?.paymentTerms || 'net-30',
        responsibilities: formData.promoter?.responsibilities || []
      },
      
      // Promotions - COMPLETE STRUCTURE
      promotions: {
        linkedPromotions: formData.promotions?.linkedPromotions || [],
        eventPromotions: formData.promotions?.eventPromotions || [],
        groupDiscount: formData.promotions?.groupDiscount || {}
      },
      
      // Sales - COMPLETE STRUCTURE
      sales: formData.sales || {},
      
      // Communications
      communications: formData.communications || {}
    }
  }
  
  const validateCurrentStep = () => {
    // Don't validate while loading
    if (loading) return true
    
    let isValid = true
    let errors: string[] = []
    
    switch(currentStep) {
      case 1:
        if (!formData.basics?.name) {
          errors.push('Event name is required')
          isValid = false
        }
        if (!formData.basics?.description) {
          errors.push('Event description is required')
          isValid = false
        }
        break
      case 2:
        if (!formData.venue?.venueId) {
          errors.push('Venue selection is required')
          isValid = false
        }
        break
      case 3:
        // Safe check for performances array
        const performances = formData.schedule?.performances || []
        if (performances.length === 0) {
          errors.push('At least one performance date is required')
          isValid = false
        }
        break
      case 4:
        // Safe check for pricing tiers array
        const tiers = formData.pricing?.tiers || []
        if (tiers.length === 0) {
          errors.push('At least one pricing tier is required')
          isValid = false
        }
        break
    }
    
    setValidation(currentStep, isValid, errors)
    return isValid
  }
  
  const handleNext = async () => {
    if (validateCurrentStep()) {
      await handleAutoSave()
      nextStep()
    }
  }
  
  const handlePrev = () => {
    prevStep()
  }
  
  const handleStepClick = (step: number) => {
    if (step <= currentStep) {
      setCurrentStep(step)
    }
  }
  
  const handlePublish = async () => {
    setSaving(true)
    try {
      const eventData = prepareEventData()
      eventData.status = userRole === 'promoter' ? 'pending_approval' : 'published'
      
      if (isEditing && eventId) {
        await AdminService.updateEvent(eventId, eventData)
      } else {
        await AdminService.createEvent(eventData)
      }
      
      resetWizard()
      onClose()
    } catch (error) {
      console.error('Error publishing event:', error)
    }
    setSaving(false)
  }
  
  const handleSaveDraft = async () => {
    await handleAutoSave()
    onClose()
  }
  
  const handleCancel = () => {
    if (confirm('Are you sure? Any unsaved changes will be lost.')) {
      resetWizard()
      onClose()
    }
  }
  
  const steps = [
    { number: 1, title: 'Event Basics', component: Step1Basics },
    { number: 2, title: 'Venue & Seating', component: Step2Venue },
    { number: 3, title: 'Schedule', component: Step3Schedule },
    { number: 4, title: 'Pricing', component: Step4Pricing },
    { number: 5, title: 'Promoter', component: Step5Promoter },
    { number: 6, title: 'Promotions', component: Step6Promotions },
    { number: 7, title: 'Sales', component: Step7Sales },
    { number: 8, title: 'Communications', component: Step8Communications },
    { number: 9, title: 'Review & Publish', component: Step9Review },
  ]
  
  const currentStepData = steps.find(s => s.number === currentStep)
  const CurrentStepComponent = currentStepData?.component || Step1Basics
  
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            <span>Loading event...</span>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg w-full max-w-6xl mx-4 my-4 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold">
            {isEditing ? 'Edit Event' : 'Create New Event'}
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <button
                  onClick={() => handleStepClick(step.number)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step.number === currentStep
                      ? 'bg-purple-600 text-white'
                      : step.number < currentStep
                      ? 'bg-green-600 text-white cursor-pointer'
                      : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  {step.number < currentStep ? '✓' : step.number}
                </button>
                <span className={`ml-2 text-sm ${
                  step.number === currentStep ? 'text-purple-400' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`mx-4 h-0.5 w-8 ${
                    step.number < currentStep ? 'bg-green-600' : 'bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <CurrentStepComponent />
          
          {/* Validation Errors */}
          {validation[currentStep] && !validation[currentStep].isValid && (
            <div className="mt-4 p-4 bg-red-600/20 border border-red-600/40 rounded-lg">
              <h4 className="font-semibold text-red-400 mb-2">Please fix the following:</h4>
              <ul className="list-disc list-inside space-y-1">
                {validation[currentStep].errors.map((error, index) => (
                  <li key={index} className="text-red-300 text-sm">{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700 transition-colors"
              >
                Previous
              </button>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            
            {currentStep < 9 ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handlePublish}
                className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                disabled={saving}
              >
                {saving ? 'Publishing...' : 'Publish Event'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

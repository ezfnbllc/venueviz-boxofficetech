'use client'
import { useState, useEffect } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'
import { AdminService } from '@/lib/admin/adminService'
import { Timestamp } from 'firebase/firestore'
import { auth } from '@/lib/firebase'

// Import step components (we'll create these next)
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
  const [userRole, setUserRole] = useState<'admin' | 'promoter'>('admin')
  
  useEffect(() => {
    // Check user role
    const checkUserRole = async () => {
      const user = auth.currentUser
      if (user) {
        const idTokenResult = await user.getIdTokenResult()
        setUserRole(idTokenResult.claims.role || 'admin')
      }
    }
    checkUserRole()
    
    // Load event data if editing
    if (eventId && !isEditing) {
      loadExistingEvent(eventId)
    }
    
    return () => {
      // Auto-save on unmount if there are changes
      if (formData.basics.name) {
        handleAutoSave()
      }
    }
  }, [eventId])
  
  const loadExistingEvent = async (id: string) => {
    try {
      const event = await AdminService.getEvent(id)
      if (event) {
        loadEventData(event)
        setEventId(id)
      }
    } catch (error) {
      console.error('Error loading event:', error)
    }
  }
  
  const handleAutoSave = async () => {
    if (!formData.basics.name) return
    
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
      ...formData.basics,
      venueId: formData.venue.venueId,
      venueName: formData.venue.availableSections[0]?.sectionName || '',
      layoutId: formData.venue.layoutId,
      seatingType: formData.venue.seatingType,
      availableSections: formData.venue.availableSections,
      schedule: formData.schedule,
      pricing: formData.pricing.tiers,
      dynamicPricing: formData.pricing.dynamicPricing,
      fees: formData.pricing.fees,
      promoterId: formData.promoter.promoterId,
      promoterConfig: formData.promoter,
      promotions: formData.promotions,
      sales: formData.sales,
      communications: formData.communications,
      seo: formData.communications.seo,
      status: userRole === 'promoter' ? 'pending_approval' : formData.basics.status,
      createdBy: auth.currentUser?.uid,
      updatedAt: Timestamp.now()
    }
  }
  
  const validateCurrentStep = () => {
    let isValid = true
    let errors: string[] = []
    
    switch(currentStep) {
      case 1:
        if (!formData.basics.name) {
          errors.push('Event name is required')
          isValid = false
        }
        if (!formData.basics.description) {
          errors.push('Event description is required')
          isValid = false
        }
        break
      case 2:
        if (!formData.venue.venueId) {
          errors.push('Venue selection is required')
          isValid = false
        }
        if (!formData.venue.layoutId) {
          errors.push('Layout selection is required')
          isValid = false
        }
        break
      case 3:
        if (formData.schedule.performances.length === 0) {
          errors.push('At least one performance date is required')
          isValid = false
        }
        break
      case 4:
        if (formData.pricing.tiers.length === 0) {
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
  
  const steps = [
    { number: 1, title: 'Event Basics', component: Step1Basics },
    { number: 2, title: 'Venue & Seating', component: Step2Venue },
    { number: 3, title: 'Schedule', component: Step3Schedule },
    { number: 4, title: 'Pricing', component: Step4Pricing },
    { number: 5, title: 'Promoter', component: Step5Promoter },
    { number: 6, title: 'Promotions', component: Step6Promotions },
    { number: 7, title: 'Sales Settings', component: Step7Sales },
    { number: 8, title: 'Communications', component: Step8Communications },
    { number: 9, title: 'Review & Publish', component: Step9Review }
  ]
  
  const CurrentStepComponent = steps[currentStep - 1].component
  
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              {isEditing ? 'Edit Event' : 'Create New Event'}
            </h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="flex items-center"
                style={{ flex: index < steps.length - 1 ? 1 : 'initial' }}
              >
                <button
                  onClick={() => handleStepClick(step.number)}
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full
                    ${currentStep === step.number 
                      ? 'bg-white text-purple-600' 
                      : currentStep > step.number 
                      ? 'bg-green-500 text-white' 
                      : 'bg-white/30 text-white/60'}
                    ${step.number <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'}
                    transition-all
                  `}
                  disabled={step.number > currentStep}
                >
                  {currentStep > step.number ? '✓' : step.number}
                </button>
                {index < steps.length - 1 && (
                  <div 
                    className={`flex-1 h-0.5 mx-2 ${
                      currentStep > step.number ? 'bg-green-500' : 'bg-white/30'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          
          {/* Step Title */}
          <div className="mt-4 text-center">
            <p className="text-white/80 text-sm">Step {currentStep} of {steps.length}</p>
            <h3 className="text-xl font-semibold">{steps[currentStep - 1].title}</h3>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <CurrentStepComponent />
          
          {/* Validation Errors */}
          {validation[currentStep] && !validation[currentStep].isValid && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 font-semibold mb-2">Please fix the following errors:</p>
              <ul className="list-disc list-inside text-red-400 text-sm">
                {validation[currentStep].errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="border-t border-white/10 p-6">
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              {currentStep > 1 && (
                <button
                  onClick={handlePrev}
                  className="px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                >
                  Previous
                </button>
              )}
              <button
                onClick={handleSaveDraft}
                className="px-6 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
              >
                Save Draft
              </button>
            </div>
            
            <div className="flex gap-3">
              {saving && (
                <span className="text-sm text-gray-400 flex items-center">
                  <span className="animate-spin mr-2">⏳</span> Saving...
                </span>
              )}
              
              {currentStep < 9 ? (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700"
                >
                  Next
                </button>
              ) : (
                <>
                  {userRole === 'promoter' ? (
                    <button
                      onClick={handlePublish}
                      className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700"
                    >
                      Submit for Approval
                    </button>
                  ) : (
                    <button
                      onClick={handlePublish}
                      className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 rounded-lg hover:from-green-700 hover:to-green-800"
                    >
                      Publish Event
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

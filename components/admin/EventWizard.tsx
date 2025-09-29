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
    
    return () => {
      if (formData.basics.name) {
        handleAutoSave()
      }
    }
  }, [eventId, isEditing])
  
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
    { number: 7, title: 'Sales Settings', component: Step7Sales },
    { number: 8, title: 'Communications', component: Step8Communications },
    { number: 9, title: 'Review & Publish', component: Step9Review }
  ]
  
  const CurrentStepComponent = steps[currentStep - 1].component
  
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Compact Header */}
      <div className="bg-gray-900 border-b border-white/10 py-3 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-white transition-colors"
                title="Back to Events"
              >
                ← Back
              </button>
              <h2 className="text-xl font-bold">
                {isEditing ? 'Edit Event' : 'Create New Event'}
              </h2>
              <span className="text-sm text-gray-400">
                Step {currentStep} of 9: {steps[currentStep - 1].title}
              </span>
            </div>
            {saving && (
              <span className="text-sm text-gray-400 flex items-center">
                <span className="animate-spin mr-2">⏳</span> Saving...
              </span>
            )}
          </div>
          
          {/* Compact Progress Steps */}
          <div className="flex items-center gap-1">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <button
                  onClick={() => handleStepClick(step.number)}
                  className={`
                    w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center
                    ${currentStep === step.number 
                      ? 'bg-purple-600 text-white' 
                      : currentStep > step.number 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-700 text-gray-400'}
                    ${step.number <= currentStep ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'}
                    transition-all
                  `}
                  disabled={step.number > currentStep}
                  title={step.title}
                >
                  {currentStep > step.number ? '✓' : step.number}
                </button>
                {index < steps.length - 1 && (
                  <div 
                    className={`flex-1 h-0.5 ${
                      currentStep > step.number ? 'bg-green-600' : 'bg-gray-700'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-gray-900 rounded-xl p-6">
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
        
        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={handlePrev}
                className="px-6 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleSaveDraft}
              className="px-6 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Save Draft
            </button>
          </div>
          
          <div className="flex gap-3">
            {currentStep < 9 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <>
                {userRole === 'promoter' ? (
                  <button
                    onClick={handlePublish}
                    className="px-6 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Submit for Approval
                  </button>
                ) : (
                  <button
                    onClick={handlePublish}
                    className="px-6 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
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
  )
}

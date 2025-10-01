'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'
import { AdminService } from '@/lib/admin/adminService'
import { Timestamp } from 'firebase/firestore'
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
    validation,
    setValidation,
    resetWizard,
    loadEventData,
    setEventId,
    isEditing
  } = useEventWizardStore()
  
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'admin' | 'promoter'>('admin')
  const loadedEventRef = useRef<string | null>(null)
  
  useEffect(() => {
    const initializeWizard = async () => {
      console.log('[WIZARD INIT] Starting initialization')
      setLoading(true)
      
      try {
        const user = auth.currentUser
        if (user) {
          const idTokenResult = await user.getIdTokenResult()
          setUserRole(idTokenResult.claims.role || 'admin')
        }
        
        if (eventId) {
          // Prevent duplicate loads
          if (loadedEventRef.current === eventId) {
            console.log('[WIZARD INIT] Event already loaded:', eventId)
            setLoading(false)
            return
          }
          
          console.log('[WIZARD INIT] Loading event:', eventId)
          const event = await AdminService.getEvent(eventId)
          
          if (event) {
            console.log('[WIZARD INIT] Event data retrieved:', event.name)
            loadedEventRef.current = eventId
            
            // Pass the event with its ID
            loadEventData({ ...event, id: eventId })
            setEventId(eventId)
          } else {
            console.error('[WIZARD INIT] Event not found:', eventId)
            alert('Event not found')
            onClose()
          }
        } else {
          console.log('[WIZARD INIT] New event mode')
          loadedEventRef.current = null
          resetWizard()
        }
      } catch (error) {
        console.error('[WIZARD INIT] Error:', error)
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
    
    return {
      ...formData.basics,
      venueId: formData.venue?.venueId || '',
      layoutId: formData.venue?.layoutId || '',
      layoutType: formData.venue?.layoutType || '',
      seatingType: formData.venue?.seatingType || 'general',
      availableSections: safeArray(formData.venue?.availableSections),
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
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
        <div className="text-white">Loading event...</div>
      </div>
    )
  }
  
  const steps = [
    { number: 1, title: 'Basics' },
    { number: 2, title: 'Venue' },
    { number: 3, title: 'Schedule' },
    { number: 4, title: 'Pricing' },
    { number: 5, title: 'Promoter' },
    { number: 6, title: 'Promotions' },
    { number: 7, title: 'Sales' },
    { number: 8, title: 'Communications' },
    { number: 9, title: 'Review' }
  ]
  
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">
            {isEditing ? `Edit Event: ${formData.basics?.name || 'Loading...'}` : 'Create New Event'}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white text-3xl leading-none"
          >
            ×
          </button>
        </div>
        
        <div className="flex space-x-2 overflow-x-auto">
          {steps.map((step) => (
            <button
              key={step.number}
              onClick={() => setCurrentStep(step.number)}
              className={`px-4 py-2 rounded whitespace-nowrap ${
                currentStep === step.number
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {step.number}. {step.title}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
        {currentStep === 1 && <Step1Basics />}
        {currentStep === 2 && <Step2Venue />}
        {currentStep === 3 && <Step3Schedule />}
        {currentStep === 4 && <Step4Pricing />}
        {currentStep === 5 && <Step5Promoter />}
        {currentStep === 6 && <Step6Promotions />}
        {currentStep === 7 && <Step7Sales />}
        {currentStep === 8 && <Step8Communications />}
        {currentStep === 9 && <Step9Review />}
      </div>
      
      <div className="bg-gray-900 border-t border-gray-800 p-4 flex justify-between items-center">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 disabled:opacity-50"
        >
          Previous
        </button>
        
        <div className="flex items-center gap-4">
          {validation && Object.keys(validation).length > 0 && (
            <div className="text-red-500 text-sm">
              {Object.values(validation)[0] as string}
            </div>
          )}
          
          {saving && <span className="text-yellow-500">Saving...</span>}
        </div>
        
        {currentStep < 9 ? (
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSaveAndPublish}
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isEditing ? 'Update Event' : 'Save & Publish'}
          </button>
        )}
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'

export default function Step8Communications() {
  const { formData, updateFormData } = useEventWizardStore()
  const [keywordInput, setKeywordInput] = useState('')
  
  const updateSEO = (field: string, value: any) => {
    updateFormData('communications', {
      seo: {
        ...formData.communications.seo,
        [field]: value
      }
    })
  }
  
  const addKeyword = () => {
    if (keywordInput.trim()) {
      updateSEO('keywords', [...formData.communications.seo.keywords, keywordInput.trim()])
      setKeywordInput('')
    }
  }
  
  const removeKeyword = (index: number) => {
    updateSEO('keywords', formData.communications.seo.keywords.filter((_, i) => i !== index))
  }
  
  const updateEmailAutomation = (field: string, value: any) => {
    updateFormData('communications', {
      emailAutomation: {
        ...formData.communications.emailAutomation,
        [field]: value
      }
    })
  }
  
  const updateSMSNotifications = (field: string, value: any) => {
    updateFormData('communications', {
      smsNotifications: {
        ...formData.communications.smsNotifications,
        [field]: value
      }
    })
  }
  
  const updateCalendarSync = (field: string, value: boolean) => {
    updateFormData('communications', {
      calendarSync: {
        ...formData.communications.calendarSync,
        [field]: value
      }
    })
  }
  
  const generateSlug = () => {
    const slug = formData.basics.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    updateSEO('urlSlug', slug)
  }
  
  return (
    <div className="space-y-6">
      {/* SEO Settings */}
      <div>
        <label className="block text-sm font-medium mb-3">SEO & Meta Tags</label>
        <div className="bg-black/20 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-xs mb-1">Meta Title</label>
            <input
              type="text"
              value={formData.communications.seo.metaTitle}
              onChange={(e) => updateSEO('metaTitle', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 rounded"
              placeholder={formData.basics.name || 'Event title for search engines'}
              maxLength={60}
            />
            <p className="text-xs text-gray-400 mt-1">
              {formData.communications.seo.metaTitle.length}/60 characters
            </p>
          </div>
          
          <div>
            <label className="block text-xs mb-1">Meta Description</label>
            <textarea
              value={formData.communications.seo.metaDescription}
              onChange={(e) => updateSEO('metaDescription', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 rounded h-20"
              placeholder={formData.basics.description?.substring(0, 160) || 'Brief description for search results'}
              maxLength={160}
            />
            <p className="text-xs text-gray-400 mt-1">
              {formData.communications.seo.metaDescription.length}/160 characters
            </p>
          </div>
          
          <div>
            <label className="block text-xs mb-1">URL Slug</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.communications.seo.urlSlug}
                onChange={(e) => updateSEO('urlSlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="flex-1 px-3 py-2 bg-white/10 rounded"
                placeholder="event-url-slug"
              />
              <button
                type="button"
                onClick={generateSlug}
                className="px-3 py-2 bg-purple-600 rounded hover:bg-purple-700"
              >
                Auto-generate
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-xs mb-1">Keywords</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                className="flex-1 px-3 py-2 bg-white/10 rounded"
                placeholder="Add keyword"
              />
              <button
                type="button"
                onClick={addKeyword}
                className="px-3 py-2 bg-purple-600 rounded hover:bg-purple-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.communications.seo.keywords.map((keyword, index) => (
                <span key={index} className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full flex items-center gap-2 text-sm">
                  {keyword}
                  <button
                    onClick={() => removeKeyword(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-xs mb-1">Open Graph Image</label>
            <input
              type="text"
              value={formData.communications.seo.ogImage}
              onChange={(e) => updateSEO('ogImage', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 rounded"
              placeholder={formData.basics.images.cover || 'URL for social media preview image'}
            />
            <p className="text-xs text-gray-400 mt-1">
              Image shown when sharing on social media (1200x630px recommended)
            </p>
          </div>
        </div>
      </div>
      
      {/* Email Automation */}
      <div>
        <label className="block text-sm font-medium mb-3">Email Automation</label>
        <div className="bg-black/20 rounded-lg p-4 space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.communications.emailAutomation.confirmationEmail}
              onChange={(e) => updateEmailAutomation('confirmationEmail', e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <span className="font-medium">Confirmation Email</span>
              <p className="text-xs text-gray-400">
                Send order confirmation with tickets immediately after purchase
              </p>
            </div>
          </label>
          
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.communications.emailAutomation.reminderEmail}
              onChange={(e) => updateEmailAutomation('reminderEmail', e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <span className="font-medium">Reminder Email</span>
              <p className="text-xs text-gray-400">
                Send event reminder before the event
              </p>
            </div>
          </label>
          
          {formData.communications.emailAutomation.reminderEmail && (
            <div className="ml-8">
              <label className="block text-xs mb-1">Days Before Event</label>
              <input
                type="number"
                value={formData.communications.emailAutomation.reminderDays}
                onChange={(e) => updateEmailAutomation('reminderDays', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-white/10 rounded"
                min="1"
                max="7"
              />
            </div>
          )}
          
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.communications.emailAutomation.postEventSurvey}
              onChange={(e) => updateEmailAutomation('postEventSurvey', e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <span className="font-medium">Post-Event Survey</span>
              <p className="text-xs text-gray-400">
                Send feedback survey 1 day after the event
              </p>
            </div>
          </label>
        </div>
      </div>
      
      {/* SMS Notifications */}
      <div>
        <label className="block text-sm font-medium mb-3">SMS Notifications</label>
        <div className="bg-black/20 rounded-lg p-4 space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.communications.smsNotifications.enabled}
              onChange={(e) => updateSMSNotifications('enabled', e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <span className="font-medium">Enable SMS Notifications</span>
              <p className="text-xs text-gray-400">
                Allow customers to opt-in for text message updates
              </p>
            </div>
          </label>
          
          {formData.communications.smsNotifications.enabled && (
            <>
              <label className="flex items-center gap-3 ml-8">
                <input
                  type="checkbox"
                  checked={formData.communications.smsNotifications.confirmationSMS}
                  onChange={(e) => updateSMSNotifications('confirmationSMS', e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <div>
                  <span className="font-medium">Order Confirmation SMS</span>
                  <p className="text-xs text-gray-400">
                    Send ticket details via SMS
                  </p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 ml-8">
                <input
                  type="checkbox"
                  checked={formData.communications.smsNotifications.reminderSMS}
                  onChange={(e) => updateSMSNotifications('reminderSMS', e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <div>
                  <span className="font-medium">Event Reminder SMS</span>
                  <p className="text-xs text-gray-400">
                    Send reminder on event day
                  </p>
                </div>
              </label>
            </>
          )}
        </div>
      </div>
      
      {/* Calendar Sync */}
      <div>
        <label className="block text-sm font-medium mb-3">Calendar Integration</label>
        <div className="bg-black/20 rounded-lg p-4 space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.communications.calendarSync.googleCalendar}
              onChange={(e) => updateCalendarSync('googleCalendar', e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <span className="font-medium">Google Calendar</span>
              <p className="text-xs text-gray-400">
                Add "Add to Google Calendar" button
              </p>
            </div>
          </label>
          
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.communications.calendarSync.appleCalendar}
              onChange={(e) => updateCalendarSync('appleCalendar', e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <span className="font-medium">Apple Calendar</span>
              <p className="text-xs text-gray-400">
                Generate .ics file for Apple devices
              </p>
            </div>
          </label>
          
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.communications.calendarSync.outlookCalendar}
              onChange={(e) => updateCalendarSync('outlookCalendar', e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <span className="font-medium">Outlook Calendar</span>
              <p className="text-xs text-gray-400">
                Support Outlook calendar integration
              </p>
            </div>
          </label>
        </div>
      </div>
      
      {/* Communication Preview */}
      <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-4">
        <h4 className="font-semibold mb-3">Communication Summary</h4>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-gray-400">Emails:</span>
            <ul className="ml-4 mt-1">
              {formData.communications.emailAutomation.confirmationEmail && <li>• Order confirmation</li>}
              {formData.communications.emailAutomation.reminderEmail && <li>• Reminder ({formData.communications.emailAutomation.reminderDays} day before)</li>}
              {formData.communications.emailAutomation.postEventSurvey && <li>• Post-event survey</li>}
            </ul>
          </div>
          {formData.communications.smsNotifications.enabled && (
            <div>
              <span className="text-gray-400">SMS:</span>
              <ul className="ml-4 mt-1">
                {formData.communications.smsNotifications.confirmationSMS && <li>• Order confirmation</li>}
                {formData.communications.smsNotifications.reminderSMS && <li>• Event day reminder</li>}
              </ul>
            </div>
          )}
          <div>
            <span className="text-gray-400">Calendar:</span>
            <ul className="ml-4 mt-1">
              {formData.communications.calendarSync.googleCalendar && <li>• Google Calendar</li>}
              {formData.communications.calendarSync.appleCalendar && <li>• Apple Calendar</li>}
              {formData.communications.calendarSync.outlookCalendar && <li>• Outlook</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { useEventWizardStore } from '@/lib/store/eventWizardStore'
import AIButton from '../AIButton'
import AILoadingState from '../AILoadingState'
import ConfidenceBadge from '../ConfidenceBadge'

export default function Step8Communications() {
  const { formData, updateFormData } = useEventWizardStore()
  const [keywordInput, setKeywordInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiConfidence, setAiConfidence] = useState<number | null>(null)
  const [showAdvancedSEO, setShowAdvancedSEO] = useState(false)
  
  const updateSEO = (field: string, value: any) => {
    updateFormData('communications', {
      seo: {
        ...formData.communications?.seo,
        [field]: value
      }
    })
  }
  
  const addKeyword = () => {
    if (keywordInput.trim()) {
      const currentKeywords = formData.communications?.seo?.keywords || []
      updateSEO('keywords', [...currentKeywords, keywordInput.trim()])
      setKeywordInput('')
    }
  }
  
  const removeKeyword = (index: number) => {
    const currentKeywords = formData.communications?.seo?.keywords || []
    updateSEO('keywords', currentKeywords.filter((_: string, i: number) => i !== index))
  }
  
  const handleAIGenerateSEO = async () => {
    setAiLoading(true)
    try {
      // Gather event data
      const performers = formData.basics?.performers || []
      const minPrice = formData.pricing?.tiers?.length > 0 
        ? Math.min(...formData.pricing.tiers.map((t: any) => t.basePrice || 0))
        : null
      const maxPrice = formData.pricing?.tiers?.length > 0
        ? Math.max(...formData.pricing.tiers.map((t: any) => t.basePrice || 0))
        : null

      const response = await fetch('/api/ai/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName: formData.basics?.name,
          description: formData.basics?.description,
          category: formData.basics?.category,
          performers: performers,
          venue: formData.venue?.venueName,
          date: formData.schedule?.performances?.[0]?.date,
          pricing: minPrice && maxPrice ? { min: minPrice, max: maxPrice } : null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate SEO')
      }

      const seoData = await response.json()
      
      // Apply all SEO data
      updateFormData('communications', {
        seo: {
          metaTitle: seoData.metaTitle,
          metaDescription: seoData.metaDescription,
          keywords: seoData.keywords,
          urlSlug: seoData.urlSlug,
          ogTitle: seoData.ogTitle,
          ogDescription: seoData.ogDescription,
          ogImage: formData.basics?.images?.cover || '',
          twitterTitle: seoData.twitterTitle,
          twitterDescription: seoData.twitterDescription,
          aiDescription: seoData.aiDescription,
          structuredDataFAQ: seoData.structuredDataFAQ,
          eventStructuredData: seoData.eventStructuredData,
          faqStructuredData: seoData.faqStructuredData,
          searchQueries: seoData.searchQueries,
          semanticKeywords: seoData.semanticKeywords,
          localSEO: seoData.localSEO
        }
      })

      setAiConfidence(seoData.confidence)
      setTimeout(() => setAiConfidence(null), 10000)
      
    } catch (error: any) {
      alert(error.message || 'Failed to generate SEO')
    } finally {
      setAiLoading(false)
    }
  }
  
  const updateEmailAutomation = (field: string, value: any) => {
    updateFormData('communications', {
      emailAutomation: {
        ...formData.communications?.emailAutomation,
        [field]: value
      }
    })
  }
  
  const updateSMSNotifications = (field: string, value: any) => {
    updateFormData('communications', {
      smsNotifications: {
        ...formData.communications?.smsNotifications,
        [field]: value
      }
    })
  }
  
  const updateCalendarSync = (field: string, value: boolean) => {
    updateFormData('communications', {
      calendarSync: {
        ...formData.communications?.calendarSync,
        [field]: value
      }
    })
  }
  
  const generateSlug = () => {
    const slug = (formData.basics?.name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    updateSEO('urlSlug', slug)
  }
  
  return (
    <div className="space-y-6">
      {/* SEO Settings with AI */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="block text-sm font-medium">SEO & Meta Tags</label>
          <div className="flex gap-2 items-center">
            {aiConfidence && <ConfidenceBadge confidence={aiConfidence} />}
            <AIButton 
              onClick={handleAIGenerateSEO} 
              label="✨ Generate All SEO with AI"
              disabled={!formData.basics?.name}
            />
          </div>
        </div>

        {aiLoading && <AILoadingState message="AI is generating comprehensive SEO..." />}
        
        <div className="bg-black/20 rounded-lg p-4 space-y-4">
          {/* Meta Title */}
          <div>
            <label className="block text-xs mb-1 text-gray-300">
              Meta Title <span className="text-purple-400">(Google, Social Media)</span>
            </label>
            <input
              type="text"
              value={formData.communications?.seo?.metaTitle || ''}
              onChange={(e) => updateSEO('metaTitle', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 rounded text-white"
              placeholder={formData.basics?.name || 'Event title for search engines'}
              maxLength={60}
            />
            <p className="text-xs text-gray-400 mt-1">
              {(formData.communications?.seo?.metaTitle || '').length}/60 characters
            </p>
          </div>
          
          {/* Meta Description */}
          <div>
            <label className="block text-xs mb-1 text-gray-300">
              Meta Description <span className="text-purple-400">(Search Results Preview)</span>
            </label>
            <textarea
              value={formData.communications?.seo?.metaDescription || ''}
              onChange={(e) => updateSEO('metaDescription', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 rounded h-20 text-white"
              placeholder="Brief compelling description for search results"
              maxLength={160}
            />
            <p className="text-xs text-gray-400 mt-1">
              {(formData.communications?.seo?.metaDescription || '').length}/160 characters
            </p>
          </div>

          {/* AI Description for ChatGPT/Perplexity */}
          <div>
            <label className="block text-xs mb-1 text-gray-300">
              AI Search Description <span className="text-purple-400">(ChatGPT, Perplexity, AI Engines)</span>
            </label>
            <textarea
              value={formData.communications?.seo?.aiDescription || ''}
              onChange={(e) => updateSEO('aiDescription', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 rounded h-24 text-white"
              placeholder="Conversational, comprehensive description optimized for AI search engines"
              maxLength={300}
            />
            <p className="text-xs text-gray-400 mt-1">
              Optimized for conversational AI - answers who, what, when, where, why
            </p>
          </div>
          
          {/* URL Slug */}
          <div>
            <label className="block text-xs mb-1 text-gray-300">URL Slug</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.communications?.seo?.urlSlug || ''}
                onChange={(e) => updateSEO('urlSlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="flex-1 px-3 py-2 bg-white/10 rounded text-white"
                placeholder="event-url-slug"
              />
              <button
                type="button"
                onClick={generateSlug}
                className="px-3 py-2 bg-purple-600 rounded hover:bg-purple-700 text-white text-sm"
              >
                Auto
              </button>
            </div>
          </div>
          
          {/* Keywords */}
          <div>
            <label className="block text-xs mb-1 text-gray-300">
              Keywords <span className="text-purple-400">(SEO + Voice Search)</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                className="flex-1 px-3 py-2 bg-white/10 rounded text-white text-sm"
                placeholder="Add keyword or phrase"
              />
              <button
                type="button"
                onClick={addKeyword}
                className="px-3 py-2 bg-purple-600 rounded hover:bg-purple-700 text-white text-sm"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(formData.communications?.seo?.keywords || []).map((keyword: string, index: number) => (
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

          {/* Open Graph Image */}
          <div>
            <label className="block text-xs mb-1 text-gray-300">
              Social Media Image <span className="text-purple-400">(1200x630px)</span>
            </label>
            <input
              type="text"
              value={formData.communications?.seo?.ogImage || ''}
              onChange={(e) => updateSEO('ogImage', e.target.value)}
              className="w-full px-3 py-2 bg-white/10 rounded text-white text-sm"
              placeholder={formData.basics?.images?.cover || 'URL for social sharing'}
            />
            {formData.basics?.images?.cover && (
              <button
                onClick={() => updateSEO('ogImage', formData.basics.images.cover)}
                className="text-xs text-purple-400 hover:text-purple-300 mt-1"
              >
                Use cover image
              </button>
            )}
          </div>

          {/* Advanced SEO Toggle */}
          <button
            onClick={() => setShowAdvancedSEO(!showAdvancedSEO)}
            className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-2"
          >
            {showAdvancedSEO ? '▼' : '▶'} Advanced SEO & Structured Data
          </button>

          {showAdvancedSEO && (
            <div className="space-y-4 pl-4 border-l-2 border-purple-500/30">
              {/* Structured Data FAQ */}
              {formData.communications?.seo?.structuredDataFAQ && (
                <div>
                  <label className="block text-xs mb-2 text-gray-300">
                    FAQ Structured Data <span className="text-green-400">(Featured Snippets)</span>
                  </label>
                  <div className="space-y-2">
                    {formData.communications.seo.structuredDataFAQ.map((faq: any, i: number) => (
                      <div key={i} className="bg-black/30 rounded p-3 text-xs">
                        <p className="font-semibold text-white">Q: {faq.question}</p>
                        <p className="text-gray-400 mt-1">A: {faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Local SEO */}
              {formData.communications?.seo?.localSEO && (
                <div>
                  <label className="block text-xs mb-2 text-gray-300">
                    Local SEO <span className="text-blue-400">(Location Targeting)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">City:</span>
                      <p className="text-white">{formData.communications.seo.localSEO.city}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">State:</span>
                      <p className="text-white">{formData.communications.seo.localSEO.state}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Neighborhood:</span>
                      <p className="text-white">{formData.communications.seo.localSEO.neighborhood || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Intent Queries */}
              {formData.communications?.seo?.searchQueries && (
                <div>
                  <label className="block text-xs mb-2 text-gray-300">
                    Target Search Queries <span className="text-yellow-400">(Voice & AI Search)</span>
                  </label>
                  <div className="text-xs text-gray-400 space-y-1">
                    {formData.communications.seo.searchQueries.map((q: string, i: number) => (
                      <div key={i}>• {q}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Semantic Keywords */}
              {formData.communications?.seo?.semanticKeywords && (
                <div>
                  <label className="block text-xs mb-2 text-gray-300">
                    Semantic Keywords <span className="text-pink-400">(LSI/Related Terms)</span>
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {formData.communications.seo.semanticKeywords.map((kw: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-pink-600/20 text-pink-400 rounded text-xs">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Email Automation */}
      <div>
        <label className="block text-sm font-medium mb-3">Email Automation</label>
        <div className="bg-black/20 rounded-lg p-4 space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.communications?.emailAutomation?.confirmationEmail || false}
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
              checked={formData.communications?.emailAutomation?.reminderEmail || false}
              onChange={(e) => updateEmailAutomation('reminderEmail', e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <span className="font-medium">Reminder Email</span>
              <p className="text-xs text-gray-400">
                Send event reminder 24 hours before
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* SMS Notifications */}
      <div>
        <label className="block text-sm font-medium mb-3">SMS Notifications (Optional)</label>
        <div className="bg-black/20 rounded-lg p-4 space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.communications?.smsNotifications?.enabled || false}
              onChange={(e) => updateSMSNotifications('enabled', e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <span className="font-medium">Enable SMS Notifications</span>
          </label>
          
          {formData.communications?.smsNotifications?.enabled && (
            <>
              <label className="flex items-center gap-3 ml-8">
                <input
                  type="checkbox"
                  checked={formData.communications?.smsNotifications?.confirmationSMS || false}
                  onChange={(e) => updateSMSNotifications('confirmationSMS', e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <div>
                  <span className="font-medium">Order Confirmation SMS</span>
                  <p className="text-xs text-gray-400">Send ticket details via SMS</p>
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
              checked={formData.communications?.calendarSync?.googleCalendar || false}
              onChange={(e) => updateCalendarSync('googleCalendar', e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <span className="font-medium">Google Calendar</span>
              <p className="text-xs text-gray-400">Add to Google Calendar button</p>
            </div>
          </label>
          
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formData.communications?.calendarSync?.appleCalendar || false}
              onChange={(e) => updateCalendarSync('appleCalendar', e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <span className="font-medium">Apple Calendar</span>
              <p className="text-xs text-gray-400">ICS file download</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}

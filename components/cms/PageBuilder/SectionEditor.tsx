'use client'

import { useState } from 'react'
import {
  PageSection,
  SectionSettings,
  HeroContent,
  ContentBlockContent,
  GalleryContent,
  EventsListContent,
  CTAContent,
  ContactFormContent,
  MapContent,
  CustomHTMLContent,
  TestimonialsContent,
} from '@/lib/types/cms'
import { getSectionTypeName } from '@/lib/services/cmsPageService'

interface SectionEditorProps {
  section: PageSection
  onUpdate: (updates: Partial<PageSection>) => void
}

type TabType = 'content' | 'settings'

export default function SectionEditor({ section, onUpdate }: SectionEditorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('content')

  const updateContent = (contentUpdates: Partial<typeof section.content>) => {
    onUpdate({
      content: { ...section.content, ...contentUpdates } as typeof section.content,
    })
  }

  const updateSettings = (settingsUpdates: Partial<SectionSettings>) => {
    onUpdate({
      settings: { ...section.settings, ...settingsUpdates },
    })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white">
          {getSectionTypeName(section.type)}
        </h3>

        {/* Tabs */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'content'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Content
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'content' && (
          <ContentEditor section={section} updateContent={updateContent} />
        )}
        {activeTab === 'settings' && (
          <SettingsEditor settings={section.settings} updateSettings={updateSettings} />
        )}
      </div>
    </div>
  )
}

// Content Editor based on section type
function ContentEditor({
  section,
  updateContent,
}: {
  section: PageSection
  updateContent: (updates: any) => void
}) {
  switch (section.type) {
    case 'hero':
      return <HeroEditor content={section.content as HeroContent} updateContent={updateContent} />
    case 'content':
      return <ContentBlockEditor content={section.content as ContentBlockContent} updateContent={updateContent} />
    case 'gallery':
      return <GalleryEditor content={section.content as GalleryContent} updateContent={updateContent} />
    case 'events':
      return <EventsEditor content={section.content as EventsListContent} updateContent={updateContent} />
    case 'cta':
      return <CTAEditor content={section.content as CTAContent} updateContent={updateContent} />
    case 'contact':
      return <ContactEditor content={section.content as ContactFormContent} updateContent={updateContent} />
    case 'map':
      return <MapEditor content={section.content as MapContent} updateContent={updateContent} />
    case 'html':
      return <HTMLEditor content={section.content as CustomHTMLContent} updateContent={updateContent} />
    case 'testimonials':
      return <TestimonialsEditor content={section.content as TestimonialsContent} updateContent={updateContent} />
    default:
      return <p className="text-slate-500">Editor not available for this section type.</p>
  }
}

// Hero Editor
function HeroEditor({
  content,
  updateContent,
}: {
  content: HeroContent
  updateContent: (updates: Partial<HeroContent>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Headline
        </label>
        <input
          type="text"
          value={content.headline}
          onChange={(e) => updateContent({ headline: e.target.value })}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Subheadline
        </label>
        <input
          type="text"
          value={content.subheadline || ''}
          onChange={(e) => updateContent({ subheadline: e.target.value })}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Background Image URL
        </label>
        <input
          type="text"
          value={content.backgroundImage || ''}
          onChange={(e) => updateContent({ backgroundImage: e.target.value })}
          placeholder="https://..."
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
            Alignment
          </label>
          <select
            value={content.alignment}
            onChange={(e) => updateContent({ alignment: e.target.value as 'left' | 'center' | 'right' })}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
            Height
          </label>
          <select
            value={content.height}
            onChange={(e) => updateContent({ height: e.target.value as 'small' | 'medium' | 'full' })}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="full">Full Screen</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Overlay Opacity
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={(content.overlayOpacity || 0) * 100}
          onChange={(e) => updateContent({ overlayOpacity: parseInt(e.target.value) / 100 })}
          className="w-full"
        />
        <span className="text-sm text-slate-500">{Math.round((content.overlayOpacity || 0) * 100)}%</span>
      </div>

      {/* CTA Button */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
        <h4 className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-3">
          Call to Action Button
        </h4>
        <div className="space-y-3">
          <input
            type="text"
            value={content.ctaButton?.text || ''}
            onChange={(e) => updateContent({
              ctaButton: { ...content.ctaButton, text: e.target.value, link: content.ctaButton?.link || '#', style: content.ctaButton?.style || 'primary' }
            })}
            placeholder="Button Text"
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
          />
          <input
            type="text"
            value={content.ctaButton?.link || ''}
            onChange={(e) => updateContent({
              ctaButton: { ...content.ctaButton, link: e.target.value, text: content.ctaButton?.text || 'Click Here', style: content.ctaButton?.style || 'primary' }
            })}
            placeholder="Button Link"
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  )
}

// Content Block Editor
function ContentBlockEditor({
  content,
  updateContent,
}: {
  content: ContentBlockContent
  updateContent: (updates: Partial<ContentBlockContent>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Heading
        </label>
        <input
          type="text"
          value={content.heading || ''}
          onChange={(e) => updateContent({ heading: e.target.value })}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Content (HTML)
        </label>
        <textarea
          value={content.body}
          onChange={(e) => updateContent({ body: e.target.value })}
          rows={8}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-mono text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Image URL
        </label>
        <input
          type="text"
          value={content.image || ''}
          onChange={(e) => updateContent({ image: e.target.value })}
          placeholder="https://..."
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
            Image Position
          </label>
          <select
            value={content.imagePosition || 'right'}
            onChange={(e) => updateContent({ imagePosition: e.target.value as any })}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
            Columns
          </label>
          <select
            value={content.columns || 1}
            onChange={(e) => updateContent({ columns: parseInt(e.target.value) as 1 | 2 | 3 | 4 })}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
          >
            <option value={1}>1 Column</option>
            <option value={2}>2 Columns</option>
            <option value={3}>3 Columns</option>
            <option value={4}>4 Columns</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// Gallery Editor
function GalleryEditor({
  content,
  updateContent,
}: {
  content: GalleryContent
  updateContent: (updates: Partial<GalleryContent>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Heading
        </label>
        <input
          type="text"
          value={content.heading || ''}
          onChange={(e) => updateContent({ heading: e.target.value })}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
            Layout
          </label>
          <select
            value={content.layout}
            onChange={(e) => updateContent({ layout: e.target.value as any })}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
          >
            <option value="grid">Grid</option>
            <option value="masonry">Masonry</option>
            <option value="carousel">Carousel</option>
            <option value="lightbox">Lightbox</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
            Columns
          </label>
          <select
            value={content.columns}
            onChange={(e) => updateContent({ columns: parseInt(e.target.value) as any })}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
          >
            <option value={2}>2 Columns</option>
            <option value={3}>3 Columns</option>
            <option value={4}>4 Columns</option>
            <option value={6}>6 Columns</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Images ({content.images.length})
        </label>
        <p className="text-sm text-slate-500">Image management coming soon. Add images via Media Library.</p>
      </div>
    </div>
  )
}

// Events Editor
function EventsEditor({
  content,
  updateContent,
}: {
  content: EventsListContent
  updateContent: (updates: Partial<EventsListContent>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Heading
        </label>
        <input
          type="text"
          value={content.heading || ''}
          onChange={(e) => updateContent({ heading: e.target.value })}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
            Display Mode
          </label>
          <select
            value={content.displayMode}
            onChange={(e) => updateContent({ displayMode: e.target.value as any })}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
          >
            <option value="grid">Grid</option>
            <option value="list">List</option>
            <option value="carousel">Carousel</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
            Limit
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={content.limit}
            onChange={(e) => updateContent({ limit: parseInt(e.target.value) })}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={content.filter?.upcoming}
            onChange={(e) => updateContent({ filter: { ...content.filter, upcoming: e.target.checked } })}
            className="rounded text-purple-600"
          />
          <span className="text-sm text-slate-700 dark:text-gray-300">Upcoming only</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={content.showFilters}
            onChange={(e) => updateContent({ showFilters: e.target.checked })}
            className="rounded text-purple-600"
          />
          <span className="text-sm text-slate-700 dark:text-gray-300">Show filters</span>
        </label>
      </div>
    </div>
  )
}

// CTA Editor
function CTAEditor({
  content,
  updateContent,
}: {
  content: CTAContent
  updateContent: (updates: Partial<CTAContent>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Headline
        </label>
        <input
          type="text"
          value={content.headline}
          onChange={(e) => updateContent({ headline: e.target.value })}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Subtext
        </label>
        <input
          type="text"
          value={content.subtext || ''}
          onChange={(e) => updateContent({ subtext: e.target.value })}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
            Button Text
          </label>
          <input
            type="text"
            value={content.button.text}
            onChange={(e) => updateContent({ button: { ...content.button, text: e.target.value } })}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
            Button Link
          </label>
          <input
            type="text"
            value={content.button.link}
            onChange={(e) => updateContent({ button: { ...content.button, link: e.target.value } })}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Style
        </label>
        <select
          value={content.style}
          onChange={(e) => updateContent({ style: e.target.value as any })}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
        >
          <option value="simple">Simple</option>
          <option value="banner">Banner</option>
          <option value="card">Card</option>
        </select>
      </div>
    </div>
  )
}

// Contact Editor
function ContactEditor({
  content,
  updateContent,
}: {
  content: ContactFormContent
  updateContent: (updates: Partial<ContactFormContent>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Heading
        </label>
        <input
          type="text"
          value={content.heading || ''}
          onChange={(e) => updateContent({ heading: e.target.value })}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Recipient Email
        </label>
        <input
          type="email"
          value={content.recipientEmail}
          onChange={(e) => updateContent({ recipientEmail: e.target.value })}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Submit Button Text
        </label>
        <input
          type="text"
          value={content.submitButton}
          onChange={(e) => updateContent({ submitButton: e.target.value })}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Success Message
        </label>
        <input
          type="text"
          value={content.successMessage}
          onChange={(e) => updateContent({ successMessage: e.target.value })}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
        />
      </div>
    </div>
  )
}

// Map Editor
function MapEditor({
  content,
  updateContent,
}: {
  content: MapContent
  updateContent: (updates: Partial<MapContent>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Heading
        </label>
        <input
          type="text"
          value={content.heading || ''}
          onChange={(e) => updateContent({ heading: e.target.value })}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Address
        </label>
        <input
          type="text"
          value={content.address || ''}
          onChange={(e) => updateContent({ address: e.target.value })}
          placeholder="123 Main St, City, State"
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
            Latitude
          </label>
          <input
            type="number"
            step="any"
            value={content.latitude || ''}
            onChange={(e) => updateContent({ latitude: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
            Longitude
          </label>
          <input
            type="number"
            step="any"
            value={content.longitude || ''}
            onChange={(e) => updateContent({ longitude: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Zoom Level
        </label>
        <input
          type="range"
          min="1"
          max="20"
          value={content.zoom || 15}
          onChange={(e) => updateContent({ zoom: parseInt(e.target.value) })}
          className="w-full"
        />
        <span className="text-sm text-slate-500">{content.zoom || 15}</span>
      </div>
    </div>
  )
}

// HTML Editor
function HTMLEditor({
  content,
  updateContent,
}: {
  content: CustomHTMLContent
  updateContent: (updates: Partial<CustomHTMLContent>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          HTML
        </label>
        <textarea
          value={content.html}
          onChange={(e) => updateContent({ html: e.target.value })}
          rows={8}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-mono text-sm"
          placeholder="<div>Your HTML here...</div>"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          CSS
        </label>
        <textarea
          value={content.css || ''}
          onChange={(e) => updateContent({ css: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-mono text-sm"
          placeholder=".my-class { color: red; }"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          JavaScript
        </label>
        <textarea
          value={content.js || ''}
          onChange={(e) => updateContent({ js: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-mono text-sm"
          placeholder="console.log('Hello!');"
        />
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={content.sandboxed}
          onChange={(e) => updateContent({ sandboxed: e.target.checked })}
          className="rounded text-purple-600"
        />
        <span className="text-sm text-slate-700 dark:text-gray-300">Run in sandbox (recommended for security)</span>
      </label>
    </div>
  )
}

// Testimonials Editor
function TestimonialsEditor({
  content,
  updateContent,
}: {
  content: TestimonialsContent
  updateContent: (updates: Partial<TestimonialsContent>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Heading
        </label>
        <input
          type="text"
          value={content.heading || ''}
          onChange={(e) => updateContent({ heading: e.target.value })}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Layout
        </label>
        <select
          value={content.layout}
          onChange={(e) => updateContent({ layout: e.target.value as any })}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
        >
          <option value="grid">Grid</option>
          <option value="carousel">Carousel</option>
          <option value="stacked">Stacked</option>
        </select>
      </div>

      <div>
        <p className="text-sm text-slate-500">Testimonials management coming soon.</p>
      </div>
    </div>
  )
}

// Settings Editor
function SettingsEditor({
  settings,
  updateSettings,
}: {
  settings: SectionSettings
  updateSettings: (updates: Partial<SectionSettings>) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Background Color
        </label>
        <div className="flex gap-2">
          <input
            type="color"
            value={settings.backgroundColor || '#ffffff'}
            onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
            className="w-12 h-10 rounded cursor-pointer border-0"
          />
          <input
            type="text"
            value={settings.backgroundColor || ''}
            onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
            placeholder="#ffffff or transparent"
            className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Background Image
        </label>
        <input
          type="text"
          value={settings.backgroundImage || ''}
          onChange={(e) => updateSettings({ backgroundImage: e.target.value })}
          placeholder="https://..."
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          Padding
        </label>
        <select
          value={settings.padding || 'medium'}
          onChange={(e) => updateSettings({ padding: e.target.value as any })}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
        >
          <option value="none">None</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
          CSS Class
        </label>
        <input
          type="text"
          value={settings.cssClass || ''}
          onChange={(e) => updateSettings({ cssClass: e.target.value })}
          placeholder="custom-class"
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
        />
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.visibility !== 'hidden'}
          onChange={(e) => updateSettings({ visibility: e.target.checked ? 'visible' : 'hidden' })}
          className="rounded text-purple-600"
        />
        <span className="text-sm text-slate-700 dark:text-gray-300">Visible</span>
      </label>
    </div>
  )
}

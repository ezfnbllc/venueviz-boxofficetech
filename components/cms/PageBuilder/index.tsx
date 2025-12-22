'use client'

import { useState, useCallback } from 'react'
import { PageSection, SectionType, TenantPage } from '@/lib/types/cms'
import { getSectionTypeName, getSectionTypeIcon } from '@/lib/services/cmsPageService'
import SectionEditor from './SectionEditor'

interface PageBuilderProps {
  page: TenantPage
  onUpdateSections: (sections: PageSection[]) => void
  onAddSection: (type: SectionType, position?: number) => void
  onRemoveSection: (sectionId: string) => void
  onSave: () => void
  saving?: boolean
}

const SECTION_TYPES: SectionType[] = [
  'hero',
  'content',
  'gallery',
  'events',
  'testimonials',
  'cta',
  'contact',
  'map',
  'html',
]

export default function PageBuilder({
  page,
  onUpdateSections,
  onAddSection,
  onRemoveSection,
  onSave,
  saving,
}: PageBuilderProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [showAddSection, setShowAddSection] = useState<number | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Handle section update
  const handleSectionUpdate = useCallback((sectionId: string, updates: Partial<PageSection>) => {
    const updatedSections = page.sections.map(section =>
      section.id === sectionId ? { ...section, ...updates } : section
    )
    onUpdateSections(updatedSections)
  }, [page.sections, onUpdateSections])

  // Handle drag start
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
  }

  // Handle drop
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }

    const newSections = [...page.sections]
    const [draggedSection] = newSections.splice(draggedIndex, 1)
    newSections.splice(dropIndex, 0, draggedSection)

    // Update order
    const reorderedSections = newSections.map((section, index) => ({
      ...section,
      order: index,
    }))

    onUpdateSections(reorderedSections)
    setDraggedIndex(null)
  }

  // Move section up/down
  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === page.sections.length - 1)
    ) {
      return
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const newSections = [...page.sections]
    const [movedSection] = newSections.splice(index, 1)
    newSections.splice(newIndex, 0, movedSection)

    const reorderedSections = newSections.map((section, i) => ({
      ...section,
      order: i,
    }))

    onUpdateSections(reorderedSections)
  }

  const selectedSection = page.sections.find(s => s.id === selectedSectionId)

  return (
    <div className="flex h-full">
      {/* Section List - Left Panel */}
      <div className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">Sections</h3>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            Drag to reorder, click to edit
          </p>
        </div>

        {/* Add Section Button (top) */}
        <div className="p-2">
          <button
            onClick={() => setShowAddSection(0)}
            className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 dark:text-gray-400 hover:border-purple-500 hover:text-purple-500 transition-colors text-sm"
          >
            + Add Section
          </button>
        </div>

        {/* Section List */}
        <div className="p-2 space-y-2">
          {page.sections.map((section, index) => (
            <div key={section.id}>
              {/* Add Section Dropdown */}
              {showAddSection === index && (
                <AddSectionDropdown
                  onSelect={(type) => {
                    onAddSection(type, index)
                    setShowAddSection(null)
                  }}
                  onClose={() => setShowAddSection(null)}
                />
              )}

              {/* Section Item */}
              <div
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onClick={() => setSelectedSectionId(section.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedSectionId === section.id
                    ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500'
                    : 'bg-slate-50 dark:bg-slate-800 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                } ${draggedIndex === index ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getSectionTypeIcon(section.type)}</span>
                    <span className="font-medium text-slate-900 dark:text-white text-sm">
                      {getSectionTypeName(section.type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        moveSection(index, 'up')
                      }}
                      disabled={index === 0}
                      className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        moveSection(index, 'down')
                      }}
                      disabled={index === page.sections.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('Delete this section?')) {
                          onRemoveSection(section.id)
                          if (selectedSectionId === section.id) {
                            setSelectedSectionId(null)
                          }
                        }
                      }}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {section.type === 'hero' && 'content' in section.content && 'headline' in section.content && (
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 truncate">
                    {(section.content as any).headline}
                  </p>
                )}
                {section.type === 'content' && 'content' in section.content && 'heading' in section.content && (
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 truncate">
                    {(section.content as any).heading}
                  </p>
                )}
              </div>

              {/* Add Section Button (between sections) */}
              <button
                onClick={() => setShowAddSection(index + 1)}
                className="w-full py-1 text-slate-400 hover:text-purple-500 text-xs mt-1"
              >
                + Add here
              </button>
            </div>
          ))}

          {/* Add Section at end if no sections */}
          {page.sections.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-500 dark:text-gray-400 mb-4">No sections yet</p>
              <button
                onClick={() => setShowAddSection(0)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
              >
                Add Your First Section
              </button>
            </div>
          )}

          {/* Add Section Dropdown at end */}
          {showAddSection === page.sections.length && (
            <AddSectionDropdown
              onSelect={(type) => {
                onAddSection(type)
                setShowAddSection(null)
              }}
              onClose={() => setShowAddSection(null)}
            />
          )}
        </div>
      </div>

      {/* Section Editor - Right Panel */}
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-800">
        {selectedSection ? (
          <SectionEditor
            section={selectedSection}
            onUpdate={(updates) => handleSectionUpdate(selectedSection.id, updates)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 dark:text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <p>Select a section to edit</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Add Section Dropdown Component
function AddSectionDropdown({
  onSelect,
  onClose,
}: {
  onSelect: (type: SectionType) => void
  onClose: () => void
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-2 mb-2">
      <div className="flex justify-between items-center mb-2 px-2">
        <span className="text-sm font-medium text-slate-700 dark:text-gray-300">
          Choose Section Type
        </span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {SECTION_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="flex items-center gap-2 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-left transition-colors"
          >
            <span>{getSectionTypeIcon(type)}</span>
            <span className="text-sm text-slate-700 dark:text-gray-300">
              {getSectionTypeName(type)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

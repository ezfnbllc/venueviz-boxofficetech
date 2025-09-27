'use client'
import {useState} from 'react'

interface LayoutBuilderProps {
  venue: any
  onClose: () => void
}

export default function LayoutBuilder({ venue, onClose }: LayoutBuilderProps) {
  const [layouts, setLayouts] = useState<any[]>(venue.layouts || [])
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            Layout Manager - {venue.name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎭</div>
            <h3 className="text-xl font-bold mb-2">Layout Builder Coming Soon</h3>
            <p className="text-gray-400">
              Visual seating chart builder with AI-powered layout generation
            </p>
          </div>
          
          {layouts.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Existing Layouts</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {layouts.map(layout => (
                  <div key={layout.id} className="bg-black/40 rounded-lg p-4 border border-white/10">
                    <h4 className="font-bold">{layout.name}</h4>
                    <p className="text-sm text-gray-400">{layout.type}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-white/10">
          <button onClick={onClose} className="px-6 py-2 bg-gray-700 rounded-lg">
            Close
          </button>
          <button className="px-6 py-2 bg-purple-600 rounded-lg opacity-50 cursor-not-allowed" disabled>
            Create Layout (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  )
}

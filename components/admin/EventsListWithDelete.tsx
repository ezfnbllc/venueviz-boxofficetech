'use client'
import { useState } from 'react'
import DeleteEventDialog from './DeleteEventDialog'

// Add this to your existing events list component
const EventRow = ({ event, onEventDeleted }: { event: any, onEventDeleted: () => void }) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  return (
    <>
      <tr className="border-b border-gray-700">
        <td className="px-6 py-4">{event.name}</td>
        <td className="px-6 py-4">{event.category}</td>
        <td className="px-6 py-4">
          <span className={`px-2 py-1 rounded text-xs ${
            event.status === 'published' ? 'bg-green-600' :
            event.status === 'draft' ? 'bg-yellow-600' :
            event.status === 'deleted' ? 'bg-red-600' :
            'bg-gray-600'
          }`}>
            {event.status}
          </span>
        </td>
        <td className="px-6 py-4">
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700">
              Edit
            </button>
            <button className="px-3 py-1 bg-purple-600 rounded text-sm hover:bg-purple-700">
              View
            </button>
            {event.status !== 'deleted' && (
              <button 
                onClick={() => setShowDeleteDialog(true)}
                className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
              >
                Delete
              </button>
            )}
            {event.status === 'deleted' && (
              <button 
                onClick={() => handleRestore(event.id)}
                className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-700"
              >
                Restore
              </button>
            )}
          </div>
        </td>
      </tr>
      
      <DeleteEventDialog
        eventId={event.id}
        eventName={event.name}
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onDeleted={onEventDeleted}
      />
    </>
  )
}

const handleRestore = async (eventId: string) => {
  if (confirm('Are you sure you want to restore this event?')) {
    try {
      await AdminService.restoreEvent(eventId)
      // Refresh events list
      window.location.reload()
    } catch (error) {
      alert('Error restoring event')
    }
  }
}

// Export the EventRow component to use in your events list
export { EventRow }

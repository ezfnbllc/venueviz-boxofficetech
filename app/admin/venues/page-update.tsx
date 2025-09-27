// Add this import at the top of app/admin/venues/page.tsx
import EnhancedLayoutBuilder from '@/components/EnhancedLayoutBuilder'

// Replace the existing LayoutBuilder import and usage with:
// Change: import LayoutBuilder from '@/components/LayoutBuilder'
// To: import EnhancedLayoutBuilder from '@/components/EnhancedLayoutBuilder'

// Replace the Layout Builder Modal section at the bottom with:
{showLayoutBuilder && selectedVenue && (
  <EnhancedLayoutBuilder
    venue={selectedVenue}
    onClose={() => {
      setShowLayoutBuilder(false)
      setSelectedVenue(null)
      loadVenues()
    }}
  />
)}

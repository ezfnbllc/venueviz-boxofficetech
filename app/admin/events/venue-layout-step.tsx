export const VenueLayoutStep = ({ formData, setFormData, venues, layouts }: any) => {
  const venueLayouts = layouts.filter((l: any) => l.venueId === formData.venueId)
  
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm mb-2">Select Venue *</label>
        <select
          required
          value={formData.venue}
          onChange={(e) => {
            const venue = venues.find((v: any) => v.name === e.target.value)
            setFormData({
              ...formData, 
              venue: e.target.value,
              venueId: venue?.id || '',
              capacity: venue?.capacity || formData.capacity,
              layoutId: ''
            })
          }}
          className="w-full px-4 py-2 bg-white/10 rounded-lg"
        >
          <option value="">Select a venue</option>
          {venues.map((venue: any) => (
            <option key={venue.id} value={venue.name}>
              {venue.name} (Capacity: {venue.capacity})
            </option>
          ))}
        </select>
      </div>

      {formData.venueId && venueLayouts.length > 0 && (
        <div>
          <label className="block text-sm mb-2">Select Layout *</label>
          <div className="space-y-2">
            {venueLayouts.map((layout: any) => (
              <button
                key={layout.id}
                type="button"
                onClick={() => setFormData({...formData, layoutId: layout.id})}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  formData.layoutId === layout.id
                    ? 'border-purple-600 bg-purple-600/20'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{layout.name}</div>
                    <div className="text-sm text-gray-400">
                      Type: {layout.type === 'general_admission' ? 'General Admission' : 'Seating Chart'}
                    </div>
                    <div className="text-sm text-gray-400">
                      Capacity: {layout.totalCapacity || 0}
                    </div>
                  </div>
                  {layout.type === 'general_admission' ? (
                    <div className="text-2xl">🎫</div>
                  ) : (
                    <div className="text-2xl">🪑</div>
                  )}
                </div>
                {layout.type === 'general_admission' && layout.gaLevels && (
                  <div className="mt-2 text-xs text-gray-400">
                    Levels: {layout.gaLevels.map((l: any) => `${l.name} (${l.capacity})`).join(', ')}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {formData.venueId && venueLayouts.length === 0 && (
        <div className="p-4 bg-yellow-600/20 border border-yellow-600/50 rounded-lg">
          <p className="text-sm text-yellow-400">
            No layouts found for this venue. Please create a layout first.
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm mb-2">Event Capacity Override</label>
        <input
          type="number"
          value={formData.capacity}
          onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
          className="w-full px-4 py-2 bg-white/10 rounded-lg"
          placeholder="Leave blank to use layout capacity"
        />
      </div>
    </div>
  )
}

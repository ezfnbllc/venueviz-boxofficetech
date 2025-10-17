// In the events listing page, update the venue display logic
{events.map((event) => (
  <div key={event.id} className="bg-black/40 backdrop-blur-xl rounded-xl overflow-hidden hover:bg-black/50 transition-all">
    {/* ... other content ... */}
    
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">{event.name}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          event.status === 'published' || event.status === 'active'
            ? 'bg-green-600 text-white'
            : event.status === 'draft'
            ? 'bg-gray-600 text-white'
            : 'bg-yellow-600 text-white'
        }`}>
          {event.status || 'Active'}
        </span>
      </div>
      
      <div className="space-y-2 text-sm text-gray-300">
        <div className="flex items-center gap-2">
          <span>📍</span>
          <span>{event.venueName || event.venue || 'Venue TBD'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span>
            {event.date 
              ? new Date(event.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })
              : 'Date TBD'
            }
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span>💰</span>
          <span>{event.price || '$0'}</span>
        </div>
      </div>
      
      <p className="text-gray-400 text-sm mt-3 line-clamp-2">
        {event.description}
      </p>
      
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => router.push(`/admin/events/edit/${event.id}`)}
          className="flex-1 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
        >
          Edit
        </button>
        <button
          onClick={() => handleDelete(event.id)}
          className="flex-1 px-4 py-2 bg-red-600/80 rounded-lg hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
))}

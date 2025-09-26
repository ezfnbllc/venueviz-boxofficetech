'use client'
import { useState } from 'react'

export default function HomePage() {
  const [activeView, setActiveView] = useState('dashboard')
  
  const stats = [
    { label: "Today's Revenue", value: '$24,580', change: '+12%', color: 'from-purple-600 to-pink-600' },
    { label: 'Tickets Sold', value: '342', change: '+8%', color: 'from-blue-600 to-cyan-600' },
    { label: 'Occupancy Rate', value: '78%', change: '+5%', color: 'from-green-600 to-emerald-600' },
    { label: 'Active Events', value: '12', change: '5 this week', color: 'from-orange-600 to-red-600' }
  ]

  const events = [
    { name: 'Hamilton', date: 'Tonight, 7:30 PM', venue: 'Main Theater', sold: 85, revenue: 42500, status: 'selling-fast' },
    { name: 'Symphony Orchestra', date: 'Tomorrow, 8:00 PM', venue: 'Concert Hall', sold: 92, revenue: 58880, status: 'almost-sold' },
    { name: 'Jazz Night', date: 'Saturday, 9:00 PM', venue: 'Jazz Club', sold: 65, revenue: 13000, status: 'available' }
  ]

  return (
    <div className="min-h-screen">
      <nav className="bg-black/30 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">VenueViz</h1>
            <div className="hidden md:flex space-x-4">
              {['dashboard', 'events', 'venues', 'box-office', 'analytics'].map(view => (
                <button key={view} onClick={() => setActiveView(view)} 
                  className={`px-3 py-2 rounded-lg transition-all ${activeView === view ? 'bg-purple-600' : 'hover:bg-white/10'}`}>
                  {view.charAt(0).toUpperCase() + view.slice(1).replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <a href="/admin" className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700">Admin</a>
            <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {activeView === 'dashboard' && (
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8 p-6 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl backdrop-blur-xl border border-purple-500/30">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <span>✨</span> AI Insights & Recommendations
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-black/30 rounded-lg">
                <p className="text-sm text-purple-400 mb-2">PRICING</p>
                <p className="text-sm">Increase Hamilton tickets by 15% for weekend shows</p>
                <p className="text-green-400 text-sm mt-2">+$12,500 revenue</p>
              </div>
              <div className="p-4 bg-black/30 rounded-lg">
                <p className="text-sm text-purple-400 mb-2">MARKETING</p>
                <p className="text-sm">Target ages 25-45 for Jazz Night via social media</p>
                <p className="text-green-400 text-sm mt-2">+180 tickets</p>
              </div>
              <div className="p-4 bg-black/30 rounded-lg">
                <p className="text-sm text-purple-400 mb-2">SCHEDULING</p>
                <p className="text-sm">Move matinee to 2 PM for better attendance</p>
                <p className="text-green-400 text-sm mt-2">+23% occupancy</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, i) => (
              <div key={i} className="p-6 bg-black/30 backdrop-blur-xl rounded-xl border border-white/10">
                <p className="text-3xl font-bold mb-2">{stat.value}</p>
                <p className="text-sm text-gray-400">{stat.label}</p>
                <p className={`text-sm mt-2 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.change}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-black/30 backdrop-blur-xl rounded-xl border border-white/10 p-6">
              <h3 className="text-xl font-bold mb-4">Upcoming Events</h3>
              <div className="space-y-4">
                {events.map((event, i) => (
                  <div key={i} className="p-4 bg-white/5 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{event.name}</h4>
                        <p className="text-sm text-gray-400">{event.date} • {event.venue}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        event.status === 'selling-fast' ? 'bg-orange-500/20 text-orange-400' :
                        event.status === 'almost-sold' ? 'bg-red-500/20 text-red-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>{event.status.replace('-', ' ')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600" style={{width: `${event.sold}%`}}></div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{event.sold}% sold</p>
                      </div>
                      <p className="text-lg font-bold ml-4">${event.revenue.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur-xl rounded-xl border border-white/10 p-6">
              <h3 className="text-xl font-bold mb-4">Real-time Activity</h3>
              <div className="space-y-3">
                {[
                  { time: '2 min ago', action: 'Ticket purchased', details: '2 tickets for Hamilton - A12, A13', amount: '$300' },
                  { time: '5 min ago', action: 'Refund processed', details: 'Jazz Night - Table 4', amount: '-$150' },
                  { time: '8 min ago', action: 'Group booking', details: '10 tickets for Symphony', amount: '$750' },
                  { time: '12 min ago', action: 'VIP upgrade', details: 'Hamilton - VIP Box', amount: '$200' }
                ].map((activity, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{activity.time}</span>
                        <span className="text-sm font-medium">{activity.action}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{activity.details}</p>
                    </div>
                    <span className={`font-bold ${activity.amount.startsWith('-') ? 'text-red-400' : 'text-green-400'}`}>
                      {activity.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'box-office' && (
        <div className="max-w-7xl mx-auto p-8">
          <BoxOfficeView />
        </div>
      )}
    </div>
  )
}

function BoxOfficeView() {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  
  const sections = [
    { name: 'Orchestra', rows: 10, cols: 20, price: 150 },
    { name: 'Mezzanine', rows: 8, cols: 18, price: 100 },
    { name: 'Balcony', rows: 6, cols: 16, price: 75 }
  ]

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-black/30 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <h2 className="text-2xl font-bold mb-6">Select Your Seats</h2>
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-center py-3 rounded-lg mb-8">STAGE</div>
        
        {sections.map(section => (
          <div key={section.name} className="mb-8">
            <h3 className="text-center mb-4">{section.name} - ${section.price}</h3>
            <div className="grid gap-1 mx-auto" style={{gridTemplateColumns: `repeat(${section.cols}, 1fr)`, maxWidth: '600px'}}>
              {Array.from({length: section.rows * section.cols}).map((_, i) => {
                const seatId = `${section.name}-${i}`
                const isSold = Math.random() > 0.7
                const isSelected = selectedSeats.includes(seatId)
                return (
                  <button key={i} onClick={() => !isSold && setSelectedSeats(prev => 
                    isSelected ? prev.filter(s => s !== seatId) : [...prev, seatId]
                  )} disabled={isSold}
                    className={`w-5 h-5 rounded text-xs transition-all ${
                      isSold ? 'bg-gray-600 cursor-not-allowed' :
                      isSelected ? 'bg-purple-600 scale-110' : 'bg-blue-500 hover:bg-blue-400'
                    }`} />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-black/30 backdrop-blur-xl rounded-xl border border-white/10 p-6 h-fit">
        <h3 className="text-xl font-bold mb-6">Order Summary</h3>
        <div className="space-y-4 mb-6">
          <div>
            <p className="text-sm text-gray-400">Event</p>
            <p className="font-semibold">Hamilton</p>
            <p className="text-sm text-gray-400">Tonight, 7:30 PM</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-2">Selected Seats ({selectedSeats.length})</p>
            {selectedSeats.length === 0 ? (
              <p className="text-sm text-gray-500">No seats selected</p>
            ) : (
              <p className="text-sm">{selectedSeats.join(', ')}</p>
            )}
          </div>
        </div>
        <div className="border-t border-white/20 pt-4">
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>${selectedSeats.length * 100}</span>
          </div>
        </div>
        <button className="w-full mt-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold hover:opacity-90">
          Checkout
        </button>
      </div>
    </div>
  )
}

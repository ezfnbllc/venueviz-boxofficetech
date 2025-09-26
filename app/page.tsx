export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4">VenueViz</h1>
        <p className="text-xl text-gray-300 mb-8">AI-Powered Venue Management</p>
        <div className="space-x-4">
          <a href="/admin" className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Admin Panel</a>
          <a href="/box-office" className="inline-block px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20">Box Office</a>
        </div>
      </div>
    </div>
  )
}

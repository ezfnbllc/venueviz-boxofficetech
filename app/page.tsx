// Public marketplace homepage
export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="text-2xl font-bold text-purple-600">
              VenueViz
            </a>
            <div className="flex gap-6">
              <a href="/events" className="hover:text-purple-600">Events</a>
              <a href="/venues" className="hover:text-purple-600">Venues</a>
              <a href="/admin" className="hover:text-purple-600">Admin</a>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <section className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 text-gray-900">
            Discover Amazing Events
          </h1>
          <p className="text-xl text-gray-600">
            Find tickets to concerts, sports, theater & more
          </p>
        </section>

        {/* Categories */}
        <section className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-purple-50 p-8 rounded-lg border border-purple-200 hover:border-purple-400 transition">
            <div className="text-4xl mb-4">🎵</div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">Concerts</h3>
            <p className="text-gray-600">Live music from your favorite artists</p>
          </div>
          
          <div className="bg-blue-50 p-8 rounded-lg border border-blue-200 hover:border-blue-400 transition">
            <div className="text-4xl mb-4">🏈</div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">Sports</h3>
            <p className="text-gray-600">Game day tickets for every fan</p>
          </div>
          
          <div className="bg-green-50 p-8 rounded-lg border border-green-200 hover:border-green-400 transition">
            <div className="text-4xl mb-4">🎭</div>
            <h3 className="text-xl font-bold mb-2 text-gray-900">Theater</h3>
            <p className="text-gray-600">Broadway shows and performances</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-gray-600">
          © 2025 VenueViz BoxOfficeTech. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

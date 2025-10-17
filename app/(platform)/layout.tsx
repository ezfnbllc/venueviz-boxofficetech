export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="text-2xl font-bold text-purple-600">VenueViz</a>
            <div className="flex gap-6">
              <a href="/events">Events</a>
              <a href="/venues">Venues</a>
              <a href="/login">Sign In</a>
            </div>
          </div>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="border-t bg-gray-50 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-600">
          © 2025 VenueViz BoxOfficeTech
        </div>
      </footer>
    </div>
  )
}

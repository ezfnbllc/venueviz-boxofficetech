export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <section className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4">Discover Amazing Events</h1>
        <p className="text-xl text-gray-600">Find tickets to concerts, sports, theater & more</p>
      </section>

      <section className="grid md:grid-cols-3 gap-8">
        <div className="bg-purple-50 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-2">🎵 Concerts</h3>
          <p className="text-gray-600">Live music from your favorite artists</p>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-2">🏈 Sports</h3>
          <p className="text-gray-600">Game day tickets for every fan</p>
        </div>
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-2">🎭 Theater</h3>
          <p className="text-gray-600">Broadway shows and performances</p>
        </div>
      </section>
    </div>
  )
}

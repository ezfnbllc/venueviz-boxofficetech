// White label promoter page
export default function PromoterPage({ params }: { params: { slug: string } }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white">
      <header className="border-b border-white/10 bg-black/20">
        <nav className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Welcome to {params.slug}</h1>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-16">
        <section className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            {params.slug.charAt(0).toUpperCase() + params.slug.slice(1)} Events
          </h2>
          <p className="text-xl text-gray-300">
            This is a white-labeled promoter site
          </p>
        </section>

        <div className="bg-white/10 backdrop-blur p-8 rounded-lg max-w-2xl mx-auto">
          <p className="text-center text-lg">
            Events from this promoter will be displayed here
          </p>
        </div>
      </main>
    </div>
  )
}

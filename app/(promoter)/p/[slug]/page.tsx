export default function PromoterHomePage({ params }: { params: { slug: string } }) {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Welcome to {params.slug}</h1>
      <p className="text-xl mb-8">This is a white-labeled promoter site</p>
      <div className="bg-white/10 p-8 rounded-lg">
        <p>Events from this promoter will be displayed here</p>
      </div>
    </div>
  )
}

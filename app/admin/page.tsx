'use client'
export default function AdminPanel() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">Admin Panel</h1>
      <div className="grid md:grid-cols-4 gap-6">
        {['Revenue: $1.2M', 'Users: 8,234', 'Events: 42', 'Rate: 4.8%'].map((stat, i) => (
          <div key={i} className="p-6 bg-black/40 backdrop-blur rounded-xl border border-white/10">
            <p className="text-2xl font-bold">{stat.split(':')[1]}</p>
            <p className="text-gray-400">{stat.split(':')[0]}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

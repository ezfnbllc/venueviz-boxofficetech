'use client'
import{useRouter}from'next/navigation'
export default function HomePage(){
  const router=useRouter()
  
  const features=[
    {icon:'🎭',title:'Events',desc:'Browse upcoming shows',link:'/events'},
    {icon:'🏛️',title:'Venues',desc:'Explore our venues',link:'/venues'},
    {icon:'🎫',title:'Box Office',desc:'Book your seats',link:'/box-office'},
    {icon:'📊',title:'Analytics',desc:'View insights',link:'/analytics'}
  ]

  return(
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <nav className="bg-black/30 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            VenueViz
          </h1>
          <div className="flex gap-4">
            <button onClick={()=>router.push('/events')} className="px-4 py-2 hover:bg-white/10 rounded-lg">Events</button>
            <button onClick={()=>router.push('/venues')} className="px-4 py-2 hover:bg-white/10 rounded-lg">Venues</button>
            <button onClick={()=>router.push('/box-office')} className="px-4 py-2 hover:bg-white/10 rounded-lg">Box Office</button>
            <button onClick={()=>router.push('/login')} className="px-4 py-2 bg-purple-600 rounded-lg">Admin</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        <div className="text-center mb-12">
          <h2 className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            Experience Entertainment
          </h2>
          <p className="text-xl text-gray-300">AI-Powered Venue Management & Ticketing Platform</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((f,i)=>(
            <button
              key={i}
              onClick={()=>router.push(f.link)}
              className="p-6 bg-black/40 backdrop-blur rounded-xl border border-white/10 hover:scale-105 transition-transform"
            >
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </button>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={()=>router.push('/login')}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-lg font-semibold hover:opacity-90"
          >
            Access Admin Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

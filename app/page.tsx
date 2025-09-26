'use client'
import{useState,useEffect}from'react'
import{useRouter}from'next/navigation'
import{dbStatus}from'@/lib/firebase'

export default function HomePage(){
const router=useRouter()
const[events,setEvents]=useState<any[]>([])

useEffect(()=>{
fetch('/api/events').then(r=>r.json()).then(d=>setEvents(d.events||[]))
},[])

return(
<div className="min-h-screen">
<nav className="bg-black/30 backdrop-blur border-b border-white/10">
<div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
<div>
<h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">VenueViz</h1>
<p className="text-xs text-gray-400">{dbStatus.name}</p>
</div>
<button onClick={()=>router.push('/login')} className="px-4 py-2 bg-purple-600 rounded-lg">Admin Login</button>
</div>
</nav>

<div className="max-w-7xl mx-auto p-8">
<div className="text-center mb-12">
<h2 className="text-5xl font-bold mb-4">AI-Powered Venue Management</h2>
<p className="text-xl text-gray-300">Transform your venue operations with intelligent ticketing</p>
</div>

<div className="grid md:grid-cols-3 gap-6">
{events.slice(0,3).map((e,i)=>(
<div key={e.id||i} className="p-6 bg-black/30 backdrop-blur rounded-xl border border-white/10">
<h3 className="text-xl font-bold mb-2">{e.name||'Event '+(i+1)}</h3>
<p className="text-gray-400">{e.venue||'Main Theater'}</p>
<button className="mt-4 px-4 py-2 bg-purple-600 rounded">Book Now</button>
</div>
))}
</div>

<div className="text-center mt-12">
<button onClick={()=>router.push('/login')} className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-lg font-semibold">
Access Dashboard
</button>
</div>
</div>
</div>
)}

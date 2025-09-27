'use client'
import{useState,useEffect}from'react'
import{useRouter}from'next/navigation'
import{db,STORAGE_URL}from'@/lib/firebase'
import{collection,getDocs}from'firebase/firestore'

export default function HomePage(){
const router=useRouter()
const[events,setEvents]=useState<any[]>([])

useEffect(()=>{
getDocs(collection(db,'events')).then(snap=>{
setEvents(snap.docs.map(d=>({id:d.id,...d.data()})))
}).catch(()=>{
setEvents([
{id:'1',name:'Hamilton',venue:'Main Theater',price:150,image:STORAGE_URL+'hamilton.jpg?alt=media'},
{id:'2',name:'Symphony Orchestra',venue:'Concert Hall',price:100,image:STORAGE_URL+'concert.jpg?alt=media'},
{id:'3',name:'Jazz Night',venue:'Jazz Club',price:75,image:STORAGE_URL+'jazz.jpg?alt=media'}
])
})
},[])

return(
<div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
<nav className="bg-black/30 backdrop-blur border-b border-white/10">
<div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
<h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
VenueViz
</h1>
<button onClick={()=>router.push('/login')} className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700">
Admin Login
</button>
</div>
</nav>

<div className="max-w-7xl mx-auto p-8">
<div className="text-center mb-12">
<h2 className="text-5xl font-bold mb-4">Experience Live Entertainment</h2>
<p className="text-xl text-gray-300">Book tickets for the best events in town</p>
</div>

<div className="grid md:grid-cols-3 gap-6 mb-12">
{events.slice(0,3).map(e=>(
<div key={e.id} className="bg-black/40 backdrop-blur rounded-xl border border-white/10 overflow-hidden hover:scale-105 transition-transform">
<div className="h-48 bg-gradient-to-br from-purple-600/20 to-pink-600/20 relative">
{e.image&&<img src={e.image} className="w-full h-full object-cover absolute inset-0"/>}
</div>
<div className="p-6">
<h3 className="text-xl font-bold mb-2">{e.name}</h3>
<p className="text-gray-400 mb-4">{e.venue}</p>
<div className="flex justify-between items-center">
<span className="text-2xl font-bold">${e.price}</span>
<button className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700">Book Now</button>
</div>
</div>
</div>
))}
</div>

<div className="text-center">
<p className="text-gray-400 mb-2">Connected to Firebase Storage</p>
<p className="text-xs text-gray-500">{STORAGE_URL}</p>
</div>
</div>
</div>
)}

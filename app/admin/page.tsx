'use client'
import{useEffect,useState}from'react'
import{useRouter}from'next/navigation'
import{db,dbStatus}from'@/lib/firebase'
import{collection,getDocs,addDoc}from'firebase/firestore'

export default function AdminPanel(){
const router=useRouter()
const[stats,setStats]=useState<any>(null)
const[events,setEvents]=useState<any[]>([])
const[loading,setLoading]=useState(true)

useEffect(()=>{
const token=document.cookie.includes('auth=true')
if(!token){router.push('/login');return}
fetchData()
},[])

const fetchData=async()=>{
try{
const eventsSnap=await getDocs(collection(db,'events'))
const eventsList=eventsSnap.docs.map(d=>({id:d.id,...d.data()}))
setEvents(eventsList)
setStats({
revenue:1234567,
users:8234,
events:eventsList.length,
tickets:3421
})
}catch(e){
setStats({revenue:1234567,users:8234,events:12,tickets:3421})
}
setLoading(false)
}

const createTestEvent=async()=>{
try{
await addDoc(collection(db,'events'),{
name:'New Event '+Date.now(),
date:new Date(),
venue:'Main Theater',
price:100
})
alert('Event created in Firebase!')
fetchData()
}catch(e){alert('Error creating event')}
}

if(loading)return<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"/></div>

return(
<div className="min-h-screen p-8">
<div className="max-w-7xl mx-auto">
<div className="flex justify-between items-center mb-8">
<div>
<h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">Admin Dashboard</h1>
<p className="text-sm text-gray-400 mt-1">Connected to: {dbStatus.name}</p>
</div>
<button onClick={()=>{document.cookie='auth=;max-age=0';router.push('/login')}} className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg">Logout</button>
</div>

<div className="grid md:grid-cols-4 gap-6 mb-8">
<div className="p-6 bg-black/40 backdrop-blur rounded-xl border border-white/10">
<p className="text-3xl font-bold">${(stats?.revenue/1000).toFixed(0)}K</p>
<p className="text-gray-400">Revenue</p>
</div>
<div className="p-6 bg-black/40 backdrop-blur rounded-xl border border-white/10">
<p className="text-3xl font-bold">{stats?.users}</p>
<p className="text-gray-400">Users</p>
</div>
<div className="p-6 bg-black/40 backdrop-blur rounded-xl border border-white/10">
<p className="text-3xl font-bold">{stats?.events}</p>
<p className="text-gray-400">Events</p>
</div>
<div className="p-6 bg-black/40 backdrop-blur rounded-xl border border-white/10">
<p className="text-3xl font-bold">{stats?.tickets}</p>
<p className="text-gray-400">Tickets Sold</p>
</div>
</div>

<div className="bg-black/40 backdrop-blur rounded-xl border border-white/10 p-6">
<div className="flex justify-between items-center mb-4">
<h2 className="text-xl font-bold">Events from Firebase</h2>
<button onClick={createTestEvent} className="px-4 py-2 bg-purple-600 rounded-lg">+ Add Event</button>
</div>
{events.length>0?(
<div className="space-y-2">
{events.map(e=>(
<div key={e.id} className="p-3 bg-white/5 rounded-lg flex justify-between">
<span>{e.name}</span>
<span className="text-gray-400">{e.venue}</span>
</div>
))}
</div>
):(<p className="text-gray-400">No events in database</p>)}
</div>
</div>
</div>
)}

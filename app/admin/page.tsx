'use client'
import{useEffect,useState}from'react'
import{useRouter}from'next/navigation'
import{db,STORAGE_URL}from'@/lib/firebase'
import{collection,getDocs,addDoc}from'firebase/firestore'

export default function AdminPanel(){
const router=useRouter()
const[events,setEvents]=useState<any[]>([])
const[venues,setVenues]=useState<any[]>([])
const[showModal,setShowModal]=useState(false)
const[newEvent,setNewEvent]=useState({name:'',venue:'',date:'',price:100,image:''})

useEffect(()=>{
if(!document.cookie.includes('auth=true')){router.push('/login');return}
loadData()
},[])

const loadData=async()=>{
try{
const[eventsSnap,venuesSnap]=await Promise.all([
getDocs(collection(db,'events')),
getDocs(collection(db,'venues'))
])
setEvents(eventsSnap.docs.map(d=>({id:d.id,...d.data()})))
setVenues(venuesSnap.docs.map(d=>({id:d.id,...d.data()})))
}catch(e){console.log(e)}
}

const uploadImage=async(file:File)=>{
const formData=new FormData()
formData.append('file',file)
const res=await fetch('/api/upload',{method:'POST',body:formData})
const data=await res.json()
return data.url
}

const createEvent=async()=>{
try{
const docRef=await addDoc(collection(db,'events'),{
...newEvent,
createdAt:new Date(),
image:newEvent.image||STORAGE_URL+'default-event.jpg?alt=media'
})
alert('Event created!')
setShowModal(false)
loadData()
}catch(e){alert('Error creating event')}
}

const defaultImages=[
'hamilton.jpg','concert.jpg','jazz.jpg','theater.jpg'
].map(img=>STORAGE_URL+img+'?alt=media')

return(
<div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
<div className="max-w-7xl mx-auto">
<div className="flex justify-between items-center mb-8">
<h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
Admin Dashboard
</h1>
<div className="flex gap-4">
<button onClick={()=>setShowModal(true)} className="px-4 py-2 bg-purple-600 rounded-lg">+ Create Event</button>
<button onClick={()=>{document.cookie='auth=;max-age=0';router.push('/login')}} className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg">Logout</button>
</div>
</div>

<div className="grid md:grid-cols-4 gap-6 mb-8">
{[
{label:'Revenue',value:'$1.2M',change:'+22%'},
{label:'Events',value:events.length,change:'+8%'},
{label:'Venues',value:venues.length||3,change:'Active'},
{label:'Tickets',value:'3,421',change:'+15%'}
].map((stat,i)=>(
<div key={i} className="p-6 bg-black/40 backdrop-blur rounded-xl border border-white/10">
<p className="text-3xl font-bold">{stat.value}</p>
<p className="text-gray-400">{stat.label}</p>
<p className="text-sm text-green-400 mt-2">{stat.change}</p>
</div>
))}
</div>

<div className="grid lg:grid-cols-2 gap-6">
<div className="bg-black/40 backdrop-blur rounded-xl border border-white/10 p-6">
<h2 className="text-xl font-bold mb-4">Events</h2>
<div className="space-y-3 max-h-96 overflow-y-auto">
{events.length>0?events.map(e=>(
<div key={e.id} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
{e.image&&<img src={e.image} className="w-16 h-16 rounded object-cover"/>}
<div className="flex-1">
<p className="font-semibold">{e.name}</p>
<p className="text-sm text-gray-400">{e.venue||'Main Theater'}</p>
</div>
<p className="text-green-400">${e.price}</p>
</div>
)):<p className="text-gray-400">No events yet</p>}
</div>
</div>

<div className="bg-black/40 backdrop-blur rounded-xl border border-white/10 p-6">
<h2 className="text-xl font-bold mb-4">Venues</h2>
<div className="space-y-3">
{['Main Theater - 500 seats','Concert Hall - 800 seats','Jazz Club - 200 seats'].map((v,i)=>(
<div key={i} className="p-3 bg-white/5 rounded-lg flex justify-between">
<span>{v.split('-')[0]}</span>
<span className="text-gray-400">{v.split('-')[1]}</span>
</div>
))}
</div>
</div>
</div>

{showModal&&(
<div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
<div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
<h3 className="text-2xl font-bold mb-4">Create Event</h3>
<div className="space-y-4">
<input type="text" placeholder="Event Name" value={newEvent.name} onChange={e=>setNewEvent({...newEvent,name:e.target.value})} className="w-full p-3 bg-white/10 rounded-lg"/>
<select value={newEvent.venue} onChange={e=>setNewEvent({...newEvent,venue:e.target.value})} className="w-full p-3 bg-white/10 rounded-lg">
<option value="">Select Venue</option>
<option value="Main Theater">Main Theater</option>
<option value="Concert Hall">Concert Hall</option>
<option value="Jazz Club">Jazz Club</option>
</select>
<input type="date" value={newEvent.date} onChange={e=>setNewEvent({...newEvent,date:e.target.value})} className="w-full p-3 bg-white/10 rounded-lg"/>
<input type="number" placeholder="Price" value={newEvent.price} onChange={e=>setNewEvent({...newEvent,price:+e.target.value})} className="w-full p-3 bg-white/10 rounded-lg"/>
<div className="flex gap-2">
<input type="file" accept="image/*" onChange={async e=>{
if(e.target.files?.[0]){
const url=await uploadImage(e.target.files[0])
setNewEvent({...newEvent,image:url})
alert('Image uploaded!')
}
}} className="flex-1 p-3 bg-white/10 rounded-lg"/>
</div>
<div className="flex gap-2">
<button onClick={()=>setShowModal(false)} className="flex-1 p-3 bg-gray-700 rounded-lg">Cancel</button>
<button onClick={createEvent} className="flex-1 p-3 bg-purple-600 rounded-lg">Create</button>
</div>
</div>
</div>
</div>
)}
</div>
</div>
)}

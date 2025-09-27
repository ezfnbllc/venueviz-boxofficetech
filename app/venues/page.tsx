'use client'
import{useState,useEffect}from'react'
import{db,storage,STORAGE_URL}from'@/lib/firebase'
import{collection,getDocs,addDoc}from'firebase/firestore'
import{ref,uploadBytes,getDownloadURL}from'firebase/storage'

export default function VenuesPage(){
  const[venues,setVenues]=useState<any[]>([])
  const[showModal,setShowModal]=useState(false)
  const[newVenue,setNewVenue]=useState({name:'',address:'',capacity:500,sections:3})

  useEffect(()=>{
    loadVenues()
  },[])

  const loadVenues=async()=>{
    try{
      const snap=await getDocs(collection(db,'venues'))
      setVenues(snap.docs.map(d=>({id:d.id,...d.data()})))
    }catch(e){
      setVenues([
        {id:'1',name:'Main Theater',address:'123 Broadway Ave',capacity:500,sections:3},
        {id:'2',name:'Concert Hall',address:'456 Symphony Blvd',capacity:800,sections:4},
        {id:'3',name:'Jazz Club',address:'789 Melody Lane',capacity:200,sections:2}
      ])
    }
  }

  const createVenue=async()=>{
    try{
      await addDoc(collection(db,'venues'),{...newVenue,createdAt:new Date()})
      setShowModal(false)
      loadVenues()
    }catch(e){
      alert('Error creating venue')
    }
  }

  return(
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            Venue Management
          </h1>
          <button onClick={()=>setShowModal(true)} className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700">
            + Add Venue
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map(venue=>(
            <div key={venue.id} className="bg-black/40 backdrop-blur rounded-xl border border-white/10 overflow-hidden">
              <div className="h-48 bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center">
                <span className="text-6xl opacity-20">🏛️</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">{venue.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{venue.address}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Capacity</p>
                    <p className="text-2xl font-bold">{venue.capacity}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Sections</p>
                    <p className="text-2xl font-bold">{venue.sections}</p>
                  </div>
                </div>
                <button className="w-full mt-4 py-2 bg-purple-600/20 rounded-lg hover:bg-purple-600/30">
                  Manage Venue
                </button>
              </div>
            </div>
          ))}
        </div>

        {showModal&&(
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
              <h3 className="text-2xl font-bold mb-4">Add New Venue</h3>
              <div className="space-y-4">
                <input type="text" placeholder="Venue Name" value={newVenue.name} onChange={e=>setNewVenue({...newVenue,name:e.target.value})} className="w-full p-3 bg-white/10 rounded-lg"/>
                <input type="text" placeholder="Address" value={newVenue.address} onChange={e=>setNewVenue({...newVenue,address:e.target.value})} className="w-full p-3 bg-white/10 rounded-lg"/>
                <input type="number" placeholder="Capacity" value={newVenue.capacity} onChange={e=>setNewVenue({...newVenue,capacity:+e.target.value})} className="w-full p-3 bg-white/10 rounded-lg"/>
                <input type="number" placeholder="Sections" value={newVenue.sections} onChange={e=>setNewVenue({...newVenue,sections:+e.target.value})} className="w-full p-3 bg-white/10 rounded-lg"/>
                <div className="flex gap-2">
                  <button onClick={()=>setShowModal(false)} className="flex-1 p-3 bg-gray-700 rounded-lg">Cancel</button>
                  <button onClick={createVenue} className="flex-1 p-3 bg-purple-600 rounded-lg">Create</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'
import{useState,useEffect}from'react'
import{db}from'@/lib/firebase'
import{collection,getDocs,query,orderBy}from'firebase/firestore'
import{useRouter}from'next/navigation'

export default function EventsPage(){
  const router=useRouter()
  const[events,setEvents]=useState<any[]>([])
  const[filteredEvents,setFilteredEvents]=useState<any[]>([])
  const[search,setSearch]=useState('')
  const[category,setCategory]=useState('all')

  useEffect(()=>{
    loadEvents()
  },[])

  const loadEvents=async()=>{
    try{
      const q=query(collection(db,'events'),orderBy('date','desc'))
      const snap=await getDocs(q)
      const data=snap.docs.map(d=>({id:d.id,...d.data()}))
      setEvents(data)
      setFilteredEvents(data)
    }catch(e){
      // Default events
      const defaults=[
        {id:'1',name:'Hamilton',venue:'Main Theater',date:'2025-09-28',price:150,category:'Musical'},
        {id:'2',name:'Symphony Orchestra',venue:'Concert Hall',date:'2025-09-29',price:100,category:'Classical'},
        {id:'3',name:'Jazz Night',venue:'Jazz Club',date:'2025-09-30',price:75,category:'Jazz'},
        {id:'4',name:'Comedy Show',venue:'Comedy Club',date:'2025-10-01',price:50,category:'Comedy'}
      ]
      setEvents(defaults)
      setFilteredEvents(defaults)
    }
  }

  const handleSearch=(term:string)=>{
    setSearch(term)
    filterEvents(term,category)
  }

  const handleCategory=(cat:string)=>{
    setCategory(cat)
    filterEvents(search,cat)
  }

  const filterEvents=(searchTerm:string,cat:string)=>{
    let filtered=events
    if(searchTerm){
      filtered=filtered.filter(e=>
        e.name?.toLowerCase().includes(searchTerm.toLowerCase())||
        e.venue?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if(cat!=='all'){
      filtered=filtered.filter(e=>e.category===cat)
    }
    setFilteredEvents(filtered)
  }

  const categories=['all','Musical','Classical','Jazz','Comedy','Theater']

  return(
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          Upcoming Events
        </h1>

        {/* Search and Filters */}
        <div className="bg-black/40 backdrop-blur rounded-xl border border-white/10 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e)=>handleSearch(e.target.value)}
              className="flex-1 px-4 py-3 bg-white/10 rounded-lg text-white placeholder-gray-400"
            />
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat=>(
                <button
                  key={cat}
                  onClick={()=>handleCategory(cat)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    category===cat?'bg-purple-600':'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {cat==='all'?'All Events':cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEvents.map(event=>(
            <div key={event.id} className="bg-black/40 backdrop-blur rounded-xl border border-white/10 overflow-hidden hover:scale-105 transition-transform">
              <div className="h-48 bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center">
                <span className="text-6xl opacity-20">🎭</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">{event.name}</h3>
                <p className="text-gray-400 text-sm mb-1">{event.venue}</p>
                <p className="text-gray-400 text-sm mb-4">{event.date}</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">${event.price}</span>
                  <button
                    onClick={()=>router.push('/box-office')}
                    className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredEvents.length===0&&(
          <div className="text-center py-12">
            <p className="text-gray-400">No events found</p>
          </div>
        )}
      </div>
    </div>
  )
}

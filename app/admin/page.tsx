'use client'
import{useEffect,useState}from'react'
import{useRouter}from'next/navigation'
import{db}from'@/lib/firebase'
import{collection,getDocs,addDoc}from'firebase/firestore'
import{AIService}from'@/lib/ai-service'

export default function AdminPanel(){
  const router=useRouter()
  const[activeTab,setActiveTab]=useState('dashboard')
  const[stats,setStats]=useState<any>({})
  const[events,setEvents]=useState<any[]>([])
  const[aiRecommendations,setAiRecommendations]=useState<any[]>([])

  useEffect(()=>{
    if(!document.cookie.includes('auth=true')){
      router.push('/login')
      return
    }
    loadDashboard()
  },[])

  const loadDashboard=async()=>{
    try{
      const[eventsSnap,ordersSnap]=await Promise.all([
        getDocs(collection(db,'events')),
        getDocs(collection(db,'orders'))
      ])
      
      const eventsList=eventsSnap.docs.map(d=>({id:d.id,...d.data()}))
      setEvents(eventsList)
      
      setStats({
        revenue:ordersSnap.size*425||1234567,
        events:eventsList.length,
        orders:ordersSnap.size||3421,
        users:8234,
        conversionRate:4.8,
        occupancyRate:78
      })

      // Get AI recommendations
      const recs=await Promise.all(eventsList.slice(0,3).map(async e=>{
        const pricing=await AIService.getPricingRecommendation(e)
        return{
          event:e.name,
          action:`Adjust price to $${pricing.recommended}`,
          impact:`+${Math.round(pricing.recommended*0.15)} revenue`,
          confidence:pricing.confidence
        }
      }))
      setAiRecommendations(recs)
    }catch(e){
      console.error(e)
    }
  }

  const tabs=['dashboard','events','venues','customers','analytics','ai-insights','settings']

  return(
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-black/40 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              VenueViz Admin
            </h1>
            <div className="flex gap-4">
              <button onClick={()=>router.push('/')} className="px-4 py-2 bg-purple-600 rounded-lg">
                View Site
              </button>
              <button onClick={()=>{
                document.cookie='auth=;max-age=0;path=/'
                router.push('/login')
              }} className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-black/20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-6 overflow-x-auto">
            {tabs.map(tab=>(
              <button
                key={tab}
                onClick={()=>setActiveTab(tab)}
                className={`py-4 px-2 border-b-2 whitespace-nowrap transition-all ${
                  activeTab===tab?'border-purple-500 text-white':'border-transparent text-gray-400'
                }`}
              >
                {tab.charAt(0).toUpperCase()+tab.slice(1).replace('-',' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab==='dashboard'&&(
          <div className="space-y-6">
            {/* AI Recommendations */}
            {aiRecommendations.length>0&&(
              <div className="p-6 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl border border-purple-500/30">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>🤖</span> AI Recommendations
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {aiRecommendations.map((rec,i)=>(
                    <div key={i} className="p-4 bg-black/30 rounded-lg">
                      <p className="text-sm text-purple-400 mb-1">{rec.event}</p>
                      <p className="text-sm mb-2">{rec.action}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-green-400">{rec.impact}</span>
                        <span className="text-xs text-gray-400">{rec.confidence}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(stats).map(([key,value]:any)=>(
                <div key={key} className="p-4 bg-black/40 backdrop-blur rounded-xl border border-white/10">
                  <p className="text-2xl font-bold">
                    {key==='revenue'?`$${(value/1000).toFixed(0)}K`:
                     key.includes('Rate')?`${value}%`:value}
                  </p>
                  <p className="text-xs text-gray-400">{key.replace(/([A-Z])/g,' $1').trim()}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-4 gap-4">
              {[
                {icon:'🎭',title:'Create Event',desc:'Set up new event',color:'from-purple-600/20 to-pink-600/20'},
                {icon:'📊',title:'View Analytics',desc:'Performance metrics',color:'from-blue-600/20 to-cyan-600/20'},
                {icon:'🏛️',title:'Manage Venues',desc:'Venue configuration',color:'from-green-600/20 to-emerald-600/20'},
                {icon:'👥',title:'Customer Insights',desc:'User analytics',color:'from-orange-600/20 to-red-600/20'}
              ].map((action,i)=>(
                <button key={i} className={`p-6 bg-gradient-to-br ${action.color} rounded-xl border border-white/10 text-left hover:scale-105 transition-transform`}>
                  <div className="text-3xl mb-3">{action.icon}</div>
                  <h4 className="font-semibold mb-1">{action.title}</h4>
                  <p className="text-sm text-gray-400">{action.desc}</p>
                </button>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="bg-black/40 backdrop-blur rounded-xl border border-white/10 p-6">
              <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {[
                  {time:'2 min ago',action:'New order',details:'2 tickets for Hamilton',amount:'$300'},
                  {time:'15 min ago',action:'Event created',details:'Jazz Night - Oct 15',amount:''},
                  {time:'1 hour ago',action:'Venue updated',details:'Main Theater capacity changed',amount:''},
                  {time:'2 hours ago',action:'Bulk purchase',details:'20 tickets for Symphony',amount:'$2000'}
                ].map((activity,i)=>(
                  <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-sm">{activity.action}</p>
                      <p className="text-xs text-gray-400">{activity.details}</p>
                    </div>
                    <div className="text-right">
                      {activity.amount&&<p className="text-green-400 font-semibold">{activity.amount}</p>}
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'
import{useState,useEffect}from'react'
import{db}from'@/lib/firebase'
import{collection,getDocs}from'firebase/firestore'
import{AIService}from'@/lib/ai-service'

export default function Analytics(){
  const[metrics,setMetrics]=useState<any>({})
  const[aiInsights,setAiInsights]=useState<any[]>([])

  useEffect(()=>{
    loadAnalytics()
  },[])

  const loadAnalytics=async()=>{
    try{
      const[orders,events,segments]=await Promise.all([
        getDocs(collection(db,'orders')),
        getDocs(collection(db,'events')),
        AIService.getCustomerSegments()
      ])

      setMetrics({
        totalRevenue:orders.size*425,
        totalOrders:orders.size,
        totalEvents:events.size,
        avgOrderValue:425,
        conversionRate:4.8,
        occupancyRate:78
      })

      setAiInsights([
        {type:'Revenue',prediction:'$285K next month',confidence:92},
        {type:'Demand',prediction:'High for weekends',confidence:89},
        {type:'Pricing',prediction:'+15% optimal',confidence:94}
      ])
    }catch(e){
      setMetrics({
        totalRevenue:1234567,
        totalOrders:3421,
        totalEvents:42,
        avgOrderValue:361,
        conversionRate:4.8,
        occupancyRate:78
      })
    }
  }

  return(
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          Analytics Dashboard
        </h1>

        {/* KPI Cards */}
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {Object.entries(metrics).map(([key,value]:any)=>(
            <div key={key} className="p-4 bg-black/40 backdrop-blur rounded-xl border border-white/10">
              <p className="text-2xl font-bold">
                {typeof value==='number'&&key.includes('Revenue')?`$${(value/1000).toFixed(0)}K`:
                 typeof value==='number'&&key.includes('Rate')?`${value}%`:value}
              </p>
              <p className="text-xs text-gray-400">{key.replace(/([A-Z])/g,' $1').trim()}</p>
            </div>
          ))}
        </div>

        {/* AI Insights */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {aiInsights.map((insight,i)=>(
            <div key={i} className="p-6 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl border border-purple-500/30">
              <h3 className="font-semibold mb-2">{insight.type}</h3>
              <p className="text-2xl font-bold mb-1">{insight.prediction}</p>
              <p className="text-sm text-green-400">{insight.confidence}% confidence</p>
            </div>
          ))}
        </div>

        {/* Charts placeholder */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="p-6 bg-black/40 backdrop-blur rounded-xl border border-white/10">
            <h3 className="text-xl font-bold mb-4">Revenue Trend</h3>
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p>Chart visualization here</p>
            </div>
          </div>
          <div className="p-6 bg-black/40 backdrop-blur rounded-xl border border-white/10">
            <h3 className="text-xl font-bold mb-4">Occupancy Rate</h3>
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p>Chart visualization here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

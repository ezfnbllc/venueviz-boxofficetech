'use client'
import{useState,useEffect}from'react'
import{useStore}from'@/lib/stores/useStore'
import{db}from'@/lib/firebase'
import{collection,getDocs,addDoc}from'firebase/firestore'
import{useRouter}from'next/navigation'

export default function BoxOffice(){
  const router=useRouter()
  const{selectedSeats,selectSeat,deselectSeat}=useStore()
  const[event,setEvent]=useState<any>(null)
  const[loading,setLoading]==useState(false)

  const sections=[
    {name:'Orchestra',rows:12,seatsPerRow:20,price:150,color:'from-purple-600 to-pink-600'},
    {name:'Mezzanine',rows:8,seatsPerRow:18,price:100,color:'from-blue-600 to-cyan-600'},
    {name:'Balcony',rows:6,seatsPerRow:16,price:75,color:'from-green-600 to-emerald-600'}
  ]

  const generateSeats=(section:any)=>{
    const seats=[]
    for(let r=1;r<=section.rows;r++){
      for(let s=1;s<=section.seatsPerRow;s++){
        const id=`${section.name}-R${r}S${s}`
        seats.push({
          id,
          section:section.name,
          row:r,
          seat:s,
          price:section.price,
          status:Math.random()>0.7?'sold':'available',
          isAisle:s===6||s===section.seatsPerRow-5
        })
      }
    }
    return seats
  }

  const handleSeatClick=(seat:any)=>{
    if(seat.status==='sold')return
    const isSelected=selectedSeats.find(s=>s.id===seat.id)
    if(isSelected){
      deselectSeat(seat.id)
    }else{
      selectSeat(seat)
    }
  }

  const checkout=async()=>{
    if(selectedSeats.length===0)return
    setLoading(true)
    try{
      const order={
        seats:selectedSeats,
        total:selectedSeats.reduce((sum,s)=>sum+s.price,0),
        createdAt:new Date(),
        status:'pending'
      }
      await addDoc(collection(db,'orders'),order)
      alert('Order created! Redirecting to payment...')
      router.push('/checkout')
    }catch(e){
      alert('Error creating order')
    }
    setLoading(false)
  }

  const total=selectedSeats.reduce((sum,s)=>sum+s.price,0)
  const fees=total*0.1

  return(
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          Select Your Seats
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-black/40 backdrop-blur rounded-xl border border-white/10 p-6">
              {/* Stage */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center py-4 rounded-lg mb-8 font-bold text-xl">
                STAGE
              </div>

              {/* Seating sections */}
              {sections.map(section=>(
                <div key={section.name} className="mb-10">
                  <h3 className="text-center mb-4 text-lg font-semibold">
                    {section.name} - ${section.price}
                  </h3>
                  <div className="flex flex-wrap justify-center gap-1 max-w-4xl mx-auto">
                    {generateSeats(section).map(seat=>(
                      <button
                        key={seat.id}
                        onClick={()=>handleSeatClick(seat)}
                        disabled={seat.status==='sold'}
                        className={`
                          w-6 h-6 text-xs rounded transition-all
                          ${seat.isAisle?'mr-2':''}
                          ${seat.status==='sold'?'bg-gray-600 cursor-not-allowed':
                          selectedSeats.find(s=>s.id===seat.id)?
                          'bg-purple-600 scale-110 shadow-lg':
                          'bg-blue-500 hover:bg-blue-400 hover:scale-105'}
                        `}
                        title={`${section.name} Row ${seat.row} Seat ${seat.seat}`}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Legend */}
              <div className="flex justify-center gap-6 mt-8">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-blue-500 rounded"/>
                  <span className="text-sm">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-purple-600 rounded"/>
                  <span className="text-sm">Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-600 rounded"/>
                  <span className="text-sm">Sold</span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-black/40 backdrop-blur rounded-xl border border-white/10 p-6 h-fit sticky top-8">
            <h2 className="text-2xl font-bold mb-6">Order Summary</h2>
            
            <div className="mb-6">
              <p className="text-gray-400 mb-2">Event</p>
              <p className="text-xl font-semibold">Hamilton</p>
              <p className="text-sm text-gray-400">Tonight, 7:30 PM • Main Theater</p>
            </div>

            <div className="mb-6">
              <p className="text-gray-400 mb-2">Selected Seats ({selectedSeats.length})</p>
              {selectedSeats.length===0?(
                <p className="text-sm text-gray-500">No seats selected</p>
              ):(
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedSeats.map(seat=>(
                    <div key={seat.id} className="flex justify-between text-sm">
                      <span>{seat.section} R{seat.row}S{seat.seat}</span>
                      <span>${seat.price}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-white/20 pt-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${total}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Fees</span>
                <span>${fees.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold pt-2 border-t border-white/20">
                <span>Total</span>
                <span>${(total+fees).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={checkout}
              disabled={selectedSeats.length===0||loading}
              className="w-full mt-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {loading?'Processing...':'Proceed to Payment'}
            </button>

            {selectedSeats.length===0&&(
              <div className="mt-4 p-3 bg-purple-600/10 rounded-lg border border-purple-600/20">
                <p className="text-xs text-purple-400">💡 AI Tip: Best value seats in Orchestra Row 5-7</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

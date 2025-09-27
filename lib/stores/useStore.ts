import{create}from'zustand'

interface AppState{
  user:any
  selectedSeats:any[]
  cart:any[]
  events:any[]
  venues:any[]
  setUser:(user:any)=>void
  addToCart:(item:any)=>void
  clearCart:()=>void
  selectSeat:(seat:any)=>void
  deselectSeat:(seatId:string)=>void
}

export const useStore=create<AppState>((set)=>({
  user:null,
  selectedSeats:[],
  cart:[],
  events:[],
  venues:[],
  setUser:(user)=>set({user}),
  addToCart:(item)=>set((s)=>({cart:[...s.cart,item]})),
  clearCart:()=>set({cart:[]}),
  selectSeat:(seat)=>set((s)=>({selectedSeats:[...s.selectedSeats,seat]})),
  deselectSeat:(seatId)=>set((s)=>({selectedSeats:s.selectedSeats.filter(s=>s.id!==seatId)}))
}))

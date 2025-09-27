import{create}from'zustand'
export const useCart=create((set,get)=>({
selectedSeats:[],total:0,
selectSeat:(seat)=>set(s=>({selectedSeats:[...s.selectedSeats,seat],total:s.total+seat.price})),
deselectSeat:(id)=>set(s=>{const seat=s.selectedSeats.find(x=>x.id===id);return{selectedSeats:s.selectedSeats.filter(x=>x.id!==id),total:s.total-(seat?.price||0)}}),
clearCart:()=>set({selectedSeats:[],total:0}),
calculateTotal:()=>get().selectedSeats.reduce((sum,s)=>sum+s.price,0)
}))

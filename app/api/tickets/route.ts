import{NextRequest,NextResponse}from'next/server'
import{db}from'@/lib/firebase'
import{collection,addDoc}from'firebase/firestore'
import{v4 as uuid}from'uuid'

export async function POST(req:NextRequest){
try{
const data=await req.json()
const ticket={
...data,
qrCode:uuid(),
createdAt:new Date(),
status:'active'
}
const docRef=await addDoc(collection(db,'tickets'),ticket)
return NextResponse.json({id:docRef.id,qrCode:ticket.qrCode})
}catch(e){
return NextResponse.json({error:'Failed to create ticket'},{ status:500})}
}

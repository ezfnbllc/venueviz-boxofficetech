import{NextRequest,NextResponse}from'next/server'
import{db}from'@/lib/firebase'
import{collection,addDoc,getDocs,query,orderBy}from'firebase/firestore'

export async function GET(){
try{
const q=query(collection(db,'events'),orderBy('date','desc'))
const snapshot=await getDocs(q)
const events=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}))
return NextResponse.json({events,db:'Firebase'})
}catch(e){
return NextResponse.json({events:[],error:'Database error'})}
}

export async function POST(req:NextRequest){
try{
const data=await req.json()
const docRef=await addDoc(collection(db,'events'),{...data,createdAt:new Date()})
return NextResponse.json({id:docRef.id,success:true})
}catch(e){
return NextResponse.json({error:'Failed to create event'},{ status:500})}
}

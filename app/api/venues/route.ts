import{NextResponse}from'next/server'
import{db}from'@/lib/firebase'
import{collection,getDocs}from'firebase/firestore'

export async function GET(){
try{
const snapshot=await getDocs(collection(db,'venues'))
const venues=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}))
return NextResponse.json({venues,db:'Firebase'})
}catch(e){
return NextResponse.json({venues:[
{id:'1',name:'Main Theater',capacity:500,address:'123 Broadway'},
{id:'2',name:'Concert Hall',capacity:800,address:'456 Symphony Blvd'},
{id:'3',name:'Jazz Club',capacity:200,address:'789 Melody Lane'}
]})}
}

'use client'
import{useEffect,useState}from'react'
import{dbStatus}from'@/lib/firebase'
export default function DbStatus(){
const[status,setStatus]=useState('connecting...')
useEffect(()=>{setStatus(dbStatus.connected?'🟢 '+dbStatus.name:'🔴 Offline')},[])
return<div className="fixed bottom-4 right-4 px-3 py-1 bg-black/60 backdrop-blur text-xs text-green-400 rounded-full">{status}</div>
}

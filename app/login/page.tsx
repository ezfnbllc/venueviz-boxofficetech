'use client'
import{useState}from'react'
import{useRouter}from'next/navigation'
import{dbStatus}from'@/lib/firebase'

export default function Login(){
const[email,setEmail]=useState('')
const[password,setPassword]=useState('')
const router=useRouter()

const handleSubmit=(e:any)=>{
e.preventDefault()
if(email==='admin@venueviz.com'&&password==='ChangeMeNow!'){
document.cookie='auth=true;path=/;max-age=86400'
router.push('/admin')
}else{alert('Invalid credentials')}
}

return(
<div className="min-h-screen flex items-center justify-center">
<div className="w-full max-w-md p-8 bg-black/40 backdrop-blur rounded-2xl border border-white/10">
<h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">VenueViz Login</h1>
<p className="text-xs text-center text-gray-400 mb-8">Database: {dbStatus.name}</p>
<form onSubmit={handleSubmit} className="space-y-6">
<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white" placeholder="admin@venueviz.com" required/>
<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white" placeholder="Password" required/>
<button type="submit" className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg font-semibold">Sign In</button>
</form>
<div className="mt-6 p-4 bg-purple-600/10 rounded-lg">
<p className="text-purple-400 text-sm">Demo: admin@venueviz.com / ChangeMeNow!</p>
</div>
</div>
</div>
)}

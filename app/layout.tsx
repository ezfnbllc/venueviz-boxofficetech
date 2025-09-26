import './globals.css'
import DbStatus from '@/components/DbStatus'
export default function RootLayout({children}:{children:React.ReactNode}){
return(
<html lang="en">
<body className="bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
{children}
<DbStatus/>
</body>
</html>
)}

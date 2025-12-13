import './globals.css'
import DbStatus from '@/components/DbStatus'
import { FirebaseAuthProvider } from '@/lib/firebase-auth'
import { ThemeProvider } from '@/lib/theme-context'

export default function RootLayout({children}:{children:React.ReactNode}){
  return(
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
        <ThemeProvider>
          <FirebaseAuthProvider>
            {children}
            <DbStatus/>
          </FirebaseAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

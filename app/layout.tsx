import './globals.css'
import DbStatus from '@/components/DbStatus'
import { FirebaseAuthProvider } from '@/lib/firebase-auth'
import { ThemeProvider } from '@/lib/theme-context'

export default function RootLayout({children}:{children:React.ReactNode}){
  return(
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 transition-colors duration-200">
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

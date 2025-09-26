import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'VenueViz - AI-Powered Box Office',
  description: 'Revolutionary venue management platform'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
        {children}
      </body>
    </html>
  )
}

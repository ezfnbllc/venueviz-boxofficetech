'use client'
export default function PromoterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white">
      <header className="border-b border-white/10 bg-black/20">
        <nav className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Promoter Site</h1>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}

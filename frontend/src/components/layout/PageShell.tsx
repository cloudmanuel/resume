import type { ReactNode } from 'react'
import Header from './Header'
import Footer from './Footer'

interface PageShellProps {
  children: ReactNode
}

export default function PageShell({ children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}

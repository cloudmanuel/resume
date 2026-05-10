import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Server, Menu, X, Download } from 'lucide-react'
import { cn } from '../../lib/cn'
import { SITE_NAME, NAV_LINKS, PDF_URL } from '../../lib/constants'

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Branding */}
          <Link
            to="/"
            className="flex items-center gap-2 text-white font-semibold hover:text-cyan-400 transition-colors"
          >
            <Server className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="text-sm hidden sm:inline">{SITE_NAME}</span>
            <span className="text-sm sm:hidden">Control Plane</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                end={link.href === '/'}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'text-cyan-400 bg-cyan-400/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <a
              href={PDF_URL}
              download
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 border border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10 text-sm font-medium rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Resume PDF
            </a>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-md hover:bg-white/5 transition-colors"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-sm animate-slide-down">
          <nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                end={link.href === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'text-cyan-400 bg-cyan-400/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="pt-2 border-t border-white/10 mt-1">
              <a
                href={PDF_URL}
                download
                className="flex items-center gap-2 px-3 py-2 text-cyan-400 hover:bg-cyan-400/10 text-sm font-medium rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Resume PDF
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

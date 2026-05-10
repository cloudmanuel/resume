import { Github, Linkedin, ExternalLink } from 'lucide-react'
import { GITHUB_URL, LINKEDIN_URL, CANDIDATE_NAME } from '../../lib/constants'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-white/10 bg-slate-950 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: infrastructure tagline */}
          <div className="text-center md:text-left">
            <p className="text-slate-500 text-sm">
              Built and operated on{' '}
              <span className="text-slate-400">AWS</span>
              {' · '}
              Managed with{' '}
              <span className="text-slate-400">Terraform</span>
              {' · '}
              Deployed via{' '}
              <span className="text-slate-400">GitHub Actions</span>
            </p>
            <p className="text-slate-600 text-xs mt-1">
              © {year} {CANDIDATE_NAME} · All systems operational
            </p>
          </div>

          {/* Right: links */}
          <div className="flex items-center gap-4">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              <Linkedin className="w-4 h-4" />
              LinkedIn
            </a>
            <a
              href="https://github.com/manuelanda/resume-platform"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Source
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

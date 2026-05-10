import { Link } from 'react-router-dom'
import { Download, ArrowRight } from 'lucide-react'
import { PDF_URL, CANDIDATE_NAME, CANDIDATE_TITLE } from '../../lib/constants'

const tags = ['AWS', 'Terraform', 'CI/CD', 'Python', 'React', 'Observability', 'Kubernetes']

export default function HeroSection() {
  return (
    <div className="pt-16 pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Eyebrow */}
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          {CANDIDATE_NAME} · {CANDIDATE_TITLE}
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
        A resume operated like{' '}
        <span className="text-cyan-400">production infrastructure.</span>
      </h1>

      {/* Subheadline */}
      <p className="text-lg text-slate-400 max-w-3xl leading-relaxed mb-8">
        I build secure, automated cloud platforms that help developers ship faster. This site is
        a live, observable cloud system designed to demonstrate the same platform engineering
        principles I use professionally — versioned with Terraform, deployed via GitHub Actions,
        and monitored end-to-end.
      </p>

      {/* CTAs */}
      <div className="flex flex-wrap gap-3 mb-10">
        <a
          href={PDF_URL}
          download
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Download Resume PDF
        </a>
        <Link
          to="/service-catalog"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/20 text-slate-300 hover:text-white hover:bg-white/5 font-medium rounded-lg transition-colors"
        >
          Explore the Platform
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Tech tags */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 bg-slate-800/80 border border-white/10 rounded-full text-xs font-medium text-slate-300"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import StackBadge from './StackBadge'
import { cn } from '../../lib/cn'

type ServiceStatus = 'operational' | 'degraded' | 'unknown' | 'archived'
type ServiceType = 'platform' | 'observability' | 'automation' | 'backend' | 'infrastructure'

interface ServiceCardProps {
  name: string
  type: ServiceType
  status: ServiceStatus
  stack: string[]
  problem: string
  built: string
  caseStudyId?: string
  className?: string
}

const typeColors: Record<ServiceType, string> = {
  platform: 'bg-cyan-400/15 text-cyan-400',
  observability: 'bg-indigo-400/15 text-indigo-400',
  automation: 'bg-violet-400/15 text-violet-400',
  backend: 'bg-emerald-400/15 text-emerald-400',
  infrastructure: 'bg-slate-600 text-slate-300',
}

const statusColors: Record<ServiceStatus, string> = {
  operational: 'bg-emerald-400',
  degraded: 'bg-amber-400',
  unknown: 'bg-slate-500',
  archived: 'bg-slate-600',
}

const statusLabels: Record<ServiceStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  unknown: 'Unknown',
  archived: 'Archived',
}

export default function ServiceCard({
  name,
  type,
  status,
  stack,
  problem,
  built,
  caseStudyId,
  className,
}: ServiceCardProps) {
  return (
    <div
      className={cn(
        'group bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-4',
        'hover:border-cyan-400/30 hover:bg-white/[0.07] transition-colors duration-200',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold text-white leading-tight">{name}</h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={cn('inline-flex px-2 py-0.5 rounded text-xs font-semibold', typeColors[type])}
          >
            {type}
          </span>
          <div className="flex items-center gap-1.5">
            <span className={cn('w-1.5 h-1.5 rounded-full', statusColors[status])} />
            <span className="text-xs text-slate-400">{statusLabels[status]}</span>
          </div>
        </div>
      </div>

      {/* Problem */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
          Problem Solved
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">{problem}</p>
      </div>

      {/* What was built */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
          What I Built
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">{built}</p>
      </div>

      {/* Stack */}
      <div className="flex flex-wrap gap-1.5">
        {stack.map((tech) => (
          <StackBadge key={tech} tech={tech} />
        ))}
      </div>

      {/* Case study link */}
      {caseStudyId && (
        <div className="mt-auto pt-2 border-t border-white/5">
          <Link
            to={`/case-studies#${caseStudyId}`}
            className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            Read case study
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      )}
    </div>
  )
}

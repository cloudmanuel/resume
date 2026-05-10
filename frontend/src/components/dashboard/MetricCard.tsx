import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Status = 'operational' | 'degraded' | 'unknown'
type Label = 'live' | 'estimated' | 'demo'

interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  status?: Status
  label?: Label
  icon?: ReactNode
  trend?: string
  className?: string
}

const statusColors: Record<Status, string> = {
  operational: 'bg-emerald-400',
  degraded: 'bg-amber-400',
  unknown: 'bg-slate-500',
}

const labelStyles: Record<Label, string> = {
  live: 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30',
  estimated: 'bg-slate-700 text-slate-300 border border-white/10',
  demo: 'bg-amber-400/15 text-amber-400 border border-amber-400/30',
}

const labelText: Record<Label, string> = {
  live: 'LIVE',
  estimated: 'EST',
  demo: 'DEMO',
}

export default function MetricCard({
  title,
  value,
  unit,
  status,
  label,
  icon,
  trend,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3',
        className
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {status && (
            <span
              className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-0.5', statusColors[status])}
              title={status}
            />
          )}
          {icon && <span className="text-slate-400">{icon}</span>}
          <span className="text-xs font-medium text-slate-400 leading-tight">{title}</span>
        </div>
        {label && (
          <span
            className={cn(
              'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold tracking-wider flex-shrink-0',
              labelStyles[label]
            )}
          >
            {labelText[label]}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white tabular-nums">{value}</span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>

      {/* Trend */}
      {trend && (
        <p className="text-xs text-slate-500 leading-tight">{trend}</p>
      )}
    </div>
  )
}

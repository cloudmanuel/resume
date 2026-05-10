import { cn } from '../../lib/cn'

interface Dimension {
  name: string
  score: number
  description: string
  color: string
}

const dimensions: Dimension[] = [
  {
    name: 'Security',
    score: 88,
    description: 'IAM least-privilege, OIDC auth, secrets manager, no hard-coded credentials',
    color: 'bg-cyan-400',
  },
  {
    name: 'Observability',
    score: 75,
    description: 'CloudWatch metrics + structured logs; distributed tracing planned',
    color: 'bg-indigo-400',
  },
  {
    name: 'Automation',
    score: 92,
    description: '100% IaC, GitHub Actions CI/CD, automated test gates on every PR',
    color: 'bg-emerald-400',
  },
  {
    name: 'Reliability',
    score: 82,
    description: 'Multi-AZ, CloudFront CDN, Lambda retry policies, S3 versioning',
    color: 'bg-violet-400',
  },
  {
    name: 'Cost Control',
    score: 95,
    description: 'Serverless-first, no idle compute, Budget alerts, ~$2.50/mo',
    color: 'bg-amber-400',
  },
]

export default function PlatformScorecard() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-12">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
            Platform Maturity
          </p>
          <h2 className="text-lg font-bold text-white">Scorecard</h2>
        </div>
        <span className="badge-estimated text-xs px-2 py-0.5 rounded border font-semibold bg-slate-700 text-slate-300 border-white/10">
          Self-assessed
        </span>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-5">
        <p className="text-xs text-slate-500">
          Self-assessed maturity scores across five platform engineering dimensions.
          Scores reflect the state of this resume platform specifically, not professional experience
          in aggregate.
        </p>
        {dimensions.map((dim) => (
          <div key={dim.name}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-white">{dim.name}</span>
              <span className="text-sm font-bold text-slate-300 tabular-nums">{dim.score}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1.5">
              <div
                className={cn('h-full rounded-full transition-all duration-500', dim.color)}
                style={{ width: `${dim.score}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">{dim.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

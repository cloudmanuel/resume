import { CheckCircle2, XCircle, GitCommit } from 'lucide-react'
import { demoDeployments } from '../../data/demo'
import { formatRelativeTime } from '../../lib/formatters'
import { cn } from '../../lib/cn'

export default function DeploymentTimeline() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-12">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
            Deployment History
          </p>
          <h2 className="text-lg font-bold text-white">Recent Deploys</h2>
        </div>
        <span className="badge-demo">DEMO</span>
      </div>

      {/* Notice */}
      <div className="mb-4 px-4 py-3 bg-slate-900 border border-white/10 rounded-lg">
        <p className="text-xs text-slate-500">
          DEMO — These are synthetic deployment events used to demonstrate the timeline UI.
          Real deployment events will be populated once the GitHub Actions → DynamoDB pipeline
          is connected.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/5">
        {demoDeployments.map((deploy, idx) => (
          <div
            key={deploy.id}
            className={cn(
              'flex items-start gap-4 px-4 py-4',
              idx === 0 && 'rounded-t-xl',
              idx === demoDeployments.length - 1 && 'rounded-b-xl'
            )}
          >
            {/* Status icon */}
            <div className="flex-shrink-0 mt-0.5">
              {deploy.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : deploy.status === 'failed' ? (
                <XCircle className="w-4 h-4 text-rose-400" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold',
                    deploy.status === 'success'
                      ? 'bg-emerald-400/15 text-emerald-400'
                      : deploy.status === 'failed'
                      ? 'bg-rose-400/15 text-rose-400'
                      : 'bg-cyan-400/15 text-cyan-400'
                  )}
                >
                  {deploy.status}
                </span>
                <span className="flex items-center gap-1 text-xs font-mono text-slate-400">
                  <GitCommit className="w-3 h-3" />
                  {deploy.commit_hash}
                </span>
                <span className="text-xs text-slate-500">{deploy.branch}</span>
                <span className="text-xs text-slate-600 ml-auto">
                  {formatRelativeTime(deploy.deployed_at)} · {deploy.duration_s}s
                </span>
              </div>
              <p className="text-sm text-slate-300 truncate">{deploy.summary}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

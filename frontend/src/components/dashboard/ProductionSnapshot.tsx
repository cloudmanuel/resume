import { Activity, Clock, Zap, DollarSign, MapPin, Code2, GitBranch, Shield } from 'lucide-react'
import MetricCard from './MetricCard'
import { demoMetrics } from '../../data/demo'
import { formatRelativeTime, formatUptime, formatLatency } from '../../lib/formatters'

export default function ProductionSnapshot() {
  const m = demoMetrics

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-12">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
            Production Snapshot
          </p>
          <h2 className="text-lg font-bold text-white">Platform Status</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-400/10 border border-amber-400/30 rounded-lg text-xs font-semibold text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Demo Data
        </span>
      </div>

      {/* Demo notice */}
      <div className="mb-4 px-4 py-3 bg-amber-400/5 border border-amber-400/20 rounded-lg">
        <p className="text-xs text-amber-400/80">
          Metrics marked <strong>DEMO</strong> or <strong>EST</strong> are synthetic values used
          to illustrate the intended behavior. They will be replaced with real telemetry once the
          monitoring pipeline is connected.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Resume Platform"
          value="Operational"
          status="operational"
          label="live"
          icon={<Activity className="w-3.5 h-3.5" />}
          trend="All services healthy"
        />
        <MetricCard
          title="Uptime (30d)"
          value={formatUptime(m.uptime_30d)}
          status="operational"
          label="estimated"
          icon={<Shield className="w-3.5 h-3.5" />}
          trend="Target: ≥99.9%"
        />
        <MetricCard
          title="p95 Latency"
          value={formatLatency(m.p95_latency_ms)}
          status="operational"
          label="demo"
          icon={<Zap className="w-3.5 h-3.5" />}
          trend="CloudFront cached"
        />
        <MetricCard
          title="Last Deploy"
          value={formatRelativeTime(m.last_deploy_at)}
          label="demo"
          icon={<Clock className="w-3.5 h-3.5" />}
          trend="via GitHub Actions"
        />
        <MetricCard
          title="Monthly Cost"
          value={`$${m.monthly_cost_usd.toFixed(2)}`}
          label="estimated"
          icon={<DollarSign className="w-3.5 h-3.5" />}
          trend="CloudFront + Lambda + S3"
        />
        <MetricCard
          title="Primary Region"
          value={m.primary_region}
          label="live"
          icon={<MapPin className="w-3.5 h-3.5" />}
          trend="Multi-region CDN via CloudFront"
        />
        <MetricCard
          title="IaC Coverage"
          value={m.iac_coverage}
          label="live"
          icon={<Code2 className="w-3.5 h-3.5" />}
          trend="100% infrastructure as code"
        />
        <MetricCard
          title="Deployment Method"
          value="GitHub Actions"
          label="live"
          icon={<GitBranch className="w-3.5 h-3.5" />}
          trend="OIDC · no long-lived secrets"
        />
      </div>
    </div>
  )
}

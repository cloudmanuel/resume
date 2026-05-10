import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, XCircle, HelpCircle } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import MetricCard from '../components/dashboard/MetricCard'
import { fetchMetrics, fetchDeployments, fetchHealth } from '../lib/api'
import { demoUptimeData } from '../data/demo'
import { formatRelativeTime, formatUptime, formatLatency } from '../lib/formatters'
import { cn } from '../lib/cn'
import type { Metrics, Deployment, HealthCheck } from '../types'

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    async function load() {
      const [m, d, h] = await Promise.all([
        fetchMetrics(),
        fetchDeployments(),
        fetchHealth(),
      ])
      setMetrics(m)
      setDeployments(d)
      setHealthChecks(h)
      setIsDemo(m._demo === true)
      setLoading(false)
    }
    void load()
  }, [])

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-10">
      <div className="mb-6">
        <p className="section-label mb-1">Platform Status</p>
        <h1 className="page-title">Metrics &amp; Observability</h1>
        <p className="page-subtitle mt-2">
          Live telemetry from the resume platform infrastructure.
        </p>
      </div>

      {/* Demo banner */}
      {isDemo && !loading && (
        <div className="mb-6 flex items-start gap-3 px-4 py-3 bg-amber-400/10 border border-amber-400/25 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-400/90">
            <strong>Showing demo data</strong> — metrics API not yet connected. Values are
            synthetic and clearly labeled. Real telemetry will populate once the monitoring
            pipeline is wired up.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <div className="w-6 h-6 rounded-full border-2 border-slate-600 border-t-cyan-400 animate-spin mr-3" />
          Loading metrics...
        </div>
      ) : metrics ? (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
            <MetricCard
              title="Platform Status"
              value={metrics.status === 'operational' ? 'Operational' : metrics.status}
              status={metrics.status}
              label={isDemo ? 'demo' : 'live'}
              trend="All services healthy"
            />
            <MetricCard
              title="Uptime (30d)"
              value={formatUptime(metrics.uptime_30d)}
              status="operational"
              label={isDemo ? 'demo' : 'live'}
              trend="Target ≥99.9%"
            />
            <MetricCard
              title="p95 Latency"
              value={formatLatency(metrics.p95_latency_ms)}
              status="operational"
              label={isDemo ? 'demo' : 'live'}
              trend="API Gateway + Lambda"
            />
            <MetricCard
              title="Last Deploy"
              value={formatRelativeTime(metrics.last_deploy_at)}
              label={isDemo ? 'demo' : 'live'}
              trend="via GitHub Actions OIDC"
            />
            <MetricCard
              title="Monthly Cost"
              value={`$${metrics.monthly_cost_usd.toFixed(2)}`}
              label="estimated"
              trend="CloudFront + Lambda + S3"
            />
            <MetricCard
              title="Primary Region"
              value={metrics.primary_region}
              label="live"
              trend="Multi-region via CloudFront CDN"
            />
            <MetricCard
              title="IaC Coverage"
              value={metrics.iac_coverage}
              label="live"
              trend="100% infrastructure as code"
            />
            <MetricCard
              title="Deploy Method"
              value="GitHub Actions"
              label="live"
              trend="OIDC · zero long-lived credentials"
            />
          </div>

          {/* Uptime chart */}
          <div className="mb-8">
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-white">Uptime — Last 30 Days</h2>
                {isDemo && <span className="badge-demo">DEMO</span>}
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={demoUptimeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) => v.slice(5)}
                      interval={6}
                    />
                    <YAxis
                      domain={[95, 100]}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#f1f5f9',
                      }}
                      formatter={(v: number) => [`${v.toFixed(2)}%`, 'Uptime']}
                    />
                    <Area
                      type="monotone"
                      dataKey="uptime"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      fill="url(#uptimeGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Health checks */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-white">Health Checks</h2>
                {isDemo && <span className="badge-demo">DEMO</span>}
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/5">
                {healthChecks.map((hc) => (
                  <div key={hc.id} className="flex items-center gap-3 px-4 py-3">
                    {hc.status === 'passing' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : hc.status === 'failing' ? (
                      <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    )}
                    <span className="flex-1 text-sm text-slate-200">{hc.name}</span>
                    <span className="text-xs text-slate-500 font-mono">{hc.latency_ms}ms</span>
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        hc.status === 'passing' ? 'text-emerald-400' : 'text-rose-400'
                      )}
                    >
                      {hc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent deployments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-white">Recent Deployments</h2>
                {isDemo && <span className="badge-demo">DEMO</span>}
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/5">
                {deployments.slice(0, 5).map((dep) => (
                  <div key={dep.id} className="flex items-start gap-3 px-4 py-3">
                    <span
                      className={cn(
                        'flex-shrink-0 mt-0.5 w-2 h-2 rounded-full',
                        dep.status === 'success'
                          ? 'bg-emerald-400'
                          : dep.status === 'failed'
                          ? 'bg-rose-400'
                          : 'bg-cyan-400'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 truncate">{dep.summary}</p>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-xs text-slate-500 font-mono">{dep.commit_hash}</span>
                        <span className="text-xs text-slate-600">·</span>
                        <span className="text-xs text-slate-500">{formatRelativeTime(dep.deployed_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

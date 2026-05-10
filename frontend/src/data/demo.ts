import type { Metrics, Deployment, HealthCheck, UptimeDataPoint } from '../types'

export const demoMetrics: Metrics = {
  uptime_30d: 99.98,
  p95_latency_ms: 84,
  last_deploy_at: '2026-05-08T14:32:00Z',
  monthly_cost_usd: 2.41,
  primary_region: 'us-east-1',
  iac_coverage: 'Terraform',
  deployment_method: 'GitHub Actions OIDC',
  status: 'operational',
  _demo: true,
}

export const demoDeployments: Deployment[] = [
  {
    id: 'dep-001',
    commit_hash: 'a3f8c12',
    branch: 'main',
    summary: 'feat: add case studies page and service catalog detail cards',
    status: 'success',
    deployed_at: '2026-05-08T14:32:00Z',
    duration_s: 87,
    _demo: true,
  },
  {
    id: 'dep-002',
    commit_hash: 'b91e047',
    branch: 'main',
    summary: 'fix: contact form validation and API error handling',
    status: 'success',
    deployed_at: '2026-05-07T09:18:00Z',
    duration_s: 92,
    _demo: true,
  },
  {
    id: 'dep-003',
    commit_hash: 'c4d2a88',
    branch: 'main',
    summary: 'feat: metrics page with recharts uptime visualization',
    status: 'success',
    deployed_at: '2026-05-06T17:45:00Z',
    duration_s: 103,
    _demo: true,
  },
  {
    id: 'dep-004',
    commit_hash: 'e7f1b33',
    branch: 'main',
    summary: 'chore: update Lambda runtime to python3.12, bump deps',
    status: 'failed',
    deployed_at: '2026-05-05T11:22:00Z',
    duration_s: 41,
    _demo: true,
  },
  {
    id: 'dep-005',
    commit_hash: 'f0a9d61',
    branch: 'main',
    summary: 'feat: initial platform infrastructure and frontend scaffold',
    status: 'success',
    deployed_at: '2026-05-04T08:00:00Z',
    duration_s: 218,
    _demo: true,
  },
]

export const demoHealthChecks: HealthCheck[] = [
  {
    id: 'hc-001',
    name: 'CloudFront Distribution',
    status: 'passing',
    checked_at: '2026-05-09T00:00:00Z',
    latency_ms: 12,
    _demo: true,
  },
  {
    id: 'hc-002',
    name: 'API Gateway /health',
    status: 'passing',
    checked_at: '2026-05-09T00:00:00Z',
    latency_ms: 78,
    _demo: true,
  },
  {
    id: 'hc-003',
    name: 'Lambda Function (metrics)',
    status: 'passing',
    checked_at: '2026-05-09T00:00:00Z',
    latency_ms: 134,
    _demo: true,
  },
  {
    id: 'hc-004',
    name: 'DynamoDB Table',
    status: 'passing',
    checked_at: '2026-05-09T00:00:00Z',
    latency_ms: 6,
    _demo: true,
  },
  {
    id: 'hc-005',
    name: 'Contact Form API',
    status: 'passing',
    checked_at: '2026-05-09T00:00:00Z',
    latency_ms: 95,
    _demo: true,
  },
]

// 30 days of synthetic uptime data for recharts
export const demoUptimeData: UptimeDataPoint[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date('2026-05-09')
  date.setDate(date.getDate() - (29 - i))
  // Mostly 100%, with one dip around day 20
  const uptime = i === 20 ? 97.4 : i === 19 ? 98.1 : 100
  return {
    date: date.toISOString().slice(0, 10),
    uptime,
  }
})

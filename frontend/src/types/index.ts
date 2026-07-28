export interface Metrics {
  uptime_30d: number
  p95_latency_ms: number
  last_deploy_at: string  // empty string when no deployment recorded yet
  monthly_cost_usd: number
  primary_region: string
  iac_coverage: string
  deployment_method: string
  status: 'operational' | 'degraded' | 'unknown'
  _demo?: boolean
}

export interface Deployment {
  id: string
  commit_hash: string
  branch: string
  summary: string
  status: 'success' | 'failed' | 'in_progress'
  deployed_at: string
  duration_s: number
  _demo?: boolean
}

export interface HealthCheck {
  id: string
  name: string
  status: 'passing' | 'failing' | 'unknown'
  checked_at: string
  latency_ms: number
  _demo?: boolean
}

export interface ContactFormData {
  name: string
  email: string
  company: string
  role_type: string
  message: string
}

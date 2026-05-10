import { API_BASE_URL } from './constants'
import { demoMetrics, demoDeployments, demoHealthChecks } from '../data/demo'
import type { Metrics, Deployment, HealthCheck, ContactFormData } from '../types'

// ── Raw backend shapes (differ from frontend types) ──────────────────

interface RawMetrics {
  uptime_percentage: number
  uptime_is_estimated: boolean
  p95_latency_ms: number | null       // null when sample < 5 checks
  monthly_cost_usd: number | null     // null when Cost Explorer unavailable
  deployments_count: number
  last_deployment: {
    status: string
    summary: string
    commit_sha: string
    branch: string
    created_at: string
  } | null
  last_deployment_status: string | null
  checks_performed: number
  recent_checks?: Array<{
    status: string
    target: string
    latency_ms: number
    region: string
    timestamp: string
  }>
  data_source: string
  generated_at?: string
}

interface RawDeployment {
  id: string
  status: string
  summary: string
  commit_sha: string | null
  branch: string
  created_at: string
}

interface RawDeploymentsResponse {
  deployments: RawDeployment[]
  count: number
  data_source: string
  generated_at?: string
}

// ── Generic fetch ─────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

// ── Public API ────────────────────────────────────────────────────────

export async function fetchMetrics(): Promise<Metrics> {
  const raw = await apiFetch<RawMetrics>('/metrics')
  if (!raw) return demoMetrics

  return {
    uptime_30d:        raw.uptime_percentage,
    // Backend computes true p95 over last 100 checks; 0 means not enough data yet
    p95_latency_ms:    raw.p95_latency_ms ?? 0,
    // null when no deployment recorded yet — UI renders '—'
    last_deploy_at:    raw.last_deployment?.created_at ?? '',
    // Backend queries Cost Explorer for current month; 0 means not yet available
    monthly_cost_usd:  raw.monthly_cost_usd ?? 0,
    primary_region:    raw.recent_checks?.[0]?.region ?? 'us-east-1',
    iac_coverage:      'Terraform',
    deployment_method: 'GitHub Actions OIDC',
    status:            raw.data_source === 'live' ? 'operational' : 'unknown',
    _demo:             raw.data_source === 'estimated' && raw.checks_performed === 0,
  }
}

export async function fetchHealth(): Promise<HealthCheck[]> {
  // /health only returns { status: "ok" } — use recent_checks from /metrics instead.
  // The healthcheck Lambda writes one record per target per run (2 targets × N runs),
  // so deduplicate by target and keep only the most recent check for each endpoint.
  const raw = await apiFetch<RawMetrics>('/metrics')
  if (!raw || !raw.recent_checks?.length) return demoHealthChecks

  const seen = new Map<string, typeof raw.recent_checks[0]>()
  for (const c of raw.recent_checks) {
    if (!seen.has(c.target)) seen.set(c.target, c)
  }

  return Array.from(seen.values()).map((c, i) => ({
    id:         `hc-${i + 1}`,
    // Strip protocol for a cleaner display name; keep the path so /health is distinct from /
    name:       c.target.replace(/^https?:\/\//, ''),
    status:     c.status === 'success' ? 'passing' : 'failing',
    checked_at: c.timestamp,
    latency_ms: c.latency_ms,
  }))
}

export async function fetchDeployments(): Promise<Deployment[]> {
  const raw = await apiFetch<RawDeploymentsResponse>('/deployments')
  if (!raw || !raw.deployments?.length) return demoDeployments

  return raw.deployments.map(d => ({
    id:          d.id,
    commit_hash: d.commit_sha ?? 'unknown',
    branch:      d.branch,
    summary:     d.summary ?? '',
    status:      (d.status as Deployment['status']) ?? 'success',
    deployed_at: d.created_at,
    // Backend does not track build duration
    duration_s:  0,
  }))
}

export async function submitContact(data: ContactFormData): Promise<{ success: boolean; message: string }> {
  const result = await apiFetch<{ success: boolean; message: string }>('/contact', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!result) {
    return { success: false, message: 'API unavailable' }
  }
  return result
}

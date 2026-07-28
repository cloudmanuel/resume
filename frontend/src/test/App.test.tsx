import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import App from '../App'
import { GITHUB_URL, LINKEDIN_URL } from '../lib/constants'
import type { Metrics, Deployment, HealthCheck } from '../types'

vi.mock('../lib/api', () => ({
  fetchMetrics: vi.fn(),
  fetchHealth: vi.fn(),
  fetchDeployments: vi.fn(),
  submitContact: vi.fn(),
}))
import { fetchMetrics, fetchHealth, fetchDeployments } from '../lib/api'

const liveMetrics: Metrics = {
  uptime_30d: 100,
  p95_latency_ms: 84,
  last_deploy_at: new Date(Date.now() - 3600_000).toISOString(),
  monthly_cost_usd: 4.12,
  primary_region: 'us-east-1',
  iac_coverage: 'Terraform',
  deployment_method: 'GitHub Actions OIDC',
  status: 'operational',
}

const liveHealth: HealthCheck[] = [
  { id: 'hc-1', name: 'manuel-anda.com', status: 'passing', checked_at: new Date().toISOString(), latency_ms: 45 },
  { id: 'hc-2', name: 'manuel-anda.com/health', status: 'passing', checked_at: new Date().toISOString(), latency_ms: 480 },
]

const liveDeployments: Deployment[] = [
  { id: 'd-1', commit_hash: 'abc1234', branch: 'main', summary: 'feat: test deploy', status: 'success', deployed_at: new Date().toISOString(), duration_s: 0 },
]

function mockApi(metrics: Metrics = liveMetrics) {
  vi.mocked(fetchMetrics).mockResolvedValue(metrics)
  vi.mocked(fetchHealth).mockResolvedValue(liveHealth)
  vi.mocked(fetchDeployments).mockResolvedValue(liveDeployments)
}

describe('App', () => {
  beforeEach(() => {
    vi.mocked(fetchMetrics).mockReset()
    vi.mocked(fetchHealth).mockReset()
    vi.mocked(fetchDeployments).mockReset()
  })

  it('renders sections in the career-first order', async () => {
    mockApi()
    render(<App />)
    await screen.findByText('feat: test deploy')
    const ids = Array.from(document.querySelectorAll('section[id]')).map(s => s.id)
    expect(ids).toEqual([
      'home', 'snapshot', 'about', 'work', 'projects',
      'architecture', 'deploys', 'runbooks', 'contact',
    ])
  })

  it('shows live infra cost from Cost Explorer when available', async () => {
    mockApi()
    render(<App />)
    const stat = (await screen.findByText('Infra cost')).closest('.stat')!
    expect(within(stat as HTMLElement).getByText('$4.12')).toBeInTheDocument()
  })

  it('shows a dash for infra cost while Cost Explorer has no data', async () => {
    mockApi({ ...liveMetrics, monthly_cost_usd: 0 })
    render(<App />)
    const stat = (await screen.findByText('Infra cost')).closest('.stat')!
    expect(within(stat as HTMLElement).getByText('—')).toBeInTheDocument()
  })

  it('does not render fabricated telemetry or stale claims', async () => {
    mockApi()
    render(<App />)
    await screen.findByText('feat: test deploy')
    expect(screen.queryByText(/synced from \/docs\/about\.md/)).toBeNull()
    expect(screen.queryByText(/1 incident · 47 min/)).toBeNull()
    expect(screen.queryByText(/platform scorecard/)).toBeNull()
    expect(screen.queryByText(/\$2\.41/)).toBeNull()
    expect(screen.queryByText(/4y exp/)).toBeNull()
  })

  it('renders certifications inside the work section', async () => {
    mockApi()
    render(<App />)
    await screen.findByText('feat: test deploy')
    const work = document.getElementById('work')!
    expect(within(work as HTMLElement).getByText('AWS Solutions Architect — Professional')).toBeInTheDocument()
  })

  it('contact links display the same host and path they point to', async () => {
    mockApi()
    render(<App />)
    const githubText = GITHUB_URL.replace(/^https?:\/\/(www\.)?/, '')
    const linkedinText = LINKEDIN_URL.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
    expect((await screen.findByText(githubText)).closest('a')).toHaveAttribute('href', GITHUB_URL)
    expect(screen.getByText(linkedinText).closest('a')).toHaveAttribute('href', LINKEDIN_URL)
  })
})

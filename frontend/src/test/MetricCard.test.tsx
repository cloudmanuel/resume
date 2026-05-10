import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from '../App'

vi.mock('../lib/api', () => ({
  fetchMetrics: vi.fn().mockResolvedValue({
    uptime_30d: 99.98,
    p95_latency_ms: 84,
    last_deploy_at: '2026-05-08T14:32:00Z',
    monthly_cost_usd: 2.41,
    primary_region: 'us-east-1',
    iac_coverage: 'Terraform',
    deployment_method: 'GitHub Actions OIDC',
    status: 'operational',
    _demo: true,
  }),
  fetchHealth: vi.fn().mockResolvedValue([
    { id: 'hc-1', name: 'CloudFront Distribution', status: 'passing', checked_at: '2026-05-09T00:00:00Z', latency_ms: 12 },
    { id: 'hc-2', name: 'API Gateway /health',     status: 'passing', checked_at: '2026-05-09T00:00:00Z', latency_ms: 78 },
  ]),
  fetchDeployments: vi.fn().mockResolvedValue([
    { id: 'dep-1', commit_hash: 'abc1234', branch: 'main', summary: 'feat: new feature', status: 'success', deployed_at: '2026-05-08T14:32:00Z', duration_s: 87 },
  ]),
  submitContact: vi.fn(),
}))

describe('Production snapshot', () => {
  it('renders uptime from API metrics', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getAllByText('99.98').length).toBeGreaterThan(0)
    })
  })

  it('renders health check names', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('CloudFront Distribution')).toBeTruthy()
    })
  })

  it('renders deployment commit hash', async () => {
    render(<App />)
    await waitFor(() => {
      expect(screen.getByText('abc1234')).toBeTruthy()
    })
  })

  it('renders section headings', () => {
    render(<App />)
    expect(screen.getByText('production snapshot', { exact: false })).toBeTruthy()
    expect(screen.getByText('platform scorecard', { exact: false })).toBeTruthy()
    expect(screen.getAllByText('runbooks', { exact: false }).length).toBeGreaterThan(0)
  })
})

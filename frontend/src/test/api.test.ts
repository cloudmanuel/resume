import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchMetrics, fetchHealth, fetchDeployments, submitContact } from '../lib/api'
import { demoMetrics, demoDeployments, demoHealthChecks } from '../data/demo'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('API client', () => {
  beforeEach(() => { mockFetch.mockReset() })

  it('fetchMetrics falls back to demo data on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    const result = await fetchMetrics()
    expect(result).toEqual(demoMetrics)
    expect(result._demo).toBe(true)
  })

  it('fetchHealth falls back to demo data on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false } as Response)
    const result = await fetchHealth()
    expect(result).toEqual(demoHealthChecks)
  })

  it('fetchDeployments falls back to demo data on error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('timeout'))
    const result = await fetchDeployments()
    expect(result).toEqual(demoDeployments)
  })

  it('fetchMetrics returns real data on success', async () => {
    // Mock uses backend field names (uptime_percentage, not uptime_30d)
    const mockRaw = {
      uptime_percentage: 100,
      uptime_is_estimated: false,
      deployments_count: 1,
      last_deployment: { status: 'success', summary: 'feat: test', commit_sha: 'abc1234', branch: 'main', created_at: '2026-05-09T00:00:00Z' },
      last_deployment_status: 'success',
      checks_performed: 2,
      recent_checks: [
        { status: 'success', target: 'https://manuel-anda.com', latency_ms: 50, region: 'us-east-1', timestamp: '2026-05-09T00:00:00Z' },
      ],
      data_source: 'live',
      generated_at: '2026-05-09T00:00:00Z',
    }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockRaw } as Response)
    const result = await fetchMetrics()
    expect(result.uptime_30d).toBe(100)
    expect(result.status).toBe('operational')
    expect(result._demo).toBeFalsy()
  })

  it('submitContact posts to /contact endpoint', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, message: 'Sent' }) } as Response)
    const result = await submitContact({ name: 'Test', email: 't@t.com', company: '', role_type: '', message: 'Hello world message' })
    expect(result.success).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/contact'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})

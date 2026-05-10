import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'

// Mock the API module
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
  fetchHealth: vi.fn().mockResolvedValue([]),
  fetchDeployments: vi.fn().mockResolvedValue([]),
  submitContact: vi.fn().mockResolvedValue({ success: true, message: 'Sent' }),
}))

describe('Contact form', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the contact section', () => {
    render(<App />)
    expect(screen.getByText(/get in touch/i)).toBeTruthy()
  })

  it('shows validation errors on empty submit', async () => {
    render(<App />)
    const submitBtn = screen.getByRole('button', { name: /send message/i })
    fireEvent.click(submitBtn)
    await waitFor(() => {
      expect(screen.getAllByText(/required/i).length).toBeGreaterThan(0)
    })
  })

  it('shows message length validation error', async () => {
    render(<App />)
    const msgTextarea = screen.getByPlaceholderText(/what are you building/i)
    fireEvent.change(msgTextarea, { target: { value: 'short' } })
    const submitBtn = screen.getByRole('button', { name: /send message/i })
    fireEvent.click(submitBtn)
    await waitFor(() => {
      expect(screen.getByText(/message must be at least/i)).toBeTruthy()
    })
  })

  it('calls submitContact on valid form', async () => {
    const { submitContact } = await import('../lib/api')
    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Jane Doe' } })
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'jane@example.com' } })
    fireEvent.change(screen.getByPlaceholderText(/what are you building/i), { target: { value: 'A very interesting platform engineering role' } })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    await waitFor(() => {
      expect(submitContact).toHaveBeenCalledOnce()
    })
  })

  it('shows success message after submission', async () => {
    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Jane Doe' } })
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'jane@example.com' } })
    fireEvent.change(screen.getByPlaceholderText(/what are you building/i), { target: { value: 'A very interesting platform engineering role' } })
    fireEvent.click(screen.getByRole('button', { name: /send message/i }))
    await waitFor(() => {
      expect(screen.getByText(/message sent/i)).toBeTruthy()
    })
  })
})

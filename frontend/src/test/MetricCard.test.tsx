import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MetricCard from '../components/dashboard/MetricCard'

describe('MetricCard', () => {
  it('renders title and value', () => {
    render(<MetricCard title="Uptime" value="99.98%" />)
    expect(screen.getByText('Uptime')).toBeInTheDocument()
    expect(screen.getByText('99.98%')).toBeInTheDocument()
  })

  it('renders unit alongside value', () => {
    render(<MetricCard title="Latency" value={84} unit="ms" />)
    expect(screen.getByText('84')).toBeInTheDocument()
    expect(screen.getByText('ms')).toBeInTheDocument()
  })

  it('shows DEMO badge when label is demo', () => {
    render(<MetricCard title="Cost" value="$2.41" label="demo" />)
    expect(screen.getByText('DEMO')).toBeInTheDocument()
  })

  it('shows LIVE badge when label is live', () => {
    render(<MetricCard title="Region" value="us-east-1" label="live" />)
    expect(screen.getByText('LIVE')).toBeInTheDocument()
  })

  it('shows EST badge when label is estimated', () => {
    render(<MetricCard title="Uptime" value="99.98%" label="estimated" />)
    expect(screen.getByText('EST')).toBeInTheDocument()
  })

  it('renders trend text when provided', () => {
    render(<MetricCard title="Uptime" value="99.98%" trend="Target: ≥99.9%" />)
    expect(screen.getByText('Target: ≥99.9%')).toBeInTheDocument()
  })

  it('does not render trend when not provided', () => {
    const { container } = render(<MetricCard title="Uptime" value="99.98%" />)
    // No trend paragraph should be present
    expect(container.querySelector('p')).not.toBeInTheDocument()
  })
})

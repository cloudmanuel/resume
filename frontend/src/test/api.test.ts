import { describe, it, expect } from 'vitest'
import { formatRelativeTime, formatDate, formatUptime, formatLatency } from '../lib/formatters'

describe('formatRelativeTime', () => {
  it('returns a string', () => {
    const result = formatRelativeTime(new Date().toISOString())
    expect(typeof result).toBe('string')
  })

  it('returns "just now" for current time', () => {
    const result = formatRelativeTime(new Date().toISOString())
    expect(result).toBe('just now')
  })

  it('returns minutes ago format', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(formatRelativeTime(date)).toBe('5m ago')
  })

  it('returns hours ago format', () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(date)).toBe('3h ago')
  })

  it('returns days ago format', () => {
    const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(date)).toBe('2d ago')
  })

  it('returns formatted date for old timestamps', () => {
    const result = formatRelativeTime('2025-01-01T00:00:00Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('formatDate', () => {
  it('returns a string', () => {
    const result = formatDate('2026-05-09T00:00:00Z')
    expect(typeof result).toBe('string')
  })

  it('returns a non-empty string', () => {
    const result = formatDate('2026-05-09T00:00:00Z')
    expect(result.length).toBeGreaterThan(0)
  })

  it('includes the year', () => {
    const result = formatDate('2026-05-09T00:00:00Z')
    expect(result).toContain('2026')
  })
})

describe('formatUptime', () => {
  it('returns a percentage string', () => {
    expect(formatUptime(99.98)).toBe('99.98%')
  })

  it('returns 100.00% for 100', () => {
    expect(formatUptime(100)).toBe('100.00%')
  })

  it('returns a string', () => {
    expect(typeof formatUptime(95.5)).toBe('string')
  })
})

describe('formatLatency', () => {
  it('returns ms format for sub-second values', () => {
    expect(formatLatency(84)).toBe('84ms')
  })

  it('returns seconds format for values >= 1000ms', () => {
    expect(formatLatency(1500)).toBe('1.50s')
  })

  it('rounds ms values', () => {
    expect(formatLatency(84.7)).toBe('85ms')
  })

  it('returns a string', () => {
    expect(typeof formatLatency(200)).toBe('string')
  })
})

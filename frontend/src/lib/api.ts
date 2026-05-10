import { API_BASE_URL } from './constants'
import { demoMetrics, demoDeployments, demoHealthChecks } from '../data/demo'
import type { Metrics, Deployment, HealthCheck, ContactFormData } from '../types'

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

export async function fetchMetrics(): Promise<Metrics> {
  const data = await apiFetch<Metrics>('/metrics')
  if (!data) return demoMetrics
  return data
}

export async function fetchHealth(): Promise<HealthCheck[]> {
  const data = await apiFetch<HealthCheck[]>('/health')
  if (!data) return demoHealthChecks
  return data
}

export async function fetchDeployments(): Promise<Deployment[]> {
  const data = await apiFetch<Deployment[]>('/deployments')
  if (!data) return demoDeployments
  return data
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

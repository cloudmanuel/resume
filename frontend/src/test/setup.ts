import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom does not implement IntersectionObserver — mock it so Reveal components work
const mockIO = {
  observe: () => {},
  unobserve: () => {},
  disconnect: () => {},
}
;(globalThis as unknown as Record<string, unknown>).IntersectionObserver = vi.fn(() => mockIO)

// jsdom does not implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

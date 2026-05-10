export const SITE_NAME = 'Platform Resume Control Plane'
export const TAGLINE = 'A resume operated like production infrastructure.'
export const CANDIDATE_NAME = 'Manuel Anda'
export const CANDIDATE_TITLE = 'Platform / Cloud Engineer'
export const CANDIDATE_EMAIL = 'cloudingmanuel@gmail.com'
export const GITHUB_URL = 'https://github.com/manuelanda'
export const LINKEDIN_URL = 'https://linkedin.com/in/manuelanda'
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.manuel-anda.com'
export const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'https://manuel-anda.com'
export const PDF_URL = '/manuel-anda-resume.pdf'

export const NAV_LINKS = [
  { label: 'Overview', href: '/' },
  { label: 'Service Catalog', href: '/service-catalog' },
  { label: 'Case Studies', href: '/case-studies' },
  { label: 'Architecture', href: '/architecture' },
  { label: 'Metrics', href: '/metrics' },
  { label: 'Runbooks', href: '/runbooks' },
  { label: 'Resume', href: '/resume' },
  { label: 'Contact', href: '/contact' },
] as const

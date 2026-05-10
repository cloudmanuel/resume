import { useState } from 'react'
import { Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { submitContact } from '../../lib/api'
import { CANDIDATE_EMAIL } from '../../lib/constants'
import { cn } from '../../lib/cn'
import type { ContactFormData } from '../../types'

interface FormState {
  name: string
  email: string
  company: string
  role_type: string
  message: string
}

interface FormErrors {
  name?: string
  email?: string
  message?: string
}

const ROLE_OPTIONS = [
  'Staff / Principal Platform Engineer',
  'Cloud Architect',
  'SRE Lead / Principal SRE',
  'DevOps / Infrastructure Lead',
  'Consulting / Contract',
  'Other',
]

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!form.name.trim()) errors.name = 'Name is required'
  if (!form.email.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Please enter a valid email'
  }
  if (!form.message.trim()) errors.message = 'Message is required'
  if (form.message.trim().length < 10) errors.message = 'Message must be at least 10 characters'
  return errors
}

const inputClass =
  'w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-colors'

export default function ContactForm() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    company: '',
    role_type: '',
    message: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    // Clear error on change
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setStatus('loading')
    const payload: ContactFormData = {
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim(),
      role_type: form.role_type || 'Not specified',
      message: form.message.trim(),
    }

    const result = await submitContact(payload)
    if (result.success) {
      setStatus('success')
    } else {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        <h3 className="text-lg font-bold text-white">Message sent</h3>
        <p className="text-slate-400 text-sm max-w-sm">
          Thanks for reaching out. I typically respond within 24 hours.
        </p>
        <button
          onClick={() => {
            setForm({ name: '', email: '', company: '', role_type: '', message: '' })
            setStatus('idle')
          }}
          className="btn-ghost text-sm"
        >
          Send another message
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1.5" htmlFor="name">
          Name <span className="text-rose-400">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          placeholder="Jane Smith"
          className={cn(inputClass, errors.name && 'border-rose-400/50 focus:ring-rose-400/50')}
          autoComplete="name"
        />
        {errors.name && <p className="mt-1 text-xs text-rose-400">{errors.name}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1.5" htmlFor="email">
          Email <span className="text-rose-400">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="jane@company.com"
          className={cn(inputClass, errors.email && 'border-rose-400/50 focus:ring-rose-400/50')}
          autoComplete="email"
        />
        {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email}</p>}
      </div>

      {/* Company */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1.5" htmlFor="company">
          Company
        </label>
        <input
          id="company"
          name="company"
          type="text"
          value={form.company}
          onChange={handleChange}
          placeholder="Acme Corp"
          className={inputClass}
          autoComplete="organization"
        />
      </div>

      {/* Role / Opportunity Type */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1.5" htmlFor="role_type">
          Role / Opportunity Type
        </label>
        <select
          id="role_type"
          name="role_type"
          value={form.role_type}
          onChange={handleChange}
          className={cn(inputClass, 'cursor-pointer')}
        >
          <option value="">Select a role type...</option>
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-1.5" htmlFor="message">
          Message <span className="text-rose-400">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          value={form.message}
          onChange={handleChange}
          placeholder="Tell me about the role or what you're working on..."
          rows={5}
          className={cn(
            inputClass,
            'resize-y min-h-[120px]',
            errors.message && 'border-rose-400/50 focus:ring-rose-400/50'
          )}
        />
        {errors.message && <p className="mt-1 text-xs text-rose-400">{errors.message}</p>}
      </div>

      {/* Error message */}
      {status === 'error' && (
        <div className="flex items-start gap-3 p-3 bg-rose-400/10 border border-rose-400/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-400">
            Something went wrong — try emailing directly at{' '}
            <a
              href={`mailto:${CANDIDATE_EMAIL}`}
              className="underline hover:text-rose-300"
            >
              {CANDIDATE_EMAIL}
            </a>
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-lg transition-colors"
      >
        {status === 'loading' ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-slate-950/30 border-t-slate-950 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Send Message
          </>
        )}
      </button>
    </form>
  )
}

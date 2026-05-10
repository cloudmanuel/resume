import { Mail, Clock, Briefcase } from 'lucide-react'
import ContactForm from '../components/contact/ContactForm'
import { CANDIDATE_EMAIL } from '../lib/constants'

const openRoles = [
  'Staff / Principal Platform Engineer',
  'Cloud Architect',
  'SRE Lead / Principal SRE',
  'DevOps / Infrastructure Lead',
]

export default function ContactPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-10">
      <div className="mb-8">
        <p className="section-label mb-1">Contact</p>
        <h1 className="page-title">Get in Touch</h1>
        <p className="page-subtitle mt-2 max-w-xl">
          Interested in working together? Fill out the form or email me directly.
          I'm selective about what I take on, but I respond to every message.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Form — takes 2/3 */}
        <div className="lg:col-span-2">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <ContactForm />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Currently open to */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Currently Open To</h3>
            </div>
            <ul className="space-y-2">
              {openRoles.map((role) => (
                <li key={role} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
                  {role}
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 mt-4">
              Open to full-time, contract, and fractional arrangements. Remote-first preferred.
            </p>
          </div>

          {/* Response time */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Response Time</h3>
            </div>
            <p className="text-sm text-slate-300">
              Usually within <strong className="text-white">24 hours</strong> on business days.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              If your message is time-sensitive, include that context.
            </p>
          </div>

          {/* Direct email */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-bold text-white">Direct Email</h3>
            </div>
            <a
              href={`mailto:${CANDIDATE_EMAIL}`}
              className="text-sm text-cyan-400 hover:text-cyan-300 break-all transition-colors"
            >
              {CANDIDATE_EMAIL}
            </a>
            <p className="text-xs text-slate-500 mt-2">
              Prefer email? Skip the form entirely.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

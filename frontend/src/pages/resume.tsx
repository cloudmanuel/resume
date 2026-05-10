import { Download, Mail, Github, Linkedin } from 'lucide-react'
import { CANDIDATE_EMAIL, GITHUB_URL, LINKEDIN_URL, PDF_URL } from '../lib/constants'

interface ExperienceItem {
  role: string
  company: string
  period: string
  location: string
  bullets: string[]
}

const experience: ExperienceItem[] = [
]

interface SkillGroup {
  label: string
  items: string[]
}

const skills: SkillGroup[] = [
  {
    label: 'Cloud & Infrastructure',
    items: ['AWS (Solutions Architect Pro)', 'Multi-account AWS Organizations', 'EC2, ECS Fargate, Lambda, EKS', 'RDS Aurora, DynamoDB, S3, CloudFront'],
  },
  {
    label: 'IaC & Automation',
    items: ['Terraform (Associate Certified)', 'GitHub Actions, Jenkins', 'AWS CDK', 'Ansible, CloudFormation'],
  },
  {
    label: 'Observability',
    items: ['Datadog, OpenTelemetry', 'CloudWatch, PagerDuty', 'Distributed tracing, SLO design', 'Temporal workflows'],
  },
  {
    label: 'Languages',
    items: ['Python (primary)', 'Bash'],
  },
  {
    label: 'Security & Compliance',
    items: ['IAM least-privilege, OIDC', 'GuardDuty, Security Hub', 'SOC 2 Type II readiness', 'Secrets Manager, KMS'],
  },
  {
    label: 'Containers & Orchestration',
    items: ['Docker, ECR', 'ECS Fargate, EKS', 'Helm, Kubernetes', 'Coder, Devcontainers'],
  },
]

const projects = [
  {
    name: 'Internal Developer Platform (Coder)',
    description:
      'Self-service cloud development environments on AWS EC2 with Okta SSO, Terraform-managed workspace templates, and devcontainer images built in CI. Reduced onboarding from 3–5 days to 2 hours.',
    stack: 'AWS · Terraform · Coder · Okta · EC2 · GitHub Actions',
  },
  {
    name: 'ClipHarvest — Serverless SaaS',
    description:
      'Fully serverless SaaS backend for a Twitch clip processing tool. FastAPI on Lambda via Mangum, DynamoDB single-table design, S3 + CloudFront for media delivery, Stripe billing. ~$3/month at 80 MAU.',
    stack: 'FastAPI · Lambda · DynamoDB · S3 · CloudFront · Stripe · Terraform',
  },
  {
    name: 'Platform Resume Control Plane (This Site)',
    description:
      'Personal portfolio designed as a production cloud system: React + Vite frontend on CloudFront + S3, Python Lambda API, DynamoDB, Terraform IaC, GitHub Actions OIDC deploy pipeline.',
    stack: 'AWS · React · TypeScript · Python · Terraform · GitHub Actions',
  },
]

const certifications = [
  'AWS Certified Solutions Architect – Professional',
  'AWS Certified DevOps Engineer – Professional',
  'HashiCorp Certified: Terraform Associate (003)',
]

export default function ResumePage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto py-10">
      {/* Download CTA */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="section-label mb-1">Resume</p>
          <h1 className="page-title">Manuel Anda</h1>
        </div>
        <a
          href={PDF_URL}
          download
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          Download Resume PDF
        </a>
      </div>

      {/* Resume content */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-8 space-y-8">
        {/* Header */}
        <div className="border-b border-white/10 pb-6">
          <h2 className="text-2xl font-bold text-white">Manuel Anda</h2>
          <p className="text-lg text-cyan-400 font-medium mt-0.5">Platform / Cloud Engineer</p>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-400">
            <a
              href={`mailto:${CANDIDATE_EMAIL}`}
              className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              {CANDIDATE_EMAIL}
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              github.com/manuelanda
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors"
            >
              <Linkedin className="w-3.5 h-3.5" />
              linkedin.com/in/manuelanda
            </a>
          </div>
        </div>

        {/* Executive summary */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Summary
          </h3>
          <p className="text-slate-300 leading-relaxed text-sm">
            Platform / Cloud Engineer with 4+ years of experience designing, building, and
            operating cloud infrastructure on AWS. Specialize in developer experience platforms
            (Coder, IDP tooling), observability pipelines (OpenTelemetry, Datadog), and
            production-grade serverless architectures. Strong infrastructure-as-code discipline
            (Terraform), CI/CD automation, and security-first approach. AWS Certified Solutions
            Architect – Professional and DevOps Engineer – Professional.
          </p>
        </div>

        {/* Skills */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Core Skills
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold text-slate-400 mb-1.5">{group.label}</p>
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item} className="text-xs text-slate-400 flex items-start gap-1.5">
                      <span className="text-cyan-400 mt-0.5">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Experience */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
            Experience
          </h3>
          <div className="space-y-7">
            {experience.map((job) => (
              <div key={job.company}>
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-white">{job.role}</h4>
                    <p className="text-sm text-cyan-400">{job.company}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{job.period}</p>
                    <p className="text-xs text-slate-500">{job.location}</p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {job.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                      <span className="text-slate-600 mt-0.5 flex-shrink-0">–</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Projects */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
            Projects
          </h3>
          <div className="space-y-4">
            {projects.map((proj) => (
              <div key={proj.name}>
                <h4 className="text-sm font-bold text-white">{proj.name}</h4>
                <p className="text-xs text-slate-300 leading-relaxed mt-0.5 mb-1">
                  {proj.description}
                </p>
                <p className="text-xs text-cyan-400/70">{proj.stack}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Education */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Education
          </h3>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-white">
                B.S., Computer Science
              </h4>
              <p className="text-sm text-slate-400">University of Texas at Austin</p>
            </div>
            <p className="text-xs text-slate-500">May 2019</p>
          </div>
        </div>

        {/* Certifications */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Certifications
          </h3>
          <ul className="space-y-1.5">
            {certifications.map((cert) => (
              <li key={cert} className="flex items-center gap-2 text-sm text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                {cert}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ATS note */}
      <div className="mt-6 px-4 py-3 bg-slate-900 border border-white/10 rounded-lg">
        <p className="text-xs text-slate-500">
          This page is ATS-friendly — all content is structured HTML text, not a PDF image.
          Plain text version available on request. Last updated: May 2026.
        </p>
      </div>
    </div>
  )
}

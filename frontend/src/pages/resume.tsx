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
  {
    role: 'Senior Platform Engineer',
    company: 'Meridian Health Technologies',
    period: 'Jan 2023 – Present',
    location: 'Remote (Austin, TX)',
    bullets: [
      'Designed and deployed a self-service Internal Developer Platform on AWS using Coder, cutting developer onboarding time from 3–5 days to under 2 hours for a 40-person engineering organization.',
      'Built a centralized OpenTelemetry observability pipeline on ECS Fargate routing traces, metrics, and logs from 40+ microservices to Datadog, reducing MTTR from 90+ minutes to under 15 minutes.',
      'Migrated all infrastructure to Terraform with modular, reusable patterns; established IaC standards adopted across 5 product teams. Enforced via automated plan/apply in GitHub Actions with Atlantis.',
      'Led AWS security hardening initiative: implemented IAM least-privilege policies, moved all CI/CD to OIDC (no stored access keys), enabled GuardDuty and Security Hub, achieved SOC 2 Type II readiness.',
      'Reduced AWS monthly spend by 34% through Reserved Instance purchases, rightsizing, Spot adoption for non-critical workloads, and elimination of idle NAT Gateways.',
      'Mentored 3 junior engineers on platform engineering principles, IaC patterns, and AWS fundamentals. Ran biweekly platform guild meetings to share knowledge across the org.',
    ],
  },
  {
    role: 'Cloud Infrastructure Engineer',
    company: 'Cascade Systems Group',
    period: 'Jun 2021 – Dec 2022',
    location: 'Hybrid (Seattle, WA)',
    bullets: [
      'Architected and delivered a Temporal workflow automation platform on ECS Fargate, replacing 15+ brittle Lambda-chain scripts with durable, observable, and retryable workflows.',
      'Built a serverless data ingestion pipeline processing 8M+ events/day: Kinesis Data Streams → Lambda → S3 → Athena, with automated Glue catalog updates. Reduced data latency from 6 hours to under 5 minutes.',
      'Managed multi-account AWS organization (6 accounts) with AWS Organizations, SCPs, and Control Tower. Enforced security baselines and cost allocation tags via automated account vending.',
      'Designed and operated RDS Aurora PostgreSQL clusters with read replicas, automated backups, and point-in-time restore tested quarterly. Achieved 99.95% database uptime.',
      'Implemented container security scanning with Trivy in CI, blocking deployments on critical CVEs. Reduced critical vulnerability backlog from 80+ to 0 within 90 days.',
      'Wrote and maintained 60+ Terraform modules for reuse across teams; reduced time to provision new AWS environments from 3 weeks to 2 days.',
    ],
  },
  {
    role: 'DevOps Engineer',
    company: 'Polaris Digital Solutions',
    period: 'Aug 2019 – May 2021',
    location: 'On-site (Denver, CO)',
    bullets: [
      'Built and maintained CI/CD pipelines for 12 applications using Jenkins and then GitHub Actions, reducing deployment frequency from weekly to daily with automated rollback on failure.',
      'Migrated 8 monolithic applications from EC2 to ECS (Fargate), reducing infrastructure operational overhead and enabling per-service scaling. Eliminated ~$4,000/month in idle compute.',
      'Implemented centralized secrets management using AWS Secrets Manager with automatic rotation for RDS credentials, eliminating hardcoded secrets from all codebases.',
      'Set up monitoring and alerting with CloudWatch and PagerDuty: defined SLIs/SLOs for critical services, built dashboards for engineering and operations teams.',
      'Supported Kubernetes (EKS) adoption: stood up first EKS cluster, wrote Helm charts for 4 applications, documented deployment patterns adopted by the rest of the team.',
      'On-call rotation (1 week in 4), maintained runbooks for 20+ operational scenarios, reduced alert noise by 60% through better alarm thresholds and alert grouping.',
    ],
  },
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
    items: ['Python (primary)', 'TypeScript / React', 'Bash', 'Go (working knowledge)'],
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
            Platform / Cloud Engineer with 7+ years of experience designing, building, and
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

import { Link } from 'react-router-dom'
import { ArrowRight, Download, Layers } from 'lucide-react'
import HeroSection from '../components/dashboard/HeroSection'
import ProductionSnapshot from '../components/dashboard/ProductionSnapshot'
import PlatformScorecard from '../components/dashboard/PlatformScorecard'
import DeploymentTimeline from '../components/dashboard/DeploymentTimeline'
import ServiceCard from '../components/service-catalog/ServiceCard'
import { PDF_URL } from '../lib/constants'

const previewServices = [
  {
    name: 'Internal Developer Platform',
    type: 'platform' as const,
    status: 'operational' as const,
    stack: ['AWS', 'Terraform', 'Coder', 'Okta', 'EC2', 'Devcontainers'],
    problem:
      'Engineering teams wasted hours on local environment setup. Onboarding new developers took 3–5 days.',
    built:
      'Self-service Coder workspace platform on EC2 with Okta SSO, pre-baked devcontainer images, and Terraform-managed infrastructure.',
    caseStudyId: 'coder-idp',
  },
  {
    name: 'Observability Pipeline',
    type: 'observability' as const,
    status: 'operational' as const,
    stack: ['Datadog', 'OpenTelemetry', 'ECS', 'ALB', 'CloudWatch'],
    problem:
      'No centralized visibility across 40+ microservices. Incidents took hours to triage because logs and metrics lived in different silos.',
    built:
      'Centralized OTel collector on ECS Fargate routing traces, metrics, and logs to Datadog with unified dashboards and PagerDuty alerts.',
    caseStudyId: 'observability-pipeline',
  },
  {
    name: 'Serverless SaaS Backend',
    type: 'backend' as const,
    status: 'operational' as const,
    stack: ['FastAPI', 'Lambda', 'DynamoDB', 'S3', 'CloudFront', 'Stripe'],
    problem:
      'Needed a scalable, low-cost backend for a SaaS product without managing any servers.',
    built:
      'Fully serverless FastAPI backend on Lambda with DynamoDB, S3 + CloudFront for media delivery, and Stripe for billing.',
    caseStudyId: 'clipharvest',
  },
]

export default function DashboardPage() {
  return (
    <div>
      <HeroSection />
      <ProductionSnapshot />

      {/* About section */}
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-12">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
            About
          </p>
          <p className="text-slate-300 leading-relaxed mb-3">
            I'm a Platform / Cloud Engineer with 7+ years building the infrastructure and tooling
            that product teams depend on. My focus is on developer experience, reliability, and
            security — the kind of work that makes the rest of engineering faster.
          </p>
          <p className="text-slate-300 leading-relaxed mb-3">
            I've built internal developer platforms on top of Coder and AWS, centralized
            observability pipelines using OpenTelemetry and Datadog, workflow automation platforms
            with Temporal, and production serverless backends from scratch. I write Terraform for
            everything, automate deployments through GitHub Actions, and treat infrastructure
            the same way product teams treat software.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed">
            This site is a live example of that mindset — not a static HTML page, but a real
            cloud system with CI/CD, observability, and IaC. The source is on GitHub.
          </p>
        </div>
      </div>

      {/* Service catalog preview */}
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
              Service Catalog
            </p>
            <h2 className="text-lg font-bold text-white">What I've Built</h2>
          </div>
          <Link
            to="/service-catalog"
            className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {previewServices.map((svc) => (
            <ServiceCard key={svc.name} {...svc} />
          ))}
        </div>
      </div>

      <PlatformScorecard />
      <DeploymentTimeline />

      {/* Architecture preview */}
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-12">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <h2 className="text-base font-bold text-white">Platform Architecture</h2>
            </div>
            <Link
              to="/architecture"
              className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 font-medium"
            >
              Full diagram
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Static frontend on S3 + CloudFront with private origin access. REST API via
            API Gateway → Lambda → DynamoDB. All provisioned with Terraform, deployed via
            GitHub Actions OIDC. No long-lived AWS credentials anywhere in the pipeline.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
            {[
              'Route 53', 'CloudFront', 'ACM', 'S3', 'API Gateway',
              'Lambda', 'DynamoDB', 'CloudWatch', 'IAM', 'GitHub Actions',
            ].map((svc) => (
              <span key={svc} className="px-2 py-0.5 bg-slate-800 border border-white/10 rounded">
                {svc}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Recruiter CTA */}
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
        <div className="bg-gradient-to-r from-cyan-400/10 to-indigo-400/10 border border-cyan-400/20 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Ready to connect?</h2>
          <p className="text-slate-400 mb-6 max-w-lg mx-auto">
            I'm open to Staff / Principal Platform Engineer, Cloud Architect, and SRE Lead roles.
            Reach out directly or grab the PDF.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/contact" className="btn-primary">
              Get in Touch
            </Link>
            <a href={PDF_URL} download className="btn-outline">
              <Download className="w-4 h-4" />
              Download Resume PDF
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

import { ExternalLink } from 'lucide-react'
import ArchitectureDiagram from '../components/architecture/ArchitectureDiagram'
import FlowCard from '../components/architecture/FlowCard'
import { GITHUB_URL } from '../lib/constants'

const awsServices = [
  { service: 'Route 53', purpose: 'DNS for manuel-anda.com, health checks' },
  { service: 'ACM', purpose: 'TLS certificate for CloudFront distribution' },
  { service: 'CloudFront', purpose: 'CDN, HTTPS termination, private S3 origin via OAC' },
  { service: 'S3', purpose: 'Static site assets — private bucket, no public access' },
  { service: 'API Gateway (HTTP API)', purpose: 'REST API front-door — /metrics, /health, /contact, /deployments' },
  { service: 'Lambda', purpose: 'Python FastAPI backend via Mangum ASGI adapter' },
  { service: 'DynamoDB', purpose: 'Deployment events, contact form submissions, health check results' },
  { service: 'SES', purpose: 'Email delivery for contact form notifications' },
  { service: 'CloudWatch', purpose: 'Lambda metrics, API Gateway metrics, custom alarms, Budget alerts' },
  { service: 'IAM', purpose: 'OIDC trust policy for GitHub Actions, Lambda execution role (least-privilege)' },
  { service: 'SSM Parameter Store', purpose: 'Non-sensitive config values, API URLs' },
  { service: 'Secrets Manager', purpose: 'SES credentials, Stripe key if applicable' },
]

const deployFlow = [
  { step: 1, label: 'Push to main branch', detail: 'git push triggers GitHub Actions workflow' },
  { step: 2, label: 'CI: test + lint + type-check', detail: 'Vitest unit tests, ESLint, tsc --noEmit' },
  { step: 3, label: 'OIDC auth to AWS', detail: 'GitHub Actions assumes IAM role via OIDC — no stored AWS credentials' },
  { step: 4, label: 'Frontend build', detail: 'vite build → dist/ assets' },
  { step: 5, label: 'S3 sync', detail: 'aws s3 sync dist/ to private bucket with --delete' },
  { step: 6, label: 'CloudFront invalidation', detail: 'Invalidate /* to serve fresh assets' },
  { step: 7, label: 'Lambda deploy', detail: 'Build Python package → update Lambda function code' },
  { step: 8, label: 'Record deployment event', detail: 'Lambda logs deploy metadata to DynamoDB' },
]

const requestFlow = [
  { step: 1, label: 'Browser resolves DNS', detail: 'Route 53 → CloudFront edge PoP' },
  { step: 2, label: 'CloudFront serves static assets', detail: 'Cache hit: <10ms. Cache miss: S3 origin via OAC' },
  { step: 3, label: 'React app bootstraps', detail: 'SPA loads, client-side routing takes over' },
  { step: 4, label: 'API calls from the browser', detail: 'Fetch to /api/* → API Gateway → Lambda' },
  { step: 5, label: 'Lambda cold start (first request)', detail: '~400ms; subsequent: <50ms' },
  { step: 6, label: 'Lambda reads from DynamoDB', detail: 'Single-table queries, typically <10ms' },
  { step: 7, label: 'Response returned', detail: 'JSON response → API Gateway → browser' },
]

const monitoringFlow = [
  { step: 1, label: 'Lambda emits structured logs', detail: 'JSON format, auto-shipped to CloudWatch Logs' },
  { step: 2, label: 'API Gateway access logs', detail: 'Request/response metadata to CloudWatch Logs' },
  { step: 3, label: 'CloudWatch Alarms', detail: 'Lambda error rate > 1%, API 5xx > 5%, duration > 5s' },
  { step: 4, label: 'Budget Alert', detail: 'SNS email when AWS spend exceeds $8/month' },
  { step: 5, label: 'CloudFront metrics', detail: 'Cache hit ratio, 4xx/5xx rates, origin latency' },
]

const securityFlow = [
  { step: 1, label: 'No long-lived credentials', detail: 'GitHub Actions uses OIDC; no IAM access keys stored anywhere' },
  { step: 2, label: 'S3 private origin', detail: 'Bucket policy allows only CloudFront OAC — no public S3 access' },
  { step: 3, label: 'WAF on CloudFront', detail: 'AWS Managed Rules: bot control, rate limiting on /api/*' },
  { step: 4, label: 'Least-privilege IAM', detail: 'Lambda role: DynamoDB read/write on specific table, SES send only, SSM read only' },
  { step: 5, label: 'Secrets in Secrets Manager', detail: 'No environment variables with secrets in Lambda config' },
  { step: 6, label: 'TLS everywhere', detail: 'ACM cert on CloudFront; HTTP → HTTPS redirect enforced' },
]

export default function ArchitecturePage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-10">
      <div className="mb-8">
        <p className="section-label mb-1">Platform Architecture</p>
        <h1 className="page-title">How This Site Is Built</h1>
        <p className="page-subtitle mt-2 max-w-2xl">
          The infrastructure behind this resume platform, designed to demonstrate the same
          engineering practices I apply to production systems.
        </p>
      </div>

      {/* Diagram */}
      <div className="mb-8">
        <ArchitectureDiagram />
      </div>

      {/* Flow cards */}
      <div className="grid sm:grid-cols-2 gap-5 mb-8">
        <FlowCard
          title="Request Flow"
          description="How a browser request travels through the platform to serve the frontend and API responses."
          steps={requestFlow}
        />
        <FlowCard
          title="Deployment Flow"
          description="How code moves from a git push to running in production — fully automated, no manual steps."
          steps={deployFlow}
        />
        <FlowCard
          title="Monitoring Flow"
          description="How the platform collects telemetry and alerts on anomalies."
          steps={monitoringFlow}
        />
        <FlowCard
          title="Security Controls"
          description="Key security decisions and controls in place across the stack."
          steps={securityFlow}
        />
      </div>

      {/* Infrastructure table */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4">AWS Services Used</h2>
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Service
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Purpose
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {awsServices.map((row) => (
                  <tr key={row.service} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-cyan-300 whitespace-nowrap">
                      {row.service}
                    </td>
                    <td className="px-5 py-3 text-slate-300">{row.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cost strategy */}
      <div className="mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h2 className="text-base font-bold text-white mb-3">Cost Strategy</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            Target: under $5/month. Current estimated spend: ~$2.41/month.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            {[
              {
                title: 'Serverless-first',
                desc: 'Lambda + DynamoDB scale to zero between requests. No idle EC2 or RDS.',
              },
              {
                title: 'CloudFront caching',
                desc: 'Static assets cached at edge. Lambda invoked only for API calls, not page loads.',
              },
              {
                title: 'Budget alerts',
                desc: 'SNS email alert at $8/month — gives time to investigate before hitting $10.',
              },
              {
                title: 'No NAT Gateway',
                desc: 'Lambda and DynamoDB accessed via VPC endpoints or over public internet with TLS — NAT Gateway costs ~$32/month minimum.',
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <div className="w-1 bg-cyan-400/40 rounded-full flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">{item.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* View source */}
      <div className="flex justify-center">
        <a
          href={`${GITHUB_URL}/resume-platform`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline"
        >
          <ExternalLink className="w-4 h-4" />
          View Source on GitHub
        </a>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { ChevronDown, ChevronUp, BookOpen, AlertTriangle } from 'lucide-react'

interface RunbookSection {
  label: string
  steps: string[]
}

interface Runbook {
  id: string
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium'
  symptoms: string[]
  sections: RunbookSection[]
  notes?: string
}

const runbooks: Runbook[] = [
  {
    id: 'site-down',
    title: 'Resume Site Down',
    description: 'The site at manuel-anda.com is returning errors or not loading at all.',
    severity: 'critical',
    symptoms: [
      'HTTP 5xx responses from CloudFront',
      'DNS lookup failure for manuel-anda.com',
      'CloudFront returning 403 or 404 for all requests',
      'CloudWatch alarm: CloudFront 5xx rate > 5% fired',
    ],
    sections: [
      {
        label: 'Triage',
        steps: [
          'Check CloudFront distribution status in AWS Console → CloudFront → Distributions. Status should be "Deployed". If "In Progress", a recent change is propagating — wait 5 minutes.',
          'Run `curl -I https://manuel-anda.com` and note the HTTP status code and `x-cache` header. If x-cache is "Error from cloudfront", the issue is at the origin (S3).',
          'Check S3 bucket in us-east-1: verify the bucket exists and contains index.html in the root. If the bucket is empty or index.html is missing, the last deployment may have failed.',
          'Check CloudFront Origin Access Control (OAC): ensure the distribution is still associated with the S3 bucket. A Terraform apply gone wrong could have detached it.',
          'Check Route 53 hosted zone: verify the A record for manuel-anda.com still points to the CloudFront distribution domain (d*.cloudfront.net).',
          'Check GitHub Actions for recent workflow runs: was there a failed deploy that may have partially applied infrastructure changes?',
        ],
      },
      {
        label: 'Mitigation',
        steps: [
          'If S3 bucket is empty: re-run the frontend build and deploy workflow from GitHub Actions → Actions → "Deploy Frontend" → "Re-run jobs".',
          'If CloudFront distribution config is broken: run `terraform plan` locally from /infrastructure. If plan shows unexpected drift, run `terraform apply` after review.',
          'If DNS is broken: in Route 53, verify the A record is an alias pointing to the correct CloudFront distribution. Correct if needed.',
          'If a recent deployment caused the issue: roll back by reverting the last commit on main and pushing. GitHub Actions will redeploy the previous version.',
          'For persistent 5xx from CloudFront: check CloudFront → Error pages configuration. Ensure 404 is handled by the SPA fallback (index.html).',
        ],
      },
    ],
    notes: 'CloudFront distributions take 5–15 minutes to fully propagate after any configuration change. Wait before escalating if a recent Terraform apply was run.',
  },
  {
    id: 'metrics-api-failing',
    title: 'Metrics API Failing',
    description: 'The /metrics or /health API endpoint is returning errors or not responding.',
    severity: 'high',
    symptoms: [
      'Metrics page shows "Showing demo data — metrics API not yet connected" unexpectedly',
      'CloudWatch alarm: Lambda error rate > 1% fired',
      'CloudWatch alarm: API Gateway 5xx rate > 5% fired',
      'curl https://api.manuel-anda.com/metrics returns non-200',
    ],
    sections: [
      {
        label: 'Triage',
        steps: [
          'Check CloudWatch → Lambda → resume-api-prod function. Look at Error count and Error rate graphs for the last 15 minutes. Note the time the errors started.',
          'Check CloudWatch Logs → /aws/lambda/resume-api-prod. Filter for ERROR. Lambda errors will show the exception type and stack trace.',
          'Common Lambda errors: (a) DynamoDB throttling — check the DynamoDB table\'s ConsumedReadCapacityUnits metric. (b) Timeout — Lambda default is 30s; if the function times out, DynamoDB may be overloaded or unreachable. (c) Import error — a bad deployment may have broken the Python package.',
          'Check API Gateway: API Gateway → APIs → resume-api → Logs. Verify the Lambda integration is still pointing to the correct function ARN.',
          'Check if the Lambda function code was recently updated: Lambda → Functions → resume-api-prod → Versions. Compare the active version\'s last modified date against when errors started.',
        ],
      },
      {
        label: 'Mitigation',
        steps: [
          'If DynamoDB throttling: the table uses on-demand billing, so throttling should be rare. Check if there is a spike in traffic or a runaway Lambda invocation. As a short-term fix, temporarily increase provisioned capacity.',
          'If Lambda timeout: extend the function timeout in Terraform (aws_lambda_function.timeout) and redeploy. Investigate the root cause separately.',
          'If import/code error after deployment: roll back by re-running the previous successful deployment from GitHub Actions history, or revert the last commit and push.',
          'If API Gateway misconfiguration: run `terraform plan` to check for drift. Re-apply with `terraform apply` if the integration ARN is wrong.',
          'If Lambda is cold-starting too slowly (not an error but high latency): check if reserved concurrency is set to 0 accidentally. Remove the reserved concurrency setting.',
          'As a temporary measure while investigating: the frontend falls back to demo data automatically. No user-facing outage, just missing live metrics.',
        ],
      },
    ],
    notes: 'The frontend is designed to fail gracefully when the API is unavailable — it shows demo data instead of an error page. The metrics API is non-critical for the core use case of this site (showing the resume). Fix promptly but it\'s not a P0.',
  },
  {
    id: 'contact-form-abuse',
    title: 'Contact Form Abuse / Spam',
    description: 'The contact form is being used to send spam or abusive content.',
    severity: 'medium',
    symptoms: [
      'Multiple contact form submissions from the same IP in a short window',
      'SES receiving bounce notifications for invalid destination addresses (if forwarding is misconfigured)',
      'DynamoDB contact-submissions table growing unusually fast',
      'AWS account receiving SES reputation alerts',
    ],
    sections: [
      {
        label: 'Triage',
        steps: [
          'Check DynamoDB → contact-submissions table. Scan for recent entries and check for patterns: same email domain, same IP (if captured), similar message content.',
          'Check CloudWatch Logs for the contact Lambda: look for a high invocation rate in a short window. Lambda should not be invoked more than ~10 times/minute organically.',
          'Check API Gateway → resume-api → Usage Plans. If rate limiting is not configured, any caller can hit the endpoint as fast as they want.',
          'Check SES → Suppression list and Reputation dashboard for bounce and complaint rates. If complaint rate is > 0.1%, SES may pause outbound email automatically.',
        ],
      },
      {
        label: 'Mitigation',
        steps: [
          'Immediate: add a WAF rate limit rule on the CloudFront distribution for the path /api/contact. In Terraform, add an aws_wafv2_rule_group with a rate-based rule (e.g., 10 requests per 5-minute window per IP).',
          'Add API Gateway usage plan with throttling: set burst limit to 5, rate to 2 requests/second on the contact route specifically.',
          'If a specific IP is the source: add a WAF IP set block rule for that IP.',
          'If SES reputation is at risk: temporarily disable the SES notification in the contact Lambda (comment out the boto3 send_email call and redeploy) to stop outbound mail while investigating. Contact submissions will still be saved to DynamoDB.',
          'Add hCaptcha or Cloudflare Turnstile to the contact form in the frontend. The invisible challenge stops most bots with no UX impact.',
          'Review DynamoDB entries: delete spam entries with a scan + batch delete script to keep the table clean.',
        ],
      },
    ],
    notes: 'A rate limit of 10 contact form submissions per IP per hour is a reasonable default. The WAF rule should be the first mitigation — it operates at the edge before traffic hits Lambda or DynamoDB.',
  },
]

const severityStyles = {
  critical: 'bg-rose-400/15 text-rose-400 border border-rose-400/30',
  high: 'bg-amber-400/15 text-amber-400 border border-amber-400/30',
  medium: 'bg-indigo-400/15 text-indigo-400 border border-indigo-400/30',
}

interface RunbookCardProps {
  runbook: Runbook
  defaultOpen?: boolean
}

function RunbookCard({ runbook, defaultOpen = false }: RunbookCardProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`inline-flex px-2 py-0.5 rounded text-xs font-bold tracking-wide ${severityStyles[runbook.severity]}`}
            >
              {runbook.severity.toUpperCase()}
            </span>
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <h2 className="text-base font-bold text-white">{runbook.title}</h2>
          <p className="text-sm text-slate-400 mt-1">{runbook.description}</p>
        </div>
        <div className="flex-shrink-0 mt-1">
          {open ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-white/10 px-5 pb-6 pt-5 space-y-6">
          {/* Symptoms */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Symptoms
            </p>
            <ul className="space-y-1.5">
              {runbook.symptoms.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-amber-400 mt-0.5 flex-shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Triage + Mitigation sections */}
          {runbook.sections.map((section) => (
            <div key={section.label}>
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400/70 mb-3">
                {section.label}
              </p>
              <ol className="space-y-3">
                {section.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-400">
                      {i + 1}
                    </span>
                    <p className="text-sm text-slate-300 leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}

          {/* Notes */}
          {runbook.notes && (
            <div className="px-4 py-3 bg-slate-800/60 border border-white/10 rounded-lg">
              <p className="text-xs font-semibold text-slate-500 mb-1">Note</p>
              <p className="text-xs text-slate-400 leading-relaxed">{runbook.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function RunbooksPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto py-10">
      <div className="mb-8">
        <p className="section-label mb-1">Operations</p>
        <h1 className="page-title">Runbooks</h1>
        <p className="page-subtitle mt-2 max-w-2xl">
          Documented triage and mitigation procedures for known failure modes of this platform.
          Writing runbooks for your own infrastructure is a good habit — if you can't write the
          runbook, you don't fully understand the system.
        </p>
      </div>

      <div className="space-y-4">
        {runbooks.map((rb, idx) => (
          <RunbookCard key={rb.id} runbook={rb} defaultOpen={idx === 0} />
        ))}
      </div>
    </div>
  )
}

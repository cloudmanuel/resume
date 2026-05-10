import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../lib/cn'

interface CaseStudy {
  id: string
  title: string
  summary: string
  tags: string[]
  problem: string
  constraints: string
  approach: string
  implementation: string
  operations: string
  outcome: string
  improvements: string
}

const caseStudies: CaseStudy[] = [
  {
    id: 'coder-idp',
    title: 'Coder Workspaces — Internal Developer Platform',
    summary:
      'Built a self-service cloud development environment platform on AWS EC2 using Coder, reducing developer onboarding from 3–5 days to under 2 hours.',
    tags: ['AWS', 'Coder', 'Terraform', 'Okta', 'EC2', 'Devcontainers'],
    problem: `Engineering teams were managing local dev environments manually. Every developer had a slightly different setup. Onboarding involved a 20-page wiki that was perpetually out of date. Bugs that couldn't be reproduced locally ("works on my machine") were a real problem. M1 Mac compatibility issues with legacy services consumed significant platform team time. There was no security baseline on developer machines — secrets were often stored in plaintext .env files.`,
    constraints: `Budget: needed to stay under $800/month for 40 developers. Existing Okta SSO investment had to be reused. Could not require VPN for development (too slow for remote engineers). Platform team had 2 engineers including myself. Migration had to be opt-in — couldn't force everyone to switch at once.`,
    approach: `Evaluated Gitpod Cloud, GitHub Codespaces, and self-hosted Coder. Chose self-hosted Coder on EC2 because it gave us full control over the workspace templates, cost-per-seat economics at our scale, and the ability to integrate with our private VPC resources without VPN. Designed workspace templates as devcontainer images built in CI with pinned dependencies, scanned with Trivy, and pushed to ECR. Workspaces run in the same VPC as staging infrastructure, so developers get real service connectivity without VPN tunneling.`,
    implementation: `Coder server runs on a c6i.xlarge EC2 instance behind an ALB. Workspace VMs run on m6i.large instances with auto-termination after 4 hours of inactivity. Okta SAML integration provides SSO — no separate user management. Terraform manages the entire stack: EC2, ALB, Route 53, ACM cert, ECR repos, IAM roles, S3 for Coder database backups. CI pipeline (GitHub Actions) builds devcontainer images nightly and on PRs, runs Trivy scans, and pushes to ECR. Engineers access workspaces via browser or VS Code remote — no local setup required.`,
    operations: `Primary operational concern is workspace VM cost. Implemented auto-stop after 4 hours idle, which cut compute costs by ~60%. Set up CloudWatch alarms on EC2 spend with budget alerts. Coder's built-in audit log exports to CloudWatch Logs for access tracking. Runbook for common issues (workspace stuck starting, SSH key rotation) lives in the team wiki and is tested quarterly.`,
    outcome: `Developer onboarding dropped from 3–5 days to under 2 hours for 90% of new hires. "Works on my machine" bugs effectively eliminated. 34 out of 40 engineers migrated within 3 months. Monthly cost came in at $680 — under budget. Security audit found zero developer machines storing plaintext secrets (previously ~40% had at least one .env file with real credentials).`,
    improvements: `Would add workspace usage analytics to identify underutilized teams earlier. Persistent volumes for developer-specific data (dotfiles, build caches) would improve perceived performance. Exploring moving workspace VMs to Fargate or EKS to reduce the EC2 fleet management overhead.`,
  },
  {
    id: 'observability-pipeline',
    title: 'Centralized Observability Pipeline — Datadog + OpenTelemetry',
    summary:
      'Designed and deployed a centralized OpenTelemetry Collector fleet on ECS Fargate, unifying logs, metrics, and traces from 40+ services into Datadog and reducing MTTR from 90 minutes to under 15 minutes.',
    tags: ['Datadog', 'OpenTelemetry', 'ECS Fargate', 'CloudWatch', 'PagerDuty'],
    problem: `40+ microservices, each with its own approach to observability. CloudWatch for some logs, Prometheus for metrics in a few services, no traces anywhere. During incidents, engineers had to open 4–5 browser tabs and manually correlate timestamps. MTTR was 90+ minutes. A new service had no guidance on how to instrument — each team reinvented the wheel. Leadership had no visibility into service health, SLOs, or error rates without asking engineers to query CloudWatch manually.`,
    constraints: `Existing Datadog contract with seats already paid for — had to use it. Could not break existing CloudWatch Alarms (ops team relied on them). Teams were using multiple languages: Python, Node.js, Go, and Java. OTel SDK adoption had to be gradual — couldn't require a big-bang migration. Network path for telemetry data had to stay within the VPC (compliance requirement for some teams).`,
    approach: `Deployed a central OpenTelemetry Collector fleet on ECS Fargate as the telemetry router. Services send OTLP over gRPC to the collector fleet, which routes to Datadog. The collector handles batching, retry, and sampling — services don't need to think about that. Built a shared Python and Node.js SDK wrapper with sane defaults (resource attributes, B3 propagation, auto-instrumentation) to make adoption a 2-line change for most services. CloudWatch logs ingestion via the AWS distro for OTel (ADOT) means existing CloudWatch Alarms keep working.`,
    implementation: `ECS Fargate service for the OTel Collector, defined in Terraform with auto-scaling on CPU and network metrics. ALB in front of the collectors for gRPC load balancing, NLB for high-throughput UDP (statsd). Collector config in SSM Parameter Store, rotated without service restart via parameter change triggers. Datadog API key stored in Secrets Manager, injected at container startup. Deployed standardized OTel SDK config as a versioned pip package and npm package. Migration playbook: each team adds the SDK wrapper, points to the collector endpoint, and removes their direct CloudWatch Puts. Rolled out 5 services per week over 8 weeks.`,
    operations: `Collector fleet is the critical path for all telemetry. Configured with persistent queue to handle Datadog outages without data loss. CloudWatch Alarms on collector ECS task health and queue depth feed into PagerDuty. Monthly Datadog cost review: implemented per-service tagging so we can identify and address noisy services. Sampling policy: 100% for errors, 10% for non-error traces to control cost.`,
    outcome: `MTTR dropped from 90 minutes to under 15 minutes within 60 days of full rollout. Service map in Datadog showed 3 previously unknown upstream dependencies causing latency. 38/40 services onboarded. Team leads now have SLO dashboards they can check without involving platform engineers. Datadog bill came in 12% under the contract cap due to sampling.`,
    improvements: `Continuous profiling (Datadog's Continuous Profiler) is the next layer — not yet enabled. Would like a self-service dashboard provisioning system so teams can create Datadog dashboards via Terraform without PRs to the platform repo. Synthetic monitoring for key user journeys is planned.`,
  },
  {
    id: 'temporal-platform',
    title: 'Temporal Workflow Automation Platform',
    summary:
      'Deployed a shared Temporal platform on ECS Fargate, enabling teams to migrate 15+ ad-hoc scripts and fragile Lambda chains to durable, observable workflows.',
    tags: ['Temporal', 'Python', 'ECS Fargate', 'RDS PostgreSQL', 'AWS Secrets Manager'],
    problem: `Multiple teams had independently built long-running business processes as chains of Lambda functions, SQS queues, and Step Functions. Failures in the middle of a process were silent unless someone happened to check CloudWatch Logs. Retries required manual intervention. State was scattered across DynamoDB, S3, and in-memory (which meant it vanished on Lambda timeout). One critical billing process was failing ~3% of runs weekly, requiring manual reconciliation.`,
    constraints: `Could not touch production databases during migration — Temporal had to work alongside existing systems, not replace them. Python-first organization — needed Python SDK support. RDS PostgreSQL was already in use; Temporal's Postgres backend fit naturally. Teams had varying levels of infrastructure experience — the platform had to be easy to use, not just powerful.`,
    approach: `Self-hosted Temporal on ECS Fargate over Temporal Cloud. The decision came down to cost at our workflow volume (~50k executions/day) and the compliance requirement to keep workflow state in our own VPC. Designed a shared service model: one Temporal cluster serving all teams, with namespace isolation between product areas. Built a Python SDK wrapper (internal PyPI package) that handles worker setup, secrets injection from Secrets Manager, CloudWatch metric emission, and standardized exception handling. Each team owns their workflow code; platform owns the Temporal infrastructure.`,
    implementation: `Temporal server components (frontend, history, matching, worker) run as separate ECS Fargate services. RDS PostgreSQL db.r6g.large for persistence. Terraform manages the full stack. Internal SDK wrapper: ~300 lines of Python that wraps temporalio with opinionated defaults for activity retry policies, timeout values, and observability. Each team's worker runs as its own ECS Fargate service with its own task role — namespace isolation prevents cross-team interference. Deployment pipeline: teams' workflow code deploys independently via GitHub Actions. SDK version pinned and auto-updated via Dependabot PRs.`,
    operations: `Temporal's built-in UI provides workflow visibility without additional tooling. CloudWatch Alarms on Temporal server ECS task health, RDS connections, and workflow failure rates. On-call runbook covers common scenarios: stuck workflows (cancel and re-run), history shard rebalancing after scale events, and RDS failover procedure. Monthly SLA review: measured workflow success rate, p99 workflow latency, and worker capacity headroom.`,
    outcome: `15 workflows migrated in the first 2 months. The billing reconciliation failure rate dropped to 0.03% (from 3%) due to automatic retries and idempotent activity design. Platform engineers get paged for Temporal infrastructure issues; teams handle their own workflow bugs. Engineers report that debugging workflows is significantly easier than tracing through Lambda + SQS chains.`,
    improvements: `Workflow versioning strategy needs documentation — currently teams handle it ad-hoc. Would invest in a self-service workflow registration system so teams can deploy new workflows without platform team involvement. Temporal Cloud is worth re-evaluating if workflow volume grows 5x, as operational burden would likely exceed cloud cost savings.`,
  },
  {
    id: 'clipharvest',
    title: 'ClipHarvest — Serverless SaaS Backend',
    summary:
      'Designed and built a fully serverless SaaS backend for a Twitch clip processing tool — FastAPI on Lambda with DynamoDB, S3, CloudFront, and Stripe billing. Scales to zero between jobs.',
    tags: ['FastAPI', 'Lambda', 'DynamoDB', 'S3', 'CloudFront', 'Stripe', 'Terraform'],
    problem: `Side project: I wanted to build a tool that lets Twitch streamers and editors clip and download highlights from VODs. Needed a multi-tenant backend with user accounts, usage-based billing via Stripe, and delivery of processed video clips — all without managing servers, and ideally spending under $5/month at low traffic.`,
    constraints: `Solo project — had to minimize operational complexity. No servers to patch. Budget: effectively $0 during development, under $5/month at 100 MAU. All media storage had to support public CDN delivery with access control. Stripe integration required webhook signature verification and idempotent payment processing.`,
    approach: `FastAPI on AWS Lambda using Mangum as the ASGI adapter. DynamoDB for all structured data (users, jobs, subscriptions) with a single-table design that keeps per-user data in the same partition. S3 for raw uploads and processed clips, CloudFront for CDN delivery with signed URLs for private content. Stripe Checkout for subscription flow, with webhook events processed in a dedicated Lambda. Everything in Terraform; deployed via GitHub Actions with OIDC auth to AWS.`,
    implementation: `Lambda function packaged as a container image (avoids 50MB zip limit). API Gateway HTTP API in front of Lambda for routing. DynamoDB single-table design: pk=USER#<id>, sk=JOB#<timestamp> for user jobs, sk=SUB#<id> for subscription state. S3 bucket with two prefixes: /uploads (private, presigned POST URLs for upload), /clips (signed CloudFront URLs for delivery, 24h TTL). Stripe webhook Lambda processes payment.intent.succeeded and customer.subscription events with idempotency keys. GitHub Actions deploys container image to ECR, then updates Lambda function code. Cold start: ~800ms on first request, acceptable for this use case.`,
    operations: `Lambda concurrency limit set to 50 to prevent accidental cost runaway. CloudWatch dashboard tracks invocation count, error rate, and duration. Budget alert fires at $10/month. Stripe webhook failures go to a dead-letter SQS queue with a Lambda for manual replay. No on-call pager — this is a side project, outages are acceptable within reason.`,
    outcome: `Running at ~$3/month with ~80 MAU. 100% serverless — no EC2, no containers to manage. Stripe billing working correctly. The Twitch API integration required more iteration than expected (rate limits, VOD availability windows) but the architecture made it easy to add retries without changing infra. If I were doing this for a production company, I'd add proper SLOs and alerting from day one.`,
    improvements: `Cold start latency is a real issue for synchronous API requests. Would move to Lambda SnapStart or provisioned concurrency if this were a paying product with SLA expectations. The single-table DynamoDB design worked for access patterns I knew upfront but became awkward when adding a new query pattern — would reconsider table per entity at scale.`,
  },
  {
    id: 'resume-platform',
    title: 'This Resume Platform — Cloud-Operated Portfolio',
    summary:
      'Built this site as a live, observable cloud system using the same patterns I use professionally — Terraform, GitHub Actions OIDC, CloudFront + S3, Lambda API, and real monitoring. Because a static HTML page isn\'t a very interesting portfolio for a platform engineer.',
    tags: ['AWS', 'Terraform', 'React', 'TypeScript', 'Lambda', 'DynamoDB', 'CloudFront', 'GitHub Actions'],
    problem: `Most engineer portfolios are a static HTML page or a Notion doc. That's fine, but it doesn't demonstrate much about how someone actually builds systems. I wanted a portfolio that shows the same level of craft I'd apply to production infrastructure — not just the content, but the delivery mechanism itself.`,
    constraints: `Total infrastructure cost should stay under $5/month. Everything must be in version control. No manual AWS console clicks (except initial account bootstrap). The design has to be polished enough that a recruiter would take it seriously — not a gimmick.`,
    approach: `Treat the resume like a production service: Terraform for all infrastructure, GitHub Actions for CI/CD, CloudFront for CDN, Lambda + DynamoDB for the dynamic API layer, and CloudWatch for monitoring. React frontend because I want to demonstrate full-stack engineering, not just infra. The architecture mirrors what I'd build for a real SaaS product at this scale.`,
    implementation: `Frontend: React + TypeScript + Vite + Tailwind, built in GitHub Actions and deployed to a private S3 bucket with CloudFront OAC. Backend: FastAPI on Lambda (Mangum) behind API Gateway HTTP API. DynamoDB stores visitor metrics, contact form submissions, and deployment events. GitHub Actions uses OIDC to assume an IAM role — no AWS access keys stored in GitHub Secrets. Terraform manages everything in the /infrastructure directory. State in S3 + DynamoDB locking.`,
    operations: `CloudWatch Alarms on Lambda error rate, API Gateway 5xx rate, and CloudFront cache hit ratio. Budget alert at $8/month (gives headroom before hitting the $5 goal). Contact form submissions go to DynamoDB and trigger an SES email. No PagerDuty — acceptable for a personal site. Deployment takes ~3 minutes including build, test, and invalidation.`,
    outcome: `Operational and available. Demonstrates IaC, CI/CD, serverless, frontend engineering, and operational thinking in one coherent project. The "DEMO" labels in the UI are intentional — honesty about what's live vs. synthetic is itself a platform engineering value.`,
    improvements: `Real-time visitor metrics would require an edge Lambda, which I've punted on for cost reasons. Would add Playwright E2E tests in the CI pipeline. The architecture diagram is currently drawn in Tailwind — an actual Mermaid or D3 diagram would be more impressive. Will get to it.`,
  },
]

interface CaseStudyCardProps {
  study: CaseStudy
  defaultOpen?: boolean
}

function CaseStudyCard({ study, defaultOpen = false }: CaseStudyCardProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div id={study.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-white mb-1 leading-snug">{study.title}</h2>
          <p className="text-sm text-slate-400 leading-relaxed">{study.summary}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {study.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-slate-800 border border-white/10 rounded text-xs font-medium text-cyan-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex-shrink-0 mt-1">
          {open ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expandable body */}
      {open && (
        <div className="border-t border-white/10 px-5 pb-6 pt-5 space-y-5">
          {[
            { label: 'Problem', content: study.problem },
            { label: 'Constraints', content: study.constraints },
            { label: 'Architecture & Approach', content: study.approach },
            { label: 'Implementation Details', content: study.implementation },
            { label: 'Operational Concerns', content: study.operations },
            { label: 'Outcome', content: study.outcome },
            { label: "What I'd Improve Next", content: study.improvements },
          ].map(({ label, content }) => (
            <div key={label}>
              <p className={cn('text-xs font-semibold uppercase tracking-widest mb-2',
                label === 'Outcome' ? 'text-emerald-400' : 'text-slate-500'
              )}>
                {label}
              </p>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CaseStudiesPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto py-10">
      <div className="mb-8">
        <p className="section-label mb-1">Engineering Case Studies</p>
        <h1 className="page-title">How I Think About Systems</h1>
        <p className="page-subtitle mt-2 max-w-2xl">
          Detailed write-ups of platforms and systems I've designed, built, and operated in
          production. Includes problem context, constraints, approach, implementation specifics,
          and what I'd do differently.
        </p>
      </div>

      <div className="space-y-4">
        {caseStudies.map((study, idx) => (
          <CaseStudyCard key={study.id} study={study} defaultOpen={idx === 0} />
        ))}
      </div>
    </div>
  )
}

import ServiceCard from '../components/service-catalog/ServiceCard'

const services = [
  {
    name: 'Internal Developer Platform',
    type: 'platform' as const,
    status: 'operational' as const,
    stack: ['AWS', 'Terraform', 'Coder', 'Okta', 'EC2', 'Devcontainers', 'Docker', 'Route 53', 'ACM'],
    problem:
      'Engineering teams across 4 product squads were managing their own local dev environments. Onboarding a new engineer took 3–5 days, environment drift caused hard-to-reproduce bugs, and there was no standardized tooling or security baseline.',
    built:
      'Self-service Coder workspace platform running on EC2 with auto-scaling. Engineers get a browser-accessible, pre-configured cloud IDE in under 2 minutes via SSO (Okta SAML). All workspaces use devcontainer images built in CI and scanned for vulnerabilities. Infrastructure fully managed in Terraform with per-team workspace templates.',
    caseStudyId: 'coder-idp',
  },
  {
    name: 'Centralized Observability Pipeline',
    type: 'observability' as const,
    status: 'operational' as const,
    stack: ['Datadog', 'OpenTelemetry', 'ECS Fargate', 'ALB', 'NLB', 'ACM', 'CloudWatch', 'PagerDuty'],
    problem:
      'No unified visibility across 40+ microservices. Logs were in CloudWatch, metrics in a mix of CloudWatch and Prometheus, and traces didn\'t exist. MTTR was over 90 minutes because engineers had to correlate data from multiple consoles during incidents.',
    built:
      'Centralized OpenTelemetry Collector fleet on ECS Fargate, receiving OTLP data from all services and routing to Datadog for storage, alerting, and dashboards. ALB for gRPC ingress, NLB for high-throughput UDP. Standardized OTel SDK configuration distributed via shared library. Unified service map, custom SLO dashboards, and PagerDuty on-call routing.',
    caseStudyId: 'observability-pipeline',
  },
  {
    name: 'Workflow Automation Platform',
    type: 'automation' as const,
    status: 'operational' as const,
    stack: ['Temporal.io', 'Python SDK', 'ECS Fargate', 'AWS Secrets Manager', 'CloudWatch', 'RDS PostgreSQL'],
    problem:
      'Multiple teams had independently written ad-hoc scripts and Lambda functions for long-running business processes. Failures were silent, retries were manual, and state was stored inconsistently across DynamoDB tables and S3.',
    built:
      'Shared Temporal platform running on ECS Fargate with a managed PostgreSQL backend. Python SDK wrapper library with standardized activity patterns, secrets injection from AWS Secrets Manager, and CloudWatch integration for workflow metrics. Teams migrated 15+ workflows to durable execution within 2 months.',
    caseStudyId: 'temporal-platform',
  },
  {
    name: 'ClipHarvest — Serverless SaaS Backend',
    type: 'backend' as const,
    status: 'operational' as const,
    stack: ['FastAPI', 'Lambda', 'DynamoDB', 'S3', 'CloudFront', 'Stripe', 'Twitch API', 'Terraform', 'GitHub Actions'],
    problem:
      'Side project: needed a scalable, low-cost API backend for a SaaS tool that clips and delivers Twitch stream highlights. Required Stripe billing, multi-tenant data isolation, and media delivery — without managing any servers.',
    built:
      'Fully serverless FastAPI app deployed to Lambda via Mangum adapter. DynamoDB for multi-tenant data with per-user partition key design. S3 + CloudFront for media delivery with signed URLs. Stripe webhooks handled in Lambda for subscription management. All infrastructure in Terraform with a GitHub Actions deploy pipeline. Scales to zero when unused, ~$3/month at low traffic.',
    caseStudyId: 'clipharvest',
  },
]

export default function ServiceCatalogPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-10">
      <div className="mb-8">
        <p className="section-label mb-1">Service Catalog</p>
        <h1 className="page-title">What I've Built</h1>
        <p className="page-subtitle mt-2 max-w-2xl">
          A catalog of the platforms, pipelines, and systems I've designed and operated
          in production. Each entry includes the problem it solved, what was built, and
          the stack used.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {services.map((svc) => (
          <ServiceCard key={svc.name} {...svc} />
        ))}
      </div>
    </div>
  )
}

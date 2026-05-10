import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { fetchMetrics, fetchHealth, fetchDeployments, submitContact } from './lib/api'
import { CANDIDATE_EMAIL, GITHUB_URL, LINKEDIN_URL, PDF_URL, REPO_URL } from './lib/constants'
import type { Metrics, Deployment, HealthCheck, ContactFormData } from './types'
import { demoMetrics, demoDeployments, demoHealthChecks, demoUptimeData } from './data/demo'

// ─────────────────────────── static data ───────────────────────────

const SECTIONS = [
  { id: 'home',         label: 'home' },
  { id: 'snapshot',     label: 'snapshot' },
  { id: 'about',        label: 'about' },
  { id: 'deploys',      label: 'deploys' },
  { id: 'scorecard',    label: 'scorecard' },
  { id: 'architecture', label: 'arch' },
  { id: 'runbooks',     label: 'runbooks' },
  { id: 'work',         label: 'work' },
  { id: 'projects',     label: 'projects' },
  { id: 'contact',      label: 'contact' },
]

const NOW = [
  { t: 'now',     b: 'Building a Coder-based IDP for a 40-person eng org.' },
  { t: 'writing', b: 'Notes on OTel pipelines + cost-aware tracing.' },
  { t: 'reading', b: '"Designing Data-Intensive Applications", Kleppmann.' },
  { t: 'open to', b: 'Cloud / Platform Roles, Cloud Architect.' },
]

const IMPACT = [
  { k: 'onboarding',    v: '3 d',   w: '2 h',   d: '−92%' },
  { k: 'MTTR',          v: '90 m',  w: '15 m',  d: '−83%' },
  { k: 'AWS spend',     v: '100%',  w: '66%',   d: '−34%' },
  { k: 'deploy freq.',  v: '1×/wk', w: '5×/d',  d: '+25×' },
  { k: 'data latency',  v: '6 h',   w: '5 m',   d: '−99%' },
  { k: 'critical CVEs', v: '80+',   w: '0',     d: '−100%' },
]

const SCORECARD = [
  { svc: 'AWS Cloud Infrastructure',  slo: 'Systems stay up 99.95% of the time',            val: '99.98%',   trend: '↑ exceeding target',        tier: 'tier-1', evidence: 'AWS SAA · 4 yrs hands-on' },
  { svc: 'Infrastructure as Code',    slo: '100% of infra defined in code — no manual clicks', val: '100%',  trend: '→ fully maintained',         tier: 'tier-1', evidence: 'Terraform · 60+ reusable modules' },
  { svc: 'Automated Deployments',     slo: 'Ship changes in under 5 minutes, safely',        val: '3 min 12s',trend: '↑ 18% faster than last year', tier: 'tier-1', evidence: 'GitHub Actions · zero long-lived credentials' },
  { svc: 'Monitoring & Alerting',     slo: 'Every service has full observability',            val: '100%',     trend: '↑ 12% more coverage added',  tier: 'tier-1', evidence: 'Datadog · OpenTelemetry · PagerDuty' },
  { svc: 'Security & Compliance',     slo: 'Zero critical vulnerabilities open',              val: '0 open',   trend: '✓ none found in 30 days',    tier: 'tier-1', evidence: 'SOC 2 readiness · GuardDuty · Security Hub' },
  { svc: 'Cloud Cost Management',     slo: 'Reduce spend without losing reliability',         val: '−34% YoY', trend: '↑ 34% less spend year-on-year',tier: 'tier-2', evidence: 'Reserved capacity · rightsizing · Spot instances' },
  { svc: 'Container Orchestration',   slo: '99.9% Kubernetes cluster availability',           val: '99.92%',   trend: '→ holding steady',           tier: 'tier-2', evidence: 'EKS · Helm · 4 production clusters' },
  { svc: 'Serverless APIs',           slo: 'APIs respond in under 200ms',                    val: '84ms',     trend: '↑ 9% faster this quarter',   tier: 'tier-2', evidence: 'AWS Lambda · DynamoDB · API Gateway' },
]

const RUNBOOKS = [
  {
    id: 'site-down', sev: 'P1', title: 'Resume Site Down',
    desc: 'manuel-anda.com returning errors or not loading.',
    symptoms: ['HTTP 5xx from CloudFront', 'DNS lookup failure for manuel-anda.com', 'CloudWatch alarm: cf-5xx-rate > 5%'],
    triage: [
      'Check CloudFront distribution status — should be Deployed.',
      'curl -I https://manuel-anda.com — note status & x-cache header.',
      'Verify S3 bucket has index.html at root; OAC still attached.',
      'Verify Route 53 alias still points to the CF distribution.',
      'Check GHA for failed deploy that may have partially applied.',
    ],
    mitigate: [
      'If S3 empty: re-run "Deploy Frontend" workflow.',
      'If CF config drifted: terraform plan, then apply after review.',
      'If recent deploy caused it: revert last commit → CI redeploys.',
    ],
    note: 'CloudFront takes 5–15 min to propagate after any config change.',
  },
  {
    id: 'metrics-api', sev: 'P2', title: 'Metrics API Failing',
    desc: '/metrics endpoint returning errors or timing out.',
    symptoms: ['Metrics page falls back to demo data', 'Lambda error rate > 1%', 'API GW 5xx > 5%'],
    triage: [
      'CloudWatch → Lambda resume-api-prod: error count + duration.',
      'Logs → /aws/lambda/resume-api-prod, filter ERROR.',
      'DynamoDB throttling? (table is on-demand — should be rare)',
      'API GW integration ARN still pointing at correct Lambda?',
    ],
    mitigate: [
      'Bad deploy: rerun previous successful workflow from history.',
      'Drift: terraform plan / apply.',
      'Frontend already falls back to demo data — no user-facing outage.',
    ],
    note: 'Non-critical: site keeps working from demo data while you fix.',
  },
  {
    id: 'contact-abuse', sev: 'P3', title: 'Contact Form Abuse',
    desc: 'Spam or rate-abuse against the contact endpoint.',
    symptoms: ['Same IP submitting many times in a short window', 'DDB contact-submissions growing fast', 'SES complaint rate climbing'],
    triage: [
      'Scan DDB for patterns: same email domain, IP, body.',
      'Check API GW usage plan; is throttling configured?',
      'SES suppression list + reputation dashboard.',
    ],
    mitigate: [
      'Add WAF rate-based rule: 10 req / 5 min / IP on /api/contact.',
      'API GW usage plan: burst 5, rate 2 rps on contact route.',
      'Add Turnstile/hCaptcha to the form.',
    ],
    note: 'WAF is the right first lever — cuts traffic before it hits Lambda.',
  },
]

const EXPERIENCE = [
  {
    hash: 'a3f8c12', branch: 'cloud-engineer-ii', head: true,
    role: 'Cloud Engineer II', company: 'Torc Robotics',
    period: 'Sep 2022 — Present', location: 'Remote · Blacksburg, VA',
    summary: 'Building resilient cloud infrastructure for autonomous vehicle systems — IaC, K8s, multi-cloud, Service Catalog self-service.',
    bullets: [
      'Designed, implemented, and managed infrastructure using Terraform, achieving a 40% improvement in provisioning time.',
      'Built and optimized CI/CD pipelines with GitHub Actions to support seamless deployment, reducing deployment errors by 30%.',
      'Architected scalable cloud infrastructure on AWS, leveraging Kubernetes for container orchestration and auto-scaling.',
      'Implemented monitoring and alerting systems using Prometheus and Grafana, ensuring 99.9% system uptime.',
      'Designed solutions for multi-cloud environments (AWS, Azure) to optimize redundancy and cost.',
      'Conducted detailed cost analyses and implemented optimizations, reducing cloud expenses by 20%.',
      'Migrated monolithic applications to microservices architecture, improving scalability and maintainability.',
      'Designed and implemented a backend system enabling internal users to self-service provision EC2 machines via AWS Service Catalog.',
    ],
  },
  {
    hash: 'b91e047', branch: 'cloud-support-eng', head: false,
    role: 'Cloud Support Engineer', company: 'Amazon Web Services',
    period: 'Aug 2021 — Aug 2022', location: 'Hybrid · Herndon, VA',
    summary: 'Resolved critical multi-service escalations; drove customer migrations from on-prem to AWS.',
    bullets: [
      'Applied advanced troubleshooting techniques across EC2, S3, EFS, IAM, and networking to resolve complex, multi-service escalations.',
      'Guided customers through S3 architecture — bucket policies, cross-account access, storage classes, lifecycle policies, cross-region replication, and Glacier archival.',
      'Assisted customers migrating workloads from on-premises to hybrid and full-cloud AWS environments.',
      'Drove critical-event customer communication and post-incident reviews across enterprise accounts.',
      'Wrote technical tutorials, how-to videos, and developer-community articles adopted internally as official documentation.',
      'Continuously expanded service expertise to keep pace with AWS releases and customer adoption patterns.',
    ],
  },
  {
    hash: 'f0a9d61', branch: 'education', head: false,
    role: 'B.S. Information Technology', company: 'University of Houston — Clear Lake',
    period: 'May 2021', location: 'Houston, TX',
    summary: 'Minor in Cyber Security · AWS cert study group.',
    bullets: [],
  },
]

interface CaseStudyDecision { t: string; b: string }
interface CaseStudyImpact { l: string; was: string; now: string; d: string }
interface CaseStudyTimeline { h: string; t: string; w: string }
interface CaseStudyFull {
  draft?: false
  owner: string; repo: string; lastDeploy: string
  context: string
  decisions: CaseStudyDecision[]
  impact: CaseStudyImpact[]
  timeline: CaseStudyTimeline[]
  retro: string
}
interface CaseStudyDraft { draft: true; note: string }
interface Service {
  id: string; name: string; blurb: string
  stack: string[]; metric: string
  cs: CaseStudyFull | CaseStudyDraft
}

const SERVICES: Service[] = [
  // {
  //   id: 'svc-002', name: 'Observability Pipeline',
  //   blurb: 'OTel collector on ECS Fargate routing traces/metrics/logs to Datadog with unified dashboards and PagerDuty alerts.',
  //   stack: ['Datadog', 'OTel', 'ECS', 'ALB', 'CloudWatch'], metric: 'MTTR 90 → 15 min',
  //   cs: {
  //     owner: 'sre · m. anda', repo: 'github.com/org/otel-pipeline', lastDeploy: '2 days ago · v1.8.3',
  //     context: 'Three teams, three vendors, no shared trace context. Incidents took 60–90 minutes just to assemble the timeline across CloudWatch, New Relic, and direct Datadog agents. SLO reporting was manual quarterly spreadsheets.',
  //     decisions: [
  //       { t: 'OTel collector as the single ingress', b: 'Vendor-neutral. We can swap Datadog for another backend by changing one exporter config — no app re-instrumentation.' },
  //       { t: 'Tail-based sampling at the collector', b: 'Keep 100% of error/slow traces, 5% of healthy traffic. Cut ingest cost ~70% without losing signal during incidents.' },
  //       { t: 'Standard resource attributes', b: 'service.name, deployment.environment, team — enforced by an OPA policy in the collector. Dashboards finally agree on what "service" means.' },
  //     ],
  //     impact: [
  //       { l: 'MTTR (p50)', was: '92 min', now: '15 min', d: '−84%' },
  //       { l: 'observability cost / mo', was: '$18.4k', now: '$7.1k', d: '−61%' },
  //       { l: 'services with golden signals', was: '12', now: '47', d: '+35' },
  //     ],
  //     timeline: [
  //       { h: 'f3a8b21', t: 'tail sampling · 70% cost cut', w: 'Q2' },
  //       { h: 'c92d4f6', t: '47 services migrated', w: 'Q1' },
  //       { h: '8b1e3a0', t: 'collector ga on fargate', w: 'Q4 prev' },
  //     ],
  //     retro: 'Underestimated the change-management work. The tech was easy; convincing three teams to delete their bespoke dashboards took longer than the build. Next time, lead with a single "before/after MTTR" case study from an early adopter team before the migration ask.',
  //   },
  // },
  {
    id: 'svc-002', name: 'Automated EC2 Provisioning',
    blurb: 'Self-service EC2 provisioning via AWS Service Catalog — golden AMIs baked by EC2 Image Builder, dynamic DNS via Route 53, SSM for post-boot automation.',
    stack: ['Service Catalog', 'EC2 Image Builder', 'SSM', 'Route 53', 'Terraform'], metric: 'onboarding 3d → 2h',
    cs: {
      owner: 'torc robotics · m. anda', repo: 'internal · platform-catalog', lastDeploy: 'Q1 2024',
      context: 'Engineers at Torc were waiting up to 3 days for a new EC2 machine — tickets to IT, manual AMI selection, manual DNS updates, post-boot config by hand. The platform team owned exactly none of that flow. We needed a self-service path that any engineer could use without opening a ticket.',
      decisions: [
        { t: 'Service Catalog as the vending machine', b: 'Engineers pick a product (dev box, build host, GPU node) from a portal. No IAM knowledge required — the catalog role handles it behind the scenes.' },
        { t: 'EC2 Image Builder for golden AMIs', b: 'Baked-in agents, hardened config, approved toolchain. Eliminates the "whose User Data script is canonical?" problem that had accumulated over 3 years.' },
        { t: 'SSM for post-boot automation instead of User Data', b: 'User Data runs once and is hard to audit. SSM State Manager associations re-run on schedule — machines drift back to desired state automatically.' },
        { t: 'Route 53 dynamic DNS via Lambda trigger', b: 'On instance launch, EventBridge triggers a Lambda that registers hostname → private IP. Engineers SSH by name, not IP. No manual DNS tickets.' },
      ],
      impact: [
        { l: 'provisioning time', was: '3 days', now: '2 hours', d: '−92%' },
        { l: 'IT provisioning tickets / month', was: '~40', now: '~4', d: '−90%' },
        { l: 'AMI drift incidents', was: 'frequent', now: '0', d: 'golden AMIs' },
      ],
      timeline: [
        { h: 'd3f1a09', t: 'ssm state mgr · drift remediation live', w: 'Q2 2024' },
        { h: 'b8c2e54', t: 'route 53 lambda · auto-dns on launch', w: 'Q1 2024' },
        { h: '7a4f812', t: 'service catalog ga · all eng orgs', w: 'Q4 2023' },
        { h: '1e9d3c6', t: 'ec2 image builder · first golden ami', w: 'Q3 2023' },
      ],
      retro: 'The hardest part was getting the Security team to trust the golden AMI pipeline enough to retire their manual approval step. The turning point was showing them the Image Builder CIS benchmark scan output alongside a manually built machine. Automated evidence beats manual attestation every time.',
    },
  },
  {
    id: 'svc-003', name: 'Cloud-Native Migration (CometML)',
    blurb: 'Lifted CometML experiment tracking from a single over-provisioned EC2 instance to ECS Fargate — new VPC, task roles, security groups, and full CI/CD integration.',
    stack: ['ECS Fargate', 'VPC', 'IAM', 'ALB', 'GitHub Actions', 'Terraform'], metric: 'idle compute −$4k/mo',
    cs: {
      owner: 'torc robotics · m. anda', repo: 'internal · ml-infra', lastDeploy: 'Q3 2023',
      context: 'The ML team\'s CometML instance lived on a single r5.4xlarge running 24/7 at ~15% utilization — costing ~$600/mo whether anyone was training or not. It had no load balancing, no auto-recovery, and deployments meant SSHing into prod. Any reboot was a 15-minute outage.',
      decisions: [
        { t: 'ECS Fargate over EC2 Auto Scaling', b: 'No instances to patch. Scale-to-zero on weekends. Task-level IAM roles mean no EC2 instance profile with broad permissions sitting idle.' },
        { t: 'New VPC with private subnets', b: 'The old instance was in the default VPC with a public IP. New architecture: ALB in public subnets, containers in private subnets. No direct internet path to the app.' },
        { t: 'Task role with least-privilege S3 access', b: 'CometML writes artifacts to S3. The task role has s3:PutObject / s3:GetObject scoped to the exact bucket prefix — not a wildcard.' },
        { t: 'Blue/green deploy via CodeDeploy + ALB', b: 'Zero-downtime deploys. Rollback in 60 seconds if the new task fails its health check. The old "SSH and restart" path is gone.' },
      ],
      impact: [
        { l: 'idle compute cost / mo', was: '~$600', now: '~$140', d: '−77%' },
        { l: 'deploy downtime', was: '15 min', now: '0 min', d: 'blue/green' },
        { l: 'public IPs exposed', was: '1', now: '0', d: 'private only' },
      ],
      timeline: [
        { h: 'c9a1f37', t: 'codedeploy blue/green · zero downtime', w: 'Q4 2023' },
        { h: '4e8b2d0', t: 'fargate ga · cutover from ec2', w: 'Q3 2023' },
        { h: 'f1c5e89', t: 'new vpc + private subnets + alb', w: 'Q2 2023' },
        { h: 'a3d7b14', t: 'terraform scaffolding · ecs cluster', w: 'Q1 2023' },
      ],
      retro: 'We spent two sprints on the Fargate task sizing because CometML\'s memory footprint during experiment ingestion spikes unpredictably. Lesson: load test in staging with production-scale experiment payloads before committing to a task CPU/memory spec. We ended up right-sizing twice before landing on the right configuration.',
    },
  },
  {
    id: 'svc-004', name: 'Org-Wide Cloud Custodian',
    blurb: 'Organization-wide AWS governance using Cloud Custodian: idle resource cleanup, IAM guardrails, SNS notifications, and Lambda + CloudWatch Events automation.',
    stack: ['Cloud Custodian', 'Lambda', 'CloudWatch Events', 'SNS', 'IAM', 'Terraform'], metric: 'AWS spend −20%',
    cs: {
      owner: 'torc robotics · m. anda', repo: 'internal · cloud-custodian-policies', lastDeploy: 'Q2 2024',
      context: 'As the engineering org grew, so did shadow infrastructure — dev instances left running, unattached EBS volumes, old AMIs nobody owned, IAM users created for one-off tasks and never cleaned up. No one team owned the cleanup. AWS spend was climbing even as utilization metrics stayed flat.',
      decisions: [
        { t: 'Cloud Custodian over home-grown scripts', b: 'Policy-as-code with a declarative YAML syntax. Security and Finance can read the policies without knowing Python. Auditability for SOC 2 reviews.' },
        { t: 'Notify first, terminate second', b: 'Each policy runs a two-step schedule: SNS notification to the resource owner (via tag) on day 1, automated stop/delete on day 7. Engineers hate surprise terminations more than they hate warnings.' },
        { t: 'IAM guardrails as preventive policies', b: 'SCP-style rules enforced at the organization level: no IAM user creation without a specific tag, no S3 public-read, no security group with 0.0.0.0/0 on port 22. Prevention is cheaper than remediation.' },
        { t: 'CloudWatch Events as the scheduler', b: 'No long-running daemon. Policies are Lambda functions invoked on a CloudWatch schedule — zero idle cost, native CloudWatch Logs integration for policy audit trail.' },
      ],
      impact: [
        { l: 'cloud spend / mo', was: 'baseline', now: '−20%', d: 'after 90 days' },
        { l: 'idle EC2 instances', was: '60+', now: '<5', d: 'continuous' },
        { l: 'IAM users (no MFA)', was: '31', now: '0', d: 'guardrail' },
      ],
      timeline: [
        { h: 'e2f4a81', t: 'iam guardrails · scp-style enforced', w: 'Q2 2024' },
        { h: '9b3c750', t: 'idle resource cleanup · all regions', w: 'Q1 2024' },
        { h: '6d1e924', t: 'notify-then-terminate flow live', w: 'Q4 2023' },
        { h: '3a8f016', t: 'custodian scaffolding · first policies', w: 'Q3 2023' },
      ],
      retro: 'The tagging requirement created more friction than expected. About a third of existing resources had no owner tag, so our "notify the owner" step had nowhere to send the notification. We spent an entire sprint backfilling tags using a combination of Config rules and manual review. Tag governance should be policy day 1, not an afterthought.',
    },
  },
  {
    id: 'svc-001', name: 'Resume Control Plane',
    blurb: 'This site, run as a real cloud system: CloudFront + S3 frontend, Lambda API, DynamoDB, Terraform IaC, GHA OIDC deploys.',
    stack: ['AWS', 'React', 'Python', 'Terraform', 'GHA'], metric: 'live · this page',
    cs: {
      owner: 'personal · m. anda', repo: 'github.com/cloudmanuel/resume', lastDeploy: 'today',
      context: 'Most portfolios are React + Vercel. Mine should be the artifact of the job I want — a real cloud system with IaC, CI/CD, IAM, observability, and runbooks. If a hiring manager opens the dev tools and finds nothing interesting, the resume isn\'t doing its job.',
      decisions: [
        { t: 'S3 + CloudFront over Vercel', b: 'Lets me wire WAF, real CloudFront cache policies, and OAC — concrete artifacts to point at in interviews.' },
        { t: 'Terraform everything, no console clicks', b: 'Including the GitHub OIDC trust. The README has one command: `terraform apply`. Zero hidden state.' },
        { t: 'Lambda + DynamoDB for the API', b: 'On-demand pricing means it costs nothing when nobody\'s looking. Four Lambda functions: metrics, deployments, health, and contact — each with least-privilege IAM.' },
      ],
      impact: [
        { l: 'monthly cost', was: '—', now: '$2.41', d: 'real' },
        { l: 'deploy time', was: '—', now: '94s', d: 'GHA → live' },
        { l: 'long-lived AWS keys', was: '—', now: '0', d: 'OIDC only' },
      ],
      timeline: [
        { h: '9c1f2a4', t: 'live metrics · cost explorer + p95', w: 'this month' },
        { h: 'b7e3d51', t: 'ci/cd · oidc to aws · zero keys', w: 'this month' },
        { h: '2a9c0f8', t: 'metrics api · lambda + dynamodb', w: 'last month' },
        { h: 'f4e9c12', t: 'static site live on cloudfront', w: 'last month' },
      ],
      retro: 'Should have started with Terraform from day 1 — the first week was console clicks that had to be reverse-engineered back into HCL. Even for a personal project, IaC pays back inside the first week. Also: the Route 53 hosted zone incident (Terraform accidentally destroying the registrar zone) was a hard lesson in `terraform state rm` before changing resource types.',
    },
  },
]

const CERTS = [
  { abbr: 'SAP', name: 'AWS Solutions Architect — Professional', meta: 'valid · 2024–2027' },
  { abbr: 'DOP', name: 'AWS DevOps Engineer — Professional',     meta: 'valid · 2024–2027' },
]

const TERM_LINES = [
  { kind: 'prompt', cmd: 'whoami' },
  { kind: 'out', parts: [{ t: 'plain', v: 'manuel anda — ' }, { t: 'k', v: 'platform / cloud engineer' }, { t: 'plain', v: ' · 4+ yrs · falls church, va' }] },
  { kind: 'blank' },
  { kind: 'prompt', cmd: 'cat focus.md' },
  { kind: 'out', parts: [{ t: 'plain', v: 'I build the ' }, { t: 'k', v: 'infrastructure & developer tooling' }, { t: 'plain', v: ' product\nteams depend on: IDPs, observability, secure CI/CD, serverless.' }] },
  { kind: 'blank' },
  { kind: 'prompt', cmd: 'ls --tree skills/' },
  { kind: 'out', parts: [{ t: 'dim', v: 'skills/\n├─ aws/  ' }, { t: 'ok', v: '[saa-pro]' }, { t: 'dim', v: ' ' }, { t: 'ok', v: '[dop-pro]' }, { t: 'dim', v: '\n├─ iac/  terraform · cdk · github-actions\n├─ obs/  datadog · opentelemetry · temporal\n└─ lang/ python · bash' }] },
  { kind: 'blank' },
  { kind: 'prompt', cmd: 'deploy --status' },
  { kind: 'out', parts: [{ t: 'ok', v: '●' }, { t: 'plain', v: ' resume-control-plane · us-east-1 · uptime 99.98% · p95 84ms' }] },
  { kind: 'blank' },
  { kind: 'prompt', cmd: 'say hi' },
  { kind: 'out', parts: [{ t: 'plain', v: 'open to ' }, { t: 'k', v: 'cloud / platform engineering' }, { t: 'plain', v: ' roles → ' + CANDIDATE_EMAIL }] },
]

// ─────────────────────────── helpers ───────────────────────────

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setTimeout(() => setOn(true), delay); io.disconnect() }
    }, { threshold: 0.12 })
    io.observe(el)
    return () => io.disconnect()
  }, [delay])
  return <div ref={ref} className={`reveal ${on ? 'on' : ''} ${className}`}>{children}</div>
}

function ClockUTC() {
  const [t, setT] = useState(() => new Date())
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i) }, [])
  const hh = String(t.getUTCHours()).padStart(2, '0')
  const mm = String(t.getUTCMinutes()).padStart(2, '0')
  const ss = String(t.getUTCSeconds()).padStart(2, '0')
  return <span>{hh}:{mm}:{ss} UTC</span>
}

function Sparkline({ data, w = 320, h = 60 }: { data: number[]; w?: number; h?: number }) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = Math.max(0.6, max - min)
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - (min - 0.5)) / (span + 0.5)) * (h - 6) - 2
    return [x, y] as [number, number]
  })
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = `${path} L${w},${h} L0,${h} Z`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: 'block' }}>
      <path d={area} fill="var(--accent-soft)" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => data[i] < 100 ? <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="var(--warn)" /> : null)}
    </svg>
  )
}

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─────────────────────────── terminal ───────────────────────────

function Terminal({ replayKey }: { replayKey: number }) {
  const [phase, setPhase] = useState({ line: 0, char: 0 })
  const [done, setDone] = useState(false)

  useEffect(() => { setPhase({ line: 0, char: 0 }); setDone(false) }, [replayKey])

  useEffect(() => {
    if (done) return
    const cur = TERM_LINES[phase.line]
    if (!cur) { setDone(true); return }
    if (cur.kind === 'prompt') {
      if (phase.char < cur.cmd!.length) {
        const t = setTimeout(() => setPhase(p => ({ ...p, char: p.char + 1 })), 28 + Math.random() * 30)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setPhase({ line: phase.line + 1, char: 0 }), 220)
        return () => clearTimeout(t)
      }
    } else {
      const delay = cur.kind === 'blank' ? 80 : 280
      const t = setTimeout(() => setPhase({ line: phase.line + 1, char: 0 }), delay)
      return () => clearTimeout(t)
    }
  }, [phase, done])

  return (
    <div className="term" role="region" aria-label="Animated terminal">
      <div className="term-bar">
        <span className="lights"><span /><span /><span /></span>
        <span className="term-tabs">
          <span className="term-tab is-active">~/manuelanda</span>
          <span className="term-tab">notes.md</span>
          <span className="term-tab">terraform.tfvars</span>
        </span>
        <span className="term-host">zsh · 80×24</span>
      </div>
      <div className="term-body">
        {TERM_LINES.slice(0, phase.line + 1).map((ln, i) => {
          const isLast = i === phase.line
          if (ln.kind === 'blank') return <div key={i} style={{ height: '0.55em' }} />
          if (ln.kind === 'prompt') {
            const shown = isLast && !done ? ln.cmd!.slice(0, phase.char) : ln.cmd
            return (
              <div key={i}>
                <span className="prompt"><span className="u">manuel</span>@<span className="h">resume</span>:<span className="p">~</span></span>
                <span className="prompt"> </span>
                <span className="prompt arrow">›</span>
                <span className="cmd">{shown}</span>
                {isLast && !done && <span className="cursor" />}
              </div>
            )
          }
          if (ln.kind === 'out') {
            return (
              <div key={i} className="out" style={{ whiteSpace: 'pre-wrap' }}>
                {ln.parts!.map((p, j) => {
                  if (p.t === 'k') return <span key={j} className="k">{p.v}</span>
                  if (p.t === 'dim') return <span key={j} className="dim">{p.v}</span>
                  if (p.t === 'ok') return <span key={j} className="ok">{p.v}</span>
                  return <span key={j}>{p.v}</span>
                })}
              </div>
            )
          }
          return null
        })}
        {done && (
          <div>
            <span className="prompt"><span className="u">manuel</span>@<span className="h">resume</span>:<span className="p">~</span></span>{' '}
            <span className="prompt arrow">›</span>
            <span className="cursor" />
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────── nav ───────────────────────────

function Nav({ active }: { active: string }) {
  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <a className="nav-brand" href="#home">
          <span className="dot" />
          <span>manuelanda<span style={{ color: 'var(--ink-4)' }}>.com</span></span>
        </a>
        <span className="nav-sec">/ {active}</span>
        <nav className="nav-links">
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'is-active' : ''}>{s.label}</a>
          ))}
        </nav>
        <span className="nav-clock"><ClockUTC /></span>
        <div className="nav-actions">
          <a className="nav-btn" href={REPO_URL} target="_blank" rel="noopener noreferrer" title="View source on GitHub">
            {'{ }'} source
          </a>
          <a className="nav-btn nav-btn-primary" href={PDF_URL} download title="Download resume PDF">
            ↓ resume.pdf
          </a>
        </div>
      </div>
    </header>
  )
}

// ─────────────────────────── hero ───────────────────────────

function Hero({ onCmd, replay, setReplay }: { onCmd: () => void; replay: number; setReplay: React.Dispatch<React.SetStateAction<number>> }) {
  return (
    <section id="home" className="sec hero scrolled-target">
      <div className="wrap">
        <div className="hero-grid">
          <div>
            <Terminal replayKey={replay} />
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--ink-4)' }}>
              <span>● live · synced from /docs/about.md</span>
              <button className="commit-toggle" onClick={() => setReplay(r => r + 1)}>↻ replay</button>
            </div>
          </div>
          <div className="hero-side">
            <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>
              <span className="pill"><span className="dot" /> Currently Employed · responds &lt;24h</span>
            </div>
            <h1 className="hero-headline serif">
              A resume,<br />
              run like <em className="underline">production</em><br />
              infrastructure.
            </h1>
            <p className="hero-sub">
              Four+ years building secure, automated cloud platforms on AWS — internal developer
              platforms, observability pipelines, and serverless systems. This site is itself a
              live deployment.
            </p>
            <div className="hero-cta">
              <a className="btn btn-accent" href="#contact">get in touch <span aria-hidden>→</span></a>
              <button className="btn btn-ghost" onClick={onCmd}>
                <span style={{ opacity: 0.7 }}>⌘</span> jump to… <span className="kbd" style={{ marginLeft: 4 }}>K</span>
              </button>
            </div>
            <div className="hero-meta">
              <div><div className="label">role</div><div className="val">Platform / Cloud Eng</div></div>
              <div><div className="label">based</div><div className="val">Falls Church, VA · remote</div></div>
              <div><div className="label">stack</div><div className="val">AWS · Terraform · Py</div></div>
              <div><div className="label">yrs/certs</div><div className="val">4y exp · 2 certs</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────── status strip ───────────────────────────

function StatusStrip({ metrics }: { metrics: Metrics }) {
  const lastDeploy = metrics.last_deploy_at ? relativeTime(metrics.last_deploy_at) : '—'
  const p95Display = metrics.p95_latency_ms > 0 ? String(metrics.p95_latency_ms) : '—'
  const costDisplay = metrics.monthly_cost_usd > 0 ? `$${metrics.monthly_cost_usd.toFixed(2)}` : '—'
  const stats = [
    { l: 'Uptime / 30d',  v: metrics.uptime_30d.toFixed(2), u: '%',  note: null },
    { l: 'p95 latency',   v: p95Display,                     u: p95Display !== '—' ? 'ms' : '', note: 'synthetic checks' },
    { l: 'Last deploy',   v: lastDeploy,                     u: '',   note: null },
    { l: 'Infra cost',    v: costDisplay,                    u: costDisplay !== '—' ? '/mo' : '', note: 'AWS Cost Explorer' },
  ]
  return (
    <div className="wrap">
      <Reveal>
        <div className="status">
          {stats.map(s => (
            <div className="stat" key={s.l}>
              <div className="kv">
                <span className="v">{s.v}</span>
                {s.u && <span className="u">{s.u}</span>}
              </div>
              <div className="l">
                {s.l}
                {metrics._demo && <span className="demo-tag" style={{ marginLeft: 6 }}>demo</span>}
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  )
}

// ─────────────────────────── production snapshot ───────────────────────────

function ProductionSnapshot({ metrics, health }: { metrics: Metrics; health: HealthCheck[] }) {
  const passing = health.filter(h => h.status === 'passing').length
  const uptimeData = demoUptimeData.map(d => d.uptime)
  const isDemo = health.some(h => h._demo)

  return (
    <section id="snapshot" className="sec scrolled-target" style={{ paddingTop: 32 }}>
      <div className="wrap">
        <div className="sec-head">
          <span className="sec-num">01 /</span>
          <h2 className="sec-title"><span className="hash">#</span> production snapshot</h2>
          <span className="sec-meta">
            live · region {metrics.primary_region}
            {isDemo && <span className="demo-tag" style={{ marginLeft: 8 }}>demo data</span>}
          </span>
        </div>
        <Reveal>
          <div className="snap-grid">
            <div className="snap-card">
              <div className="snap-head">
                <span className="snap-l">uptime · last 30 days</span>
                <span className="pill"><span className="dot" /> healthy</span>
              </div>
              <div className="snap-big">{metrics.uptime_30d.toFixed(2)}<span className="snap-u">%</span></div>
              <div className="snap-spark"><Sparkline data={uptimeData} h={56} /></div>
              <div className="snap-foot">
                <span>30d ago</span><span>1 incident · 47 min</span><span>now</span>
              </div>
            </div>
            <div className="snap-card">
              <div className="snap-head">
                <span className="snap-l">health checks</span>
                <span className="pill"><span className="dot" /> {passing}/{health.length} passing</span>
              </div>
              <ul className="snap-checks">
                {health.map(h => (
                  <li key={h.id}>
                    <span className="hc-dot" data-tone={h.status === 'passing' ? 'ok' : h.status === 'failing' ? 'fail' : 'warn'} />
                    <span className="hc-name">{h.name}</span>
                    <span className="hc-region">us-east-1</span>
                    <span className="hc-ms">{h.latency_ms}ms</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─────────────────────────── impact ───────────────────────────

function ImpactStrip() {
  return (
    <section className="sec scrolled-target" style={{ paddingTop: 24, paddingBottom: 0 }}>
      <div className="wrap">
        <div className="sec-head">
          <span className="sec-num">02 /</span>
          <h2 className="sec-title"><span className="hash">#</span> impact</h2>
          <span className="sec-meta">before / after · across 3 roles</span>
        </div>
        <Reveal>
          <div className="impact-grid">
            {IMPACT.map(i => (
              <div className="impact" key={i.k}>
                <div className="impact-l">{i.k}</div>
                <div className="impact-row">
                  <span className="impact-was">{i.v}</span>
                  <span className="impact-arr">→</span>
                  <span className="impact-now">{i.w}</span>
                </div>
                <div className="impact-d">{i.d}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─────────────────────────── about ───────────────────────────

function About() {
  return (
    <section id="about" className="sec scrolled-target">
      <div className="wrap">
        <div className="sec-head">
          <span className="sec-num">03 /</span>
          <h2 className="sec-title"><span className="hash">#</span> about</h2>
          <span className="sec-meta">cat about.md</span>
        </div>
        <div className="about-grid">
          <Reveal className="prose">
            <p>
              I'm a <strong>Platform / Cloud Engineer</strong> who treats infrastructure
              the way product teams treat software — versioned, observable, and tested.
              The things I build aren't features users see directly; they're the surface
              area engineers ship from.
            </p>
            <p>
              Most of my last four years have been spent on <strong>internal developer
              platforms</strong>, <strong>observability pipelines</strong>, and{' '}
              <strong>production-grade serverless systems</strong> on AWS. I write
              Terraform for everything, automate deployments through GitHub Actions
              with OIDC, and refuse to let secrets sit anywhere they shouldn't.
            </p>
            <p>
              The site you're reading is itself a live cloud system — Lambda, DynamoDB,
              CloudFront, all provisioned with Terraform and deployed end-to-end through
              CI. The status bar above is real.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="now-card">
              <h4>/now</h4>
              {NOW.map(n => (
                <div className="now-row" key={n.t}>
                  <span className="t">{n.t}</span>
                  <span className="b">{n.b}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────── deployment timeline ───────────────────────────

function DeploymentTimeline({ deployments }: { deployments: Deployment[] }) {
  const isDemo = deployments.some(d => d._demo)
  return (
    <section id="deploys" className="sec scrolled-target">
      <div className="wrap">
        <div className="sec-head">
          <span className="sec-num">04 /</span>
          <h2 className="sec-title"><span className="hash">#</span> deploys</h2>
          <span className="sec-meta">
            main · last {deployments.length} builds
            {isDemo && <span className="demo-tag" style={{ marginLeft: 8 }}>demo data</span>}
          </span>
        </div>
        <Reveal>
          <div className="dep-table">
            <div className="dep-row dep-head">
              <span>status</span><span>commit</span><span>message</span><span>when</span><span>dur</span>
            </div>
            {deployments.map(d => (
              <div className={`dep-row ${d.status === 'failed' ? 'failed' : ''}`} key={d.id}>
                <span className="dep-status">
                  <span className="hc-dot" data-tone={d.status === 'success' ? 'ok' : d.status === 'failed' ? 'fail' : 'warn'} />
                  {d.status}
                </span>
                <span className="dep-hash">{d.commit_hash}</span>
                <span className="dep-msg">{d.summary}</span>
                <span className="dep-when">{relativeTime(d.deployed_at)}</span>
                <span className="dep-dur">{d.duration_s}s</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─────────────────────────── platform scorecard ───────────────────────────

function PlatformScorecard() {
  const tier1 = SCORECARD.filter(s => s.tier === 'tier-1')
  const tier2 = SCORECARD.filter(s => s.tier === 'tier-2')
  const Row = ({ s }: { s: typeof SCORECARD[0] }) => (
    <div className="sc-row">
      <span className="sc-svc">{s.svc}</span>
      <span className="sc-slo">{s.slo}</span>
      <span className="sc-val"><span className="hc-dot" data-tone="ok" />{s.val}</span>
      <span className="sc-trend">{s.trend}</span>
      <span className="sc-evi">{s.evidence}</span>
    </div>
  )
  return (
    <section id="scorecard" className="sec scrolled-target">
      <div className="wrap">
        <div className="sec-head">
          <span className="sec-num">05 /</span>
          <h2 className="sec-title"><span className="hash">#</span> platform scorecard</h2>
          <span className="sec-meta">skills · what I target · what I've delivered</span>
        </div>
        <Reveal>
          <div className="sc-table">
            <div className="sc-row sc-head">
              <span>skill area</span><span>what I aim for</span><span>actual result</span><span>recent change</span><span>how I know</span>
            </div>
            <div className="sc-tier">core strengths</div>
            {tier1.map(s => <Row key={s.svc} s={s} />)}
            <div className="sc-tier">supporting skills</div>
            {tier2.map(s => <Row key={s.svc} s={s} />)}
          </div>
        </Reveal>
        {/* <div className="sec-head" style={{ marginTop: 36 }}>
          <span className="sec-num">05.1 /</span>
          <h3 className="sec-title" style={{ fontSize: 18 }}><span className="hash">#</span> certifications</h3>
        </div> */}
        <Reveal>
          <div className="cert-row">
            {CERTS.map(c => (
              <div className="cert" key={c.abbr}>
                <span className="badge">{c.abbr}</span>
                <div>
                  <div className="cert-name">{c.name}</div>
                  <div className="cert-meta">{c.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─────────────────────────── architecture ───────────────────────────

function Architecture() {
  return (
    <section id="architecture" className="sec scrolled-target">
      <div className="wrap">
        <div className="sec-head">
          <span className="sec-num">06 /</span>
          <h2 className="sec-title"><span className="hash">#</span> architecture</h2>
          <span className="sec-meta">this site · production diagram</span>
        </div>
        <Reveal>
          <div className="diag">
            <svg viewBox="0 0 1080 520" className="diag-svg" preserveAspectRatio="xMidYMid meet">
              <defs>
                <marker id="arrh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="var(--ink-3)" />
                </marker>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--rule)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect x="0" y="0" width="1080" height="520" fill="url(#grid)" opacity="0.5" />
              {/* swimlane labels */}
              <text x="20" y="40" className="diag-lane">edge · users</text>
              <text x="20" y="190" className="diag-lane">aws account · us-east-1 (vpc-less)</text>
              <text x="20" y="430" className="diag-lane">ci/cd · ops</text>
              <line x1="20" y1="160" x2="1060" y2="160" stroke="var(--rule)" strokeDasharray="3 3" />
              <line x1="20" y1="400" x2="1060" y2="400" stroke="var(--rule)" strokeDasharray="3 3" />
              {/* edge row */}
              <g className="node"><rect x="60" y="70" width="140" height="64" rx="8" /><text x="130" y="98" className="diag-t">Browser</text><text x="130" y="118" className="diag-s">user · global</text></g>
              <g className="node"><rect x="260" y="70" width="140" height="64" rx="8" /><text x="330" y="98" className="diag-t">Route 53</text><text x="330" y="118" className="diag-s">DNS · ALIAS</text></g>
              <g className="node accent"><rect x="460" y="70" width="160" height="64" rx="8" /><text x="540" y="98" className="diag-t">CloudFront</text><text x="540" y="118" className="diag-s">CDN · WAF · OAC</text></g>
              <g className="node"><rect x="680" y="70" width="120" height="64" rx="8" /><text x="740" y="98" className="diag-t">ACM</text><text x="740" y="118" className="diag-s">TLS cert</text></g>
              <line x1="200" y1="102" x2="260" y2="102" stroke="var(--ink-3)" markerEnd="url(#arrh)" />
              <line x1="400" y1="102" x2="460" y2="102" stroke="var(--ink-3)" markerEnd="url(#arrh)" />
              <line x1="620" y1="102" x2="680" y2="102" stroke="var(--ink-3)" strokeDasharray="3 3" />
              {/* aws row */}
              <g className="node"><rect x="260" y="220" width="160" height="64" rx="8" /><text x="340" y="248" className="diag-t">S3 · static</text><text x="340" y="268" className="diag-s">private · OAC</text></g>
              <g className="node"><rect x="500" y="220" width="160" height="64" rx="8" /><text x="580" y="248" className="diag-t">API Gateway</text><text x="580" y="268" className="diag-s">HTTP · throttled</text></g>
              <g className="node accent"><rect x="700" y="220" width="140" height="64" rx="8" /><text x="770" y="248" className="diag-t">Lambda</text><text x="770" y="268" className="diag-s">Python 3.12</text></g>
              <g className="node"><rect x="880" y="220" width="160" height="64" rx="8" /><text x="960" y="248" className="diag-t">DynamoDB</text><text x="960" y="268" className="diag-s">on-demand · PITR</text></g>
              <path d="M 540 134 L 540 178 L 340 178 L 340 220" fill="none" stroke="var(--ink-3)" markerEnd="url(#arrh)" />
              <path d="M 540 134 L 540 178 L 580 178 L 580 220" fill="none" stroke="var(--ink-3)" markerEnd="url(#arrh)" />
              <line x1="660" y1="252" x2="700" y2="252" stroke="var(--ink-3)" markerEnd="url(#arrh)" />
              <line x1="840" y1="252" x2="880" y2="252" stroke="var(--ink-3)" markerEnd="url(#arrh)" />
              {/* observability sidecar */}
              <g className="node muted"><rect x="60" y="220" width="160" height="64" rx="8" /><text x="140" y="248" className="diag-t">CloudWatch</text><text x="140" y="268" className="diag-s">logs · metrics · alarms</text></g>
              <line x1="220" y1="252" x2="260" y2="252" stroke="var(--ink-4)" strokeDasharray="3 3" />
              {/* ci/cd row */}
              <g className="node"><rect x="60" y="450" width="180" height="60" rx="8" /><text x="150" y="478" className="diag-t">GitHub Actions</text><text x="150" y="496" className="diag-s">build · test · plan/apply</text></g>
              <g className="node accent"><rect x="280" y="450" width="180" height="60" rx="8" /><text x="370" y="478" className="diag-t">IAM · OIDC trust</text><text x="370" y="496" className="diag-s">no long-lived keys</text></g>
              <g className="node"><rect x="500" y="450" width="180" height="60" rx="8" /><text x="590" y="478" className="diag-t">Terraform</text><text x="590" y="496" className="diag-s">all resources · S3 backend</text></g>
              <g className="node"><rect x="720" y="450" width="180" height="60" rx="8" /><text x="810" y="478" className="diag-t">EventBridge</text><text x="810" y="496" className="diag-s">healthcheck schedule</text></g>
              <line x1="240" y1="480" x2="280" y2="480" stroke="var(--ink-3)" markerEnd="url(#arrh)" />
              <line x1="460" y1="480" x2="500" y2="480" stroke="var(--ink-3)" markerEnd="url(#arrh)" />
              <path d="M 590 450 L 590 410 L 770 410 L 770 284" fill="none" stroke="var(--ink-3)" strokeDasharray="3 3" markerEnd="url(#arrh)" />
            </svg>
          </div>
          <div className="diag-legend">
            <span><span className="lg-sw lg-edge" />{' '}edge / users</span>
            <span><span className="lg-sw lg-svc" />{' '}aws service (accent)</span>
            <span><span className="lg-sw lg-ops" />{' '}observability</span>
            <span><span className="lg-sw lg-edge" />{' '}ci/cd</span>
            <span style={{ marginLeft: 'auto', color: 'var(--ink-4)' }}>solid = request path · dashed = telemetry / control</span>
          </div>
          <p className="arch-note">
            All resources provisioned in Terraform with an S3 + DynamoDB remote backend. Deploys run via
            GitHub Actions assuming an IAM role through OIDC — zero long-lived AWS credentials in the
            pipeline. CloudFront serves a private S3 origin via OAC; API Gateway → Lambda → DynamoDB
            handles dynamic reads. Cost: ~$2.41/mo at current traffic.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

// ─────────────────────────── runbooks ───────────────────────────

function Runbooks() {
  const [openId, setOpenId] = useState<string | null>(RUNBOOKS[0].id)
  return (
    <section id="runbooks" className="sec scrolled-target">
      <div className="wrap">
        <div className="sec-head">
          <span className="sec-num">07 /</span>
          <h2 className="sec-title"><span className="hash">#</span> runbooks</h2>
          <span className="sec-meta">on-call · {RUNBOOKS.length} documented</span>
        </div>
        <p className="rb-lead">
          If I can't write the runbook, I don't fully understand the system. These are the actual
          incident playbooks for this site — same shape I write at work.
        </p>
        <Reveal>
          <div className="rb-list">
            {RUNBOOKS.map(rb => {
              const open = openId === rb.id
              return (
                <div key={rb.id} className={`rb ${open ? 'is-open' : ''}`}>
                  <button className="rb-head" onClick={() => setOpenId(open ? null : rb.id)}>
                    <span className={`rb-sev rb-sev-${rb.sev}`}>{rb.sev}</span>
                    <div>
                      <span className="rb-title">{rb.title}</span>
                      <span className="rb-desc">{rb.desc}</span>
                    </div>
                    <span className="rb-chev">{open ? '−' : '+'}</span>
                  </button>
                  {open && (
                    <div className="rb-body">
                      <div className="rb-col">
                        <div className="rb-l">symptoms</div>
                        <ul className="rb-bullets warn">{rb.symptoms.map((s, i) => <li key={i}>{s}</li>)}</ul>
                      </div>
                      <div className="rb-col">
                        <div className="rb-l">triage</div>
                        <ol className="rb-bullets num">{rb.triage.map((s, i) => <li key={i}>{s}</li>)}</ol>
                      </div>
                      <div className="rb-col">
                        <div className="rb-l">mitigate</div>
                        <ol className="rb-bullets num">{rb.mitigate.map((s, i) => <li key={i}>{s}</li>)}</ol>
                      </div>
                      {rb.note && <div className="rb-note"><strong>note ·</strong> {rb.note}</div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─────────────────────────── experience ───────────────────────────

function Experience() {
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({ 0: true })
  const toggle = (i: number) => setOpenMap(m => ({ ...m, [i]: !m[i] }))
  const expandAll = () => setOpenMap(EXPERIENCE.reduce((a, _, i) => ({ ...a, [i]: true }), {} as Record<number, boolean>))
  const collapseAll = () => setOpenMap({})
  return (
    <section id="work" className="sec scrolled-target">
      <div className="wrap">
        <div className="sec-head">
          <span className="sec-num">08 /</span>
          <h2 className="sec-title"><span className="hash">#</span> work</h2>
          <span className="sec-meta">
            <button className="commit-toggle" onClick={expandAll} style={{ marginRight: 6 }}>expand all</button>
            <button className="commit-toggle" onClick={collapseAll}>collapse</button>
          </span>
        </div>
        <Reveal>
          <div className="git">
            {EXPERIENCE.map((c, i) => (
              <div key={c.hash} className={`commit ${c.head ? 'is-cur' : ''}`}>
                <div className="commit-head">
                  <span className="commit-hash">commit {c.hash}</span>
                  {c.head && <span className="commit-branch HEAD">HEAD →</span>}
                  <span className="commit-branch">{c.branch}</span>
                  <span style={{ color: 'var(--ink-4)' }}>· {c.period}</span>
                </div>
                <div className="commit-title">
                  {c.role} <span className="at">@ {c.company}</span>
                </div>
                <div className="commit-meta">{c.location} · {c.summary}</div>
                {c.bullets.length > 0 && (
                  <>
                    {openMap[i] && (
                      <ul className="commit-bullets">
                        {c.bullets.map((b, j) => <li key={j}>{b}</li>)}
                      </ul>
                    )}
                    <button className="commit-toggle" onClick={() => toggle(i)}>
                      {openMap[i] ? '− git diff --collapse' : `+ git diff (${c.bullets.length} lines)`}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─────────────────────────── case study drawer ───────────────────────────

function CaseStudyDrawer({ svc, onClose }: { svc: Service | null; onClose: () => void }) {
  const cs = svc?.cs

  // ESC key to close
  useEffect(() => {
    if (!svc) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [svc, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = svc ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [svc])

  return (
    <div className={`cs-root${svc ? ' is-open' : ''}`} aria-hidden={!svc}>
      <div className="cs-scrim" onClick={onClose} />
      <aside className="cs-panel" role="dialog" aria-modal="true" aria-label={svc?.name ?? ''}>
        {svc && cs && (
          <>
            <header className="cs-bar">
              <span className="cs-crumb">
                <span className="hash">/</span>services<span className="hash">/</span>{svc.id}
              </span>
              <button className="cs-close" onClick={onClose} aria-label="Close case study">
                esc <span className="kbd">×</span>
              </button>
            </header>

            <div className="cs-scroll">
              {/* header */}
              <div className="cs-hd">
                <div className="cs-id-row">
                  <span className="svc-id">{svc.id}</span>
                  <span className="svc-status">
                    <span className="dot" style={{ width: 6, height: 6, boxShadow: 'none' }} /> operational
                  </span>
                </div>
                <h3 className="cs-title">{svc.name}</h3>
                <p className="cs-blurb">{svc.blurb}</p>
                {!cs.draft && (
                  <dl className="cs-meta">
                    <div><dt>owner</dt><dd>{cs.owner}</dd></div>
                    <div><dt>repo</dt><dd className="mono">{cs.repo}</dd></div>
                    <div><dt>last deploy</dt><dd>{cs.lastDeploy}</dd></div>
                  </dl>
                )}
              </div>

              {/* draft state */}
              {cs.draft ? (
                <div className="cs-draft">
                  <div className="cs-l">status</div>
                  <p>{cs.note}</p>
                </div>
              ) : (
                <>
                  <section className="cs-sec">
                    <div className="cs-l">context</div>
                    <p className="cs-body">{cs.context}</p>
                  </section>

                  <section className="cs-sec">
                    <div className="cs-l">decisions <span className="cs-l-meta">· adr-style</span></div>
                    <ol className="cs-decisions">
                      {cs.decisions.map((d, i) => (
                        <li key={i}>
                          <span className="cs-d-n">{String(i + 1).padStart(2, '0')}</span>
                          <div>
                            <div className="cs-d-t">{d.t}</div>
                            <div className="cs-d-b">{d.b}</div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>

                  <section className="cs-sec">
                    <div className="cs-l">impact</div>
                    <div className="cs-impact">
                      {cs.impact.map((m, i) => (
                        <div className="cs-imp" key={i}>
                          <div className="cs-imp-l">{m.l}</div>
                          <div className="cs-imp-row">
                            <span className="impact-was">{m.was}</span>
                            <span className="impact-arr">→</span>
                            <span className="impact-now">{m.now}</span>
                          </div>
                          <div className="impact-d">{m.d}</div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="cs-sec">
                    <div className="cs-l">stack</div>
                    <div className="svc-stack">
                      {svc.stack.map(t => <span className="chip" key={t}>{t}</span>)}
                    </div>
                  </section>

                  <section className="cs-sec">
                    <div className="cs-l">timeline</div>
                    <ul className="cs-timeline">
                      {cs.timeline.map((t, i) => (
                        <li key={i}>
                          <span className="commit-hash">{t.h}</span>
                          <span className="cs-tl-t">{t.t}</span>
                          <span className="cs-tl-w">{t.w}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="cs-sec">
                    <div className="cs-l">what i'd do differently</div>
                    <p className="cs-body cs-retro">{cs.retro}</p>
                  </section>
                </>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  )
}

// ─────────────────────────── projects ───────────────────────────

function Projects() {
  const [open, setOpen] = useState<Service | null>(null)
  const handleClose = useCallback(() => setOpen(null), [])

  return (
    <section id="projects" className="sec scrolled-target">
      <div className="wrap">
        <div className="sec-head">
          <span className="sec-num">09 /</span>
          <h2 className="sec-title"><span className="hash">#</span> projects</h2>
          <span className="sec-meta">/services · {SERVICES.length} deployed</span>
        </div>
        <div className="svc-grid">
          {SERVICES.map((s, i) => (
            <Reveal key={s.id} delay={i * 60}>
              <button type="button" className="svc svc-btn" onClick={() => setOpen(s)}>
                <div className="svc-head">
                  <span className="svc-id">{s.id}</span>
                  <span className="svc-status">
                    <span className="dot" style={{ width: 6, height: 6, boxShadow: 'none' }} /> operational
                  </span>
                </div>
                <div className="svc-name">{s.name}</div>
                <div className="svc-blurb">{s.blurb}</div>
                <div className="svc-stack">
                  {s.stack.map(t => <span className="chip" key={t}>{t}</span>)}
                </div>
                <div className="svc-foot">
                  <span>{s.metric}</span>
                  <span className="arrow">
                    {s.cs.draft ? '→ draft' : '→ open case study'}
                  </span>
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
      <CaseStudyDrawer svc={open} onClose={handleClose} />
    </section>
  )
}

// ─────────────────────────── contact ───────────────────────────

interface FormErrors { name?: string; email?: string; message?: string }

function Contact() {
  const [form, setForm] = useState<ContactFormData>({ name: '', email: '', company: '', role_type: '', message: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.name.trim()) e.name = 'required'
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'valid email required'
    if (form.message.trim().length < 10) e.message = 'message must be at least 10 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setStatus('sending')
    const res = await submitContact(form)
    setStatus(res.success ? 'ok' : 'err')
  }

  return (
    <section id="contact" className="sec scrolled-target">
      <div className="wrap">
        <div className="sec-head">
          <span className="sec-num">10 /</span>
          <h2 className="sec-title"><span className="hash">#</span> contact</h2>
          <span className="sec-meta">curl /api/contact</span>
        </div>
        <Reveal>
          <div className="contact">
            <div>
              <div className="contact-h serif">
                Got a platform that <em>shouldn't be this hard</em> to deploy?
              </div>
              <p className="contact-sub">
                I'm open to Cloud / Platform Engineering, Cloud Architect, and SRE Lead roles.
                Happy to do contract & advisory work too. I usually reply within a day.
              </p>
              <div className="contact-links" style={{ marginTop: 18 }}>
                <a href={`mailto:${CANDIDATE_EMAIL}`}>
                  <span className="k">email</span><span className="v">{CANDIDATE_EMAIL}</span>
                </a>
                <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                  <span className="k">github</span><span className="v">github.com/manuelanda</span>
                </a>
                <a href={LINKEDIN_URL} target="_blank" rel="noreferrer">
                  <span className="k">linkedin</span><span className="v">linkedin.com/in/manuelanda</span>
                </a>
                <a href={PDF_URL}>
                  <span className="k">resume</span><span className="v">manuel-anda-resume.pdf ↓</span>
                </a>
              </div>
            </div>
            <div>
              {status === 'ok' ? (
                <div className="cform-status ok">✓ Message sent — I'll reply within 24h.</div>
              ) : (
                <form className="cform" onSubmit={handleSubmit} noValidate>
                  <div className="cform-row">
                    <div>
                      <label>name</label>
                      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" />
                      {errors.name && <div className="cform-err">{errors.name}</div>}
                    </div>
                    <div>
                      <label>email</label>
                      <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@company.com" />
                      {errors.email && <div className="cform-err">{errors.email}</div>}
                    </div>
                  </div>
                  <div className="cform-row">
                    <div>
                      <label>company <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(optional)</span></label>
                      <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Acme Corp" />
                    </div>
                    <div>
                      <label>role type</label>
                      <select value={form.role_type} onChange={e => setForm(f => ({ ...f, role_type: e.target.value }))}>
                        <option value="">select…</option>
                        <option>Staff / Principal Platform Eng</option>
                        <option>Cloud Architect</option>
                        <option>SRE Lead</option>
                        <option>Contract / Advisory</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label>message</label>
                    <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="What are you building?" />
                    {errors.message && <div className="cform-err">{errors.message}</div>}
                  </div>
                  {status === 'err' && <div className="cform-status err">⚠ Send failed — email me directly at {CANDIDATE_EMAIL}</div>}
                  <button className="btn btn-accent" type="submit" disabled={status === 'sending'} style={{ width: '100%', justifyContent: 'center' }}>
                    {status === 'sending' ? 'sending…' : 'send message →'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ─────────────────────────── footer ───────────────────────────

function Footer({ lastHash }: { lastHash: string }) {
  return (
    <footer className="wrap">
      <div className="foot">
        <span>© 2026 manuel anda · last build {lastHash} · 99.98% / 30d</span>
        <span>
          <a href="#home">↑ top</a> · <a href="#contact">contact</a> · <a href={GITHUB_URL} target="_blank" rel="noreferrer">view source</a>
        </span>
      </div>
    </footer>
  )
}

// ─────────────────────────── command palette ───────────────────────────

const CMD_ITEMS = [
  ...SECTIONS.map(s => ({ kind: 'go' as const, label: `Go to ${s.label}`, href: `#${s.id}`, k: '↵' })),
  { kind: 'act' as const, label: 'Email Manuel', href: `mailto:${CANDIDATE_EMAIL}`, k: '✉' },
  { kind: 'act' as const, label: 'Open GitHub', href: GITHUB_URL, k: '↗' },
  { kind: 'act' as const, label: 'Open LinkedIn', href: LINKEDIN_URL, k: '↗' },
  { kind: 'act' as const, label: 'Download resume.pdf', href: PDF_URL, k: '↓' },
]

function CmdK({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = useMemo(() => {
    return q ? CMD_ITEMS.filter(i => i.label.toLowerCase().includes(q.toLowerCase())) : CMD_ITEMS
  }, [q])

  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 30) } }, [open])
  useEffect(() => { setSel(0) }, [q])

  const choose = useCallback((it: typeof CMD_ITEMS[0]) => {
    onClose()
    if (it.href.startsWith('#')) {
      document.querySelector(it.href)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.open(it.href, it.href.startsWith('mailto:') ? '_self' : '_blank')
    }
  }, [onClose])

  if (!open) return null
  return (
    <div className="cmdk-bd" onClick={onClose}>
      <div className="cmdk" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmdk-input"
          placeholder="› type to search…   (esc to close)"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, items.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
            if (e.key === 'Enter') { e.preventDefault(); if (items[sel]) choose(items[sel]) }
          }}
        />
        <ul>
          {items.length === 0 && <li style={{ color: 'var(--ink-4)' }}>no matches</li>}
          {items.map((it, i) => (
            <li key={it.label} aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => choose(it)}>
              <span className="k">{it.k}</span>
              <span>{it.label}</span>
              <span className="arr">{it.kind === 'go' ? 'section' : 'open'}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ─────────────────────────── section tracker ───────────────────────────

function useActiveSection() {
  const [active, setActive] = useState('home')
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id) })
    }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 })
    SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [])
  return active
}

// ─────────────────────────── app ───────────────────────────

export default function App() {
  const [metrics, setMetrics] = useState<Metrics>(demoMetrics)
  const [health, setHealth] = useState<HealthCheck[]>(demoHealthChecks)
  const [deployments, setDeployments] = useState<Deployment[]>(demoDeployments)
  const [cmd, setCmd] = useState(false)
  const [replay, setReplay] = useState(0)
  const active = useActiveSection()

  useEffect(() => {
    fetchMetrics().then(setMetrics)
    fetchHealth().then(setHealth)
    fetchDeployments().then(setDeployments)
  }, [])

  // ⌘K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); setCmd(c => !c) }
      else if (e.key === '/' && !e.metaKey && !e.ctrlKey && (document.activeElement as HTMLElement)?.tagName !== 'INPUT' && (document.activeElement as HTMLElement)?.tagName !== 'TEXTAREA') { e.preventDefault(); setCmd(true) }
      else if (e.key === 'Escape') setCmd(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const lastHash = deployments[0]?.commit_hash ?? 'a3f8c12'

  return (
    <>
      <Nav active={active} />
      <Hero onCmd={() => setCmd(true)} replay={replay} setReplay={setReplay} />
      <StatusStrip metrics={metrics} />
      <ProductionSnapshot metrics={metrics} health={health} />
      <ImpactStrip />
      <About />
      <DeploymentTimeline deployments={deployments} />
      <PlatformScorecard />
      <Architecture />
      <Runbooks />
      <Experience />
      <Projects />
      <Contact />
      <Footer lastHash={lastHash} />
      <CmdK open={cmd} onClose={() => setCmd(false)} />
    </>
  )
}

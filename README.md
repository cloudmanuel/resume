# Platform Resume Control Plane

> A production-grade, cloud-native resume website built the way infrastructure actually works — Terraform-managed AWS, GitHub Actions CI/CD with OIDC, serverless backend, and a React frontend. No static credentials. No manual deployments.

Live at **[manuel-anda.com](https://manuel-anda.com)**

---

## Architecture Overview

```
                         ┌─────────────────────────────────────────────┐
                         │              GitHub Actions                  │
                         │                                              │
                         │  validate.yml   ←── Pull Requests           │
                         │  plan.yml       ←── Push to main (infra/)   │
                         │  deploy.yml     ←── Push to main (app/)     │
                         │  terraform-apply.yml  ←── Manual dispatch   │
                         └──────────────┬──────────────────────────────┘
                                        │ OIDC (no static keys)
                                        ▼
                         ┌──────────────────────────┐
                         │     AWS IAM Role          │
                         │  (platform-resume-deploy) │
                         └──────────┬───────────────┘
                                    │
          ┌─────────────────────────┼──────────────────────────┐
          │                         │                          │
          ▼                         ▼                          ▼
 ┌────────────────┐     ┌───────────────────┐      ┌──────────────────┐
 │  S3 (frontend) │     │  Lambda Functions │      │  Terraform State │
 │  Static assets │     │  visitor-counter  │      │  S3 + DynamoDB   │
 └───────┬────────┘     │  contact-form     │      └──────────────────┘
         │              └────────┬──────────┘
         ▼                       │
 ┌───────────────┐     ┌─────────▼──────────┐
 │  CloudFront   │     │  API Gateway (HTTP) │
 │  CDN + HTTPS  │     │  /api/visits        │
 │  + WAF        │     │  /api/contact       │
 └───────┬───────┘     └─────────┬──────────┘
         │                       │
         ▼                       ▼
 ┌───────────────────────────────────────────┐
 │           DynamoDB (single table)         │
 │  entity_type (PK) + timestamp_id (SK)     │
 │  Stores: visits, contacts, deployments    │
 └───────────────────────────────────────────┘

DNS: Route 53  →  CloudFront (resume)
              →  API Gateway (api subdomain)
TLS: ACM certificate (us-east-1, auto-renewed)
```

---

## Project Structure

```
platform-resume-control-plane/
├── .github/
│   ├── workflows/
│   │   ├── validate.yml           # PR checks — no AWS access
│   │   ├── plan.yml               # Terraform plan on infra changes
│   │   ├── deploy.yml             # Frontend + backend deploy
│   │   └── terraform-apply.yml    # Protected infra apply (manual)
│   ├── CODEOWNERS
│   └── pull_request_template.md
├── frontend/                      # React + Vite + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── main.tsx
│   ├── .env.example
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/                       # Python Lambda functions
│   ├── visitor_counter/
│   │   └── handler.py
│   ├── contact_form/
│   │   └── handler.py
│   └── tests/
│       ├── requirements.txt
│       ├── test_visitor_counter.py
│       └── test_contact_form.py
├── infra/                         # Terraform (AWS)
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── s3.tf
│   ├── cloudfront.tf
│   ├── lambda.tf
│   ├── api_gateway.tf
│   ├── dynamodb.tf
│   ├── route53.tf
│   ├── iam.tf                     # OIDC role + Lambda roles
│   ├── acm.tf
│   └── terraform.tfvars.example
├── docs/
│   ├── github-variables.md        # All required repo variables + secrets
│   └── local-setup.md             # Local development guide
├── .gitignore
├── LICENSE
└── README.md
```

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 LTS | Frontend build |
| npm | 10.x | Bundled with Node 20 |
| Python | 3.12 | Lambda runtime + local tests |
| Terraform | 1.8.x | Infrastructure provisioning |
| AWS CLI | 2.x | Bootstrap + local testing |
| Git | any | Version control |

---

## Local Development Setup

For the full step-by-step guide including local DynamoDB emulator and first-time AWS bootstrap, see [docs/local-setup.md](docs/local-setup.md).

### Quick start

```bash
# Clone
git clone https://github.com/your-github-username/platform-resume-control-plane.git
cd platform-resume-control-plane

# Frontend
cd frontend && npm install && cp .env.example .env.local && npm run dev

# Backend (new terminal)
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r tests/requirements.txt && pytest tests/ -v

# Terraform validation (no AWS needed)
cd infra && terraform init -backend=false && terraform validate
```

---

## Deployment

Deployments are fully automated through GitHub Actions. There are no manual `aws` or `terraform` commands needed after initial bootstrap.

### Normal workflow

```
Developer pushes to a branch
       │
       ▼
Pull Request opened
       │
       └──► validate.yml runs:
            - Frontend lint, type-check, test, build
            - Backend pytest
            - Terraform fmt check + validate
            (no AWS access — safe for fork PRs)

PR merged to main
       │
       ├──► plan.yml (if infra/** changed):
       │    - Terraform plan with OIDC credentials
       │    - Prints only resource count summary
       │    - Raw plan file deleted immediately
       │
       └──► deploy.yml (if frontend/** or backend/** changed):
            - Build frontend artifact
            - Requires "production" environment approval
            - Sync to S3, invalidate CloudFront
            - Record deployment event to DynamoDB
```

### Terraform apply (infrastructure changes)

Infrastructure changes require an explicit manual trigger:

1. Merge your infra PR to `main`
2. Review the plan summary from `plan.yml`
3. Go to **Actions → Terraform Apply → Run workflow**
4. Approve the `production` environment gate when prompted
5. Monitor the apply — output is suppressed in public logs on failure

### First-time bootstrap

Before any CI/CD run, create the Terraform state bucket and lock table manually:

```bash
# See docs/local-setup.md for the full bootstrap script
aws s3api create-bucket --bucket platform-resume-tf-state-prod --region us-east-1 ...
aws dynamodb create-table --table-name platform-resume-tf-locks ...
```

Then add all required values to GitHub repository variables (see below).

---

## Environment Variables Reference

### Frontend (`.env.local` for dev, injected at build time in CI)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL | `https://api.manuel-anda.com` |
| `VITE_SITE_URL` | Canonical site URL | `https://manuel-anda.com` |

Copy `frontend/.env.example` to `frontend/.env.local` for local development.

### Backend (Lambda environment variables, managed by Terraform)

| Variable | Description |
|---|---|
| `DYNAMODB_TABLE_NAME` | Single-table DynamoDB table name |
| `ALLOWED_ORIGIN` | CORS allowed origin (the frontend domain) |

---

## GitHub Actions Variables and Secrets Reference

All required GitHub repository variables are documented in [docs/github-variables.md](docs/github-variables.md). Summary:

| Variable | Example | Purpose |
|---|---|---|
| `AWS_REGION` | `us-east-1` | AWS region |
| `AWS_ROLE_ARN` | `arn:aws:iam::...` | OIDC deploy role |
| `AWS_ACCOUNT_ID` | `123456789012` | Used for log masking only |
| `PROD_DOMAIN_NAME` | `manuel-anda.com` | Primary domain |
| `FRONTEND_BUCKET_NAME` | `platform-resume-frontend-prod` | S3 asset bucket |
| `CLOUDFRONT_DISTRIBUTION_ID` | `EXXXXXXXXXXXXX` | CDN distribution |
| `API_BASE_URL` | `https://api.manuel-anda.com` | Injected at build time |
| `DYNAMODB_TABLE_NAME` | `platform_resume_events` | Event store |
| `TF_STATE_BUCKET` | `platform-resume-tf-state-prod` | Terraform state |
| `TF_LOCK_TABLE` | `platform-resume-tf-locks` | Terraform lock |

**Secrets required:** none. OIDC eliminates the need for stored AWS credentials.

---

## Security

This project is public. The following controls are in place:

**No static AWS credentials**
Authentication uses GitHub's OIDC provider. GitHub Actions receives a short-lived token valid only for the duration of the job. There are no `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` secrets stored anywhere.

**Secrets never printed**
All known infrastructure identifiers (account IDs, bucket names, distribution IDs, domain names) are registered with GitHub's log masking (`::add-mask::`) before any Terraform or AWS CLI steps run. `set +x` is enabled in all sensitive shell steps to prevent command echo.

**Raw Terraform plan files are never persisted**
`plan.yml` generates a binary plan and JSON summary in-memory, prints only the resource counts (create/update/delete/replace/no-op), then immediately deletes both files. No plan artifact is uploaded.

**Production requires human approval**
The `production` GitHub environment requires at least one reviewer before the deploy or apply job is allowed to start. This means a compromised commit to `main` cannot automatically reach production infrastructure.

**Fork PRs are safe**
`validate.yml` uses `pull_request` (not `pull_request_target`) and has no AWS credentials. Fork contributors can run the full validation suite safely.

**Least-privilege IAM**
The OIDC role has permissions scoped to exactly what the deploy pipeline needs: S3 sync to the frontend bucket, CloudFront invalidation, DynamoDB writes for event recording, and Terraform state read/write. It cannot access other AWS accounts, create IAM users, or modify its own trust policy.

**Terraform apply output is suppressed on failure**
If `terraform apply` fails, the log output (which may contain resource details) is deleted before the job exits. Only a generic failure message is printed to the public job log.

---

## Cost Estimate

All services are consumption-based. At personal resume traffic levels (hundreds to low thousands of visitors/month), the total monthly cost is effectively zero to a few cents.

| Service | Expected usage | Estimated cost/month |
|---|---|---|
| CloudFront | ~1 GB transfer, ~50k requests | < $0.10 |
| S3 (frontend assets) | ~5 MB stored, minimal requests | < $0.01 |
| Lambda | ~1k–5k invocations | Free tier / < $0.01 |
| API Gateway | ~1k–5k requests | Free tier / < $0.01 |
| DynamoDB | On-demand, minimal reads/writes | Free tier / < $0.01 |
| Route 53 | 1 hosted zone | $0.50 |
| ACM | Free | $0.00 |
| **Total** | | **~$0.50–$1.00/month** |

The only guaranteed cost is the Route 53 hosted zone ($0.50/month). Everything else stays within AWS Free Tier at resume-website traffic volumes.

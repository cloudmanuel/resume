# Local Development Setup

This guide walks through running the Platform Resume Control Plane locally — frontend, backend, and infrastructure validation — without any AWS connectivity required.

---

## Prerequisites

Install these tools before starting:

| Tool | Version | Install |
|---|---|---|
| Node.js | 20.x LTS | https://nodejs.org or `nvm install 20` |
| npm | 10.x (bundled with Node 20) | bundled |
| Python | 3.12 | https://python.org or `pyenv install 3.12` |
| Terraform | 1.8.x | https://developer.hashicorp.com/terraform/install |
| AWS CLI | 2.x | https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html |
| Git | any recent | pre-installed on most systems |

Verify your setup:

```bash
node --version    # v20.x.x
python3 --version # Python 3.12.x
terraform version # Terraform v1.8.x
aws --version     # aws-cli/2.x.x
```

---

## 1. Clone the Repository

```bash
git clone https://github.com/your-github-username/platform-resume-control-plane.git
cd platform-resume-control-plane
```

---

## 2. Frontend

The frontend is a React + Vite + TypeScript + Tailwind application.

```bash
cd frontend

# Install dependencies
npm install

# Copy example environment file
cp .env.example .env.local

# Edit .env.local with your local/dev values if needed
# VITE_API_BASE_URL defaults to the prod API — override for local backend
# VITE_API_BASE_URL=http://localhost:8000

# Start the dev server (hot reload)
npm run dev
```

The dev server starts at http://localhost:5173 by default.

**Other useful commands:**

```bash
npm run type-check   # TypeScript check (no emit)
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run build        # Production build to frontend/dist/
npm run preview      # Preview the production build locally
```

---

## 3. Backend

The backend consists of Python Lambda functions. For local development you run tests directly — there is no local Lambda runtime required.

```bash
cd backend

# Create a virtual environment (recommended)
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install test dependencies
pip install -r tests/requirements.txt

# Run all tests with coverage
pytest tests/ -v --cov=. --cov-report=term-missing
```

To test a Lambda handler interactively:

```bash
# Example: invoke visitor counter handler with a mock event
python3 -c "
import json
from visitor_counter.handler import lambda_handler
event = {'httpMethod': 'POST', 'path': '/api/visits'}
print(json.dumps(lambda_handler(event, {}), indent=2))
"
```

> **Note:** DynamoDB calls will fail locally unless you have AWS credentials configured and point at a real table, or use a local DynamoDB emulator (see below).

### Optional: Local DynamoDB with Docker

```bash
docker run -d -p 8000:8000 amazon/dynamodb-local

# Set environment variable so the handler uses local endpoint
export DYNAMODB_ENDPOINT_URL=http://localhost:8000
export DYNAMODB_TABLE_NAME=platform_resume_events_local

# Create the table locally
aws dynamodb create-table \
  --table-name platform_resume_events_local \
  --attribute-definitions \
    AttributeName=entity_type,AttributeType=S \
    AttributeName=timestamp_id,AttributeType=S \
  --key-schema \
    AttributeName=entity_type,KeyType=HASH \
    AttributeName=timestamp_id,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000
```

---

## 4. Terraform (Infrastructure Validation)

Validate Terraform without touching AWS — no credentials required for this step.

```bash
cd infra

# Copy example vars file
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with placeholder or real values
# domain_name  = "manuel-anda.com"
# github_org   = "your-github-username"
# github_repo  = "platform-resume-control-plane"

# Initialize without remote backend (local validation only)
terraform init -backend=false

# Check formatting
terraform fmt -check -recursive

# Validate configuration
terraform validate
```

---

## 5. First-Time AWS Bootstrap

Before the CI/CD pipelines can run `terraform init` with the remote S3 backend, the state bucket and lock table must exist. Create them manually once:

```bash
# Set your values
REGION="us-east-1"
STATE_BUCKET="platform-resume-tf-state-prod"
LOCK_TABLE="platform-resume-tf-locks"

# Create state bucket with versioning and encryption
aws s3api create-bucket \
  --bucket "$STATE_BUCKET" \
  --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION"

aws s3api put-bucket-versioning \
  --bucket "$STATE_BUCKET" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket "$STATE_BUCKET" \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block all public access
aws s3api put-public-access-block \
  --bucket "$STATE_BUCKET" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Create DynamoDB lock table
aws dynamodb create-table \
  --table-name "$LOCK_TABLE" \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION"

echo "Bootstrap complete. Add TF_STATE_BUCKET and TF_LOCK_TABLE to GitHub repo variables."
```

Once the bootstrap resources exist, add `TF_STATE_BUCKET` and `TF_LOCK_TABLE` to your GitHub repository variables (see `docs/github-variables.md`), then trigger the `Terraform Apply` workflow manually from GitHub Actions.

---

## Environment Variables Reference

| Variable | File | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `frontend/.env.local` | Backend API base URL for local dev |
| `VITE_SITE_URL` | `frontend/.env.local` | Site canonical URL |
| `DYNAMODB_TABLE_NAME` | shell / Lambda env | DynamoDB table name for the backend |
| `DYNAMODB_ENDPOINT_URL` | shell (optional) | Override for local DynamoDB emulator |

See `frontend/.env.example` for the full frontend example file.

---

## Troubleshooting

**`npm ci` fails — lock file out of sync**
Run `npm install` to regenerate `package-lock.json`, commit it, then retry `npm ci`.

**`terraform validate` fails with provider errors**
Run `terraform init -backend=false` first. Providers must be downloaded before validate can run.

**`pytest` import errors**
Make sure you activated the virtual environment (`source .venv/bin/activate`) and installed deps from `backend/tests/requirements.txt`.

**AWS credential errors during local testing**
For pure unit tests, AWS calls are mocked. If you are running integration tests, configure credentials with `aws configure` or export `AWS_PROFILE`.

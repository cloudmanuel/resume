variable "project_name" {
  description = "Name of the project, used for resource naming and tagging."
  type        = string
  default     = "platform-resume"
}

variable "domain_name" {
  description = "Primary domain name for the resume site (e.g. manuel-anda.com). Required."
  type        = string
}

variable "aws_region" {
  description = "AWS region to deploy Lambda, API Gateway, DynamoDB, and other regional resources."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment identifier (prod, staging, dev)."
  type        = string
  default     = "prod"
}

variable "github_org" {
  description = "GitHub organization or username owning the repository (used for OIDC trust policy)."
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name (used for OIDC trust policy)."
  type        = string
}

variable "enable_waf" {
  description = "Whether to attach an AWS WAF WebACL to the CloudFront distribution. Incurs additional cost."
  type        = bool
  default     = false
}

variable "enable_contact_form" {
  description = "Whether to deploy the contact form Lambda and API route."
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention period in days."
  type        = number
  default     = 14
}

variable "contact_webhook_secret" {
  description = "Optional secret for contact form webhook integration. Leave empty to disable."
  type        = string
  sensitive   = true
  default     = ""
}

variable "datadog_api_key" {
  description = "Optional Datadog API key for log forwarding. Leave empty to disable."
  type        = string
  sensitive   = true
  default     = ""
}

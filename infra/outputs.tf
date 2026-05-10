output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID — used by CI/CD for cache invalidation."
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_distribution_domain" {
  description = "CloudFront distribution domain name."
  value       = aws_cloudfront_distribution.main.domain_name
}

output "s3_frontend_bucket_name" {
  description = "Name of the S3 bucket hosting frontend static assets."
  value       = aws_s3_bucket.frontend.bucket
}

output "s3_frontend_bucket_arn" {
  description = "ARN of the S3 frontend bucket."
  value       = aws_s3_bucket.frontend.arn
}

output "api_gateway_endpoint" {
  description = "Base URL of the HTTP API Gateway endpoint."
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB events table."
  value       = aws_dynamodb_table.platform_resume_events.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB events table."
  value       = aws_dynamodb_table.platform_resume_events.arn
}

output "route53_zone_id" {
  description = "Route 53 hosted zone ID for the domain."
  value       = aws_route53_zone.main.zone_id
}

output "route53_name_servers" {
  description = "Name servers for the Route 53 hosted zone — configure these at your registrar."
  value       = aws_route53_zone.main.name_servers
}

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate (us-east-1) attached to CloudFront."
  value       = aws_acm_certificate.main.arn
}

output "lambda_metrics_function_name" {
  description = "Name of the metrics Lambda function."
  value       = aws_lambda_function.metrics.function_name
}

output "lambda_contact_function_name" {
  description = "Name of the contact Lambda function."
  value       = aws_lambda_function.contact.function_name
}

output "lambda_deployments_function_name" {
  description = "Name of the deployments Lambda function."
  value       = aws_lambda_function.deployments.function_name
}

output "lambda_healthcheck_function_name" {
  description = "Name of the healthcheck Lambda function."
  value       = aws_lambda_function.healthcheck.function_name
}

output "site_url" {
  description = "Primary URL for the deployed resume site."
  value       = "https://${var.domain_name}"
}

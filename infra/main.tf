# =============================================================================
# DATA SOURCES
# =============================================================================

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# ---------------------------------------------------------------------------
# Lambda package archives
# ---------------------------------------------------------------------------

data "archive_file" "health_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/health"
  output_path = "${path.module}/.terraform/lambda_zips/health.zip"
}

data "archive_file" "metrics_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/metrics"
  output_path = "${path.module}/.terraform/lambda_zips/metrics.zip"
}

data "archive_file" "contact_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/contact"
  output_path = "${path.module}/.terraform/lambda_zips/contact.zip"
}

data "archive_file" "deployments_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/deployments"
  output_path = "${path.module}/.terraform/lambda_zips/deployments.zip"
}

data "archive_file" "healthcheck_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/healthcheck"
  output_path = "${path.module}/.terraform/lambda_zips/healthcheck.zip"
}

# =============================================================================
# ROUTE 53
# =============================================================================

data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

resource "aws_route53_record" "apex" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id         = data.aws_route53_zone.main.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

# =============================================================================
# ACM (us-east-1 — required for CloudFront)
# =============================================================================

resource "aws_acm_certificate" "main" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "www.${var.domain_name}",
  ]

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "main" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.acm_validation : record.fqdn]
}

# =============================================================================
# S3 — FRONTEND BUCKET
# =============================================================================

resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project_name}-frontend-${var.environment}"
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket     = aws_s3_bucket.frontend.id
  depends_on = [aws_s3_bucket_public_access_block.frontend]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })
}

# =============================================================================
# CLOUDFRONT
# =============================================================================

resource "aws_cloudfront_origin_access_control" "main" {
  name                              = "${var.project_name}-oac-${var.environment}"
  description                       = "OAC for ${var.project_name} S3 frontend bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_response_headers_policy" "main" {
  name = "${var.project_name}-security-headers-${var.environment}"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
  }
}

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  aliases             = [var.domain_name, "www.${var.domain_name}"]
  comment             = "${var.project_name} (${var.environment})"

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.frontend.bucket}"
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
  }

  default_cache_behavior {
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "S3-${aws_s3_bucket.frontend.bucket}"
    compress                   = true
    viewer_protocol_policy     = "redirect-to-https"
    cache_policy_id            = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed: CachingOptimized
    response_headers_policy_id = aws_cloudfront_response_headers_policy.main.id
  }

  # SPA support: 403/404 from S3 → serve index.html with 200
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.main.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  depends_on = [aws_acm_certificate_validation.main]
}

# =============================================================================
# DYNAMODB
# =============================================================================

resource "aws_dynamodb_table" "platform_resume_events" {
  name         = "platform_resume_events"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "entity_type"
  range_key    = "timestamp_id"

  attribute {
    name = "entity_type"
    type = "S"
  }

  attribute {
    name = "timestamp_id"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = false
  }

  server_side_encryption {
    enabled = true
  }
}

# =============================================================================
# IAM — LAMBDA EXECUTION ROLES (LEAST PRIVILEGE)
# =============================================================================

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# --- Health Lambda Role (stdlib only — no DynamoDB needed) ---

resource "aws_iam_role" "lambda_health" {
  name               = "${var.project_name}-lambda-health-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "lambda_health_basic" {
  role       = aws_iam_role.lambda_health.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# --- Metrics Lambda Role ---

resource "aws_iam_role" "lambda_metrics" {
  name               = "${var.project_name}-lambda-metrics-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "lambda_metrics_basic" {
  role       = aws_iam_role.lambda_metrics.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_metrics_dynamodb" {
  name = "dynamodb-read"
  role = aws_iam_role.lambda_metrics.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBRead"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:BatchGetItem",
        ]
        Resource = aws_dynamodb_table.platform_resume_events.arn
      }
    ]
  })
}

# Cost Explorer is a global service — IAM does not support resource-level scoping for ce:*.
# Least-privilege: read-only cost data, no budget or anomaly write actions.
resource "aws_iam_role_policy" "lambda_metrics_cost_explorer" {
  name = "cost-explorer-read"
  role = aws_iam_role.lambda_metrics.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "CostExplorerReadOnly"
        Effect   = "Allow"
        Action   = ["ce:GetCostAndUsage"]
        Resource = "*"
      }
    ]
  })
}

# --- Contact Lambda Role ---

resource "aws_iam_role" "lambda_contact" {
  name               = "${var.project_name}-lambda-contact-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "lambda_contact_basic" {
  role       = aws_iam_role.lambda_contact.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_contact_dynamodb" {
  name = "dynamodb-write"
  role = aws_iam_role.lambda_contact.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBWrite"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
        ]
        Resource = aws_dynamodb_table.platform_resume_events.arn
      }
    ]
  })
}

# --- Deployments Lambda Role ---

resource "aws_iam_role" "lambda_deployments" {
  name               = "${var.project_name}-lambda-deployments-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "lambda_deployments_basic" {
  role       = aws_iam_role.lambda_deployments.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_deployments_dynamodb" {
  name = "dynamodb-read"
  role = aws_iam_role.lambda_deployments.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBRead"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:BatchGetItem",
        ]
        Resource = aws_dynamodb_table.platform_resume_events.arn
      }
    ]
  })
}

# --- Healthcheck Lambda Role ---

resource "aws_iam_role" "lambda_healthcheck" {
  name               = "${var.project_name}-lambda-healthcheck-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "lambda_healthcheck_basic" {
  role       = aws_iam_role.lambda_healthcheck.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_healthcheck_dynamodb" {
  name = "dynamodb-write"
  role = aws_iam_role.lambda_healthcheck.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBWrite"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
        ]
        Resource = aws_dynamodb_table.platform_resume_events.arn
      }
    ]
  })
}

# =============================================================================
# CLOUDWATCH LOG GROUPS (created before Lambda functions)
# =============================================================================

resource "aws_cloudwatch_log_group" "lambda_health" {
  name              = "/aws/lambda/${var.project_name}-health"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_metrics" {
  name              = "/aws/lambda/${var.project_name}-metrics"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_contact" {
  name              = "/aws/lambda/${var.project_name}-contact"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_deployments" {
  name              = "/aws/lambda/${var.project_name}-deployments"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_healthcheck" {
  name              = "/aws/lambda/${var.project_name}-healthcheck"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.project_name}"
  retention_in_days = var.log_retention_days
}

# =============================================================================
# LAMBDA FUNCTIONS
# =============================================================================

resource "aws_lambda_function" "health" {
  function_name    = "${var.project_name}-health"
  description      = "Health check endpoint — stdlib only, no external deps"
  role             = aws_iam_role.lambda_health.arn
  filename         = data.archive_file.health_lambda.output_path
  source_code_hash = data.archive_file.health_lambda.output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  memory_size      = 128
  timeout          = 10

  environment {
    variables = {
      ALLOWED_ORIGIN = "https://${var.domain_name}"
      ENVIRONMENT    = var.environment
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_health,
    aws_iam_role_policy_attachment.lambda_health_basic,
  ]
}

resource "aws_lambda_function" "metrics" {
  function_name    = "${var.project_name}-metrics"
  description      = "Returns public-safe operational metrics from DynamoDB"
  role             = aws_iam_role.lambda_metrics.arn
  filename         = data.archive_file.metrics_lambda.output_path
  source_code_hash = data.archive_file.metrics_lambda.output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  memory_size      = 128
  timeout          = 30

  environment {
    variables = {
      EVENTS_TABLE_NAME = aws_dynamodb_table.platform_resume_events.name
      ALLOWED_ORIGIN    = "https://${var.domain_name}"
      ENVIRONMENT       = var.environment
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_metrics,
    aws_iam_role_policy_attachment.lambda_metrics_basic,
  ]
}

resource "aws_lambda_function" "contact" {
  function_name    = "${var.project_name}-contact"
  description      = "Handles contact form submissions with rate limiting"
  role             = aws_iam_role.lambda_contact.arn
  filename         = data.archive_file.contact_lambda.output_path
  source_code_hash = data.archive_file.contact_lambda.output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  memory_size      = 128
  timeout          = 30

  environment {
    variables = {
      EVENTS_TABLE_NAME = aws_dynamodb_table.platform_resume_events.name
      ALLOWED_ORIGIN    = "https://${var.domain_name}"
      ENVIRONMENT       = var.environment
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_contact,
    aws_iam_role_policy_attachment.lambda_contact_basic,
  ]
}

resource "aws_lambda_function" "deployments" {
  function_name    = "${var.project_name}-deployments"
  description      = "Returns sanitized list of recent deployment records"
  role             = aws_iam_role.lambda_deployments.arn
  filename         = data.archive_file.deployments_lambda.output_path
  source_code_hash = data.archive_file.deployments_lambda.output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  memory_size      = 128
  timeout          = 30

  environment {
    variables = {
      EVENTS_TABLE_NAME = aws_dynamodb_table.platform_resume_events.name
      ALLOWED_ORIGIN    = "https://${var.domain_name}"
      ENVIRONMENT       = var.environment
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_deployments,
    aws_iam_role_policy_attachment.lambda_deployments_basic,
  ]
}

resource "aws_lambda_function" "healthcheck" {
  function_name    = "${var.project_name}-healthcheck"
  description      = "Scheduled synthetic health monitor — writes results to DynamoDB"
  role             = aws_iam_role.lambda_healthcheck.arn
  filename         = data.archive_file.healthcheck_lambda.output_path
  source_code_hash = data.archive_file.healthcheck_lambda.output_base64sha256
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  memory_size      = 128
  timeout          = 60

  environment {
    variables = {
      EVENTS_TABLE_NAME = aws_dynamodb_table.platform_resume_events.name
      SITE_URL          = "https://${var.domain_name}"
      ENVIRONMENT       = var.environment
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_healthcheck,
    aws_iam_role_policy_attachment.lambda_healthcheck_basic,
  ]
}

# =============================================================================
# API GATEWAY (HTTP API v2)
# =============================================================================

resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-api-${var.environment}"
  protocol_type = "HTTP"
  description   = "Platform Resume Control Plane API"

  cors_configuration {
    allow_origins = ["https://${var.domain_name}", "https://www.${var.domain_name}"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 86400
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 50
    throttling_rate_limit  = 100
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      requestTime    = "$context.requestTime"
      sourceIp       = "$context.identity.sourceIp"
      httpMethod     = "$context.httpMethod"
    })
  }
}

# --- Lambda Integrations ---

resource "aws_apigatewayv2_integration" "health" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.health.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "metrics" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.metrics.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "contact" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.contact.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "deployments" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.deployments.invoke_arn
  payload_format_version = "2.0"
}

# --- Routes ---

resource "aws_apigatewayv2_route" "get_health" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /health"
  target    = "integrations/${aws_apigatewayv2_integration.health.id}"
}

resource "aws_apigatewayv2_route" "get_metrics" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /metrics"
  target    = "integrations/${aws_apigatewayv2_integration.metrics.id}"
}

resource "aws_apigatewayv2_route" "get_deployments" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /deployments"
  target    = "integrations/${aws_apigatewayv2_integration.deployments.id}"
}

resource "aws_apigatewayv2_route" "post_contact" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /contact"
  target    = "integrations/${aws_apigatewayv2_integration.contact.id}"
}

resource "aws_apigatewayv2_route" "options_proxy" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "OPTIONS /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.health.id}"
}

# --- Lambda permissions for API Gateway ---

resource "aws_lambda_permission" "apigw_health" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.health.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_metrics" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.metrics.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_contact" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.contact.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_deployments" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.deployments.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# =============================================================================
# EVENTBRIDGE — SCHEDULED HEALTHCHECK (every 15 minutes)
# =============================================================================

resource "aws_cloudwatch_event_rule" "healthcheck" {
  name                = "${var.project_name}-healthcheck-schedule"
  description         = "Trigger synthetic healthcheck Lambda every 15 minutes"
  schedule_expression = "rate(15 minutes)"
}

resource "aws_cloudwatch_event_target" "healthcheck" {
  rule      = aws_cloudwatch_event_rule.healthcheck.name
  target_id = "${var.project_name}-healthcheck"
  arn       = aws_lambda_function.healthcheck.arn
}

resource "aws_lambda_permission" "healthcheck_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.healthcheck.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.healthcheck.arn
}

# =============================================================================
# CLOUDWATCH ALARMS
# =============================================================================

# Lambda error alarms — 5 errors in 5 minutes

resource "aws_cloudwatch_metric_alarm" "lambda_health_errors" {
  alarm_name          = "${var.project_name}-health-lambda-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Health Lambda error count >= 5 in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.health.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_metrics_errors" {
  alarm_name          = "${var.project_name}-metrics-lambda-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Metrics Lambda error count >= 5 in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.metrics.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_contact_errors" {
  alarm_name          = "${var.project_name}-contact-lambda-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Contact Lambda error count >= 5 in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.contact.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_deployments_errors" {
  alarm_name          = "${var.project_name}-deployments-lambda-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Deployments Lambda error count >= 5 in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.deployments.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_healthcheck_errors" {
  alarm_name          = "${var.project_name}-healthcheck-lambda-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Healthcheck Lambda error count >= 5 in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.healthcheck.function_name
  }
}

# API Gateway 5xx alarm — 10 errors in 5 minutes

resource "aws_cloudwatch_metric_alarm" "apigw_5xx" {
  alarm_name          = "${var.project_name}-apigw-5xx-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "API Gateway 5xx error count >= 10 in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = aws_apigatewayv2_api.main.id
  }
}

# CloudFront 5xx rate alarm — 5% in 5 minutes

resource "aws_cloudwatch_metric_alarm" "cloudfront_5xx_rate" {
  alarm_name          = "${var.project_name}-cloudfront-5xx-rate"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 5
  alarm_description   = "CloudFront 5xx error rate >= 5% in 5 minutes"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DistributionId = aws_cloudfront_distribution.main.id
    Region         = "Global"
  }
}

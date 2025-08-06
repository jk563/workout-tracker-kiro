data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# Environment-based local values
locals {
  environment = terraform.workspace
  domain_name = local.environment == "production" ? "workout-tracker.jamiekelly.com" : "workout-tracker-dev.jamiekelly.com"
}

# Route 53 hosted zone data source
data "aws_route53_zone" "main" {
  name = "jamiekelly.com"
}

# ACM certificate for custom domain (must be in us-east-1 for CloudFront)
resource "aws_acm_certificate" "frontend" {
  provider          = aws.us_east_1
  domain_name       = local.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "workout-tracker-frontend-${local.environment}"
  }
}

# Route 53 CNAME records for certificate validation
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.frontend.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Certificate validation resource to wait for DNS validation completion
resource "aws_acm_certificate_validation" "frontend" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.frontend.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]

  timeouts {
    create = "5m"
  }
}

# Random ID for unique S3 bucket naming
resource "random_id" "bucket_suffix" {
  byte_length = 8
}

# S3 bucket for frontend static content
resource "aws_s3_bucket" "frontend" {
  bucket = "workout-tracker-kiro-frontend-${random_id.bucket_suffix.hex}"
}

# Block all public access to the S3 bucket
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable server-side encryption for the S3 bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CloudFront Origin Access Control for S3 access
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "workout-tracker-frontend-oac"
  description                       = "OAC for workout tracker frontend S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# S3 bucket policy to allow CloudFront access
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
}

# CloudFront distribution for frontend hosting
resource "aws_cloudfront_distribution" "frontend" {
  aliases = [local.domain_name]

  # S3 origin for frontend static content
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
    origin_id                = "S3-${aws_s3_bucket.frontend.bucket}"
  }

  # API Gateway origin for API endpoints
  origin {
    domain_name = "${aws_api_gateway_rest_api.workout_tracker_api.id}.execute-api.${data.aws_region.current.name}.amazonaws.com"
    origin_id   = "APIGateway-${aws_api_gateway_rest_api.workout_tracker_api.id}"
    origin_path = "/${aws_api_gateway_stage.workout_tracker_api.stage_name}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  # Ordered cache behavior for API endpoints
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "APIGateway-${aws_api_gateway_rest_api.workout_tracker_api.id}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "Accept"]
      cookies {
        forward = "all"
      }
    }

    # API responses should have minimal caching for dynamic content
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 300 # 5 minutes maximum cache for API responses
  }

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.frontend.bucket}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # Custom error response for SPA routing
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.frontend.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "workout-tracker-frontend"
  }
}

# Output current AWS account information for verification
output "aws_account_id" {
  description = "Current AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  description = "Current AWS region"
  value       = data.aws_region.current.name
}

# CloudFront distribution URL
output "cloudfront_url" {
  description = "CloudFront distribution URL for frontend access"
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

# S3 bucket name for deployment script
output "aws_s3_bucket_name" {
  description = "S3 bucket name for frontend hosting"
  value       = aws_s3_bucket.frontend.bucket
}

# Route 53 DNS A record for custom domain
resource "aws_route53_record" "frontend" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

# CloudFront distribution ID for cache invalidation
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidation"
  value       = aws_cloudfront_distribution.frontend.id
}

# Custom domain URL based on environment
output "custom_domain_url" {
  description = "Custom domain URL for frontend access based on environment"
  value       = "https://${local.domain_name}"
}

# Lambda function IAM role
resource "aws_iam_role" "lambda_execution_role" {
  name = "workout-tracker-lambda-execution-role-${local.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "workout-tracker-lambda-execution-role"
    Environment = local.environment
  }
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda function
resource "aws_lambda_function" "hello_world" {
  filename      = "../backend/core/athlete-forge.zip"
  function_name = "workout-tracker-athlete-forge-${local.environment}"
  role          = aws_iam_role.lambda_execution_role.arn
  handler       = "bootstrap"
  runtime       = "provided.al2"
  architectures = ["arm64"]
  timeout       = 30
  memory_size   = 128

  source_code_hash = filebase64sha256("../backend/core/athlete-forge.zip")

  environment {
    variables = {
      ENVIRONMENT = local.environment
    }
  }

  tags = {
    Name        = "workout-tracker-athlete-forge"
    Environment = local.environment
  }
}

# Lambda function outputs
output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.hello_world.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.hello_world.arn
}

output "lambda_invoke_arn" {
  description = "Invoke ARN of the Lambda function for API Gateway integration"
  value       = aws_lambda_function.hello_world.invoke_arn
}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "workout_tracker_api" {
  name        = "workout-tracker-api-${local.environment}"
  description = "REST API for workout tracker application"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name        = "workout-tracker-api"
    Environment = local.environment
    Project     = "workout-tracker-kiro"
  }
}

# API Gateway root /api resource
resource "aws_api_gateway_resource" "api_root" {
  rest_api_id = aws_api_gateway_rest_api.workout_tracker_api.id
  parent_id   = aws_api_gateway_rest_api.workout_tracker_api.root_resource_id
  path_part   = "api"
}

# API Gateway /test resource under /api
resource "aws_api_gateway_resource" "test" {
  rest_api_id = aws_api_gateway_rest_api.workout_tracker_api.id
  parent_id   = aws_api_gateway_resource.api_root.id
  path_part   = "test"
}

# API Gateway /health resource under /api
resource "aws_api_gateway_resource" "health" {
  rest_api_id = aws_api_gateway_rest_api.workout_tracker_api.id
  parent_id   = aws_api_gateway_resource.api_root.id
  path_part   = "health"
}

# GET method for /api/test endpoint
resource "aws_api_gateway_method" "test_get" {
  rest_api_id   = aws_api_gateway_rest_api.workout_tracker_api.id
  resource_id   = aws_api_gateway_resource.test.id
  http_method   = "GET"
  authorization = "NONE"
}

# GET method for /api/health endpoint
resource "aws_api_gateway_method" "health_get" {
  rest_api_id   = aws_api_gateway_rest_api.workout_tracker_api.id
  resource_id   = aws_api_gateway_resource.health.id
  http_method   = "GET"
  authorization = "NONE"
}

# OPTIONS method for /api/health endpoint (CORS preflight)
resource "aws_api_gateway_method" "health_options" {
  rest_api_id   = aws_api_gateway_rest_api.workout_tracker_api.id
  resource_id   = aws_api_gateway_resource.health.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Lambda proxy integration for /api/test GET method
resource "aws_api_gateway_integration" "test_lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.workout_tracker_api.id
  resource_id = aws_api_gateway_resource.test.id
  http_method = aws_api_gateway_method.test_get.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.hello_world.invoke_arn
}

# Lambda proxy integration for /api/health GET method
resource "aws_api_gateway_integration" "health_lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.workout_tracker_api.id
  resource_id = aws_api_gateway_resource.health.id
  http_method = aws_api_gateway_method.health_get.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.hello_world.invoke_arn
}

# CORS integration for /api/health OPTIONS method
resource "aws_api_gateway_integration" "health_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.workout_tracker_api.id
  resource_id = aws_api_gateway_resource.health.id
  http_method = aws_api_gateway_method.health_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# Method response for /api/health GET endpoint
resource "aws_api_gateway_method_response" "health_get_200" {
  rest_api_id = aws_api_gateway_rest_api.workout_tracker_api.id
  resource_id = aws_api_gateway_resource.health.id
  http_method = aws_api_gateway_method.health_get.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

# Method response for /api/health OPTIONS endpoint (CORS preflight)
resource "aws_api_gateway_method_response" "health_options_200" {
  rest_api_id = aws_api_gateway_rest_api.workout_tracker_api.id
  resource_id = aws_api_gateway_resource.health.id
  http_method = aws_api_gateway_method.health_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# Integration response for /api/health GET endpoint
resource "aws_api_gateway_integration_response" "health_get_200" {
  rest_api_id = aws_api_gateway_rest_api.workout_tracker_api.id
  resource_id = aws_api_gateway_resource.health.id
  http_method = aws_api_gateway_method.health_get.http_method
  status_code = aws_api_gateway_method_response.health_get_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }

  depends_on = [aws_api_gateway_integration.health_lambda_integration]
}

# Integration response for /api/health OPTIONS endpoint (CORS preflight)
resource "aws_api_gateway_integration_response" "health_options_200" {
  rest_api_id = aws_api_gateway_rest_api.workout_tracker_api.id
  resource_id = aws_api_gateway_resource.health.id
  http_method = aws_api_gateway_method.health_options.http_method
  status_code = aws_api_gateway_method_response.health_options_200.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [aws_api_gateway_integration.health_options_integration]
}

# Lambda permission to allow API Gateway invocation
resource "aws_lambda_permission" "api_gateway_invoke" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.hello_world.function_name
  principal     = "apigateway.amazonaws.com"

  # Configure proper source ARN for API Gateway integration
  source_arn = "${aws_api_gateway_rest_api.workout_tracker_api.execution_arn}/*/*"
}

# API Gateway deployment
resource "aws_api_gateway_deployment" "workout_tracker_api" {
  depends_on = [
    aws_api_gateway_method.test_get,
    aws_api_gateway_integration.test_lambda_integration,
    aws_api_gateway_method.health_get,
    aws_api_gateway_method.health_options,
    aws_api_gateway_integration.health_lambda_integration,
    aws_api_gateway_integration.health_options_integration,
    aws_api_gateway_method_response.health_get_200,
    aws_api_gateway_method_response.health_options_200,
    aws_api_gateway_integration_response.health_get_200,
    aws_api_gateway_integration_response.health_options_200,
  ]

  rest_api_id = aws_api_gateway_rest_api.workout_tracker_api.id

  triggers = {
    # Redeploy when API configuration changes
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.api_root.id,
      aws_api_gateway_resource.test.id,
      aws_api_gateway_resource.health.id,
      aws_api_gateway_method.test_get.id,
      aws_api_gateway_method.health_get.id,
      aws_api_gateway_method.health_options.id,
      aws_api_gateway_integration.test_lambda_integration.id,
      aws_api_gateway_integration.health_lambda_integration.id,
      aws_api_gateway_integration.health_options_integration.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# IAM role for API Gateway CloudWatch logging
resource "aws_iam_role" "api_gateway_cloudwatch" {
  name = "workout-tracker-api-gateway-cloudwatch-${local.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "workout-tracker-api-gateway-cloudwatch"
    Environment = local.environment
    Project     = "workout-tracker-kiro"
  }
}

# Attach CloudWatch logs policy to API Gateway role
resource "aws_iam_role_policy_attachment" "api_gateway_cloudwatch" {
  role       = aws_iam_role.api_gateway_cloudwatch.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

# API Gateway account configuration for CloudWatch logging
resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch.arn
}

# CloudWatch log group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "API-Gateway-Execution-Logs_${aws_api_gateway_rest_api.workout_tracker_api.id}/${local.environment}"
  retention_in_days = 14

  tags = {
    Name        = "workout-tracker-api-logs-${local.environment}"
    Environment = local.environment
    Project     = "workout-tracker-kiro"
  }
}

# API Gateway stage
resource "aws_api_gateway_stage" "workout_tracker_api" {
  deployment_id = aws_api_gateway_deployment.workout_tracker_api.id
  rest_api_id   = aws_api_gateway_rest_api.workout_tracker_api.id
  stage_name    = local.environment

  # Stage configuration
  cache_cluster_enabled = false
  xray_tracing_enabled  = false

  # Access logging configuration
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId        = "$context.requestId"
      ip               = "$context.identity.sourceIp"
      caller           = "$context.identity.caller"
      user             = "$context.identity.user"
      requestTime      = "$context.requestTime"
      httpMethod       = "$context.httpMethod"
      resourcePath     = "$context.resourcePath"
      status           = "$context.status"
      protocol         = "$context.protocol"
      responseLength   = "$context.responseLength"
      responseTime     = "$context.responseTime"
      error            = "$context.error.message"
      integrationError = "$context.integration.error"
    })
  }

  tags = {
    Name        = "workout-tracker-api-${local.environment}"
    Environment = local.environment
    Project     = "workout-tracker-kiro"
  }
}

# Method settings for health endpoint logging
resource "aws_api_gateway_method_settings" "health_logging" {
  rest_api_id = aws_api_gateway_rest_api.workout_tracker_api.id
  stage_name  = aws_api_gateway_stage.workout_tracker_api.stage_name
  method_path = "${aws_api_gateway_resource.health.path_part}/GET"

  settings {
    metrics_enabled    = true
    logging_level      = "INFO"
    data_trace_enabled = true
  }
}



# API Gateway outputs
output "api_gateway_url" {
  description = "API Gateway URL for the deployed stage"
  value       = "https://${aws_api_gateway_rest_api.workout_tracker_api.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${aws_api_gateway_stage.workout_tracker_api.stage_name}"
}

output "api_gateway_id" {
  description = "API Gateway ID for reference"
  value       = aws_api_gateway_rest_api.workout_tracker_api.id
}

output "api_gateway_stage_name" {
  description = "API Gateway stage name"
  value       = aws_api_gateway_stage.workout_tracker_api.stage_name
}

output "health_endpoint_url" {
  description = "Health check endpoint URL"
  value       = "https://${aws_api_gateway_rest_api.workout_tracker_api.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${aws_api_gateway_stage.workout_tracker_api.stage_name}/api/health"
}
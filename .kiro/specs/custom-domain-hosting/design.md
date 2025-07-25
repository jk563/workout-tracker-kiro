# Design Document

## Overview

This design extends the existing S3 CloudFront hosting infrastructure to add custom domain support for the workout tracker application. The solution configures custom domains for production (`workout-tracker.jamiekelly.com`) and development (`workout-tracker-dev.jamiekelly.com`) environments using AWS Certificate Manager (ACM) for SSL certificates and Route 53 for DNS management. The design handles the critical requirement that ACM certificates for CloudFront must be created in the `us-east-1` region while keeping other resources in the default region.

## Architecture

### High-Level Architecture
```
Internet → Route 53 DNS → CloudFront Distribution (Custom Domain + SSL) → Origin Access Control → Private S3 Bucket
                                    ↓
                            ACM Certificate (us-east-1)
                                    ↓
                            SPA Routing (404 → index.html)
```

### Multi-Region Architecture
- **Primary Region**: Default region for S3, CloudFront, Route 53 records
- **us-east-1 Region**: ACM certificates only (CloudFront requirement)
- **DNS Validation**: Route 53 CNAME records for automatic certificate validation

### Component Relationships
- **Route 53 Hosted Zone**: Existing `jamiekelly.com` zone for DNS management
- **ACM Certificates**: SSL certificates in us-east-1 for CloudFront compatibility
- **CloudFront Distribution**: Enhanced with custom domain aliases and SSL configuration
- **Environment-based Configuration**: Local values determine domain names based on environment

## Components and Interfaces

### Environment Configuration
- **Environment Detection**: Use Terraform locals to determine environment
- **Domain Mapping**:
  - Production: `workout-tracker.jamiekelly.com`
  - Development: `workout-tracker-dev.jamiekelly.com`
- **Local Values**:
```hcl
locals {
  environment = terraform.workspace == "production" ? "production" : "development"
  domain_name = local.environment == "production" ? 
    "workout-tracker.jamiekelly.com" : 
    "workout-tracker-dev.jamiekelly.com"
}
```

### ACM Certificate Configuration (us-east-1)
- **Purpose**: SSL certificates for CloudFront custom domains
- **Region**: Must be created in `us-east-1` for CloudFront compatibility
- **Validation**: DNS validation using Route 53 CNAME records
- **Coverage**: Single certificate covering the environment-specific subdomain
- **Provider Configuration**:
```hcl
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

resource "aws_acm_certificate" "frontend" {
  provider          = aws.us_east_1
  domain_name       = local.domain_name
  validation_method = "DNS"
}
```

### Route 53 DNS Configuration
- **Hosted Zone**: Use existing `jamiekelly.com` hosted zone
- **DNS Records**: ALIAS records pointing to CloudFront distribution
- **Validation Records**: Automatic CNAME records for ACM certificate validation
- **Configuration**:
```hcl
data "aws_route53_zone" "main" {
  name = "jamiekelly.com"
}

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
```

### Enhanced CloudFront Distribution
- **Custom Domain**: Add aliases for environment-specific domains
- **SSL Configuration**: Reference ACM certificate from us-east-1
- **Security Policy**: Minimum TLS 1.2 for security
- **Configuration Updates**:
```hcl
resource "aws_cloudfront_distribution" "frontend" {
  aliases = [local.domain_name]
  
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.frontend.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  # ... existing configuration
}
```

### Certificate Validation
- **Automatic Validation**: Route 53 records created automatically
- **Validation Records**: CNAME records for domain ownership proof
- **Configuration**:
```hcl
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
```

## Data Models

### Terraform Resource Structure
```hcl
# Environment-based locals
locals {
  environment = terraform.workspace == "production" ? "production" : "development"
  domain_name = local.environment == "production" ? 
    "workout-tracker.jamiekelly.com" : 
    "workout-tracker-dev.jamiekelly.com"
}

# US East 1 provider for ACM
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# Existing hosted zone lookup
data "aws_route53_zone" "main" {
  name = "jamiekelly.com"
}

# ACM certificate in us-east-1
resource "aws_acm_certificate" "frontend" {
  provider          = aws.us_east_1
  domain_name       = local.domain_name
  validation_method = "DNS"
  
  lifecycle {
    create_before_destroy = true
  }
}

# Certificate validation records
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

# Certificate validation
resource "aws_acm_certificate_validation" "frontend" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.frontend.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Enhanced CloudFront distribution
resource "aws_cloudfront_distribution" "frontend" {
  aliases = [local.domain_name]
  
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.frontend.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
  
  # ... existing origin and cache behavior configuration
}

# Route 53 DNS record
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
```

### Updated Deployment Script Structure
```bash
#!/bin/bash

# Parse environment parameter
ENVIRONMENT=${1:-development}

# Validate environment
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "development" ]]; then
    echo "Error: Environment must be 'production' or 'development'"
    exit 1
fi

# Set domain based on environment
if [[ "$ENVIRONMENT" == "production" ]]; then
    DOMAIN="workout-tracker.jamiekelly.com"
else
    DOMAIN="workout-tracker-dev.jamiekelly.com"
fi

# Build frontend application
cd app/web && npm run build

# Get infrastructure outputs for the environment
BUCKET_NAME=$(terraform -chdir=infrastructure output -raw aws_s3_bucket_name)
DISTRIBUTION_ID=$(terraform -chdir=infrastructure output -raw cloudfront_distribution_id)

# Sync to S3 bucket
aws s3 sync dist/ s3://$BUCKET_NAME --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

echo "Deployment complete! Application available at: https://$DOMAIN"
```

## Error Handling

### Certificate Creation Errors
- **Region Mismatch**: Ensure ACM certificate is created in us-east-1
- **Validation Timeout**: Handle DNS propagation delays for validation records
- **Domain Ownership**: Verify access to jamiekelly.com hosted zone

### DNS Configuration Errors
- **Hosted Zone Access**: Verify permissions to modify jamiekelly.com zone
- **Record Conflicts**: Handle existing DNS records for subdomains
- **Propagation Delays**: Account for DNS propagation time

### CloudFront Configuration Errors
- **Certificate Attachment**: Ensure certificate is validated before use
- **Domain Conflicts**: Handle existing CloudFront distributions with same aliases
- **SSL Policy Errors**: Validate minimum TLS version compatibility

### Deployment Script Errors
- **Environment Validation**: Validate environment parameter input
- **Domain Resolution**: Verify custom domain resolves correctly
- **Certificate Issues**: Handle SSL certificate validation errors

## Testing Strategy

### Infrastructure Testing
1. **Multi-Region Validation**: Verify ACM certificate created in us-east-1
2. **DNS Resolution**: Test custom domain DNS resolution
3. **SSL Certificate**: Verify certificate is valid and properly attached
4. **Environment Isolation**: Test both production and development configurations

### Certificate Testing
1. **DNS Validation**: Verify automatic CNAME record creation
2. **Certificate Status**: Confirm certificate reaches "ISSUED" status
3. **CloudFront Integration**: Test certificate attachment to distribution
4. **SSL Handshake**: Verify HTTPS connections work correctly

### Domain Testing
1. **Custom Domain Access**: Test application loading via custom domains
2. **HTTPS Redirect**: Verify HTTP requests redirect to HTTPS
3. **SPA Routing**: Test client-side routing works with custom domains
4. **Cache Behavior**: Verify caching works correctly with custom domains

### Deployment Testing
1. **Environment Parameter**: Test deployment script with both environments
2. **Domain Output**: Verify correct domain URL is displayed after deployment
3. **Cache Invalidation**: Test cache invalidation works with custom domains
4. **Error Handling**: Test deployment script error scenarios

## Implementation Notes

### Security Considerations
- **TLS 1.2 Minimum**: Enforce modern SSL/TLS protocols
- **Certificate Validation**: Use DNS validation for automated renewal
- **HTTPS Only**: Redirect all HTTP traffic to HTTPS
- **Domain Ownership**: Verify control of jamiekelly.com domain

### Performance Optimizations
- **ALIAS Records**: Use Route 53 ALIAS records for better performance
- **Certificate Caching**: ACM handles certificate caching automatically
- **DNS TTL**: Optimize DNS record TTL for balance of performance and flexibility

### Cost Considerations
- **ACM Certificates**: Free for AWS services like CloudFront
- **Route 53 Queries**: Minimal cost for DNS queries
- **Multi-Region**: No additional costs for us-east-1 certificate storage

### Environment Management
- **Terraform Workspaces**: Use workspaces for environment separation
- **Local Values**: Environment-specific configuration via locals
- **Deployment Isolation**: Separate deployments per environment

### Future Extensibility
- **Additional Subdomains**: Easy to add more subdomains to certificate
- **Multiple Environments**: Can extend to staging, testing environments
- **Monitoring**: Can add Route 53 health checks and CloudWatch alarms
- **CDN Optimization**: Can add Lambda@Edge for advanced routing
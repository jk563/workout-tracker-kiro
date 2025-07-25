# Infrastructure Architecture

## S3 CloudFront Hosting Pattern with Custom Domains

### Core Components
- **S3 Bucket**: Private bucket with server-side encryption (AES256)
- **CloudFront Distribution**: CDN with Origin Access Control (OAC) and custom domain aliases
- **Origin Access Control**: Secure S3 access via CloudFront service principal
- **Bucket Policy**: Restricts S3 access to CloudFront distribution only
- **ACM Certificate**: SSL certificates in us-east-1 for CloudFront custom domains
- **Route 53 DNS**: ALIAS records pointing custom domains to CloudFront

### Multi-Region Configuration
- **Primary Region**: S3, CloudFront, Route 53 records in default region
- **us-east-1 Region**: ACM certificates only (CloudFront requirement)
- **Provider Configuration**: Use provider alias for us-east-1 region

### Environment-Based Domain Configuration
- **Environment Detection**: `terraform.workspace` determines environment
- **Domain Mapping**:
  - Production: `workout-tracker.jamiekelly.com`
  - Development: `workout-tracker-dev.jamiekelly.com`
- **Local Values Pattern**: Use locals to map workspace to domain names

### Security Configuration
- All public S3 access blocked via `aws_s3_bucket_public_access_block`
- CloudFront OAC uses `sigv4` signing with `always` behavior
- S3 bucket policy conditions on `AWS:SourceArn` for distribution access
- HTTPS redirect enforced via `viewer_protocol_policy = "redirect-to-https"`
- SSL certificates with minimum TLS 1.2 via `minimum_protocol_version = "TLSv1.2_2021"`

### ACM Certificate Configuration
- **Region Requirement**: Must be created in us-east-1 for CloudFront
  - CloudFront only accepts certificates from us-east-1 region
  - Use provider alias to create certificates in correct region
  - All other resources can remain in default region
- **Validation Method**: DNS validation using Route 53 CNAME records
- **Auto-Renewal**: Automatic renewal via DNS validation records
- **Certificate Validation**: Use for_each loop to create validation records automatically
- **Lifecycle Management**: Use create_before_destroy to prevent downtime during updates

### Route 53 DNS Configuration
- **Hosted Zone**: Use existing `jamiekelly.com` zone via data source
- **DNS Records**: ALIAS records for optimal performance and cost
- **Validation Records**: Automatic CNAME records for certificate validation
- **DNS Configuration Best Practices**:
  - Use ALIAS records instead of CNAME for root domains and better performance
  - Set `allow_overwrite = true` for validation records to handle certificate renewals
  - Use short TTL (60 seconds) for validation records for faster propagation
  - Reference CloudFront distribution's `hosted_zone_id` for ALIAS target
  - Use for_each loop to create validation records automatically from certificate domain validation options

### SPA Support
- Default root object: `index.html`
- Custom error response: 404 → 200 with `/index.html` for client-side routing
- Cache behavior allows all HTTP methods for API compatibility

### Naming Convention
- Bucket: `workout-tracker-kiro-frontend-{random_hex}`
- OAC: `workout-tracker-frontend-oac`
- Distribution tag: `workout-tracker-frontend`
- Certificate: Environment-specific domain name

### Required Outputs
- `custom_domain_url`: Environment-specific custom domain URL
- `cloudfront_url`: CloudFront distribution URL (backward compatibility)
- `aws_s3_bucket_name`: For deployment script
- `cloudfront_distribution_id`: For cache invalidation
- `acm_certificate_arn`: Certificate ARN for reference

### Terraform Workspace Management
- **Development Workspace**: Default workspace for development environment
- **Production Workspace**: Separate workspace for production deployments
- **Workspace Commands**:
  - `terraform workspace new development`
  - `terraform workspace new production`
  - `terraform workspace select <environment>`

### Deployment Pattern
- Build frontend in `app/web` directory
- Accept environment parameter: `./deploy-frontend.sh [production|development]`
- Sync `dist/` to S3 with `--delete` flag
- Invalidate CloudFront cache with `/*` paths
- Display custom domain URL after successful deployment
- Default to development environment if no parameter provided

#### Deployment Script Usage
```bash
# Deploy to development environment (default)
./deploy-frontend.sh
./deploy-frontend.sh development

# Deploy to production environment
./deploy-frontend.sh production
```



#### Environment-Specific Deployment Workflow
1. **Parameter Validation**: Script validates environment parameter
2. **Domain Resolution**: Maps environment to correct custom domain
3. **Workspace Selection**: Switches to appropriate Terraform workspace
4. **Build Process**: Builds frontend application in `app/web`
5. **Infrastructure Outputs**: Retrieves S3 bucket and CloudFront distribution ID
6. **File Sync**: Syncs built files to environment-specific S3 bucket
7. **Cache Invalidation**: Invalidates CloudFront cache for immediate updates
8. **Success Confirmation**: Displays custom domain URL for verification

### Cost Optimization
- Price class: `PriceClass_100` (US, Canada, Europe)
- Default TTL: 3600 seconds (1 hour)
- Compression enabled for bandwidth savings
- ACM certificates are free for AWS services

## Lambda Function Deployment Pattern

### Core Components
- **Lambda Function**: Serverless compute with ARM64 architecture
- **IAM Execution Role**: Basic execution permissions with CloudWatch logging
- **Environment Variables**: Environment-specific configuration
- **CloudWatch Logs**: Structured JSON logging with zerolog

### Lambda Configuration
- **Runtime**: `provided.al2` (custom runtime for Go)
- **Architecture**: `arm64` (cost-effective and performant)
- **Memory**: 128 MB (minimum for cost optimization)
- **Timeout**: 30 seconds (reasonable default)
- **Handler**: Binary name matching the executable

### IAM Role Configuration
- **Role Name**: `workout-tracker-lambda-execution-role-{environment}`
- **Trust Policy**: Lambda service principal
- **Managed Policy**: `AWSLambdaBasicExecutionRole` for CloudWatch logging
- **Environment Tags**: Consistent tagging with environment and project

### Deployment Package
- **Format**: ZIP file containing Go binary
- **Binary Name**: Must match handler configuration
- **Source Code Hash**: Terraform tracks changes via `filebase64sha256()`
- **Location**: `../backend/core/lambda-hello-world.zip`

### Environment-Specific Naming
- **Function Name**: `workout-tracker-hello-world-{environment}`
- **Log Group**: `/aws/lambda/workout-tracker-hello-world-{environment}`
- **IAM Role**: `workout-tracker-lambda-execution-role-{environment}`

### Required Outputs
- `lambda_function_name`: Function name for invocation
- `lambda_function_arn`: Full ARN for resource references
- `lambda_invoke_arn`: API Gateway integration ARN

### Testing Pattern
- Use AWS CLI with `AWS_PROFILE=jk` for authentication
- Test with empty payload: `aws lambda invoke --function-name {function-name} --payload '{}' response.json`
- Verify response structure: `{"statusCode":200,"body":"Hello World"}`
- Check CloudWatch logs for structured JSON logging

### Go Lambda Best Practices
- Use `github.com/aws/aws-lambda-go/lambda` runtime
- Implement structured logging with `github.com/rs/zerolog`
- Configure log level via `LOG_LEVEL` environment variable
- Use JSON output for CloudWatch structured logging
- Include service name, timestamps, and execution metrics in logs
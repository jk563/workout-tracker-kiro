#!/bin/bash
set -e

# Parse environment parameter
ENVIRONMENT=${1:-development}

# Validate environment parameter
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "development" ]]; then
    echo "Error: Environment must be 'production' or 'development'"
    echo "Usage: $0 [production|development]"
    echo "Defaults to 'development' if no parameter is provided"
    exit 1
fi

echo "Deploying to $ENVIRONMENT environment..."

# Set domain based on environment
if [[ "$ENVIRONMENT" == "production" ]]; then
    DOMAIN="workout-tracker.jamiekelly.com"
else
    DOMAIN="workout-tracker-dev.jamiekelly.com"
fi

# Switch to appropriate Terraform workspace
cd infrastructure
echo "Switching to $ENVIRONMENT workspace..."
AWS_PROFILE=jk terraform workspace select "$ENVIRONMENT" || {
    echo "Error: Failed to switch to $ENVIRONMENT workspace"
    echo "Make sure the workspace exists. Create it with: terraform workspace new $ENVIRONMENT"
    exit 1
}

# Get infrastructure details
BUCKET_NAME=$(AWS_PROFILE=jk terraform output -raw aws_s3_bucket_name)
DISTRIBUTION_ID=$(AWS_PROFILE=jk terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")

# Build frontend
cd ../app/web
echo "Building frontend application..."
[ ! -d "node_modules" ] && npm install
npm run build

# Deploy to S3
cd build
echo "Syncing files to S3 bucket: $BUCKET_NAME"
AWS_PROFILE=jk aws s3 sync . "s3://$BUCKET_NAME" --delete

# Invalidate CloudFront cache and wait for completion
if [ -n "$DISTRIBUTION_ID" ]; then
  echo "Invalidating CloudFront cache..."
  INVALIDATION_ID=$(AWS_PROFILE=jk aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*" --query 'Invalidation.Id' --output text)
  echo "Waiting for invalidation $INVALIDATION_ID to complete..."
  AWS_PROFILE=jk aws cloudfront wait invalidation-completed --distribution-id "$DISTRIBUTION_ID" --id "$INVALIDATION_ID"
  echo "Cache invalidation completed!"
fi

# Show custom domain URL
cd ../../../infrastructure
CUSTOM_DOMAIN_URL=$(AWS_PROFILE=jk terraform output -raw custom_domain_url 2>/dev/null || echo "")
CLOUDFRONT_URL=$(AWS_PROFILE=jk terraform output -raw cloudfront_url 2>/dev/null || echo "")

echo ""
echo "=== Deployment Complete ==="
if [ -n "$CUSTOM_DOMAIN_URL" ]; then
    echo "Custom Domain: $CUSTOM_DOMAIN_URL"
else
    echo "Custom Domain: https://$DOMAIN (may take a few minutes to be available)"
fi

if [ -n "$CLOUDFRONT_URL" ]; then
    echo "CloudFront URL: $CLOUDFRONT_URL"
fi
echo "=========================="
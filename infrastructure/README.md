# Terraform Infrastructure

This directory contains the Terraform configuration for the workout tracker application infrastructure.

## Terraform Workspaces

This infrastructure uses Terraform workspaces for environment separation:

- **development**: Development environment (default)
- **production**: Production environment

### Workspace Commands

1. **List available workspaces**:
   ```bash
   terraform workspace list
   ```

2. **Switch to development workspace**:
   ```bash
   terraform workspace select development
   ```

3. **Switch to production workspace**:
   ```bash
   terraform workspace select production
   ```

4. **Show current workspace**:
   ```bash
   terraform workspace show
   ```

## Steps to Plan and Run Terraform

1. **Navigate to infrastructure directory**:
   ```bash
   cd infrastructure
   ```

2. **Initialize Terraform**:
   ```bash
   AWS_PROFILE=jk terraform init
   ```

3. **Select appropriate workspace** (development is default):
   ```bash
   AWS_PROFILE=jk terraform workspace select development
   # or
   AWS_PROFILE=jk terraform workspace select production
   ```

4. **Validate configuration**:
   ```bash
   AWS_PROFILE=jk terraform validate
   ```

5. **Format code**:
   ```bash
   terraform fmt
   ```

6. **Plan deployment**:
   ```bash
   AWS_PROFILE=jk terraform plan
   ```

7. **Apply configuration**:
   ```bash
   AWS_PROFILE=jk terraform apply
   ```

## S3 CloudFront Hosting Deployment

After applying the Terraform configuration, deploy the frontend application:

1. **Run deployment script**:
   ```bash
   ./deploy-frontend.sh
   ```

2. **Access application**:
   ```bash
   terraform output cloudfront_url
   ```
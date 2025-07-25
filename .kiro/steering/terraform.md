---
inclusion: fileMatch
fileMatchPattern: '*.tf'
---

# Terraform Infrastructure Guidelines

## AWS Profile Configuration
- Always use `AWS_PROFILE=jk` when running Terraform commands
- This ensures correct AWS credentials are used for all operations
- Example: `AWS_PROFILE=jk terraform init`

## File Organization Standards
- `terraform.tf` - Terraform version constraints and backend configuration
- `providers.tf` - Provider configurations with default tags
- `main.tf` - Main resources and data sources
- `README.md` - Comprehensive documentation with setup instructions

## Backend Configuration Best Practices
- Use S3 backend with state locking
- Backend configuration:
  - Bucket: `jamiekelly-terraform-state`
  - Key: `infrastructure/terraform.tfstate`
  - Region: `eu-west-2`
  - Use `use_lockfile = true` (not deprecated `dynamodb_table`)
  - Enable encryption: `encrypt = true`

## Provider Configuration Standards
- Default region: `eu-west-2`
- Always include default tags:
  - `Project`: `workout-tracker-kiro`
  - `Environment`: `development`
  - `ManagedBy`: `terraform`
- Use AWS provider version constraint: `~> 5.0`

## Development Workflow
1. Always run commands from the `infrastructure/` directory
2. Use AWS profile: `AWS_PROFILE=jk terraform <command>`
3. Standard workflow:
   - `terraform init` - Initialize backend and download providers
   - `terraform validate` - Validate configuration syntax
   - `terraform fmt` - Format code consistently
   - `terraform plan` - Review planned changes
   - `terraform apply` - Apply changes

## Code Quality Standards
- Run `terraform fmt` to ensure consistent formatting
- Use `terraform validate` to check syntax
- Follow HashiCorp naming conventions
- Use data sources for account verification (aws_caller_identity, aws_region)

## Error Handling
- Provide troubleshooting steps for credential issues
- Include guidance for backend access problems
- Explain provider download failures and solutions

## Security Practices
- Never hardcode credentials in configuration files
- Use AWS credential chain (profiles, environment variables, IAM roles)
- Enable state encryption in S3 backend
- Use state locking for concurrent access protection
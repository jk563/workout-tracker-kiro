# Design Document

## Overview

This design establishes a foundational Terraform configuration for AWS infrastructure management following HashiCorp best practices. The configuration will be organized in a dedicated `./infrastructure` directory and will use S3 remote state backend with DynamoDB state locking for reliable state management.

## Architecture

### Directory Structure
```
./infrastructure/
├── main.tf           # Main configuration with data sources
├── providers.tf      # Provider configurations
├── terraform.tf      # Terraform settings and backend configuration
└── README.md         # Documentation
```

### State Management Architecture
- **Remote State Backend**: AWS S3 bucket (`jamiekelly-terraform-state`)
- **State Locking**: DynamoDB table (`jamiekelly-terraform-state-locaking`) 
- **Region**: All resources and state management in `eu-west-2`
- **State Key**: `infrastructure/terraform.tfstate` for organized state storage

## Components and Interfaces

### Terraform Configuration Block (`terraform.tf`)
- **Purpose**: Define Terraform version constraints and backend configuration
- **Key Elements**:
  - Latest Terraform minor version constraint
  - AWS provider version constraint (~> 5.0)
  - S3 backend configuration with DynamoDB locking
  - Required providers block

### Provider Configuration (`providers.tf`)
- **Purpose**: Configure AWS provider with regional settings
- **Key Elements**:
  - AWS provider with eu-west-2 region
  - Default tags for project and environment identification
  - Profile/credential configuration (using default AWS credential chain)

### Main Configuration (`main.tf`)
- **Purpose**: Main entry point with data sources for verification
- **Key Elements**:
  - Data source for current AWS account ID
  - Data source for current AWS region
  - Verification that configuration is working

## Data Models

### Backend Configuration
```hcl
terraform {
  backend "s3" {
    bucket         = "jamiekelly-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "eu-west-2"
    dynamodb_table = "jamiekelly-terraform-state-locaking"
    encrypt        = true
  }
}
```

### Provider Configuration
```hcl
provider "aws" {
  region = "eu-west-2"
  
  default_tags {
    tags = {
      Environment = "development"
      Project     = "workout-tracker=kiro"
    }
  }
}
```

### Data Sources
```hcl
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
```

## Error Handling

### Terraform Initialization Errors
- **Backend Access**: Verify AWS credentials have S3 and DynamoDB permissions
- **State Bucket**: Confirm `jamiekelly-terraform-state` bucket exists and is accessible
- **DynamoDB Table**: Confirm `jamiekelly-terraform-state-locaking` table exists with correct schema

### Provider Configuration Errors
- **Region Validation**: Ensure eu-west-2 is available and accessible
- **Credential Chain**: Use AWS credential precedence (environment variables, profiles, IAM roles)

### Version Constraint Errors
- **Terraform Version**: Use latest minor version for current features
- **Provider Version**: Pin AWS provider to ~> 5.0 for compatibility

## Testing Strategy

### Initialization Testing
1. **terraform init**: Verify backend initialization and provider download
2. **terraform validate**: Confirm syntax and configuration validity
3. **terraform plan**: Ensure planning works without errors (no resources initially)
4. **terraform apply**: Test apply process (should complete with no changes)

### Configuration Validation
1. **Format Check**: Run `terraform fmt -check` to verify formatting
2. **Validation**: Run `terraform validate` for configuration validation
3. **Security Scan**: Optional security scanning with tools like tfsec

### State Management Testing
1. **State Lock**: Verify DynamoDB locking during operations
2. **State Storage**: Confirm state is stored in correct S3 location
3. **State Encryption**: Verify state encryption is enabled

### Integration Testing
1. **AWS Connectivity**: Test AWS provider authentication
2. **Backend Connectivity**: Verify S3 and DynamoDB access
3. **Region Configuration**: Confirm all operations target eu-west-2

## Implementation Notes

### HashiCorp Best Practices Applied
- Consistent file organization with logical separation
- Proper version constraints for reproducibility
- Proper formatting and documentation
- Default provider configuration included
- Default tags applied at provider level

### Security Considerations
- State encryption enabled in S3 backend
- DynamoDB state locking for concurrent access protection
- No hardcoded credentials in configuration files
- Use of AWS credential chain for authentication

### Future Extensibility
- Modular file structure supports easy expansion
- Data sources provide account verification
- Tagged resources for management and cost tracking
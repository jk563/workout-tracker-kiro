# Implementation Plan

- [x] 1. Create Terraform workspaces for environment separation
  - Create development workspace and switch existing infrastructure to it
  - Create production workspace for future production deployments
  - Document workspace usage and switching commands
  - _Requirements: 4.1, 4.4_

- [x] 2. Add us-east-1 provider configuration for ACM certificates
  - Add AWS provider alias for us-east-1 region in Terraform configuration
  - Configure provider with appropriate region setting for ACM certificate creation
  - _Requirements: 2.1_

- [x] 3. Add environment-based local values and Route 53 hosted zone data source
  - Add local values to determine environment from Terraform workspace
  - Create domain name mapping based on environment (production: workout-tracker.jamiekelly.com, development: workout-tracker-dev.jamiekelly.com)
  - Add data source to reference existing jamiekelly.com hosted zone
  - _Requirements: 1.1, 1.2, 3.4, 4.2, 4.3_

- [x] 4. Create ACM certificate with DNS validation in us-east-1 region
  - Implement ACM certificate resource using us-east-1 provider for environment-specific domain
  - Set DNS validation method for automatic renewal
  - Add lifecycle rule to create before destroy
  - Create Route 53 CNAME records for certificate validation using for_each loop
  - Add certificate validation resource to wait for DNS validation completion
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5. Update CloudFront distribution with custom domain and SSL configuration
  - Add aliases configuration to existing CloudFront distribution for custom domain
  - Configure viewer certificate with ACM certificate ARN from validation
  - Set SSL support method to SNI-only and minimum TLS version to 1.2
  - Ensure HTTPS-only access through viewer protocol policy
  - _Requirements: 1.3, 1.4, 2.5_

- [x] 6. Create Route 53 DNS records for custom domain
  - Implement Route 53 A record with ALIAS configuration pointing to CloudFront distribution
  - Use CloudFront distribution domain name and hosted zone ID for alias target
  - Configure record in jamiekelly.com hosted zone
  - _Requirements: 3.1, 3.2_

- [x] 7. Update Terraform outputs for custom domain information
  - Add output for custom domain URL based on environment
  - Add output for ACM certificate ARN for reference
  - Maintain backward compatibility with existing CloudFront URL output
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 11. Update deployment script with environment parameter support
  - Modify deployment script to accept environment parameter (production or development)
  - Add environment validation and default to development if not specified
  - Update domain URL display based on environment parameter
  - Add error handling for invalid environment values
  - Update script to show custom domain URL after successful deployment
  - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6_

- [x] 12. Update infrastructure steering documentation
  - Add custom domain configuration patterns to infrastructure steering
  - Document ACM certificate us-east-1 requirement
  - Include environment-based domain mapping
  - Add Route 53 DNS configuration patterns
  - Document deployment script usage with environment parameters
  - _Requirements: 5.2, 5.3_
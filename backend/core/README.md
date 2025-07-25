# Lambda Hello World

A simple AWS Lambda function written in Go that returns "Hello World" when invoked. The function uses zerolog for structured logging and follows Go best practices for code organization and testing.

## Project Structure

```
backend/core/
├── go.mod                 # Go module definition
├── go.sum                 # Dependency checksums
├── main.go               # Lambda entry point
├── handler/              # Handler logic package
│   ├── handler.go        # Core handler implementation
│   └── handler_test.go   # Unit tests for handler
├── integration_test.go   # Integration tests
└── README.md            # This documentation
```

## Dependencies

- `github.com/aws/aws-lambda-go` - AWS Lambda Go runtime
- `github.com/rs/zerolog` - Structured logging

## Building

To build the Lambda function for deployment:

```bash
# Build for AWS Lambda (arm64 architecture - recommended)
GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -tags lambda.norpc -o bootstrap main.go

# Build for AWS Lambda (x86_64 architecture - alternative)
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -tags lambda.norpc -o bootstrap main.go

# Build for local development/testing
go build -o lambda-hello-world main.go
```

The build produces a `bootstrap` binary that can be packaged and deployed to AWS Lambda using the `provided.al2023` runtime.

### Creating Deployment Package

After building, create a deployment package:

```bash
# Create zip file for deployment
zip lambda-hello-world.zip bootstrap
```

## Testing

### Run All Tests
```bash
# Run all tests with coverage
go test -v -cover ./...
```

### Run Unit Tests Only
```bash
# Run handler unit tests
go test -v ./handler/
```

### Run Integration Tests Only
```bash
# Run integration tests
go test -v -run Integration
```

### Generate Detailed Coverage Report
```bash
# Generate coverage profile
go test -coverprofile=coverage.out ./...

# View coverage report in browser
go tool cover -html=coverage.out
```

## Configuration

The Lambda function can be configured using environment variables:

- `LOG_LEVEL`: Set logging level (DEBUG, INFO, WARN, ERROR). Defaults to INFO.

## Usage

When deployed to AWS Lambda, the function accepts any event type and returns:

```json
{
  "statusCode": 200,
  "body": "Hello World"
}
```

## Logging

The function uses structured JSON logging with zerolog, including:
- Function execution start and completion
- Execution duration timing
- Response details
- Request context information

All logs are output to stdout for CloudWatch integration.
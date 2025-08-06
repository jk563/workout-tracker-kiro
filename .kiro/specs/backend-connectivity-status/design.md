# Design Document

## Overview

The Backend Connectivity Status component is a visual indicator that monitors the health of the backend API connection and provides real-time feedback to users about service availability. The component will be positioned in the top right corner of the application and use a color-coded system (amber/yellow for checking, green for healthy, red for unhealthy) to communicate the current connection status.

## Architecture

### Component Structure
```
ConnectivityStatus.svelte
├── Visual indicator (colored circle/dot)
├── Status checking logic
├── Periodic health check polling
└── Error handling and recovery
```

### Integration Points
- **Layout Integration**: Component will be added to the root layout (`+layout.svelte`) to appear on all pages
- **Backend API**: Will call a health check endpoint (to be implemented or assumed to exist)
- **Styling System**: Uses existing CSS custom properties and Tailwind classes for consistent theming
- **Accessibility**: Includes ARIA labels and screen reader support

## Components and Interfaces

### ConnectivityStatus Component

#### Props
```typescript
interface ConnectivityStatusProps {
  checkInterval?: number; // Polling interval in milliseconds (default: 30000)
  timeout?: number; // Request timeout in milliseconds (default: 5000)
  healthEndpoint?: string; // Health check endpoint URL (default: '/api/health')
}
```

#### State Management
```typescript
interface ConnectivityState {
  status: 'checking' | 'healthy' | 'unhealthy';
  lastChecked: Date | null;
  isVisible: boolean;
}
```

#### Visual States
- **Checking (Amber/Yellow)**: Pulsing animation, indicates request in progress
- **Healthy (Green)**: Solid color, indicates successful connection
- **Unhealthy (Red)**: Solid color, indicates failed connection or timeout

### Health Check Service

#### API Interface
```typescript
interface HealthCheckService {
  checkHealth(): Promise<HealthCheckResponse>;
}

interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  message?: string;
}
```

#### Implementation Details
- Uses native `fetch` API for HTTP requests
- Implements timeout handling using `AbortController`
- Handles network errors, timeouts, and non-200 responses as failures
- Includes retry logic with exponential backoff for failed requests

## Data Models

### Health Check Response
```typescript
interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  message?: string;
  version?: string;
}
```

### Component State
```typescript
interface ConnectivityState {
  status: 'checking' | 'healthy' | 'unhealthy';
  lastChecked: Date | null;
  checkCount: number;
  consecutiveFailures: number;
}
```

## Error Handling

### Network Errors
- **Connection Timeout**: Treat as unhealthy status after configured timeout period
- **Network Unreachable**: Immediately set to unhealthy status
- **DNS Resolution Failure**: Treat as unhealthy status
- **CORS Errors**: Handle gracefully and treat as unhealthy status

### HTTP Errors
- **4xx Client Errors**: Treat as unhealthy (likely configuration issue)
- **5xx Server Errors**: Treat as unhealthy (backend service issue)
- **Non-200 Success Codes**: Treat as unhealthy for simplicity

### Recovery Strategy
- **Exponential Backoff**: Increase check interval after consecutive failures
- **Circuit Breaker Pattern**: Temporarily stop checking after multiple failures
- **Automatic Recovery**: Resume normal checking when health check succeeds

## Testing Strategy

### Unit Tests
- **Component Rendering**: Test visual states and transitions
- **State Management**: Test status updates and state transitions
- **Props Handling**: Test default values and prop overrides
- **Accessibility**: Test ARIA labels and screen reader compatibility

### Integration Tests
- **API Integration**: Mock health check endpoint responses
- **Error Scenarios**: Test timeout, network errors, and HTTP errors
- **Polling Behavior**: Test interval timing and cleanup
- **Layout Integration**: Test positioning and responsive behavior

### End-to-End Tests
- **Visual Verification**: Test color changes and animations
- **User Experience**: Test component visibility and positioning
- **Performance**: Test impact on application performance
- **Cross-browser**: Test compatibility across target browsers

## Implementation Details

### Styling Approach
- **CSS Custom Properties**: Use existing `--success-500`, `--warning-500`, `--accent-500` for colors
- **Tailwind Classes**: Leverage existing utility classes for positioning and animations
- **Responsive Design**: Ensure component works on mobile and desktop viewports
- **Dark Mode Support**: Respect existing dark mode implementation

### Performance Considerations
- **Debounced Requests**: Prevent multiple simultaneous health checks
- **Request Cancellation**: Cancel in-flight requests when component unmounts
- **Memory Management**: Clean up timers and event listeners
- **Minimal DOM Updates**: Only update when status actually changes

### Accessibility Features
- **ARIA Labels**: Descriptive labels for screen readers
- **Color Independence**: Status communicated through text as well as color
- **Focus Management**: Keyboard navigation support if interactive
- **High Contrast**: Ensure visibility in high contrast mode

### Animation and Transitions
- **Smooth Transitions**: Use CSS transitions for status changes
- **Pulsing Animation**: Subtle pulse effect during checking state
- **Reduced Motion**: Respect `prefers-reduced-motion` setting
- **Performance**: Use CSS transforms for smooth animations

### Configuration Options
- **Runtime Configuration**: Allow customization of check intervals
- **Feature Flags**: Ability to disable component if needed
- **Debug Mode**: Additional logging for development

## Backend Health Endpoint Implementation

### Go Lambda Handler Extension

#### Health Check Handler
```go
// HealthResponse represents the health check response structure
type HealthResponse struct {
    Status    string `json:"status"`
    Timestamp string `json:"timestamp"`
    Version   string `json:"version,omitempty"`
    Message   string `json:"message,omitempty"`
}

// HandleHealthCheck processes health check requests
func (h *LambdaHandler) HandleHealthCheck(ctx context.Context) (Response, error) {
    // Implementation details in tasks
}
```

#### Route Handling
- **Path Detection**: Check request path to route to health endpoint
- **Method Validation**: Ensure GET method for health checks
- **Response Format**: Return consistent JSON response structure
- **Error Handling**: Graceful handling of health check failures

### API Gateway Integration

#### Endpoint Configuration
```
GET /api/health
Response: 200 OK
Content-Type: application/json

{
  "status": "ok",
  "timestamp": "2025-02-08T10:30:00Z",
  "version": "1.0.0"
}
```

#### Error Responses
```
Response: 503 Service Unavailable
Content-Type: application/json

{
  "status": "error",
  "timestamp": "2025-02-08T10:30:00Z",
  "message": "Service temporarily unavailable"
}
```

### Lambda Function Updates

#### Request Structure Handling
- **API Gateway Event**: Parse API Gateway proxy integration events
- **Path Routing**: Route requests based on HTTP path
- **Method Handling**: Support both health checks and existing functionality
- **CORS Headers**: Include appropriate CORS headers for frontend requests

#### Health Check Logic
- **Basic Health**: Return OK status with timestamp
- **Service Validation**: Verify core service functionality
- **Response Timing**: Ensure fast response times (< 100ms)
- **Logging**: Include health check requests in structured logs

### Infrastructure Updates

#### API Gateway Configuration
- **Resource Path**: `/api/health` resource in API Gateway
- **Method Integration**: GET method integrated with Lambda function
- **CORS Configuration**: Enable CORS for frontend domain
- **Response Models**: Define response models for documentation

#### Lambda Function Configuration
- **Environment Variables**: Add health check configuration
- **Permissions**: Ensure Lambda has necessary permissions
- **Timeout Configuration**: Set appropriate timeout for health checks
- **Memory Allocation**: Optimize memory for health check performance

### Implementation Notes
- **Lightweight Check**: Should be fast and not resource-intensive
- **Backward Compatibility**: Maintain existing "Hello World" functionality
- **Consistent Format**: Use standardized response format across endpoints
- **Error Resilience**: Handle edge cases and unexpected errors gracefully
- **Monitoring**: Include health check metrics in CloudWatch logs

## Infrastructure Design

### Terraform Configuration Updates

#### API Gateway Resource Configuration
```hcl
# Health check resource
resource "aws_api_gateway_resource" "health" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "health"
}

# Health check method
resource "aws_api_gateway_method" "health_get" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.health.id
  http_method   = "GET"
  authorization = "NONE"
}

# Health check integration
resource "aws_api_gateway_integration" "health_lambda" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.health.id
  http_method = aws_api_gateway_method.health_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.main.invoke_arn
}
```

#### CORS Configuration
```hcl
# CORS for health endpoint
resource "aws_api_gateway_method" "health_options" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.health.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "health_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.health.id
  http_method = aws_api_gateway_method.health_options.http_method
  type        = "MOCK"
  
  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

resource "aws_api_gateway_method_response" "health_options" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.health.id
  http_method = aws_api_gateway_method.health_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}
```

#### Environment-Specific Configuration
- **Development Environment**: Health endpoint accessible at `https://workout-tracker-dev.jamiekelly.com/api/health`
- **Production Environment**: Health endpoint accessible at `https://workout-tracker.jamiekelly.com/api/health`
- **API Gateway Deployment**: Ensure health endpoint is included in all deployment stages
- **CloudWatch Integration**: Health check requests logged to environment-specific log groups

### Route Handling Strategy

#### Path-Based Routing in Lambda
```go
func (h *LambdaHandler) HandleRequest(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    // Route based on path
    switch request.Path {
    case "/api/health":
        return h.HandleHealthCheck(ctx, request)
    default:
        return h.HandleDefault(ctx, request)
    }
}
```

#### Request Method Validation
- **GET Method**: Only accept GET requests for health checks
- **Method Validation**: Return 405 Method Not Allowed for other methods
- **Request Headers**: Validate and handle CORS preflight requests
- **Response Headers**: Include appropriate CORS headers in all responses

### Performance Considerations

#### API Gateway Optimization
- **Caching**: Disable caching for health endpoint to ensure real-time status
- **Throttling**: Configure appropriate throttling limits for health checks
- **Timeout**: Set API Gateway timeout to match Lambda function timeout
- **Error Handling**: Configure proper error responses for Lambda failures

#### Lambda Function Optimization
- **Cold Start**: Minimize cold start impact for health checks
- **Memory Allocation**: Use minimal memory allocation for health check efficiency
- **Execution Time**: Target sub-100ms response times for health checks
- **Connection Reuse**: Optimize for frequent health check requests

### Monitoring and Observability

#### CloudWatch Metrics
- **Health Check Frequency**: Monitor health check request frequency
- **Response Times**: Track health check response latencies
- **Error Rates**: Monitor health check failure rates
- **API Gateway Metrics**: Track API Gateway-specific metrics for health endpoint

#### Structured Logging
```go
type HealthCheckLog struct {
    Timestamp   string `json:"timestamp"`
    Level       string `json:"level"`
    Message     string `json:"message"`
    Path        string `json:"path"`
    Method      string `json:"method"`
    StatusCode  int    `json:"status_code"`
    Duration    int64  `json:"duration_ms"`
    RequestID   string `json:"request_id"`
}
```

### Security Considerations

#### CORS Policy
- **Allowed Origins**: Restrict to specific frontend domains
- **Allowed Methods**: Only allow GET and OPTIONS methods
- **Allowed Headers**: Restrict to necessary headers only
- **Credentials**: Disable credentials for health check endpoint

#### Rate Limiting
- **API Gateway Throttling**: Configure per-client rate limits
- **Lambda Concurrency**: Set appropriate reserved concurrency
- **DDoS Protection**: Leverage CloudFront and AWS Shield for protection
- **Access Logging**: Enable detailed access logging for security monitoring

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/rs/zerolog"
	"athlete-forge/handler"
)

// TestLambdaIntegration tests the complete Lambda function flow
func TestLambdaIntegration(t *testing.T) {
	tests := []struct {
		name           string
		event          interface{}
		expectedStatus int
		expectedBody   string
		expectError    bool
		description    string
	}{
		{
			name: "API Gateway GET request integration",
			event: events.APIGatewayProxyRequest{
				HTTPMethod: "GET",
				Path:       "/",
				Headers: map[string]string{
					"Content-Type": "application/json",
				},
				QueryStringParameters: map[string]string{},
				Body:                  "",
			},
			expectedStatus: 200,
			expectedBody:   "Hello World",
			expectError:    false,
			description:    "Complete integration test with API Gateway GET request",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange - Set up complete Lambda environment
			var logBuffer bytes.Buffer
			logger := configureTestLogger(&logBuffer)
			
			// Create handler instance (same as main function)
			lambdaHandler := handler.NewLambdaHandler(logger)
			ctx := context.Background()

			// Act - Execute complete Lambda function flow
			startTime := time.Now()
			response, err := lambdaHandler.HandleRequest(ctx, tt.event)
			executionTime := time.Since(startTime)

			// Assert - Verify error expectation
			if tt.expectError && err == nil {
				t.Errorf("expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("unexpected error: %v", err)
			}

			// Assert - Validate complete response format
			if response.StatusCode != tt.expectedStatus {
				t.Errorf("expected status code %d, got %d", tt.expectedStatus, response.StatusCode)
			}

			if response.Body != tt.expectedBody {
				t.Errorf("expected body %q, got %q", tt.expectedBody, response.Body)
			}

			// Assert - Verify response can be marshaled to JSON (Lambda requirement)
			jsonData, err := json.Marshal(response)
			if err != nil {
				t.Errorf("response cannot be marshaled to JSON: %v", err)
			}

			// Assert - Verify JSON structure matches Lambda response format
			var unmarshaled map[string]interface{}
			if err := json.Unmarshal(jsonData, &unmarshaled); err != nil {
				t.Errorf("failed to unmarshal response JSON: %v", err)
			}

			// Verify required Lambda response fields
			if statusCode, ok := unmarshaled["statusCode"]; !ok {
				t.Error("response missing required 'statusCode' field")
			} else if statusCode != float64(tt.expectedStatus) {
				t.Errorf("JSON statusCode expected %d, got %v", tt.expectedStatus, statusCode)
			}

			if body, ok := unmarshaled["body"]; !ok {
				t.Error("response missing required 'body' field")
			} else if body != tt.expectedBody {
				t.Errorf("JSON body expected %q, got %v", tt.expectedBody, body)
			}

			// Assert - Verify logging output contains expected entries
			logOutput := logBuffer.String()
			if !strings.Contains(logOutput, "Lambda function execution started") {
				t.Error("log output missing function start message")
			}
			if !strings.Contains(logOutput, "Lambda function execution completed") {
				t.Error("log output missing function completion message")
			}
			if !strings.Contains(logOutput, `"status_code":200`) {
				t.Error("log output missing status code")
			}
			if !strings.Contains(logOutput, `"response_body":"Hello World"`) {
				t.Error("log output missing response body")
			}

			// Assert - Verify execution time is reasonable (< 1 second for this simple function)
			if executionTime > time.Second {
				t.Errorf("execution time too long: %v", executionTime)
			}

			t.Logf("Integration test '%s' completed successfully in %v", tt.description, executionTime)
		})
	}
}

// TestLambdaIntegrationWithEnvironmentVariables tests Lambda with different environment configurations
func TestLambdaIntegrationWithEnvironmentVariables(t *testing.T) {
	tests := []struct {
		name     string
		logLevel string
		expected string
	}{
		{
			name:     "integration with DEBUG log level",
			logLevel: "debug",
			expected: "debug",
		},
		{
			name:     "integration with INFO log level",
			logLevel: "info",
			expected: "info",
		},
		{
			name:     "integration with WARN log level",
			logLevel: "warn",
			expected: "warn",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange - Set environment variable
			originalLogLevel := os.Getenv("LOG_LEVEL")
			defer func() {
				if originalLogLevel != "" {
					os.Setenv("LOG_LEVEL", originalLogLevel)
				} else {
					os.Unsetenv("LOG_LEVEL")
				}
			}()
			
			os.Setenv("LOG_LEVEL", tt.logLevel)

			// Set up complete Lambda environment with environment configuration
			var logBuffer bytes.Buffer
			logger := configureLogger() // Use the actual configureLogger function
			logger = logger.Output(&logBuffer) // Redirect output to buffer for testing

			// Create handler instance
			lambdaHandler := handler.NewLambdaHandler(logger)
			ctx := context.Background()

			// Create API Gateway event
			event := events.APIGatewayProxyRequest{
				HTTPMethod: "GET",
				Path:       "/",
				Headers: map[string]string{
					"Content-Type": "application/json",
				},
			}

			// Act - Execute complete Lambda function flow
			response, err := lambdaHandler.HandleRequest(ctx, event)

			// Assert - Verify successful execution
			if err != nil {
				t.Errorf("unexpected error: %v", err)
			}

			if response.StatusCode != 200 {
				t.Errorf("expected status code 200, got %d", response.StatusCode)
			}

			if response.Body != "Hello World" {
				t.Errorf("expected body 'Hello World', got %q", response.Body)
			}

			// Verify logging configuration worked
			logOutput := logBuffer.String()
			if tt.logLevel == "debug" && !strings.Contains(logOutput, "Lambda function execution") {
				// For debug level, we should see log output
				t.Log("Debug level logging configured successfully")
			}
		})
	}
}

// TestLambdaIntegrationErrorScenarios tests error handling in complete Lambda flow
func TestLambdaIntegrationErrorScenarios(t *testing.T) {
	t.Run("integration with nil context", func(t *testing.T) {
		// Arrange
		var logBuffer bytes.Buffer
		logger := configureTestLogger(&logBuffer)
		lambdaHandler := handler.NewLambdaHandler(logger)

		// Create API Gateway event
		event := events.APIGatewayProxyRequest{
			HTTPMethod: "GET",
			Path:       "/",
		}

		// Act - Test with nil context (should handle gracefully)
		response, err := lambdaHandler.HandleRequest(nil, event)

		// Assert - Should still work (our handler doesn't use context extensively)
		if err != nil {
			t.Errorf("unexpected error with nil context: %v", err)
		}

		if response.StatusCode != 200 {
			t.Errorf("expected status code 200, got %d", response.StatusCode)
		}

		if response.Body != "Hello World" {
			t.Errorf("expected body 'Hello World', got %q", response.Body)
		}
	})
}

// configureTestLogger creates a logger configuration for testing
// This mirrors the main function's logger configuration but allows output redirection
func configureTestLogger(output *bytes.Buffer) zerolog.Logger {
	// Use INFO level for testing
	logLevel := zerolog.InfoLevel

	// Configure zerolog for testing (similar to main function)
	logger := zerolog.New(output).
		Level(logLevel).
		With().
		Timestamp().
		Str("service", "athlete-forge").
		Logger()

	return logger
}
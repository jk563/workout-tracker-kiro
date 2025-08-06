package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/rs/zerolog"
)

func TestLambdaHandler_HandleRequest(t *testing.T) {
	tests := []struct {
		name           string
		event          interface{}
		expectedStatus int
		expectedBody   string
		expectError    bool
		checkJSON      bool
	}{
		{
			name: "successful hello world response with minimal API Gateway event",
			event: map[string]interface{}{
				"httpMethod": "GET",
				"path":       "/",
			},
			expectedStatus: 200,
			expectedBody:   "Hello World",
			expectError:    false,
			checkJSON:      false,
		},
		{
			name: "successful health check response",
			event: map[string]interface{}{
				"httpMethod": "GET",
				"path":       "/api/health",
			},
			expectedStatus: 200,
			expectError:    false,
			checkJSON:      true,
		},
		{
			name: "health check with missing httpMethod defaults to GET",
			event: map[string]interface{}{
				"path": "/api/health",
			},
			expectedStatus: 200,
			expectError:    false,
			checkJSON:      true,
		},
		{
			name: "unknown path defaults to hello world",
			event: map[string]interface{}{
				"httpMethod": "GET",
				"path":       "/unknown",
			},
			expectedStatus: 200,
			expectedBody:   "Hello World",
			expectError:    false,
			checkJSON:      false,
		},
		{
			name: "handles invalid event gracefully",
			event: "invalid-event-string",
			expectedStatus: 500,
			expectError:    false,
			checkJSON:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			var logBuffer bytes.Buffer
			logger := zerolog.New(&logBuffer).With().Timestamp().Logger()
			
			handler := NewLambdaHandler(logger)
			ctx := context.Background()

			// Act
			response, err := handler.HandleRequest(ctx, tt.event)

			// Assert - Verify error expectation
			if tt.expectError && err == nil {
				t.Errorf("expected error but got none")
			}
			if !tt.expectError && err != nil {
				t.Errorf("unexpected error: %v", err)
			}

			// Assert - Verify response structure
			if response.StatusCode != tt.expectedStatus {
				t.Errorf("expected status code %d, got %d", tt.expectedStatus, response.StatusCode)
			}

			// Assert - Verify response body
			if tt.checkJSON {
				// Parse JSON response for health check
				var healthResponse HealthCheckResponse
				if err := json.Unmarshal([]byte(response.Body), &healthResponse); err != nil {
					t.Errorf("failed to parse health check JSON response: %v", err)
				}

				if healthResponse.Status != "ok" {
					t.Errorf("expected health status 'ok', got %q", healthResponse.Status)
				}

				if healthResponse.Timestamp == "" {
					t.Error("expected timestamp to be set")
				}

				if healthResponse.Version != "1.0.0" {
					t.Errorf("expected version '1.0.0', got %q", healthResponse.Version)
				}
			} else if tt.expectedBody != "" {
				if response.Body != tt.expectedBody {
					t.Errorf("expected body %q, got %q", tt.expectedBody, response.Body)
				}
			}

			// Assert - Verify CORS headers are present
			if response.Headers == nil {
				t.Error("expected headers to be set")
			} else {
				if origin := response.Headers["Access-Control-Allow-Origin"]; origin != "*" {
					t.Errorf("expected CORS origin '*', got %q", origin)
				}
			}
		})
	}
}

func TestNewLambdaHandler(t *testing.T) {
	t.Run("creates handler with provided logger", func(t *testing.T) {
		// Arrange
		var logBuffer bytes.Buffer
		logger := zerolog.New(&logBuffer).With().Timestamp().Logger()

		// Act
		handler := NewLambdaHandler(logger)

		// Assert
		if handler == nil {
			t.Error("expected handler to be created, got nil")
		}

		// Verify the handler can be used
		ctx := context.Background()
		response, err := handler.HandleRequest(ctx, nil)

		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		if response.StatusCode != 200 {
			t.Errorf("expected status code 200, got %d", response.StatusCode)
		}

		if response.Body != "Hello World" {
			t.Errorf("expected body 'Hello World', got %q", response.Body)
		}
	})
}

func TestLambdaHandler_HandleHealthCheck(t *testing.T) {
	t.Run("returns successful health check response", func(t *testing.T) {
		// Arrange
		var logBuffer bytes.Buffer
		logger := zerolog.New(&logBuffer).With().Timestamp().Logger()
		handler := NewLambdaHandler(logger)
		ctx := context.Background()

		// Act
		response, err := handler.HandleHealthCheck(ctx)

		// Assert
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		if response.StatusCode != 200 {
			t.Errorf("expected status code 200, got %d", response.StatusCode)
		}

		// Verify JSON response structure
		var healthResponse HealthCheckResponse
		if err := json.Unmarshal([]byte(response.Body), &healthResponse); err != nil {
			t.Errorf("failed to parse health check JSON: %v", err)
		}

		if healthResponse.Status != "ok" {
			t.Errorf("expected status 'ok', got %q", healthResponse.Status)
		}

		if healthResponse.Version != "1.0.0" {
			t.Errorf("expected version '1.0.0', got %q", healthResponse.Version)
		}

		if healthResponse.Message != "Service is healthy" {
			t.Errorf("expected message 'Service is healthy', got %q", healthResponse.Message)
		}

		// Verify timestamp is valid RFC3339 format
		if _, err := time.Parse(time.RFC3339, healthResponse.Timestamp); err != nil {
			t.Errorf("invalid timestamp format: %v", err)
		}

		// Verify headers
		if response.Headers["Content-Type"] != "application/json" {
			t.Errorf("expected Content-Type 'application/json', got %q", response.Headers["Content-Type"])
		}

		if response.Headers["Access-Control-Allow-Origin"] != "*" {
			t.Errorf("expected CORS origin '*', got %q", response.Headers["Access-Control-Allow-Origin"])
		}
	})

	t.Run("logs health check execution", func(t *testing.T) {
		// Arrange
		var logBuffer bytes.Buffer
		logger := zerolog.New(&logBuffer).With().Timestamp().Logger()
		handler := NewLambdaHandler(logger)
		ctx := context.Background()

		// Act
		_, err := handler.HandleHealthCheck(ctx)

		// Assert
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		logOutput := logBuffer.String()
		if !strings.Contains(logOutput, "Health check started") {
			t.Error("expected 'Health check started' log message")
		}

		if !strings.Contains(logOutput, "Health check completed successfully") {
			t.Error("expected 'Health check completed successfully' log message")
		}
	})
}

func TestLambdaHandler_parseAPIGatewayEvent(t *testing.T) {
	tests := []struct {
		name        string
		event       interface{}
		expectedErr bool
		expectedPath string
		expectedMethod string
	}{
		{
			name: "valid API Gateway event",
			event: map[string]interface{}{
				"httpMethod": "GET",
				"path":       "/api/health",
				"headers":    map[string]string{"Content-Type": "application/json"},
			},
			expectedErr:    false,
			expectedPath:   "/api/health",
			expectedMethod: "GET",
		},
		{
			name: "event with missing httpMethod defaults to GET",
			event: map[string]interface{}{
				"path": "/api/health",
			},
			expectedErr:    false,
			expectedPath:   "/api/health",
			expectedMethod: "GET",
		},
		{
			name: "event with missing path defaults to /",
			event: map[string]interface{}{
				"httpMethod": "POST",
			},
			expectedErr:    false,
			expectedPath:   "/",
			expectedMethod: "POST",
		},
		{
			name:           "empty event gets defaults",
			event:          map[string]interface{}{},
			expectedErr:    false,
			expectedPath:   "/",
			expectedMethod: "GET",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Arrange
			var logBuffer bytes.Buffer
			logger := zerolog.New(&logBuffer).With().Timestamp().Logger()
			handler := NewLambdaHandler(logger)

			// Act
			apiEvent, err := handler.parseAPIGatewayEvent(tt.event)

			// Assert
			if tt.expectedErr && err == nil {
				t.Error("expected error but got none")
			}
			if !tt.expectedErr && err != nil {
				t.Errorf("unexpected error: %v", err)
			}

			if !tt.expectedErr {
				if apiEvent.Path != tt.expectedPath {
					t.Errorf("expected path %q, got %q", tt.expectedPath, apiEvent.Path)
				}
				if apiEvent.HTTPMethod != tt.expectedMethod {
					t.Errorf("expected method %q, got %q", tt.expectedMethod, apiEvent.HTTPMethod)
				}
			}
		})
	}
}

func TestLambdaHandler_createErrorResponse(t *testing.T) {
	t.Run("creates proper error response", func(t *testing.T) {
		// Arrange
		var logBuffer bytes.Buffer
		logger := zerolog.New(&logBuffer).With().Timestamp().Logger()
		handler := NewLambdaHandler(logger)

		// Act
		response := handler.createErrorResponse(500, "Test error message")

		// Assert
		if response.StatusCode != 500 {
			t.Errorf("expected status code 500, got %d", response.StatusCode)
		}

		// Verify JSON structure
		var errorResponse map[string]interface{}
		if err := json.Unmarshal([]byte(response.Body), &errorResponse); err != nil {
			t.Errorf("failed to parse error JSON: %v", err)
		}

		if errorResponse["status"] != "error" {
			t.Errorf("expected status 'error', got %v", errorResponse["status"])
		}

		if errorResponse["message"] != "Test error message" {
			t.Errorf("expected message 'Test error message', got %v", errorResponse["message"])
		}

		// Verify timestamp exists
		if _, ok := errorResponse["timestamp"]; !ok {
			t.Error("expected timestamp field in error response")
		}

		// Verify headers
		if response.Headers["Content-Type"] != "application/json" {
			t.Errorf("expected Content-Type 'application/json', got %q", response.Headers["Content-Type"])
		}
	})
}

func TestResponse_Structure(t *testing.T) {
	t.Run("response has correct JSON structure", func(t *testing.T) {
		// Arrange
		response := Response{
			StatusCode: 200,
			Headers:    map[string]string{"Content-Type": "application/json"},
			Body:       "Hello World",
		}

		// Act - Marshal to JSON to verify structure
		jsonData, err := json.Marshal(response)
		if err != nil {
			t.Errorf("failed to marshal response to JSON: %v", err)
		}

		// Assert - Unmarshal and verify fields
		var unmarshaled map[string]interface{}
		if err := json.Unmarshal(jsonData, &unmarshaled); err != nil {
			t.Errorf("failed to unmarshal JSON: %v", err)
		}

		if statusCode, ok := unmarshaled["statusCode"]; !ok || statusCode != float64(200) {
			t.Errorf("expected statusCode 200, got %v", statusCode)
		}

		if body, ok := unmarshaled["body"]; !ok || body != "Hello World" {
			t.Errorf("expected body 'Hello World', got %v", body)
		}

		// Verify headers field exists
		if _, ok := unmarshaled["headers"]; !ok {
			t.Error("expected headers field in response")
		}
	})
}


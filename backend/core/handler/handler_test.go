package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"testing"

	"github.com/rs/zerolog"
)

func TestLambdaHandler_HandleRequest(t *testing.T) {
	tests := []struct {
		name           string
		event          interface{}
		expectedStatus int
		expectedBody   string
		expectError    bool
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

			if response.Body != tt.expectedBody {
				t.Errorf("expected body %q, got %q", tt.expectedBody, response.Body)
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

func TestResponse_Structure(t *testing.T) {
	t.Run("response has correct JSON structure", func(t *testing.T) {
		// Arrange
		response := Response{
			StatusCode: 200,
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
	})
}


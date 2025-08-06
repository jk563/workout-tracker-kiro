package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/rs/zerolog"
)

// APIGatewayProxyEvent represents the API Gateway proxy integration event
type APIGatewayProxyEvent struct {
	HTTPMethod string            `json:"httpMethod"`
	Path       string            `json:"path"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
}

// Response represents the Lambda function response structure
type Response struct {
	StatusCode int               `json:"statusCode"`
	Headers    map[string]string `json:"headers,omitempty"`
	Body       string            `json:"body"`
}

// HealthCheckResponse represents the health check endpoint response
type HealthCheckResponse struct {
	Status    string `json:"status"`
	Timestamp string `json:"timestamp"`
	Version   string `json:"version,omitempty"`
	Message   string `json:"message,omitempty"`
}

// Handler interface defines the contract for Lambda request handling
type Handler interface {
	HandleRequest(ctx context.Context, event interface{}) (Response, error)
}

// LambdaHandler implements the Handler interface
type LambdaHandler struct {
	logger zerolog.Logger
}

// NewLambdaHandler creates a new instance of LambdaHandler with configured logger
func NewLambdaHandler(logger zerolog.Logger) *LambdaHandler {
	return &LambdaHandler{
		logger: logger,
	}
}

// HandleRequest processes the Lambda request and routes to appropriate handler
func (h *LambdaHandler) HandleRequest(ctx context.Context, event interface{}) (Response, error) {
	start := time.Now()
	
	// Log function start
	h.logger.Info().
		Str("function", "HandleRequest").
		Time("start_time", start).
		Msg("Lambda function execution started")

	// Parse the API Gateway event
	apiEvent, err := h.parseAPIGatewayEvent(event)
	if err != nil {
		h.logger.Error().
			Err(err).
			Interface("event", event).
			Msg("Failed to parse API Gateway event")
		
		return h.createErrorResponse(500, "Internal server error"), nil
	}

	// Log request details
	h.logger.Info().
		Str("method", apiEvent.HTTPMethod).
		Str("path", apiEvent.Path).
		Msg("Processing request")

	var response Response

	// Route request based on path
	switch apiEvent.Path {
	case "/api/health":
		response, err = h.HandleHealthCheck(ctx)
	default:
		// Default to Hello World for backward compatibility
		response, err = h.handleHelloWorld(ctx)
	}

	if err != nil {
		h.logger.Error().
			Err(err).
			Str("path", apiEvent.Path).
			Msg("Request handler failed")
		
		return h.createErrorResponse(500, "Internal server error"), nil
	}

	// Calculate execution duration
	duration := time.Since(start)

	// Log function completion with timing
	h.logger.Info().
		Str("function", "HandleRequest").
		Str("path", apiEvent.Path).
		Int("status_code", response.StatusCode).
		Dur("execution_duration", duration).
		Time("completion_time", time.Now()).
		Msg("Lambda function execution completed")

	return response, nil
}

// parseAPIGatewayEvent converts the generic event interface to APIGatewayProxyEvent
func (h *LambdaHandler) parseAPIGatewayEvent(event interface{}) (*APIGatewayProxyEvent, error) {
	// Convert to JSON and back to parse the event structure
	eventBytes, err := json.Marshal(event)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal event: %w", err)
	}

	var apiEvent APIGatewayProxyEvent
	if err := json.Unmarshal(eventBytes, &apiEvent); err != nil {
		return nil, fmt.Errorf("failed to unmarshal API Gateway event: %w", err)
	}

	// Set defaults for missing fields
	if apiEvent.HTTPMethod == "" {
		apiEvent.HTTPMethod = "GET"
	}
	if apiEvent.Path == "" {
		apiEvent.Path = "/"
	}

	return &apiEvent, nil
}

// HandleHealthCheck processes health check requests
func (h *LambdaHandler) HandleHealthCheck(ctx context.Context) (Response, error) {
	start := time.Now()

	// Log health check start
	h.logger.Info().
		Str("function", "HandleHealthCheck").
		Time("start_time", start).
		Msg("Health check started")

	// Create health check response
	healthResponse := HealthCheckResponse{
		Status:    "ok",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Version:   "1.0.0",
		Message:   "Service is healthy",
	}

	// Marshal response to JSON
	responseBody, err := json.Marshal(healthResponse)
	if err != nil {
		h.logger.Error().
			Err(err).
			Msg("Failed to marshal health check response")
		
		return h.createErrorResponse(500, "Failed to create health check response"), fmt.Errorf("failed to marshal health response: %w", err)
	}

	// Create HTTP response with CORS headers
	response := Response{
		StatusCode: 200,
		Headers: map[string]string{
			"Content-Type":                 "application/json",
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
		Body: string(responseBody),
	}

	// Calculate execution duration
	duration := time.Since(start)

	// Log health check completion
	h.logger.Info().
		Str("function", "HandleHealthCheck").
		Str("status", healthResponse.Status).
		Str("timestamp", healthResponse.Timestamp).
		Dur("execution_duration", duration).
		Msg("Health check completed successfully")

	return response, nil
}

// handleHelloWorld processes the original Hello World functionality
func (h *LambdaHandler) handleHelloWorld(ctx context.Context) (Response, error) {
	// Create the "Hello World" response for backward compatibility
	response := Response{
		StatusCode: 200,
		Headers: map[string]string{
			"Content-Type":                 "text/plain",
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
		Body: "Hello World",
	}

	h.logger.Info().
		Str("function", "handleHelloWorld").
		Int("status_code", response.StatusCode).
		Str("response_body", response.Body).
		Msg("Hello World response created")

	return response, nil
}

// createErrorResponse creates a standardized error response
func (h *LambdaHandler) createErrorResponse(statusCode int, message string) Response {
	errorResponse := map[string]interface{}{
		"status":    "error",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"message":   message,
	}

	responseBody, err := json.Marshal(errorResponse)
	if err != nil {
		// Fallback to plain text if JSON marshaling fails
		return Response{
			StatusCode: statusCode,
			Headers: map[string]string{
				"Content-Type":                 "text/plain",
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "GET, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			},
			Body: message,
		}
	}

	return Response{
		StatusCode: statusCode,
		Headers: map[string]string{
			"Content-Type":                 "application/json",
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		},
		Body: string(responseBody),
	}
}